// ───────────────────────────────────────────────────────────────────
// MODULE: Manifest Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMcpConfigForManifest, v0_3, validateManifest } from '@anthropic-ai/mcpb/node';
import { afterAll, expect, it, vi } from 'vitest';

import { loadConfig } from '../../src/core/config.js';
import { ALL_TOOLS } from '../../src/server/all-tools.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS AND FIXTURES
// ───────────────────────────────────────────────────────────────────

const packageRoot = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const manifestPath = path.join(packageRoot, 'manifest.json');

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COPYRIGHT_LINE = 'Copyright (c) 2026 Michel Kerkmeester';
const ICON_SIZE = 512;
const TOOL_COUNT = 39;

const tempDirs: string[] = [];
const extensionPath = path.join(makeTempDir('media-editor-manifest-'), 'Media Editor ext');
mkdirSync(extensionPath);
const dirA = makeTempDir('media-editor-manifest-a-');
const dirB = makeTempDir('media-editor-manifest-b-');
const dirC = makeTempDir('media-editor-manifest-c-');
const SYSTEM_DIRS = {
  HOME: homedir(),
  DESKTOP: makeTempDir('media-editor-manifest-desktop-'),
  DOCUMENTS: makeTempDir('media-editor-manifest-documents-'),
  DOWNLOADS: makeTempDir('media-editor-manifest-downloads-'),
};

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

type Manifest = Parameters<typeof getMcpConfigForManifest>[0]['manifest'];

interface PackageMetadata {
  readonly version: string;
  readonly main: string;
  readonly engines: { readonly node: string };
}

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function loadManifest(): Manifest {
  const text = readFileSync(manifestPath, 'utf8');
  return v0_3.McpbManifestSchema.parse(JSON.parse(text));
}

function loadPackage(): PackageMetadata {
  const text = readFileSync(path.join(packageRoot, 'package.json'), 'utf8');
  return JSON.parse(text) as PackageMetadata;
}

/** First sentence of a tool description: the text through its first sentence boundary. */
function firstSentence(description: string): string {
  const boundary = description.search(/\.\s+(?=[A-Z])/);
  return boundary === -1 ? description.trim() : description.slice(0, boundary + 1);
}

/** Ask the reference host implementation to expand the manifest the way the app would. */
function expandForHost(
  userConfig: Record<string, string | string[]>,
): ReturnType<typeof getMcpConfigForManifest> {
  return getMcpConfigForManifest({
    manifest: loadManifest(),
    extensionPath,
    systemDirs: SYSTEM_DIRS,
    userConfig,
    pathSeparator: path.sep,
  });
}

function hasWarning(warnings: readonly string[], text: string): boolean {
  return warnings.some((warning): boolean => warning.includes(text));
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

it('accepts the manifest under the bundled schema and the file validator', (): void => {
  const logSpy = vi.spyOn(console, 'log').mockImplementation((): void => {});
  try {
    const text = readFileSync(manifestPath, 'utf8');
    const parsed = v0_3.McpbManifestSchema.safeParse(JSON.parse(text));
    expect(parsed.success).toBe(true);
    expect(validateManifest(manifestPath)).toBe(true);
  } finally {
    logSpy.mockRestore();
  }
});

it('names the same author and version as the package metadata', (): void => {
  const manifest = loadManifest();
  const packageJson = loadPackage();
  expect(manifest.name).toBe('media-editor');
  expect(manifest.display_name).toBe('Media Editor');
  expect(manifest.license).toBe('MIT');
  expect(manifest.version).toBe(packageJson.version);
  expect(manifest.author.name).toBe('Michel Kerkmeester');
  const licence = readFileSync(path.join(packageRoot, 'LICENSE'), 'utf8');
  const notices = readFileSync(path.join(packageRoot, 'THIRD_PARTY_NOTICES'), 'utf8');
  expect(licence).toContain(COPYRIGHT_LINE);
  expect(notices).toContain(COPYRIGHT_LINE);
});

it('points the host at the built entry point', (): void => {
  const manifest = loadManifest();
  const packageJson = loadPackage();
  expect(manifest.server.type).toBe('node');
  expect(manifest.server.entry_point).toBe('dist/index.js');
  expect(manifest.server.entry_point).toBe(packageJson.main);
  expect(manifest.server.mcp_config.command).toBe('node');
  expect(manifest.server.mcp_config.args?.[0]).toBe('${__dirname}/' + manifest.server.entry_point);
});

it('ships a square 512 pixel icon', (): void => {
  const manifest = loadManifest();
  expect(manifest.icon).toBe('icon.png');
  const icon = readFileSync(path.join(packageRoot, 'icon.png'));
  expect(icon.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)).toBe(true);
  expect(icon.readUInt32BE(16)).toBe(ICON_SIZE);
  expect(icon.readUInt32BE(20)).toBe(ICON_SIZE);
});

it('lists every registered tool once with its registry name and first sentence', (): void => {
  const manifest = loadManifest();
  const tools = manifest.tools ?? [];
  const names = tools.map((tool): string => tool.name);
  expect(names).toEqual(ALL_TOOLS.map((tool): string => tool.name));
  expect(names).toHaveLength(TOOL_COUNT);
  expect(new Set(names).size).toBe(names.length);
  for (const [index, tool] of ALL_TOOLS.entries()) {
    expect(tools[index]?.description).toBe(firstSentence(tool.description));
  }
});

it('declares the supported platforms and the package node runtime', (): void => {
  const manifest = loadManifest();
  const packageJson = loadPackage();
  expect(manifest.compatibility?.platforms).toEqual(['darwin', 'win32', 'linux']);
  expect(manifest.compatibility?.runtimes?.node).toBe(packageJson.engines.node);
});

it('defines the folder list and the optional output folder', (): void => {
  const manifest = loadManifest();
  const userConfig = manifest.user_config ?? {};
  expect(Object.keys(userConfig).sort()).toEqual(['allowed_directories', 'output_directory']);
  expect(userConfig['allowed_directories']).toMatchObject({
    type: 'directory',
    multiple: true,
    required: true,
    default: ['${DESKTOP}'],
  });
  expect(userConfig['output_directory']).toMatchObject({ type: 'directory', required: false });
  expect(userConfig['output_directory']?.multiple).toBeUndefined();
  expect(userConfig['output_directory']?.default).toBeUndefined();
});

it('expands only placeholders the host can resolve', (): void => {
  const manifest = loadManifest();
  const serialized = JSON.stringify(manifest.server.mcp_config);
  const names = [...serialized.matchAll(/\$\{([^}]+)\}/g)].map((match): string => String(match[1]));
  expect(names).toContain('__dirname');
  expect(names).toContain('user_config.allowed_directories');
  expect(names).toContain('user_config.output_directory');
  const keys = Object.keys(manifest.user_config ?? {});
  for (const name of names) {
    const key = name.startsWith('user_config.') ? name.slice('user_config.'.length) : '';
    expect(name === '__dirname' || keys.includes(key)).toBe(true);
  }
});

it(
  'returns no configuration while the required folder list is missing',
  async (): Promise<void> => {
    expect(await expandForHost({})).toBeUndefined();
    expect(await expandForHost({ allowed_directories: [] })).toBeUndefined();
  },
);

it(
  'expands two folders and leaves the unset output folder placeholder',
  async (): Promise<void> => {
    const result = await expandForHost({ allowed_directories: [dirA, dirB] });
    expect(result?.args).toEqual([
      `${extensionPath}/dist/index.js`,
      '--output-dir',
      '${user_config.output_directory}',
      dirA,
      dirB,
    ]);
    const loaded = loadConfig({}, (result?.args ?? []).slice(1));
    expect(loaded.config.allowedRoots).toEqual([realpathSync(dirA), realpathSync(dirB)]);
    expect(loaded.config.outputDir).toBe(realpathSync(dirA));
    expect(hasWarning(loaded.warnings, '--output-dir')).toBe(true);
  },
);

it('uses the saved output folder when one is set', async (): Promise<void> => {
  const result = await expandForHost({ allowed_directories: [dirA, dirB], output_directory: dirC });
  expect(result?.args).toEqual([
    `${extensionPath}/dist/index.js`,
    '--output-dir',
    dirC,
    dirA,
    dirB,
  ]);
  const loaded = loadConfig({}, (result?.args ?? []).slice(1));
  expect([dirC, realpathSync(dirC)]).toContain(loaded.config.outputDir);
  expect(loaded.config.allowedRoots).toEqual([realpathSync(dirA), realpathSync(dirB)]);
  expect(hasWarning(loaded.warnings, '--output-dir')).toBe(false);
});

it.skipIf(process.platform === 'win32')(
  'keeps a folder whose name has a colon and a space as one root',
  async (): Promise<void> => {
    const colonRoot = makeTempDir('media-editor-manifest-colon-');
    const colonDir = path.join(colonRoot, 'Clips: 2026');
    mkdirSync(colonDir);
    const result = await expandForHost({ allowed_directories: [colonDir] });
    expect(result?.args).toEqual([
      `${extensionPath}/dist/index.js`,
      '--output-dir',
      '${user_config.output_directory}',
      colonDir,
    ]);
    const loaded = loadConfig({}, (result?.args ?? []).slice(1));
    expect(loaded.config.allowedRoots).toEqual([realpathSync(colonDir)]);
  },
);

it('treats an empty output folder setting as unset', async (): Promise<void> => {
  const result = await expandForHost({
    allowed_directories: [dirA, dirB],
    output_directory: '',
  });
  expect(result?.args).toEqual([
    `${extensionPath}/dist/index.js`,
    '--output-dir',
    '${user_config.output_directory}',
    dirA,
    dirB,
  ]);
  const loaded = loadConfig({}, (result?.args ?? []).slice(1));
  expect(loaded.config.outputDir).toBe(realpathSync(dirA));
  expect(hasWarning(loaded.warnings, '--output-dir')).toBe(true);
});
