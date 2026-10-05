// ───────────────────────────────────────────────────────────────────
// MODULE: Video Concat
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { writeConcatList } from '../../core/concat-list.js';
import { ERROR_CODES, MediaError } from '../../core/errors.js';
import {
  probeIntermediate,
  probeMedia,
  requireVideoStream,
} from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { formatSeconds } from '../../core/time-parse.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runPipeline } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VideoStreamInfo } from '../../core/media-properties.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { PipelineProduct, PipelineStep } from './copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the schema checks. */
interface ConcatArguments {
  readonly inputPaths: readonly string[];
  readonly transition?: TransitionValue;
  readonly transitionDuration?: number;
  readonly outputName: string;
}

/** Size and rate every clip is normalized to. */
interface CommonShape {
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
}

/** What the passes need besides their temp folder. */
interface ConcatPlan {
  readonly inputs: readonly [ResolvedInput, ...ResolvedInput[]];
  readonly shape: CommonShape;
  readonly audio: readonly boolean[];
  readonly transition?: TransitionPlan;
}

/** The blend the two clips run through. */
interface TransitionPlan {
  /** Name from the schema enum, fixed before the graph was built. */
  readonly name: TransitionValue;

  /** Seconds the blend lasts. */
  readonly duration: number;

  /** Seconds the first caller clip lasts, used when its normalized copy reports none. */
  readonly firstDuration: number;

  /** True only when both clips carry an audio stream. */
  readonly withAudio: boolean;
}

/** One probe result per clip, in clip order. */
interface ClipInspection {
  /** Size and rate of the first clip, which the plain join normalizes to. */
  readonly shape: CommonShape;

  /** True when the matching clip has an audio stream. */
  readonly audio: readonly boolean[];

  /** Size and rate both clips share when a transition runs. */
  readonly transitionShape: CommonShape;

  /** Seconds the first clip lasts, or zero when the probe could not tell. */
  readonly firstDuration: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_concat';

const CONCAT_OPERATION = 'joined';
const CONCAT_EXTENSION = '.mp4';
const JOINED_TEMP_NAME = 'joined.mp4';
const NORM_TEMP_PREFIX = 'norm_';

const VIDEO_ENCODER = 'libx264';
const AUDIO_ENCODER = 'aac';
const CONCAT_ENCODERS = [VIDEO_ENCODER, AUDIO_ENCODER] as const;
const CONCAT_FILTERS = ['scale'] as const;
const TRANSITION_FILTERS = ['scale', 'xfade', 'acrossfade'] as const;

const MIN_CLIPS = 2;
const MAX_CLIPS = 50;

const FALLBACK_WIDTH = 1280;
const FALLBACK_HEIGHT = 720;
const FALLBACK_FRAME_RATE = 30;

const MIN_TRANSITION_WIDTH = 640;
const MIN_TRANSITION_HEIGHT = 360;
const MIN_TRANSITION_FRAME_RATE = 30;
const TRANSITION_CLIP_COUNT = 2;

const MIXED_AUDIO_WARNING =
  'Some clips had no sound, so the joined audio covers only the clips that had it.';
const TRANSITION_AUDIO_WARNING =
  'Only one clip had sound, so the joined video has no audio.';

/** The xfade names the transition field accepts, in the source's order. */
const TRANSITION_VALUES = [
  'dissolve',
  'fade',
  'fadeblack',
  'fadewhite',
  'fadegrays',
  'distance',
  'wipeleft',
  'wiperight',
  'wipeup',
  'wipedown',
  'slideleft',
  'slideright',
  'slideup',
  'slidedown',
  'smoothleft',
  'smoothright',
  'smoothup',
  'smoothdown',
  'circlecrop',
  'rectcrop',
  'circleopen',
  'circleclose',
  'vertopen',
  'vertclose',
  'horzopen',
  'horzclose',
  'diagtl',
  'diagtr',
  'diagbl',
  'diagbr',
  'hlslice',
  'hrslice',
  'vuslice',
  'vdslice',
  'pixelize',
  'radial',
  'hblur',
] as const;

/** One transition name from {@link TRANSITION_VALUES}. */
type TransitionValue = (typeof TRANSITION_VALUES)[number];

const INPUT_PATHS_DESCRIPTION =
  'Absolute paths of the videos to join, in order, inside allowed roots. '
  + `Use ${MIN_CLIPS} to ${MAX_CLIPS} paths. The files are not changed.`;

const TRANSITION_DESCRIPTION =
  'Name of a blend to run between exactly two clips, such as dissolve, fade or '
  + 'wipeleft. Omitted means the clips are joined end to end.';

const TRANSITION_DURATION_DESCRIPTION =
  'Seconds the blend lasts. Use a value greater than 0 and shorter than the first '
  + 'clip. Set it only together with transition.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function requireInputTuple(
  inputs: readonly ResolvedInput[],
): readonly [ResolvedInput, ...ResolvedInput[]] {
  const [first, ...rest] = inputs;
  if (first === undefined) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The concat call had no inputs.', {
      tool: TOOL_NAME,
    });
  }
  return [first, ...rest];
}

function commonShape(video: VideoStreamInfo): CommonShape {
  return {
    width: video.width > 0 ? video.width : FALLBACK_WIDTH,
    height: video.height > 0 ? video.height : FALLBACK_HEIGHT,
    frameRate: video.frameRate > 0 ? video.frameRate : FALLBACK_FRAME_RATE,
  };
}

// libx264 refuses an odd 4:2:0 frame side.
function evenCeiling(value: number): number {
  return value % 2 === 0 ? value : value + 1;
}

/** Check the argument pairs before any file is touched, and return the blend length. */
function checkTransitionArguments(args: ConcatArguments): number | undefined {
  if (args.transition === undefined) {
    if (args.transitionDuration !== undefined) {
      throw new MediaError(
        ERROR_CODES.INVALID_INPUT,
        'A transition duration has no effect without a transition.',
        {
          parameter: 'transitionDuration',
          value: args.transitionDuration,
          reason: 'transition-required',
        },
      );
    }
    return undefined;
  }
  if (args.transitionDuration === undefined) {
    throw new MediaError(ERROR_CODES.INVALID_INPUT, 'A transition needs a duration.', {
      parameter: 'transitionDuration',
      value: null,
      reason: 'duration-required',
    });
  }
  if (args.inputPaths.length !== TRANSITION_CLIP_COUNT) {
    throw new MediaError(ERROR_CODES.INVALID_INPUT, 'A transition blends exactly two clips.', {
      parameter: 'inputPaths',
      value: args.inputPaths.length,
      reason: 'transition-needs-two',
    });
  }
  return args.transitionDuration;
}

async function inspectClips(
  context: ToolContext,
  clips: readonly ResolvedInput[],
): Promise<ClipInspection> {
  const audio: boolean[] = [];
  let shape: CommonShape | undefined;
  let width = 0;
  let height = 0;
  let frameRate = 0;
  let firstDuration: number | undefined;
  for (const clip of clips) {
    const properties = await probeMedia(context, clip);
    const video = requireVideoStream(clip, properties);
    shape ??= commonShape(video);
    width = Math.max(width, video.width);
    height = Math.max(height, video.height);
    frameRate = Math.max(frameRate, video.frameRate);
    firstDuration ??= properties.durationSeconds;
    audio.push(properties.hasAudio);
  }
  if (shape === undefined) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'The concat call had no clips to inspect.', {
      tool: TOOL_NAME,
    });
  }
  return {
    shape,
    audio,
    transitionShape: {
      width: evenCeiling(Math.max(width, MIN_TRANSITION_WIDTH)),
      height: evenCeiling(Math.max(height, MIN_TRANSITION_HEIGHT)),
      frameRate: Math.max(frameRate, MIN_TRANSITION_FRAME_RATE),
    },
    // A clip whose probe reported no duration reads as zero, so the length check fails closed.
    firstDuration: firstDuration ?? 0,
  };
}

function mixedAudioWarnings(audio: readonly boolean[]): readonly string[] | undefined {
  const withSound = audio.filter((hasSound) => hasSound).length;
  if (withSound === 0 || withSound === audio.length) {
    return undefined;
  }
  return [MIXED_AUDIO_WARNING];
}

function transitionWarnings(audio: readonly boolean[]): readonly string[] | undefined {
  if (audio.filter((hasSound) => hasSound).length === 1) {
    return [TRANSITION_AUDIO_WARNING];
  }
  return undefined;
}

function hasBothAudio(audio: readonly boolean[]): boolean {
  return audio[0] === true && audio[1] === true;
}

/** Seconds into the first normalized clip where the blend starts. */
function transitionOffset(firstSeconds: number, duration: number): number {
  return Math.round((firstSeconds - duration) * 1000) / 1000;
}

function requireTransitionLength(duration: number, inspection: ClipInspection): void {
  if (duration >= inspection.firstDuration) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'The transition must be shorter than the first clip.',
      {
        parameter: 'transitionDuration',
        value: duration,
        reason: 'duration-too-long',
      },
    );
  }
}

async function xfadeProduct(
  context: ToolContext,
  plan: ConcatPlan,
  transition: TransitionPlan,
  tempDir: string,
): Promise<PipelineProduct> {
  const normalizedPaths: string[] = [];
  for (const [index, clip] of plan.inputs.entries()) {
    const normalizedPath = path.join(
      tempDir,
      `${NORM_TEMP_PREFIX}${String(index)}${CONCAT_EXTENSION}`,
    );
    const clipArgs = normalizeArgs(
      clip.realPath,
      plan.shape.width,
      plan.shape.height,
      plan.shape.frameRate,
      normalizedPath,
    );
    await context.runBinary('ffmpeg', clipArgs, {
      inputs: [clip],
      outputs: [normalizedPath],
      tempDir,
    });
    normalizedPaths.push(normalizedPath);
  }
  const [firstPath] = normalizedPaths;
  const firstSeconds = firstPath === undefined
    ? undefined
    : (await probeIntermediate(context, firstPath)).durationSeconds;
  const offset = transitionOffset(firstSeconds ?? transition.firstDuration, transition.duration);
  const joinedPath = path.join(tempDir, JOINED_TEMP_NAME);
  await context.runBinary('ffmpeg', xfadeArgs(normalizedPaths, transition, offset, joinedPath), {
    inputs: [],
    outputs: [joinedPath],
    tempDir,
  });
  return {
    tempPath: joinedPath,
    operation: CONCAT_OPERATION,
    extension: CONCAT_EXTENSION,
    mediaType: 'video',
    warnings: transitionWarnings(plan.audio),
  };
}

function xfadeArgs(
  normalizedPaths: readonly string[],
  transition: TransitionPlan,
  offset: number,
  outPath: string,
): string[] {
  const [first, second] = normalizedPaths;
  if (first === undefined || second === undefined) {
    throw new MediaError(ERROR_CODES.INTERNAL, 'A blend needs two normalized clips.', {
      tool: TOOL_NAME,
    });
  }
  const args = [
    '-n',
    '-i',
    first,
    '-i',
    second,
    '-filter_complex',
    xfadeGraph(transition.name, transition.duration, offset, transition.withAudio),
    '-map',
    '[v]',
  ];
  if (transition.withAudio) {
    args.push('-map', '[a]');
  }
  args.push('-c:v', VIDEO_ENCODER);
  if (transition.withAudio) {
    args.push('-c:a', AUDIO_ENCODER);
  }
  args.push(outPath);
  return args;
}

function concatStep(context: ToolContext, plan: ConcatPlan): PipelineStep {
  return async (tempDir: string): Promise<PipelineProduct> => {
    const transition = plan.transition;
    if (transition !== undefined) {
      return xfadeProduct(context, plan, transition, tempDir);
    }
    for (const [index, clip] of plan.inputs.entries()) {
      const normalizedPath = path.join(
        tempDir,
        `${NORM_TEMP_PREFIX}${String(index)}${CONCAT_EXTENSION}`,
      );
      const clipArgs = normalizeArgs(
        clip.realPath,
        plan.shape.width,
        plan.shape.height,
        plan.shape.frameRate,
        normalizedPath,
      );
      await context.runBinary('ffmpeg', clipArgs, {
        inputs: [clip],
        outputs: [normalizedPath],
        tempDir,
      });
    }
    const listPath = writeConcatList(tempDir, plan.inputs.length);
    const joinedPath = path.join(tempDir, JOINED_TEMP_NAME);
    await context.runBinary('ffmpeg', joinArgs(listPath, joinedPath), {
      inputs: [],
      outputs: [joinedPath],
      tempDir,
    });
    return {
      tempPath: joinedPath,
      operation: CONCAT_OPERATION,
      extension: CONCAT_EXTENSION,
      mediaType: 'video',
      warnings: mixedAudioWarnings(plan.audio),
    };
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Build the ffmpeg argv that scales and resamples one clip.
 *
 * @param clipPath - Real path of the clip to normalize
 * @param width - Frame width the clip is scaled to
 * @param height - Frame height the clip is scaled to
 * @param fps - Frame rate the clip is resampled to
 * @param outPath - Path the normalized clip is written to
 * @returns The argv, one element per token
 */
export function normalizeArgs(
  clipPath: string,
  width: number,
  height: number,
  fps: number,
  outPath: string,
): string[] {
  return [
    '-n',
    '-i',
    clipPath,
    '-vf',
    `scale=${String(width)}:${String(height)}`,
    '-r',
    String(fps),
    '-c:v',
    VIDEO_ENCODER,
    '-c:a',
    AUDIO_ENCODER,
    outPath,
  ];
}

/**
 * Build the ffmpeg argv that joins the normalized clips.
 *
 * The list holds only relative names for server-made intermediates, so the
 * demuxer runs with `-safe 1` and stays on the local file protocol.
 *
 * @param listPath - Path of the generated list holding the relative clip names
 * @param outPath - Path the joined file is written to
 * @returns The argv, one element per token
 */
export function joinArgs(listPath: string, outPath: string): string[] {
  return [
    '-n',
    '-f',
    'concat',
    '-safe',
    '1',
    '-protocol_whitelist',
    'file',
    '-i',
    listPath,
    '-c',
    'copy',
    outPath,
  ];
}

/**
 * Build the filter graph that blends the two normalized clips.
 *
 * Both chain outputs carry their label, so the maps of the argv always find them.
 *
 * @param transition - Name from the schema enum
 * @param duration - Seconds the blend lasts
 * @param offset - Seconds into the first clip where the blend starts
 * @param withAudio - True only when both clips carry an audio stream
 * @returns The value for one `-filter_complex` element
 */
export function xfadeGraph(
  transition: TransitionValue,
  duration: number,
  offset: number,
  withAudio: boolean,
): string {
  const graph =
    `[0:v][1:v]xfade=transition=${transition}`
    + `:duration=${formatSeconds(duration)}:offset=${formatSeconds(offset)}[v]`;
  if (!withAudio) {
    return graph;
  }
  return `${graph};[0:a][1:a]acrossfade=d=${formatSeconds(duration)}:c1=tri:c2=tri[a]`;
}

async function runConcat(args: ConcatArguments, context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  const requestedDuration = checkTransitionArguments(args);
  const inputs = requireInputTuple(
    context.resolveInputs(args.inputPaths, 'input', 'inputPaths', TOOL_NAME),
  );
  const inspection = await inspectClips(context, inputs);
  if (requestedDuration !== undefined) {
    requireTransitionLength(requestedDuration, inspection);
  }
  const transition =
    args.transition === undefined || requestedDuration === undefined
      ? undefined
      : {
        name: args.transition,
        duration: requestedDuration,
        firstDuration: inspection.firstDuration,
        withAudio: hasBothAudio(inspection.audio),
      };
  const result = await runPipeline(
    context,
    {
      tool: TOOL_NAME,
      outputName: args.outputName,
      inputs,
      upfront: {
        encoders: CONCAT_ENCODERS,
        filters: transition === undefined ? CONCAT_FILTERS : TRANSITION_FILTERS,
      },
    },
    concatStep(context, {
      inputs,
      shape: transition === undefined ? inspection.shape : inspection.transitionShape,
      audio: inspection.audio,
      transition,
    }),
  );
  const baseName = path.basename(inputs[0].rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Joined ${String(inputs.length)} videos starting with ${baseName}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Joins two or more videos in order and leaves every input unchanged. */
export const videoConcatTool = defineTool({
  name: TOOL_NAME,
  title: 'Join videos',
  description:
    'Joins two or more videos into one file, in the order they are given. '
    + 'Without a transition every clip is normalized to the size and frame rate '
    + 'of the first clip and the clips are joined end to end; with a transition '
    + 'exactly two clips are blended into one another. It writes one MP4 file '
    + 'into the export root, in a new numbered folder when subfolder is '
    + 'true, or in the existing folder named by targetFolder, and never '
    + 'changes the input. Run time grows '
    + 'with the total file size: seconds under 100 MB, up to a few minutes from '
    + '100 MB to 1 GB, and minutes to tens of minutes above 1 GB.',
  inputSchema: {
    inputPaths: z
      .array(z.string().min(1))
      .min(MIN_CLIPS)
      .max(MAX_CLIPS)
      .describe(INPUT_PATHS_DESCRIPTION),
    transition: z.enum(TRANSITION_VALUES).optional().describe(TRANSITION_DESCRIPTION),
    transitionDuration: z
      .number()
      .gt(0)
      .optional()
      .describe(TRANSITION_DURATION_DESCRIPTION),
    outputName: outputNameField,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runConcat(args, context);
  },
});
