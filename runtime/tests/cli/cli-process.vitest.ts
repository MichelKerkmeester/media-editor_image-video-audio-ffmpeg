// ───────────────────────────────────────────────────────────────────
// MODULE: Cli Process Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { execFileSync, spawn } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import { PINNED_BINARY_SHA256 } from '../../src/core/ffmpeg-resolver.js';
import {
  executableFileName,
  platformKeyOf,
} from '../../src/core/pinned-builds.js';
import { ALL_TOOLS } from '../../src/server/all-tools.js';
import { generateImage, generateVideo } from '../helpers/media.js';
import { asList, asRecord, sha256Of } from '../helpers/tool-client.js';

import type { ChildProcess } from 'node:child_process';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface TextStream {
  text(): string;
}

/** One spawned cli run after it exits. */
interface CliRun {
  readonly code: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

/** Folders one spawned cli gets, all inside its own root. */
interface CliSandbox {
  readonly root: string;
  readonly work: string;
  readonly home: string;
  readonly data: string;
  readonly tmp: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const distCli = path.join(packageRoot, 'dist', 'cli.js');
const RUN_TIMEOUT_MS = 60_000;
const SIGNAL_WAIT_MS = 60_000;
const SIGNAL_TEST_MS = 120_000;
const BUILD_TIMEOUT_MS = 120_000;
const HOOK_TIMEOUT_MS = 180_000;
const EXPECTED_TOOL_COUNT = 40;
const TEMP_DIR_PREFIX = 'media-editor-';
const BASE64_PATTERN = /^[A-Za-z0-9+/=]{512,}$/;
const MARKER_VERSION = 'persisted-cli-marker';

const hostKey = platformKeyOf(process.platform, process.arch);
const pinnedDir = process.env.MEDIA_EDITOR_TEST_BIN_DIR ?? '';
const pinnedPaths = hostKey === undefined || pinnedDir === ''
  ? undefined
  : {
      ffmpeg: path.join(pinnedDir, executableFileName('ffmpeg', hostKey)),
      ffprobe: path.join(pinnedDir, executableFileName('ffprobe', hostKey)),
    };
// The install check runs only when the pinned pair on disk matches the table.
const pinsMatch = hostKey !== undefined
  && pinnedPaths !== undefined
  && existsSync(pinnedPaths.ffmpeg)
  && existsSync(pinnedPaths.ffprobe)
  && sha256Of(pinnedPaths.ffmpeg) === PINNED_BINARY_SHA256[hostKey]?.['ffmpeg']
  && sha256Of(pinnedPaths.ffprobe) === PINNED_BINARY_SHA256[hostKey]?.['ffprobe'];

let scratchRoot = '';
let signalInput = '';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function pipeOf(stream: Readable | null, name: string): Readable {
  if (stream === null) {
    throw new Error(`${name} is not piped`);
  }
  return stream;
}

function collectText(stream: Readable): TextStream {
  let received = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk: string | Buffer) => {
    received += chunk.toString();
  });
  return {
    text(): string {
      return received;
    },
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function stopChild(child: ChildProcess): void {
  try {
    child.kill('SIGKILL');
  } catch {
    // The child already exited.
  }
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) {
      resolve(child.exitCode);
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`process did not exit within ${timeoutMs}ms`));
    }, timeoutMs);
    const onExit = (code: number | null): void => {
      cleanup();
      resolve(code);
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      child.off('exit', onExit);
    };
    child.once('exit', onExit);
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

function makeSandbox(label: string): CliSandbox {
  const root = mkdtempSync(path.join(scratchRoot, `cli-${label}-`));
  const sandbox: CliSandbox = {
    root,
    work: path.join(root, 'work'),
    home: path.join(root, 'home'),
    data: path.join(root, 'data'),
    tmp: path.join(root, 'tmp'),
  };
  mkdirSync(sandbox.work);
  mkdirSync(sandbox.home);
  mkdirSync(sandbox.data);
  mkdirSync(sandbox.tmp);
  return sandbox;
}

// The child inherits everything but MEDIA_EDITOR variables, which would leak
// the caller's settings into a run that is meant to stand alone.
function childEnv(
  sandbox: CliSandbox,
  extra: NodeJS.ProcessEnv = {},
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key.startsWith('MEDIA_EDITOR_')) {
      continue;
    }
    env[key] = value;
  }
  env.HOME = sandbox.home;
  env.TMPDIR = sandbox.tmp;
  env.TMP = sandbox.tmp;
  env.TEMP = sandbox.tmp;
  env.MEDIA_EDITOR_DATA_DIR = sandbox.data;
  return { ...env, ...extra };
}

function runCli(
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly env: NodeJS.ProcessEnv;
    readonly stdin?: string;
    readonly timeoutMs?: number;
    readonly entry?: string;
  },
): Promise<CliRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [options.entry ?? distCli, ...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdout = collectText(pipeOf(child.stdout, 'stdout'));
    const stderr = collectText(pipeOf(child.stderr, 'stderr'));
    const limit = options.timeoutMs ?? RUN_TIMEOUT_MS;
    const timer = setTimeout(() => {
      stopChild(child);
      reject(new Error(`cli did not exit within ${limit}ms; stderr ${stderr.text()}`));
    }, limit);
    child.on('error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code: number | null) => {
      clearTimeout(timer);
      resolve({ code, stdout: stdout.text(), stderr: stderr.text() });
    });
    const stdin = child.stdin;
    if (stdin === null) {
      clearTimeout(timer);
      reject(new Error('stdin is not piped'));
      return;
    }
    if (options.stdin !== undefined) {
      stdin.write(options.stdin);
    }
    stdin.end();
  });
}

// stdout carries one JSON line and nothing else.
function singleJson(stdout: string): Record<string, unknown> {
  const lines = stdout.split('\n').filter((line) => line.length > 0);
  expect(lines).toHaveLength(1);
  const parsed: unknown = JSON.parse(lines[0] ?? '');
  return asRecord(parsed);
}

function stringValues(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      stringValues(entry, found);
    }
    return found;
  }
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) {
      stringValues(entry, found);
    }
  }
  return found;
}

function outputPath(body: Record<string, unknown>): string {
  const outputs = asList(body['outputs']);
  const first = asRecord(outputs[0]);
  const value = first['path'];
  expect(typeof value).toBe('string');
  return value as string;
}

// The encode runs inside a media-editor folder under TMPDIR, so the folder
// appearing is the earliest sign that the job is underway.
async function waitForTempEntry(
  directory: string,
  timeoutMs: number,
): Promise<string> {
  const startedAt = Date.now();
  for (;;) {
    const entry = readdirSync(directory).find((name) => (
      name.startsWith(TEMP_DIR_PREFIX)
    ));
    if (entry !== undefined) {
      return entry;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`no ${TEMP_DIR_PREFIX} entry under ${directory}`);
    }
    await delay(50);
  }
}

function processRows(): Array<{ pid: number; ppid: number; args: string }> {
  const rows: Array<{ pid: number; ppid: number; args: string }> = [];
  const table = execFileSync('ps', ['-axo', 'pid=,ppid=,args='], {
    encoding: 'utf8',
  });
  for (const line of table.split('\n')) {
    const match = /^(\d+)\s+(\d+)\s+(.*)$/.exec(line.trim());
    if (match === null) {
      continue;
    }
    rows.push({ pid: Number(match[1]), ppid: Number(match[2]), args: match[3] ?? '' });
  }
  return rows;
}

function mediaChildren(parentPid: number): number[] {
  return processRows()
    .filter((row) => (
      row.ppid === parentPid
      && (row.args.includes('ffmpeg') || row.args.includes('ffprobe'))
    ))
    .map((row) => row.pid);
}

async function waitForMediaChildren(
  parentPid: number,
  timeoutMs: number,
): Promise<number[]> {
  const startedAt = Date.now();
  for (;;) {
    const children = mediaChildren(parentPid);
    if (children.length > 0) {
      return children;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`no media child under pid ${parentPid}`);
    }
    await delay(50);
  }
}

function processesTouching(fragment: string): string[] {
  return processRows()
    .filter((row) => row.args.includes(fragment))
    .map((row) => row.args);
}

async function convertIntoFolder(
  sandbox: CliSandbox,
  source: 'flag' | 'file' | 'stdin',
): Promise<{ folder: string; first: string; second: string }> {
  const input = await generateImage(sandbox.work, {
    width: 96,
    height: 96,
    format: 'png',
    fileName: 'input.png',
  });
  const env = childEnv(sandbox);
  const call = (args: Record<string, unknown>): Promise<CliRun> => {
    const json = JSON.stringify(args);
    if (source === 'flag') {
      return runCli(['image_convert', '--args', json], {
        cwd: sandbox.work,
        env,
      });
    }
    if (source === 'file') {
      const argsFile = path.join(sandbox.root, `args-${Date.now()}.json`);
      writeFileSync(argsFile, json);
      return runCli(['image_convert', '--args-file', argsFile], {
        cwd: sandbox.work,
        env,
      });
    }
    return runCli(['image_convert'], { cwd: sandbox.work, env, stdin: json });
  };

  const first = await call({
    inputPath: input,
    outputName: 'cli batch',
    format: 'jpeg',
    maxBytes: 200000,
    fileName: 'first',
    subfolder: true,
  });
  expect(first.code, first.stderr).toBe(0);
  const firstPath = outputPath(singleJson(first.stdout));
  const folder = path.dirname(firstPath);
  const exportRoot = path.join(
    realpathSync(sandbox.work),
    'media files',
    'export',
  );
  expect(path.dirname(folder)).toBe(exportRoot);
  const folderName = path.basename(folder);
  expect(/^\d{3} - /.test(folderName)).toBe(true);

  const second = await call({
    inputPath: input,
    outputName: 'cli batch',
    format: 'jpeg',
    fileName: 'second',
    targetFolder: folderName,
  });
  expect(second.code, second.stderr).toBe(0);
  const secondPath = outputPath(singleJson(second.stdout));
  return { folder, first: firstPath, second: secondPath };
}

async function signalCase(
  signal: 'SIGINT' | 'SIGTERM',
  expected: number,
): Promise<void> {
  const paths = pinnedPaths as NonNullable<typeof pinnedPaths>;
  const sandbox = makeSandbox('signal');
  // The bundled ffprobe does not run on every host, so the child resolves the
  // pinned pair through the path overrides instead.
  const env = childEnv(sandbox, {
    MEDIA_EDITOR_FFMPEG_PATH: paths.ffmpeg,
    MEDIA_EDITOR_FFPROBE_PATH: paths.ffprobe,
  });
  const child = spawn(process.execPath, [
    distCli,
    'video_convert',
    '--allowed-dir',
    scratchRoot,
    '--args',
    JSON.stringify({
      inputPath: signalInput,
      outputName: 'signal-out',
      format: 'webm',
      subfolder: true,
    }),
  ], {
    cwd: sandbox.work,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const stderr = collectText(pipeOf(child.stderr, 'stderr'));
  collectText(pipeOf(child.stdout, 'stdout'));
  const pid = child.pid;
  expect(pid).toBeDefined();
  try {
    await waitForTempEntry(sandbox.tmp, SIGNAL_WAIT_MS);
    const children = await waitForMediaChildren(pid as number, SIGNAL_WAIT_MS);
    child.kill(signal);
    const code = await waitForExit(child, SIGNAL_WAIT_MS);
    expect(code, stderr.text()).toBe(expected);
    for (const childPid of children) {
      expect(pidAlive(childPid)).toBe(false);
    }
    expect(
      readdirSync(sandbox.tmp).filter((name) => name.startsWith(TEMP_DIR_PREFIX)),
    ).toEqual([]);
    const exportRoot = path.join(sandbox.work, 'media files', 'export');
    const leftovers = existsSync(exportRoot) ? readdirSync(exportRoot) : [];
    expect(leftovers).toEqual([]);
    expect(processesTouching(sandbox.tmp)).toEqual([]);
  } finally {
    stopChild(child);
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

beforeAll(async (): Promise<void> => {
  execFileSync('npm', ['run', 'build'], {
    cwd: packageRoot,
    stdio: 'pipe',
    timeout: BUILD_TIMEOUT_MS,
  });
  scratchRoot = mkdtempSync(path.join(tmpdir(), 'media-editor-cli-'));
  if (process.platform !== 'win32' && pinsMatch) {
    signalInput = await generateVideo(scratchRoot, {
      width: 320,
      height: 240,
      seconds: 120,
      fileName: 'signal-input.mp4',
    });
  }
}, HOOK_TIMEOUT_MS);

afterAll((): void => {
  if (scratchRoot.length > 0) {
    rmSync(scratchRoot, { recursive: true, force: true });
  }
});

it('lists every tool as one JSON object on stdout', async (): Promise<void> => {
  const sandbox = makeSandbox('list');
  const run = await runCli(['list'], {
    cwd: sandbox.work,
    env: childEnv(sandbox),
  });
  expect(run.code).toBe(0);
  const tools = asList(singleJson(run.stdout)['tools']);
  expect(tools).toHaveLength(EXPECTED_TOOL_COUNT);
  expect(tools.map((tool) => asRecord(tool)['name'])).toEqual(
    ALL_TOOLS.map((definition) => definition.name),
  );
  expect(run.stderr).toBe('');
});

// npm link and npm install -g expose dist/cli.js through a symlink, so the
// entry check must follow the link back to the real file. A literal argv[1]
// comparison sees the link path, runs nothing, and still exits 0.
it.skipIf(process.platform === 'win32')(
  'lists tools when the cli starts through a symlink',
  async (): Promise<void> => {
    const sandbox = makeSandbox('linked');
    const link = path.join(sandbox.root, 'media-editor');
    symlinkSync(distCli, link);
    const run = await runCli(['list'], {
      cwd: sandbox.work,
      env: childEnv(sandbox),
      entry: link,
    });
    expect(run.code).toBe(0);
    const tools = asList(singleJson(run.stdout)['tools']);
    expect(tools).toHaveLength(EXPECTED_TOOL_COUNT);
    expect(tools.map((tool) => asRecord(tool)['name'])).toEqual(
      ALL_TOOLS.map((definition) => definition.name),
    );
  },
);

it('describes image_convert with the placement and size fields', async (): Promise<void> => {
  const sandbox = makeSandbox('describe');
  const run = await runCli(['describe', 'image_convert'], {
    cwd: sandbox.work,
    env: childEnv(sandbox),
  });
  expect(run.code).toBe(0);
  const body = singleJson(run.stdout);
  expect(body['name']).toBe('image_convert');
  const properties = asRecord(asRecord(body['inputSchema'])['properties']);
  for (const field of [
    'inputPath',
    'outputName',
    'format',
    'quality',
    'maxBytes',
    'fileName',
    'subfolder',
    'targetFolder',
  ]) {
    expect(properties, field).toHaveProperty(field);
  }
});

it('rejects describe for an unknown tool', async (): Promise<void> => {
  const sandbox = makeSandbox('describe');
  const run = await runCli(['describe', 'no_such_tool'], {
    cwd: sandbox.work,
    env: childEnv(sandbox),
  });
  expect(run.code).toBe(2);
  const body = singleJson(run.stdout);
  expect(body['code']).toBe('INVALID_INPUT');
  expect(body['message']).toBe('Unknown tool: no_such_tool');
  expect(run.stderr).toContain('Unknown tool: no_such_tool');
});

it('converts into one numbered folder with --args', async (): Promise<void> => {
  const sandbox = makeSandbox('convert-flag');
  const { folder, first, second } = await convertIntoFolder(sandbox, 'flag');
  expect(path.dirname(first)).toBe(folder);
  expect(path.dirname(second)).toBe(folder);
  expect(existsSync(first)).toBe(true);
  expect(existsSync(second)).toBe(true);
  expect(readdirSync(folder).sort()).toEqual(['first.jpg', 'second.jpg']);
});

it('converts into one numbered folder with --args-file', async (): Promise<void> => {
  const sandbox = makeSandbox('convert-file');
  const { folder, first, second } = await convertIntoFolder(sandbox, 'file');
  expect(path.dirname(first)).toBe(folder);
  expect(path.dirname(second)).toBe(folder);
  expect(existsSync(first)).toBe(true);
  expect(existsSync(second)).toBe(true);
  expect(readdirSync(folder).sort()).toEqual(['first.jpg', 'second.jpg']);
});

it('converts into one numbered folder with stdin', async (): Promise<void> => {
  const sandbox = makeSandbox('convert-stdin');
  const { folder, first, second } = await convertIntoFolder(sandbox, 'stdin');
  expect(path.dirname(first)).toBe(folder);
  expect(path.dirname(second)).toBe(folder);
  expect(existsSync(first)).toBe(true);
  expect(existsSync(second)).toBe(true);
  expect(readdirSync(folder).sort()).toEqual(['first.jpg', 'second.jpg']);
});

it('reports bad input as exit 2 with INVALID_INPUT', async (): Promise<void> => {
  const sandbox = makeSandbox('errors');
  const env = childEnv(sandbox);
  const cases: ReadonlyArray<{
    readonly argv: readonly string[];
    readonly message: string;
    readonly reason?: string;
  }> = [
    {
      argv: ['image_convert', '--args', '{not json'],
      message: 'Arguments are not valid JSON.',
    },
    {
      argv: ['no_such_tool'],
      message: 'Unknown tool: no_such_tool',
      reason: 'unknown-tool',
    },
    {
      argv: [
        'no_such_tool',
        '--args-file',
        path.join(sandbox.root, 'missing.json'),
      ],
      message: 'Unknown tool: no_such_tool',
      reason: 'unknown-tool',
    },
    {
      argv: ['no_such_tool', '--args', 'not json'],
      message: 'Unknown tool: no_such_tool',
      reason: 'unknown-tool',
    },
    {
      argv: [
        'image_convert',
        '--args',
        JSON.stringify({
          inputPath: '/work/input.png',
          outputName: 'converted',
          format: 'bogus',
        }),
      ],
      message: 'Invalid arguments for tool image_convert: format',
      reason: 'invalid-arguments',
    },
    {
      argv: [
        'image_convert',
        '--args',
        '{}',
        '--args-file',
        path.join(sandbox.root, 'args.json'),
      ],
      message: 'Choose only one of --args and --args-file.',
    },
    {
      argv: ['list', '--bogus'],
      message: 'Unknown flag: --bogus',
    },
  ];
  for (const entry of cases) {
    const run = await runCli(entry.argv, { cwd: sandbox.work, env });
    expect(run.code, `${entry.argv.join(' ')} stderr ${run.stderr}`).toBe(2);
    const body = singleJson(run.stdout);
    expect(body['code']).toBe('INVALID_INPUT');
    expect(body['message']).toBe(entry.message);
    if (entry.reason !== undefined) {
      expect(asRecord(body['details'])['reason']).toBe(entry.reason);
    }
    expect(run.stderr).toContain(entry.message);
  }
});

it('exits 1 with PATH_NOT_ALLOWED for an input outside the allowed folder', async (): Promise<void> => {
  const sandbox = makeSandbox('denied');
  const outside = path.join(sandbox.root, 'outside');
  mkdirSync(outside);
  const secret = await generateImage(outside, {
    width: 64,
    height: 64,
    format: 'png',
    fileName: 'secret.png',
  });
  const run = await runCli(
    ['image_probe', '--args', JSON.stringify({ inputPath: secret })],
    { cwd: sandbox.work, env: childEnv(sandbox) },
  );
  expect(run.code).toBe(1);
  expect(singleJson(run.stdout)['code']).toBe('PATH_NOT_ALLOWED');
});

it('writes image_probe previews under the data folder as JPEG', async (): Promise<void> => {
  const sandbox = makeSandbox('preview');
  const input = await generateImage(sandbox.work, {
    width: 128,
    height: 128,
    format: 'png',
    fileName: 'input.png',
  });
  const run = await runCli(
    ['image_probe', '--args', JSON.stringify({ inputPath: input, preview: true })],
    { cwd: sandbox.work, env: childEnv(sandbox) },
  );
  expect(run.code, run.stderr).toBe(0);
  const body = singleJson(run.stdout);
  const previewPath = body['previewPath'];
  expect(typeof previewPath).toBe('string');
  const previewsDir = path.join(sandbox.data, 'previews');
  expect(path.dirname(previewPath as string)).toBe(previewsDir);
  const bytes = readFileSync(previewPath as string);
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1]).toBe(0xd8);
  expect(bytes[2]).toBe(0xff);
  const strings = stringValues(body);
  expect(strings.some((entry) => BASE64_PATTERN.test(entry))).toBe(false);
  expect(run.stdout.length).toBeLessThan(8192);
});

it('rejects a bare token and never opens that folder', async (): Promise<void> => {
  const sandbox = makeSandbox('config');
  const stray = path.join(sandbox.root, 'stray');
  mkdirSync(stray);
  const secret = await generateImage(stray, {
    width: 64,
    height: 64,
    format: 'png',
    fileName: 'secret.png',
  });
  const env = childEnv(sandbox);
  const refused = await runCli(['health', stray], { cwd: sandbox.work, env });
  expect(refused.code).toBe(2);
  expect(refused.stderr).toContain(
    'A tool command takes arguments through JSON input.',
  );
  const denied = await runCli(
    ['image_probe', '--args', JSON.stringify({ inputPath: secret })],
    { cwd: sandbox.work, env },
  );
  expect(denied.code).toBe(1);
  expect(singleJson(denied.stdout)['code']).toBe('PATH_NOT_ALLOWED');
});

it('opens an outside folder through --allowed-dir', async (): Promise<void> => {
  const sandbox = makeSandbox('allowed');
  const outside = path.join(sandbox.root, 'outside');
  mkdirSync(outside);
  const input = await generateImage(outside, {
    width: 64,
    height: 64,
    format: 'png',
    fileName: 'seen.png',
  });
  const env = childEnv(sandbox);
  const health = await runCli(['health', '--allowed-dir', outside], {
    cwd: sandbox.work,
    env,
  });
  expect(health.code, health.stderr).toBe(0);
  expect(singleJson(health.stdout)['allowedRoots']).toEqual([
    realpathSync(outside),
  ]);
  const probe = await runCli(
    [
      'image_probe',
      '--allowed-dir',
      outside,
      '--args',
      JSON.stringify({ inputPath: input }),
    ],
    { cwd: sandbox.work, env },
  );
  expect(probe.code, probe.stderr).toBe(0);
});

it('treats a bare double dash as a usage error', async (): Promise<void> => {
  const sandbox = makeSandbox('dash');
  const run = await runCli(['health', '--', 'extra'], {
    cwd: sandbox.work,
    env: childEnv(sandbox),
  });
  expect(run.code).toBe(2);
  expect(run.stderr).toContain('Unknown flag: --');
});

it('treats no command as a usage error', async (): Promise<void> => {
  const sandbox = makeSandbox('empty');
  const run = await runCli([], {
    cwd: sandbox.work,
    env: childEnv(sandbox),
  });
  expect(run.code).toBe(2);
  expect(run.stderr).toContain('Usage: media-editor');
});

it('prefers the flag, then the environment, then the default output folder', async (): Promise<void> => {
  const sandbox = makeSandbox('output');
  const envDir = path.join(sandbox.root, 'env-output');
  const flagDir = path.join(sandbox.root, 'flag-output');
  const envOnly = await runCli(['health'], {
    cwd: sandbox.work,
    env: childEnv(sandbox, { MEDIA_EDITOR_OUTPUT_DIR: envDir }),
  });
  expect(singleJson(envOnly.stdout)['outputFolder']).toBe(envDir);
  const flagWins = await runCli(['health', '--output-dir', flagDir], {
    cwd: sandbox.work,
    env: childEnv(sandbox, { MEDIA_EDITOR_OUTPUT_DIR: envDir }),
  });
  expect(singleJson(flagWins.stdout)['outputFolder']).toBe(flagDir);
  const fallback = await runCli(['health'], {
    cwd: sandbox.work,
    env: childEnv(sandbox),
  });
  expect(singleJson(fallback.stdout)['outputFolder']).toBe(
    path.join(realpathSync(sandbox.work), 'media files', 'export'),
  );
});

it('anchors the default folders on the project when started inside media files', async (): Promise<void> => {
  const sandbox = makeSandbox('nested');
  const importDir = path.join(sandbox.work, 'media files', 'import');
  mkdirSync(importDir, { recursive: true });
  const project = realpathSync(sandbox.work);
  const run = await runCli(['health'], {
    cwd: importDir,
    env: childEnv(sandbox),
  });
  expect(run.code, run.stderr).toBe(0);
  const health = singleJson(run.stdout);
  expect(health['outputFolder']).toBe(path.join(project, 'media files', 'export'));
  expect(health['allowedRoots']).toEqual([project]);
});

// A spawned run has no usable ffprobe on this host without the pinned pair
// that npm run test:pinned provides, so the signal cases skip in a plain run.
it.skipIf(process.platform === 'win32' || !pinsMatch)(
  'kills the encode and cleans up on SIGTERM',
  async (): Promise<void> => {
    await signalCase('SIGTERM', 143);
  },
  SIGNAL_TEST_MS,
);

it.skipIf(process.platform === 'win32' || !pinsMatch)(
  'kills the encode and cleans up on SIGINT',
  async (): Promise<void> => {
    await signalCase('SIGINT', 130);
  },
  SIGNAL_TEST_MS,
);

// Shutdown must not outlive a ref'd grace timer: the run timeout is minutes,
// so an exit that waits for anything but the children fails this bound.
it.skipIf(process.platform === 'win32' || !pinsMatch)(
  'exits promptly on SIGTERM while an encode runs',
  async (): Promise<void> => {
    const paths = pinnedPaths as NonNullable<typeof pinnedPaths>;
    const sandbox = makeSandbox('sigterm-exit');
    const env = childEnv(sandbox, {
      MEDIA_EDITOR_FFMPEG_PATH: paths.ffmpeg,
      MEDIA_EDITOR_FFPROBE_PATH: paths.ffprobe,
    });
    const child = spawn(process.execPath, [
      distCli,
      'video_convert',
      '--allowed-dir',
      scratchRoot,
      '--args',
      JSON.stringify({
        inputPath: signalInput,
        outputName: 'sigterm-out',
        format: 'webm',
        subfolder: true,
      }),
    ], {
      cwd: sandbox.work,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stderr = collectText(pipeOf(child.stderr, 'stderr'));
    collectText(pipeOf(child.stdout, 'stdout'));
    const pid = child.pid;
    expect(pid).toBeDefined();
    try {
      await waitForTempEntry(sandbox.tmp, SIGNAL_WAIT_MS);
      await waitForMediaChildren(pid as number, SIGNAL_WAIT_MS);
      const signaledAt = Date.now();
      child.kill('SIGTERM');
      const code = await waitForExit(child, SIGNAL_WAIT_MS);
      const elapsed = Date.now() - signaledAt;
      expect(code, stderr.text()).toBe(143);
      expect(elapsed).toBeLessThan(20000);
    } finally {
      stopChild(child);
    }
  },
  SIGNAL_TEST_MS,
);

it('persists the probe cache in the shared data folder between runs', async (): Promise<void> => {
  const sandbox = makeSandbox('cache');
  const env = childEnv(sandbox);
  const first = await runCli(['health'], { cwd: sandbox.work, env });
  expect(first.code, first.stderr).toBe(0);
  const cacheFile = path.join(sandbox.data, 'cache', 'probes.json');
  expect(existsSync(cacheFile)).toBe(true);
  const document = asRecord(
    JSON.parse(readFileSync(cacheFile, 'utf8')) as unknown,
  );
  const ffmpegRow = asList(document['binaries'])
    .map((entry) => asRecord(entry))
    .find((entry) => entry['name'] === 'ffmpeg');
  expect(ffmpegRow).toBeDefined();
  if (ffmpegRow === undefined) {
    throw new Error('the persisted cache has no ffmpeg row');
  }
  // The marker version can only reach health through the persisted document.
  ffmpegRow['version'] = `ffmpeg version ${MARKER_VERSION}`;
  writeFileSync(cacheFile, JSON.stringify(document, null, 2));
  const second = await runCli(['health'], { cwd: sandbox.work, env });
  expect(second.code, second.stderr).toBe(0);
  const body = singleJson(second.stdout);
  expect(asRecord(body['ffmpeg'])['version']).toBe(
    `ffmpeg version ${MARKER_VERSION}`,
  );
});

// Bundled binaries win a cold lookup, so this primes the persisted cache with
// a health run, points the stored rows at the installed pair, then checks the
// next health run reports the install. It needs the pinned pair that
// npm run test:pinned provides.
it.skipIf(!pinsMatch)(
  'finds binaries placed where media_setup_ffmpeg installs them',
  async (): Promise<void> => {
    const key = hostKey as NonNullable<typeof hostKey>;
    const paths = pinnedPaths as NonNullable<typeof pinnedPaths>;
    const sandbox = makeSandbox('installed');
    const env = childEnv(sandbox);
    const binDir = path.join(sandbox.data, 'bin');
    mkdirSync(binDir, { recursive: true });
    const names = ['ffmpeg', 'ffprobe'] as const;
    const installed: Record<(typeof names)[number], string> = {
      ffmpeg: '',
      ffprobe: '',
    };
    const record: Record<string, { fileName: string; sha256: string }> = {};
    for (const name of names) {
      const fileName = executableFileName(name, key);
      const target = path.join(binDir, fileName);
      copyFileSync(paths[name], target);
      if (process.platform !== 'win32') {
        chmodSync(target, 0o755);
      }
      installed[name] = target;
      record[name] = {
        fileName,
        sha256: PINNED_BINARY_SHA256[key]?.[name] as string,
      };
    }
    writeFileSync(
      path.join(binDir, 'install.json'),
      JSON.stringify({ platform: key, binaries: record }),
    );
    const first = await runCli(['health'], { cwd: sandbox.work, env });
    expect(first.code, first.stderr).toBe(0);
    const cacheFile = path.join(sandbox.data, 'cache', 'probes.json');
    const document = asRecord(
      JSON.parse(readFileSync(cacheFile, 'utf8')) as unknown,
    );
    const rows = asList(document['binaries']).map((entry) => asRecord(entry));
    for (const name of names) {
      const row = rows.find((entry) => entry['name'] === name);
      expect(row, `${name} persisted row`).toBeDefined();
      if (row === undefined) {
        throw new Error(`the persisted cache has no ${name} row`);
      }
      const info = statSync(installed[name]);
      row['path'] = installed[name];
      row['source'] = 'installed';
      row['version'] = `${name} version ${MARKER_VERSION}`;
      row['size'] = info.size;
      row['mtimeMs'] = info.mtimeMs;
    }
    writeFileSync(cacheFile, JSON.stringify(document, null, 2));
    const second = await runCli(['health'], { cwd: sandbox.work, env });
    expect(second.code, second.stderr).toBe(0);
    const body = singleJson(second.stdout);
    for (const name of names) {
      const report = asRecord(body[name]);
      expect(report['found']).toBe(true);
      expect(report['source']).toBe('installed');
      expect(report['path']).toBe(installed[name]);
      expect(report['version']).toBe(`${name} version ${MARKER_VERSION}`);
    }
  },
  RUN_TIMEOUT_MS,
);
