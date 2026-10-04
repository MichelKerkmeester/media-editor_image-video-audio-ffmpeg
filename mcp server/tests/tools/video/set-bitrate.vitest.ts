// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Bitrate Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
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

import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
  readonly bitRate?: number;
  readonly width?: number;
  readonly height?: number;
}

interface ProbeView {
  readonly formatName: string;
  readonly durationSeconds?: number;
  readonly streams: readonly ProbeStream[];
}

interface BitrateOutcome extends CallOutcome {
  readonly text: string;
}

interface RatePair {
  readonly low: number;
  readonly high: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-bitrate-');
const SCHEMA_VALUES = ['2m', '2', '101M'] as const;

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string' || value.length === 0 || value === 'N/A') {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function probeView(value: unknown): ProbeView {
  const root = asRecord(value);
  const format = asRecord(root.format);
  const formatName = format.format_name;
  if (typeof formatName !== 'string') {
    throw new Error('expected probe format');
  }
  if (!Array.isArray(root.streams)) {
    throw new Error('expected probe streams');
  }
  const streams: ProbeStream[] = [];
  for (const entry of root.streams) {
    const stream = asRecord(entry);
    const codecType = stream.codec_type;
    const codecName = stream.codec_name;
    if (typeof codecType !== 'string' || typeof codecName !== 'string') {
      throw new Error('expected a stream codec');
    }
    const width = typeof stream.width === 'number' ? stream.width : undefined;
    const height = typeof stream.height === 'number' ? stream.height : undefined;
    streams.push({
      codecType,
      codecName,
      bitRate: finiteNumber(stream.bit_rate),
      width,
      height,
    });
  }
  return {
    formatName,
    durationSeconds: finiteNumber(format.duration),
    streams,
  };
}

function streamsOf(probe: ProbeView, codecType: string): ProbeStream[] {
  return probe.streams.filter((stream) => stream.codecType === codecType);
}

function codecName(probe: ProbeView, codecType: string): string {
  const stream = streamsOf(probe, codecType)[0];
  if (stream === undefined) {
    throw new Error(`expected a ${codecType} stream`);
  }
  return stream.codecName;
}

function expectContainer(formatName: string, token: string): void {
  expect(formatName.split(',')).toContain(token);
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

async function setBitrate(args: Record<string, unknown>): Promise<BitrateOutcome> {
  let outcome: BitrateOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    let text = '';
    // Keep the text line so the saved-path sentence can be asserted.
    const original = client.callTool.bind(client);
    client.callTool = async (params, schema, options) => {
      const result = await original(params, schema, options);
      text = textContent(result.content);
      return result;
    };
    try {
      const parsed = await callTool(client, 'video_set_bitrate', args);
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
  expect(body.tool).toBe('video_set_bitrate');
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

function comparedRates(
  lowProbe: ProbeView,
  lowPath: string,
  highProbe: ProbeView,
  highPath: string,
): RatePair {
  const lowBits = streamsOf(lowProbe, 'video')[0]?.bitRate;
  const highBits = streamsOf(highProbe, 'video')[0]?.bitRate;
  if (lowBits !== undefined && highBits !== undefined) {
    return { low: lowBits, high: highBits };
  }
  return {
    low: statSync(lowPath).size,
    high: statSync(highPath).size,
  };
}

async function expectFailure(
  args: Record<string, unknown>,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await setBitrate(args);
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
        name: 'video_set_bitrate',
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

afterAll((): void => {
  sandbox.cleanup();
});

const [boxPath, ratePath, silentPath, audioPath] = await Promise.all([
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 320,
    height: 240,
    withAudio: true,
    fileName: 'box.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: 3,
    width: 320,
    height: 240,
    fileName: 'rate.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 320,
    height: 240,
    fileName: 'silent.mp4',
  }),
  generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'mp3',
    fileName: 'tone.mp3',
  }),
]);
const ffmpegBinary = await resolveTestBinary('ffmpeg');
if (ffmpegBinary === undefined) {
  throw new Error('ffmpeg is not available');
}
// MP4 cannot store pcm_s16le, so the audio copy has to fail.
const pcmPath = path.join(sandbox.allowedRoot, 'pcm.mkv');
await runProcess(ffmpegBinary, [
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=160x120:rate=25:duration=1',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:duration=1',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'pcm_s16le',
  '-shortest',
  pcmPath,
], {
  kind: 'ffmpeg',
  timeoutMs: 60000,
});

it(
  'test_set_video_bitrate: '
  + 're-encodes at 2M and keeps aac',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(boxPath);
  const inputProbe = probeView(await probeJson(boxPath));
  expect(codecName(inputProbe, 'audio')).toBe('aac');
  const outcome = await setBitrate({
    inputPath: boxPath,
    outputName: 'two megabit',
    videoBitrate: '2M',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-2M.mp4', 'two-megabit');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - two-megabit'),
  );
  expect(outcome.text).toBe(
    `Set the video bitrate of box.mp4 to 2M. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(sha256Of(boxPath)).toBe(before);
});

it(
  'writes a video bit rate at least 3 times lower at 50k than at 2M',
  async (): Promise<void> => {
    const before = sha256Of(ratePath);
    const inputProbe = probeView(await probeJson(ratePath));
    expect(inputProbe.durationSeconds).toBeGreaterThan(2.85);
    expect(inputProbe.durationSeconds).toBeLessThan(3.15);
    const video = streamsOf(inputProbe, 'video')[0];
    expect(video?.width).toBe(320);
    expect(video?.height).toBe(240);
    expect(streamsOf(inputProbe, 'audio')).toHaveLength(0);
    const low = await setBitrate({
      inputPath: ratePath,
      outputName: 'low rate',
      videoBitrate: '50k',
    });
    const high = await setBitrate({
      inputPath: ratePath,
      outputName: 'high rate',
      videoBitrate: '2M',
    });
    expect(low.isError).toBe(false);
    expect(high.isError).toBe(false);
    const lowPath = writtenPath(low.body, 'rate-50k.mp4', 'low-rate');
    const highPath = writtenPath(high.body, 'rate-2M.mp4', 'high-rate');
    const lowProbe = probeView(await probeJson(lowPath));
    const highProbe = probeView(await probeJson(highPath));
    expect(codecName(lowProbe, 'video')).toBe('h264');
    expect(codecName(highProbe, 'video')).toBe('h264');
    const rates = comparedRates(lowProbe, lowPath, highProbe, highPath);
    expect(rates.low).toBeGreaterThan(0);
    expect(rates.high).toBeGreaterThanOrEqual(rates.low * 3);
    expect(sha256Of(ratePath)).toBe(before);
  },
);

it.each(SCHEMA_VALUES)(
  'rejects video bitrate %s before a folder is created',
  async (videoBitrate): Promise<void> => {
    await expectRejected({
      inputPath: boxPath,
      outputName: 'bad schema',
      videoBitrate,
    });
  },
);

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const source = probeView(await probeJson(pcmPath));
  expect(codecName(source, 'audio')).toBe('pcm_s16le');
  const before = sha256Of(pcmPath);
  const outcome = await setBitrate({
    inputPath: pcmPath,
    outputName: 'pcm fallback',
    videoBitrate: '2M',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'pcm-2M.mp4', 'pcm-fallback', 1);
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(asList(outcome.body.warnings)).toHaveLength(1);
  expect(sha256Of(pcmPath)).toBe(before);
});

it('re-encodes a video that has no audio', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const inputProbe = probeView(await probeJson(silentPath));
  expect(streamsOf(inputProbe, 'audio')).toHaveLength(0);
  const outcome = await setBitrate({
    inputPath: silentPath,
    outputName: 'silent picture',
    videoBitrate: '2M',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'silent-2M.mp4', 'silent-picture');
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'audio')).toHaveLength(0);
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(sha256Of(silentPath)).toBe(before);
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      videoBitrate: '2M',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: audioPath,
      detected: ['audio'],
      accepted: ['video'],
    },
  );
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
      videoBitrate: '2M',
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
  await expectFailure(
    {
      inputPath: missingPath,
      outputName: 'missing',
      videoBitrate: '2M',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('lists the tool with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'video_set_bitrate');
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
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'outputName', 'videoBitrate']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const bitrate = String(asRecord(properties.videoBitrate).description);
    expect(bitrate).toContain('1k');
    expect(bitrate).toContain('100M');
    expect(bitrate).toContain('1000000 bit/s');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'videoBitrate',
    ]);
  });
});
