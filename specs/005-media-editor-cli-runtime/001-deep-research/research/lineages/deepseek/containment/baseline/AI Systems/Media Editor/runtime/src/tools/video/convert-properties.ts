// ───────────────────────────────────────────────────────────────────
// MODULE: Video Convert Properties
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import {
  VIDEO_AUDIO_CODECS,
  VIDEO_CODEC_VALUES,
  VIDEO_CONTAINERS,
  VIDEO_FORMATS,
  normalizeVideoCodec,
} from '../../core/media-containers.js';
import { probeMedia, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import {
  bitrateField,
  channelsField,
  frameRateField,
  parseResolution,
  resolutionField,
  sampleRateField,
  scaleFilter,
} from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  VideoAudioCodec,
  VideoCodecValue,
  VideoContainer,
  VideoFormat,
} from '../../core/media-containers.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for a container change plus optional picture and sound settings. */
interface ConvertPropertiesArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly format: VideoFormat;
  readonly resolution?: string;
  readonly codec?: VideoCodecValue;
  readonly videoBitrate?: string;
  readonly frameRate?: number;
  readonly audioCodec?: VideoAudioCodec;
  readonly audioBitrate?: string;
  readonly sampleRate?: number;
  readonly channels?: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_convert_properties';
const VIDEO_OPERATION = 'converted';
const PRESERVE_RESOLUTION = 'preserve';

const FORMAT_DESCRIPTION = 'Video container. mp4, mov, mkv, webm, or avi.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const RESOLUTION_DESCRIPTION =
  'Picture size in pixels. A width and height such as 160x100, or a height '
  + 'such as 120, each side from 1 to 32768. preserve keeps the original size.';

const CODEC_DESCRIPTION =
  'Video encoder. libx264, libx265, or libvpx-vp9. '
  + 'When omitted, the container\'s default encoder is used.';

const VIDEO_BITRATE_DESCRIPTION =
  'Video bitrate from 1k to 100M, for example 1M. '
  + 'k is 1000 bit/s and M is 1000000 bit/s.';

const FRAME_RATE_DESCRIPTION =
  'Frame rate in frames per second, greater than 0 and at most 240.';

const AUDIO_CODEC_DESCRIPTION =
  'Audio encoder. aac, libmp3lame, or libopus. '
  + 'When omitted, the container\'s default encoder is used.';

const AUDIO_BITRATE_DESCRIPTION =
  'Audio bitrate from 1k to 100M, for example 128k. '
  + 'k is 1000 bit/s and M is 1000000 bit/s.';

const SAMPLE_RATE_DESCRIPTION =
  'Sample rate in hertz, from 8000 to 384000.';

const CHANNELS_DESCRIPTION =
  'Channel count from 1 to 8. 1 is mono and 2 is stereo.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function scaleGraph(resolution: string | undefined): string | undefined {
  if (resolution === undefined || resolution === PRESERVE_RESOLUTION) {
    return undefined;
  }
  const parsed = parseResolution(resolution);
  if (parsed === undefined) {
    throw new MediaError(
      ERROR_CODES.INVALID_INPUT,
      'The resolution is not a picture size.',
      {
        parameter: 'resolution',
        value: resolution,
        reason: 'out-of-range',
      },
    );
  }
  return scaleFilter(parsed);
}

function conversionArgs(
  inputPath: string,
  container: VideoContainer,
  videoCodec: string,
  audioCodec: string,
  scale: string | undefined,
  args: ConvertPropertiesArguments,
  outputPath: string,
): string[] {
  const argv = ['-n', '-i', inputPath];
  if (scale !== undefined) {
    argv.push('-vf', scale);
  }
  argv.push('-c:v', videoCodec);
  if (args.videoBitrate !== undefined) {
    argv.push('-b:v', args.videoBitrate);
  }
  if (args.frameRate !== undefined) {
    argv.push('-r', String(args.frameRate));
  }
  argv.push('-c:a', audioCodec);
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
  const scale = scaleGraph(args.resolution);
  const input = context.resolveInput(
    args.inputPath,
    'input',
    'inputPath',
    TOOL_NAME,
  );
  const properties = await probeMedia(context, input);
  requireVideoStream(input, properties);
  const container = VIDEO_CONTAINERS[args.format];
  const videoCodec = args.codec === undefined
    ? container.videoEncoder
    : normalizeVideoCodec(args.codec);
  const audioCodec = args.audioCodec ?? container.audioEncoder;
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: VIDEO_OPERATION,
    extension: container.extension,
    tempName: `converted${container.extension}`,
    upfront: {
      encoders: [videoCodec, audioCodec],
      filters: scale === undefined ? [] : ['scale'],
    },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return conversionArgs(
            input.realPath,
            container,
            videoCodec,
            audioCodec,
            scale,
            args,
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
      `Converted the video properties of ${baseName}. `
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
 * Changes a video container and optional picture and sound settings.
 * The input file is left unchanged.
 */
export const videoConvertPropertiesTool = defineTool({
  name: TOOL_NAME,
  title: 'Convert video properties',
  description:
    'Changes a video\'s container and can set its resolution, codecs, '
    + 'bitrates, frame rate, and audio properties. It writes that file in the '
    + 'export root, in a new numbered folder when subfolder is true, or in '
    + 'the existing folder named by targetFolder, and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    format: z.enum(VIDEO_FORMATS).describe(FORMAT_DESCRIPTION),
    resolution: resolutionField(RESOLUTION_DESCRIPTION, {
      allowPreserve: true,
    }).optional(),
    codec: z.enum(VIDEO_CODEC_VALUES).describe(CODEC_DESCRIPTION).optional(),
    videoBitrate: bitrateField(VIDEO_BITRATE_DESCRIPTION).optional(),
    frameRate: frameRateField(FRAME_RATE_DESCRIPTION).optional(),
    audioCodec: z
      .enum(VIDEO_AUDIO_CODECS)
      .describe(AUDIO_CODEC_DESCRIPTION)
      .optional(),
    audioBitrate: bitrateField(AUDIO_BITRATE_DESCRIPTION).optional(),
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
