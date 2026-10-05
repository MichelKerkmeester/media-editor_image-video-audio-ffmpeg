// ───────────────────────────────────────────────────────────────────
// MODULE: Process Runner Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { ChildProcess } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { resolveInputPath } from '../../src/core/path-guard.js';
import {
  MAX_CONCURRENT_PROCESSES,
  SpawnFailedError,
  assertReadableContent,
  buildArgv,
  buildChildEnv,
  cleanUpAfterFailure,
  isSpawnFailure,
  registerCleanupPath,
  removePaths,
  runProcess,
  sanitizeStderr,
  tailBytes,
  terminateAll,
  withTempDir,
} from '../../src/core/process-runner.js';

import type { InputRole, ResolvedInput } from '../../src/core/path-guard.js';
import type { BinaryKind, ProcessResult, RunOptions } from '../../src/core/process-runner.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const scratch = realpathSync.native(
  mkdtempSync(path.join(tmpdir(), 'process-runner-')),
);
const rawBinary = path.parse(process.execPath).name;
const allowedEnvNames = [
  'PATH',
  'HOME',
  'USERPROFILE',
  'TMPDIR',
  'TEMP',
  'TMP',
  'SystemRoot',
  'APPDATA',
  'LOCALAPPDATA',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'FONTCONFIG_PATH',
  'FONTCONFIG_FILE',
  'LC_ALL',
  'LANG',
];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

async function mediaError(run: () => Promise<unknown>): Promise<MediaError> {
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

function runNode(
  script: string,
  args: readonly string[] = [],
  options: Partial<Omit<RunOptions, 'kind'>> = {},
): Promise<ProcessResult> {
  return runProcess(process.execPath, ['-e', script, ...args], {
    kind: 'raw',
    timeoutMs: 5000,
    ...options,
  });
}

function asInput(
  name: string,
  role: InputRole,
  contents: string | Buffer,
): ResolvedInput {
  const filePath = path.join(scratch, name);
  writeFileSync(filePath, contents);
  return {
    rawPath: filePath,
    realPath: filePath,
    role,
  };
}

function canLockFolders(): boolean {
  if (process.platform === 'win32') {
    return false;
  }
  return process.getuid?.() !== 0;
}

interface LockedFolder {
  target: string;
  unlock: () => void;
}

function lockedFolder(name: string): LockedFolder {
  const parent = path.join(scratch, name);
  const target = path.join(parent, 'inner');
  mkdirSync(target, { recursive: true });
  chmodSync(parent, 0o500);
  return {
    target,
    unlock: (): void => {
      chmodSync(parent, 0o700);
    },
  };
}

function readSpan(stdout: string): { start: number; end: number } {
  const parsed: unknown = JSON.parse(stdout);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Expected a timestamp object.');
  }
  if (!('start' in parsed) || !('end' in parsed)) {
    throw new Error('Expected start and end timestamps.');
  }
  const start = parsed.start;
  const end = parsed.end;
  if (typeof start !== 'number' || typeof end !== 'number') {
    throw new Error('Expected numeric timestamps.');
  }
  return { start, end };
}

function maxOverlap(spans: readonly { start: number; end: number }[]): number {
  const events: { time: number; delta: number }[] = [];
  for (const span of spans) {
    events.push({ time: span.start, delta: 1 });
    events.push({ time: span.end, delta: -1 });
  }
  events.sort((left, right) => left.time - right.time || left.delta - right.delta);
  let current = 0;
  let peak = 0;
  for (const event of events) {
    current += event.delta;
    if (current > peak) {
      peak = current;
    }
  }
  return peak;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitForFile(filePath: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();
  while (!existsSync(filePath)) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`no file at ${filePath}`);
    }
    await delay(50);
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

describe('buildChildEnv', (): void => {
  it('keeps the allowlist and forces the C locale', (): void => {
    const child = buildChildEnv({
      PATH: '/bin',
      HOME: '/home/editor',
      FFREPORT: 'file=/tmp/report',
      SECRET_TOKEN: 'tok',
      LC_ALL: 'en_US.UTF-8',
      LANG: 'en_US.UTF-8',
    }, 'linux');

    expect(child).toEqual({
      PATH: '/bin',
      HOME: '/home/editor',
      LC_ALL: 'C',
      LANG: 'C',
    });
    expect(child.FFREPORT).toBeUndefined();
    expect(child.SECRET_TOKEN).toBeUndefined();
  });

  it('matches Windows names without case and keeps the original spelling', (): void => {
    const child = buildChildEnv({
      Path: '/bin',
      path: '/other',
      TEMP: 'C:\\Temp',
      FFREPORT: 'x',
      SECRET_TOKEN: 's',
    }, 'win32');

    expect(child).toEqual({
      Path: '/bin',
      TEMP: 'C:\\Temp',
      LC_ALL: 'C',
      LANG: 'C',
    });
  });
});

describe('buildArgv', (): void => {
  it('adds each runner flag once and does not change the caller array', (): void => {
    const cases: ReadonlyArray<{
      kind: BinaryKind;
      args: readonly string[];
      expected: readonly string[];
    }> = [
      {
        kind: 'ffmpeg',
        args: ['-i', 'in.mp4'],
        expected: [
          '-hide_banner',
          '-nostdin',
          '-n',
          '-protocol_whitelist',
          'file',
          '-i',
          'in.mp4',
        ],
      },
      {
        kind: 'ffmpeg',
        args: ['-i', 'a.mp4', '-n'],
        expected: [
          '-hide_banner',
          '-nostdin',
          '-protocol_whitelist',
          'file',
          '-i',
          'a.mp4',
          '-n',
        ],
      },
      {
        kind: 'ffmpeg',
        args: ['-i', 'a.mp4', '-i', 'b.mp4'],
        expected: [
          '-hide_banner',
          '-nostdin',
          '-n',
          '-protocol_whitelist',
          'file',
          '-i',
          'a.mp4',
          '-protocol_whitelist',
          'file',
          '-i',
          'b.mp4',
        ],
      },
      {
        kind: 'ffmpeg',
        args: ['-protocol_whitelist', 'file', '-i', 'a.mp4'],
        expected: [
          '-hide_banner',
          '-nostdin',
          '-n',
          '-protocol_whitelist',
          'file',
          '-i',
          'a.mp4',
        ],
      },
      {
        kind: 'ffmpeg',
        args: ['-y', '-i', 'in.mp4'],
        expected: [
          '-hide_banner',
          '-nostdin',
          '-n',
          '-y',
          '-protocol_whitelist',
          'file',
          '-i',
          'in.mp4',
        ],
      },
      {
        kind: 'ffprobe',
        args: ['-i', 'in.mp4'],
        expected: [
          '-hide_banner',
          '-v',
          'error',
          '-protocol_whitelist',
          'file',
          '-i',
          'in.mp4',
        ],
      },
      {
        kind: 'ffprobe',
        args: ['-v', 'quiet', '-i', 'in.mp4'],
        expected: [
          '-hide_banner',
          '-protocol_whitelist',
          'file',
          '-v',
          'quiet',
          '-i',
          'in.mp4',
        ],
      },
      {
        kind: 'ffprobe',
        args: ['-print_format', 'json', '-show_format', 'in.mp4'],
        expected: [
          '-hide_banner',
          '-v',
          'error',
          '-protocol_whitelist',
          'file',
          '-print_format',
          'json',
          '-show_format',
          'in.mp4',
        ],
      },
      {
        kind: 'ffprobe',
        args: ['-protocol_whitelist', 'file', 'in.mp4'],
        expected: [
          '-hide_banner',
          '-v',
          'error',
          '-protocol_whitelist',
          'file',
          'in.mp4',
        ],
      },
      {
        kind: 'raw',
        args: ['-version', '-i', 'in.mp4'],
        expected: ['-version', '-i', 'in.mp4'],
      },
    ];

    for (const entry of cases) {
      const args = [...entry.args];
      expect(buildArgv(entry.kind, args)).toEqual(entry.expected);
      expect(args).toEqual(entry.args);
    }

    const rawArgs = ['-i', 'clip.mp4'];
    expect(buildArgv('raw', rawArgs)).not.toBe(rawArgs);
  });
});

describe('stderr text', (): void => {
  it('keeps the trailing bytes', (): void => {
    const data = Buffer.from('abcdefghijklmnopqrstuvwxyz');
    expect(tailBytes(data, 4).toString('utf8')).toBe('wxyz');
    expect(tailBytes(data, 100).toString('utf8')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(tailBytes(data, 0).length).toBe(0);
  });

  it('strips ANSI, CR and NUL, and hides the temp path', (): void => {
    const tempDir = path.join(scratch, 'tmp-label');
    const raw = `\u001b[31mred\u001b[0m\rkeep\n\t\0${tempDir}/x ${tempDir}`;
    expect(sanitizeStderr(raw, tempDir)).toBe(`redkeep\n\t<tmp>/x <tmp>`);
    expect(sanitizeStderr('a\tb\nc\r', undefined)).toBe('a\tb\nc');
  });
});

describe('content gates', (): void => {
  it('refuses playlists, manifests and scripts', async (): Promise<void> => {
    const cases: ReadonlyArray<{
      name: string;
      role: InputRole;
      contents: string | Buffer;
    }> = [
      { name: 'playlist.m3u8', role: 'input', contents: '#EXTM3U\n#EXTINF:1,\n' },
      { name: 'manifest.mpd', role: 'overlay-image', contents: '<MPD profile="dash">' },
      { name: 'list.ffconcat', role: 'input', contents: 'ffconcat version 1.0\n' },
      { name: 'win.pls', role: 'input', contents: '[playlist]\nFile1=a.ts\n' },
      { name: 'session.sdp', role: 'input', contents: 'v=0\r\n' },
      { name: 'padded.m3u8', role: 'input', contents: '\n #EXTM3U\n' },
      {
        name: 'bom.m3u8',
        role: 'input',
        contents: Buffer.concat([
          Buffer.from([0xef, 0xbb, 0xbf]),
          Buffer.from('#EXTM3U\n'),
        ]),
      },
    ];

    for (const entry of cases) {
      const input = asInput(entry.name, entry.role, entry.contents);
      const error = await mediaError(async (): Promise<void> => {
        await assertReadableContent([input]);
      });
      expect(error.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
      expect(error.details).toEqual({
        path: input.rawPath,
        detected: 'indirection-container',
        accepted: 'media',
        reason: 'indirection-container',
      });
    }
  });

  it('accepts binary media and does not sniff a font', async (): Promise<void> => {
    const media = asInput(
      'clip.bin',
      'input',
      Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]),
    );
    const font = asInput('font.ttf', 'font', '#EXTM3U\n');
    await expect(assertReadableContent([media, font])).resolves.toBeUndefined();
  });

  it('accepts SubRip and refuses other subtitle text', async (): Promise<void> => {
    const comma = asInput(
      'comma.srt',
      'subtitle',
      '1\r\n00:00:01,000 --> 00:00:02,000\r\nHello\r\n',
    );
    const dotted = asInput(
      'dotted.srt',
      'subtitle',
      '2\n00:00:01.500 --> 00:00:02.500\nHi\n',
    );
    await expect(assertReadableContent([comma, dotted])).resolves.toBeUndefined();

    const webvtt = asInput('captions.vtt', 'subtitle', 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n');
    const ass = asInput('captions.ass', 'subtitle', '[Script Info]\nScriptType: v4.00+\n');
    for (const input of [webvtt, ass]) {
      const error = await mediaError(async (): Promise<void> => {
        await assertReadableContent([input]);
      });
      expect(error.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
      expect(error.details).toEqual({
        path: input.rawPath,
        detected: 'unknown',
        accepted: 'subrip',
        reason: 'not-subrip',
      });
    }
  });
});

describe('temp folders', (): void => {
  it('removes the folder after success and after a throw', async (): Promise<void> => {
    let created = '';
    const value = await withTempDir(async (dir): Promise<string> => {
      created = dir;
      writeFileSync(path.join(dir, 'note.txt'), 'x');
      return 'ok';
    });
    expect(value).toBe('ok');
    expect(existsSync(created)).toBe(false);

    const failure = new MediaError(ERROR_CODES.INTERNAL, 'Temp dir check.', {
      reason: 'probe',
    });
    await expect(withTempDir(async (dir): Promise<void> => {
      created = dir;
      writeFileSync(path.join(dir, 'note.txt'), 'x');
      throw failure;
    })).rejects.toBe(failure);
    expect(existsSync(created)).toBe(false);
  });

  it('ignores a path that is already gone', (): void => {
    expect(removePaths([path.join(scratch, 'missing-dir')])).toEqual([]);
  });

  it.skipIf(!canLockFolders())(
    'returns the paths it could not remove',
    (): void => {
      const gone = path.join(scratch, 'removable-dir');
      mkdirSync(gone);
      const locked = lockedFolder('locked-list');
      try {
        expect(removePaths([gone, locked.target])).toEqual([locked.target]);
        expect(existsSync(gone)).toBe(false);
        expect(existsSync(locked.target)).toBe(true);
      } finally {
        locked.unlock();
      }
    },
  );

  it('keeps the failure and adds nothing when every path is removed', (): void => {
    const failure = new MediaError(ERROR_CODES.PROCESS_FAILED, 'Run failed.', {
      binary: rawBinary,
    });
    cleanUpAfterFailure(failure, [path.join(scratch, 'missing-dir')]);
    expect(failure.details).toEqual({ binary: rawBinary });
  });

  it.skipIf(!canLockFolders())(
    'names a leftover folder on the failure that caused the cleanup',
    async (): Promise<void> => {
      const locked = lockedFolder('locked-run');
      try {
        const error = await mediaError(() => runNode('process.exit(1)', [], {
          cleanupFolders: [locked.target],
        }));
        expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
        expect(error.details).toMatchObject({ exitCode: 1, leftover: [locked.target] });
        expect(existsSync(locked.target)).toBe(true);
      } finally {
        locked.unlock();
      }
    },
  );
});

describe('runProcess', (): void => {
  it('returns exit 0 and captured stdout', async (): Promise<void> => {
    const result = await runNode('process.stdout.write("hello")', [], {
      captureStdout: true,
    });
    expect(result.exitCode).toBe(0);
    expect(result.signal).toBeNull();
    expect(result.stdout).toBe('hello');
  });

  it('discards stdout unless capture was requested', async (): Promise<void> => {
    const result = await runNode('process.stdout.write("x".repeat(1024 * 1024))');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('reports a non-zero exit with the stderr tail', async (): Promise<void> => {
    const error = await mediaError(() => runNode(
      'process.stderr.write("broken-stream");process.exit(4)',
    ));
    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
    expect(error.details).toEqual({
      binary: rawBinary,
      exitCode: 4,
      signal: null,
      stderrTail: 'broken-stream',
    });
  });

  it('reports a signal exit with exit code -1', async (): Promise<void> => {
    const error = await mediaError(() => runNode(
      "process.kill(process.pid, 'SIGKILL')",
    ));
    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
    expect(error.details).toEqual({
      binary: rawBinary,
      exitCode: -1,
      signal: 'SIGKILL',
      stderrTail: '',
    });
  });

  it('stops a sleeping child at the timeout and removes partial files', async (): Promise<void> => {
    const output = path.join(scratch, 'timeout-partial.bin');
    const folder = path.join(scratch, 'timeout-folder');
    mkdirSync(folder);
    writeFileSync(path.join(folder, 'temp.txt'), 'x');
    const script = [
      'require("node:fs").writeFileSync(process.argv[1], "partial");',
      'setTimeout(() => {}, 60000);',
    ].join('');
    const error = await mediaError(() => runNode(script, [output], {
      timeoutMs: 300,
      outputs: [output],
      cleanupFolders: [folder],
    }));
    expect(error.code).toBe(ERROR_CODES.PROCESS_TIMEOUT);
    expect(error.details.binary).toBe(rawBinary);
    expect(error.details.timeoutSeconds).toBe(300 / 1000);
    expect(typeof error.details.elapsedSeconds).toBe('number');
    expect(Object.keys(error.details).sort()).toEqual([
      'binary',
      'elapsedSeconds',
      'timeoutSeconds',
    ]);
    expect(existsSync(output)).toBe(false);
    expect(existsSync(folder)).toBe(false);
  });

  it.skipIf(process.platform === 'win32')(
    'force-kills a child that ignores the termination signal',
    async (): Promise<void> => {
      const pidFile = path.join(scratch, 'ignored.pid');
      const script = [
        "process.on('SIGTERM', () => {});",
        'require("node:fs").writeFileSync(process.argv[1], String(process.pid));',
        'setInterval(() => {}, 1000);',
      ].join('');
      const error = await mediaError(() => runNode(script, [pidFile], {
        timeoutMs: 300,
        killGraceMs: 300,
      }));
      expect(error.code).toBe(ERROR_CODES.PROCESS_TIMEOUT);
      const pid = Number(readFileSync(pidFile, 'utf8'));
      expect(Number.isInteger(pid)).toBe(true);
      expect((): void => {
        process.kill(pid, 0);
      }).toThrow();
    },
  );

  it('keeps only the end of a long stderr stream', async (): Promise<void> => {
    const script = [
      'process.stderr.write("START" + "A".repeat(200 * 1024) + "ENDMARKER");',
    ].join('');
    const result = await runNode(script);
    expect(Buffer.byteLength(result.stderr, 'utf8')).toBeLessThanOrEqual(65536);
    expect(Buffer.byteLength(result.stderrTail, 'utf8')).toBeLessThanOrEqual(4096);
    expect(result.stderr.endsWith('ENDMARKER')).toBe(true);
    expect(result.stderr.includes('START')).toBe(false);
    expect(result.stderrTail.endsWith('ENDMARKER')).toBe(true);
    expect(result.stdout).toBe('');
  });

  it('hides the temp path in the tail only', async (): Promise<void> => {
    const tempDir = path.join(scratch, 'run-temp');
    mkdirSync(tempDir);
    const marker = `${tempDir}/clip`;
    const script = `process.stderr.write(${JSON.stringify(marker)})`;
    const result = await runNode(script, [], { tempDir });
    expect(result.stderr).toContain(tempDir);
    expect(result.stderrTail).toBe('<tmp>/clip');
  });

  it('delivers arguments unchanged', async (): Promise<void> => {
    const payload = ['has space', 'quo"te', 'a&b', '100%', 'line\nbreak'];
    const script = 'process.stdout.write(JSON.stringify(process.argv.slice(1)))';
    const result = await runNode(script, payload, { captureStdout: true });
    expect(JSON.parse(result.stdout)).toEqual(payload);
  });

  it('refuses an existing output and leaves the file and folder', async (): Promise<void> => {
    const folder = path.join(scratch, 'existing-folder');
    mkdirSync(folder);
    const file = path.join(folder, 'out.bin');
    const bytes = Buffer.from([1, 2, 3, 4, 5]);
    writeFileSync(file, bytes);
    writeFileSync(path.join(folder, 'keep.txt'), 'keep');
    const script = 'require("node:fs").writeFileSync(process.argv[1], "changed")';
    const error = await mediaError(() => runNode(script, [file], {
      outputs: [file],
      cleanupFolders: [folder],
    }));
    expect(error.code).toBe(ERROR_CODES.OUTPUT_EXISTS);
    expect(error.details).toEqual({ path: file, stage: 'run' });
    expect(readFileSync(file)).toEqual(bytes);
    expect(statSync(folder).isDirectory()).toBe(true);
    expect(readFileSync(path.join(folder, 'keep.txt'), 'utf8')).toBe('keep');
  });

  it('removes a partial output and its cleanup folder', async (): Promise<void> => {
    const output = path.join(scratch, 'partial.bin');
    const folder = path.join(scratch, 'partial-folder');
    mkdirSync(folder);
    writeFileSync(path.join(folder, 'temp.txt'), 'x');
    const script = [
      'require("node:fs").writeFileSync(process.argv[1], "partial");',
      'process.exit(1);',
    ].join('');
    const error = await mediaError(() => runNode(script, [output], {
      outputs: [output],
      cleanupFolders: [folder],
    }));
    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
    expect(error.details).toMatchObject({
      binary: rawBinary,
      exitCode: 1,
      signal: null,
    });
    expect(existsSync(output)).toBe(false);
    expect(existsSync(folder)).toBe(false);
  });

  it('fails a zero exit that writes no output', async (): Promise<void> => {
    const output = path.join(scratch, 'missing.bin');
    const folder = path.join(scratch, 'missing-folder');
    mkdirSync(folder);
    const error = await mediaError(() => runNode(
      'process.stderr.write("missing-output")',
      [],
      { outputs: [output], cleanupFolders: [folder] },
    ));
    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
    expect(error.details).toEqual({
      binary: rawBinary,
      exitCode: 0,
      signal: null,
      stderrTail: 'missing-output',
    });
    expect(existsSync(output)).toBe(false);
    expect(existsSync(folder)).toBe(false);
  });

  it('fails a zero exit that writes an empty output', async (): Promise<void> => {
    const output = path.join(scratch, 'empty.bin');
    const folder = path.join(scratch, 'empty-folder');
    mkdirSync(folder);
    const script = [
      'require("node:fs").writeFileSync(process.argv[1], "");',
      'process.stderr.write("empty-output");',
    ].join('');
    const error = await mediaError(() => runNode(script, [output], {
      outputs: [output],
      cleanupFolders: [folder],
    }));
    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
    expect(error.details).toEqual({
      binary: rawBinary,
      exitCode: 0,
      signal: null,
      stderrTail: 'empty-output',
    });
    expect(existsSync(output)).toBe(false);
    expect(existsSync(folder)).toBe(false);
  });

  it('keeps a real output and the cleanup folder', async (): Promise<void> => {
    const output = path.join(scratch, 'kept.bin');
    const folder = path.join(scratch, 'kept-folder');
    mkdirSync(folder);
    writeFileSync(path.join(folder, 'stay.txt'), 'stay');
    const script = 'require("node:fs").writeFileSync(process.argv[1], "ok")';
    const result = await runNode(script, [output], {
      outputs: [output],
      cleanupFolders: [folder],
    });
    expect(result.exitCode).toBe(0);
    expect(readFileSync(output, 'utf8')).toBe('ok');
    expect(readFileSync(path.join(folder, 'stay.txt'), 'utf8')).toBe('stay');
  });

  it('shows the child only the allowlisted environment', async (): Promise<void> => {
    const script = [
      'process.stdout.write(JSON.stringify({',
      'keys: Object.keys(process.env).sort(),',
      'LC_ALL: process.env.LC_ALL,',
      'LANG: process.env.LANG',
      '}))',
    ].join('');
    const result = await runNode(script, [], {
      captureStdout: true,
      env: {
        ...process.env,
        FFREPORT: 'file=/tmp/report',
        SECRET_TOKEN: 'tok',
      },
    });
    const parsed: unknown = JSON.parse(result.stdout);
    if (typeof parsed !== 'object' || parsed === null || !('keys' in parsed)) {
      throw new Error('Expected env keys.');
    }
    const keys = parsed.keys;
    expect(Array.isArray(keys)).toBe(true);
    if (!Array.isArray(keys)) {
      return;
    }
    expect(keys).not.toContain('FFREPORT');
    expect(keys).not.toContain('SECRET_TOKEN');
    for (const key of keys) {
      if (typeof key !== 'string') {
        throw new Error('Expected env key strings.');
      }
      // macOS restores this key in every child even when the passed env omits it.
      if (key === '__CF_USER_TEXT_ENCODING') {
        continue;
      }
      expect(allowedEnvNames).toContain(key);
    }
    expect(keys.some((key) => key.toLowerCase() === 'path')).toBe(true);
    expect(parsed).toMatchObject({ LC_ALL: 'C', LANG: 'C' });
  });

  it('runs at most two children at once', async (): Promise<void> => {
    expect(MAX_CONCURRENT_PROCESSES).toBe(2);
    const script = [
      'const start = Date.now();',
      'setTimeout(() => {',
      'process.stdout.write(JSON.stringify({ start, end: Date.now() }));',
      '}, 300);',
    ].join('');
    const runs = [0, 1, 2, 3, 4].map(() => runNode(script, [], {
      captureStdout: true,
      timeoutMs: 10000,
    }));
    const results = await Promise.all(runs);
    const spans = results.map((result) => readSpan(result.stdout));
    expect(spans).toHaveLength(5);
    for (const span of spans) {
      expect(span.end - span.start).toBeGreaterThanOrEqual(200);
    }
    expect(maxOverlap(spans)).toBeLessThanOrEqual(MAX_CONCURRENT_PROCESSES);
  });

  it('rejects an input whose symlink changed after resolve', async (): Promise<void> => {
    const root = path.join(scratch, 'guard-root');
    mkdirSync(root);
    const rootReal = realpathSync.native(root);
    const inside = path.join(rootReal, 'inside.bin');
    writeFileSync(inside, 'inside');
    const outside = path.join(scratch, 'outside.bin');
    writeFileSync(outside, 'outside');
    const outsideReal = realpathSync.native(outside);
    const link = path.join(rootReal, 'link.bin');
    symlinkSync(inside, link);
    const resolved = resolveInputPath(link, 'input', [rootReal], 'inputPath', 'video_trim');
    rmSync(link);
    symlinkSync(outside, link);
    const error = await mediaError(() => runNode('process.exit(0)', [], {
      guard: { inputs: [resolved], roots: [rootReal] },
    }));
    expect(error.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(error.details).toEqual({
      path: link,
      realPath: outsideReal,
      allowedRoots: [rootReal],
      reason: 'changed-after-check',
    });
  });

  it('reports a missing absolute binary and removes cleanup folders', async (): Promise<void> => {
    const folder = path.join(scratch, 'spawn-cleanup');
    mkdirSync(folder);
    writeFileSync(path.join(folder, 'gone.txt'), 'x');
    const missing = path.join(scratch, 'missing-binary');
    const error = await mediaError(() => runProcess(missing, ['-version'], {
      kind: 'ffmpeg',
      timeoutMs: 5000,
      cleanupFolders: [folder],
    }));
    expect(isSpawnFailure(error)).toBe(true);
    expect(error).toBeInstanceOf(SpawnFailedError);
    expect(error.code).toBe(ERROR_CODES.PROCESS_FAILED);
    expect(error.details).toEqual({
      binary: 'ffmpeg',
      exitCode: -1,
      signal: null,
      stderrTail: '',
      spawnFailed: true,
      spawnCode: 'ENOENT',
    });
    expect(isSpawnFailure(new MediaError(ERROR_CODES.PROCESS_FAILED, 'x'))).toBe(false);
    expect(existsSync(folder)).toBe(false);
  });

  it('rejects a relative binary', async (): Promise<void> => {
    const error = await mediaError(() => runProcess('ffmpeg', [], {
      kind: 'ffmpeg',
      timeoutMs: 1000,
    }));
    expect(error.code).toBe(ERROR_CODES.INTERNAL);
    expect(error.details).toEqual({ reason: 'relative-binary' });
  });
});

// The shutdown suite runs last on purpose: terminateAll is a one-way switch
// and every later spawn in this process would refuse to start.
describe('shutdown', (): void => {
  it.skipIf(process.platform === 'win32')(
    'kills a child whose SIGTERM fails and removes a path a finished run released',
    async (): Promise<void> => {
      // The caller registration must outlive the run's own release so
      // terminateAll still removes the path.
      const sharedDir = path.join(scratch, 'shared-output');
      mkdirSync(sharedDir);
      const releaseShared = registerCleanupPath(sharedDir);
      await runNode('process.exit(0)', [], { cleanupFolders: [sharedDir] });
      expect(existsSync(sharedDir)).toBe(true);

      const pidFile = path.join(scratch, 'stubborn.pid');
      const script = [
        'require("node:fs").writeFileSync(process.argv[1], String(process.pid))',
        'setInterval(() => {}, 1000)',
      ].join('\n');
      const run = runNode(script, [pidFile], { timeoutMs: 120000 });
      const settled = run.then(
        () => 'resolved',
        (error: unknown) => error,
      );
      await waitForFile(pidFile, 10000);
      const pid = Number(readFileSync(pidFile, 'utf8'));
      expect(Number.isInteger(pid)).toBe(true);

      // The SIGTERM kill throws for this one child, so only a still-tracked
      // SIGKILL can stop it.
      const realKill = ChildProcess.prototype.kill;
      let failSigterm = true;
      const killSpy = vi.spyOn(ChildProcess.prototype, 'kill').mockImplementation(
        function (this: ChildProcess, signal?: number | NodeJS.Signals): boolean {
          if (failSigterm && this.pid === pid && signal === 'SIGTERM') {
            failSigterm = false;
            throw new Error('simulated SIGTERM failure');
          }
          return realKill.call(this, signal);
        },
      );

      try {
        await Promise.race([
          terminateAll(),
          delay(15000).then((): void => {
            throw new Error('terminateAll did not finish within 15s');
          }),
        ]);
        expect(killSpy).toHaveBeenCalled();
        expect(pidAlive(pid)).toBe(false);
        expect(existsSync(sharedDir)).toBe(false);
      } finally {
        killSpy.mockRestore();
        releaseShared();
      }

      const failure = await settled;
      expect(failure).toBeInstanceOf(MediaError);
      if (failure instanceof MediaError) {
        expect(failure.code).toBe(ERROR_CODES.PROCESS_FAILED);
        expect(failure.details.signal).toBe('SIGKILL');
      }
    },
  );
});
