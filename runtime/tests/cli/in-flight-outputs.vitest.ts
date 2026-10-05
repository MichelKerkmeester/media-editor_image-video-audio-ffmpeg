// ───────────────────────────────────────────────────────────────────
// MODULE: In-Flight Output Tracking Tests
// ───────────────────────────────────────────────────────────────────

// ───────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ───────────────────────────────────────────────────────────────────

import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { expect, it } from 'vitest';
import { z } from 'zod';

import { terminateAll } from '../../src/core/process-runner.js';
import { createServer } from '../../src/server/create-server.js';
import { defineTool } from '../../src/server/tool-registry.js';
import { createSandbox } from '../helpers/tool-client.js';

// ───────────────────────────────────────────────────────────────────
// 2. HELPERS
// ───────────────────────────────────────────────────────────────────

interface Gate {
  readonly promise: Promise<void>;
  resolve(): void;
}

function gate(): Gate {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return {
    promise,
    resolve(): void {
      resolve();
    },
  };
}

// ───────────────────────────────────────────────────────────────────
// 3. CORE LOGIC
// ───────────────────────────────────────────────────────────────────

// withToolClient takes no tool list, so this wires the same in-memory
// pair around a definitions option to keep a call in flight on demand.
// The tracking registry stays private, so the observable is shutdown:
// terminateAll removes only paths still registered. The held call's
// folder must go while the finished call's folder must stay.
it('keeps a held call registered after a finished call releases its own', async (): Promise<void> => {
  const sandbox = createSandbox('in-flight-');
  const folders = new Map<string, string>();
  const heldReady = gate();
  const holdRelease = gate();

  const probe = defineTool({
    name: 'test_in_flight',
    title: 'In-flight probe',
    description: 'Allocates a numbered folder and can hold on a test gate.',
    inputSchema: {
      outputName: z.string().min(1),
      hold: z.boolean().optional(),
    },
    handler: async (args, context) => {
      const folder = context.allocateOutputFolder(args.outputName, 'test_in_flight');
      folders.set(args.outputName, folder.folderPath);
      writeFileSync(path.join(folder.folderPath, 'payload.txt'), 'payload');
      if (args.hold === true) {
        heldReady.resolve();
        await holdRelease.promise;
      }
      return {
        content: [{ type: 'text', text: `saved ${folder.folderPath}` }],
      };
    },
  });

  const server = createServer(sandbox.config, { definitions: [probe] });
  const client = new Client({ name: 'in-flight-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    const held = client.callTool({
      name: 'test_in_flight',
      arguments: { outputName: 'held call', hold: true, subfolder: true },
    });
    await heldReady.promise;
    const heldFolder = folders.get('held call');
    expect(heldFolder).toBeDefined();

    const quick = await client.callTool({
      name: 'test_in_flight',
      arguments: { outputName: 'quick call', subfolder: true },
    });
    expect(quick.isError).not.toBe(true);
    const quickFolder = folders.get('quick call');
    expect(quickFolder).toBeDefined();
    expect(existsSync(heldFolder as string)).toBe(true);
    expect(existsSync(quickFolder as string)).toBe(true);

    await terminateAll();
    expect(existsSync(heldFolder as string)).toBe(false);
    expect(existsSync(quickFolder as string)).toBe(true);

    holdRelease.resolve();
    const heldResult = await held;
    expect(heldResult.isError).not.toBe(true);
  } finally {
    await client.close();
    await server.close();
    sandbox.cleanup();
  }
});
