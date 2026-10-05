// ───────────────────────────────────────────────────────────────────
// MODULE: Stderr Logger Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { expect, it } from 'vitest';

import { shouldLog, writeLog } from '../../src/core/logger.js';

import type { LogLevel } from '../../src/core/config.js';
import type { LogSink } from '../../src/core/logger.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ShouldLogCase {
  readonly configured: LogLevel;
  readonly level: LogLevel;
  readonly allowed: boolean;
}

interface Recording {
  readonly sink: LogSink;
  readonly chunks: string[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const LOG_LEVELS: readonly LogLevel[] = ['error', 'warn', 'info', 'debug'];

const SHOULD_LOG_CASES: readonly ShouldLogCase[] = [
  { configured: 'error', level: 'error', allowed: true },
  { configured: 'error', level: 'warn', allowed: false },
  { configured: 'error', level: 'info', allowed: false },
  { configured: 'error', level: 'debug', allowed: false },
  { configured: 'warn', level: 'error', allowed: true },
  { configured: 'warn', level: 'warn', allowed: true },
  { configured: 'warn', level: 'info', allowed: false },
  { configured: 'warn', level: 'debug', allowed: false },
  { configured: 'info', level: 'error', allowed: true },
  { configured: 'info', level: 'warn', allowed: true },
  { configured: 'info', level: 'info', allowed: true },
  { configured: 'info', level: 'debug', allowed: false },
  { configured: 'debug', level: 'error', allowed: true },
  { configured: 'debug', level: 'warn', allowed: true },
  { configured: 'debug', level: 'info', allowed: true },
  { configured: 'debug', level: 'debug', allowed: true },
];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function recordingSink(): Recording {
  const chunks: string[] = [];
  const sink: LogSink = {
    write(chunk: string): boolean {
      chunks.push(chunk);
      return true;
    },
  };
  return { sink, chunks };
}

function pairKey(row: ShouldLogCase): string {
  return `${row.configured}:${row.level}`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('covers every configured and message level once', (): void => {
  const keys = SHOULD_LOG_CASES.map(pairKey);
  expect(keys).toHaveLength(LOG_LEVELS.length * LOG_LEVELS.length);
  expect(new Set(keys).size).toBe(keys.length);
  for (const configured of LOG_LEVELS) {
    for (const level of LOG_LEVELS) {
      expect(keys).toContain(`${configured}:${level}`);
    }
  }
});

it.each(SHOULD_LOG_CASES)(
  'configured $configured allows $level: $allowed',
  (row: ShouldLogCase): void => {
    expect(shouldLog(row.configured, row.level)).toBe(row.allowed);
  },
);

it('writes the level line when the level is allowed', (): void => {
  const recording = recordingSink();
  writeLog('info', 'warn', 'disk is slow', recording.sink);
  expect(recording.chunks).toEqual(['[media-editor] warn: disk is slow\n']);
});

it('writes nothing when the level is suppressed', (): void => {
  const recording = recordingSink();
  writeLog('warn', 'info', 'started', recording.sink);
  expect(recording.chunks).toEqual([]);
});

it('turns a line break into one line', (): void => {
  const recording = recordingSink();
  writeLog('error', 'error', 'first\nsecond', recording.sink);
  expect(recording.chunks).toEqual(['[media-editor] error: first second\n']);
});
