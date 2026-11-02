// ───────────────────────────────────────────────────────────────────
// MODULE: Media Containers
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { ERROR_CODES, MediaError } from './errors.js';

import type { MediaProperties } from './media-properties.js';
import type { ResolvedInput } from './path-guard.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Muxer, extension, and default encoders for one video container. */
export interface VideoContainer {
  format: VideoFormat;
  muxer: string;
  extension: string;
  videoEncoder: string;
  audioEncoder: string;
}

/** Muxer, extension, and default encoder for one audio container. */
export interface AudioContainer {
  format: AudioFormat;
  muxer: string;
  extension: string;
  encoder: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** Video containers a conversion can write. */
export const VIDEO_FORMATS = ['mp4', 'mov', 'mkv', 'webm', 'avi'] as const;

/** One value from {@link VIDEO_FORMATS}. */
export type VideoFormat = (typeof VIDEO_FORMATS)[number];

/** Muxer, extension, and default encoders for each video container. */
export const VIDEO_CONTAINERS: Readonly<Record<VideoFormat, VideoContainer>> = {
  mp4: {
    format: 'mp4',
    muxer: 'mp4',
    extension: '.mp4',
    videoEncoder: 'libx264',
    audioEncoder: 'aac',
  },
  mov: {
    format: 'mov',
    muxer: 'mov',
    extension: '.mov',
    videoEncoder: 'libx264',
    audioEncoder: 'aac',
  },
  mkv: {
    format: 'mkv',
    muxer: 'matroska',
    extension: '.mkv',
    videoEncoder: 'libx264',
    audioEncoder: 'aac',
  },
  webm: {
    format: 'webm',
    muxer: 'webm',
    extension: '.webm',
    videoEncoder: 'libvpx-vp9',
    audioEncoder: 'libopus',
  },
  avi: {
    format: 'avi',
    muxer: 'avi',
    extension: '.avi',
    videoEncoder: 'mpeg4',
    audioEncoder: 'libmp3lame',
  },
};

/** Audio containers a conversion can write. */
export const AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'flac', 'ogg'] as const;

/** One value from {@link AUDIO_FORMATS}. */
export type AudioFormat = (typeof AUDIO_FORMATS)[number];

/** Audio container names a schema accepts, including the `aac` alias. */
export const AUDIO_FORMAT_VALUES = [...AUDIO_FORMATS, 'aac'] as const;

/** One value from {@link AUDIO_FORMAT_VALUES}. */
export type AudioFormatValue = (typeof AUDIO_FORMAT_VALUES)[number];

/** Muxer, extension, and default encoder for each audio container. */
export const AUDIO_CONTAINERS: Readonly<Record<AudioFormat, AudioContainer>> = {
  mp3: {
    format: 'mp3',
    muxer: 'mp3',
    extension: '.mp3',
    encoder: 'libmp3lame',
  },
  wav: {
    format: 'wav',
    muxer: 'wav',
    extension: '.wav',
    encoder: 'pcm_s16le',
  },
  m4a: {
    format: 'm4a',
    muxer: 'mp4',
    extension: '.m4a',
    encoder: 'aac',
  },
  flac: {
    format: 'flac',
    muxer: 'flac',
    extension: '.flac',
    encoder: 'flac',
  },
  ogg: {
    format: 'ogg',
    muxer: 'ogg',
    extension: '.ogg',
    encoder: 'libvorbis',
  },
};

/** Video encoders a caller can name. */
export const VIDEO_CODECS = ['libx264', 'libx265', 'libvpx-vp9'] as const;

/** One value from {@link VIDEO_CODECS}. */
export type VideoCodec = (typeof VIDEO_CODECS)[number];

/** Video encoder names a schema accepts, including the `vp9` alias. */
export const VIDEO_CODEC_VALUES = [...VIDEO_CODECS, 'vp9'] as const;

/** One value from {@link VIDEO_CODEC_VALUES}. */
export type VideoCodecValue = (typeof VIDEO_CODEC_VALUES)[number];

/** Audio encoders used for a video file's audio track. */
export const VIDEO_AUDIO_CODECS = ['aac', 'libmp3lame', 'libopus'] as const;

/** One value from {@link VIDEO_AUDIO_CODECS}. */
export type VideoAudioCodec = (typeof VIDEO_AUDIO_CODECS)[number];

/** Video-track audio encoder names, including the `mp3` alias. */
export const VIDEO_AUDIO_CODEC_VALUES = [
  ...VIDEO_AUDIO_CODECS,
  'mp3',
] as const;

/** One value from {@link VIDEO_AUDIO_CODEC_VALUES}. */
export type VideoAudioCodecValue = (typeof VIDEO_AUDIO_CODEC_VALUES)[number];

/** Encoders `audio_extract` can write. */
export const EXTRACT_CODECS = [
  'libmp3lame',
  'aac',
  'libvorbis',
  'flac',
  'pcm_s16le',
] as const;

/** One value from {@link EXTRACT_CODECS}. */
export type ExtractCodec = (typeof EXTRACT_CODECS)[number];

/** Extract encoder names, including the `mp3` and `wav` aliases. */
export const EXTRACT_CODEC_VALUES = [...EXTRACT_CODECS, 'mp3', 'wav'] as const;

/** One value from {@link EXTRACT_CODEC_VALUES}. */
export type ExtractCodecValue = (typeof EXTRACT_CODEC_VALUES)[number];

/** File extension each extract encoder writes. */
export const EXTRACT_CODEC_EXTENSIONS: Readonly<Record<ExtractCodec, string>> = {
  libmp3lame: '.mp3',
  aac: '.m4a',
  libvorbis: '.ogg',
  flac: '.flac',
  pcm_s16le: '.wav',
};

/** Extensions of the MP4 family, whose kept file has to play wherever MP4 does. */
export const MP4_FAMILY_EXTENSIONS: readonly string[] = ['.mp4', '.m4a', '.m4v'];

// ffmpeg 9 stores these in MP4 by stream copy while 6.1 and 7.0 refuse them, and
// few players read them there, so every build treats such a copy as refused.
const PCM_CODEC_PREFIX = 'pcm_';
const FFV1_CODEC = 'ffv1';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

// An audio-only MP4-family file uses the m4a row, not a video container.
const PROBE_AUDIO_FORMAT: Readonly<Record<string, AudioFormat>> = {
  mp3: 'mp3',
  wav: 'wav',
  flac: 'flac',
  ogg: 'ogg',
  mp4: 'm4a',
  mov: 'm4a',
  m4a: 'm4a',
};

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Map the `aac` alias onto the m4a container.
 *
 * @param value - A schema audio format, including the alias
 * @returns The container key
 */
export function normalizeAudioFormat(value: AudioFormatValue): AudioFormat {
  if (value === 'aac') {
    return 'm4a';
  }
  return value;
}

/**
 * Map ffprobe format names onto an audio container.
 *
 * The first recognized name wins. `mp4`, `mov`, and `m4a` are m4a.
 * Anything else, including `matroska` and a bare `aac`, has no row.
 *
 * @param props - Format names from a probe
 * @returns The container, or undefined when none of the names match
 */
export function audioFormatFromProbe(
  props: Pick<MediaProperties, 'formatNames'>,
): AudioFormat | undefined {
  for (const name of props.formatNames) {
    const format = PROBE_AUDIO_FORMAT[name];
    if (format !== undefined) {
      return format;
    }
  }
  return undefined;
}

/**
 * Return the audio container for a probed file.
 *
 * @param input - Accepted input the failure should name
 * @param props - Properties from a probe of that input
 * @returns The container row
 * @throws {@link MediaError} `UNSUPPORTED_FORMAT` when no name matches the table
 */
export function requireAudioContainer(
  input: ResolvedInput,
  props: MediaProperties,
): AudioContainer {
  const format = audioFormatFromProbe(props);
  if (format === undefined) {
    throw new MediaError(
      ERROR_CODES.UNSUPPORTED_FORMAT,
      'This file uses an audio container that is not supported.',
      {
        path: input.rawPath,
        detected: [...props.formatNames],
        accepted: [...AUDIO_FORMATS],
        reason: 'container',
      },
    );
  }
  return AUDIO_CONTAINERS[format];
}

/**
 * Map the `vp9` alias onto `libvpx-vp9`.
 *
 * @param value - A schema video encoder, including the alias
 * @returns The encoder name ffmpeg receives
 */
export function normalizeVideoCodec(value: VideoCodecValue): VideoCodec {
  if (value === 'vp9') {
    return 'libvpx-vp9';
  }
  return value;
}

/**
 * Map the `mp3` alias onto `libmp3lame` for a video file's audio track.
 *
 * @param value - A schema audio encoder, including the alias
 * @returns The encoder name ffmpeg receives
 */
export function normalizeVideoAudioCodec(
  value: VideoAudioCodecValue,
): VideoAudioCodec {
  if (value === 'mp3') {
    return 'libmp3lame';
  }
  return value;
}

/**
 * Map extract aliases onto encoder names.
 *
 * `mp3` becomes `libmp3lame` and `wav` becomes `pcm_s16le`.
 *
 * @param value - A schema extract encoder, including an alias
 * @returns The encoder name ffmpeg receives
 */
export function normalizeExtractCodec(value: ExtractCodecValue): ExtractCodec {
  if (value === 'mp3') {
    return 'libmp3lame';
  }
  if (value === 'wav') {
    return 'pcm_s16le';
  }
  return value;
}

/**
 * Tell whether an extension names an MP4-family file.
 *
 * @param extension - Extension with its leading dot, in any case
 * @returns True for `.mp4`, `.m4a` and `.m4v`
 */
export function isMp4FamilyExtension(extension: string): boolean {
  return MP4_FAMILY_EXTENSIONS.includes(extension.toLowerCase());
}

/**
 * List the codecs an MP4-family file may not keep: PCM audio and FFV1 video.
 *
 * @param codecs - Codec names of every stream in the file, as ffprobe reports them
 * @returns The names that may not stay in MP4, in the order given
 */
export function unportableMp4Codecs(codecs: readonly string[]): string[] {
  return codecs.filter((codec) => codec.startsWith(PCM_CODEC_PREFIX) || codec === FFV1_CODEC);
}
