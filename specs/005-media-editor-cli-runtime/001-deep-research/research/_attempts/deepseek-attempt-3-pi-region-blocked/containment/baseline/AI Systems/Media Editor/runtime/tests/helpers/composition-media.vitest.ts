// ───────────────────────────────────────────────────────────────────
// MODULE: Composition Media Test Helpers Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';

import { runProcess } from '../../src/core/process-runner.js';

import {
  copyFixture,
  formatSrtTime,
  generateOverlayPng,
  generateSilenceAudio,
  generateSilenceVideo,
  meanColor,
  meanLuma,
  writeSubRip,
} from './composition-media.js';
import {
  fixturePath,
  makeTempDir,
  probeJson,
  removeTempDir,
  resolveTestBinary,
} from './media.js';

import type { SilencePatternPiece } from './composition-media.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ProbeStream {
  readonly codecType: string;
  readonly duration: number | undefined;
}

interface ProbeView {
  readonly duration: number | undefined;
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
const AUDIO_DURATION_TOLERANCE_SECONDS = 0.1;
const VIDEO_DURATION_TOLERANCE_SECONDS = 0.15;

const COLOR_WIDTH = 64;
const COLOR_HEIGHT = 48;
const COLOR_RATE = 10;
const COLOR_SECONDS = 1;
const COLOR_SAMPLE_SECONDS = 0.5;

const SILENCE_AUDIO_PATTERN: readonly SilencePatternPiece[] = [
  { kind: 'tone', seconds: 1 },
  { kind: 'silence', seconds: 2 },
  { kind: 'tone', seconds: 1 },
  { kind: 'silence', seconds: 3 },
];

const SILENCE_VIDEO_PATTERN: readonly SilencePatternPiece[] = [
  { kind: 'tone', seconds: 1 },
  { kind: 'silence', seconds: 1 },
  { kind: 'tone', seconds: 1 },
];

const WAV_PATTERN: readonly SilencePatternPiece[] = [
  { kind: 'tone', seconds: 1 },
  { kind: 'silence', seconds: 1 },
];

const SUBRIP_EXPECTED =
  '1\n00:00:01,000 --> 00:00:02,500\nFirst cue\n\n'
  + '2\n00:00:04,250 --> 00:00:06,000\nSecond cue\nSecond line\n\n';

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

function requiredFfmpegBinary(): string {
  if (ffmpegBinary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  return ffmpegBinary;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function readProbe(value: unknown): ProbeView {
  if (!isRecord(value)) {
    throw new Error('Expected a probe object.');
  }
  const format = isRecord(value.format) ? value.format : undefined;
  const duration = format === undefined ? undefined : readNumber(format.duration);
  const rawStreams = Array.isArray(value.streams) ? value.streams : [];
  const streams: ProbeStream[] = [];
  for (const entry of rawStreams) {
    if (!isRecord(entry) || typeof entry.codec_type !== 'string') {
      continue;
    }
    streams.push({
      codecType: entry.codec_type,
      duration: readNumber(entry.duration),
    });
  }
  return { duration, streams };
}

function durationOf(probe: ProbeView): number | undefined {
  if (probe.duration !== undefined) {
    return probe.duration;
  }
  for (const stream of probe.streams) {
    if (stream.duration !== undefined) {
      return stream.duration;
    }
  }
  return undefined;
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

function expectDurationNear(
  actual: number | undefined,
  expected: number,
  tolerance: number,
): void {
  expect(actual).toBeTypeOf('number');
  if (actual === undefined) {
    return;
  }
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function countMatches(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

function sha256OfFile(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

async function generateColorClip(
  dir: string,
  fileName: string,
  color: 'black' | 'white' | 'red',
): Promise<string> {
  const output = path.join(dir, fileName);
  await runProcess(requiredFfmpegBinary(), [
    '-f',
    'lavfi',
    '-i',
    `color=c=${color}:size=${COLOR_WIDTH}x${COLOR_HEIGHT}`
      + `:rate=${COLOR_RATE}:duration=${COLOR_SECONDS}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    output,
  ], {
    kind: 'ffmpeg',
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return output;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('generateSilenceAudio', () => {
  const dir = trackTemp('composition-audio-');

  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'writes a seven second m4a with two silent stretches',
    async (): Promise<void> => {
      const audioPath = await generateSilenceAudio(dir, {
        pattern: SILENCE_AUDIO_PATTERN,
      });
      expect(path.basename(audioPath)).toBe('silence-pattern.m4a');
      const probe = readProbe(await probeJson(audioPath));
      expect(countCodec(probe, 'audio')).toBe(1);
      expectDurationNear(durationOf(probe), 7, AUDIO_DURATION_TOLERANCE_SECONDS);
      const detection = await runProcess(requiredFfmpegBinary(), [
        '-i',
        audioPath,
        '-af',
        'silencedetect=n=-30dB:d=0.5',
        '-f',
        'null',
        '-',
      ], {
        kind: 'ffmpeg',
        timeoutMs: PROCESS_TIMEOUT_MS,
      });
      expect(countMatches(detection.stderr, /silence_start:/g)).toBe(2);
    },
  );

  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'writes the wav variant with the requested name',
    async (): Promise<void> => {
      const audioPath = await generateSilenceAudio(dir, {
        pattern: WAV_PATTERN,
        format: 'wav',
        fileName: 'pattern.wav',
      });
      expect(path.basename(audioPath)).toBe('pattern.wav');
      const probe = readProbe(await probeJson(audioPath));
      expect(countCodec(probe, 'audio')).toBe(1);
      expectDurationNear(durationOf(probe), 2, AUDIO_DURATION_TOLERANCE_SECONDS);
    },
  );
});

describe('generateSilenceVideo', () => {
  const dir = trackTemp('composition-video-');

  it.skipIf(isFfmpegMissing || isFfprobeMissing)(
    'writes a three second mp4 with one picture and one track',
    async (): Promise<void> => {
      const videoPath = await generateSilenceVideo(dir, {
        pattern: SILENCE_VIDEO_PATTERN,
      });
      expect(path.basename(videoPath)).toBe('silence-pattern.mp4');
      const probe = readProbe(await probeJson(videoPath));
      expect(countCodec(probe, 'video')).toBe(1);
      expect(countCodec(probe, 'audio')).toBe(1);
      expectDurationNear(durationOf(probe), 3, VIDEO_DURATION_TOLERANCE_SECONDS);
    },
  );
});

describe('formatSrtTime', () => {
  it('formats whole seconds, fractions, and one hour past', (): void => {
    expect(formatSrtTime(0)).toBe('00:00:00,000');
    expect(formatSrtTime(3.5)).toBe('00:00:03,500');
    expect(formatSrtTime(3725.25)).toBe('01:02:05,250');
  });
});

describe('writeSubRip', () => {
  const dir = trackTemp('composition-srt-');

  it('writes the exact cue blocks', (): void => {
    const subtitlePath = writeSubRip(dir, 'cues.srt', [
      { start: 1, end: 2.5, text: 'First cue' },
      { start: 4.25, end: 6, text: 'Second cue\nSecond line' },
    ]);
    expect(subtitlePath).toBe(path.join(dir, 'cues.srt'));
    expect(readFileSync(subtitlePath, 'utf8')).toBe(SUBRIP_EXPECTED);
  });
});

describe('copyFixture', () => {
  const dir = trackTemp('composition-fixture-');

  it('copies the fixture with unchanged bytes', (): void => {
    const copy = copyFixture('main_video.mp4', dir);
    expect(path.basename(copy)).toBe('main_video.mp4');
    expect(sha256OfFile(copy)).toBe(sha256OfFile(fixturePath('main_video.mp4')));
  });

  it('honours the target name', (): void => {
    const copy = copyFixture('broll1.mp4', dir, 'renamed-broll.mp4');
    expect(path.basename(copy)).toBe('renamed-broll.mp4');
    expect(sha256OfFile(copy)).toBe(sha256OfFile(fixturePath('broll1.mp4')));
  });
});

describe('generateOverlayPng', () => {
  const dir = trackTemp('composition-overlay-');

  it('writes a four channel PNG with a red square', async (): Promise<void> => {
    const pngPath = await generateOverlayPng(dir, { width: 64, height: 48 });
    expect(path.basename(pngPath)).toBe('overlay.png');
    const metadata = await sharp(pngPath).metadata();
    expect(metadata.width).toBe(64);
    expect(metadata.height).toBe(48);
    expect(metadata.channels).toBe(4);
    expect(metadata.hasAlpha).toBe(true);
    const { data, info } = await sharp(pngPath).raw().toBuffer({
      resolveWithObject: true,
    });
    expect(info.channels).toBe(4);
    const center = Math.floor(info.height / 2) * info.width
      + Math.floor(info.width / 2);
    const centerIndex = center * info.channels;
    expect(data[centerIndex] ?? 0).toBeGreaterThan(200);
    expect(data[centerIndex + 1] ?? 255).toBeLessThan(50);
    expect(data[centerIndex + 3] ?? 0).toBeGreaterThan(200);
    expect(data[3] ?? -1).toBe(0);
  });
});

describe('frame sampling', () => {
  const dir = trackTemp('composition-frames-');

  it.skipIf(isFfmpegMissing)(
    'measures a black frame below 20 and a white frame above 230',
    async (): Promise<void> => {
      const blackPath = await generateColorClip(dir, 'black.mp4', 'black');
      const whitePath = await generateColorClip(dir, 'white.mp4', 'white');
      expect(await meanLuma(blackPath, COLOR_SAMPLE_SECONDS)).toBeLessThan(20);
      expect(await meanLuma(whitePath, COLOR_SAMPLE_SECONDS)).toBeGreaterThan(230);
    },
  );

  it.skipIf(isFfmpegMissing)(
    'measures red in a region of a red frame',
    async (): Promise<void> => {
      const redPath = await generateColorClip(dir, 'red.mp4', 'red');
      const average = await meanColor(redPath, COLOR_SAMPLE_SECONDS, {
        x: 8,
        y: 6,
        width: 32,
        height: 24,
      });
      expect(average.r).toBeGreaterThan(200);
      expect(average.g).toBeLessThan(50);
      expect(average.b).toBeLessThan(50);
    },
  );
});
