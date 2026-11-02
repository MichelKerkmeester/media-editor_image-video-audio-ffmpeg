// ───────────────────────────────────────────────────────────────────
// MODULE: Broken Media Test Helpers Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { unportableMp4Codecs } from '../../src/core/media-containers.js';
import {
  decodeErrorLines,
  generateCoverArtAudio,
  generateCutAudio,
  generateCutMp4,
  generateEmptyFile,
  generateIndexlessMp4,
  generateMislabeledMatroska,
  generateUnindexedMatroska,
} from './broken-media.js';
import {
  generateVideo,
  makeTempDir,
  probeJson,
  removeTempDir,
  resolveTestBinary,
} from './media.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
}

interface ProbeView {
  readonly formatName: string;
  readonly formatDuration: number | undefined;
  readonly streams: readonly ProbeStream[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const ffmpegBinary = await resolveTestBinary('ffmpeg');
const ffprobeBinary = await resolveTestBinary('ffprobe');
const isFfmpegMissing = ffmpegBinary === undefined;
const isFfprobeMissing = ffprobeBinary === undefined;

const PROCESS_TIMEOUT_MS = 60000;
const MAX_BUFFER_BYTES = 128 * 1024 * 1024;
const CLEAN_CLIP_SECONDS = 1;
const COVER_ART_SECONDS = 4;

const tempDirs: string[] = [];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  for (const dir of tempDirs) {
    removeTempDir(dir);
  }
});

function trackTemp(prefix: string): string {
  const dir = makeTempDir(prefix);
  tempDirs.push(dir);
  return dir;
}

function requiredFfmpeg(): string {
  if (ffmpegBinary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  return ffmpegBinary;
}

function requiredFfprobe(): string {
  if (ffprobeBinary === undefined) {
    throw new Error('ffprobe is not available');
  }
  return ffprobeBinary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readDuration(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readProbe(value: unknown): ProbeView {
  if (!isRecord(value)) {
    throw new Error('Expected a probe object.');
  }
  const format = isRecord(value.format) ? value.format : {};
  const rawStreams = Array.isArray(value.streams) ? value.streams : [];
  const streams: ProbeStream[] = [];
  for (const entry of rawStreams) {
    if (!isRecord(entry) || typeof entry.codec_type !== 'string') {
      continue;
    }
    streams.push({
      codecType: entry.codec_type,
      codecName: typeof entry.codec_name === 'string' ? entry.codec_name : '',
    });
  }
  return {
    formatName: typeof format.format_name === 'string' ? format.format_name : '',
    formatDuration: readDuration(format.duration),
    streams,
  };
}

function countCodec(probe: ProbeView, codecType: string): number {
  let count = 0;
  for (const stream of probe.streams) {
    if (stream.codecType === codecType) {
      count += 1;
    }
  }
  return count;
}

function runFfmpeg(args: readonly string[]): number | null {
  const run = spawnSync(requiredFfmpeg(), [...args], {
    maxBuffer: MAX_BUFFER_BYTES,
    timeout: PROCESS_TIMEOUT_MS,
  });
  if (run.error !== undefined) {
    throw new Error(`ffmpeg failed to start: ${run.error.message}`);
  }
  return run.status;
}

function ffprobeStatus(filePath: string): number | null {
  const run = spawnSync(requiredFfprobe(), [
    '-v',
    'error',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    '-i',
    filePath,
  ], {
    maxBuffer: MAX_BUFFER_BYTES,
    timeout: PROCESS_TIMEOUT_MS,
  });
  if (run.error !== undefined) {
    throw new Error(`ffprobe failed to start: ${run.error.message}`);
  }
  return run.status;
}

function expectOnlyFile(dir: string, name: string): void {
  expect(readdirSync(dir)).toEqual([name]);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('generateUnindexedMatroska', () => {
  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'writes a recording with streams but no format duration',
    async (): Promise<void> => {
      const dir = trackTemp('broken-matroska-');
      const file = await generateUnindexedMatroska(dir);
      expect(path.basename(file)).toBe('unindexed.mkv');
      expectOnlyFile(dir, 'unindexed.mkv');
      const probe = readProbe(await probeJson(file));
      expect(countCodec(probe, 'video')).toBe(1);
      expect(countCodec(probe, 'audio')).toBe(1);
      expect(probe.formatDuration).toBeUndefined();
    },
  );

  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'gains a format duration after a stream copy',
    async (): Promise<void> => {
      const dir = trackTemp('broken-matroska-copy-');
      const file = await generateUnindexedMatroska(dir);
      const copy = path.join(dir, 'copy.mkv');
      expect(runFfmpeg(['-i', file, '-c', 'copy', copy])).toBe(0);
      const probe = readProbe(await probeJson(copy));
      expect(probe.formatDuration).toBeTypeOf('number');
      if (probe.formatDuration !== undefined) {
        expect(probe.formatDuration).toBeGreaterThan(0);
      }
    },
  );
});

describe('generateCutMp4', () => {
  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'probes with both streams and reports decode errors',
    async (): Promise<void> => {
      const dir = trackTemp('broken-cut-');
      const file = await generateCutMp4(dir);
      expect(path.basename(file)).toBe('cut.mp4');
      expectOnlyFile(dir, 'cut.mp4');
      const probe = readProbe(await probeJson(file));
      expect(countCodec(probe, 'video')).toBe(1);
      expect(countCodec(probe, 'audio')).toBe(1);
      expect(decodeErrorLines(requiredFfmpeg(), file)).toBeGreaterThan(0);
    },
  );
});

describe('generateIndexlessMp4', () => {
  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'makes ffprobe exit non-zero',
    async (): Promise<void> => {
      const dir = trackTemp('broken-indexless-');
      const file = await generateIndexlessMp4(dir);
      expect(path.basename(file)).toBe('indexless.mp4');
      expectOnlyFile(dir, 'indexless.mp4');
      expect(ffprobeStatus(file)).not.toBe(0);
    },
  );
});

describe('generateMislabeledMatroska', () => {
  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'probes as Matroska with a PCM audio stream',
    async (): Promise<void> => {
      const dir = trackTemp('broken-mislabeled-');
      const file = await generateMislabeledMatroska(dir);
      expect(path.basename(file)).toBe('mislabeled.mp4');
      const probe = readProbe(await probeJson(file));
      expect(probe.formatName).toContain('matroska');
      expect(countCodec(probe, 'video')).toBe(1);
      const audio = probe.streams.find((stream) => stream.codecType === 'audio');
      expect(audio?.codecName).toBe('pcm_s16le');
    },
  );

  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'cannot become a portable MP4 by stream copy on any build',
    async (): Promise<void> => {
      const dir = trackTemp('broken-mislabeled-copy-');
      const file = await generateMislabeledMatroska(dir);
      const copy = path.join(dir, 'copy.mp4');
      // ffmpeg 6.1 and 7.0 refuse this copy, and ffmpeg 9 makes one the server refuses.
      const refusedByFfmpeg = runFfmpeg(['-i', file, '-c', 'copy', copy]) !== 0;
      const kept = refusedByFfmpeg
        ? []
        : unportableMp4Codecs(readProbe(await probeJson(copy)).streams.map((row) => row.codecName));
      expect(refusedByFfmpeg || kept.includes('pcm_s16le')).toBe(true);
    },
  );
});

describe('generateCutAudio', () => {
  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'probes with one AAC stream and reports decode errors',
    async (): Promise<void> => {
      const dir = trackTemp('broken-audio-');
      const file = await generateCutAudio(dir);
      expect(path.basename(file)).toBe('cut.m4a');
      expectOnlyFile(dir, 'cut.m4a');
      const probe = readProbe(await probeJson(file));
      expect(countCodec(probe, 'audio')).toBe(1);
      const audio = probe.streams.find((stream) => stream.codecType === 'audio');
      expect(audio?.codecName).toBe('aac');
      expect(decodeErrorLines(requiredFfmpeg(), file)).toBeGreaterThan(0);
    },
  );
});

describe('generateCoverArtAudio', () => {
  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'probes as MP3 audio with a picture flagged as attached',
    async (): Promise<void> => {
      const dir = trackTemp('broken-cover-');
      const file = await generateCoverArtAudio(dir);
      expect(path.basename(file)).toBe('cover-art.mp3');
      expectOnlyFile(dir, 'cover-art.mp3');
      const raw = await probeJson(file);
      const probe = readProbe(raw);
      expect(probe.formatName).toBe('mp3');
      expect(Math.abs((probe.formatDuration ?? 0) - COVER_ART_SECONDS)).toBeLessThan(0.2);
      expect(probe.streams).toEqual([
        { codecType: 'audio', codecName: 'mp3' },
        { codecType: 'video', codecName: 'mjpeg' },
      ]);
      const streams = isRecord(raw) && Array.isArray(raw.streams) ? raw.streams : [];
      const picture: unknown = streams[1];
      const disposition = isRecord(picture) ? picture.disposition : undefined;
      expect(isRecord(disposition) ? disposition.attached_pic : undefined).toBe(1);
      expect(decodeErrorLines(requiredFfmpeg(), file)).toBe(0);
    },
  );
});

describe('generateEmptyFile', () => {
  it('writes a zero byte file', (): void => {
    const dir = trackTemp('broken-empty-');
    const file = generateEmptyFile(dir);
    expect(path.basename(file)).toBe('empty.mp4');
    expectOnlyFile(dir, 'empty.mp4');
    expect(statSync(file).size).toBe(0);
  });
});

describe('decodeErrorLines', () => {
  it.skipIf(isFfmpegMissing)(
    'returns zero for a clean clip',
    async (): Promise<void> => {
      const dir = trackTemp('broken-clean-');
      const file = await generateVideo(dir, {
        seconds: CLEAN_CLIP_SECONDS,
        width: 320,
        height: 240,
        withAudio: true,
      });
      expect(decodeErrorLines(requiredFfmpeg(), file)).toBe(0);
    },
  );
});
