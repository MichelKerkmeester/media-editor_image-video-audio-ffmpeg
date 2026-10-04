// ───────────────────────────────────────────────────────────────────
// MODULE: Video Set Audio Sample Rate
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { probeMedia, requireAudioStream, requireVideoStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { sampleRateField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments after the sample-rate field has passed its shape check. */
interface SampleRateArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly sampleRate: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_set_audio_sample_rate';
const OUTPUT_EXTENSION = '.mp4';
const TEMP_NAME = 'audio-rate.mp4';

const UPFRONT_ENCODERS = ['aac'] as const;
const PICTURE_FALLBACK_ENCODERS = ['libx264'] as const;

const PICTURE_FALLBACK_WARNING =
  'The picture could not be copied into MP4, so it was re-encoded with libx264.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the video to read, inside an allowed root. '
  + 'The file is not changed.';

const SAMPLE_RATE_DESCRIPTION =
  'Target sample rate in hertz, from 8000 to 384000, for example 44100 or 48000.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function audioSampleRateArgs(
  realPath: string,
  pictureCodec: string,
  sampleRate: number,
  outputPath: string,
): string[] {
  return [
    '-n',
    '-i',
    realPath,
    '-c:v',
    pictureCodec,
    '-c:a',
    'aac',
    '-ar',
    String(sampleRate),
    outputPath,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetAudioSampleRate(
  args: SampleRateArguments,
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
  requireAudioStream(input, properties);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'video',
    operation: `audio-${String(args.sampleRate)}hz`,
    extension: OUTPUT_EXTENSION,
    tempName: TEMP_NAME,
    upfront: { encoders: UPFRONT_ENCODERS },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return audioSampleRateArgs(input.realPath, 'copy', args.sampleRate, outputPath);
        },
      },
      {
        encoders: PICTURE_FALLBACK_ENCODERS,
        warning: PICTURE_FALLBACK_WARNING,
        buildArgs(outputPath: string): string[] {
          return audioSampleRateArgs(input.realPath, 'libx264', args.sampleRate, outputPath);
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the audio sample rate of ${baseName} to ${String(args.sampleRate)} Hz. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one video's audio track at a target sample rate and leaves the input unchanged. */
export const videoSetAudioSampleRateTool = defineTool({
  name: TOOL_NAME,
  title: 'Set video audio sample rate',
  description:
    'Re-encodes the audio track of one video at a target sample rate in hertz, '
    + 'copying the picture when it can. It writes the file in a new numbered '
    + 'folder and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    sampleRate: sampleRateField(SAMPLE_RATE_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetAudioSampleRate(args, context);
  },
});
