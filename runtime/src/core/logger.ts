// ───────────────────────────────────────────────────────────────────
// MODULE: Stderr Logger
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import type { LogLevel } from './config.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A writer that receives one complete log line. */
export interface LogSink {
  write(chunk: string): unknown;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const LEVEL_RANK: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LOG_MARK = '[media-editor]';

const LINE_BREAK_PATTERN = /\r\n|[\r\n]/g;

const STDERR_SINK: LogSink = {
  write(chunk: string): boolean {
    return process.stderr.write(chunk);
  },
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function singleLine(message: string): string {
  return message.replace(LINE_BREAK_PATTERN, ' ');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Report whether a message at `level` is written for the configured level.
 *
 * Severity runs from `error` (most severe) to `debug` (least). A configured
 * level of `warn` therefore writes `error` and `warn` only.
 *
 * @param configured - Level the server was started with
 * @param level - Level of this message
 * @returns True when the message is severe enough to write
 */
export function shouldLog(configured: LogLevel, level: LogLevel): boolean {
  return LEVEL_RANK[level] <= LEVEL_RANK[configured];
}

/**
 * Write one log line when the level is allowed.
 *
 * The line is `[media-editor] <level>: <message>` followed by a newline.
 * Each line break in `message` becomes one space. A suppressed level
 * writes nothing. This function never writes to stdout.
 *
 * @param configured - Level the server was started with
 * @param level - Level of this message
 * @param message - Text to write
 * @param sink - Destination for the line. Defaults to stderr.
 */
export function writeLog(
  configured: LogLevel,
  level: LogLevel,
  message: string,
  sink: LogSink = STDERR_SINK,
): void {
  if (!shouldLog(configured, level)) {
    return;
  }
  sink.write(`${LOG_MARK} ${level}: ${singleLine(message)}\n`);
}
