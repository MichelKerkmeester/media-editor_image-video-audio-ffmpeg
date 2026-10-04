// ───────────────────────────────────────────────────────────────────
// MODULE: Composition Capability Gating Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { GATED_ENCODERS, GATED_FILTERS } from '../../../src/core/capabilities.js';
import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import { mediaRemoveSilenceTool } from '../../../src/tools/media/remove-silence.js';
import { videoAddBRollTool } from '../../../src/tools/video/add-b-roll.js';
import { videoAddFadeTool } from '../../../src/tools/video/add-fade.js';
import { videoAddImageOverlayTool } from '../../../src/tools/video/add-image-overlay.js';
import { videoAddSubtitlesTool } from '../../../src/tools/video/add-subtitles.js';
import { videoAddTextOverlayTool } from '../../../src/tools/video/add-text-overlay.js';
import { videoConcatTool } from '../../../src/tools/video/concat.js';
import { generateOverlayPng, writeSubRip } from '../../helpers/composition-media.js';
import { generateAudio, generateVideo } from '../../helpers/media.js';
import {
  asList,
  asRecord,
  createSandbox,
  listFolders,
  sha256Of,
} from '../../helpers/tool-client.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { Capabilities } from '../../../src/core/capabilities.js';
import type { CapabilitySnapshot, ToolContext } from '../../../src/server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Which of the two binary lists a name belongs to. */
type OmittedKind = 'encoder' | 'filter';

/** One capability name the stubbed read leaves out of the gated set. */
interface OmittedName {
  readonly kind: OmittedKind;
  readonly name: string;
}

/** Mutable slot a stubbed context counts ffmpeg runs into. */
interface RunCount {
  count: number;
}

/** One gated call that must stop before its first ffmpeg run. */
interface GateCase {
  readonly label: string;
  readonly toolName: string;
  readonly kind: OmittedKind;
  readonly name: string;
  readonly run: (context: ToolContext) => Promise<unknown>;
}

/** One text element with every schema default spelled out. */
interface TextElementArgs {
  readonly text: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly position: 'top_left';
  readonly fontSize: number;
  readonly fontColor: string;
  readonly box: boolean;
  readonly boxColor: string;
  readonly boxOpacity: number;
  readonly boxBorderWidth: number;
}

/** One b-roll clip with every schema default spelled out. */
interface BrollClipArgs {
  readonly clipPath: string;
  readonly insertAt: number;
  readonly position: 'fullscreen';
  readonly fadeIn: boolean;
  readonly fadeOut: boolean;
  readonly fadeDuration: number;
}

/** One image overlay call with the fields this suite passes. */
interface ImageOverlayArgs {
  readonly inputPath: string;
  readonly imagePath: string;
  readonly position: 'top_left';
  readonly outputName: string;
  readonly opacity?: number;
  readonly width?: number;
}

/** One b-roll call holding a single clip. */
interface BrollArgs {
  readonly inputPath: string;
  readonly outputName: string;
  readonly clips: BrollClipArgs[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('composition-capability-gating-');

const STUB_BINARY_PATH = '/opt/ffmpeg/ffmpeg';

const CLIP_SECONDS = 2;
const BROLL_SECONDS = 1;
const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 120;
const AUDIO_SECONDS = 2;
const OVERLAY_SIZE = 40;
const TRANSITION_SECONDS = 1;
const INSERT_AT_SECONDS = 0.5;
const FADE_SECONDS = 1;
const FADE_DURATION_SECONDS = 0.5;
const SILENCE_THRESHOLD_DB = -30;
const MIN_SILENCE_DURATION_MS = 500;
const OVERLAY_WIDTH = 80;

const FOLDER_PATTERN = /^\d{3} - /u;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isOmitted(
  omitted: readonly OmittedName[],
  kind: OmittedKind,
  name: string,
): boolean {
  return omitted.some((entry) => entry.kind === kind && entry.name === name);
}

/** The gated encoder and filter lists with the given names taken out. */
function capabilitiesWithout(omitted: readonly OmittedName[]): Capabilities {
  return {
    encoders: new Set<string>(
      GATED_ENCODERS.filter((name) => !isOmitted(omitted, 'encoder', name)),
    ),
    filters: new Set<string>(
      GATED_FILTERS.filter((name) => !isOmitted(omitted, 'filter', name)),
    ),
  };
}

/**
 * A context whose capability read reports a reduced set and whose runs are
 * the real ones, optionally counted per ffmpeg call.
 *
 * @param omitted - Names the stubbed read reports as absent
 * @param runs - Slot that counts ffmpeg calls when given
 * @returns Services a tool handler can use
 */
function contextWithoutNames(omitted: readonly OmittedName[], runs?: RunCount): ToolContext {
  const real = createToolContext(sandbox.config);
  const capabilities = capabilitiesWithout(omitted);
  return {
    ...real,
    getCapabilities: async (): Promise<CapabilitySnapshot> => ({
      binaryPath: STUB_BINARY_PATH,
      capabilities,
    }),
    runBinary: async (name, args, options) => {
      if (name === 'ffmpeg' && runs !== undefined) {
        runs.count += 1;
      }
      return real.runBinary(name, args, options);
    },
  };
}

/**
 * Run one gated call against a context missing the case's name.
 *
 * @param entry - Case naming the tool and the one absent capability
 * @returns The capability failure the handler threw
 * @throws {Error} When the call reached ffmpeg or failed with something else
 */
async function refusal(entry: GateCase): Promise<MediaError> {
  const runs: RunCount = { count: 0 };
  const context = contextWithoutNames([{ kind: entry.kind, name: entry.name }], runs);
  let failure: unknown;
  try {
    await entry.run(context);
  } catch (error: unknown) {
    failure = error;
  }
  expect(runs.count).toBe(0);
  expect(failure).toBeInstanceOf(MediaError);
  if (!(failure instanceof MediaError)) {
    throw new Error('expected a capability failure');
  }
  return failure;
}

/**
 * Assert one control call wrote its single file into its own numbered folder.
 *
 * @param result - Result the handler returned
 * @param toolName - Registered name the body must carry
 * @param fileName - File name the contract fixes for this call
 * @param slug - Slug the numbered folder name must end with
 * @returns Path of the written file
 * @throws {Error} When the body carries no file entry
 */
function writtenFile(
  result: CallToolResult,
  toolName: string,
  fileName: string,
  slug: string,
): string {
  expect(result.isError).not.toBe(true);
  const body = asRecord(result.structuredContent);
  expect(body.tool).toBe(toolName);
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  const filePath = entry.path;
  if (typeof filePath !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected one written file');
  }
  expect(entry.mediaType).toBe('video');
  expect(entry.bytes).toBe(statSync(filePath).size);
  expect(path.basename(filePath)).toBe(fileName);
  const folder = path.basename(path.dirname(filePath));
  expect(folder).toMatch(FOLDER_PATTERN);
  expect(folder.endsWith(` - ${slug}`)).toBe(true);
  expect(path.dirname(path.dirname(filePath))).toBe(sandbox.outputDir);
  return filePath;
}

function textElement(): TextElementArgs {
  return {
    text: 'Gate',
    startTime: 0,
    endTime: 1,
    position: 'top_left',
    fontSize: 24,
    fontColor: '#FFFFFF',
    box: false,
    boxColor: '#000000',
    boxOpacity: 0.5,
    boxBorderWidth: 0,
  };
}

function brollArgs(outputName: string, fadeIn: boolean): BrollArgs {
  return {
    inputPath: clipA,
    outputName,
    clips: [
      {
        clipPath: brollClip,
        insertAt: INSERT_AT_SECONDS,
        position: 'fullscreen',
        fadeIn,
        fadeOut: false,
        fadeDuration: FADE_DURATION_SECONDS,
      },
    ],
  };
}

function imageOverlayArgs(outputName: string): ImageOverlayArgs {
  return {
    inputPath: clipA,
    imagePath: overlayPath,
    position: 'top_left',
    outputName,
  };
}

/**
 * Every gated call whose absent name must stop it before ffmpeg starts.
 * The paths are read when a case runs, after the shared media exists.
 */
function gateCases(): readonly GateCase[] {
  return [
    {
      label: 'video_add_subtitles without subtitles',
      toolName: 'video_add_subtitles',
      kind: 'filter',
      name: 'subtitles',
      run: (context): Promise<unknown> => videoAddSubtitlesTool.handler(
        { inputPath: clipA, subtitlePath, outputName: 'gate subtitles' },
        context,
      ),
    },
    {
      label: 'video_add_text_overlay without drawtext',
      toolName: 'video_add_text_overlay',
      kind: 'filter',
      name: 'drawtext',
      run: (context): Promise<unknown> => videoAddTextOverlayTool.handler(
        { inputPath: clipA, outputName: 'gate drawtext', textElements: [textElement()] },
        context,
      ),
    },
    {
      label: 'video_add_text_overlay without libx264',
      toolName: 'video_add_text_overlay',
      kind: 'encoder',
      name: 'libx264',
      run: (context): Promise<unknown> => videoAddTextOverlayTool.handler(
        { inputPath: clipA, outputName: 'gate text encoder', textElements: [textElement()] },
        context,
      ),
    },
    {
      label: 'video_add_image_overlay without overlay',
      toolName: 'video_add_image_overlay',
      kind: 'filter',
      name: 'overlay',
      run: (context): Promise<unknown> => videoAddImageOverlayTool.handler(
        imageOverlayArgs('gate overlay'),
        context,
      ),
    },
    {
      label: 'video_add_image_overlay without colorchannelmixer',
      toolName: 'video_add_image_overlay',
      kind: 'filter',
      name: 'colorchannelmixer',
      run: (context): Promise<unknown> => videoAddImageOverlayTool.handler(
        { ...imageOverlayArgs('gate opacity'), opacity: 0.5 },
        context,
      ),
    },
    {
      label: 'video_add_image_overlay without scale',
      toolName: 'video_add_image_overlay',
      kind: 'filter',
      name: 'scale',
      run: (context): Promise<unknown> => videoAddImageOverlayTool.handler(
        { ...imageOverlayArgs('gate scale'), width: OVERLAY_WIDTH },
        context,
      ),
    },
    {
      label: 'video_concat without xfade',
      toolName: 'video_concat',
      kind: 'filter',
      name: 'xfade',
      run: (context): Promise<unknown> => videoConcatTool.handler(
        {
          inputPaths: [clipA, clipB],
          transition: 'dissolve',
          transitionDuration: TRANSITION_SECONDS,
          outputName: 'gate xfade',
        },
        context,
      ),
    },
    {
      label: 'video_concat without acrossfade',
      toolName: 'video_concat',
      kind: 'filter',
      name: 'acrossfade',
      run: (context): Promise<unknown> => videoConcatTool.handler(
        {
          inputPaths: [clipA, clipB],
          transition: 'dissolve',
          transitionDuration: TRANSITION_SECONDS,
          outputName: 'gate acrossfade',
        },
        context,
      ),
    },
    {
      label: 'media_remove_silence without silencedetect',
      toolName: 'media_remove_silence',
      kind: 'filter',
      name: 'silencedetect',
      run: (context): Promise<unknown> => mediaRemoveSilenceTool.handler(
        {
          inputPath: audioPath,
          silenceThresholdDb: SILENCE_THRESHOLD_DB,
          minSilenceDurationMs: MIN_SILENCE_DURATION_MS,
          outputName: 'gate silence',
        },
        context,
      ),
    },
    {
      label: 'video_add_b_roll without overlay',
      toolName: 'video_add_b_roll',
      kind: 'filter',
      name: 'overlay',
      run: (context): Promise<unknown> => videoAddBRollTool.handler(
        brollArgs('gate b-roll overlay', false),
        context,
      ),
    },
    {
      label: 'video_add_b_roll without setpts',
      toolName: 'video_add_b_roll',
      kind: 'filter',
      name: 'setpts',
      run: (context): Promise<unknown> => videoAddBRollTool.handler(
        brollArgs('gate setpts', false),
        context,
      ),
    },
    {
      label: 'video_add_b_roll without fade',
      toolName: 'video_add_b_roll',
      kind: 'filter',
      name: 'fade',
      run: (context): Promise<unknown> => videoAddBRollTool.handler(
        brollArgs('gate b-roll fade', true),
        context,
      ),
    },
    {
      label: 'video_add_fade without fade',
      toolName: 'video_add_fade',
      kind: 'filter',
      name: 'fade',
      run: (context): Promise<unknown> => videoAddFadeTool.handler(
        {
          inputPath: clipA,
          outputName: 'gate fade',
          fadeType: 'fade_in',
          duration: FADE_SECONDS,
        },
        context,
      ),
    },
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

let clipA = '';
let clipB = '';
let brollClip = '';
let audioPath = '';
let subtitlePath = '';
let overlayPath = '';

const GATE_CASES: readonly GateCase[] = gateCases();

beforeAll(async (): Promise<void> => {
  clipA = await generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    fileName: 'clip-a.mp4',
  });
  clipB = await generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    fileName: 'clip-b.mp4',
  });
  brollClip = await generateVideo(sandbox.allowedRoot, {
    seconds: BROLL_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    fileName: 'broll.mp4',
  });
  audioPath = await generateAudio(sandbox.allowedRoot, {
    seconds: AUDIO_SECONDS,
    format: 'wav',
    fileName: 'tone.wav',
  });
  subtitlePath = writeSubRip(sandbox.allowedRoot, 'cues.srt', [
    { start: 0, end: 1, text: 'Gate' },
  ]);
  overlayPath = await generateOverlayPng(sandbox.allowedRoot, {
    width: OVERLAY_SIZE,
    height: OVERLAY_SIZE,
    fileName: 'patch.png',
  });
});

afterAll((): void => {
  sandbox.cleanup();
});

it.each(GATE_CASES)(
  '$label is refused before ffmpeg runs',
  async (entry): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const failure = await refusal(entry);
    expect(failure.code).toBe(ERROR_CODES.CAPABILITY_MISSING);
    expect(failure.details).toEqual({
      binary: STUB_BINARY_PATH,
      kind: entry.kind,
      name: entry.name,
      neededBy: entry.toolName,
    });
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  },
);

it(
  'test_concatenate_videos: joins without a transition with xfade absent',
  async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const beforeA = sha256Of(clipA);
    const beforeB = sha256Of(clipB);
    const runs: RunCount = { count: 0 };
    const context = contextWithoutNames(
      [
        { kind: 'filter', name: 'xfade' },
        { kind: 'filter', name: 'acrossfade' },
      ],
      runs,
    );
    const result = await videoConcatTool.handler(
      { inputPaths: [clipA, clipB], outputName: 'no transition control' },
      context,
    );
    writtenFile(result, 'video_concat', 'clip-a-joined.mp4', 'no-transition-control');
    expect(runs.count).toBeGreaterThan(0);
    expect(listFolders(sandbox.outputDir)).toHaveLength(before.length + 1);
    expect(sha256Of(clipA)).toBe(beforeA);
    expect(sha256Of(clipB)).toBe(beforeB);
  },
);

it(
  'test_add_image_overlay: overlays without a size or an opacity',
  async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const beforeClip = sha256Of(clipA);
    const beforeImage = sha256Of(overlayPath);
    const runs: RunCount = { count: 0 };
    const context = contextWithoutNames(
      [
        { kind: 'filter', name: 'colorchannelmixer' },
        { kind: 'filter', name: 'scale' },
      ],
      runs,
    );
    const result = await videoAddImageOverlayTool.handler(
      imageOverlayArgs('plain overlay control'),
      context,
    );
    writtenFile(
      result,
      'video_add_image_overlay',
      'clip-a-image-overlay.mp4',
      'plain-overlay-control',
    );
    expect(runs.count).toBeGreaterThan(0);
    expect(listFolders(sandbox.outputDir)).toHaveLength(before.length + 1);
    expect(sha256Of(clipA)).toBe(beforeClip);
    expect(sha256Of(overlayPath)).toBe(beforeImage);
  },
);
