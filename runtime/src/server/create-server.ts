// ───────────────────────────────────────────────────────────────────
// MODULE: Server Factory
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ALL_TOOLS } from './all-tools.js';
import { SERVER_NAME, readServerVersion } from './server-info.js';
import { createToolContext } from './tool-context.js';
import { registerTools } from './tool-registry.js';

import type { ServerConfig } from '../core/config.js';
import type { AnyToolDefinition } from './tool-registry.js';
import type { ToolContext } from './tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Replacements for the tool list, context, or recorded warnings. */
export interface CreateServerOptions {
  definitions?: readonly AnyToolDefinition[];
  context?: ToolContext;
  configWarnings?: readonly string[];
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Build an MCP server and register its tools.
 *
 * @param config - Settings passed to the default tool context
 * @param options - Tool list, context, or recorded configuration warnings
 * @returns The server, before it is connected
 * @throws Error when two definitions share a name
 */
export function createServer(
  config: ServerConfig,
  options?: CreateServerOptions,
): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: readServerVersion(),
  });
  const context = options?.context
    ?? createToolContext(config, {
      configWarnings: options?.configWarnings,
    });
  registerTools(server, options?.definitions ?? ALL_TOOLS, context);
  return server;
}
