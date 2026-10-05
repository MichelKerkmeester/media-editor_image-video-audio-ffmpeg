#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────
// MODULE: Media Editor CLI
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import { mkdirSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  dispatchOutcomeErrorResult,
  dispatchTool,
  listedInputSchema,
} from './server/dispatch.js';
import { loadConfig } from './core/config.js';
import { writeLog } from './core/logger.js';
import { PersistentProbeCache } from './core/probe-cache.js';
import { registerCleanupPath, terminateAll } from './core/process-runner.js';
import { ALL_TOOLS } from './server/all-tools.js';
import { createToolContext } from './server/tool-context.js';

import type { ImageContent } from '@modelcontextprotocol/sdk/types.js';
import type { DispatchErrorOutcome } from './server/dispatch.js';
import type { AnyToolDefinition } from './server/tool-registry.js';
import type { PreviewSink } from './server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

interface CliOptions {
  readonly command: string | undefined;
  readonly positionals: readonly string[];
  readonly allowedDirs: readonly string[];
  readonly outputDir: string | undefined;
  readonly dataDir: string | undefined;
  readonly timeout: string | undefined;
  readonly argsJson: string | undefined;
  readonly argsFile: string | undefined;
  readonly hasArgsFlag: boolean;
  readonly hasArgsFileFlag: boolean;
  readonly help: boolean;
}

class CliUsageError extends Error {}

// ───────────────────────────────────────────────────────────────────
// 3. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const USAGE = 'Usage: media-editor <list|describe <tool>|health|tool_name> [options]';
const TOOL_BY_NAME: ReadonlyMap<string, AnyToolDefinition> = new Map(
  ALL_TOOLS.map((definition) => [definition.name, definition]),
);
const TIMEOUT_PATTERN = /^[0-9]+$/;
const MAX_TIMEOUT_SECONDS = 86400;

// ───────────────────────────────────────────────────────────────────
// 4. HELPERS
// ───────────────────────────────────────────────────────────────────

function flagValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new CliUsageError(`Flag ${flag} requires a value.`);
  }
  if (value.trim().length === 0) {
    throw new CliUsageError(`Flag ${flag} requires a non-empty value.`);
  }
  return value;
}

function parseCliArguments(argv: readonly string[]): CliOptions {
  const allowedDirs: string[] = [];
  const positionals: string[] = [];
  let command: string | undefined;
  let outputDir: string | undefined;
  let dataDir: string | undefined;
  let timeout: string | undefined;
  let argsJson: string | undefined;
  let argsFile: string | undefined;
  let hasArgsFlag = false;
  let hasArgsFileFlag = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === undefined) {
      continue;
    }
    if (token === '--help') {
      help = true;
      continue;
    }
    if (token === '--json') {
      continue;
    }
    if (token === '--allowed-dir') {
      allowedDirs.push(flagValue(argv, index, token));
      index += 1;
      continue;
    }
    if (token === '--output-dir') {
      if (outputDir !== undefined) {
        throw new CliUsageError('Flag --output-dir may be used only once.');
      }
      outputDir = flagValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--data-dir') {
      if (dataDir !== undefined) {
        throw new CliUsageError('Flag --data-dir may be used only once.');
      }
      dataDir = flagValue(argv, index, token);
      index += 1;
      continue;
    }
    if (token === '--timeout') {
      if (timeout !== undefined) {
        throw new CliUsageError('Flag --timeout may be used only once.');
      }
      timeout = flagValue(argv, index, token);
      index += 1;
      if (!TIMEOUT_PATTERN.test(timeout)) {
        throw new CliUsageError('Flag --timeout must be a whole number of seconds.');
      }
      const seconds = Number(timeout);
      if (!Number.isSafeInteger(seconds) || seconds < 1 || seconds > MAX_TIMEOUT_SECONDS) {
        throw new CliUsageError('Flag --timeout is outside the supported range.');
      }
      continue;
    }
    if (token === '--args') {
      if (hasArgsFlag) {
        throw new CliUsageError('Flag --args may be used only once.');
      }
      argsJson = flagValue(argv, index, token);
      hasArgsFlag = true;
      index += 1;
      continue;
    }
    if (token === '--args-file') {
      if (hasArgsFileFlag) {
        throw new CliUsageError('Flag --args-file may be used only once.');
      }
      argsFile = flagValue(argv, index, token);
      hasArgsFileFlag = true;
      index += 1;
      continue;
    }
    if (token.startsWith('--')) {
      throw new CliUsageError(`Unknown flag: ${token}`);
    }
    if (command === undefined) {
      command = token;
    } else {
      positionals.push(token);
    }
  }

  if (hasArgsFlag && hasArgsFileFlag) {
    throw new CliUsageError('Choose only one of --args and --args-file.');
  }
  return {
    command,
    positionals,
    allowedDirs,
    outputDir,
    dataDir,
    timeout,
    argsJson,
    argsFile,
    hasArgsFlag,
    hasArgsFileFlag,
    help,
  };
}

function writeJson(value: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

function writePlainError(message: string): void {
  process.stderr.write(`${message.replace(/[\r\n]/g, ' ')}\n`);
}

function reportUsageError(message: string): number {
  writePlainError(message);
  writeJson({
    code: 'INVALID_INPUT',
    message,
    details: { reason: 'usage' },
  });
  return 2;
}

function reportDispatchError(
  outcome: DispatchErrorOutcome,
): number {
  const result = dispatchOutcomeErrorResult(outcome);
  const message = result.structuredContent?.message;
  writePlainError(typeof message === 'string' ? message : 'Invalid tool request.');
  writeJson(result.structuredContent ?? {});
  return 2;
}

/**
 * Returns the project folder the default folders hang from.
 *
 * A shell that changed into `media files/import` would otherwise get its own nested
 * `media files/export`, so one batch can split across two export roots. Inside a
 * `media files` folder the project is the folder that holds the nearest one.
 *
 * @param cwd - The working folder the command was started in
 * @returns The folder that holds `media files`, or `cwd` when it sits outside one
 */
function projectRoot(cwd: string): string {
  const segments = cwd.split(path.sep);
  const index = segments.lastIndexOf('media files');
  if (index <= 0) {
    return cwd;
  }
  return segments.slice(0, index).join(path.sep) || path.sep;
}

function configTokens(options: CliOptions): {
  readonly env: NodeJS.ProcessEnv;
  readonly tokens: string[];
} {
  const cwd = process.cwd();
  const root = projectRoot(cwd);
  const env: NodeJS.ProcessEnv = { ...process.env };
  const tokens: string[] = [];

  if (options.allowedDirs.length > 0) {
    delete env.MEDIA_EDITOR_ALLOWED_DIRS;
    for (const directory of options.allowedDirs) {
      tokens.push('--allowed-dir', path.resolve(cwd, directory));
    }
  } else if (env.MEDIA_EDITOR_ALLOWED_DIRS === undefined) {
    tokens.push('--allowed-dir', root);
  }

  if (options.outputDir !== undefined) {
    tokens.push('--output-dir', path.resolve(cwd, options.outputDir));
  } else if (env.MEDIA_EDITOR_OUTPUT_DIR === undefined) {
    tokens.push('--output-dir', path.join(root, 'media files', 'export'));
  }

  if (options.dataDir !== undefined) {
    env.MEDIA_EDITOR_DATA_DIR = path.resolve(cwd, options.dataDir);
  }
  if (options.timeout !== undefined) {
    env.MEDIA_EDITOR_TIMEOUT_SECONDS = options.timeout;
  }
  return { env, tokens };
}

async function readArguments(options: CliOptions): Promise<unknown> {
  let input: string;
  if (options.hasArgsFlag) {
    input = options.argsJson ?? '';
  } else if (options.hasArgsFileFlag) {
    try {
      input = await readFile(options.argsFile ?? '', 'utf8');
    } catch {
      throw new CliUsageError('The arguments file could not be read.');
    }
  } else if (!process.stdin.isTTY) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    input = Buffer.concat(chunks).toString('utf8');
  } else {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(input) as unknown;
  } catch {
    throw new CliUsageError('Arguments are not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new CliUsageError('Arguments must be a JSON object.');
  }
  return parsed;
}

function createPreviewSink(dataDir: string): PreviewSink {
  return async (preview: ImageContent): Promise<string> => {
    if (preview.mimeType !== 'image/jpeg') {
      throw new Error('The preview is not a JPEG image.');
    }
    const directory = path.join(dataDir, 'previews');
    mkdirSync(directory, { recursive: true });
    const name = `preview-${randomUUID()}.jpg`;
    const target = path.resolve(directory, name);
    const temporary = path.join(directory, `.${name}.tmp`);
    const releaseTemporary = registerCleanupPath(temporary);
    const releaseTarget = registerCleanupPath(target);
    try {
      writeFileSync(temporary, Buffer.from(preview.data, 'base64'), { flag: 'wx' });
      renameSync(temporary, target);
      return target;
    } catch {
      rmSync(temporary, { force: true });
      rmSync(target, { force: true });
      throw new Error('The preview file could not be written.');
    } finally {
      releaseTemporary();
      releaseTarget();
    }
  };
}

function armSignalHandlers(): void {
  let handlingSignal = false;
  const handleSignal = (signal: NodeJS.Signals): void => {
    const code = signal === 'SIGINT' ? 130 : 143;
    if (handlingSignal) {
      process.exit(code);
      return;
    }
    handlingSignal = true;
    void terminateAll().finally(() => process.exit(code));
  };
  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));
}

function printList(): void {
  writeJson({
    tools: ALL_TOOLS.map(({ name, title, description }) => ({
      name,
      title,
      description,
    })),
  });
}

function printDescription(definition: AnyToolDefinition): void {
  writeJson({
    name: definition.name,
    title: definition.title,
    description: definition.description,
    annotations: definition.annotations ?? {},
    inputSchema: z.toJSONSchema(z.object(listedInputSchema(definition)), {
      target: 'draft-7',
      io: 'input',
    }),
  });
}

function checkNoArgumentSource(options: CliOptions): number | undefined {
  if (options.hasArgsFlag || options.hasArgsFileFlag) {
    return reportUsageError('Arguments are only accepted for a tool command.');
  }
  return undefined;
}

// ───────────────────────────────────────────────────────────────────
// 5. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function runTool(options: CliOptions, toolName: string): Promise<number> {
  if (!TOOL_BY_NAME.has(toolName)) {
    return reportDispatchError({ kind: 'unknown-tool', name: toolName });
  }
  let args: unknown;
  try {
    args = toolName === 'media_health' && options.command === 'health'
      ? {}
      : await readArguments(options);
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      return reportUsageError(error.message);
    }
    throw error;
  }

  const { env, tokens } = configTokens(options);
  const { config, warnings } = loadConfig(env, tokens);
  for (const warning of warnings) {
    writeLog(config.logLevel, 'warn', warning);
  }
  const context = createToolContext(config, {
    configWarnings: warnings,
    previewSink: createPreviewSink(config.dataDir),
    probeCache: new PersistentProbeCache(config.dataDir),
  });
  const outcome = await dispatchTool(TOOL_BY_NAME, context, toolName, args);
  if (outcome.kind !== 'result') {
    return reportDispatchError(outcome);
  }
  const result = outcome.result;
  writeJson(result.structuredContent ?? {});
  return result.isError === true ? 1 : 0;
}

async function main(): Promise<number> {
  armSignalHandlers();
  let options: CliOptions;
  try {
    options = parseCliArguments(process.argv.slice(2));
  } catch (error: unknown) {
    if (error instanceof CliUsageError) {
      return reportUsageError(error.message);
    }
    throw error;
  }

  if (options.help) {
    process.stderr.write(`${USAGE}\n`);
    return 0;
  }
  if (options.command === undefined) {
    return reportUsageError(USAGE);
  }

  try {
    if (options.command === 'list') {
      if (options.positionals.length > 0) {
        return reportUsageError('The list command takes no tool name.');
      }
      const argumentError = checkNoArgumentSource(options);
      if (argumentError !== undefined) {
        return argumentError;
      }
      printList();
      return 0;
    }
    if (options.command === 'describe') {
      if (options.positionals.length !== 1) {
        return reportUsageError('The describe command requires one tool name.');
      }
      const argumentError = checkNoArgumentSource(options);
      if (argumentError !== undefined) {
        return argumentError;
      }
      const toolName = options.positionals[0];
      if (toolName === undefined) {
        return reportUsageError('The describe command requires one tool name.');
      }
      const definition = TOOL_BY_NAME.get(toolName);
      if (definition === undefined) {
        return reportDispatchError({ kind: 'unknown-tool', name: toolName });
      }
      printDescription(definition);
      return 0;
    }

    if (options.positionals.length > 0) {
      return reportUsageError('A tool command takes arguments through JSON input.');
    }
    if (options.command === 'health' && (options.hasArgsFlag || options.hasArgsFileFlag)) {
      return reportUsageError('The health command takes no arguments.');
    }
    const toolName = options.command === 'health' ? 'media_health' : options.command;
    return await runTool(options, toolName);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected startup failure.';
    writePlainError(message);
    writeJson({
      code: 'STARTUP_ERROR',
      message,
      details: { reason: 'startup' },
    });
    return 3;
  }
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1];
let isMainModule = entryFile !== undefined
  && path.resolve(entryFile) === currentFile;
if (entryFile !== undefined) {
  try {
    isMainModule = realpathSync(entryFile) === realpathSync(currentFile);
  } catch {
    isMainModule = path.resolve(entryFile) === currentFile;
  }
}
if (isMainModule) {
  void main().then((code) => {
    process.exitCode = code;
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unexpected startup failure.';
    writePlainError(message);
    writeJson({
      code: 'STARTUP_ERROR',
      message,
      details: { reason: 'startup' },
    });
    process.exitCode = 3;
  });
}
