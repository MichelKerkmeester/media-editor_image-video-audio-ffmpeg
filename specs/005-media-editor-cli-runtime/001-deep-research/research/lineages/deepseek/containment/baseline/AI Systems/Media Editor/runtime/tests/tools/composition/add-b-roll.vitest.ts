// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add B Roll Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { brollGraph, clipFilter } from '../../../src/tools/video/add-b-roll.js';
import { copyFixture, meanColor } from '../../helpers/composition-media.js';
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

import type { BrollClip } from '../../../src/tools/video/add-b-roll.js';
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

interface ToolOutcome extends CallOutcome {
  readonly text: string;
}

interface SchemaCase {
  readonly label: string;
  readonly overrides: Record<string, unknown>;
}

interface ColorPiece {
  readonly color: string;
  readonly seconds: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-add-b-roll-');

const TOOL_NAME = 'video_add_b_roll';

const FRAME_WIDTH = 160;
const FRAME_HEIGHT = 120;
const FRAME_RATE = 25;
const PROCESS_TIMEOUT_MS = 60000;

const MAIN_SECONDS = 6;
const INSERT_AT_SECONDS = 2;
const RED_SECONDS = 1;
const BLUE_SECONDS = 2;

const DURATION_RELATIVE_TOLERANCE = 0.1;

const CENTER_REGION: FrameRegion = { x: 60, y: 40, width: 40, height: 40 };
const BOTTOM_RIGHT_REGION: FrameRegion = { x: 90, y: 70, width: 40, height: 30 };
const TOP_LEFT_REGION: FrameRegion = { x: 10, y: 10, width: 40, height: 30 };

const BLACK_LIMIT = 30;
const OTHER_CHANNEL_LIMIT = 80;
const COLORED_MINIMUM = 120;
const FADE_DARK_MAXIMUM = 100;
const FADE_BRIGHT_MINIMUM = 160;
const FADE_GAP_MINIMUM = 60;

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'an invalid position', overrides: { position: 'invalid-position' } },
  { label: 'the audioMix key', overrides: { audioMix: 0.5 } },
  { label: 'the audio_mix key', overrides: { audio_mix: 0.5 } },
  { label: 'the transitionIn key', overrides: { transitionIn: 'slide_left' } },
  { label: 'the transition_in key', overrides: { transition_in: 'fade' } },
];

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

async function requiredFfmpeg(): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  return binary;
}

async function generateColorClip(
  dir: string,
  fileName: string,
  pieces: readonly ColorPiece[],
): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, fileName);
  const args: string[] = [];
  for (const piece of pieces) {
    args.push(
      '-f',
      'lavfi',
      '-i',
      `color=c=${piece.color}:s=${FRAME_WIDTH}x${FRAME_HEIGHT}`
        + `:r=${FRAME_RATE}:d=${piece.seconds}`,
    );
  }
  const labels = pieces.map((_piece, index) => `[${index}:v]`).join('');
  args.push(
    '-filter_complex',
    `${labels}concat=n=${pieces.length}:v=1:a=0[v]`,
    '-map',
    '[v]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    output,
  );
  await runProcess(binary, args, { kind: 'ffmpeg', timeoutMs: PROCESS_TIMEOUT_MS });
  return output;
}

async function generateBlackMain(
  dir: string,
  fileName: string,
  withAudio: boolean,
): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, fileName);
  const args = [
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${FRAME_WIDTH}x${FRAME_HEIGHT}:r=${FRAME_RATE}:d=${MAIN_SECONDS}`,
  ];
  if (withAudio) {
    args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${MAIN_SECONDS}`);
  }
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (withAudio) {
    args.push('-c:a', 'aac', '-shortest');
  }
  args.push(output);
  await runProcess(binary, args, { kind: 'ffmpeg', timeoutMs: PROCESS_TIMEOUT_MS });
  return output;
}

function brollArgs(
  clips: readonly Record<string, unknown>[],
  outputName: string,
  inputPath: string = mainPath,
): Record<string, unknown> {
  return { inputPath, clips, outputName };
}

async function runTool(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client): Promise<void> => {
    outcome = await callTool(client, TOOL_NAME, args);
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
}

async function runToolWithText(args: Record<string, unknown>): Promise<ToolOutcome> {
  let outcome: CallOutcome | undefined;
  let text = '';
  await withToolClient(sandbox.config, async (client): Promise<void> => {
    const result = await client.callTool({
      name: TOOL_NAME,
      arguments: { subfolder: true, ...args },
    });
    text = textContent(result.content);
    outcome = {
      isError: result.isError === true,
      body: asRecord(result.structuredContent),
    };
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return { ...outcome, text };
}

function writtenPath(body: Record<string, unknown>, fileName: string, slug: string): string {
  expect(body.tool).toBe(TOOL_NAME);
  expect(asList(body.warnings)).toHaveLength(0);
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
  const outcome = await runTool(args);
  expect(outcome.isError).toBe(true);
  expect(outcome.body.code).toBe(code);
  expect(outcome.body.details).toEqual(details);
  expect(outcome.body).not.toHaveProperty('outputs');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function expectRejected(clips: readonly Record<string, unknown>[]): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client): Promise<void> => {
    await expectProtocolError(
      client.callTool({
        name: TOOL_NAME,
        arguments: brollArgs(clips, 'bad schema'),
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

function fullscreenClip(): BrollClip {
  return { position: 'fullscreen', fadeIn: false, fadeOut: false, fadeDuration: 0.5 };
}

function gridClip(scale: number): BrollClip {
  return { position: 'bottom_left', scale, fadeIn: false, fadeOut: false, fadeDuration: 0.5 };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

let mainPath = '';
let broll1Path = '';
let broll2Path = '';
let blackMain = '';
let silentMain = '';
let redBluePath = '';
let audioOnlyPath = '';
let outsidePath = '';
let missingClipPath = '';
let missingMainPath = '';
let mainDuration = 0;

beforeAll(async (): Promise<void> => {
  mainPath = copyFixture('main_video.mp4', sandbox.allowedRoot);
  broll1Path = copyFixture('broll1.mp4', sandbox.allowedRoot);
  broll2Path = copyFixture('broll2.mp4', sandbox.allowedRoot);
  blackMain = await generateBlackMain(sandbox.allowedRoot, 'black-main.mp4', true);
  silentMain = await generateBlackMain(sandbox.allowedRoot, 'silent-main.mp4', false);
  redBluePath = await generateColorClip(sandbox.allowedRoot, 'red-blue.mp4', [
    { color: 'red', seconds: RED_SECONDS },
    { color: 'blue', seconds: BLUE_SECONDS },
  ]);
  audioOnlyPath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  outsidePath = path.join(sandbox.root, 'outside.mp4');
  writeFileSync(outsidePath, 'outside');
  missingClipPath = path.join(sandbox.allowedRoot, 'missing-clip.mp4');
  missingMainPath = path.join(sandbox.allowedRoot, 'missing-main.mp4');
  mainDuration = probeView(await probeJson(mainPath)).durationSeconds;
});

afterAll((): void => {
  sandbox.cleanup();
});

it('test_add_b_roll: fullscreen with fades', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const mainBefore = sha256Of(mainPath);
  const clipBefore = sha256Of(broll1Path);
  expect(mainDuration).toBeGreaterThanOrEqual(9);

  const outcome = await runToolWithText(brollArgs([
    {
      clipPath: broll1Path,
      insertAt: '00:00:02',
      position: 'fullscreen',
      fadeIn: true,
      fadeOut: true,
      fadeDuration: 0.5,
    },
  ], 'fullscreen fades'));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'main_video-b-roll.mp4', 'fullscreen-fades');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - fullscreen-fades'),
  );
  expect(outcome.text).toBe(
    `Added 1 b-roll clip to main_video.mp4. Output saved to ${filePath}.`,
  );
  const view = probeView(await probeJson(filePath));
  expect(Math.abs(view.durationSeconds - mainDuration)).toBeLessThanOrEqual(
    mainDuration * DURATION_RELATIVE_TOLERANCE,
  );
  expect(streamsOf(view, 'video')).toHaveLength(1);
  expect(streamsOf(view, 'audio')).toHaveLength(0);
  expect(sha256Of(mainPath)).toBe(mainBefore);
  expect(sha256Of(broll1Path)).toBe(clipBefore);
});

it('test_add_b_roll: picture in picture', async (): Promise<void> => {
  const before = sha256Of(broll1Path);
  const outcome = await runTool(brollArgs([
    {
      clipPath: broll1Path,
      insertAt: '00:00:03',
      position: 'top-right',
      scale: 0.3,
      fadeIn: true,
      fadeOut: true,
      fadeDuration: 0.7,
    },
  ], 'picture in picture'));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'main_video-b-roll.mp4', 'picture-in-picture');
  const view = probeView(await probeJson(filePath));
  expect(Math.abs(view.durationSeconds - mainDuration)).toBeLessThanOrEqual(
    mainDuration * DURATION_RELATIVE_TOLERANCE,
  );
  expect(sha256Of(broll1Path)).toBe(before);
});

it('test_add_b_roll: two positions', async (): Promise<void> => {
  const outcome = await runTool(brollArgs([
    { clipPath: broll1Path, insertAt: 1, position: 'bottom_left', scale: 0.4 },
    { clipPath: broll2Path, insertAt: 4, position: 'top_right', scale: 0.4 },
  ], 'two positions'));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'main_video-b-roll.mp4', 'two-positions');
  const view = probeView(await probeJson(filePath));
  expect(Math.abs(view.durationSeconds - mainDuration)).toBeLessThanOrEqual(
    mainDuration * DURATION_RELATIVE_TOLERANCE,
  );
});

it('test_add_b_roll: invalid position', async (): Promise<void> => {
  await expectRejected([
    { clipPath: broll1Path, insertAt: 0, position: 'invalid-position' },
  ]);
});

it('test_add_b_roll: missing clip', async (): Promise<void> => {
  await expectFailure(
    brollArgs([{ clipPath: missingClipPath, insertAt: 1 }], 'missing clip'),
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingClipPath, role: 'input' },
  );
});

it('shifts each clip to its insertion time', async (): Promise<void> => {
  const outcome = await runTool(brollArgs([
    { clipPath: redBluePath, insertAt: INSERT_AT_SECONDS, position: 'fullscreen' },
  ], 'timing', blackMain));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-main-b-roll.mp4', 'timing');
  const before = await meanColor(filePath, 1.5, CENTER_REGION);
  const redFrame = await meanColor(filePath, 2.5, CENTER_REGION);
  const blueFrame = await meanColor(filePath, 4, CENTER_REGION);
  const after = await meanColor(filePath, 5.5, CENTER_REGION);
  expect(before.r).toBeLessThan(BLACK_LIMIT);
  expect(redFrame.r).toBeGreaterThan(COLORED_MINIMUM);
  expect(redFrame.b).toBeLessThan(OTHER_CHANNEL_LIMIT);
  expect(blueFrame.b).toBeGreaterThan(COLORED_MINIMUM);
  expect(blueFrame.r).toBeLessThan(OTHER_CHANNEL_LIMIT);
  expect(after.r).toBeLessThan(BLACK_LIMIT);
  expect(after.b).toBeLessThan(BLACK_LIMIT);
});

it('fades the clip in inside its window', async (): Promise<void> => {
  const outcome = await runTool(brollArgs([
    {
      clipPath: redBluePath,
      insertAt: INSERT_AT_SECONDS,
      position: 'fullscreen',
      fadeIn: true,
      fadeDuration: 1,
    },
  ], 'fade window', blackMain));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-main-b-roll.mp4', 'fade-window');
  const early = await meanColor(filePath, 2.1, CENTER_REGION);
  const late = await meanColor(filePath, 2.9, CENTER_REGION);
  expect(early.r).toBeLessThan(FADE_DARK_MAXIMUM);
  expect(late.r).toBeGreaterThan(FADE_BRIGHT_MINIMUM);
  expect(late.r - early.r).toBeGreaterThan(FADE_GAP_MINIMUM);
});

it('draws a scaled clip at its grid position', async (): Promise<void> => {
  const outcome = await runTool(brollArgs([
    { clipPath: redBluePath, insertAt: INSERT_AT_SECONDS, position: 'bottom_right', scale: 0.5 },
  ], 'grid position', blackMain));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-main-b-roll.mp4', 'grid-position');
  const corner = await meanColor(filePath, 2.5, BOTTOM_RIGHT_REGION);
  const opposite = await meanColor(filePath, 2.5, TOP_LEFT_REGION);
  expect(corner.r).toBeGreaterThan(COLORED_MINIMUM);
  expect(opposite.r).toBeLessThan(BLACK_LIMIT);
});

it('closes the window at the requested clip length', async (): Promise<void> => {
  const outcome = await runTool(brollArgs([
    {
      clipPath: redBluePath,
      insertAt: INSERT_AT_SECONDS,
      duration: 1,
      position: 'fullscreen',
    },
  ], 'shown length', blackMain));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-main-b-roll.mp4', 'shown-length');
  const during = await meanColor(filePath, 2.5, CENTER_REGION);
  const after = await meanColor(filePath, 3.5, CENTER_REGION);
  expect(during.r).toBeGreaterThan(COLORED_MINIMUM);
  expect(after.r).toBeLessThan(BLACK_LIMIT);
  expect(after.b).toBeLessThan(BLACK_LIMIT);
});

it('keeps main audio and writes none for a silent main', async (): Promise<void> => {
  const withSound = await runTool(brollArgs([
    { clipPath: redBluePath, insertAt: 1, position: 'fullscreen' },
  ], 'with sound', blackMain));
  expect(withSound.isError).toBe(false);
  const soundPath = writtenPath(withSound.body, 'black-main-b-roll.mp4', 'with-sound');
  const soundAudio = streamsOf(probeView(await probeJson(soundPath)), 'audio');
  expect(soundAudio).toHaveLength(1);
  expect(soundAudio[0]?.codecName).toBe('aac');

  const silent = await runTool(brollArgs([
    { clipPath: redBluePath, insertAt: 1, position: 'fullscreen' },
  ], 'silent main', silentMain));
  expect(silent.isError).toBe(false);
  const silentPath = writtenPath(silent.body, 'silent-main-b-roll.mp4', 'silent-main');
  expect(streamsOf(probeView(await probeJson(silentPath)), 'audio')).toHaveLength(0);
});

it('refuses an empty clip list with INVALID_INPUT', async (): Promise<void> => {
  await expectFailure(
    brollArgs([], 'empty clips'),
    ERROR_CODES.INVALID_INPUT,
    { parameter: 'clips', value: 0, reason: 'empty' },
  );
});

it('refuses a scale on a fullscreen clip with INVALID_INPUT', async (): Promise<void> => {
  await expectFailure(
    brollArgs([
      { clipPath: broll1Path, insertAt: 1, position: 'fullscreen', scale: 0.5 },
    ], 'fullscreen scale'),
    ERROR_CODES.INVALID_INPUT,
    { parameter: 'clips[0].scale', value: 0.5, reason: 'scale-with-fullscreen' },
  );
});

it('refuses an insertAt past the main end with INVALID_INPUT', async (): Promise<void> => {
  await expectFailure(
    brollArgs([{ clipPath: broll1Path, insertAt: 11 }], 'past end'),
    ERROR_CODES.INVALID_INPUT,
    { parameter: 'clips[0].insertAt', value: 11, reason: 'past-end' },
  );
});

it('returns UNSUPPORTED_FORMAT for an audio-only clip', async (): Promise<void> => {
  await expectFailure(
    brollArgs([{ clipPath: audioOnlyPath, insertAt: 1 }], 'audio clip'),
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { path: audioOnlyPath, detected: ['audio'], accepted: ['video'] },
  );
});

it('returns UNSUPPORTED_FORMAT for an audio-only main video', async (): Promise<void> => {
  await expectFailure(
    brollArgs([{ clipPath: broll1Path, insertAt: 1 }], 'audio main', audioOnlyPath),
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { path: audioOnlyPath, detected: ['audio'], accepted: ['video'] },
  );
});

it('returns PATH_NOT_ALLOWED for a clip outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    brollArgs([{ clipPath: outsidePath, insertAt: 1 }], 'outside clip'),
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsidePath,
      realPath: outsidePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('returns PATH_NOT_ALLOWED for a main outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    brollArgs([{ clipPath: broll1Path, insertAt: 1 }], 'outside main', outsidePath),
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsidePath,
      realPath: outsidePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('returns INPUT_NOT_FOUND when the main video is missing', async (): Promise<void> => {
  await expectFailure(
    brollArgs([{ clipPath: broll1Path, insertAt: 1 }], 'missing main', missingMainPath),
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingMainPath, role: 'input' },
  );
});

it.each(SCHEMA_CASES)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected([
      { clipPath: broll1Path, insertAt: 0, ...row.overrides },
    ]);
  },
);

it('builds the scale chain of one clip', (): void => {
  expect(clipFilter(fullscreenClip(), 640, 360, 3)).toBe('scale=640:360');
  expect(clipFilter(gridClip(0.33), 640, 360, 3)).toBe(
    'scale=trunc(iw*0.33/2)*2:trunc(ih*0.33/2)*2',
  );
});

it('adds each fade the clip asks for', (): void => {
  expect(clipFilter({ ...fullscreenClip(), fadeIn: true, fadeDuration: 0.5 }, 640, 360, 3))
    .toBe('scale=640:360,fade=t=in:st=0:d=0.5');
  expect(clipFilter({ ...fullscreenClip(), fadeOut: true, fadeDuration: 0.5 }, 640, 360, 3))
    .toBe('scale=640:360,fade=t=out:st=2.5:d=0.5');
  expect(clipFilter({ ...fullscreenClip(), fadeOut: true, fadeDuration: 1 }, 640, 360, 0.4))
    .toBe('scale=640:360,fade=t=out:st=0:d=1');
});

it('builds a shifted overlay graph for one clip', (): void => {
  expect(brollGraph([
    { index: 1, insertAt: 2, length: 3, position: 'fullscreen' },
  ])).toBe(
    '[1:v]setpts=PTS-STARTPTS+2/TB[b0];'
      + `[0:v][b0]overlay=x=0:y=0:enable='between(t,2,5)'[v]`,
  );
});

it('chains a second overlay through the first one', (): void => {
  expect(brollGraph([
    { index: 1, insertAt: 1, length: 2, position: 'bottom_left' },
    { index: 2, insertAt: 4, length: 2, position: 'top_right' },
  ])).toBe(
    '[1:v]setpts=PTS-STARTPTS+1/TB[b0];[2:v]setpts=PTS-STARTPTS+4/TB[b1];'
      + '[0:v][b0]overlay=x=10:y=H-h-10:enable=\'between(t,1,3)\'[v0];'
      + '[v0][b1]overlay=x=W-w-10:y=10:enable=\'between(t,4,6)\'[v]',
  );
});

it('lists the tool with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client): Promise<void> => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === TOOL_NAME);
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
    expect(tool.description).toContain('never changes an input');
    expect(tool.description).toContain('100 MB');
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'clips', 'outputName']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(properties.clips).description)).toContain('50');
    const item = asRecord(asRecord(properties.clips).items);
    const itemProperties = asRecord(item.properties);
    for (const name of [
      'clipPath',
      'insertAt',
      'duration',
      'position',
      'scale',
      'fadeIn',
      'fadeOut',
      'fadeDuration',
    ]) {
      const field = asRecord(itemProperties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(itemProperties.position).description)).toContain('fullscreen');
    expect(tool.inputSchema.required).toEqual(['inputPath', 'clips', 'outputName']);
  });
});
