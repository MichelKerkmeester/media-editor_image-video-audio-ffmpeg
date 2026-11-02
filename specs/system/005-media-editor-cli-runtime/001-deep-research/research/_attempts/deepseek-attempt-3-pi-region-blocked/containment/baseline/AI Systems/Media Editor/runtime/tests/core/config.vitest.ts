// ───────────────────────────────────────────────────────────────────
// MODULE: Server Config Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { defaultDataDir, loadConfig } from '../../src/core/config.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-config-'));

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

const scratchReal = realpathSync.native(scratch);
const dirA = path.join(scratchReal, 'dir-a');
const dirB = path.join(scratchReal, 'dir-b');
const filePath = path.join(scratchReal, 'note.txt');
const linkA = path.join(scratchReal, 'link-a');
const missingDir = path.join(scratchReal, 'missing-dir');
const relativeEntry = 'clips/a';

mkdirSync(dirA);
mkdirSync(dirB);
writeFileSync(filePath, 'note');
symlinkSync(dirA, linkA);

const dirAReal = realpathSync.native(dirA);
const dirBReal = realpathSync.native(dirB);

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function warningAt(warnings: readonly string[], index: number): string {
  return warnings[index] ?? '';
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('loadConfig', (): void => {
  it('uses documented defaults for an empty environment', (): void => {
    const loaded = loadConfig({}, []);

    expect(loaded.config.allowedRoots).toEqual([]);
    expect(loaded.config.outputDir).toBeUndefined();
    expect(loaded.config.ffmpegPath).toBeUndefined();
    expect(loaded.config.ffprobePath).toBeUndefined();
    expect(loaded.config.timeoutSeconds).toBe(1800);
    expect(loaded.config.logLevel).toBe('info');
    expect(loaded.config.dataDir).toBe(
      defaultDataDir(process.platform, {}, homedir()),
    );
    expect(loaded.warnings).toHaveLength(0);
  });

  it('reads every setting from the environment', (): void => {
    const outputDir = path.join(scratchReal, 'env-out');
    const loaded = loadConfig({
      MEDIA_EDITOR_ALLOWED_DIRS: `${dirA}${path.delimiter}${dirB}`,
      MEDIA_EDITOR_OUTPUT_DIR: outputDir,
      MEDIA_EDITOR_FFMPEG_PATH: '/opt/ffmpeg',
      MEDIA_EDITOR_FFPROBE_PATH: '/opt/ffprobe',
      MEDIA_EDITOR_TIMEOUT_SECONDS: '90',
      MEDIA_EDITOR_DATA_DIR: dirA,
      MEDIA_EDITOR_LOG_LEVEL: 'warn',
    }, []);

    expect(loaded.config.allowedRoots).toEqual([dirAReal, dirBReal]);
    expect(loaded.config.outputDir).toBe(outputDir);
    expect(loaded.config.ffmpegPath).toBe('/opt/ffmpeg');
    expect(loaded.config.ffprobePath).toBe('/opt/ffprobe');
    expect(loaded.config.timeoutSeconds).toBe(90);
    expect(loaded.config.dataDir).toBe(dirA);
    expect(loaded.config.logLevel).toBe('warn');
    expect(loaded.warnings).toHaveLength(0);
  });

  it('reads roots and the output folder from arguments', (): void => {
    const outputDir = path.join(scratchReal, 'arg-out');
    const loaded = loadConfig({}, [
      '--allowed-dir',
      dirB,
      '--allowed-dir',
      dirA,
      '--output-dir',
      outputDir,
    ]);

    expect(loaded.config.allowedRoots).toEqual([dirBReal, dirAReal]);
    expect(loaded.config.outputDir).toBe(outputDir);
    expect(loaded.warnings).toHaveLength(0);
  });

  it('merges arguments before the environment and collapses a real path', (): void => {
    expect(realpathSync.native(linkA)).toBe(dirAReal);

    const loaded = loadConfig(
      { MEDIA_EDITOR_ALLOWED_DIRS: `${dirA}${path.delimiter}${dirB}` },
      ['--allowed-dir', linkA, '--allowed-dir', dirB],
    );

    expect(loaded.config.allowedRoots).toEqual([dirAReal, dirBReal]);
    expect(loaded.config.outputDir).toBe(dirAReal);
    expect(loaded.warnings).toHaveLength(0);
  });

  it('stores a root written with trailing separators as its bare real path', (): void => {
    const loaded = loadConfig(
      { MEDIA_EDITOR_ALLOWED_DIRS: `${dirA}${path.sep}${path.delimiter}${dirB}${path.sep}.` },
      ['--allowed-dir', `${dirA}${path.sep}${path.sep}`],
    );

    expect(loaded.config.allowedRoots).toEqual([dirAReal, dirBReal]);
    expect(loaded.warnings).toHaveLength(0);
  });

  it('trims entries and ignores empty ones', (): void => {
    const loaded = loadConfig(
      {
        MEDIA_EDITOR_ALLOWED_DIRS:
          `  ${dirA}  ${path.delimiter}${path.delimiter}  ${dirB} `,
      },
      ['--allowed-dir=', `--allowed-dir=  ${dirB}  `, '--allowed-dir', '   '],
    );

    expect(loaded.config.allowedRoots).toEqual([dirBReal, dirAReal]);
    expect(loaded.warnings).toHaveLength(0);
  });

  it('drops a relative path, a missing path, and a file with one warning each', (): void => {
    const fromArgs = loadConfig({}, [
      '--allowed-dir',
      relativeEntry,
      '--allowed-dir',
      missingDir,
      '--allowed-dir',
      filePath,
      '--allowed-dir',
      dirA,
    ]);

    expect(fromArgs.config.allowedRoots).toEqual([dirAReal]);
    expect(fromArgs.warnings).toHaveLength(3);
    for (const warning of fromArgs.warnings) {
      expect(warning).toContain('--allowed-dir');
      expect(warning).not.toContain(relativeEntry);
      expect(warning).not.toContain(missingDir);
      expect(warning).not.toContain(filePath);
    }

    const fromEnv = loadConfig({
      MEDIA_EDITOR_ALLOWED_DIRS: [
        relativeEntry,
        missingDir,
        filePath,
        dirB,
      ].join(path.delimiter),
    }, []);

    expect(fromEnv.config.allowedRoots).toEqual([dirBReal]);
    expect(fromEnv.config.outputDir).toBe(dirBReal);
    expect(fromEnv.warnings).toHaveLength(3);
    for (const warning of fromEnv.warnings) {
      expect(warning).toContain('MEDIA_EDITOR_ALLOWED_DIRS');
    }
  });

  it('uses the argument, then the variable, then the first root', (): void => {
    const fromArg = path.join(scratchReal, 'out-arg');
    const fromEnv = path.join(scratchReal, 'out-env');
    const earlier = path.join(scratchReal, 'out-earlier');

    const withArg = loadConfig(
      {
        MEDIA_EDITOR_ALLOWED_DIRS: `${dirA}${path.delimiter}${dirB}`,
        MEDIA_EDITOR_OUTPUT_DIR: fromEnv,
      },
      ['--output-dir', earlier, '--output-dir', fromArg],
    );
    expect(withArg.config.outputDir).toBe(fromArg);
    expect(withArg.warnings).toHaveLength(0);

    const withEnv = loadConfig(
      {
        MEDIA_EDITOR_ALLOWED_DIRS: `${dirA}${path.delimiter}${dirB}`,
        MEDIA_EDITOR_OUTPUT_DIR: fromEnv,
      },
      [],
    );
    expect(withEnv.config.outputDir).toBe(fromEnv);
    expect(withEnv.warnings).toHaveLength(0);

    const withRoot = loadConfig(
      { MEDIA_EDITOR_ALLOWED_DIRS: `${dirA}${path.delimiter}${dirB}` },
      [],
    );
    expect(withRoot.config.outputDir).toBe(dirAReal);
    expect(withRoot.warnings).toHaveLength(0);

    const withNone = loadConfig({}, []);
    expect(withNone.config.outputDir).toBeUndefined();
    expect(withNone.warnings).toHaveLength(0);
  });

  it('ignores a relative output directory and uses the next source', (): void => {
    const fromEnv = path.join(scratchReal, 'out-next');
    const fromArg = loadConfig(
      {
        MEDIA_EDITOR_ALLOWED_DIRS: dirA,
        MEDIA_EDITOR_OUTPUT_DIR: fromEnv,
      },
      ['--output-dir', 'relative/out', '--output-dir', 'also/relative'],
    );
    expect(fromArg.config.outputDir).toBe(fromEnv);
    expect(fromArg.warnings).toHaveLength(1);
    expect(warningAt(fromArg.warnings, 0)).toContain('--output-dir');
    expect(warningAt(fromArg.warnings, 0)).not.toContain('relative/out');
    expect(warningAt(fromArg.warnings, 0)).not.toContain('also/relative');

    const fromVariable = loadConfig(
      {
        MEDIA_EDITOR_ALLOWED_DIRS: dirA,
        MEDIA_EDITOR_OUTPUT_DIR: 'relative/out',
      },
      [],
    );
    expect(fromVariable.config.outputDir).toBe(dirAReal);
    expect(fromVariable.warnings).toHaveLength(1);
    expect(warningAt(fromVariable.warnings, 0)).toContain('MEDIA_EDITOR_OUTPUT_DIR');
    expect(warningAt(fromVariable.warnings, 0)).not.toContain('relative/out');
  });

  it('keeps an output path that does not exist yet and does not rewrite a link', (): void => {
    const missing = path.join(scratchReal, 'not-created-yet');
    const linked = loadConfig({}, ['--allowed-dir', dirA, '--output-dir', linkA]);
    expect(linked.config.outputDir).toBe(linkA);
    expect(linked.warnings).toHaveLength(0);

    const absent = loadConfig({}, ['--output-dir', missing]);
    expect(absent.config.outputDir).toBe(missing);
    expect(absent.warnings).toHaveLength(0);

    const asFile = loadConfig({}, ['--output-dir', filePath]);
    expect(asFile.config.outputDir).toBe(filePath);
    expect(asFile.warnings).toHaveLength(0);
  });

  it('rejects timeout values outside 1 to 86400', (): void => {
    const rejected = ['0', '-5', 'abc', '1800.5', '1e9', '86401', '100000', ''];
    for (const value of rejected) {
      const loaded = loadConfig({ MEDIA_EDITOR_TIMEOUT_SECONDS: value }, []);
      expect(loaded.config.timeoutSeconds).toBe(1800);
      expect(loaded.warnings).toHaveLength(1);
      expect(warningAt(loaded.warnings, 0)).toContain('MEDIA_EDITOR_TIMEOUT_SECONDS');
      if (value.length > 0) {
        expect(warningAt(loaded.warnings, 0)).not.toContain(value);
      }
    }
  });

  it('accepts a timeout from 1 to 86400 after trimming', (): void => {
    const accepted: ReadonlyArray<readonly [string, number]> = [
      ['86400', 86400],
      ['1', 1],
      ['  1800  ', 1800],
    ];
    for (const [value, expected] of accepted) {
      const loaded = loadConfig({ MEDIA_EDITOR_TIMEOUT_SECONDS: value }, []);
      expect(loaded.config.timeoutSeconds).toBe(expected);
      expect(loaded.warnings).toHaveLength(0);
    }
  });

  it('rejects a log level that is not one of the four names', (): void => {
    const rejected = ['verbose', 'DEBUG', '', ' info'];
    for (const value of rejected) {
      const loaded = loadConfig({ MEDIA_EDITOR_LOG_LEVEL: value }, []);
      expect(loaded.config.logLevel).toBe('info');
      expect(loaded.warnings).toHaveLength(1);
      expect(warningAt(loaded.warnings, 0)).toContain('MEDIA_EDITOR_LOG_LEVEL');
      if (value.trim().length > 0) {
        expect(warningAt(loaded.warnings, 0)).not.toContain(value.trim());
      }
    }
  });

  it('accepts the four log levels exactly', (): void => {
    const accepted = ['error', 'warn', 'info', 'debug'] as const;
    for (const level of accepted) {
      const loaded = loadConfig({ MEDIA_EDITOR_LOG_LEVEL: level }, []);
      expect(loaded.config.logLevel).toBe(level);
      expect(loaded.warnings).toHaveLength(0);
    }
  });

  it('replaces a relative data directory with the platform default', (): void => {
    const loaded = loadConfig(
      {
        MEDIA_EDITOR_DATA_DIR: 'relative/data',
        XDG_DATA_HOME: '/var/lib',
      },
      [],
      { platform: 'linux', homeDir: '/home/me' },
    );

    expect(loaded.config.dataDir).toBe('/var/lib/media-editor');
    expect(loaded.warnings).toHaveLength(1);
    expect(warningAt(loaded.warnings, 0)).toContain('MEDIA_EDITOR_DATA_DIR');
    expect(warningAt(loaded.warnings, 0)).not.toContain('relative/data');
  });

  it('replaces a data directory that is an existing file', (): void => {
    const loaded = loadConfig(
      { MEDIA_EDITOR_DATA_DIR: filePath },
      [],
      { platform: 'linux', homeDir: '/home/me' },
    );

    expect(loaded.config.dataDir).toBe('/home/me/.local/share/media-editor');
    expect(loaded.warnings).toHaveLength(1);
    expect(warningAt(loaded.warnings, 0)).toContain('MEDIA_EDITOR_DATA_DIR');
    expect(warningAt(loaded.warnings, 0)).not.toContain(filePath);
  });

  it('keeps an absolute data directory that is not a file', (): void => {
    const linked = loadConfig(
      { MEDIA_EDITOR_DATA_DIR: `  ${linkA}  ` },
      [],
      { platform: 'linux', homeDir: '/home/me' },
    );
    expect(linked.config.dataDir).toBe(linkA);
    expect(linked.warnings).toHaveLength(0);

    const missing = loadConfig(
      { MEDIA_EDITOR_DATA_DIR: missingDir },
      [],
      { platform: 'darwin', homeDir: '/Users/me' },
    );
    expect(missing.config.dataDir).toBe(missingDir);
    expect(missing.warnings).toHaveLength(0);
  });

  it('accepts both --name=value and --name value', (): void => {
    const fromArg = path.join(scratchReal, 'equals-out');
    const spaced = loadConfig({}, ['--allowed-dir', dirA, '--output-dir', fromArg]);
    const equals = loadConfig({}, [`--allowed-dir=${dirB}`, `--output-dir=${fromArg}`]);

    expect(spaced.config.allowedRoots).toEqual([dirAReal]);
    expect(spaced.config.outputDir).toBe(fromArg);
    expect(equals.config.allowedRoots).toEqual([dirBReal]);
    expect(equals.config.outputDir).toBe(fromArg);
    expect(spaced.warnings).toHaveLength(0);
    expect(equals.warnings).toHaveLength(0);
  });

  it('takes bare folder paths as roots, in argument order', (): void => {
    const outputDir = path.join(scratchReal, 'bare-out');
    const loaded = loadConfig({}, ['--output-dir', outputDir, dirA, dirB]);
    expect(loaded.config.allowedRoots).toEqual([dirAReal, dirBReal]);
    expect(loaded.config.outputDir).toBe(outputDir);
    expect(loaded.warnings).toEqual([]);
  });

  it('keeps every folder a bundle host expands after one flag', (): void => {
    const loaded = loadConfig({}, ['--allowed-dir', dirA, dirB]);
    expect(loaded.config.allowedRoots).toEqual([dirAReal, dirBReal]);
  });

  it('falls back to the first root when the output setting was left unexpanded', (): void => {
    const loaded = loadConfig({}, ['--output-dir', '${user_config.output_directory}', dirA]);
    expect(loaded.config.allowedRoots).toEqual([dirAReal]);
    expect(loaded.config.outputDir).toBe(dirAReal);
    expect(loaded.warnings).toHaveLength(1);
    expect(warningAt(loaded.warnings, 0)).toContain('--output-dir');
  });

  it('drops a bare relative path and says a folder argument was ignored', (): void => {
    const loaded = loadConfig({}, ['relative/folder', dirB]);
    expect(loaded.config.allowedRoots).toEqual([dirBReal]);
    expect(loaded.warnings).toHaveLength(1);
    expect(warningAt(loaded.warnings, 0)).toContain('a folder argument');
  });

  it('warns for an unknown argument and keeps the real setting', (): void => {
    const spaced = loadConfig(
      { MEDIA_EDITOR_ALLOWED_DIRS: dirA },
      ['--allowed-dirs', '/tmp'],
    );
    expect(spaced.config.allowedRoots).toEqual([dirAReal]);
    expect(spaced.warnings).toHaveLength(1);
    expect(warningAt(spaced.warnings, 0)).toContain('--allowed-dirs');
    expect(warningAt(spaced.warnings, 0)).not.toContain('/tmp');

    const inline = loadConfig({}, ['--verbose=true']);
    expect(inline.warnings).toHaveLength(1);
    expect(warningAt(inline.warnings, 0)).toContain('--verbose');
    expect(warningAt(inline.warnings, 0)).not.toContain('true');
  });

  it('warns when a known argument has no value', (): void => {
    const loaded = loadConfig({}, ['--allowed-dir', '--output-dir']);

    expect(loaded.config.allowedRoots).toEqual([]);
    expect(loaded.config.outputDir).toBeUndefined();
    expect(loaded.warnings).toHaveLength(2);
    expect(loaded.warnings.some((warning) => warning.includes('--allowed-dir'))).toBe(true);
    expect(loaded.warnings.some((warning) => warning.includes('--output-dir'))).toBe(true);
  });

  it('names unknown media editor variables once, without their values', (): void => {
    const loaded = loadConfig({
      MEDIA_EDITOR_ZZZ: 'secret-zzz',
      MEDIA_EDITOR_FFMPEG: 'secret-ffmpeg',
      MEDIA_EDITOR_LOG_LEVEL: 'debug',
    }, []);

    expect(loaded.config.logLevel).toBe('debug');
    expect(loaded.config.ffmpegPath).toBeUndefined();
    expect(loaded.warnings).toHaveLength(1);
    expect(warningAt(loaded.warnings, 0)).toContain(
      'MEDIA_EDITOR_FFMPEG, MEDIA_EDITOR_ZZZ',
    );
    expect(warningAt(loaded.warnings, 0)).not.toContain('secret-ffmpeg');
    expect(warningAt(loaded.warnings, 0)).not.toContain('secret-zzz');
    expect(warningAt(loaded.warnings, 0)).not.toContain('MEDIA_EDITOR_LOG_LEVEL');
  });

  it('passes binary overrides through and treats a blank value as unset', (): void => {
    const loaded = loadConfig({
      MEDIA_EDITOR_FFMPEG_PATH: '  /opt/tools/ffmpeg  ',
      MEDIA_EDITOR_FFPROBE_PATH: '   ',
    }, []);
    expect(loaded.config.ffmpegPath).toBe('/opt/tools/ffmpeg');
    expect(loaded.config.ffprobePath).toBeUndefined();
    expect(loaded.warnings).toHaveLength(0);

    const relative = loadConfig({
      MEDIA_EDITOR_FFMPEG_PATH: 'ffmpeg',
      MEDIA_EDITOR_FFPROBE_PATH: '',
    }, []);
    expect(relative.config.ffmpegPath).toBe('ffmpeg');
    expect(relative.config.ffprobePath).toBeUndefined();
    expect(relative.warnings).toHaveLength(0);
  });
});

describe('defaultDataDir', (): void => {
  it('builds the macOS, Windows, and Linux defaults', (): void => {
    expect(defaultDataDir('darwin', { XDG_DATA_HOME: '/var/lib' }, '/Users/me')).toBe(
      '/Users/me/Library/Application Support/media-editor',
    );

    expect(defaultDataDir(
      'win32',
      { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' },
      'C:\\Users\\me',
    )).toBe('C:\\Users\\me\\AppData\\Roaming\\media-editor');

    expect(defaultDataDir('win32', { APPDATA: '   ' }, 'C:\\Users\\me')).toBe(
      'C:\\Users\\me\\AppData\\Roaming\\media-editor',
    );
    expect(defaultDataDir('win32', {}, 'C:\\Users\\me')).toBe(
      'C:\\Users\\me\\AppData\\Roaming\\media-editor',
    );

    expect(defaultDataDir('linux', { XDG_DATA_HOME: '/var/lib' }, '/home/me')).toBe(
      '/var/lib/media-editor',
    );
    expect(defaultDataDir('linux', { XDG_DATA_HOME: 'relative' }, '/home/me')).toBe(
      '/home/me/.local/share/media-editor',
    );
    expect(defaultDataDir('linux', {}, '/home/me')).toBe(
      '/home/me/.local/share/media-editor',
    );
  });
});
