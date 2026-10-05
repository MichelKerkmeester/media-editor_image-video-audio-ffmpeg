// ───────────────────────────────────────────────────────────────────
// MODULE: Broken Media Test Helpers
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { resolveTestBinary } from './media.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Result of one synchronous ffmpeg run. */
interface FfmpegRun {
  /** Exit status, or null when a signal ended the child. */
  readonly status: number | null;

  /** Raw stdout bytes, for a recipe that muxes to `pipe:1`. */
  readonly stdout: Buffer;

  /** Decoded stderr text. */
  readonly stderr: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const PROCESS_TIMEOUT_MS = 60000;

/** Room for a multi-megabyte muxed recording on stdout. */
const MAX_BUFFER_BYTES = 128 * 1024 * 1024;

const CLIP_WIDTH = 320;
const CLIP_HEIGHT = 240;
const CLIP_RATE = 25;
const CLIP_SECONDS = 4;
const SHORT_SECONDS = 2;
const SINE_FREQUENCY_HZ = 440;
const KEEP_FRACTION = 0.6;

const DEFAULT_UNINDEXED_NAME = 'unindexed.mkv';
const DEFAULT_CUT_NAME = 'cut.mp4';
const DEFAULT_INDEXLESS_NAME = 'indexless.mp4';
const DEFAULT_MISLABELED_NAME = 'mislabeled.mp4';
const DEFAULT_CUT_AUDIO_NAME = 'cut.m4a';
const DEFAULT_EMPTY_NAME = 'empty.mp4';
const DEFAULT_COVER_ART_NAME = 'cover-art.mp3';
const COVER_SIZE = '64x64';

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

function videoSource(width: number, height: number, seconds: number): string {
  return `testsrc2=size=${width}x${height}:rate=${CLIP_RATE}:duration=${seconds}`;
}

function sineSource(seconds: number): string {
  return `sine=frequency=${SINE_FREQUENCY_HZ}:duration=${seconds}`;
}

function runFfmpeg(binary: string, args: readonly string[]): FfmpegRun {
  const run = spawnSync(binary, [...args], {
    maxBuffer: MAX_BUFFER_BYTES,
    timeout: PROCESS_TIMEOUT_MS,
  });
  if (run.error !== undefined) {
    throw new Error(`ffmpeg failed to start: ${run.error.message}`);
  }
  return {
    status: run.status,
    stdout: run.stdout,
    stderr: run.stderr.toString('utf8'),
  };
}

function requireSuccess(run: FfmpegRun, label: string): void {
  if (run.status === 0) {
    return;
  }
  const detail = run.stderr.trim();
  throw new Error(`${label} failed with exit status ${String(run.status)}: ${detail}`);
}

function trimmedCopy(source: string, output: string): void {
  const bytes = readFileSync(source);
  const keep = Math.floor(bytes.length * KEEP_FRACTION);
  writeFileSync(output, bytes.subarray(0, keep));
}

/** A hidden sibling path that keeps the output extension for format inference. */
function tempSiblingPath(output: string): string {
  const parsed = path.parse(output);
  return path.join(parsed.dir, `.${parsed.name}-encode${parsed.ext}`);
}

function videoClipArgs(output: string, movflags: readonly string[]): string[] {
  return [
    '-f',
    'lavfi',
    '-i',
    videoSource(CLIP_WIDTH, CLIP_HEIGHT, CLIP_SECONDS),
    '-f',
    'lavfi',
    '-i',
    sineSource(CLIP_SECONDS),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    ...movflags,
    output,
  ];
}

async function encodeTrimmedVideo(
  output: string,
  movflags: readonly string[],
): Promise<void> {
  const binary = await requiredFfmpeg();
  const temp = tempSiblingPath(output);
  try {
    const run = runFfmpeg(binary, videoClipArgs(temp, movflags));
    requireSuccess(run, 'Clip encode');
    trimmedCopy(temp, output);
  } finally {
    rmSync(temp, { force: true });
  }
}

function countNonEmptyLines(text: string): number {
  let count = 0;
  for (const line of text.split('\n')) {
    if (line.trim().length > 0) {
      count += 1;
    }
  }
  return count;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Write a Matroska recording with no duration and no index.
 *
 * The clip is muxed to a pipe, so the header is written before the
 * payload ends and ffprobe reports `duration=N/A`, the shape a crashed
 * or still-running capture leaves behind.
 *
 * @param dir - Directory that receives the file
 * @param name - File name. Defaults to `unindexed.mkv`
 * @returns Absolute path of the written file
 * @throws {Error} When ffmpeg is unavailable or the encode fails
 */
export async function generateUnindexedMatroska(
  dir: string,
  name?: string,
): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, name ?? DEFAULT_UNINDEXED_NAME);
  const run = runFfmpeg(binary, [
    '-f',
    'lavfi',
    '-i',
    videoSource(CLIP_WIDTH, CLIP_HEIGHT, CLIP_SECONDS),
    '-f',
    'lavfi',
    '-i',
    sineSource(CLIP_SECONDS),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-shortest',
    '-f',
    'matroska',
    'pipe:1',
  ]);
  requireSuccess(run, 'Recording encode');
  writeFileSync(output, run.stdout);
  return output;
}

/**
 * Write an MP4 whose index is at the front and whose payload is cut short.
 *
 * The encode runs with faststart into a temporary sibling, then the last
 * 40 percent of its bytes is dropped. ffprobe still reads the header, and
 * a decode reports errors.
 *
 * @param dir - Directory that receives the file
 * @param name - File name. Defaults to `cut.mp4`
 * @returns Absolute path of the written file
 * @throws {Error} When ffmpeg is unavailable or the encode fails
 */
export async function generateCutMp4(dir: string, name?: string): Promise<string> {
  const output = path.join(dir, name ?? DEFAULT_CUT_NAME);
  await encodeTrimmedVideo(output, ['-movflags', '+faststart']);
  return output;
}

/**
 * Write an MP4 cut before its index was written.
 *
 * The header goes at the end without faststart, and the last 40 percent
 * of the bytes is dropped, so ffprobe cannot find the index at all.
 *
 * @param dir - Directory that receives the file
 * @param name - File name. Defaults to `indexless.mp4`
 * @returns Absolute path of the written file
 * @throws {Error} When ffmpeg is unavailable or the encode fails
 */
export async function generateIndexlessMp4(
  dir: string,
  name?: string,
): Promise<string> {
  const output = path.join(dir, name ?? DEFAULT_INDEXLESS_NAME);
  await encodeTrimmedVideo(output, []);
  return output;
}

/**
 * Write a Matroska file with PCM audio that is named `.mp4`.
 *
 * The extension lies about the container, and PCM audio has no MP4 tag,
 * so a stream copy of the file into an MP4 container fails.
 *
 * @param dir - Directory that receives the file
 * @param name - File name. Defaults to `mislabeled.mp4`
 * @returns Absolute path of the written file
 * @throws {Error} When ffmpeg is unavailable or the encode fails
 */
export async function generateMislabeledMatroska(
  dir: string,
  name?: string,
): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, name ?? DEFAULT_MISLABELED_NAME);
  const run = runFfmpeg(binary, [
    '-f',
    'lavfi',
    '-i',
    videoSource(CLIP_WIDTH, CLIP_HEIGHT, SHORT_SECONDS),
    '-f',
    'lavfi',
    '-i',
    sineSource(SHORT_SECONDS),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'pcm_s16le',
    '-shortest',
    '-f',
    'matroska',
    output,
  ]);
  requireSuccess(run, 'Mislabeled encode');
  return output;
}

/**
 * Write an M4A AAC file whose payload is cut short.
 *
 * The encode runs with faststart into a temporary sibling, then the last
 * 40 percent of its bytes is dropped, so the header is readable but a
 * decode reports errors.
 *
 * @param dir - Directory that receives the file
 * @param name - File name. Defaults to `cut.m4a`
 * @returns Absolute path of the written file
 * @throws {Error} When ffmpeg is unavailable or the encode fails
 */
export async function generateCutAudio(dir: string, name?: string): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, name ?? DEFAULT_CUT_AUDIO_NAME);
  const temp = tempSiblingPath(output);
  try {
    const run = runFfmpeg(binary, [
      '-f',
      'lavfi',
      '-i',
      sineSource(CLIP_SECONDS),
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      temp,
    ]);
    requireSuccess(run, 'Audio encode');
    trimmedCopy(temp, output);
  } finally {
    rmSync(temp, { force: true });
  }
  return output;
}

/**
 * Write an MP3 whose ID3 tag carries album art.
 *
 * ffprobe lists the picture as a video stream flagged `attached_pic`, and a
 * plain AAC re-encode into M4A fails, because ffmpeg maps the picture too.
 * The tone and the picture are made in two steps, since a one-frame limit on
 * the picture would end the whole output after that frame.
 *
 * @param dir - Directory that receives the file
 * @param name - File name. Defaults to `cover-art.mp3`
 * @returns Absolute path of the written file
 * @throws {Error} When ffmpeg is unavailable or an encode fails
 */
export async function generateCoverArtAudio(dir: string, name?: string): Promise<string> {
  const binary = await requiredFfmpeg();
  const output = path.join(dir, name ?? DEFAULT_COVER_ART_NAME);
  const tone = tempSiblingPath(output);
  const cover = tempSiblingPath(path.join(dir, `${path.parse(output).name}.png`));
  try {
    const toneArgs = ['-f', 'lavfi', '-i', sineSource(CLIP_SECONDS), '-c:a', 'libmp3lame', tone];
    requireSuccess(runFfmpeg(binary, toneArgs), 'Tone encode');
    requireSuccess(
      runFfmpeg(binary, [
        '-f',
        'lavfi',
        '-i',
        `color=c=red:size=${COVER_SIZE}`,
        '-frames:v',
        '1',
        cover,
      ]),
      'Cover encode',
    );
    requireSuccess(
      runFfmpeg(binary, [
        '-i',
        tone,
        '-i',
        cover,
        '-map',
        '0:a',
        '-map',
        '1:v',
        '-c:a',
        'copy',
        '-c:v',
        'mjpeg',
        '-disposition:v:0',
        'attached_pic',
        '-id3v2_version',
        '3',
        output,
      ]),
      'Cover mux',
    );
  } finally {
    rmSync(tone, { force: true });
    rmSync(cover, { force: true });
  }
  return output;
}

/**
 * Write a zero byte file.
 *
 * @param dir - Directory that receives the file
 * @param name - File name. Defaults to `empty.mp4`
 * @returns Absolute path of the written file
 * @throws {Error} When the file cannot be written
 */
export function generateEmptyFile(dir: string, name?: string): string {
  const output = path.join(dir, name ?? DEFAULT_EMPTY_NAME);
  writeFileSync(output, Buffer.alloc(0));
  return output;
}

/**
 * Count the error lines ffmpeg prints while decoding a file.
 *
 * A clean clip prints none. A damaged payload prints at least one.
 *
 * @param ffmpegPath - Absolute path of the ffmpeg binary to run
 * @param file - Media file to decode
 * @returns Number of non-empty stderr lines
 * @throws {Error} When the child cannot be started
 */
export function decodeErrorLines(ffmpegPath: string, file: string): number {
  const run = spawnSync(ffmpegPath, ['-v', 'error', '-i', file, '-f', 'null', '-'], {
    maxBuffer: MAX_BUFFER_BYTES,
    timeout: PROCESS_TIMEOUT_MS,
  });
  if (run.error !== undefined) {
    throw new Error(`ffmpeg failed to start: ${run.error.message}`);
  }
  return countNonEmptyLines(run.stderr.toString('utf8'));
}
