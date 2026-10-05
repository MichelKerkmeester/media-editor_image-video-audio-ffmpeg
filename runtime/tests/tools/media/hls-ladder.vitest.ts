// ───────────────────────────────────────────────────────────────────
// MODULE: Video HLS Ladder Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import {
  GATED_ENCODERS,
  GATED_FILTERS,
} from '../../../src/core/capabilities.js';
import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import {
  ladderArgs,
  videoHlsLadderTool,
} from '../../../src/tools/video/hls-ladder.js';
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

import type { Capabilities } from '../../../src/core/capabilities.js';
import type {
  CapabilitySnapshot,
  ToolContext,
} from '../../../src/server/tool-context.js';
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
  readonly width: number;
  readonly height: number;
  readonly playlistPath: string;
  readonly segmentCount: number;
}

interface OutputRow {
  readonly path: string;
  readonly bytes: number;
  readonly mediaType: string;
}

interface EncoderCase {
  readonly rung: string;
  readonly profile: string;
  readonly level: number;
  readonly width: number;
  readonly height: number;
}

interface SchemaCase {
  readonly label: string;
  readonly patch: Record<string, unknown>;
}

interface CapabilityCase {
  readonly kind: 'encoder' | 'filter';
  readonly name: string;
}

interface RunCount {
  count: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('hls-ladder-');

const CLIP_SECONDS = 10;
const CLIP_WIDTH = 1280;
const CLIP_HEIGHT = 720;
const PORTRAIT_SECONDS = 4;
const PORTRAIT_WIDTH = 720;
const PORTRAIT_HEIGHT = 1280;
const MIN_SEGMENT_COUNT = 5;

const FOLDER_PATTERN = /^\d{3} - /u;
const STUB_BINARY_PATH = '/opt/ffmpeg/ffmpeg';
const DEFAULT_CRF = 23;
const DEFAULT_SEGMENT_SECONDS = 2;

const LADDER_ARGS_INPUT = '/media/clips/clip.mp4';
const LADDER_ARGS_GRAPH =
  '[0:v]split=2[v1][v2];'
  + '[v1]scale=w=1280:h=720:force_original_aspect_ratio=decrease,'
  + 'pad=1280:720:(ow-iw)/2:(oh-ih)/2[v1out];'
  + '[v2]scale=w=640:h=360:force_original_aspect_ratio=decrease,'
  + 'pad=640:360:(ow-iw)/2:(oh-ih)/2[v2out]';

const EXPECTED_LADDER_ARGS: readonly string[] = [
  '-n',
  '-i',
  LADDER_ARGS_INPUT,
  '-filter_complex',
  LADDER_ARGS_GRAPH,
  '-map',
  '[v1out]',
  '-c:v:0',
  'libx264',
  '-maxrate:v:0',
  '1500k',
  '-bufsize:v:0',
  '3000k',
  '-profile:v:0',
  'main',
  '-level:v:0',
  '4.0',
  '-map',
  '[v2out]',
  '-c:v:1',
  'libx264',
  '-maxrate:v:1',
  '500k',
  '-bufsize:v:1',
  '1000k',
  '-profile:v:1',
  'baseline',
  '-level:v:1',
  '3.1',
  '-preset',
  'fast',
  '-tune',
  'fastdecode',
  '-crf',
  '23',
  '-g',
  '50',
  '-keyint_min',
  '50',
  '-sc_threshold',
  '0',
  '-an',
  '-f',
  'hls',
  '-hls_time',
  '2',
  '-hls_playlist_type',
  'vod',
  '-hls_flags',
  'independent_segments',
  '-hls_segment_type',
  'mpegts',
  '-hls_segment_filename',
  '%v/segment_%03d.ts',
  '-master_pl_name',
  'master.m3u8',
  '-var_stream_map',
  'v:0,name:720p v:1,name:360p',
  '%v/playlist.m3u8',
];

const ENCODER_CASES: readonly EncoderCase[] = [
  { rung: '720p', profile: 'Main', level: 40, width: 1280, height: 720 },
  { rung: '480p', profile: 'Constrained Baseline', level: 31, width: 854, height: 480 },
  { rung: '360p', profile: 'Constrained Baseline', level: 31, width: 640, height: 360 },
];

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'a segment duration of 30', patch: { segmentDuration: 30 } },
  { label: 'a crf of 60', patch: { crf: 60 } },
  { label: 'an empty rung list', patch: { rungs: [] } },
  { label: 'an unknown rung', patch: { rungs: ['240p'] } },
  { label: 'five rungs', patch: { rungs: ['1080p', '720p', '480p', '360p', '360p'] } },
];

const CAPABILITY_CASES: readonly CapabilityCase[] = [
  { kind: 'encoder', name: 'libx264' },
  { kind: 'filter', name: 'pad' },
];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

async function keyFrameCount(segmentPath: string): Promise<number> {
  const ffprobe = await resolveTestBinary('ffprobe');
  if (ffprobe === undefined) {
    throw new Error('ffprobe is not available');
  }
  const run = spawnSync(ffprobe, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'frame=key_frame',
    '-of',
    'csv=p=0',
    segmentPath,
  ]);
  const lines = run.stdout.toString('utf8').split('\n');
  // Side data can add a trailing comma, so only the first field is read.
  return lines.filter((line) => line.split(',')[0]?.trim() === '1').length;
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

function bodyRungs(body: Record<string, unknown>): RungRow[] {
  const rows: RungRow[] = [];
  for (const entry of asList(body.rungs)) {
    const row = asRecord(entry);
    const rung = row.rung;
    const width = row.width;
    const height = row.height;
    const playlistPath = row.playlistPath;
    const segmentCount = row.segmentCount;
    if (
      typeof rung !== 'string'
      || typeof width !== 'number'
      || typeof height !== 'number'
      || typeof playlistPath !== 'string'
      || typeof segmentCount !== 'number'
    ) {
      throw new Error('expected a rung row');
    }
    rows.push({ rung, width, height, playlistPath, segmentCount });
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

function segmentFiles(dir: string): string[] {
  const names = readdirSync(dir).filter(
    (name) => name.startsWith('segment_') && name.endsWith('.ts'),
  );
  names.sort();
  return names;
}

function folderTotalBytes(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += folderTotalBytes(fullPath);
    } else if (entry.isFile()) {
      total += statSync(fullPath).size;
    }
  }
  return total;
}

function folderFileCount(dir: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      count += folderFileCount(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      count += 1;
    }
  }
  return count;
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

function audioStreams(probe: unknown): Record<string, unknown>[] {
  return streamRecords(probe).filter((entry) => entry.codec_type === 'audio');
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

function capabilitiesWithout(name: string): Capabilities {
  return {
    encoders: new Set(GATED_ENCODERS.filter((entry) => entry !== name)),
    filters: new Set(GATED_FILTERS.filter((entry) => entry !== name)),
  };
}

function contextWithoutCapability(name: string, runs: RunCount): ToolContext {
  const real = createToolContext(sandbox.config);
  return {
    ...real,
    getCapabilities: async (): Promise<CapabilitySnapshot> => ({
      binaryPath: STUB_BINARY_PATH,
      capabilities: capabilitiesWithout(name),
    }),
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

const [ladderPath, portraitPath, audioPath] = await Promise.all([
  generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: CLIP_WIDTH,
    height: CLIP_HEIGHT,
    withAudio: true,
    fileName: 'ladder.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: PORTRAIT_SECONDS,
    width: PORTRAIT_WIDTH,
    height: PORTRAIT_HEIGHT,
    fileName: 'portrait.mp4',
  }),
  generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'mp3',
    fileName: 'tone.mp3',
  }),
]);

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

const ladderSourceHash = sha256Of(ladderPath);
const threeRung = await ladderCall({
  inputPath: ladderPath,
  outputName: 'three rung ladder',
  rungs: ['720p', '480p', '360p'],
});

afterAll((): void => {
  sandbox.cleanup();
});

it('builds a three-rung ladder with playlists, segments and totals', (): void => {
  expect(threeRung.isError).toBe(false);
  expect(threeRung.body.tool).toBe('video_hls_ladder');
  const masterPath = masterPathOf(threeRung.body);
  const folder = path.dirname(masterPath);
  expect(path.basename(masterPath)).toBe('master.m3u8');
  expect(path.basename(folder)).toMatch(FOLDER_PATTERN);
  expect(path.basename(folder).endsWith(' - three-rung-ladder')).toBe(true);
  expect(path.dirname(folder)).toBe(sandbox.outputDir);
  expect(threeRung.text).toBe(
    'Built a 3-rung HLS ladder from ladder.mp4. '
      + `Output saved to ${folder}/ (${folderFileCount(folder)} files).`,
  );

  const masterText = readFileSync(masterPath, 'utf8');
  expect(playlistUris(masterText)).toEqual([
    '720p/playlist.m3u8',
    '480p/playlist.m3u8',
    '360p/playlist.m3u8',
  ]);
  expect(masterText).toContain('RESOLUTION=1280x720');
  expect(masterText).toContain('RESOLUTION=854x480');
  expect(masterText).toContain('RESOLUTION=640x360');
  expect(masterText.indexOf('RESOLUTION=1280x720')).toBeLessThan(
    masterText.indexOf('RESOLUTION=854x480'),
  );
  expect(masterText.indexOf('RESOLUTION=854x480')).toBeLessThan(
    masterText.indexOf('RESOLUTION=640x360'),
  );

  const rows = bodyRungs(threeRung.body);
  expect(rows.map((row) => row.rung)).toEqual(['720p', '480p', '360p']);
  for (const row of rows) {
    const rungDir = path.join(folder, row.rung);
    expect(readdirSync(rungDir)).toContain('playlist.m3u8');
    const segments = segmentFiles(rungDir);
    expect(segments.length).toBeGreaterThanOrEqual(MIN_SEGMENT_COUNT);
    expect(row.segmentCount).toBe(segments.length);
    expect(row.playlistPath).toBe(path.join(rungDir, 'playlist.m3u8'));
  }

  const outputs = bodyOutputs(threeRung.body);
  expect(outputs).toHaveLength(4);
  expect(outputs[0]?.path).toBe(masterPath);
  for (const entry of outputs) {
    expect(entry.mediaType).toBe('playlist');
    expect(entry.bytes).toBe(statSync(entry.path).size);
  }
  expect(outputs.slice(1).map((entry) => entry.path)).toEqual(
    rows.map((row) => row.playlistPath),
  );
  expect(threeRung.body.totalBytes).toBe(folderTotalBytes(folder));
  expect(sha256Of(ladderPath)).toBe(ladderSourceHash);
});

it('encodes every rung with its own profile, level and frame size', async (): Promise<void> => {
  const folder = path.dirname(masterPathOf(threeRung.body));
  for (const expected of ENCODER_CASES) {
    const segmentPath = path.join(folder, expected.rung, 'segment_000.ts');
    const probe = await probeJson(segmentPath);
    const video = videoStream(probe);
    expect(video.profile).toBe(expected.profile);
    expect(video.level).toBe(expected.level);
    expect(video.width).toBe(expected.width);
    expect(video.height).toBe(expected.height);
    expect(audioStreams(probe)).toHaveLength(0);
  }
});

it('lets ffprobe read the master playlist as a video', async (): Promise<void> => {
  const masterPath = masterPathOf(threeRung.body);
  const video = videoStream(await probeJson(masterPath));
  expect(video.codec_name).toBe('h264');
});

it('writes fewer segments when the segment duration grows', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  const outcome = await ladderCall({
    inputPath: ladderPath,
    outputName: 'long segments',
    rungs: ['360p'],
    segmentDuration: 4,
  });
  expect(outcome.isError).toBe(false);
  const short = bodyRungs(threeRung.body).find((row) => row.rung === '360p');
  const long = bodyRungs(outcome.body)[0];
  if (short === undefined || long === undefined) {
    throw new Error('expected a 360p rung');
  }
  expect(long.segmentCount).toBeGreaterThan(0);
  expect(long.segmentCount).toBeLessThan(short.segmentCount);
  // The GOP follows the segment length, so a full 4-second segment opens on its only key frame.
  const longFolder = path.dirname(masterPathOf(outcome.body));
  expect(await keyFrameCount(path.join(longFolder, '360p', 'segment_000.ts'))).toBe(1);
  expect(listFolders(sandbox.outputDir)).toHaveLength(before.length + 1);
});

it('writes more bytes for a lower crf on the same rung', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  const low = await ladderCall({
    inputPath: ladderPath,
    outputName: 'low crf',
    rungs: ['360p'],
    crf: 18,
  });
  const high = await ladderCall({
    inputPath: ladderPath,
    outputName: 'high crf',
    rungs: ['360p'],
    crf: 28,
  });
  expect(low.isError).toBe(false);
  expect(high.isError).toBe(false);
  const lowBytes = low.body.totalBytes;
  const highBytes = high.body.totalBytes;
  if (typeof lowBytes !== 'number' || typeof highBytes !== 'number') {
    throw new Error('expected a byte total');
  }
  expect(lowBytes).toBeGreaterThan(highBytes);
  expect(listFolders(sandbox.outputDir)).toHaveLength(before.length + 2);
});

it('orders the master by ladder order whatever order the caller gave', async (): Promise<void> => {
  const outcome = await ladderCall({
    inputPath: ladderPath,
    outputName: 'reordered rungs',
    rungs: ['360p', '720p'],
  });
  expect(outcome.isError).toBe(false);
  expect(playlistUris(readFileSync(masterPathOf(outcome.body), 'utf8'))).toEqual([
    '720p/playlist.m3u8',
    '360p/playlist.m3u8',
  ]);
  expect(bodyRungs(outcome.body).map((row) => row.rung)).toEqual(['720p', '360p']);
});

it('letterboxes a portrait source into a 1280x720 segment', async (): Promise<void> => {
  const outcome = await ladderCall({
    inputPath: portraitPath,
    outputName: 'portrait ladder',
    rungs: ['720p'],
  });
  expect(outcome.isError).toBe(false);
  const folder = path.dirname(masterPathOf(outcome.body));
  const probe = await probeJson(path.join(folder, '720p', 'segment_000.ts'));
  const video = videoStream(probe);
  expect(video.width).toBe(1280);
  expect(video.height).toBe(720);
});

it('keeps a percent sign in the description out of every path', async (): Promise<void> => {
  const outcome = await ladderCall({
    inputPath: ladderPath,
    outputName: 'p%q ladder',
    rungs: ['360p'],
  });
  expect(outcome.isError).toBe(false);
  const masterPath = masterPathOf(outcome.body);
  expect(masterPath.includes('%')).toBe(false);
  const folder = path.dirname(masterPath);
  expect(path.basename(folder).endsWith(' - pq-ladder')).toBe(true);
  expect(path.dirname(folder)).toBe(sandbox.outputDir);
  const rungDir = path.join(folder, '360p');
  expect(readdirSync(rungDir)).toContain('playlist.m3u8');
  expect(segmentFiles(rungDir).length).toBeGreaterThan(0);
  expect(bodyRungs(outcome.body)[0]?.playlistPath).toBe(
    path.join(rungDir, 'playlist.m3u8'),
  );
});

it('returns INVALID_INPUT for a repeated rung', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: ladderPath,
      outputName: 'repeated rung',
      rungs: ['720p', '720p'],
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'rungs',
      value: ['720p', '720p'],
      reason: 'duplicate-rung',
    },
  );
});

it.each(SCHEMA_CASES)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected({
      inputPath: ladderPath,
      outputName: 'bad schema',
      rungs: ['720p'],
      ...row.patch,
    });
  },
);

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      rungs: ['720p'],
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

it.each(CAPABILITY_CASES)(
  'refuses without $name before ffmpeg runs',
  async (entry): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const runs: RunCount = { count: 0 };
    const context = contextWithoutCapability(entry.name, runs);
    let failure: unknown;
    try {
      await videoHlsLadderTool.handler(
        {
          inputPath: ladderPath,
          outputName: 'gate capability',
          rungs: ['720p'],
          crf: DEFAULT_CRF,
          segmentDuration: DEFAULT_SEGMENT_SECONDS,
        },
        context,
      );
    } catch (error: unknown) {
      failure = error;
    }
    expect(runs.count).toBe(0);
    expect(failure).toBeInstanceOf(MediaError);
    if (!(failure instanceof MediaError)) {
      throw new Error('expected a capability failure');
    }
    expect(failure.code).toBe(ERROR_CODES.CAPABILITY_MISSING);
    expect(failure.details).toEqual({
      binary: STUB_BINARY_PATH,
      kind: entry.kind,
      name: entry.name,
      neededBy: 'video_hls_ladder',
    });
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  },
);

it('fails when ffmpeg exits zero without writing segments', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  const real = createToolContext(sandbox.config);
  const context: ToolContext = {
    ...real,
    runBinary: async (name, args, options) => {
      if (name !== 'ffmpeg') {
        return real.runBinary(name, args, options);
      }
      const cwd = options.cwd ?? '';
      writeFileSync(path.join(cwd, 'master.m3u8'), '#EXTM3U\n');
      writeFileSync(path.join(cwd, '360p', 'playlist.m3u8'), '#EXTM3U\n');
      return {
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
        stderrTail: 'Failed to open file',
        elapsedMs: 0,
      };
    },
  };
  let failure: unknown;
  try {
    await videoHlsLadderTool.handler(
      {
        inputPath: ladderPath,
        outputName: 'no segments',
        rungs: ['360p'],
        crf: DEFAULT_CRF,
        segmentDuration: DEFAULT_SEGMENT_SECONDS,
      },
      context,
    );
  } catch (error: unknown) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(MediaError);
  if (!(failure instanceof MediaError)) {
    throw new Error('expected an output-check failure');
  }
  expect(failure.code).toBe(ERROR_CODES.PROCESS_FAILED);
  expect(failure.details.exitCode).toBe(0);
  expect(failure.details.stderrTail).toBe('Failed to open file');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it('builds the exact argv for a two-rung ladder', (): void => {
  const rungs: Rung[] = ['720p', '360p'];
  expect(
    ladderArgs({
      inputPath: LADDER_ARGS_INPUT,
      rungs,
      crf: DEFAULT_CRF,
      segmentDuration: DEFAULT_SEGMENT_SECONDS,
      gop: 50,
    }),
  ).toEqual(EXPECTED_LADDER_ARGS);
});
