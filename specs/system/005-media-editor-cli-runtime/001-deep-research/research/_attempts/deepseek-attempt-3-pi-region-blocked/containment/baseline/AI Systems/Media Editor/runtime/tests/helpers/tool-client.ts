// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Client
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { expect } from 'vitest';

import { createServer } from '../../src/server/create-server.js';
import { makeTempDir, removeTempDir } from './media.js';

import type { ServerConfig } from '../../src/core/config.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** One isolated config: an allowed root, an output folder, and a data folder. */
export interface Sandbox {
  /** Temporary directory that holds the three folders. */
  readonly root: string;

  /** Canonical allowed root. Caller files go here. */
  readonly allowedRoot: string;

  /** Canonical output folder. Numbered folders are created under it. */
  readonly outputDir: string;

  /** Settings a tool context or a server can use. */
  readonly config: ServerConfig;

  /** Remove the temporary directory. */
  cleanup(): void;
}

/** Structured body of one tool call, plus whether the call failed. */
export interface CallOutcome {
  /** True when the tool result set the error flag. */
  readonly isError: boolean;

  /** `structuredContent` from the result. */
  readonly body: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejectionCode(value: unknown): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const code = value.code;
  if (typeof code !== 'number') {
    return undefined;
  }
  return code;
}

function canonicalDir(root: string, name: string): string {
  const created = path.join(root, name);
  mkdirSync(created);
  return realpathSync.native(created);
}

// ───────────────────────────────────────────────────────────────────
// 4. EXPORTS
// ───────────────────────────────────────────────────────────────────

/**
 * Narrow an unknown value to an object.
 *
 * @param value - Value from a tool result
 * @returns The same value as a string-keyed record
 * @throws {Error} When the value is not a non-array object
 */
export function asRecord(value: unknown): Record<string, unknown> {
  expect(isRecord(value)).toBe(true);
  if (!isRecord(value)) {
    throw new Error('expected an object');
  }
  return value;
}

/**
 * Narrow an unknown value to a list.
 *
 * @param value - Value from a tool result
 * @returns The same value as an array
 * @throws {Error} When the value is not an array
 */
export function asList(value: unknown): unknown[] {
  expect(Array.isArray(value)).toBe(true);
  if (!Array.isArray(value)) {
    throw new Error('expected a list');
  }
  return value;
}

/**
 * Create a temporary allowed root, output folder, and data folder.
 *
 * `allowedRoot` and `outputDir` are native real paths. `cleanup` removes
 * the whole temporary directory.
 *
 * @param prefix - Leading name for the temporary directory
 * @returns The sandbox and the config that points at it
 */
export function createSandbox(prefix: string): Sandbox {
  const root = makeTempDir(prefix);
  const allowedRoot = canonicalDir(root, 'allowed');
  const outputDir = canonicalDir(root, 'output');
  const dataDir = canonicalDir(root, 'data');
  const config: ServerConfig = {
    allowedRoots: [allowedRoot],
    outputDir,
    ffmpegPath: undefined,
    ffprobePath: undefined,
    timeoutSeconds: 30,
    dataDir,
    logLevel: 'error',
  };
  return {
    root,
    allowedRoot,
    outputDir,
    config,
    cleanup(): void {
      removeTempDir(root);
    },
  };
}

/**
 * Connect an in-memory client to a server for one test body.
 *
 * Both sides are closed after the body finishes, including when it throws.
 *
 * @param config - Settings for the server
 * @param run - Test body that receives the connected client
 */
export async function withToolClient(
  config: ServerConfig,
  run: (client: Client) => Promise<void>,
): Promise<void> {
  const server = createServer(config);
  const client = new Client({ name: 'tool-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    await run(client);
  } finally {
    await client.close();
    await server.close();
  }
}

/**
 * Call one tool and return its structured body.
 *
 * A call that names an `outputName` and makes no folder choice is sent with
 * `subfolder: true`, so these suites keep checking the numbered folders.
 * {@link callToolAsSent} sends the arguments unchanged, for the export-root
 * default.
 *
 * The first content entry must be text with no line break.
 *
 * @param client - Connected MCP client
 * @param name - Registered tool name
 * @param args - Arguments object, already schema-shaped
 * @returns Whether the call failed, and its structured body
 * @throws {Error} When the result has no text content entry
 */
export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<CallOutcome> {
  const pinned = 'outputName' in args && !('subfolder' in args)
    ? { ...args, subfolder: true }
    : args;
  return callToolAsSent(client, name, pinned);
}

/**
 * Call one tool with the arguments exactly as given.
 *
 * The first content entry must be text with no line break.
 *
 * @param client - Connected MCP client
 * @param name - Registered tool name
 * @param args - Arguments object, already schema-shaped
 * @returns Whether the call failed, and its structured body
 * @throws {Error} When the result has no text content entry
 */
export async function callToolAsSent(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<CallOutcome> {
  const result = await client.callTool({ name, arguments: args });
  if (!Array.isArray(result.content)) {
    throw new Error('expected content');
  }
  const first = result.content[0];
  if (first === undefined || first.type !== 'text') {
    throw new Error('expected text content');
  }
  expect(/[\r\n]/u.test(first.text)).toBe(false);
  return {
    isError: result.isError === true,
    body: asRecord(result.structuredContent),
  };
}

/**
 * Assert that a call rejects with a protocol error code.
 *
 * @param call - The call that should reject
 * @param code - JSON-RPC code expected on the rejection
 */
export async function expectProtocolError(
  call: Promise<unknown>,
  code: number,
): Promise<void> {
  let thrown: unknown;
  try {
    await call;
    thrown = undefined;
  } catch (error: unknown) {
    thrown = error;
  }
  expect(rejectionCode(thrown)).toBe(code);
}

/**
 * Sorted names of the directories directly inside `dir`.
 *
 * @param dir - Directory to list
 * @returns Directory names, in default sort order
 */
export function listFolders(dir: string): string[] {
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  names.sort();
  return names;
}

/**
 * Hex SHA-256 of a file's bytes.
 *
 * @param filePath - File to hash
 * @returns Lowercase hex digest
 */
export function sha256Of(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}
