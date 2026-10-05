// ───────────────────────────────────────────────────────────────────
// MODULE: Media Health
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import sharp from 'sharp';

import { summarizeCapabilities } from '../../core/capabilities.js';
import { ERROR_CODES, isMediaError } from '../../core/errors.js';
import { successResult } from '../../core/result.js';
import { readServerVersion } from '../../server/server-info.js';
import { defineTool } from '../../server/tool-registry.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { CapabilityEntry } from '../../core/capabilities.js';
import type { ErrorCode } from '../../core/errors.js';
import type { BinaryName, BinarySource } from '../../core/ffmpeg-resolver.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** A binary the lookup accepted. */
interface FoundBinary {
  readonly found: true;
  readonly path: string;
  readonly source: BinarySource;
  readonly version: string;

  /** Earlier candidates that exist but could not run. Present only when there were some. */
  readonly skipped?: readonly string[];
}

/** A binary no lookup step could run. */
interface MissingBinary {
  readonly found: false;
  readonly path: null;
  readonly lookedIn: readonly string[];
}

/** One binary as the health report states it. */
type BinaryReport = FoundBinary | MissingBinary;

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'media_health';
const SETUP_TOOL = 'media_setup_ffmpeg';
const CAPABILITY_WARNING = 'Encoder and filter lists could not be read.';

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function notFoundCode(name: BinaryName): ErrorCode {
  if (name === 'ffmpeg') {
    return ERROR_CODES.FFMPEG_NOT_FOUND;
  }
  return ERROR_CODES.FFPROBE_NOT_FOUND;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const entries: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') {
      return [];
    }
    entries.push(entry);
  }
  return entries;
}

function folderSentence(count: number): string {
  if (count === 1) {
    return '1 allowed folder is in effect.';
  }
  return `${count} allowed folders are in effect.`;
}

function versionToken(banner: string): string {
  // The banner runs long on static builds, so the line keeps the number only.
  const match = /\bversion\s+(\S+)/.exec(banner);
  return match?.[1] ?? 'unknown version';
}

function binarySentence(name: BinaryName, report: BinaryReport): string {
  if (!report.found) {
    return `${name} was not found.`;
  }
  const found = `${name} ${versionToken(report.version)} was found from ${report.source}.`;
  const skipped = report.skipped?.length ?? 0;
  if (skipped === 0) {
    return found;
  }
  const noun = skipped === 1 ? 'candidate' : 'candidates';
  return `${found} ${skipped} earlier ${noun} could not run.`;
}

function healthSummary(
  serverVersion: string,
  ffmpeg: BinaryReport,
  ffprobe: BinaryReport,
  allowedRootCount: number,
): string {
  const sentences = [
    `Server version ${serverVersion}.`,
    binarySentence('ffmpeg', ffmpeg),
    binarySentence('ffprobe', ffprobe),
    folderSentence(allowedRootCount),
  ];
  if (!ffmpeg.found || !ffprobe.found) {
    sentences.push(`The next step is ${SETUP_TOOL}.`);
  }
  return sentences.join(' ');
}

async function reportBinary(
  name: BinaryName,
  context: ToolContext,
): Promise<BinaryReport> {
  try {
    const resolved = await context.resolveBinary(name);
    const found: FoundBinary = {
      found: true,
      path: resolved.path,
      source: resolved.source,
      version: resolved.version,
    };
    if (resolved.skipped === undefined) {
      return found;
    }
    return { ...found, skipped: [...resolved.skipped] };
  } catch (error: unknown) {
    // The caller still needs the steps that were tried.
    if (isMediaError(error) && error.code === notFoundCode(name)) {
      return {
        found: false,
        path: null,
        lookedIn: stringList(error.details.lookedIn),
      };
    }
    throw error;
  }
}

async function capabilityList(
  ffmpeg: BinaryReport,
  context: ToolContext,
  warnings: string[],
): Promise<CapabilityEntry[]> {
  if (!ffmpeg.found) {
    return [];
  }
  try {
    const snapshot = await context.getCapabilities();
    return summarizeCapabilities(snapshot.capabilities);
  } catch {
    // The binary status stands even when its lists cannot be read.
    warnings.push(CAPABILITY_WARNING);
    return [];
  }
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runHealth(context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  const serverVersion = readServerVersion();
  const ffmpeg = await reportBinary('ffmpeg', context);
  const ffprobe = await reportBinary('ffprobe', context);
  const warnings = [...context.configWarnings];
  const capabilities = await capabilityList(ffmpeg, context, warnings);
  return successResult({
    tool: TOOL_NAME,
    text: healthSummary(
      serverVersion,
      ffmpeg,
      ffprobe,
      context.config.allowedRoots.length,
    ),
    outputs: [],
    warnings,
    elapsedMs: Date.now() - startedAt,
    extras: {
      serverVersion,
      ffmpeg,
      ffprobe,
      capabilities,
      imageEngine: { sharp: sharp.versions.sharp, libvips: sharp.versions.vips },
      allowedRoots: [...context.config.allowedRoots],
      outputFolder: context.config.outputDir ?? null,
      timeoutSeconds: context.config.timeoutSeconds,
      logLevel: context.config.logLevel,
      dataFolder: context.config.dataDir,
      nextStep: !ffmpeg.found || !ffprobe.found ? SETUP_TOOL : null,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/** The `media_health` tool: read-only report on binaries, capabilities and settings. */
export const mediaHealthTool = defineTool({
  name: TOOL_NAME,
  title: 'Media Editor health',
  description:
    'Reports the server version, where ffmpeg and ffprobe were found, '
    + 'which encoders and filters they offer, the image engine versions, '
    + 'and the folders and limits in effect. '
    + 'When a binary is missing, nextStep names media_setup_ffmpeg. '
    + 'It runs without reading any media file. It reports local paths.',
  inputSchema: {},
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler(_args, context): Promise<CallToolResult> {
    return runHealth(context);
  },
});
