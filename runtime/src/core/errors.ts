// ───────────────────────────────────────────────────────────────────
// MODULE: Media Errors
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/**
 * Fixed failure codes. The key and the value are the same string.
 */
export const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  PATH_NOT_ALLOWED: 'PATH_NOT_ALLOWED',
  CONFIG_MISSING: 'CONFIG_MISSING',
  INPUT_NOT_FOUND: 'INPUT_NOT_FOUND',
  OUTPUT_EXISTS: 'OUTPUT_EXISTS',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  FFMPEG_NOT_FOUND: 'FFMPEG_NOT_FOUND',
  FFPROBE_NOT_FOUND: 'FFPROBE_NOT_FOUND',
  CAPABILITY_MISSING: 'CAPABILITY_MISSING',
  PROCESS_FAILED: 'PROCESS_FAILED',
  PROCESS_TIMEOUT: 'PROCESS_TIMEOUT',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  CHECKSUM_MISMATCH: 'CHECKSUM_MISMATCH',
  INTERNAL: 'INTERNAL',
} as const;

/** One code from {@link ERROR_CODES}. */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Message text safe to store on a failure. Objects are dropped so a stack
 * or a nested value cannot ride along in details.
 */
function causeText(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (
    typeof error === 'number'
    || typeof error === 'boolean'
    || typeof error === 'bigint'
  ) {
    return String(error);
  }
  return '';
}

function internalMessage(tool: string | undefined): string {
  if (tool === undefined) {
    return 'Unexpected server error.';
  }
  return `Unexpected server error in ${tool}.`;
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Failure raised by a tool handler, carrying one code from the fixed list.
 */
export class MediaError extends Error {
  /** Failure code from the fixed list. */
  readonly code: ErrorCode;

  /** Extra fields for this failure. Empty when the code has nothing to add. */
  readonly details: Record<string, unknown>;

  /**
   * Create a tool failure.
   *
   * @param code - One code from the fixed list
   * @param message - One sentence for the caller
   * @param details - Extra fields for this code; empty when there are none
   */
  constructor(
    code: ErrorCode,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'MediaError';
    this.code = code;
    this.details = details;
    // new.target keeps a subclass on its own prototype instead of this class.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Report whether a value is a {@link MediaError}.
 *
 * @param value - Any thrown or returned value
 * @returns True when the value is a MediaError
 */
export function isMediaError(value: unknown): value is MediaError {
  return value instanceof MediaError;
}

/**
 * Return a MediaError. An existing MediaError is returned unchanged.
 *
 * Any other value becomes an internal failure. `cause` is message text
 * only, and `tool` is included only when the caller passed one.
 *
 * @param error - The thrown or returned value
 * @param tool - Tool name, stored in details only when provided
 * @returns The original MediaError, or a new internal MediaError
 */
export function toMediaError(error: unknown, tool?: string): MediaError {
  if (isMediaError(error)) {
    return error;
  }

  const details: Record<string, unknown> = {};
  if (tool !== undefined) {
    details.tool = tool;
  }
  details.cause = causeText(error);
  return new MediaError(ERROR_CODES.INTERNAL, internalMessage(tool), details);
}

/**
 * Read the `code` a Node.js system error carries, such as `EEXIST`.
 *
 * @param error - Any thrown value
 * @returns The code, or undefined when the value carries no string code
 */
export function nodeErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = error.code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code;
}
