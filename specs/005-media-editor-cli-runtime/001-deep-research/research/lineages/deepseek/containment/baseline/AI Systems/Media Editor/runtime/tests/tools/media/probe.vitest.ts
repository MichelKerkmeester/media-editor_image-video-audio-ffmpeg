// ───────────────────────────────────────────────────────────────────
// MODULE: Media Probe Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import { mediaProbeTool } from '../../../src/tools/media/probe.js';
import { generateEmptyFile, generateIndexlessMp4 } from '../../helpers/broken-media.js';
import {
  generateAudio,
  generateImage,
  generateVideo,
  probeJson,
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
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ProbeOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('media-probe-');

const VIDEO_SECONDS = 4;
const VIDEO_WIDTH = 320;
const VIDEO_HEIGHT = 240;
const VIDEO_RATE = 25;
const SILENT_SECONDS = 2;
const PNG_WIDTH = 96;
const PNG_HEIGHT = 64;
const SAMPLE_RATE = 44100;
const MONO_CHANNELS = 1;

const outsidePath = path.join(sandbox.root, 'outside.mp4');
writeFileSync(outsidePath, 'outside');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');

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

function numberField(value: unknown): number {
  expect(typeof value).toBe('number');
  if (typeof value !== 'number') {
    throw new Error('expected a number');
  }
  return value;
}

function streamRows(body: Record<string, unknown>): Record<string, unknown>[] {
  return asList(body.streams).map((entry) => asRecord(entry));
}

function rowAt(rows: readonly Record<string, unknown>[], index: number): Record<string, unknown> {
  const row = rows[index];
  if (row === undefined) {
    throw new Error('expected a stream row');
  }
  return row;
}

// This ffprobe reports a usable rate even for a still image, so the expected
// value is derived from the same probe the tool reads. Thirty is the stand-in
// when the probe carries no rate.
function roundedRate(probe: Record<string, unknown>): number {
  const first = asList(probe.streams)
    .map((entry) => asRecord(entry))
    .find((stream) => stream.codec_type === 'video');
  const text = first?.avg_frame_rate;
  if (typeof text !== 'string') {
    return 30;
  }
  const parts = text.split('/');
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return 30;
  }
  return Math.round((numerator / denominator) * 1000) / 1000;
}

async function probe(args: Record<string, unknown>): Promise<ProbeOutcome> {
  const folders = listFolders(sandbox.outputDir);
  let outcome: ProbeOutcome | undefined;
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
      const parsed = await callTool(client, 'media_probe', args);
      outcome = { ...parsed, text };
    } finally {
      client.callTool = original;
    }
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  expect(listFolders(sandbox.outputDir)).toEqual(folders);
  return outcome;
}

async function expectFailure(args: Record<string, unknown>, code: string): Promise<ProbeOutcome> {
  const outcome = await probe(args);
  expect(outcome.isError).toBe(true);
  expect(outcome.body.code).toBe(code);
  expect(outcome.body).not.toHaveProperty('outputs');
  return outcome;
}

async function expectRejected(args: Record<string, unknown>): Promise<void> {
  const folders = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client) => {
    await expectProtocolError(
      client.callTool({
        name: 'media_probe',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(folders);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const [clipPath, silentPath, tonePath, pngPath, indexlessPath] = await Promise.all([
  generateVideo(sandbox.allowedRoot, {
    seconds: VIDEO_SECONDS,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    withAudio: true,
    fileName: 'clip.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: SILENT_SECONDS,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    fileName: 'silent.mp4',
  }),
  generateAudio(sandbox.allowedRoot, {
    seconds: SILENT_SECONDS,
    format: 'mp3',
    fileName: 'tone.mp3',
  }),
  generateImage(sandbox.allowedRoot, {
    width: PNG_WIDTH,
    height: PNG_HEIGHT,
    format: 'png',
    fileName: 'still.png',
  }),
  generateIndexlessMp4(sandbox.allowedRoot, 'indexless.mp4'),
]);

const emptyPath = generateEmptyFile(sandbox.allowedRoot, 'empty.mp4');

afterAll((): void => {
  sandbox.cleanup();
});

it('probes a video with sound and reports both streams', async (): Promise<void> => {
  const before = sha256Of(clipPath);
  const outcome = await probe({ inputPath: clipPath });
  expect(outcome.isError).toBe(false);
  const body = outcome.body;
  expect(body.tool).toBe('media_probe');
  expect(body.outputs).toEqual([]);
  expect(body.warnings).toEqual([]);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  expect(outcome.text).toBe('Probed clip.mp4: 2 streams, 4.00 seconds.');

  const format = asRecord(body.format);
  expect(String(format.formatName)).toContain('mp4');
  const duration = numberField(format.durationSeconds);
  expect(Math.abs(duration - VIDEO_SECONDS)).toBeLessThanOrEqual(0.2);
  expect(numberField(format.sizeBytes)).toBe(statSync(clipPath).size);
  expect(Number.isInteger(format.bitRate)).toBe(true);
  expect(numberField(format.bitRate)).toBeGreaterThan(0);

  const summary = asRecord(body.summary);
  expect(summary.hasVideo).toBe(true);
  expect(summary.hasAudio).toBe(true);
  expect(numberField(summary.width)).toBe(VIDEO_WIDTH);
  expect(numberField(summary.height)).toBe(VIDEO_HEIGHT);
  expect(numberField(summary.frameRate)).toBe(VIDEO_RATE);
  expect(numberField(summary.sampleRate)).toBe(SAMPLE_RATE);
  expect(numberField(summary.channels)).toBe(MONO_CHANNELS);
  expect(summary.channelLayout).toBe('mono');

  const streams = streamRows(body);
  expect(streams).toHaveLength(2);
  expect(streams.map((stream) => stream.type)).toEqual(['video', 'audio']);
  const video = rowAt(streams, 0);
  expect(video.index).toBe(0);
  expect(video.codecName).toBe('h264');
  expect(numberField(video.width)).toBe(VIDEO_WIDTH);
  expect(numberField(video.height)).toBe(VIDEO_HEIGHT);
  expect(numberField(video.frameRate)).toBe(VIDEO_RATE);
  expect(video.pixelFormat).toBe('yuv420p');
  const audio = rowAt(streams, 1);
  expect(audio.index).toBe(1);
  expect(audio.codecName).toBe('aac');
  expect(numberField(audio.sampleRate)).toBe(SAMPLE_RATE);
  expect(numberField(audio.channels)).toBe(MONO_CHANNELS);
  expect(audio.channelLayout).toBe('mono');
  expect(audio).not.toHaveProperty('width');
  expect(audio).not.toHaveProperty('frameRate');
  expect(sha256Of(clipPath)).toBe(before);
});

it('omits the audio keys for a silent video', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const outcome = await probe({ inputPath: silentPath });
  expect(outcome.isError).toBe(false);
  expect(outcome.text).toBe('Probed silent.mp4: 1 stream, 2.00 seconds.');
  const summary = asRecord(outcome.body.summary);
  expect(summary.hasVideo).toBe(true);
  expect(summary.hasAudio).toBe(false);
  expect(summary).not.toHaveProperty('sampleRate');
  expect(summary).not.toHaveProperty('channels');
  expect(summary).not.toHaveProperty('channelLayout');
  const streams = streamRows(outcome.body);
  expect(streams.map((stream) => stream.type)).toEqual(['video']);
  expect(sha256Of(silentPath)).toBe(before);
});

it('reports an audio file without picture keys', async (): Promise<void> => {
  const before = sha256Of(tonePath);
  const outcome = await probe({ inputPath: tonePath });
  expect(outcome.isError).toBe(false);
  expect(outcome.text).toBe('Probed tone.mp3: 1 stream, 2.00 seconds.');
  expect(String(asRecord(outcome.body.format).formatName)).toContain('mp3');
  const summary = asRecord(outcome.body.summary);
  expect(summary.hasVideo).toBe(false);
  expect(summary.hasAudio).toBe(true);
  expect(summary).not.toHaveProperty('width');
  expect(summary).not.toHaveProperty('height');
  expect(summary).not.toHaveProperty('frameRate');
  expect(numberField(summary.sampleRate)).toBe(SAMPLE_RATE);
  expect(numberField(summary.channels)).toBe(MONO_CHANNELS);
  const streams = streamRows(outcome.body);
  expect(streams).toHaveLength(1);
  expect(rowAt(streams, 0).type).toBe('audio');
  expect(sha256Of(tonePath)).toBe(before);
});

it('reads a still image as one video stream with its pixel format', async (): Promise<void> => {
  const before = sha256Of(pngPath);
  const outcome = await probe({ inputPath: pngPath });
  expect(outcome.isError).toBe(false);
  expect(outcome.text).toBe('Probed still.png: 1 stream.');
  const summary = asRecord(outcome.body.summary);
  expect(summary.hasVideo).toBe(true);
  expect(summary.hasAudio).toBe(false);
  expect(summary).not.toHaveProperty('durationSeconds');
  expect(numberField(summary.width)).toBe(PNG_WIDTH);
  expect(numberField(summary.height)).toBe(PNG_HEIGHT);
  const expectedRate = roundedRate(asRecord(await probeJson(pngPath)));
  expect(numberField(summary.frameRate)).toBe(expectedRate);
  const streams = streamRows(outcome.body);
  expect(streams).toHaveLength(1);
  const stream = rowAt(streams, 0);
  expect(stream.type).toBe('video');
  expect(stream.codecName).toBe('png');
  expect(numberField(stream.width)).toBe(PNG_WIDTH);
  expect(numberField(stream.height)).toBe(PNG_HEIGHT);
  expect(numberField(stream.frameRate)).toBe(expectedRate);
  expect(typeof stream.pixelFormat).toBe('string');
  expect(String(stream.pixelFormat).length).toBeGreaterThan(0);
  expect(sha256Of(pngPath)).toBe(before);
});

it('reports 30 fps for a missing rate and omits absent keys', async (): Promise<void> => {
  const real = createToolContext(sandbox.config);
  const probeReply = {
    format: { format_name: 'matroska,webm' },
    streams: [
      { index: 0, codec_type: 'video', codec_name: 'h264', avg_frame_rate: '0/0' },
      { index: 1, codec_type: 'video', codec_name: 'mjpeg', avg_frame_rate: '25/0' },
      { index: 2, codec_type: 'audio', codec_name: 'aac', sample_rate: '48000' },
    ],
  };
  const context: ToolContext = {
    ...real,
    runBinary: async (name, args, options) => {
      const result = await real.runBinary(name, args, options);
      return name === 'ffprobe' ? { ...result, stdout: JSON.stringify(probeReply) } : result;
    },
  };
  const result = await mediaProbeTool.handler({ inputPath: silentPath }, context);
  const body = asRecord(result.structuredContent);

  const summary = asRecord(body.summary);
  expect(summary.frameRate).toBe(30);
  expect(summary).not.toHaveProperty('width');
  expect(summary).not.toHaveProperty('durationSeconds');
  expect(summary).not.toHaveProperty('channels');
  expect(summary.sampleRate).toBe(48000);
  const streams = streamRows(body);
  expect(rowAt(streams, 0).frameRate).toBe(30);
  expect(rowAt(streams, 1).frameRate).toBe(30);
  expect(rowAt(streams, 2)).not.toHaveProperty('frameRate');
  expect(rowAt(streams, 2)).not.toHaveProperty('channelLayout');
  expect(asRecord(body.format)).toEqual({ formatName: 'matroska,webm' });
});

it('keeps the output folder and every input byte unchanged', async (): Promise<void> => {
  const digests = new Map([
    [clipPath, sha256Of(clipPath)],
    [tonePath, sha256Of(tonePath)],
    [pngPath, sha256Of(pngPath)],
  ]);
  const folders = listFolders(sandbox.outputDir);
  await probe({ inputPath: clipPath });
  await probe({ inputPath: tonePath });
  await probe({ inputPath: pngPath });
  await expectFailure({ inputPath: indexlessPath }, ERROR_CODES.PROCESS_FAILED);
  expect(listFolders(sandbox.outputDir)).toEqual(folders);
  for (const [file, digest] of digests) {
    expect(sha256Of(file)).toBe(digest);
  }
});

it(
  'returns PROCESS_FAILED naming media_repair for an MP4 cut before its index',
  async (): Promise<void> => {
    const before = sha256Of(indexlessPath);
    const outcome = await expectFailure(
      { inputPath: indexlessPath },
      ERROR_CODES.PROCESS_FAILED,
    );
    const details = asRecord(outcome.body.details);
    expect(details.binary).toBe('ffprobe');
    expect(String(outcome.body.message)).toContain('media_repair');
    expect(sha256Of(indexlessPath)).toBe(before);
  },
);

it('returns PROCESS_FAILED naming media_repair for a zero byte file', async (): Promise<void> => {
  const before = sha256Of(emptyPath);
  const outcome = await expectFailure({ inputPath: emptyPath }, ERROR_CODES.PROCESS_FAILED);
  const details = asRecord(outcome.body.details);
  expect(details.binary).toBe('ffprobe');
  expect(String(outcome.body.message)).toContain('media_repair');
  expect(sha256Of(emptyPath)).toBe(before);
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  const outcome = await expectFailure(
    { inputPath: outsidePath },
    ERROR_CODES.PATH_NOT_ALLOWED,
  );
  expect(outcome.body.details).toEqual({
    path: outsidePath,
    realPath: outsidePath,
    allowedRoots: [sandbox.allowedRoot],
    reason: 'outside-root',
  });
});

it('returns INPUT_NOT_FOUND when the input is missing', async (): Promise<void> => {
  const outcome = await expectFailure({ inputPath: missingPath }, ERROR_CODES.INPUT_NOT_FOUND);
  expect(outcome.body.details).toEqual({
    path: missingPath,
    role: 'input',
  });
});

it('rejects a call without inputPath before a folder is created', async (): Promise<void> => {
  await expectRejected({});
  await expectRejected({ inputPath: '' });
});

it('lists media_probe as read only with a described inputPath', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'media_probe');
    expect(tool).toBeDefined();
    if (tool === undefined) {
      return;
    }
    expect(tool.annotations).toEqual({
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(tool.description).toContain('never changes the input');
    const properties = asRecord(tool.inputSchema.properties);
    const field = asRecord(properties.inputPath);
    expect(typeof field.description).toBe('string');
    expect(String(field.description).length).toBeGreaterThan(0);
    expect(tool.inputSchema.required).toEqual(['inputPath']);
  });
});
