// ───────────────────────────────────────────────────────────────────
// MODULE: Output Placement Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

it('lands a whole batch in one folder through targetFolder', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const first = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'webp batch',
      format: 'webp',
      subfolder: true,
    });
    const [firstPath] = writtenPaths(first);
    const folderName = path.basename(path.dirname(firstPath ?? ''));
    expect(folderName).toBe('001 - webp-batch');

    const batch = {
      inputPath,
      outputName: 'webp batch',
      format: 'webp',
      targetFolder: folderName,
    };
    const second = writtenPaths(await callToolAsSent(client, 'image_convert', {
      ...batch,
      fileName: 'second shot',
    }));
    const third = writtenPaths(await callToolAsSent(client, 'image_convert', {
      ...batch,
      fileName: 'third shot',
    }));

    const folderPath = path.join(sandbox.outputDir, folderName);
    expect(firstPath).toBe(path.join(folderPath, 'shot-converted.webp'));
    expect(second).toEqual([path.join(folderPath, 'second-shot.webp')]);
    expect(third).toEqual([path.join(folderPath, 'third-shot.webp')]);
    expect(readdirSync(folderPath).sort()).toEqual([
      'second-shot.webp',
      'shot-converted.webp',
      'third-shot.webp',
    ]);
    expect(rootFiles(sandbox)).toEqual([]);
    expect(listFolders(sandbox.outputDir)).toEqual([folderName]);
  });
});

it('moves a repeated name in a targetFolder to -2 and keeps the first bytes', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const setup = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'shared folder',
      format: 'webp',
      subfolder: true,
    });
    const folderName = path.basename(path.dirname(writtenPaths(setup)[0] ?? ''));
    const args = {
      inputPath,
      outputName: 'shared folder',
      format: 'webp',
      fileName: 'kept',
      targetFolder: folderName,
    };
    const first = writtenPaths(await callToolAsSent(client, 'image_convert', args));
    const firstBytes = readFileSync(first[0] ?? '');
    const second = writtenPaths(await callToolAsSent(client, 'image_convert', args));
    expect(path.basename(first[0] ?? '')).toBe('kept.webp');
    expect(path.basename(second[0] ?? '')).toBe('kept-2.webp');
    expect(readFileSync(first[0] ?? '').equals(firstBytes)).toBe(true);
  });
});

it('refuses targetFolder together with subfolder false and writes nothing', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const setup = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'combo',
      format: 'webp',
      subfolder: true,
    });
    const folderName = path.basename(path.dirname(writtenPaths(setup)[0] ?? ''));
    const outcome = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'combo',
      format: 'webp',
      subfolder: false,
      targetFolder: folderName,
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.body.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(outcome.body.details).toEqual({
      parameter: 'targetFolder',
      reason: 'target-folder-with-subfolder-false',
    });
    expect(readdirSync(path.join(sandbox.outputDir, folderName))).toEqual([
      'shot-converted.webp',
    ]);
    expect(rootFiles(sandbox)).toEqual([]);
  });
});

it('reports a targetFolder outside the root or missing as an error result', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const outside = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'target',
      format: 'webp',
      targetFolder: '../escape',
    });
    expect(outside.isError).toBe(true);
    expect(outside.body.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(outside.body.details).toEqual({
      parameter: 'targetFolder',
      reason: 'target-folder-outside-export',
      targetFolder: '../escape',
    });
    const missing = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'target',
      format: 'webp',
      targetFolder: '099 - absent',
    });
    expect(missing.isError).toBe(true);
    expect(missing.body.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(missing.body.details).toEqual({
      parameter: 'targetFolder',
      reason: 'target-folder-missing',
      targetFolder: '099 - absent',
    });
    expect(listFolders(sandbox.outputDir)).toEqual([]);
    expect(rootFiles(sandbox)).toEqual([]);
  });
});

it('keeps a targeted folder and its files when a call into it fails', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const inputPath = await photo(sandbox, 'shot.png');
    const setup = await callToolAsSent(client, 'image_convert', {
      inputPath,
      outputName: 'kept folder',
      format: 'webp',
      subfolder: true,
    });
    const folderName = path.basename(path.dirname(writtenPaths(setup)[0] ?? ''));
    const brokenPath = path.join(sandbox.allowedRoot, 'broken.png');
    writeFileSync(brokenPath, Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64, 7),
    ]));
    const failed = await callToolAsSent(client, 'image_convert', {
      inputPath: brokenPath,
      outputName: 'kept folder',
      format: 'webp',
      targetFolder: folderName,
    });
    expect(failed.isError).toBe(true);
    expect(failed.body.code).toBe(ERROR_CODES.UNSUPPORTED_FORMAT);
    expect(readdirSync(path.join(sandbox.outputDir, folderName))).toEqual([
      'shot-converted.webp',
    ]);
  });
});

it('offers fileName, subfolder and targetFolder only to tools that write into one folder', async (): Promise<void> => {
  await inSandbox(async (_sandbox, client) => {
    const listed = await client.listTools();
    const properties = (name: string): string[] => {
      const tool = listed.tools.find((entry) => entry.name === name);
      return Object.keys(tool?.inputSchema.properties ?? {});
    };
    expect(properties('image_resize')).toEqual(
      expect.arrayContaining(['fileName', 'subfolder', 'targetFolder']),
    );
    expect(properties('video_trim')).toEqual(
      expect.arrayContaining(['fileName', 'subfolder', 'targetFolder']),
    );
    expect(properties('video_hls_ladder')).not.toContain('fileName');
    expect(properties('video_hls_ladder')).not.toContain('subfolder');
    expect(properties('video_hls_ladder')).not.toContain('targetFolder');
    expect(properties('image_probe')).not.toContain('fileName');
    expect(properties('image_probe')).not.toContain('targetFolder');
    expect(properties('media_rename')).not.toContain('subfolder');
    expect(properties('media_rename')).not.toContain('targetFolder');
  });
});

it('lists fileName, subfolder and targetFolder on every writing tool but the ladder', async (): Promise<void> => {
  await inSandbox(async (_sandbox, client) => {
    const { tools } = await client.listTools();
    let placementTools = 0;
    for (const tool of tools) {
      const properties = asRecord(tool.inputSchema.properties);
      if (!Object.hasOwn(properties, 'outputName')) {
        continue;
      }
      if (tool.name === 'video_hls_ladder') {
        expect(Object.keys(properties)).not.toContain('fileName');
        expect(Object.keys(properties)).not.toContain('subfolder');
        expect(Object.keys(properties)).not.toContain('targetFolder');
        continue;
      }
      placementTools += 1;
      for (const field of ['fileName', 'subfolder', 'targetFolder']) {
        expect(properties, `${tool.name} ${field}`).toHaveProperty(field);
      }
      const fileName = asRecord(properties.fileName);
      expect(String(fileName.description), tool.name).toContain('the user confirmed');
      const targetFolder = asRecord(properties.targetFolder);
      expect(String(targetFolder.description), tool.name).toContain('existing numbered folder');
    }
    expect(placementTools).toBeGreaterThan(30);
  });
});
