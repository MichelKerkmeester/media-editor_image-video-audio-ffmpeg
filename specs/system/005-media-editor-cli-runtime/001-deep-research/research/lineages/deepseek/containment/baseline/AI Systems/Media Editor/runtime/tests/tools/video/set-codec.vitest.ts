// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Codec Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import { videoSetCodecTool } from '../../../src/tools/video/set-codec.js';
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

import type { ToolContext } from '../../../src/server/tool-context.js';
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface CodecCase {
  readonly codec: 'libx265' | 'vp9';
  readonly probed: string;
  readonly fileToken: string;
  readonly slug: string;
}

interface ProbeStream {
  readonly codecType: string;
  readonly codecName: string;
}

interface ProbeView {
  readonly formatName: string;
  readonly streams: readonly ProbeStream[];
}

interface CodecOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-codec-');

const CODEC_CASES: readonly CodecCase[] = [
  {
    codec: 'libx265',
    probed: 'hevc',
    fileToken: 'libx265',
    slug: 'hevc picture',
  },
  {
    codec: 'vp9',
    probed: 'vp9',
    fileToken: 'libvpx-vp9',
    slug: 'vp9 picture',
  },
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
    streams.push({ codecType, codecName });
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

function withoutAlias(text: string): string {
  return text.replaceAll('libvpx-vp9', '');
}

async function setCodec(args: Record<string, unknown>): Promise<CodecOutcome> {
  let outcome: CodecOutcome | undefined;
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
      const parsed = await callTool(client, 'video_set_codec', args);
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
  expect(body.tool).toBe('video_set_codec');
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
  const outcome = await setCodec(args);
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
        name: 'video_set_codec',
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

const [talkPath, silentPath, audioPath] = await Promise.all([
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 160,
    height: 120,
    withAudio: true,
    fileName: 'talk.mp4',
  }),
  generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 160,
    height: 120,
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
  'test_set_video_codec: '
  + 'encodes libx264 as h264 and keeps aac',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(talkPath);
  const inputProbe = probeView(await probeJson(talkPath));
  expect(codecName(inputProbe, 'video')).toBe('h264');
  expect(codecName(inputProbe, 'audio')).toBe('aac');
  const outcome = await setCodec({
    inputPath: talkPath,
    outputName: 'h264 picture',
    codec: 'libx264',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'talk-libx264.mp4', 'h264-picture');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - h264-picture'),
  );
  expect(outcome.text).toBe(
    `Set the video codec of talk.mp4 to libx264. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(sha256Of(filePath)).not.toBe(before);
  expect(sha256Of(talkPath)).toBe(before);
});

it.each(CODEC_CASES)(
  'encodes $codec as $probed in a $fileToken file and keeps aac',
  async (row): Promise<void> => {
    const before = sha256Of(talkPath);
    const inputProbe = probeView(await probeJson(talkPath));
    expect(codecName(inputProbe, 'video')).toBe('h264');
    const outcome = await setCodec({
      inputPath: talkPath,
      outputName: row.slug,
      codec: row.codec,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `talk-${row.fileToken}.mp4`,
      row.slug.replaceAll(' ', '-'),
    );
    expect(outcome.text).toBe(
      `Set the video codec of talk.mp4 to ${row.fileToken}. `
      + `Output saved to ${filePath}.`,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expectContainer(outputProbe.formatName, 'mp4');
    expect(codecName(outputProbe, 'video')).toBe(row.probed);
    expect(codecName(outputProbe, 'video')).not.toBe(
      codecName(inputProbe, 'video'),
    );
    expect(codecName(outputProbe, 'audio')).toBe('aac');
    expect(sha256Of(talkPath)).toBe(before);
  },
);

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const source = probeView(await probeJson(pcmPath));
  expect(codecName(source, 'audio')).toBe('pcm_s16le');
  const before = sha256Of(pcmPath);
  const outcome = await setCodec({
    inputPath: pcmPath,
    outputName: 'pcm fallback',
    codec: 'libx264',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'pcm-libx264.mp4',
    'pcm-fallback',
    1,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(asList(outcome.body.warnings)).toHaveLength(1);
  expect(sha256Of(pcmPath)).toBe(before);
});

it('re-encodes a video that has no audio', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const inputProbe = probeView(await probeJson(silentPath));
  expect(streamsOf(inputProbe, 'audio')).toHaveLength(0);
  expect(codecName(inputProbe, 'video')).toBe('h264');
  const outcome = await setCodec({
    inputPath: silentPath,
    outputName: 'silent picture',
    codec: 'libx264',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'silent-libx264.mp4',
    'silent-picture',
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(streamsOf(outputProbe, 'audio')).toHaveLength(0);
  expect(sha256Of(filePath)).not.toBe(before);
  expect(sha256Of(silentPath)).toBe(before);
});

it('rejects codec h264 before a folder is created', async (): Promise<void> => {
  await expectRejected({
    inputPath: talkPath,
    outputName: 'bad codec',
    codec: 'h264',
  });
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      codec: 'libx264',
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
      codec: 'libx264',
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
      codec: 'libx264',
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
    const tool = tools.find((candidate) => candidate.name === 'video_set_codec');
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
    expect(withoutAlias(tool.description ?? '')).not.toContain('vp9');
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'outputName', 'codec']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const codec = String(asRecord(properties.codec).description);
    expect(codec).toContain('libx264');
    expect(codec).toContain('libx265');
    expect(codec).toContain('libvpx-vp9');
    expect(withoutAlias(codec)).not.toContain('vp9');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'codec',
    ]);
  });
});

it('returns CAPABILITY_MISSING for libx265 before any ffmpeg run', async (): Promise<void> => {
  const real = createToolContext(sandbox.config);
  let ffmpegRuns = 0;
  const context: ToolContext = {
    ...real,
    getCapabilities: async () => ({
      binaryPath: '/opt/ffmpeg/ffmpeg',
      capabilities: { encoders: new Set(['libx264', 'aac']), filters: new Set<string>() },
    }),
    runBinary: async (name, args, options) => {
      if (name === 'ffmpeg') {
        ffmpegRuns += 1;
      }
      return real.runBinary(name, args, options);
    },
  };
  const before = listFolders(sandbox.outputDir);
  let failure: unknown;
  try {
    await videoSetCodecTool.handler(
      { inputPath: talkPath, outputName: 'no hevc', codec: 'libx265' },
      context,
    );
  } catch (error: unknown) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(MediaError);
  if (!(failure instanceof MediaError)) {
    return;
  }
  expect(failure.code).toBe(ERROR_CODES.CAPABILITY_MISSING);
  expect(failure.details.name).toBe('libx265');
  expect(failure.details.kind).toBe('encoder');
  expect(ffmpegRuns).toBe(0);
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});
