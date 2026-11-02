// ───────────────────────────────────────────────────────────────────
// MODULE: Media Probe
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError, isMediaError } from '../../core/errors.js';
import { readProbeJson } from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { defineTool } from '../../server/tool-registry.js';
import { videoPreview, previewField, withPreviewBlock } from './preview.js';

import type { CallToolResult, ImageContent } from '@modelcontextprotocol/sdk/types.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for one probe call. */
interface ProbeArguments {
  readonly inputPath: string;
  readonly preview?: boolean;
}

/** The container block, holding one key per value ffprobe reported. */
interface ProbeFormat {
  formatName?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  bitRate?: number;
}

/** The summary block. The two booleans are always present. */
interface ProbeSummary {
  hasVideo: boolean;
  hasAudio: boolean;
  durationSeconds?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  sampleRate?: number;
  channels?: number;
  channelLayout?: string;
}

/** One stream row, holding the keys that stream carries. */
interface ProbeStream {
  index?: number;
  type?: string;
  codecName?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  pixelFormat?: string;
  sampleRate?: number;
  channels?: number;
  channelLayout?: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'media_probe';
const NO_PICTURE = 'No preview: the file has no picture.';
const PREVIEW_FAILED = 'No preview: ffmpeg could not read a frame.';

const VIDEO_STREAM = 'video';
const AUDIO_STREAM = 'audio';

// ffprobe prints 0/0 when a stream has no rate, so thirty is the stand-in.
const DEFAULT_FRAME_RATE = 30;
const RATE_SCALE = 1000;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function integerValue(value: unknown): number | undefined {
  const parsed = finiteNumber(value);
  if (parsed === undefined || !Number.isInteger(parsed)) {
    return undefined;
  }
  return parsed;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }
  return value;
}

function ratioRate(value: unknown): number | undefined {
  const text = nonEmptyString(value);
  if (text === undefined) {
    return undefined;
  }
  const parts = text.split('/');
  if (parts.length !== 2) {
    return undefined;
  }
  const numerator = finiteNumber(parts[0]);
  const denominator = finiteNumber(parts[1]);
  if (numerator === undefined || denominator === undefined || denominator === 0) {
    return undefined;
  }
  const rate = numerator / denominator;
  if (!Number.isFinite(rate)) {
    return undefined;
  }
  return Math.round(rate * RATE_SCALE) / RATE_SCALE;
}

function frameRateOf(stream: Record<string, unknown>): number {
  return ratioRate(stream.avg_frame_rate) ?? DEFAULT_FRAME_RATE;
}

// An attached picture is album art, not the moving picture a video tool edits.
function isCoverArt(stream: Record<string, unknown>): boolean {
  if (!isRecord(stream.disposition)) {
    return false;
  }
  return finiteNumber(stream.disposition.attached_pic) === 1;
}

function streamRecords(root: Record<string, unknown>): readonly Record<string, unknown>[] {
  if (!Array.isArray(root.streams)) {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const entry of root.streams) {
    if (isRecord(entry)) {
      records.push(entry);
    }
  }
  return records;
}

function firstStreamOfType(
  streams: readonly Record<string, unknown>[],
  type: string,
): Record<string, unknown> | undefined {
  for (const stream of streams) {
    if (stream.codec_type === type) {
      return stream;
    }
  }
  return undefined;
}

function firstVideoStream(
  streams: readonly Record<string, unknown>[],
): Record<string, unknown> | undefined {
  for (const stream of streams) {
    if (stream.codec_type === VIDEO_STREAM && !isCoverArt(stream)) {
      return stream;
    }
  }
  return undefined;
}

function formatBlock(root: Record<string, unknown>): ProbeFormat {
  const block: ProbeFormat = {};
  const format = isRecord(root.format) ? root.format : undefined;
  if (format === undefined) {
    return block;
  }
  const formatName = nonEmptyString(format.format_name);
  if (formatName !== undefined) {
    block.formatName = formatName;
  }
  const durationSeconds = finiteNumber(format.duration);
  if (durationSeconds !== undefined) {
    block.durationSeconds = durationSeconds;
  }
  const sizeBytes = integerValue(format.size);
  if (sizeBytes !== undefined) {
    block.sizeBytes = sizeBytes;
  }
  const bitRate = integerValue(format.bit_rate);
  if (bitRate !== undefined) {
    block.bitRate = bitRate;
  }
  return block;
}

// The container duration wins. A stream fills in only when the container has none.
function summaryDuration(
  streams: readonly Record<string, unknown>[],
  formatDuration: number | undefined,
): number | undefined {
  if (formatDuration !== undefined) {
    return formatDuration;
  }
  for (const stream of streams) {
    const isTimed = stream.codec_type === VIDEO_STREAM || stream.codec_type === AUDIO_STREAM;
    if (!isTimed || isCoverArt(stream)) {
      continue;
    }
    const duration = finiteNumber(stream.duration);
    if (duration !== undefined) {
      return duration;
    }
  }
  return undefined;
}

function summaryBlock(
  streams: readonly Record<string, unknown>[],
  formatDuration: number | undefined,
): ProbeSummary {
  const video = firstVideoStream(streams);
  const audio = firstStreamOfType(streams, AUDIO_STREAM);
  const block: ProbeSummary = {
    hasVideo: video !== undefined,
    hasAudio: audio !== undefined,
  };
  const durationSeconds = summaryDuration(streams, formatDuration);
  if (durationSeconds !== undefined) {
    block.durationSeconds = durationSeconds;
  }
  if (video !== undefined) {
    const width = integerValue(video.width);
    if (width !== undefined) {
      block.width = width;
    }
    const height = integerValue(video.height);
    if (height !== undefined) {
      block.height = height;
    }
    block.frameRate = frameRateOf(video);
  }
  if (audio !== undefined) {
    const sampleRate = integerValue(audio.sample_rate);
    if (sampleRate !== undefined) {
      block.sampleRate = sampleRate;
    }
    const channels = integerValue(audio.channels);
    if (channels !== undefined) {
      block.channels = channels;
    }
    const channelLayout = nonEmptyString(audio.channel_layout);
    if (channelLayout !== undefined) {
      block.channelLayout = channelLayout;
    }
  }
  return block;
}

function streamEntry(stream: Record<string, unknown>): ProbeStream {
  const entry: ProbeStream = {};
  const index = integerValue(stream.index);
  if (index !== undefined) {
    entry.index = index;
  }
  const type = nonEmptyString(stream.codec_type);
  if (type !== undefined) {
    entry.type = type;
  }
  const codecName = nonEmptyString(stream.codec_name);
  if (codecName !== undefined) {
    entry.codecName = codecName;
  }
  const width = integerValue(stream.width);
  if (width !== undefined) {
    entry.width = width;
  }
  const height = integerValue(stream.height);
  if (height !== undefined) {
    entry.height = height;
  }
  if (type === VIDEO_STREAM) {
    entry.frameRate = frameRateOf(stream);
  }
  const pixelFormat = nonEmptyString(stream.pix_fmt);
  if (pixelFormat !== undefined) {
    entry.pixelFormat = pixelFormat;
  }
  const sampleRate = integerValue(stream.sample_rate);
  if (sampleRate !== undefined) {
    entry.sampleRate = sampleRate;
  }
  const channels = integerValue(stream.channels);
  if (channels !== undefined) {
    entry.channels = channels;
  }
  const channelLayout = nonEmptyString(stream.channel_layout);
  if (channelLayout !== undefined) {
    entry.channelLayout = channelLayout;
  }
  return entry;
}

function probeText(
  baseName: string,
  streamCount: number,
  durationSeconds: number | undefined,
): string {
  const noun = streamCount === 1 ? 'stream' : 'streams';
  if (durationSeconds === undefined) {
    return `Probed ${baseName}: ${streamCount} ${noun}.`;
  }
  return `Probed ${baseName}: ${streamCount} ${noun}, ${durationSeconds.toFixed(2)} seconds.`;
}

function unreadableMedia(input: ResolvedInput, details: Record<string, unknown>): MediaError {
  const baseName = path.basename(input.rawPath);
  return new MediaError(
    ERROR_CODES.PROCESS_FAILED,
    `ffprobe could not read ${baseName}. The next step is media_repair.`,
    details,
  );
}

async function readProbe(context: ToolContext, input: ResolvedInput): Promise<unknown> {
  try {
    return await readProbeJson(context, input);
  } catch (error: unknown) {
    if (isMediaError(error) && error.code === ERROR_CODES.PROCESS_FAILED) {
      throw unreadableMedia(input, error.details);
    }
    throw error;
  }
}

async function previewOf(
  context: ToolContext,
  input: ResolvedInput,
  summary: ProbeSummary,
  warnings: string[],
): Promise<ImageContent | undefined> {
  if (!summary.hasVideo) {
    warnings.push(NO_PICTURE);
    return undefined;
  }
  try {
    return await videoPreview(context, input, summary.durationSeconds);
  } catch {
    // The metadata is the answer. A preview that fails is a warning.
    warnings.push(PREVIEW_FAILED);
    return undefined;
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runProbe(args: ProbeArguments, context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  const probeJson = await readProbe(context, input);
  const root = isRecord(probeJson) ? probeJson : {};
  const format = formatBlock(root);
  const streams = streamRecords(root);
  const summary = summaryBlock(streams, format.durationSeconds);
  const warnings: string[] = [];
  const preview = args.preview === true
    ? await previewOf(context, input, summary, warnings)
    : undefined;
  const text = probeText(path.basename(input.rawPath), streams.length, summary.durationSeconds);
  const result = successResult({
    tool: TOOL_NAME,
    text: preview === undefined ? text : `${text} Preview attached.`,
    outputs: [],
    warnings,
    elapsedMs: Date.now() - startedAt,
    extras: {
      format,
      summary,
      streams: streams.map((stream) => streamEntry(stream)),
    },
  });
  return preview === undefined
    ? result
    : withPreviewBlock(result, preview, context.previewSink);
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Read container and stream metadata from any media file without writing anything. */
export const mediaProbeTool = defineTool({
  name: TOOL_NAME,
  title: 'Probe media',
  description:
    'Reads container and stream metadata from one image, audio or video file with ffprobe: '
    + 'format name, duration, size and bit rate, plus the codec, pixel size, frame rate, '
    + 'sample rate and channel layout of every stream. With preview it also returns one '
    + 'small JPEG frame, to name the file by what it shows. It writes nothing, creates no '
    + 'output folder, and never changes the input.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the image, audio or video file to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    preview: previewField,
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runProbe(args, context);
  },
});
