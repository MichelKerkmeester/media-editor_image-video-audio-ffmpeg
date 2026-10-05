// ───────────────────────────────────────────────────────────────────
// MODULE: Composition Media Test Helpers
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

import { runProcess } from '../../src/core/process-runner.js';

import { fixturePath, resolveTestBinary } from './media.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One stretch of the generated tone-and-silence pattern. */
export interface SilencePatternPiece {
  /** A 440 Hz tone, or an equally long stretch of digital silence. */
  readonly kind: 'tone' | 'silence';

  /** Length of the stretch in seconds. */
  readonly seconds: number;
}

/** Options for a generated tone-and-silence audio file. */
export interface GenerateSilenceAudioOptions {
  /** Tone and silence stretches, joined in order. */
  readonly pattern: readonly SilencePatternPiece[];

  /** Container family. `aac` is written as `.m4a`. Defaults to `aac`. */
  readonly format?: 'aac' | 'wav';

  /** Output file name. Defaults to `silence-pattern` plus the format extension. */
  readonly fileName?: string;
}

/** Options for a generated tone-and-silence video clip. */
export interface GenerateSilenceVideoOptions {
  /** Tone and silence stretches, joined in order. */
  readonly pattern: readonly SilencePatternPiece[];

  /** Frame width in pixels. Defaults to 160. */
  readonly width?: number;

  /** Frame height in pixels. Defaults to 120. */
  readonly height?: number;

  /** Output file name. Defaults to `silence-pattern.mp4`. */
  readonly fileName?: string;
}

/** Options for a generated overlay image. */
export interface GenerateOverlayPngOptions {
  /** Image width in pixels. */
  readonly width: number;

  /** Image height in pixels. */
  readonly height: number;

  /** Output file name. Defaults to `overlay.png`. */
  readonly fileName?: string;
}

/** One subtitle cue, with its timing in seconds. */
export interface SubRipCue {
  /** Cue start in seconds. */
  readonly start: number;

  /** Cue end in seconds. */
  readonly end: number;

  /** Cue text, one or more lines. */
  readonly text: string;
}

/** One pixel region of a frame. */
export interface FrameRegion {
  /** Left edge in pixels. */
  readonly x: number;

  /** Top edge in pixels. */
  readonly y: number;

  /** Region width in pixels. */
  readonly width: number;

  /** Region height in pixels. */
  readonly height: number;
}

/** Average colour of one frame region, one 0 to 255 value per channel. */
export interface RgbAverage {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const PROCESS_TIMEOUT_MS = 60000;

/** Room for one 64 megapixel RGBA frame. */
const FRAME_MAX_BUFFER_BYTES = 64 * 1024 * 1024;

const AUDIO_SAMPLE_RATE = 44100;
const TONE_FREQUENCY_HZ = 440;
const DEFAULT_VIDEO_WIDTH = 160;
const DEFAULT_VIDEO_HEIGHT = 120;
const DEFAULT_VIDEO_RATE = 25;
const DEFAULT_OVERLAY_NAME = 'overlay.png';
const DEFAULT_AUDIO_STEM = 'silence-pattern';
const DEFAULT_VIDEO_NAME = 'silence-pattern.mp4';

const SILENCE_SOURCE = `anullsrc=r=${AUDIO_SAMPLE_RATE}:cl=mono`;

const AUDIO_OUTPUTS = {
  aac: { codec: 'aac', extension: '.m4a' },
  wav: { codec: 'pcm_s16le', extension: '.wav' },
} as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

async function requiredFfmpeg(): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  return binary;
}

function assertPattern(pattern: readonly SilencePatternPiece[]): void {
  if (pattern.length === 0) {
    throw new Error('The pattern needs at least one stretch.');
  }
}

function toneSource(seconds: number): string {
  return `sine=frequency=${TONE_FREQUENCY_HZ}`
    + `:duration=${seconds}`
    + `:sample_rate=${AUDIO_SAMPLE_RATE}`;
}

function pieceArgs(piece: SilencePatternPiece): string[] {
  if (piece.kind === 'tone') {
    return ['-f', 'lavfi', '-i', toneSource(piece.seconds)];
  }
  return ['-f', 'lavfi', '-t', String(piece.seconds), '-i', SILENCE_SOURCE];
}

function videoSource(width: number, height: number, seconds: number): string {
  return `testsrc2=size=${width}x${height}:rate=${DEFAULT_VIDEO_RATE}`
    + `:duration=${seconds}`;
}

function concatAudioFilter(pieceCount: number, firstInput: number): string {
  const labels: string[] = [];
  for (let index = 0; index < pieceCount; index += 1) {
    labels.push(`[${index + firstInput}:a]`);
  }
  return `${labels.join('')}concat=n=${pieceCount}:v=0:a=1[a]`;
}

function patternSeconds(pattern: readonly SilencePatternPiece[]): number {
  let total = 0;
  for (const piece of pattern) {
    total += piece.seconds;
  }
  return total;
}

function padNumber(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

function averageOf(bytes: Buffer): number {
  let sum = 0;
  for (const byte of bytes) {
    sum += byte;
  }
  return sum / bytes.length;
}

async function frameBytes(
  videoPath: string,
  atSeconds: number,
  tail: readonly string[],
): Promise<Buffer> {
  const binary = await requiredFfmpeg();
  const args = [
    '-ss',
    String(atSeconds),
    '-i',
    videoPath,
    '-frames:v',
    '1',
    ...tail,
  ];
  const run = spawnSync(binary, args, { maxBuffer: FRAME_MAX_BUFFER_BYTES });
  if (run.error !== undefined) {
    throw new Error(`ffmpeg frame read failed: ${run.error.message}`);
  }
  if (run.status !== 0) {
    throw new Error(`ffmpeg frame read failed with exit status ${run.status}`);
  }
  if (run.stdout.length === 0) {
    throw new Error('ffmpeg frame read returned no pixel bytes');
  }
  return run.stdout;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Generate an audio file of alternating tone and silence stretches.
 *
 * Each piece becomes one lavfi input, and the `concat` filter joins them
 * into a single encode.
 *
 * @param dir - Directory that receives the file
 * @param options - Stretch pattern, container family, and optional name
 * @returns Absolute path of the written file
 * @throws {Error} When the pattern is empty or ffmpeg is unavailable
 */
export async function generateSilenceAudio(
  dir: string,
  options: GenerateSilenceAudioOptions,
): Promise<string> {
  assertPattern(options.pattern);
  const binary = await requiredFfmpeg();
  const encoded = AUDIO_OUTPUTS[options.format ?? 'aac'];
  const output = path.join(
    dir,
    options.fileName ?? `${DEFAULT_AUDIO_STEM}${encoded.extension}`,
  );
  const args: string[] = [];
  for (const piece of options.pattern) {
    args.push(...pieceArgs(piece));
  }
  args.push(
    '-filter_complex',
    concatAudioFilter(options.pattern.length, 0),
    '-map',
    '[a]',
    '-c:a',
    encoded.codec,
    output,
  );
  await runProcess(binary, args, {
    kind: 'ffmpeg',
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return output;
}

/**
 * Generate an H.264 clip whose picture is `testsrc2` and whose sound follows the pattern.
 *
 * The picture lasts as long as the joined stretches.
 *
 * @param dir - Directory that receives the file
 * @param options - Stretch pattern, frame size, and optional name
 * @returns Absolute path of the written file
 * @throws {Error} When the pattern is empty or ffmpeg is unavailable
 */
export async function generateSilenceVideo(
  dir: string,
  options: GenerateSilenceVideoOptions,
): Promise<string> {
  assertPattern(options.pattern);
  const binary = await requiredFfmpeg();
  const width = options.width ?? DEFAULT_VIDEO_WIDTH;
  const height = options.height ?? DEFAULT_VIDEO_HEIGHT;
  const totalSeconds = patternSeconds(options.pattern);
  const output = path.join(dir, options.fileName ?? DEFAULT_VIDEO_NAME);
  const args = [
    '-f',
    'lavfi',
    '-i',
    videoSource(width, height, totalSeconds),
  ];
  for (const piece of options.pattern) {
    args.push(...pieceArgs(piece));
  }
  args.push(
    '-filter_complex',
    concatAudioFilter(options.pattern.length, 1),
    '-map',
    '0:v',
    '-map',
    '[a]',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    output,
  );
  await runProcess(binary, args, {
    kind: 'ffmpeg',
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return output;
}

/**
 * Format seconds as a SubRip timestamp, `HH:MM:SS,mmm`.
 *
 * @param seconds - Time in seconds, rounded to milliseconds
 * @returns The timestamp text
 */
export function formatSrtTime(seconds: number): string {
  const totalMs = Math.round(seconds * 1000);
  const milliseconds = totalMs % 1000;
  const totalSeconds = (totalMs - milliseconds) / 1000;
  const secondsPart = totalSeconds % 60;
  const totalMinutes = (totalSeconds - secondsPart) / 60;
  const minutesPart = totalMinutes % 60;
  const hoursPart = (totalMinutes - minutesPart) / 60;
  return `${padNumber(hoursPart, 2)}:${padNumber(minutesPart, 2)}`
    + `:${padNumber(secondsPart, 2)},${padNumber(milliseconds, 3)}`;
}

/**
 * Write a SubRip file from cues, numbering them from one.
 *
 * @param dir - Directory that receives the file
 * @param fileName - Name of the subtitle file
 * @param cues - Cues with their times in seconds
 * @returns Absolute path of the written file
 * @throws {Error} When the file cannot be written
 */
export function writeSubRip(
  dir: string,
  fileName: string,
  cues: readonly SubRipCue[],
): string {
  const filePath = path.join(dir, fileName);
  const blocks: string[] = [];
  for (const [index, cue] of cues.entries()) {
    const timing = `${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}`;
    blocks.push(`${index + 1}\n${timing}\n${cue.text}\n\n`);
  }
  writeFileSync(filePath, blocks.join(''), 'utf8');
  return filePath;
}

/**
 * Copy one fixture into a folder under the test root.
 *
 * Tool inputs must sit under the allowed root, so a test copies the fixture
 * before it calls a tool.
 *
 * @param name - File name inside `tests/fixtures`
 * @param dir - Directory that receives the copy
 * @param targetName - Name of the copy. Defaults to the fixture name
 * @returns Absolute path of the copy
 * @throws {Error} When the fixture is missing or the copy fails
 */
export function copyFixture(name: string, dir: string, targetName?: string): string {
  const target = path.join(dir, targetName ?? name);
  copyFileSync(fixturePath(name), target);
  return target;
}

/**
 * Generate a PNG with an opaque red square on a transparent background.
 *
 * @param dir - Directory that receives the file
 * @param options - Size and optional name
 * @returns Absolute path of the written file
 * @throws {Error} When the image cannot be written
 */
export async function generateOverlayPng(
  dir: string,
  options: GenerateOverlayPngOptions,
): Promise<string> {
  const output = path.join(dir, options.fileName ?? DEFAULT_OVERLAY_NAME);
  const square = Math.max(1, Math.floor(Math.min(options.width, options.height) / 2));
  const left = Math.floor((options.width - square) / 2);
  const top = Math.floor((options.height - square) / 2);
  const squareImage = await sharp({
    create: {
      width: square,
      height: square,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  }).png().toBuffer();
  await sharp({
    create: {
      width: options.width,
      height: options.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: squareImage, left, top }])
    .png()
    .toFile(output);
  return output;
}

/**
 * Average luma of one frame, read as raw gray bytes.
 *
 * @param videoPath - Video file to sample
 * @param atSeconds - Time of the frame to read
 * @returns Average byte value from 0 to 255
 * @throws {Error} When ffmpeg is unavailable, fails, or returns no bytes
 */
export async function meanLuma(videoPath: string, atSeconds: number): Promise<number> {
  const bytes = await frameBytes(videoPath, atSeconds, [
    '-f',
    'rawvideo',
    '-pix_fmt',
    'gray',
    '-',
  ]);
  return averageOf(bytes);
}

/**
 * Average RGB colour of one frame region, read as raw rgb24 bytes.
 *
 * @param videoPath - Video file to sample
 * @param atSeconds - Time of the frame to read
 * @param region - Pixel region to crop before averaging
 * @returns Per-channel averages from 0 to 255
 * @throws {Error} When ffmpeg is unavailable, fails, or returns no full pixels
 */
export async function meanColor(
  videoPath: string,
  atSeconds: number,
  region: FrameRegion,
): Promise<RgbAverage> {
  const crop = `crop=${region.width}:${region.height}:${region.x}:${region.y}`;
  const bytes = await frameBytes(videoPath, atSeconds, [
    '-vf',
    crop,
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgb24',
    '-',
  ]);
  const pixelCount = Math.floor(bytes.length / 3);
  if (pixelCount === 0) {
    throw new Error('ffmpeg frame read returned no complete pixels');
  }
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let index = 0; index < pixelCount; index += 1) {
    red += bytes[index * 3] ?? 0;
    green += bytes[index * 3 + 1] ?? 0;
    blue += bytes[index * 3 + 2] ?? 0;
  }
  return { r: red / pixelCount, g: green / pixelCount, b: blue / pixelCount };
}
