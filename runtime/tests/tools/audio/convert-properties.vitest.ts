// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Convert Properties Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { generateAudio, generateVideo, probeJson } from '../../helpers/media.js';
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
  readonly sampleRate?: string;
  readonly channels?: number;
  readonly bitRate?: number;
}

interface ProbeView {
  readonly formatName: string;
  readonly duration: number;
  readonly streams: readonly ProbeStream[];
}

interface AudioFacts {
  readonly codecName: string;
  readonly sampleRate: string;
  readonly channels: number;
  readonly bitRate?: number;
}

interface ConvertOutcome extends CallOutcome {
  readonly text: string;
}

interface SchemaRejection {
  readonly label: string;
  readonly args: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('audio-convert-properties-');

const DURATION_TOLERANCE_SECONDS = 0.15;
const BITRATE_TOLERANCE = 0.05;
const TARGET_BITRATE = 320000;

const TOOL_NAME = 'audio_convert_properties';

const SCHEMA_REJECTIONS: readonly SchemaRejection[] = [
  {
    label: 'format aiff',
    args: { format: 'aiff' },
  },
  {
    label: 'sampleRate 7999',
    args: { format: 'wav', sampleRate: 7999 },
  },
  {
    label: 'channels 9',
    args: { format: 'wav', channels: 9 },
  },
  {
    label: 'audioBitrate 192',
    args: { format: 'wav', audioBitrate: '192' },
  },
];

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function finiteBitRate(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const rate = Number(value);
  if (!Number.isFinite(rate)) {
    return undefined;
  }
  return rate;
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
  const streams: ProbeStream[] = [];
  for (const entry of root.streams) {
    const stream = asRecord(entry);
    const codecType = stream.codec_type;
    const codecName = stream.codec_name;
    if (typeof codecType !== 'string' || typeof codecName !== 'string') {
      throw new Error('expected a stream codec');
    }
    const sampleRate = stream.sample_rate;
    const channels = stream.channels;
    const bitRate = finiteBitRate(stream.bit_rate);
    streams.push({
      codecType,
      codecName,
      ...(typeof sampleRate === 'string' ? { sampleRate } : {}),
      ...(typeof channels === 'number' ? { channels } : {}),
      ...(bitRate === undefined ? {} : { bitRate }),
    });
  }
  return { formatName, duration, streams };
}

function streamsOf(probe: ProbeView, codecType: string): ProbeStream[] {
  return probe.streams.filter((stream) => stream.codecType === codecType);
}

function audioFacts(probe: ProbeView): AudioFacts {
  const audio = streamsOf(probe, 'audio');
  expect(audio).toHaveLength(1);
  const stream = audio[0];
  if (
    stream === undefined
    || stream.sampleRate === undefined
    || stream.channels === undefined
  ) {
    throw new Error('expected audio rate and channels');
  }
  return {
    codecName: stream.codecName,
    sampleRate: stream.sampleRate,
    channels: stream.channels,
    ...(stream.bitRate === undefined ? {} : { bitRate: stream.bitRate }),
  };
}

function expectFormatName(formatName: string, token: string): void {
  expect(formatName.split(',')).toContain(token);
}

function expectDurationNear(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(DURATION_TOLERANCE_SECONDS);
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

async function convert(args: Record<string, unknown>): Promise<ConvertOutcome> {
  let outcome: ConvertOutcome | undefined;
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
  const outcome = await convert(args);
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

const tonePath = await generateAudio(sandbox.allowedRoot, {
  seconds: 1,
  format: 'mp3',
  fileName: 'tone.mp3',
});
const silentPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  fileName: 'silent.mp4',
});
const toneProbe = probeView(await probeJson(tonePath));
const toneAudio = audioFacts(toneProbe);

afterAll((): void => {
  sandbox.cleanup();
});

it(
  'test_convert_audio_properties: '
  + 'sets wav to 2 channels from mono within 0.15 seconds',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  expect(toneAudio.codecName).toBe('mp3');
  expect(toneAudio.channels).toBe(1);
  expect(toneAudio.sampleRate).toBe('44100');
  const before = sha256Of(tonePath);
  const outcome = await convert({
    inputPath: tonePath,
    outputName: 'oracle wav',
    format: 'wav',
    audioBitrate: '192k',
    sampleRate: 44100,
    channels: 2,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'tone-converted.wav', 'oracle-wav');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - oracle-wav'),
  );
  expect(outcome.text).toBe(
    `Converted the audio properties of tone.mp3. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  const outputAudio = audioFacts(outputProbe);
  expect(streamsOf(outputProbe, 'video')).toEqual([]);
  expect(outputAudio.codecName).toBe('pcm_s16le');
  expect(outputAudio.channels).toBe(2);
  expect(outputAudio.sampleRate).toBe('44100');
  expectFormatName(outputProbe.formatName, 'wav');
  expectDurationNear(outputProbe.duration, toneProbe.duration);
  expect(sha256Of(tonePath)).toBe(before);
});

it('sets mp3 to 48000 Hz stereo within 5 percent of 320000', async (): Promise<void> => {
  expect(toneAudio.sampleRate).toBe('44100');
  expect(toneAudio.channels).toBe(1);
  const before = sha256Of(tonePath);
  const outcome = await convert({
    inputPath: tonePath,
    outputName: 'high mp3',
    format: 'mp3',
    audioBitrate: '320k',
    sampleRate: 48000,
    channels: 2,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'tone-converted.mp3', 'high-mp3');
  const outputAudio = audioFacts(probeView(await probeJson(filePath)));
  expect(outputAudio.codecName).toBe('mp3');
  expect(outputAudio.sampleRate).toBe('48000');
  expect(outputAudio.channels).toBe(2);
  expect(outputAudio.bitRate).toBeTypeOf('number');
  const rate = outputAudio.bitRate ?? 0;
  expect(Math.abs(rate - TARGET_BITRATE) / TARGET_BITRATE).toBeLessThanOrEqual(
    BITRATE_TOLERANCE,
  );
  expect(sha256Of(tonePath)).toBe(before);
});

it('keeps 44100 Hz mono when only format is set', async (): Promise<void> => {
  expect(toneAudio.sampleRate).toBe('44100');
  expect(toneAudio.channels).toBe(1);
  expect(toneAudio.codecName).toBe('mp3');
  const before = sha256Of(tonePath);
  const outcome = await convert({
    inputPath: tonePath,
    outputName: 'format only',
    format: 'wav',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'tone-converted.wav', 'format-only');
  const outputProbe = probeView(await probeJson(filePath));
  const outputAudio = audioFacts(outputProbe);
  expect(outputAudio.codecName).toBe('pcm_s16le');
  expect(outputAudio.sampleRate).toBe(toneAudio.sampleRate);
  expect(outputAudio.channels).toBe(toneAudio.channels);
  expectFormatName(outputProbe.formatName, 'wav');
  expect(sha256Of(tonePath)).toBe(before);
});

it.each(SCHEMA_REJECTIONS)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected({
      inputPath: tonePath,
      outputName: 'bad field',
      ...row.args,
    });
  },
);

it('returns UNSUPPORTED_FORMAT when the video has no audio', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: silentPath,
      outputName: 'silent video',
      format: 'wav',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: silentPath,
      detected: ['video'],
      accepted: ['audio'],
    },
  );
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
      format: 'wav',
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
      format: 'wav',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('lists audio_convert_properties with described fields', async (): Promise<void> => {
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
    expect(tool.description).not.toMatch(/\baac\b/u);
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of [
      'inputPath',
      'outputName',
      'format',
      'audioBitrate',
      'sampleRate',
      'channels',
    ]) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const described = String(asRecord(properties.format).description);
    for (const name of ['mp3', 'wav', 'm4a', 'flac', 'ogg']) {
      expect(described).toContain(name);
    }
    expect(described).not.toMatch(/\baac\b/u);
    const bitrate = String(asRecord(properties.audioBitrate).description);
    expect(bitrate).toContain('wav');
    expect(bitrate).toContain('flac');
    expect(bitrate).toContain('ignores');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'format',
    ]);
  });
});
