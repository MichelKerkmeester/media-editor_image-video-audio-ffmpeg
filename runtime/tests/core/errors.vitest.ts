// ───────────────────────────────────────────────────────────────────
// MODULE: Media Error Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { expect, it } from 'vitest';

import {
  ERROR_CODES,
  MediaError,
  isMediaError,
  toMediaError,
} from '../../src/core/errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const FIXED_ERROR_CODES = [
  'INVALID_INPUT',
  'PATH_NOT_ALLOWED',
  'CONFIG_MISSING',
  'INPUT_NOT_FOUND',
  'OUTPUT_EXISTS',
  'UNSUPPORTED_FORMAT',
  'FFMPEG_NOT_FOUND',
  'FFPROBE_NOT_FOUND',
  'CAPABILITY_MISSING',
  'PROCESS_FAILED',
  'PROCESS_TIMEOUT',
  'CONSENT_REQUIRED',
  'DOWNLOAD_FAILED',
  'CHECKSUM_MISMATCH',
  'INTERNAL',
] as const;

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('lists the fixed codes with each value equal to its key', (): void => {
  expect(Object.keys(ERROR_CODES)).toHaveLength(15);
  expect(Object.keys(ERROR_CODES).sort()).toEqual([...FIXED_ERROR_CODES].sort());
  for (const code of FIXED_ERROR_CODES) {
    expect(ERROR_CODES[code]).toBe(code);
  }
});

it('is an Error and stores the code and details', (): void => {
  const message = 'Input file not found.';
  const details = { path: '/media/clips/intro.mp4', role: 'input' };
  const error = new MediaError(ERROR_CODES.INPUT_NOT_FOUND, message, details);

  expect(error).toBeInstanceOf(MediaError);
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe('MediaError');
  expect(error.code).toBe(ERROR_CODES.INPUT_NOT_FOUND);
  expect(error.message).toBe(message);
  expect(error.details).toBe(details);

  const first = new MediaError(ERROR_CODES.INTERNAL, 'Unexpected server error.');
  const second = new MediaError(ERROR_CODES.INTERNAL, 'Unexpected server error.');
  expect(first.details).toEqual({});
  expect(second.details).toEqual({});
  expect(first.details).not.toBe(second.details);
});

it('returns the same MediaError instance', (): void => {
  const original = new MediaError(
    ERROR_CODES.PATH_NOT_ALLOWED,
    'Path is outside the allowed roots.',
  );

  expect(toMediaError(original)).toBe(original);
  expect(toMediaError(original, 'video_trim')).toBe(original);
  expect(isMediaError(original)).toBe(true);
  expect(isMediaError(new Error('disk full'))).toBe(false);
  expect(isMediaError('disk full')).toBe(false);
  expect(isMediaError(undefined)).toBe(false);
});

it('wraps other values as an internal error without a stack', (): void => {
  const plain = new Error('disk full');
  const stack = 'Error: disk full\n    at readInput (runner.js:10:4)';
  plain.stack = stack;

  const wrappedError = toMediaError(plain, 'media_probe');
  expect(wrappedError).toBeInstanceOf(MediaError);
  expect(wrappedError).toBeInstanceOf(Error);
  expect(wrappedError).not.toBe(plain);
  expect(wrappedError.code).toBe(ERROR_CODES.INTERNAL);
  expect(wrappedError.details).toEqual({
    tool: 'media_probe',
    cause: 'disk full',
  });
  expect(JSON.stringify(wrappedError.details)).not.toContain(stack);
  expect(JSON.stringify(wrappedError.details)).not.toContain('runner.js');

  const wrappedString = toMediaError('missing frame');
  expect(wrappedString.code).toBe(ERROR_CODES.INTERNAL);
  expect(wrappedString.details).toEqual({ cause: 'missing frame' });
  expect(Object.hasOwn(wrappedString.details, 'tool')).toBe(false);

  const wrappedMissing = toMediaError(undefined);
  expect(wrappedMissing.code).toBe(ERROR_CODES.INTERNAL);
  expect(wrappedMissing.details).toEqual({ cause: '' });
  expect(Object.hasOwn(wrappedMissing.details, 'tool')).toBe(false);
  expect(Object.hasOwn(wrappedMissing.details, 'stack')).toBe(false);

  const box = { message: 'hidden', stack: 'at boom (app.ts:2:2)' };
  const wrappedBox = toMediaError(box);
  expect(typeof wrappedBox.details.cause).toBe('string');
  expect(wrappedBox.details.cause).not.toBe(box);
  expect(JSON.stringify(wrappedBox.details)).not.toContain('app.ts');
  expect(JSON.stringify(wrappedBox.details)).not.toContain('hidden');
});
