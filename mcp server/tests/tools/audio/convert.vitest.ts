// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Convert Tests
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

interface ConvertCase {
  readonly format: string;
  readonly extension: string;
  readonly codecName: string;
  readonly formatTokens: readonly string[];
  readonly slug: string;
}

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
}

interface ProbeView {
  readonly formatName: string;
  readonly duration: number;
  readonly streams: readonly ProbeStream[];
}

interface ConvertOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('audio-convert-');

const DURATION_TOLERANCE_SECONDS = 0.15;

const TOOL_NAME = 'audio_convert';

const CONVERT_CASES: readonly ConvertCase[] = [
  {
    format: 'mp3',
    extension: '.mp3',
    codecName: 'mp3',
    formatTokens: ['mp3'],
    slug: 'format-mp3',
  },
  {
    format: 'wav',
    extension: '.wav',
    codecName: 'pcm_s16le',
    formatTokens: ['wav'],
    slug: 'format-wav',
  },
  {
    format: 'm4a',
    extension: '.m4a',
    codecName: 'aac',
    formatTokens: ['mov', 'mp4', 'm4a'],
    slug: 'format-m4a',
  },
  {
    format: 'flac',
    extension: '.flac',
    codecName: 'flac',
    formatTokens: ['flac'],
    slug: 'format-flac',
  },
  {
    format: 'ogg',
    extension: '.ogg',
    codecName: 'vorbis',
    formatTokens: ['ogg'],
    slug: 'format-ogg',
  },
  {
    format: 'aac',
    extension: '.m4a',
    codecName: 'aac',
    formatTokens: ['mov', 'mp4', 'm4a'],
    slug: 'format-aac',
  },
];

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

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
    streams.push({ codecType, codecName });
  }
  return { formatName, duration, streams };
}

function streamsOf(probe: ProbeView, codecType: string): ProbeStream[] {
  return probe.streams.filter((stream) => stream.codecType === codecType);
}

function expectFormatName(formatName: string, tokens: readonly string[]): void {
  const parts = formatName.split(',');
  expect(parts.some((part) => tokens.includes(part))).toBe(true);
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
const talkingPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  withAudio: true,
  fileName: 'talking.mp4',
});
const silentPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  fileName: 'silent.mp4',
});
const toneProbe = probeView(await probeJson(tonePath));
const talkingProbe = probeView(await probeJson(talkingPath));

afterAll((): void => {
  sandbox.cleanup();
});

it(
  'test_convert_audio_format: '
  + 'converts tone.mp3 to wav as pcm_s16le within 0.15 seconds',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  expect(streamsOf(toneProbe, 'audio').map((stream) => stream.codecName)).toEqual([
    'mp3',
  ]);
  const before = sha256Of(tonePath);
  const outcome = await convert({
    inputPath: tonePath,
    outputName: 'oracle wav',
    format: 'wav',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'tone-converted.wav', 'oracle-wav');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - oracle-wav'),
  );
  expect(outcome.text).toBe(
    `Converted tone.mp3. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'video')).toEqual([]);
  expect(streamsOf(outputProbe, 'audio').map((stream) => stream.codecName)).toEqual([
    'pcm_s16le',
  ]);
  expectFormatName(outputProbe.formatName, ['wav']);
  expectDurationNear(outputProbe.duration, toneProbe.duration);
  expect(sha256Of(tonePath)).toBe(before);
  expect(sha256Of(filePath)).not.toBe(before);
});

it.each(CONVERT_CASES)(
  'writes $format as $codecName within 0.15 seconds',
  async (row): Promise<void> => {
    const before = sha256Of(tonePath);
    const outcome = await convert({
      inputPath: tonePath,
      outputName: `format ${row.format}`,
      format: row.format,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `tone-converted${row.extension}`,
      row.slug,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expect(streamsOf(outputProbe, 'video')).toEqual([]);
    expect(streamsOf(outputProbe, 'audio').map((stream) => stream.codecName)).toEqual([
      row.codecName,
    ]);
    expectFormatName(outputProbe.formatName, row.formatTokens);
    expectDurationNear(outputProbe.duration, toneProbe.duration);
    expect(sha256Of(tonePath)).toBe(before);
    expect(sha256Of(filePath)).not.toBe(before);
  },
);

it('drops the picture from talking.mp4 within 0.15 seconds', async (): Promise<void> => {
  expect(streamsOf(talkingProbe, 'video').length).toBeGreaterThan(0);
  expect(streamsOf(talkingProbe, 'audio').map((stream) => stream.codecName)).toEqual([
    'aac',
  ]);
  const before = sha256Of(talkingPath);
  const outcome = await convert({
    inputPath: talkingPath,
    outputName: 'from video',
    format: 'wav',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'talking-converted.wav', 'from-video');
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'video')).toEqual([]);
  expect(streamsOf(outputProbe, 'audio').map((stream) => stream.codecName)).toEqual([
    'pcm_s16le',
  ]);
  expectFormatName(outputProbe.formatName, ['wav']);
  expectDurationNear(outputProbe.duration, talkingProbe.duration);
  expect(sha256Of(talkingPath)).toBe(before);
});

it('rejects format aiff before a folder is created', async (): Promise<void> => {
  await expectRejected({
    inputPath: tonePath,
    outputName: 'bad format',
    format: 'aiff',
  });
});

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

it('lists audio_convert with container names and annotations', async (): Promise<void> => {
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
    for (const name of ['inputPath', 'outputName', 'format']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const described = String(asRecord(properties.format).description);
    for (const name of ['mp3', 'wav', 'm4a', 'flac', 'ogg']) {
      expect(described).toContain(name);
    }
    expect(described).not.toMatch(/\baac\b/u);
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'format',
    ]);
  });
});
