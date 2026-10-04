// ───────────────────────────────────────────────────────────────────
// MODULE: Video HLS Ladder
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../core/errors.js';
import {
  countSegments,
  createRungFolders,
  folderTotals,
} from '../../core/hls-folders.js';
import {
  probeMedia,
  requireVideoStream,
} from '../../core/media-properties.js';
import { successResult } from '../../core/result.js';
import { outputNameField } from '../../server/field-schemas.js';
import { defineTool } from '../../server/tool-registry.js';
import { runInOutputFolder } from './copy-then-encode.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { AllocatedFolder } from '../../core/output-folder.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { OutputEntry } from '../../core/result.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One quality rung of the ladder. */
export type Rung = '1080p' | '720p' | '480p' | '360p';

/** Rungs kept after the source-size check, and the ones it left out. */
export interface RungSelection {
  /** Rungs whose frame is no taller than the source's shorter side. */
  readonly kept: Rung[];

  /** Rungs taller than the source's shorter side. */
  readonly dropped: Rung[];
}

/** Frame size, rate ceiling and H.264 profile of one rung. */
interface RungSettings {
  readonly width: number;
  readonly height: number;
  readonly maxrate: string;
  readonly bufsize: string;
  readonly profile: string;
  readonly level: string;
}

/** Arguments after the schema defaults are applied. */
interface LadderArguments {
  readonly inputPath: string;
  readonly outputName: string;
  readonly rungs: Rung[];
  readonly crf: number;
  readonly segmentDuration: number;
}

/** One ladder's inputs after the source probe and the rung check. */
interface LadderPlan {
  /** Real path of the source video. */
  readonly input: ResolvedInput;

  /** Rungs to build, in ladder order. */
  readonly rungs: readonly Rung[];

  /** Rungs the source size left out, in ladder order. */
  readonly dropped: readonly Rung[];

  /** Source frame width in pixels, named in the dropped-rungs warning. */
  readonly sourceWidth: number;

  /** Source frame height in pixels, named in the dropped-rungs warning. */
  readonly sourceHeight: number;

  /** GOP length derived from the source frame rate and the segment length. */
  readonly gop: number;
}

/** Numbers one ladder command is built from. */
export interface LadderArgsOptions {
  /** Real path of the source video. */
  readonly inputPath: string;

  /** Rungs in ladder order, 1080p down to 360p. */
  readonly rungs: readonly Rung[];

  /** H.264 CRF value for every rung. */
  readonly crf: number;

  /** Target seconds per segment. */
  readonly segmentDuration: number;

  /** GOP length, derived from the source frame rate and the segment length. */
  readonly gop: number;
}

/** One rung of the structured result. */
interface LadderRungResult {
  readonly rung: Rung;
  readonly width: number;
  readonly height: number;
  readonly playlistPath: string;
  readonly segmentCount: number;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'video_hls_ladder';

const RUNGS = ['1080p', '720p', '480p', '360p'] as const satisfies readonly Rung[];

// The recipe's quality table: frame, rate ceiling, profile and level per rung.
const RUNG_SETTINGS: Readonly<Record<Rung, RungSettings>> = {
  '1080p': {
    width: 1920,
    height: 1080,
    maxrate: '2500k',
    bufsize: '5000k',
    profile: 'main',
    level: '4.0',
  },
  '720p': {
    width: 1280,
    height: 720,
    maxrate: '1500k',
    bufsize: '3000k',
    profile: 'main',
    level: '4.0',
  },
  '480p': {
    width: 854,
    height: 480,
    maxrate: '800k',
    bufsize: '1600k',
    profile: 'baseline',
    level: '3.1',
  },
  '360p': {
    width: 640,
    height: 360,
    maxrate: '500k',
    bufsize: '1000k',
    profile: 'baseline',
    level: '3.1',
  },
};

const MASTER_PLAYLIST = 'master.m3u8';
const PLAYLIST_NAME = 'playlist.m3u8';
const SEGMENT_PATTERN = '%v/segment_%03d.ts';
const PLAYLIST_PATTERN = '%v/playlist.m3u8';
const FIT_INSIDE_FRAME = 'force_original_aspect_ratio=decrease';
const MIN_GOP = 1;

const VIDEO_ENCODERS = ['libx264'] as const;
const LADDER_FILTERS = ['split', 'scale', 'pad'] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function ladderOrder(rungs: readonly Rung[]): Rung[] {
  return RUNGS.filter((rung) => rungs.includes(rung));
}

function assertNoDuplicateRungs(rungs: readonly Rung[]): void {
  if (new Set(rungs).size === rungs.length) {
    return;
  }
  throw new MediaError(ERROR_CODES.INVALID_INPUT, 'A rung is listed more than once.', {
    parameter: 'rungs',
    value: [...rungs],
    reason: 'duplicate-rung',
  });
}

function gopFor(frameRate: number, segmentDuration: number): number {
  return Math.max(MIN_GOP, Math.round(frameRate * segmentDuration));
}

function joinRungNames(rungs: readonly Rung[]): string {
  if (rungs.length === 1) {
    return rungs[0] ?? '';
  }
  return `${rungs.slice(0, -1).join(', ')} and ${rungs[rungs.length - 1] ?? ''}`;
}

function droppedWarning(dropped: readonly Rung[], width: number, height: number): string {
  const names = joinRungNames(dropped);
  const source = `${width}x${height}`;
  if (dropped.length === 1) {
    return `The ${names} rung is taller than the ${source} source, so it was left out.`;
  }
  return `The ${names} rungs are taller than the ${source} source, so they were left out.`;
}

function splitStage(rungs: readonly Rung[]): string {
  const outputs = rungs.map((_rung, index) => `[v${index + 1}]`).join('');
  return `[0:v]split=${rungs.length}${outputs}`;
}

function scaleStage(rung: Rung, index: number): string {
  const settings = RUNG_SETTINGS[rung];
  const scale = `scale=w=${settings.width}:h=${settings.height}:${FIT_INSIDE_FRAME}`;
  const pad = `pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2`;
  return `[v${index + 1}]${scale},${pad}[v${index + 1}out]`;
}

function ladderGraph(rungs: readonly Rung[]): string {
  const scales = rungs.map((rung, index) => scaleStage(rung, index));
  return [splitStage(rungs), ...scales].join(';');
}

function rungEncodeArgs(rung: Rung, index: number): string[] {
  const settings = RUNG_SETTINGS[rung];
  return [
    '-map',
    `[v${index + 1}out]`,
    `-c:v:${index}`,
    'libx264',
    `-maxrate:v:${index}`,
    settings.maxrate,
    `-bufsize:v:${index}`,
    settings.bufsize,
    `-profile:v:${index}`,
    settings.profile,
    `-level:v:${index}`,
    settings.level,
  ];
}

function streamMap(rungs: readonly Rung[]): string {
  return rungs.map((rung, index) => `v:${index},name:${rung}`).join(' ');
}

function muxArgs(
  crf: number,
  gop: number,
  segmentDuration: number,
  rungs: readonly Rung[],
): string[] {
  return [
    '-preset',
    'fast',
    '-tune',
    'fastdecode',
    '-crf',
    String(crf),
    '-g',
    String(gop),
    '-keyint_min',
    String(gop),
    '-sc_threshold',
    '0',
    '-an',
    '-f',
    'hls',
    '-hls_time',
    String(segmentDuration),
    '-hls_playlist_type',
    'vod',
    '-hls_flags',
    'independent_segments',
    '-hls_segment_type',
    'mpegts',
    '-hls_segment_filename',
    SEGMENT_PATTERN,
    '-master_pl_name',
    MASTER_PLAYLIST,
    '-var_stream_map',
    streamMap(rungs),
    PLAYLIST_PATTERN,
  ];
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

function rungPlaylistPath(folderPath: string, rung: Rung): string {
  return path.join(folderPath, rung, PLAYLIST_NAME);
}

function emptyRung(rung: Rung, stderrTail: string): MediaError {
  const message = `The ladder wrote no segments for rung ${rung}.`;
  return new MediaError(ERROR_CODES.PROCESS_FAILED, message, {
    binary: 'ffmpeg',
    exitCode: 0,
    signal: null,
    stderrTail,
  });
}

function largerThanSource(
  requested: readonly Rung[],
  width: number,
  height: number,
): MediaError {
  const message = `No requested rung fits inside the ${width}x${height} source.`;
  return new MediaError(ERROR_CODES.INVALID_INPUT, message, {
    parameter: 'rungs',
    value: [...requested],
    reason: 'larger-than-source',
  });
}

function rungResult(folderPath: string, rung: Rung, stderrTail: string): LadderRungResult {
  const segmentCount = countSegments(folderPath, rung);
  if (segmentCount === 0) {
    throw emptyRung(rung, stderrTail);
  }
  const settings = RUNG_SETTINGS[rung];
  return {
    rung,
    width: settings.width,
    height: settings.height,
    playlistPath: rungPlaylistPath(folderPath, rung),
    segmentCount,
  };
}

async function buildLadder(
  plan: LadderPlan,
  args: LadderArguments,
  folder: AllocatedFolder,
  context: ToolContext,
  startedAt: number,
): Promise<CallToolResult> {
  createRungFolders(folder.folderPath, plan.rungs);
  const masterPath = path.join(folder.folderPath, MASTER_PLAYLIST);
  const rungPlaylists = plan.rungs.map((rung) => rungPlaylistPath(folder.folderPath, rung));
  // The working directory keeps every pattern relative and server-built, so no
  // caller byte reaches the pattern reader that expands `%v`.
  const run = await context.runBinary(
    'ffmpeg',
    ladderArgs({
      inputPath: plan.input.realPath,
      rungs: plan.rungs,
      crf: args.crf,
      segmentDuration: args.segmentDuration,
      gop: plan.gop,
    }),
    {
      inputs: [plan.input],
      outputs: [masterPath, ...rungPlaylists],
      cwd: folder.folderPath,
    },
  );

  const rows = plan.rungs.map((rung) => rungResult(folder.folderPath, rung, run.stderrTail));
  const warnings: string[] = [];
  if (plan.dropped.length > 0) {
    warnings.push(droppedWarning(plan.dropped, plan.sourceWidth, plan.sourceHeight));
  }
  const masterRead = await context.readBack(masterPath, 'playlist');
  warnings.push(...masterRead.warnings);
  const outputs: OutputEntry[] = [masterRead.entry];
  for (const row of rows) {
    const read = await context.readBack(row.playlistPath, 'playlist');
    warnings.push(...read.warnings);
    outputs.push(read.entry);
  }
  const totals = folderTotals(folder.folderPath);
  const baseName = path.basename(plan.input.rawPath);
  return successResult({
    tool: TOOL_NAME,
    text: `Built a ${plan.rungs.length}-rung HLS ladder from ${baseName}. `
      + `Output saved to ${folder.folderPath}/ (${totals.files} files).`,
    outputs,
    warnings,
    elapsedMs: Date.now() - startedAt,
    extras: {
      masterPlaylist: masterPath,
      rungs: rows,
      droppedRungs: [...plan.dropped],
      totalBytes: totals.bytes,
    },
  });
}

async function runLadder(args: LadderArguments, context: ToolContext): Promise<CallToolResult> {
  const startedAt = Date.now();
  const input = context.resolveInput(args.inputPath, 'input', 'inputPath', TOOL_NAME);
  assertNoDuplicateRungs(args.rungs);
  const properties = await probeMedia(context, input);
  const video = requireVideoStream(input, properties);
  const { kept, dropped } = selectRungs(args.rungs, video.width, video.height);
  if (kept.length === 0) {
    throw largerThanSource(args.rungs, video.width, video.height);
  }
  const plan: LadderPlan = {
    input,
    rungs: kept,
    dropped,
    sourceWidth: video.width,
    sourceHeight: video.height,
    gop: gopFor(video.frameRate, args.segmentDuration),
  };
  return runInOutputFolder(
    context,
    {
      tool: TOOL_NAME,
      outputName: args.outputName,
      upfront: { encoders: VIDEO_ENCODERS, filters: LADDER_FILTERS },
    },
    (folder) => buildLadder(plan, args, folder, context, startedAt),
  );
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Split the requested rungs by the source size, both lists in ladder order.
 *
 * The scaling filter fits the picture to the rung frame in both directions, so
 * a rung taller than the source's shorter side would only be enlarged. A rung
 * equal to that side is kept.
 *
 * @param requested - Rungs the caller asked for, in any order
 * @param width - Source frame width in pixels
 * @param height - Source frame height in pixels
 * @returns The rungs to build and the ones to name as left out
 */
export function selectRungs(
  requested: readonly Rung[],
  width: number,
  height: number,
): RungSelection {
  const shorterSide = Math.min(width, height);
  const kept: Rung[] = [];
  const dropped: Rung[] = [];
  for (const rung of ladderOrder(requested)) {
    if (RUNG_SETTINGS[rung].height > shorterSide) {
      dropped.push(rung);
    } else {
      kept.push(rung);
    }
  }
  return { kept, dropped };
}

/**
 * Build the ffmpeg argv for one HLS ladder.
 *
 * `options.rungs` is used as given, so the caller orders the rungs first.
 * Every profile, level, rate and map entry carries its stream index, because
 * the unindexed flags apply to all video streams of the single output and the
 * last value would otherwise win for every rung.
 *
 * @param options - Input path, ladder-ordered rungs, CRF, segment length and GOP
 * @returns One argument token per element, ready for the process runner
 */
export function ladderArgs(options: LadderArgsOptions): string[] {
  return [
    '-n',
    '-i',
    options.inputPath,
    '-filter_complex',
    ladderGraph(options.rungs),
    ...options.rungs.flatMap((rung, index) => rungEncodeArgs(rung, index)),
    ...muxArgs(options.crf, options.gop, options.segmentDuration, options.rungs),
  ];
}

/** Encodes one video into an HLS ladder with a master playlist and one playlist per rung. */
export const videoHlsLadderTool = defineTool({
  name: TOOL_NAME,
  title: 'HLS ladder',
  description:
    'Encodes one video into an HLS ladder for streaming: one master playlist, '
    + 'one playlist per selected rung (1080p, 720p, 480p, 360p) and H.264 '
    + 'segments beside every playlist, all inside one new numbered folder. '
    + 'A rung taller than the source is left out and named in the result. '
    + 'It never changes the input and drops the audio track. Run time grows '
    + 'with file size: seconds under 100 MB, up to a few minutes from 100 MB '
    + 'to 1 GB, and minutes to tens of minutes above 1 GB.',
  inputSchema: {
    inputPath: z
      .string()
      .min(1)
      .describe(
        'Absolute path of the video to read, inside an allowed root. '
        + 'The file is not changed.',
      ),
    outputName: outputNameField,
    rungs: z
      .array(z.enum(RUNGS))
      .min(1)
      .max(4)
      .default([...RUNGS])
      .describe(
        'Quality rungs to build: 1 to 4 entries from 1080p, 720p, 480p and '
        + '360p with no repeats. Defaults to all four. The ladder always '
        + 'writes them from 1080p down to 360p, and dropping a rung is the '
        + 'file-size knob. A rung taller than the source is left out.',
      ),
    crf: z
      .number()
      .int()
      .min(0)
      .max(51)
      .default(23)
      .describe(
        'H.264 quality on the CRF scale of 0 to 51, where lower is better '
        + 'quality and larger files. 23 is the recommended value, 18 is '
        + 'visually lossless and 28 is medium.',
      ),
    segmentDuration: z
      .number()
      .int()
      .min(2)
      .max(10)
      .default(2)
      .describe(
        'Target seconds per segment, from 2 to 10. 2 is recommended, 4 is '
        + 'acceptable and 6 to 10 is not. The GOP follows this value.',
      ),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler(args, context): Promise<CallToolResult> {
    return runLadder(args, context);
  },
});
