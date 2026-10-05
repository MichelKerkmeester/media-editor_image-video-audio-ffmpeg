// ───────────────────────────────────────────────────────────────────
// MODULE: Video Convert Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, statSync, writeFileSync } from 'node:fs';
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
}

interface ProbeView {
  readonly formatName: string;
  readonly streams: readonly ProbeStream[];
}

interface ConvertOutcome extends CallOutcome {
  readonly text: string;
}

interface CopyCase {
  readonly format: string;
  readonly extension: string;
  readonly token: string;
}

interface SilentCase {
  readonly format: string;
  readonly extension: string;
  readonly token: string;
  readonly videoCodec: string;
  readonly warningCount: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-convert-');

const TOOL_NAME = 'video_convert';

const COPY_CASES: readonly CopyCase[] = [
  { format: 'mkv', extension: '.mkv', token: 'matroska' },
  { format: 'mov', extension: '.mov', token: 'mov' },
];

const SILENT_CASES: readonly SilentCase[] = [
  {
    format: 'mp4',
    extension: '.mp4',
    token: 'mp4',
    videoCodec: 'h264',
    warningCount: 0,
  },
  {
    format: 'mov',
    extension: '.mov',
    token: 'mov',
    videoCodec: 'h264',
    warningCount: 0,
  },
  {
    format: 'mkv',
    extension: '.mkv',
    token: 'matroska',
    videoCodec: 'h264',
    warningCount: 0,
  },
  {
    format: 'webm',
    extension: '.webm',
    token: 'webm',
    videoCodec: 'vp9',
    warningCount: 1,
  },
  {
    format: 'avi',
    extension: '.avi',
    token: 'avi',
    videoCodec: 'h264',
    warningCount: 0,
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
    streams.push({ codecType, codecName });
  }
  return { formatName, streams };
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

function expectToken(formatName: string, token: string): void {
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
  warningCount = 0,
): string {
  expect(body.tool).toBe(TOOL_NAME);
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

const soundPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  withAudio: true,
  fileName: 'sound.mp4',
});
const silentPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  fileName: 'silent.mp4',
});
const tonePath = await generateAudio(sandbox.allowedRoot, {
  seconds: 1,
  format: 'wav',
  fileName: 'tone.wav',
});
const soundHash = sha256Of(soundPath);
const silentHash = sha256Of(silentPath);
const soundProbe = probeView(await probeJson(soundPath));
const silentProbe = probeView(await probeJson(silentPath));

afterAll((): void => {
  sandbox.cleanup();
});

it(
  'test_convert_video_format: '
  + 'converts an h264 aac mp4 to avi and keeps a video stream',
  async (): Promise<void> => {
  expect(codecName(soundProbe, 'video')).toBe('h264');
  expect(codecName(soundProbe, 'audio')).toBe('aac');
  expect(soundProbe.formatName.split(',')).not.toContain('avi');
  const outcome = await convert({
    inputPath: soundPath,
    outputName: 'oracle-avi',
    format: 'avi',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'sound-converted.avi', 'oracle-avi');
  const outputProbe = probeView(await probeJson(filePath));
  expectToken(outputProbe.formatName, 'avi');
  expect(streamsOf(outputProbe, 'video')).toHaveLength(1);
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(outcome.text).toBe(
    `Converted sound.mp4 to avi. Output saved to ${filePath}.`,
  );
  expect(sha256Of(soundPath)).toBe(soundHash);
});

it.each(COPY_CASES)(
  'copies h264 and aac into $format',
  async (row): Promise<void> => {
    expect(codecName(soundProbe, 'video')).toBe('h264');
    expect(codecName(soundProbe, 'audio')).toBe('aac');
    const outcome = await convert({
      inputPath: soundPath,
      outputName: `copy-${row.format}`,
      format: row.format,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `sound-converted${row.extension}`,
      `copy-${row.format}`,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expectToken(outputProbe.formatName, row.token);
    expect(codecName(outputProbe, 'video')).toBe(codecName(soundProbe, 'video'));
    expect(codecName(outputProbe, 'audio')).toBe(codecName(soundProbe, 'audio'));
    expect(sha256Of(soundPath)).toBe(soundHash);
  },
);

it('re-encodes to webm as vp9 and opus when the copy is refused', async (): Promise<void> => {
  expect(codecName(soundProbe, 'video')).toBe('h264');
  expect(codecName(soundProbe, 'audio')).toBe('aac');
  const outcome = await convert({
    inputPath: soundPath,
    outputName: 'encode-webm',
    format: 'webm',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'sound-converted.webm',
    'encode-webm',
    1,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectToken(outputProbe.formatName, 'webm');
  expect(codecName(outputProbe, 'video')).toBe('vp9');
  expect(codecName(outputProbe, 'video')).not.toBe(codecName(soundProbe, 'video'));
  expect(codecName(outputProbe, 'audio')).toBe('opus');
  expect(codecName(outputProbe, 'audio')).not.toBe(codecName(soundProbe, 'audio'));
  expect(sha256Of(soundPath)).toBe(soundHash);
});

it.each(SILENT_CASES)(
  'converts a video with no audio to $format',
  async (row): Promise<void> => {
    expect(streamsOf(silentProbe, 'audio')).toEqual([]);
    expect(codecName(silentProbe, 'video')).toBe('h264');
    const outcome = await convert({
      inputPath: silentPath,
      outputName: `silent-${row.format}`,
      format: row.format,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `silent-converted${row.extension}`,
      `silent-${row.format}`,
      row.warningCount,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expectToken(outputProbe.formatName, row.token);
    expect(streamsOf(outputProbe, 'audio')).toEqual([]);
    expect(codecName(outputProbe, 'video')).toBe(row.videoCodec);
    expect(sha256Of(silentPath)).toBe(silentHash);
  },
);

it('rejects format flv before a folder is created', async (): Promise<void> => {
  await expectRejected({
    inputPath: soundPath,
    outputName: 'bad-format',
    format: 'flv',
  });
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: tonePath,
      outputName: 'audio-only',
      format: 'mp4',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: tonePath,
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
      format: 'mp4',
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
      format: 'mp4',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('keeps only the re-encode when a webm copy into avi fails', async (): Promise<void> => {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  // AVI refuses a copied Opus track and ffmpeg leaves a partial file behind.
  const webmPath = path.join(sandbox.allowedRoot, 'opus.webm');
  await runProcess(binary, [
    '-f',
    'lavfi',
    '-i',
    'testsrc2=size=160x120:rate=25:duration=1',
    '-f',
    'lavfi',
    '-i',
    'sine=frequency=440:duration=1',
    '-c:v',
    'libvpx-vp9',
    '-c:a',
    'libopus',
    '-shortest',
    webmPath,
  ], {
    kind: 'ffmpeg',
    timeoutMs: 60000,
  });
  const outcome = await convert({
    inputPath: webmPath,
    outputName: 'avi-fallback',
    format: 'avi',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'opus-converted.avi', 'avi-fallback', 1);
  expect(readdirSync(path.dirname(filePath))).toEqual(['opus-converted.avi']);
  const outputProbe = probeView(await probeJson(filePath));
  expectToken(outputProbe.formatName, 'avi');
  expect(codecName(outputProbe, 'video')).toBe('mpeg4');
  expect(codecName(outputProbe, 'audio')).toBe('mp3');
});
