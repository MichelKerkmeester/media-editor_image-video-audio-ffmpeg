// ───────────────────────────────────────────────────────────────────
// MODULE: Media Setup Ffmpeg
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  downloadArtifact,
  removeQuietly,
  sha256OfFile,
  unpackArtifact,
} from '../../core/artifact-download.js';
import { ERROR_CODES, MediaError, isMediaError } from '../../core/errors.js';
import { invalidateBinary } from '../../core/ffmpeg-resolver.js';
import { PINNED_BUILDS, executableFileName, platformKeyOf } from '../../core/pinned-builds.js';
import { successResult } from '../../core/result.js';
import { renderSourceNotice } from '../../core/source-notice.js';
import { defineTool } from '../../server/tool-registry.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { DownloadFetch } from '../../core/artifact-download.js';
import type { ErrorCode } from '../../core/errors.js';
import type { BinaryName, BinarySource, ResolvedBinary } from '../../core/ffmpeg-resolver.js';
import type { PinnedArtifact, PinnedBuild, PlatformKey } from '../../core/pinned-builds.js';
import type { AnyToolDefinition } from '../../server/tool-registry.js';
import type { ToolContext } from '../../server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** The requested component, where `both` means ffmpeg and then ffprobe. */
type SetupChoice = BinaryName | 'both';

/** Arguments for one setup call. */
interface SetupArguments {
  readonly component: SetupChoice;
  readonly consent: boolean;
}

/** One pinned download the call would make. */
interface PlanRow {
  readonly component: BinaryName;
  readonly platform: PlatformKey;
  readonly url: string;
  readonly redirectHost: string | null;
  readonly bytes: number;
  readonly sha256: string;
  readonly binarySha256: string;
  readonly destination: string;
}

/** One binary downloaded and checked in the work folder, not yet placed. */
interface StagedBinary {
  readonly row: PlanRow;
  readonly path: string;
}

/** One requested component as the result reports it. */
interface ComponentReport {
  readonly component: BinaryName;
  readonly path: string;
  readonly source: BinarySource;
  readonly bytes?: number;
  readonly sha256?: string;
}

/** One installed binary as the install record states it. */
interface InstallEntry {
  readonly fileName: string;
  readonly sha256: string;
  readonly archiveSha256: string;
  readonly url: string;
}

/** The readable part of an install record a later call merges into. */
interface ExistingInstall {
  readonly platform: string;
  readonly binaries: Readonly<Record<string, unknown>>;
}

/** Replacements for the platform, the pinned builds, the network, the package root and hashing. */
export interface SetupDeps {
  /** The Node platform name that picks a pinned build key. */
  readonly platform: string;

  /** The CPU architecture that picks a pinned build key. */
  readonly arch: string;

  /** The pinned build per platform key. */
  readonly builds: Readonly<Record<PlatformKey, PinnedBuild>>;

  /** The fetch the download uses. */
  readonly fetchImpl: DownloadFetch;

  /** The package folder that holds the `licenses` folder. */
  readonly packageRoot: string;

  /** Hashes an installed binary where it landed. */
  readonly hashFile: (filePath: string) => Promise<string>;
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const TOOL_NAME = 'media_setup_ffmpeg';
const TOOL_TITLE = 'Set up ffmpeg';
const TOOL_DESCRIPTION =
  'Finds ffmpeg and ffprobe, and downloads a pinned build of either one that is missing '
  + 'after the user consents. The first call returns the planned download, with its URL, '
  + 'size, SHA-256 and destination, for the user to review, and `consent: true` must only '
  + 'be passed after the user accepts it.';

const LICENCE_DIR = 'licenses';
const LICENCE_FILE_NAME = 'ffmpeg-LICENSE.txt';
const SOURCE_FILE_NAME = 'ffmpeg-SOURCE.md';
const NOTICE_PATHS: readonly string[] = [
  `${LICENCE_DIR}/${LICENCE_FILE_NAME}`,
  `${LICENCE_DIR}/${SOURCE_FILE_NAME}`,
];
const INSTALL_RECORD_NAME = 'install.json';
const WORK_PREFIX = '.setup-';
const UNPACKED_DIR = 'unpacked';
const ARCHIVE_SUFFIX = '.archive';
const EXECUTABLE_MODE = 0o755;
const JSON_INDENT = 2;
const MS_PER_SECOND = 1000;

const INPUT_SCHEMA = {
  component: z
    .enum(['ffmpeg', 'ffprobe', 'both'])
    .default('both')
    .describe(
      'Which binary to check and, when one is missing, offer to install: ffmpeg, ffprobe '
      + 'or both. Both checks ffmpeg first and then ffprobe.',
    ),
  consent: z
    .boolean()
    .default(false)
    .describe(
      'Pass true only after the user has seen the planned download for every missing '
      + 'component, including its URL, size, SHA-256 and destination, and accepted it. '
      + 'Without it the call writes nothing.',
    ),
};

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function notFoundCode(name: BinaryName): ErrorCode {
  if (name === 'ffmpeg') {
    return ERROR_CODES.FFMPEG_NOT_FOUND;
  }
  return ERROR_CODES.FFPROBE_NOT_FOUND;
}

function requestedComponents(choice: SetupChoice): readonly BinaryName[] {
  if (choice === 'both') {
    return ['ffmpeg', 'ffprobe'];
  }
  return [choice];
}

function componentPhrase(names: readonly BinaryName[]): string {
  if (names.length === 1 && names[0] !== undefined) {
    return names[0];
  }
  return names.join(' and ');
}

function readyText(names: readonly BinaryName[]): string {
  const verb = names.length === 1 ? 'is' : 'are';
  return `${componentPhrase(names)} ${verb} ready.`;
}

function installedText(names: readonly BinaryName[], version: string): string {
  return `Installed ${componentPhrase(names)} ${version} into the server data folder.`;
}

function licencePaths(packageRoot: string, key: PlatformKey): string[] {
  return [
    path.join(packageRoot, LICENCE_DIR, 'ffmpeg-builds', `${key}-LICENSE.txt`),
    path.join(packageRoot, LICENCE_DIR, LICENCE_FILE_NAME),
  ];
}

async function readLicenceText(candidates: readonly string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch (error: unknown) {
      // An unreadable candidate falls through so the next licence path can answer.
      if (error instanceof Error) {
        continue;
      }
      throw error;
    }
  }
  return undefined;
}

function parseExistingInstall(value: unknown): ExistingInstall | undefined {
  if (!isRecord(value) || typeof value.platform !== 'string' || !isRecord(value.binaries)) {
    return undefined;
  }
  return { platform: value.platform, binaries: value.binaries };
}

async function readExistingInstall(recordPath: string): Promise<ExistingInstall | undefined> {
  try {
    const parsed: unknown = JSON.parse(await readFile(recordPath, 'utf8')) as unknown;
    return parseExistingInstall(parsed);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return undefined;
    }
    throw error;
  }
}

function planRows(
  unresolved: readonly BinaryName[],
  build: PinnedBuild,
  key: PlatformKey,
  dataDir: string,
): PlanRow[] {
  return unresolved.map((component) => {
    const artifact = build.artifacts[component];
    return {
      component,
      platform: key,
      url: artifact.url,
      redirectHost: artifact.redirectHost,
      bytes: artifact.bytes,
      sha256: artifact.sha256,
      binarySha256: artifact.binarySha256,
      destination: path.join(dataDir, 'bin', executableFileName(component, key)),
    };
  });
}

function consentError(plan: readonly PlanRow[]): MediaError {
  const action = plan.some((row) => row.component === 'ffmpeg')
    ? 'download-ffmpeg'
    : 'download-ffprobe';
  return new MediaError(
    ERROR_CODES.CONSENT_REQUIRED,
    'Downloading an ffmpeg build needs explicit consent. '
      + 'Call media_setup_ffmpeg again to accept it.',
    { action, downloads: [...plan] },
  );
}

function unsupportedPlatform(deps: SetupDeps): MediaError {
  return new MediaError(
    ERROR_CODES.INVALID_INPUT,
    'No pinned ffmpeg build exists for this platform. '
      + 'Set MEDIA_EDITOR_FFMPEG_PATH and MEDIA_EDITOR_FFPROBE_PATH to use a local build.',
    {
      parameter: 'platform',
      value: `${deps.platform}-${deps.arch}`,
      reason: 'unsupported-platform',
    },
  );
}

function missingLicence(): MediaError {
  return new MediaError(
    ERROR_CODES.INTERNAL,
    'The licence text for the pinned build is missing, so nothing was downloaded.',
    { reason: 'licence-missing' },
  );
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function resolveRequested(
  name: BinaryName,
  context: ToolContext,
): Promise<ResolvedBinary | undefined> {
  try {
    return await context.resolveBinary(name);
  } catch (error: unknown) {
    if (isMediaError(error) && error.code === notFoundCode(name)) {
      return undefined;
    }
    throw error;
  }
}

async function resolveAfterInstall(
  name: BinaryName,
  context: ToolContext,
): Promise<ResolvedBinary> {
  try {
    return await context.resolveBinary(name);
  } catch (error: unknown) {
    if (isMediaError(error) && error.code === notFoundCode(name)) {
      throw new MediaError(
        ERROR_CODES.INTERNAL,
        `The installed ${name} was not resolved.`,
        { reason: 'install-not-resolved', component: name },
      );
    }
    throw error;
  }
}

async function readBack(row: PlanRow, deps: SetupDeps): Promise<string> {
  try {
    return await deps.hashFile(row.destination);
  } catch (error: unknown) {
    await removeQuietly(row.destination);
    throw new MediaError(
      ERROR_CODES.DOWNLOAD_FAILED,
      'The installed binary could not be read back.',
      { url: row.url, httpStatus: null, reason: 'write' },
    );
  }
}

async function stageOne(
  row: PlanRow,
  artifact: PinnedArtifact,
  work: string,
  deps: SetupDeps,
  signal: AbortSignal,
): Promise<string> {
  const archivePath = path.join(work, `${row.component}${ARCHIVE_SUFFIX}`);
  await downloadArtifact(artifact, archivePath, deps.fetchImpl, signal);
  const unpackedDir = path.join(work, UNPACKED_DIR);
  await mkdir(unpackedDir, { recursive: true });
  const unpacked = path.join(unpackedDir, path.basename(row.destination));
  await unpackArtifact(archivePath, artifact, unpacked);
  if (process.platform !== 'win32') {
    // The executable bit is a POSIX concept; the pinned digest covers the bytes only.
    await chmod(unpacked, EXECUTABLE_MODE);
  }
  return unpacked;
}

async function placeOne(row: PlanRow, staged: string, deps: SetupDeps): Promise<void> {
  await rename(staged, row.destination);
  const actual = await readBack(row, deps);
  if (actual !== row.binarySha256) {
    await removeQuietly(row.destination);
    throw new MediaError(
      ERROR_CODES.CHECKSUM_MISMATCH,
      'The installed binary does not match the pinned SHA-256.',
      { expected: row.binarySha256, actual, url: row.url },
    );
  }
}

async function writeNotices(
  binDir: string,
  licenceText: string,
  build: PinnedBuild,
): Promise<void> {
  const licenceDir = path.join(binDir, LICENCE_DIR);
  await mkdir(licenceDir, { recursive: true });
  await writeFile(path.join(licenceDir, LICENCE_FILE_NAME), licenceText);
  await writeFile(path.join(licenceDir, SOURCE_FILE_NAME), renderSourceNotice(build));
}

function binaryStillThere(binDir: string, entry: unknown): boolean {
  if (typeof entry !== 'object' || entry === null || !('fileName' in entry)) {
    return false;
  }
  const fileName = entry.fileName;
  return typeof fileName === 'string'
    && path.basename(fileName) === fileName
    && existsSync(path.join(binDir, fileName));
}

async function writeInstallRecord(
  binDir: string,
  work: string,
  key: PlatformKey,
  build: PinnedBuild,
  plan: readonly PlanRow[],
): Promise<void> {
  const recordPath = path.join(binDir, INSTALL_RECORD_NAME);
  const existing = await readExistingInstall(recordPath);
  const binaries: Record<string, unknown> = {};
  const installedNames = new Set<string>(plan.map((row) => row.component));
  if (existing !== undefined && existing.platform === key) {
    for (const [name, entry] of Object.entries(existing.binaries)) {
      if (!installedNames.has(name) && binaryStillThere(binDir, entry)) {
        binaries[name] = entry;
      }
    }
  }
  for (const row of plan) {
    const entry: InstallEntry = {
      fileName: executableFileName(row.component, key),
      sha256: row.binarySha256,
      archiveSha256: row.sha256,
      url: row.url,
    };
    binaries[row.component] = entry;
  }
  const record = {
    platform: key,
    version: build.version,
    binaries,
    notices: [...NOTICE_PATHS],
  };
  // Staged in this call's own work folder, so a concurrent call never shares the
  // temp file and a failed rename leaves nothing behind in the bin folder.
  const temporary = path.join(work, INSTALL_RECORD_NAME);
  await writeFile(temporary, `${JSON.stringify(record, null, JSON_INDENT)}\n`);
  await rename(temporary, recordPath);
}

async function installPlan(
  plan: readonly PlanRow[],
  build: PinnedBuild,
  key: PlatformKey,
  licenceText: string,
  context: ToolContext,
  deps: SetupDeps,
): Promise<Map<BinaryName, ResolvedBinary>> {
  const binDir = path.join(context.config.dataDir, 'bin');
  // One deadline for every download in the call: the server's per-run limit.
  const signal = AbortSignal.timeout(context.config.timeoutSeconds * MS_PER_SECOND);
  await mkdir(binDir, { recursive: true });
  const work = await mkdtemp(path.join(binDir, WORK_PREFIX));
  try {
    // Every binary is downloaded and checked in the work folder before any is placed,
    // so a failed download never leaves an earlier binary installed without a record.
    const staged: StagedBinary[] = [];
    for (const row of plan) {
      const artifact = build.artifacts[row.component];
      staged.push({ row, path: await stageOne(row, artifact, work, deps, signal) });
    }
    const placed: string[] = [];
    try {
      for (const binary of staged) {
        await placeOne(binary.row, binary.path, deps);
        placed.push(binary.row.destination);
      }
      await writeNotices(binDir, licenceText, build);
      await writeInstallRecord(binDir, work, key, build, plan);
    } catch (error: unknown) {
      await Promise.all(placed.map((destination) => removeQuietly(destination)));
      throw error;
    }
    const resolved = new Map<BinaryName, ResolvedBinary>();
    for (const row of plan) {
      invalidateBinary(row.component);
      resolved.set(row.component, await resolveAfterInstall(row.component, context));
    }
    return resolved;
  } finally {
    await removeQuietly(work, true);
  }
}

function componentReports(
  requested: readonly BinaryName[],
  bindings: ReadonlyMap<BinaryName, ResolvedBinary>,
  plan: readonly PlanRow[],
): ComponentReport[] {
  const planByComponent = new Map<BinaryName, PlanRow>();
  for (const row of plan) {
    planByComponent.set(row.component, row);
  }
  const reports: ComponentReport[] = [];
  for (const component of requested) {
    const binary = bindings.get(component);
    if (binary === undefined) {
      // Every requested component is resolved or installed before this point.
      throw new Error(`Setup lost track of ${component}.`);
    }
    const row = planByComponent.get(component);
    if (row === undefined) {
      reports.push({ component, path: binary.path, source: binary.source });
      continue;
    }
    reports.push({
      component,
      path: binary.path,
      source: binary.source,
      bytes: row.bytes,
      sha256: row.binarySha256,
    });
  }
  return reports;
}

function setupResult(
  startedAt: number,
  context: ToolContext,
  text: string,
  components: readonly ComponentReport[],
  downloads: readonly PlanRow[],
  licences: readonly string[],
): CallToolResult {
  return successResult({
    tool: TOOL_NAME,
    text,
    outputs: [],
    warnings: [...context.configWarnings],
    elapsedMs: Date.now() - startedAt,
    extras: {
      components,
      downloads,
      licences,
    },
  });
}

async function runSetup(
  args: SetupArguments,
  context: ToolContext,
  deps: SetupDeps,
): Promise<CallToolResult> {
  const startedAt = Date.now();
  const requested = requestedComponents(args.component);
  const bindings = new Map<BinaryName, ResolvedBinary>();
  const unresolved: BinaryName[] = [];
  for (const component of requested) {
    const found = await resolveRequested(component, context);
    if (found === undefined) {
      unresolved.push(component);
    } else {
      bindings.set(component, found);
    }
  }

  if (unresolved.length === 0) {
    return setupResult(
      startedAt,
      context,
      readyText(requested),
      componentReports(requested, bindings, []),
      [],
      [],
    );
  }

  const key = platformKeyOf(deps.platform, deps.arch);
  if (key === undefined) {
    throw unsupportedPlatform(deps);
  }
  const build = deps.builds[key];
  const plan = planRows(unresolved, build, key, context.config.dataDir);
  if (!args.consent) {
    throw consentError(plan);
  }

  const licenceText = await readLicenceText(licencePaths(deps.packageRoot, key));
  if (licenceText === undefined) {
    throw missingLicence();
  }

  const installed = await installPlan(plan, build, key, licenceText, context, deps);
  for (const [name, binary] of installed) {
    bindings.set(name, binary);
  }
  return setupResult(
    startedAt,
    context,
    installedText(
      plan.map((row) => row.component),
      build.version,
    ),
    componentReports(requested, bindings, plan),
    plan,
    NOTICE_PATHS,
  );
}

// ───────────────────────────────────────────────────────────────────
// 6. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Build the `media_setup_ffmpeg` tool with the given replacements.
 *
 * The returned handler runs one call at a time, so two overlapping calls never
 * install over each other, and a failed call does not hold up the next.
 *
 * @param overrides - Replacements for the platform, the pinned builds, the
 *   network, the package root and the hashing of an installed binary
 * @returns The tool definition the server registers
 * @throws {@link MediaError} `INVALID_INPUT`, `CONSENT_REQUIRED`, `DOWNLOAD_FAILED`,
 *   `CHECKSUM_MISMATCH` or `INTERNAL`, thrown from the returned handler
 */
export function createSetupFfmpegTool(overrides: Partial<SetupDeps> = {}): AnyToolDefinition {
  const deps: SetupDeps = {
    platform: overrides.platform ?? process.platform,
    arch: overrides.arch ?? process.arch,
    builds: overrides.builds ?? PINNED_BUILDS,
    fetchImpl: overrides.fetchImpl ?? ((url, init) => fetch(url, init)),
    packageRoot: overrides.packageRoot ?? fileURLToPath(new URL('../../../', import.meta.url)),
    hashFile: overrides.hashFile ?? sha256OfFile,
  };
  // One call at a time, so a second call finds what the first installed
  // instead of racing it for the same destinations.
  let previous: Promise<unknown> = Promise.resolve();
  return defineTool({
    name: TOOL_NAME,
    title: TOOL_TITLE,
    description: TOOL_DESCRIPTION,
    inputSchema: INPUT_SCHEMA,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    handler(args, context): Promise<CallToolResult> {
      const current = previous.then(() => runSetup(args, context, deps));
      previous = current.catch((): undefined => undefined);
      return current;
    },
  });
}

/** The `media_setup_ffmpeg` tool as the server registers it. */
export const mediaSetupFfmpegTool: AnyToolDefinition = createSetupFfmpegTool();
