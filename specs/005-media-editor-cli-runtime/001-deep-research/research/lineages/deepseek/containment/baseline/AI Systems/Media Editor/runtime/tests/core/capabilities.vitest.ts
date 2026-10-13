// ───────────────────────────────────────────────────────────────────
// MODULE: Capability Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';

import ffmpegStatic from 'ffmpeg-static';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  GATED_ENCODERS,
  GATED_FILTERS,
  TOOL_NAMES,
  TOOL_REQUIREMENTS,
  assertCapabilities,
  detectCapabilities,
  dropCapabilities,
  parseEncoders,
  parseFilters,
  resetCapabilityCache,
  summarizeCapabilities,
} from '../../src/core/capabilities.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';

import type {
  Capabilities,
  CapabilityRunner,
  ToolName,
  ToolRequirement,
} from '../../src/core/capabilities.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const ENCODER_FIXTURE = [
  'Encoders:',
  ' V..... = Video',
  ' A..... = Audio',
  ' S..... = Subtitle',
  ' .F.... = Frame-level multithreading',
  ' ..S... = Slice-level multithreading',
  ' ...X.. = Codec is experimental',
  ' ....B. = Supports draw_horiz_band',
  ' .....D = Supports direct rendering method 1',
  ' ------',
  ' V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 (codec h264)',
  ' V....D libx264rgb           libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10 RGB (codec h264)',
  ' A....D aac                  AAC (Advanced Audio Coding) (libmp3lame)',
].join('\n');

const FILTER_FIXTURE = [
  'Filters:',
  '  T.. = Timeline support',
  '  .S. = Slice threading',
  '  ..C = Command support',
  '  A = Audio input/output',
  '  V = Video input/output',
  '  N = Dynamic number and/or type of input/output',
  '  | = Source or sink filter',
  ' T.C drawtext          V->V       Draw text on top of video frames. See overlay.',
  ' .S. xfade             VV->V      Cross fade one video with another video.',
  ' ... anull             sink filter without an arrow',
].join('\n');

// ffmpeg 9 keeps the three-column legend but prints two flags per row.
const FFMPEG_9_FILTER_FIXTURE = [
  'Filters:',
  '  T.. = Timeline support',
  '  .S. = Slice threading',
  '  A = Audio input/output',
  '  | = Source or sink filter',
  '  ------',
  ' .. crop              V->V       Crop the input video.',
  ' T. drawtext          V->V       Draw text on top of video frames using libfreetype library.',
  ' .S xfade             VV->V      Cross fade one video with another video.',
  ' .. anull             sink filter without an arrow',
].join('\n');

const EMPTY_REQUIREMENT: ToolRequirement = {
  encoders: [],
  attemptTwoEncoders: [],
  filters: [],
};

const EXPECTED_REQUIREMENTS: Readonly<Record<ToolName, ToolRequirement>> = {
  image_resize: EMPTY_REQUIREMENT,
  image_convert: EMPTY_REQUIREMENT,
  image_crop: EMPTY_REQUIREMENT,
  image_compress: EMPTY_REQUIREMENT,
  image_rotate: EMPTY_REQUIREMENT,
  image_flip: EMPTY_REQUIREMENT,
  image_probe: EMPTY_REQUIREMENT,
  image_batch_resize: EMPTY_REQUIREMENT,
  media_health: EMPTY_REQUIREMENT,
  audio_extract: EMPTY_REQUIREMENT,
  video_trim: {
    encoders: [],
    attemptTwoEncoders: ['libx264', 'aac'],
    filters: [],
  },
  audio_convert_properties: EMPTY_REQUIREMENT,
  video_convert_properties: EMPTY_REQUIREMENT,
  video_set_aspect_ratio: {
    encoders: ['libx264'],
    attemptTwoEncoders: ['aac'],
    filters: [],
  },
  audio_convert: EMPTY_REQUIREMENT,
  audio_set_bitrate: EMPTY_REQUIREMENT,
  audio_set_sample_rate: EMPTY_REQUIREMENT,
  audio_set_channels: EMPTY_REQUIREMENT,
  video_convert: EMPTY_REQUIREMENT,
  video_set_resolution: {
    encoders: ['libx264'],
    attemptTwoEncoders: ['aac'],
    filters: ['scale'],
  },
  video_set_codec: {
    encoders: [],
    attemptTwoEncoders: ['aac'],
    filters: [],
  },
  video_set_bitrate: {
    encoders: ['libx264'],
    attemptTwoEncoders: ['aac'],
    filters: [],
  },
  video_set_frame_rate: {
    encoders: ['libx264'],
    attemptTwoEncoders: ['aac'],
    filters: [],
  },
  video_set_audio_codec: {
    encoders: [],
    attemptTwoEncoders: ['libx264'],
    filters: [],
  },
  video_set_audio_bitrate: {
    encoders: ['aac'],
    attemptTwoEncoders: ['libx264'],
    filters: [],
  },
  video_set_audio_sample_rate: {
    encoders: ['aac'],
    attemptTwoEncoders: ['libx264'],
    filters: [],
  },
  video_set_audio_channels: {
    encoders: ['aac'],
    attemptTwoEncoders: ['libx264'],
    filters: [],
  },
  video_add_subtitles: {
    encoders: ['libx264'],
    attemptTwoEncoders: ['aac'],
    filters: ['subtitles'],
  },
  video_add_text_overlay: {
    encoders: ['libx264'],
    attemptTwoEncoders: ['aac'],
    filters: ['drawtext'],
  },
  video_add_image_overlay: {
    encoders: ['libx264'],
    attemptTwoEncoders: [],
    filters: ['overlay'],
  },
  video_concat: {
    encoders: ['libx264', 'aac'],
    attemptTwoEncoders: [],
    filters: ['scale'],
  },
  video_set_speed: {
    encoders: ['libx264', 'aac'],
    attemptTwoEncoders: [],
    filters: ['setpts'],
  },
  media_remove_silence: {
    encoders: ['aac'],
    attemptTwoEncoders: [],
    filters: ['silencedetect', 'select', 'setpts', 'aselect', 'asetpts'],
  },
  video_add_b_roll: {
    encoders: ['libx264', 'aac'],
    attemptTwoEncoders: [],
    filters: ['overlay', 'scale', 'setpts'],
  },
  video_add_fade: {
    encoders: ['libx264'],
    attemptTwoEncoders: ['aac'],
    filters: ['fade'],
  },
  media_probe: EMPTY_REQUIREMENT,
  media_rename: EMPTY_REQUIREMENT,
  media_repair: EMPTY_REQUIREMENT,
  video_hls_ladder: {
    encoders: ['libx264'],
    attemptTwoEncoders: [],
    filters: ['split', 'scale', 'pad'],
  },
  media_setup_ffmpeg: EMPTY_REQUIREMENT,
};

const BUNDLED_FFMPEG = bundledFfmpegPath();
const CAN_RUN_BUNDLED_FFMPEG = probeBundledFfmpeg(BUNDLED_FFMPEG);

let bundledEncoderText = '';
let bundledFilterText = '';

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function bundledFfmpegPath(): string | undefined {
  // NodeNext types this default export as the module, while the value is the path.
  const candidate: unknown = ffmpegStatic;
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return undefined;
  }
  return candidate;
}

function probeBundledFfmpeg(binaryPath: string | undefined): boolean {
  if (binaryPath === undefined) {
    return false;
  }
  try {
    execFileSync(binaryPath, ['-hide_banner', '-version'], {
      stdio: 'ignore',
      timeout: 20000,
    });
    return true;
  } catch {
    return false;
  }
}

function commandText(binaryPath: string, flag: '-encoders' | '-filters'): string {
  return execFileSync(binaryPath, ['-hide_banner', flag], {
    encoding: 'utf8',
    timeout: 20000,
  });
}

function listingRunner(calls: string[]): CapabilityRunner {
  return (binaryPath, args): Promise<string> => {
    const flag = args[0] ?? '';
    calls.push(`${binaryPath} ${flag}`);
    const text = flag === '-filters' ? FILTER_FIXTURE : ENCODER_FIXTURE;
    return Promise.resolve(text);
  };
}

function mediaError(run: () => void): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

function emptyCapabilities(): Capabilities {
  return {
    encoders: new Set<string>(),
    filters: new Set<string>(),
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('parse lists', (): void => {
  it('reads encoder names and skips legend rows and descriptions', (): void => {
    const encoders = parseEncoders(ENCODER_FIXTURE);

    expect(encoders.has('libx264')).toBe(true);
    expect(encoders.has('libx264rgb')).toBe(true);
    expect(encoders.has('aac')).toBe(true);
    expect(encoders.has('x264')).toBe(false);
    expect(encoders.has('libmp3lame')).toBe(false);
    expect(encoders.has('h264')).toBe(false);
    expect(encoders.has('=')).toBe(false);
    expect(encoders.has('Video')).toBe(false);
    expect(encoders.size).toBe(3);
  });

  it('reads filter names and skips rows without a flow column', (): void => {
    const filters = parseFilters(FILTER_FIXTURE);

    expect(filters.has('drawtext')).toBe(true);
    expect(filters.has('xfade')).toBe(true);
    expect(filters.has('overlay')).toBe(false);
    expect(filters.has('anull')).toBe(false);
    expect(filters.has('=')).toBe(false);
    expect(filters.has('Timeline')).toBe(false);
    expect(filters.size).toBe(2);
  });

  it('reads the two-flag filter rows of ffmpeg 9', (): void => {
    const filters = parseFilters(FFMPEG_9_FILTER_FIXTURE);

    expect([...filters].sort()).toEqual(['crop', 'drawtext', 'xfade']);
  });

  it('keeps encoder and filter names case-sensitive', (): void => {
    const encoders = parseEncoders(ENCODER_FIXTURE);
    const filters = parseFilters(FILTER_FIXTURE);

    expect(encoders.has('Libx264')).toBe(false);
    expect(encoders.has('AAC')).toBe(false);
    expect(filters.has('Drawtext')).toBe(false);
  });
});

describe('bundled ffmpeg', (): void => {
  beforeAll((): void => {
    if (!CAN_RUN_BUNDLED_FFMPEG || BUNDLED_FFMPEG === undefined) {
      return;
    }
    bundledEncoderText = commandText(BUNDLED_FFMPEG, '-encoders');
    bundledFilterText = commandText(BUNDLED_FFMPEG, '-filters');
  });

  it.skipIf(!CAN_RUN_BUNDLED_FFMPEG)(
    'reads names from the bundled encoder and filter lists',
    (): void => {
      const encoders = parseEncoders(bundledEncoderText);
      const filters = parseFilters(bundledFilterText);

      expect(encoders.has('libx264')).toBe(true);
      expect(encoders.has('aac')).toBe(true);
      expect(filters.has('drawtext')).toBe(true);
      expect(filters.has('overlay')).toBe(true);
      expect(filters.has('scale')).toBe(true);
    },
  );
});

describe('detectCapabilities', (): void => {
  beforeEach((): void => {
    resetCapabilityCache();
  });

  it('reads each list once per path and shares an in-flight read', async (): Promise<void> => {
    const calls: string[] = [];
    const runner = listingRunner(calls);
    const firstPath = '/opt/media/ffmpeg';
    const secondPath = '/opt/other/ffmpeg';

    const [first, second] = await Promise.all([
      detectCapabilities(firstPath, runner),
      detectCapabilities(firstPath, runner),
    ]);

    expect(second).toBe(first);
    expect(first.encoders.has('libx264')).toBe(true);
    expect(first.encoders.has('x264')).toBe(false);
    expect(first.filters.has('drawtext')).toBe(true);
    expect(calls).toEqual([
      `${firstPath} -encoders`,
      `${firstPath} -filters`,
    ]);

    const third = await detectCapabilities(secondPath, runner);
    expect(third).not.toBe(first);
    expect(calls).toEqual([
      `${firstPath} -encoders`,
      `${firstPath} -filters`,
      `${secondPath} -encoders`,
      `${secondPath} -filters`,
    ]);
  });

  it('retries a read that failed', async (): Promise<void> => {
    const binaryPath = '/opt/media/ffmpeg';
    let shouldFail = true;
    let calls = 0;
    const runner: CapabilityRunner = (_binaryPath, args): Promise<string> => {
      calls += 1;
      if (shouldFail) {
        return Promise.reject(new Error('unreadable'));
      }
      const text = args[0] === '-filters' ? FILTER_FIXTURE : ENCODER_FIXTURE;
      return Promise.resolve(text);
    };

    await expect(detectCapabilities(binaryPath, runner)).rejects.toBeInstanceOf(Error);
    expect(calls).toBe(2);

    shouldFail = false;
    const caps = await detectCapabilities(binaryPath, runner);
    expect(caps.encoders.has('libx264')).toBe(true);
    expect(caps.filters.has('xfade')).toBe(true);
    expect(calls).toBe(4);
  });

  it('reads again after a path is dropped or the cache is reset', async (): Promise<void> => {
    const calls: string[] = [];
    const runner = listingRunner(calls);
    const binaryPath = '/opt/media/ffmpeg';

    await detectCapabilities(binaryPath, runner);
    await detectCapabilities(binaryPath, runner);
    expect(calls).toHaveLength(2);

    dropCapabilities(binaryPath);
    await detectCapabilities(binaryPath, runner);
    expect(calls).toHaveLength(4);

    resetCapabilityCache();
    await detectCapabilities(binaryPath, runner);
    expect(calls).toHaveLength(6);
  });
});

describe('summarizeCapabilities', (): void => {
  it('lists encoders then filters in closed-list order', (): void => {
    const summary = summarizeCapabilities({
      encoders: new Set<string>(['libx264', 'aac']),
      filters: new Set<string>(['scale', 'drawtext']),
    });

    expect(GATED_ENCODERS).toHaveLength(10);
    expect(GATED_FILTERS).toHaveLength(18);
    expect(summary).toHaveLength(28);
    expect(summary.map((entry) => entry.kind)).toEqual([
      ...GATED_ENCODERS.map(() => 'encoder' as const),
      ...GATED_FILTERS.map(() => 'filter' as const),
    ]);
    expect(summary.map((entry) => entry.name)).toEqual([
      ...GATED_ENCODERS,
      ...GATED_FILTERS,
    ]);
    expect(summary[0]).toEqual({
      kind: 'encoder',
      name: 'libx264',
      present: true,
    });
    expect(summary[1]).toEqual({
      kind: 'encoder',
      name: 'libx265',
      present: false,
    });
    expect(summary.find((entry) => entry.name === 'drawtext')).toEqual({
      kind: 'filter',
      name: 'drawtext',
      present: true,
    });
    expect(summary.find((entry) => entry.name === 'overlay')).toEqual({
      kind: 'filter',
      name: 'overlay',
      present: false,
    });
  });
});

describe('tool requirements', (): void => {
  it('has 40 unique tool names and the same requirement keys', (): void => {
    expect(TOOL_NAMES).toEqual([
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
    ]);
    expect(new Set(TOOL_NAMES).size).toBe(40);
    expect(Object.keys(TOOL_REQUIREMENTS)).toEqual([...TOOL_NAMES]);
  });

  it('keeps every required name inside the closed lists', (): void => {
    const encoders = new Set<string>(GATED_ENCODERS);
    const filters = new Set<string>(GATED_FILTERS);

    for (const tool of TOOL_NAMES) {
      const requirement = TOOL_REQUIREMENTS[tool];
      expect(requirement).toEqual(EXPECTED_REQUIREMENTS[tool]);
      for (const name of requirement.encoders) {
        expect(encoders.has(name)).toBe(true);
      }
      for (const name of requirement.attemptTwoEncoders) {
        expect(encoders.has(name)).toBe(true);
      }
      for (const name of requirement.filters) {
        expect(filters.has(name)).toBe(true);
      }
    }
  });

  it('gives every image tool an empty requirement', (): void => {
    const imageTools = TOOL_NAMES.filter((name) => name.startsWith('image_'));
    expect(imageTools).toHaveLength(8);
    for (const tool of imageTools) {
      expect(TOOL_REQUIREMENTS[tool]).toEqual(EMPTY_REQUIREMENT);
    }
  });
});

describe('assertCapabilities', (): void => {
  it('names the first missing encoder and ignores later gaps', (): void => {
    const error = mediaError((): void => {
      assertCapabilities({
        tool: 'video_add_text_overlay',
        binaryPath: '/opt/media/ffmpeg',
        capabilities: {
          encoders: new Set<string>(['aac']),
          filters: new Set<string>(),
        },
        encoders: ['libx264', 'aac'],
        filters: ['drawtext', 'overlay'],
      });
    });

    expect(error.code).toBe(ERROR_CODES.CAPABILITY_MISSING);
    expect(error.details).toEqual({
      binary: '/opt/media/ffmpeg',
      kind: 'encoder',
      name: 'libx264',
      neededBy: 'video_add_text_overlay',
    });
    expect(Object.keys(error.details)).toEqual([
      'binary',
      'kind',
      'name',
      'neededBy',
    ]);
  });

  it('names the first missing filter after the encoders are present', (): void => {
    const error = mediaError((): void => {
      assertCapabilities({
        tool: 'video_add_text_overlay',
        binaryPath: '/opt/media/ffmpeg',
        capabilities: {
          encoders: new Set<string>(['libx264', 'aac']),
          filters: new Set<string>(['scale']),
        },
        encoders: ['libx264', 'aac'],
        filters: ['drawtext', 'scale'],
      });
    });

    expect(error.code).toBe(ERROR_CODES.CAPABILITY_MISSING);
    expect(error.details).toEqual({
      binary: '/opt/media/ffmpeg',
      kind: 'filter',
      name: 'drawtext',
      neededBy: 'video_add_text_overlay',
    });
  });

  it('returns when every requested name is present', (): void => {
    expect((): void => {
      assertCapabilities({
        tool: 'video_set_resolution',
        binaryPath: '/opt/media/ffmpeg',
        capabilities: {
          encoders: new Set<string>(['libx264', 'aac']),
          filters: new Set<string>(['scale']),
        },
        encoders: ['libx264', 'aac'],
        filters: ['scale'],
      });
    }).not.toThrow();
  });

  it('does nothing when both lists are omitted or empty', (): void => {
    const options = {
      tool: 'image_resize',
      binaryPath: '/opt/media/ffmpeg',
      capabilities: emptyCapabilities(),
    };
    expect((): void => {
      assertCapabilities(options);
    }).not.toThrow();
    expect((): void => {
      assertCapabilities({ ...options, encoders: [], filters: [] });
    }).not.toThrow();
  });
});
