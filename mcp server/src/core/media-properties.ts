// ───────────────────────────────────────────────────────────────────
// MODULE: Media Properties
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { ERROR_CODES, MediaError } from './errors.js';

import type { ResolvedInput } from './path-guard.js';
import type { ToolContext } from '../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The first video stream that is not attached cover art. */
export interface VideoStreamInfo {
  /** Codec name from the stream. Empty when the probe omitted it. */
  codecName: string;

  /** Frame width in pixels. Zero when the probe omitted it. */
  width: number;

  /** Frame height in pixels. Zero when the probe omitted it. */
  height: number;

  /** Frames per second. Thirty when the probe had no usable rate. */
  frameRate: number;
}

/** The first audio stream. */
export interface AudioStreamInfo {
  /** Codec name from the stream. Empty when the probe omitted it. */
  codecName: string;

  /** Samples per second. Zero when the probe omitted it. */
  sampleRate: number;

  /** Channel count. Zero when the probe omitted it. */
  channels: number;

  /** Bits per second, when the probe reported a finite rate. */
  bitRate?: number;
}

/**
 * Streams and timing read from one probe.
 *
 * Optional fields are omitted when the probe did not report them.
 */
export interface MediaProperties {
  /** Seconds from the container, or from a stream when that is missing. */
  durationSeconds?: number;

  /** Container name string as ffprobe reported it. */
  formatName?: string;

  /** {@link MediaProperties.formatName} split on commas. */
  formatNames: readonly string[];

  /** First real video stream. Absent when the file has none. */
  video?: VideoStreamInfo;

  /** First audio stream. Absent when the file has none. */
  audio?: AudioStreamInfo;

  /** True when {@link MediaProperties.video} is present. */
  hasVideo: boolean;

  /** True when {@link MediaProperties.audio} is present. */
  hasAudio: boolean;
}

/** A timed stream a tool can require. */
export type StreamKind = 'video' | 'audio';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

// Same tokens the output read-back passes to ffprobe.
const PROBE_ARGS = [
  '-v',
  'error',
  '-print_format',
  'json',
  '-show_format',
  '-show_streams',
  '-i',
] as const;

// ffprobe prints 0/0 when it could not read a rate. Thirty is the stand-in.
const DEFAULT_FRAME_RATE = 30;

const VIDEO_KIND = 'video';
const AUDIO_KIND = 'audio';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function emptyProperties(): MediaProperties {
  return {
    hasVideo: false,
    hasAudio: false,
    formatNames: [],
  };
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

// Zero keeps a stream that omitted a count, without inventing a real one.
function finiteOrZero(value: unknown): number {
  return finiteNumber(value) ?? 0;
}

function firstFinite(values: readonly unknown[]): number | undefined {
  for (const value of values) {
    const parsed = finiteNumber(value);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function codecNameOf(stream: Record<string, unknown>): string {
  const name = stream.codec_name;
  if (typeof name !== 'string') {
    return '';
  }
  return name;
}

function ratioRate(value: unknown): number | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const parts = value.split('/');
  if (parts.length !== 2) {
    return undefined;
  }
  const numerator = finiteNumber(parts[0]);
  const denominator = finiteNumber(parts[1]);
  if (
    numerator === undefined
    || denominator === undefined
    || denominator === 0
  ) {
    return undefined;
  }
  const rate = numerator / denominator;
  if (!Number.isFinite(rate) || rate === 0) {
    return undefined;
  }
  return rate;
}

function frameRateOf(stream: Record<string, unknown>): number {
  return ratioRate(stream.avg_frame_rate)
    ?? ratioRate(stream.r_frame_rate)
    ?? DEFAULT_FRAME_RATE;
}

function streamRecords(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (isRecord(entry)) {
      records.push(entry);
    }
  }
  return records;
}

// An attached picture is album art, not the picture a video tool edits.
function isCoverArt(stream: Record<string, unknown>): boolean {
  if (!isRecord(stream.disposition)) {
    return false;
  }
  return finiteNumber(stream.disposition.attached_pic) === 1;
}

function firstVideoStream(
  streams: readonly Record<string, unknown>[],
): Record<string, unknown> | undefined {
  for (const stream of streams) {
    if (stream.codec_type !== VIDEO_KIND || isCoverArt(stream)) {
      continue;
    }
    return stream;
  }
  return undefined;
}

function firstAudioStream(
  streams: readonly Record<string, unknown>[],
): Record<string, unknown> | undefined {
  for (const stream of streams) {
    if (stream.codec_type === AUDIO_KIND) {
      return stream;
    }
  }
  return undefined;
}

function videoInfo(stream: Record<string, unknown>): VideoStreamInfo {
  return {
    codecName: codecNameOf(stream),
    width: finiteOrZero(stream.width),
    height: finiteOrZero(stream.height),
    frameRate: frameRateOf(stream),
  };
}

function audioInfo(stream: Record<string, unknown>): AudioStreamInfo {
  const info: AudioStreamInfo = {
    codecName: codecNameOf(stream),
    sampleRate: finiteOrZero(stream.sample_rate),
    channels: finiteOrZero(stream.channels),
  };
  const bitRate = finiteNumber(stream.bit_rate);
  if (bitRate !== undefined) {
    info.bitRate = bitRate;
  }
  return info;
}

function readProbe(probe: unknown): MediaProperties {
  if (!isRecord(probe)) {
    return emptyProperties();
  }
  const format = isRecord(probe.format) ? probe.format : undefined;
  const streams = streamRecords(probe.streams);
  const videoStream = firstVideoStream(streams);
  const audioStream = firstAudioStream(streams);
  const video = videoStream === undefined ? undefined : videoInfo(videoStream);
  const audio = audioStream === undefined ? undefined : audioInfo(audioStream);
  const properties: MediaProperties = {
    formatNames: [],
    hasVideo: video !== undefined,
    hasAudio: audio !== undefined,
  };
  if (format !== undefined && typeof format.format_name === 'string') {
    properties.formatName = format.format_name;
    properties.formatNames = format.format_name.split(',');
  }
  if (video !== undefined) {
    properties.video = video;
  }
  if (audio !== undefined) {
    properties.audio = audio;
  }
  const durationSeconds = firstFinite([
    format?.duration,
    videoStream?.duration,
    audioStream?.duration,
  ]);
  if (durationSeconds !== undefined) {
    properties.durationSeconds = durationSeconds;
  }
  return properties;
}

function unreadableProbe(): MediaError {
  return new MediaError(
    ERROR_CODES.PROCESS_FAILED,
    'The media probe returned text that could not be read.',
    {
      binary: 'ffprobe',
      exitCode: 0,
      signal: null,
      stderrTail: '',
    },
  );
}

function unsupported(
  input: ResolvedInput,
  props: MediaProperties,
  accepted: readonly StreamKind[],
  message: string,
): MediaError {
  return new MediaError(ERROR_CODES.UNSUPPORTED_FORMAT, message, {
    path: input.rawPath,
    detected: detectedKinds(props),
    accepted: [...accepted],
  });
}

function streamCodecNames(probe: unknown): string[] {
  if (!isRecord(probe) || !Array.isArray(probe.streams)) {
    return [];
  }
  const names: string[] = [];
  for (const stream of probe.streams) {
    if (isRecord(stream) && typeof stream.codec_name === 'string') {
      names.push(stream.codec_name);
    }
  }
  return names;
}

async function probeJsonAt(
  context: Pick<ToolContext, 'runBinary'>,
  realPath: string,
  inputs: readonly ResolvedInput[],
): Promise<unknown> {
  const result = await context.runBinary(
    'ffprobe',
    [...PROBE_ARGS, realPath],
    {
      inputs,
      captureStdout: true,
    },
  );
  try {
    const parsed: unknown = JSON.parse(result.stdout);
    return parsed;
  } catch {
    throw unreadableProbe();
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Read stream kinds and properties from one ffprobe JSON value.
 *
 * A value that is not that JSON returns no streams and an empty format list.
 *
 * @param probe - Parsed show-format and show-streams JSON, or any other value
 * @returns The properties that could be read
 */
export function parseMediaProperties(probe: unknown): MediaProperties {
  return readProbe(probe);
}

/**
 * Probe one accepted input and read its streams.
 *
 * A failure from the runner is left as it was raised. Probe text that is
 * not JSON becomes a process failure with exit code 0.
 *
 * @param context - Runner used for ffprobe
 * @param input - File to probe
 * @returns The parsed properties
 * @throws {@link MediaError} when the probe run fails, or when its text is not JSON
 */
export async function probeMedia(
  context: Pick<ToolContext, 'runBinary'>,
  input: ResolvedInput,
): Promise<MediaProperties> {
  return readProbe(await probeJsonAt(context, input.realPath, [input]));
}

/**
 * Probe one accepted input and return ffprobe's parsed JSON as it came.
 *
 * For a tool that reports fields {@link MediaProperties} does not carry.
 *
 * @param context - Runner used for ffprobe
 * @param input - File to probe
 * @returns The parsed show-format and show-streams JSON
 * @throws {@link MediaError} when the probe run fails, or when its text is not JSON
 */
export async function readProbeJson(
  context: Pick<ToolContext, 'runBinary'>,
  input: ResolvedInput,
): Promise<unknown> {
  return probeJsonAt(context, input.realPath, [input]);
}

/**
 * Probe a file the server wrote into a run's temp folder.
 *
 * The file is no caller input, so the runner has nothing to re-check. Only
 * a path the server generated itself may be passed.
 *
 * @param context - Runner used for ffprobe
 * @param realPath - Absolute path of the server's own intermediate file
 * @returns The parsed properties
 * @throws {@link MediaError} when the probe run fails, or when its text is not JSON
 */
export async function probeIntermediate(
  context: Pick<ToolContext, 'runBinary'>,
  realPath: string,
): Promise<MediaProperties> {
  return readProbe(await probeJsonAt(context, realPath, []));
}

/**
 * List the codec of every stream in a file the server wrote into a temp folder.
 *
 * Unlike {@link probeIntermediate}, which keeps the first video and audio
 * stream, this reads every stream, so a second audio track is not missed. Only
 * a path the server generated itself may be passed.
 *
 * @param context - Runner used for ffprobe
 * @param realPath - Absolute path of the server's own intermediate file
 * @returns The codec names in stream order, without streams that name none
 * @throws {@link MediaError} when the probe run fails, or when its text is not JSON
 */
export async function probeIntermediateCodecs(
  context: Pick<ToolContext, 'runBinary'>,
  realPath: string,
): Promise<string[]> {
  return streamCodecNames(await probeJsonAt(context, realPath, []));
}

/**
 * List the timed streams that are present, video first.
 *
 * @param props - Properties from a probe
 * @returns The kinds that are present, in video then audio order
 */
export function detectedKinds(props: MediaProperties): StreamKind[] {
  const kinds: StreamKind[] = [];
  if (props.hasVideo) {
    kinds.push(VIDEO_KIND);
  }
  if (props.hasAudio) {
    kinds.push(AUDIO_KIND);
  }
  return kinds;
}

/**
 * Return the video stream, or refuse a file that has none.
 *
 * @param input - Accepted input the failure should name
 * @param props - Properties from a probe of that input
 * @returns The video stream
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` when the file has no video
 */
export function requireVideoStream(
  input: ResolvedInput,
  props: MediaProperties,
): VideoStreamInfo {
  if (props.video === undefined) {
    throw unsupported(
      input,
      props,
      [VIDEO_KIND],
      'This file needs a video.',
    );
  }
  return props.video;
}

/**
 * Return the audio stream, or refuse a file that has none.
 *
 * @param input - Accepted input the failure should name
 * @param props - Properties from a probe of that input
 * @returns The audio stream
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` when the file has no audio
 */
export function requireAudioStream(
  input: ResolvedInput,
  props: MediaProperties,
): AudioStreamInfo {
  if (props.audio === undefined) {
    throw unsupported(
      input,
      props,
      [AUDIO_KIND],
      'This file needs audio.',
    );
  }
  return props.audio;
}
