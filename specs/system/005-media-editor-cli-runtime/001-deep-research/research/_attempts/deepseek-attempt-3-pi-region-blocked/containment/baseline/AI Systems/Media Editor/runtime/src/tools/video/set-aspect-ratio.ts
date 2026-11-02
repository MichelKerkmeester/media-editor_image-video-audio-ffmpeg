// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Aspect Ratio
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import {
  detectedKinds,
  probeMedia,
  requireVideoStream,
} from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import {
  aspectRatioField,
  paddingColorField,
  parseAspectRatio,
} from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { MediaProperties } from '../../core/media-properties.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { EncodeAttempt, UpfrontNames } from './copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Pad adds a border. Crop cuts the overflow. */
type AspectMode = 'pad' | 'crop';

/** Arguments after schema defaults are applied. */
interface AspectArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly aspectRatio: string;
  readonly resizeMode: AspectMode;
  readonly paddingColor: string;
}

/** Even frame and the filter that produces it. Absent when the ratio matches. */
export interface AspectFrame {
  readonly filter: string;
  readonly width: number;
  readonly height: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_aspect_ratio';
const ASPECT_OPERATION = 'aspect';
const ASPECT_EXTENSION = '.mp4';
const ASPECT_TEMP_NAME = 'aspect.mp4';
const RATIO_EPSILON = 1e-4;
const MIN_EVEN_SIDE = 2;

const RESIZE_MODES = ['pad', 'crop'] as const satisfies readonly AspectMode[];

const COPY_FALLBACK_ENCODERS = ['libx264', 'aac'] as const;
const VIDEO_ENCODERS = ['libx264'] as const;
const AUDIO_FALLBACK_ENCODERS = ['aac'] as const;
const PAD_FILTERS = ['scale', 'pad'] as const;
const CROP_FILTERS = ['crop'] as const;

const COPY_FALLBACK_WARNING =
  'The streams could not be copied into MP4, so the video was re-encoded '
  + 'with libx264 and aac.';
const AUDIO_FALLBACK_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const ASPECT_RATIO_DESCRIPTION =
  'Target aspect ratio written as width:height, each side from 1 to 999, '
  + 'for example 16:9.';

const RESIZE_MODE_DESCRIPTION =
  'How the picture meets the ratio. pad adds a border and crop cuts the '
  + 'overflow. Defaults to pad.';

const PADDING_COLOR_DESCRIPTION =
  'Border colour as #RRGGBB when pad is used. Defaults to #000000.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function evenSide(value: number): number {
  const truncated = Math.trunc(value);
  return Math.max(MIN_EVEN_SIDE, truncated - (truncated % 2));
}

function targetRatio(value: string): number {
  const parsed = parseAspectRatio(value);
  if (parsed === undefined) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'The aspect ratio is not a width and a height.',
      {
        parameter: 'aspectRatio',
        value,
        reason: 'aspect-ratio',
      },
    );
  }
  return parsed.width / parsed.height;
}

function resizeArgs(
  realPath: string,
  filter: string,
  audioCodec: 'copy' | 'aac',
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-vf',
    filter,
    '-c:v',
    'libx264',
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

function streamCopy(realPath: string): readonly [EncodeAttempt, EncodeAttempt] {
  return [
    {
      buildArgs(outputPath: string): string[] {
        return ['-n', '-i', realPath, '-c', 'copy', outputPath];
      },
    },
    {
      encoders: COPY_FALLBACK_ENCODERS,
      warning: COPY_FALLBACK_WARNING,
      buildArgs(outputPath: string): string[] {
        return [
          '-n',
          '-i',
          realPath,
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          outputPath,
        ];
      },
    },
  ];
}

function resizeAttempts(
  realPath: string,
  filter: string,
): readonly [EncodeAttempt, EncodeAttempt] {
  return [
    {
      buildArgs(outputPath: string): string[] {
        return resizeArgs(realPath, filter, 'copy', outputPath);
      },
    },
    {
      encoders: AUDIO_FALLBACK_ENCODERS,
      warning: AUDIO_FALLBACK_WARNING,
      buildArgs(outputPath: string): string[] {
        return resizeArgs(realPath, filter, 'aac', outputPath);
      },
    },
  ];
}

function upfrontNames(mode: AspectMode): UpfrontNames {
  if (mode === 'pad') {
    return { encoders: VIDEO_ENCODERS, filters: PAD_FILTERS };
  }
  return { encoders: VIDEO_ENCODERS, filters: CROP_FILTERS };
}

function unusablePicture(
  input: ResolvedInput,
  properties: MediaProperties,
): MediaError {
  return new MediaError(
    ERROR_CODES.UNSUPPORTED_FORMAT,
    'This video has no usable picture size.',
    {
      path: input.rawPath,
      detected: detectedKinds(properties),
      accepted: ['video'],
    },
  );
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetAspectRatio(
  args: AspectArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const ratio = targetRatio(args.aspectRatio);
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  const properties = await probeMedia(context, input);
  const video = requireVideoStream(input, properties);
  if (video.width === 0 || video.height === 0) {
    throw unusablePicture(input, properties);
  }
  const frame = aspectFilter(
    video.width,
    video.height,
    ratio,
    args.resizeMode,
    args.paddingColor,
  );
  const result = frame === undefined
    ? await runAttempts(context, {
      tool: TOOL_NAME,
      outputName: args.outputName,
      input,
      mediaType: 'video',
      operation: ASPECT_OPERATION,
      extension: ASPECT_EXTENSION,
      tempName: ASPECT_TEMP_NAME,
      upfront: {},
      attempts: streamCopy(input.realPath),
    })
    : await runAttempts(context, {
      tool: TOOL_NAME,
      outputName: args.outputName,
      input,
      mediaType: 'video',
      operation: ASPECT_OPERATION,
      extension: ASPECT_EXTENSION,
      tempName: ASPECT_TEMP_NAME,
      upfront: upfrontNames(args.resizeMode),
      attempts: resizeAttempts(input.realPath, frame.filter),
    });
  const baseName = path.basename(input.rawPath);
  const summary = frame === undefined
    ? `${baseName} already has the aspect ratio ${args.aspectRatio}, so it was copied unchanged.`
    : `Set the aspect ratio of ${baseName} to ${args.aspectRatio}.`;
  return successResult({
    tool: TOOL_NAME,
    text: `${summary} Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Build the pad or crop filter for one picture and target ratio.
 *
 * Returns undefined when the picture is already within 0.0001 of `ratio`,
 * so the caller can copy the streams. Each computed side uses `even(n) =
 * Math.max(2, n - (n % 2))` after `Math.trunc`, because libx264 4:2:0
 * refuses an odd width or height.
 *
 * @param width - Source width in pixels
 * @param height - Source height in pixels
 * @param ratio - Target width divided by target height
 * @param mode - Pad with a border, or crop the overflow
 * @param color - `#RRGGBB` pad colour; ignored for a crop or a match
 * @returns The filter and the even frame, or undefined when the ratio matches
 */
export function aspectFilter(
  width: number,
  height: number,
  ratio: number,
  mode: AspectMode,
  color: string,
): AspectFrame | undefined {
  const original = width / height;
  if (Math.abs(original - ratio) < RATIO_EPSILON) {
    return undefined;
  }
  const wider = original > ratio;
  const frameWidth = wider ? evenSide(height * ratio) : evenSide(width);
  const frameHeight = wider ? evenSide(height) : evenSide(width / ratio);
  if (mode === 'pad') {
    const scale = `scale=${frameWidth}:${frameHeight}:force_original_aspect_ratio=decrease`;
    const pad = `pad=${frameWidth}:${frameHeight}:(ow-iw)/2:(oh-ih)/2:${color}`;
    return {
      filter: `${scale},${pad}`,
      width: frameWidth,
      height: frameHeight,
    };
  }
  const x = wider ? `(iw-${frameWidth})/2` : '0';
  const y = wider ? '0' : `(ih-${frameHeight})/2`;
  return {
    filter: `crop=${frameWidth}:${frameHeight}:${x}:${y}`,
    width: frameWidth,
    height: frameHeight,
  };
}

/** Fits one video to a target aspect ratio and leaves the input unchanged. */
export const videoSetAspectRatioTool = defineTool({
  name: TOOL_NAME,
  title: 'Set aspect ratio',
  description:
    'Fits one video to a target aspect ratio by padding it or by cropping it. '
    + 'It writes the file in the export root, in a new numbered folder '
    + 'when subfolder is true, or in the existing folder named by '
    + 'targetFolder, and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    aspectRatio: aspectRatioField(ASPECT_RATIO_DESCRIPTION),
    resizeMode: z
      .enum(RESIZE_MODES)
      .default('pad')
      .describe(RESIZE_MODE_DESCRIPTION),
    paddingColor: paddingColorField(PADDING_COLOR_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetAspectRatio(args, context);
  },
});
