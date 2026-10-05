// ───────────────────────────────────────────────────────────────────
// MODULE: Pinned Cli Smoke Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, expect, it } from 'vitest';

import {
  executableFileName,
  PINNED_BUILDS,
  platformKeyOf,
} from '../../src/core/pinned-builds.js';
import { asRecord } from '../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const distCli = path.join(packageRoot, 'dist', 'cli.js');
const RUN_TIMEOUT_MS = 60_000;
const BUILD_TIMEOUT_MS = 120_000;
const HOOK_TIMEOUT_MS = 180_000;

// MEDIA_EDITOR_TEST_BIN_DIR is only set under npm run test:pinned, so the
// suite reports itself skipped during a plain npm test run.
const pinnedDir = process.env.MEDIA_EDITOR_TEST_BIN_DIR ?? '';
const hostKey = platformKeyOf(process.platform, process.arch);

let scratchRoot = '';

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function collect(stream: Readable): { text(): string } {
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

function cleanEnv(home: string, data: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || key.startsWith('MEDIA_EDITOR_')) {
      continue;
    }
    env[key] = value;
  }
  env.HOME = home;
  env.MEDIA_EDITOR_DATA_DIR = data;
  return env;
}

function runHealth(env: NodeJS.ProcessEnv, cwd: string): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [distCli, 'health'], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const stdout = collect(child.stdout as Readable);
    const stderr = collect(child.stderr as Readable);
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // The child already exited.
      }
      reject(new Error(`cli did not exit within ${RUN_TIMEOUT_MS}ms`));
    }, RUN_TIMEOUT_MS);
    child.on('error', (error: Error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code: number | null) => {
      clearTimeout(timer);
      resolve({ code, stdout: stdout.text(), stderr: stderr.text() });
    });
    child.stdin?.end();
  });
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

beforeAll((): void => {
  execFileSync('npm', ['run', 'build'], {
    cwd: packageRoot,
    stdio: 'pipe',
    timeout: BUILD_TIMEOUT_MS,
  });
  scratchRoot = mkdtempSync(path.join(tmpdir(), 'media-editor-pinned-cli-'));
}, HOOK_TIMEOUT_MS);

afterAll((): void => {
  if (scratchRoot.length > 0) {
    rmSync(scratchRoot, { recursive: true, force: true });
  }
});

it.skipIf(pinnedDir === '' || hostKey === undefined)(
  'reports the pinned pair through the path overrides',
  async (): Promise<void> => {
    const key = hostKey as NonNullable<typeof hostKey>;
    const root = mkdtempSync(path.join(scratchRoot, 'work-'));
    const home = path.join(root, 'home');
    const data = path.join(root, 'data');
    const work = path.join(root, 'work');
    mkdirSync(home);
    mkdirSync(data);
    mkdirSync(work);
    const env = cleanEnv(home, data);
    env.MEDIA_EDITOR_FFMPEG_PATH = path.join(
      pinnedDir,
      executableFileName('ffmpeg', key),
    );
    env.MEDIA_EDITOR_FFPROBE_PATH = path.join(
      pinnedDir,
      executableFileName('ffprobe', key),
    );
    const run = await runHealth(env, work);
    expect(run.code, run.stderr).toBe(0);
    const lines = run.stdout.split('\n').filter((line) => line.length > 0);
    expect(lines).toHaveLength(1);
    const body = asRecord(JSON.parse(lines[0] ?? '') as unknown);
    const expected = PINNED_BUILDS[key].version;
    for (const name of ['ffmpeg', 'ffprobe'] as const) {
      const report = asRecord(body[name]);
      expect(report['found']).toBe(true);
      expect(report['source']).toBe('env-override');
      // The resolver keeps the whole first -version line, copyright tail and all.
      expect(report['version']).toMatch(
        new RegExp(`^${name} version ${expected}\\b`),
      );
    }
  },
  RUN_TIMEOUT_MS,
);
