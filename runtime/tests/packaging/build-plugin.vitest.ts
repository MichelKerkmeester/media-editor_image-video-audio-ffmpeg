// ───────────────────────────────────────────────────────────────────
// MODULE: Build Plugin Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

import {
  buildPlugin,
  copySkill,
  hashTree,
  parsePluginArgs,
  shippedSkillHashes,
} from '../../scripts/build-plugin.js';
import { ERROR_CODES, isMediaError } from '../../src/core/errors.js';

import type { MediaError } from '../../src/core/errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const PACKAGE_ROOT = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const TRACKED_SKILL = path.resolve(PACKAGE_ROOT, '..', 'sk-media-editor');
const PLUGIN_SKILL = path.join(PACKAGE_ROOT, 'claude-plugin', 'skills', 'sk-media-editor');
const PLUGIN_JSON = path.join(PACKAGE_ROOT, 'claude-plugin', '.claude-plugin', 'plugin.json');
const PLUGIN_BIN = path.join(PACKAGE_ROOT, 'claude-plugin', 'bin', 'media-editor');
const PLUGIN_CLI = path.join(PACKAGE_ROOT, 'claude-plugin', 'server', 'dist', 'cli.js');

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

const tempDirs: string[] = [];

function makeTempDir(label: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), `media-plugin-${label}-`));
  tempDirs.push(dir);
  return dir;
}

function sha256Of(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function captureError(run: () => unknown): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (isMediaError(error)) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the call to throw a MediaError.');
}

async function captureAsyncError(run: () => Promise<unknown>): Promise<MediaError> {
  try {
    await run();
  } catch (error: unknown) {
    if (isMediaError(error)) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the call to throw a MediaError.');
}

interface SkillCopy {
  readonly destination: string;
  readonly differing: string[];
}

let trackedCopy: SkillCopy | undefined;

function copyTrackedSkill(): SkillCopy {
  if (trackedCopy === undefined) {
    const destination = path.join(makeTempDir('tracked'), 'sk-media-editor');
    trackedCopy = { destination, differing: copySkill(TRACKED_SKILL, destination) };
  }
  return trackedCopy;
}

type RefusalCase = readonly [readonly string[], string, string, Record<string, unknown>];

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('copies the tracked skill byte for byte', (): void => {
  const { destination, differing } = copyTrackedSkill();
  expect(differing).toEqual([]);
  const sourceHashes = shippedSkillHashes(TRACKED_SKILL);
  const copyHashes = hashTree(destination);
  expect(copyHashes.size).toBeGreaterThan(20);
  expect(copyHashes).toEqual(sourceHashes);
  expect([...copyHashes]).toEqual([...sourceHashes]);
});

it('leaves the feature catalog out of the copied skill', (): void => {
  const base = makeTempDir('unshipped');
  const source = path.join(base, 'source');
  const destination = path.join(base, 'copy');
  mkdirSync(path.join(source, 'feature-catalog', 'tools'), { recursive: true });
  mkdirSync(path.join(source, 'references'), { recursive: true });
  writeFileSync(path.join(source, 'SKILL.md'), 'skill');
  writeFileSync(path.join(source, 'references', 'cli.md'), 'cli');
  writeFileSync(path.join(source, 'feature-catalog', 'feature-catalog.md'), 'root');
  writeFileSync(path.join(source, 'feature-catalog', 'tools', 'leaf.md'), 'leaf');
  expect(copySkill(source, destination)).toEqual([]);
  expect(existsSync(path.join(destination, 'feature-catalog'))).toBe(false);
  expect([...hashTree(destination).keys()]).toEqual(['SKILL.md', 'references/cli.md']);
});

it('reports a file whose bytes changed after the copy', (): void => {
  const base = makeTempDir('changed');
  const source = path.join(base, 'source');
  const destination = path.join(base, 'copy');
  mkdirSync(path.join(source, 'nested'), { recursive: true });
  writeFileSync(path.join(source, 'note.txt'), 'first');
  writeFileSync(path.join(source, 'nested', 'inner.txt'), 'inner');
  expect(copySkill(source, destination)).toEqual([]);
  writeFileSync(path.join(destination, 'note.txt'), 'changed');
  const sourceHashes = hashTree(source);
  const copyHashes = hashTree(destination);
  const changed: string[] = [];
  for (const [relative, digest] of copyHashes) {
    if (sourceHashes.get(relative) !== digest) {
      changed.push(relative);
    }
  }
  expect(changed).toEqual(['note.txt']);
  expect(sourceHashes.get('note.txt')).toBe(sha256Of(Buffer.from('first')));
  expect(copyHashes.get('note.txt')).toBe(sha256Of(Buffer.from('changed')));
});

it('replaces a stale destination folder instead of merging into it', (): void => {
  const base = makeTempDir('stale');
  const source = path.join(base, 'source');
  const destination = path.join(base, 'copy');
  mkdirSync(source, { recursive: true });
  writeFileSync(path.join(source, 'keep.txt'), 'keep');
  mkdirSync(destination, { recursive: true });
  writeFileSync(path.join(destination, 'stale.txt'), 'stale');
  expect(copySkill(source, destination)).toEqual([]);
  expect(existsSync(path.join(destination, 'stale.txt'))).toBe(false);
  expect(readFileSync(path.join(destination, 'keep.txt'), 'utf8')).toBe('keep');
});

describe.skipIf(process.platform === 'win32')('links in a copied skill', (): void => {
  it('hashes a relative link as its target bytes and copies a regular file', (): void => {
    const base = makeTempDir('link');
    const target = path.join(base, 'target.txt');
    writeFileSync(target, 'shared rules');
    const source = path.join(base, 'skill');
    mkdirSync(source, { recursive: true });
    symlinkSync(path.relative(source, target), path.join(source, 'link.md'));
    const hashes = hashTree(source);
    expect([...hashes.keys()]).toEqual(['link.md']);
    expect(hashes.get('link.md')).toBe(sha256Of(Buffer.from('shared rules')));
    const destination = path.join(base, 'copy');
    expect(copySkill(source, destination)).toEqual([]);
    const copied = lstatSync(path.join(destination, 'link.md'));
    expect(copied.isSymbolicLink()).toBe(false);
    expect(copied.isFile()).toBe(true);
    expect(readFileSync(path.join(destination, 'link.md'), 'utf8')).toBe('shared rules');
  });

  it('refuses a link that points at no file', (): void => {
    const base = makeTempDir('dangling');
    const source = path.join(base, 'skill');
    mkdirSync(source, { recursive: true });
    symlinkSync('../missing.md', path.join(source, 'dangling.md'));
    const error = captureError(() => hashTree(source));
    expect(error.code).toBe(ERROR_CODES.INTERNAL);
    expect(error.details).toEqual({ reason: 'unresolved-link', path: 'dangling.md' });
  });
});

describe('parsePluginArgs', (): void => {
  it('takes the target from the arguments', (): void => {
    expect(parsePluginArgs(['--target', 'linux-x64'], 'darwin', 'arm64')).toBe('linux-x64');
    expect(parsePluginArgs(['--target', 'win32-x64'], 'linux', 'arm64')).toBe('win32-x64');
  });

  it('falls back to the host platform', (): void => {
    expect(parsePluginArgs([], 'darwin', 'arm64')).toBe('darwin-arm64');
    expect(parsePluginArgs([], 'linux', 'x64')).toBe('linux-x64');
  });

  it('refuses a bad argument or an unsupported host', (): void => {
    const cases: readonly RefusalCase[] = [
      [
        ['--target', 'mac'],
        'darwin',
        'arm64',
        { parameter: 'target', value: 'mac', reason: 'unknown-target' },
      ],
      [
        ['--target'],
        'darwin',
        'arm64',
        { parameter: 'target', value: null, reason: 'missing-value' },
      ],
      [
        ['--target', '--all'],
        'darwin',
        'arm64',
        { parameter: 'target', value: null, reason: 'missing-value' },
      ],
      [
        ['--fast'],
        'darwin',
        'arm64',
        { parameter: 'target', value: '--fast', reason: 'unknown-argument' },
      ],
      [
        ['--target', 'linux-x64', 'extra'],
        'darwin',
        'arm64',
        { parameter: 'target', value: 'extra', reason: 'unknown-argument' },
      ],
      [
        [],
        'win32',
        'arm64',
        { parameter: 'target', value: 'win32-arm64', reason: 'unsupported-host' },
      ],
    ];
    for (const [argv, platform, arch, details] of cases) {
      const error = captureError(() => parsePluginArgs(argv, platform, arch));
      expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
      expect(error.details).toEqual(details);
    }
  });
});

describe('buildPlugin', (): void => {
  it('refuses a root without a bundle', async (): Promise<void> => {
    const root = makeTempDir('root');
    const error = await captureAsyncError((): Promise<unknown> => buildPlugin('linux-x64', root));
    expect(error.code).toBe(ERROR_CODES.INTERNAL);
    expect(error.details).toEqual({
      reason: 'bundle-missing',
      path: path.join(root, 'dist-bundles', 'media-editor-linux-x64.mcpb'),
    });
  });

  it.skipIf(process.platform === 'win32')(
    'refuses a bundle that unpacks a link',
    async (): Promise<void> => {
      const root = makeTempDir('linked');
      const version = JSON.stringify({ version: '9.9.9' });
      writeFileSync(path.join(root, 'package.json'), version);
      mkdirSync(path.join(root, 'claude-plugin', '.claude-plugin'), { recursive: true });
      writeFileSync(path.join(root, 'claude-plugin', '.claude-plugin', 'plugin.json'), version);
      const staging = makeTempDir('staging');
      mkdirSync(path.join(staging, 'dist'));
      writeFileSync(path.join(staging, 'manifest.json'), version);
      writeFileSync(path.join(staging, 'dist', 'index.js'), '');
      symlinkSync('index.js', path.join(staging, 'dist', 'entry.js'));
      mkdirSync(path.join(root, 'dist-bundles'));
      const bundle = path.join(root, 'dist-bundles', 'media-editor-linux-x64.mcpb');
      execFileSync('zip', ['-q', '-r', '-y', bundle, '.'], { cwd: staging });
      const error = await captureAsyncError((): Promise<unknown> => buildPlugin('linux-x64', root));
      expect(error.code).toBe(ERROR_CODES.INTERNAL);
      expect(error.details).toEqual({ reason: 'server-link', paths: ['dist/entry.js'] });
    },
  );

  it.skipIf(process.platform === 'win32')(
    'replaces a skill folder an earlier build left under another name',
    async (): Promise<void> => {
      const base = makeTempDir('renamed');
      const root = path.join(base, 'package');
      const version = JSON.stringify({ version: '9.9.9' });
      mkdirSync(path.join(root, 'claude-plugin', '.claude-plugin'), { recursive: true });
      writeFileSync(path.join(root, 'package.json'), version);
      writeFileSync(path.join(root, 'claude-plugin', '.claude-plugin', 'plugin.json'), version);
      mkdirSync(path.join(base, 'sk-media-editor'));
      writeFileSync(path.join(base, 'sk-media-editor', 'SKILL.md'), '# skill\n');
      const stale = path.join(root, 'claude-plugin', 'skills', 'media-editor');
      mkdirSync(stale, { recursive: true });
      writeFileSync(path.join(stale, 'SKILL.md'), '# old skill\n');
      const staging = makeTempDir('staging');
      mkdirSync(path.join(staging, 'dist'));
      writeFileSync(path.join(staging, 'manifest.json'), version);
      writeFileSync(path.join(staging, 'dist', 'index.js'), '');
      writeFileSync(path.join(staging, 'dist', 'cli.js'), '');
      mkdirSync(path.join(root, 'dist-bundles'));
      const bundle = path.join(root, 'dist-bundles', 'media-editor-linux-x64.mcpb');
      execFileSync('zip', ['-q', '-r', bundle, '.'], { cwd: staging });
      const report = await buildPlugin('linux-x64', root);
      expect(report.skillFiles).toBe(1);
      expect(readdirSync(path.join(root, 'claude-plugin', 'skills'))).toEqual(['sk-media-editor']);
    },
  );

  it.skipIf(process.platform === 'win32')(
    'writes the cli shims beside the unpacked server',
    async (): Promise<void> => {
      const base = makeTempDir('bin');
      const root = path.join(base, 'package');
      const version = JSON.stringify({ version: '9.9.9' });
      mkdirSync(path.join(root, 'claude-plugin', '.claude-plugin'), { recursive: true });
      writeFileSync(path.join(root, 'package.json'), version);
      writeFileSync(path.join(root, 'claude-plugin', '.claude-plugin', 'plugin.json'), version);
      mkdirSync(path.join(base, 'sk-media-editor'));
      writeFileSync(path.join(base, 'sk-media-editor', 'SKILL.md'), '# skill\n');
      const staleBin = path.join(root, 'claude-plugin', 'bin');
      mkdirSync(staleBin, { recursive: true });
      writeFileSync(path.join(staleBin, 'old-shim'), '# stale\n');
      const staging = makeTempDir('staging');
      mkdirSync(path.join(staging, 'dist'));
      writeFileSync(path.join(staging, 'manifest.json'), version);
      writeFileSync(path.join(staging, 'dist', 'index.js'), '');
      writeFileSync(path.join(staging, 'dist', 'cli.js'), '');
      mkdirSync(path.join(root, 'dist-bundles'));
      const bundle = path.join(root, 'dist-bundles', 'media-editor-linux-x64.mcpb');
      execFileSync('zip', ['-q', '-r', bundle, '.'], { cwd: staging });
      const report = await buildPlugin('linux-x64', root);
      expect(report.binFiles).toBe(2);
      const binDir = path.join(root, 'claude-plugin', 'bin');
      expect(existsSync(path.join(binDir, 'old-shim'))).toBe(false);
      const shim = path.join(binDir, 'media-editor');
      expect(readFileSync(shim, 'utf8')).toBe(
        '#!/bin/sh\n'
        + "# Runs the Media Editor command line from this plugin's own server folder.\n"
        + 'self=$0\n'
        + 'while [ -L "$self" ]; do\n'
        + '  link=$(readlink "$self")\n'
        + '  case $link in\n'
        + '    /*) self=$link ;;\n'
        + '    *) self=$(dirname "$self")/$link ;;\n'
        + '  esac\n'
        + 'done\n'
        + 'here=$(CDPATH= cd -- "$(dirname -- "$self")" && pwd -P)\n'
        + 'exec node "$here/../server/dist/cli.js" "$@"\n',
      );
      expect(statSync(shim).mode & 0o777).toBe(0o755);
      expect(readFileSync(path.join(binDir, 'media-editor.cmd'), 'utf8')).toBe(
        '@echo off\r\nnode "%~dp0..\\server\\dist\\cli.js" %*\r\n',
      );
    },
  );

  it.skipIf(process.platform === 'win32')(
    'refuses a manifest that registers an MCP server',
    async (): Promise<void> => {
      const root = makeTempDir('mcp');
      const version = JSON.stringify({ version: '9.9.9' });
      writeFileSync(path.join(root, 'package.json'), version);
      mkdirSync(path.join(root, 'claude-plugin', '.claude-plugin'), { recursive: true });
      writeFileSync(
        path.join(root, 'claude-plugin', '.claude-plugin', 'plugin.json'),
        JSON.stringify({ version: '9.9.9', mcpServers: { 'media-editor': { command: 'node' } } }),
      );
      const staging = makeTempDir('staging');
      mkdirSync(path.join(staging, 'dist'));
      writeFileSync(path.join(staging, 'manifest.json'), version);
      writeFileSync(path.join(staging, 'dist', 'cli.js'), '');
      mkdirSync(path.join(root, 'dist-bundles'));
      const bundle = path.join(root, 'dist-bundles', 'media-editor-linux-x64.mcpb');
      execFileSync('zip', ['-q', '-r', bundle, '.'], { cwd: staging });
      const error = await captureAsyncError((): Promise<unknown> => buildPlugin('linux-x64', root));
      expect(error.code).toBe(ERROR_CODES.INTERNAL);
      expect(error.details).toEqual({
        reason: 'mcp-servers',
        path: path.join(root, 'claude-plugin', '.claude-plugin', 'plugin.json'),
      });
    },
  );

  it.skipIf(process.platform === 'win32')(
    'refuses a bundle whose server has no cli file',
    async (): Promise<void> => {
      const root = makeTempDir('root');
      const version = JSON.stringify({ version: '9.9.9' });
      writeFileSync(path.join(root, 'package.json'), version);
      mkdirSync(path.join(root, 'claude-plugin', '.claude-plugin'), { recursive: true });
      writeFileSync(path.join(root, 'claude-plugin', '.claude-plugin', 'plugin.json'), version);
      const staging = makeTempDir('staging');
      mkdirSync(path.join(staging, 'dist'));
      writeFileSync(path.join(staging, 'manifest.json'), version);
      writeFileSync(path.join(staging, 'dist', 'index.js'), '');
      mkdirSync(path.join(root, 'dist-bundles'));
      const bundle = path.join(root, 'dist-bundles', 'media-editor-linux-x64.mcpb');
      execFileSync('zip', ['-q', '-r', bundle, '.'], { cwd: staging });
      const error = await captureAsyncError((): Promise<unknown> => buildPlugin('linux-x64', root));
      expect(error.code).toBe(ERROR_CODES.INTERNAL);
      expect(error.details).toEqual({ reason: 'server-missing' });
    },
  );
});

it('ships no MCP server in the plugin manifest', (): void => {
  const manifest = JSON.parse(readFileSync(PLUGIN_JSON, 'utf8')) as Record<string, unknown>;
  expect('mcpServers' in manifest).toBe(false);
});

it.skipIf(process.platform === 'win32' || !existsSync(PLUGIN_BIN) || !existsSync(PLUGIN_CLI))(
  'lists the forty tools from a scratch working folder',
  (): void => {
    expect(statSync(PLUGIN_BIN).mode & 0o111).not.toBe(0);
    const output = execFileSync(PLUGIN_BIN, ['list'], {
      cwd: makeTempDir('list'),
      encoding: 'utf8',
    });
    const parsed = JSON.parse(output) as { tools: unknown[] };
    expect(parsed.tools).toHaveLength(40);
  },
);

it.skipIf(!existsSync(PLUGIN_SKILL))(
  'keeps the built plugin skill equal to its source',
  (): void => {
    expect(hashTree(PLUGIN_SKILL)).toEqual(shippedSkillHashes(TRACKED_SKILL));
  },
);

afterAll((): void => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});
