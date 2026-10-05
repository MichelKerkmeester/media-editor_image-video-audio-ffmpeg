// ───────────────────────────────────────────────────────────────────
// MODULE: Video Trim Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { trimArgs } from '../../../src/tools/video/trim.js';
import {
  generateAudio,
  generateVideo,
  probeJson,
  resolveTestBinary,
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

interface ClockCase {
  readonly startTime: string;
  readonly endTime: string;
  readonly slug: string;
}

interface OrderCase {
  readonly startTime: number;
  readonly endTime: number;
}

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
  readonly width?: number;
  readonly height?: number;
}

interface ProbeView {
  readonly formatName: string;
  readonly duration: number;
  readonly streams: readonly ProbeStream[];
}

interface TrimOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-trim-');

const DURATION_TOLERANCE_SECONDS = 0.15;
const ORACLE_TOLERANCE_SECONDS = 0.1;
const SEEK_TOLERANCE_SECONDS = 0.25;

const CLOCK_CASES: readonly ClockCase[] = [
  {
    startTime: '00:00:00',
    endTime: '00:00:02',
    slug: 'clock-hours',
  },
  {
    startTime: '00:00',
    endTime: '00:02',
    slug: 'clock-minutes',
  },
];

const ORDER_CASES: readonly OrderCase[] = [
  { startTime: 3, endTime: 2 },
  { startTime: 2, endTime: 2 },
];

const SCHEMA_REJECTIONS = ['30s', -1, '1:2:3:4'] as const;

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
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
    const width = typeof stream.width === 'number' ? stream.width : undefined;
    const height = typeof stream.height === 'number' ? stream.height : undefined;
    streams.push({ codecType, codecName, width, height });
  }
  return { formatName, duration, streams };
}

function streamsOf(probe: ProbeView, codecType: string): ProbeStream[] {
  return probe.streams.filter((stream) => stream.codecType === codecType);
}

function expectContainer(formatName: string, token: string): void {
  expect(formatName.split(',')).toContain(token);
}

function expectDurationNear(
  actual: number,
  expected: number,
  tolerance: number,
): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

function codecName(probe: ProbeView, codecType: string): string {
  const stream = streamsOf(probe, codecType)[0];
  if (stream === undefined) {
    throw new Error(`expected a ${codecType} stream`);
  }
  return stream.codecName;
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

async function trim(args: Record<string, unknown>): Promise<TrimOutcome> {
  let outcome: TrimOutcome | undefined;
  await withToolClient(sandbox.config, async (client) => {
    let text = '';
    // callTool checks the line, and this wrapper keeps it for the path assertion.
    const original = client.callTool.bind(client);
    client.callTool = async (params, schema, options) => {
      const result = await original(params, schema, options);
      text = textContent(result.content);
      return result;
    };
    try {
      const parsed = await callTool(client, 'video_trim', args);
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
  warningCount = 0,
): string {
  expect(body.tool).toBe('video_trim');
  expect(asList(body.warnings)).toHaveLength(warningCount);
  expect(Number.isInteger(body.elapsedMs)).toBe(true);
  const outputs = asList(body.outputs);
  expect(outputs).toHaveLength(1);
  const entry = asRecord(outputs[0]);
  expect(entry.mediaType).toBe('video');
  if (typeof entry.path !== 'string' || typeof entry.bytes !== 'number') {
    throw new Error('expected a video file');
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
  const outcome = await trim(args);
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
        name: 'video_trim',
        arguments: args,
      }),
      -32602,
    );
  });
  expect(listFolders(sandbox.outputDir)).toEqual(before);
}

async function encodeFixture(
  binary: string,
  fileName: string,
  args: readonly string[],
): Promise<string> {
  const filePath = path.join(sandbox.allowedRoot, fileName);
  await runProcess(binary, args, {
    kind: 'ffmpeg',
    timeoutMs: 60000,
  });
  return filePath;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

const videoPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 4,
  width: 320,
  height: 240,
  withAudio: true,
  fileName: 'clip.mp4',
});
const audioPath = await generateAudio(sandbox.allowedRoot, {
  seconds: 1,
  format: 'mp3',
  fileName: 'tone.mp3',
});
const ffmpegBinary = await resolveTestBinary('ffmpeg');
if (ffmpegBinary === undefined) {
  throw new Error('ffmpeg is not available');
}
// A generated clip keeps one keyframe per 10 seconds, so this file forces one every 5 frames.
const densePath = await encodeFixture(ffmpegBinary, 'dense.mp4', [
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=320x240:rate=25:duration=4',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:duration=4',
  '-c:v',
  'libx264',
  '-g',
  '5',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  path.join(sandbox.allowedRoot, 'dense.mp4'),
]);
// MP4 cannot store pcm_s16le, so the copy into an mp4 output has to fail.
const pcmPath = await encodeFixture(ffmpegBinary, 'pcm.mkv', [
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=160x120:rate=25:duration=2',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:duration=2',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'pcm_s16le',
  '-shortest',
  path.join(sandbox.allowedRoot, 'pcm.mkv'),
]);
// Ten seconds with a keyframe every 5 frames, so a copy cut at 5 seconds lands on a keyframe.
const tenPath = await encodeFixture(ffmpegBinary, 'ten.mp4', [
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=160x120:rate=25:duration=10',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:duration=10',
  '-c:v',
  'libx264',
  '-g',
  '5',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'aac',
  '-shortest',
  path.join(sandbox.allowedRoot, 'ten.mp4'),
]);
const videoProbe = probeView(await probeJson(videoPath));

afterAll((): void => {
  sandbox.cleanup();
});

it('trims a 4 second clip from 0 to 2 within 0.15 seconds', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  expect(streamsOf(videoProbe, 'video').length).toBeGreaterThan(0);
  expect(codecName(videoProbe, 'audio')).toBe('aac');
  expectDurationNear(videoProbe.duration, 4, DURATION_TOLERANCE_SECONDS);
  const before = sha256Of(videoPath);
  const outcome = await trim({
    inputPath: videoPath,
    outputName: 'trimmed intro',
    startTime: 0,
    endTime: 2,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'clip-trimmed.mp4', 'trimmed-intro');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - trimmed-intro'),
  );
  expect(outcome.text).toBe(
    `Trimmed clip.mp4 from 0 to 2 seconds. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expectDurationNear(outputProbe.duration, 2, DURATION_TOLERANCE_SECONDS);
  expect(Math.abs(outputProbe.duration - videoProbe.duration)).toBeGreaterThan(
    DURATION_TOLERANCE_SECONDS,
  );
  const video = streamsOf(outputProbe, 'video')[0];
  expect(video?.width).toBe(320);
  expect(video?.height).toBe(240);
  expect(sha256Of(videoPath)).toBe(before);
});

it.each(CLOCK_CASES)(
  'trims $startTime to $endTime within 0.15 seconds',
  async (row): Promise<void> => {
    const before = sha256Of(videoPath);
    const outcome = await trim({
      inputPath: videoPath,
      outputName: row.slug.replaceAll('-', ' '),
      startTime: row.startTime,
      endTime: row.endTime,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(outcome.body, 'clip-trimmed.mp4', row.slug);
    expect(outcome.text).toBe(
      `Trimmed clip.mp4 from 0 to 2 seconds. Output saved to ${filePath}.`,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expectDurationNear(outputProbe.duration, 2, DURATION_TOLERANCE_SECONDS);
    expect(Math.abs(outputProbe.duration - videoProbe.duration)).toBeGreaterThan(
      DURATION_TOLERANCE_SECONDS,
    );
    expect(sha256Of(videoPath)).toBe(before);
  },
);

it('accepts HH:MM:SS.mmm and lands within 0.25 seconds', async (): Promise<void> => {
  const source = probeView(await probeJson(densePath));
  expectDurationNear(source.duration, 4, DURATION_TOLERANCE_SECONDS);
  const before = sha256Of(densePath);
  const outcome = await trim({
    inputPath: densePath,
    outputName: 'fraction start',
    startTime: '00:00:01.500',
    endTime: '00:00:03.500',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'dense-trimmed.mp4', 'fraction-start');
  expect(outcome.text).toBe(
    `Trimmed dense.mp4 from 1.5 to 3.5 seconds. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectDurationNear(outputProbe.duration, 2, SEEK_TOLERANCE_SECONDS);
  expect(Math.abs(outputProbe.duration - source.duration)).toBeGreaterThan(
    SEEK_TOLERANCE_SECONDS,
  );
  expect(sha256Of(densePath)).toBe(before);
});

it('seeks before the input so 1 to 3 stays within 0.25 seconds of 2', async (): Promise<void> => {
  const source = probeView(await probeJson(densePath));
  const before = sha256Of(densePath);
  const outcome = await trim({
    inputPath: densePath,
    outputName: 'keyframe seek',
    startTime: 1,
    endTime: 3,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'dense-trimmed.mp4', 'keyframe-seek');
  const outputProbe = probeView(await probeJson(filePath));
  expectDurationNear(outputProbe.duration, 2, SEEK_TOLERANCE_SECONDS);
  expect(outputProbe.duration).toBeLessThan(source.duration - 1);
  expect(sha256Of(densePath)).toBe(before);
});

it('treats an end past the file as the end of the 4 second clip', async (): Promise<void> => {
  const before = sha256Of(videoPath);
  const outcome = await trim({
    inputPath: videoPath,
    outputName: 'past the end',
    startTime: 0,
    endTime: 100,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'clip-trimmed.mp4', 'past-the-end');
  expect(outcome.text).toBe(
    `Trimmed clip.mp4 from 0 to 100 seconds. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectDurationNear(outputProbe.duration, videoProbe.duration, DURATION_TOLERANCE_SECONDS);
  expect(outputProbe.duration).toBeLessThan(10);
  expect(sha256Of(videoPath)).toBe(before);
});

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const source = probeView(await probeJson(pcmPath));
  expect(codecName(source, 'audio')).toBe('pcm_s16le');
  expectContainer(source.formatName, 'matroska');
  const before = sha256Of(pcmPath);
  const outcome = await trim({
    inputPath: pcmPath,
    outputName: 'pcm fallback',
    startTime: 0,
    endTime: 1,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'pcm-trimmed.mp4', 'pcm-fallback', 1);
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(sha256Of(pcmPath)).toBe(before);
});

it.each(ORDER_CASES)(
  'rejects start $startTime and end $endTime before creating a folder',
  async (row): Promise<void> => {
    await expectFailure(
      {
        inputPath: missingPath,
        outputName: 'bad order',
        startTime: row.startTime,
        endTime: row.endTime,
      },
      ERROR_CODES.INVALID_INPUT,
      {
        parameter: 'endTime',
        value: row.endTime,
        reason: 'end-not-after-start',
      },
    );
  },
);

it.each(SCHEMA_REJECTIONS)(
  'rejects endTime %s before a folder is created',
  async (endTime): Promise<void> => {
    await expectRejected({
      inputPath: videoPath,
      outputName: 'bad time',
      startTime: 0,
      endTime,
    });
  },
);

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      startTime: 0,
      endTime: 1,
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: audioPath,
      detected: ['audio'],
      accepted: ['video'],
    },
  );
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
      startTime: 0,
      endTime: 1,
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
      startTime: 0,
      endTime: 1,
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('lists video_trim with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'video_trim');
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
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'outputName', 'startTime', 'endTime']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    for (const name of ['startTime', 'endTime']) {
      const described = String(asRecord(properties[name]).description);
      expect(described).toContain('HH:MM:SS');
      expect(described).toContain('HH:MM:SS.mmm');
      expect(described).toContain('MM:SS');
      expect(described).toContain('plain numeric string');
      expect(described).toContain('end of the file');
    }
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'startTime',
      'endTime',
    ]);
  });
});

it('builds -ss and -to before -i with real ffmpeg flags only', (): void => {
  const argv = trimArgs('/media/in.mp4', '5', '10', ['-c', 'copy'], '/tmp/out.mp4');
  expect(argv).toEqual([
    '-n',
    '-ss',
    '5',
    '-to',
    '10',
    '-i',
    '/media/in.mp4',
    '-c',
    'copy',
    '/tmp/out.mp4',
  ]);
  expect(argv.indexOf('-ss')).toBeLessThan(argv.indexOf('-i'));
  expect(argv.indexOf('-to')).toBeLessThan(argv.indexOf('-i'));
  for (const alias of ['ss', 'to', 'acodec', 'vcodec', 'c']) {
    expect(argv).not.toContain(alias);
  }
});

it(
  'test_trim_video: '
  + 'cuts 00:00:00 to 00:00:05 of a 10 second clip within 0.1 seconds',
  async (): Promise<void> => {
    const source = probeView(await probeJson(tenPath));
    expectDurationNear(source.duration, 10, ORACLE_TOLERANCE_SECONDS);
    const outcome = await trim({
      inputPath: tenPath,
      outputName: 'oracle first five',
      startTime: '00:00:00',
      endTime: '00:00:05',
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(outcome.body, 'ten-trimmed.mp4', 'oracle-first-five');
    const outputProbe = probeView(await probeJson(filePath));
    expectDurationNear(outputProbe.duration, 5, ORACLE_TOLERANCE_SECONDS);
  },
);

it(
  'test_trim_video_with_duration_check: '
  + 'cuts 0 to 5 and 5 to 10 of a 10 second clip within 0.1 seconds each',
  async (): Promise<void> => {
    const spans = [
      { startTime: '00:00:00', endTime: '00:00:05', slug: 'duration-check-first' },
      { startTime: '00:00:05', endTime: '00:00:10', slug: 'duration-check-second' },
    ];
    for (const span of spans) {
      const outcome = await trim({
        inputPath: tenPath,
        outputName: span.slug,
        startTime: span.startTime,
        endTime: span.endTime,
      });
      expect(outcome.isError).toBe(false);
      const filePath = writtenPath(outcome.body, 'ten-trimmed.mp4', span.slug);
      const outputProbe = probeView(await probeJson(filePath));
      expectDurationNear(outputProbe.duration, 5, ORACLE_TOLERANCE_SECONDS);
    }
  },
);
