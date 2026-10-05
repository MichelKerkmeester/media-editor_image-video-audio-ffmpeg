// ───────────────────────────────────────────────────────────────────
// MODULE: Stdio Server Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { spawn, execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, expect, it } from 'vitest';

import type { ChildProcess } from 'node:child_process';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface TextStream {
  text(): string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const distIndex = path.join(packageRoot, 'dist', 'index.js');
const EXIT_WAIT_MS = 5_000;
const STARTUP_WAIT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 120_000;
const BUILD_TIMEOUT_MS = 120_000;
const HOOK_TIMEOUT_MS = 180_000;

const INITIALIZE_MESSAGE = `${JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-11-25',
    capabilities: {},
    clientInfo: {
      name: 'stdio-raw',
      version: '0.0.0',
    },
  },
})}\n`;

let scratchRoot = '';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function allowedDir(): string {
  return path.join(scratchRoot, 'allowed');
}

function outputDir(): string {
  return path.join(scratchRoot, 'output');
}

function packageVersion(): string {
  const loaded: unknown = JSON.parse(
    readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
  );
  if (!isRecord(loaded) || typeof loaded.version !== 'string') {
    throw new Error('package version missing');
  }
  return loaded.version;
}

function spawnBuiltServer(env: NodeJS.ProcessEnv): ChildProcess {
  const child = spawn(process.execPath, [distIndex], {
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.on('error', () => {
    // The read or exit wait reports a child that never started.
  });
  return child;
}

function stdinOf(child: ChildProcess): NodeJS.WritableStream {
  const stream = child.stdin;
  if (stream === null) {
    throw new Error('stdin is not piped');
  }
  return stream;
}

function stdoutOf(child: ChildProcess): Readable {
  const stream = child.stdout;
  if (stream === null) {
    throw new Error('stdout is not piped');
  }
  return stream;
}

function stderrOf(child: ChildProcess): Readable {
  const stream = child.stderr;
  if (stream === null) {
    throw new Error('stderr is not piped');
  }
  return stream;
}

function stopChild(child: ChildProcess): void {
  try {
    child.kill('SIGKILL');
  } catch {
    // The child already exited.
  }
}

function killPid(pid: number | null): void {
  if (pid === null) {
    return;
  }
  try {
    process.kill(pid, 'SIGKILL');
  } catch {
    // The child already exited.
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
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

function readFirstLine(stream: Readable, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(
        `timed out waiting for a stdout line; saw ${JSON.stringify(buffer)}`,
      ));
    }, timeoutMs);
    const onData = (chunk: string | Buffer): void => {
      buffer += chunk.toString();
      const newlineAt = buffer.indexOf('\n');
      if (newlineAt === -1) {
        return;
      }
      cleanup();
      resolve(buffer.slice(0, newlineAt).replace(/\r$/, ''));
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      stream.off('data', onData);
    };
    stream.on('data', onData);
  });
}

async function waitForText(
  read: () => string,
  pattern: string,
  timeoutMs: number,
): Promise<string> {
  const startedAt = Date.now();
  for (;;) {
    const text = read();
    if (text.includes(pattern)) {
      return text;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(`timed out waiting for ${pattern}; saw ${text}`);
    }
    await delay(20);
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

async function readInitializeReply(child: ChildProcess): Promise<string> {
  const linePromise = readFirstLine(stdoutOf(child), STARTUP_WAIT_MS);
  stdinOf(child).write(INITIALIZE_MESSAGE);
  return linePromise;
}

function rawEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    MEDIA_EDITOR_TIMEOUT_SECONDS: 'abc',
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

beforeAll((): void => {
  execFileSync('npm', ['run', 'build'], {
    cwd: packageRoot,
    stdio: 'pipe',
    timeout: BUILD_TIMEOUT_MS,
  });
  scratchRoot = mkdtempSync(path.join(tmpdir(), 'media-editor-stdio-'));
  mkdirSync(allowedDir());
  mkdirSync(outputDir());
}, HOOK_TIMEOUT_MS);

afterAll((): void => {
  if (scratchRoot.length > 0) {
    rmSync(scratchRoot, { recursive: true, force: true });
  }
});

it('lists and calls media_health over stdio', async (): Promise<void> => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [
      distIndex,
      '--allowed-dir',
      allowedDir(),
      '--output-dir',
      outputDir(),
    ],
    stderr: 'pipe',
  });
  const stderr = transport.stderr;
  if (stderr instanceof Readable) {
    stderr.resume();
  }
  const client = new Client({ name: 'stdio-smoke', version: '0.0.0' });
  let childPid: number | null = null;
  try {
    await client.connect(transport);
    childPid = transport.pid;
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    expect(names).toContain('media_health');

    const result = await client.callTool({ name: 'media_health' });
    expect(result.isError).toBeFalsy();
    const body = result.structuredContent;
    expect(isRecord(body)).toBe(true);
    if (!isRecord(body)) {
      throw new Error('expected structured content');
    }
    expect(body.serverVersion).toBe(packageVersion());
    expect(body.allowedRoots).toEqual([realpathSync.native(allowedDir())]);

    for (const binary of [body.ffmpeg, body.ffprobe]) {
      expect(isRecord(binary)).toBe(true);
      if (!isRecord(binary)) {
        throw new Error('expected a binary report');
      }
      expect(typeof binary.found).toBe('boolean');
      if (binary.found === true) {
        expect(typeof binary.source).toBe('string');
        expect(typeof binary.version).toBe('string');
        expect(binary.version).not.toBe('');
      }
    }
    expect(Array.isArray(body.capabilities)).toBe(true);
    if (isRecord(body.ffmpeg) && body.ffmpeg.found === true && Array.isArray(body.capabilities)) {
      expect(body.capabilities.length).toBeGreaterThan(0);
    }
  } finally {
    try {
      await client.close();
    } finally {
      killPid(childPid);
    }
  }
}, HEALTH_TIMEOUT_MS);

it('keeps stdout on the protocol and exits when stdin ends', async (): Promise<void> => {
  const child = spawnBuiltServer(rawEnv());
  try {
    const stderrText = collectText(stderrOf(child));
    const stderrPromise = waitForText(
      stderrText.text,
      'MEDIA_EDITOR_TIMEOUT_SECONDS',
      STARTUP_WAIT_MS,
    );
    const line = await readInitializeReply(child);
    const stderr = await stderrPromise;

    expect(line.startsWith('{')).toBe(true);
    const parsed: unknown = JSON.parse(line);
    expect(isRecord(parsed)).toBe(true);
    if (!isRecord(parsed)) {
      throw new Error('expected a JSON object');
    }
    expect(parsed).toHaveProperty('result');
    expect(line.includes('[media-editor]')).toBe(false);
    expect(stderr).toContain('MEDIA_EDITOR_TIMEOUT_SECONDS');
    expect(stderr).not.toContain('abc');

    stdinOf(child).end();
    const code = await waitForExit(child, EXIT_WAIT_MS);
    expect(code).toBe(0);
  } finally {
    stopChild(child);
  }
}, 60_000);

it.skipIf(process.platform === 'win32')(
  'exits 0 on SIGTERM',
  async (): Promise<void> => {
    const child = spawnBuiltServer(rawEnv());
    try {
      stderrOf(child).resume();
      const line = await readInitializeReply(child);
      expect(line.startsWith('{')).toBe(true);
      child.kill('SIGTERM');
      const code = await waitForExit(child, EXIT_WAIT_MS);
      expect(code).toBe(0);
    } finally {
      stopChild(child);
    }
  },
  60_000,
);
