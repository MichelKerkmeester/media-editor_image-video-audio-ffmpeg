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

import { errorResult } from '../core/result.js';

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

function invalidArgumentsMessage(toolName: string, error: z.ZodError): string {
  const labels: string[] = [];
  for (const issue of error.issues) {
    const path = issue.path.map((part) => String(part)).join('.');
    if (path.length > 0 && !labels.includes(path)) {
      labels.push(path);
    }
  }
  if (labels.length === 0) {
    return `Invalid arguments for tool ${toolName}.`;
  }
  return `Invalid arguments for tool ${toolName}: ${labels.join(', ')}`;
}

async function dispatchToolCall(
  definition: AnyToolDefinition,
  context: ToolContext,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = z.object(definition.inputSchema).safeParse(args);
  if (!parsed.success) {
    throw new McpError(
      ErrorCode.InvalidParams,
      invalidArgumentsMessage(definition.name, parsed.error),
    );
  }
  try {
    return await definition.handler(parsed.data, context);
  } catch (error: unknown) {
    return errorResult(error, definition.name);
  }
}

function registerListedTool(
  server: McpServer,
  definition: AnyToolDefinition,
): void {
  server.registerTool(
    definition.name,
    {
      title: definition.title,
      description: definition.description,
      inputSchema: definition.inputSchema,
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
    const definition = byName.get(name);
    if (definition === undefined) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`,
      );
    }
    const args = request.params.arguments ?? {};
    return dispatchToolCall(definition, context, args);
  });
}
