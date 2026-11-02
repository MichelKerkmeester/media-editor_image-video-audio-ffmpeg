// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Context Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  accessSync,
  chmodSync,
  constants,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetCapabilityCache } from '../../src/core/capabilities.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { resetResolverCache } from '../../src/core/ffmpeg-resolver.js';
import { createToolContext } from '../../src/server/tool-context.js';

import type { CapabilityRunner } from '../../src/core/capabilities.js';
import type { ServerConfig } from '../../src/core/config.js';
import type {
  BinaryFileInfo,
  BinaryName,
  ResolverDeps,
} from '../../src/core/ffmpeg-resolver.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ResolutionScript {
  readonly deps: ResolverDeps;
  readonly count: () => number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const scratch = realpathSync.native(
  mkdtempSync(path.join(tmpdir(), 'media-editor-tool-context-')),
);
const mediaRoot = path.join(scratch, 'media');
const outputRoot = path.join(scratch, 'output');
const outsideRoot = path.join(scratch, 'outside');
const dataRoot = path.join(scratch, 'data');
const clipPath = path.join(mediaRoot, 'clip.mp4');
const otherPath = path.join(mediaRoot, 'other.mp4');
const outsidePath = path.join(outsideRoot, 'secret.mp4');
const imagePath = path.join(mediaRoot, 'still.png');
const playlistPath = path.join(mediaRoot, 'list.m3u8');
const segmentPath = path.join(mediaRoot, 'piece.ts');
const videoBytes = Buffer.from('video-bytes');

const ENCODER_TEXT = [
  'Encoders:',
  ' V....D libx264              libx264 H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10',
  ' A....D aac                  AAC (Advanced Audio Coding)',
].join('\n');

const FILTER_TEXT = [
  'Filters:',
  ' T.C drawtext          V->V       Draw text on top of video frames.',
].join('\n');

const FAILING_SCRIPT = [
  '#!/bin/sh',
  'if [ "$1" = "-version" ]; then',
  '  echo "ffmpeg version 6.0"',
  '  exit 0',
  'fi',
  'exit 1',
  '',
].join('\n');

const PROBE_JSON = [
  '{"format":{"duration":"5.0"},',
  '"streams":[{"codec_type":"video","width":1920,',
  '"height":1080,"codec_name":"h264"}]}',
].join('');

const PROBE_SCRIPT = [
  '#!/bin/sh',
  'if [ "$1" = "-version" ]; then',
  '  echo "ffprobe version 6.0"',
  '  exit 0',
  'fi',
  `echo '${PROBE_JSON}'`,
  'exit 0',
  '',
].join('\n');

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

mkdirSync(mediaRoot);
mkdirSync(outputRoot);
mkdirSync(outsideRoot);
mkdirSync(dataRoot);
writeFileSync(clipPath, videoBytes);
writeFileSync(otherPath, 'other');
writeFileSync(outsidePath, 'secret');
writeFileSync(imagePath, 'image');
writeFileSync(playlistPath, 'playlist');
writeFileSync(segmentPath, 'segment');

beforeEach((): void => {
  resetResolverCache();
  resetCapabilityCache();
});

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

function serverConfig(overrides?: Partial<ServerConfig>): ServerConfig {
  return {
    allowedRoots: [mediaRoot],
    outputDir: outputRoot,
    ffmpegPath: undefined,
    ffprobePath: undefined,
    timeoutSeconds: 30,
    dataDir: dataRoot,
    logLevel: 'info',
    ...overrides,
  };
}

function thrownSync(run: () => void): MediaError {
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

async function thrownError(run: () => Promise<unknown>): Promise<MediaError> {
  try {
    await run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

function writeExecutable(name: string, body: string): string {
  const filePath = path.join(scratch, name);
  writeFileSync(filePath, body);
  chmodSync(filePath, 0o755);
  return filePath;
}

function makeCleanup(name: string): string {
  const folder = path.join(scratch, name);
  mkdirSync(folder);
  writeFileSync(path.join(folder, 'marker.txt'), 'keep');
  return folder;
}

function resolutionScript(
  sequence: readonly string[],
  pretendMissing: ReadonlySet<string>,
): ResolutionScript {
  let count = 0;
  const deps: ResolverDeps = {
    pathEnv: '',
    bundledPath: (): string => {
      const index = Math.min(count, sequence.length - 1);
      count += 1;
      const chosen = sequence[index];
      if (chosen === undefined) {
        throw new Error('Expected a scripted binary path.');
      }
      return chosen;
    },
    fileInfo: (binaryPath: string): BinaryFileInfo | undefined => {
      if (pretendMissing.has(binaryPath)) {
        return { isFile: true, size: 1, mtimeMs: 1 };
      }
      try {
        const info = statSync(binaryPath);
        return {
          isFile: info.isFile(),
          size: info.size,
          mtimeMs: info.mtimeMs,
        };
      } catch {
        return undefined;
      }
    },
    isExecutable: (binaryPath: string): boolean => {
      if (pretendMissing.has(binaryPath)) {
        return true;
      }
      try {
        accessSync(binaryPath, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    },
    probeVersion: (_binaryPath: string, name: BinaryName): string => (
      `${name} version 6.0`
    ),
  };
  return {
    deps,
    count: (): number => count,
  };
}

function detailsText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('createToolContext', (): void => {
  it('resolves inputs only inside the configured roots', (): void => {
    const config = serverConfig();
    const context = createToolContext(config);
    const resolved = context.resolveInput(
      clipPath,
      'input',
      'inputPath',
      'video_trim',
    );
    const many = context.resolveInputs(
      [clipPath, otherPath],
      'input',
      'inputPaths',
      'video_concat',
    );
    const error = thrownSync((): void => {
      context.resolveInput(outsidePath, 'input', 'inputPath', 'video_trim');
    });

    expect(context.config).toBe(config);
    expect(context.configWarnings).toEqual([]);
    expect(resolved.rawPath).toBe(clipPath);
    expect(resolved.realPath).toBe(clipPath);
    expect(resolved.role).toBe('input');
    expect(many.map((entry) => entry.realPath)).toEqual([
      clipPath,
      otherPath,
    ]);
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details.reason).toBe('outside-root');
    expect(error.details.allowedRoots).toEqual([mediaRoot]);
    expect(error.details.path).toBe(outsidePath);
  });

  it('keeps warn lines that were recorded with the settings', (): void => {
    const warnings = ['Ignoring MEDIA_EDITOR_TIMEOUT_SECONDS.'];
    const context = createToolContext(serverConfig(), {
      configWarnings: warnings,
    });
    expect(context.configWarnings).toEqual(warnings);
  });

  it('allocates the numbered folder under the output directory', (): void => {
    const context = createToolContext(serverConfig());
    const allocated = context.allocateOutputFolder('Hero Clip', 'video_trim');
    expect(allocated.number).toBe(1);
    expect(allocated.name).toBe('hero-clip');
    expect(allocated.folderPath).toBe(
      path.join(outputRoot, '001 - hero-clip'),
    );
    expect(existsSync(allocated.folderPath)).toBe(true);
  });

  it('reports an unset output directory', (): void => {
    const context = createToolContext(serverConfig({ outputDir: undefined }));
    const error = thrownSync((): void => {
      context.allocateOutputFolder('Hero Clip', 'video_trim');
    });
    expect(error.code).toBe(ERROR_CODES.CONFIG_MISSING);
    expect(error.details.setting).toBe('outputFolder');
    expect(error.details.reason).toBe('unset');
    expect(error.details.tool).toBe('video_trim');
  });

  it('reads capabilities once for two calls', async (): Promise<void> => {
    const fakeBinary = path.join(scratch, 'fake-ffmpeg');
    let runnerCalls = 0;
    const runner: CapabilityRunner = (binaryPath, args): Promise<string> => {
      runnerCalls += 1;
      expect(binaryPath).toBe(fakeBinary);
      if (args[0] === '-encoders') {
        return Promise.resolve(ENCODER_TEXT);
      }
      return Promise.resolve(FILTER_TEXT);
    };
    const context = createToolContext(serverConfig(), {
      capabilityRunner: runner,
      resolverDeps: {
        pathEnv: '',
        bundledPath: (): string => fakeBinary,
        fileInfo: (): BinaryFileInfo => ({
          isFile: true,
          size: 8,
          mtimeMs: 8,
        }),
        isExecutable: (): boolean => true,
        probeVersion: (): string => 'ffmpeg version 6.0',
      },
    });

    const first = await context.getCapabilities();
    const second = await context.getCapabilities();

    expect(runnerCalls).toBe(2);
    expect(first.binaryPath).toBe(fakeBinary);
    expect(second.binaryPath).toBe(fakeBinary);
    expect(second.capabilities).toBe(first.capabilities);
    expect(first.capabilities.encoders.has('libx264')).toBe(true);
    expect(first.capabilities.filters.has('drawtext')).toBe(true);
  });

  it.skipIf(process.platform === 'win32')(
    'checks every input again before the spawn',
    async (): Promise<void> => {
      const script = writeExecutable('guarded.sh', '#!/bin/sh\nexit 0\n');
      const scripted = resolutionScript([script], new Set());
      const context = createToolContext(serverConfig(), {
        resolverDeps: scripted.deps,
      });
      const link = path.join(mediaRoot, 'link-swap.mp4');
      symlinkSync(clipPath, link);
      const accepted = context.resolveInput(link, 'input', 'inputPath', 'video_trim');

      const first = await context.runBinary('ffmpeg', [], { inputs: [accepted] });
      expect(first.exitCode).toBe(0);

      unlinkSync(link);
      symlinkSync(outsidePath, link);
      const error = await thrownError(() => context.runBinary('ffmpeg', [], {
        inputs: [accepted],
      }));

      expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
      expect(error.details.reason).toBe('changed-after-check');
      unlinkSync(link);
    },
  );

  it.skipIf(process.platform === 'win32')(
    'retries a spawn failure once and keeps the cleanup folder',
    async (): Promise<void> => {
      const missing = path.join(scratch, 'missing-ffmpeg');
      const script = writeExecutable('ok.sh', '#!/bin/sh\nexit 0\n');
      const scripted = resolutionScript(
        [missing, script],
        new Set([missing]),
      );
      const folder = makeCleanup('cleanup-retry');
      const context = createToolContext(serverConfig(), {
        resolverDeps: scripted.deps,
      });

      const result = await context.runBinary('ffmpeg', [], {
        cleanupFolders: [folder],
        inputs: [],
      });

      expect(result.exitCode).toBe(0);
      expect(scripted.count()).toBe(2);
      expect(existsSync(path.join(folder, 'marker.txt'))).toBe(true);
    },
  );

  it.skipIf(process.platform === 'win32')(
    'removes the cleanup folder when the retried binary also fails to spawn',
    async (): Promise<void> => {
      const first = path.join(scratch, 'gone-ffmpeg-1');
      const second = path.join(scratch, 'gone-ffmpeg-2');
      const scripted = resolutionScript(
        [first, second],
        new Set([first, second]),
      );
      const folder = makeCleanup('cleanup-both');
      const context = createToolContext(serverConfig(), {
        resolverDeps: scripted.deps,
      });

      const error = await thrownError(() => context.runBinary('ffmpeg', [], {
        cleanupFolders: [folder],
        inputs: [],
      }));

      expect(scripted.count()).toBe(2);
      expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
      expect(error.details.spawnFailed).toBe(true);
      expect(error.details.spawnCode).toBe('ENOENT');
      expect(error.details.binary).toBe('ffmpeg');
      expect(existsSync(folder)).toBe(false);
    },
  );

  it.skipIf(process.platform === 'win32')(
    'removes the cleanup folder when the process exits non-zero',
    async (): Promise<void> => {
      const script = writeExecutable('fail.sh', FAILING_SCRIPT);
      const folder = makeCleanup('cleanup-exit');
      const context = createToolContext(serverConfig({
        ffmpegPath: script,
      }));

      const error = await thrownError(() => context.runBinary('ffmpeg', [], {
        cleanupFolders: [folder],
        inputs: [],
      }));

      expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
      expect(error.details.exitCode).toBe(1);
      expect(error.details.signal).toBeNull();
      expect(error.details.binary).toBe('ffmpeg');
      expect(error.details.spawnFailed).toBeUndefined();
      expect(existsSync(folder)).toBe(false);
    },
  );

  it('removes the cleanup folder when the binary is not found', async (): Promise<void> => {
    const missing = path.join(scratch, 'no-such-ffmpeg');
    const folder = makeCleanup('cleanup-missing');
    const context = createToolContext(serverConfig({
      ffmpegPath: missing,
    }));

    const error = await thrownError(() => context.runBinary('ffmpeg', [], {
      cleanupFolders: [folder],
      inputs: [],
    }));
    const lookedIn = error.details.lookedIn;

    expect(error.code).toBe(ERROR_CODES.FFMPEG_NOT_FOUND);
    expect(error.details.envVar).toBe('MEDIA_EDITOR_FFMPEG_PATH');
    expect(error.details.nextStep).toBe(
      'fix or unset MEDIA_EDITOR_FFMPEG_PATH',
    );
    expect(Array.isArray(lookedIn)).toBe(true);
    expect(lookedIn).toHaveLength(1);
    expect(detailsText(Array.isArray(lookedIn) ? lookedIn[0] : undefined))
      .toContain('does not exist');
    expect(existsSync(folder)).toBe(false);
  });

  it.skipIf(process.platform === 'win32')(
    'reads video details back from ffprobe',
    async (): Promise<void> => {
      const script = writeExecutable('probe.sh', PROBE_SCRIPT);
      const context = createToolContext(serverConfig({
        ffprobePath: script,
      }));

      const result = await context.readBack(clipPath, 'video');

      expect(result.warnings).toEqual([]);
      expect(result.entry.path).toBe(clipPath);
      expect(result.entry.bytes).toBe(videoBytes.length);
      expect(result.entry.mediaType).toBe('video');
      expect(result.entry.durationSeconds).toBe(5);
      expect(result.entry.width).toBe(1920);
      expect(result.entry.height).toBe(1080);
      expect(result.entry.codec).toBe('h264');
    },
  );

  it('warns once when ffprobe cannot read the file back', async (): Promise<void> => {
    const missing = path.join(scratch, 'no-such-ffprobe');
    const context = createToolContext(serverConfig({
      ffprobePath: missing,
    }));

    const result = await context.readBack(clipPath, 'video');

    expect(result.entry.path).toBe(clipPath);
    expect(result.entry.bytes).toBe(videoBytes.length);
    expect(result.entry.mediaType).toBe('video');
    expect(result.entry.durationSeconds).toBeUndefined();
    expect(result.entry.width).toBeUndefined();
    expect(result.entry.height).toBeUndefined();
    expect(result.entry.codec).toBeUndefined();
    expect(result.warnings).toEqual([
      'Could not read media details back from clip.mp4.',
    ]);
  });

  it('does not probe an image, a playlist, or a segment', async (): Promise<void> => {
    const missing = path.join(scratch, 'unused-ffprobe');
    const context = createToolContext(serverConfig({
      ffprobePath: missing,
    }));

    const image = await context.readBack(imagePath, 'image');
    const playlist = await context.readBack(playlistPath, 'playlist');
    const segment = await context.readBack(segmentPath, 'segment');

    expect(image.warnings).toEqual([]);
    expect(playlist.warnings).toEqual([]);
    expect(segment.warnings).toEqual([]);
    expect(image.entry.mediaType).toBe('image');
    expect(playlist.entry.mediaType).toBe('playlist');
    expect(segment.entry.mediaType).toBe('segment');
    expect(image.entry.codec).toBeUndefined();
    expect(playlist.entry.durationSeconds).toBeUndefined();
    expect(segment.entry.width).toBeUndefined();
    expect(existsSync(missing)).toBe(false);
  });
});
