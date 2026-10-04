// ───────────────────────────────────────────────────────────────────
// MODULE: Capabilities
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { ERROR_CODES, MediaError } from './errors.js';
import { runProcess } from './process-runner.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/**
 * Reads one ffmpeg list and returns its stdout.
 */
export type CapabilityRunner = (
  binaryPath: string,
  args: readonly string[],
) => Promise<string>;

/**
 * Encoder and filter names found for one binary.
 */
export interface Capabilities {
  readonly encoders: ReadonlySet<string>;
  readonly filters: ReadonlySet<string>;
}

/**
 * One closed-list name and whether the binary has it.
 */
export interface CapabilityEntry {
  readonly kind: 'encoder' | 'filter';
  readonly name: string;
  readonly present: boolean;
}

/**
 * Names a tool always checks. Call-specific names are added by the handler.
 */
export interface ToolRequirement {
  readonly encoders: readonly string[];
  readonly attemptTwoEncoders: readonly string[];
  readonly filters: readonly string[];
}

/**
 * Timeout for the default list reader.
 */
export interface DetectCapabilitiesOptions {
  readonly timeoutMs?: number;
}

/**
 * Names to require before a tool starts.
 */
export interface AssertCapabilitiesOptions {
  readonly tool: string;
  readonly binaryPath: string;
  readonly capabilities: Capabilities;
  readonly encoders?: readonly string[];
  readonly filters?: readonly string[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Encoders a tool may gate on, in report order. */
export const GATED_ENCODERS = [
  'libx264',
  'libx265',
  'libvpx-vp9',
  'aac',
  'libmp3lame',
  'libopus',
  'libvorbis',
  'flac',
  'pcm_s16le',
  'mpeg4',
] as const;

/** Filters a tool may gate on, in report order. */
export const GATED_FILTERS = [
  'drawtext',
  'subtitles',
  'xfade',
  'acrossfade',
  'silencedetect',
  'select',
  'setpts',
  'aselect',
  'asetpts',
  'atempo',
  'fade',
  'overlay',
  'scale',
  'pad',
  'crop',
  'split',
  'format',
  'colorchannelmixer',
] as const;

/** Registered tool names, in table order. */
export const TOOL_NAMES = [
  'image_resize',
  'image_convert',
  'image_crop',
  'image_compress',
  'image_rotate',
  'image_flip',
  'image_probe',
  'image_batch_resize',
  'media_health',
  'audio_extract',
  'video_trim',
  'audio_convert_properties',
  'video_convert_properties',
  'video_set_aspect_ratio',
  'audio_convert',
  'audio_set_bitrate',
  'audio_set_sample_rate',
  'audio_set_channels',
  'video_convert',
  'video_set_resolution',
  'video_set_codec',
  'video_set_bitrate',
  'video_set_frame_rate',
  'video_set_audio_codec',
  'video_set_audio_bitrate',
  'video_set_audio_sample_rate',
  'video_set_audio_channels',
  'video_add_subtitles',
  'video_add_text_overlay',
  'video_add_image_overlay',
  'video_concat',
  'video_set_speed',
  'media_remove_silence',
  'video_add_b_roll',
  'video_add_fade',
  'media_probe',
  'media_rename',
  'media_repair',
  'video_hls_ladder',
  'media_setup_ffmpeg',
] as const;

/** One registered tool name. */
export type ToolName = (typeof TOOL_NAMES)[number];

const DEFAULT_CAPABILITY_TIMEOUT_MS = 30000;
const NONE: readonly string[] = Object.freeze([]);

// The flag shape keeps legend text and descriptions out of the name column.
// ffmpeg 9 dropped the command-support flag, so a filter row carries two or three.
const ENCODER_LINE = /^ ([VAS][F.][S.][X.][B.][D.])\s+(\S+)/;
const FILTER_LINE = /^ ([TSC.]{2,3})\s+(\S+)\s+(\S+)/;

const capabilityCache = new Map<string, Promise<Capabilities>>();

function requirement(
  encoders: readonly string[],
  attemptTwoEncoders: readonly string[],
  filters: readonly string[],
): ToolRequirement {
  return { encoders, attemptTwoEncoders, filters };
}

/**
 * Unconditional encoders and filters for each tool.
 * A handler adds names that depend on the call.
 */
export const TOOL_REQUIREMENTS: Readonly<Record<ToolName, ToolRequirement>> = {
  image_resize: requirement(NONE, NONE, NONE),
  image_convert: requirement(NONE, NONE, NONE),
  image_crop: requirement(NONE, NONE, NONE),
  image_compress: requirement(NONE, NONE, NONE),
  image_rotate: requirement(NONE, NONE, NONE),
  image_flip: requirement(NONE, NONE, NONE),
  image_probe: requirement(NONE, NONE, NONE),
  image_batch_resize: requirement(NONE, NONE, NONE),
  media_health: requirement(NONE, NONE, NONE),
  audio_extract: requirement(NONE, NONE, NONE),
  video_trim: requirement(NONE, ['libx264', 'aac'], NONE),
  audio_convert_properties: requirement(NONE, NONE, NONE),
  video_convert_properties: requirement(NONE, NONE, NONE),
  video_set_aspect_ratio: requirement(['libx264'], ['aac'], NONE),
  audio_convert: requirement(NONE, NONE, NONE),
  audio_set_bitrate: requirement(NONE, NONE, NONE),
  audio_set_sample_rate: requirement(NONE, NONE, NONE),
  audio_set_channels: requirement(NONE, NONE, NONE),
  video_convert: requirement(NONE, NONE, NONE),
  video_set_resolution: requirement(['libx264'], ['aac'], ['scale']),
  video_set_codec: requirement(NONE, ['aac'], NONE),
  video_set_bitrate: requirement(['libx264'], ['aac'], NONE),
  video_set_frame_rate: requirement(['libx264'], ['aac'], NONE),
  video_set_audio_codec: requirement(NONE, ['libx264'], NONE),
  video_set_audio_bitrate: requirement(['aac'], ['libx264'], NONE),
  video_set_audio_sample_rate: requirement(['aac'], ['libx264'], NONE),
  video_set_audio_channels: requirement(['aac'], ['libx264'], NONE),
  video_add_subtitles: requirement(['libx264'], ['aac'], ['subtitles']),
  video_add_text_overlay: requirement(['libx264'], ['aac'], ['drawtext']),
  video_add_image_overlay: requirement(['libx264'], NONE, ['overlay']),
  video_concat: requirement(['libx264', 'aac'], NONE, ['scale']),
  video_set_speed: requirement(['libx264', 'aac'], NONE, ['setpts']),
  media_remove_silence: requirement(
    ['aac'],
    NONE,
    ['silencedetect', 'select', 'setpts', 'aselect', 'asetpts'],
  ),
  video_add_b_roll: requirement(['libx264', 'aac'], NONE, ['overlay', 'scale', 'setpts']),
  video_add_fade: requirement(['libx264'], ['aac'], ['fade']),
  media_probe: requirement(NONE, NONE, NONE),
  media_rename: requirement(NONE, NONE, NONE),
  media_repair: requirement(NONE, NONE, NONE),
  video_hls_ladder: requirement(['libx264'], NONE, ['split', 'scale', 'pad']),
  media_setup_ffmpeg: requirement(NONE, NONE, NONE),
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function firstAbsent(
  names: readonly string[] | undefined,
  present: ReadonlySet<string>,
): string | undefined {
  if (names === undefined) {
    return undefined;
  }
  for (const name of names) {
    if (!present.has(name)) {
      return name;
    }
  }
  return undefined;
}

function missingCapability(
  tool: string,
  binaryPath: string,
  kind: 'encoder' | 'filter',
  name: string,
): MediaError {
  return new MediaError(
    ERROR_CODES.CAPABILITY_MISSING,
    `The resolved ffmpeg has no ${name} ${kind}, which ${tool} needs.`,
    {
      binary: binaryPath,
      kind,
      name,
      neededBy: tool,
    },
  );
}

async function readWithProcess(
  binaryPath: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<string> {
  const result = await runProcess(binaryPath, args, {
    kind: 'ffmpeg',
    timeoutMs,
    captureStdout: true,
  });
  return result.stdout;
}

async function readCapabilityLists(
  binaryPath: string,
  runner: CapabilityRunner,
): Promise<Capabilities> {
  const [encoderText, filterText] = await Promise.all([
    runner(binaryPath, ['-encoders']),
    runner(binaryPath, ['-filters']),
  ]);
  return {
    encoders: parseEncoders(encoderText),
    filters: parseFilters(filterText),
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Read encoder names from an encoder list.
 *
 * Only the name column counts. A legend row whose name is `=` is skipped.
 *
 * @param text - stdout from the encoder list
 * @returns The names found, case-sensitive
 */
export function parseEncoders(text: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = ENCODER_LINE.exec(line);
    if (match === null) {
      continue;
    }
    const name = match[2];
    // Legend rows reuse the flag shape and put "=" where the name would be.
    if (name === undefined || name === '=') {
      continue;
    }
    names.add(name);
  }
  return names;
}

/**
 * Read filter names from a filter list.
 *
 * A row counts only when its name is not `=` and the next column contains
 * `->`. Description text is never searched.
 *
 * @param text - stdout from the filter list
 * @returns The names found, case-sensitive
 */
export function parseFilters(text: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = FILTER_LINE.exec(line);
    if (match === null) {
      continue;
    }
    const name = match[2];
    const spec = match[3];
    if (
      name === undefined
      || spec === undefined
      || name === '='
      || !spec.includes('->')
    ) {
      continue;
    }
    names.add(name);
  }
  return names;
}

/**
 * Read the encoder and filter lists for one binary, once per path.
 *
 * Concurrent calls share the in-flight read. A failure is removed from
 * the cache so a later call can try again. `timeoutMs` applies only to
 * the default reader.
 *
 * @param binaryPath - Absolute path of the ffmpeg binary
 * @param run - Stdout reader. The default runs the binary through the process runner
 * @param options - Optional timeout for the default reader
 * @returns The names present in each list
 * @throws {@link MediaError} when the default reader cannot run the binary
 */
export function detectCapabilities(
  binaryPath: string,
  run?: CapabilityRunner,
  options?: DetectCapabilitiesOptions,
): Promise<Capabilities> {
  const cached = capabilityCache.get(binaryPath);
  if (cached !== undefined) {
    return cached;
  }

  const runner: CapabilityRunner = run ?? ((
    nextBinary: string,
    args: readonly string[],
  ): Promise<string> => {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_CAPABILITY_TIMEOUT_MS;
    return readWithProcess(nextBinary, args, timeoutMs);
  });
  const pending = readCapabilityLists(binaryPath, runner);
  capabilityCache.set(binaryPath, pending);
  // The returned promise still rejects. This only forgets the failed read.
  void pending.catch(() => {
    if (capabilityCache.get(binaryPath) === pending) {
      capabilityCache.delete(binaryPath);
    }
  });
  return pending;
}

/**
 * Forget one binary's lists so the next check reads them again.
 *
 * @param binaryPath - Path that keyed the cache
 */
export function dropCapabilities(binaryPath: string): void {
  capabilityCache.delete(binaryPath);
}

/**
 * Forget every cached list.
 */
export function resetCapabilityCache(): void {
  capabilityCache.clear();
}

/**
 * List every gated name and whether this binary has it.
 *
 * Encoders come first, in closed-list order, then filters.
 *
 * @param caps - Names parsed from one binary
 * @returns One entry per gated encoder and filter
 */
export function summarizeCapabilities(caps: Capabilities): CapabilityEntry[] {
  const entries: CapabilityEntry[] = [];
  for (const name of GATED_ENCODERS) {
    entries.push({
      kind: 'encoder',
      name,
      present: caps.encoders.has(name),
    });
  }
  for (const name of GATED_FILTERS) {
    entries.push({
      kind: 'filter',
      name,
      present: caps.filters.has(name),
    });
  }
  return entries;
}

/**
 * Require encoders and filters before a tool runs.
 *
 * Encoders are checked first, in the given order, then filters. The first
 * missing name throws. Empty or omitted lists do nothing.
 *
 * @param options - Tool, binary, known lists, and the names this call needs
 * @throws {@link MediaError} `CAPABILITY_MISSING` when a named encoder or filter is absent
 */
export function assertCapabilities(options: AssertCapabilitiesOptions): void {
  const encoder = firstAbsent(options.encoders, options.capabilities.encoders);
  if (encoder !== undefined) {
    throw missingCapability(
      options.tool,
      options.binaryPath,
      'encoder',
      encoder,
    );
  }
  const filter = firstAbsent(options.filters, options.capabilities.filters);
  if (filter !== undefined) {
    throw missingCapability(
      options.tool,
      options.binaryPath,
      'filter',
      filter,
    );
  }
}
