// ───────────────────────────────────────────────────────────────────
// MODULE: Time Parse Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import {
  formatSeconds,
  isValidTime,
  parseTimeToSeconds,
  requireSeconds,
} from '../../src/core/time-parse.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ValidTime {
  value: number | string;
  seconds: number;
}

interface InvalidTime {
  value: number | string;
}

interface FormattedTime {
  seconds: number;
  text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const VALID_TIMES: readonly ValidTime[] = [
  { value: 0, seconds: 0 },
  { value: 5, seconds: 5 },
  { value: 5.5, seconds: 5.5 },
  { value: '5', seconds: 5 },
  { value: '5.25', seconds: 5.25 },
  { value: '00:00:05', seconds: 5 },
  { value: '00:01:30', seconds: 90 },
  { value: '01:00:00', seconds: 3600 },
  { value: '00:00:05.5', seconds: 5.5 },
  { value: '01:02:03.004', seconds: 3723.004 },
  { value: '1:30', seconds: 90 },
  { value: '90:00', seconds: 5400 },
  { value: ' 12 ', seconds: 12 },
];

const INVALID_TIMES: readonly InvalidTime[] = [
  { value: -1 },
  { value: Number.NaN },
  { value: Number.POSITIVE_INFINITY },
  { value: '30s' },
  { value: '1m' },
  { value: '1e3' },
  { value: '-5' },
  { value: '' },
  { value: '  ' },
  { value: '00:60:00' },
  { value: '00:00:60' },
  { value: '1:2:3:4' },
  { value: '::' },
  { value: '00:00:05.12345' },
  { value: 'abc' },
  { value: '5,5' },
];

const FORMATTED_TIMES: readonly FormattedTime[] = [
  { seconds: 5, text: '5' },
  { seconds: 0.5, text: '0.5' },
  { seconds: 12.3456, text: '12.346' },
  { seconds: 0.0004, text: '0' },
  { seconds: 1e-7, text: '0' },
  { seconds: 3600, text: '3600' },
  { seconds: 1234567.891, text: '1234567.891' },
];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function mediaError(run: () => void): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it.each(VALID_TIMES)(
  'parses $value as $seconds seconds',
  (row: ValidTime): void => {
    expect(parseTimeToSeconds(row.value)).toBe(row.seconds);
    expect(isValidTime(row.value)).toBe(true);
  },
);

it.each(INVALID_TIMES)(
  'rejects $value',
  (row: InvalidTime): void => {
    expect(parseTimeToSeconds(row.value)).toBeUndefined();
    expect(isValidTime(row.value)).toBe(false);
  },
);

it('rejects values that are not a number or a string', (): void => {
  expect(isValidTime(undefined)).toBe(false);
  expect(isValidTime(null)).toBe(false);
  expect(isValidTime(true)).toBe(false);
  expect(isValidTime({ seconds: 1 })).toBe(false);
});

it('returns parsed seconds for a usable time', (): void => {
  expect(requireSeconds('1:30', 'startTime')).toBe(90);
  expect(requireSeconds(5, 'endTime')).toBe(5);
});

it('throws INVALID_INPUT when the time is rejected', (): void => {
  const error = mediaError((): void => {
    requireSeconds('30s', 'startTime');
  });
  expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
  expect(error.details).toEqual({
    parameter: 'startTime',
    value: '30s',
    reason: 'time-format',
  });
});

it.each(FORMATTED_TIMES)(
  'formats $seconds as $text',
  (row: FormattedTime): void => {
    expect(formatSeconds(row.seconds)).toBe(row.text);
  },
);
