// ───────────────────────────────────────────────────────────────────
// MODULE: Registry Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ERROR_CODES, MediaError } from '../../src/core/errors.js';
import { ALL_TOOLS } from '../../src/server/all-tools.js';
import { createServer } from '../../src/server/create-server.js';
import { readServerVersion } from '../../src/server/server-info.js';
import { createToolContext } from '../../src/server/tool-context.js';
import {
  defineTool,
  registerTools,
} from '../../src/server/tool-registry.js';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ServerConfig } from '../../src/core/config.js';
import type { ToolContext } from '../../src/server/tool-context.js';
import type { AnyToolDefinition } from '../../src/server/tool-registry.js';

// ───────────────────────────────────────────────────────────────────
// 2. CONSTANTS
// ───────────────────────────────────────────────────────────────────

const CONFIG: ServerConfig = {
  allowedRoots: [],
  outputDir: undefined,
  ffmpegPath: undefined,
  ffprobePath: undefined,
  timeoutSeconds: 30,
  dataDir: '/tmp/media-editor-registry',
  logLevel: 'error',
};

const CONTEXT: ToolContext = createToolContext(CONFIG);

const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

// ───────────────────────────────────────────────────────────────────
// 3. HELPERS
// ───────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function echoTool(
  handler: (
    args: { text: string; times?: number },
    context: ToolContext,
  ) => Promise<CallToolResult> = async (args) => ({
    content: [{ type: 'text', text: args.text.repeat(args.times ?? 1) }],
    structuredContent: { text: args.text, times: args.times ?? 1 },
  }),
): AnyToolDefinition {
  return defineTool({
    name: 'echo',
    title: 'Echo',
    description: 'Repeats the text it was given.',
    inputSchema: {
      text: z.string(),
      times: z.number().int().min(1).optional(),
    },
    handler,
  });
}

function boomTool(): AnyToolDefinition {
  return defineTool({
    name: 'boom',
    title: 'Boom',
    description: 'Always fails.',
    inputSchema: {},
    handler: async () => {
      throw new Error('boom');
    },
  });
}

function missingTool(): AnyToolDefinition {
  return defineTool({
    name: 'missing',
    title: 'Missing',
    description: 'Reports a missing input.',
    inputSchema: {},
    handler: async () => {
      throw new MediaError(
        ERROR_CODES.INPUT_NOT_FOUND,
        'Input file not found.',
      );
    },
  });
}

async function withClient(
  definitions: readonly AnyToolDefinition[],
  run: (client: Client) => Promise<void>,
): Promise<void> {
  const server = createServer(CONFIG, { definitions, context: CONTEXT });
  const client = new Client({ name: 'registry-test', version: '0.0.0' });
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

// ───────────────────────────────────────────────────────────────────
// 4. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

it('reads the version from package.json', (): void => {
  const loaded: unknown = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  expect(isRecord(loaded) && typeof loaded.version === 'string').toBe(true);
  if (!isRecord(loaded) || typeof loaded.version !== 'string') {
    return;
  }
  expect(readServerVersion()).toBe(loaded.version);
});

it('rejects a duplicate tool name at registration', (): void => {
  const server = new McpServer({ name: 'media-editor', version: '0.0.0' });
  const echo = echoTool();
  expect(() => {
    registerTools(server, [echo, echo], CONTEXT);
  }).toThrow(Error);
});

it('lists the registered names and requires text on echo', async (): Promise<void> => {
  await withClient([echoTool(), boomTool()], async (client) => {
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual(['echo', 'boom']);
    const echo = listed.tools[0];
    expect(echo?.inputSchema.required).toEqual(['text']);
  });
});

it('returns the echo handler result unchanged', async (): Promise<void> => {
  await withClient([echoTool()], async (client) => {
    const result = await client.callTool({
      name: 'echo',
      arguments: { text: 'ab', times: 2 },
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'abab' }],
      structuredContent: { text: 'ab', times: 2 },
    });
  });
});

it('maps an ordinary throw to INTERNAL for that tool', async (): Promise<void> => {
  await withClient([boomTool()], async (client) => {
    const result = await client.callTool({ name: 'boom', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      code: 'INTERNAL',
      details: { tool: 'boom' },
    });
  });
});

it('keeps a MediaError code', async (): Promise<void> => {
  await withClient([missingTool()], async (client) => {
    const result = await client.callTool({ name: 'missing', arguments: {} });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      code: 'INPUT_NOT_FOUND',
    });
  });
});

it('rejects an unknown tool name', async (): Promise<void> => {
  await withClient([echoTool()], async (client) => {
    await expect(client.callTool({
      name: 'absent',
      arguments: {},
    })).rejects.toMatchObject({ code: METHOD_NOT_FOUND });
  });
});

it('rejects a wrong-typed argument before the handler', async (): Promise<void> => {
  const spy = vi.fn(async () => ({
    content: [{ type: 'text' as const, text: 'ok' }],
  }));
  await withClient([echoTool(spy)], async (client) => {
    await expect(client.callTool({
      name: 'echo',
      arguments: { text: 5 },
    })).rejects.toMatchObject({ code: INVALID_PARAMS });
    expect(spy).not.toHaveBeenCalled();
  });
});

it('rejects a missing required field before the handler', async (): Promise<void> => {
  const spy = vi.fn(async () => ({
    content: [{ type: 'text' as const, text: 'ok' }],
  }));
  await withClient([echoTool(spy)], async (client) => {
    await expect(client.callTool({
      name: 'echo',
      arguments: {},
    })).rejects.toMatchObject({ code: INVALID_PARAMS });
    expect(spy).not.toHaveBeenCalled();
  });
});

it('builds a server from an empty definition list', async (): Promise<void> => {
  const server = createServer(CONFIG, { definitions: [] });
  const client = new Client({ name: 'registry-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  await client.close();
  await server.close();
});

it('lists exactly the tools in ALL_TOOLS by default', async (): Promise<void> => {
  const server = createServer(CONFIG);
  const client = new Client({ name: 'registry-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual(
      ALL_TOOLS.map((tool) => tool.name),
    );
  } finally {
    await client.close();
    await server.close();
  }
});

it('lists the registered tools in contract row order', async (): Promise<void> => {
  const server = createServer(CONFIG);
  const client = new Client({ name: 'registry-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual([
      'media_health',
      'image_resize',
      'image_convert',
      'image_crop',
      'image_compress',
      'image_rotate',
      'image_flip',
      'image_probe',
      'image_batch_resize',
      'audio_extract',
      'video_trim',
      'audio_convert_properties',
      'video_convert_properties',
      'video_set_aspect_ratio',
      'audio_convert',
      'audio_set_bitrate',
      'audio_set_sample_rate',
      'audio_set_channels',
      'video_convert',
      'video_set_resolution',
      'video_set_codec',
      'video_set_bitrate',
      'video_set_frame_rate',
      'video_set_audio_codec',
      'video_set_audio_bitrate',
      'video_set_audio_sample_rate',
      'video_set_audio_channels',
      'video_add_subtitles',
      'video_add_text_overlay',
      'video_add_image_overlay',
      'video_concat',
      'video_set_speed',
      'media_remove_silence',
      'video_add_b_roll',
      'video_add_fade',
      'media_probe',
      'media_rename',
      'media_repair',
      'video_hls_ladder',
      'media_setup_ffmpeg',
    ]);
    expect(listed.tools).toHaveLength(40);
    const readOnly = listed.tools
      .filter((tool) => tool.annotations?.readOnlyHint === true)
      .map((tool) => tool.name);
    expect(readOnly).toEqual(['media_health', 'image_probe', 'media_probe']);
  } finally {
    await client.close();
    await server.close();
  }
});

it('serves definitions passed to createServer', async (): Promise<void> => {
  const server = createServer(CONFIG, { definitions: [echoTool(), boomTool()] });
  const client = new Client({ name: 'registry-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual(['echo', 'boom']);
    const result = await client.callTool({
      name: 'echo',
      arguments: { text: 'z' },
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'z' }],
      structuredContent: { text: 'z', times: 1 },
    });
  } finally {
    await client.close();
    await server.close();
  }
});
