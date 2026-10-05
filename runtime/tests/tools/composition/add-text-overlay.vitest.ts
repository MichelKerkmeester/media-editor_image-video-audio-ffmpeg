// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Text Overlay Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { copyFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { escapeFilterValue } from '../../../src/core/filter-escape.js';
import { bundledFontPath } from '../../../src/core/font-path.js';
import { runProcess } from '../../../src/core/process-runner.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import {
  drawtextFilter,
  textOverlayFilter,
  videoAddTextOverlayTool,
} from '../../../src/tools/video/add-text-overlay.js';
import { meanColor, meanLuma } from '../../helpers/composition-media.js';
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
import type { TextOverlayElement } from '../../../src/tools/video/add-text-overlay.js';
import type { FrameRegion } from '../../helpers/composition-media.js';
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

interface OverlayOutcome extends CallOutcome {
  readonly text: string;
}

interface EscapeCase {
  readonly label: string;
  readonly slug: string;
  readonly text: string;
  readonly position: string;
}

interface TimeCase {
  readonly label: string;
  readonly startTime: number;
  readonly endTime: number;
}

interface SchemaCase {
  readonly label: string;
  readonly textElements: readonly unknown[];
}

interface Size {
  readonly width: number;
  readonly height: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const sandbox = createSandbox('video-add-text-overlay-');

const CLIP_SECONDS = 3;
const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 240;
const FRAME_RATE = 25;
const PROCESS_TIMEOUT_MS = 60000;
const DURATION_TOLERANCE_SECONDS = 0.15;

// One black fixture frame is nearly 0, so a drawn glyph pushes the region mean up.
const BLACK_LUMA_LIMIT = 5;
const TEXT_LUMA_MARGIN = 8;
const BOX_RED_MARGIN = 30;
const SAME_FRAME_TOLERANCE = 2;

const TEXT_REGION: FrameRegion = { x: 0, y: 0, width: 160, height: 60 };
const BOX_REGION: FrameRegion = { x: 100, y: 80, width: 120, height: 80 };
const OPPOSITE_REGION: FrameRegion = { x: 160, y: 180, width: 160, height: 60 };

const AUDIO_COPY_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const ESCAPE_CASES: readonly EscapeCase[] = [
  {
    label: 'a quote, a percent and a colon',
    slug: 'quote-percent',
    text: "it's 50% off, today: [now]; a=b",
    position: 'top-left',
  },
  {
    label: 'an embedded line feed',
    slug: 'embedded-line-feed',
    text: 'line one\nline two',
    position: 'top_left',
  },
  {
    label: 'a graph injection attempt',
    slug: 'injection',
    text: "x',scale=1:1,drawtext=text='y",
    position: 'top_left',
  },
  {
    label: 'a windows line break',
    slug: 'windows-line-break',
    text: 'first line\r\nsecond line',
    position: 'top-left',
  },
];

const TIME_CASES: readonly TimeCase[] = [
  { label: 'an end time equal to the start time', startTime: 1, endTime: 1 },
  { label: 'an end time before the start time', startTime: 2, endTime: 1 },
];

const SCHEMA_CASES: readonly SchemaCase[] = [
  { label: 'an empty element list', textElements: [] },
  {
    label: 'a 51 element list',
    textElements: Array.from({ length: 51 }, () => elementOf({})),
  },
  { label: 'an unknown key in an element', textElements: [elementOf({ xPos: 10 })] },
  { label: 'a named colour', textElements: [elementOf({ fontColor: 'white' })] },
  { label: 'a font size of zero', textElements: [elementOf({ fontSize: 0 })] },
  { label: 'an unknown position', textElements: [elementOf({ position: 'middle' })] },
  { label: 'a NUL in the text', textElements: [elementOf({ text: 'a\u0000b' })] },
  { label: 'half of a surrogate pair', textElements: [elementOf({ text: 'a\uD800b' })] },
];

const outsidePath = path.join(sandbox.root, 'outside.mp4');
const outsideFontPath = path.join(sandbox.root, 'outside.ttf');
const missingPath = path.join(sandbox.allowedRoot, 'missing.mp4');
const missingFontPath = path.join(sandbox.allowedRoot, 'missing.ttf');
writeFileSync(outsidePath, 'outside');
writeFileSync(outsideFontPath, 'font');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function elementOf(overrides: Record<string, unknown>): Record<string, unknown> {
  return { text: 'Test', startTime: 0, endTime: 1, ...overrides };
}

function overlayElement(overrides: Partial<TextOverlayElement>): TextOverlayElement {
  return {
    text: 'Test Overlay',
    startSeconds: 0,
    endSeconds: 5,
    position: 'bottom_center',
    fontSize: 24,
    fontColor: '#FFFFFF',
    box: false,
    boxColor: '#000000',
    boxOpacity: 0.5,
    boxBorderWidth: 0,
    ...overrides,
  };
}

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

async function addTextOverlay(args: Record<string, unknown>): Promise<OverlayOutcome> {
  let outcome: OverlayOutcome | undefined;
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
      const parsed = await callTool(client, 'video_add_text_overlay', args);
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
  expect(body.tool).toBe('video_add_text_overlay');
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
  const outcome = await addTextOverlay(args);
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
        name: 'video_add_text_overlay',
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
let apostropheFontPath = '';
let tonePath = '';
let sourceDuration = 0;
let inputTextRed = 0;
let inputBoxRed = 0;
let inputOppositeRed = 0;

beforeAll(async (): Promise<void> => {
  blackPath = await generateBlackClip(sandbox.allowedRoot, 'black.mp4', 'aac');
  pcmPath = await generateBlackClip(sandbox.allowedRoot, 'black-pcm.mkv', 'pcm_s16le');
  apostropheFontPath = path.join(sandbox.allowedRoot, "it's font.ttf");
  copyFileSync(bundledFontPath(), apostropheFontPath);
  tonePath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  sourceDuration = probeView(await probeJson(blackPath)).durationSeconds;
  inputTextRed = (await meanColor(blackPath, 1, TEXT_REGION)).r;
  inputBoxRed = (await meanColor(blackPath, 1, BOX_REGION)).r;
  inputOppositeRed = (await meanColor(blackPath, 1, OPPOSITE_REGION)).r;
});

afterAll((): void => {
  sandbox.cleanup();
});

it('test_add_text_overlay: draws plain text', async (): Promise<void> => {
  expect(listFolders(sandbox.outputDir)).toEqual([]);
  const before = sha256Of(blackPath);
  expect(sourceDuration).toBeGreaterThanOrEqual(CLIP_SECONDS);
  expect(await meanLuma(blackPath, 1)).toBeLessThan(BLACK_LUMA_LIMIT);
  const outcome = await addTextOverlay({
    inputPath: blackPath,
    outputName: 'plain text',
    textElements: [
      {
        text: 'Test Overlay',
        startTime: 0,
        endTime: 5,
        fontSize: 30,
        fontColor: '#FFFFFF',
        position: 'top_left',
      },
    ],
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-text-overlay.mp4', 'plain-text');
  expect(path.dirname(filePath)).toBe(path.join(sandbox.outputDir, '001 - plain-text'));
  expect(outcome.text).toBe(
    `Drew one text overlay on black.mp4. Output saved to ${filePath}.`,
  );
  const output = probeView(await probeJson(filePath));
  expect(Math.abs(output.durationSeconds - sourceDuration))
    .toBeLessThanOrEqual(DURATION_TOLERANCE_SECONDS);
  expect(streamsOf(output, 'audio')).toHaveLength(1);
  expect(streamsOf(output, 'video')[0]?.codecName).toBe('h264');
  expect(videoSize(output)).toEqual({ width: FRAME_WIDTH, height: FRAME_HEIGHT });
  const drawn = (await meanColor(filePath, 1, TEXT_REGION)).r;
  expect(drawn).toBeGreaterThan(inputTextRed + TEXT_LUMA_MARGIN);
  expect(sha256Of(blackPath)).toBe(before);
});

it('test_add_text_overlay: draws text in a box', async (): Promise<void> => {
  const before = sha256Of(blackPath);
  const outcome = await addTextOverlay({
    inputPath: blackPath,
    outputName: 'boxed text',
    textElements: [
      {
        text: 'Boxed Overlay',
        startTime: 0,
        endTime: CLIP_SECONDS,
        fontSize: 30,
        position: 'center',
        box: true,
        boxColor: '#FF0000',
        boxOpacity: 1,
        boxBorderWidth: 10,
      },
    ],
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-text-overlay.mp4', 'boxed-text');
  const boxed = (await meanColor(filePath, 1, BOX_REGION)).r;
  expect(boxed).toBeGreaterThan(inputBoxRed + BOX_RED_MARGIN);
  expect(sha256Of(blackPath)).toBe(before);
});

it('draws two elements in one filter chain', async (): Promise<void> => {
  const before = sha256Of(blackPath);
  const outcome = await addTextOverlay({
    inputPath: blackPath,
    outputName: 'two elements',
    textElements: [
      { text: 'Upper', startTime: 0, endTime: CLIP_SECONDS, position: 'top_left', fontSize: 30 },
      {
        text: 'Lower',
        startTime: 0,
        endTime: CLIP_SECONDS,
        position: 'bottom_right',
        fontSize: 30,
      },
    ],
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-text-overlay.mp4', 'two-elements');
  const corner = (await meanColor(filePath, 1, TEXT_REGION)).r;
  const opposite = (await meanColor(filePath, 1, OPPOSITE_REGION)).r;
  expect(corner).toBeGreaterThan(inputTextRed + TEXT_LUMA_MARGIN);
  expect(opposite).toBeGreaterThan(inputOppositeRed + TEXT_LUMA_MARGIN);
  expect(sha256Of(blackPath)).toBe(before);
});

it('draws the text only between its own start and end times', async (): Promise<void> => {
  const before = sha256Of(blackPath);
  const quietInput = (await meanColor(blackPath, 0.5, TEXT_REGION)).r;
  const loudInput = (await meanColor(blackPath, 2, TEXT_REGION)).r;
  const outcome = await addTextOverlay({
    inputPath: blackPath,
    outputName: 'timed text',
    textElements: [
      { text: 'Timed', startTime: 1.5, endTime: 2.5, fontSize: 30, position: 'top_left' },
    ],
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-text-overlay.mp4', 'timed-text');
  const quiet = (await meanColor(filePath, 0.5, TEXT_REGION)).r;
  const loud = (await meanColor(filePath, 2, TEXT_REGION)).r;
  expect(quiet).toBeLessThanOrEqual(quietInput + SAME_FRAME_TOLERANCE);
  expect(loud).toBeGreaterThan(loudInput + TEXT_LUMA_MARGIN);
  expect(sha256Of(blackPath)).toBe(before);
});

it('builds the full args snapshot of a default element with the bundled font', (): void => {
  const fontFile = bundledFontPath();
  const escaped = escapeFilterValue(fontFile);
  const element = overlayElement({});
  const group = drawtextFilter(element, fontFile);
  expect(group).toBe(
    `drawtext=text='Test Overlay':expansion=none:fontfile='${escaped}':fontsize=24`
    + `:fontcolor=#FFFFFF:x=(w-text_w)/2:y=h-text_h-10:enable='between(t,0,5)'`,
  );
  expect(group).toContain(`fontfile='${escaped}'`);
  expect(group).toContain('expansion=none');
  expect(textOverlayFilter([element], [fontFile])).toBe(group);
});

it('keeps the box options in the order the contract names', (): void => {
  const group = drawtextFilter(
    overlayElement({
      text: 'Boxed',
      endSeconds: 3,
      position: 'center',
      fontSize: 30,
      box: true,
      boxColor: '#FF0000',
      boxOpacity: 1,
      boxBorderWidth: 10,
    }),
    '/tmp/font.ttf',
  );
  expect(group).toBe(
    `drawtext=text='Boxed':expansion=none:fontfile='/tmp/font.ttf':fontsize=30`
    + `:fontcolor=#FFFFFF:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,0,3)'`
    + ':box=1:boxcolor=#FF0000@1:boxborderw=10',
  );
});

it('leaves boxborderw out when the border is zero', (): void => {
  const group = drawtextFilter(overlayElement({ box: true }), '/tmp/font.ttf');
  expect(group).toContain(':box=1:boxcolor=#000000@0.5');
  expect(group).not.toContain('boxborderw');
});

it.each(ESCAPE_CASES)(
  'test_add_text_overlay: draws $label through the escaper',
  async (row): Promise<void> => {
    const before = sha256Of(blackPath);
    const outcome = await addTextOverlay({
      inputPath: blackPath,
      outputName: `escape ${row.slug}`,
      textElements: [
        {
          text: row.text,
          startTime: 0,
          endTime: CLIP_SECONDS,
          position: row.position,
          fontSize: 24,
        },
      ],
    });
    expect(outcome.isError).toBe(false);
    const filePath = writtenPath(outcome.body, 'black-text-overlay.mp4', `escape-${row.slug}`);
    const output = probeView(await probeJson(filePath));
    expect(videoSize(output)).toEqual({ width: FRAME_WIDTH, height: FRAME_HEIGHT });
    const drawn = (await meanColor(filePath, 1, TEXT_REGION)).r;
    expect(drawn).toBeGreaterThan(inputTextRed + TEXT_LUMA_MARGIN);
    expect(sha256Of(blackPath)).toBe(before);
  },
);

it('draws with a caller font whose name holds an apostrophe', async (): Promise<void> => {
  const before = sha256Of(apostropheFontPath);
  const outcome = await addTextOverlay({
    inputPath: blackPath,
    outputName: 'apostrophe font',
    textElements: [
      {
        text: 'Apostrophe',
        startTime: 0,
        endTime: CLIP_SECONDS,
        position: 'top_left',
        fontSize: 30,
        fontPath: apostropheFontPath,
      },
    ],
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-text-overlay.mp4', 'apostrophe-font');
  const drawn = (await meanColor(filePath, 1, TEXT_REGION)).r;
  expect(drawn).toBeGreaterThan(inputTextRed + TEXT_LUMA_MARGIN);
  expect(sha256Of(apostropheFontPath)).toBe(before);
});

it('re-encodes pcm audio to aac when the copy cannot', async (): Promise<void> => {
  const before = sha256Of(pcmPath);
  const outcome = await addTextOverlay({
    inputPath: pcmPath,
    outputName: 'pcm fallback',
    textElements: [
      {
        text: 'Test Overlay',
        startTime: 0,
        endTime: CLIP_SECONDS,
        position: 'top_left',
        fontSize: 30,
      },
    ],
  });
  expect(outcome.isError).toBe(false);
  const filePath = writtenPath(outcome.body, 'black-pcm-text-overlay.mp4', 'pcm-fallback', 1);
  expect(asList(outcome.body.warnings)).toEqual([AUDIO_COPY_WARNING]);
  const output = probeView(await probeJson(filePath));
  const audio = streamsOf(output, 'audio');
  expect(audio).toHaveLength(1);
  expect(audio[0]?.codecName).toBe('aac');
  expect(sha256Of(pcmPath)).toBe(before);
});

it.each(TIME_CASES)('refuses $label with INVALID_INPUT', async (row): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      outputName: 'bad times',
      textElements: [
        { text: 'Test', startTime: row.startTime, endTime: row.endTime },
      ],
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'textElements[0].endTime',
      value: row.endTime,
      reason: 'end-not-after-start',
    },
  );
});

it('returns INVALID_INPUT for a control character in the text', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      outputName: 'control character',
      textElements: [{ text: 'a\u0001b', startTime: 0, endTime: 1 }],
    },
    ERROR_CODES.INVALID_INPUT,
    {
      parameter: 'textElements[0].text',
      value: 'a\u0001b',
      reason: 'control-character',
    },
  );
});

it.each(SCHEMA_CASES)(
  'rejects $label before a folder is created',
  async (row): Promise<void> => {
    await expectRejected({
      inputPath: blackPath,
      outputName: 'bad schema',
      textElements: row.textElements,
    });
  },
);

it('returns INPUT_NOT_FOUND for a font path that is not there', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      outputName: 'missing font',
      textElements: [{ text: 'Test', startTime: 0, endTime: 1, fontPath: missingFontPath }],
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingFontPath, role: 'font' },
  );
});

it('returns PATH_NOT_ALLOWED for a font outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: blackPath,
      outputName: 'outside font',
      textElements: [{ text: 'Test', startTime: 0, endTime: 1, fontPath: outsideFontPath }],
    },
    ERROR_CODES.PATH_NOT_ALLOWED,
    {
      path: outsideFontPath,
      realPath: outsideFontPath,
      allowedRoots: [sandbox.allowedRoot],
      reason: 'outside-root',
    },
  );
});

it('returns INPUT_NOT_FOUND when the input is missing', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: missingPath,
      outputName: 'missing input',
      textElements: [{ text: 'Test', startTime: 0, endTime: 1 }],
    },
    ERROR_CODES.INPUT_NOT_FOUND,
    { path: missingPath, role: 'input' },
  );
});

it('returns PATH_NOT_ALLOWED for an input outside the allowed root', async (): Promise<void> => {
  await expectFailure(
    {
      inputPath: outsidePath,
      outputName: 'outside input',
      textElements: [{ text: 'Test', startTime: 0, endTime: 1 }],
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
      outputName: 'audio only',
      textElements: [{ text: 'Test', startTime: 0, endTime: 1 }],
    },
    ERROR_CODES.UNSUPPORTED_FORMAT,
    { path: tonePath, detected: ['audio'], accepted: ['video'] },
  );
});

it('lists the tool with described fields and false annotations', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const { tools } = await client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'video_add_text_overlay');
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
    for (const name of ['inputPath', 'outputName', 'textElements']) {
      const field = asRecord(properties[name]);
      expect(String(field.description).length).toBeGreaterThan(0);
    }
    expect(String(asRecord(properties.textElements).description)).toContain('50');
    const item = asRecord(asRecord(properties.textElements).items);
    const position = String(asRecord(asRecord(item.properties).position).description);
    expect(position).toContain('bottom_center');
    expect(tool.inputSchema.required).toEqual(['inputPath', 'outputName', 'textElements']);
  });
});

it('hands drawtext a temp copy of a caller font outside the safe set', async (): Promise<void> => {
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
  await videoAddTextOverlayTool.handler(
    {
      inputPath: blackPath,
      outputName: 'font copy route',
      textElements: [
        {
          text: 'Copy',
          startTime: 0,
          endTime: 1,
          position: 'top_left',
          fontSize: 24,
          fontColor: '#FFFFFF',
          box: false,
          boxColor: '#000000',
          boxOpacity: 0.5,
          boxBorderWidth: 0,
          fontPath: apostropheFontPath,
        },
      ],
    },
    context,
  );

  expect(filters).toHaveLength(1);
  const [filter] = filters;
  expect(filter).toContain('/font-0.ttf');
  expect(filter).not.toContain(path.dirname(apostropheFontPath));
});
