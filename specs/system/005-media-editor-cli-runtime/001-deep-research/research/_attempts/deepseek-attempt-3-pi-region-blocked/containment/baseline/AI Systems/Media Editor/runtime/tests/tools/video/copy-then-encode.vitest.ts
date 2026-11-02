// ───────────────────────────────────────────────────────────────────
// MODULE: Copy Then Encode Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES, MediaError } from '../../../src/core/errors.js';
import { SpawnFailedError } from '../../../src/core/process-runner.js';
import { createToolContext } from '../../../src/server/tool-context.js';
import {
  assertPortableMp4,
  joinStderrTails,
  runAttempts,
  runInOutputFolder,
  runPipeline,
} from '../../../src/tools/video/copy-then-encode.js';
import { generateAudio, generateVideo } from '../../helpers/media.js';
import {
  createSandbox,
  listFolders,
  sha256Of,
} from '../../helpers/tool-client.js';

import type { ErrorCode } from '../../../src/core/errors.js';
import type { ResolvedInput } from '../../../src/core/path-guard.js';
import type { ToolContext } from '../../../src/server/tool-context.js';
import type {
  AttemptRequest,
  EncodeAttempt,
  PipelineRequest,
  PipelineStep,
} from '../../../src/tools/video/copy-then-encode.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A context whose ffmpeg runs are recorded, plus the records. */
interface RecordingContext {
  readonly context: ToolContext;
  readonly tempDirs: string[];
  readonly outputs: string[];
  readonly calls: { count: number };
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const failure = vi.hoisted(() => ({ copyExists: false }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    copyFile: async (...args: Parameters<typeof actual.copyFile>): Promise<void> => {
      // Stands in for a target that appeared between the name choice and the copy.
      if (failure.copyExists) {
        throw Object.assign(new Error('file already exists'), { code: 'EEXIST' });
      }
      return actual.copyFile(...args);
    },
  };
});

const sandbox = createSandbox('copy-then-encode-');
const realContext = createToolContext(sandbox.config);
const TOOL = 'video_convert';
const MISSING_ENCODER = 'definitely_not_an_encoder';
const OTHER_MISSING_ENCODER = 'another_missing_encoder';
const FALLBACK_WARNING = 'The first attempt failed, so the second one made the file.';
const TAIL_CAP = 4096;
// The EBML header every Matroska file opens with.
const MATROSKA_MAGIC = '1a45dfa3';
const STEP_WARNING = 'Nothing was silent, so the file was copied unchanged.';

let videoInput: ResolvedInput;
let audioInput: ResolvedInput;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function recording(base: ToolContext): RecordingContext {
  const tempDirs: string[] = [];
  const outputs: string[] = [];
  const calls = { count: 0 };
  const context: ToolContext = {
    ...base,
    runBinary: (name, args, options) => {
      // The MP4 check probes each attempt's file, and only the ffmpeg runs are attempts.
      if (name === 'ffmpeg') {
        calls.count += 1;
      }
      if (options.tempDir !== undefined) {
        tempDirs.push(options.tempDir);
      }
      outputs.push(...(options.outputs ?? []));
      return base.runBinary(name, args, options);
    },
  };
  return { context, tempDirs, outputs, calls };
}

function copyAttempt(input: ResolvedInput): EncodeAttempt {
  return { buildArgs: (out) => ['-i', input.realPath, '-c', 'copy', out] };
}

function badAttempt(input: ResolvedInput, encoder: string): EncodeAttempt {
  return {
    buildArgs: (out) => ['-i', input.realPath, '-c:v', encoder, out],
  };
}

function mpeg4Attempt(input: ResolvedInput, encoders?: readonly string[]): EncodeAttempt {
  return {
    buildArgs: (out) => ['-i', input.realPath, '-c:v', 'mpeg4', '-c:a', 'aac', out],
    encoders,
  };
}

function videoRequest(
  outputName: string,
  attempts: readonly [EncodeAttempt, ...EncodeAttempt[]],
  upfront: AttemptRequest['upfront'] = {},
): AttemptRequest {
  return {
    tool: TOOL,
    outputName,
    input: videoInput,
    mediaType: 'video',
    operation: 'converted',
    extension: '.mp4',
    tempName: 'converted.mp4',
    upfront,
    attempts,
  };
}

function pipelineRequest(
  outputName: string,
  upfront: PipelineRequest['upfront'] = {},
): PipelineRequest {
  return { tool: TOOL, outputName, inputs: [videoInput, audioInput], upfront };
}

/** Two passes: copy the video into the temp folder, then remux that copy. */
function twoPassStep(context: ToolContext, seen: { dir: string }): PipelineStep {
  return async (dir) => {
    seen.dir = dir;
    const first = path.join(dir, 'pass-1.mp4');
    await context.runBinary('ffmpeg', ['-i', videoInput.realPath, '-c', 'copy', first], {
      inputs: [videoInput],
      outputs: [first],
      tempDir: dir,
    });
    const second = path.join(dir, 'pass-2.mp4');
    await context.runBinary('ffmpeg', ['-i', first, '-c', 'copy', second], {
      inputs: [],
      outputs: [second],
      tempDir: dir,
    });
    return {
      tempPath: second,
      operation: 'joined',
      extension: '.mp4',
      mediaType: 'video',
      warnings: [STEP_WARNING],
    };
  };
}

/** Answers the probe of any file whose name starts with `marker` with these codecs. */
function probedAs(base: ToolContext, marker: string, codecs: readonly string[]): ToolContext {
  return {
    ...base,
    runBinary: async (name, args, options) => {
      const target = args.at(-1) ?? '';
      if (name !== 'ffprobe' || !path.basename(target).startsWith(marker)) {
        return base.runBinary(name, args, options);
      }
      const streams = codecs.map((codec) => ({ codec_name: codec }));
      return {
        exitCode: 0,
        signal: null,
        stdout: JSON.stringify({ streams }),
        stderr: '',
        stderrTail: '',
        elapsedMs: 1,
      };
    },
  };
}

function withoutLibx264(base: ToolContext): ToolContext {
  return {
    ...base,
    getCapabilities: async () => ({
      binaryPath: '/x/ffmpeg',
      capabilities: { encoders: new Set(['aac']), filters: new Set<string>() },
    }),
  };
}

async function caught(run: Promise<unknown>): Promise<MediaError> {
  try {
    await run;
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected the call to fail');
}

function expectCode(error: MediaError, code: ErrorCode): void {
  expect(error.code).toBe(code);
}

function expectTempDirsGone(tempDirs: readonly string[]): void {
  for (const dir of tempDirs) {
    expect(existsSync(dir)).toBe(false);
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

beforeAll(async (): Promise<void> => {
  const videoPath = await generateVideo(sandbox.allowedRoot, {
    seconds: 1,
    width: 64,
    height: 48,
    withAudio: true,
    fileName: 'clip.mp4',
  });
  const audioPath = await generateAudio(sandbox.allowedRoot, {
    seconds: 1,
    format: 'wav',
    fileName: 'tone.wav',
  });
  videoInput = realContext.resolveInput(videoPath, 'input', 'inputPath', TOOL);
  audioInput = realContext.resolveInput(audioPath, 'input', 'inputPath', TOOL);
});

afterAll((): void => {
  failure.copyExists = false;
  sandbox.cleanup();
});

describe('joinStderrTails', () => {
  it('returns an empty string for no tails', (): void => {
    expect(joinStderrTails([])).toBe('');
  });

  it('keeps one tail unchanged and drops empty ones', (): void => {
    expect(joinStderrTails(['only tail'])).toBe('only tail');
    expect(joinStderrTails(['', 'only tail', ''])).toBe('only tail');
  });

  it('joins two tails with a line break', (): void => {
    expect(joinStderrTails(['first', 'second'])).toBe('first\nsecond');
  });

  it('cuts a long tail to the cap and keeps the end', (): void => {
    const long = `${'a'.repeat(9990)}0123456789`;
    const result = joinStderrTails([long]);
    expect(Buffer.byteLength(result, 'utf8')).toBe(TAIL_CAP);
    expect(result.endsWith('0123456789')).toBe(true);
  });

  it('never splits a multi-byte character at the cut', (): void => {
    const wide = '€'.repeat(5000);
    const result = joinStderrTails([wide]);
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(TAIL_CAP);
    expect(result.includes('�')).toBe(false);
    expect(result).toBe('€'.repeat(Math.floor(TAIL_CAP / 3)));
    expect(joinStderrTails(['x', wide], 10)).toBe('€'.repeat(3));
  });
});

describe('runAttempts with real ffmpeg', () => {
  it('keeps the first attempt when it succeeds', async (): Promise<void> => {
    const before = sha256Of(videoInput.realPath);
    const rec = recording(realContext);
    const result = await runAttempts(
      rec.context,
      videoRequest('first works', [
        copyAttempt(videoInput),
        { ...mpeg4Attempt(videoInput), warning: FALLBACK_WARNING },
      ]),
    );

    expect(result.attemptUsed).toBe(1);
    expect(rec.calls.count).toBe(1);
    expect(result.folder.folderPath).toBe(path.join(sandbox.outputDir, '001 - first-works'));
    expect(readdirSync(result.folder.folderPath)).toEqual(['clip-converted.mp4']);
    expect(result.entry.path).toBe(path.join(result.folder.folderPath, 'clip-converted.mp4'));
    expect(result.entry.bytes).toBe(statSync(result.entry.path).size);
    expect(result.entry.bytes).toBeGreaterThan(0);
    expect(result.entry.mediaType).toBe('video');
    expect(result.entry.codec).toBe('h264');
    expect(result.warnings).toEqual([]);
    expect(sha256Of(videoInput.realPath)).toBe(before);
    expect(rec.tempDirs).toHaveLength(1);
    expectTempDirsGone(rec.tempDirs);
  });

  it('writes an audio survivor with the audio media type', async (): Promise<void> => {
    const request: AttemptRequest = {
      tool: 'audio_convert',
      outputName: 'audio copy',
      input: audioInput,
      mediaType: 'audio',
      operation: 'converted',
      extension: '.wav',
      tempName: 'converted.wav',
      upfront: {},
      attempts: [copyAttempt(audioInput)],
    };
    const result = await runAttempts(realContext, request);
    expect(result.attemptUsed).toBe(1);
    expect(readdirSync(result.folder.folderPath)).toEqual(['tone-converted.wav']);
    expect(result.entry.mediaType).toBe('audio');
  });

  it('falls back to attempt 2 on its own temp path', async (): Promise<void> => {
    const rec = recording(realContext);
    const result = await runAttempts(
      rec.context,
      videoRequest('fallback', [
        badAttempt(videoInput, MISSING_ENCODER),
        { ...mpeg4Attempt(videoInput), warning: FALLBACK_WARNING },
      ]),
    );

    expect(result.attemptUsed).toBe(2);
    expect(rec.calls.count).toBe(2);
    expect(readdirSync(result.folder.folderPath)).toEqual(['clip-converted.mp4']);
    expect(result.entry.codec).toBe('mpeg4');
    expect(result.warnings).toEqual([FALLBACK_WARNING]);
    expect(new Set(rec.outputs).size).toBe(2);
    expect(rec.tempDirs).toHaveLength(2);
    expectTempDirsGone(rec.tempDirs);
  });

  it('falls back when a check rejects the file an attempt made', async (): Promise<void> => {
    const checked: boolean[] = [];
    const result = await runAttempts(
      realContext,
      videoRequest('checked', [
        {
          ...copyAttempt(videoInput),
          check: async (outputPath: string): Promise<void> => {
            checked.push(existsSync(outputPath));
            throw new MediaError(ERROR_CODES.PROCESS_FAILED, 'The copy is not clean.', {
              binary: 'ffmpeg',
              exitCode: 0,
              signal: null,
              stderrTail: 'decode error',
            });
          },
        },
        { ...mpeg4Attempt(videoInput), warning: FALLBACK_WARNING },
      ]),
    );

    expect(checked).toEqual([true]);
    expect(result.attemptUsed).toBe(2);
    expect(result.entry.codec).toBe('mpeg4');
    expect(result.warnings).toEqual([FALLBACK_WARNING]);
    expect(readdirSync(result.folder.folderPath)).toEqual(['clip-converted.mp4']);
  });

  it('names the file with the extension of the attempt that made it', async (): Promise<void> => {
    const result = await runAttempts(
      realContext,
      videoRequest('own extension', [
        badAttempt(videoInput, MISSING_ENCODER),
        { ...mpeg4Attempt(videoInput), extension: '.mkv' },
      ]),
    );

    expect(result.attemptUsed).toBe(2);
    expect(readdirSync(result.folder.folderPath)).toEqual(['clip-converted.mkv']);
    expect(readFileSync(result.entry.path).subarray(0, 4).toString('hex')).toBe(MATROSKA_MAGIC);
  });

  it('keeps the request extension when an earlier attempt succeeds', async (): Promise<void> => {
    const result = await runAttempts(
      realContext,
      videoRequest('request extension', [
        copyAttempt(videoInput),
        { ...mpeg4Attempt(videoInput), extension: '.mkv' },
      ]),
    );

    expect(result.attemptUsed).toBe(1);
    expect(readdirSync(result.folder.folderPath)).toEqual(['clip-converted.mp4']);
  });

  it('throws one PROCESS_FAILED with both tails when all fail', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const rec = recording(realContext);
    const error = await caught(runAttempts(
      rec.context,
      videoRequest('both fail', [
        badAttempt(videoInput, MISSING_ENCODER),
        badAttempt(videoInput, OTHER_MISSING_ENCODER),
      ]),
    ));

    expectCode(error, ERROR_CODES.PROCESS_FAILED);
    expect(error.details.binary).toBe('ffmpeg');
    expect(typeof error.details.exitCode).toBe('number');
    expect(error.details.exitCode).not.toBe(0);
    const tail = error.details.stderrTail;
    if (typeof tail !== 'string') {
      throw new Error('expected a string tail');
    }
    const first = tail.indexOf(MISSING_ENCODER);
    const second = tail.indexOf(OTHER_MISSING_ENCODER);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(second).toBeGreaterThan(first);
    expect(tail.slice(first, second).includes('\n')).toBe(true);
    expect(Buffer.byteLength(tail, 'utf8')).toBeLessThanOrEqual(TAIL_CAP);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expect(rec.calls.count).toBe(2);
    expectTempDirsGone(rec.tempDirs);
  });

  it('rethrows a single failed attempt as it is', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const error = await caught(runAttempts(
      realContext,
      videoRequest('single fail', [badAttempt(videoInput, MISSING_ENCODER)]),
    ));
    expectCode(error, ERROR_CODES.PROCESS_FAILED);
    expect(error.details.binary).toBe('ffmpeg');
    expect(error.details.spawnFailed).toBeUndefined();
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  });
});

describe('runAttempts prepare step', () => {
  it('runs once in the attempts temp folder before attempt 1', async (): Promise<void> => {
    const rec = recording(realContext);
    const prepared: string[] = [];
    const result = await runAttempts(rec.context, {
      ...videoRequest('prepared', [
        badAttempt(videoInput, MISSING_ENCODER),
        { ...mpeg4Attempt(videoInput), warning: FALLBACK_WARNING },
      ]),
      prepare: async (dir) => {
        expect(rec.calls.count).toBe(0);
        prepared.push(dir);
      },
    });

    expect(result.attemptUsed).toBe(2);
    expect(prepared).toHaveLength(1);
    expect(new Set(rec.tempDirs)).toEqual(new Set(prepared));
    expectTempDirsGone(prepared);
  });

  it('removes the folder and runs nothing when prepare fails', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const rec = recording(realContext);
    const refusal = new MediaError(ERROR_CODES.UNSUPPORTED_FORMAT, 'Not SubRip.', {
      reason: 'not-subrip',
    });
    const error = await caught(runAttempts(rec.context, {
      ...videoRequest('prepare fails', [copyAttempt(videoInput)]),
      prepare: async () => {
        throw refusal;
      },
    }));

    expect(error).toBe(refusal);
    expect(rec.calls.count).toBe(0);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  });
});

describe('runAttempts other inputs', () => {
  it('hands every caller input to each run', async (): Promise<void> => {
    const seen: string[][] = [];
    const context: ToolContext = {
      ...realContext,
      runBinary: (name, args, options) => {
        if (name === 'ffmpeg') {
          seen.push(options.inputs.map((input) => input.realPath));
        }
        return realContext.runBinary(name, args, options);
      },
    };
    const result = await runAttempts(context, {
      ...videoRequest('other inputs', [copyAttempt(videoInput)]),
      otherInputs: [audioInput],
    });

    expect(result.attemptUsed).toBe(1);
    expect(seen).toEqual([[videoInput.realPath, audioInput.realPath]]);
  });
});

describe('runAttempts capability gates', () => {
  it('refuses a missing upfront encoder before any folder or run', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const rec = recording(withoutLibx264(realContext));
    const error = await caught(runAttempts(
      rec.context,
      videoRequest('upfront gate', [copyAttempt(videoInput)], { encoders: ['libx264'] }),
    ));

    expectCode(error, ERROR_CODES.CAPABILITY_MISSING);
    expect(error.details.name).toBe('libx264');
    expect(error.details.kind).toBe('encoder');
    expect(error.details.neededBy).toBe(TOOL);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expect(rec.calls.count).toBe(0);
    expect(rec.tempDirs).toEqual([]);
  });

  it('checks attempt 2 names only before attempt 2', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const rec = recording(withoutLibx264(realContext));
    const error = await caught(runAttempts(
      rec.context,
      videoRequest('late gate', [
        badAttempt(videoInput, MISSING_ENCODER),
        mpeg4Attempt(videoInput, ['libx264']),
      ]),
    ));

    expectCode(error, ERROR_CODES.CAPABILITY_MISSING);
    expect(error.details.name).toBe('libx264');
    expect(rec.calls.count).toBe(1);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expectTempDirsGone(rec.tempDirs);
  });

  it('never checks attempt 2 names when attempt 1 succeeds', async (): Promise<void> => {
    const rec = recording(withoutLibx264(realContext));
    const result = await runAttempts(
      rec.context,
      videoRequest('late gate unused', [
        copyAttempt(videoInput),
        mpeg4Attempt(videoInput, ['libx264']),
      ]),
    );
    expect(result.attemptUsed).toBe(1);
    expect(rec.calls.count).toBe(1);
  });
});

describe('runAttempts without fallback', () => {
  it('stops on PROCESS_TIMEOUT without running attempt 2', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const calls = { count: 0 };
    const context: ToolContext = {
      ...realContext,
      runBinary: async () => {
        calls.count += 1;
        throw new MediaError(ERROR_CODES.PROCESS_TIMEOUT, 'Stopped.', {
          binary: 'ffmpeg',
          timeoutSeconds: 1,
          elapsedSeconds: 1,
        });
      },
    };
    const error = await caught(runAttempts(
      context,
      videoRequest('timeout', [copyAttempt(videoInput), mpeg4Attempt(videoInput)]),
    ));
    expectCode(error, ERROR_CODES.PROCESS_TIMEOUT);
    expect(error.details.timeoutSeconds).toBe(1);
    expect(calls.count).toBe(1);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  });

  it('stops on a spawn failure without running attempt 2', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const calls = { count: 0 };
    const context: ToolContext = {
      ...realContext,
      runBinary: async () => {
        calls.count += 1;
        throw new SpawnFailedError('ffmpeg', 'EACCES');
      },
    };
    const error = await caught(runAttempts(
      context,
      videoRequest('spawn fail', [copyAttempt(videoInput), mpeg4Attempt(videoInput)]),
    ));
    expectCode(error, ERROR_CODES.PROCESS_FAILED);
    expect(error.details.spawnFailed).toBe(true);
    expect(error.details.spawnCode).toBe('EACCES');
    expect(calls.count).toBe(1);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  });

  it('maps an existing target to OUTPUT_EXISTS and removes the folder', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const rec = recording(realContext);
    failure.copyExists = true;
    let error: MediaError;
    try {
      error = await caught(runAttempts(
        rec.context,
        videoRequest('exists', [copyAttempt(videoInput)]),
      ));
    } finally {
      failure.copyExists = false;
    }
    expectCode(error, ERROR_CODES.OUTPUT_EXISTS);
    expect(error.details.stage).toBe('run');
    const target = error.details.path;
    if (typeof target !== 'string') {
      throw new Error('expected a target path');
    }
    expect(path.basename(target)).toBe('clip-converted.mp4');
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expectTempDirsGone(rec.tempDirs);
  });
});

describe('assertPortableMp4', () => {
  it.each([
    ['clip.mp4', ['h264', 'pcm_s16le'], 'pcm_s16le'],
    ['clip.m4v', ['ffv1', 'aac'], 'ffv1'],
    ['tone.M4A', ['pcm_f32le'], 'pcm_f32le'],
  ])('refuses %s that keeps %j', async (name, codecs, refused): Promise<void> => {
    const context = probedAs(realContext, name, codecs);
    const error = await caught(assertPortableMp4(context, path.join(sandbox.root, name)));
    expectCode(error, ERROR_CODES.PROCESS_FAILED);
    expect(error.message.includes(refused)).toBe(true);
    expect(error.details.binary).toBe('ffmpeg');
    expect(error.details.exitCode).toBe(0);
    expect(String(error.details.stderrTail).includes(refused)).toBe(true);
  });

  it('keeps an MP4 of H.264 and AAC', async (): Promise<void> => {
    const context = probedAs(realContext, 'clip.mp4', ['h264', 'aac']);
    await expect(assertPortableMp4(context, path.join(sandbox.root, 'clip.mp4'))).resolves
      .toBeUndefined();
  });

  it.each(['clip.mov', 'clip.mkv', 'tone.wav'])(
    'never probes %s, which is outside the MP4 family',
    async (name): Promise<void> => {
      const calls = { count: 0 };
      const context: ToolContext = {
        ...realContext,
        runBinary: async () => {
          calls.count += 1;
          throw new Error('no run was expected');
        },
      };
      await assertPortableMp4(context, path.join(sandbox.root, name));
      expect(calls.count).toBe(0);
    },
  );
});

describe('runAttempts MP4 refusal', () => {
  it('moves past an attempt whose MP4 keeps PCM', async (): Promise<void> => {
    const rec = recording(probedAs(realContext, 'attempt-1-', ['h264', 'pcm_s16le']));
    const result = await runAttempts(
      rec.context,
      videoRequest('pcm refused', [
        copyAttempt(videoInput),
        { ...mpeg4Attempt(videoInput), warning: FALLBACK_WARNING },
      ]),
    );

    expect(result.attemptUsed).toBe(2);
    expect(rec.calls.count).toBe(2);
    expect(result.entry.codec).toBe('mpeg4');
    expect(result.warnings).toEqual([FALLBACK_WARNING]);
    expectTempDirsGone(rec.tempDirs);
  });

  it('fails and removes the folder when the only attempt keeps FFV1', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const rec = recording(probedAs(realContext, 'attempt-1-', ['ffv1', 'aac']));
    const error = await caught(runAttempts(
      rec.context,
      videoRequest('ffv1 refused', [copyAttempt(videoInput)]),
    ));

    expectCode(error, ERROR_CODES.PROCESS_FAILED);
    expect(String(error.details.stderrTail).includes('ffv1')).toBe(true);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expectTempDirsGone(rec.tempDirs);
  });
});

describe('runPipeline', () => {
  it('keeps the last pass under the first input name', async (): Promise<void> => {
    const videoBefore = sha256Of(videoInput.realPath);
    const audioBefore = sha256Of(audioInput.realPath);
    const rec = recording(realContext);
    const seen = { dir: '' };
    const result = await runPipeline(
      rec.context,
      pipelineRequest('two passes'),
      twoPassStep(rec.context, seen),
    );

    expect(rec.calls.count).toBe(2);
    expect(result.attemptUsed).toBe(1);
    expect(path.dirname(result.folder.folderPath)).toBe(sandbox.outputDir);
    expect(path.basename(result.folder.folderPath)).toMatch(/^\d{3} - two-passes$/);
    expect(readdirSync(result.folder.folderPath)).toEqual(['clip-joined.mp4']);
    expect(result.entry.path).toBe(path.join(result.folder.folderPath, 'clip-joined.mp4'));
    expect(result.entry.bytes).toBe(statSync(result.entry.path).size);
    expect(result.entry.mediaType).toBe('video');
    expect(result.warnings[0]).toBe(STEP_WARNING);
    expect(sha256Of(videoInput.realPath)).toBe(videoBefore);
    expect(sha256Of(audioInput.realPath)).toBe(audioBefore);
    expect(seen.dir).not.toBe('');
    expect(existsSync(seen.dir)).toBe(false);
  });

  it('refuses a missing upfront name before the folder or the step', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const steps = { count: 0 };
    const error = await caught(runPipeline(
      withoutLibx264(realContext),
      pipelineRequest('pipeline gate', { encoders: ['aac', 'libx264'] }),
      async () => {
        steps.count += 1;
        throw new Error('the step must not run');
      },
    ));

    expectCode(error, ERROR_CODES.CAPABILITY_MISSING);
    expect(error.details.name).toBe('libx264');
    expect(steps.count).toBe(0);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  });

  it('removes the folder and rethrows when the step fails', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const seen = { dir: '' };
    const refusal = new MediaError(ERROR_CODES.INVALID_INPUT, 'Every stretch is silent.', {
      parameter: 'inputPath',
      reason: 'all-silent',
    });
    const error = await caught(runPipeline(
      realContext,
      pipelineRequest('step fails'),
      async (dir) => {
        seen.dir = dir;
        throw refusal;
      },
    ));

    expect(error).toBe(refusal);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expect(existsSync(seen.dir)).toBe(false);
  });

  it('maps an existing target to OUTPUT_EXISTS and removes the folder', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const seen = { dir: '' };
    failure.copyExists = true;
    let error: MediaError;
    try {
      error = await caught(runPipeline(
        realContext,
        pipelineRequest('pipeline exists'),
        twoPassStep(realContext, seen),
      ));
    } finally {
      failure.copyExists = false;
    }
    expectCode(error, ERROR_CODES.OUTPUT_EXISTS);
    expect(error.details.stage).toBe('run');
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expect(existsSync(seen.dir)).toBe(false);
  });
});

describe('runPipeline MP4 refusal', () => {
  it('refuses a kept MP4 that holds PCM and removes the folder', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const context = probedAs(realContext, 'pass-2', ['h264', 'pcm_s16le']);
    const seen = { dir: '' };
    const error = await caught(runPipeline(
      context,
      pipelineRequest('pipeline pcm'),
      twoPassStep(context, seen),
    ));

    expectCode(error, ERROR_CODES.PROCESS_FAILED);
    expect(String(error.details.stderrTail).includes('pcm_s16le')).toBe(true);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
    expect(existsSync(seen.dir)).toBe(false);
  });
});

describe('runInOutputFolder', () => {
  it('keeps the folder and returns what the step returns', async (): Promise<void> => {
    const kept = await runInOutputFolder(
      realContext,
      { tool: TOOL, outputName: 'folder step', upfront: { encoders: ['libx264'] } },
      async (folder) => {
        writeFileSync(path.join(folder.folderPath, 'note.txt'), 'kept');
        return folder.folderPath;
      },
    );

    expect(path.basename(kept)).toMatch(/^\d{3} - folder-step$/);
    expect(readdirSync(kept)).toEqual(['note.txt']);
  });

  it('refuses a missing upfront name before the folder or the step', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const steps = { count: 0 };
    const error = await caught(runInOutputFolder(
      withoutLibx264(realContext),
      { tool: TOOL, outputName: 'folder gate', upfront: { encoders: ['libx264'] } },
      async () => {
        steps.count += 1;
        return '';
      },
    ));

    expectCode(error, ERROR_CODES.CAPABILITY_MISSING);
    expect(error.details.name).toBe('libx264');
    expect(steps.count).toBe(0);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  });

  it('removes the folder and what the step wrote when the step fails', async (): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    const refusal = new MediaError(ERROR_CODES.PROCESS_FAILED, 'No segment was written.', {
      binary: 'ffmpeg',
      exitCode: 0,
      signal: null,
      stderrTail: '',
    });
    const error = await caught(runInOutputFolder(
      realContext,
      { tool: TOOL, outputName: 'folder fails', upfront: {} },
      async (folder) => {
        writeFileSync(path.join(folder.folderPath, 'partial.txt'), 'partial');
        throw refusal;
      },
    ));

    expect(error).toBe(refusal);
    expect(listFolders(sandbox.outputDir)).toEqual(before);
  });
});
