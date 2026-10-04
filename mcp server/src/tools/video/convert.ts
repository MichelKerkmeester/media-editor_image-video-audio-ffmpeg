// ───────────────────────────────────────────────────────────────────
// MODULE: Video Convert
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { VIDEO_CONTAINERS, VIDEO_FORMATS } from '../../core/media-containers.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { VideoContainer, VideoFormat } from '../../core/media-containers.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for a container change that copies streams before it encodes. */
interface ConvertArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly format: VideoFormat;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_convert';
const CONVERT_OPERATION = 'converted';
const CONVERT_TEMP_STEM = 'converted';
const COPY_CODEC = 'copy';

const FORMAT_DESCRIPTION = 'Video container. mp4, mov, mkv, webm, or avi.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function convertArgs(
  realPath: string,
  muxer: string,
  videoCodec: string,
  audioCodec: string,
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-c:v',
    videoCodec,
    '-c:a',
    audioCodec,
    '-f',
    muxer,
    outputPath,
  ];
}

function fallbackWarning(container: VideoContainer): string {
  return 'The streams could not be copied into the '
    + `${container.format} container, so they were re-encoded as `
    + `${container.videoEncoder} and ${container.audioEncoder}.`;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runConvert(
  args: ConvertArguments,
  context: ToolContext,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const container = VIDEO_CONTAINERS[args.format];
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: CONVERT_OPERATION,
    extension: container.extension,
    tempName: `${CONVERT_TEMP_STEM}${container.extension}`,
    upfront: {},
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return convertArgs(
            input.realPath,
            container.muxer,
            COPY_CODEC,
            COPY_CODEC,
            outputPath,
          );
        },
      },
      {
        encoders: [container.videoEncoder, container.audioEncoder],
        warning: fallbackWarning(container),
        buildArgs(outputPath: string): string[] {
          return convertArgs(
            input.realPath,
            container.muxer,
            container.videoEncoder,
            container.audioEncoder,
            outputPath,
          );
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Converted ${baseName} to ${args.format}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Changes the container of one video and leaves the input unchanged.
 */
export const videoConvertTool = defineTool({
  name: TOOL_NAME,
  title: 'Convert video',
  description:
    'Changes the container of one video. A stream copy is tried first, and '
    + 'both streams are re-encoded only when the new container rejects that '
    + 'copy. It writes the file in the export root, or a numbered folder on request, and never changes '
    + 'the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    format: z.enum(VIDEO_FORMATS).describe(FORMAT_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runConvert(args, context);
  },
});
