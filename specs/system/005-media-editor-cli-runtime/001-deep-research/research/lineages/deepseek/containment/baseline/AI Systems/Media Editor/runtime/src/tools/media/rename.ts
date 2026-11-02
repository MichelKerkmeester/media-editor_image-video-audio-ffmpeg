// ───────────────────────────────────────────────────────────────────
// MODULE: Media Rename
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { statSync } from 'node:fs';
import { constants, copyFile, link, rename, rm, unlink } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError, nodeErrorCode } from '../../core/errors.js';
import { readableFileName, useOutputRoot } from '../../core/output-folder.js';
import { resolveInputPath } from '../../core/path-guard.js';
import { successResult } from '../../core/result.js';
import { readableNameSchema } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { OutputMediaType } from '../../core/result.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Arguments for one rename call. */
interface RenameArguments {
  readonly path: string;
  readonly newName: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'media_rename';

/** Media extensions a result can carry, by the kind of entry they become. */
const MEDIA_TYPES: Readonly<Record<string, OutputMediaType>> = {
  '.avif': 'image',
  '.gif': 'image',
  '.heic': 'image',
  '.heif': 'image',
  '.jpeg': 'image',
  '.jpg': 'image',
  '.png': 'image',
  '.tif': 'image',
  '.tiff': 'image',
  '.webp': 'image',
  '.avi': 'video',
  '.m4v': 'video',
  '.mkv': 'video',
  '.mov': 'video',
  '.mp4': 'video',
  '.webm': 'video',
  '.aac': 'audio',
  '.flac': 'audio',
  '.m4a': 'audio',
  '.mp3': 'audio',
  '.ogg': 'audio',
  '.opus': 'audio',
  '.wav': 'audio',
  '.m3u8': 'playlist',
  '.ts': 'segment',
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function targetExists(target: string): MediaError {
  return new MediaError(
    ERROR_CODES.OUTPUT_EXISTS,
    `A file with that name already exists and is never overwritten: ${target}`,
    { path: target, stage: 'rename' },
  );
}

function mediaTypeOf(filePath: string): OutputMediaType {
  const extension = path.extname(filePath).toLowerCase();
  const mediaType = MEDIA_TYPES[extension];
  if (mediaType === undefined) {
    throw new MediaError(
      ERROR_CODES.UNSUPPORTED_FORMAT,
      `media_rename renames media files only, and ${path.basename(filePath)} is not one.`,
      { parameter: 'path', extension },
    );
  }
  return mediaType;
}

function sameFile(left: string, right: string): boolean {
  try {
    const a = statSync(left);
    const b = statSync(right);
    return a.dev === b.dev && a.ino === b.ino;
  } catch {
    return false;
  }
}

/**
 * Move without ever replacing a file. A hard link fails on an existing
 * target, and a volume without links falls back to an exclusive copy.
 */
async function moveExclusive(source: string, target: string): Promise<void> {
  try {
    await link(source, target);
  } catch (error: unknown) {
    const code = nodeErrorCode(error);
    if (code === 'EEXIST') {
      throw targetExists(target);
    }
    if (code !== 'EPERM' && code !== 'ENOTSUP' && code !== 'EOPNOTSUPP' && code !== 'ENOSYS') {
      throw error;
    }
    try {
      await copyFile(source, target, constants.COPYFILE_EXCL);
    } catch (copyError: unknown) {
      if (nodeErrorCode(copyError) === 'EEXIST') {
        throw targetExists(target);
      }
      await rm(target, { force: true }).catch(() => undefined);
      throw copyError;
    }
  }
  await unlink(source);
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runRename(args: RenameArguments, context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  const root = useOutputRoot(context.config.outputDir, TOOL_NAME);
  const source = resolveInputPath(args.path, 'input', [root.folderPath], 'path', TOOL_NAME);
  const mediaType = mediaTypeOf(source.realPath);
  const extension = path.extname(source.realPath);
  const name = readableFileName(args.newName, extension, 'newName');
  const target = path.join(path.dirname(source.realPath), name);

  if (target === source.realPath) {
    const { entry, warnings } = await context.readBack(target, mediaType);
    return successResult({
      tool: TOOL_NAME,
      text: `${name} already has that name.`,
      outputs: [entry],
      warnings,
      elapsedMs: Date.now() - startedAt,
      extras: { previousPath: source.realPath },
    });
  }

  // A case-only change on a case-insensitive volume names the same file.
  if (sameFile(source.realPath, target)) {
    await rename(source.realPath, target);
  } else {
    await moveExclusive(source.realPath, target);
  }

  const { entry, warnings } = await context.readBack(target, mediaType);
  return successResult({
    tool: TOOL_NAME,
    text: `Renamed ${path.basename(source.realPath)} to ${name}. Output saved to ${target}.`,
    outputs: [entry],
    warnings,
    elapsedMs: Date.now() - startedAt,
    extras: { previousPath: source.realPath },
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** Give one result in the export folder a readable name. */
export const mediaRenameTool = defineTool({
  name: TOOL_NAME,
  title: 'Rename a result',
  description:
    'Gives one image, video or audio file inside the export folder a readable '
    + 'name. A generic name such as "CleanShot 2026-10-03 at 16.46.54-converted.webp" '
    + 'becomes "team-offsite-hero.webp" for the name "team offsite hero". '
    + 'The name is slugged to lowercase words joined by hyphens, the file keeps '
    + 'its extension and its folder, and an existing file is never overwritten. '
    + 'Files outside the export folder are refused.',
  inputSchema: {
    path: z
      .string()
      .min(1)
      .describe('Absolute path of the file to rename, inside the export folder.'),
    newName: readableNameSchema().describe(
      'Readable name of 1 to 64 characters, without a folder. A trailing '
      + 'extension is dropped, because the file keeps its own.',
    ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runRename(args, context);
  },
});
