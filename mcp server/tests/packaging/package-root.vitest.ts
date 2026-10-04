// ───────────────────────────────────────────────────────────────────
// MODULE: Package Root Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it, vi } from 'vitest';

import { main as bundleMain } from '../../scripts/build-bundle.js';
import { main as pluginMain } from '../../scripts/build-plugin.js';
import { assertPackageRoot } from '../../scripts/package-root.js';
import { ERROR_CODES, MediaError } from '../../src/core/errors.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const PACKAGE_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const FAILURE_EXIT_CODE = 1;
const MESSAGE = 'Run it from the package root.';

// Each row is a folder a script may be started from by mistake, and its package.json.
const NOT_ROOT_FOLDERS: Array<[string, string | undefined]> = [
  ['holds no package.json', undefined],
  ['holds the package.json of another package', '{"name":"other-package"}'],
  ['holds a package.json that is not JSON', '{"name":'],
  ['holds a package.json that is a list', '["media-editor-mcp"]'],
  ['holds a copy of this package.json but no source', '{"name":"media-editor-mcp"}'],
];

const BUILD_MAINS: Array<[string, (argv: readonly string[], root: string) => Promise<number>]> = [
  ['the bundle build', bundleMain],
  ['the plugin build', pluginMain],
];

const tempDirs: string[] = [];

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function folderWith(manifest: string | undefined): string {
  const root = mkdtempSync(path.join(tmpdir(), 'media-root-'));
  tempDirs.push(root);
  if (manifest !== undefined) {
    writeFileSync(path.join(root, 'package.json'), manifest, 'utf8');
  }
  return root;
}

function thrownBy(run: () => void): MediaError {
  try {
    run();
  } catch (error: unknown) {
    if (error instanceof MediaError) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected a MediaError.');
}

// ───────────────────────────────────────────────────────────────────
// 4. TESTS
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('assertPackageRoot', (): void => {
  it.each(NOT_ROOT_FOLDERS)('refuses a folder that %s', (_label, manifest): void => {
    const root = folderWith(manifest);
    const error = thrownBy(() => {
      assertPackageRoot(root, MESSAGE);
    });

    expect(error.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(error.message).toBe(MESSAGE);
    expect(error.details).toEqual({ parameter: 'root', value: root, reason: 'not-package-root' });
  });

  it('accepts this package root', (): void => {
    expect(() => {
      assertPackageRoot(PACKAGE_ROOT, MESSAGE);
    }).not.toThrow();
  });
});

describe('build scripts outside the package root', (): void => {
  it.each(BUILD_MAINS)('%s stops with its own message', async (_label, run): Promise<void> => {
    const root = folderWith(undefined);
    const printed = vi.spyOn(console, 'error').mockImplementation((): void => undefined);
    try {
      expect(await run([], root)).toBe(FAILURE_EXIT_CODE);
      expect(printed).toHaveBeenCalledTimes(1);
      const line = String(printed.mock.calls[0]?.[0]);
      expect(line).toContain(ERROR_CODES.INVALID_INPUT);
      expect(line).toContain('not-package-root');
    } finally {
      printed.mockRestore();
    }
    expect(existsSync(path.join(root, 'build'))).toBe(false);
  });
});
