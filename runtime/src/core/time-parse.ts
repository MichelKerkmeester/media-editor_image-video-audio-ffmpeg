// ───────────────────────────────────────────────────────────────────
// MODULE: Time Parse
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { ERROR_CODES, MediaError } from './errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const PLAIN_SECONDS = /^\d+(?:\.\d+)?$/;

const CLOCK_TIME = /^(?:(\d+):)?(\d+):(\d+)(?:\.(\d{1,3}))?$/;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function finiteSeconds(text: string): number | undefined {
  const seconds = Number(text);
  if (!Number.isFinite(seconds)) {
    return undefined;
  }
  return seconds;
}

function secondsWithFraction(
  whole: string,
  fraction: string | undefined,
): number | undefined {
  const wholeSeconds = Number(whole);
  if (!Number.isFinite(wholeSeconds)) {
    return undefined;
  }
  if (fraction === undefined) {
    return wholeSeconds;
  }
  const fractionSeconds = Number(fraction) / 10 ** fraction.length;
  if (!Number.isFinite(fractionSeconds)) {
    return undefined;
  }
  return wholeSeconds + fractionSeconds;
}

function parseClock(text: string): number | undefined {
  const match = CLOCK_TIME.exec(text);
  if (match === null) {
    return undefined;
  }
  const hourText = match[1];
  const minuteText = match[2];
  const secondText = match[3];
  if (minuteText === undefined || secondText === undefined) {
    return undefined;
  }
  const minutes = Number(minuteText);
  const seconds = secondsWithFraction(secondText, match[4]);
  if (!Number.isFinite(minutes) || seconds === undefined || seconds >= 60) {
    return undefined;
  }
  // Minutes may exceed 59 only when the caller omitted hours.
  if (hourText !== undefined && minutes >= 60) {
    return undefined;
  }
  const hours = hourText === undefined ? 0 : Number(hourText);
  if (!Number.isFinite(hours)) {
    return undefined;
  }
  const total = hours * 3600 + minutes * 60 + seconds;
  if (!Number.isFinite(total)) {
    return undefined;
  }
  return total;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Turn a caller time into seconds before any process argument is built.
 *
 * @param value - A finite number of seconds, or a clock string
 * @returns Seconds, or undefined when the value is not a time
 */
export function parseTimeToSeconds(value: number | string): number | undefined {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return undefined;
    }
    return value;
  }
  const text = value.trim();
  if (PLAIN_SECONDS.test(text)) {
    return finiteSeconds(text);
  }
  return parseClock(text);
}

/**
 * Report whether a value is a time a schema can accept.
 *
 * @param value - Any caller value
 * @returns True when the value parses as seconds
 */
export function isValidTime(value: unknown): value is number | string {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return false;
  }
  return parseTimeToSeconds(value) !== undefined;
}

/**
 * Turn a caller time into seconds, or fail the call.
 *
 * @param value - A finite number of seconds, or a clock string
 * @param parameter - Name of the field that supplied the value
 * @returns Seconds
 * @throws {@link MediaError} `INVALID_INPUT` when the value is not a time
 */
export function requireSeconds(value: number | string, parameter: string): number {
  const seconds = parseTimeToSeconds(value);
  if (seconds === undefined) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      `Time parameter ${parameter} is not a usable time.`,
      { parameter, value, reason: 'time-format' },
    );
  }
  return seconds;
}

/**
 * Format seconds as a plain decimal for a process argument.
 *
 * Rounded to milliseconds, then trailing zeros are removed, so the text
 * never uses exponent notation.
 *
 * @param seconds - A number of seconds
 * @returns Decimal text with no exponent and no trailing zeros
 */
export function formatSeconds(seconds: number): string {
  return seconds.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}
