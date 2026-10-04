// ───────────────────────────────────────────────────────────────────
// MODULE: Media Repair Strategy Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { copyFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import { mediaRepairTool } from '../../../src/tools/media/repair.js';
import {
  decodeErrorLines,
  generateCoverArtAudio,
  generateCutAudio,
  generateCutMp4,
  generateMislabeledMatroska,
  generateUnindexedMatroska,
} from '../../helpers/broken-media.js';
import { generateVideo, probeJson, resolveTestBinary } from '../../helpers/media.js';
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
import type { CapabilitySnapshot, ToolContext } from '../../../src/server/tool-context.js';
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One tool result with its text line kept for assertion. */
interface RepairOutcome extends CallOutcome {
  readonly text: string;
}

/** Mutable slot that a stubbed context counts ffmpeg runs into. */
interface RunCount {
  count: number;
}

/** Kind and codec name of one stream a probe reported. */
interface StreamInfo {
  readonly type: string;
  readonly codecName: string;
}

/** The fields one repair call needs after the schema defaults are applied. */
interface RepairCall {
  readonly inputPath: string;
  readonly outputName: string;
  readonly strategy: 'auto' | 'remux' | 'reencode';
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('media-repair-strategies-');

const CLIP_WIDTH = 320;
const CLIP_HEIGHT = 240;
const CLIP_SECONDS = 2;

const FOLDER_PATTERN = /^\d{3,} - repair$/u;
const STUB_BINARY_PATH = '/opt/ffmpeg/ffmpeg';

const COPY_FAILED_VIDEO_WARNING =
  'The stream copy failed or kept decode errors, so the file was re-encoded as H.264 and AAC.';
const ALBUM_ART_WARNING = 'The album art was left out, because the re-encoded file is audio only.';

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

function repairedEntry(
  body: Record<string, unknown>,
  fileName: string,
  mediaType: 'video' | 'audio',
): Record<string, unknown> {
  expect(body.tool).toBe('media_repair');
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe(mediaType);
  if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected a repaired file');
  }
  expect(entry.bytes).toBe(statSync(entry.path).size);
  expect(path.basename(entry.path)).toBe(fileName);
  const folderName = path.basename(path.dirname(entry.path));
  expect(folderName).toMatch(FOLDER_PATTERN);
  expect(path.dirname(path.dirname(entry.path))).toBe(sandbox.outputDir);
  return entry;
}

function streamsOf(probe: unknown): StreamInfo[] {
  return asList(asRecord(probe).streams).map((stream) => {
    const record = asRecord(stream);
    return { type: String(record.codec_type), codecName: String(record.codec_name) };
  });
}

function codecNamesOf(probe: unknown, type: string): string[] {
  return streamsOf(probe)
    .filter((stream) => stream.type === type)
    .map((stream) => stream.codecName);
}

function stubbedContext(missingEncoders: readonly string[], runs?: RunCount): ToolContext {
  const real = createToolContext(sandbox.config);
  const capabilities: Capabilities = {
    encoders: new Set(['libx264', 'aac'].filter((name) => !missingEncoders.includes(name))),
    filters: new Set<string>(),
  };
  return {
    ...real,
    getCapabilities: async (): Promise<CapabilitySnapshot> => ({
      binaryPath: STUB_BINARY_PATH,
      capabilities,
    }),
    runBinary: async (name, args, options) => {
      if (name === 'ffmpeg' && runs !== undefined) {
        runs.count += 1;
      }
      return real.runBinary(name, args, options);
    },
  };
}

async function handlerFailure(
  context: ToolContext,
  args: RepairCall,
): Promise<MediaError> {
  let failure: unknown;
  try {
    await mediaRepairTool.handler(args, context);
  } catch (error: unknown) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(MediaError);
  if (!(failure instanceof MediaError)) {
    throw new Error('expected a handler failure');
  }
  return failure;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const [cutVideoPath, cutAudioPath, silentVideoPath, unindexedPath, mislabeledPath, songPath] =
  await Promise.all([
    generateCutMp4(sandbox.allowedRoot, 'cut.mp4'),
    generateCutAudio(sandbox.allowedRoot, 'cut.m4a'),
    generateVideo(sandbox.allowedRoot, {
      seconds: CLIP_SECONDS,
      width: CLIP_WIDTH,
      height: CLIP_HEIGHT,
      withAudio: false,
      fileName: 'silent.mp4',
    }),
    generateUnindexedMatroska(sandbox.allowedRoot, 'unindexed.mkv'),
    generateMislabeledMatroska(sandbox.allowedRoot, 'mislabeled.mp4'),
    generateCoverArtAudio(sandbox.allowedRoot, 'song.mp3'),
  ]);

// WebM accepts only VP8, VP9 or AV1 with Vorbis or Opus, so copying H.264 and AAC into it fails.
const webmNamedPath = path.join(sandbox.allowedRoot, 'webm-named.webm');
copyFileSync(
  await generateVideo(sandbox.allowedRoot, {
    seconds: CLIP_SECONDS,
    width: CLIP_WIDTH,
    height: CLIP_HEIGHT,
    withAudio: true,
    fileName: 'webm-source.mp4',
  }),
  webmNamedPath,
);

const ffmpegBinary = await resolveTestBinary('ffmpeg');
if (ffmpegBinary === undefined) {
  throw new Error('ffmpeg is not available');
}

afterAll((): void => {
  sandbox.cleanup();
});

it('re-encodes a cut MP4 into clean H.264 and AAC', async (): Promise<void> => {
  const before = sha256Of(cutVideoPath);
  expect(decodeErrorLines(ffmpegBinary, cutVideoPath)).toBeGreaterThan(0);

  const outcome = await repair({
    inputPath: cutVideoPath,
    outputName: 'repair',
    strategy: 'reencode',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'cut-repaired.mp4', 'video');
  const expectedText = 'Repaired cut.mp4 by re-encoding. '
    + `Output saved to ${String(entry.path)}.`;
  expect(outcome.text).toBe(expectedText);

  const probe = await probeJson(String(entry.path));
  expect(codecNamesOf(probe, 'video')).toEqual(['h264']);
  expect(codecNamesOf(probe, 'audio')).toEqual(['aac']);
  expect(decodeErrorLines(ffmpegBinary, String(entry.path))).toBe(0);

  const repairBlock = asRecord(outcome.body.repair);
  expect(repairBlock.strategy).toBe('reencode');
  expect(repairBlock.pass).toBe('reencode');
  expect(repairBlock.outputPath).toBe(entry.path);
  expect(repairBlock.bytes).toBe(entry.bytes);
  expect(asList(outcome.body.warnings)).toEqual([]);
  expect(sha256Of(cutVideoPath)).toBe(before);
});

it('re-encodes cut audio into a single AAC stream', async (): Promise<void> => {
  const before = sha256Of(cutAudioPath);
  expect(decodeErrorLines(ffmpegBinary, cutAudioPath)).toBeGreaterThan(0);

  const outcome = await repair({
    inputPath: cutAudioPath,
    outputName: 'repair',
    strategy: 'reencode',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'cut-repaired.m4a', 'audio');
  expect(streamsOf(await probeJson(String(entry.path)))).toEqual([
    { type: 'audio', codecName: 'aac' },
  ]);
  expect(decodeErrorLines(ffmpegBinary, String(entry.path))).toBe(0);
  expect(asRecord(outcome.body.repair).pass).toBe('reencode');
  expect(sha256Of(cutAudioPath)).toBe(before);
});

it('re-encodes a silent video without adding an audio stream', async (): Promise<void> => {
  const before = sha256Of(silentVideoPath);
  const outcome = await repair({
    inputPath: silentVideoPath,
    outputName: 'repair',
    strategy: 'reencode',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'silent-repaired.mp4', 'video');
  const probe = await probeJson(String(entry.path));
  expect(codecNamesOf(probe, 'video')).toEqual(['h264']);
  expect(codecNamesOf(probe, 'audio')).toEqual([]);
  expect(decodeErrorLines(ffmpegBinary, String(entry.path))).toBe(0);
  expect(sha256Of(silentVideoPath)).toBe(before);
});

it('auto copies an unindexed recording without a re-encode', async (): Promise<void> => {
  const before = sha256Of(unindexedPath);
  const outcome = await repair({
    inputPath: unindexedPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'unindexed-repaired.mkv', 'video');
  const expectedText = 'Repaired unindexed.mkv with a stream copy. '
    + `Output saved to ${String(entry.path)}.`;
  expect(outcome.text).toBe(expectedText);
  const repairBlock = asRecord(outcome.body.repair);
  expect(repairBlock.strategy).toBe('auto');
  expect(repairBlock.pass).toBe('remux');
  expect(asList(outcome.body.warnings)).toEqual([]);
  expect(decodeErrorLines(ffmpegBinary, String(entry.path))).toBe(0);
  expect(sha256Of(unindexedPath)).toBe(before);
});

it('auto re-encodes when the stream copy cannot enter the container', async (): Promise<void> => {
  const before = sha256Of(mislabeledPath);
  expect(codecNamesOf(await probeJson(mislabeledPath), 'audio')).toEqual(['pcm_s16le']);

  const outcome = await repair({
    inputPath: mislabeledPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'mislabeled-repaired.mp4', 'video');
  expect(asRecord(outcome.body.repair).pass).toBe('reencode');
  const warnings = asList(outcome.body.warnings);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toBe(COPY_FAILED_VIDEO_WARNING);
  expect(codecNamesOf(await probeJson(String(entry.path)), 'audio')).toEqual(['aac']);
  expect(decodeErrorLines(ffmpegBinary, String(entry.path))).toBe(0);
  expect(sha256Of(mislabeledPath)).toBe(before);
});

it('auto re-encodes a cut MP4 whose copy keeps decode errors', async (): Promise<void> => {
  const before = sha256Of(cutVideoPath);
  const outcome = await repair({
    inputPath: cutVideoPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'cut-repaired.mp4', 'video');
  expect(asRecord(outcome.body.repair).pass).toBe('reencode');
  expect(asList(outcome.body.warnings)).toEqual([COPY_FAILED_VIDEO_WARNING]);
  expect(codecNamesOf(await probeJson(String(entry.path)), 'video')).toEqual(['h264']);
  expect(decodeErrorLines(ffmpegBinary, String(entry.path))).toBe(0);
  expect(sha256Of(cutVideoPath)).toBe(before);
});

it('re-encodes a song with album art as audio only', async (): Promise<void> => {
  const before = sha256Of(songPath);
  const outcome = await repair({
    inputPath: songPath,
    outputName: 'repair',
    strategy: 'reencode',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'song-repaired.m4a', 'audio');
  expect(streamsOf(await probeJson(String(entry.path)))).toEqual([
    { type: 'audio', codecName: 'aac' },
  ]);
  expect(asList(outcome.body.warnings)).toEqual([ALBUM_ART_WARNING]);
  const streams = asList(asRecord(outcome.body.diagnosis).streams).map((row) => asRecord(row));
  expect(streams.filter((row) => row.attachedPicture === true)).toHaveLength(1);
  expect(sha256Of(songPath)).toBe(before);
});

it('auto copies a song with album art into its own container', async (): Promise<void> => {
  const outcome = await repair({
    inputPath: songPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(outcome.isError).toBe(false);
  repairedEntry(outcome.body, 'song-repaired.mp3', 'audio');
  expect(asRecord(outcome.body.repair).pass).toBe('remux');
  expect(asList(outcome.body.warnings)).toEqual([]);
});

it('auto names the re-encoded file .mp4 when the copy fails', async (): Promise<void> => {
  const before = sha256Of(webmNamedPath);
  const outcome = await repair({
    inputPath: webmNamedPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(outcome.isError).toBe(false);
  const entry = repairedEntry(outcome.body, 'webm-named-repaired.mp4', 'video');
  expect(asRecord(outcome.body.repair).pass).toBe('reencode');
  expect(codecNamesOf(await probeJson(String(entry.path)), 'video')).toEqual(['h264']);
  expect(sha256Of(webmNamedPath)).toBe(before);
});

it(
  'refuses the video re-encode before ffmpeg runs when libx264 is absent',
  async (): Promise<void> => {
    const runs: RunCount = { count: 0 };
    const context = stubbedContext(['libx264'], runs);
    const before = sha256Of(cutVideoPath);
    const folders = listFolders(sandbox.outputDir);
    const failure = await handlerFailure(context, {
      inputPath: cutVideoPath,
      outputName: 'repair',
      strategy: 'reencode',
    });
    expect(failure.code).toBe(ERROR_CODES.CAPABILITY_MISSING);
    expect(failure.details.name).toBe('libx264');
    expect(failure.details.kind).toBe('encoder');
    expect(runs.count).toBe(0);
    expect(listFolders(sandbox.outputDir)).toEqual(folders);
    expect(sha256Of(cutVideoPath)).toBe(before);
  },
);

it('auto copies an unindexed recording when both encoders are absent', async (): Promise<void> => {
  const runs: RunCount = { count: 0 };
  const context = stubbedContext(['libx264', 'aac'], runs);
  const before = sha256Of(unindexedPath);
  const result = await mediaRepairTool.handler(
    { inputPath: unindexedPath, outputName: 'repair', strategy: 'auto' },
    context,
  );
  expect(result.isError).not.toBe(true);
  const body = asRecord(result.structuredContent);
  expect(asRecord(body.repair).pass).toBe('remux');
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  expect(path.basename(String(asRecord(outputs[0]).path))).toBe('unindexed-repaired.mkv');
  // The copy and its decode check, and no re-encode.
  expect(runs.count).toBe(2);
  expect(sha256Of(unindexedPath)).toBe(before);
});

it('auto stops before the re-encode when libx264 is absent', async (): Promise<void> => {
  const runs: RunCount = { count: 0 };
  const context = stubbedContext(['libx264'], runs);
  const before = sha256Of(mislabeledPath);
  const folders = listFolders(sandbox.outputDir);
  const failure = await handlerFailure(context, {
    inputPath: mislabeledPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(runs.count).toBe(1);
  expect(failure.code).toBe(ERROR_CODES.CAPABILITY_MISSING);
  expect(failure.details.name).toBe('libx264');
  expect(listFolders(sandbox.outputDir)).toEqual(folders);
  expect(sha256Of(mislabeledPath)).toBe(before);
});

it('auto joins both tails when the copy and the re-encode fail', async (): Promise<void> => {
  const real = createToolContext(sandbox.config);
  const runs: RunCount = { count: 0 };
  const context: ToolContext = {
    ...real,
    runBinary: async (name, args, options) => {
      if (name !== 'ffmpeg') {
        return real.runBinary(name, args, options);
      }
      runs.count += 1;
      throw new MediaError(ERROR_CODES.PROCESS_FAILED, 'ffmpeg failed.', {
        binary: 'ffmpeg',
        exitCode: 1,
        signal: null,
        stderrTail: `pass ${runs.count} failed`,
      });
    },
  };
  const before = sha256Of(mislabeledPath);
  const folders = listFolders(sandbox.outputDir);
  const failure = await handlerFailure(context, {
    inputPath: mislabeledPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(failure.code).toBe(ERROR_CODES.PROCESS_FAILED);
  expect(failure.details.stderrTail).toBe('pass 1 failed\npass 2 failed');
  expect(runs.count).toBe(2);
  expect(listFolders(sandbox.outputDir)).toEqual(folders);
  expect(sha256Of(mislabeledPath)).toBe(before);
});

it('passes a diagnosis timeout through before ffmpeg runs', async (): Promise<void> => {
  const real = createToolContext(sandbox.config);
  const runs: RunCount = { count: 0 };
  const context: ToolContext = {
    ...real,
    runBinary: async (name, args, options) => {
      if (name === 'ffprobe') {
        throw new MediaError(ERROR_CODES.PROCESS_TIMEOUT, 'The process was stopped.', {
          binary: 'ffprobe',
          timeoutSeconds: 1800,
          elapsedSeconds: 1800,
        });
      }
      runs.count += 1;
      return real.runBinary(name, args, options);
    },
  };
  const folders = listFolders(sandbox.outputDir);
  const failure = await handlerFailure(context, {
    inputPath: unindexedPath,
    outputName: 'repair',
    strategy: 'auto',
  });
  expect(failure.code).toBe(ERROR_CODES.PROCESS_TIMEOUT);
  expect(runs.count).toBe(0);
  expect(listFolders(sandbox.outputDir)).toEqual(folders);
});

it('leaves no folder for a path failure and a missing input', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  const outside = await repair({
    inputPath: outsidePath,
    outputName: 'repair',
    strategy: 'reencode',
  });
  expect(outside.isError).toBe(true);
  expect(outside.body.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
  const missing = await repair({
    inputPath: missingPath,
    outputName: 'repair',
    strategy: 'reencode',
  });
  expect(missing.isError).toBe(true);
  expect(missing.body.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it('rejects a strategy outside the schema and leaves no folder', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client) => {
    await expectProtocolError(
      client.callTool({
        name: 'media_repair',
        arguments: { inputPath: cutVideoPath, outputName: 'repair', strategy: 'faststart' },
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});
