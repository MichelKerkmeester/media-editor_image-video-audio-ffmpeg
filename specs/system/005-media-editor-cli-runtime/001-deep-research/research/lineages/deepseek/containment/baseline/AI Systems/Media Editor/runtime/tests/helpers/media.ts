// ───────────────────────────────────────────────────────────────────
// MODULE: Media Test Helpers
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

import sharp from 'sharp';

import { lookupBinary } from '../../src/core/ffmpeg-resolver.js';
import { runProcess } from '../../src/core/process-runner.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Options for a generated video clip. */
export interface GenerateVideoOptions {
  /** Clip length in seconds. */
  readonly seconds: number;

  /** Frame width in pixels. Must be an even integer. */
  readonly width: number;

  /** Frame height in pixels. Must be an even integer. */
  readonly height: number;

  /** When true, add a 440 Hz sine track. */
  readonly withAudio?: boolean;

  /** Output file name. Defaults to `generated.mp4`. */
  readonly fileName?: string;
}

/** Options for a generated audio file. */
export interface GenerateAudioOptions {
  /** Clip length in seconds. */
  readonly seconds: number;

  /** Container family. `aac` is written as `.m4a`. */
  readonly format: 'wav' | 'mp3' | 'aac' | 'flac';

  /** Output file name. Defaults to `generated` plus the format extension. */
  readonly fileName?: string;
}

/** Options for a generated still image. */
export interface GenerateImageOptions {
  /** Image width in pixels. */
  readonly width: number;

  /** Image height in pixels. */
  readonly height: number;

  /** Encoded format. JPEG is written as `.jpg`. */
  readonly format: 'png' | 'jpeg' | 'webp';

  /** Output file name. Defaults to `generated` plus the format extension. */
  readonly fileName?: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = path.resolve(MODULE_DIR, '..');
const FIXTURES_DIR = path.join(TESTS_DIR, 'fixtures');
const TMP_ROOT = path.join(TESTS_DIR, '.tmp');
const PROCESS_TIMEOUT_MS = 60000;

// Never created, so an installed copy cannot satisfy the lookup.
const ABSENT_DATA_DIR = path.join(tmpdir(), 'media-editor-mcp-absent-data');

const AUDIO_OUTPUTS = {
  wav: { codec: 'pcm_s16le', extension: '.wav' },
  mp3: { codec: 'libmp3lame', extension: '.mp3' },
  aac: { codec: 'aac', extension: '.m4a' },
  flac: { codec: 'flac', extension: '.flac' },
} as const;

const IMAGE_EXTENSIONS = {
  png: '.png',
  jpeg: '.jpg',
  webp: '.webp',
} as const;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** Edge length whose square is above the image pixel limit. */
const OVERSIZED_PNG_EDGE = 20000;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isInsideDirectory(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative.length > 0
    && !relative.startsWith('..')
    && !path.isAbsolute(relative);
}

function isRegularFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function canonicalTarget(dir: string): string {
  try {
    return realpathSync.native(dir);
  } catch {
    // A missing directory has no real path, so the lexical path is checked.
    return path.resolve(dir);
  }
}

function assertEvenDimension(value: number, label: string): void {
  if (!Number.isInteger(value) || value % 2 !== 0) {
    throw new Error(`${label} must be an even integer.`);
  }
}

function videoSource(width: number, height: number, seconds: number): string {
  return `testsrc2=size=${width}x${height}:rate=25:duration=${seconds}`;
}

function sineSource(seconds: number): string {
  return `sine=frequency=440:duration=${seconds}`;
}

function outputFile(dir: string, fileName: string): string {
  return path.join(dir, fileName);
}

function crcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = (value & 1) === 1 ? 0xedb88320 : 0;
      value = (value >>> 1) ^ mask;
    }
    table[index] = value;
  }
  return table;
}

const CRC_TABLE = crcTable();

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    const next = CRC_TABLE[(crc ^ byte) & 0xff];
    if (next === undefined) {
      throw new Error('CRC table is missing an entry.');
    }
    crc = (crc >>> 8) ^ next;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type, 'ascii');
  const covered = Buffer.concat([name, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(covered), 0);
  return Buffer.concat([length, name, data, crc]);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Absolute path of one file in the fixtures folder.
 *
 * That folder holds `broll1.mp4`, `broll2.mp4`, `main_video.mp4`,
 * `short_video1.mp4`, `short_video2.mp4`, and `README.md`.
 *
 * @param name - File name inside the fixtures folder
 * @returns Real absolute path of that file
 * @throws {Error} When the name is not an existing file in that folder
 */
export function fixturePath(name: string): string {
  const root = realpathSync.native(FIXTURES_DIR);
  const candidate = path.resolve(root, name);
  if (!isInsideDirectory(root, candidate)) {
    throw new Error(`Fixture does not exist: ${name}`);
  }
  let realFile: string;
  try {
    realFile = realpathSync.native(candidate);
  } catch {
    throw new Error(`Fixture does not exist: ${name}`);
  }
  if (!isInsideDirectory(root, realFile) || !isRegularFile(realFile)) {
    throw new Error(`Fixture does not exist: ${name}`);
  }
  return realFile;
}

/**
 * Create a new directory under `tests/.tmp/`.
 *
 * @param prefix - Leading name for the directory. Defaults to `media-`
 * @returns Real absolute path of the new directory
 * @throws {Error} When the directory cannot be created
 */
export function makeTempDir(prefix?: string): string {
  mkdirSync(TMP_ROOT, { recursive: true });
  const root = realpathSync.native(TMP_ROOT);
  const stem = prefix !== undefined && prefix.length > 0 ? prefix : 'media-';
  const created = mkdtempSync(path.join(root, stem));
  return realpathSync.native(created);
}

/**
 * Delete a directory created under `tests/.tmp/`.
 *
 * @param dir - Directory to remove
 * @throws {Error} When `dir` is not inside `tests/.tmp/`
 */
export function removeTempDir(dir: string): void {
  let root: string;
  try {
    root = realpathSync.native(TMP_ROOT);
  } catch {
    throw new Error('Refusing to remove a path outside tests/.tmp.');
  }
  const target = canonicalTarget(dir);
  if (!isInsideDirectory(root, target)) {
    throw new Error('Refusing to remove a path outside tests/.tmp.');
  }
  rmSync(target, { recursive: true, force: true });
}

/**
 * Resolve ffmpeg or ffprobe with no path overrides.
 *
 * The data directory passed to the lookup is never created, so an installed
 * copy cannot satisfy the call. Nothing usable returns undefined.
 *
 * @param name - Which binary to resolve
 * @returns Absolute path, or undefined when no binary is usable
 */
export async function resolveTestBinary(
  name: 'ffmpeg' | 'ffprobe',
): Promise<string | undefined> {
  const result = await lookupBinary(name, {
    ffmpegPath: undefined,
    ffprobePath: undefined,
    dataDir: ABSENT_DATA_DIR,
  });
  if (!result.found) {
    return undefined;
  }
  return result.binary.path;
}

async function requiredBinary(name: 'ffmpeg' | 'ffprobe'): Promise<string> {
  const binary = await resolveTestBinary(name);
  if (binary === undefined) {
    throw new Error(`${name} is not available`);
  }
  return binary;
}

/**
 * Generate an H.264 clip with `testsrc2`, and a sine track when requested.
 *
 * @param dir - Directory that receives the file
 * @param options - Length, even frame size, and optional audio
 * @returns Absolute path of the written file
 * @throws {Error} When a dimension is not an even integer or ffmpeg is unavailable
 */
export async function generateVideo(
  dir: string,
  options: GenerateVideoOptions,
): Promise<string> {
  assertEvenDimension(options.width, 'Width');
  assertEvenDimension(options.height, 'Height');
  const binary = await requiredBinary('ffmpeg');
  const output = outputFile(dir, options.fileName ?? 'generated.mp4');
  const args = [
    '-f',
    'lavfi',
    '-i',
    videoSource(options.width, options.height, options.seconds),
  ];
  if (options.withAudio === true) {
    args.push('-f', 'lavfi', '-i', sineSource(options.seconds));
  }
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (options.withAudio === true) {
    args.push('-c:a', 'aac');
  }
  args.push(output);
  await runProcess(binary, args, {
    kind: 'ffmpeg',
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return output;
}

/**
 * Generate a sine tone in the requested audio format.
 *
 * @param dir - Directory that receives the file
 * @param options - Length and format
 * @returns Absolute path of the written file
 * @throws {Error} When ffmpeg is unavailable or the encode fails
 */
export async function generateAudio(
  dir: string,
  options: GenerateAudioOptions,
): Promise<string> {
  const binary = await requiredBinary('ffmpeg');
  const encoded = AUDIO_OUTPUTS[options.format];
  const output = outputFile(
    dir,
    options.fileName ?? `generated${encoded.extension}`,
  );
  await runProcess(binary, [
    '-f',
    'lavfi',
    '-i',
    sineSource(options.seconds),
    '-c:a',
    encoded.codec,
    output,
  ], {
    kind: 'ffmpeg',
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return output;
}

/**
 * Generate a solid `#3366cc` image with sharp.
 *
 * @param dir - Directory that receives the file
 * @param options - Size and format
 * @returns Absolute path of the written file
 * @throws {Error} When the image cannot be written
 */
export async function generateImage(
  dir: string,
  options: GenerateImageOptions,
): Promise<string> {
  const output = outputFile(
    dir,
    options.fileName ?? `generated${IMAGE_EXTENSIONS[options.format]}`,
  );
  await sharp({
    create: {
      width: options.width,
      height: options.height,
      channels: 3,
      background: '#3366cc',
    },
  }).toFormat(options.format).toFile(output);
  return output;
}

/**
 * Build a PNG whose header declares more pixels than an image tool allows.
 *
 * The pixel data is an empty deflated stream, so the limit can be tested
 * from the header without decoding a full image.
 *
 * @returns The PNG bytes
 */
export function buildOversizedPng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(OVERSIZED_PNG_EDGE, 0);
  ihdr.writeUInt32BE(OVERSIZED_PNG_EDGE, 4);
  ihdr[8] = 8;
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(Buffer.alloc(0))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Return ffprobe's format and stream JSON for a media file.
 *
 * @param filePath - Media file to inspect
 * @returns Parsed ffprobe JSON
 * @throws {Error} With message `ffprobe is not available` when no ffprobe resolves
 */
export async function probeJson(filePath: string): Promise<unknown> {
  const binary = await resolveTestBinary('ffprobe');
  if (binary === undefined) {
    throw new Error('ffprobe is not available');
  }
  const result = await runProcess(binary, [
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    '-i',
    filePath,
  ], {
    kind: 'ffprobe',
    captureStdout: true,
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return JSON.parse(result.stdout) as unknown;
}
