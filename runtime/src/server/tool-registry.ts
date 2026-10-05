// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Registry
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { dispatchTool, listedInputSchema } from './dispatch.js';
import { errorResult } from '../core/result.js';

export {
  invalidArgumentsMessage,
  listedInputSchema,
  takesPlacement,
} from './dispatch.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Hints a client may show. They do not change what the tool does. */
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

/**
 * One tool the server can list and call.
 * The handler is a method so tools with different schemas share one list.
 */
export interface ToolDefinition<Shape extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  annotations?: ToolAnnotations;

  /**
   * False for a tool that takes `outputName` but always writes a folder of
   * its own, so it is offered no `fileName`, `subfolder` or `targetFolder`.
   */
  outputPlacement?: false;
  handler(
    args: z.infer<z.ZodObject<Shape>>,
    context: ToolContext,
  ): Promise<CallToolResult>;
}

/** A tool definition stored without its specific argument type. */
export type AnyToolDefinition = ToolDefinition<z.ZodRawShape>;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function registerListedTool(
  server: McpServer,
  definition: AnyToolDefinition,
): void {
  server.registerTool(
    definition.name,
    {
      title: definition.title,
      description: definition.description,
      inputSchema: listedInputSchema(definition),
      annotations: definition.annotations,
    },
    () => errorResult(new Error('unreachable')),
  );
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Keep a tool definition's schema type so the handler sees parsed fields.
 *
 * @param definition - Name, schema, and handler
 * @returns The same definition
 */
export function defineTool<Shape extends z.ZodRawShape>(
  definition: ToolDefinition<Shape>,
): ToolDefinition<Shape> {
  return definition;
}

/**
 * Register tools for listing, then own `tools/call`.
 *
 * @param server - Server that will serve the tools
 * @param definitions - Tools in list order
 * @param context - Services passed to every handler
 * @throws Error when two definitions share a name
 */
export function registerTools(
  server: McpServer,
  definitions: readonly AnyToolDefinition[],
  context: ToolContext,
): void {
  const seen = new Set<string>();
  for (const definition of definitions) {
    if (seen.has(definition.name)) {
      throw new Error(`Duplicate tool name: ${definition.name}`);
    }
    seen.add(definition.name);
  }

  const byName = new Map<string, AnyToolDefinition>();
  for (const definition of definitions) {
    byName.set(definition.name, definition);
    registerListedTool(server, definition);
  }

  if (byName.size === 0) {
    return;
  }

  // The SDK reports an unknown tool and a bad argument list as isError
  // results. Replacing the call handler keeps those two as protocol errors.
  server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    const outcome = await dispatchTool(byName, context, name, args);
    if (outcome.kind === 'unknown-tool') {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${outcome.name}`,
      );
    }
    if (outcome.kind === 'invalid-arguments') {
      throw new McpError(ErrorCode.InvalidParams, outcome.message);
    }
    return outcome.result;
  });
}
