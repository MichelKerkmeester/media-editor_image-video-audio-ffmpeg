// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Image Overlay Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { imageOverlayGraph } from '../../../src/tools/video/add-image-overlay.js';
import { generateOverlayPng, meanColor } from '../../helpers/composition-media.js';
import { generateAudio, probeJson, resolveTestBinary } from '../../helpers/media.js';
import {
  asList,
  asRecord,
  callTool,
  createSandbox,
  expectProtocolError,
  listFolders,
  sha256Of,
  withToolClient,
} from '../../helpers/tool-client.js';

import type { FrameRegion } from '../../helpers/composition-media.js';
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface StreamView {
  readonly codecType: string;
  readonly codecName: string;
  readonly width: number;
  readonly height: number;
}

interface MediaView {
  readonly durationSeconds: number;
  readonly streams: readonly StreamView[];
}

interface OverlayOutcome extends CallOutcome {
  readonly text: string;
}

interface TimeCase {
  readonly label: string;
  readonly startTime: number;
  readonly endTime: number;
}

interface SchemaCase {
  readonly label: string;
  readonly overrides: Record<string, unknown>;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-add-image-overlay-');

const CLIP_SECONDS = 3;
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const FRAME_RATE = 25;
const PROCESS_TIMEOUT_MS = 60000;
const DURATION_TOLERANCE_SECONDS = 0.15;

// The generated PNG is a red square of half its smaller side, so an 80x80
// image carries the square between its own pixels 20 and 60.
const IMAGE_SIZE = 80;
const OVERLAY_WIDTH = 80;

// The 10 px inset puts an 80 px wide overlay at x 230 and an 80 px tall one
// at y 10 from the top or y 150 from the bottom.
const TOP_RIGHT_REGION: FrameRegion = { x: 250, y: 30, width: 40, height: 40 };
const BOTTOM_LEFT_REGION: FrameRegion = { x: 30, y: 170, width: 40, height: 40 };

// One black fixture frame is nearly 0, so a drawn red square pushes the mean up.
const BLACK_RED_LIMIT = 10;
const DRAWN_RED_MINIMUM = 120;
const HALF_RED_MARGIN = 40;
const SAME_FRAME_TOLERANCE = 5;

const AUDIO_COPY_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const TIME_CASES: readonly TimeCase[] = [
  { label: 'an end time equal to the start time', startTime: 1, endTime: 1 },
  { label: 'an end time before the start time', startTime: 2, endTime: 1 },
];

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'an opacity above one', overrides: { opacity: 1.5 } },
  { label: 'a zero width', overrides: { width: 0 } },
  {
    label: 'a raw coordinate string as the position',
    overrides: { position: 'x=10:y=10' },
  },
  { label: 'a scale expression as the width', overrides: { width: 'iw/2' } },
];

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const outsideImagePath = path.join(sandbox.root, 'outside.png');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
const missingImagePath = path.join(sandbox.allowedRoot, 'missing.png');
writeFileSync(outsidePath, 'outside');
writeFileSync(outsideImagePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function numberOrZero(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function probeView(value: unknown): MediaView {
  const root = asRecord(value);
  const format = asRecord(root.format);
  const durationSeconds = Number(format.duration);
  if (!Number.isFinite(durationSeconds)) {
    throw new Error('expected a probe duration');
  }
  const streams: StreamView[] = [];
  for (const entry of asList(root.streams)) {
    const stream = asRecord(entry);
    const codecType = stream.codec_type;
    if (typeof codecType !== 'string') {
      throw new Error('expected a stream kind');
    }
    streams.push({
      codecType,
      codecName: stringOrEmpty(stream.codec_name),
      width: numberOrZero(stream.width),
      height: numberOrZero(stream.height),
    });
  }
  return { durationSeconds, streams };
}

function streamsOf(view: MediaView, codecType: string): StreamView[] {
  return view.streams.filter((stream) => stream.codecType === codecType);
}

function videoSize(view: MediaView): Size {
  const stream = streamsOf(view, 'video')[0];
  if (stream === undefined) {
    throw new Error('expected a video stream');
  }
  return { width: stream.width, height: stream.height };
}

function textContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  const first: unknown = content[0];
  if (typeof first !== 'object' || first === null) {
    return '';
  }
  if (!('type' in first) || first.type !== 'text' || !('text' in first)) {
    return '';
  }
  return typeof first.text === 'string' ? first.text : '';
}

async function generateBlackClip(
  dir: string,
  fileName: string,
  withAudio: boolean,
  audioCodec = 'aac',
): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  const output = path.join(dir, fileName);
  const args = [
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${FRAME_WIDTH}x${FRAME_HEIGHT}:r=${FRAME_RATE}:d=${CLIP_SECONDS}`,
  ];
  if (withAudio) {
    args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${CLIP_SECONDS}`);
  }
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (withAudio) {
    args.push('-c:a', audioCodec, '-shortest');
  }
  args.push(output);
  await runProcess(binary, args, {
    kind: 'ffmpeg',
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return output;
}

function overlayArgs(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    inputPath: blackPath,
    imagePath: overlayPath,
    position: 'top_right',
    startTime: 0,
    endTime: 5,
    width: OVERLAY_WIDTH,
    ...overrides,
  };
}

async function addImageOverlay(args: Record<string, unknown>): Promise<OverlayOutcome> {
  let outcome: OverlayOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    let text = '';
    // callTool checks the line, and this wrapper keeps it for the text assertion.
    const original = client.callTool.bind(client);
    client.callTool = async (params, schema, options) => {
      const result = await original(params, schema, options);
      text = textContent(result.content);
      return result;
    };
    try {
      const parsed = await callTool(client, 'video_add_image_overlay', args);
      outcome = { ...parsed, text };
    } finally {
      client.callTool = original;
    }
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
}

function writtenPath(
  body: Record<string, unknown>,
  fileName: string,
  slug: string,
  warningCount = 0,
): string {
  expect(body.tool).toBe('video_add_image_overlay');
  expect(asList(body.warnings)).toHaveLength(warningCount);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe('video');
  if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected a video file');
  }
  expect(entry.bytes).toBe(statSync(entry.path).size);
  expect(path.basename(entry.path)).toBe(fileName);
  const folderName = path.basename(path.dirname(entry.path));
  expect(folderName).toMatch(/^\d{3} - /u);
  expect(folderName.endsWith(` - ${slug}`)).toBe(true);
  expect(path.dirname(path.dirname(entry.path))).toBe(sandbox.outputDir);
  return entry.path;
}

async function expectFailure(
  args: Record<string, unknown>,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await addImageOverlay(args);
  expect(outcome.isError).toBe(true);
  expect(outcome.body.code).toBe(code);
  expect(outcome.body.details).toEqual(details);
  expect(outcome.body).not.toHaveProperty('outputs');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function expectRejected(args: Record<string, unknown>): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client) => {
    await expectProtocolError(
      client.callTool({
        name: 'video_add_image_overlay',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

let blackPath = '';
let pcmPath = '';
let silentPath = '';
let overlayPath = '';
let playlistPath = '';
let tonePath = '';
let sourceDuration = 0;
let inputQuietRed = 0;
let inputLoudRed = 0;
let inputTopRightRed = 0;

beforeAll(async (): Promise<void> => {
  blackPath = await generateBlackClip(sandbox.allowedRoot, 'black.mp4', true);
  pcmPath = await generateBlackClip(sandbox.allowedRoot, 'black-pcm.mkv', true, 'pcm_s16le');
  silentPath = await generateBlackClip(sandbox.allowedRoot, 'black-silent.mp4', false);
  overlayPath = await generateOverlayPng(sandbox.allowedRoot, {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  });
  playlistPath = path.join(sandbox.allowedRoot, 'playlist.png');
  writeFileSync(playlistPath, '#EXTM3U\n#EXT-X-VERSION:3\n');
  tonePath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  sourceDuration = probeView(await probeJson(blackPath)).durationSeconds;
  inputQuietRed = (await meanColor(blackPath, 0.5, TOP_RIGHT_REGION)).r;
  inputLoudRed = (await meanColor(blackPath, 2.5, TOP_RIGHT_REGION)).r;
  inputTopRightRed = (await meanColor(blackPath, 1, TOP_RIGHT_REGION)).r;
});

afterAll((): void => {
  sandbox.cleanup();
});

it('test_add_image_overlay: places a half-opacity image top right', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const videoBefore = sha256Of(blackPath);
  const imageBefore = sha256Of(overlayPath);
  expect(sourceDuration).toBeGreaterThanOrEqual(CLIP_SECONDS);
  expect(inputTopRightRed).toBeLessThan(BLACK_RED_LIMIT);

  const full = await addImageOverlay(overlayArgs({ opacity: 1, outputName: 'full opacity' }));
  expect(full.isError).toBe(false);
  const fullPath = writtenPath(full.body, 'black-image-overlay.mp4', 'full-opacity');
  expect(path.dirname(fullPath)).toBe(path.join(sandbox.outputDir, '001 - full-opacity'));
  const fullRed = (await meanColor(fullPath, 1, TOP_RIGHT_REGION)).r;

  const outcome = await addImageOverlay(overlayArgs({ opacity: 0.5, outputName: 'half opacity' }));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-image-overlay.mp4', 'half-opacity');
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '002 - half-opacity'));
  expect(outcome.text).toBe(
    `Placed an image overlay on black.mp4. Output saved to ${filePath}.`,
  );
  const output = probeView(await probeJson(filePath));
  expect(Math.abs(output.durationSeconds - sourceDuration))
    .toBeLessThanOrEqual(DURATION_TOLERANCE_SECONDS);
  const audio = streamsOf(output, 'audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]?.codecName).toBe('aac');
  expect(streamsOf(output, 'video')[0]?.codecName).toBe('h264');
  expect(videoSize(output)).toEqual({ width: FRAME_WIDTH, height: FRAME_HEIGHT });
  const halfRed = (await meanColor(filePath, 1, TOP_RIGHT_REGION)).r;
  expect(fullRed).toBeGreaterThan(DRAWN_RED_MINIMUM);
  expect(halfRed).toBeGreaterThan(inputTopRightRed + HALF_RED_MARGIN);
  expect(halfRed).toBeLessThan(fullRed - HALF_RED_MARGIN);
  expect(sha256Of(blackPath)).toBe(videoBefore);
  expect(sha256Of(overlayPath)).toBe(imageBefore);
});

it('places a full-opacity image at the bottom left', async (): Promise<void> => {
  const before = sha256Of(blackPath);
  const outcome = await addImageOverlay({
    inputPath: blackPath,
    imagePath: overlayPath,
    position: 'bottom_left',
    opacity: 1,
    outputName: 'bottom left',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-image-overlay.mp4', 'bottom-left');
  const corner = (await meanColor(filePath, 1, BOTTOM_LEFT_REGION)).r;
  const opposite = (await meanColor(filePath, 1, TOP_RIGHT_REGION)).r;
  expect(corner).toBeGreaterThan(DRAWN_RED_MINIMUM);
  expect(opposite).toBeLessThan(inputTopRightRed + BLACK_RED_LIMIT);
  expect(sha256Of(blackPath)).toBe(before);
});

it('accepts a hyphen alias of the position', async (): Promise<void> => {
  const before = sha256Of(blackPath);
  const outcome = await addImageOverlay(overlayArgs({
    position: 'top-right',
    outputName: 'hyphen position',
  }));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-image-overlay.mp4', 'hyphen-position');
  const drawn = (await meanColor(filePath, 1, TOP_RIGHT_REGION)).r;
  expect(drawn).toBeGreaterThan(DRAWN_RED_MINIMUM);
  expect(sha256Of(blackPath)).toBe(before);
});

it('draws the image only from its start time on', async (): Promise<void> => {
  const before = sha256Of(blackPath);
  const outcome = await addImageOverlay({
    inputPath: blackPath,
    imagePath: overlayPath,
    position: 'top_right',
    startTime: 1.5,
    outputName: 'start only',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-image-overlay.mp4', 'start-only');
  const quiet = (await meanColor(filePath, 0.5, TOP_RIGHT_REGION)).r;
  const loud = (await meanColor(filePath, 2.5, TOP_RIGHT_REGION)).r;
  expect(quiet).toBeLessThanOrEqual(inputQuietRed + SAME_FRAME_TOLERANCE);
  expect(loud).toBeGreaterThan(inputLoudRed + DRAWN_RED_MINIMUM);
  expect(sha256Of(blackPath)).toBe(before);
});

it('writes a video with no audio stream when the input has none', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const outcome = await addImageOverlay({
    inputPath: silentPath,
    imagePath: overlayPath,
    position: 'top_right',
    width: OVERLAY_WIDTH,
    outputName: 'silent input',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-silent-image-overlay.mp4', 'silent-input');
  const output = probeView(await probeJson(filePath));
  expect(streamsOf(output, 'audio')).toHaveLength(0);
  const drawn = (await meanColor(filePath, 1, TOP_RIGHT_REGION)).r;
  expect(drawn).toBeGreaterThan(DRAWN_RED_MINIMUM);
  expect(sha256Of(silentPath)).toBe(before);
});

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const before = sha256Of(pcmPath);
  const outcome = await addImageOverlay({
    inputPath: pcmPath,
    imagePath: overlayPath,
    position: 'top_right',
    width: OVERLAY_WIDTH,
    outputName: 'pcm fallback',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-pcm-image-overlay.mp4', 'pcm-fallback', 1);
  expect(asList(outcome.body.warnings)).toEqual([AUDIO_COPY_WARNING]);
  const output = probeView(await probeJson(filePath));
  const audio = streamsOf(output, 'audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]?.codecName).toBe('aac');
  expect(sha256Of(pcmPath)).toBe(before);
});

it('reads the overlay input straight when no size and no opacity are given', (): void => {
  expect(imageOverlayGraph({ position: 'top_right' })).toBe(
    '[0:v][1:v]overlay=x=main_w-overlay_w-10:y=10[v]',
  );
});

it('keeps the aspect ratio of the omitted scale side', (): void => {
  expect(imageOverlayGraph({ position: 'top_right', width: OVERLAY_WIDTH })).toBe(
    '[1:v]scale=80:-1[ov];[0:v][ov]overlay=x=main_w-overlay_w-10:y=10[v]',
  );
  expect(imageOverlayGraph({ position: 'top_right', height: 60 })).toBe(
    '[1:v]scale=-1:60[ov];[0:v][ov]overlay=x=main_w-overlay_w-10:y=10[v]',
  );
});

it('adds the alpha chain and both time bounds', (): void => {
  expect(
    imageOverlayGraph({
      position: 'bottom_left',
      width: 160,
      height: 120,
      opacity: 0.5,
      start: 1,
      end: 3,
    }),
  ).toBe(
    '[1:v]scale=160:120,format=rgba,colorchannelmixer=aa=0.5[ov];'
    + `[0:v][ov]overlay=x=10:y=main_h-overlay_h-10:enable='between(t,1,3)'[v]`,
  );
});

it('writes one-sided time bounds on their own', (): void => {
  expect(imageOverlayGraph({ position: 'top_right', end: 2.5 })).toBe(
    `[0:v][1:v]overlay=x=main_w-overlay_w-10:y=10:enable='between(t,0,2.5)'[v]`,
  );
  expect(imageOverlayGraph({ position: 'top_right', start: 1.5 })).toBe(
    `[0:v][1:v]overlay=x=main_w-overlay_w-10:y=10:enable='gte(t,1.5)'[v]`,
  );
});

it('adds the alpha chain without a size', (): void => {
  expect(imageOverlayGraph({ position: 'center', opacity: 0.25 })).toBe(
    '[1:v]format=rgba,colorchannelmixer=aa=0.25[ov];'
    + '[0:v][ov]overlay=x=(main_w-overlay_w)/2:y=(main_h-overlay_h)/2[v]',
  );
});

it.each(TIME_CASES)('refuses $label with INVALID_INPUT', async (row): Promise<void> => {
  await expectFailure(
    overlayArgs({
      startTime: row.startTime,
      endTime: row.endTime,
      outputName: 'bad times',
    }),
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'endTime',
      value: row.endTime,
      reason: 'end-not-after-start',
    },
  );
});

it.each(SCHEMA_CASES)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected(overlayArgs({
      outputName: 'bad schema',
      ...row.overrides,
    }));
  },
);

it('returns INPUT_NOT_FOUND for an image path that is not there', async (): Promise<void> => {
  await expectFailure(
    overlayArgs({ imagePath: missingImagePath, outputName: 'missing image' }),
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingImagePath, role: 'overlay-image' },
  );
});

it('returns PATH_NOT_ALLOWED for an image outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    overlayArgs({ imagePath: outsideImagePath, outputName: 'outside image' }),
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsideImagePath,
      realPath: outsideImagePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('returns UNSUPPORTED_FORMAT for a playlist image', async (): Promise<void> => {
  await expectFailure(
    overlayArgs({ imagePath: playlistPath, outputName: 'playlist image' }),
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: playlistPath,
      detected: 'indirection-container',
      accepted: 'media',
      reason: 'indirection-container',
    },
  );
});

it('returns INPUT_NOT_FOUND when the input is missing', async (): Promise<void> => {
  await expectFailure(
    overlayArgs({ inputPath: missingPath, outputName: 'missing input' }),
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingPath, role: 'input' },
  );
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    overlayArgs({ inputPath: outsidePath, outputName: 'outside input' }),
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsidePath,
      realPath: outsidePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    overlayArgs({ inputPath: tonePath, outputName: 'audio only' }),
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { path: tonePath, detected: ['audio'], accepted: ['video'] },
  );
});

it('lists the tool with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'video_add_image_overlay');
    expect(tool).toBeDefined();
    if (tool === undefined) {
      return;
    }
    expect(tool.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(tool.description).toContain('numbered folder');
    expect(tool.description).toContain('never changes the input');
    expect(tool.description).toContain('100 MB');
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'imagePath', 'position', 'opacity', 'width', 'height']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(properties.position).description)).toContain('top_right');
    expect(tool.inputSchema.required).toEqual(['inputPath', 'imagePath', 'outputName']);
  });
});
