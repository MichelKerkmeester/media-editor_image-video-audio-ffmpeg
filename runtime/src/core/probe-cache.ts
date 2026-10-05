// ───────────────────────────────────────────────────────────────────
// MODULE: Persistent Probe Cache
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { BinaryName, BinarySource } from './ffmpeg-resolver.js';
import type { Capabilities } from './capabilities.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** File identity used to decide whether a probe result still applies. */
export interface ProbeCacheIdentity {
  readonly path: string;
  readonly size: number;
  readonly mtimeMs: number;
  readonly version: string;
}

/** One persisted binary resolution, including the file identity it checked. */
export interface CachedBinaryResolution extends ProbeCacheIdentity {
  readonly name: BinaryName;
  readonly source: BinarySource;
  readonly resolutionKey: string;
  readonly skipped?: readonly string[];
}

/** Encoder and filter names persisted for one binary identity. */
export interface CachedCapabilities {
  readonly identity: ProbeCacheIdentity;
  readonly encoders: readonly string[];
  readonly filters: readonly string[];
}

interface ProbeCacheDocument {
  readonly schemaVersion: 1;
  readonly binaries: CachedBinaryResolution[];
  readonly capabilities: CachedCapabilities[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const CACHE_FILE_NAME = 'probes.json';
const BINARY_SOURCES: readonly BinarySource[] = [
  'env-override',
  'bundled',
  'system-path',
  'installed',
];
const BINARY_NAMES: readonly BinaryName[] = ['ffmpeg', 'ffprobe'];

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    return undefined;
  }
  return value;
}

function parseIdentity(value: unknown): ProbeCacheIdentity | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (
    typeof value.path !== 'string'
    || !path.isAbsolute(value.path)
    || typeof value.size !== 'number'
    || !Number.isFinite(value.size)
    || typeof value.mtimeMs !== 'number'
    || !Number.isFinite(value.mtimeMs)
    || typeof value.version !== 'string'
    || value.version.length === 0
  ) {
    return undefined;
  }
  return {
    path: value.path,
    size: value.size,
    mtimeMs: value.mtimeMs,
    version: value.version,
  };
}

function parseBinary(value: unknown): CachedBinaryResolution | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const identity = parseIdentity(value);
  const skipped = value.skipped === undefined ? undefined : stringList(value.skipped);
  if (
    identity === undefined
    || !BINARY_NAMES.includes(value.name as BinaryName)
    || !BINARY_SOURCES.includes(value.source as BinarySource)
    || typeof value.resolutionKey !== 'string'
    || (value.skipped !== undefined && skipped === undefined)
  ) {
    return undefined;
  }
  const result: CachedBinaryResolution = {
    ...identity,
    name: value.name as BinaryName,
    source: value.source as BinarySource,
    resolutionKey: value.resolutionKey,
  };
  return skipped === undefined ? result : { ...result, skipped };
}

function parseCapabilities(value: unknown): CachedCapabilities | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const identity = parseIdentity(value.identity);
  const encoders = stringList(value.encoders);
  const filters = stringList(value.filters);
  if (identity === undefined || encoders === undefined || filters === undefined) {
    return undefined;
  }
  return { identity, encoders, filters };
}

function parseDocument(value: unknown): ProbeCacheDocument | undefined {
  if (
    !isRecord(value)
    || value.schemaVersion !== 1
    || !Array.isArray(value.binaries)
    || !Array.isArray(value.capabilities)
  ) {
    return undefined;
  }
  return {
    schemaVersion: 1,
    binaries: value.binaries
      .map(parseBinary)
      .filter((entry): entry is CachedBinaryResolution => entry !== undefined),
    capabilities: value.capabilities
      .map(parseCapabilities)
      .filter((entry): entry is CachedCapabilities => entry !== undefined),
  };
}

function identityKey(identity: ProbeCacheIdentity): string {
  return createHash('sha256')
    .update(JSON.stringify([
      identity.path,
      identity.size,
      identity.mtimeMs,
      identity.version,
    ]))
    .digest('hex');
}

function emptyDocument(): ProbeCacheDocument {
  return { schemaVersion: 1, binaries: [], capabilities: [] };
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Read and atomically update advisory binary and capability probe results.
 *
 * Cache read and write failures are ignored so a real probe remains the
 * source of truth.
 */
export class PersistentProbeCache {
  private readonly cacheDirectory: string;
  private readonly cachePath: string;
  private document: ProbeCacheDocument | undefined;
  private loading: Promise<ProbeCacheDocument> | undefined;
  private writeQueue: Promise<void> = Promise.resolve();

  /**
   * Create a cache rooted under the data folder.
   *
   * @param dataDir - Runtime data directory
   */
  constructor(dataDir: string) {
    this.cacheDirectory = path.join(dataDir, 'cache');
    this.cachePath = path.join(this.cacheDirectory, CACHE_FILE_NAME);
  }

  /**
   * Read the most recent binary resolution for the same settings.
   *
   * @param name - Binary the resolver is looking for
   * @param resolutionKey - Candidate paths and settings used by the resolver
   * @returns A cached result, or undefined when no advisory result matches
   */
  async getBinaryResolution(
    name: BinaryName,
    resolutionKey: string,
  ): Promise<CachedBinaryResolution | undefined> {
    const document = await this.readDocument();
    for (let index = document.binaries.length - 1; index >= 0; index -= 1) {
      const entry = document.binaries[index];
      if (entry?.name === name && entry.resolutionKey === resolutionKey) {
        try {
          const info = await stat(entry.path);
          if (
            info.isFile()
            && info.size === entry.size
            && info.mtimeMs === entry.mtimeMs
          ) {
            return { ...entry };
          }
        } catch {
          continue;
        }
      }
    }
    return undefined;
  }

  /**
   * Persist an accepted binary resolution.
   *
   * @param entry - Accepted path, source, version and file metadata
   */
  async setBinaryResolution(entry: CachedBinaryResolution): Promise<void> {
    const savedEntry = { ...entry };
    await this.updateDocument((document) => {
      const key = `${savedEntry.name}:${savedEntry.resolutionKey}:${identityKey(savedEntry)}`;
      const binaries = document.binaries.filter((current) => (
        `${current.name}:${current.resolutionKey}:${identityKey(current)}` !== key
      ));
      binaries.push(savedEntry);
      return { ...document, binaries };
    });
  }

  /**
   * Forget every persisted resolution for one path after a spawn failure.
   *
   * @param name - Binary that could not be started
   * @param binaryPath - Path that failed to spawn
   */
  async dropBinaryResolution(name: BinaryName, binaryPath: string): Promise<void> {
    await this.updateDocument((document) => {
      const binaries = document.binaries.filter((entry) => (
        entry.name !== name || entry.path !== binaryPath
      ));
      return binaries.length === document.binaries.length
        ? undefined
        : { ...document, binaries };
    });
  }

  /**
   * Read capability lists for the exact binary identity.
   *
   * @param identity - Absolute path, size, modification time and version
   * @returns Persisted lists, or undefined when the entry is missing
   */
  async getCapabilities(
    identity: ProbeCacheIdentity,
  ): Promise<Capabilities | undefined> {
    const key = identityKey(identity);
    const document = await this.readDocument();
    const entry = document.capabilities.find((current) => (
      identityKey(current.identity) === key
    ));
    if (entry === undefined) {
      return undefined;
    }
    return {
      encoders: new Set(entry.encoders),
      filters: new Set(entry.filters),
    };
  }

  /**
   * Persist encoder and filter lists for the exact binary identity.
   *
   * @param identity - Absolute path, size, modification time and version
   * @param capabilities - Lists parsed from the binary output
   */
  async setCapabilities(
    identity: ProbeCacheIdentity,
    capabilities: Capabilities,
  ): Promise<void> {
    const savedIdentity = { ...identity };
    const encoders = [...capabilities.encoders];
    const filters = [...capabilities.filters];
    await this.updateDocument((document) => {
      const key = identityKey(savedIdentity);
      const entries = document.capabilities.filter((current) => (
        identityKey(current.identity) !== key
      ));
      entries.push({ identity: savedIdentity, encoders, filters });
      return { ...document, capabilities: entries };
    });
  }

  private async readDocument(): Promise<ProbeCacheDocument> {
    if (this.document !== undefined) {
      return this.document;
    }
    this.loading ??= (async (): Promise<ProbeCacheDocument> => {
      try {
        const text = await readFile(this.cachePath, 'utf8');
        const parsed: unknown = JSON.parse(text) as unknown;
        return parseDocument(parsed) ?? emptyDocument();
      } catch {
        return emptyDocument();
      }
    })();
    this.document = await this.loading;
    return this.document;
  }

  private async updateDocument(
    update: (document: ProbeCacheDocument) => ProbeCacheDocument | undefined,
  ): Promise<void> {
    const operation = this.writeQueue.then(async (): Promise<void> => {
      const document = await this.readDocument();
      const updated = update(document);
      if (updated !== undefined) {
        await this.writeDocument(updated);
      }
    });
    this.writeQueue = operation.catch(() => undefined);
    await this.writeQueue;
  }

  private async writeDocument(document: ProbeCacheDocument): Promise<void> {
    this.document = document;
    const snapshot = JSON.stringify(document, null, 2) + '\n';
    const tempPath = `${this.cachePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await mkdir(this.cacheDirectory, { recursive: true });
      await writeFile(tempPath, snapshot, { encoding: 'utf8', flag: 'wx' });
      await rename(tempPath, this.cachePath);
    } catch {
      await rm(tempPath, { force: true }).catch(() => undefined);
    }
  }
}
