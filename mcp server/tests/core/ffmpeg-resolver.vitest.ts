// ───────────────────────────────────────────────────────────────────
// MODULE: FFmpeg Resolver Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import ffmpegStatic from 'ffmpeg-static';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { ServerConfig } from '../../src/core/config.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import {
  PINNED_BINARY_SHA256,
  invalidateBinary,
  lookupBinary,
  resetResolverCache,
  resolveBinary,
} from '../../src/core/ffmpeg-resolver.js';
import { PINNED_BUILDS, PLATFORM_KEYS } from '../../src/core/pinned-builds.js';

import type {
  BinaryFileInfo,
  BinaryName,
  InstallRecord,
  ResolverDeps,
} from '../../src/core/ffmpeg-resolver.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface ScriptedFile {
  readonly isFile: boolean;
  readonly size: number;
  readonly mtimeMs: number;
  readonly isExecutable: boolean;
  readonly version: string | undefined;
}

interface DepCalls {
  bundled: number;
  files: string[];
  probes: string[];
  hashes: number;
}

interface Script {
  readonly platform?: NodeJS.Platform;
  readonly arch?: string;
  readonly pathEnv?: string;
  readonly bundled?: string | null;
  readonly files?: Readonly<Record<string, ScriptedFile>>;
  readonly pinned?: ResolverDeps['pinned'];
  readonly install?: InstallRecord;
  readonly hash?: string;
  readonly probeErrorAt?: string;
}

interface OverrideCase {
  readonly label: string;
  readonly overridePath: string;
  readonly reason: string;
  readonly files: Readonly<Record<string, ScriptedFile>>;
  readonly probes: number;
  readonly readsFiles: boolean;
}

interface LiveInstall {
  readonly config: BinaryConfig;
  readonly deps: ResolverDeps;
  readonly binaryPath: string;
  probes: number;
  hashes: number;
  present: boolean;
  size: number;
  mtimeMs: number;
}

type BinaryConfig = Pick<ServerConfig, 'ffmpegPath' | 'ffprobePath' | 'dataDir'>;

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-resolver-'));
const FFMPEG_VERSION = 'ffmpeg version 6.0';
const FFPROBE_VERSION = 'ffprobe version 6.0';
const DATA_DIR = path.join('/var', 'media-editor');
const BUNDLED = path.join('/opt', 'bundled', 'ffmpeg');
const PATH_DIR = path.join('/usr', 'bin');
const PATH_FILE = path.join(PATH_DIR, 'ffmpeg');
const DIGEST = 'abc';

const OVERRIDE_CASES: readonly OverrideCase[] = [
  {
    label: 'missing',
    overridePath: path.join('/opt', 'missing', 'ffmpeg'),
    reason: 'does not exist',
    files: {},
    probes: 0,
    readsFiles: true,
  },
  {
    label: 'a directory',
    overridePath: path.join('/opt', 'dir'),
    reason: 'is not a regular file',
    files: {
      [path.join('/opt', 'dir')]: presentFile(FFMPEG_VERSION, { isFile: false }),
    },
    probes: 0,
    readsFiles: true,
  },
  {
    label: 'not executable',
    overridePath: path.join('/opt', 'locked', 'ffmpeg'),
    reason: 'is not executable',
    files: {
      [path.join('/opt', 'locked', 'ffmpeg')]: presentFile(
        FFMPEG_VERSION,
        { isExecutable: false },
      ),
    },
    probes: 0,
    readsFiles: true,
  },
  {
    label: 'unable to report a version',
    overridePath: path.join('/opt', 'bad', 'ffmpeg'),
    reason: 'did not answer -version',
    files: {
      [path.join('/opt', 'bad', 'ffmpeg')]: presentFile('hello'),
    },
    probes: 1,
    readsFiles: true,
  },
  {
    label: 'relative',
    overridePath: 'ffmpeg',
    reason: 'is not absolute',
    files: {
      ffmpeg: presentFile(FFMPEG_VERSION),
    },
    probes: 0,
    readsFiles: false,
  },
];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

function presentFile(
  version: string | undefined,
  overrides?: Partial<ScriptedFile>,
): ScriptedFile {
  return {
    isFile: true,
    size: 10,
    mtimeMs: 20,
    isExecutable: true,
    version,
    ...overrides,
  };
}

function calls(): DepCalls {
  return { bundled: 0, files: [], probes: [], hashes: 0 };
}

function binaryConfig(overrides?: Partial<BinaryConfig>): BinaryConfig {
  return {
    ffmpegPath: undefined,
    ffprobePath: undefined,
    dataDir: DATA_DIR,
    ...overrides,
  };
}

function scriptDeps(script: Script, counters?: DepCalls): ResolverDeps {
  const files = script.files ?? {};
  const deps: ResolverDeps = {
    platform: script.platform ?? 'linux',
    arch: script.arch ?? 'x64',
    pathEnv: script.pathEnv ?? '',
    bundledPath: (): string | null => {
      if (counters !== undefined) {
        counters.bundled += 1;
      }
      return script.bundled ?? null;
    },
    fileInfo: (binaryPath: string): BinaryFileInfo | undefined => {
      counters?.files.push(binaryPath);
      const found = files[binaryPath];
      if (found === undefined) {
        return undefined;
      }
      return { isFile: found.isFile, size: found.size, mtimeMs: found.mtimeMs };
    },
    isExecutable: (binaryPath: string): boolean => files[binaryPath]?.isExecutable ?? false,
    probeVersion: (binaryPath: string): string | undefined => {
      counters?.probes.push(binaryPath);
      if (script.probeErrorAt === binaryPath) {
        throw new Error('ENOEXEC');
      }
      return files[binaryPath]?.version;
    },
    hashFile: (): string => {
      if (counters !== undefined) {
        counters.hashes += 1;
      }
      return script.hash ?? '';
    },
    readInstallRecord: (): InstallRecord | undefined => script.install,
  };
  if (script.pinned !== undefined) {
    return { ...deps, pinned: script.pinned };
  }
  return deps;
}

function installedPath(): string {
  return path.join(DATA_DIR, 'bin', 'ffmpeg');
}

function pinTable(sha: string): NonNullable<ResolverDeps['pinned']> {
  return { 'linux-x64': { ffmpeg: sha } };
}

function installRecord(sha: string): InstallRecord {
  return {
    platform: 'linux-x64',
    binaries: { ffmpeg: { fileName: 'ffmpeg', sha256: sha } },
  };
}

function liveInstall(): LiveInstall {
  const binaryPath = installedPath();
  const state = {
    probes: 0,
    hashes: 0,
    present: true,
    size: 10,
    mtimeMs: 20,
  };
  const deps: ResolverDeps = {
    platform: 'linux',
    arch: 'x64',
    pathEnv: '',
    bundledPath: (): null => null,
    fileInfo: (candidate: string): BinaryFileInfo | undefined => {
      if (candidate !== binaryPath || !state.present) {
        return undefined;
      }
      return { isFile: true, size: state.size, mtimeMs: state.mtimeMs };
    },
    isExecutable: (): boolean => true,
    probeVersion: (): string => {
      state.probes += 1;
      return FFMPEG_VERSION;
    },
    hashFile: (): string => {
      state.hashes += 1;
      return DIGEST;
    },
    readInstallRecord: (): InstallRecord => installRecord(DIGEST),
    pinned: pinTable(DIGEST),
  };
  return {
    config: binaryConfig(),
    deps,
    binaryPath,
    get probes(): number {
      return state.probes;
    },
    set probes(value: number) {
      state.probes = value;
    },
    get hashes(): number {
      return state.hashes;
    },
    set hashes(value: number) {
      state.hashes = value;
    },
    get present(): boolean {
      return state.present;
    },
    set present(value: boolean) {
      state.present = value;
    },
    get size(): number {
      return state.size;
    },
    set size(value: number) {
      state.size = value;
    },
    get mtimeMs(): number {
      return state.mtimeMs;
    },
    set mtimeMs(value: number) {
      state.mtimeMs = value;
    },
  };
}

async function expectMissing(
  name: BinaryName,
  config: BinaryConfig,
  deps?: ResolverDeps,
): Promise<MediaError> {
  try {
    await resolveBinary(name, config, deps);
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(MediaError);
    if (error instanceof MediaError) {
      return error;
    }
  }
  throw new Error('expected the lookup to fail');
}

function lookedInOf(error: MediaError): string[] {
  const lookedIn = error.details.lookedIn;
  if (!Array.isArray(lookedIn)) {
    return [];
  }
  return lookedIn.filter((entry: unknown): entry is string => typeof entry === 'string');
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('ffmpeg resolver', (): void => {
  beforeEach((): void => {
    resetResolverCache();
  });

  it('pins each platform to the binaries of its pinned build', (): void => {
    expect(Object.keys(PINNED_BINARY_SHA256)).toEqual([...PLATFORM_KEYS]);
    for (const key of PLATFORM_KEYS) {
      const { ffmpeg, ffprobe } = PINNED_BUILDS[key].artifacts;
      expect(PINNED_BINARY_SHA256[key]).toEqual({
        ffmpeg: ffmpeg.binarySha256,
        ffprobe: ffprobe.binarySha256,
      });
      expect(Object.isFrozen(PINNED_BINARY_SHA256[key])).toBe(true);
    }
    expect(Object.isFrozen(PINNED_BINARY_SHA256)).toBe(true);
  });

  it('accepts an absolute override and keeps the first version line', async (): Promise<void> => {
    const overridePath = path.join('/opt', 'override', 'ffmpeg');
    const binary = await resolveBinary('ffmpeg', binaryConfig({
      ffmpegPath: `  ${overridePath}  `,
    }), scriptDeps({
      bundled: BUNDLED,
      files: {
        [overridePath]: presentFile(`${FFMPEG_VERSION}\nconfiguration: gpl\n`),
        [BUNDLED]: presentFile(FFMPEG_VERSION),
      },
    }));

    expect(binary.source).toBe('env-override');
    expect(binary.path).toBe(overridePath);
    expect(binary.name).toBe('ffmpeg');
    expect(binary.version).toBe(FFMPEG_VERSION);
  });

  it('accepts the bundled export when the override is unset', async (): Promise<void> => {
    const binary = await resolveBinary('ffprobe', binaryConfig(), scriptDeps({
      bundled: path.join('/opt', 'bundled', 'ffprobe'),
      files: {
        [path.join('/opt', 'bundled', 'ffprobe')]: presentFile(FFPROBE_VERSION),
      },
    }));

    expect(binary.source).toBe('bundled');
    expect(binary.name).toBe('ffprobe');
    expect(binary.version).toBe(FFPROBE_VERSION);
  });

  it('accepts the first usable PATH entry', async (): Promise<void> => {
    const firstDir = path.join('/opt', 'first');
    const secondDir = path.join('/opt', 'second');
    const skipped = path.join(firstDir, 'ffmpeg');
    const chosen = path.join(secondDir, 'ffmpeg');
    const binary = await resolveBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      pathEnv: [firstDir, secondDir].join(path.delimiter),
      files: {
        [skipped]: presentFile(FFMPEG_VERSION, { isExecutable: false }),
        [chosen]: presentFile(FFMPEG_VERSION),
      },
    }));

    expect(binary.source).toBe('system-path');
    expect(binary.path).toBe(chosen);
    expect(binary.version).toBe(FFMPEG_VERSION);
  });

  it('accepts an installed binary when the pin and the record match', async (): Promise<void> => {
    const counters = calls();
    const binary = await resolveBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      hash: DIGEST,
      pinned: pinTable(DIGEST),
      install: installRecord(DIGEST),
      files: { [installedPath()]: presentFile(FFMPEG_VERSION) },
    }, counters));

    expect(binary.source).toBe('installed');
    expect(binary.path).toBe(installedPath());
    expect(binary.version).toBe(FFMPEG_VERSION);
    expect(counters.hashes).toBe(1);
    expect(counters.probes).toEqual([installedPath()]);
  });

  it('prefers an override over a bundled binary', async (): Promise<void> => {
    const overridePath = path.join('/opt', 'override', 'ffmpeg');
    const counters = calls();
    const binary = await resolveBinary('ffmpeg', binaryConfig({
      ffmpegPath: overridePath,
    }), scriptDeps({
      bundled: BUNDLED,
      files: {
        [overridePath]: presentFile(FFMPEG_VERSION),
        [BUNDLED]: presentFile(FFMPEG_VERSION),
      },
    }, counters));

    expect(binary.source).toBe('env-override');
    expect(counters.bundled).toBe(0);
    expect(counters.probes).toEqual([overridePath]);
  });

  it('prefers a bundled binary over PATH', async (): Promise<void> => {
    const counters = calls();
    const binary = await resolveBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: BUNDLED,
      pathEnv: PATH_DIR,
      files: {
        [BUNDLED]: presentFile(FFMPEG_VERSION),
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
      },
    }, counters));

    expect(binary.source).toBe('bundled');
    expect(counters.files).not.toContain(PATH_FILE);
  });

  it('prefers PATH over an installed binary', async (): Promise<void> => {
    const counters = calls();
    const binary = await resolveBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      pathEnv: PATH_DIR,
      hash: DIGEST,
      pinned: pinTable(DIGEST),
      install: installRecord(DIGEST),
      files: {
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
        [installedPath()]: presentFile(FFMPEG_VERSION),
      },
    }, counters));

    expect(binary.source).toBe('system-path');
    expect(binary.path).toBe(PATH_FILE);
    expect(counters.hashes).toBe(0);
  });

  it.each(OVERRIDE_CASES)(
    'stops when the override is $label',
    async (item): Promise<void> => {
      const counters = calls();
      const files: Record<string, ScriptedFile> = {
        ...item.files,
        [BUNDLED]: presentFile(FFMPEG_VERSION),
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
      };
      const deps = scriptDeps({
        bundled: BUNDLED,
        pathEnv: PATH_DIR,
        hash: DIGEST,
        pinned: pinTable(DIGEST),
        install: installRecord(DIGEST),
        files,
      }, counters);
      const error = await expectMissing('ffmpeg', binaryConfig({
        ffmpegPath: item.overridePath,
      }), deps);

      expect(error.code).toBe(ERROR_CODES.FFMPEG_NOT_FOUND);
      expect(error.details.envVar).toBe('MEDIA_EDITOR_FFMPEG_PATH');
      expect(error.details.nextStep).toBe('fix or unset MEDIA_EDITOR_FFMPEG_PATH');
      expect(lookedInOf(error)).toEqual([
        `env-override: ${item.overridePath} ${item.reason}`,
      ]);
      expect(counters.bundled).toBe(0);
      expect(counters.hashes).toBe(0);
      expect(counters.probes).toHaveLength(item.probes);
      expect(counters.files).not.toContain(BUNDLED);
      expect(counters.files).not.toContain(PATH_FILE);
      if (!item.readsFiles) {
        expect(counters.files).toEqual([]);
      }
    },
  );

  it('stops when the override binary fails to spawn', async (): Promise<void> => {
    const overridePath = path.join('/opt', 'override', 'ffmpeg');
    const counters = calls();
    const error = await expectMissing('ffmpeg', binaryConfig({
      ffmpegPath: overridePath,
    }), scriptDeps({
      bundled: BUNDLED,
      probeErrorAt: overridePath,
      pathEnv: PATH_DIR,
      files: {
        [overridePath]: presentFile(FFMPEG_VERSION),
        [BUNDLED]: presentFile(FFMPEG_VERSION),
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
      },
    }, counters));

    expect(error.code).toBe(ERROR_CODES.FFMPEG_NOT_FOUND);
    expect(lookedInOf(error)).toEqual([
      `env-override: ${overridePath} did not answer -version`,
    ]);
    expect(counters.bundled).toBe(0);
    expect(counters.files).not.toContain(PATH_FILE);
  });

  it('treats an empty override as unset', async (): Promise<void> => {
    const binary = await resolveBinary('ffmpeg', binaryConfig({ ffmpegPath: '' }), scriptDeps({
      bundled: BUNDLED,
      files: { [BUNDLED]: presentFile(FFMPEG_VERSION) },
    }));
    expect(binary.source).toBe('bundled');
  });

  it('treats a whitespace override as unset', async (): Promise<void> => {
    const binary = await resolveBinary('ffmpeg', binaryConfig({
      ffmpegPath: ' \t ',
    }), scriptDeps({
      bundled: BUNDLED,
      files: { [BUNDLED]: presentFile(FFMPEG_VERSION) },
    }));
    expect(binary.source).toBe('bundled');
  });

  it('falls through when the bundled binary fails to spawn', async (): Promise<void> => {
    const counters = calls();
    const binary = await resolveBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: BUNDLED,
      pathEnv: PATH_DIR,
      probeErrorAt: BUNDLED,
      files: {
        [BUNDLED]: presentFile(FFMPEG_VERSION),
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
      },
    }, counters));

    expect(binary.source).toBe('system-path');
    expect(binary.path).toBe(PATH_FILE);
    expect(counters.probes).toEqual([BUNDLED, PATH_FILE]);
  });

  it('refuses a probe line without the ffmpeg version prefix', async (): Promise<void> => {
    const binary = await resolveBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: BUNDLED,
      pathEnv: PATH_DIR,
      files: {
        [BUNDLED]: presentFile('ffmpeg version'),
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
      },
    }));

    expect(binary.source).toBe('system-path');
    expect(binary.path).toBe(PATH_FILE);
    expect(binary.version).toBe(FFMPEG_VERSION);
  });

  it('skips an empty PATH entry instead of the working directory', async (): Promise<void> => {
    const counters = calls();
    const result = await lookupBinary('ffmpeg', binaryConfig(), {
      platform: 'linux',
      arch: 'x64',
      pathEnv: `${path.delimiter}${PATH_DIR}${path.delimiter}`,
      bundledPath: (): null => {
        counters.bundled += 1;
        return null;
      },
      fileInfo: (binaryPath: string) => {
        counters.files.push(binaryPath);
        if (!path.isAbsolute(binaryPath)) {
          return { isFile: true, size: 1, mtimeMs: 1 };
        }
        return undefined;
      },
      isExecutable: (): boolean => true,
      probeVersion: (binaryPath: string): string => {
        counters.probes.push(binaryPath);
        return FFMPEG_VERSION;
      },
    });

    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.info.lookedIn).toContain('bundled: no path exported');
      expect(result.info.lookedIn).toContain(`system-path: ${PATH_DIR} absent`);
    }
    expect(counters.files.every((entry) => path.isAbsolute(entry))).toBe(true);
    expect(counters.probes).toEqual([]);
  });

  it('refuses an installed binary when the pin table has no entry', async (): Promise<void> => {
    const counters = calls();
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      files: { [installedPath()]: presentFile(FFMPEG_VERSION) },
      pinned: {},
    }, counters));

    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.info.lookedIn.at(-1)).toBe(`installed: ${installedPath()} no-pin`);
      expect(result.info.nextStep).toBe('media_setup_ffmpeg');
    }
    expect(counters.probes).toEqual([]);
    expect(counters.hashes).toBe(0);
  });

  it('refuses an installed binary whose hash differs from the record', async (): Promise<void> => {
    const counters = calls();
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      hash: DIGEST,
      pinned: pinTable(DIGEST),
      install: installRecord('def'),
      files: { [installedPath()]: presentFile(FFMPEG_VERSION) },
    }, counters));

    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.info.lookedIn.at(-1)).toBe(
        `installed: ${installedPath()} hash-mismatch`,
      );
    }
    expect(counters.hashes).toBe(1);
    expect(counters.probes).toEqual([]);
  });

  it('refuses an installed binary whose hash differs from the pin', async (): Promise<void> => {
    const counters = calls();
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      hash: DIGEST,
      pinned: pinTable('zzz'),
      install: installRecord(DIGEST),
      files: { [installedPath()]: presentFile(FFMPEG_VERSION) },
    }, counters));

    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.info.lookedIn.at(-1)).toBe(
        `installed: ${installedPath()} hash-mismatch`,
      );
    }
    expect(counters.hashes).toBe(1);
    expect(counters.probes).toEqual([]);
  });

  it('refuses an installed binary that fails the version probe', async (): Promise<void> => {
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      hash: DIGEST,
      pinned: pinTable(DIGEST),
      install: installRecord(DIGEST),
      files: { [installedPath()]: presentFile('nope') },
    }));

    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.info.lookedIn.at(-1)).toBe(`installed: ${installedPath()} unusable`);
    }
  });

  it('hashes the installed file and reads the install record', async (): Promise<void> => {
    const dataDir = path.join(scratch, 'hashed');
    const binDir = path.join(dataDir, 'bin');
    mkdirSync(binDir, { recursive: true });
    const binaryPath = path.join(binDir, 'ffmpeg');
    const bytes = Buffer.from('ffmpeg-bytes');
    writeFileSync(binaryPath, bytes);
    chmodSync(binaryPath, 0o755);
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    writeFileSync(path.join(binDir, 'install.json'), JSON.stringify({
      platform: 'linux-x64',
      binaries: {
        ffmpeg: { fileName: 'ffmpeg', sha256, notice: 'later' },
      },
      archiveSha256: 'ignored',
    }));

    const binary = await resolveBinary('ffmpeg', binaryConfig({ dataDir }), {
      platform: 'linux',
      arch: 'x64',
      pathEnv: '',
      bundledPath: (): null => null,
      pinned: { 'linux-x64': { ffmpeg: sha256 } },
      probeVersion: (): string => FFMPEG_VERSION,
    });

    expect(binary.source).toBe('installed');
    expect(binary.path).toBe(binaryPath);
    expect(binary.version).toBe(FFMPEG_VERSION);
  });

  it('treats a broken install record as a hash mismatch', async (): Promise<void> => {
    const dataDir = path.join(scratch, 'broken-record');
    const binDir = path.join(dataDir, 'bin');
    mkdirSync(binDir, { recursive: true });
    const binaryPath = path.join(binDir, 'ffmpeg');
    writeFileSync(binaryPath, Buffer.from('ffmpeg-bytes'));
    chmodSync(binaryPath, 0o755);
    writeFileSync(path.join(binDir, 'install.json'), '{');
    let probes = 0;
    const result = await lookupBinary('ffmpeg', binaryConfig({ dataDir }), {
      platform: 'linux',
      arch: 'x64',
      pathEnv: '',
      bundledPath: (): null => null,
      pinned: pinTable(DIGEST),
      probeVersion: (): string => {
        probes += 1;
        return FFMPEG_VERSION;
      },
    });

    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.info.lookedIn.at(-1)).toBe(`installed: ${binaryPath} hash-mismatch`);
    }
    expect(probes).toBe(0);
  });

  it('lists one lookedIn entry per step when nothing is usable', async (): Promise<void> => {
    const firstDir = path.join('/usr', 'local', 'bin');
    const secondDir = path.join('/usr', 'bin');
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: BUNDLED,
      pathEnv: [firstDir, secondDir].join(path.delimiter),
      files: {},
    }));

    expect(result.found).toBe(false);
    if (result.found) {
      return;
    }
    expect(result.info.lookedIn).toEqual([
      'env-override: unset',
      `bundled: ${BUNDLED} absent`,
      `system-path: ${firstDir}, ${secondDir} absent`,
      `installed: ${installedPath()} absent`,
    ]);
    expect(result.info.envVar).toBe('MEDIA_EDITOR_FFMPEG_PATH');
    expect(result.info.nextStep).toBe('media_setup_ffmpeg');
    expect(result.info.lookedIn).toHaveLength(4);
  });

  it('throws FFMPEG_NOT_FOUND with the ffmpeg variable', async (): Promise<void> => {
    const error = await expectMissing('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      pathEnv: '',
      files: {},
    }));
    expect(error.code).toBe(ERROR_CODES.FFMPEG_NOT_FOUND);
    expect(error.details.envVar).toBe('MEDIA_EDITOR_FFMPEG_PATH');
    expect(error.details.nextStep).toBe('media_setup_ffmpeg');
    expect(lookedInOf(error)).toHaveLength(4);
  });

  it('throws FFPROBE_NOT_FOUND with the ffprobe variable', async (): Promise<void> => {
    const error = await expectMissing('ffprobe', binaryConfig({
      ffprobePath: path.join('/opt', 'missing', 'ffprobe'),
    }), scriptDeps({ bundled: BUNDLED, files: {} }));
    expect(error.code).toBe(ERROR_CODES.FFPROBE_NOT_FOUND);
    expect(error.details.envVar).toBe('MEDIA_EDITOR_FFPROBE_PATH');
    expect(error.details.nextStep).toBe('fix or unset MEDIA_EDITOR_FFPROBE_PATH');
    expect(lookedInOf(error)).toHaveLength(1);
  });

  it('does not probe again when the cached file is unchanged', async (): Promise<void> => {
    const live = liveInstall();
    await resolveBinary('ffmpeg', live.config, live.deps);
    await resolveBinary('ffmpeg', live.config, live.deps);
    expect(live.probes).toBe(1);
    expect(live.hashes).toBe(1);
  });

  it('reruns the order when the cached size changes', async (): Promise<void> => {
    const live = liveInstall();
    await resolveBinary('ffmpeg', live.config, live.deps);
    live.size = 11;
    await resolveBinary('ffmpeg', live.config, live.deps);
    expect(live.probes).toBe(2);
    expect(live.hashes).toBe(2);
  });

  it('reruns the order when the cached mtime changes', async (): Promise<void> => {
    const live = liveInstall();
    await resolveBinary('ffmpeg', live.config, live.deps);
    live.mtimeMs = 21;
    await resolveBinary('ffmpeg', live.config, live.deps);
    expect(live.probes).toBe(2);
    expect(live.hashes).toBe(2);
  });

  it('drops a cached binary when the file disappears', async (): Promise<void> => {
    const live = liveInstall();
    await resolveBinary('ffmpeg', live.config, live.deps);
    live.present = false;
    const missing = await lookupBinary('ffmpeg', live.config, live.deps);
    expect(missing.found).toBe(false);
    expect(live.probes).toBe(1);
    live.present = true;
    await resolveBinary('ffmpeg', live.config, live.deps);
    expect(live.probes).toBe(2);
    expect(live.hashes).toBe(2);
  });

  it('probes again after the cached binary is invalidated', async (): Promise<void> => {
    const counters = calls();
    const deps = scriptDeps({
      bundled: BUNDLED,
      files: { [BUNDLED]: presentFile(FFMPEG_VERSION) },
    }, counters);
    const config = binaryConfig();
    await resolveBinary('ffmpeg', config, deps);
    invalidateBinary('ffmpeg');
    await resolveBinary('ffmpeg', config, deps);
    expect(counters.probes).toEqual([BUNDLED, BUNDLED]);
  });

  it('does not cache a failed lookup', async (): Promise<void> => {
    let ready = false;
    let probes = 0;
    const deps: ResolverDeps = {
      platform: 'linux',
      pathEnv: '',
      bundledPath: (): string => BUNDLED,
      fileInfo: (binaryPath: string) => {
        if (binaryPath === BUNDLED && ready) {
          return { isFile: true, size: 1, mtimeMs: 1 };
        }
        return undefined;
      },
      isExecutable: (): boolean => true,
      probeVersion: (): string => {
        probes += 1;
        return FFMPEG_VERSION;
      },
    };
    const config = binaryConfig();
    const first = await lookupBinary('ffmpeg', config, deps);
    expect(first.found).toBe(false);
    expect(probes).toBe(0);
    ready = true;
    const second = await resolveBinary('ffmpeg', config, deps);
    expect(second.source).toBe('bundled');
    expect(probes).toBe(1);
  });

  it('caches ffmpeg and ffprobe independently', async (): Promise<void> => {
    const ffmpegPath = BUNDLED;
    const ffprobePath = path.join(PATH_DIR, 'ffprobe');
    const seen: string[] = [];
    const deps: ResolverDeps = {
      platform: 'linux',
      pathEnv: PATH_DIR,
      bundledPath: (binaryName: BinaryName): string | null => (
        binaryName === 'ffmpeg' ? ffmpegPath : null
      ),
      fileInfo: (binaryPath: string) => {
        if (binaryPath === ffmpegPath || binaryPath === ffprobePath) {
          return { isFile: true, size: 4, mtimeMs: 8 };
        }
        return undefined;
      },
      isExecutable: (): boolean => true,
      probeVersion: (binaryPath: string): string => {
        seen.push(binaryPath);
        if (binaryPath === ffmpegPath) {
          return FFMPEG_VERSION;
        }
        return FFPROBE_VERSION;
      },
    };
    const config = binaryConfig();
    const ffmpeg = await resolveBinary('ffmpeg', config, deps);
    const ffprobe = await resolveBinary('ffprobe', config, deps);
    expect(ffmpeg.source).toBe('bundled');
    expect(ffprobe.source).toBe('system-path');
    expect(ffprobe.path).toBe(ffprobePath);
    const probed = seen.length;
    await resolveBinary('ffmpeg', config, deps);
    await resolveBinary('ffprobe', config, deps);
    expect(seen).toHaveLength(probed);
  });

  it('shares one in-flight lookup for the same binary', async (): Promise<void> => {
    let probes = 0;
    let release: () => void = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const deps: ResolverDeps = {
      platform: 'linux',
      pathEnv: '',
      bundledPath: (): string => BUNDLED,
      fileInfo: (): { isFile: boolean; size: number; mtimeMs: number } => ({
        isFile: true,
        size: 1,
        mtimeMs: 1,
      }),
      isExecutable: (): boolean => true,
      probeVersion: async (): Promise<string> => {
        probes += 1;
        await gate;
        return FFMPEG_VERSION;
      },
    };
    const config = binaryConfig();
    const first = lookupBinary('ffmpeg', config, deps);
    const second = lookupBinary('ffmpeg', config, deps);
    expect(probes).toBe(1);
    release();
    const [left, right] = await Promise.all([first, second]);
    expect(left).toEqual(right);
    expect(probes).toBe(1);
  });

  it('searches for ffmpeg.exe on win32', async (): Promise<void> => {
    const directory = path.join('/opt', 'tools');
    const expected = path.join(directory, 'ffmpeg.exe');
    const seen: string[] = [];
    const binary = await resolveBinary('ffmpeg', binaryConfig(), {
      platform: 'win32',
      pathEnv: directory,
      bundledPath: (): null => null,
      fileInfo: (binaryPath: string) => {
        seen.push(binaryPath);
        if (binaryPath === expected) {
          return { isFile: true, size: 1, mtimeMs: 1 };
        }
        return undefined;
      },
      isExecutable: (): boolean => true,
      probeVersion: async (): Promise<string> => FFMPEG_VERSION,
    });

    expect(binary.source).toBe('system-path');
    expect(binary.path).toBe(expected);
    expect(seen).toContain(expected);
    expect(seen).not.toContain(path.join(directory, 'ffmpeg'));
  });

  it('treats an existing win32 file as executable', async (): Promise<void> => {
    const binaryPath = path.join(scratch, 'ffmpeg.exe');
    writeFileSync(binaryPath, 'not-a-binary');
    chmodSync(binaryPath, 0o644);
    const binary = await resolveBinary('ffmpeg', binaryConfig({ dataDir: scratch }), {
      platform: 'win32',
      pathEnv: '',
      bundledPath: (): string => binaryPath,
      probeVersion: (): string => FFMPEG_VERSION,
    });
    expect(binary.source).toBe('bundled');
    expect(binary.path).toBe(binaryPath);
  });

  it.skipIf(process.platform === 'win32')(
    'refuses a bundled file without the execute bit',
    async (): Promise<void> => {
      const binaryPath = path.join(scratch, 'no-exec');
      writeFileSync(binaryPath, 'not-a-binary');
      chmodSync(binaryPath, 0o644);
      let probes = 0;
      const result = await lookupBinary('ffmpeg', binaryConfig({ dataDir: scratch }), {
        platform: 'linux',
        pathEnv: '',
        bundledPath: (): string => binaryPath,
        probeVersion: (): string => {
          probes += 1;
          return FFMPEG_VERSION;
        },
      });
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.info.lookedIn[1]).toBe(`bundled: ${binaryPath} unusable`);
      }
      expect(probes).toBe(0);
    },
  );

  it('names a bundled file it skipped when a later step finds ffmpeg', async (): Promise<void> => {
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: BUNDLED,
      pathEnv: PATH_DIR,
      files: {
        [BUNDLED]: presentFile(FFMPEG_VERSION, { isExecutable: false }),
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
      },
    }));
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.binary.source).toBe('system-path');
      expect(result.binary.skipped).toEqual([`bundled: ${BUNDLED} unusable`]);
    }
  });

  it('keeps the skipped note when the answer comes from the cache', async (): Promise<void> => {
    const deps = scriptDeps({
      bundled: BUNDLED,
      pathEnv: PATH_DIR,
      files: {
        [BUNDLED]: presentFile(FFMPEG_VERSION, { isExecutable: false }),
        [PATH_FILE]: presentFile(FFMPEG_VERSION),
      },
    });
    await lookupBinary('ffmpeg', binaryConfig(), deps);
    const again = await lookupBinary('ffmpeg', binaryConfig(), deps);
    expect(again.found).toBe(true);
    if (again.found) {
      expect(again.binary.skipped).toEqual([`bundled: ${BUNDLED} unusable`]);
    }
  });

  it('leaves skipped off when nothing was passed over', async (): Promise<void> => {
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      pathEnv: PATH_DIR,
      files: { [PATH_FILE]: presentFile(FFMPEG_VERSION) },
    }));
    expect(result.found).toBe(true);
    if (result.found) {
      expect('skipped' in result.binary).toBe(false);
    }
  });

  it('calls a path candidate that cannot run unusable, not absent', async (): Promise<void> => {
    const result = await lookupBinary('ffmpeg', binaryConfig(), scriptDeps({
      bundled: null,
      pathEnv: PATH_DIR,
      files: { [PATH_FILE]: presentFile(FFMPEG_VERSION, { isExecutable: false }) },
    }));
    expect(result.found).toBe(false);
    if (!result.found) {
      expect(result.info.lookedIn).toContain(`system-path: ${PATH_FILE} unusable`);
      expect(result.info.lookedIn).not.toContain(`system-path: ${PATH_DIR} absent`);
    }
  });

  it('resolves the bundled ffmpeg', async (): Promise<void> => {
    const dataDir = path.join(scratch, 'real');
    mkdirSync(dataDir, { recursive: true });
    const binary = await resolveBinary('ffmpeg', {
      ffmpegPath: undefined,
      ffprobePath: undefined,
      dataDir,
    }, { pathEnv: '' });

    expect(binary.source).toBe('bundled');
    expect(binary.name).toBe('ffmpeg');
    expect(binary.path).toBe(ffmpegStatic);
    expect(binary.version.startsWith('ffmpeg version ')).toBe(true);
  });
});
