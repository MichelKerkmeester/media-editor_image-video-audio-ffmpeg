// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Set Bitrate Tests
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

interface KeptInput {
  readonly label: string;
  readonly filePath: string;
  readonly slug: string;
}

interface SineOptions {
  readonly fileName: string;
  readonly codec: string;
  readonly muxer?: string;
}

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
  readonly bitRate?: number;
}

interface ProbeView {
  readonly formatName: string;
  readonly duration: number;
  readonly formatBitRate?: number;
  readonly streams: readonly ProbeStream[];
}

interface SetOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('audio-set-bitrate-');

const DURATION_TOLERANCE_SECONDS = 0.15;
const TARGET_BITRATE = 320_000;
const BITRATE_TOLERANCE = 0.05;

const TOOL_NAME = 'audio_set_bitrate';
const OPERATION = 'bitrate';

const ACCEPTED_CONTAINERS = ['mp3', 'wav', 'm4a', 'flac', 'ogg'];

const outsidePath = path.join(sandbox.root, 'outside.mp3');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp3');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function optionalBitRate(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value !== 'N/A') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function probeView(value: unknown): ProbeView {
  const root = asRecord(value);
  const format = asRecord(root.format);
  const formatName = format.format_name;
  const duration = Number(format.duration);
  if (typeof formatName !== 'string' || !Number.isFinite(duration)) {
    throw new Error('expected probe format');
  }
  if (!Array.isArray(root.streams)) {
    throw new Error('expected probe streams');
  }
  const formatBitRate = optionalBitRate(format.bit_rate);
  const streams: ProbeStream[] = [];
  for (const entry of root.streams) {
    const stream = asRecord(entry);
    const codecType = stream.codec_type;
    const codecName = stream.codec_name;
    if (typeof codecType !== 'string' || typeof codecName !== 'string') {
      throw new Error('expected a stream codec');
    }
    const bitRate = optionalBitRate(stream.bit_rate);
    streams.push({
      codecType,
      codecName,
      ...(bitRate === undefined ? {} : { bitRate }),
    });
  }
  return {
    formatName,
    duration,
    ...(formatBitRate === undefined ? {} : { formatBitRate }),
    streams,
  };
}

function streamsOf(probe: ProbeView, codecType: string): ProbeStream[] {
  return probe.streams.filter((stream) => stream.codecType === codecType);
}

function audioStream(probe: ProbeView): ProbeStream {
  const matches = streamsOf(probe, 'audio');
  expect(matches).toHaveLength(1);
  const stream = matches[0];
  if (stream === undefined) {
    throw new Error('expected one audio stream');
  }
  return stream;
}

function audioBitRate(probe: ProbeView): number {
  const rate = audioStream(probe).bitRate ?? probe.formatBitRate;
  if (rate === undefined) {
    throw new Error('expected a bit rate');
  }
  return rate;
}

function expectWithinFivePercent(actual: number, target: number): void {
  const gap = Math.abs(actual - target) / target;
  expect(gap).toBeLessThanOrEqual(BITRATE_TOLERANCE);
}

function expectFormatName(formatName: string, tokens: readonly string[]): void {
  const parts = formatName.split(',');
  expect(parts.some((part) => tokens.includes(part))).toBe(true);
}

function expectDurationNear(actual: number, expected: number): void {
  const gap = Math.abs(actual - expected);
  expect(gap).toBeLessThanOrEqual(DURATION_TOLERANCE_SECONDS);
}

function formatNames(value: unknown): string[] {
  const formatName = probeView(value).formatName;
  return formatName.split(',');
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

function request(
  inputPath: string,
  outputName: string,
  audioBitrate: string = '320k',
): Record<string, unknown> {
  return { inputPath, outputName, audioBitrate };
}

function keptFileName(inputPath: string): string {
  const extension = path.extname(inputPath);
  const stem = path.basename(inputPath, extension);
  return `${stem}-${OPERATION}${extension}`;
}

async function encodeSine(options: SineOptions): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  const filePath = path.join(sandbox.allowedRoot, options.fileName);
  const args = [
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-c:a',
    options.codec,
  ];
  if (options.muxer !== undefined) {
    args.push('-f', options.muxer);
  }
  args.push(filePath);
  await runProcess(binary, args, {
    kind: 'ffmpeg',
    timeoutMs: 60000,
  });
  return filePath;
}

async function callSet(args: Record<string, unknown>): Promise<SetOutcome> {
  let outcome: SetOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    let text = '';
    // callTool checks the line, and this wrapper keeps it for the path assertion.
    const original = client.callTool.bind(client);
    client.callTool = async (params, schema, options) => {
      const result = await original(params, schema, options);
      text = textContent(result.content);
      return result;
    };
    try {
      const parsed = await callTool(client, TOOL_NAME, args);
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
): string {
  expect(body.tool).toBe(TOOL_NAME);
  expect(body.warnings).toEqual([]);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe('audio');
  expect(entry).not.toHaveProperty('width');
  expect(entry).not.toHaveProperty('height');
  if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected an audio file');
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
  const outcome = await callSet(args);
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

const [
  tonePath,
  wavPath,
  flacPath,
  m4aPath,
  oggPath,
  mkaPath,
  talkingPath,
  silentPath,
] = await Promise.all([
  generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'mp3',
    fileName: 'tone.mp3',
  }),
  generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  }),
  generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'flac',
    fileName: 'tone.flac',
  }),
  generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'aac',
    fileName: 'tone.m4a',
  }),
  encodeSine({ fileName: 'tone.ogg', codec: 'libvorbis' }),
  encodeSine({ fileName: 'tone.mka', codec: 'libvorbis', muxer: 'matroska' }),
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 160,
    height: 120,
    withAudio: true,
    fileName: 'talking.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 160,
    height: 120,
    fileName: 'silent.mp4',
  }),
]);

const keptInputs: readonly KeptInput[] = [
  { label: 'wav', filePath: wavPath, slug: 'keep-wav' },
  { label: 'flac', filePath: flacPath, slug: 'keep-flac' },
  { label: 'm4a', filePath: m4aPath, slug: 'keep-m4a' },
  { label: 'ogg', filePath: oggPath, slug: 'keep-ogg' },
  { label: 'mp3', filePath: tonePath, slug: 'keep-mp3' },
];

afterAll((): void => {
  sandbox.cleanup();
});

it(
  'test_set_audio_bitrate: '
  + 're-encodes tone.mp3 within 5 percent and 0.15 seconds',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const inputProbe = probeView(await probeJson(tonePath));
  const inputRate = audioBitRate(inputProbe);
  expect(audioStream(inputProbe).codecName).toBe('mp3');
  const inputGap = Math.abs(inputRate - TARGET_BITRATE) / TARGET_BITRATE;
  expect(inputGap).toBeGreaterThan(BITRATE_TOLERANCE);
  const before = sha256Of(tonePath);
  const outcome = await callSet(request(tonePath, 'oracle 320k'));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'tone-bitrate.mp3', 'oracle-320k');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - oracle-320k'),
  );
  expect(outcome.text).toBe(
    `Set the bitrate of tone.mp3 to 320k. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  const outputRate = audioBitRate(outputProbe);
  expect(streamsOf(outputProbe, 'video')).toEqual([]);
  expect(audioStream(outputProbe).codecName).toBe('mp3');
  expect(outputRate).not.toBe(inputRate);
  expectWithinFivePercent(outputRate, TARGET_BITRATE);
  expectDurationNear(outputProbe.duration, inputProbe.duration);
  expect(sha256Of(tonePath)).toBe(before);
  expect(sha256Of(filePath)).not.toBe(before);
});

it.each(keptInputs)(
  'keeps the $label container and codec within 0.15 seconds',
  async (row): Promise<void> => {
    const inputProbe = probeView(await probeJson(row.filePath));
    const before = sha256Of(row.filePath);
    // Mono Vorbis cannot store 320k, so this sweep uses a rate it accepts.
    const outcome = await callSet(
      request(row.filePath, `keep ${row.label}`, '192k'),
    );
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      keptFileName(row.filePath),
      row.slug,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expect(streamsOf(outputProbe, 'video')).toEqual([]);
    expect(audioStream(outputProbe).codecName).toBe(
      audioStream(inputProbe).codecName,
    );
    expect(path.extname(filePath)).toBe(path.extname(row.filePath));
    expectDurationNear(outputProbe.duration, inputProbe.duration);
    expect(sha256Of(row.filePath)).toBe(before);
  },
);

it('writes talking.mp4 as audio-only m4a within 0.15 seconds', async (): Promise<void> => {
  const inputProbe = probeView(await probeJson(talkingPath));
  expect(streamsOf(inputProbe, 'video').length).toBeGreaterThan(0);
  expect(audioStream(inputProbe).codecName).toBe('aac');
  const before = sha256Of(talkingPath);
  const outcome = await callSet(request(talkingPath, 'from video'));
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'talking-bitrate.m4a', 'from-video');
  expect(outcome.text).toBe(
    `Set the bitrate of talking.mp4 to 320k. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'video')).toEqual([]);
  expect(audioStream(outputProbe).codecName).toBe('aac');
  expectFormatName(outputProbe.formatName, ['mov', 'mp4', 'm4a']);
  expectDurationNear(outputProbe.duration, inputProbe.duration);
  expect(sha256Of(talkingPath)).toBe(before);
  expect(sha256Of(filePath)).not.toBe(before);
});

it.each(['0k', '101M'])(
  'rejects audioBitrate %s before a folder is created',
  async (audioBitrate): Promise<void> => {
    await expectRejected(request(tonePath, 'bad bitrate', audioBitrate));
  },
);

it('returns UNSUPPORTED_FORMAT for a matroska audio file', async (): Promise<void> => {
  const detected = formatNames(await probeJson(mkaPath));
  await expectFailure(
    request(mkaPath, 'matroska audio'),
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: mkaPath,
      detected,
      accepted: ACCEPTED_CONTAINERS,
      reason: 'container',
    },
  );
});

it('returns UNSUPPORTED_FORMAT when the video has no audio', async (): Promise<void> => {
  await expectFailure(
    request(silentPath, 'silent video'),
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: silentPath,
      detected: ['video'],
      accepted: ['audio'],
    },
  );
});

it('returns PATH_NOT_ALLOWED outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    request(outsidePath, 'outside'),
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
    request(missingPath, 'missing'),
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('lists the tool with annotations and field descriptions', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
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
    expect(tool.description).toContain('never changes the input');
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'outputName', 'audioBitrate']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(properties.audioBitrate).description)).toContain('1k');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'audioBitrate',
    ]);
  });
});
