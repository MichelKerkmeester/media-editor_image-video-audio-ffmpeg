// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Frame Rate Tests
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
  readonly frameRate?: string;
}

interface ProbeView {
  readonly formatName: string;
  readonly streams: readonly ProbeStream[];
}

interface FrameRateOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-frame-rate-');
const SCHEMA_VALUES = [0, 241] as const;

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
    const frameRate = stream.r_frame_rate;
    streams.push({
      codecType,
      codecName,
      frameRate: typeof frameRate === 'string' ? frameRate : undefined,
    });
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

function frameRateOf(probe: ProbeView): string {
  const rate = streamsOf(probe, 'video')[0]?.frameRate;
  if (rate === undefined) {
    throw new Error('expected a frame rate');
  }
  return rate;
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

async function setFrameRate(
  args: Record<string, unknown>,
): Promise<FrameRateOutcome> {
  let outcome: FrameRateOutcome | undefined;
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
      const parsed = await callTool(client, 'video_set_frame_rate', args);
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
  expect(body.tool).toBe('video_set_frame_rate');
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
  const outcome = await setFrameRate(args);
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
        name: 'video_set_frame_rate',
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
  'test_set_video_frame_rate: '
  + 're-encodes 25 fps input to 24 fps and keeps aac',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(boxPath);
  const inputProbe = probeView(await probeJson(boxPath));
  expect(frameRateOf(inputProbe)).toBe('25/1');
  expect(codecName(inputProbe, 'audio')).toBe('aac');
  const outcome = await setFrameRate({
    inputPath: boxPath,
    outputName: 'cinema rate',
    frameRate: 24,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-24fps.mp4', 'cinema-rate');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - cinema-rate'),
  );
  expect(outcome.text).toBe(
    `Set the frame rate of box.mp4 to 24 fps. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(frameRateOf(outputProbe)).toBe('24/1');
  expect(frameRateOf(outputProbe)).not.toBe(frameRateOf(inputProbe));
  expect(sha256Of(boxPath)).toBe(before);
});

it('re-encodes to 12.5 fps as 25/2', async (): Promise<void> => {
  const before = sha256Of(boxPath);
  const inputProbe = probeView(await probeJson(boxPath));
  const outcome = await setFrameRate({
    inputPath: boxPath,
    outputName: 'half rate',
    frameRate: 12.5,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'box-12.5fps.mp4', 'half-rate');
  expect(outcome.text).toBe(
    `Set the frame rate of box.mp4 to 12.5 fps. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(frameRateOf(outputProbe)).toBe('25/2');
  expect(frameRateOf(outputProbe)).not.toBe(frameRateOf(inputProbe));
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(sha256Of(boxPath)).toBe(before);
});

it.each(SCHEMA_VALUES)(
  'rejects frame rate %s before a folder is created',
  async (frameRate): Promise<void> => {
    await expectRejected({
      inputPath: boxPath,
      outputName: 'bad schema',
      frameRate,
    });
  },
);

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const source = probeView(await probeJson(pcmPath));
  expect(codecName(source, 'audio')).toBe('pcm_s16le');
  const before = sha256Of(pcmPath);
  const outcome = await setFrameRate({
    inputPath: pcmPath,
    outputName: 'pcm fallback',
    frameRate: 24,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'pcm-24fps.mp4',
    'pcm-fallback',
    1,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(frameRateOf(outputProbe)).toBe('24/1');
  expect(asList(outcome.body.warnings)).toHaveLength(1);
  expect(sha256Of(pcmPath)).toBe(before);
});

it('re-encodes a video that has no audio', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const inputProbe = probeView(await probeJson(silentPath));
  expect(streamsOf(inputProbe, 'audio')).toHaveLength(0);
  expect(frameRateOf(inputProbe)).toBe('25/1');
  const outcome = await setFrameRate({
    inputPath: silentPath,
    outputName: 'silent picture',
    frameRate: 24,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'silent-24fps.mp4',
    'silent-picture',
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(frameRateOf(outputProbe)).toBe('24/1');
  expect(streamsOf(outputProbe, 'audio')).toHaveLength(0);
  expect(sha256Of(silentPath)).toBe(before);
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      frameRate: 24,
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
      frameRate: 24,
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
      frameRate: 24,
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
    const tool = tools.find((candidate) => candidate.name === 'video_set_frame_rate');
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
    for (const name of ['inputPath', 'outputName', 'frameRate']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const frameRate = String(asRecord(properties.frameRate).description);
    expect(frameRate).toContain('frames per second');
    expect(frameRate).toContain('240');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'frameRate',
    ]);
  });
});
