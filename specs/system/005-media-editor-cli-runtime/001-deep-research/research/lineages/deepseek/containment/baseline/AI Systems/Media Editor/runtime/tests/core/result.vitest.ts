// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Result Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { expect, it } from 'vitest';

import {
  ERROR_CODES,
  MediaError,
  isMediaError,
  toMediaError,
} from '../../src/core/errors.js';
import {
  describeOutput,
  errorResult,
  readbackFromProbeJson,
  successResult,
} from '../../src/core/result.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-result-'));

const TRIM_PATH = '/media/exports/021 - trimmed-intro/intro-trimmed.mp4';

const TRIM_TEXT = 'Trimmed intro.mp4 from 2 to 7 seconds. Output saved to '
  + `${TRIM_PATH}.`;

const PATH_MESSAGE = 'Path is outside the allowed roots: /tmp/clip.mp4';

const PATH_DETAILS = {
  path: '/tmp/clip.mp4',
  realPath: '/tmp/clip.mp4',
  allowedRoots: ['/media'],
  reason: 'outside-root',
};

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('matches the trim success example', (): void => {
  const result = successResult({
    tool: 'video_trim',
    text: TRIM_TEXT,
    outputs: [
      {
        path: TRIM_PATH,
        bytes: 1876543,
        mediaType: 'video',
        durationSeconds: 5,
        width: 1920,
        height: 1080,
        codec: 'h264',
      },
    ],
    elapsedMs: 1240,
  });

  expect(result).toEqual({
    content: [
      {
        type: 'text',
        text: TRIM_TEXT,
      },
    ],
    structuredContent: {
      tool: 'video_trim',
      outputs: [
        {
          path: TRIM_PATH,
          bytes: 1876543,
          mediaType: 'video',
          durationSeconds: 5,
          width: 1920,
          height: 1080,
          codec: 'h264',
        },
      ],
      warnings: [],
      elapsedMs: 1240,
    },
  });
  expect(Object.hasOwn(result, 'isError')).toBe(false);
});

it('collapses line breaks onto one line', (): void => {
  const result = successResult({
    tool: 'image_compress',
    text: 'Saved  to\n/media/out.jpg.\r\n  Done.  ',
    outputs: [],
    elapsedMs: 8,
  });

  expect(result.content).toEqual([
    {
      type: 'text',
      text: 'Saved  to /media/out.jpg. Done.',
    },
  ]);
  const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
  expect(text).not.toContain('\n');
  expect(JSON.stringify(result)).not.toContain('\n');

  const failed = errorResult(new MediaError(
    ERROR_CODES.PROCESS_FAILED,
    'ffmpeg failed.\nSee stderr.',
    {},
  ));
  expect(failed.content).toEqual([
    {
      type: 'text',
      text: 'PROCESS_FAILED: ffmpeg failed. See stderr.',
    },
  ]);
  const failedText = failed.content[0]?.type === 'text' ? failed.content[0].text : '';
  expect(failedText.startsWith('PROCESS_FAILED: ')).toBe(true);
  expect(failedText).not.toContain('\n');
});

it('keeps extra keys from replacing the common ones', (): void => {
  const result = successResult({
    tool: 'image_compress',
    text: 'Compressed hero.jpg.',
    outputs: [],
    warnings: ['Re-encoded the audio.'],
    elapsedMs: 10.6,
    extras: {
      tool: 'other',
      outputs: [{ path: 'nope' }],
      warnings: ['ignored'],
      elapsedMs: 1,
      beforeBytes: 100,
      afterBytes: 40,
    },
  });

  expect(result.structuredContent).toEqual({
    tool: 'image_compress',
    outputs: [],
    warnings: ['Re-encoded the audio.'],
    elapsedMs: 11,
    beforeBytes: 100,
    afterBytes: 40,
  });
  expect(Object.keys(result.structuredContent ?? {})).toEqual([
    'tool',
    'outputs',
    'warnings',
    'elapsedMs',
    'beforeBytes',
    'afterBytes',
  ]);

  const floored = successResult({
    tool: 'media_probe',
    text: 'Probed intro.mp4.',
    outputs: [],
    elapsedMs: Number.NaN,
  });
  expect(floored.structuredContent).toEqual({
    tool: 'media_probe',
    outputs: [],
    warnings: [],
    elapsedMs: 0,
  });
});

it('matches the path failure example', (): void => {
  const error = new MediaError(
    ERROR_CODES.PATH_NOT_ALLOWED,
    PATH_MESSAGE,
    PATH_DETAILS,
  );
  const result = errorResult(error, 'video_trim');

  expect(result).toEqual({
    isError: true,
    content: [
      {
        type: 'text',
        text: `PATH_NOT_ALLOWED: ${PATH_MESSAGE}`,
      },
    ],
    structuredContent: {
      code: 'PATH_NOT_ALLOWED',
      message: PATH_MESSAGE,
      details: PATH_DETAILS,
    },
  });
  expect(result.structuredContent?.details).not.toBe(PATH_DETAILS);
  expect(result.structuredContent).not.toHaveProperty('tool');
  expect(result.structuredContent).not.toHaveProperty('outputs');
  expect(result.structuredContent).not.toHaveProperty('warnings');
  expect(result.structuredContent).not.toHaveProperty('elapsedMs');
});

it('maps a plain error to internal without a stack', (): void => {
  const plain = new Error('disk full');
  const stack = 'Error: disk full\n    at readInput (runner.js:10:4)';
  plain.stack = stack;

  const result = errorResult(plain, 'media_probe');
  const mediaError = toMediaError(plain, 'media_probe');
  const structured = result.structuredContent;

  expect(result.isError).toBe(true);
  expect(mediaError.code).toBe(ERROR_CODES.INTERNAL);
  expect(structured).toEqual({
    code: 'INTERNAL',
    message: mediaError.message,
    details: {
      tool: 'media_probe',
      cause: 'disk full',
    },
  });
  expect(result.content).toEqual([
    {
      type: 'text',
      text: `INTERNAL: ${mediaError.message}`,
    },
  ]);
  expect(result.content[0]?.type === 'text'
    ? result.content[0].text.startsWith('INTERNAL: ')
    : false).toBe(true);
  expect(JSON.stringify(result)).not.toContain(stack);
  expect(JSON.stringify(result)).not.toContain('runner.js');
  expect(structured).not.toHaveProperty('tool');
  expect(structured).not.toHaveProperty('outputs');
  expect(structured).not.toHaveProperty('warnings');
  expect(structured).not.toHaveProperty('elapsedMs');
});

it('reads the real byte size and omits absent media fields', (): void => {
  const imagePath = path.join(scratch, 'still.png');
  const payload = Buffer.from('still-image');
  writeFileSync(imagePath, payload);

  const still = describeOutput(imagePath, 'image', {
    width: 32,
    height: 16,
    codec: 'png',
  });

  expect(still).toEqual({
    path: imagePath,
    bytes: statSync(imagePath).size,
    mediaType: 'image',
    width: 32,
    height: 16,
    codec: 'png',
  });
  expect(still.bytes).toBe(payload.length);
  expect(Object.hasOwn(still, 'durationSeconds')).toBe(false);
  expect(Object.keys(still)).toEqual([
    'path',
    'bytes',
    'mediaType',
    'width',
    'height',
    'codec',
  ]);

  const playlist = describeOutput(imagePath, 'playlist');
  expect(playlist).toEqual({
    path: imagePath,
    bytes: payload.length,
    mediaType: 'playlist',
  });
});

it('drops non-finite numbers and an empty codec', (): void => {
  const imagePath = path.join(scratch, 'still.png');
  const payload = Buffer.from('still-image');
  writeFileSync(imagePath, payload);

  const dropped = describeOutput(imagePath, 'video', {
    durationSeconds: Number.NaN,
    width: Number.POSITIVE_INFINITY,
    height: Number.NEGATIVE_INFINITY,
    codec: '',
  });

  expect(dropped).toEqual({
    path: imagePath,
    bytes: payload.length,
    mediaType: 'video',
  });
  expect(Object.hasOwn(dropped, 'durationSeconds')).toBe(false);
  expect(Object.hasOwn(dropped, 'width')).toBe(false);
  expect(Object.hasOwn(dropped, 'height')).toBe(false);
  expect(Object.hasOwn(dropped, 'codec')).toBe(false);

  const kept = describeOutput(imagePath, 'video', {
    durationSeconds: 5,
    width: Number.NaN,
    height: 1080,
    codec: 'h264',
  });
  expect(kept).toEqual({
    path: imagePath,
    bytes: payload.length,
    mediaType: 'video',
    durationSeconds: 5,
    height: 1080,
    codec: 'h264',
  });
  expect(Object.keys(kept)).toEqual([
    'path',
    'bytes',
    'mediaType',
    'durationSeconds',
    'height',
    'codec',
  ]);
});

it('throws the stat error when the file is missing', (): void => {
  const missing = path.join(scratch, 'missing.bin');
  let fromStat: unknown;
  let fromDescribe: unknown;

  try {
    statSync(missing);
  } catch (error: unknown) {
    fromStat = error;
  }
  try {
    describeOutput(missing, 'segment');
  } catch (error: unknown) {
    fromDescribe = error;
  }

  expect(isMediaError(fromDescribe)).toBe(false);
  expect(fromDescribe).toMatchObject({ code: 'ENOENT', syscall: 'stat' });
  expect(fromStat).toMatchObject({ code: 'ENOENT', syscall: 'stat' });
});

it('reads a video with audio from the first video stream', (): void => {
  const streams = [
    {
      codec_type: 'audio',
      codec_name: 'aac',
      duration: '9.000000',
    },
    {
      codec_type: 'video',
      codec_name: 'h264',
      width: 1920,
      height: 1080,
      duration: '4.000000',
    },
    {
      codec_type: 'video',
      codec_name: 'mjpeg',
      width: 320,
      height: 240,
    },
  ];

  expect(readbackFromProbeJson({
    format: { duration: '5.000000' },
    streams,
  })).toEqual({
    durationSeconds: 5,
    width: 1920,
    height: 1080,
    codec: 'h264',
  });

  expect(readbackFromProbeJson({ streams })).toEqual({
    durationSeconds: 4,
    width: 1920,
    height: 1080,
    codec: 'h264',
  });
});

it('reads an audio-only probe without picture fields', (): void => {
  const readback = readbackFromProbeJson({
    format: { duration: '12.500000' },
    streams: [
      {
        codec_type: 'audio',
        codec_name: 'aac',
        duration: '1.000000',
      },
    ],
  });

  expect(readback).toEqual({
    durationSeconds: 12.5,
    codec: 'aac',
  });
  expect(Object.hasOwn(readback, 'width')).toBe(false);
  expect(Object.hasOwn(readback, 'height')).toBe(false);
});

it('reads a still image without a duration', (): void => {
  const readback = readbackFromProbeJson({
    format: { format_name: 'png_pipe' },
    streams: [
      {
        codec_type: 'video',
        codec_name: 'png',
        width: 32,
        height: 16,
      },
    ],
  });

  expect(readback).toEqual({
    width: 32,
    height: 16,
    codec: 'png',
  });
  expect(Object.hasOwn(readback, 'durationSeconds')).toBe(false);
});

it('omits an unusable duration instead of using the stream', (): void => {
  expect(readbackFromProbeJson({
    format: { duration: 'N/A' },
    streams: [
      {
        codec_type: 'video',
        codec_name: '',
        width: 1.5,
        height: 480,
        duration: '2',
      },
      {
        codec_type: 'audio',
        codec_name: 'aac',
      },
    ],
  })).toEqual({
    height: 480,
  });
});

it('returns an empty read-back for malformed probe json', (): void => {
  expect(readbackFromProbeJson(null)).toEqual({});
  expect(readbackFromProbeJson('probe')).toEqual({});
  expect(readbackFromProbeJson({})).toEqual({});
});
