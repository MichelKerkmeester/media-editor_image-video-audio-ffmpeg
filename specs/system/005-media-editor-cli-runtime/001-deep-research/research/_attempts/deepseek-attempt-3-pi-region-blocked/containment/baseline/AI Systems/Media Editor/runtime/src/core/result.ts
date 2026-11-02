// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Results
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync } from 'node:fs';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { toMediaError } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Kind of file an output entry names. */
export type OutputMediaType = 'image' | 'video' | 'audio' | 'playlist' | 'segment';

/**
 * Media fields a read-back found. A field is absent when the read-back
 * did not report it.
 */
export interface OutputReadback {
  /** Seconds the file runs. */
  durationSeconds?: number;

  /** Pixel width of the picture. */
  width?: number;

  /** Pixel height of the picture. */
  height?: number;

  /** Codec name of the primary stream, or the image format. */
  codec?: string;
}

/** One file the caller keeps. */
export interface OutputEntry extends OutputReadback {
  /** Absolute path of the written file. */
  path: string;

  /** Size in bytes, read from the file. */
  bytes: number;

  /** Kind of file this entry names. */
  mediaType: OutputMediaType;
}

/** Inputs for one successful tool result. */
export interface SuccessOptions {
  /** Registered tool name. */
  tool: string;

  /** Summary shown to a text-only client. */
  text: string;

  /** Files the caller keeps, in write order. */
  outputs: readonly OutputEntry[];

  /** Notes that are not failures. Defaults to an empty list. */
  warnings?: readonly string[];

  /** Milliseconds from handler entry to this result. */
  elapsedMs: number;

  /** Tool-specific keys placed beside the common keys. */
  extras?: Readonly<Record<string, unknown>>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const VIDEO_STREAM = 'video';
const AUDIO_STREAM = 'audio';

const COMMON_KEYS: ReadonlySet<string> = new Set([
  'tool',
  'outputs',
  'warnings',
  'elapsedMs',
]);

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return undefined;
  }
  return value;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  return value;
}

function parsedSeconds(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return undefined;
  }
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined;
  }
  return seconds;
}

function oneLine(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, ' ').trim();
}

function wholeElapsedMs(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs)) {
    return 0;
  }
  return Math.max(0, Math.round(elapsedMs));
}

function streamRecords(json: Record<string, unknown>): readonly Record<string, unknown>[] {
  if (!Array.isArray(json.streams)) {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const entry of json.streams) {
    if (isRecord(entry)) {
      records.push(entry);
    }
  }
  return records;
}

function firstByCodecType(
  streams: readonly Record<string, unknown>[],
  codecType: string,
): Record<string, unknown> | undefined {
  for (const stream of streams) {
    if (stream.codec_type === codecType) {
      return stream;
    }
  }
  return undefined;
}

function durationSecondsFromProbe(
  json: Record<string, unknown>,
  primary: Record<string, unknown> | undefined,
): number | undefined {
  // A present duration that does not parse is unusable, so the stream
  // value is not a substitute. Only a missing format duration falls back.
  if (isRecord(json.format) && Object.hasOwn(json.format, 'duration')) {
    return parsedSeconds(json.format.duration);
  }
  if (primary === undefined || !Object.hasOwn(primary, 'duration')) {
    return undefined;
  }
  return parsedSeconds(primary.duration);
}

function readbackFields(
  durationSeconds: number | undefined,
  width: number | undefined,
  height: number | undefined,
  codec: string | undefined,
): OutputReadback {
  const readback: OutputReadback = {};
  if (durationSeconds !== undefined) {
    readback.durationSeconds = durationSeconds;
  }
  if (width !== undefined) {
    readback.width = width;
  }
  if (height !== undefined) {
    readback.height = height;
  }
  if (codec !== undefined) {
    readback.codec = codec;
  }
  return readback;
}

function readbackFromRecord(json: unknown): OutputReadback {
  if (!isRecord(json)) {
    return {};
  }
  const streams = streamRecords(json);
  const video = firstByCodecType(streams, VIDEO_STREAM);
  const primary = video ?? firstByCodecType(streams, AUDIO_STREAM);
  const width = video === undefined ? undefined : positiveInteger(video.width);
  const height = video === undefined ? undefined : positiveInteger(video.height);
  return readbackFields(
    durationSecondsFromProbe(json, primary),
    width,
    height,
    nonEmptyString(primary?.codec_name),
  );
}

function structuredSuccess(options: SuccessOptions): Record<string, unknown> {
  const content: Record<string, unknown> = {
    tool: options.tool,
    outputs: [...options.outputs],
    warnings: options.warnings === undefined ? [] : [...options.warnings],
    elapsedMs: wholeElapsedMs(options.elapsedMs),
  };
  if (options.extras === undefined) {
    return content;
  }
  for (const [key, value] of Object.entries(options.extras)) {
    if (!COMMON_KEYS.has(key)) {
      content[key] = value;
    }
  }
  return content;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Describe one written file from its size and an optional read-back.
 *
 * Finite numeric fields and a non-empty codec are copied. Every other
 * media field is left out.
 *
 * @param filePath - Path of a file that already exists
 * @param mediaType - Kind of file the entry names
 * @param readback - Media fields found after the run
 * @returns The output entry
 * @throws The filesystem error from stat when the path is missing
 */
export function describeOutput(
  filePath: string,
  mediaType: OutputMediaType,
  readback?: OutputReadback,
): OutputEntry {
  const bytes = statSync(filePath).size;
  const entry: OutputEntry = {
    path: filePath,
    bytes,
    mediaType,
  };
  if (readback === undefined) {
    return entry;
  }
  const durationSeconds = finiteNumber(readback.durationSeconds);
  if (durationSeconds !== undefined) {
    entry.durationSeconds = durationSeconds;
  }
  const width = finiteNumber(readback.width);
  if (width !== undefined) {
    entry.width = width;
  }
  const height = finiteNumber(readback.height);
  if (height !== undefined) {
    entry.height = height;
  }
  const codec = nonEmptyString(readback.codec);
  if (codec !== undefined) {
    entry.codec = codec;
  }
  return entry;
}

/**
 * Read duration, picture size and codec from one parsed probe object.
 *
 * Malformed input returns an empty read-back.
 *
 * @param json - Parsed ffprobe JSON, or any other value
 * @returns The media fields the probe actually reported
 */
export function readbackFromProbeJson(json: unknown): OutputReadback {
  try {
    return readbackFromRecord(json);
  } catch {
    return {};
  }
}

/**
 * Build the success result for one tool call.
 *
 * The summary is one line. The four common keys stay ahead of any
 * tool-specific keys, and an extra cannot replace them.
 *
 * @param options - Tool name, summary, outputs and timing
 * @returns The call result, without an error flag
 */
export function successResult(options: SuccessOptions): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: oneLine(options.text),
      },
    ],
    structuredContent: structuredSuccess(options),
  };
}

/**
 * Build the failure result for one thrown or returned value.
 *
 * The text line is the code and the message. Success keys are left out.
 *
 * @param error - The thrown or returned value
 * @param tool - Tool name, stored only when the value is not already a media error
 * @returns The call result with the error flag set
 */
export function errorResult(error: unknown, tool?: string): CallToolResult {
  const mediaError = toMediaError(error, tool);
  const message = mediaError.message;
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: `${mediaError.code}: ${oneLine(message)}`,
      },
    ],
    structuredContent: {
      code: mediaError.code,
      message,
      details: { ...mediaError.details },
    },
  };
}
