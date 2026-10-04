// ───────────────────────────────────────────────────────────────────
// MODULE: Copy Then Encode
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { constants, copyFile } from 'node:fs/promises';
import path from 'node:path';

import { assertCapabilities } from '../../core/capabilities.js';
import { ERROR_CODES, MediaError } from '../../core/errors.js';
import { isMp4FamilyExtension, unportableMp4Codecs } from '../../core/media-containers.js';
import { probeIntermediateCodecs } from '../../core/media-properties.js';
import { outputFileName } from '../../core/output-folder.js';
import { assertOutputNotOnInput } from '../../core/path-guard.js';
import {
  cleanUpAfterFailure,
  isSpawnFailure,
  withTempDir,
} from '../../core/process-runner.js';

import type { AllocatedFolder } from '../../core/output-folder.js';
import type { ResolvedInput } from '../../core/path-guard.js';
import type { OutputEntry } from '../../core/result.js';
import type { CapabilitySnapshot, ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One ffmpeg command in an ordered list of attempts. */
export interface EncodeAttempt {
  /** Full ffmpeg argv for this attempt, ending in the given temp output path. */
  readonly buildArgs: (outputPath: string) => string[];

  /** Encoders to require just before this attempt runs (later attempts only). */
  readonly encoders?: readonly string[];

  /** Filters to require just before this attempt runs (later attempts only). */
  readonly filters?: readonly string[];

  /** Sentence added to the result's warnings when this attempt made the file. */
  readonly warning?: string;

  /**
   * Extension with its dot for this attempt's file, when it differs from the
   * request's. It names the temp file too, since ffmpeg picks the muxer from it.
   */
  readonly extension?: string;

  /**
   * Check of this attempt's finished file before it is kept. A thrown plain
   * `PROCESS_FAILED` counts as this attempt failing, so the next one runs.
   */
  readonly check?: (outputPath: string, tempDir: string) => Promise<void>;
}

/** Encoder and filter names checked before anything runs. */
export interface UpfrontNames {
  readonly encoders?: readonly string[];
  readonly filters?: readonly string[];
}

/** Everything one video or audio call needs to produce its single file. */
export interface AttemptRequest {
  /** Registered tool name, stored on a gate or configuration failure. */
  readonly tool: string;

  /** Description slugged into the numbered folder name. */
  readonly outputName: string;

  /** Caller file every attempt reads. It names the output file. */
  readonly input: ResolvedInput;

  /**
   * Other caller files the attempts open, such as a subtitle, font or overlay
   * image. The runner re-checks and sniffs each one before every spawn.
   */
  readonly otherInputs?: readonly ResolvedInput[];

  /** Kind of file the read-back describes. */
  readonly mediaType: 'video' | 'audio';

  /** Token in `<stem>-<operation><extension>`, for example `trimmed`. */
  readonly operation: string;

  /** Extension with its leading dot, for example `.mp4`. */
  readonly extension: string;

  /** File name inside the temp folder, for example `trimmed.mp4`. */
  readonly tempName: string;

  /** Names required before anything runs and before the output folder exists. */
  readonly upfront: UpfrontNames;

  /**
   * Runs once in the private temp folder before the first attempt, for example
   * to copy a file whose name a filter cannot carry.
   */
  readonly prepare?: (tempDir: string) => Promise<void>;

  /** Commands tried in order until one succeeds. */
  readonly attempts: readonly [EncodeAttempt, ...EncodeAttempt[]];
}

/** The one file a call kept, and where it went. */
export interface AttemptOutput {
  readonly entry: OutputEntry;
  readonly warnings: string[];
  readonly folder: AllocatedFolder;

  /** 1-based number of the attempt that produced the file. */
  readonly attemptUsed: number;
}

/** What the passes of a multi-pass call kept, and how to name it. */
export interface PipelineProduct {
  /** File the last pass wrote, inside the temp folder the step was given. */
  readonly tempPath: string;

  /** Token in `<stem>-<operation><extension>`, for example `joined`. */
  readonly operation: string;

  /** Extension with its leading dot, for example `.mp4`. */
  readonly extension: string;

  /** Kind of file the read-back describes. */
  readonly mediaType: 'video' | 'audio';

  /** Sentences placed before the read-back warnings in the result. */
  readonly warnings?: readonly string[];
}

/** Everything a multi-pass call needs besides its passes. */
export interface PipelineRequest {
  /** Registered tool name, stored on a gate or configuration failure. */
  readonly tool: string;

  /** Description slugged into the numbered folder name. */
  readonly outputName: string;

  /** Caller files the passes read. The first one names the output file. */
  readonly inputs: readonly [ResolvedInput, ...ResolvedInput[]];

  /** Every name the passes need, checked before the output folder exists. */
  readonly upfront: UpfrontNames;
}

/** What {@link runInOutputFolder} needs besides its step. */
export interface FolderRequest {
  /** Registered tool name, stored on a gate or configuration failure. */
  readonly tool: string;

  /** Description slugged into the numbered folder name. */
  readonly outputName: string;

  /** Names required before the folder exists. */
  readonly upfront: UpfrontNames;
}

/** Runs every pass inside a private temp folder and returns the file to keep. */
export type PipelineStep = (tempDir: string) => Promise<PipelineProduct>;

interface SurvivorCopy {
  readonly target: string;
  readonly attemptUsed: number;
}

interface KeepRequest {
  readonly folder: AllocatedFolder;
  readonly namingInput: ResolvedInput;
  readonly guardPaths: readonly string[];
  readonly operation: string;
  readonly extension: string;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const DEFAULT_TAIL_BYTES = 4096;
const FFMPEG_LABEL = 'ffmpeg';
const CONTINUATION_MASK = 0xc0;
const CONTINUATION_BITS = 0x80;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isFallbackFailure(error: unknown): error is MediaError {
  return error instanceof MediaError
    && error.code === ERROR_CODES.PROCESS_FAILED
    && error.details.spawnFailed !== true
    && !isSpawnFailure(error);
}

function tailText(error: MediaError): string {
  const tail = error.details.stderrTail;
  return typeof tail === 'string' ? tail : '';
}

function isExistsError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

function combinedFailure(last: MediaError, tails: readonly string[]): MediaError {
  return new MediaError(ERROR_CODES.PROCESS_FAILED, 'ffmpeg could not process the file.', {
    binary: last.details.binary,
    exitCode: last.details.exitCode,
    signal: last.details.signal,
    stderrTail: joinStderrTails(tails),
  });
}

function gateAttempt(
  request: AttemptRequest,
  snapshot: CapabilitySnapshot,
  attempt: EncodeAttempt,
): void {
  assertCapabilities({
    tool: request.tool,
    binaryPath: snapshot.binaryPath,
    capabilities: snapshot.capabilities,
    encoders: attempt.encoders,
    filters: attempt.filters,
  });
}

/**
 * The exclusive flag keeps an existing file, and a copy rather than a rename
 * works when the temp folder and the output folder sit on different volumes.
 */
async function copyExclusive(survivor: string, target: string): Promise<void> {
  try {
    await copyFile(survivor, target, constants.COPYFILE_EXCL);
  } catch (error: unknown) {
    if (isExistsError(error)) {
      throw new MediaError(
        ERROR_CODES.OUTPUT_EXISTS,
        `Output already exists and is never overwritten: ${target}`,
        { path: target, stage: 'run' },
      );
    }
    throw error;
  }
}

/** The copy runs inside the temp-folder callback, which removes the folder on return. */
async function keepSurvivor(survivor: string, request: KeepRequest): Promise<string> {
  const fileName = outputFileName(
    request.namingInput.rawPath,
    request.operation,
    request.extension,
  );
  const target = path.join(request.folder.folderPath, fileName);
  assertOutputNotOnInput(target, request.guardPaths);
  await copyExclusive(survivor, target);
  return target;
}

function attemptTempName(index: number, tempName: string, extension?: string): string {
  const name = extension === undefined ? tempName : `${path.parse(tempName).name}${extension}`;
  return `attempt-${index + 1}-${name}`;
}

async function inNumberedFolder<T>(
  context: ToolContext,
  tool: string,
  outputName: string,
  upfront: UpfrontNames,
  body: (snapshot: CapabilitySnapshot, folder: AllocatedFolder) => Promise<T>,
): Promise<T> {
  const snapshot = await context.getCapabilities();
  assertCapabilities({
    tool,
    binaryPath: snapshot.binaryPath,
    capabilities: snapshot.capabilities,
    encoders: upfront.encoders,
    filters: upfront.filters,
  });

  const folder = context.allocateOutputFolder(outputName, tool);
  try {
    return await body(snapshot, folder);
  } catch (error: unknown) {
    cleanUpAfterFailure(error, [folder.folderPath]);
    throw error;
  }
}

async function runInTempDir(
  context: ToolContext,
  request: AttemptRequest,
  snapshot: CapabilitySnapshot,
  folder: AllocatedFolder,
): Promise<SurvivorCopy> {
  return withTempDir(async (dir) => {
    await request.prepare?.(dir);
    const callerInputs = [request.input, ...(request.otherInputs ?? [])];
    const tails: string[] = [];
    const count = request.attempts.length;
    for (let index = 0; index < count; index += 1) {
      const attempt = request.attempts[index];
      if (attempt === undefined) {
        continue;
      }
      if (index > 0) {
        gateAttempt(request, snapshot, attempt);
      }
      const tempPath = path.join(
        dir,
        attemptTempName(index, request.tempName, attempt.extension),
      );
      try {
        await context.runBinary('ffmpeg', attempt.buildArgs(tempPath), {
          inputs: callerInputs,
          outputs: [tempPath],
          tempDir: dir,
        });
        await assertPortableMp4(context, tempPath);
        await attempt.check?.(tempPath, dir);
      } catch (error: unknown) {
        if (!isFallbackFailure(error)) {
          throw error;
        }
        if (count === 1) {
          throw error;
        }
        tails.push(tailText(error));
        if (index === count - 1) {
          throw combinedFailure(error, tails);
        }
        continue;
      }

      const target = await keepSurvivor(tempPath, {
        folder,
        namingInput: request.input,
        guardPaths: callerInputs.map((input) => input.realPath),
        operation: request.operation,
        extension: attempt.extension ?? request.extension,
      });
      return { target, attemptUsed: index + 1 };
    }
    // The tuple type guarantees one attempt, so the loop always returns or throws.
    throw new MediaError(ERROR_CODES.INTERNAL, 'No attempt produced a file.', {
      tool: request.tool,
    });
  });
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Join stderr tails from several attempts and keep the end within a byte cap.
 *
 * Empty tails are dropped, the rest are joined with a line break, and the cut
 * keeps the last `maxBytes` UTF-8 bytes on a code-point boundary.
 *
 * @param tails - Tails in attempt order
 * @param maxBytes - Largest UTF-8 size of the result. Defaults to 4096
 * @returns The joined tail, never splitting a character
 */
export function joinStderrTails(
  tails: readonly string[],
  maxBytes: number = DEFAULT_TAIL_BYTES,
): string {
  const joined = tails.filter((tail) => tail.length > 0).join('\n');
  const bytes = Buffer.from(joined, 'utf8');
  if (bytes.length <= maxBytes) {
    return joined;
  }
  if (maxBytes <= 0) {
    return '';
  }
  let start = bytes.length - maxBytes;
  while (
    start < bytes.length
    && ((bytes[start] ?? 0) & CONTINUATION_MASK) === CONTINUATION_BITS
  ) {
    start += 1;
  }
  return bytes.subarray(start).toString('utf8');
}

/**
 * Refuse an MP4-family file that holds a PCM audio or an FFV1 video stream.
 *
 * ffmpeg 9 stores both in MP4 by stream copy while older builds refuse, so the
 * refusal is the same on every build. It is a plain `PROCESS_FAILED`, which
 * the attempt runner treats as a failed attempt and moves past. Any other
 * extension is left alone without a probe.
 *
 * @param context - Runner used for ffprobe
 * @param filePath - A file the server wrote into its own temp folder
 * @returns Resolves when the file may be kept
 * @throws {@link MediaError} `PROCESS_FAILED` naming the codecs an MP4 may not keep
 * @throws {@link MediaError} any failure of the probe run, unchanged
 */
export async function assertPortableMp4(
  context: Pick<ToolContext, 'runBinary'>,
  filePath: string,
): Promise<void> {
  if (!isMp4FamilyExtension(path.extname(filePath))) {
    return;
  }
  const refused = unportableMp4Codecs(await probeIntermediateCodecs(context, filePath));
  if (refused.length === 0) {
    return;
  }
  const names = refused.join(', ');
  throw new MediaError(
    ERROR_CODES.PROCESS_FAILED,
    `The MP4 would keep ${names}, which not every ffmpeg build stores in MP4.`,
    {
      binary: FFMPEG_LABEL,
      exitCode: 0,
      signal: null,
      stderrTail: `MP4 refused for ${names}: re-encode to a codec every build stores.`,
    },
  );
}

/**
 * Run an ordered list of ffmpeg attempts and keep the first file that works.
 *
 * The upfront gate runs before the numbered folder exists. Names that only a
 * later attempt needs are checked just before that attempt. Only an ordinary
 * `PROCESS_FAILED` moves on to the next attempt; every other failure stops the
 * call. An MP4-family file that keeps a PCM or FFV1 stream counts as such a
 * failure, so the next attempt re-encodes it. An optional `prepare` step runs
 * once in the temp folder before the first attempt. Each attempt writes its own
 * temp file, and the survivor is copied into the numbered folder with an
 * exclusive create. Any failure after the folder exists removes it.
 *
 * @param context - Services for capabilities, folders, runs and read-back
 * @param request - Tool, input, naming, gates and the attempts in order
 * @returns The read-back entry, its warnings, the folder and the attempt used
 * @throws {@link MediaError} `CAPABILITY_MISSING` when a gated name is absent
 * @throws {@link MediaError} `PROCESS_FAILED` when every attempt fails, with the
 * joined stderr tails when there was more than one attempt
 * @throws {@link MediaError} `PROCESS_TIMEOUT`, `OUTPUT_EXISTS`, or any other
 * failure from a run or the copy, unchanged
 */
export async function runAttempts(
  context: ToolContext,
  request: AttemptRequest,
): Promise<AttemptOutput> {
  return inNumberedFolder(
    context,
    request.tool,
    request.outputName,
    request.upfront,
    async (snapshot, folder) => {
      const copied = await runInTempDir(context, request, snapshot, folder);
      const { entry, warnings } = await context.readBack(copied.target, request.mediaType);
      const fallback = request.attempts[copied.attemptUsed - 1]?.warning;
      return {
        entry,
        warnings: fallback === undefined ? warnings : [fallback, ...warnings],
        folder,
        attemptUsed: copied.attemptUsed,
      };
    },
  );
}

/**
 * Run a call that needs several ffmpeg passes and keep the one file it makes.
 *
 * The upfront gate runs before the numbered folder exists, and one gate covers
 * every pass. The step runs its passes through `context.runBinary` inside a
 * private temp folder and returns the last file, which is copied into the
 * numbered folder with an exclusive create. An MP4-family file that keeps a
 * PCM or FFV1 stream is refused before the copy. Any failure, including one
 * the step throws on its own, removes the folder.
 *
 * @param context - Services for capabilities, folders, runs and read-back
 * @param request - Tool, inputs, folder description and the names to gate
 * @param step - The passes, given the temp folder, returning the file to keep
 * @returns The read-back entry, the step's warnings then the read-back ones,
 * the folder, and `attemptUsed` 1
 * @throws {@link MediaError} `CAPABILITY_MISSING` when a gated name is absent
 * @throws {@link MediaError} `OUTPUT_EXISTS` when the target already exists
 * @throws {@link MediaError} `PROCESS_FAILED` when the kept MP4 holds PCM or FFV1
 * @throws Any failure from a pass or from the step, unchanged
 */
export async function runPipeline(
  context: ToolContext,
  request: PipelineRequest,
  step: PipelineStep,
): Promise<AttemptOutput> {
  return inNumberedFolder(
    context,
    request.tool,
    request.outputName,
    request.upfront,
    async (_snapshot, folder) => {
      const kept = await withTempDir(async (dir) => {
        const product = await step(dir);
        await assertPortableMp4(context, product.tempPath);
        const target = await keepSurvivor(product.tempPath, {
          folder,
          namingInput: request.inputs[0],
          guardPaths: request.inputs.map((input) => input.realPath),
          operation: product.operation,
          extension: product.extension,
        });
        return { target, product };
      });
      const { entry, warnings } = await context.readBack(kept.target, kept.product.mediaType);
      return {
        entry,
        warnings: [...(kept.product.warnings ?? []), ...warnings],
        folder,
        attemptUsed: 1,
      };
    },
  );
}

/**
 * Run a call that writes several files straight into its numbered folder.
 *
 * The upfront gate runs before the folder exists. The step gets the folder
 * and writes into it, for example with a child whose working directory it is.
 * Any failure the step throws removes the folder and everything in it.
 *
 * @param context - Services for capabilities and folders
 * @param request - Tool, folder description and the names to gate
 * @param step - The work, given the created folder
 * @returns Whatever the step returns
 * @throws {@link MediaError} `CAPABILITY_MISSING` when a gated name is absent
 * @throws Any failure from the step, unchanged
 */
export async function runInOutputFolder<T>(
  context: ToolContext,
  request: FolderRequest,
  step: (folder: AllocatedFolder) => Promise<T>,
): Promise<T> {
  return inNumberedFolder(
    context,
    request.tool,
    request.outputName,
    request.upfront,
    async (_snapshot, folder) => step(folder),
  );
}
