// ───────────────────────────────────────────────────────────────────
// MODULE: Tool Dispatch
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../core/errors.js';
import { errorResult } from '../core/result.js';
import {
  fileNameField,
  subfolderField,
  targetFolderField,
} from './field-schemas.js';
import { withPlacement } from './tool-context.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { AnyToolDefinition } from './tool-registry.js';
import type { ToolContext } from './tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. TYPE DEFINITIONS
// ───────────────────────────────────────────────────────────────────

/** Outcome of looking up, validating, and calling one tool. */
export type DispatchOutcome =
  | { readonly kind: 'result'; readonly result: CallToolResult }
  | { readonly kind: 'unknown-tool'; readonly name: string }
  | {
      readonly kind: 'invalid-arguments';
      readonly name: string;
      readonly message: string;
      readonly issues: readonly z.ZodIssue[];
    };

/** A dispatch outcome that has no handler result. */
export type DispatchErrorOutcome = Extract<
  DispatchOutcome,
  { readonly kind: 'unknown-tool' | 'invalid-arguments' }
>;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

/** Build the stable argument error text used by MCP and the CLI. */
export function invalidArgumentsMessage(
  toolName: string,
  error: z.ZodError,
): string {
  const labels: string[] = [];
  for (const issue of error.issues) {
    const issuePath = issue.path.map((part) => String(part)).join('.');
    if (issuePath.length > 0 && !labels.includes(issuePath)) {
      labels.push(issuePath);
    }
  }
  if (labels.length === 0) {
    return `Invalid arguments for tool ${toolName}.`;
  }
  return `Invalid arguments for tool ${toolName}: ${labels.join(', ')}`;
}

/** Whether a tool accepts the shared output placement fields. */
export function takesPlacement(definition: AnyToolDefinition): boolean {
  return definition.outputPlacement !== false
    && Object.hasOwn(definition.inputSchema, 'outputName');
}

/**
 * The schema a client sees and a call is parsed with. A tool that writes
 * into one folder also takes `fileName`, `subfolder` and `targetFolder`.
 *
 * @param definition - The tool
 * @returns Its own fields, plus the three placement fields when they apply
 */
export function listedInputSchema(definition: AnyToolDefinition): z.ZodRawShape {
  if (!takesPlacement(definition)) {
    return definition.inputSchema;
  }
  return {
    ...definition.inputSchema,
    fileName: fileNameField,
    subfolder: subfolderField,
    targetFolder: targetFolderField,
  };
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

/**
 * Dispatch one tool call without depending on an MCP transport value.
 *
 * @param definitions - Tool map keyed by the public tool name
 * @param context - Services passed to the selected handler
 * @param name - Requested tool name
 * @param args - Arguments to validate against the listed schema
 * @returns A handler result, unknown tool, or invalid arguments outcome
 */
export async function dispatchTool(
  definitions: ReadonlyMap<string, AnyToolDefinition>,
  context: ToolContext,
  name: string,
  args: unknown,
): Promise<DispatchOutcome> {
  const definition = definitions.get(name);
  if (definition === undefined) {
    return { kind: 'unknown-tool', name };
  }

  const parsed = z.object(listedInputSchema(definition)).safeParse(args);
  if (!parsed.success) {
    return {
      kind: 'invalid-arguments',
      name: definition.name,
      message: invalidArgumentsMessage(definition.name, parsed.error),
      issues: parsed.error.issues,
    };
  }

  const dispatchContext = context.createDispatchContext?.(context) ?? context;
  try {
    if (!takesPlacement(definition)) {
      return {
        kind: 'result',
        result: await definition.handler(parsed.data, dispatchContext),
      };
    }

    const { fileName, subfolder, targetFolder, ...rest } = parsed.data;
    if (typeof targetFolder === 'string' && subfolder === false) {
      throw new MediaError(
        ERROR_CODES.INVALID_INPUT,
        'targetFolder names an existing folder, so it cannot be combined with subfolder false.',
        {
          parameter: 'targetFolder',
          reason: 'target-folder-with-subfolder-false',
        },
      );
    }
    const placed = withPlacement(dispatchContext, {
      fileName: typeof fileName === 'string' ? fileName : undefined,
      subfolder: typeof subfolder === 'boolean' ? subfolder : undefined,
      targetFolder: typeof targetFolder === 'string' ? targetFolder : undefined,
    });
    return {
      kind: 'result',
      result: await definition.handler(rest, placed),
    };
  } catch (error: unknown) {
    return {
      kind: 'result',
      result: errorResult(error, definition.name),
    };
  } finally {
    dispatchContext.releaseInFlightOutputs?.();
  }
}

/**
 * Turn an unknown-tool or invalid-arguments outcome into a tool-shaped error.
 *
 * @param outcome - Dispatch failure without a handler result
 * @returns Error result suitable for a CLI JSON response
 */
export function dispatchOutcomeErrorResult(
  outcome: DispatchErrorOutcome,
): CallToolResult {
  const message = outcome.kind === 'unknown-tool'
    ? `Unknown tool: ${outcome.name}`
    : outcome.message;
  const details = outcome.kind === 'unknown-tool'
    ? { reason: 'unknown-tool', name: outcome.name }
    : { reason: 'invalid-arguments', issues: [...outcome.issues] };
  return {
    isError: true,
    content: [{ type: 'text', text: `${ERROR_CODES.INVALID_INPUT}: ${message}` }],
    structuredContent: {
      code: ERROR_CODES.INVALID_INPUT,
      message,
      details,
    },
  };
}
