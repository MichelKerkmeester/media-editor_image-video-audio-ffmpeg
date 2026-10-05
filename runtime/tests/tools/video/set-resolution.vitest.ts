// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Resolution Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
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

interface ResolutionOutcome extends CallOutcome {
  readonly text: string;
}

interface PictureSize {
  readonly width: number;
  readonly height: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-resolution-');
const SCHEMA_VALUES = ['0', '160x', 'preserve'] as const;

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

function pictureSize(probe: ProbeView): PictureSize {
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

async function setResolution(
  args: Record<string, unknown>,
): Promise<ResolutionOutcome> {
  let outcome: ResolutionOutcome | undefined;
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
      const parsed = await callTool(client, 'video_set_resolution', args);
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
  expect(body.tool).toBe('video_set_resolution');
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
  const outcome = await setResolution(args);
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
        name: 'video_set_resolution',
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

const [boxPath, silentPath, audioPath] = await Promise.all([
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
// MP4 cannot store pcm_s16le, so the audio copy has to fail.
const pcmPath = path.join(sandbox.allowedRoot, 'pcm.mkv');
await runProcess(ffmpegBinary, [
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
  pcmPath,
], {
  kind: 'ffmpeg',
  timeoutMs: 60000,
});

it(
  'test_set_video_resolution: '
  + 'scales 320x240 to 160x120 and keeps aac',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(boxPath);
  const inputProbe = probeView(await probeJson(boxPath));
  expect(pictureSize(inputProbe)).toEqual({ width: 320, height: 240 });
  expect(codecName(inputProbe, 'audio')).toBe('aac');
  const outcome = await setResolution({
    inputPath: boxPath,
    outputName: 'small frame',
    resolution: '160x120',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-160x120.mp4', 'small-frame');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - small-frame'),
  );
  expect(outcome.text).toBe(
    `Set the resolution of box.mp4 to 160x120. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  const size = pictureSize(outputProbe);
  expect(size).toEqual({ width: 160, height: 120 });
  expect(size).not.toEqual(pictureSize(inputProbe));
  expect(sha256Of(boxPath)).toBe(before);
});

it('scales a height of 120 to 160x120 as h120', async (): Promise<void> => {
  const before = sha256Of(boxPath);
  const inputProbe = probeView(await probeJson(boxPath));
  const outcome = await setResolution({
    inputPath: boxPath,
    outputName: 'height only',
    resolution: '120',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-h120.mp4', 'height-only');
  expect(outcome.text).toBe(
    `Set the resolution of box.mp4 to 120. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  const size = pictureSize(outputProbe);
  expect(size).toEqual({ width: 160, height: 120 });
  expect(size).not.toEqual(pictureSize(inputProbe));
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(sha256Of(boxPath)).toBe(before);
});

it(
  'returns PROCESS_FAILED for odd height 121, a known libx264 4:2:0 limit',
  async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const outcome = await setResolution({
      inputPath: boxPath,
      outputName: 'odd height',
      resolution: '121',
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.body.code).toBe(ERROR_CODES.PROCESS_FAILED);
    const details = asRecord(outcome.body.details);
    expect(typeof details.binary).toBe('string');
    expect(typeof details.exitCode).toBe('number');
    expect(details).toHaveProperty('signal');
    expect(typeof details.stderrTail).toBe('string');
    expect(String(details.stderrTail).length).toBeGreaterThan(0);
    expect(outcome.body).not.toHaveProperty('outputs');
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  },
);

it.each(SCHEMA_VALUES)(
  'rejects resolution %s before a folder is created',
  async (resolution): Promise<void> => {
    await expectRejected({
      inputPath: boxPath,
      outputName: 'bad schema',
      resolution,
    });
  },
);

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const source = probeView(await probeJson(pcmPath));
  expect(codecName(source, 'audio')).toBe('pcm_s16le');
  expect(pictureSize(source)).toEqual({ width: 160, height: 120 });
  const before = sha256Of(pcmPath);
  const outcome = await setResolution({
    inputPath: pcmPath,
    outputName: 'pcm fallback',
    resolution: '80x60',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'pcm-80x60.mp4',
    'pcm-fallback',
    1,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(pictureSize(outputProbe)).toEqual({ width: 80, height: 60 });
  expect(asList(outcome.body.warnings)).toHaveLength(1);
  expect(sha256Of(pcmPath)).toBe(before);
});

it('scales a video that has no audio', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const inputProbe = probeView(await probeJson(silentPath));
  expect(streamsOf(inputProbe, 'audio')).toHaveLength(0);
  expect(pictureSize(inputProbe)).toEqual({ width: 320, height: 240 });
  const outcome = await setResolution({
    inputPath: silentPath,
    outputName: 'silent picture',
    resolution: '160x120',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'silent-160x120.mp4',
    'silent-picture',
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(pictureSize(outputProbe)).toEqual({ width: 160, height: 120 });
  expect(streamsOf(outputProbe, 'audio')).toHaveLength(0);
  expect(sha256Of(silentPath)).toBe(before);
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      resolution: '160x120',
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
      resolution: '160x120',
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
      resolution: '160x120',
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
    const tool = tools.find((candidate) => candidate.name === 'video_set_resolution');
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
    for (const name of ['inputPath', 'outputName', 'resolution']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const resolution = String(asRecord(properties.resolution).description);
    expect(resolution).toContain('160x120');
    expect(resolution).toContain('1 to 32768');
    expect(resolution).not.toContain('preserve');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'resolution',
    ]);
  });
});
