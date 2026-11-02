// ───────────────────────────────────────────────────────────────────
// MODULE: Filter Escape Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import {
  escapeFilterValue,
  filterSafeFontDir,
  filterSafePath,
  filterSafeSubtitle,
  isFilterSafePath,
  normalizeCallerText,
  quoteFilterValue,
} from '../../src/core/filter-escape.js';
import { makeTempDir, removeTempDir, resolveTestBinary } from '../helpers/media.js';

import type { ResolvedInput } from '../../src/core/path-guard.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One row of the escaping table. */
interface EscapeRow {
  /** Short name for the row. */
  readonly label: string;

  /** Caller text entering the helper. */
  readonly value: string;

  /** Exact text the helper must return. */
  readonly escaped: string;
}

/** One row of the path safety table. */
interface SafePathRow {
  /** Path as the server holds it. */
  readonly filePath: string;

  /** Whether every byte is inside the safe set. */
  readonly safe: boolean;
}

/** What one round-trip run returned. */
interface ProbeOutcome {
  /** Process exit status, or null when the binary never started. */
  readonly status: number | null;

  /** Text values ffmpeg reported, in filter order, once for each graph it built. */
  readonly values: string[];

  /** True when the chain still reached the final scale filter. */
  readonly scaled: boolean;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const ESCAPE_ROWS: readonly EscapeRow[] = [
  { label: 'a backslash', value: '\\', escaped: '\\\\' },
  { label: 'a single quote', value: "'", escaped: "\\'\\''" },
  { label: 'a colon', value: ':', escaped: '\\:' },
  { label: 'a quote inside words', value: "it's a test", escaped: "it\\'\\''s a test" },
  { label: 'a colon inside words', value: 'a:b', escaped: 'a\\:b' },
  {
    label: 'a windows drive path',
    value: 'C:\\clips\\a.srt',
    escaped: 'C\\:\\\\clips\\\\a.srt',
  },
  { label: 'a percent and a comma', value: '50% off, today', escaped: '50% off, today' },
  { label: 'a semicolon', value: 'a;b', escaped: 'a;b' },
  { label: 'brackets', value: '[in]x[out]', escaped: '[in]x[out]' },
  { label: 'an equals sign', value: 'k=v', escaped: 'k=v' },
  { label: 'a leading space', value: ' lead', escaped: '\\ lead' },
  { label: 'a trailing space', value: 'trail ', escaped: 'trail\\ ' },
  { label: 'a leading tab', value: '\ttab', escaped: '\\\ttab' },
  { label: 'a literal backslash and letters', value: '\\ttab', escaped: '\\\\ttab' },
  { label: 'an interior line feed', value: 'line1\nline2', escaped: 'line1\nline2' },
  { label: 'a trailing line feed', value: 'x\n', escaped: 'x\\\n' },
  { label: 'an empty string', value: '', escaped: '' },
  {
    label: 'a graph injection attempt',
    value: "x',scale=1:1,drawtext=text='y",
    escaped: "x\\'\\'',scale=1\\:1,drawtext=text=\\'\\''y",
  },
  { label: 'padding on both edges', value: ' both ', escaped: '\\ both\\ ' },
  { label: 'only white space', value: '  ', escaped: '\\ \\ ' },
];

const SAFE_PATH_ROWS: readonly SafePathRow[] = [
  { filePath: '/Users/me/My Clips/a.srt', safe: true },
  { filePath: 'C:\\clips\\a.srt', safe: true },
  { filePath: "/tmp/it's.srt", safe: false },
  { filePath: '/tmp/100%.srt', safe: false },
  { filePath: '/tmp/a,b.srt', safe: false },
  { filePath: '/tmp/a;b.srt', safe: false },
  { filePath: '/tmp/[a].srt', safe: false },
  { filePath: '/tmp/a=b.srt', safe: false },
  { filePath: '/tmp/café.srt', safe: false },
  { filePath: '', safe: false },
];

const ROUND_TRIP_BATTERY: readonly string[] = [
  'plain text',
  "it's a test",
  'a:b',
  '100% sure',
  'a,b',
  'a;b',
  '[in]x[out]',
  'k=v',
  'back\\slash',
  'C:\\clips\\a.srt',
  "x',scale=1:1,drawtext=text='y",
  'line1\nline2',
  'tab\there',
  '%{localtime}',
  "'; rm -rf /",
  'a\\nb',
  'trailing\\',
  ' lead',
  'trail ',
  ' both ',
  '  ',
  '\nx',
  'x\n',
  'é ü 日本語 😀',
  '"q" $x `y`',
  '\\ ',
  'x\\',
];

const FUZZ_ALPHABET: readonly string[] = [
  '\\', "'", ':', ',', ';', '[', ']', '=', '%',
  ' ', '\t', '\n', '"', '$', '`', 'a', 'b', '日',
  "\\'", "',", "'\\", ';[', '=,',
];

const FONT_PATH = path.resolve(
  fileURLToPath(new URL('../../assets/fonts/SourceSans3-Regular.ttf', import.meta.url)),
);

const FUZZ_SIZE = 200;
const FUZZ_BATCH_SIZE = 20;
const ROUND_TRIP_TIMEOUT_MS = 120_000;

const TEXT_SETTING_PATTERN = new RegExp(
  "Setting 'text' to value '(.*?)'"
    + "\\n\\[AVFilterGraph @ [0-9a-fx]+\\] Setting '(?:expansion|fontfile|x)'",
  'gs',
);

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

/**
 * Return the MediaError a callback threw.
 *
 * @param run - Callback expected to throw a MediaError
 * @returns The thrown MediaError
 * @throws {Error} When the callback throws another value or nothing
 */
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

/**
 * Return the value a rejected promise threw.
 *
 * @param run - Callback expected to reject
 * @returns The thrown value, or undefined when the callback resolved
 */
async function rejectionOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error: unknown) {
    return error;
  }
  return undefined;
}

/**
 * Return the numeric `code` a rejected file operation carries.
 *
 * @param error - Value a rejected promise threw
 * @returns The code when the value is a system error, otherwise undefined
 */
function systemCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = error.code;
  if (typeof code !== 'string') {
    return undefined;
  }
  return code;
}

/**
 * Return the MediaError a rejected promise produced.
 *
 * @param run - Callback expected to reject with a MediaError
 * @returns The thrown MediaError
 * @throws {Error} When the callback throws another value or nothing
 */
async function rejectedMediaError(run: () => Promise<unknown>): Promise<MediaError> {
  const thrown = await rejectionOf(run);
  if (thrown instanceof MediaError) {
    return thrown;
  }
  throw new Error('Expected a MediaError.');
}

/** Accepted subtitle input for one path. */
function subtitleInput(filePath: string): ResolvedInput {
  return { rawPath: filePath, realPath: filePath, role: 'subtitle' };
}

/**
 * Build a seeded generator so the fuzz corpus is the same on every run.
 *
 * @param seed - Starting state
 * @returns A generator of numbers in [0, 1)
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the deterministic fuzz corpus from the alphabet and the seed.
 *
 * @returns The fuzz strings, 1 to 14 picks each
 */
function buildFuzzStrings(): string[] {
  const random = mulberry32(11);
  const strings: string[] = [];
  for (let index = 0; index < FUZZ_SIZE; index += 1) {
    const length = 1 + Math.floor(random() * 14);
    let text = '';
    for (let pick = 0; pick < length; pick += 1) {
      const character = FUZZ_ALPHABET[Math.floor(random() * FUZZ_ALPHABET.length)];
      if (character === undefined) {
        throw new Error('Fuzz alphabet index is out of range.');
      }
      text += character;
    }
    strings.push(text);
  }
  return strings;
}

/**
 * Read the text values ffmpeg reported, in the order the filters ran.
 *
 * @param stderr - Debug output of one run
 * @returns The value each drawtext filter received
 */
function parseTextValues(stderr: string): string[] {
  const values: string[] = [];
  let match = TEXT_SETTING_PATTERN.exec(stderr);
  while (match !== null) {
    const value = match[1];
    if (value !== undefined) {
      values.push(value);
    }
    match = TEXT_SETTING_PATTERN.exec(stderr);
  }
  return values;
}

/**
 * Require every filter graph ffmpeg built to hold the expected values in order.
 *
 * ffmpeg 9 builds the graph twice and logs each value once per build, so the
 * values come in whole runs of the expected list, and each run must equal it.
 *
 * @param values - Values from {@link parseTextValues}
 * @param expected - The caller strings in filter order
 */
function expectEveryGraphHolds(values: readonly string[], expected: readonly string[]): void {
  expect(values.length).toBeGreaterThan(0);
  expect(values.length % expected.length).toBe(0);
  for (let start = 0; start < values.length; start += expected.length) {
    expect(values.slice(start, start + expected.length)).toEqual(expected);
  }
}

/**
 * Build one drawtext filter for a caller string.
 *
 * @param text - Caller text to draw
 * @returns The filter, ready to be joined with the next one
 */
function drawtextFilter(text: string): string {
  return `drawtext=text=${quoteFilterValue(text)}:expansion=none:`
    + `fontfile=${quoteFilterValue(FONT_PATH)}:x=0:y=0:fontsize=12`;
}

/**
 * Run one frame and read back what each drawtext received.
 *
 * @param binary - Absolute ffmpeg path
 * @param texts - Caller strings, one drawtext filter each
 * @returns Exit status, reported text values, and the scale check
 * @throws {Error} When the binary was not resolved before the run
 */
function runProbe(binary: string, texts: readonly string[]): ProbeOutcome {
  if (binary.length === 0) {
    throw new Error('ffmpeg was not resolved before the round trip ran.');
  }
  const filter = `${texts.map(drawtextFilter).join(',')},scale=64:48`;
  const run = spawnSync(
    binary,
    [
      '-hide_banner',
      '-nostdin',
      '-n',
      '-v',
      'debug',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=320x240:d=0.1',
      '-vf',
      filter,
      '-frames:v',
      '1',
      '-f',
      'null',
      '-',
    ],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  const stderr = run.stderr ?? '';
  return {
    status: run.status,
    values: parseTextValues(stderr),
    scaled: stderr.includes(' 64x48') || stderr.includes('scale=64:48'),
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it.each(ESCAPE_ROWS)('escapes $label', (row: EscapeRow): void => {
  expect(escapeFilterValue(row.value)).toBe(row.escaped);
});

it('wraps an escaped value in single quotes', (): void => {
  expect(quoteFilterValue('')).toBe("''");
  expect(quoteFilterValue('plain')).toBe("'plain'");
  expect(quoteFilterValue("it's")).toBe("'it\\'\\''s'");
});

it('turns CRLF and a lone CR into LF', (): void => {
  expect(normalizeCallerText('a\r\nb', 'text')).toBe('a\nb');
  expect(normalizeCallerText('a\rb', 'text')).toBe('a\nb');
});

it('keeps TAB and LF through normalization', (): void => {
  expect(normalizeCallerText('a\tb\nc', 'text')).toBe('a\tb\nc');
});

it.each(['\u0001', '\u001b', '\u007f'])(
  'refuses the control character %j',
  (value: string): void => {
    const error = mediaError((): void => {
      normalizeCallerText(value, 'text');
    });
    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.details).toEqual({
      parameter: 'text',
      value,
      reason: 'control-character',
    });
  },
);

it.each(SAFE_PATH_ROWS)('isFilterSafePath($filePath) is $safe', (row: SafePathRow): void => {
  expect(isFilterSafePath(row.filePath)).toBe(row.safe);
});

describe('filterSafePath', (): void => {
  let tempDir = '';

  beforeAll((): void => {
    tempDir = makeTempDir('filter-escape-');
  });

  afterAll((): void => {
    removeTempDir(tempDir);
  });

  it('returns a safe path unchanged without writing', async (): Promise<void> => {
    const safePath = '/tmp/My Clips/a.srt';
    const before = readdirSync(tempDir);
    const result = await filterSafePath(safePath, tempDir, 'subtitle.srt');
    expect(result).toBe(safePath);
    expect(readdirSync(tempDir)).toEqual(before);
  });

  it('copies a path with a quote and a percent byte', async (): Promise<void> => {
    const source = path.join(tempDir, "it's 100%.srt");
    writeFileSync(source, 'subtitle bytes');
    const target = await filterSafePath(source, tempDir, 'subtitle.srt');
    expect(target).toBe(path.join(tempDir, 'subtitle.srt'));
    expect(readFileSync(target)).toEqual(readFileSync(source));
    expect(readFileSync(source, 'utf8')).toBe('subtitle bytes');
  });

  it('refuses a second copy under the same temp name', async (): Promise<void> => {
    const first = path.join(tempDir, "first's.srt");
    const second = path.join(tempDir, "second's.srt");
    writeFileSync(first, 'first');
    writeFileSync(second, 'second');
    const target = await filterSafePath(first, tempDir, 'font.ttf');
    const thrown = await rejectionOf(
      (): Promise<string> => filterSafePath(second, tempDir, 'font.ttf'),
    );
    expect(systemCode(thrown)).toBe('EEXIST');
    expect(readFileSync(target, 'utf8')).toBe('first');
  });
});

describe('filterSafeSubtitle', (): void => {
  let tempDir = '';

  beforeAll((): void => {
    tempDir = makeTempDir('filter-safe-subtitle-');
  });

  afterAll((): void => {
    removeTempDir(tempDir);
  });

  it('returns a safe subtitle path unchanged without writing', async (): Promise<void> => {
    const safePath = '/tmp/My Clips/a.srt';
    const before = readdirSync(tempDir);
    const result = await filterSafeSubtitle(subtitleInput(safePath), tempDir);
    expect(result).toBe(safePath);
    expect(readdirSync(tempDir)).toEqual(before);
  });

  it('copies an apostrophe path and keeps the same bytes', async (): Promise<void> => {
    const source = path.join(tempDir, "it's.srt");
    const body = '1\n00:00:00,000 --> 00:00:01,000\nHello\n\n';
    writeFileSync(source, body, 'utf8');
    const result = await filterSafeSubtitle(subtitleInput(source), tempDir);
    expect(result).toBe(path.join(tempDir, 'subtitle.srt'));
    expect(readFileSync(result, 'utf8')).toBe(body);
    expect(readFileSync(source, 'utf8')).toBe(body);
  });

  it('refuses a file that is not SubRip before copying it', async (): Promise<void> => {
    const ownDir = makeTempDir('filter-safe-subtitle-not-srt-');
    try {
      const source = path.join(ownDir, "it's not subrip.srt");
      writeFileSync(source, '[Script Info]\nTitle: demo\n', 'utf8');
      const error = await rejectedMediaError(
        (): Promise<string> => filterSafeSubtitle(subtitleInput(source), ownDir),
      );
      expect(error.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
      expect(error.details).toEqual({
        path: source,
        detected: 'unknown',
        accepted: 'subrip',
        reason: 'not-subrip',
      });
      expect(readdirSync(ownDir)).toEqual(["it's not subrip.srt"]);
    } finally {
      removeTempDir(ownDir);
    }
  });
});

describe('filterSafeFontDir', (): void => {
  let tempDir = '';

  beforeAll((): void => {
    tempDir = makeTempDir('filter-safe-font-dir-');
  });

  afterAll((): void => {
    removeTempDir(tempDir);
  });

  it('returns a safe folder unchanged without writing', async (): Promise<void> => {
    const safeDir = '/tmp/My Fonts';
    const before = readdirSync(tempDir);
    const result = await filterSafeFontDir(safeDir, tempDir);
    expect(result).toBe(safeDir);
    expect(readdirSync(tempDir)).toEqual(before);
  });

  it('copies every regular file of an unsafe folder', async (): Promise<void> => {
    const source = path.join(tempDir, "it's fonts");
    mkdirSync(source);
    writeFileSync(path.join(source, 'one.ttf'), 'font one');
    writeFileSync(path.join(source, 'two.ttf'), 'font two');
    const result = await filterSafeFontDir(source, tempDir);
    expect(result).toBe(path.join(tempDir, 'fonts'));
    expect(readdirSync(result).sort()).toEqual(['one.ttf', 'two.ttf']);
    expect(readFileSync(path.join(result, 'one.ttf'), 'utf8')).toBe('font one');
    expect(readFileSync(path.join(result, 'two.ttf'), 'utf8')).toBe('font two');
    expect(readdirSync(source).sort()).toEqual(['one.ttf', 'two.ttf']);
  });
});

describe(
  'escape round trip against the resolved ffmpeg',
  { timeout: ROUND_TRIP_TIMEOUT_MS },
  (): void => {
    let ffmpegPath = '';

    beforeAll(async (): Promise<void> => {
      const binary = await resolveTestBinary('ffmpeg');
      if (binary === undefined) {
        throw new Error('ffmpeg is not available for the round trip.');
      }
      ffmpegPath = binary;
    });

    it.each(ROUND_TRIP_BATTERY)(
      'escape_check: keeps %j intact through drawtext',
      (text: string): void => {
        const outcome = runProbe(ffmpegPath, [text]);
        expect(outcome.status).toBe(0);
        expectEveryGraphHolds(outcome.values, [text]);
        expect(outcome.scaled).toBe(true);
      },
      ROUND_TRIP_TIMEOUT_MS,
    );

    it(
      'escape_check: keeps a 200 string fuzz intact in batches of 20',
      (): void => {
        const strings = buildFuzzStrings();
        expect(strings).toHaveLength(FUZZ_SIZE);
        for (let start = 0; start < strings.length; start += FUZZ_BATCH_SIZE) {
          const batch = strings.slice(start, start + FUZZ_BATCH_SIZE);
          expect(batch).toHaveLength(FUZZ_BATCH_SIZE);
          const outcome = runProbe(ffmpegPath, batch);
          expect(outcome.status).toBe(0);
          expectEveryGraphHolds(outcome.values, batch);
          expect(outcome.scaled).toBe(true);
        }
      },
      ROUND_TRIP_TIMEOUT_MS,
    );
  },
);
