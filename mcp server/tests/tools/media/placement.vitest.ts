// ───────────────────────────────────────────────────────────────────
// MODULE: Output Placement Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { generateAudio, generateImage } from '../../helpers/media.js';
import {
  asList,
  asRecord,
  callToolAsSent,
  createSandbox,
  listFolders,
  withToolClient,
} from '../../helpers/tool-client.js';

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { CallOutcome, Sandbox } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

async function inSandbox(
  run: (sandbox: Sandbox, client: Client) => Promise<void>,
): Promise<void> {
  const sandbox = createSandbox('placement-');
  try {
    await withToolClient(sandbox.config, (client) => run(sandbox, client));
  } finally {
    sandbox.cleanup();
  }
}

function writtenPaths(outcome: CallOutcome): string[] {
  expect(outcome.isError).toBe(false);
  return asList(outcome.body.outputs).map((entry) => String(asRecord(entry).path));
}

function rootFiles(sandbox: Sandbox): string[] {
  return readdirSync(sandbox.outputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();
}

async function photo(sandbox: Sandbox, fileName = 'CleanShot 2026-10-03 at 16.46.54.png'): Promise<string> {
  return generateImage(sandbox.allowedRoot, {
    width: 80,
    height: 40,
    format: 'png',
    fileName,
  });
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('writes one file into the export root by default', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox);
    const outcome = await callToolAsSent(client, 'image_resize', {
      inputPath,
      outputName: 'small shot',
      width: 40,
    });
    const [written] = writtenPaths(outcome);
    expect(written).toBe(path.join(sandbox.outputDir, 'CleanShot 2026-10-03 at 16.46.54-resized.png'));
    expect(listFolders(sandbox.outputDir)).toEqual([]);
  });
});

it('moves a repeated name in the root to -2 and keeps the first file', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const args = { inputPath, outputName: 'small shot', width: 40 };
    const first = writtenPaths(await callToolAsSent(client, 'image_resize', args));
    const second = writtenPaths(await callToolAsSent(client, 'image_resize', args));
    expect(path.basename(first[0] ?? '')).toBe('shot-resized.png');
    expect(path.basename(second[0] ?? '')).toBe('shot-resized-2.png');
    expect(rootFiles(sandbox)).toEqual(['shot-resized-2.png', 'shot-resized.png']);
  });
});

it('names the file from fileName and drops a trailing extension', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox);
    const outcome = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'webp shot',
      format: 'webp',
      fileName: 'Team Offsite Hero.png',
    });
    const [written] = writtenPaths(outcome);
    expect(written).toBe(path.join(sandbox.outputDir, 'team-offsite-hero.webp'));
  });
});

it('writes into a numbered folder when subfolder is true', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const outcome = await callToolAsSent(client, 'image_resize', {
      inputPath,
      outputName: 'small shot',
      width: 40,
      subfolder: true,
    });
    const [written] = writtenPaths(outcome);
    expect(listFolders(sandbox.outputDir)).toEqual(['001 - small-shot']);
    expect(written).toBe(path.join(sandbox.outputDir, '001 - small-shot', 'shot-resized.png'));
  });
});

it('gives several files a folder by default and keeps the operation in a given name', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const outcome = await callToolAsSent(client, 'image_batch_resize', {
      inputPath,
      outputName: 'shot sizes',
      fileName: 'product shot',
      sizes: [{ width: 20, suffix: 'sm' }, { width: 40, suffix: 'md' }],
    });
    const names = writtenPaths(outcome).map((written) => path.relative(sandbox.outputDir, written));
    expect(names).toEqual([
      path.join('001 - shot-sizes', 'product-shot-sm.png'),
      path.join('001 - shot-sizes', 'product-shot-md.png'),
    ]);
  });
});

it('writes several files into the root when subfolder is false', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const outcome = await callToolAsSent(client, 'image_batch_resize', {
      inputPath,
      outputName: 'shot sizes',
      subfolder: false,
      sizes: [{ width: 20, suffix: 'sm' }, { width: 40, suffix: 'md' }],
    });
    writtenPaths(outcome);
    expect(listFolders(sandbox.outputDir)).toEqual([]);
    expect(rootFiles(sandbox)).toEqual(['shot-md.png', 'shot-sm.png']);
  });
});

it('writes a converted audio file into the root under its given name', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await generateAudio(sandbox.allowedRoot, {
      seconds: 1,
      format: 'wav',
      fileName: 'Recording 12.wav',
    });
    const outcome = await callToolAsSent(client, 'audio_convert', {
      inputPath,
      outputName: 'voice memo',
      format: 'mp3',
      fileName: 'standup voice memo',
    });
    const [written] = writtenPaths(outcome);
    expect(written).toBe(path.join(sandbox.outputDir, 'standup-voice-memo.mp3'));
    expect(listFolders(sandbox.outputDir)).toEqual([]);
  });
});

it('leaves the root and earlier results in place when a call fails', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    writtenPaths(await callToolAsSent(client, 'image_resize', {
      inputPath,
      outputName: 'small shot',
      width: 40,
    }));
    const brokenPath = path.join(sandbox.allowedRoot, 'broken.png');
    writeFileSync(brokenPath, Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64, 7),
    ]));
    const failed = await callToolAsSent(client, 'image_resize', {
      inputPath: brokenPath,
      outputName: 'broken',
      width: 40,
    });
    expect(failed.isError).toBe(true);
    expect(failed.body.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
    expect(rootFiles(sandbox)).toEqual(['shot-resized.png']);
  });
});

it('offers fileName and subfolder only to tools that write into one folder', async (): Promise<void> => {
  await inSandbox(async (_sandbox, client) => {
    const listed = await client.listTools();
    const properties = (name: string): string[] => {
      const tool = listed.tools.find((entry) => entry.name === name);
      return Object.keys(tool?.inputSchema.properties ?? {});
    };
    expect(properties('image_resize')).toEqual(expect.arrayContaining(['fileName', 'subfolder']));
    expect(properties('video_trim')).toEqual(expect.arrayContaining(['fileName', 'subfolder']));
    expect(properties('video_hls_ladder')).not.toContain('fileName');
    expect(properties('video_hls_ladder')).not.toContain('subfolder');
    expect(properties('image_probe')).not.toContain('fileName');
    expect(properties('media_rename')).not.toContain('subfolder');
  });
});
