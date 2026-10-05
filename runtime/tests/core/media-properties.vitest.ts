// ───────────────────────────────────────────────────────────────────
// MODULE: Media Properties Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import {
  detectedKinds,
  parseMediaProperties,
  probeIntermediate,
  probeIntermediateCodecs,
  probeMedia,
  readProbeJson,
  requireAudioStream,
  requireVideoStream,
} from '../../src/core/media-properties.js';
import { createToolContext } from '../../src/server/tool-context.js';
import { generateAudio, generateVideo } from '../helpers/media.js';
import { createSandbox } from '../helpers/tool-client.js';

import type { MediaProperties } from '../../src/core/media-properties.js';
import type { ResolvedInput } from '../../src/core/path-guard.js';
import type { ToolContext } from '../../src/server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface Clip {
  readonly input: ResolvedInput;
}

type AudioFormat = 'wav' | 'mp3' | 'flac' | 'aac';

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const FORMAT_NAME = 'mov,mp4,m4a,3gp,3g2,mj2';

const FORMAT_NAMES = ['mov', 'mp4', 'm4a', '3gp', '3g2', 'mj2'];

const CLIP_SECONDS = 1;

const FRAME_WIDTH = 320;

const FRAME_HEIGHT = 240;

const AUDIO_FORMATS: readonly AudioFormat[] = ['wav', 'mp3', 'flac', 'aac'];

const CALLER_PATH = '/caller/clip.mp4';

const AUDIO_CALLER_PATH = '/caller/song.wav';

const SILENT_CALLER_PATH = '/caller/silent.mp4';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function callerInput(rawPath: string): ResolvedInput {
  return {
    rawPath,
    realPath: '/real/clip.mp4',
    role: 'input',
  };
}

function expectDuration(value: number | undefined, seconds: number): void {
  expect(typeof value).toBe('number');
  if (typeof value !== 'number') {
    return;
  }
  expect(Math.abs(value - seconds)).toBeLessThanOrEqual(0.5);
}

async function thrownError(run: () => Promise<unknown>): Promise<MediaError> {
  try {
    await run();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(MediaError);
    if (error instanceof MediaError) {
      return error;
    }
  }
  throw new Error('expected a media error');
}

function thrownSync(run: () => unknown): MediaError {
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

function videoAndAudioProbe(): Record<string, unknown> {
  return {
    format: {
      format_name: FORMAT_NAME,
      duration: '5.5',
    },
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264',
        width: 1920,
        height: 1080,
        avg_frame_rate: '30/1',
        duration: '1.0',
      },
      {
        codec_type: 'audio',
        codec_name: 'aac',
        sample_rate: 44100,
        channels: 2,
        bit_rate: 128000,
        duration: '9.0',
      },
    ],
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('parseMediaProperties', (): void => {
  it('reads a video stream and an audio stream', (): void => {
    const props = parseMediaProperties(videoAndAudioProbe());

    expect(props.hasVideo).toBe(true);
    expect(props.hasAudio).toBe(true);
    expect(props.formatName).toBe(FORMAT_NAME);
    expect(props.formatNames).toEqual(FORMAT_NAMES);
    expect(props.durationSeconds).toBe(5.5);
    expect(props.video).toEqual({
      codecName: 'h264',
      width: 1920,
      height: 1080,
      frameRate: 30,
    });
    expect(props.audio).toEqual({
      codecName: 'aac',
      sampleRate: 44100,
      channels: 2,
      bitRate: 128000,
    });
    expect(detectedKinds(props)).toEqual(['video', 'audio']);
  });

  it('reads an audio-only file', (): void => {
    const props = parseMediaProperties({
      format: { format_name: 'mp3', duration: '2.25' },
      streams: [
        {
          codec_type: 'audio',
          codec_name: 'mp3',
          sample_rate: 48000,
          channels: 1,
        },
      ],
    });

    expect(props.hasVideo).toBe(false);
    expect(props.hasAudio).toBe(true);
    expect(props.video).toBeUndefined();
    expect(props.durationSeconds).toBe(2.25);
    expect(props.audio).toEqual({
      codecName: 'mp3',
      sampleRate: 48000,
      channels: 1,
    });
    expect(props.audio?.bitRate).toBeUndefined();
    expect(detectedKinds(props)).toEqual(['audio']);
  });

  it('reads a video-only file', (): void => {
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 640,
          height: 360,
          avg_frame_rate: '24/1',
          duration: '4',
        },
      ],
    });

    expect(props.hasVideo).toBe(true);
    expect(props.hasAudio).toBe(false);
    expect(props.audio).toBeUndefined();
    expect(props.durationSeconds).toBe(4);
    expect(props.video?.frameRate).toBe(24);
    expect(detectedKinds(props)).toEqual(['video']);
  });

  it('ignores a video stream that is only cover art', (): void => {
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'mjpeg',
          width: 300,
          height: 300,
          avg_frame_rate: '90000/1',
          disposition: { attached_pic: 1 },
          duration: '8',
        },
        {
          codec_type: 'audio',
          codec_name: 'mp3',
          sample_rate: 44100,
          channels: 2,
          duration: '3.5',
        },
      ],
    });

    expect(props.hasVideo).toBe(false);
    expect(props.video).toBeUndefined();
    expect(props.hasAudio).toBe(true);
    expect(props.durationSeconds).toBe(3.5);
    expect(props.audio?.codecName).toBe('mp3');
  });

  it('uses the first video that is not cover art', (): void => {
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'mjpeg',
          width: 100,
          height: 100,
          disposition: { attached_pic: 1 },
        },
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 640,
          height: 360,
          avg_frame_rate: '30/1',
        },
      ],
    });

    expect(props.hasVideo).toBe(true);
    expect(props.video).toEqual({
      codecName: 'h264',
      width: 640,
      height: 360,
      frameRate: 30,
    });
  });

  it('uses the first audio stream', (): void => {
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'audio',
          codec_name: 'aac',
          sample_rate: 48000,
          channels: 1,
        },
        {
          codec_type: 'audio',
          codec_name: 'mp3',
          sample_rate: 44100,
          channels: 2,
        },
      ],
    });

    expect(props.audio).toEqual({
      codecName: 'aac',
      sampleRate: 48000,
      channels: 1,
    });
  });

  it('reads numbers that arrived as strings', (): void => {
    const props = parseMediaProperties({
      format: { duration: '2.5', format_name: 'wav' },
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: '640',
          height: '360',
          avg_frame_rate: '24/1',
        },
        {
          codec_type: 'audio',
          codec_name: 'pcm_s16le',
          sample_rate: '48000',
          channels: '1',
          bit_rate: '96000',
        },
      ],
    });

    expect(props.durationSeconds).toBe(2.5);
    expect(props.formatNames).toEqual(['wav']);
    expect(props.video).toEqual({
      codecName: 'h264',
      width: 640,
      height: 360,
      frameRate: 24,
    });
    expect(props.audio).toEqual({
      codecName: 'pcm_s16le',
      sampleRate: 48000,
      channels: 1,
      bitRate: 96000,
    });
  });

  it('uses r_frame_rate when the average rate is zero', (): void => {
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 320,
          height: 240,
          avg_frame_rate: '0/0',
          r_frame_rate: '25/1',
        },
      ],
    });

    expect(props.video?.frameRate).toBe(25);
  });

  it('uses 30 when both frame rates are zero', (): void => {
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 320,
          height: 240,
          avg_frame_rate: '0/0',
          r_frame_rate: '0/0',
        },
      ],
    });

    expect(props.video?.frameRate).toBe(30);
  });

  it('reads duration from a stream when the format has none', (): void => {
    const props = parseMediaProperties({
      format: { format_name: 'matroska,webm' },
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 320,
          height: 240,
          avg_frame_rate: '30/1',
          duration: '4.25',
        },
        {
          codec_type: 'audio',
          codec_name: 'aac',
          sample_rate: 44100,
          channels: 2,
          duration: '9',
        },
      ],
    });

    expect(props.durationSeconds).toBe(4.25);
    expect(props.formatNames).toEqual(['matroska', 'webm']);
  });

  it('returns no streams for an empty object, null, or a string', (): void => {
    const empty = {
      hasVideo: false,
      hasAudio: false,
      formatNames: [],
    };

    expect(parseMediaProperties({})).toEqual(empty);
    expect(parseMediaProperties(null)).toEqual(empty);
    expect(parseMediaProperties('not-json')).toEqual(empty);
  });
});

describe('probeMedia', (): void => {
  const sandbox = createSandbox('media-properties-');
  const context = createToolContext(sandbox.config);
  const clips = new Map<string, Clip>();

  function requiredClip(name: string): Clip {
    const clip = clips.get(name);
    if (clip === undefined) {
      throw new Error(`missing clip ${name}`);
    }
    return clip;
  }

  function remember(name: string, filePath: string): void {
    clips.set(name, {
      input: context.resolveInput(
        filePath,
        'input',
        'inputPath',
        'video_trim',
      ),
    });
  }

  beforeAll(async (): Promise<void> => {
    const withAudio = await generateVideo(sandbox.allowedRoot, {
      seconds: CLIP_SECONDS,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      withAudio: true,
      fileName: 'with-audio.mp4',
    });
    const silent = await generateVideo(sandbox.allowedRoot, {
      seconds: CLIP_SECONDS,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
      fileName: 'silent.mp4',
    });
    remember('videoWithAudio', withAudio);
    remember('videoOnly', silent);
    for (const format of AUDIO_FORMATS) {
      const filePath = await generateAudio(sandbox.allowedRoot, {
        seconds: CLIP_SECONDS,
        format,
        fileName: `tone.${format === 'aac' ? 'm4a' : format}`,
      });
      remember(format, filePath);
    }
  });

  afterAll((): void => {
    sandbox.cleanup();
  });

  it('probes a video that includes audio', async (): Promise<void> => {
    const props = await probeMedia(
      context,
      requiredClip('videoWithAudio').input,
    );

    expect(props.hasVideo).toBe(true);
    expect(props.hasAudio).toBe(true);
    expect(props.video?.width).toBe(FRAME_WIDTH);
    expect(props.video?.height).toBe(FRAME_HEIGHT);
    expect(props.audio?.channels).toBe(1);
    expect(props.audio?.sampleRate).toBe(44100);
    expectDuration(props.durationSeconds, CLIP_SECONDS);
  });

  it('probes a video that has no audio', async (): Promise<void> => {
    const props = await probeMedia(context, requiredClip('videoOnly').input);

    expect(props.hasVideo).toBe(true);
    expect(props.hasAudio).toBe(false);
    expect(props.video?.width).toBe(FRAME_WIDTH);
    expect(props.video?.height).toBe(FRAME_HEIGHT);
    expect(props.audio).toBeUndefined();
    expectDuration(props.durationSeconds, CLIP_SECONDS);
  });

  it.each(AUDIO_FORMATS)(
    'probes %s audio',
    async (format): Promise<void> => {
      const props = await probeMedia(context, requiredClip(format).input);

      expect(props.hasVideo).toBe(false);
      expect(props.hasAudio).toBe(true);
      expect(props.audio?.channels).toBe(1);
      expect(props.audio?.sampleRate).toBe(44100);
      expectDuration(props.durationSeconds, CLIP_SECONDS);
    },
  );

  it('rejects a text file renamed as mp4', async (): Promise<void> => {
    const filePath = path.join(sandbox.allowedRoot, 'notes.mp4');
    writeFileSync(filePath, 'plain text\n');
    const input = context.resolveInput(
      filePath,
      'input',
      'inputPath',
      'video_trim',
    );
    const error = await thrownError(() => probeMedia(context, input));

    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
  });

  it('rejects probe text that is not JSON', async (): Promise<void> => {
    const input = callerInput(CALLER_PATH);
    let seenName = '';
    let seenArgs: readonly string[] = [];
    let captureStdout = false;
    let seenInputs: readonly ResolvedInput[] = [];
    const stub: Pick<ToolContext, 'runBinary'> = {
      async runBinary(name, args, options) {
        seenName = name;
        seenArgs = args;
        captureStdout = options.captureStdout === true;
        seenInputs = options.inputs;
        return {
          exitCode: 0,
          signal: null,
          stdout: 'not-json',
          stderr: '',
          stderrTail: 'from-the-runner',
          elapsedMs: 4,
        };
      },
    };

    const error = await thrownError(() => probeMedia(stub, input));

    expect(seenName).toBe('ffprobe');
    expect([...seenArgs]).toEqual([
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      '-i',
      input.realPath,
    ]);
    expect(captureStdout).toBe(true);
    expect(seenInputs).toEqual([input]);
    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
    expect(error.details).toEqual({
      binary: 'ffprobe',
      exitCode: 0,
      signal: null,
      stderrTail: '',
    });
  });

  it('leaves a runner failure untouched', async (): Promise<void> => {
    const input = callerInput(CALLER_PATH);
    const failure = new MediaError(
      ERROR_CODES.PROCESS_FAILED,
      'The process failed.',
      {
        binary: 'ffprobe',
        exitCode: 1,
        signal: null,
        stderrTail: 'bad',
      },
    );
    const stub: Pick<ToolContext, 'runBinary'> = {
      runBinary(): Promise<never> {
        return Promise.reject(failure);
      },
    };

    await expect(probeMedia(stub, input)).rejects.toBe(failure);
  });
});

describe('readProbeJson', (): void => {
  it('returns the parsed probe JSON and names the input for the guard', async (): Promise<void> => {
    const input = callerInput(CALLER_PATH);
    let seenInputs: readonly ResolvedInput[] = [];
    const probe = { format: { format_name: 'mov,mp4', size: '1200' }, streams: [] };
    const stub: Pick<ToolContext, 'runBinary'> = {
      async runBinary(_name, _args, options) {
        seenInputs = options.inputs;
        return {
          exitCode: 0,
          signal: null,
          stdout: JSON.stringify(probe),
          stderr: '',
          stderrTail: '',
          elapsedMs: 1,
        };
      },
    };

    expect(await readProbeJson(stub, input)).toEqual(probe);
    expect(seenInputs).toEqual([input]);
  });

  it('rejects probe text that is not JSON', async (): Promise<void> => {
    const stub: Pick<ToolContext, 'runBinary'> = {
      async runBinary() {
        return {
          exitCode: 0,
          signal: null,
          stdout: '{',
          stderr: '',
          stderrTail: '',
          elapsedMs: 1,
        };
      },
    };
    const error = await thrownError(() => readProbeJson(stub, callerInput(CALLER_PATH)));

    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
  });
});

describe('probeIntermediate', (): void => {
  const TEMP_FILE = '/tmp/run/norm_0.mp4';

  function stubReturning(
    stdout: string,
    seen: { args: readonly string[]; inputs: readonly ResolvedInput[] },
  ): Pick<ToolContext, 'runBinary'> {
    return {
      async runBinary(_name, args, options) {
        seen.args = args;
        seen.inputs = options.inputs;
        return {
          exitCode: 0,
          signal: null,
          stdout,
          stderr: '',
          stderrTail: '',
          elapsedMs: 1,
        };
      },
    };
  }

  it('probes a server file with no caller input to re-check', async (): Promise<void> => {
    const seen = { args: [] as readonly string[], inputs: [] as readonly ResolvedInput[] };
    const probe = {
      format: { duration: '2.5' },
      streams: [{ codec_type: 'video', codec_name: 'h264', width: 64, height: 48 }],
    };
    const props = await probeIntermediate(stubReturning(JSON.stringify(probe), seen), TEMP_FILE);

    expect(seen.args.at(-1)).toBe(TEMP_FILE);
    expect(seen.inputs).toEqual([]);
    expect(props.hasVideo).toBe(true);
    expect(props.durationSeconds).toBe(2.5);
  });

  it('rejects probe text that is not JSON', async (): Promise<void> => {
    const seen = { args: [] as readonly string[], inputs: [] as readonly ResolvedInput[] };
    const error = await thrownError(
      () => probeIntermediate(stubReturning('not-json', seen), TEMP_FILE),
    );

    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
  });
});

describe('probeIntermediateCodecs', (): void => {
  const TEMP_FILE = '/tmp/run/attempt-1-converted.mp4';

  function stubPrinting(
    stdout: string,
    seen: { args: readonly string[] },
  ): Pick<ToolContext, 'runBinary'> {
    return {
      async runBinary(_name, args, options) {
        seen.args = args;
        expect(options.inputs).toEqual([]);
        return {
          exitCode: 0,
          signal: null,
          stdout,
          stderr: '',
          stderrTail: '',
          elapsedMs: 1,
        };
      },
    };
  }

  it('lists the codec of every stream, a second audio track included', async (): Promise<void> => {
    const seen = { args: [] as readonly string[] };
    const probe = {
      streams: [
        { codec_type: 'video', codec_name: 'h264' },
        { codec_type: 'audio', codec_name: 'aac' },
        { codec_type: 'audio', codec_name: 'pcm_s16le' },
        { codec_type: 'data' },
      ],
    };
    const codecs = await probeIntermediateCodecs(
      stubPrinting(JSON.stringify(probe), seen),
      TEMP_FILE,
    );

    expect(codecs).toEqual(['h264', 'aac', 'pcm_s16le']);
    expect(seen.args.at(-1)).toBe(TEMP_FILE);
  });

  it('returns no codecs for a probe without a stream list', async (): Promise<void> => {
    const seen = { args: [] as readonly string[] };
    const codecs = await probeIntermediateCodecs(stubPrinting('{"format":{}}', seen), TEMP_FILE);
    expect(codecs).toEqual([]);
  });

  it('fails rather than report no codecs on a probe without JSON', async (): Promise<void> => {
    const seen = { args: [] as readonly string[] };
    const error = await thrownError(
      () => probeIntermediateCodecs(stubPrinting('not-json', seen), TEMP_FILE),
    );

    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
  });
});

describe('require streams', (): void => {
  it('refuses video on an audio-only probe', (): void => {
    const input = callerInput(AUDIO_CALLER_PATH);
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'audio',
          codec_name: 'aac',
          sample_rate: 44100,
          channels: 2,
        },
      ],
    });

    const error = thrownSync(() => requireVideoStream(input, props));

    expect(error.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
    expect(error.details).toEqual({
      path: AUDIO_CALLER_PATH,
      detected: ['audio'],
      accepted: ['video'],
    });
  });

  it('refuses audio on a video that has none', (): void => {
    const input = callerInput(SILENT_CALLER_PATH);
    const props = parseMediaProperties({
      streams: [
        {
          codec_type: 'video',
          codec_name: 'h264',
          width: 320,
          height: 240,
          avg_frame_rate: '30/1',
        },
      ],
    });

    const error = thrownSync(() => requireAudioStream(input, props));

    expect(error.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
    expect(error.details).toEqual({
      path: SILENT_CALLER_PATH,
      detected: ['video'],
      accepted: ['audio'],
    });
  });

  it('returns the stream that is present', (): void => {
    const input = callerInput(CALLER_PATH);
    const props: MediaProperties = parseMediaProperties(videoAndAudioProbe());

    expect(requireVideoStream(input, props)).toBe(props.video);
    expect(requireAudioStream(input, props)).toBe(props.audio);
  });
});
