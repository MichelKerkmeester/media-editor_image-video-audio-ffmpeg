// ───────────────────────────────────────────────────────────────────
// MODULE: Media Test Helpers Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  existsSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';

import {
  fixturePath,
  generateAudio,
  generateImage,
  generateVideo,
  makeTempDir,
  probeJson,
  removeTempDir,
  resolveTestBinary,
} from './media.js';

import type { GenerateAudioOptions, GenerateImageOptions } from './media.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ProbeStream {
  readonly codecType: string;
  readonly width: number | undefined;
  readonly height: number | undefined;
  readonly duration: number | undefined;
}

interface ProbeView {
  readonly duration: number | undefined;
  readonly streams: readonly ProbeStream[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const testsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = path.join(testsDir, 'fixtures');
const tmpRoot = path.join(testsDir, '.tmp');
const clipSeconds = 1;
const frameWidth = 320;
const frameHeight = 240;
const durationToleranceSeconds = 0.3;
const knownFixtures = [
  'broll1.mp4',
  'broll2.mp4',
  'main_video.mp4',
  'short_video1.mp4',
  'short_video2.mp4',
  'README.md',
];

const ffmpegBinary = await resolveTestBinary('ffmpeg');
const ffprobeBinary = await resolveTestBinary('ffprobe');
const isFfmpegMissing = ffmpegBinary === undefined;
const isFfprobeMissing = ffprobeBinary === undefined;
const tempDirs: string[] = [];

const videoCases = [
  { fileName: 'silent.mp4', withAudio: false },
  { fileName: 'with-audio.mp4', withAudio: true },
] as const;

const audioCases: readonly GenerateAudioOptions[] = [
  { seconds: clipSeconds, format: 'wav', fileName: 'tone.wav' },
  { seconds: clipSeconds, format: 'mp3', fileName: 'tone.mp3' },
  { seconds: clipSeconds, format: 'aac', fileName: 'tone.m4a' },
  { seconds: clipSeconds, format: 'flac', fileName: 'tone.flac' },
];

const imageCases: readonly GenerateImageOptions[] = [
  { format: 'png', width: 24, height: 16, fileName: 'swatch.png' },
  { format: 'jpeg', width: 32, height: 20, fileName: 'swatch.jpg' },
  { format: 'webp', width: 18, height: 12, fileName: 'swatch.webp' },
];

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
      width: readNumber(entry.width),
      height: readNumber(entry.height),
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

function expectNonEmptyFile(filePath: string): void {
  expect(existsSync(filePath)).toBe(true);
  const info = statSync(filePath);
  expect(info.isFile()).toBe(true);
  expect(info.size).toBeGreaterThan(0);
}

function expectNearDuration(probe: ProbeView, seconds: number): void {
  const duration = durationOf(probe);
  expect(duration).toBeTypeOf('number');
  if (duration === undefined) {
    return;
  }
  expect(Math.abs(duration - seconds)).toBeLessThanOrEqual(durationToleranceSeconds);
}

async function expectVideoProbe(
  filePath: string,
  withAudio: boolean,
): Promise<void> {
  const probe = readProbe(await probeJson(filePath));
  const video = probe.streams.find((stream) => stream.codecType === 'video');
  expect(video).toBeDefined();
  expect(video?.width).toBe(frameWidth);
  expect(video?.height).toBe(frameHeight);
  expect(countCodec(probe, 'audio')).toBe(withAudio ? 1 : 0);
  expectNearDuration(probe, clipSeconds);
}

async function expectAudioProbe(filePath: string): Promise<void> {
  const probe = readProbe(await probeJson(filePath));
  expect(countCodec(probe, 'audio')).toBe(1);
  expectNearDuration(probe, clipSeconds);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('fixturePath', () => {
  it('returns an existing absolute path for every fixture file', () => {
    const names = readdirSync(fixturesDir).filter((name) => {
      return statSync(path.join(fixturesDir, name)).isFile();
    });
    expect(names).toEqual(expect.arrayContaining(knownFixtures));
    for (const name of names) {
      const resolved = fixturePath(name);
      expect(path.isAbsolute(resolved)).toBe(true);
      expect(existsSync(resolved)).toBe(true);
      expect(statSync(resolved).isFile()).toBe(true);
      expect(path.basename(resolved)).toBe(name);
    }
  });

  it('throws when the fixture name is missing', () => {
    expect(() => {
      fixturePath('missing-fixture.mp4');
    }).toThrow(Error);
  });
});

describe('temp directories', () => {
  it('creates a directory under tests/.tmp and removeTempDir deletes it', () => {
    const dir = makeTempDir('helper-');
    const relative = path.relative(realpathSync.native(tmpRoot), dir);
    expect(relative.startsWith('..')).toBe(false);
    expect(path.isAbsolute(relative)).toBe(false);
    expect(relative.length).toBeGreaterThan(0);
    expect(statSync(dir).isDirectory()).toBe(true);
    removeTempDir(dir);
    expect(existsSync(dir)).toBe(false);
  });

  it('throws for a path outside tests/.tmp and leaves that folder', () => {
    const outside = mkdtempSync(path.join(tmpdir(), 'media-outside-'));
    try {
      expect(() => {
        removeTempDir(outside);
      }).toThrow(Error);
      expect(existsSync(outside)).toBe(true);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('generateVideo', () => {
  const dir = trackTemp('video-');

  it('throws when a dimension is not an even integer', async () => {
    await expect(generateVideo(dir, {
      seconds: clipSeconds,
      width: 321,
      height: frameHeight,
    })).rejects.toThrow(Error);
    await expect(generateVideo(dir, {
      seconds: clipSeconds,
      width: frameWidth,
      height: 15,
    })).rejects.toThrow(Error);
  });

  for (const videoCase of videoCases) {
    const label = videoCase.withAudio ? 'with audio' : 'without audio';

    it.skipIf(isFfmpegMissing)(`writes a non-empty clip ${label}`, async () => {
      const output = await generateVideo(dir, {
        seconds: clipSeconds,
        width: frameWidth,
        height: frameHeight,
        withAudio: videoCase.withAudio,
        fileName: videoCase.fileName,
      });
      expectNonEmptyFile(output);
    });

    it.skipIf(isFfmpegMissing || isFfprobeMissing)(
      `probes a clip ${label}`,
      async () => {
        const output = await generateVideo(dir, {
          seconds: clipSeconds,
          width: frameWidth,
          height: frameHeight,
          withAudio: videoCase.withAudio,
          fileName: `probe-${videoCase.fileName}`,
        });
        await expectVideoProbe(output, videoCase.withAudio);
      },
    );
  }
});

describe('generateAudio', () => {
  const dir = trackTemp('audio-');

  for (const audioCase of audioCases) {
    it.skipIf(isFfmpegMissing)(
      `writes a non-empty ${audioCase.format} file`,
      async () => {
        const output = await generateAudio(dir, audioCase);
        expectNonEmptyFile(output);
      },
    );

    it.skipIf(isFfmpegMissing || isFfprobeMissing)(
      `probes ${audioCase.format} duration`,
      async () => {
        const output = await generateAudio(dir, {
          seconds: audioCase.seconds,
          format: audioCase.format,
          fileName: `probe-${audioCase.fileName ?? audioCase.format}`,
        });
        expectNonEmptyFile(output);
        await expectAudioProbe(output);
      },
    );
  }
});

describe('generateImage', () => {
  const dir = trackTemp('image-');

  for (const imageCase of imageCases) {
    it(`writes a non-empty ${imageCase.format} image`, async () => {
      const output = await generateImage(dir, imageCase);
      expectNonEmptyFile(output);
      const metadata = await sharp(output).metadata();
      expect(metadata.width).toBe(imageCase.width);
      expect(metadata.height).toBe(imageCase.height);
      expect(metadata.format).toBe(imageCase.format);
    });
  }
});
