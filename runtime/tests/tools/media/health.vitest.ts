// ───────────────────────────────────────────────────────────────────
// MODULE: Media Health Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import sharp from 'sharp';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { resetCapabilityCache } from '../../../src/core/capabilities.js';
import { resetResolverCache } from '../../../src/core/ffmpeg-resolver.js';
import { createServer } from '../../../src/server/create-server.js';
import { createToolContext } from '../../../src/server/tool-context.js';

import type { ServerConfig } from '../../../src/core/config.js';
import type { BinaryName, ResolvedBinary } from '../../../src/core/ffmpeg-resolver.js';
import type { ToolContext } from '../../../src/server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface FoundReport {
  readonly path: string;
  readonly source: string;
  readonly version: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const scratch = mkdtempSync(path.join(tmpdir(), 'media-editor-health-'));
const allowedRoot = path.join(scratch, 'allowed');
const outputDir = path.join(allowedRoot, 'output');
const dataDir = path.join(scratch, 'data');
mkdirSync(allowedRoot);
mkdirSync(dataDir);

const BINARY_SOURCES = [
  'env-override',
  'bundled',
  'system-path',
  'installed',
] as const;

const config: ServerConfig = {
  allowedRoots: [allowedRoot],
  outputDir,
  ffmpegPath: undefined,
  ffprobePath: undefined,
  timeoutSeconds: 90,
  dataDir,
  logLevel: 'debug',
};

const missingFfmpegConfig: ServerConfig = {
  ...config,
  ffmpegPath: path.join(scratch, 'missing-ffmpeg'),
};

const emptyRootsConfig: ServerConfig = {
  ...config,
  allowedRoots: [],
  outputDir: undefined,
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function packageVersion(): string {
  const loaded: unknown = JSON.parse(
    readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
  );
  if (!isRecord(loaded) || typeof loaded.version !== 'string') {
    throw new Error('package version missing');
  }
  return loaded.version;
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(isRecord(value)).toBe(true);
  if (!isRecord(value)) {
    throw new Error('expected an object');
  }
  return value;
}

function asList(value: unknown): unknown[] {
  expect(Array.isArray(value)).toBe(true);
  if (!Array.isArray(value)) {
    throw new Error('expected a list');
  }
  return value;
}

function foundReport(value: Record<string, unknown>): FoundReport {
  expect(value.found).toBe(true);
  expect(typeof value.path).toBe('string');
  expect(typeof value.source).toBe('string');
  expect(typeof value.version).toBe('string');
  if (
    typeof value.path !== 'string'
    || typeof value.source !== 'string'
    || typeof value.version !== 'string'
  ) {
    throw new Error('expected a found binary');
  }
  return {
    path: value.path,
    source: value.source,
    version: value.version,
  };
}

function textOf(content: readonly unknown[]): string {
  const first = content[0];
  expect(isRecord(first)).toBe(true);
  if (!isRecord(first) || typeof first.text !== 'string') {
    throw new Error('expected text content');
  }
  return first.text;
}

async function withHealthClient(
  serverConfig: ServerConfig,
  run: (client: Client) => Promise<void>,
  configWarnings?: readonly string[],
  context?: ToolContext,
): Promise<void> {
  const server = createServer(serverConfig, { configWarnings, context });
  const client = new Client({ name: 'health-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

function errorFlag(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  expect(typeof value).toBe('boolean');
  if (typeof value !== 'boolean') {
    throw new Error('expected an error flag');
  }
  return value;
}

async function callHealth(client: Client): Promise<{
  readonly isError: boolean | undefined;
  readonly content: readonly unknown[];
  readonly structuredContent: Record<string, unknown>;
}> {
  const result = await client.callTool({ name: 'media_health' });
  if (!Array.isArray(result.content)) {
    throw new Error('expected content');
  }
  return {
    isError: errorFlag(result.isError),
    content: result.content,
    structuredContent: asRecord(result.structuredContent),
  };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

beforeEach((): void => {
  resetResolverCache();
  resetCapabilityCache();
});

afterAll((): void => {
  rmSync(scratch, { recursive: true, force: true });
});

it('lists media_health with no required arguments', async (): Promise<void> => {
  await withHealthClient(config, async (client) => {
    const listed = await client.listTools();
    const health = listed.tools.find((tool) => tool.name === 'media_health');
    expect(health).toBeDefined();
    expect(health?.inputSchema.required ?? []).toEqual([]);
  });
});

it('reports the live binaries, capabilities, and config', async (): Promise<void> => {
  expect(existsSync(outputDir)).toBe(false);
  await withHealthClient(config, async (client) => {
    const first = await callHealth(client);
    const second = await callHealth(client);
    expect(first.isError).toBeFalsy();
    expect(second.isError).toBeFalsy();

    const body = first.structuredContent;
    expect(body.tool).toBe('media_health');
    expect(body.outputs).toEqual([]);
    expect(body.serverVersion).toBe(packageVersion());
    expect(body.warnings).toEqual([]);
    expect(typeof body.elapsedMs).toBe('number');

    const ffmpeg = foundReport(asRecord(body.ffmpeg));
    expect(path.isAbsolute(ffmpeg.path)).toBe(true);
    expect(BINARY_SOURCES).toContain(ffmpeg.source);
    expect(ffmpeg.version.startsWith('ffmpeg version ')).toBe(true);
    expect(asRecord(body.ffmpeg)).not.toHaveProperty('lookedIn');

    const ffprobe = asRecord(body.ffprobe);
    expect(typeof ffprobe.found).toBe('boolean');
    if (ffprobe.found === true) {
      const found = foundReport(ffprobe);
      expect(path.isAbsolute(found.path)).toBe(true);
      expect(BINARY_SOURCES).toContain(found.source);
      expect(found.version.startsWith('ffprobe version ')).toBe(true);
      expect(ffprobe).not.toHaveProperty('lookedIn');
    } else {
      expect(ffprobe.found).toBe(false);
      expect(asList(ffprobe.lookedIn).length).toBeGreaterThan(0);
      expect(ffprobe).not.toHaveProperty('source');
      expect(ffprobe).not.toHaveProperty('version');
    }

    const capabilities = asList(body.capabilities);
    expect(capabilities).toHaveLength(28);
    expect(capabilities).toEqual(expect.arrayContaining([
      { kind: 'encoder', name: 'aac', present: true },
      { kind: 'filter', name: 'scale', present: true },
    ]));
    const encoderNames = capabilities
      .map((entry) => asRecord(entry))
      .filter((entry) => entry.kind === 'encoder')
      .map((entry) => entry.name);
    for (const name of ['libx264', 'aac', 'libmp3lame', 'libx265', 'libvpx-vp9', 'libopus']) {
      expect(encoderNames).toContain(name);
    }
    const filterNames = capabilities
      .map((entry) => asRecord(entry))
      .filter((entry) => entry.kind === 'filter')
      .map((entry) => entry.name);
    const compositionFilters = [
      'drawtext',
      'subtitles',
      'xfade',
      'acrossfade',
      'silencedetect',
      'overlay',
    ];
    for (const name of compositionFilters) {
      expect(filterNames).toContain(name);
    }

    expect(body.imageEngine).toEqual({
      sharp: sharp.versions.sharp,
      libvips: sharp.versions.vips,
    });
    expect(body.timeoutSeconds).toBe(config.timeoutSeconds);
    expect(body.logLevel).toBe(config.logLevel);
    expect(body.dataFolder).toBe(config.dataDir);
    expect(body.allowedRoots).toEqual([...config.allowedRoots]);
    expect(body.outputFolder).toBe(config.outputDir);
    expect(body.nextStep).toBe(ffprobe.found === true ? null : 'media_setup_ffmpeg');
    expect(textOf(first.content).includes('MEDIA_EDITOR_')).toBe(false);
  });
  expect(existsSync(outputDir)).toBe(false);
  expect(readdirSync(allowedRoot)).toEqual([]);
});

it('reports a missing ffmpeg override without failing', async (): Promise<void> => {
  await withHealthClient(missingFfmpegConfig, async (client) => {
    const result = await callHealth(client);
    expect(result.isError).toBeFalsy();
    const ffmpeg = asRecord(result.structuredContent.ffmpeg);
    expect(ffmpeg.found).toBe(false);
    expect(ffmpeg.path).toBeNull();
    const lookedIn = asList(ffmpeg.lookedIn);
    expect(typeof lookedIn[0]).toBe('string');
    if (typeof lookedIn[0] !== 'string') {
      throw new Error('expected a lookup step');
    }
    expect(lookedIn[0].startsWith('env-override')).toBe(true);
    expect(ffmpeg).not.toHaveProperty('source');
    expect(ffmpeg).not.toHaveProperty('version');
    expect(result.structuredContent.capabilities).toEqual([]);
    expect(result.structuredContent.nextStep).toBe('media_setup_ffmpeg');
    expect(textOf(result.content).includes('media_setup_ffmpeg')).toBe(true);
    expect(textOf(result.content).includes('MEDIA_EDITOR_')).toBe(false);
  });
});

it('answers when no root or output folder is configured', async (): Promise<void> => {
  await withHealthClient(emptyRootsConfig, async (client) => {
    const result = await callHealth(client);
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.allowedRoots).toEqual([]);
    expect(result.structuredContent.outputFolder).toBeNull();
  });
});

it('keeps a recorded config warning on the result', async (): Promise<void> => {
  await withHealthClient(config, async (client) => {
    const result = await callHealth(client);
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent.warnings).toEqual(['first warning']);
  }, ['first warning']);
});

it('says which earlier candidates could not run', async (): Promise<void> => {
  const skipped = ['bundled: /opt/bundled/ffmpeg unusable'];
  const real = createToolContext(config);
  const context: ToolContext = {
    ...real,
    resolveBinary: (name: BinaryName): Promise<ResolvedBinary> => Promise.resolve({
      name,
      path: `/usr/bin/${name}`,
      source: 'system-path',
      version: `${name} version 6.0`,
      ...(name === 'ffmpeg' ? { skipped } : {}),
    }),
    getCapabilities: () => Promise.reject(new Error('not read in this test')),
  };
  await withHealthClient(config, async (client) => {
    const result = await callHealth(client);
    expect(result.isError).toBeFalsy();
    const ffmpeg = asRecord(result.structuredContent.ffmpeg);
    expect(ffmpeg.skipped).toEqual(skipped);
    expect(asRecord(result.structuredContent.ffprobe)).not.toHaveProperty('skipped');
    expect(textOf(result.content)).toContain('1 earlier candidate could not run.');
    expect(textOf(result.content).length).toBeLessThanOrEqual(300);
  }, undefined, context);
});
