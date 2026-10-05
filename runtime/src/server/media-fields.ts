// ───────────────────────────────────────────────────────────────────
// MODULE: Media Fields
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { z } from 'zod';

import { isValidTime } from '../core/time-parse.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A parsed picture size. Width is absent when the caller gave a height only. */
export interface ParsedResolution {
  width?: number;
  height: number;
}

/** A parsed `W:H` ratio. */
export interface ParsedAspectRatio {
  width: number;
  height: number;
}

/** Options for {@link resolutionField}. */
export interface ResolutionFieldOptions {
  /** When true, the literal `preserve` is accepted and means no scaling. */
  allowPreserve?: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/**
 * Bitrate text: a number and a `k` or `M` suffix, such as `192k` or `2M`.
 *
 * A lowercase `m` is milli in ffmpeg, so it is not a suffix here.
 */
export const BITRATE_PATTERN = /^\d+(?:\.\d+)?[kM]$/;

const KILO_BITS = 1000;
const MEGA_BITS = 1_000_000;
const MIN_BITRATE_BITS = KILO_BITS;
const MAX_BITRATE_BITS = 100 * MEGA_BITS;

const MIN_DIMENSION = 1;
const MAX_DIMENSION = 32768;
const WIDTH_HEIGHT_PATTERN = /^(\d{1,5})x(\d{1,5})$/;
const HEIGHT_PATTERN = /^(\d{1,5})$/;

const MIN_ASPECT_SIDE = 1;
const MAX_ASPECT_SIDE = 999;
const ASPECT_RATIO_PATTERN = /^(\d{1,3}):(\d{1,3})$/;

const PADDING_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_PADDING_COLOR = '#000000';

const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 384000;
const MIN_CHANNELS = 1;
const MAX_CHANNELS = 8;
const MAX_FRAME_RATE = 240;

const BITRATE_TEXT = 'Use a bitrate such as 192k or 2M.';
const BITRATE_RANGE = 'Use a bitrate from 1k to 100M.';
const RESOLUTION_TEXT = 'Use a width and height, or a height.';
const ASPECT_TEXT = 'Use a ratio such as 16:9.';
const PADDING_TEXT = 'Use a colour written as #RRGGBB.';
const TIME_TEXT = 'Use a number of seconds or a clock time.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function bitsPerSecond(magnitude: string, multiplier: number): number | undefined {
  const separator = magnitude.indexOf('.');
  const wholeText = separator === -1 ? magnitude : magnitude.slice(0, separator);
  const fractionText = separator === -1 ? '' : magnitude.slice(separator + 1);
  const whole = Number(wholeText);
  const scale = 10 ** fractionText.length;
  const fraction = fractionText.length === 0 ? 0 : Number(fractionText);
  if (
    !Number.isSafeInteger(whole)
    || !Number.isSafeInteger(fraction)
    || !Number.isSafeInteger(scale)
  ) {
    return undefined;
  }
  const wholeBits = whole * multiplier;
  const fractionBits = (fraction * multiplier) / scale;
  if (!Number.isFinite(wholeBits) || !Number.isFinite(fractionBits)) {
    return undefined;
  }
  return wholeBits + fractionBits;
}

function dimension(text: string): number | undefined {
  const value = Number(text);
  if (!Number.isInteger(value) || value < MIN_DIMENSION || value > MAX_DIMENSION) {
    return undefined;
  }
  return value;
}

function side(text: string | undefined): number | undefined {
  if (text === undefined) {
    return undefined;
  }
  const value = Number(text);
  if (!Number.isInteger(value) || value < MIN_ASPECT_SIDE || value > MAX_ASPECT_SIDE) {
    return undefined;
  }
  return value;
}

function acceptsResolution(
  value: string,
  options: ResolutionFieldOptions | undefined,
): boolean {
  if (options?.allowPreserve === true && value === 'preserve') {
    return true;
  }
  return parseResolution(value) !== undefined;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Turn bitrate text into bits per second.
 *
 * `k` is 1000 and `M` is 1000000. Text outside `1k` to `100M` returns undefined.
 *
 * @param value - Caller bitrate text
 * @returns Bits per second, or undefined when the text is not in range
 */
export function parseBitrate(value: string): number | undefined {
  if (!BITRATE_PATTERN.test(value)) {
    return undefined;
  }
  const unit = value.at(-1);
  const magnitude = value.slice(0, -1);
  const multiplier = unit === 'M' ? MEGA_BITS : KILO_BITS;
  const bits = bitsPerSecond(magnitude, multiplier);
  if (bits === undefined || bits < MIN_BITRATE_BITS || bits > MAX_BITRATE_BITS) {
    return undefined;
  }
  return bits;
}

/**
 * A bitrate string from `1k` to `100M`.
 *
 * @param description - Text a caller reads for this field
 * @returns The field schema
 */
export function bitrateField(description: string): z.ZodType<string> {
  return z
    .string()
    .regex(BITRATE_PATTERN, BITRATE_TEXT)
    .refine((value) => parseBitrate(value) !== undefined, BITRATE_RANGE)
    .describe(description);
}

/**
 * A sample rate in hertz, from 8000 to 384000.
 *
 * @param description - Text a caller reads for this field
 * @returns The field schema
 */
export function sampleRateField(description: string): z.ZodType<number> {
  return z
    .number()
    .int()
    .min(MIN_SAMPLE_RATE)
    .max(MAX_SAMPLE_RATE)
    .describe(description);
}

/**
 * A channel count from 1 to 8.
 *
 * @param description - Text a caller reads for this field
 * @returns The field schema
 */
export function channelsField(description: string): z.ZodType<number> {
  return z.number().int().min(MIN_CHANNELS).max(MAX_CHANNELS).describe(description);
}

/**
 * A frame rate greater than 0 and at most 240.
 *
 * @param description - Text a caller reads for this field
 * @returns The field schema
 */
export function frameRateField(description: string): z.ZodType<number> {
  return z.number().gt(0).max(MAX_FRAME_RATE).describe(description);
}

/**
 * Parse a picture size.
 *
 * `1280x720` keeps both sides. `720` is a height, and the width stays even
 * later via `scale=-2`. `preserve` is not a size.
 *
 * @param value - Caller resolution text
 * @returns The size, or undefined when it is not a size in range
 */
export function parseResolution(value: string): ParsedResolution | undefined {
  const pair = WIDTH_HEIGHT_PATTERN.exec(value);
  if (pair !== null) {
    const width = dimension(pair[1] ?? '');
    const height = dimension(pair[2] ?? '');
    if (width === undefined || height === undefined) {
      return undefined;
    }
    return { width, height };
  }
  const heightOnly = HEIGHT_PATTERN.exec(value);
  if (heightOnly === null) {
    return undefined;
  }
  const height = dimension(heightOnly[1] ?? '');
  if (height === undefined) {
    return undefined;
  }
  return { height };
}

/**
 * The ffmpeg scale filter for a parsed size.
 *
 * @param resolution - Size from {@link parseResolution}
 * @returns `scale=<W>:<H>`, or `scale=-2:<H>` when the width was omitted
 */
export function scaleFilter(resolution: ParsedResolution): string {
  if (resolution.width === undefined) {
    return `scale=-2:${resolution.height}`;
  }
  return `scale=${resolution.width}:${resolution.height}`;
}

/**
 * The file-name token for a parsed size.
 *
 * @param resolution - Size from {@link parseResolution}
 * @returns `<W>x<H>`, or `h<H>` when the width was omitted
 */
export function resolutionLabel(resolution: ParsedResolution): string {
  if (resolution.width === undefined) {
    return `h${resolution.height}`;
  }
  return `${resolution.width}x${resolution.height}`;
}

/**
 * A resolution string. `preserve` is accepted only when the option says so.
 *
 * @param description - Text a caller reads for this field
 * @param options - Whether `preserve` is a legal value
 * @returns The field schema
 */
export function resolutionField(
  description: string,
  options?: ResolutionFieldOptions,
): z.ZodType<string> {
  return z
    .string()
    .refine((value) => acceptsResolution(value, options), RESOLUTION_TEXT)
    .describe(description);
}

/**
 * Parse a `W:H` ratio whose sides are 1 to 999.
 *
 * @param value - Caller ratio text
 * @returns The two sides, or undefined when the text is not that ratio
 */
export function parseAspectRatio(value: string): ParsedAspectRatio | undefined {
  const match = ASPECT_RATIO_PATTERN.exec(value);
  if (match === null) {
    return undefined;
  }
  const width = side(match[1]);
  const height = side(match[2]);
  if (width === undefined || height === undefined) {
    return undefined;
  }
  return { width, height };
}

/**
 * A `W:H` aspect ratio whose sides are 1 to 999.
 *
 * @param description - Text a caller reads for this field
 * @returns The field schema
 */
export function aspectRatioField(description: string): z.ZodType<string> {
  return z
    .string()
    .refine((value) => parseAspectRatio(value) !== undefined, ASPECT_TEXT)
    .describe(description);
}

/**
 * A `#RRGGBB` colour. Omitted values become `#000000`.
 *
 * @param description - Text a caller reads for this field
 * @returns The field schema
 */
export function paddingColorField(
  description: string,
): z.ZodType<string, string | undefined> {
  return z
    .string()
    .regex(PADDING_COLOR_PATTERN, PADDING_TEXT)
    .default(DEFAULT_PADDING_COLOR)
    .describe(description);
}

/**
 * A time in seconds, or a clock string that parses as seconds.
 *
 * @param description - Text a caller reads for this field
 * @returns The field schema
 */
export function timeField(description: string): z.ZodType<number | string> {
  return z
    .union([z.number().min(0), z.string()])
    .refine((value) => isValidTime(value), TIME_TEXT)
    .describe(description);
}
