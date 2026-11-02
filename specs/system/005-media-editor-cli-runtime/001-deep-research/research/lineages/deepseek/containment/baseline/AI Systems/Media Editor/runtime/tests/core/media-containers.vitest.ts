// ───────────────────────────────────────────────────────────────────
// MODULE: Media Containers Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  AUDIO_CONTAINERS,
  AUDIO_FORMATS,
  EXTRACT_CODEC_EXTENSIONS,
  VIDEO_CONTAINERS,
  audioFormatFromProbe,
  isMp4FamilyExtension,
  normalizeAudioFormat,
  normalizeExtractCodec,
  normalizeVideoAudioCodec,
  normalizeVideoCodec,
  requireAudioContainer,
  unportableMp4Codecs,
} from '../../src/core/media-containers.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { probeMedia } from '../../src/core/media-properties.js';
import { runProcess } from '../../src/core/process-runner.js';
import { createToolContext } from '../../src/server/tool-context.js';
import {
  generateAudio,
  resolveTestBinary,
} from '../helpers/media.js';
import { createSandbox } from '../helpers/tool-client.js';

import type {
  AudioContainer,
  AudioFormat,
  AudioFormatValue,
  ExtractCodec,
  ExtractCodecValue,
  VideoAudioCodec,
  VideoAudioCodecValue,
  VideoCodec,
  VideoCodecValue,
  VideoContainer,
} from '../../src/core/media-containers.js';
import type { MediaProperties } from '../../src/core/media-properties.js';
import type { ResolvedInput } from '../../src/core/path-guard.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface AudioAlias {
  value: AudioFormatValue;
  format: AudioFormat;
}

interface VideoAlias {
  value: VideoCodecValue;
  codec: VideoCodec;
}

interface VideoAudioAlias {
  value: VideoAudioCodecValue;
  codec: VideoAudioCodec;
}

interface ExtractAlias {
  value: ExtractCodecValue;
  codec: ExtractCodec;
}

interface ProbeCase {
  names: readonly string[];
  format: AudioFormat | undefined;
}

interface RealProbe {
  key: string;
  format: AudioFormat;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const VIDEO_ROWS: readonly VideoContainer[] = [
  {
    format: 'mp4',
    muxer: 'mp4',
    extension: '.mp4',
    videoEncoder: 'libx264',
    audioEncoder: 'aac',
  },
  {
    format: 'mov',
    muxer: 'mov',
    extension: '.mov',
    videoEncoder: 'libx264',
    audioEncoder: 'aac',
  },
  {
    format: 'mkv',
    muxer: 'matroska',
    extension: '.mkv',
    videoEncoder: 'libx264',
    audioEncoder: 'aac',
  },
  {
    format: 'webm',
    muxer: 'webm',
    extension: '.webm',
    videoEncoder: 'libvpx-vp9',
    audioEncoder: 'libopus',
  },
  {
    format: 'avi',
    muxer: 'avi',
    extension: '.avi',
    videoEncoder: 'mpeg4',
    audioEncoder: 'libmp3lame',
  },
];

const AUDIO_ROWS: readonly AudioContainer[] = [
  {
    format: 'mp3',
    muxer: 'mp3',
    extension: '.mp3',
    encoder: 'libmp3lame',
  },
  {
    format: 'wav',
    muxer: 'wav',
    extension: '.wav',
    encoder: 'pcm_s16le',
  },
  {
    format: 'm4a',
    muxer: 'mp4',
    extension: '.m4a',
    encoder: 'aac',
  },
  {
    format: 'flac',
    muxer: 'flac',
    extension: '.flac',
    encoder: 'flac',
  },
  {
    format: 'ogg',
    muxer: 'ogg',
    extension: '.ogg',
    encoder: 'libvorbis',
  },
];

const AUDIO_ALIASES: readonly AudioAlias[] = [
  { value: 'aac', format: 'm4a' },
  { value: 'mp3', format: 'mp3' },
  { value: 'wav', format: 'wav' },
  { value: 'm4a', format: 'm4a' },
  { value: 'flac', format: 'flac' },
  { value: 'ogg', format: 'ogg' },
];

const VIDEO_ALIASES: readonly VideoAlias[] = [
  { value: 'vp9', codec: 'libvpx-vp9' },
  { value: 'libx264', codec: 'libx264' },
  { value: 'libx265', codec: 'libx265' },
  { value: 'libvpx-vp9', codec: 'libvpx-vp9' },
];

const VIDEO_AUDIO_ALIASES: readonly VideoAudioAlias[] = [
  { value: 'mp3', codec: 'libmp3lame' },
  { value: 'aac', codec: 'aac' },
  { value: 'libmp3lame', codec: 'libmp3lame' },
  { value: 'libopus', codec: 'libopus' },
];

const EXTRACT_ALIASES: readonly ExtractAlias[] = [
  { value: 'mp3', codec: 'libmp3lame' },
  { value: 'wav', codec: 'pcm_s16le' },
  { value: 'libmp3lame', codec: 'libmp3lame' },
  { value: 'aac', codec: 'aac' },
  { value: 'libvorbis', codec: 'libvorbis' },
  { value: 'flac', codec: 'flac' },
  { value: 'pcm_s16le', codec: 'pcm_s16le' },
];

const EXTRACT_EXTENSIONS: Readonly<Record<ExtractCodec, string>> = {
  libmp3lame: '.mp3',
  aac: '.m4a',
  libvorbis: '.ogg',
  flac: '.flac',
  pcm_s16le: '.wav',
};

const PROBE_CASES: readonly ProbeCase[] = [
  {
    names: ['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2'],
    format: 'm4a',
  },
  { names: ['mp3'], format: 'mp3' },
  { names: ['wav'], format: 'wav' },
  { names: ['flac'], format: 'flac' },
  { names: ['ogg'], format: 'ogg' },
  { names: ['matroska', 'webm'], format: undefined },
  { names: ['aac'], format: undefined },
  { names: [], format: undefined },
];

const ACCEPTED_AUDIO = ['mp3', 'wav', 'm4a', 'flac', 'ogg'];

const REAL_PROBES: readonly RealProbe[] = [
  { key: 'wav', format: 'wav' },
  { key: 'mp3', format: 'mp3' },
  { key: 'flac', format: 'flac' },
  { key: 'aac', format: 'm4a' },
  { key: 'ogg', format: 'ogg' },
];

const CALLER_PATH = '/caller/song.mkv';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function properties(formatNames: readonly string[]): MediaProperties {
  return {
    hasVideo: false,
    hasAudio: true,
    formatNames,
  };
}

function callerInput(): ResolvedInput {
  return {
    rawPath: CALLER_PATH,
    realPath: '/real/song.mkv',
    role: 'input',
  };
}

function thrown(run: () => unknown): MediaError {
  try {
    run();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(MediaError);
    if (error instanceof MediaError) {
      return error;
    }
  }
  throw new Error('expected a media error');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('container tables', (): void => {
  it.each(VIDEO_ROWS)('video $format', (row): void => {
    expect(VIDEO_CONTAINERS[row.format]).toEqual(row);
  });

  it.each(AUDIO_ROWS)('audio $format', (row): void => {
    expect(AUDIO_CONTAINERS[row.format]).toEqual(row);
  });

  it('lists the five audio containers once', (): void => {
    expect([...AUDIO_FORMATS]).toEqual(ACCEPTED_AUDIO);
  });

  it('maps each extract encoder to its extension', (): void => {
    expect(EXTRACT_CODEC_EXTENSIONS).toEqual(EXTRACT_EXTENSIONS);
  });
});

describe('MP4 portability', (): void => {
  it.each([
    ['.mp4', true],
    ['.M4A', true],
    ['.m4v', true],
    ['.mov', false],
    ['.mkv', false],
    ['', false],
  ])('treats %j as MP4 family: %s', (extension: string, expected: boolean): void => {
    expect(isMp4FamilyExtension(extension)).toBe(expected);
  });

  it('names every PCM and FFV1 stream in the order given', (): void => {
    const codecs = ['h264', 'pcm_s16le', 'aac', 'ffv1', 'pcm_f32le'];
    expect(unportableMp4Codecs(codecs)).toEqual(['pcm_s16le', 'ffv1', 'pcm_f32le']);
  });

  it('keeps H.264, HEVC, AAC and MP3 without a refusal', (): void => {
    expect(unportableMp4Codecs(['h264', 'hevc', 'aac', 'mp3'])).toEqual([]);
    expect(unportableMp4Codecs([])).toEqual([]);
  });
});

describe('aliases', (): void => {
  it.each(AUDIO_ALIASES)(
    'normalizeAudioFormat($value)',
    ({ value, format }): void => {
      expect(normalizeAudioFormat(value)).toBe(format);
    },
  );

  it.each(VIDEO_ALIASES)(
    'normalizeVideoCodec($value)',
    ({ value, codec }): void => {
      expect(normalizeVideoCodec(value)).toBe(codec);
    },
  );

  it.each(VIDEO_AUDIO_ALIASES)(
    'normalizeVideoAudioCodec($value)',
    ({ value, codec }): void => {
      expect(normalizeVideoAudioCodec(value)).toBe(codec);
    },
  );

  it.each(EXTRACT_ALIASES)(
    'normalizeExtractCodec($value)',
    ({ value, codec }): void => {
      expect(normalizeExtractCodec(value)).toBe(codec);
    },
  );
});

describe('audioFormatFromProbe', (): void => {
  it.each(PROBE_CASES)('maps $names', ({ names, format }): void => {
    expect(audioFormatFromProbe({ formatNames: names })).toBe(format);
  });
});

describe('requireAudioContainer', (): void => {
  it('returns the row for a recognized container', (): void => {
    const row = requireAudioContainer(callerInput(), properties(['mp3']));

    expect(row).toBe(AUDIO_CONTAINERS.mp3);
  });

  it('rejects a matroska probe', (): void => {
    const input = callerInput();
    const error = thrown(() => {
      requireAudioContainer(input, properties(['matroska']));
    });

    expect(error.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
    expect(error.details).toEqual({
      path: CALLER_PATH,
      detected: ['matroska'],
      accepted: ACCEPTED_AUDIO,
      reason: 'container',
    });
  });
});

describe('probed audio containers', (): void => {
  const sandbox = createSandbox('media-containers-');
  const context = createToolContext(sandbox.config);
  const found = new Map<string, AudioFormat | undefined>();

  beforeAll(async (): Promise<void> => {
    const binary = await resolveTestBinary('ffmpeg');
    if (binary === undefined) {
      throw new Error('ffmpeg is not available');
    }
    const oggPath = path.join(sandbox.allowedRoot, 'tone.ogg');
    await runProcess(binary, [
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      '-c:a',
      'libvorbis',
      oggPath,
    ], {
      kind: 'ffmpeg',
      timeoutMs: 60000,
    });

    const files = new Map<string, string>();
    for (const format of ['wav', 'mp3', 'flac', 'aac'] as const) {
      const filePath = await generateAudio(sandbox.allowedRoot, {
        seconds: 1,
        format,
        fileName: `tone.${format === 'aac' ? 'm4a' : format}`,
      });
      files.set(format, filePath);
    }
    files.set('ogg', oggPath);

    for (const [key, filePath] of files) {
      const input = context.resolveInput(
        filePath,
        'input',
        'inputPath',
        'audio_convert',
      );
      const props = await probeMedia(context, input);
      found.set(key, audioFormatFromProbe(props));
    }
  });

  afterAll((): void => {
    sandbox.cleanup();
  });

  it.each(REAL_PROBES)('reads $key as $format', ({ key, format }): void => {
    expect(found.get(key)).toBe(format);
  });
});
