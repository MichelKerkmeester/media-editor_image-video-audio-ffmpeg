// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Audio Codec Tests
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

interface CodecCase {
  readonly audioCodec: 'libmp3lame' | 'mp3' | 'libopus';
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

interface AudioCodecOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-audio-codec-');

const CODEC_CASES: readonly CodecCase[] = [
  {
    audioCodec: 'libmp3lame',
    probed: 'mp3',
    fileToken: 'libmp3lame',
    slug: 'mp3 audio',
  },
  {
    audioCodec: 'mp3',
    probed: 'mp3',
    fileToken: 'libmp3lame',
    slug: 'alias audio',
  },
  {
    audioCodec: 'libopus',
    probed: 'opus',
    fileToken: 'libopus',
    slug: 'opus audio',
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

// The description names libmp3lame, so only the leftover text proves the alias is absent.
function withoutAlias(text: string): string {
  return text.replaceAll('libmp3lame', '');
}

async function setAudioCodec(
  args: Record<string, unknown>,
): Promise<AudioCodecOutcome> {
  let outcome: AudioCodecOutcome | undefined;
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
      const parsed = await callTool(client, 'video_set_audio_codec', args);
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
  expect(body.tool).toBe('video_set_audio_codec');
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
  const outcome = await setAudioCodec(args);
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
        name: 'video_set_audio_codec',
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
    seconds: 2,
    width: 320,
    height: 240,
    withAudio: true,
    fileName: 'talk.mp4',
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
// MP4 cannot store the picture ffv1 writes, so the copy attempt has to fail.
const ffv1Path = path.join(sandbox.allowedRoot, 'ffv1.mkv');
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
  'ffv1',
  '-c:a',
  'aac',
  '-shortest',
  ffv1Path,
], {
  kind: 'ffmpeg',
  timeoutMs: 60000,
});

it(
  'test_set_video_audio_track_codec: '
  + 're-encodes aac audio and copies the h264 picture',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(talkPath);
  const inputProbe = probeView(await probeJson(talkPath));
  expect(codecName(inputProbe, 'video')).toBe('h264');
  expect(codecName(inputProbe, 'audio')).toBe('aac');
  const outcome = await setAudioCodec({
    inputPath: talkPath,
    outputName: 'aac audio',
    audioCodec: 'aac',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'talk-audio-aac.mp4', 'aac-audio');
  expect(path.dirname(filePath)).toBe(
    path.join(sandbox.outputDir, '001 - aac-audio'),
  );
  expect(outcome.text).toBe(
    `Set the audio codec of talk.mp4 to aac. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(sha256Of(filePath)).not.toBe(before);
  expect(sha256Of(talkPath)).toBe(before);
});

it.each(CODEC_CASES)(
  'writes $probed audio for $audioCodec into $fileToken',
  async (row): Promise<void> => {
    const before = sha256Of(talkPath);
    const inputProbe = probeView(await probeJson(talkPath));
    expect(codecName(inputProbe, 'audio')).toBe('aac');
    const outcome = await setAudioCodec({
      inputPath: talkPath,
      outputName: row.slug,
      audioCodec: row.audioCodec,
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(
      outcome.body,
      `talk-audio-${row.fileToken}.mp4`,
      row.slug.replaceAll(' ', '-'),
    );
    expect(outcome.text).toBe(
      `Set the audio codec of talk.mp4 to ${row.fileToken}. `
      + `Output saved to ${filePath}.`,
    );
    const outputProbe = probeView(await probeJson(filePath));
    expectContainer(outputProbe.formatName, 'mp4');
    expect(codecName(outputProbe, 'video')).toBe('h264');
    expect(codecName(outputProbe, 'audio')).toBe(row.probed);
    expect(codecName(outputProbe, 'audio')).not.toBe(
      codecName(inputProbe, 'audio'),
    );
    expect(sha256Of(talkPath)).toBe(before);
  },
);

it('re-encodes an ffv1 picture when the copy cannot', async (): Promise<void> => {
  const before = sha256Of(ffv1Path);
  const sourceProbe = probeView(await probeJson(ffv1Path));
  expect(codecName(sourceProbe, 'video')).toBe('ffv1');
  expect(codecName(sourceProbe, 'audio')).toBe('aac');
  const outcome = await setAudioCodec({
    inputPath: ffv1Path,
    outputName: 'ffv1 fallback',
    audioCodec: 'aac',
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(
    outcome.body,
    'ffv1-audio-aac.mp4',
    'ffv1-fallback',
    1,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'video')).not.toBe(
    codecName(sourceProbe, 'video'),
  );
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expect(sha256Of(ffv1Path)).toBe(before);
});

it('returns UNSUPPORTED_FORMAT for a video with no audio', async (): Promise<void> => {
  const inputProbe = probeView(await probeJson(silentPath));
  expect(streamsOf(inputProbe, 'audio')).toHaveLength(0);
  await expectFailure(
    {
      inputPath: silentPath,
      outputName: 'no audio',
      audioCodec: 'aac',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: silentPath,
      detected: ['video'],
      accepted: ['audio'],
    },
  );
});

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: audioPath,
      outputName: 'audio only',
      audioCodec: 'aac',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: audioPath,
      detected: ['audio'],
      accepted: ['video'],
    },
  );
});

it('rejects audioCodec vorbis before a folder is created', async (): Promise<void> => {
  await expectRejected({
    inputPath: talkPath,
    outputName: 'bad codec',
    audioCodec: 'vorbis',
  });
});

it('rejects an outputName that holds a path separator', async (): Promise<void> => {
  await expectRejected({
    inputPath: talkPath,
    outputName: 'bad/name',
    audioCodec: 'aac',
  });
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside',
      audioCodec: 'aac',
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
      audioCodec: 'aac',
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
    const tool = tools.find(
      (candidate) => candidate.name === 'video_set_audio_codec',
    );
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
    expect(withoutAlias(tool.description ?? '')).not.toContain('mp3');
    const properties = asRecord(tool.inputSchema.properties);
    for (const name of ['inputPath', 'outputName', 'audioCodec']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const codec = String(asRecord(properties.audioCodec).description);
    expect(codec).toContain('aac');
    expect(codec).toContain('libmp3lame');
    expect(codec).toContain('libopus');
    expect(withoutAlias(codec)).not.toContain('mp3');
    expect(tool.inputSchema.required).toEqual([
      'inputPath',
      'outputName',
      'audioCodec',
    ]);
  });
});
