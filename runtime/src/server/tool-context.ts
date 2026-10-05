// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Context
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import path from 'node:path';

import {
  detectCapabilities,
  dropCapabilities,
} from '../core/capabilities.js';
import {
  invalidateBinary,
  resolveBinary as resolveConfiguredBinary,
} from '../core/ffmpeg-resolver.js';
import {
  allocateOutputFolder as allocateNumberedFolder,
  resolveTargetFolder,
  useOutputRoot,
} from '../core/output-folder.js';
import {
  resolveInputPath,
  resolveInputPaths,
} from '../core/path-guard.js';
import {
  cleanUpAfterFailure,
  isSpawnFailure,
  registerCleanupPath,
  runProcess,
} from '../core/process-runner.js';
import {
  describeOutput,
  readbackFromProbeJson,
} from '../core/result.js';

import type {
  Capabilities,
  CapabilityRunner,
} from '../core/capabilities.js';
import type { ServerConfig } from '../core/config.js';
import type {
  BinaryName,
  ResolvedBinary,
  ResolverDeps,
} from '../core/ffmpeg-resolver.js';
import type { AllocatedFolder } from '../core/output-folder.js';
import type { InputRole, ResolvedInput } from '../core/path-guard.js';
import type { ProcessResult, RunOptions } from '../core/process-runner.js';
import type { OutputEntry, OutputMediaType } from '../core/result.js';
import type { PersistentProbeCache } from '../core/probe-cache.js';
import type { ImageContent } from '@modelcontextprotocol/sdk/types.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/**
 * Options for one binary run.
 * `timeoutMs` defaults to the configured timeout when omitted.
 */
export interface RunBinaryOptions
  extends Omit<RunOptions, 'kind' | 'timeoutMs' | 'guard'> {
  timeoutMs?: number;

  /**
   * Every resolved caller input the argv opens, or an empty array when it
   * opens none. The context re-checks each one and sniffs its content before
   * the spawn. The field is required so a tool cannot skip the check by
   * leaving it out.
   */
  inputs: readonly ResolvedInput[];
}

/**
 * How many files one call writes.
 * `single` is one file, `many` is several side by side, `tree` is a nested
 * set such as an HLS ladder, which always needs a folder of its own.
 */
export type OutputLayout = 'single' | 'many' | 'tree';

/** The caller's choices about where and under what name output lands. */
export interface OutputPlacement {
  /** Readable file name, or undefined for `<input stem>-<operation>`. */
  readonly fileName?: string;

  /** True for a numbered folder, false for the export root, undefined for the default. */
  readonly subfolder?: boolean;

  /**
   * Existing numbered folder inside the export root that the whole batch
   * shares, or undefined when the call picks its own destination.
   */
  readonly targetFolder?: string;
}

/** Encoder and filter lists for the ffmpeg that was resolved. */
export interface CapabilitySnapshot {
  binaryPath: string;
  capabilities: Capabilities;
}

/** One written file plus any read-back warnings. */
export interface ReadBackResult {
  entry: OutputEntry;
  warnings: string[];
}

/** Writes a generated JPEG preview and returns its absolute path. */
export type PreviewSink = (preview: ImageContent) => Promise<string>;

/**
 * Services one tool handler uses.
 * The handler does not see the resolver, the path guard, or the runner.
 */
export interface ToolContext {
  /** Settings that took effect. */
  readonly config: ServerConfig;

  /** Warn lines from loading the settings. Empty when none were recorded. */
  readonly configWarnings: readonly string[];

  /** Receives previews in CLI mode. MCP leaves this unset. */
  readonly previewSink?: PreviewSink;

  /**
   * Find a binary, or throw when none is usable.
   *
   * @param name - Which binary to find
   * @returns The accepted binary
   * @throws MediaError `FFMPEG_NOT_FOUND` or `FFPROBE_NOT_FOUND`
   */
  readonly resolveBinary: (name: BinaryName) => Promise<ResolvedBinary>;

  /**
   * Resolve ffmpeg and return its encoder and filter lists.
   *
   * A spawn failure drops that binary and its lists, then tries once more.
   *
   * @returns The path that was read and the lists it reported
   * @throws MediaError when the binary is missing or the second read fails
   */
  readonly getCapabilities: () => Promise<CapabilitySnapshot>;

  /**
   * Resolve one caller path inside the configured roots.
   *
   * @param rawPath - Caller path string
   * @param role - Which kind of input this path is
   * @param parameter - Argument name stored on a string failure
   * @param tool - Tool name stored when no root is configured
   * @returns The caller string, its real path, and the role
   * @throws MediaError when the string, the file, or the root check fails
   */
  readonly resolveInput: (
    rawPath: string,
    role: InputRole,
    parameter: string,
    tool: string,
  ) => ResolvedInput;

  /**
   * Resolve every caller path, or throw on the first failure.
   *
   * @param rawPaths - Caller path strings, in order
   * @param role - Role shared by every entry
   * @param parameter - Argument name stored on a string failure
   * @param tool - Tool name stored when no root is configured
   * @returns One resolved entry per input, in the same order
   * @throws MediaError when any entry fails
   */
  readonly resolveInputs: (
    rawPaths: readonly string[],
    role: InputRole,
    parameter: string,
    tool: string,
  ) => ResolvedInput[];

  /**
   * Placement the caller chose, or undefined for a direct handler call.
   * Without it every call gets a numbered folder and the default file name.
   */
  readonly placement?: OutputPlacement;

  /**
   * Pick the destination folder for one call.
   *
   * Without a placement this is always the next numbered folder. With one, a
   * named `targetFolder` is the destination for every layout, a `tree`
   * layout still gets a numbered folder, and otherwise `subfolder`
   * decides, defaulting to the export root for one file and a numbered
   * folder for several.
   *
   * @param outputName - Description slugged into a folder name
   * @param tool - Tool name stored on a configuration failure
   * @param layout - How many files the call writes, `single` when omitted
   * @returns The destination, with `created` true for a new folder
   * @throws MediaError when the slug is empty, or the directory is unset
   */
  readonly allocateOutputFolder: (
    outputName: string,
    tool: string,
    layout?: OutputLayout,
  ) => AllocatedFolder;

  /** Releases output folders tracked for signal cleanup after one dispatch. */
  readonly releaseInFlightOutputs?: () => void;

  /**
   * Creates output tracking owned by one dispatch.
   *
   * @param sourceContext - Context received by dispatch, or this context when omitted
   * @returns Context with dispatch-scoped output tracking
   */
  readonly createDispatchContext?: (sourceContext?: ToolContext) => ToolContext;

  /** Tracks a newly created output folder until dispatch finishes. */
  readonly trackInFlightOutputFolder?: (folder: AllocatedFolder) => AllocatedFolder;

  /**
   * Resolve a binary and run it.
   *
   * A spawn failure resolves the binary once more. Any other failure,
   * including a miss on that second lookup, removes `cleanupFolders`.
   *
   * @param name - Which binary to run
   * @param args - Argument tokens, one element per token
   * @param options - Inputs to check, timeout, outputs, and folders to remove
   * @returns Captured status and streams for a zero exit
   * @throws MediaError when the binary is missing or the run fails
   */
  readonly runBinary: (
    name: BinaryName,
    args: readonly string[],
    options: RunBinaryOptions,
  ) => Promise<ProcessResult>;

  /**
   * Describe a written file.
   *
   * Video and audio are probed. A probe that cannot run still returns the
   * file's path and size, plus one warning, and does not throw.
   *
   * @param filePath - Path of a file that already exists
   * @param mediaType - Kind of file the entry names
   * @returns The output entry and any read-back warnings
   * @throws The filesystem error from stat when the path is missing
   */
  readonly readBack: (
    filePath: string,
    mediaType: OutputMediaType,
  ) => Promise<ReadBackResult>;
}

/** Replacements for resolution, capability reads, and recorded warnings. */
export interface ToolContextDeps {
  resolverDeps?: ResolverDeps;
  capabilityRunner?: CapabilityRunner;
  configWarnings?: readonly string[];
  previewSink?: PreviewSink;
  probeCache?: PersistentProbeCache;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const EMPTY_WARNINGS: readonly string[] = [];

const PROBE_ARGS = [
  '-v',
  'error',
  '-print_format',
  'json',
  '-show_format',
  '-show_streams',
  '-i',
] as const;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function runOptionsFor(
  name: BinaryName,
  timeoutMs: number,
  options: RunBinaryOptions,
  cleanupFolders: readonly string[],
  roots: readonly string[],
): RunOptions {
  const { inputs, ...rest } = options;
  const guard = inputs.length > 0 ? { inputs, roots } : undefined;
  return {
    ...rest,
    kind: name,
    timeoutMs,
    cleanupFolders,
    guard,
  };
}

function readLists(
  binary: ResolvedBinary,
  capabilityRunner: CapabilityRunner | undefined,
  probeCache: PersistentProbeCache | undefined,
): Promise<Capabilities> {
  const options = probeCache === undefined
    ? undefined
    : { probeCache, version: binary.version };
  return detectCapabilities(binary.path, capabilityRunner, options);
}

function readBackWarning(filePath: string): string {
  const baseName = path.basename(filePath);
  return `Could not read media details back from ${baseName}.`;
}

function isTimedMedia(mediaType: OutputMediaType): boolean {
  return mediaType === 'video' || mediaType === 'audio';
}

function wantsFolder(layout: OutputLayout, placement: OutputPlacement): boolean {
  if (layout === 'tree') {
    return true;
  }
  return placement.subfolder ?? layout === 'many';
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Give a context the caller's placement for one call.
 *
 * @param context - Context shared by every call
 * @param placement - File name and folder choice of this call
 * @returns A context whose folder pick follows the placement
 */
export function withPlacement(
  context: ToolContext,
  placement: OutputPlacement,
): ToolContext {
  function allocateOutputFolder(
    outputName: string,
    tool: string,
    layout: OutputLayout = 'single',
  ): AllocatedFolder {
    if (typeof placement.targetFolder === 'string') {
      const folder = resolveTargetFolder(
        context.config.outputDir,
        placement.targetFolder,
        tool,
      );
      return context.trackInFlightOutputFolder?.(folder) ?? folder;
    }
    if (wantsFolder(layout, placement)) {
      const folder = allocateNumberedFolder(
        context.config.outputDir,
        outputName,
        tool,
      );
      return context.trackInFlightOutputFolder?.(folder) ?? folder;
    }
    const folder = useOutputRoot(context.config.outputDir, tool);
    return context.trackInFlightOutputFolder?.(folder) ?? folder;
  }
  return { ...context, placement, allocateOutputFolder };
}

/**
 * Build the services one tool handler calls.
 *
 * @param config - Settings that took effect
 * @param deps - Optional replacements for resolution and capability reads
 * @returns The context passed to every tool handler
 */
export function createToolContext(
  config: ServerConfig,
  deps?: ToolContextDeps,
): ToolContext {
  const resolverDeps = deps?.resolverDeps;
  const capabilityRunner = deps?.capabilityRunner;
  const configWarnings = deps?.configWarnings ?? EMPTY_WARNINGS;
  const previewSink = deps?.previewSink;
  const probeCache = deps?.probeCache;

  function createOutputTracking(): {
    readonly track: (folder: AllocatedFolder) => AllocatedFolder;
    readonly release: () => void;
  } {
    const outputReleases = new Set<() => void>();

    function track(folder: AllocatedFolder): AllocatedFolder {
      if (folder.created) {
        outputReleases.add(registerCleanupPath(folder.folderPath));
      }
      return folder;
    }

    function release(): void {
      for (const releasePath of outputReleases) {
        releasePath();
      }
      outputReleases.clear();
    }

    return { track, release };
  }

  const defaultOutputTracking = createOutputTracking();
  let context: ToolContext;

  function createDispatchContext(sourceContext: ToolContext = context): ToolContext {
    const outputTracking = createOutputTracking();
    return {
      ...sourceContext,
      allocateOutputFolder: (outputName, tool) => outputTracking.track(
        allocateNumberedFolder(sourceContext.config.outputDir, outputName, tool),
      ),
      releaseInFlightOutputs: outputTracking.release,
      createDispatchContext,
      trackInFlightOutputFolder: outputTracking.track,
    };
  }

  function resolveBinary(name: BinaryName): Promise<ResolvedBinary> {
    return resolveConfiguredBinary(name, config, resolverDeps, probeCache);
  }

  async function getCapabilities(): Promise<CapabilitySnapshot> {
    const binary = await resolveConfiguredBinary('ffmpeg', config, resolverDeps, probeCache);
    try {
      return {
        binaryPath: binary.path,
        capabilities: await readLists(binary, capabilityRunner, probeCache),
      };
    } catch (error: unknown) {
      if (!isSpawnFailure(error)) {
        throw error;
      }
    }

    // The lists belong to the path that failed to start.
    invalidateBinary('ffmpeg');
    dropCapabilities(binary.path);
    await probeCache?.dropBinaryResolution('ffmpeg', binary.path);
    const retry = await resolveConfiguredBinary('ffmpeg', config, resolverDeps, probeCache);
    return {
      binaryPath: retry.path,
      capabilities: await readLists(retry, capabilityRunner, probeCache),
    };
  }

  function resolveInput(
    rawPath: string,
    role: InputRole,
    parameter: string,
    tool: string,
  ): ResolvedInput {
    return resolveInputPath(
      rawPath,
      role,
      config.allowedRoots,
      parameter,
      tool,
    );
  }

  function resolveInputs(
    rawPaths: readonly string[],
    role: InputRole,
    parameter: string,
    tool: string,
  ): ResolvedInput[] {
    return resolveInputPaths(
      rawPaths,
      role,
      config.allowedRoots,
      parameter,
      tool,
    );
  }

  function allocateOutputFolder(
    outputName: string,
    tool: string,
  ): AllocatedFolder {
    return defaultOutputTracking.track(
      allocateNumberedFolder(config.outputDir, outputName, tool),
    );
  }

  async function runBinary(
    name: BinaryName,
    args: readonly string[],
    options: RunBinaryOptions,
  ): Promise<ProcessResult> {
    const timeoutMs = options.timeoutMs ?? config.timeoutSeconds * 1000;
    const cleanupFolders = options.cleanupFolders ?? [];
    let binary: ResolvedBinary;
    try {
      binary = await resolveConfiguredBinary(name, config, resolverDeps, probeCache);
    } catch (error: unknown) {
      cleanUpAfterFailure(error, cleanupFolders);
      throw error;
    }

    try {
      return await runProcess(
        binary.path,
        args,
        runOptionsFor(name, timeoutMs, options, [], config.allowedRoots),
      );
    } catch (error: unknown) {
      if (!isSpawnFailure(error)) {
        cleanUpAfterFailure(error, cleanupFolders);
        throw error;
      }
    }

    // The first spawn kept the folders so a deleted binary can be replaced.
    invalidateBinary(name);
    if (name === 'ffmpeg') {
      dropCapabilities(binary.path);
    }
    await probeCache?.dropBinaryResolution(name, binary.path);

    let retry: ResolvedBinary;
    try {
      retry = await resolveConfiguredBinary(name, config, resolverDeps, probeCache);
    } catch (error: unknown) {
      cleanUpAfterFailure(error, cleanupFolders);
      throw error;
    }

    return runProcess(
      retry.path,
      args,
      runOptionsFor(name, timeoutMs, options, cleanupFolders, config.allowedRoots),
    );
  }

  async function readBack(
    filePath: string,
    mediaType: OutputMediaType,
  ): Promise<ReadBackResult> {
    if (!isTimedMedia(mediaType)) {
      return {
        entry: describeOutput(filePath, mediaType),
        warnings: [],
      };
    }

    try {
      const result = await runBinary('ffprobe', [...PROBE_ARGS, filePath], {
        captureStdout: true,
        inputs: [],
      });
      const parsed: unknown = JSON.parse(result.stdout);
      const readback = readbackFromProbeJson(parsed);
      return {
        entry: describeOutput(filePath, mediaType, readback),
        warnings: [],
      };
    } catch {
      // The deliverable stays. A probe that cannot describe it is a warning.
      return {
        entry: describeOutput(filePath, mediaType),
        warnings: [readBackWarning(filePath)],
      };
    }
  }

  context = {
    config,
    configWarnings,
    previewSink,
    resolveBinary,
    getCapabilities,
    resolveInput,
    resolveInputs,
    allocateOutputFolder,
    releaseInFlightOutputs: defaultOutputTracking.release,
    createDispatchContext,
    trackInFlightOutputFolder: defaultOutputTracking.track,
    runBinary,
    readBack,
  };
  return context;
}
