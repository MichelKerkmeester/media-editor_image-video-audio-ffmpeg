// ───────────────────────────────────────────────────────────────────
// MODULE: Bundle Artifacts Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

import { afterAll, describe, expect, it } from 'vitest';

import {
  checkPackedBundle,
  extractBinary,
  fetchArtifact,
  findMissingNatives,
  pruneFfprobeStatic,
  runStep,
} from '../../scripts/bundle/artifacts.js';
import { MediaError } from '../../src/core/errors.js';

import type { FetchLike } from '../../scripts/bundle/artifacts.js';
import { binaryDestinations } from '../../scripts/bundle/targets.js';

import type { PinnedArtifact, PinnedBuild } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

const tempDirs: string[] = [];

function makeTempDir(label: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `media-bundle-${label}-`));
  tempDirs.push(dir);
  return dir;
}

function sha256Of(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function makeArtifact(
  archive: Buffer,
  binary: Buffer,
  overrides: Partial<PinnedArtifact> = {},
): PinnedArtifact {
  return {
    component: 'ffmpeg',
    url: 'https://example.invalid/ffmpeg.gz',
    redirectHost: null,
    bytes: archive.length,
    sha256: sha256Of(archive),
    archive: 'gzip',
    binarySha256: sha256Of(binary),
    ...overrides,
  };
}

async function captureError(action: () => Promise<unknown>): Promise<MediaError> {
  try {
    await action();
  } catch (error: unknown) {
    if (!(error instanceof MediaError)) {
      throw error;
    }
    return error;
  }
  throw new Error('The call was expected to fail.');
}

interface CountingFetch {
  calls: () => number;
  fetchImpl: FetchLike;
}

function countingFetch(body: Buffer, status = 200): CountingFetch {
  let calls = 0;
  return {
    calls: (): number => calls,
    fetchImpl: async (): Promise<Response> => {
      calls += 1;
      return new Response(new Uint8Array(body), { status });
    },
  };
}

afterAll((): void => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('runStep', (): void => {
  it('captures stdout from a successful process', async (): Promise<void> => {
    const dir = makeTempDir('stdout');
    const result = await runStep(process.execPath, ['-e', 'process.stdout.write("hi")'], {
      cwd: dir,
    });
    expect(result.stdout.toString('utf8')).toBe('hi');
    expect(result.stderrTail).toBe('');
  });

  it('reports a non-zero exit with the stderr tail', async (): Promise<void> => {
    const dir = makeTempDir('stderr');
    const script = 'process.stderr.write("boom"); process.exitCode = 3';
    const error = await captureError(() => runStep(process.execPath, ['-e', script], { cwd: dir }));
    expect(error.code).toBe('PROCESS_FAILED');
    expect(error.details).toMatchObject({ exitCode: 3, signal: null });
    expect(String(error.details.stderrTail)).toContain('boom');
  });

  it('reports a command that cannot start', async (): Promise<void> => {
    const dir = makeTempDir('missing');
    const missing = path.join(dir, 'missing-command');
    const error = await captureError(() => runStep(missing, [], { cwd: dir }));
    expect(error.code).toBe('PROCESS_FAILED');
    expect(error.details).toMatchObject({ exitCode: -1, signal: null });
  });

  it('writes stdout to a file when asked', async (): Promise<void> => {
    const dir = makeTempDir('file');
    const stdoutPath = path.join(dir, 'stdout.txt');
    const result = await runStep(process.execPath, ['-e', 'process.stdout.write("saved")'], {
      cwd: dir,
      stdoutPath,
    });
    expect(readFileSync(stdoutPath, 'utf8')).toBe('saved');
    expect(result.stdout.length).toBe(0);
  });
});

describe('fetchArtifact', (): void => {
  it('reuses a cache file with the pinned digest', async (): Promise<void> => {
    const dir = makeTempDir('cache');
    const body = Buffer.from('pinned archive');
    const artifact = makeArtifact(body, Buffer.from('binary'));
    const cachePath = path.join(dir, 'ffmpeg.gz');
    writeFileSync(cachePath, body);
    const transport = countingFetch(Buffer.from('other archive'));
    const returned = await fetchArtifact(artifact, cachePath, transport.fetchImpl);
    expect(returned).toBe(cachePath);
    expect(transport.calls()).toBe(0);
  });

  it('replaces a cache file whose digest does not match', async (): Promise<void> => {
    const dir = makeTempDir('stale');
    const body = Buffer.from('good archive');
    const artifact = makeArtifact(body, Buffer.from('binary'));
    const cachePath = path.join(dir, 'ffmpeg.gz');
    writeFileSync(cachePath, 'stale archive');
    const transport = countingFetch(body);
    const returned = await fetchArtifact(artifact, cachePath, transport.fetchImpl);
    expect(returned).toBe(cachePath);
    expect(transport.calls()).toBe(1);
    expect(readFileSync(cachePath).equals(body)).toBe(true);
  });

  it('rejects a wrong download digest and leaves no file behind', async (): Promise<void> => {
    const dir = makeTempDir('tampered');
    const body = Buffer.from('good archive');
    const artifact = makeArtifact(body, Buffer.from('binary'));
    const cachePath = path.join(dir, 'ffmpeg.gz');
    const transport = countingFetch(Buffer.from('bad archive'));
    const error = await captureError(() => fetchArtifact(artifact, cachePath, transport.fetchImpl));
    expect(error.code).toBe('CHECKSUM_MISMATCH');
    expect(error.details).toMatchObject({
      expected: artifact.sha256,
      actual: sha256Of(Buffer.from('bad archive')),
    });
    expect(existsSync(cachePath)).toBe(false);
    expect(existsSync(`${cachePath}.part`)).toBe(false);
  });

  it('reports the status of a refused download', async (): Promise<void> => {
    const dir = makeTempDir('status');
    const artifact = makeArtifact(Buffer.from('archive'), Buffer.from('binary'));
    const cachePath = path.join(dir, 'ffmpeg.gz');
    const transport = countingFetch(Buffer.from('missing'), 404);
    const error = await captureError(() => fetchArtifact(artifact, cachePath, transport.fetchImpl));
    expect(error.code).toBe('DOWNLOAD_FAILED');
    expect(error.details).toMatchObject({ httpStatus: 404 });
  });

  it('reports a transport that cannot start', async (): Promise<void> => {
    const dir = makeTempDir('network');
    const artifact = makeArtifact(Buffer.from('archive'), Buffer.from('binary'));
    const cachePath = path.join(dir, 'ffmpeg.gz');
    const fetchImpl: FetchLike = async (): Promise<Response> => {
      throw new Error('offline');
    };
    const error = await captureError(() => fetchArtifact(artifact, cachePath, fetchImpl));
    expect(error.code).toBe('DOWNLOAD_FAILED');
    expect(error.details).toMatchObject({ reason: 'network', httpStatus: null });
  });

  it('reports a body that is over its pinned size', async (): Promise<void> => {
    const dir = makeTempDir('oversize');
    const body = Buffer.from('one byte over the pin');
    const artifact = makeArtifact(body, Buffer.from('binary'), { bytes: body.length - 1 });
    const cachePath = path.join(dir, 'ffmpeg.gz');
    const transport = countingFetch(body);
    const error = await captureError(() => fetchArtifact(artifact, cachePath, transport.fetchImpl));
    expect(error.code).toBe('DOWNLOAD_FAILED');
    expect(error.details).toMatchObject({ reason: 'size-exceeded', url: artifact.url });
  });
});

describe('extractBinary gzip', (): void => {
  it('unpacks the archive to the destination and marks it executable', async (): Promise<void> => {
    const dir = makeTempDir('gzip');
    const binary = Buffer.from('#!/bin/sh\necho hi\n');
    const archive = gzipSync(binary);
    const archivePath = path.join(dir, 'ffmpeg.gz');
    writeFileSync(archivePath, archive);
    const artifact = makeArtifact(archive, binary);
    const destination = path.join(dir, 'out', 'ffmpeg');
    await extractBinary(archivePath, artifact, destination);
    expect(readFileSync(destination).equals(binary)).toBe(true);
    if (process.platform !== 'win32') {
      expect(statSync(destination).mode & 0o100).not.toBe(0);
    }
  });

  it('rejects a wrong binary digest and leaves no file behind', async (): Promise<void> => {
    const dir = makeTempDir('binary');
    const binary = Buffer.from('binary');
    const archive = gzipSync(binary);
    const archivePath = path.join(dir, 'ffmpeg.gz');
    writeFileSync(archivePath, archive);
    const artifact = makeArtifact(archive, Buffer.from('other binary'));
    const destination = path.join(dir, 'out', 'ffmpeg');
    const error = await captureError(() => extractBinary(archivePath, artifact, destination));
    expect(error.code).toBe('CHECKSUM_MISMATCH');
    expect(error.details).toMatchObject({
      expected: artifact.binarySha256,
      actual: sha256Of(binary),
    });
    expect(existsSync(destination)).toBe(false);
    expect(existsSync(`${destination}.part`)).toBe(false);
  });
});

describe.skipIf(!existsSync('/usr/bin/zip'))('extractBinary zip', (): void => {
  function makeZip(dir: string, names: readonly string[]): string {
    const sources: string[] = [];
    for (const name of names) {
      const source = path.join(dir, name);
      writeFileSync(source, `entry ${name}`);
      sources.push(source);
    }
    const archive = path.join(dir, 'archive.zip');
    const result = spawnSync('/usr/bin/zip', ['-j', '-q', archive, ...sources]);
    expect(result.status).toBe(0);
    return archive;
  }

  it('extracts the one entry the pin names', async (): Promise<void> => {
    const dir = makeTempDir('zip');
    const binary = Buffer.from('entry ffmpeg');
    const archivePath = makeZip(dir, ['ffmpeg']);
    const artifact = makeArtifact(readFileSync(archivePath), binary, {
      archive: 'zip',
      entry: 'ffmpeg',
    });
    const destination = path.join(dir, 'out', 'ffmpeg');
    await extractBinary(archivePath, artifact, destination);
    expect(readFileSync(destination).equals(binary)).toBe(true);
  });

  it('refuses an archive that holds more than one entry', async (): Promise<void> => {
    const dir = makeTempDir('zip-many');
    const archivePath = makeZip(dir, ['ffmpeg', 'ffprobe']);
    const artifact = makeArtifact(readFileSync(archivePath), Buffer.from('entry ffmpeg'), {
      archive: 'zip',
      entry: 'ffmpeg',
    });
    const destination = path.join(dir, 'out', 'ffmpeg');
    const error = await captureError(() => extractBinary(archivePath, artifact, destination));
    expect(error.code).toBe('DOWNLOAD_FAILED');
    expect(error.details).toMatchObject({ reason: 'archive-entries' });
  });

  it('refuses an archive whose one entry has another name', async (): Promise<void> => {
    const dir = makeTempDir('zip-name');
    const archivePath = makeZip(dir, ['other']);
    const artifact = makeArtifact(readFileSync(archivePath), Buffer.from('entry other'), {
      archive: 'zip',
      entry: 'ffmpeg',
    });
    const destination = path.join(dir, 'out', 'ffmpeg');
    const error = await captureError(() => extractBinary(archivePath, artifact, destination));
    expect(error.code).toBe('DOWNLOAD_FAILED');
    expect(error.details).toMatchObject({ reason: 'archive-entries' });
  });
});

describe('pruneFfprobeStatic', (): void => {
  it('keeps only the target pair and lists every removed path', (): void => {
    const stage = makeTempDir('prune');
    const bin = path.join(stage, 'node_modules', 'ffprobe-static', 'bin');
    const fixture = [
      'darwin/x64/ffprobe',
      'darwin/arm64/ffprobe',
      'linux/x64/ffprobe',
      'linux/ia32/ffprobe',
      'win32/x64/ffprobe.exe',
      'linux/arm64/ffprobe',
    ];
    for (const relative of fixture) {
      const file = path.join(bin, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, 'binary');
    }
    const removed = pruneFfprobeStatic(stage, 'linux-arm64');
    expect(removed).toEqual(['darwin', 'linux/ia32', 'linux/x64', 'win32']);
    expect(existsSync(path.join(bin, 'linux', 'arm64', 'ffprobe'))).toBe(true);
    expect(existsSync(path.join(bin, 'darwin'))).toBe(false);
    expect(existsSync(path.join(bin, 'linux', 'x64'))).toBe(false);
    expect(existsSync(path.join(bin, 'win32'))).toBe(false);
  });

  it('returns nothing when the package is not staged', (): void => {
    const stage = makeTempDir('prune-empty');
    expect(pruneFfprobeStatic(stage, 'linux-arm64')).toEqual([]);
  });
});

describe('findMissingNatives', (): void => {
  function stageFiles(name: string, files: readonly string[]): string {
    const stage = makeTempDir(name);
    for (const relative of files) {
      const file = path.join(stage, 'node_modules', '@img', relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, 'binary');
    }
    return stage;
  }

  it('accepts libvips in its own package or beside the sharp module', (): void => {
    const split = stageFiles('natives-split', [
      'sharp-darwin-arm64/lib/sharp-darwin-arm64-0.35.5.node',
      'sharp-libvips-darwin-arm64/lib/libvips-cpp.8.18.7.dylib',
    ]);
    const combined = stageFiles('natives-combined', [
      'sharp-win32-x64/lib/sharp-win32-x64-0.35.5.node',
      'sharp-win32-x64/lib/libvips-cpp-8.18.7.dll',
    ]);
    expect(findMissingNatives(split, 'darwin-arm64')).toEqual([]);
    expect(findMissingNatives(combined, 'win32-x64')).toEqual([]);
  });

  it('names the package of each part the install left out', (): void => {
    const noModule = stageFiles('natives-no-module', [
      'sharp-libvips-linux-x64/lib/libvips-cpp.so.8.18.7',
    ]);
    const otherArch = stageFiles('natives-other-arch', [
      'sharp-linux-arm64/lib/sharp-linux-arm64-0.35.5.node',
      'sharp-libvips-linux-arm64/lib/libvips-cpp.so.8.18.7',
    ]);
    expect(findMissingNatives(noModule, 'linux-x64')).toEqual([
      '@img/sharp-linux-x64 holds no sharp-linux-x64 native module.',
    ]);
    const missing = findMissingNatives(otherArch, 'linux-x64');
    expect(missing).toHaveLength(2);
    expect(missing[1]).toContain('@img/sharp-libvips-linux-x64');
  });
});

describe.skipIf(!existsSync('/usr/bin/zip'))('checkPackedBundle', (): void => {
  const destinations = binaryDestinations('linux-x64');
  const ffmpegBytes = Buffer.from('packed ffmpeg');
  const ffprobeBytes = Buffer.from('packed ffprobe');

  function packedBuild(): PinnedBuild {
    const archive = Buffer.from('archive');
    return {
      platform: 'linux-x64',
      version: '0.0.0-test',
      licence: 'GPL-3.0-or-later',
      builder: 'Test Builder',
      buildPage: 'https://example.invalid/',
      release: 'test',
      sourceUrls: ['https://example.invalid/source.tar.xz'],
      artifacts: {
        ffmpeg: makeArtifact(archive, ffmpegBytes),
        ffprobe: { ...makeArtifact(archive, ffprobeBytes), component: 'ffprobe' },
      },
    };
  }

  function packBundle(name: string, files: Readonly<Record<string, Buffer>>): string {
    const root = makeTempDir(name);
    const content = path.join(root, 'content');
    for (const [relative, bytes] of Object.entries(files)) {
      const file = path.join(content, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, bytes);
    }
    const bundle = path.join(root, 'bundle.mcpb');
    const result = spawnSync('/usr/bin/zip', ['-r', '-q', bundle, '.'], { cwd: content });
    expect(result.status).toBe(0);
    return bundle;
  }

  const ownFiles: Readonly<Record<string, Buffer>> = {
    [destinations.ffmpeg]: ffmpegBytes,
    [destinations.ffprobe]: ffprobeBytes,
    'node_modules/@img/sharp-linux-x64/package.json': Buffer.from('{}'),
    'node_modules/@img/colour/package.json': Buffer.from('{}'),
  };

  it('accepts a bundle that matches its build and removes its work folder', async () => {
    const bundle = packBundle('packed-good', ownFiles);
    const workDir = path.join(path.dirname(bundle), 'verify');
    await expect(checkPackedBundle(bundle, packedBuild(), destinations, workDir))
      .resolves.toEqual([]);
    expect(existsSync(workDir)).toBe(false);
  });

  it('names a sharp package built for another platform', async (): Promise<void> => {
    const bundle = packBundle('packed-foreign', {
      ...ownFiles,
      'node_modules/@img/sharp-win32-x64/package.json': Buffer.from('{}'),
    });
    const workDir = path.join(path.dirname(bundle), 'verify');
    await expect(checkPackedBundle(bundle, packedBuild(), destinations, workDir))
      .resolves.toEqual(['@img/sharp-win32-x64 is not built for linux-x64.']);
  });

  it('names a packed binary that differs from its pin', async (): Promise<void> => {
    const bundle = packBundle('packed-swapped', {
      ...ownFiles,
      [destinations.ffprobe]: Buffer.from('swapped ffprobe'),
    });
    const workDir = path.join(path.dirname(bundle), 'verify');
    await expect(checkPackedBundle(bundle, packedBuild(), destinations, workDir))
      .resolves.toEqual(['The packed ffprobe does not match its pinned digest.']);
  });
});
