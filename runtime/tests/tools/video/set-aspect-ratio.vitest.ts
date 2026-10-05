// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Aspect Ratio Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { aspectFilter } from '../../../src/tools/video/set-aspect-ratio.js';
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

type AspectMode = 'pad' | 'crop';

interface FrameCase {
  readonly width: number;
  readonly height: number;
  readonly ratio: number;
  readonly mode: AspectMode;
  readonly frameWidth: number;
  readonly frameHeight: number;
}

interface OracleCase {
  readonly file: 'wide' | 'box';
  readonly aspectRatio: string;
  readonly resizeMode: AspectMode;
  readonly width: number;
  readonly height: number;
  readonly slug: string;
}

interface SchemaCase {
  readonly label: string;
  readonly patch: Record<string, unknown>;
}

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
  readonly width?: number;
  readonly height?: number;
}

interface ProbeView {
  readonly formatName: string;
  readonly streams: readonly ProbeStream[];
}

interface AspectOutcome extends CallOutcome {
  readonly text: string;
}

interface SourceFile {
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly baseName: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-aspect-');

const FRAME_CASES: readonly FrameCase[] = [
  {
    width: 320,
    height: 240,
    ratio: 21 / 9,
    mode: 'pad',
    frameWidth: 320,
    frameHeight: 136,
  },
  {
    width: 320,
    height: 240,
    ratio: 21 / 9,
    mode: 'crop',
    frameWidth: 320,
    frameHeight: 136,
  },
  {
    width: 180,
    height: 100,
    ratio: 7 / 4,
    mode: 'pad',
    frameWidth: 174,
    frameHeight: 100,
  },
  {
    width: 180,
    height: 100,
    ratio: 7 / 4,
    mode: 'crop',
    frameWidth: 174,
    frameHeight: 100,
  },
  {
    width: 100,
    height: 80,
    ratio: 3,
    mode: 'pad',
    frameWidth: 100,
    frameHeight: 32,
  },
  {
    width: 100,
    height: 80,
    ratio: 3,
    mode: 'crop',
    frameWidth: 100,
    frameHeight: 32,
  },
  {
    width: 101,
    height: 80,
    ratio: 16 / 9,
    mode: 'pad',
    frameWidth: 100,
    frameHeight: 56,
  },
  {
    width: 101,
    height: 80,
    ratio: 16 / 9,
    mode: 'crop',
    frameWidth: 100,
    frameHeight: 56,
  },
  {
    width: 320,
    height: 180,
    ratio: 4 / 3,
    mode: 'pad',
    frameWidth: 240,
    frameHeight: 180,
  },
  {
    width: 320,
    height: 180,
    ratio: 4 / 3,
    mode: 'crop',
    frameWidth: 240,
    frameHeight: 180,
  },
  {
    width: 320,
    height: 240,
    ratio: 16 / 9,
    mode: 'pad',
    frameWidth: 320,
    frameHeight: 180,
  },
  {
    width: 320,
    height: 240,
    ratio: 16 / 9,
    mode: 'crop',
    frameWidth: 320,
    frameHeight: 180,
  },
  {
    width: 320,
    height: 240,
    ratio: 1,
    mode: 'pad',
    frameWidth: 240,
    frameHeight: 240,
  },
  {
    width: 320,
    height: 240,
    ratio: 1,
    mode: 'crop',
    frameWidth: 240,
    frameHeight: 240,
  },
];

const ORACLE_CASES: readonly OracleCase[] = [
  {
    file: 'wide',
    aspectRatio: '4:3',
    resizeMode: 'crop',
    width: 240,
    height: 180,
    slug: 'wide-four-three-crop',
  },
  {
    file: 'box',
    aspectRatio: '16:9',
    resizeMode: 'pad',
    width: 320,
    height: 180,
    slug: 'box-sixteen-nine-pad',
  },
  {
    file: 'box',
    aspectRatio: '16:9',
    resizeMode: 'crop',
    width: 320,
    height: 180,
    slug: 'box-sixteen-nine-crop',
  },
  {
    file: 'box',
    aspectRatio: '1:1',
    resizeMode: 'pad',
    width: 240,
    height: 240,
    slug: 'box-square-pad',
  },
  {
    file: 'box',
    aspectRatio: '1:1',
    resizeMode: 'crop',
    width: 240,
    height: 240,
    slug: 'box-square-crop',
  },
];

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'named colour', patch: { paddingColor: 'red' } },
  { label: 'short hex', patch: { paddingColor: '#fff' } },
  { label: 'dash ratio', patch: { aspectRatio: '4-3' } },
  { label: 'slash ratio', patch: { aspectRatio: '16/9' } },
  { label: 'zero side', patch: { aspectRatio: '0:9' } },
  { label: 'side too long', patch: { aspectRatio: '1000:1' } },
  { label: 'stretch', patch: { resizeMode: 'stretch' } },
];

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
  if (typeof formatName !== 'string') {
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
  return { formatName, streams };
}

function streamsOf(probe: ProbeView, codecType: string): ProbeStream[] {
  return probe.streams.filter((stream) => stream.codecType === codecType);
}

function codecName(probe: ProbeView, codecType: string): string {
  const stream = streamsOf(probe, codecType)[0];
  if (stream === undefined) {
    throw new Error(`expected a ${codecType} stream`);
  }
  return stream.codecName;
}

function pictureSize(probe: ProbeView): { width: number; height: number } {
  const video = streamsOf(probe, 'video')[0];
  if (video?.width === undefined || video.height === undefined) {
    throw new Error('expected a picture size');
  }
  return { width: video.width, height: video.height };
}

function expectContainer(formatName: string, token: string): void {
  expect(formatName.split(',')).toContain(token);
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

async function setAspect(args: Record<string, unknown>): Promise<AspectOutcome> {
  let outcome: AspectOutcome | undefined;
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
      const parsed = await callTool(client, 'video_set_aspect_ratio', args);
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
  expect(body.tool).toBe('video_set_aspect_ratio');
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
  const outcome = await setAspect(args);
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
        name: 'video_set_aspect_ratio',
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

const [widePath, boxPath, silentPath, audioPath] = await Promise.all([
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 320,
    height: 180,
    withAudio: true,
    fileName: 'wide.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 320,
    height: 240,
    withAudio: true,
    fileName: 'box.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 320,
    height: 240,
    fileName: 'silent.mp4',
  }),
  generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'mp3',
    fileName: 'tone.mp3',
  }),
]);
const ffmpegBinary = await resolveTestBinary('ffmpeg');
if (ffmpegBinary === undefined) {
  throw new Error('ffmpeg is not available');
}
const pcmPath = await encodeFixture(ffmpegBinary, 'pcm.mkv', [
  '-f',
  'lavfi',
  '-i',
  'testsrc2=size=160x120:rate=25:duration=1',
  '-f',
  'lavfi',
  '-i',
  'sine=frequency=440:duration=1',
  '-c:v',
  'libx264',
  '-pix_fmt',
  'yuv420p',
  '-c:a',
  'pcm_s16le',
  '-shortest',
  path.join(sandbox.allowedRoot, 'pcm.mkv'),
]);

const sources: Record<'wide' | 'box', SourceFile> = {
  wide: {
    path: widePath,
    width: 320,
    height: 180,
    baseName: 'wide.mp4',
  },
  box: {
    path: boxPath,
    width: 320,
    height: 240,
    baseName: 'box.mp4',
  },
};

afterAll((): void => {
  sandbox.cleanup();
});

it.each(FRAME_CASES)(
  'floors $width x $height in $mode to an even $frameWidth x $frameHeight',
  (row): void => {
    const frame = aspectFilter(row.width, row.height, row.ratio, row.mode, '#000000');
    expect(frame).toBeDefined();
    if (frame === undefined) {
      return;
    }
    expect(frame.width % 2).toBe(0);
    expect(frame.height % 2).toBe(0);
    expect(frame.width).toBeGreaterThanOrEqual(2);
    expect(frame.height).toBeGreaterThanOrEqual(2);
    expect(frame.width).toBe(row.frameWidth);
    expect(frame.height).toBe(row.frameHeight);
    expect(frame.filter).toContain(`${row.frameWidth}:${row.frameHeight}`);
    if (row.mode === 'pad') {
      expect(frame.filter.startsWith('scale=')).toBe(true);
      expect(frame.filter).toContain(',pad=');
    } else {
      expect(frame.filter.startsWith('crop=')).toBe(true);
    }
  },
);

it.each(['pad', 'crop'] as const)(
  'returns no filter when %s already matches 4:3',
  (mode): void => {
    expect(aspectFilter(320, 240, 4 / 3, mode, '#000000')).toBeUndefined();
  },
);

it('pads 16:9 into 4:3 with the validated colour', (): void => {
  expect(aspectFilter(320, 180, 4 / 3, 'pad', '#000000')).toEqual({
    width: 240,
    height: 180,
    filter:
      'scale=240:180:force_original_aspect_ratio=decrease,'
      + 'pad=240:180:(ow-iw)/2:(oh-ih)/2:#000000',
  });
});

it('crops the sides of a wider picture and the top of a taller one', (): void => {
  expect(aspectFilter(320, 180, 4 / 3, 'crop', '#FF0000')).toEqual({
    width: 240,
    height: 180,
    filter: 'crop=240:180:(iw-240)/2:0',
  });
  expect(aspectFilter(320, 240, 16 / 9, 'crop', '#FF0000')).toEqual({
    width: 320,
    height: 180,
    filter: 'crop=320:180:0:(ih-180)/2',
  });
});

it(
  'test_change_aspect_ratio: '
  + 'pads a 320x180 video to 4:3 at 240x180',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const source = sources.wide;
  const before = sha256Of(source.path);
  const inputProbe = probeView(await probeJson(source.path));
  expect(pictureSize(inputProbe)).toEqual({ width: 320, height: 180 });
  expect(codecName(inputProbe, 'audio')).toBe('aac');
  const outcome = await setAspect({
    inputPath: source.path,
    outputName: 'wide four three pad',
    aspectRatio: '4:3',
    resizeMode: 'pad',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'wide-aspect.mp4', 'wide-four-three-pad');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - wide-four-three-pad'),
  );
  expect(outcome.text).toBe(
    `Set the aspect ratio of wide.mp4 to 4:3. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  const size = pictureSize(outputProbe);
  expect(size).toEqual({ width: 240, height: 180 });
  expect(size.width).not.toBe(pictureSize(inputProbe).width);
  expect(sha256Of(source.path)).toBe(before);
});

it.each(ORACLE_CASES)(
  'fits $file to $aspectRatio by $resizeMode at $width x $height',
  async (row): Promise<void> => {
    const source = sources[row.file];
    const before = sha256Of(source.path);
    const inputProbe = probeView(await probeJson(source.path));
    const outcome = await setAspect({
      inputPath: source.path,
      outputName: row.slug.replaceAll('-', ' '),
      aspectRatio: row.aspectRatio,
      resizeMode: row.resizeMode,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `${source.baseName.replace(/\.mp4$/u, '')}-aspect.mp4`,
      row.slug,
    );
    expect(outcome.text).toBe(
      `Set the aspect ratio of ${source.baseName} to ${row.aspectRatio}. `
      + `Output saved to ${filePath}.`,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expectContainer(outputProbe.formatName, 'mp4');
    const size = pictureSize(outputProbe);
    expect(size).toEqual({ width: row.width, height: row.height });
    const inputSize = pictureSize(inputProbe);
    expect(size.width !== inputSize.width || size.height !== inputSize.height).toBe(true);
    expect(sha256Of(source.path)).toBe(before);
  },
);

it('copies a 320x240 video that is already 4:3 and keeps h264', async (): Promise<void> => {
  const before = sha256Of(boxPath);
  const inputProbe = probeView(await probeJson(boxPath));
  expect(pictureSize(inputProbe)).toEqual({ width: 320, height: 240 });
  expect(codecName(inputProbe, 'video')).toBe('h264');
  const outcome = await setAspect({
    inputPath: boxPath,
    outputName: 'already four three',
    aspectRatio: '4:3',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-aspect.mp4', 'already-four-three');
  expect(outcome.text).toBe(
    'box.mp4 already has the aspect ratio 4:3, so it was copied unchanged. '
    + `Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(pictureSize(outputProbe)).toEqual({ width: 320, height: 240 });
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(sha256Of(boxPath)).toBe(before);
});

it('pads 320x240 to 21:9 at an even height of 136', async (): Promise<void> => {
  const before = sha256Of(boxPath);
  const outcome = await setAspect({
    inputPath: boxPath,
    outputName: 'ultrawide pad',
    aspectRatio: '21:9',
    resizeMode: 'pad',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-aspect.mp4', 'ultrawide-pad');
  const size = pictureSize(probeView(await probeJson(filePath)));
  expect(size).toEqual({ width: 320, height: 136 });
  expect(size.height % 2).toBe(0);
  expect(size.height).not.toBe(240);
  expect(sha256Of(boxPath)).toBe(before);
});

it('accepts a #RRGGBB padding colour', async (): Promise<void> => {
  const before = sha256Of(boxPath);
  const outcome = await setAspect({
    inputPath: boxPath,
    outputName: 'red pad',
    aspectRatio: '1:1',
    resizeMode: 'pad',
    paddingColor: '#FF0000',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-aspect.mp4', 'red-pad');
  expect(pictureSize(probeView(await probeJson(filePath)))).toEqual({
    width: 240,
    height: 240,
  });
  expect(sha256Of(boxPath)).toBe(before);
});

it('pads and crops a video that has no audio', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const inputProbe = probeView(await probeJson(silentPath));
  expect(streamsOf(inputProbe, 'audio')).toHaveLength(0);
  const pad = await setAspect({
    inputPath: silentPath,
    outputName: 'silent pad',
    aspectRatio: '16:9',
    resizeMode: 'pad',
  });
  expect(pad.isError).toBe(false);
  const padPath = writtenPath(pad.body, 'silent-aspect.mp4', 'silent-pad');
  const padProbe = probeView(await probeJson(padPath));
  expect(pictureSize(padProbe)).toEqual({ width: 320, height: 180 });
  expect(streamsOf(padProbe, 'audio')).toHaveLength(0);
  const crop = await setAspect({
    inputPath: silentPath,
    outputName: 'silent crop',
    aspectRatio: '1:1',
    resizeMode: 'crop',
  });
  expect(crop.isError).toBe(false);
  const cropPath = writtenPath(crop.body, 'silent-aspect.mp4', 'silent-crop');
  const cropProbe = probeView(await probeJson(cropPath));
  expect(pictureSize(cropProbe)).toEqual({ width: 240, height: 240 });
  expect(streamsOf(cropProbe, 'audio')).toHaveLength(0);
  expect(sha256Of(silentPath)).toBe(before);
});

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const source = probeView(await probeJson(pcmPath));
  expect(codecName(source, 'audio')).toBe('pcm_s16le');
  const before = sha256Of(pcmPath);
  const outcome = await setAspect({
    inputPath: pcmPath,
    outputName: 'pcm fallback',
    aspectRatio: '16:9',
    resizeMode: 'pad',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'pcm-aspect.mp4', 'pcm-fallback', 1);
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(pictureSize(outputProbe)).toEqual({ width: 160, height: 90 });
  expect(sha256Of(pcmPath)).toBe(before);
});

it.each(SCHEMA_CASES)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected({
      inputPath: boxPath,
      outputName: 'bad schema',
      aspectRatio: '16:9',
      ...row.patch,
    });
  },
);

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      aspectRatio: '16:9',
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
      aspectRatio: '16:9',
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
      aspectRatio: '16:9',
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
    const tool = tools.find((candidate) => candidate.name === 'video_set_aspect_ratio');
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
      'aspectRatio',
      'resizeMode',
      'paddingColor',
    ]) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(properties.resizeMode).description)).toContain('pad');
    expect(String(asRecord(properties.resizeMode).description)).toContain('crop');
    expect(String(asRecord(properties.aspectRatio).description)).toContain('16:9');
    expect(String(asRecord(properties.paddingColor).description)).toContain('#RRGGBB');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'aspectRatio',
    ]);
  });
});
