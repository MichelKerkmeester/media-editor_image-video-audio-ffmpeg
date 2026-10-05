// ───────────────────────────────────────────────────────────────────
// MODULE: Media Repair Diagnosis Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { parseDiagnosis } from '../../../src/tools/media/repair.js';
import {
  decodeErrorLines,
  generateEmptyFile,
  generateIndexlessMp4,
  generateMislabeledMatroska,
  generateUnindexedMatroska,
} from '../../helpers/broken-media.js';
import {
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

interface RepairOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('media-repair-');

const CLIP_WIDTH = 320;
const CLIP_HEIGHT = 240;
const CLEAN_SECONDS = 2;
const MATROSKA_SECONDS = 4;
const CLEAN_TOLERANCE = 0.2;
const REPAIRED_TOLERANCE = 0.3;

const WRITER_STDOUT = [
  '[STREAM]',
  'codec_type=video',
  'codec_name=h264',
  '[/STREAM]',
  '[STREAM]',
  'codec_type=audio',
  'codec_name=aac',
  '[/STREAM]',
  '[FORMAT]',
  'format_name=matroska,webm',
  'duration=4.000000',
  '[/FORMAT]',
].join('\n');

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

async function repair(args: Record<string, unknown>): Promise<RepairOutcome> {
  let outcome: RepairOutcome | undefined;
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
      const parsed = await callTool(client, 'media_repair', args);
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

async function expectFailure(args: Record<string, unknown>, code: string): Promise<RepairOutcome> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await repair(args);
  expect(outcome.isError).toBe(true);
  expect(outcome.body.code).toBe(code);
  expect(outcome.body).not.toHaveProperty('outputs');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
  return outcome;
}

async function expectRejected(args: Record<string, unknown>): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client) => {
    await expectProtocolError(
      client.callTool({
        name: 'media_repair',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

function repairedEntry(body: Record<string, unknown>, fileName: string): Record<string, unknown> {
  expect(body.tool).toBe('media_repair');
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe('video');
  if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected a repaired file');
  }
  expect(entry.bytes).toBe(statSync(entry.path).size);
  expect(path.basename(entry.path)).toBe(fileName);
  const folderName = path.basename(path.dirname(entry.path));
  expect(folderName).toMatch(/^\d{3,} - repair$/u);
  expect(path.dirname(path.dirname(entry.path))).toBe(sandbox.outputDir);
  return entry;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const [cleanPath, unindexedPath, mislabeledPath, indexlessPath] = await Promise.all([
  generateVideo(sandbox.allowedRoot, {
    seconds: CLEAN_SECONDS,
    width: CLIP_WIDTH,
    height: CLIP_HEIGHT,
    withAudio: true,
    fileName: 'clean.mp4',
  }),
  generateUnindexedMatroska(sandbox.allowedRoot, 'unindexed.mkv'),
  generateMislabeledMatroska(sandbox.allowedRoot, 'mislabeled.mp4'),
  generateIndexlessMp4(sandbox.allowedRoot, 'indexless.mp4'),
]);

const emptyPath = generateEmptyFile(sandbox.allowedRoot, 'empty.mp4');

const ffmpegBinary = await resolveTestBinary('ffmpeg');
if (ffmpegBinary === undefined) {
  throw new Error('ffmpeg is not available');
}

afterAll((): void => {
  sandbox.cleanup();
});

it('reads streams, format name and duration from the writer output', (): void => {
  const diagnosis = parseDiagnosis(WRITER_STDOUT, '');
  expect(diagnosis.formatName).toBe('matroska,webm');
  expect(diagnosis.durationSeconds).toBe(4);
  expect(diagnosis.streams).toEqual([
    { type: 'video', codecName: 'h264' },
    { type: 'audio', codecName: 'aac' },
  ]);
  expect(diagnosis).not.toHaveProperty('errorExcerpt');
});

it('leaves the duration out when the writer prints N/A', (): void => {
  const stdout = WRITER_STDOUT.replace('duration=4.000000', 'duration=N/A');
  const diagnosis = parseDiagnosis(stdout, '');
  expect(diagnosis.formatName).toBe('matroska,webm');
  expect(diagnosis).not.toHaveProperty('durationSeconds');
  const blank = parseDiagnosis(WRITER_STDOUT.replace('duration=4.000000', 'duration='), '');
  expect(blank).not.toHaveProperty('durationSeconds');
});

it('marks album art as an attached picture and nothing else', (): void => {
  const stdout = [
    '[STREAM]',
    'codec_name=mp3',
    'codec_type=audio',
    'DISPOSITION:attached_pic=0',
    '[/STREAM]',
    '[STREAM]',
    'codec_name=mjpeg',
    'codec_type=video',
    'DISPOSITION:attached_pic=1',
    '[/STREAM]',
  ].join('\n');
  expect(parseDiagnosis(stdout, '').streams).toEqual([
    { type: 'audio', codecName: 'mp3' },
    { type: 'video', codecName: 'mjpeg', attachedPicture: true },
  ]);
});

it('keeps the error text when the probe read nothing', (): void => {
  const diagnosis = parseDiagnosis('', 'moov atom not found');
  expect(diagnosis.streams).toEqual([]);
  expect(diagnosis).not.toHaveProperty('formatName');
  expect(diagnosis).not.toHaveProperty('durationSeconds');
  expect(diagnosis.errorExcerpt).toBe('moov atom not found');
});

it('omits every optional block when the probe read nothing', (): void => {
  const diagnosis = parseDiagnosis('', '');
  expect(diagnosis.streams).toEqual([]);
  expect(diagnosis).not.toHaveProperty('formatName');
  expect(diagnosis).not.toHaveProperty('durationSeconds');
  expect(diagnosis).not.toHaveProperty('errorExcerpt');
});

it('repairs an unindexed Matroska by copying its streams', async (): Promise<void> => {
  const before = sha256Of(unindexedPath);
  const outcome = await repair({
    inputPath: unindexedPath,
    outputName: 'repair',
    strategy: 'remux',
  });
  expect(outcome.isError).toBe(false);
  const body = outcome.body;
  const entry = repairedEntry(body, 'unindexed-repaired.mkv');
  const expectedText = 'Repaired unindexed.mkv with a stream copy. '
    + `Output saved to ${String(entry.path)}.`;
  expect(outcome.text).toBe(expectedText);

  const repairBlock = asRecord(body.repair);
  expect(repairBlock.pass).toBe('remux');
  expect(repairBlock.strategy).toBe('remux');
  expect(repairBlock.outputPath).toBe(entry.path);
  expect(repairBlock.bytes).toBe(entry.bytes);

  const diagnosis = asRecord(body.diagnosis);
  expect(diagnosis).not.toHaveProperty('durationSeconds');
  const streamTypes = asList(diagnosis.streams).map((stream) => asRecord(stream).type);
  expect(streamTypes).toContain('video');
  expect(streamTypes).toContain('audio');

  const probe = asRecord(await probeJson(String(entry.path)));
  const duration = Number(asRecord(probe.format).duration);
  expect(Number.isFinite(duration)).toBe(true);
  expect(Math.abs(duration - MATROSKA_SECONDS)).toBeLessThanOrEqual(REPAIRED_TOLERANCE);
  expect(decodeErrorLines(ffmpegBinary, String(entry.path))).toBe(0);
  expect(sha256Of(unindexedPath)).toBe(before);
});

it('repairs a clean MP4 and reports its duration', async (): Promise<void> => {
  const before = sha256Of(cleanPath);
  const outcome = await repair({
    inputPath: cleanPath,
    outputName: 'repair',
    strategy: 'remux',
  });
  expect(outcome.isError).toBe(false);
  repairedEntry(outcome.body, 'clean-repaired.mp4');
  const diagnosis = asRecord(outcome.body.diagnosis);
  const duration = Number(diagnosis.durationSeconds);
  expect(Number.isFinite(duration)).toBe(true);
  expect(Math.abs(duration - CLEAN_SECONDS)).toBeLessThanOrEqual(CLEAN_TOLERANCE);
  expect(sha256Of(cleanPath)).toBe(before);
});

it('refuses a file whose diagnosis read no stream', async (): Promise<void> => {
  const indexless = await expectFailure(
    { inputPath: indexlessPath, outputName: 'repair', strategy: 'remux' },
    ERROR_CODES.UNSUPPORTED_FORMAT,
  );
  const indexlessDetails = asRecord(indexless.body.details);
  expect(indexlessDetails.path).toBe(indexlessPath);
  expect(typeof indexlessDetails.detected).toBe('string');
  expect(indexlessDetails.accepted).toEqual(['video', 'audio']);

  const empty = await expectFailure(
    { inputPath: emptyPath, outputName: 'repair', strategy: 'remux' },
    ERROR_CODES.UNSUPPORTED_FORMAT,
  );
  const emptyDetails = asRecord(empty.body.details);
  expect(emptyDetails.path).toBe(emptyPath);
  expect(typeof emptyDetails.detected).toBe('string');
  expect(emptyDetails.accepted).toEqual(['video', 'audio']);
});

it(
  'returns PROCESS_FAILED when the copy cannot enter the container',
  async (): Promise<void> => {
    const before = sha256Of(mislabeledPath);
    await expectFailure(
      { inputPath: mislabeledPath, outputName: 'repair', strategy: 'remux' },
      ERROR_CODES.PROCESS_FAILED,
    );
    expect(sha256Of(mislabeledPath)).toBe(before);
  },
);

it(
  'returns PATH_NOT_ALLOWED for an input outside the allowed root',
  async (): Promise<void> => {
    const outcome = await expectFailure(
      { inputPath: outsidePath, outputName: 'repair', strategy: 'remux' },
      ERROR_CODES.PATH_NOT_ALLOWED,
    );
    expect(asRecord(outcome.body.details)).toEqual({
      path: outsidePath,
      realPath: outsidePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    });
  },
);

it('returns INPUT_NOT_FOUND when the input is missing', async (): Promise<void> => {
  const outcome = await expectFailure(
    { inputPath: missingPath, outputName: 'repair', strategy: 'remux' },
    ERROR_CODES.INPUT_NOT_FOUND,
  );
  expect(asRecord(outcome.body.details)).toEqual({ path: missingPath, role: 'input' });
});

it('rejects an unknown strategy and a call without outputName', async (): Promise<void> => {
  await expectRejected({ inputPath: cleanPath, outputName: 'repair', strategy: 'faststart' });
  await expectRejected({ inputPath: cleanPath });
  await expectRejected({ inputPath: '', outputName: 'repair' });
});

it('lists media_repair as a writing tool with a defaulted strategy', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'media_repair');
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
    expect(tool.description).toContain('never changes the input');
    const properties = asRecord(tool.inputSchema.properties);
    expect(asRecord(properties.strategy).default).toBe('auto');
    expect(typeof asRecord(properties.strategy).description).toBe('string');
    expect(tool.inputSchema.required).toEqual(['inputPath', 'outputName']);
  });
});
