// ───────────────────────────────────────────────────────────────────
// MODULE: Video Concat Xfade Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import { videoConcatTool, xfadeGraph } from '../../../src/tools/video/concat.js';
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

import type { ToolContext } from '../../../src/server/tool-context.js';
import type { FrameRegion } from '../../helpers/composition-media.js';
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
  readonly durationSeconds?: number;
}

interface ProbeView {
  readonly durationSeconds: number;
  readonly streams: readonly ProbeStream[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-concat-xfade-');

const CLIP_SECONDS = 2;
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const FRAME_RATE = 25;
const TRANSITION_SECONDS = 1;
const FIXTURE_PAIR_SECONDS = 8;
const PAIR_WITH_TRANSITION_SECONDS = 3;
// Reported for the normalized first clip, so its offset differs from the caller clip's.
const NORMALIZED_STAND_IN_SECONDS = 1.75;
const NORMALIZED_FIRST_CLIP = 'norm_0.mp4';

const PROCESS_TIMEOUT_MS = 60000;
const DURATION_TOLERANCE_RATIO = 0.15;

const FULL_FRAME: FrameRegion = {
  x: 0,
  y: 0,
  width: FRAME_WIDTH,
  height: FRAME_HEIGHT,
};

const PRIMARY_CHANNEL_MIN = 180;
const OTHER_CHANNEL_MAX = 80;
// A half-and-half blend of the two colours still clears this in every channel.
const BLEND_CHANNEL_MIN = 40;

const TRANSITION_AUDIO_WARNING =
  'Only one clip had sound, so the joined video has no audio.';

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

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
    const rawDuration = stream.duration;
    const parsedDuration = rawDuration === undefined ? Number.NaN : Number(rawDuration);
    streams.push({
      codecType,
      codecName: stringOrEmpty(stream.codec_name),
      durationSeconds: Number.isFinite(parsedDuration) ? parsedDuration : undefined,
    });
  }
  return { durationSeconds, streams };
}

function streamsOf(view: ProbeView, codecType: string): ProbeStream[] {
  return view.streams.filter((stream) => stream.codecType === codecType);
}

function audioDuration(view: ProbeView): number {
  const stream = streamsOf(view, 'audio')[0];
  if (stream === undefined || stream.durationSeconds === undefined) {
    throw new Error('expected an audio stream duration');
  }
  return stream.durationSeconds;
}

function expectDurationWithin(actual: number, expected: number): void {
  expect(Math.abs(actual - expected) / expected).toBeLessThanOrEqual(
    DURATION_TOLERANCE_RATIO,
  );
}

async function concat(args: Record<string, unknown>): Promise<CallOutcome> {
  let outcome: CallOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    outcome = await callTool(client, 'video_concat', args);
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

async function generateSolidClip(fileName: string, color: string): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  const output = path.join(sandbox.allowedRoot, fileName);
  const shape = `${String(FRAME_WIDTH)}x${String(FRAME_HEIGHT)}`;
  const source =
    `color=c=${color}:s=${shape}:r=${String(FRAME_RATE)}:d=${String(CLIP_SECONDS)}`;
  const args = ['-f', 'lavfi', '-i', source, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', output];
  await runProcess(binary, args, { kind: 'ffmpeg', timeoutMs: PROCESS_TIMEOUT_MS });
  return output;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

let fixtureOne = '';
let fixtureTwo = '';
let soundA = '';
let soundB = '';
let silentClip = '';
let tonePath = '';
let redClip = '';
let blueClip = '';

beforeAll(async (): Promise<void> => {
  fixtureOne = copyFixture('short_video1.mp4', sandbox.allowedRoot, 'short-one.mp4');
  fixtureTwo = copyFixture('short_video2.mp4', sandbox.allowedRoot, 'short-two.mp4');
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
  tonePath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  redClip = await generateSolidClip('red.mp4', 'red');
  blueClip = await generateSolidClip('blue.mp4', 'blue');
});

afterAll((): void => {
  sandbox.cleanup();
});

it('test_concatenate_videos_with_xfade: dissolve', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const firstBefore = sha256Of(fixtureOne);
  const secondBefore = sha256Of(fixtureTwo);

  const outcome = await concat({
    inputPaths: [fixtureOne, fixtureTwo],
    transition: 'dissolve',
    transitionDuration: TRANSITION_SECONDS,
    outputName: 'xfade dissolve',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'short-one-joined.mp4', 'xfade-dissolve');
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '001 - xfade-dissolve'));

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, FIXTURE_PAIR_SECONDS);
  const videos = streamsOf(output, 'video');
  expect(videos).toHaveLength(1);
  expect(videos[0]?.codecName).toBe('h264');
  expect(streamsOf(output, 'audio')).toHaveLength(0);

  expect(sha256Of(fixtureOne)).toBe(firstBefore);
  expect(sha256Of(fixtureTwo)).toBe(secondBefore);
});

it('test_concatenate_videos_with_xfade: wipeleft', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [fixtureOne, fixtureTwo],
    transition: 'wipeleft',
    transitionDuration: TRANSITION_SECONDS,
    outputName: 'xfade wipe',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'short-one-joined.mp4', 'xfade-wipe');

  const output = probeView(await probeJson(filePath));
  expectDurationWithin(output.durationSeconds, FIXTURE_PAIR_SECONDS);
  expect(streamsOf(output, 'video')).toHaveLength(1);
  expect(streamsOf(output, 'audio')).toHaveLength(0);
});

it('test_concatenate_videos_with_xfade: keeps both streams', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [soundA, soundB],
    transition: 'dissolve',
    transitionDuration: TRANSITION_SECONDS,
    outputName: 'xfade audio',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'sound-a-joined.mp4', 'xfade-audio');

  const output = probeView(await probeJson(filePath));
  expect(streamsOf(output, 'video')).toHaveLength(1);
  expect(streamsOf(output, 'audio')).toHaveLength(1);
  expectDurationWithin(output.durationSeconds, PAIR_WITH_TRANSITION_SECONDS);
  expectDurationWithin(audioDuration(output), PAIR_WITH_TRANSITION_SECONDS);
});

it('blends the two clips across the transition window', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [redClip, blueClip],
    transition: 'fade',
    transitionDuration: TRANSITION_SECONDS,
    outputName: 'xfade blend',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'red-joined.mp4', 'xfade-blend');

  const before = await meanColor(filePath, 0.5, FULL_FRAME);
  expect(before.r).toBeGreaterThan(PRIMARY_CHANNEL_MIN);
  expect(before.b).toBeLessThan(OTHER_CHANNEL_MAX);

  const during = await meanColor(filePath, 1.5, FULL_FRAME);
  expect(during.r).toBeGreaterThan(BLEND_CHANNEL_MIN);
  expect(during.b).toBeGreaterThan(BLEND_CHANNEL_MIN);

  const after = await meanColor(filePath, 2.5, FULL_FRAME);
  expect(after.b).toBeGreaterThan(PRIMARY_CHANNEL_MIN);
  expect(after.r).toBeLessThan(OTHER_CHANNEL_MAX);
});

it('warns once when only one clip has sound', async (): Promise<void> => {
  const outcome = await concat({
    inputPaths: [soundA, silentClip],
    transition: 'dissolve',
    transitionDuration: TRANSITION_SECONDS,
    outputName: 'xfade mixed sound',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'sound-a-joined.mp4',
    'xfade-mixed-sound',
    1,
  );
  expect(asList(outcome.body.warnings)).toEqual([TRANSITION_AUDIO_WARNING]);

  const output = probeView(await probeJson(filePath));
  expect(streamsOf(output, 'video')).toHaveLength(1);
  expect(streamsOf(output, 'audio')).toHaveLength(0);
});

it('test_concatenate_videos_with_xfade: invalid transition', async (): Promise<void> => {
  await expectRejected({
    inputPaths: [soundA, soundB],
    transition: 'invalid_transition',
    transitionDuration: TRANSITION_SECONDS,
    outputName: 'xfade invalid',
  });
});

it('test_concatenate_videos_with_xfade: three clips', async (): Promise<void> => {
  await expectFailure(
    {
      inputPaths: [soundA, soundB, silentClip],
      transition: 'dissolve',
      transitionDuration: TRANSITION_SECONDS,
      outputName: 'xfade three',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'inputPaths',
      value: 3,
      reason: 'transition-needs-two',
    },
  );
});

it('refuses a transition without a duration', async (): Promise<void> => {
  await expectFailure(
    {
      inputPaths: [soundA, soundB],
      transition: 'dissolve',
      outputName: 'xfade no duration',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'transitionDuration',
      value: null,
      reason: 'duration-required',
    },
  );
});

it('refuses a transition as long as the first clip', async (): Promise<void> => {
  const first = probeView(await probeJson(soundA));
  await expectFailure(
    {
      inputPaths: [soundA, soundB],
      transition: 'dissolve',
      transitionDuration: first.durationSeconds,
      outputName: 'xfade too long',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'transitionDuration',
      value: first.durationSeconds,
      reason: 'duration-too-long',
    },
  );
});

it('returns UNSUPPORTED_FORMAT for an audio-only entry', async (): Promise<void> => {
  await expectFailure(
    {
      inputPaths: [tonePath, soundA],
      transition: 'dissolve',
      transitionDuration: TRANSITION_SECONDS,
      outputName: 'xfade audio entry',
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
      transition: 'dissolve',
      transitionDuration: TRANSITION_SECONDS,
      outputName: 'xfade missing',
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
      transition: 'dissolve',
      transitionDuration: TRANSITION_SECONDS,
      outputName: 'xfade outside',
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

it('starts the blend at the normalized first clip minus the duration', async (): Promise<void> => {
  const real = createToolContext(sandbox.config);
  const graphs: string[] = [];
  const context: ToolContext = {
    ...real,
    runBinary: async (name, args, options) => {
      const result = await real.runBinary(name, args, options);
      if (name === 'ffprobe' && path.basename(String(args.at(-1))) === NORMALIZED_FIRST_CLIP) {
        const probe = asRecord(JSON.parse(result.stdout));
        const format = { ...asRecord(probe.format), duration: String(NORMALIZED_STAND_IN_SECONDS) };
        return { ...result, stdout: JSON.stringify({ ...probe, format }) };
      }
      const at = args.indexOf('-filter_complex');
      if (name === 'ffmpeg' && at >= 0) {
        graphs.push(String(args[at + 1]));
      }
      return result;
    },
  };
  await videoConcatTool.handler(
    {
      inputPaths: [redClip, blueClip],
      transition: 'dissolve',
      transitionDuration: TRANSITION_SECONDS,
      outputName: 'normalized offset',
    },
    context,
  );

  expect(graphs).toHaveLength(1);
  expect(graphs[0]).toContain(':offset=0.75[v]');
});

it('builds the transition graph from server values', (): void => {
  expect(xfadeGraph('dissolve', 1, 4, false)).toBe(
    '[0:v][1:v]xfade=transition=dissolve:duration=1:offset=4[v]',
  );
  expect(xfadeGraph('wipeleft', 1, 3.083, true)).toBe(
    '[0:v][1:v]xfade=transition=wipeleft:duration=1:offset=3.083[v];'
    + '[0:a][1:a]acrossfade=d=1:c1=tri:c2=tri[a]',
  );
  expect(xfadeGraph('fade', 0.5, 1.5, false)).toBe(
    '[0:v][1:v]xfade=transition=fade:duration=0.5:offset=1.5[v]',
  );
});
