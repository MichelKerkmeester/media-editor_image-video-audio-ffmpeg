// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Extract Tests
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

interface ExtractCase {
  readonly codec: string;
  readonly extension: string;
  readonly codecName: string;
  readonly formatToken: string;
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

interface ExtractOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('audio-extract-');

const DURATION_TOLERANCE_SECONDS = 0.15;

const EXTRACT_CASES: readonly ExtractCase[] = [
  {
    codec: 'libmp3lame',
    extension: '.mp3',
    codecName: 'mp3',
    formatToken: 'mp3',
    slug: 'codec-libmp3lame',
  },
  {
    codec: 'aac',
    extension: '.m4a',
    codecName: 'aac',
    formatToken: 'm4a',
    slug: 'codec-aac',
  },
  {
    codec: 'libvorbis',
    extension: '.ogg',
    codecName: 'vorbis',
    formatToken: 'ogg',
    slug: 'codec-libvorbis',
  },
  {
    codec: 'flac',
    extension: '.flac',
    codecName: 'flac',
    formatToken: 'flac',
    slug: 'codec-flac',
  },
  {
    codec: 'pcm_s16le',
    extension: '.wav',
    codecName: 'pcm_s16le',
    formatToken: 'wav',
    slug: 'codec-pcms16le',
  },
  {
    codec: 'mp3',
    extension: '.mp3',
    codecName: 'mp3',
    formatToken: 'mp3',
    slug: 'codec-mp3',
  },
  {
    codec: 'wav',
    extension: '.wav',
    codecName: 'pcm_s16le',
    formatToken: 'wav',
    slug: 'codec-wav',
  },
];

const SCHEMA_REJECTIONS = ['opus', 'MP3'] as const;

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

function expectContainer(formatName: string, token: string): void {
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

async function extract(args: Record<string, unknown>): Promise<ExtractOutcome> {
  let outcome: ExtractOutcome | undefined;
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
      const parsed = await callTool(client, 'audio_extract', args);
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
  expect(body.tool).toBe('audio_extract');
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
  const outcome = await extract(args);
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
        name: 'audio_extract',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

function canonicalDescription(description: string): string {
  return description
    .replaceAll('libmp3lame', '')
    .replaceAll('pcm_s16le', '')
    .replaceAll('.mp3', '')
    .replaceAll('.wav', '');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const videoPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 2,
  width: 320,
  height: 240,
  withAudio: true,
  fileName: 'clip.mp4',
});
const audioPath = await generateAudio(sandbox.allowedRoot, {
  seconds: 1,
  format: 'wav',
  fileName: 'tone.wav',
});
const silentPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  fileName: 'silent.mp4',
});
const videoProbe = probeView(await probeJson(videoPath));

afterAll((): void => {
  sandbox.cleanup();
});

it(
  'test_extract_audio: '
  + 'extracts clip.mp4 to mp3 within 0.15 seconds',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  expect(streamsOf(videoProbe, 'video').length).toBeGreaterThan(0);
  expect(streamsOf(videoProbe, 'audio').map((stream) => stream.codecName)).toEqual([
    'aac',
  ]);
  const before = sha256Of(videoPath);
  const outcome = await extract({
    inputPath: videoPath,
    outputName: 'extracted clip',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'clip-audio.mp3', 'extracted-clip');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - extracted-clip'),
  );
  expect(outcome.text).toBe(
    `Extracted audio from clip.mp4. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'video')).toEqual([]);
  expect(streamsOf(outputProbe, 'audio').map((stream) => stream.codecName)).toEqual([
    'mp3',
  ]);
  expectContainer(outputProbe.formatName, 'mp3');
  expectDurationNear(outputProbe.duration, videoProbe.duration);
  expect(sha256Of(videoPath)).toBe(before);
});

it.each(EXTRACT_CASES)(
  'encodes $codec as $codecName within 0.15 seconds',
  async (row): Promise<void> => {
    const before = sha256Of(videoPath);
    const outcome = await extract({
      inputPath: videoPath,
      outputName: `codec ${row.codec}`,
      audioCodec: row.codec,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `clip-audio${row.extension}`,
      row.slug,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expect(streamsOf(outputProbe, 'video')).toEqual([]);
    expect(streamsOf(outputProbe, 'audio').map((stream) => stream.codecName)).toEqual([
      row.codecName,
    ]);
    expectContainer(outputProbe.formatName, row.formatToken);
    expectDurationNear(outputProbe.duration, videoProbe.duration);
    expect(sha256Of(videoPath)).toBe(before);
  },
);

it('extracts tone.wav, which has no video, to mp3', async (): Promise<void> => {
  const before = sha256Of(audioPath);
  const source = probeView(await probeJson(audioPath));
  expect(streamsOf(source, 'video')).toEqual([]);
  expect(streamsOf(source, 'audio').map((stream) => stream.codecName)).toEqual([
    'pcm_s16le',
  ]);
  const outcome = await extract({
    inputPath: audioPath,
    outputName: 'from wav',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'tone-audio.mp3', 'from-wav');
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'video')).toEqual([]);
  expect(streamsOf(outputProbe, 'audio').map((stream) => stream.codecName)).toEqual([
    'mp3',
  ]);
  expectContainer(outputProbe.formatName, 'mp3');
  expectDurationNear(outputProbe.duration, source.duration);
  expect(sha256Of(audioPath)).toBe(before);
});

it('returns UNSUPPORTED_FORMAT when the video has no audio', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: silentPath,
      outputName: 'silent video',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: silentPath,
      detected: ['video'],
      accepted: ['audio'],
    },
  );
});

it.each(SCHEMA_REJECTIONS)(
  'rejects audioCodec %s before a folder is created',
  async (audioCodec): Promise<void> => {
    await expectRejected({
      inputPath: videoPath,
      outputName: 'bad codec',
      audioCodec,
    });
  },
);

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
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
  await expectFailure(
    {
      inputPath: missingPath,
      outputName: 'missing',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('lists audio_extract with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'audio_extract');
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
    for (const name of ['inputPath', 'outputName', 'audioCodec']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const audioCodec = asRecord(properties.audioCodec);
    const described = String(audioCodec.description);
    expect(described).toContain('libmp3lame');
    expect(described).toContain('aac');
    expect(described).toContain('libvorbis');
    expect(described).toContain('flac');
    expect(described).toContain('pcm_s16le');
    expect(described).toContain('.mp3');
    expect(described).toContain('.m4a');
    expect(described).toContain('.ogg');
    expect(described).toContain('.flac');
    expect(described).toContain('.wav');
    const stripped = canonicalDescription(described);
    expect(stripped).not.toMatch(/\bmp3\b/u);
    expect(stripped).not.toMatch(/\bwav\b/u);
    expect(tool.inputSchema.required).toEqual(['inputPath', 'outputName']);
  });
});
