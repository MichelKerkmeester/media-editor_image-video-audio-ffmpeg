// ───────────────────────────────────────────────────────────────────
// MODULE: Audio Set Channels
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { requireAudioContainer } from '../../core/media-containers.js';
import { probeMedia, requireAudioStream } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { channelsField } from '../../server/media-fields.js';
import { defineTool } from '../../server/tool-registry.js';
import { runAttempts } from '../video/copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for a channel-count re-encode that keeps the input container. */
interface SetChannelsArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly channels: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'audio_set_channels';
const CHANNELS_OPERATION = 'channels';

const CHANNELS_DESCRIPTION =
  'Target channel count from 1 to 8. 1 is mono and 2 is stereo.';

const INPUT_PATH_DESCRIPTION =
  'Absolute path of the audio or video file to read, inside an allowed root. '
  + 'The file is not changed. A video keeps its sound and drops the picture.';

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runSetChannels(
  args: SetChannelsArguments,
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
  const container = requireAudioContainer(input, properties);
  const result = await runAttempts(context, {
    tool: TOOL_NAME,
    outputName: args.outputName,
    input,
    mediaType: 'audio',
    operation: CHANNELS_OPERATION,
    extension: container.extension,
    tempName: `channels${container.extension}`,
    upfront: { encoders: [container.encoder] },
    attempts: [
      {
        buildArgs(outputPath: string): string[] {
          return [
            '-n',
            '-i',
            input.realPath,
            '-vn',
            '-c:a',
            container.encoder,
            '-ac',
            String(args.channels),
            outputPath,
          ];
        },
      },
    ],
  });
  const baseName = path.basename(input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text:
      `Set the channel count of ${baseName} to ${String(args.channels)}. `
      + `Output saved to ${result.entry.path}.`,
    outputs: [result.entry],
    warnings: result.warnings,
    elapsedMs: Date.now() - startedAt,
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Re-encodes one audio file at a target channel count and leaves the input unchanged. */
export const audioSetChannelsTool = defineTool({
  name: TOOL_NAME,
  title: 'Set audio channels',
  description:
    'Re-encodes one audio file at a target channel count. '
    + 'It writes that file in the export root, in a new numbered folder '
    + 'when subfolder is true, or in the existing folder named by '
    + 'targetFolder, and never changes the input.',
  inputSchema: {
    inputPath: z.string().min(1).describe(INPUT_PATH_DESCRIPTION),
    outputName: outputNameField,
    channels: channelsField(CHANNELS_DESCRIPTION),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runSetChannels(args, context);
  },
});
