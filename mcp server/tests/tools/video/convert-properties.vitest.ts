// ───────────────────────────────────────────────────────────────────
// MODULE: Video Convert Properties Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { generateAudio, generateVideo, probeJson } from '../../helpers/media.js';
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
  readonly width?: number;
  readonly height?: number;
  readonly frameRate?: string;
  readonly sampleRate?: string;
  readonly channels?: number;
}

interface ProbeView {
  readonly formatName: string;
  readonly duration: number;
  readonly streams: readonly ProbeStream[];
}

interface VideoFacts {
  readonly codecName: string;
  readonly width: number;
  readonly height: number;
  readonly frameRate: string;
}

interface AudioFacts {
  readonly codecName: string;
  readonly sampleRate: string;
  readonly channels: number;
}

interface ConvertOutcome extends CallOutcome {
  readonly text: string;
}

interface SchemaRejection {
  readonly label: string;
  readonly args: Record<string, unknown>;
}

interface FormatCase {
  readonly format: string;
  readonly extension: string;
  readonly videoCodec: string;
  readonly audioCodec: string;
  readonly family: 'iso' | 'matroska' | 'avi';
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-convert-properties-');

const DURATION_TOLERANCE_SECONDS = 0.15;

const TOOL_NAME = 'video_convert_properties';

const FORMAT_CASES: readonly FormatCase[] = [
  {
    format: 'mp4',
    extension: '.mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    family: 'iso',
  },
  {
    format: 'mov',
    extension: '.mov',
    videoCodec: 'h264',
    audioCodec: 'aac',
    family: 'iso',
  },
  {
    format: 'mkv',
    extension: '.mkv',
    videoCodec: 'h264',
    audioCodec: 'aac',
    family: 'matroska',
  },
  {
    format: 'webm',
    extension: '.webm',
    videoCodec: 'vp9',
    audioCodec: 'opus',
    family: 'matroska',
  },
  {
    format: 'avi',
    extension: '.avi',
    videoCodec: 'mpeg4',
    audioCodec: 'mp3',
    family: 'avi',
  },
];

const SCHEMA_REJECTIONS: readonly SchemaRejection[] = [
  {
    label: 'format flv',
    args: { format: 'flv' },
  },
  {
    label: 'codec h264',
    args: { format: 'mp4', codec: 'h264' },
  },
  {
    label: 'resolution 0x100',
    args: { format: 'mp4', resolution: '0x100' },
  },
  {
    label: 'resolution big',
    args: { format: 'mp4', resolution: 'big' },
  },
  {
    label: 'frameRate 0',
    args: { format: 'mp4', frameRate: 0 },
  },
  {
    label: 'frameRate 241',
    args: { format: 'mp4', frameRate: 241 },
  },
  {
    label: 'audioCodec mp3',
    args: { format: 'mp4', audioCodec: 'mp3' },
  },
];

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
writeFileSync(outsidePath, 'outside');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function finiteInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return undefined;
  }
  return value;
}

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
    const width = finiteInteger(stream.width);
    const height = finiteInteger(stream.height);
    const frameRate = stream.r_frame_rate;
    const sampleRate = stream.sample_rate;
    const channels = stream.channels;
    streams.push({
      codecType,
      codecName,
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
      ...(typeof frameRate === 'string' ? { frameRate } : {}),
      ...(typeof sampleRate === 'string' ? { sampleRate } : {}),
      ...(typeof channels === 'number' ? { channels } : {}),
    });
  }
  return { formatName, duration, streams };
}

function streamsOf(probe: ProbeView, codecType: string): ProbeStream[] {
  return probe.streams.filter((stream) => stream.codecType === codecType);
}

function videoFacts(probe: ProbeView): VideoFacts {
  const video = streamsOf(probe, 'video');
  expect(video).toHaveLength(1);
  const stream = video[0];
  if (
    stream === undefined
    || stream.width === undefined
    || stream.height === undefined
    || stream.frameRate === undefined
  ) {
    throw new Error('expected a video picture');
  }
  return {
    codecName: stream.codecName,
    width: stream.width,
    height: stream.height,
    frameRate: stream.frameRate,
  };
}

function audioFacts(probe: ProbeView): AudioFacts {
  const audio = streamsOf(probe, 'audio');
  expect(audio).toHaveLength(1);
  const stream = audio[0];
  if (
    stream === undefined
    || stream.sampleRate === undefined
    || stream.channels === undefined
  ) {
    throw new Error('expected audio rate and channels');
  }
  return {
    codecName: stream.codecName,
    sampleRate: stream.sampleRate,
    channels: stream.channels,
  };
}

function expectFormatFamily(formatName: string, family: FormatCase['family']): void {
  const names = formatName.split(',');
  if (family === 'iso') {
    expect(names).toEqual(expect.arrayContaining(['mov', 'mp4']));
    return;
  }
  if (family === 'matroska') {
    expect(names).toEqual(expect.arrayContaining(['matroska', 'webm']));
    return;
  }
  expect(names).toContain('avi');
}

function expectDurationNear(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(DURATION_TOLERANCE_SECONDS);
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

async function convert(args: Record<string, unknown>): Promise<ConvertOutcome> {
  let outcome: ConvertOutcome | undefined;
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
      const parsed = await callTool(client, TOOL_NAME, args);
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
): string {
  expect(body.tool).toBe(TOOL_NAME);
  expect(body.warnings).toEqual([]);
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
  const outcome = await convert(args);
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
        name: TOOL_NAME,
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

const clipPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 2,
  width: 320,
  height: 240,
  withAudio: true,
  fileName: 'clip.mp4',
});
const smallPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  withAudio: true,
  fileName: 'small.mp4',
});
const silentPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 160,
  height: 120,
  fileName: 'silent.mp4',
});
const tonePath = await generateAudio(sandbox.allowedRoot, {
  seconds: 1,
  format: 'wav',
  fileName: 'tone.wav',
});
const clipProbe = probeView(await probeJson(clipPath));
const clipVideo = videoFacts(clipProbe);
const clipAudio = audioFacts(clipProbe);
const smallProbe = probeView(await probeJson(smallPath));
const smallVideo = videoFacts(smallProbe);
const smallAudio = audioFacts(smallProbe);
const smallHash = sha256Of(smallPath);
const clipHash = sha256Of(clipPath);
const silentHash = sha256Of(silentPath);

afterAll((): void => {
  sandbox.cleanup();
});

it(
  'test_convert_video_properties: '
  + 'scales a 2s clip to 160x120 at 30 fps and stereo within 0.15 seconds',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  expect(clipVideo).toEqual({
    codecName: 'h264',
    width: 320,
    height: 240,
    frameRate: '25/1',
  });
  expect(clipAudio).toEqual({
    codecName: 'aac',
    sampleRate: '44100',
    channels: 1,
  });
  const outcome = await convert({
    inputPath: clipPath,
    outputName: 'oracle height',
    format: 'mp4',
    resolution: '120',
    codec: 'libx264',
    videoBitrate: '1M',
    frameRate: 30,
    audioCodec: 'aac',
    audioBitrate: '128k',
    sampleRate: 44100,
    channels: 2,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'clip-converted.mp4', 'oracle-height');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - oracle-height'),
  );
  expect(outcome.text).toBe(
    `Converted the video properties of clip.mp4. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  const outputVideo = videoFacts(outputProbe);
  const outputAudio = audioFacts(outputProbe);
  expectFormatFamily(outputProbe.formatName, 'iso');
  expect(outputVideo).toEqual({
    codecName: 'h264',
    width: 160,
    height: 120,
    frameRate: '30/1',
  });
  expect(outputAudio).toEqual({
    codecName: 'aac',
    sampleRate: '44100',
    channels: 2,
  });
  expect(outputVideo.width).not.toBe(clipVideo.width);
  expect(outputVideo.frameRate).not.toBe(clipVideo.frameRate);
  expect(outputAudio.channels).not.toBe(clipAudio.channels);
  expectDurationNear(outputProbe.duration, clipProbe.duration);
  expect(sha256Of(clipPath)).toBe(clipHash);
  expect(sha256Of(filePath)).not.toBe(clipHash);
});

it.each(FORMAT_CASES)(
  'writes $format with its default pair',
  async (row): Promise<void> => {
    expect(smallVideo.codecName).toBe('h264');
    expect(smallAudio.codecName).toBe('aac');
    const outcome = await convert({
      inputPath: smallPath,
      outputName: `format ${row.format}`,
      format: row.format,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `small-converted${row.extension}`,
      `format-${row.format}`,
    );
    const outputProbe = probeView(await probeJson(filePath));
    const outputVideo = videoFacts(outputProbe);
    const outputAudio = audioFacts(outputProbe);
    expectFormatFamily(outputProbe.formatName, row.family);
    expect(outputVideo.codecName).toBe(row.videoCodec);
    expect(outputAudio.codecName).toBe(row.audioCodec);
    expect(outputVideo.width).toBe(smallVideo.width);
    expect(outputVideo.height).toBe(smallVideo.height);
    expectDurationNear(outputProbe.duration, smallProbe.duration);
    expect(sha256Of(smallPath)).toBe(smallHash);
    expect(sha256Of(filePath)).not.toBe(smallHash);
  },
);

it('writes vp9 into mkv when codec is the vp9 alias', async (): Promise<void> => {
  expect(smallVideo.codecName).toBe('h264');
  const outcome = await convert({
    inputPath: smallPath,
    outputName: 'vp9 mkv',
    format: 'mkv',
    codec: 'vp9',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'small-converted.mkv', 'vp9-mkv');
  const outputProbe = probeView(await probeJson(filePath));
  const outputVideo = videoFacts(outputProbe);
  expect(outputVideo.codecName).toBe('vp9');
  expect(outputVideo.codecName).not.toBe(smallVideo.codecName);
  expect(audioFacts(outputProbe).codecName).toBe('aac');
  expectFormatFamily(outputProbe.formatName, 'matroska');
  expect(sha256Of(smallPath)).toBe(smallHash);
});

it('writes hevc into mp4 when codec is libx265', async (): Promise<void> => {
  expect(smallVideo.codecName).toBe('h264');
  const outcome = await convert({
    inputPath: smallPath,
    outputName: 'hevc mp4',
    format: 'mp4',
    codec: 'libx265',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'small-converted.mp4', 'hevc-mp4');
  const outputVideo = videoFacts(probeView(await probeJson(filePath)));
  expect(outputVideo.codecName).toBe('hevc');
  expect(outputVideo.codecName).not.toBe(smallVideo.codecName);
  expect(sha256Of(smallPath)).toBe(smallHash);
});

it('writes 160x100 when resolution names both sides', async (): Promise<void> => {
  expect(clipVideo.width).toBe(320);
  expect(clipVideo.height).toBe(240);
  const outcome = await convert({
    inputPath: clipPath,
    outputName: 'exact size',
    format: 'mp4',
    resolution: '160x100',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'clip-converted.mp4', 'exact-size');
  const outputVideo = videoFacts(probeView(await probeJson(filePath)));
  expect(outputVideo.width).toBe(160);
  expect(outputVideo.height).toBe(100);
  expect(outputVideo.width).not.toBe(clipVideo.width);
  expect(outputVideo.height).not.toBe(clipVideo.height);
  expect(sha256Of(clipPath)).toBe(clipHash);
});

it('keeps 320x240 when resolution is preserve', async (): Promise<void> => {
  expect(clipVideo.width).toBe(320);
  expect(clipVideo.height).toBe(240);
  const outcome = await convert({
    inputPath: clipPath,
    outputName: 'keep size',
    format: 'mp4',
    resolution: 'preserve',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'clip-converted.mp4', 'keep-size');
  const outputVideo = videoFacts(probeView(await probeJson(filePath)));
  expect(outputVideo.width).toBe(clipVideo.width);
  expect(outputVideo.height).toBe(clipVideo.height);
  expect(sha256Of(clipPath)).toBe(clipHash);
  expect(sha256Of(filePath)).not.toBe(clipHash);
});

it.each(SCHEMA_REJECTIONS)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected({
      inputPath: clipPath,
      outputName: 'bad field',
      ...row.args,
    });
  },
);

it('returns PROCESS_FAILED for webm with libx264 and leaves no folder', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  const outcome = await convert({
    inputPath: smallPath,
    outputName: 'bad pair',
    format: 'webm',
    codec: 'libx264',
  });
  expect(outcome.isError).toBe(true);
  expect(outcome.body.code).toBe(ERROR_CODES.PROCESS_FAILED);
  const details = asRecord(outcome.body.details);
  expect(details.stderrTail).toEqual(expect.any(String));
  expect(String(details.stderrTail).length).toBeGreaterThan(0);
  expect(outcome.body).not.toHaveProperty('outputs');
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: tonePath,
      outputName: 'audio only',
      format: 'mp4',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: tonePath,
      detected: ['audio'],
      accepted: ['video'],
    },
  );
});

it('converts a video that has no audio stream', async (): Promise<void> => {
  const silentProbe = probeView(await probeJson(silentPath));
  expect(streamsOf(silentProbe, 'audio')).toEqual([]);
  expect(streamsOf(silentProbe, 'video')).toHaveLength(1);
  const outcome = await convert({
    inputPath: silentPath,
    outputName: 'silent picture',
    format: 'mp4',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'silent-converted.mp4', 'silent-picture');
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'audio')).toEqual([]);
  expect(videoFacts(outputProbe).codecName).toBe('h264');
  expect(sha256Of(silentPath)).toBe(silentHash);
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
      format: 'mp4',
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
      format: 'mp4',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    {
      path: missingPath,
      role: 'input',
    },
  );
});

it('lists video_convert_properties with described fields', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === TOOL_NAME);
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
    for (const name of [
      'inputPath',
      'outputName',
      'format',
      'resolution',
      'codec',
      'videoBitrate',
      'frameRate',
      'audioCodec',
      'audioBitrate',
      'sampleRate',
      'channels',
    ]) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const format = String(asRecord(properties.format).description);
    for (const name of ['mp4', 'mov', 'mkv', 'webm', 'avi']) {
      expect(format).toContain(name);
    }
    const codec = String(asRecord(properties.codec).description);
    expect(codec).toContain('libx264');
    expect(codec).toContain('libx265');
    expect(codec).toContain('libvpx-vp9');
    expect(codec).toContain('default');
    const audioCodec = String(asRecord(properties.audioCodec).description);
    expect(audioCodec).toContain('aac');
    expect(audioCodec).toContain('libmp3lame');
    expect(audioCodec).toContain('libopus');
    expect(audioCodec).toContain('default');
    expect(String(asRecord(properties.resolution).description)).toContain('preserve');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'format',
    ]);
  });
});
