// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Convert Properties
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import {
  AUDIO_CONTAINERS,
  AUDIO_FORMAT_VALUES,
  normalizeAudioFormat,
} from '../../core/media-containers.js';
import { probeMedia, requireAudioStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import {
  bitrateField,
  channelsField,
  sampleRateField,
} from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  AudioContainer,
  AudioFormatValue,
} from '../../core/media-containers.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for a container change plus optional audio settings. */
interface ConvertPropertiesArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly format: AudioFormatValue;
  readonly audioBitrate?: string;
  readonly sampleRate?: number;
  readonly channels?: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'audio_convert_properties';
const AUDIO_OPERATION = 'converted';

const FORMAT_DESCRIPTION = 'Audio container. mp3, wav, m4a, flac, or ogg.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the audio or video file to read, inside an allowed root. '
  + 'The file is not changed. A video keeps its sound and drops the picture.';

const BITRATE_DESCRIPTION =
  'Bitrate from 1k to 100M, for example 192k. '
  + 'A lossless container (wav, flac) ignores it.';

const SAMPLE_RATE_DESCRIPTION =
  'Sample rate in hertz, from 8000 to 384000.';

const CHANNELS_DESCRIPTION =
  'Channel count from 1 to 8. 1 is mono and 2 is stereo.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function conversionArgs(
  inputPath: string,
  container: AudioContainer,
  args: ConvertPropertiesArguments,
  outputPath: string,
): string[] {
  const argv = ['-n', '-i', inputPath, '-vn', '-c:a', container.encoder];
  if (args.audioBitrate !== undefined) {
    argv.push('-b:a', args.audioBitrate);
  }
  if (args.sampleRate !== undefined) {
    argv.push('-ar', String(args.sampleRate));
  }
  if (args.channels !== undefined) {
    argv.push('-ac', String(args.channels));
  }
  argv.push('-f', container.muxer, outputPath);
  return argv;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runConvertProperties(
  args: ConvertPropertiesArguments,
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
  requireAudioStream(input, properties);
  const container = AUDIO_CONTAINERS[normalizeAudioFormat(args.format)];
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'audio',
    operation: AUDIO_OPERATION,
    extension: container.extension,
    tempName: `converted${container.extension}`,
    upfront: { encoders: [container.encoder] },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return conversionArgs(input.realPath, container, args, outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Converted the audio properties of ${baseName}. Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Changes an audio container and optional rate settings.
 * The input file is left unchanged.
 */
export const audioConvertPropertiesTool = defineTool({
  name: TOOL_NAME,
  title: 'Convert audio properties',
  description:
    'Changes an audio file\'s container and can set its bitrate, sample rate, '
    + 'and channel count. It writes that file in the export root, or a numbered folder on request, and '
    + 'never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    format: z.enum(AUDIO_FORMAT_VALUES).describe(FORMAT_DESCRIPTION),
    audioBitrate: bitrateField(BITRATE_DESCRIPTION).optional(),
    sampleRate: sampleRateField(SAMPLE_RATE_DESCRIPTION).optional(),
    channels: channelsField(CHANNELS_DESCRIPTION).optional(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runConvertProperties(args, context);
  },
});
