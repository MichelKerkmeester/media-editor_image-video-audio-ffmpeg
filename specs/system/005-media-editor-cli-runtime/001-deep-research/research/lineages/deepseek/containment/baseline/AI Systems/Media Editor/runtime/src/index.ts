#!/usr/bin/env node
// ───────────────────────────────────────────────────────────────────
// MODULE: Media Editor Server
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './core/config.js';
import { writeLog } from './core/logger.js';
import { createServer } from './server/create-server.js';

import type { LogLevel } from './core/config.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

let isClosing = false;

function failureText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unexpected failure.';
}

function startedMessage(folderCount: number): string {
  const label = folderCount === 1 ? 'folder' : 'folders';
  return `started with ${folderCount} allowed ${label}`;
}

function exitWithCode(code: number): void {
  const finish = (): void => {
    process.exit(code);
  };
  if (process.stderr.writableEnded || process.stderr.writableLength === 0) {
    finish();
    return;
  }
  try {
    process.stderr.write('', finish);
  } catch {
    // A closed stderr still has to end the process.
    finish();
  }
}

async function shutDown(server: McpServer): Promise<void> {
  if (isClosing) {
    return;
  }
  isClosing = true;
  try {
    await server.close();
  } catch {
    // The host already asked the process to leave.
  }
  exitWithCode(0);
}

function armShutdown(server: McpServer): void {
  const onSignal = (): void => {
    if (isClosing) {
      // A second signal must not wait on a close that may be stuck.
      process.exit(0);
      return;
    }
    void shutDown(server);
  };

  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  // The stdio transport keeps running after the host closes stdin.
  process.stdin.on('end', () => {
    void shutDown(server);
  });
  if (process.stdin.readableEnded) {
    void shutDown(server);
  }
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  let logLevel: LogLevel = 'error';
  try {
    const { config, warnings } = loadConfig(process.env, process.argv.slice(2));
    logLevel = config.logLevel;
    for (const warning of warnings) {
      writeLog(config.logLevel, 'warn', warning);
    }

    const server = createServer(config, { configWarnings: warnings });
    const transport = new StdioServerTransport();
    await server.connect(transport);
    writeLog(
      config.logLevel,
      'info',
      startedMessage(config.allowedRoots.length),
    );
    armShutdown(server);
  } catch (error: unknown) {
    try {
      writeLog(logLevel, 'error', `fatal: ${failureText(error)}`);
    } catch {
      // stderr is already unusable.
    }
    exitWithCode(1);
  }
}

// ───────────────────────────────────────────────────────────────────
// 4. EXPORTS
// ───────────────────────────────────────────────────────────────────

void main();

export {};
