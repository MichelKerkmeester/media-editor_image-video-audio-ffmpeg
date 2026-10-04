// ───────────────────────────────────────────────────────────────────
// MODULE: Bundle Contents Tests
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
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  BUNDLE_SIZE_LIMIT,
  binaryDestinations,
  bundleFileName,
} from '../../scripts/bundle/targets.js';
import {
  PINNED_BUILDS,
  PLATFORM_KEYS,
  platformKeyOf,
  platformParts,
} from '../../src/core/pinned-builds.js';
import { generateOverlayPng } from '../helpers/composition-media.js';

import type { PlatformKey } from '../../src/core/pinned-builds.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BUNDLE_FOLDER = path.join(PACKAGE_ROOT, 'dist-bundles');
const TOP_LEVEL: readonly string[] = [
  'manifest.json',
  'icon.png',
  'package.json',
  'LICENSE',
  'THIRD_PARTY_NOTICES',
  'licenses',
  'assets',
  'dist',
  'node_modules',
];
const NOTICE_FILES: readonly string[] = [
  'LICENSE',
  'THIRD_PARTY_NOTICES',
  'licenses/ffmpeg-LICENSE.txt',
  'licenses/ffmpeg-SOURCE.md',
  'licenses/libvips-LICENSE.txt',
  'licenses/node-modules.txt',
];
const ARCH_PATTERNS: Readonly<Record<PlatformKey, RegExp>> = {
  'darwin-arm64': /Mach-O 64-bit.*arm64/,
  'darwin-x64': /Mach-O 64-bit.*x86_64/,
  'win32-x64': /PE32\+.*x86-64/,
  'linux-x64': /ELF 64-bit LSB.*x86-64/,
  'linux-arm64': /ELF 64-bit LSB.*aarch64/,
};
const SHARP_MODULE = /^node_modules\/@img\/sharp-[^/]+\/lib\/sharp-[^/]+\.node$/;
const LIBVIPS_LIBRARY =
  /^node_modules\/@img\/[^/]+\/lib\/libvips-cpp[^/]*\.(dylib|so[.0-9]*|dll)$/;
const HAS_FILE_COMMAND = existsSync('/usr/bin/file');
const TIMEOUT_MS = 120000;
const createdFolders: string[] = [];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function tempFolder(prefix: string): string {
  const folder = mkdtempSync(path.join(os.tmpdir(), prefix));
  createdFolders.push(folder);
  return folder;
}

function bundlePath(key: PlatformKey): string {
  return path.join(BUNDLE_FOLDER, bundleFileName(key));
}

function listEntries(bundle: string): string[] {
  const result = spawnSync('unzip', ['-Z1', bundle], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`unzip could not list ${bundle}`);
  }
  return result.stdout.split('\n').filter((line) => line.length > 0);
}

function extractEntry(bundle: string, entry: string, folder: string): string {
  const result = spawnSync('unzip', ['-p', bundle, entry], { maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`unzip could not extract ${entry}`);
  }
  const target = path.join(folder, entry.split('/').join('_'));
  writeFileSync(target, result.stdout);
  return target;
}

function sha256File(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function describeFile(filePath: string): string {
  return spawnSync('/usr/bin/file', ['-b', filePath], { encoding: 'utf8' }).stdout;
}

function readJson(filePath: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${filePath} is not a JSON object`);
  }
  return Object.fromEntries(Object.entries(parsed));
}

function toolNames(manifest: Record<string, unknown>): string[] {
  const tools = manifest['tools'];
  if (!Array.isArray(tools)) {
    return [];
  }
  return tools.map((tool: unknown) => {
    const name: unknown = typeof tool === 'object' && tool !== null && 'name' in tool
      ? tool.name
      : undefined;
    return typeof name === 'string' ? name : '';
  });
}

function pngWidth(filePath: string): number {
  return readFileSync(filePath).readUInt32BE(16);
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(Object.entries(value));
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

const rootManifest = readJson(path.join(PACKAGE_ROOT, 'manifest.json'));
const rootPackage = readJson(path.join(PACKAGE_ROOT, 'package.json'));

afterAll((): void => {
  for (const folder of createdFolders) {
    rmSync(folder, { recursive: true, force: true });
  }
});

for (const key of PLATFORM_KEYS) {
  describe.skipIf(!existsSync(bundlePath(key)))(`the ${key} bundle`, (): void => {
    const { platform, arch } = platformParts(key);
    const destinations = binaryDestinations(key);
    const build = PINNED_BUILDS[key];
    let entries: string[] = [];
    let folder = '';
    const extract = (entry: string): string => extractEntry(bundlePath(key), entry, folder);

    beforeAll((): void => {
      entries = listEntries(bundlePath(key));
      folder = tempFolder(`media-editor-bundle-${key}-`);
    });

    it('stays within the size budget', (): void => {
      expect(statSync(bundlePath(key)).size).toBeLessThanOrEqual(BUNDLE_SIZE_LIMIT);
    });

    it('holds only the allowed top-level entries and no unsafe paths', (): void => {
      for (const entry of entries) {
        expect(TOP_LEVEL).toContain(entry.split('/')[0]);
        expect(entry.startsWith('/')).toBe(false);
        expect(entry.split('/')).not.toContain('..');
        expect(entry.includes('\\')).toBe(false);
        expect(entry.endsWith('.map')).toBe(false);
        expect(entry.startsWith('licenses/ffmpeg-builds/')).toBe(false);
      }
      for (const name of TOP_LEVEL) {
        expect(entries.some((entry) => entry === name || entry.startsWith(`${name}/`))).toBe(true);
      }
    });

    it('narrows the manifest to its own platform', (): void => {
      const manifest = readJson(extract('manifest.json'));
      expect(record(manifest['compatibility'])['platforms']).toEqual([platform]);
      expect(manifest['version']).toBe(rootPackage['version']);
      expect(toolNames(manifest)).toEqual(toolNames(rootManifest));
    });

    it('carries one ffmpeg and one ffprobe for its own platform', (): void => {
      const probeEntries = entries.filter((entry) => {
        return entry.startsWith('node_modules/ffprobe-static/bin/');
      });
      const ownFolder = `node_modules/ffprobe-static/bin/${platform}/${arch}/`;
      expect(probeEntries.length).toBeGreaterThan(0);
      expect(probeEntries.every((entry) => entry.startsWith(ownFolder))).toBe(true);
      expect(entries).toContain(destinations.ffprobe);
      expect(entries).toContain(destinations.ffmpeg);
    });

    it('carries only its own platform sharp packages', (): void => {
      const names = new Set(
        entries
          .filter((entry) => entry.startsWith('node_modules/@img/'))
          .map((entry) => entry.split('/')[2] ?? ''),
      );
      for (const name of names) {
        expect(name === 'colour' || name.endsWith(`-${platform}-${arch}`)).toBe(true);
        expect(name.includes('linuxmusl')).toBe(false);
      }
      expect(names.has(`sharp-${platform}-${arch}`)).toBe(true);
    });

    it('carries no development dependency', (): void => {
      const devNames = Object.keys(record(rootPackage['devDependencies']));
      expect(devNames.length).toBeGreaterThan(0);
      for (const name of devNames) {
        expect(entries.some((entry) => entry.startsWith(`node_modules/${name}/`))).toBe(false);
      }
    });

    it('carries the pinned ffmpeg and ffprobe binaries', (): void => {
      expect(sha256File(extract(destinations.ffmpeg))).toBe(build.artifacts.ffmpeg.binarySha256);
      expect(sha256File(extract(destinations.ffprobe))).toBe(
        build.artifacts.ffprobe.binarySha256,
      );
    });

    it.skipIf(!HAS_FILE_COMMAND)('carries binaries built for its architecture', (): void => {
      const sharpModule = entries.find((entry) => SHARP_MODULE.test(entry));
      const libvips = entries.find((entry) => LIBVIPS_LIBRARY.test(entry));
      expect(sharpModule).toBeDefined();
      expect(libvips).toBeDefined();
      const checked = [destinations.ffmpeg, destinations.ffprobe, sharpModule, libvips];
      for (const entry of checked) {
        expect(describeFile(extract(entry ?? ''))).toMatch(ARCH_PATTERNS[key]);
      }
    });

    it('carries every licence notice', (): void => {
      for (const file of NOTICE_FILES) {
        expect(entries).toContain(file);
        expect(statSync(extract(file)).size).toBeGreaterThan(0);
      }
      const notices = readFileSync(extract('THIRD_PARTY_NOTICES'), 'utf8');
      expect(notices).toContain('Copyright (c) 2024 Hongyi Wang');
      expect(notices).toContain('Copyright (c) 2025 misbahsy');
      const source = readFileSync(extract('licenses/ffmpeg-SOURCE.md'), 'utf8');
      expect(source).toContain(`ffmpeg version ${build.version}`);
      const licence = readFileSync(extract('licenses/ffmpeg-LICENSE.txt'), 'utf8');
      expect(licence).toContain('GNU GENERAL PUBLIC LICENSE');
      expect(licence).toContain('Version 3');
    });
  });
}

const hostKey = platformKeyOf(process.platform, process.arch);
const canRun = hostKey !== undefined && existsSync(bundlePath(hostKey));

describe.skipIf(!canRun)('the bundle this machine can run', (): void => {
  const client = new Client({ name: 'bundle-contents-check', version: '0.0.0' });
  let extension = '';
  let media = '';

  beforeAll(async (): Promise<void> => {
    const folder = tempFolder('media-editor-run-');
    extension = path.join(folder, 'ext');
    media = path.join(folder, 'media');
    mkdirSync(media, { recursive: true });
    const bundle = bundlePath(hostKey ?? 'darwin-arm64');
    const unpacked = spawnSync('unzip', ['-q', bundle, '-d', extension]);
    expect(unpacked.status).toBe(0);
    await generateOverlayPng(media, { width: 64, height: 64, fileName: 'square.png' });
    const env: Record<string, string> = {};
    for (const [name, value] of Object.entries(process.env)) {
      if (value !== undefined && !name.startsWith('MEDIA_EDITOR_')) {
        env[name] = value;
      }
    }
    env['MEDIA_EDITOR_DATA_DIR'] = path.join(folder, 'data');
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [path.join(extension, 'dist', 'index.js'), media],
      stderr: 'ignore',
      env,
    });
    await client.connect(transport);
  }, TIMEOUT_MS);

  afterAll(async (): Promise<void> => {
    await client.close();
  });

  it('lists the same tools as the manifest', async (): Promise<void> => {
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual(toolNames(rootManifest));
  }, TIMEOUT_MS);

  it('finds the ffmpeg and ffprobe inside the bundle first', async (): Promise<void> => {
    const result = await client.callTool({ name: 'media_health', arguments: {} });
    const body = record(result.structuredContent);
    const version = PINNED_BUILDS[hostKey ?? 'darwin-arm64'].version;
    for (const name of ['ffmpeg', 'ffprobe']) {
      const binary = record(body[name]);
      expect(binary['source']).toBe('bundled');
      expect(String(binary['path'])).toContain(path.join(realpathSync(extension), 'node_modules'));
      expect(String(binary['version'])).toContain(version);
    }
  }, TIMEOUT_MS);

  it('resizes an image with the sharp inside the bundle', async (): Promise<void> => {
    const result = await client.callTool({
      name: 'image_resize',
      arguments: { inputPath: path.join(media, 'square.png'), width: 32, outputName: 'check' },
    });
    expect(result.isError).not.toBe(true);
    const outputs = record(result.structuredContent)['outputs'];
    const first = record(Array.isArray(outputs) ? outputs[0] : undefined);
    const written = String(first['path']);
    expect(existsSync(written)).toBe(true);
    expect(pngWidth(written)).toBe(32);
  }, TIMEOUT_MS);
});
