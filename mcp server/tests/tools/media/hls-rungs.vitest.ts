// ───────────────────────────────────────────────────────────────────
// MODULE: Video HLS Rungs Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import {
  selectRungs,
  videoHlsLadderTool,
} from '../../../src/tools/video/hls-ladder.js';
import {
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
import type { Rung } from '../../../src/tools/video/hls-ladder.js';
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface LadderOutcome extends CallOutcome {
  readonly text: string;
}

interface RungRow {
  readonly rung: string;
  readonly playlistPath: string;
  readonly segmentCount: number;
}

interface OutputRow {
  readonly path: string;
  readonly bytes: number;
  readonly mediaType: string;
}

interface SelectCase {
  readonly label: string;
  readonly requested: readonly Rung[];
  readonly width: number;
  readonly height: number;
  readonly kept: readonly Rung[];
  readonly dropped: readonly Rung[];
}

interface SchemaCase {
  readonly label: string;
  readonly patch: Record<string, unknown>;
}

interface RunCounter {
  count: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('hls-rungs-');

const ALL_RUNGS: readonly Rung[] = ['1080p', '720p', '480p', '360p'];
const WIDE_SECONDS = 10;
const SHORT_SECONDS = 2;
const WIDE_WIDTH = 1280;
const WIDE_HEIGHT = 720;
const SMALL_WIDTH = 640;
const SMALL_HEIGHT = 360;
const PORTRAIT_WIDTH = 720;
const PORTRAIT_HEIGHT = 1280;
const FULL_HD_WIDTH = 1920;
const FULL_HD_HEIGHT = 1080;
const TINY_WIDTH = 320;
const TINY_HEIGHT = 240;
const DEFAULT_CRF = 23;
const DEFAULT_SEGMENT_SECONDS = 2;

const FOLDER_PATTERN = /^\d{3} - /u;

const RUNG_FRAMES: Readonly<Record<string, { width: number; height: number }>> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
  '360p': { width: 640, height: 360 },
};

const SELECT_CASES: readonly SelectCase[] = [
  {
    label: 'keeps every rung for a 1920x1080 source',
    requested: ALL_RUNGS,
    width: 1920,
    height: 1080,
    kept: ['1080p', '720p', '480p', '360p'],
    dropped: [],
  },
  {
    label: 'drops 1080p for a 1280x720 source',
    requested: ALL_RUNGS,
    width: 1280,
    height: 720,
    kept: ['720p', '480p', '360p'],
    dropped: ['1080p'],
  },
  {
    label: 'keeps 480p and 360p for an 854x480 source',
    requested: ALL_RUNGS,
    width: 854,
    height: 480,
    kept: ['480p', '360p'],
    dropped: ['1080p', '720p'],
  },
  {
    label: 'keeps only 360p for a 640x360 source',
    requested: ALL_RUNGS,
    width: 640,
    height: 360,
    kept: ['360p'],
    dropped: ['1080p', '720p', '480p'],
  },
  {
    label: 'compares a portrait 720x1280 source by its width',
    requested: ALL_RUNGS,
    width: 720,
    height: 1280,
    kept: ['720p', '480p', '360p'],
    dropped: ['1080p'],
  },
  {
    label: 'keeps only 360p for a portrait 360x640 source',
    requested: ALL_RUNGS,
    width: 360,
    height: 640,
    kept: ['360p'],
    dropped: ['1080p', '720p', '480p'],
  },
  {
    label: 'drops every rung for a 320x240 source',
    requested: ALL_RUNGS,
    width: 320,
    height: 240,
    kept: [],
    dropped: ['1080p', '720p', '480p', '360p'],
  },
  {
    label: 'returns a requested subset in ladder order',
    requested: ['360p', '720p'],
    width: 1920,
    height: 1080,
    kept: ['720p', '360p'],
    dropped: [],
  },
  {
    label: 'drops only from the requested subset',
    requested: ['1080p', '360p'],
    width: 640,
    height: 360,
    kept: ['360p'],
    dropped: ['1080p'],
  },
];

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'an empty rung list', patch: { rungs: [] } },
  { label: 'an unknown rung', patch: { rungs: ['240p'] } },
  { label: 'five rungs', patch: { rungs: [...ALL_RUNGS, '360p'] } },
  { label: 'a crf of 60', patch: { crf: 60 } },
  { label: 'a segment duration of 30', patch: { segmentDuration: 30 } },
];

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

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

async function ladderCall(args: Record<string, unknown>): Promise<LadderOutcome> {
  let outcome: LadderOutcome | undefined;
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
      const parsed = await callTool(client, 'video_hls_ladder', args);
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

function masterPathOf(body: Record<string, unknown>): string {
  const value = body.masterPlaylist;
  if (typeof value !== 'string') {
    throw new Error('expected a master playlist path');
  }
  return value;
}

function playlistUris(text: string): string[] {
  const lines = text.split('\n');
  const uris: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index]?.startsWith('#EXT-X-STREAM-INF') !== true) {
      continue;
    }
    const uri = lines[index + 1]?.trim();
    if (uri !== undefined && uri.length > 0) {
      uris.push(uri);
    }
  }
  return uris;
}

function bodyRungs(body: Record<string, unknown>): RungRow[] {
  const rows: RungRow[] = [];
  for (const entry of asList(body.rungs)) {
    const row = asRecord(entry);
    const rung = row.rung;
    const playlistPath = row.playlistPath;
    const segmentCount = row.segmentCount;
    if (
      typeof rung !== 'string'
      || typeof playlistPath !== 'string'
      || typeof segmentCount !== 'number'
    ) {
      throw new Error('expected a rung row');
    }
    rows.push({ rung, playlistPath, segmentCount });
  }
  return rows;
}

function bodyOutputs(body: Record<string, unknown>): OutputRow[] {
  const rows: OutputRow[] = [];
  for (const entry of asList(body.outputs)) {
    const row = asRecord(entry);
    const entryPath = row.path;
    const bytes = row.bytes;
    const mediaType = row.mediaType;
    if (
      typeof entryPath !== 'string'
      || typeof bytes !== 'number'
      || typeof mediaType !== 'string'
    ) {
      throw new Error('expected an output row');
    }
    rows.push({ path: entryPath, bytes, mediaType });
  }
  return rows;
}

function streamRecords(probe: unknown): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const entry of asList(asRecord(probe).streams)) {
    records.push(asRecord(entry));
  }
  return records;
}

function videoStream(probe: unknown): Record<string, unknown> {
  const stream = streamRecords(probe).find((entry) => entry.codec_type === 'video');
  if (stream === undefined) {
    throw new Error('expected a video stream');
  }
  return stream;
}

function pictureSize(probe: unknown): { width: number; height: number } {
  const stream = videoStream(probe);
  const width = stream.width;
  const height = stream.height;
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new Error('expected a picture size');
  }
  return { width, height };
}

async function expectFailure(
  args: Record<string, unknown>,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await ladderCall(args);
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
      client.callTool({ name: 'video_hls_ladder', arguments: args }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

function countingContext(runs: RunCounter): ToolContext {
  const real = createToolContext(sandbox.config);
  return {
    ...real,
    runBinary: async (binary, args, options) => {
      if (binary === 'ffmpeg') {
        runs.count += 1;
      }
      return real.runBinary(binary, args, options);
    },
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const [widePath, smallPath, portraitPath, fullHdPath, tinyPath] = await Promise.all([
  generateVideo(sandbox.allowedRoot, {
    seconds: WIDE_SECONDS,
    width: WIDE_WIDTH,
    height: WIDE_HEIGHT,
    withAudio: true,
    fileName: 'wide.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: SHORT_SECONDS,
    width: SMALL_WIDTH,
    height: SMALL_HEIGHT,
    fileName: 'small.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: SHORT_SECONDS,
    width: PORTRAIT_WIDTH,
    height: PORTRAIT_HEIGHT,
    fileName: 'portrait.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: SHORT_SECONDS,
    width: FULL_HD_WIDTH,
    height: FULL_HD_HEIGHT,
    fileName: 'full-hd.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: SHORT_SECONDS,
    width: TINY_WIDTH,
    height: TINY_HEIGHT,
    fileName: 'tiny.mp4',
  }),
]);

const wideHash = sha256Of(widePath);
const smallHash = sha256Of(smallPath);
const fullHdHash = sha256Of(fullHdPath);

const wideDefault = await ladderCall({
  inputPath: widePath,
  outputName: 'wide ladder',
});
const smallDefault = await ladderCall({
  inputPath: smallPath,
  outputName: 'small ladder',
});
const portraitDefault = await ladderCall({
  inputPath: portraitPath,
  outputName: 'portrait ladder',
});
const fullHdSingle = await ladderCall({
  inputPath: fullHdPath,
  outputName: 'full hd ladder',
  rungs: ['1080p'],
});

afterAll((): void => {
  sandbox.cleanup();
});

it.each(SELECT_CASES)('$label', (row): void => {
  expect(selectRungs(row.requested, row.width, row.height)).toEqual({
    kept: [...row.kept],
    dropped: [...row.dropped],
  });
});

it('drops 1080p for a 1280x720 source and writes only the kept rungs', async (): Promise<void> => {
  expect(wideDefault.isError).toBe(false);
  expect(wideDefault.body.tool).toBe('video_hls_ladder');
  const masterPath = masterPathOf(wideDefault.body);
  const folder = path.dirname(masterPath);
  expect(path.basename(masterPath)).toBe('master.m3u8');
  expect(path.basename(folder)).toMatch(FOLDER_PATTERN);
  expect(path.basename(folder).endsWith(' - wide-ladder')).toBe(true);
  expect(path.dirname(folder)).toBe(sandbox.outputDir);
  expect(wideDefault.text).toMatch(/^Built a 3-rung HLS ladder from wide\.mp4\. Output saved to /u);
  expect(wideDefault.text.endsWith(` files).`)).toBe(true);
  expect(wideDefault.text).toContain(`${folder}/ (`);
  expect(playlistUris(readFileSync(masterPath, 'utf8'))).toEqual([
    '720p/playlist.m3u8',
    '480p/playlist.m3u8',
    '360p/playlist.m3u8',
  ]);
  expect(asList(wideDefault.body.droppedRungs)).toEqual(['1080p']);
  expect(listFolders(folder)).toEqual(['360p', '480p', '720p']);
  const warnings = asList(wideDefault.body.warnings);
  expect(warnings).toHaveLength(1);
  expect(String(warnings[0])).toContain('1080p');
  expect(String(warnings[0])).toContain('1280x720');

  const outputs = bodyOutputs(wideDefault.body);
  expect(outputs).toHaveLength(4);
  expect(outputs[0]?.path).toBe(masterPath);
  for (const entry of outputs) {
    expect(entry.mediaType).toBe('playlist');
    expect(entry.bytes).toBe(statSync(entry.path).size);
  }
  const rows = bodyRungs(wideDefault.body);
  expect(rows.map((row) => row.rung)).toEqual(['720p', '480p', '360p']);
  for (const row of rows) {
    expect(row.playlistPath).toBe(path.join(folder, row.rung, 'playlist.m3u8'));
    expect(row.segmentCount).toBeGreaterThan(0);
  }
  expect(sha256Of(widePath)).toBe(wideHash);
});

it('writes every kept rung at its frame and never above the source', async (): Promise<void> => {
  const source = pictureSize(await probeJson(widePath));
  expect(source).toEqual({ width: WIDE_WIDTH, height: WIDE_HEIGHT });
  const shorterSide = Math.min(source.width, source.height);
  const folder = path.dirname(masterPathOf(wideDefault.body));
  for (const rung of ['720p', '480p', '360p']) {
    const frame = RUNG_FRAMES[rung];
    if (frame === undefined) {
      throw new Error('expected a rung frame');
    }
    const size = pictureSize(await probeJson(path.join(folder, rung, 'segment_000.ts')));
    expect(size).toEqual(frame);
    expect(size.height).toBeLessThanOrEqual(shorterSide);
  }
});

it('keeps only the 360p rung for a 640x360 source', async (): Promise<void> => {
  expect(smallDefault.isError).toBe(false);
  const masterPath = masterPathOf(smallDefault.body);
  const folder = path.dirname(masterPath);
  expect(playlistUris(readFileSync(masterPath, 'utf8'))).toEqual(['360p/playlist.m3u8']);
  expect(asList(smallDefault.body.droppedRungs)).toEqual(['1080p', '720p', '480p']);
  expect(listFolders(folder)).toEqual(['360p']);
  const warnings = asList(smallDefault.body.warnings);
  expect(warnings).toHaveLength(1);
  expect(String(warnings[0])).toContain('640x360');
  const rows = bodyRungs(smallDefault.body);
  expect(rows.map((row) => row.rung)).toEqual(['360p']);
  const size = pictureSize(await probeJson(path.join(folder, '360p', 'segment_000.ts')));
  expect(size).toEqual({ width: SMALL_WIDTH, height: SMALL_HEIGHT });
  expect(sha256Of(smallPath)).toBe(smallHash);
});

it('compares a 720x1280 portrait source by its shorter side', async (): Promise<void> => {
  expect(portraitDefault.isError).toBe(false);
  const masterPath = masterPathOf(portraitDefault.body);
  const folder = path.dirname(masterPath);
  expect(playlistUris(readFileSync(masterPath, 'utf8'))).toEqual([
    '720p/playlist.m3u8',
    '480p/playlist.m3u8',
    '360p/playlist.m3u8',
  ]);
  expect(asList(portraitDefault.body.droppedRungs)).toEqual(['1080p']);
  expect(listFolders(folder)).toEqual(['360p', '480p', '720p']);
  const size = pictureSize(await probeJson(path.join(folder, '720p', 'segment_000.ts')));
  expect(size).toEqual({ width: 1280, height: 720 });
});

it('builds the 1080p rung alone when the source can hold it', async (): Promise<void> => {
  expect(fullHdSingle.isError).toBe(false);
  const masterPath = masterPathOf(fullHdSingle.body);
  const folder = path.dirname(masterPath);
  expect(playlistUris(readFileSync(masterPath, 'utf8'))).toEqual(['1080p/playlist.m3u8']);
  expect(asList(fullHdSingle.body.droppedRungs)).toEqual([]);
  expect(asList(fullHdSingle.body.warnings)).toEqual([]);
  expect(listFolders(folder)).toEqual(['1080p']);
  const size = pictureSize(await probeJson(path.join(folder, '1080p', 'segment_000.ts')));
  expect(size).toEqual({ width: FULL_HD_WIDTH, height: FULL_HD_HEIGHT });
  expect(sha256Of(fullHdPath)).toBe(fullHdHash);
});

it('returns INVALID_INPUT when no requested rung fits the source', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: tinyPath,
      outputName: 'tiny ladder',
      rungs: [...ALL_RUNGS],
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'rungs',
      value: [...ALL_RUNGS],
      reason: 'larger-than-source',
    },
  );
});

it('runs no ffmpeg and creates no folder when every rung is dropped', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  const runs: RunCounter = { count: 0 };
  let failure: unknown;
  try {
    await videoHlsLadderTool.handler(
      {
        inputPath: tinyPath,
        outputName: 'tiny no run',
        rungs: [...ALL_RUNGS],
        crf: DEFAULT_CRF,
        segmentDuration: DEFAULT_SEGMENT_SECONDS,
      },
      countingContext(runs),
    );
  } catch (error: unknown) {
    failure = error;
  }
  expect(runs.count).toBe(0);
  expect(failure).toBeInstanceOf(MediaError);
  if (!(failure instanceof MediaError)) {
    throw new Error('expected a rung failure');
  }
  expect(failure.code).toBe(ERROR_CODES.INVALID_INPUT);
  expect(failure.details).toEqual({
    parameter: 'rungs',
    value: [...ALL_RUNGS],
    reason: 'larger-than-source',
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it.each(SCHEMA_CASES)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected({
      inputPath: widePath,
      outputName: 'bad schema',
      rungs: ['720p'],
      ...row.patch,
    });
  },
);

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
      rungs: ['720p'],
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
      rungs: ['720p'],
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});
