// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Subtitles
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import {
  filterSafeFontDir,
  filterSafeSubtitle,
  quoteFilterValue,
} from '../../core/filter-escape.js';
import { bundledFontDir } from '../../core/font-path.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';
import type { EncodeAttempt, UpfrontNames } from './copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The optional `fontStyle` object, keyed as the schema accepted it. */
export interface SubtitleFontStyle {
  readonly fontName?: string;
  readonly fontSize?: number;
  readonly fontColor?: string;
  readonly outlineColor?: string;
  readonly outlineWidth?: number;
  readonly shadowColor?: string;
  readonly shadowOffset?: number;
  readonly alignment?: number;
  readonly marginV?: number;
  readonly marginL?: number;
  readonly marginR?: number;
}

/** Arguments after the schema is applied. */
interface SubtitleArguments {
  readonly inputPath: string;
  readonly subtitlePath: string;
  readonly outputName: string;
  readonly fontStyle?: SubtitleFontStyle;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_add_subtitles';

const SUBTITLE_OPERATION = 'subtitled';
const SUBTITLE_EXTENSION = '.mp4';
const SUBTITLE_TEMP_NAME = 'subtitled.mp4';

const SUBRIP_EXTENSION = '.srt';
const SUBRIP_NAME = 'srt';

const VIDEO_ENCODER = 'libx264';
const AUDIO_ENCODER = 'aac';
const VIDEO_ENCODERS = [VIDEO_ENCODER] as const;
const AUDIO_ENCODERS = [AUDIO_ENCODER] as const;
const UPFRONT_NAMES: UpfrontNames = {
  encoders: VIDEO_ENCODERS,
  filters: ['subtitles'],
};

const AUDIO_COPY_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const MIN_FONT_NAME_LENGTH = 1;
const MAX_FONT_NAME_LENGTH = 64;
const MIN_FONT_SIZE = 1;
const MAX_FONT_SIZE = 1000;
const MIN_OUTLINE_WIDTH = 0;
const MAX_OUTLINE_WIDTH = 100;
const MIN_SHADOW_OFFSET = 0;
const MAX_SHADOW_OFFSET = 100;
const MIN_ALIGNMENT = 1;
const MAX_ALIGNMENT = 9;
const MIN_MARGIN = 0;
const MAX_MARGIN = 1000;

const FONT_NAME_PATTERN = /^[A-Za-z0-9 -]+$/;
const FONT_NAME_TEXT = 'Use ASCII letters, digits, spaces and hyphens.';
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const COLOR_TEXT = 'Use a colour written as #RRGGBB.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const SUBTITLE_PATH_DESCRIPTION =
  'Absolute path of a .srt subtitle file under an allowed root, burned into '
  + 'the video. The file is not changed.';

const FONT_STYLE_DESCRIPTION =
  'Optional styling for the burned-in subtitles. An omitted key keeps the '
  + 'default styling of the subtitles filter.';

const FONT_NAME_DESCRIPTION =
  `Font family to draw with, ${MIN_FONT_NAME_LENGTH} to ${MAX_FONT_NAME_LENGTH} `
  + 'ASCII letters, digits, spaces and hyphens.';

const FONT_SIZE_DESCRIPTION =
  `Text height in pixels, from ${MIN_FONT_SIZE} to ${MAX_FONT_SIZE}.`;

const FONT_COLOR_DESCRIPTION = 'Colour of the text as #RRGGBB.';

const OUTLINE_COLOR_DESCRIPTION = 'Colour of the outline as #RRGGBB.';

const OUTLINE_WIDTH_DESCRIPTION =
  `Outline thickness in pixels, from ${MIN_OUTLINE_WIDTH} to ${MAX_OUTLINE_WIDTH}.`;

const SHADOW_COLOR_DESCRIPTION = 'Colour of the shadow as #RRGGBB.';

const SHADOW_OFFSET_DESCRIPTION =
  `Shadow distance in pixels, from ${MIN_SHADOW_OFFSET} to ${MAX_SHADOW_OFFSET}.`;

const ALIGNMENT_DESCRIPTION =
  `ASS numpad position of the text, from ${MIN_ALIGNMENT} to ${MAX_ALIGNMENT}, `
  + 'where 1 is bottom-left and 7 is top-left.';

const MARGIN_V_DESCRIPTION =
  `Vertical margin in pixels, from ${MIN_MARGIN} to ${MAX_MARGIN}.`;

const MARGIN_L_DESCRIPTION =
  `Left margin in pixels, from ${MIN_MARGIN} to ${MAX_MARGIN}.`;

const MARGIN_R_DESCRIPTION =
  `Right margin in pixels, from ${MIN_MARGIN} to ${MAX_MARGIN}.`;

const FONT_STYLE_SCHEMA = z.strictObject({
  fontName: z
    .string()
    .min(MIN_FONT_NAME_LENGTH)
    .max(MAX_FONT_NAME_LENGTH)
    .regex(FONT_NAME_PATTERN, FONT_NAME_TEXT)
    .optional()
    .describe(FONT_NAME_DESCRIPTION),
  fontSize: z
    .number()
    .int()
    .min(MIN_FONT_SIZE)
    .max(MAX_FONT_SIZE)
    .optional()
    .describe(FONT_SIZE_DESCRIPTION),
  fontColor: z
    .string()
    .regex(COLOR_PATTERN, COLOR_TEXT)
    .optional()
    .describe(FONT_COLOR_DESCRIPTION),
  outlineColor: z
    .string()
    .regex(COLOR_PATTERN, COLOR_TEXT)
    .optional()
    .describe(OUTLINE_COLOR_DESCRIPTION),
  outlineWidth: z
    .number()
    .min(MIN_OUTLINE_WIDTH)
    .max(MAX_OUTLINE_WIDTH)
    .optional()
    .describe(OUTLINE_WIDTH_DESCRIPTION),
  shadowColor: z
    .string()
    .regex(COLOR_PATTERN, COLOR_TEXT)
    .optional()
    .describe(SHADOW_COLOR_DESCRIPTION),
  shadowOffset: z
    .number()
    .min(MIN_SHADOW_OFFSET)
    .max(MAX_SHADOW_OFFSET)
    .optional()
    .describe(SHADOW_OFFSET_DESCRIPTION),
  alignment: z
    .number()
    .int()
    .min(MIN_ALIGNMENT)
    .max(MAX_ALIGNMENT)
    .optional()
    .describe(ALIGNMENT_DESCRIPTION),
  marginV: z
    .number()
    .int()
    .min(MIN_MARGIN)
    .max(MAX_MARGIN)
    .optional()
    .describe(MARGIN_V_DESCRIPTION),
  marginL: z
    .number()
    .int()
    .min(MIN_MARGIN)
    .max(MAX_MARGIN)
    .optional()
    .describe(MARGIN_L_DESCRIPTION),
  marginR: z
    .number()
    .int()
    .min(MIN_MARGIN)
    .max(MAX_MARGIN)
    .optional()
    .describe(MARGIN_R_DESCRIPTION),
});

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function assertSubtitlePath(subtitlePath: string): void {
  const extension = path.extname(subtitlePath).toLowerCase();
  if (extension !== SUBRIP_EXTENSION) {
    throw new MediaError(
      ERROR_CODES.UNSUPPORTED_FORMAT,
      'The subtitle file must be a .srt file.',
      {
        path: subtitlePath,
        detected: extension.length > 1 ? extension.slice(1) : 'none',
        accepted: [SUBRIP_NAME],
      },
    );
  }
}

function subtitleArgs(
  realPath: string,
  filter: string,
  audioCodec: 'copy' | 'aac',
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-vf',
    filter,
    '-c:v',
    VIDEO_ENCODER,
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

function subtitleAttempts(
  realPath: string,
  filter: () => string,
): readonly [EncodeAttempt, EncodeAttempt] {
  return [
    {
      buildArgs(outputPath: string): string[] {
        return subtitleArgs(realPath, filter(), 'copy', outputPath);
      },
    },
    {
      encoders: AUDIO_ENCODERS,
      warning: AUDIO_COPY_WARNING,
      buildArgs(outputPath: string): string[] {
        return subtitleArgs(realPath, filter(), 'aac', outputPath);
      },
    },
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Convert a `#RRGGBB` colour to the ASS `&H00BBGGRR` spelling.
 *
 * ASS stores the colour bytes blue first after a fixed alpha byte, so the
 * caller's red byte is written last and the result keeps one spelling.
 *
 * @param color - Colour as `#RRGGBB`
 * @returns The colour in `&H00BBGGRR` form, uppercase
 */
export function assColor(color: string): string {
  const red = color.slice(1, 3);
  const green = color.slice(3, 5);
  const blue = color.slice(5, 7);
  return `&H00${blue}${green}${red}`.toUpperCase();
}

/**
 * Build the `force_style` list one `fontStyle` object asks for.
 *
 * Only keys that are present are written, in the fixed order the style sheet
 * expects, and a colour is converted here so no caller byte reaches the
 * graph. The shadow collapses to one offset, as the style sheet takes one.
 *
 * @param style - Values the schema accepted, or undefined when it was absent
 * @returns The comma-joined `Key=Value` list, or undefined when no key is set
 */
export function forceStyle(style: SubtitleFontStyle | undefined): string | undefined {
  if (style === undefined) {
    return undefined;
  }
  const entries: string[] = [];
  if (style.fontName !== undefined) {
    entries.push(`FontName=${style.fontName}`);
  }
  if (style.fontSize !== undefined) {
    entries.push(`FontSize=${String(style.fontSize)}`);
  }
  if (style.fontColor !== undefined) {
    entries.push(`PrimaryColour=${assColor(style.fontColor)}`);
  }
  if (style.outlineColor !== undefined) {
    entries.push(`OutlineColour=${assColor(style.outlineColor)}`);
  }
  if (style.outlineWidth !== undefined) {
    entries.push(`Outline=${String(style.outlineWidth)}`);
  }
  if (style.shadowColor !== undefined) {
    entries.push(`ShadowColour=${assColor(style.shadowColor)}`);
  }
  if (style.shadowOffset !== undefined) {
    entries.push(`Shadow=${String(style.shadowOffset)}`);
  }
  if (style.alignment !== undefined) {
    entries.push(`Alignment=${String(style.alignment)}`);
  }
  if (style.marginV !== undefined) {
    entries.push(`MarginV=${String(style.marginV)}`);
  }
  if (style.marginL !== undefined) {
    entries.push(`MarginL=${String(style.marginL)}`);
  }
  if (style.marginR !== undefined) {
    entries.push(`MarginR=${String(style.marginR)}`);
  }
  if (entries.length === 0) {
    return undefined;
  }
  return entries.join(',');
}

/**
 * Build the `subtitles` filter one burn needs.
 *
 * The subtitle file and the font folder pass through the shared escaping
 * helper and sit inside single quotes, and the style list is quoted too,
 * because its commas are part of one option value.
 *
 * @param subtitleFile - Subtitle path that is safe for a filter graph
 * @param fontDir - Font folder that is safe for a filter graph
 * @param style - List from {@link forceStyle}, or undefined when there is none
 * @returns The filter value for the `-vf` argument
 */
export function subtitlesFilter(
  subtitleFile: string,
  fontDir: string,
  style: string | undefined,
): string {
  const base = `subtitles=${quoteFilterValue(subtitleFile)}`
    + `:fontsdir=${quoteFilterValue(fontDir)}`;
  if (style === undefined) {
    return base;
  }
  return `${base}:force_style='${style}'`;
}

async function runAddSubtitles(
  args: SubtitleArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  assertSubtitlePath(args.subtitlePath);
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const subtitleInput = context.resolveInput(
    args.subtitlePath,
    'subtitle',
    'subtitlePath',
    TOOL_NAME,
  );
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const style = forceStyle(args.fontStyle);
  let subtitleFile = '';
  let fontDir = '';
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    otherInputs: [subtitleInput],
    mediaType: 'video',
    operation: SUBTITLE_OPERATION,
    extension: SUBTITLE_EXTENSION,
    tempName: SUBTITLE_TEMP_NAME,
    upfront: UPFRONT_NAMES,
    prepare: async (tempDir: string): Promise<void> => {
      subtitleFile = await filterSafeSubtitle(subtitleInput, tempDir);
      fontDir = await filterSafeFontDir(bundledFontDir(), tempDir);
    },
    attempts: subtitleAttempts(
      input.realPath,
      () => subtitlesFilter(subtitleFile, fontDir, style),
    ),
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text: `Added subtitles to ${baseName}. Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Burns one SubRip file into one video and leaves the input unchanged. */
export const videoAddSubtitlesTool = defineTool({
  name: TOOL_NAME,
  title: 'Add subtitles',
  description:
    'Burns one SubRip subtitle file into one video, using the subtitles '
    + 'filter and the font folder that ships with the server. It writes one '
    + 'new MP4 file into a new numbered folder and never changes the input. '
    + 'The picture is re-encoded, so run time grows with file size: seconds '
    + 'under 100 MB, up to a few minutes from 100 MB to 1 GB, and minutes to '
    + 'tens of minutes above 1 GB. The call returns when the work ends or '
    + 'when the timeout stops it, and splitting the file is a suggestion for '
    + 'the caller rather than something the server does on its own.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    subtitlePath: z.string().min(1).describe(SUBTITLE_PATH_DESCRIPTION),
    fontStyle: FONT_STYLE_SCHEMA.optional().describe(FONT_STYLE_DESCRIPTION),
    outputName: outputNameField,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runAddSubtitles(args, context);
  },
});
