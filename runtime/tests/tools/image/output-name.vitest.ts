// ───────────────────────────────────────────────────────────────────
// MODULE: Image Output Name Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import sharp from 'sharp';
import { afterAll, expect, it } from 'vitest';

import {
  callTool,
  createSandbox,
  expectProtocolError,
  listFolders,
  withToolClient,
} from '../../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface WritingTool {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const INVALID_PARAMS = -32602;

const sandbox = createSandbox('image-output-name-');

const WRITING_TOOLS: readonly WritingTool[] = [
  { name: 'image_resize', args: { width: 8 } },
  { name: 'image_convert', args: { format: 'png' } },
  { name: 'image_crop', args: { left: 0, top: 0, width: 4, height: 4 } },
  { name: 'image_compress', args: { quality: 80 } },
  { name: 'image_rotate', args: { angle: 90 } },
  { name: 'image_flip', args: { direction: 'horizontal' } },
  {
    name: 'image_batch_resize',
    args: { sizes: [{ width: 8, suffix: 'sm' }] },
  },
];

const BAD_NAMES: readonly { readonly label: string; readonly value: string }[] = [
  { label: 'a relative path with slashes', value: '../../Pictures/evil' },
  { label: 'a single slash', value: 'a/b' },
  { label: 'a backslash path', value: '..\\..\\Pictures\\evil' },
  { label: 'a single backslash', value: 'a\\b' },
  { label: 'an empty string', value: '' },
  { label: '65 characters', value: 'a'.repeat(65) },
  { label: '300 characters', value: 'a'.repeat(300) },
];

const inputPath = path.join(sandbox.allowedRoot, 'source.png');
await sharp({
  create: { width: 32, height: 32, channels: 3, background: '#3366cc' },
})
  .png()
  .toFile(inputPath);

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

afterAll((): void => {
  sandbox.cleanup();
});

it.each(WRITING_TOOLS)(
  '$name writes a folder for a plain description',
  async ({ name, args }): Promise<void> => {
    const before = listFolders(sandbox.outputDir);
    await withToolClient(sandbox.config, async (client) => {
      const outcome = await callTool(client, name, {
        inputPath,
        outputName: 'plain name',
        ...args,
      });
      expect(outcome.isError).toBe(false);
    });
    expect(listFolders(sandbox.outputDir)).toHaveLength(before.length + 1);
  },
);

for (const tool of WRITING_TOOLS) {
  it.each(BAD_NAMES)(
    `${tool.name} rejects $label`,
    async ({ value }): Promise<void> => {
      const before = listFolders(sandbox.outputDir);
      await withToolClient(sandbox.config, async (client) => {
        await expectProtocolError(
          client.callTool({
            name: tool.name,
            arguments: { inputPath, outputName: value, ...tool.args },
          }),
          INVALID_PARAMS,
        );
      });
      expect(listFolders(sandbox.outputDir)).toEqual(before);
    },
  );
}
