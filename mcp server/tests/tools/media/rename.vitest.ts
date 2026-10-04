// ───────────────────────────────────────────────────────────────────
// MODULE: Media Rename Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { expect, it } from 'vitest';

import { ERROR_CODES } from '../../../src/core/errors.js';
import { generateImage } from '../../helpers/media.js';
import {
  asList,
  asRecord,
  callToolAsSent,
  createSandbox,
  sha256Of,
  withToolClient,
} from '../../helpers/tool-client.js';

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Sandbox } from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

async function inSandbox(
  run: (sandbox: Sandbox, client: Client) => Promise<void>,
): Promise<void> {
  const sandbox = createSandbox('media-rename-');
  try {
    await withToolClient(sandbox.config, (client) => run(sandbox, client));
  } finally {
    sandbox.cleanup();
  }
}

function exported(sandbox: Sandbox, fileName: string, folder?: string): Promise<string> {
  const dir = folder === undefined ? sandbox.outputDir : path.join(sandbox.outputDir, folder);
  mkdirSync(dir, { recursive: true });
  return generateImage(dir, { width: 20, height: 10, format: 'webp', fileName });
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('renames a result to a readable slug and keeps its extension', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const source = await exported(sandbox, 'CleanShot 2026-10-03 at 16.46.54-converted.webp');
    const before = sha256Of(source);
    const outcome = await callToolAsSent(client, 'media_rename', {
      path: source,
      newName: 'Team Offsite Hero.png',
    });
    expect(outcome.isError).toBe(false);
    const target = path.join(sandbox.outputDir, 'team-offsite-hero.webp');
    expect(asRecord(asList(outcome.body.outputs)[0]).path).toBe(target);
    expect(outcome.body.previousPath).toBe(source);
    expect(existsSync(source)).toBe(false);
    expect(sha256Of(target)).toBe(before);
  });
});

it('keeps a renamed file in its numbered folder', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const source = await exported(sandbox, 'shot-converted.webp', '001 - webp-shot');
    const outcome = await callToolAsSent(client, 'media_rename', {
      path: source,
      newName: 'launch banner',
    });
    expect(outcome.isError).toBe(false);
    expect(readdirSync(path.join(sandbox.outputDir, '001 - webp-shot'))).toEqual(['launch-banner.webp']);
  });
});

it('never overwrites a file that already has the new name', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const source = await exported(sandbox, 'shot-converted.webp');
    const taken = await exported(sandbox, 'launch-banner.webp');
    const takenBefore = sha256Of(taken);
    const outcome = await callToolAsSent(client, 'media_rename', {
      path: source,
      newName: 'launch banner',
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.body.code).toBe(ERROR_CODES.OUTPUT_EXISTS);
    expect(existsSync(source)).toBe(true);
    expect(sha256Of(taken)).toBe(takenBefore);
  });
});

it('refuses a file outside the export folder', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const outside = await generateImage(sandbox.allowedRoot, {
      width: 20,
      height: 10,
      format: 'png',
      fileName: 'input.png',
    });
    const outcome = await callToolAsSent(client, 'media_rename', {
      path: outside,
      newName: 'renamed input',
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.body.code).toBe(ERROR_CODES.PATH_NOT_ALLOWED);
    expect(existsSync(outside)).toBe(true);
  });
});

it('refuses a name that leaves no usable slug', async (): Promise<void> => {
  await inSandbox(async (sandbox, client) => {
    const source = await exported(sandbox, 'shot-converted.webp');
    const outcome = await callToolAsSent(client, 'media_rename', {
      path: source,
      newName: '!!!',
    });
    expect(outcome.isError).toBe(true);
    expect(outcome.body.code).toBe(ERROR_CODES.INVALID_INPUT);
    expect(existsSync(source)).toBe(true);
  });
});
