// ───────────────────────────────────────────────────────────────────
// MODULE: Video Concat Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { joinArgs, normalizeArgs } from '../../../src/tools/video/concat.js';
import { copyFixture, meanColor } from '../../helpers/composition-media.js';
import {
  generateAudio,
  generateVideo,
  probeJson,
  resolveTestBinary,
} from '../../helpers/media.js';
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

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
  readonly width: number;
  readonly height: number;
  readonly frameRate: string;
}

interface ProbeView {
  readonly durationSeconds: number;
  readonly streams: readonly ProbeStream[];
}

interface ConcatOutcome extends CallOutcome {
  readonly text: string;
}

interface SchemaCase {
  readonly label: string;
  readonly overrides: Record<string, unknown>;
}

interface ClipSpec {
  readonly fileName: string;
  readonly seconds: number;
  readonly width: number;
  readonly height: number;
  readonly rate: number;
  readonly color?: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-concat-');

const CLIP_SECONDS = 2;
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const FRAME_RATE = 25;
const SMALL_WIDTH = 160;
const SMALL_HEIGHT = 120;
const SMALL_RATE = 30;
const PROCESS_TIMEOUT_MS = 60000;
const DURATION_TOLERANCE_RATIO = 0.15;

const FULL_FRAME: FrameRegion = {
  x: 0,
  y: 0,
  width: FRAME_WIDTH,
  height: FRAME_HEIGHT,
};

const PRIMARY_CHANNEL_MIN = 180;
// A full-range green comes back near 127 from the yuv round trip.
const GREEN_CHANNEL_MIN = 100;
const OTHER_CHANNEL_MAX = 80;

const MIXED_AUDIO_WARNING =
  'Some clips had no sound, so the joined audio covers only the clips that had it.';

const FIFTY_CLIPS = 50;
const FIFTY_ONE_PATHS = Array.from(
  { length: FIFTY_CLIPS + 1 },
  (_entry, index) => `/clips/${String(index)}.mp4`,
);

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'a single input path', overrides: { inputPaths: ['/clips/one.mp4'] } },
  { label: 'fifty-one input paths', overrides: { inputPaths: FIFTY_ONE_PATHS } },
  { label: 'an unknown transition name', overrides: { transition: 'spin' } },
  { label: 'a zero transition duration', overrides: { transitionDuration: 0 } },
];

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function numberOrZero(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function probeView(value: unknown): ProbeView {
  const root = asRecord(value);
  const format = asRecord(root.format);
  const durationSeconds = Number(format.duration);
  if (!Number.isFinite(durationSeconds)) {
    throw new Error('expected a probe duration');
  }
  const streams: ProbeStream[] = [];
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
      frameRate: stringOrEmpty(stream.r_frame_rate),
    });
  }
  return { durationSeconds, streams };
}

function streamsOf(view: ProbeView, codecType: string): ProbeStream[] {
  return view.streams.filter((stream) => stream.codecType === codecType);
}

function expectDurationWithin(actual: number, expected: number): void {
  expect(Math.abs(actual - expected) / expected).toBeLessThanOrEqual(DURATION_TOLERANCE_RATIO);
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

async function concat(args: Record<string, unknown>): Promise<ConcatOutcome> {
  let outcome: ConcatOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    let text = '';
    // callTool checks the prompt's single line, and this wrapper keeps it.
    const original = client.callTool.bind(client);
    client.callTool = async (params, schema, options) => {
      const result = await original(params, schema, options);
      text = textContent(result.content);
      return result;
    };
    try {
      const parsed = await callTool(client, 'video_concat', args);
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
  expect(body.tool).toBe('video_concat');
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
  const outcome = await concat(args);
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
        name: 'video_concat',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function generateClip(dir: string, spec: ClipSpec): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  const output = path.join(dir, spec.fileName);
  const shape = `${String(spec.width)}x${String(spec.height)}`;
  const source = spec.color === undefined
    ? `testsrc2=size=${shape}:rate=${String(spec.rate)}:duration=${String(spec.seconds)}`
    : `color=c=${spec.color}:s=${shape}:r=${String(spec.rate)}:d=${String(spec.seconds)}`;
  const args = ['-f', 'lavfi', '-i', source, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output];
  await runProcess(binary, args, { kind: 'ffmpeg', timeoutMs: PROCESS_TIMEOUT_MS });
  return output;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

let soundA = '';
let soundB = '';
let silentClip = '';
let quotedClip = '';
let fixtureOne = '';
let fixtureTwo = '';
let redClip = '';
let greenClip = '';
let blueClip = '';
let rate30Clip = '';
let tonePath = '';

beforeAll(async (): Promise<void> => {
  soundA = await generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    withAudio: true,
    fileName: 'sound-a.mp4',
  });
  soundB = await generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    withAudio: true,
    fileName: 'sound-b.mp4',
  });
  silentClip = await generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    fileName: 'silent.mp4',
  });
  quotedClip = await generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    fileName: "it's.mp4",
  });
  fixtureOne = copyFixture('short_video1.mp4', sandbox.allowedRoot, 'short-one.mp4');
  fixtureTwo = copyFixture('short_video2.mp4', sandbox.allowedRoot, 'short-two.mp4');
  redClip = await generateClip(sandbox.allowedRoot, {
    fileName: 'red.mp4',
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    rate: FRAME_RATE,
    color: 'red',
  });
  greenClip = await generateClip(sandbox.allowedRoot, {
    fileName: 'green.mp4',
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    rate: FRAME_RATE,
    color: 'green',
  });
  blueClip = await generateClip(sandbox.allowedRoot, {
    fileName: 'blue.mp4',
    seconds: CLIP_SECONDS,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    rate: FRAME_RATE,
    color: 'blue',
  });
  rate30Clip = await generateClip(sandbox.allowedRoot, {
    fileName: 'small-30.mp4',
    seconds: CLIP_SECONDS,
    width: SMALL_WIDTH,
    height: SMALL_HEIGHT,
    rate: SMALL_RATE,
  });
  tonePath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
});

afterAll((): void => {
  sandbox.cleanup();
});

it('test_concatenate_videos: joins two clips', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const soundABefore = sha256Of(soundA);
  const soundBBefore = sha256Of(soundB);

  const outcome = await concat({
    inputPaths: [soundA, soundB],
    outputName: 'joined pair',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'sound-a-joined.mp4', 'joined-pair');
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '001 - joined-pair'));
  expect(outcome.text).toBe(
    `Joined 2 videos starting with sound-a.mp4. Output saved to ${filePath}.`,
  );

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, CLIP_SECONDS * 2);
  const videos = streamsOf(output, 'video');
  expect(videos).toHaveLength(1);
  expect(videos[0]?.codecName).toBe('h264');
  expect(videos[0]?.width).toBe(FRAME_WIDTH);
  expect(videos[0]?.height).toBe(FRAME_HEIGHT);
  const audio = streamsOf(output, 'audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]?.codecName).toBe('aac');

  expect(readdirSync(path.dirname(filePath)).sort()).toEqual(['sound-a-joined.mp4']);
  expect(sha256Of(soundA)).toBe(soundABefore);
  expect(sha256Of(soundB)).toBe(soundBBefore);
});

it('test_concatenate_videos: joins the two source fixtures', async (): Promise<void> => {
  const fixtureOneBefore = sha256Of(fixtureOne);
  const outcome = await concat({
    inputPaths: [fixtureOne, fixtureTwo],
    outputName: 'fixture pair',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'short-one-joined.mp4', 'fixture-pair');

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, 9);
  expect(streamsOf(output, 'video')).toHaveLength(1);
  expect(streamsOf(output, 'audio')).toHaveLength(0);
  expect(sha256Of(fixtureOne)).toBe(fixtureOneBefore);
});

it('normalizes every clip to the first clip size and rate', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [silentClip, rate30Clip],
    outputName: 'mixed shapes',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'silent-joined.mp4', 'mixed-shapes');

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, CLIP_SECONDS * 2);
  const video = streamsOf(output, 'video')[0];
  if (video === undefined) {
    throw new Error('expected a video stream');
  }
  expect(video.width).toBe(FRAME_WIDTH);
  expect(video.height).toBe(FRAME_HEIGHT);
  expect(video.frameRate).toBe('25/1');
  expect(streamsOf(output, 'audio')).toHaveLength(0);
});

it('joins three clips in the order they were given', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [redClip, greenClip, blueClip],
    outputName: 'colour order',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'red-joined.mp4', 'colour-order');

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, CLIP_SECONDS * 3);
  const first = await meanColor(filePath, 1, FULL_FRAME);
  expect(first.r).toBeGreaterThan(PRIMARY_CHANNEL_MIN);
  expect(first.g).toBeLessThan(OTHER_CHANNEL_MAX);
  expect(first.b).toBeLessThan(OTHER_CHANNEL_MAX);
  const second = await meanColor(filePath, CLIP_SECONDS + 1, FULL_FRAME);
  expect(second.g).toBeGreaterThan(GREEN_CHANNEL_MIN);
  expect(second.r).toBeLessThan(OTHER_CHANNEL_MAX);
  expect(second.b).toBeLessThan(OTHER_CHANNEL_MAX);
  const third = await meanColor(filePath, CLIP_SECONDS * 2 + 1, FULL_FRAME);
  expect(third.b).toBeGreaterThan(PRIMARY_CHANNEL_MIN);
  expect(third.r).toBeLessThan(OTHER_CHANNEL_MAX);
  expect(third.g).toBeLessThan(OTHER_CHANNEL_MAX);
});

it('joins a clip whose name holds a quote', async (): Promise<void> => {
  const quotedBefore = sha256Of(quotedClip);
  const outcome = await concat({
    inputPaths: [quotedClip, greenClip],
    outputName: 'quoted name',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, "it's-joined.mp4", 'quoted-name');

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, CLIP_SECONDS * 2);
  expect(streamsOf(output, 'video')).toHaveLength(1);
  expect(sha256Of(quotedClip)).toBe(quotedBefore);
});

it('warns once when some clips have sound and others do not', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [soundA, silentClip],
    outputName: 'mixed sound',
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, 'sound-a-joined.mp4', 'mixed-sound', 1);
  expect(asList(outcome.body.warnings)).toEqual([MIXED_AUDIO_WARNING]);
});

it('builds the normalize and join argument lists from server values', (): void => {
  expect(normalizeArgs('/clips/a.mp4', 320, 240, 25, '/tmp/norm_0.mp4')).toEqual([
    '-n',
    '-i',
    '/clips/a.mp4',
    '-vf',
    'scale=320:240',
    '-r',
    '25',
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '/tmp/norm_0.mp4',
  ]);
  expect(joinArgs('/tmp/concat_list.txt', '/tmp/joined.mp4')).toEqual([
    '-n',
    '-f',
    'concat',
    '-safe',
    '1',
    '-protocol_whitelist',
    'file',
    '-i',
    '/tmp/concat_list.txt',
    '-c',
    'copy',
    '/tmp/joined.mp4',
  ]);
});

it.each(SCHEMA_CASES)('rejects $label before a folder is created', async (row): Promise<void> => {
  await expectRejected({
    inputPaths: [soundA, soundB],
    outputName: 'bad schema',
    ...row.overrides,
  });
});

it('refuses transitionDuration without a transition', async (): Promise<void> => {
  await expectFailure(
    {
      inputPaths: [soundA, soundB],
      transitionDuration: 1,
      outputName: 'duration only',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'transitionDuration',
      value: 1,
      reason: 'transition-required',
    },
  );
});

it('blends two clips when a transition is given', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [soundA, soundB],
    transition: 'dissolve',
    transitionDuration: 1,
    outputName: 'transition clip',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'sound-a-joined.mp4', 'transition-clip');

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, CLIP_SECONDS * 2 - 1);
  expect(streamsOf(output, 'video')).toHaveLength(1);
  expect(streamsOf(output, 'audio')).toHaveLength(1);
});

it('returns UNSUPPORTED_FORMAT for an audio-only entry', async (): Promise<void> => {
  await expectFailure(
    {
      inputPaths: [tonePath, soundA],
      outputName: 'audio entry',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: tonePath,
      detected: ['audio'],
      accepted: ['video'],
    },
  );
});

it('returns INPUT_NOT_FOUND when the second entry is missing', async (): Promise<void> => {
  await expectFailure(
    {
      inputPaths: [soundA, missingPath],
      outputName: 'missing clip',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('returns PATH_NOT_ALLOWED for an entry outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPaths: [outsidePath, soundA],
      outputName: 'outside clip',
    },
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsidePath,
      realPath: outsidePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('lists the tool with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'video_concat');
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
    for (const name of ['inputPaths', 'transition', 'transitionDuration', 'outputName']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(properties.transition).description)).toContain('dissolve');
    expect(tool.inputSchema.required).toEqual(['inputPaths', 'outputName']);
  });
});
