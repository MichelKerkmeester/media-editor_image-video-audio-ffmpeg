// ───────────────────────────────────────────────────────────────────
// MODULE: Media Remove Silence Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import {
  keepGraph,
  keepSegments,
  parseSilences,
  selectExpression,
} from '../../../src/tools/media/remove-silence.js';
import {
  generateSilenceAudio,
  generateSilenceVideo,
} from '../../helpers/composition-media.js';
import {
  generateAudio,
  generateVideo,
  probeJson,
} from '../../helpers/media.js';
import {
  asList,
  asRecord,
  callTool,
  createSandbox,
  expectProtocolError,
  listFolders,
  sha256Of,
  withToolClient,
} from '../../helpers/tool-client.js';

import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
  readonly durationSeconds?: number;
}

interface ProbeView {
  readonly formatName: string;
  readonly duration: number;
  readonly streams: readonly ProbeStream[];
}

interface RemoveOutcome extends CallOutcome {
  readonly text: string;
}

interface SchemaCase {
  readonly label: string;
  readonly overrides: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('media-remove-silence-');

const DURATION_TOLERANCE_SECONDS = 0.2;
const VIDEO_TOLERANCE_SECONDS = 0.25;
const COPY_TOLERANCE_SECONDS = 0.05;

const TRAILING_SECONDS = 2;
const TRAILING_SILENCE_SECONDS = 3;

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'a positive threshold', overrides: { silenceThresholdDb: 1 } },
  { label: 'a threshold below the range', overrides: { silenceThresholdDb: -101 } },
  { label: 'a zero minimum duration', overrides: { minSilenceDurationMs: 0 } },
  {
    label: 'a minimum duration above the range',
    overrides: { minSilenceDurationMs: 600001 },
  },
  {
    label: 'a fractional minimum duration',
    overrides: { minSilenceDurationMs: 1.5 },
  },
];

const outsidePath = path.join(sandbox.root, 'outside.m4a');
const missingPath = path.join(sandbox.allowedRoot, 'missing.m4a');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function probeView(value: unknown): ProbeView {
  const root = asRecord(value);
  const format = asRecord(root.format);
  const formatName = format.format_name;
  const duration = Number(format.duration);
  if (typeof formatName !== 'string' || !Number.isFinite(duration)) {
    throw new Error('expected probe format');
  }
  if (!Array.isArray(root.streams)) {
    throw new Error('expected probe streams');
  }
  const streams: ProbeStream[] = [];
  for (const entry of root.streams) {
    const stream = asRecord(entry);
    const codecType = stream.codec_type;
    const codecName = stream.codec_name;
    if (typeof codecType !== 'string' || typeof codecName !== 'string') {
      throw new Error('expected a stream codec');
    }
    const rawDuration = stream.duration;
    const streamDuration = rawDuration === undefined ? Number.NaN : Number(rawDuration);
    streams.push({
      codecType,
      codecName,
      durationSeconds: Number.isFinite(streamDuration) ? streamDuration : undefined,
    });
  }
  return { formatName, duration, streams };
}

function streamsOf(view: ProbeView, codecType: string): ProbeStream[] {
  return view.streams.filter((stream) => stream.codecType === codecType);
}

function streamDuration(view: ProbeView, codecType: string): number {
  const stream = streamsOf(view, codecType)[0];
  if (stream === undefined || stream.durationSeconds === undefined) {
    throw new Error(`expected a ${codecType} stream duration`);
  }
  return stream.durationSeconds;
}

function expectDurationNear(actual: number, expected: number, tolerance: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function textContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  const first: unknown = content[0];
  if (typeof first !== 'object' || first === null) {
    return '';
  }
  if (!('type' in first) || first.type !== 'text' || !('text' in first)) {
    return '';
  }
  return typeof first.text === 'string' ? first.text : '';
}

async function removeSilence(args: Record<string, unknown>): Promise<RemoveOutcome> {
  let outcome: RemoveOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    let text = '';
    // Keep the text line so the saved-path sentence can be asserted.
    const original = client.callTool.bind(client);
    client.callTool = async (params, schema, options) => {
      const result = await original(params, schema, options);
      text = textContent(result.content);
      return result;
    };
    try {
      const parsed = await callTool(client, 'media_remove_silence', args);
      outcome = { ...parsed, text };
    } finally {
      client.callTool = original;
    }
  });
  if (outcome === undefined) {
    throw new Error('expected a tool result');
  }
  return outcome;
}

function writtenPath(
  body: Record<string, unknown>,
  fileName: string,
  slug: string,
  mediaType: string,
  warningCount = 0,
): string {
  expect(body.tool).toBe('media_remove_silence');
  expect(asList(body.warnings)).toHaveLength(warningCount);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe(mediaType);
  if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected a written file');
  }
  expect(entry.bytes).toBe(statSync(entry.path).size);
  expect(path.basename(entry.path)).toBe(fileName);
  const folderName = path.basename(path.dirname(entry.path));
  expect(folderName).toMatch(/^\d{3} - /u);
  expect(folderName.endsWith(` - ${slug}`)).toBe(true);
  expect(path.dirname(path.dirname(entry.path))).toBe(sandbox.outputDir);
  return entry.path;
}

async function expectFailure(
  args: Record<string, unknown>,
  code: string,
  details: Record<string, unknown>,
): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  const outcome = await removeSilence(args);
  expect(outcome.isError).toBe(true);
  expect(outcome.body.code).toBe(code);
  expect(outcome.body.details).toEqual(details);
  expect(outcome.body).not.toHaveProperty('outputs');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function expectRejected(args: Record<string, unknown>): Promise<void> {
  const before = listFolders(sandbox.outputDir);
  await withToolClient(sandbox.config, async (client) => {
    await expectProtocolError(
      client.callTool({
        name: 'media_remove_silence',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  sandbox.cleanup();
});

const trailingPath = await generateSilenceAudio(sandbox.allowedRoot, {
  pattern: [
    { kind: 'tone', seconds: TRAILING_SECONDS },
    { kind: 'silence', seconds: TRAILING_SILENCE_SECONDS },
  ],
  fileName: 'trailing-tone.m4a',
});
const interiorPath = await generateSilenceAudio(sandbox.allowedRoot, {
  pattern: [
    { kind: 'tone', seconds: 1 },
    { kind: 'silence', seconds: 2 },
    { kind: 'tone', seconds: 1 },
  ],
  fileName: 'interior-gap.m4a',
});
const leadingPath = await generateSilenceAudio(sandbox.allowedRoot, {
  pattern: [
    { kind: 'silence', seconds: 1 },
    { kind: 'tone', seconds: 2 },
  ],
  fileName: 'leading-gap.m4a',
});
const shortGapPath = await generateSilenceAudio(sandbox.allowedRoot, {
  pattern: [
    { kind: 'tone', seconds: 1 },
    { kind: 'silence', seconds: 0.6 },
    { kind: 'tone', seconds: 1 },
  ],
  fileName: 'short-gap.m4a',
});
const silenceOnlyPath = await generateSilenceAudio(sandbox.allowedRoot, {
  pattern: [{ kind: 'silence', seconds: 3 }],
  fileName: 'silence-only.m4a',
});
const cleanTonePath = await generateAudio(sandbox.allowedRoot, {
  seconds: 2,
  format: 'wav',
  fileName: 'clean-tone.wav',
});
const silenceVideoPath = await generateSilenceVideo(sandbox.allowedRoot, {
  pattern: [
    { kind: 'tone', seconds: 1 },
    { kind: 'silence', seconds: 2 },
    { kind: 'tone', seconds: 1 },
  ],
  fileName: 'silence-clip.mp4',
});
const pictureOnlyPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 2,
  width: 160,
  height: 120,
  fileName: 'picture-only.mp4',
});

it('parseSilences pairs starts with ends and clamps them to the file', (): void => {
  const stderr = [
    '[silencedetect @ 0x1] silence_start: -0.00233',
    '[silencedetect @ 0x1] silence_end: 0.9 | silence_duration: 0.90233',
    '[silencedetect @ 0x1] silence_start: 1.5',
    '[silencedetect @ 0x1] silence_end: 3 | silence_duration: 1.5',
    '[silencedetect @ 0x1] silence_start: 4.25',
    '[silencedetect @ 0x1] silence_end: 9.5 | silence_duration: 5.25',
    '[silencedetect @ 0x1] silence_start: 8',
  ].join('\n');
  expect(parseSilences(stderr, 8)).toEqual([
    { start: 0, end: 0.9 },
    { start: 1.5, end: 3 },
    { start: 4.25, end: 8 },
  ]);
});

it('parseSilences reads exponent values and drops an inverted pair', (): void => {
  const stderr = [
    'silence_start: -2.5e-3',
    'silence_end: 3.5e-1',
    'silence_start: 5',
    'silence_end: 4',
  ].join('\n');
  expect(parseSilences(stderr, 6)).toEqual([{ start: 0, end: 0.35 }]);
});

it('keepSegments keeps the stretch before the first silence', (): void => {
  expect(keepSegments([{ start: 0, end: 1 }], 3)).toEqual([{ start: 1, end: 3 }]);
});

it('keepSegments keeps both stretches around an interior silence', (): void => {
  expect(keepSegments([{ start: 1, end: 3 }], 4)).toEqual([
    { start: 0, end: 1 },
    { start: 3, end: 4 },
  ]);
});

it('keepSegments keeps the stretch after the last silence', (): void => {
  expect(keepSegments([{ start: 2, end: 5 }], 5)).toEqual([{ start: 0, end: 2 }]);
});

it('keepSegments returns nothing when every stretch is silent', (): void => {
  expect(keepSegments([{ start: 0, end: 3 }], 3)).toEqual([]);
});

it('keepSegments drops a stretch shorter than a millisecond', (): void => {
  expect(keepSegments([{ start: 0.0005, end: 1 }], 1.5)).toEqual([{ start: 1, end: 1.5 }]);
});

it('selectExpression writes plain numbers joined by plus', (): void => {
  expect(selectExpression([{ start: 1, end: 2.5 }])).toBe('between(t,1,2.5)');
  expect(selectExpression([
    { start: 0, end: 0.5 },
    { start: 3.000123, end: 4 },
  ])).toBe('between(t,0,0.5)+between(t,3.000123,4)');
  expect(selectExpression([])).toBe('');
});

it('keepGraph rebuilds timestamps from the frame and sample counts', (): void => {
  const expr = 'between(t,0,0.5)+between(t,3,4)';
  expect(keepGraph(expr, true)).toBe(
    "[0:v]select='between(t,0,0.5)+between(t,3,4)',setpts=N/FRAME_RATE/TB[v]"
    + ";[0:a]aselect='between(t,0,0.5)+between(t,3,4)',asetpts=N/SR/TB[a]",
  );
  expect(keepGraph(expr, false)).toBe(
    "[0:a]aselect='between(t,0,0.5)+between(t,3,4)',asetpts=N/SR/TB[a]",
  );
});

it('test_remove_silence: removes a trailing three second silence', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(trailingPath);
  const source = probeView(await probeJson(trailingPath));
  expect(source.duration).toBeGreaterThan(4.8);
  const outcome = await removeSilence({
    inputPath: trailingPath,
    outputName: 'ac 009',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'trailing-tone-without-silence.m4a',
    'ac-009',
    'audio',
  );
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '001 - ac-009'));
  expect(outcome.text).toBe(
    `Removed 1 silent stretches from trailing-tone.m4a. `
    + `Output saved to ${filePath}.`,
  );
  const output = probeView(await probeJson(filePath));
  expectDurationNear(output.duration, 2, DURATION_TOLERANCE_SECONDS);
  expect(streamsOf(output, 'audio')[0]?.codecName).toBe('aac');
  expect(sha256Of(trailingPath)).toBe(before);
});

it('keeps the loud takes around an interior silence', async (): Promise<void> => {
  const before = sha256Of(interiorPath);
  const source = probeView(await probeJson(interiorPath));
  expect(source.duration).toBeGreaterThan(3.8);
  const outcome = await removeSilence({
    inputPath: interiorPath,
    outputName: 'interior gap',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'interior-gap-without-silence.m4a',
    'interior-gap',
    'audio',
  );
  const output = probeView(await probeJson(filePath));
  expectDurationNear(output.duration, 2, DURATION_TOLERANCE_SECONDS);
  expect(streamsOf(output, 'audio')[0]?.codecName).toBe('aac');
  expect(sha256Of(interiorPath)).toBe(before);
});

it('drops a leading silence', async (): Promise<void> => {
  const before = sha256Of(leadingPath);
  const source = probeView(await probeJson(leadingPath));
  expect(source.duration).toBeGreaterThan(2.8);
  const outcome = await removeSilence({
    inputPath: leadingPath,
    outputName: 'leading gap',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'leading-gap-without-silence.m4a',
    'leading-gap',
    'audio',
  );
  const output = probeView(await probeJson(filePath));
  expectDurationNear(output.duration, 2, DURATION_TOLERANCE_SECONDS);
  expect(sha256Of(leadingPath)).toBe(before);
});

it('keeps the loud parts of a video and its sound', async (): Promise<void> => {
  const before = sha256Of(silenceVideoPath);
  const outcome = await removeSilence({
    inputPath: silenceVideoPath,
    outputName: 'video keep',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'silence-clip-without-silence.mp4',
    'video-keep',
    'video',
  );
  const output = probeView(await probeJson(filePath));
  expect(streamsOf(output, 'video')).toHaveLength(1);
  expect(streamsOf(output, 'audio')).toHaveLength(1);
  expect(streamsOf(output, 'video')[0]?.codecName).toBe('h264');
  expect(streamsOf(output, 'audio')[0]?.codecName).toBe('aac');
  expectDurationNear(
    streamDuration(output, 'video'),
    2,
    VIDEO_TOLERANCE_SECONDS,
  );
  expectDurationNear(
    streamDuration(output, 'audio'),
    2,
    VIDEO_TOLERANCE_SECONDS,
  );
  expect(sha256Of(silenceVideoPath)).toBe(before);
});

it('test_remove_silence: a 1000 ms minimum leaves short gaps', async (): Promise<void> => {
  const before = sha256Of(shortGapPath);
  const source = probeView(await probeJson(shortGapPath));
  const outcome = await removeSilence({
    inputPath: shortGapPath,
    minSilenceDurationMs: 1000,
    outputName: 'min silent ms',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'short-gap-without-silence.m4a',
    'min-silent-ms',
    'audio',
    1,
  );
  expect(outcome.text).toBe(
    `Found no silence in short-gap.m4a, so it was copied unchanged. `
    + `Output saved to ${filePath}.`,
  );
  const warnings = asList(outcome.body.warnings);
  expect(warnings).toHaveLength(1);
  expect(String(warnings[0])).toContain('copied unchanged');
  const output = probeView(await probeJson(filePath));
  expect(Math.abs(output.duration - source.duration))
    .toBeLessThanOrEqual(COPY_TOLERANCE_SECONDS);
  expect(streamsOf(output, 'audio')[0]?.codecName)
    .toBe(streamsOf(source, 'audio')[0]?.codecName);
  expect(sha256Of(shortGapPath)).toBe(before);
});

it('keeps the input extension when a wav file has no silence', async (): Promise<void> => {
  const before = sha256Of(cleanTonePath);
  const outcome = await removeSilence({
    inputPath: cleanTonePath,
    outputName: 'clean wav',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'clean-tone-without-silence.wav',
    'clean-wav',
    'audio',
    1,
  );
  expect(path.extname(filePath)).toBe('.wav');
  const output = probeView(await probeJson(filePath));
  expect(output.formatName.split(',')).toContain('wav');
  expect(sha256Of(cleanTonePath)).toBe(before);
});

it('returns INVALID_INPUT when every stretch is silent', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: silenceOnlyPath,
      outputName: 'all silent',
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'inputPath',
      value: silenceOnlyPath,
      reason: 'all-silent',
    },
  );
});

it('returns UNSUPPORTED_FORMAT for a video with no audio stream', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: pictureOnlyPath,
      outputName: 'picture only',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: pictureOnlyPath,
      detected: ['video'],
      accepted: ['audio'],
    },
  );
});

it.each(SCHEMA_CASES)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected({
      inputPath: trailingPath,
      outputName: 'bad schema',
      ...row.overrides,
    });
  },
);

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
    },
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsidePath,
      realPath: outsidePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('returns INPUT_NOT_FOUND when the input is missing', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: missingPath,
      outputName: 'missing',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('lists the tool with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'media_remove_silence');
    expect(tool).toBeDefined();
    if (tool === undefined) {
      return;
    }
    expect(tool.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(tool.description).toContain('numbered folder');
    expect(tool.description).toContain('never changes the input');
    expect(tool.description).toContain('100 MB');
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of [
      'inputPath',
      'silenceThresholdDb',
      'minSilenceDurationMs',
      'outputName',
    ]) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const threshold = String(asRecord(properties.silenceThresholdDb).description);
    expect(threshold).toContain('-100');
    const minimum = String(asRecord(properties.minSilenceDurationMs).description);
    expect(minimum).toContain('600000');
    expect(tool.inputSchema.required).toEqual(['inputPath', 'outputName']);
  });
});
