// ───────────────────────────────────────────────────────────────────
// MODULE: Image Write Failure Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import sharp from 'sharp';
import { afterAll, expect, it, vi } from 'vitest';

import {
  asRecord,
  callTool,
  createSandbox,
  listFolders,
  withToolClient,
} from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const failure = vi.hoisted(() => ({ writes: false }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      // Only the exclusive output write fails, so input reads stay real.
      if (failure.writes && args[1] === 'wx') {
        vi.spyOn(handle, 'write').mockRejectedValue(
          Object.assign(new Error('no space left on device'), { code: 'ENOSPC' }),
        );
      }
      return handle;
    },
  };
});

const sandbox = createSandbox('image-write-failure-');

const inputPath = path.join(sandbox.allowedRoot, 'source.png');
await sharp({
  create: { width: 32, height: 32, channels: 3, background: '#3366cc' },
})
  .png()
  .toFile(inputPath);

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  failure.writes = false;
  sandbox.cleanup();
});

it('removes the output folder when the disk refuses the write', async (): Promise<void> => {
  const before = listFolders(sandbox.outputDir);
  failure.writes = true;
  try {
    await withToolClient(sandbox.config, async (client) => {
      const outcome = await callTool(client, 'image_resize', {
        inputPath,
        outputName: 'disk full',
        width: 16,
      });
      expect(outcome.isError).toBe(true);
      expect(outcome.body.code).toBe('INTERNAL');
      expect(asRecord(outcome.body.details).tool).toBe('image_resize');
    });
  } finally {
    failure.writes = false;
  }
  expect(listFolders(sandbox.outputDir)).toEqual(before);
});

it('writes normally once the disk accepts the write again', async (): Promise<void> => {
  await withToolClient(sandbox.config, async (client) => {
    const outcome = await callTool(client, 'image_resize', {
      inputPath,
      outputName: 'disk back',
      width: 16,
    });
    expect(outcome.isError).toBe(false);
  });
  const folders = listFolders(sandbox.outputDir);
  expect(folders).toHaveLength(1);
  expect(folders[0]).toBe('001 - disk-back');
});
