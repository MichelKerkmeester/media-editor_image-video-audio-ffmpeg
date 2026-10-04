// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Fade Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { fadeFilter } from '../../../src/tools/video/add-fade.js';
import { copyFixture, meanLuma } from '../../helpers/composition-media.js';
import {
  generateAudio,
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

import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface StreamView {
  readonly codecType: string;
  readonly codecName: string;
}

interface MediaView {
  readonly durationSeconds: number;
  readonly streams: readonly StreamView[];
}

interface ToolOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-add-fade-');

const TOOL_NAME = 'video_add_fade';

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const FRAME_RATE = 25;
const PROCESS_TIMEOUT_MS = 60000;

const WHITE_SECONDS = 3;
const FADE_SECONDS = 1;

const DURATION_RELATIVE_TOLERANCE = 0.1;

const FADE_DARK_MAXIMUM = 60;
const FADE_BRIGHT_MINIMUM = 200;

const SCHEMA_REJECTIONS = [0, -1] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

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
      codecName: typeof stream.codec_name === 'string' ? stream.codec_name : '',
    });
  }
  return { durationSeconds, streams };
}

function streamsOf(view: MediaView, codecType: string): StreamView[] {
  return view.streams.filter((stream) => stream.codecType === codecType);
}

async function requiredFfmpeg(): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  return binary;
}

async function generateWhiteClip(dir: string, fileName: string): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, fileName);
  const picture = `color=c=white:s=${FRAME_WIDTH}x${FRAME_HEIGHT}`
    + `:r=${FRAME_RATE}:d=${WHITE_SECONDS}`;
  await runProcess(binary, [
    '-f',
    'lavfi',
    '-i',
    picture,
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=440:duration=${WHITE_SECONDS}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    output,
  ], { kind: 'ffmpeg', timeoutMs: PROCESS_TIMEOUT_MS });
  return output;
}

async function generateRawVideo(dir: string, fileName: string): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, fileName);
  const picture = `testsrc2=size=${FRAME_WIDTH}x${FRAME_HEIGHT}`
    + `:rate=${FRAME_RATE}:duration=1`;
  await runProcess(binary, [
    '-f',
    'lavfi',
    '-i',
    picture,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-f',
    'h264',
    output,
  ], { kind: 'ffmpeg', timeoutMs: PROCESS_TIMEOUT_MS });
  return output;
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
  let outcome: ToolOutcome | undefined;
  await withToolClient(sandbox.config, async (client): Promise<void> => {
    const result = await client.callTool({ name: TOOL_NAME, arguments: args });
    outcome = {
      isError: result.isError === true,
      body: asRecord(result.structuredContent),
      text: textContent(result.content),
    };
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
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

async function expectRejected(args: Record<string, unknown>): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client): Promise<void> => {
    await expectProtocolError(
      client.callTool({
        name: TOOL_NAME,
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

let mainPath = '';
let whitePath = '';
let rawPath = '';
let tonePath = '';
let outsidePath = '';

beforeAll(async (): Promise<void> => {
  mainPath = copyFixture('main_video.mp4', sandbox.allowedRoot);
  whitePath = await generateWhiteClip(sandbox.allowedRoot, 'white.mp4');
  rawPath = await generateRawVideo(sandbox.allowedRoot, 'nodur.h264');
  tonePath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  outsidePath = path.join(sandbox.root, 'outside.mp4');
  writeFileSync(outsidePath, 'outside');
});

afterAll((): void => {
  sandbox.cleanup();
});

it('builds the fade in filter from the duration', (): void => {
  expect(fadeFilter('fade_in', 2, 10)).toBe('fade=t=in:st=0:d=2');
  expect(fadeFilter('fade_in', 1.5, 3)).toBe('fade=t=in:st=0:d=1.5');
  expect(fadeFilter('fade_in', 1.23456, 10)).toBe('fade=t=in:st=0:d=1.235');
});

it('builds the fade out filter from the remaining time', (): void => {
  expect(fadeFilter('fade_out', 2, 10)).toBe('fade=t=out:st=8:d=2');
  expect(fadeFilter('fade_out', 1.5, 3)).toBe('fade=t=out:st=1.5:d=1.5');
  expect(fadeFilter('fade_out', 1.23456, 10)).toBe('fade=t=out:st=8.765:d=1.235');
});

it('test_add_basic_transitions: fade in keeps the length', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(mainPath);
  const source = probeView(await probeJson(mainPath));
  expect(source.durationSeconds).toBeGreaterThanOrEqual(9);
  const outcome = await runToolWithText({
    inputPath: mainPath,
    fadeType: 'fade_in',
    duration: 2,
    outputName: 'fade in',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'main_video-fade-in.mp4', 'fade-in');
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '001 - fade-in'));
  expect(outcome.text).toBe(
    `Added a 2-second fade in to main_video.mp4. Output saved to ${filePath}.`,
  );
  const output = probeView(await probeJson(filePath));
  expect(Math.abs(output.durationSeconds - source.durationSeconds)).toBeLessThanOrEqual(
    source.durationSeconds * DURATION_RELATIVE_TOLERANCE,
  );
  expect(sha256Of(mainPath)).toBe(before);
});

it('test_add_basic_transitions: fade out keeps the length', async (): Promise<void> => {
  const before = sha256Of(mainPath);
  const source = probeView(await probeJson(mainPath));
  const outcome = await runToolWithText({
    inputPath: mainPath,
    fadeType: 'fade_out',
    duration: 2,
    outputName: 'fade out',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'main_video-fade-out.mp4', 'fade-out');
  expect(outcome.text).toBe(
    `Added a 2-second fade out to main_video.mp4. Output saved to ${filePath}.`,
  );
  const output = probeView(await probeJson(filePath));
  expect(Math.abs(output.durationSeconds - source.durationSeconds)).toBeLessThanOrEqual(
    source.durationSeconds * DURATION_RELATIVE_TOLERANCE,
  );
  expect(sha256Of(mainPath)).toBe(before);
});

it('test_add_basic_transitions: a too long fade is refused', async (): Promise<void> => {
  const source = probeView(await probeJson(mainPath));
  const tooLong = source.durationSeconds + 5;
  await expectFailure(
    {
      inputPath: mainPath,
      fadeType: 'fade_in',
      duration: tooLong,
      outputName: 'too long',
    },
    ERROR_CODES.INVALID_INPUT,
    { parameter: 'duration', value: tooLong, reason: 'longer-than-video' },
  );
});

it('test_add_basic_transitions: refuses an unknown type', async (): Promise<void> => {
  await expectRejected({
    inputPath: mainPath,
    fadeType: 'slide_left',
    duration: 2,
    outputName: 'bad type',
  });
});

it('fades the white clip up from black at the start', async (): Promise<void> => {
  const before = sha256Of(whitePath);
  const outcome = await runTool({
    inputPath: whitePath,
    fadeType: 'fade_in',
    duration: FADE_SECONDS,
    outputName: 'white fade in',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'white-fade-in.mp4', 'white-fade-in');
  const early = await meanLuma(filePath, 0.05);
  const late = await meanLuma(filePath, 2);
  expect(early).toBeLessThan(FADE_DARK_MAXIMUM);
  expect(late).toBeGreaterThan(FADE_BRIGHT_MINIMUM);
  expect(sha256Of(whitePath)).toBe(before);
});

it('fades the white clip down to black at the end', async (): Promise<void> => {
  const before = sha256Of(whitePath);
  const outcome = await runTool({
    inputPath: whitePath,
    fadeType: 'fade_out',
    duration: FADE_SECONDS,
    outputName: 'white fade out',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'white-fade-out.mp4', 'white-fade-out');
  const early = await meanLuma(filePath, 0.5);
  const late = await meanLuma(filePath, 2.95);
  expect(early).toBeGreaterThan(FADE_BRIGHT_MINIMUM);
  expect(late).toBeLessThan(FADE_DARK_MAXIMUM);
  expect(sha256Of(whitePath)).toBe(before);
});

it('takes crossfade_from_black as a fade in', async (): Promise<void> => {
  const outcome = await runTool({
    inputPath: whitePath,
    fadeType: 'crossfade_from_black',
    duration: FADE_SECONDS,
    outputName: 'alias from black',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'white-fade-in.mp4', 'alias-from-black');
  expect(await meanLuma(filePath, 0.05)).toBeLessThan(FADE_DARK_MAXIMUM);
});

it('takes crossfade_to_black as a fade out', async (): Promise<void> => {
  const outcome = await runTool({
    inputPath: whitePath,
    fadeType: 'crossfade_to_black',
    duration: FADE_SECONDS,
    outputName: 'alias to black',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'white-fade-out.mp4', 'alias-to-black');
  expect(await meanLuma(filePath, 2.95)).toBeLessThan(FADE_DARK_MAXIMUM);
});

it('keeps the audio track of the white clip', async (): Promise<void> => {
  const outcome = await runTool({
    inputPath: whitePath,
    fadeType: 'fade_in',
    duration: FADE_SECONDS,
    outputName: 'keeps sound',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'white-fade-in.mp4', 'keeps-sound');
  const view = probeView(await probeJson(filePath));
  const audio = streamsOf(view, 'audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]?.codecName).toBe('aac');
  expect(streamsOf(view, 'video')).toHaveLength(1);
});

it('accepts a fade as long as the whole clip', async (): Promise<void> => {
  const source = probeView(await probeJson(whitePath));
  const outcome = await runTool({
    inputPath: whitePath,
    fadeType: 'fade_in',
    duration: source.durationSeconds,
    outputName: 'equal length',
  });
  expect(outcome.isError).toBe(false);
  writtenPath(outcome.body, 'white-fade-in.mp4', 'equal-length');
});

it.each(SCHEMA_REJECTIONS)(
  'rejects duration %s before a folder is created',
  async (duration): Promise<void> => {
    await expectRejected({
      inputPath: whitePath,
      fadeType: 'fade_in',
      duration,
      outputName: 'bad duration',
    });
  },
);

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: tonePath,
      fadeType: 'fade_in',
      duration: 1,
      outputName: 'audio only',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { path: tonePath, detected: ['audio'], accepted: ['video'] },
  );
});

it('returns UNSUPPORTED_FORMAT for a file without duration', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: rawPath,
      fadeType: 'fade_in',
      duration: 1,
      outputName: 'no duration',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { path: rawPath, detected: 'unknown-duration', accepted: ['video'] },
  );
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      fadeType: 'fade_in',
      duration: 1,
      outputName: 'outside',
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

it('returns INPUT_NOT_FOUND when the input is missing', async (): Promise<void> => {
  const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
  await expectFailure(
    {
      inputPath: missingPath,
      fadeType: 'fade_in',
      duration: 1,
      outputName: 'missing',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingPath, role: 'input' },
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
    expect(tool.description).toContain('100 MB');
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'outputName', 'fadeType', 'duration']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const fadeType = String(asRecord(properties.fadeType).description);
    expect(fadeType).toContain('fade_in');
    expect(fadeType).toContain('fade_out');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'fadeType',
      'duration',
    ]);
  });
});
