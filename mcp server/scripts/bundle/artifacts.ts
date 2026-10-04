// ───────────────────────────────────────────────────────────────────
// MODULE: Bundle Artifacts
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import {
  chmodSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import { gunzipSync } from 'node:zlib';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { platformParts } from '../../src/core/pinned-builds.js';

import type {
  PinnedArtifact,
  PinnedBuild,
  PinnedComponent,
  PlatformKey,
} from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The captured output of one finished child process. */
export interface StepResult {
  /** Everything the process wrote to stdout; empty when stdout went to a file. */
  readonly stdout: Buffer;

  /** The last bytes of stderr, as text, for a failure report. */
  readonly stderrTail: string;
}

/** Fetches one URL, so a test can hand in its own transport. */
export type FetchLike = (url: string) => Promise<Response>;

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

/** How much of a failed process's stderr the build keeps for its report. */
const STDERR_TAIL_BYTES = 4096;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function processFailure(
  command: string,
  exitCode: number,
  signal: NodeJS.Signals | null,
  stderrTail: string,
): MediaError {
  const binary = path.basename(command);
  return new MediaError(ERROR_CODES.PROCESS_FAILED, `The ${binary} process failed.`, {
    binary,
    exitCode,
    signal,
    stderrTail,
  });
}

async function requestArtifact(url: string, fetchImpl: FetchLike | undefined): Promise<Response> {
  const send: FetchLike = fetchImpl ?? fetch;
  try {
    return await send(url);
  } catch {
    throw new MediaError(ERROR_CODES.DOWNLOAD_FAILED, 'The download could not be started.', {
      url,
      httpStatus: null,
      reason: 'network',
    });
  }
}

async function storeDownload(
  artifact: PinnedArtifact,
  response: Response,
  partPath: string,
): Promise<string> {
  const body = response.body;
  if (body === null) {
    throw new MediaError(ERROR_CODES.DOWNLOAD_FAILED, 'The download carried no body.', {
      url: artifact.url,
      httpStatus: response.status,
      reason: 'network',
    });
  }
  const hash = createHash('sha256');
  const file = createWriteStream(partPath);
  const reader = body.getReader();
  let written = 0;
  try {
    let chunk = await reader.read();
    while (chunk.done === false) {
      written += chunk.value.length;
      if (written > artifact.bytes) {
        throw new MediaError(
          ERROR_CODES.DOWNLOAD_FAILED,
          'The download is over its pinned size.',
          { url: artifact.url, reason: 'size-exceeded' },
        );
      }
      hash.update(chunk.value);
      if (!file.write(chunk.value)) {
        await once(file, 'drain');
      }
      chunk = await reader.read();
    }
    file.end();
    await finished(file);
  } catch (error: unknown) {
    file.destroy();
    if (error instanceof MediaError) {
      throw error;
    }
    throw new MediaError(ERROR_CODES.DOWNLOAD_FAILED, 'The download stopped before it finished.', {
      url: artifact.url,
      httpStatus: null,
      reason: 'network',
    });
  }
  return hash.digest('hex');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Runs one child process without a shell and captures what it wrote.
 *
 * The build starts only npm and unzip, and both receive an argument list that
 * no shell ever parses, so the command name and each argument stay one token.
 *
 * @param command - The executable to start
 * @param args - The exact arguments to pass to it
 * @param options - The working directory, an optional environment, and an optional stdout file
 * @returns The captured stdout and the tail of stderr
 * @throws {@link MediaError} `PROCESS_FAILED` when the process fails to start, exits non-zero,
 *   or dies from a signal
 */
export async function runStep(
  command: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env?: NodeJS.ProcessEnv; readonly stdoutPath?: string },
): Promise<StepResult> {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdoutChunks: Buffer[] = [];
  if (options.stdoutPath === undefined) {
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });
  }
  let stderr = Buffer.alloc(0);
  child.stderr.on('data', (chunk: Buffer) => {
    stderr = Buffer.concat([stderr, chunk]);
    if (stderr.length > STDERR_TAIL_BYTES) {
      stderr = stderr.subarray(stderr.length - STDERR_TAIL_BYTES);
    }
  });
  const stdoutStream =
    options.stdoutPath === undefined ? undefined : createWriteStream(options.stdoutPath);
  const streamFinished = stdoutStream === undefined ? Promise.resolve() : finished(stdoutStream);
  if (stdoutStream !== undefined) {
    child.stdout.pipe(stdoutStream);
  }
  const closed = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve, reject) => {
      child.on('error', () => {
        reject(processFailure(command, -1, null, stderr.toString('utf8')));
      });
      child.on('close', (code, signal) => {
        resolve({ code, signal });
      });
    },
  );
  try {
    const { code, signal } = await closed;
    if (code !== 0 || signal !== null) {
      throw processFailure(command, code ?? -1, signal, stderr.toString('utf8'));
    }
    await streamFinished;
  } catch (error: unknown) {
    stdoutStream?.destroy();
    if (error instanceof MediaError) {
      throw error;
    }
    throw processFailure(command, 0, null, stderr.toString('utf8'));
  }
  return { stdout: Buffer.concat(stdoutChunks), stderrTail: stderr.toString('utf8') };
}

/**
 * Hashes one file without reading it into memory.
 *
 * @param filePath - The file to read
 * @returns The SHA-256 digest of its bytes, lowercase hex
 * @throws The filesystem error from the read stream, for example ENOENT
 */
export async function sha256File(filePath: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk: string | Buffer) => {
      hash.update(chunk);
    });
    stream.on('error', (error: Error) => {
      reject(error);
    });
    stream.on('end', () => {
      resolve(hash.digest('hex'));
    });
  });
}

/**
 * Downloads one pinned artifact into a cache and checks it against its digest.
 *
 * A cached file with the pinned digest is reused without touching the network.
 * A fresh download lands in a part file first, so a failure never leaves a
 * half-written file under the final name.
 *
 * @param artifact - The pinned download to fetch
 * @param cachePath - Where the verified archive should live
 * @param fetchImpl - An alternative transport; the global fetch is the default
 * @returns The path of the verified archive
 * @throws {@link MediaError} `DOWNLOAD_FAILED` for a transport, status, or size failure, and
 *   `CHECKSUM_MISMATCH` when the bytes do not match the pinned digest
 */
export async function fetchArtifact(
  artifact: PinnedArtifact,
  cachePath: string,
  fetchImpl?: FetchLike,
): Promise<string> {
  if (existsSync(cachePath) && (await sha256File(cachePath)) === artifact.sha256) {
    return cachePath;
  }
  mkdirSync(path.dirname(cachePath), { recursive: true });
  const partPath = `${cachePath}.part`;
  try {
    const response = await requestArtifact(artifact.url, fetchImpl);
    if (response.status !== 200) {
      throw new MediaError(
        ERROR_CODES.DOWNLOAD_FAILED,
        `The download answered with status ${response.status}.`,
        { url: artifact.url, httpStatus: response.status, reason: 'http-status' },
      );
    }
    const actual = await storeDownload(artifact, response, partPath);
    if (actual !== artifact.sha256) {
      throw new MediaError(
        ERROR_CODES.CHECKSUM_MISMATCH,
        'The download did not match its digest.',
        { expected: artifact.sha256, actual, url: artifact.url },
      );
    }
    renameSync(partPath, cachePath);
    return cachePath;
  } catch (error: unknown) {
    rmSync(partPath, { force: true });
    throw error;
  }
}

/**
 * Unpacks one pinned archive into a file and checks the binary against its digest.
 *
 * The archive is checked in two places: its name list for a zip, so a
 * multi-entry archive never yields a surprise binary, and the unpacked bytes
 * for both formats, so the pinned download and the pinned binary agree.
 *
 * @param archivePath - The verified archive to unpack
 * @param artifact - The pin that names the archive format and the one entry
 * @param destination - Where the executable should live
 * @throws {@link MediaError} `DOWNLOAD_FAILED` for an archive that does not unpack, and
 *   `CHECKSUM_MISMATCH` when the unpacked bytes do not match the pinned digest
 * @throws The filesystem error from writing or renaming the file
 */
export async function extractBinary(
  archivePath: string,
  artifact: PinnedArtifact,
  destination: string,
): Promise<void> {
  mkdirSync(path.dirname(destination), { recursive: true });
  const partPath = `${destination}.part`;
  try {
    if (artifact.archive === 'gzip') {
      let unpacked: Buffer;
      try {
        unpacked = gunzipSync(readFileSync(archivePath));
      } catch {
        throw new MediaError(ERROR_CODES.DOWNLOAD_FAILED, 'The archive did not unpack.', {
          url: artifact.url,
          httpStatus: null,
          reason: 'archive-broken',
        });
      }
      writeFileSync(partPath, unpacked);
    } else {
      const cwd = path.dirname(archivePath);
      const entry = artifact.entry;
      const listing = await runStep('unzip', ['-Z1', archivePath], { cwd });
      const entries = listing.stdout.toString('utf8').split('\n').filter((line) => line.length > 0);
      if (entry === undefined || entries.length !== 1 || entries[0] !== entry) {
        throw new MediaError(
          ERROR_CODES.DOWNLOAD_FAILED,
          'The archive holds an unexpected entry list.',
          { url: artifact.url, httpStatus: null, reason: 'archive-entries', entries },
        );
      }
      await runStep('unzip', ['-p', archivePath, entry], { cwd, stdoutPath: partPath });
    }
    const actual = await sha256File(partPath);
    if (actual !== artifact.binarySha256) {
      throw new MediaError(
        ERROR_CODES.CHECKSUM_MISMATCH,
        'The unpacked binary did not match its digest.',
        { expected: artifact.binarySha256, actual, url: artifact.url },
      );
    }
    renameSync(partPath, destination);
    chmodSync(destination, 0o755);
  } catch (error: unknown) {
    rmSync(partPath, { force: true });
    throw error;
  }
}

/**
 * Removes every ffprobe-static platform and arch folder this target cannot use.
 *
 * The package ships binaries for every platform, and the extension format
 * counts all of them against its size limit, so a staged bundle keeps only
 * the pair the target runs on.
 *
 * @param stage - The staged bundle root that holds node_modules
 * @param key - The target whose platform and architecture survive
 * @returns The removed paths, relative to the package's bin folder, sorted
 * @throws The filesystem error from a listing or a removal
 */
export function pruneFfprobeStatic(stage: string, key: PlatformKey): string[] {
  const binDirectory = path.join(stage, 'node_modules', 'ffprobe-static', 'bin');
  if (!existsSync(binDirectory)) {
    return [];
  }
  const { platform, arch } = platformParts(key);
  const removed: string[] = [];
  for (const entry of readdirSync(binDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (entry.name !== platform) {
      rmSync(path.join(binDirectory, entry.name), { recursive: true, force: true });
      removed.push(entry.name);
      continue;
    }
    const platformDirectory = path.join(binDirectory, entry.name);
    for (const nested of readdirSync(platformDirectory, { withFileTypes: true })) {
      if (nested.isDirectory() && nested.name !== arch) {
        rmSync(path.join(platformDirectory, nested.name), { recursive: true, force: true });
        removed.push(`${platform}/${nested.name}`);
      }
    }
  }
  return removed.sort();
}

/**
 * Names each native part of sharp that the install left out of a staged bundle.
 *
 * npm skips an optional platform package without failing, so a stage can lack
 * the sharp module or the libvips library while every other step succeeds.
 *
 * @param stage - The staged bundle root that holds node_modules
 * @param key - The target whose sharp packages must be present
 * @returns One sentence per missing part, naming its package; empty when both are present
 */
export function findMissingNatives(stage: string, key: PlatformKey): string[] {
  const imgFolder = path.join(stage, 'node_modules', '@img');
  const sharpPackage = `sharp-${key}`;
  const libvipsPackage = `sharp-libvips-${key}`;
  const libFiles = (name: string): string[] => {
    const folder = path.join(imgFolder, name, 'lib');
    return existsSync(folder) ? readdirSync(folder) : [];
  };
  const missing: string[] = [];
  const moduleName = new RegExp(`^${sharpPackage}(-[0-9.]+)?\\.node$`);
  if (!libFiles(sharpPackage).some((file) => moduleName.test(file))) {
    missing.push(`@img/${sharpPackage} holds no ${sharpPackage} native module.`);
  }
  const libraryName = /^libvips-cpp[^/]*\.(dylib|so[.0-9]*|dll)$/;
  const libraries = [...libFiles(sharpPackage), ...libFiles(libvipsPackage)];
  if (!libraries.some((file) => libraryName.test(file))) {
    missing.push(`Neither @img/${sharpPackage} nor @img/${libvipsPackage} holds libvips.`);
  }
  return missing;
}

/**
 * Re-reads a packed bundle and names each way it differs from its pinned build.
 *
 * The notices check reads the stage, and the stage can change before the pack
 * reads it, so the packed file itself is checked: both binaries are hashed
 * again and every sharp package must belong to the bundle's own platform.
 *
 * @param bundlePath - The packed bundle file
 * @param build - The pinned build the bundle carries
 * @param destinations - Where each binary sits inside the bundle
 * @param workDir - A folder for the extracted binaries, removed before this returns
 * @returns One sentence per difference; empty when the bundle matches its build
 * @throws {@link MediaError} `PROCESS_FAILED` when unzip cannot list or read the bundle
 */
export async function checkPackedBundle(
  bundlePath: string,
  build: PinnedBuild,
  destinations: Readonly<Record<PinnedComponent, string>>,
  workDir: string,
): Promise<string[]> {
  const cwd = path.dirname(bundlePath);
  const listing = await runStep('unzip', ['-Z1', bundlePath], { cwd });
  const entries = listing.stdout.toString('utf8').split('\n').filter((line) => line.length > 0);
  const foreign = new Set<string>();
  for (const entry of entries) {
    const [top, scope, name] = entry.split('/');
    if (top === 'node_modules' && scope === '@img' && name !== undefined && name.length > 0) {
      if (name !== 'colour' && !name.endsWith(`-${build.platform}`)) {
        foreign.add(name);
      }
    }
  }
  const problems = [...foreign].sort().map((name) => {
    return `@img/${name} is not built for ${build.platform}.`;
  });
  mkdirSync(workDir, { recursive: true });
  try {
    for (const component of ['ffmpeg', 'ffprobe'] as const) {
      const entry = destinations[component];
      if (!entries.includes(entry)) {
        problems.push(`The packed ${component} is missing at ${entry}.`);
        continue;
      }
      const extracted = path.join(workDir, component);
      await runStep('unzip', ['-p', bundlePath, entry], { cwd, stdoutPath: extracted });
      if ((await sha256File(extracted)) !== build.artifacts[component].binarySha256) {
        problems.push(`The packed ${component} does not match its pinned digest.`);
      }
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
  return problems;
}
