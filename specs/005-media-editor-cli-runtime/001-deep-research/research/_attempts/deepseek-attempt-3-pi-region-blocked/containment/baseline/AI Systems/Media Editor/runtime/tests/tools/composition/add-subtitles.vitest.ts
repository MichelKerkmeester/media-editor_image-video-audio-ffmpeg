// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Subtitles Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import {
  assColor,
  forceStyle,
  subtitlesFilter,
  videoAddSubtitlesTool,
} from '../../../src/tools/video/add-subtitles.js';
import {
  meanColor,
  meanLuma,
  writeSubRip,
} from '../../helpers/composition-media.js';
import {
  generateAudio,
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
import type { SubtitleFontStyle } from '../../../src/tools/video/add-subtitles.js';
import type { FrameRegion, SubRipCue } from '../../helpers/composition-media.js';
import type { CallOutcome } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface StreamView {
  readonly codecType: string;
  readonly codecName: string;
  readonly width: number;
  readonly height: number;
}

interface MediaView {
  readonly durationSeconds: number;
  readonly streams: readonly StreamView[];
}

interface SubtitleOutcome extends CallOutcome {
  readonly text: string;
}

interface SrtPathCase {
  readonly label: string;
  readonly slug: string;
  readonly subtitlePath: string;
}

interface SchemaCase {
  readonly label: string;
  readonly fontStyle: Record<string, unknown>;
}

interface Size {
  readonly width: number;
  readonly height: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-add-subtitles-');

const CLIP_SECONDS = 3;
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const FRAME_RATE = 25;
const PROCESS_TIMEOUT_MS = 60000;
const DURATION_TOLERANCE_SECONDS = 0.15;

const BLACK_LUMA_LIMIT = 5;
const TEXT_BRIGHTNESS_MARGIN = 4;
const RED_GREEN_MARGIN = 3;
const SAME_FRAME_TOLERANCE = 2;

const BOTTOM_BAND: FrameRegion = {
  x: 0,
  y: FRAME_HEIGHT - 60,
  width: FRAME_WIDTH,
  height: 60,
};

const AUDIO_COPY_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const CUE_LIST: readonly SubRipCue[] = [
  { start: 0, end: 1.5, text: 'This is a test subtitle' },
  { start: 1.5, end: CLIP_SECONDS, text: 'Second subtitle line' },
];

const FULL_STYLE: SubtitleFontStyle = {
  fontName: 'Inter',
  fontSize: 24,
  fontColor: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 2,
  shadowColor: '#808080',
  shadowOffset: 1,
  alignment: 2,
  marginV: 10,
  marginL: 5,
  marginR: 5,
};

const cuesPath = writeSubRip(sandbox.allowedRoot, 'cues.srt', CUE_LIST);
const lateCuePath = writeSubRip(sandbox.allowedRoot, 'late.srt', [
  { start: 2, end: CLIP_SECONDS, text: 'Late subtitle' },
]);
const redCuePath = writeSubRip(sandbox.allowedRoot, 'red.srt', [
  { start: 0, end: CLIP_SECONDS, text: 'Red subtitle' },
]);
const colonSubtitlePath = writeSubRip(sandbox.allowedRoot, 'a:b.srt', CUE_LIST);
const apostropheSubtitlePath = writeSubRip(sandbox.allowedRoot, "it's.srt", CUE_LIST);

const notSubRipPath = path.join(sandbox.allowedRoot, 'not-subrip.srt');
writeFileSync(notSubRipPath, '[Script Info]\nTitle: demo\n', 'utf8');
const assSubtitlePath = path.join(sandbox.allowedRoot, 'subtitle.ass');
writeFileSync(assSubtitlePath, '1\n00:00:00,000 --> 00:00:01,000\nHello\n\n', 'utf8');

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const outsideSubtitlePath = path.join(sandbox.root, 'outside.srt');
writeFileSync(outsidePath, 'outside');
writeFileSync(outsideSubtitlePath, '1\n00:00:00,000 --> 00:00:01,000\nHello\n\n', 'utf8');

const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
const missingSubtitlePath = path.join(sandbox.allowedRoot, 'missing.srt');

const SRT_PATH_CASES: readonly SrtPathCase[] = [
  { label: 'a colon in the file name', slug: 'colon-name', subtitlePath: colonSubtitlePath },
  {
    label: 'an apostrophe in the file name',
    slug: 'apostrophe-name',
    subtitlePath: apostropheSubtitlePath,
  },
];

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'a semicolon in the font name', fontStyle: { fontName: 'Inter;x' } },
  { label: 'a named colour', fontStyle: { fontColor: 'white' } },
  { label: 'an alignment of 10', fontStyle: { alignment: 10 } },
  { label: 'an unknown style key', fontStyle: { bold: true } },
];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function numberOrZero(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function probeView(value: unknown): MediaView {
  const root = asRecord(value);
  const format = asRecord(root.format);
  const durationSeconds = Number(format.duration);
  if (!Number.isFinite(durationSeconds)) {
    throw new Error('expected a probe duration');
  }
  const streams: StreamView[] = [];
  for (const entry of asList(root.streams)) {
    const stream = asRecord(entry);
    const codecType = stream.codec_type;
    if (typeof codecType !== 'string') {
      throw new Error('expected a stream kind');
    }
    streams.push({
      codecType,
      codecName: stringOrEmpty(stream.codec_name),
      width: numberOrZero(stream.width),
      height: numberOrZero(stream.height),
    });
  }
  return { durationSeconds, streams };
}

function streamsOf(view: MediaView, codecType: string): StreamView[] {
  return view.streams.filter((stream) => stream.codecType === codecType);
}

function videoSize(view: MediaView): Size {
  const stream = streamsOf(view, 'video')[0];
  if (stream === undefined) {
    throw new Error('expected a video stream');
  }
  return { width: stream.width, height: stream.height };
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

async function generateBlackClip(
  dir: string,
  fileName: string,
  audioCodec: string,
): Promise<string> {
  const binary = await resolveTestBinary('ffmpeg');
  if (binary === undefined) {
    throw new Error('ffmpeg is not available');
  }
  const output = path.join(dir, fileName);
  await runProcess(binary, [
    '-f',
    'lavfi',
    '-i',
    `color=c=black:s=${FRAME_WIDTH}x${FRAME_HEIGHT}:r=${FRAME_RATE}:d=${CLIP_SECONDS}`,
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=440:duration=${CLIP_SECONDS}`,
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    audioCodec,
    '-shortest',
    output,
  ], {
    kind: 'ffmpeg',
    timeoutMs: PROCESS_TIMEOUT_MS,
  });
  return output;
}

async function addSubtitles(args: Record<string, unknown>): Promise<SubtitleOutcome> {
  let outcome: SubtitleOutcome | undefined;
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
      const parsed = await callTool(client, 'video_add_subtitles', args);
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

async function bandBrightness(videoPath: string, atSeconds: number): Promise<number> {
  const average = await meanColor(videoPath, atSeconds, BOTTOM_BAND);
  return (average.r + average.g + average.b) / 3;
}

function writtenPath(
  body: Record<string, unknown>,
  fileName: string,
  slug: string,
  warningCount = 0,
): string {
  expect(body.tool).toBe('video_add_subtitles');
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
  const outcome = await addSubtitles(args);
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
        name: 'video_add_subtitles',
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

let blackPath = '';
let pcmPath = '';
let tonePath = '';
let sourceDuration = 0;
let inputBand = 0;

beforeAll(async (): Promise<void> => {
  blackPath = await generateBlackClip(sandbox.allowedRoot, 'black.mp4', 'aac');
  pcmPath = await generateBlackClip(sandbox.allowedRoot, 'black-pcm.mkv', 'pcm_s16le');
  tonePath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  sourceDuration = probeView(await probeJson(blackPath)).durationSeconds;
  inputBand = await bandBrightness(blackPath, 1);
});

afterAll((): void => {
  sandbox.cleanup();
});

it('test_add_subtitles: burns the cues in', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const beforeVideo = sha256Of(blackPath);
  const beforeSubtitle = sha256Of(cuesPath);
  expect(sourceDuration).toBeGreaterThanOrEqual(CLIP_SECONDS);
  expect(await meanLuma(blackPath, 1)).toBeLessThan(BLACK_LUMA_LIMIT);
  const outcome = await addSubtitles({
    inputPath: blackPath,
    subtitlePath: cuesPath,
    outputName: 'burn in',
    fontStyle: {
      fontSize: 24,
      fontColor: '#FFFFFF',
      outlineColor: '#000000',
      outlineWidth: 2,
    },
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-subtitled.mp4', 'burn-in');
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '001 - burn-in'));
  expect(outcome.text).toBe(`Added subtitles to black.mp4. Output saved to ${filePath}.`);
  const output = probeView(await probeJson(filePath));
  expect(Math.abs(output.durationSeconds - sourceDuration))
    .toBeLessThanOrEqual(DURATION_TOLERANCE_SECONDS);
  const audio = streamsOf(output, 'audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]?.codecName).toBe('aac');
  expect(videoSize(output)).toEqual({ width: FRAME_WIDTH, height: FRAME_HEIGHT });
  const drawn = await bandBrightness(filePath, 1);
  expect(drawn).toBeGreaterThan(inputBand + TEXT_BRIGHTNESS_MARGIN);
  expect(sha256Of(blackPath)).toBe(beforeVideo);
  expect(sha256Of(cuesPath)).toBe(beforeSubtitle);
});

it('draws a cue only inside its own time window', async (): Promise<void> => {
  const beforeVideo = sha256Of(blackPath);
  const beforeSubtitle = sha256Of(lateCuePath);
  const quietInput = await bandBrightness(blackPath, 0.5);
  const loudInput = await bandBrightness(blackPath, 2.5);
  const outcome = await addSubtitles({
    inputPath: blackPath,
    subtitlePath: lateCuePath,
    outputName: 'late cue',
    fontStyle: { fontSize: 24, fontColor: '#FFFFFF', outlineColor: '#000000' },
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-subtitled.mp4', 'late-cue');
  const quiet = await bandBrightness(filePath, 0.5);
  const loud = await bandBrightness(filePath, 2.5);
  expect(quiet).toBeLessThanOrEqual(quietInput + SAME_FRAME_TOLERANCE);
  expect(loud).toBeGreaterThan(loudInput + TEXT_BRIGHTNESS_MARGIN);
  expect(sha256Of(blackPath)).toBe(beforeVideo);
  expect(sha256Of(lateCuePath)).toBe(beforeSubtitle);
});

it('draws the text in the colour the caller named', async (): Promise<void> => {
  const beforeVideo = sha256Of(blackPath);
  const outcome = await addSubtitles({
    inputPath: blackPath,
    subtitlePath: redCuePath,
    outputName: 'red text',
    fontStyle: {
      fontSize: 24,
      fontColor: '#FF0000',
      outlineColor: '#000000',
      outlineWidth: 2,
    },
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-subtitled.mp4', 'red-text');
  const band = await meanColor(filePath, 1, BOTTOM_BAND);
  expect(band.r).toBeGreaterThan(band.g + RED_GREEN_MARGIN);
  expect(sha256Of(blackPath)).toBe(beforeVideo);
});

it.each(SRT_PATH_CASES)(
  'test_add_subtitles: burns text from a path with $label',
  async (row): Promise<void> => {
    const beforeVideo = sha256Of(blackPath);
    const beforeSubtitle = sha256Of(row.subtitlePath);
    const outcome = await addSubtitles({
      inputPath: blackPath,
      subtitlePath: row.subtitlePath,
      outputName: `name ${row.slug}`,
      fontStyle: { fontSize: 24, fontColor: '#FFFFFF', outlineColor: '#000000' },
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(outcome.body, 'black-subtitled.mp4', `name-${row.slug}`);
    const drawn = await bandBrightness(filePath, 1);
    expect(drawn).toBeGreaterThan(inputBand + TEXT_BRIGHTNESS_MARGIN);
    expect(sha256Of(blackPath)).toBe(beforeVideo);
    expect(sha256Of(row.subtitlePath)).toBe(beforeSubtitle);
  },
);

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const beforeVideo = sha256Of(pcmPath);
  const outcome = await addSubtitles({
    inputPath: pcmPath,
    subtitlePath: cuesPath,
    outputName: 'pcm fallback',
    fontStyle: { fontSize: 24, fontColor: '#FFFFFF', outlineColor: '#000000' },
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-pcm-subtitled.mp4', 'pcm-fallback', 1);
  expect(asList(outcome.body.warnings)).toEqual([AUDIO_COPY_WARNING]);
  const output = probeView(await probeJson(filePath));
  const audio = streamsOf(output, 'audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]?.codecName).toBe('aac');
  expect(sha256Of(pcmPath)).toBe(beforeVideo);
});

it('converts colours to the ASS byte order', (): void => {
  expect(assColor('#FFFFFF')).toBe('&H00FFFFFF');
  expect(assColor('#FF8800')).toBe('&H000088FF');
  expect(assColor('#000000')).toBe('&H00000000');
});

it('builds the force_style list in the fixed key order', (): void => {
  expect(forceStyle(undefined)).toBeUndefined();
  expect(forceStyle({})).toBeUndefined();
  expect(forceStyle({ fontSize: 24 })).toBe('FontSize=24');
  expect(forceStyle(FULL_STYLE)).toBe(
    'FontName=Inter,FontSize=24,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,'
    + 'Outline=2,ShadowColour=&H00808080,Shadow=1,Alignment=2,MarginV=10,MarginL=5,MarginR=5',
  );
});

it('keeps a windows drive letter whole through the graph escaping', (): void => {
  // The escape rule is platform independent; this ran on macOS, not on Windows.
  expect(subtitlesFilter('C:\\clips\\a.srt', '/fonts', undefined)).toBe(
    `subtitles='C\\:\\\\clips\\\\a.srt':fontsdir='/fonts'`,
  );
});

it('quotes the style list as one option value', (): void => {
  expect(subtitlesFilter('/tmp/a.srt', '/fonts', 'FontSize=24')).toBe(
    "subtitles='/tmp/a.srt':fontsdir='/fonts':force_style='FontSize=24'",
  );
});

it('returns UNSUPPORTED_FORMAT for a subtitle file that is not SubRip', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      subtitlePath: notSubRipPath,
      outputName: 'not subrip',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: notSubRipPath,
      detected: 'unknown',
      accepted: 'subrip',
      reason: 'not-subrip',
    },
  );
});

it('returns UNSUPPORTED_FORMAT for a subtitle path that is not .srt', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      subtitlePath: assSubtitlePath,
      outputName: 'ass subtitle',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    {
      path: assSubtitlePath,
      detected: 'ass',
      accepted: ['srt'],
    },
  );
});

it('returns INPUT_NOT_FOUND for a subtitle path that is not there', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      subtitlePath: missingSubtitlePath,
      outputName: 'missing subtitle',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingSubtitlePath, role: 'subtitle' },
  );
});

it('returns PATH_NOT_ALLOWED for a subtitle outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      subtitlePath: outsideSubtitlePath,
      outputName: 'outside subtitle',
    },
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsideSubtitlePath,
      realPath: outsideSubtitlePath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it.each(SCHEMA_CASES)('rejects $label before a folder is created', async (row): Promise<void> => {
  await expectRejected({
    inputPath: blackPath,
    subtitlePath: cuesPath,
    outputName: 'bad style',
    fontStyle: row.fontStyle,
  });
});

it('returns INPUT_NOT_FOUND when the input is missing', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: missingPath,
      subtitlePath: cuesPath,
      outputName: 'missing input',
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingPath, role: 'input' },
  );
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      subtitlePath: cuesPath,
      outputName: 'outside input',
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

it('returns UNSUPPORTED_FORMAT for an audio-only input', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: tonePath,
      subtitlePath: cuesPath,
      outputName: 'audio only',
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { path: tonePath, detected: ['audio'], accepted: ['video'] },
  );
});

it('lists the tool with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'video_add_subtitles');
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
    for (const name of ['inputPath', 'subtitlePath', 'outputName']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    const fontStyle = asRecord(properties.fontStyle);
    const styleProperties = asRecord(fontStyle.properties);
    for (const name of ['fontName', 'fontSize', 'fontColor', 'alignment', 'marginV']) {
      const field = asRecord(styleProperties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(styleProperties.alignment).description)).toContain('7');
    expect(tool.inputSchema.required).toEqual(['inputPath', 'subtitlePath', 'outputName']);
  });
});

it('hands the filter a temp copy of a subtitle outside the safe set', async (): Promise<void> => {
  const real = createToolContext(sandbox.config);
  const filters: string[] = [];
  const context: ToolContext = {
    ...real,
    runBinary: async (name, args, options) => {
      const at = args.indexOf('-vf');
      if (name === 'ffmpeg' && at >= 0) {
        filters.push(String(args[at + 1]));
      }
      return real.runBinary(name, args, options);
    },
  };
  const before = sha256Of(apostropheSubtitlePath);
  await videoAddSubtitlesTool.handler(
    { inputPath: blackPath, subtitlePath: apostropheSubtitlePath, outputName: 'copy route' },
    context,
  );

  expect(filters).toHaveLength(1);
  const [filter] = filters;
  expect(filter).toContain('/subtitle.srt');
  expect(filter).not.toContain(path.dirname(apostropheSubtitlePath));
  expect(sha256Of(apostropheSubtitlePath)).toBe(before);
});
