// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Text Overlay
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import {
  filterSafePath,
  normalizeCallerText,
  quoteFilterValue,
} from '../../core/filter-escape.js';
import { assertBundledFont } from '../../core/font-path.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import {
  GRID_POSITION_VALUES,
  normalizePosition,
  positionXY,
} from '../../core/overlay-position.js';
import { successResult } from '../../core/result.js';
import { requireSeconds } from '../../core/time-parse.js';
import { outputNameField } from '../../server/field-schemas.js';
import { timeField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { GridPosition, GridPositionValue } from '../../core/overlay-position.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { EncodeAttempt, UpfrontNames } from './copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One `textElements` entry with the values the schema accepted. */
interface ElementArguments {
  readonly text: string;
  readonly startTime: number | string;
  readonly endTime: number | string;
  readonly position: GridPositionValue;
  readonly fontSize: number;
  readonly fontColor: string;
  readonly box: boolean;
  readonly boxColor: string;
  readonly boxOpacity: number;
  readonly boxBorderWidth: number;
  readonly fontPath?: string;
}

/** Arguments after the schema defaults are applied. */
interface OverlayArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly textElements: readonly ElementArguments[];
}

/** One overlay after its text and times became validated values. */
export interface TextOverlayElement {
  /** Text to draw, with CRLF already turned into LF. */
  readonly text: string;

  /** Seconds the text starts being drawn. */
  readonly startSeconds: number;

  /** Seconds the text stops being drawn. */
  readonly endSeconds: number;

  /** Canonical anchor of the text on the frame. */
  readonly position: GridPosition;

  /** Text height in pixels. */
  readonly fontSize: number;

  /** Text colour as `#RRGGBB`. */
  readonly fontColor: string;

  /** Whether a filled box is drawn behind the text. */
  readonly box: boolean;

  /** Box colour as `#RRGGBB`. */
  readonly boxColor: string;

  /** Box opacity from 0 to 1. */
  readonly boxOpacity: number;

  /** Space between the text and the box edge in pixels. */
  readonly boxBorderWidth: number;
}

/** One element's font file, and the name a temp copy of it would take. */
interface ElementFont {
  readonly realPath: string;
  readonly tempName: string;

  /** Caller file when a parameter named it, for the pre-spawn re-check. */
  readonly input?: ResolvedInput;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_add_text_overlay';

const OVERLAY_OPERATION = 'text-overlay';
const OVERLAY_EXTENSION = '.mp4';
const OVERLAY_TEMP_NAME = 'text-overlay.mp4';

const VIDEO_ENCODER = 'libx264';
const AUDIO_ENCODER = 'aac';
const VIDEO_ENCODERS = [VIDEO_ENCODER] as const;
const AUDIO_ENCODERS = [AUDIO_ENCODER] as const;
const UPFRONT_NAMES: UpfrontNames = {
  encoders: VIDEO_ENCODERS,
  filters: ['drawtext'],
};

const AUDIO_COPY_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const MIN_ELEMENTS = 1;
const MAX_ELEMENTS = 50;
const MIN_TEXT_LENGTH = 1;
const MAX_TEXT_LENGTH = 1000;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 1000;
const MIN_BOX_OPACITY = 0;
const MAX_BOX_OPACITY = 1;
const MIN_BOX_BORDER_WIDTH = 0;
const MAX_BOX_BORDER_WIDTH = 100;

const DEFAULT_POSITION = 'bottom_center';
const DEFAULT_FONT_SIZE = 24;
const DEFAULT_FONT_COLOR = '#FFFFFF';
const DEFAULT_BOX = false;
const DEFAULT_BOX_COLOR = '#000000';
const DEFAULT_BOX_OPACITY = 0.5;
const DEFAULT_BOX_BORDER_WIDTH = 0;

const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const COLOR_TEXT = 'Use a colour written as #RRGGBB.';
const TEXT_SHAPE_TEXT = 'Use text with no NUL and no half of a surrogate pair.';

const BUNDLED_FONT_TEMP_NAME = 'font-bundled.ttf';
const CALLER_FONT_TEMP_SUFFIX = '.ttf';

const TIME_FORMS =
  'Accepts a number of seconds, a plain numeric string, HH:MM:SS, '
  + 'HH:MM:SS.mmm, or MM:SS.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const ELEMENTS_DESCRIPTION =
  `Text overlays to draw, one per element. Use ${MIN_ELEMENTS} to ${MAX_ELEMENTS} `
  + 'elements. Each one is drawn between its own start and end time.';

const TEXT_DESCRIPTION =
  `Text to draw, ${MIN_TEXT_LENGTH} to ${MAX_TEXT_LENGTH} characters. `
  + 'It is drawn exactly as written, so a % is a plain character.';

const START_TIME_DESCRIPTION =
  `When the text starts being drawn, in seconds. ${TIME_FORMS}`;

const END_TIME_DESCRIPTION =
  `When the text stops being drawn, in seconds. ${TIME_FORMS} It must be greater `
  + 'than startTime.';

const POSITION_DESCRIPTION =
  'Where the text sits on the frame: top_left, top_center, top_right, center_left, '
  + 'center, center_right, bottom_left, bottom_center or bottom_right. '
  + `Defaults to ${DEFAULT_POSITION}.`;

const FONT_SIZE_DESCRIPTION =
  `Height of the text in pixels, from ${MIN_FONT_SIZE} to ${MAX_FONT_SIZE}. `
  + `Defaults to ${DEFAULT_FONT_SIZE}.`;

const FONT_COLOR_DESCRIPTION =
  `Colour of the text as #RRGGBB. Defaults to ${DEFAULT_FONT_COLOR}.`;

const BOX_DESCRIPTION =
  'When true, a filled box is drawn behind the text. Defaults to false.';

const BOX_COLOR_DESCRIPTION =
  `Colour of the box as #RRGGBB. Defaults to ${DEFAULT_BOX_COLOR}.`;

const BOX_OPACITY_DESCRIPTION =
  `Opacity of the box from ${MIN_BOX_OPACITY} to ${MAX_BOX_OPACITY}, where 0 is `
  + `invisible and 1 is solid. Defaults to ${DEFAULT_BOX_OPACITY}.`;

const BOX_BORDER_DESCRIPTION =
  `Space between the text and the box edge in pixels, from ${MIN_BOX_BORDER_WIDTH} `
  + `to ${MAX_BOX_BORDER_WIDTH}. Defaults to ${DEFAULT_BOX_BORDER_WIDTH}.`;

const FONT_PATH_DESCRIPTION =
  'Absolute path of a font file to draw with, inside an allowed root. '
  + 'Omitted means the font that ships with the server.';

const TEXT_ELEMENT_SCHEMA = z.strictObject({
  text: z
    .string()
    .min(MIN_TEXT_LENGTH)
    .max(MAX_TEXT_LENGTH)
    .refine((value) => !hasRefusedTextByte(value), TEXT_SHAPE_TEXT)
    .describe(TEXT_DESCRIPTION),
  startTime: timeField(START_TIME_DESCRIPTION),
  endTime: timeField(END_TIME_DESCRIPTION),
  position: z
    .enum(GRID_POSITION_VALUES)
    .default(DEFAULT_POSITION)
    .describe(POSITION_DESCRIPTION),
  fontSize: z
    .number()
    .int()
    .min(MIN_FONT_SIZE)
    .max(MAX_FONT_SIZE)
    .default(DEFAULT_FONT_SIZE)
    .describe(FONT_SIZE_DESCRIPTION),
  fontColor: colorField(FONT_COLOR_DESCRIPTION, DEFAULT_FONT_COLOR),
  box: z.boolean().default(DEFAULT_BOX).describe(BOX_DESCRIPTION),
  boxColor: colorField(BOX_COLOR_DESCRIPTION, DEFAULT_BOX_COLOR),
  boxOpacity: z
    .number()
    .min(MIN_BOX_OPACITY)
    .max(MAX_BOX_OPACITY)
    .default(DEFAULT_BOX_OPACITY)
    .describe(BOX_OPACITY_DESCRIPTION),
  boxBorderWidth: z
    .number()
    .int()
    .min(MIN_BOX_BORDER_WIDTH)
    .max(MAX_BOX_BORDER_WIDTH)
    .default(DEFAULT_BOX_BORDER_WIDTH)
    .describe(BOX_BORDER_DESCRIPTION),
  fontPath: z.string().min(1).optional().describe(FONT_PATH_DESCRIPTION),
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function colorField(description: string, fallback: string): z.ZodType<string, string | undefined> {
  return z
    .string()
    .regex(COLOR_PATTERN, COLOR_TEXT)
    .default(fallback)
    .describe(description);
}

/**
 * Report whether a text value holds a byte no text renderer can draw.
 *
 * A NUL or half of a surrogate pair is not a character, so it fails the
 * schema and never reaches the escaping helper.
 *
 * @param value - Text from the caller
 * @returns True when a NUL or an unpaired surrogate is present
 */
function hasRefusedTextByte(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit === 0) {
      return true;
    }
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < value.length ? value.charCodeAt(index + 1) : 0;
      if (next < 0xdc00 || next > 0xdfff) {
        return true;
      }
      index += 1;
      continue;
    }
    if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function parseElement(element: ElementArguments, index: number): TextOverlayElement {
  const parameter = `textElements[${index}]`;
  const text = normalizeCallerText(element.text, `${parameter}.text`);
  const startSeconds = requireSeconds(element.startTime, `${parameter}.startTime`);
  const endSeconds = requireSeconds(element.endTime, `${parameter}.endTime`);
  if (endSeconds <= startSeconds) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'A text overlay must end after it starts.',
      {
        parameter: `${parameter}.endTime`,
        value: element.endTime,
        reason: 'end-not-after-start',
      },
    );
  }
  return {
    text,
    startSeconds,
    endSeconds,
    position: normalizePosition(element.position),
    fontSize: element.fontSize,
    fontColor: element.fontColor,
    box: element.box,
    boxColor: element.boxColor,
    boxOpacity: element.boxOpacity,
    boxBorderWidth: element.boxBorderWidth,
  };
}

function elementFont(element: ElementArguments, index: number, context: ToolContext): ElementFont {
  const { fontPath } = element;
  if (fontPath === undefined) {
    return {
      realPath: assertBundledFont(TOOL_NAME),
      tempName: BUNDLED_FONT_TEMP_NAME,
    };
  }
  const resolved = context.resolveInput(
    fontPath,
    'font',
    `textElements[${index}].fontPath`,
    TOOL_NAME,
  );
  return {
    realPath: resolved.realPath,
    tempName: `font-${index}${CALLER_FONT_TEMP_SUFFIX}`,
    input: resolved,
  };
}

/**
 * Make every element's font readable inside a filter graph.
 *
 * A path outside the safe set is copied into the temp folder under a
 * server-chosen name, and one copy serves every element that named the
 * same file.
 *
 * @param fonts - One font per element, in element order
 * @param tempDir - This run's private temp folder
 * @returns One graph-safe path per element, in the same order
 * @throws {Error} When a needed copy fails
 */
async function filterFontPaths(
  fonts: readonly ElementFont[],
  tempDir: string,
): Promise<string[]> {
  const byRealPath = new Map<string, string>();
  const paths: string[] = [];
  for (const font of fonts) {
    const known = byRealPath.get(font.realPath);
    if (known !== undefined) {
      paths.push(known);
      continue;
    }
    const filterPath = await filterSafePath(font.realPath, tempDir, font.tempName);
    byRealPath.set(font.realPath, filterPath);
    paths.push(filterPath);
  }
  return paths;
}

function overlayArgs(
  realPath: string,
  graph: string,
  audioCodec: 'copy' | 'aac',
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-vf',
    graph,
    '-c:v',
    VIDEO_ENCODER,
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

function overlayAttempts(
  realPath: string,
  graph: () => string,
): readonly [EncodeAttempt, EncodeAttempt] {
  return [
    {
      buildArgs(outputPath: string): string[] {
        return overlayArgs(realPath, graph(), 'copy', outputPath);
      },
    },
    {
      encoders: AUDIO_ENCODERS,
      warning: AUDIO_COPY_WARNING,
      buildArgs(outputPath: string): string[] {
        return overlayArgs(realPath, graph(), 'aac', outputPath);
      },
    },
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Build the `drawtext` group one overlay element needs.
 *
 * The text and the font path pass through the escaping helper and sit
 * between single quotes, and `expansion=none` keeps a `%` literal. The
 * box options are appended only when the element asks for a box.
 *
 * @param element - Element whose text and times were already validated
 * @param fontFile - Font file path that is already safe for a filter graph
 * @returns One filter group, without the comma that joins it to the next
 */
export function drawtextFilter(element: TextOverlayElement, fontFile: string): string {
  const options = [
    `text=${quoteFilterValue(element.text)}`,
    'expansion=none',
    `fontfile=${quoteFilterValue(fontFile)}`,
    `fontsize=${String(element.fontSize)}`,
    `fontcolor=${element.fontColor}`,
    positionXY(element.position, 'drawtext'),
    `enable='between(t,${String(element.startSeconds)},${String(element.endSeconds)})'`,
  ];
  if (element.box) {
    options.push('box=1', `boxcolor=${element.boxColor}@${String(element.boxOpacity)}`);
    if (element.boxBorderWidth !== 0) {
      options.push(`boxborderw=${String(element.boxBorderWidth)}`);
    }
  }
  return `drawtext=${options.join(':')}`;
}

/**
 * Join one `drawtext` group per element into a single `-vf` value.
 *
 * @param elements - Elements in overlay order
 * @param fontFiles - Graph-safe font path per element, aligned by index
 * @returns The comma-joined filter chain
 * @throws {@link MediaError} `INTERNAL` when an element has no font path
 */
export function textOverlayFilter(
  elements: readonly TextOverlayElement[],
  fontFiles: readonly string[],
): string {
  const groups: string[] = [];
  for (const [index, element] of elements.entries()) {
    const fontFile = fontFiles[index];
    if (fontFile === undefined) {
      throw new MediaError(ERROR_CODES.INTERNAL, 'A text overlay lost its font path.', {
        reason: 'missing-font',
      });
    }
    groups.push(drawtextFilter(element, fontFile));
  }
  return groups.join(',');
}

async function runAddTextOverlay(
  args: OverlayArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const elements = args.textElements.map((element, index) => parseElement(element, index));
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const fonts: ElementFont[] = [];
  const callerFonts: ResolvedInput[] = [];
  for (const [index, element] of args.textElements.entries()) {
    const font = elementFont(element, index, context);
    fonts.push(font);
    if (font.input !== undefined) {
      callerFonts.push(font.input);
    }
  }
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  let filterPaths: readonly string[] = [];
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    otherInputs: callerFonts,
    mediaType: 'video',
    operation: OVERLAY_OPERATION,
    extension: OVERLAY_EXTENSION,
    tempName: OVERLAY_TEMP_NAME,
    upfront: UPFRONT_NAMES,
    prepare: async (tempDir: string): Promise<void> => {
      filterPaths = await filterFontPaths(fonts, tempDir);
    },
    attempts: overlayAttempts(input.realPath, () => textOverlayFilter(elements, filterPaths)),
  });
  const baseName = path.basename(input.rawPath);
  const count = elements.length === 1
    ? 'one text overlay'
    : `${String(elements.length)} text overlays`;
  return successResult({
    tool: TOOL_NAME,
    text: `Drew ${count} on ${baseName}. Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Draws timed text over one video and leaves the input unchanged. */
export const videoAddTextOverlayTool = defineTool({
  name: TOOL_NAME,
  title: 'Add a text overlay',
  description:
    'Draws one or more timed text overlays over a video, one drawtext filter per '
    + 'element. It writes one new MP4 file into the export root, in a new '
    + 'numbered folder when subfolder is true, or in the existing folder '
    + 'named by targetFolder, and never changes the input. The picture is '
    + 're-encoded, so run time grows with file '
    + 'size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and '
    + 'minutes to tens of minutes above 1 GB. The call returns when the work ends '
    + 'or when the timeout stops it, and splitting the file is a suggestion for '
    + 'the caller rather than something the server does on its own.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    textElements: z
      .array(TEXT_ELEMENT_SCHEMA)
      .min(MIN_ELEMENTS)
      .max(MAX_ELEMENTS)
      .describe(ELEMENTS_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runAddTextOverlay(args, context);
  },
});
