// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Resolution
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import {
  parseResolution,
  resolutionField,
  resolutionLabel,
  scaleFilter,
} from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the resolution field has passed its shape check. */
interface ResolutionArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly resolution: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_resolution';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'resized.mp4';

const UPFRONT_ENCODERS = ['libx264'] as const;
const UPFRONT_FILTERS = ['scale'] as const;
const FALLBACK_ENCODERS = ['aac'] as const;

const AUDIO_FALLBACK_WARNING =
  'The audio could not be copied into MP4, so it was re-encoded as aac.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const RESOLUTION_DESCRIPTION =
  'Picture size in pixels. A width and height such as 160x120, or a '
  + 'height such as 120. Each side is from 1 to 32768.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function scaleArgs(
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
    'libx264',
    '-c:a',
    audioCodec,
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetResolution(
  args: ResolutionArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const parsed = parseResolution(args.resolution);
  if (parsed === undefined) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'The resolution is not a picture size.',
      {
        parameter: 'resolution',
        value: args.resolution,
        reason: 'out-of-range',
      },
    );
  }
  const filter = scaleFilter(parsed);
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: resolutionLabel(parsed),
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: {
      encoders: UPFRONT_ENCODERS,
      filters: UPFRONT_FILTERS,
    },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return scaleArgs(input.realPath, filter, 'copy', outputPath);
        },
      },
      {
        encoders: FALLBACK_ENCODERS,
        warning: AUDIO_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return scaleArgs(input.realPath, filter, 'aac', outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the resolution of ${baseName} to ${args.resolution}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Scales one video to a target picture size and leaves the input unchanged. */
export const videoSetResolutionTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video resolution',
  description:
    'Scales one video to a target picture size. It writes the file in the '
    + 'export root, or a numbered folder on request, and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    resolution: resolutionField(RESOLUTION_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetResolution(args, context);
  },
});
