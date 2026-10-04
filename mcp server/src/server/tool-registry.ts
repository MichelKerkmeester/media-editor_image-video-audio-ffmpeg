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
import { fileNameField, subfolderField } from './field-schemas.js';
import { withPlacement } from './tool-context.js';

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
   * its own, so it is offered no `fileName` or `subfolder`.
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

function takesPlacement(definition: AnyToolDefinition): boolean {
  return definition.outputPlacement !== false
    && Object.hasOwn(definition.inputSchema, 'outputName');
}

/**
 * The schema a client sees and a call is parsed with. A tool that writes
 * into one folder also takes `fileName` and `subfolder`.
 *
 * @param definition - The tool
 * @returns Its own fields, plus the two placement fields when they apply
 */
export function listedInputSchema(definition: AnyToolDefinition): z.ZodRawShape {
  if (!takesPlacement(definition)) {
    return definition.inputSchema;
  }
  return {
    ...definition.inputSchema,
    fileName: fileNameField,
    subfolder: subfolderField,
  };
}

async function dispatchToolCall(
  definition: AnyToolDefinition,
  context: ToolContext,
  args: unknown,
): Promise<CallToolResult> {
  const parsed = z.object(listedInputSchema(definition)).safeParse(args);
  if (!parsed.success) {
    throw new McpError(
      ErrorCode.InvalidParams,
      invalidArgumentsMessage(definition.name, parsed.error),
    );
  }
  try {
    if (!takesPlacement(definition)) {
      return await definition.handler(parsed.data, context);
    }
    const { fileName, subfolder, ...rest } = parsed.data;
    const placed = withPlacement(context, {
      fileName: typeof fileName === 'string' ? fileName : undefined,
      subfolder: typeof subfolder === 'boolean' ? subfolder : undefined,
    });
    return await definition.handler(rest, placed);
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
