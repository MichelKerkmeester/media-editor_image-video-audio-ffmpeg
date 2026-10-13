// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Speed Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { atempoChain, setptsFilter } from '../../../src/tools/video/set-speed.js';
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

interface SetptsCase {
  readonly factor: number;
  readonly filter: string;
}

interface AtempoCase {
  readonly factor: number;
  readonly chain: string;
}

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

interface SetSpeedOutcome extends CallOutcome {
  readonly text: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-set-speed-');

const DURATION_TOLERANCE_SECONDS = 0.15;

const SETPTS_CASES: readonly SetptsCase[] = [
  { factor: 2, filter: 'setpts=0.5*PTS' },
  { factor: 1.5, filter: 'setpts=0.6666666666666666*PTS' },
  { factor: 0.5, filter: 'setpts=2*PTS' },
  { factor: 4, filter: 'setpts=0.25*PTS' },
];

const ATEMPO_CASES: readonly AtempoCase[] = [
  { factor: 4, chain: 'atempo=2.0,atempo=2.0' },
  { factor: 0.25, chain: 'atempo=0.5,atempo=0.5' },
  { factor: 1.5, chain: 'atempo=1.5' },
  { factor: 8, chain: 'atempo=2.0,atempo=2.0,atempo=2.0' },
  { factor: 3, chain: 'atempo=2.0,atempo=1.5' },
  { factor: 0.3, chain: 'atempo=0.5,atempo=0.6' },
  {
    factor: 100,
    chain: 'atempo=2.0,atempo=2.0,atempo=2.0,atempo=2.0,atempo=2.0,atempo=2.0,atempo=1.5625',
  },
];

const SCHEMA_REJECTIONS = [0, -1, 100.5] as const;

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

function audioDuration(probe: ProbeView): number {
  const stream = streamsOf(probe, 'audio')[0];
  if (stream === undefined || stream.durationSeconds === undefined) {
    throw new Error('expected an audio stream duration');
  }
  return stream.durationSeconds;
}

function expectContainer(formatName: string, token: string): void {
  expect(formatName.split(',')).toContain(token);
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

async function setSpeed(args: Record<string, unknown>): Promise<SetSpeedOutcome> {
  let outcome: SetSpeedOutcome | undefined;
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
      const parsed = await callTool(client, 'video_set_speed', args);
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
  expect(body.tool).toBe('video_set_speed');
  expect(asList(body.warnings)).toHaveLength(0);
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
  const outcome = await setSpeed(args);
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
        name: 'video_set_speed',
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

const oraclePath = await generateVideo(sandbox.allowedRoot, {
  seconds: 3,
  width: 320,
  height: 240,
  withAudio: true,
  fileName: 'oracle.mp4',
});
const rushPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 4,
  width: 320,
  height: 240,
  withAudio: true,
  fileName: 'rush.mp4',
});
const slowPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 1,
  width: 320,
  height: 240,
  withAudio: true,
  fileName: 'slow.mp4',
});
const silentPath = await generateVideo(sandbox.allowedRoot, {
  seconds: 2,
  width: 160,
  height: 120,
  fileName: 'silent.mp4',
});
const tonePath = await generateAudio(sandbox.allowedRoot, {
  seconds: 1,
  format: 'wav',
  fileName: 'tone.wav',
});

it.each(SETPTS_CASES)(
  'builds factor $factor as $filter',
  (row): void => {
    expect(setptsFilter(row.factor)).toBe(row.filter);
  },
);

it.each(ATEMPO_CASES)(
  'builds factor $factor as $chain',
  (row): void => {
    expect(atempoChain(row.factor)).toBe(row.chain);
  },
);

it(
  'test_change_video_speed: '
  + 'speeds a 3 second clip with audio to about 2 seconds at 1.5',
  async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(oraclePath);
  const source = probeView(await probeJson(oraclePath));
  expectDurationNear(source.duration, 3);
  expect(codecName(source, 'audio')).toBe('aac');
  const outcome = await setSpeed({
    inputPath: oraclePath,
    outputName: 'oracle 1.5',
    speedFactor: 1.5,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'oracle-1.5x.mp4', 'oracle-15');
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '001 - oracle-15'));
  expect(outcome.text).toBe(
    `Changed the speed of oracle.mp4 by 1.5x. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expectContainer(outputProbe.formatName, 'mp4');
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expect(codecName(outputProbe, 'audio')).toBe('aac');
  expectDurationNear(outputProbe.duration, 2);
  expectDurationNear(audioDuration(outputProbe), 2);
  expect(sha256Of(oraclePath)).toBe(before);
});

it('speeds a 4 second clip to about 1 second at 4.0', async (): Promise<void> => {
  const before = sha256Of(rushPath);
  const source = probeView(await probeJson(rushPath));
  expectDurationNear(source.duration, 4);
  expect(codecName(source, 'audio')).toBe('aac');
  const outcome = await setSpeed({
    inputPath: rushPath,
    outputName: 'fast four',
    speedFactor: 4,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'rush-4x.mp4', 'fast-four');
  const outputProbe = probeView(await probeJson(filePath));
  expect(codecName(outputProbe, 'video')).toBe('h264');
  expectDurationNear(outputProbe.duration, 1);
  expectDurationNear(audioDuration(outputProbe), 1);
  expect(sha256Of(rushPath)).toBe(before);
});

it('slows a 1 second clip to about 4 seconds at 0.25', async (): Promise<void> => {
  const before = sha256Of(slowPath);
  const source = probeView(await probeJson(slowPath));
  expectDurationNear(source.duration, 1);
  const outcome = await setSpeed({
    inputPath: slowPath,
    outputName: 'quarter speed',
    speedFactor: 0.25,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'slow-0.25x.mp4', 'quarter-speed');
  const outputProbe = probeView(await probeJson(filePath));
  expectDurationNear(outputProbe.duration, 4);
  expectDurationNear(audioDuration(outputProbe), 4);
  expect(sha256Of(slowPath)).toBe(before);
});

it('slows a 1 second clip to about 2 seconds at 0.5', async (): Promise<void> => {
  const before = sha256Of(slowPath);
  const outcome = await setSpeed({
    inputPath: slowPath,
    outputName: 'half speed',
    speedFactor: 0.5,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'slow-0.5x.mp4', 'half-speed');
  const outputProbe = probeView(await probeJson(filePath));
  expectDurationNear(outputProbe.duration, 2);
  expectDurationNear(audioDuration(outputProbe), 2);
  expect(sha256Of(slowPath)).toBe(before);
});

it('speeds a silent 2 second clip to about 1 second at 2.0', async (): Promise<void> => {
  const before = sha256Of(silentPath);
  const source = probeView(await probeJson(silentPath));
  expect(streamsOf(source, 'audio')).toHaveLength(0);
  expectDurationNear(source.duration, 2);
  const outcome = await setSpeed({
    inputPath: silentPath,
    outputName: 'silent fast',
    speedFactor: 2,
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'silent-2x.mp4', 'silent-fast');
  expect(outcome.text).toBe(
    `Changed the speed of silent.mp4 by 2x. Output saved to ${filePath}.`,
  );
  const outputProbe = probeView(await probeJson(filePath));
  expect(streamsOf(outputProbe, 'audio')).toHaveLength(0);
  expectDurationNear(outputProbe.duration, 1);
  expect(sha256Of(silentPath)).toBe(before);
});

it.each(SCHEMA_REJECTIONS)(
  'rejects speedFactor %s before a folder is created',
  async (speedFactor): Promise<void> => {
    await expectRejected({
      inputPath: oraclePath,
      outputName: 'bad schema',
      speedFactor,
    });
  },
);

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: tonePath,
      outputName: 'audio only',
      speedFactor: 2,
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: tonePath,
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
      speedFactor: 2,
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
      speedFactor: 2,
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
    const tool = tools.find((candidate) => candidate.name === 'video_set_speed');
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
    for (const name of ['inputPath', 'outputName', 'speedFactor']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const speedFactor = String(asRecord(properties.speedFactor).description);
    expect(speedFactor).toContain('0.5');
    expect(speedFactor).toContain('100');
    expect(tool.inputSchema.required).toEqual(['inputPath', 'outputName', 'speedFactor']);
  });
});
