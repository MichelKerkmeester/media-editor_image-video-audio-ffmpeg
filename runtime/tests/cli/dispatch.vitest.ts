// ───────────────────────────────────────────────────────────────────
// MODULE: Cli Dispatch Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, it } from 'vitest';
import { z } from 'zod';

import {
  dispatchOutcomeErrorResult,
  dispatchTool,
  invalidArgumentsMessage,
  listedInputSchema,
} from '../../src/server/dispatch.js';
import { ERROR_CODES } from '../../src/core/errors.js';
import { PersistentProbeCache } from '../../src/core/probe-cache.js';
import { ALL_TOOLS } from '../../src/server/all-tools.js';
import { createToolContext } from '../../src/server/tool-context.js';
import {
  asRecord,
  callToolAsSent,
  createSandbox,
  withToolClient,
} from '../helpers/tool-client.js';
import { generateImage } from '../helpers/media.js';

import type { ImageContent } from '@modelcontextprotocol/sdk/types.js';
import type { ServerConfig } from '../../src/core/config.js';
import type { AnyToolDefinition } from '../../src/server/tool-registry.js';
import type { PreviewSink, ToolContext } from '../../src/server/tool-context.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const packageRoot = fileURLToPath(new URL('../..', import.meta.url));
const EXPECTED_TOOL_COUNT = 40;

// The cli builds the same name map for its tool commands.
const TOOL_BY_NAME: ReadonlyMap<string, AnyToolDefinition> = new Map(
  ALL_TOOLS.map((definition) => [definition.name, definition]),
);

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

// The cli passes these three dependencies into every tool context it makes.
function cliContext(config: ServerConfig): ToolContext {
  const previewSink: PreviewSink = async (preview: ImageContent): Promise<string> => {
    const directory = path.join(config.dataDir, 'previews');
    mkdirSync(directory, { recursive: true });
    const target = path.join(directory, `preview-${randomUUID()}.jpg`);
    writeFileSync(target, Buffer.from(preview.data, 'base64'));
    return target;
  };
  return createToolContext(config, {
    configWarnings: [],
    previewSink,
    probeCache: new PersistentProbeCache(config.dataDir),
  });
}

// The cli describe command prints this object as the tool inputSchema.
function describedSchema(definition: AnyToolDefinition): Record<string, unknown> {
  return z.toJSONSchema(z.object(listedInputSchema(definition)), {
    target: 'draft-7',
    io: 'input',
  }) as Record<string, unknown>;
}

function propertyNames(schema: Record<string, unknown>): string[] {
  const properties = schema['properties'];
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    return [];
  }
  return Object.keys(properties).sort();
}

function requiredNames(schema: Record<string, unknown>): string[] {
  const required = schema['required'];
  if (!Array.isArray(required)) {
    return [];
  }
  return required.map((entry) => String(entry)).sort();
}

function withoutDraftUri(schema: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...schema };
  delete copy['$schema'];
  return copy;
}

function normalizedBody(body: Record<string, unknown>): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...body, elapsedMs: '<elapsed>' };
  const outputs = copy['outputs'];
  if (Array.isArray(outputs)) {
    copy['outputs'] = outputs.map((output) => (
      typeof output === 'object' && output !== null && !Array.isArray(output)
        ? { ...output, path: '<path>' }
        : output
    ));
  }
  return copy;
}

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('answers an unknown tool with the MCP message', async (): Promise<void> => {
  const sandbox = createSandbox('cli-dispatch-');
  try {
    const context = cliContext(sandbox.config);
    const outcome = await dispatchTool(TOOL_BY_NAME, context, 'no_such_tool', {});
    if (outcome.kind === 'result') {
      throw new Error('expected an error outcome');
    }
    expect(outcome).toEqual({ kind: 'unknown-tool', name: 'no_such_tool' });
    const result = dispatchOutcomeErrorResult(outcome);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      code: ERROR_CODES.INVALID_INPUT,
      message: 'Unknown tool: no_such_tool',
      details: { reason: 'unknown-tool', name: 'no_such_tool' },
    });
    expect(result.content).toEqual([
      {
        type: 'text',
        text: `${ERROR_CODES.INVALID_INPUT}: Unknown tool: no_such_tool`,
      },
    ]);
  } finally {
    sandbox.cleanup();
  }
});

it('answers bad arguments with the field name MCP reports', async (): Promise<void> => {
  const sandbox = createSandbox('cli-dispatch-');
  try {
    const context = cliContext(sandbox.config);
    const outcome = await dispatchTool(TOOL_BY_NAME, context, 'image_convert', {
      inputPath: '/work/input.png',
      outputName: 'converted',
      format: 'bogus',
    });
    if (outcome.kind === 'result' || outcome.kind === 'unknown-tool') {
      throw new Error('expected an invalid-arguments outcome');
    }
    expect(outcome.name).toBe('image_convert');
    expect(outcome.message).toBe('Invalid arguments for tool image_convert: format');
    expect(outcome.issues).toHaveLength(1);
    expect(outcome.issues[0]?.path).toEqual(['format']);
    const result = dispatchOutcomeErrorResult(outcome);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual({
      code: ERROR_CODES.INVALID_INPUT,
      message: 'Invalid arguments for tool image_convert: format',
      details: { reason: 'invalid-arguments', issues: [...outcome.issues] },
    });
  } finally {
    sandbox.cleanup();
  }
});

it('joins several bad fields into one message like MCP does', (): void => {
  const parsed = z
    .object({ alpha: z.string(), beta: z.number() })
    .safeParse({ alpha: 5 });
  if (parsed.success) {
    throw new Error('expected the parse to fail');
  }
  expect(invalidArgumentsMessage('sample_tool', parsed.error)).toBe(
    'Invalid arguments for tool sample_tool: alpha, beta',
  );
});

it('lists the same tools in the same order as MCP', async (): Promise<void> => {
  const sandbox = createSandbox('cli-dispatch-');
  try {
    await withToolClient(sandbox.config, async (client) => {
      const listed = await client.listTools();
      expect(listed.tools).toHaveLength(EXPECTED_TOOL_COUNT);
      expect(listed.tools.map((tool) => tool.name)).toEqual(
        ALL_TOOLS.map((definition) => definition.name),
      );
    });
  } finally {
    sandbox.cleanup();
  }
});

it('describes the same property names MCP publishes for every tool', async (): Promise<void> => {
  const sandbox = createSandbox('cli-dispatch-');
  try {
    await withToolClient(sandbox.config, async (client) => {
      const listed = await client.listTools();
      const byName = new Map(listed.tools.map((tool) => [tool.name, tool]));
      for (const definition of ALL_TOOLS) {
        const published = byName.get(definition.name);
        expect(published, `schema for ${definition.name}`).toBeDefined();
        expect(
          propertyNames(describedSchema(definition)),
          `properties of ${definition.name}`,
        ).toEqual(propertyNames(asRecord(published?.inputSchema)));
      }
    });
  } finally {
    sandbox.cleanup();
  }
});

it(
  'describes the same required list and schema as MCP for every tool',
  async (): Promise<void> => {
    const sandbox = createSandbox('cli-dispatch-');
    try {
      await withToolClient(sandbox.config, async (client) => {
        const listed = await client.listTools();
        const byName = new Map(listed.tools.map((tool) => [tool.name, tool]));
        for (const definition of ALL_TOOLS) {
          const described = describedSchema(definition);
          const published = asRecord(byName.get(definition.name)?.inputSchema);
          expect(
            requiredNames(described),
            `required of ${definition.name}`,
          ).toEqual(requiredNames(published));
          expect(
            withoutDraftUri(described),
            `schema of ${definition.name} minus $schema on both sides`,
          ).toEqual(withoutDraftUri(published));
        }
      });
    } finally {
      sandbox.cleanup();
    }
  },
);

it('returns the same structured body through dispatch as MCP', async (): Promise<void> => {
  const mcpSandbox = createSandbox('cli-dispatch-mcp-');
  const cliSandbox = createSandbox('cli-dispatch-cli-');
  try {
    const source = await generateImage(mcpSandbox.allowedRoot, {
      width: 96,
      height: 96,
      format: 'png',
      fileName: 'input.png',
    });
    const twinSource = path.join(cliSandbox.allowedRoot, 'input.png');
    writeFileSync(twinSource, readFileSync(source));
    let mcpBody: Record<string, unknown> = {};
    await withToolClient(mcpSandbox.config, async (client) => {
      const outcome = await callToolAsSent(client, 'image_convert', {
        inputPath: source,
        outputName: 'compare',
        format: 'jpeg',
        fileName: 'same-name',
        subfolder: true,
      });
      expect(outcome.isError).toBe(false);
      mcpBody = outcome.body;
    });
    const outcome = await dispatchTool(
      TOOL_BY_NAME,
      cliContext(cliSandbox.config),
      'image_convert',
      {
        inputPath: twinSource,
        outputName: 'compare',
        format: 'jpeg',
        fileName: 'same-name',
        subfolder: true,
      },
    );
    if (outcome.kind !== 'result') {
      throw new Error('expected a handler result');
    }
    expect(outcome.result.isError).not.toBe(true);
    expect(normalizedBody(asRecord(outcome.result.structuredContent))).toEqual(
      normalizedBody(mcpBody),
    );
  } finally {
    mcpSandbox.cleanup();
    cliSandbox.cleanup();
  }
});

it('keeps dispatch free of runtime MCP imports', (): void => {
  const source = readFileSync(
    path.join(packageRoot, 'src', 'server', 'dispatch.ts'),
    'utf8',
  );
  const imports = source.match(/import\s[^;]*?@modelcontextprotocol[^;]*;/g) ?? [];
  expect(imports.length).toBeGreaterThan(0);
  for (const statement of imports) {
    expect(statement.startsWith('import type')).toBe(true);
  }
});
