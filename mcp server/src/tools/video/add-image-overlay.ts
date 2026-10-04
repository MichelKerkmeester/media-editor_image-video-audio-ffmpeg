// ───────────────────────────────────────────────────────────────────
// MODULE: Video Add Image Overlay
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
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
import type { ToolContext } from '../../server/tool-context.js';
import type { EncodeAttempt } from './copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Options for the pure overlay graph builder, with numbers already parsed. */
export interface ImageOverlayGraphOptions {
  /** Canonical anchor of the overlay on the frame. */
  readonly position: GridPosition;

  /** Scaled overlay width in pixels. Omitted keeps the aspect ratio. */
  readonly width?: number;

  /** Scaled overlay height in pixels. Omitted keeps the aspect ratio. */
  readonly height?: number;

  /** Alpha applied to the overlay from 0 to 1. Omitted keeps the image's alpha. */
  readonly opacity?: number;

  /** Seconds the overlay starts being drawn. Omitted covers from the start. */
  readonly start?: number;

  /** Seconds the overlay stops being drawn. Omitted covers to the end. */
  readonly end?: number;
}

/** Arguments after the schema defaults are applied. */
interface AddImageOverlayArguments {
  readonly inputPath: string;
  readonly imagePath: string;
  readonly position: GridPositionValue;
  readonly opacity?: number;
  readonly startTime?: number | string;
  readonly endTime?: number | string;
  readonly width?: number;
  readonly height?: number;
  readonly outputName: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_add_image_overlay';

const OVERLAY_OPERATION = 'image-overlay';
const OVERLAY_EXTENSION = '.mp4';
const OVERLAY_TEMP_NAME = 'image-overlay.mp4';

const VIDEO_ENCODER = 'libx264';
const AUDIO_ENCODER = 'aac';
const VIDEO_ENCODERS = [VIDEO_ENCODER] as const;
const AUDIO_ENCODERS = [AUDIO_ENCODER] as const;

const OVERLAY_FILTER = 'overlay';
const SCALE_FILTER = 'scale';
const OPACITY_FILTERS = ['format', 'colorchannelmixer'] as const;

const AUDIO_COPY_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const DEFAULT_POSITION = 'top_right';
const MIN_OPACITY = 0;
const MAX_OPACITY = 1;
const MIN_DIMENSION = 1;
const MAX_DIMENSION = 32768;

// A missing side keeps the image's own aspect ratio, the scale filter's form.
const FILL_SCALE_SIDE = '-1';

const TIME_FORMS =
  'Accepts a number of seconds, a plain numeric string, HH:MM:SS, '
  + 'HH:MM:SS.mmm, or MM:SS.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const IMAGE_PATH_DESCRIPTION =
  'Absolute path of the image to place over the video, inside an allowed root. '
  + 'The file is not changed.';

const POSITION_DESCRIPTION =
  'Where the image sits on the frame: top_left, top_center, top_right, center_left, '
  + 'center, center_right, bottom_left, bottom_center or bottom_right. '
  + `Defaults to ${DEFAULT_POSITION}.`;

const OPACITY_DESCRIPTION =
  `Opacity of the image from ${MIN_OPACITY} to ${MAX_OPACITY}, where 0 is invisible `
  + 'and 1 is solid. Omitted keeps the alpha the image itself carries.';

const START_TIME_DESCRIPTION =
  `When the image starts being drawn, in seconds. ${TIME_FORMS} `
  + 'Omitted starts at the beginning of the video.';

const END_TIME_DESCRIPTION =
  `When the image stops being drawn, in seconds. ${TIME_FORMS} It must be later `
  + 'than startTime. Omitted runs to the end of the video.';

const WIDTH_DESCRIPTION =
  `Width of the image in pixels, from ${MIN_DIMENSION} to ${MAX_DIMENSION}. `
  + 'Omitted means the width follows from height.';

const HEIGHT_DESCRIPTION =
  `Height of the image in pixels, from ${MIN_DIMENSION} to ${MAX_DIMENSION}. `
  + 'Omitted means the height follows from width.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function scaleSide(value: number | undefined): string {
  return value === undefined ? FILL_SCALE_SIDE : String(value);
}

function enableExpression(
  start: number | undefined,
  end: number | undefined,
): string | undefined {
  if (start !== undefined && end !== undefined) {
    return `between(t,${String(start)},${String(end)})`;
  }
  if (start !== undefined) {
    return `gte(t,${String(start)})`;
  }
  if (end !== undefined) {
    return `between(t,0,${String(end)})`;
  }
  return undefined;
}

function overlayChain(options: ImageOverlayGraphOptions): string | undefined {
  const parts: string[] = [];
  if (options.width !== undefined || options.height !== undefined) {
    parts.push(`scale=${scaleSide(options.width)}:${scaleSide(options.height)}`);
  }
  if (options.opacity !== undefined) {
    parts.push('format=rgba', `colorchannelmixer=aa=${String(options.opacity)}`);
  }
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(',');
}

function overlayOptions(options: ImageOverlayGraphOptions): string {
  const parts = [positionXY(options.position, 'overlay')];
  const enable = enableExpression(options.start, options.end);
  if (enable !== undefined) {
    parts.push(`enable='${enable}'`);
  }
  return parts.join(':');
}

function overlayArgs(
  realPath: string,
  imagePath: string,
  graph: string,
  audioCodec: 'copy' | 'aac' | undefined,
  outputPath: string,
): string[] {
  const args = [
    '-n',
    '-i',
    realPath,
    '-i',
    imagePath,
    '-filter_complex',
    graph,
    '-map',
    '[v]',
  ];
  if (audioCodec === undefined) {
    args.push('-c:v', VIDEO_ENCODER, outputPath);
    return args;
  }
  args.push('-map', '0:a', '-c:v', VIDEO_ENCODER, '-c:a', audioCodec, outputPath);
  return args;
}

async function runAddImageOverlay(
  args: AddImageOverlayArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const start = args.startTime === undefined
    ? undefined
    : requireSeconds(args.startTime, 'startTime');
  const end = args.endTime === undefined
    ? undefined
    : requireSeconds(args.endTime, 'endTime');
  if (start !== undefined && end !== undefined && end <= start) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'The image overlay must end after it starts.',
      {
        parameter: 'endTime',
        value: args.endTime,
        reason: 'end-not-after-start',
      },
    );
  }
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const image = context.resolveInput(args.imagePath, 'overlay-image', 'imagePath', TOOL_NAME);
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const graph = imageOverlayGraph({
    position: normalizePosition(args.position),
    width: args.width,
    height: args.height,
    opacity: args.opacity,
    start,
    end,
  });
  const attempts: readonly [EncodeAttempt, ...EncodeAttempt[]] = properties.hasAudio
    ? [
        {
          buildArgs(outputPath: string): string[] {
            return overlayArgs(input.realPath, image.realPath, graph, 'copy', outputPath);
          },
        },
        {
          encoders: AUDIO_ENCODERS,
          warning: AUDIO_COPY_WARNING,
          buildArgs(outputPath: string): string[] {
            return overlayArgs(input.realPath, image.realPath, graph, 'aac', outputPath);
          },
        },
      ]
    : [
        {
          buildArgs(outputPath: string): string[] {
            return overlayArgs(input.realPath, image.realPath, graph, undefined, outputPath);
          },
        },
      ];
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    otherInputs: [image],
    mediaType: 'video',
    operation: OVERLAY_OPERATION,
    extension: OVERLAY_EXTENSION,
    tempName: OVERLAY_TEMP_NAME,
    upfront: {
      encoders: VIDEO_ENCODERS,
      filters: overlayFilters(args),
    },
    attempts,
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text: `Placed an image overlay on ${baseName}. Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

/** Filters the graph writes: `scale` only for a size, the alpha pair only for opacity. */
function overlayFilters(args: { width?: number; height?: number; opacity?: number }): string[] {
  const filters: string[] = [OVERLAY_FILTER];
  if (args.width !== undefined || args.height !== undefined) {
    filters.push(SCALE_FILTER);
  }
  if (args.opacity !== undefined) {
    filters.push(...OPACITY_FILTERS);
  }
  return filters;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Build the `filter_complex` graph one image overlay needs.
 *
 * The overlay input is scaled and given an alpha only when asked, so with
 * neither a size nor an opacity the graph reads `[1:v]` directly and carries
 * no `[ov]` label. `enable` is written only when a time bound is given.
 *
 * @param options - Anchor, optional size, opacity and time bounds
 * @returns The filter graph, chains joined with `;`
 */
export function imageOverlayGraph(options: ImageOverlayGraphOptions): string {
  const chain = overlayChain(options);
  const source = chain === undefined ? '[1:v]' : '[ov]';
  const overlay = `[0:v]${source}overlay=${overlayOptions(options)}[v]`;
  if (chain === undefined) {
    return overlay;
  }
  return `[1:v]${chain}[ov];${overlay}`;
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Places one scaled image over a video for a time span and leaves the input unchanged. */
export const videoAddImageOverlayTool = defineTool({
  name: TOOL_NAME,
  title: 'Add an image overlay',
  description:
    'Places one scaled image over a video for a time span, at a chosen position and '
    + 'with an optional opacity. It writes one new MP4 file into a new numbered folder '
    + 'and never changes the input. The picture is re-encoded, so run time grows with '
    + 'file size: seconds under 100 MB, up to a few minutes from 100 MB to 1 GB, and '
    + 'minutes to tens of minutes above 1 GB. The call returns when the work ends or '
    + 'when the timeout stops it, and splitting the file is a suggestion for the '
    + 'caller rather than something the server does on its own.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    imagePath: z.string().min(1).describe(IMAGE_PATH_DESCRIPTION),
    position: z
      .enum(GRID_POSITION_VALUES)
      .default(DEFAULT_POSITION)
      .describe(POSITION_DESCRIPTION),
    opacity: z
      .number()
      .min(MIN_OPACITY)
      .max(MAX_OPACITY)
      .optional()
      .describe(OPACITY_DESCRIPTION),
    startTime: timeField(START_TIME_DESCRIPTION).optional(),
    endTime: timeField(END_TIME_DESCRIPTION).optional(),
    width: z
      .number()
      .int()
      .min(MIN_DIMENSION)
      .max(MAX_DIMENSION)
      .optional()
      .describe(WIDTH_DESCRIPTION),
    height: z
      .number()
      .int()
      .min(MIN_DIMENSION)
      .max(MAX_DIMENSION)
      .optional()
      .describe(HEIGHT_DESCRIPTION),
    outputName: outputNameField,
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runAddImageOverlay(args, context);
  },
});
