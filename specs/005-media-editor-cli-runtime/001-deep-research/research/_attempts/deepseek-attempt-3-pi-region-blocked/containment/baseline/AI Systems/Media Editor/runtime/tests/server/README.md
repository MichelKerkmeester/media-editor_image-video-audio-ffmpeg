---
title: "tests/server: server layer suites"
description: "Suites for the tool registry, the tool context, the shared media fields and a stdio run of the built server."
trigger_phrases:
  - "registry tests"
  - "stdio server test"
---

# tests/server: server layer suites

---

## 1. OVERVIEW

`tests/server/` checks `src/server/` and the process as a host sees it. Three suites work in memory. `stdio.vitest.ts` runs `npm run build` once, starts `dist/index.js` as a child process and talks to it over stdio.

The stdio suite starts the built server outside vitest's module aliases, so it runs the development ffmpeg in `npm test` and in `npm run test:pinned` alike. Its assertions do not depend on the ffmpeg build.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `registry.vitest.ts` | `registerTools`: listing, duplicate names, unknown tools and bad arguments as protocol errors, handler failures as error results |
| `tool-context.vitest.ts` | `createToolContext`: inputs inside the roots, recorded warnings, numbered folders, one capability read for two calls and cleanup when the binary is missing. `readBack` warnings and skips |
| `media-fields.vitest.ts` | Bitrate, numeric, resolution, aspect ratio, colour and time fields. The JSON schema they publish |
| `stdio.vitest.ts` | The built server over stdio: `tools/list` and `media_health`. Stdout that carries only protocol lines even with a bad setting. Exit when stdin ends |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/server
```

Expected result: `Test Files  4 passed (4)`.

---

## 4. RELATED

- [`../README.md`](../README.md): Suite layout and commands
- [`../../src/server/README.md`](../../src/server/README.md): The layer these suites cover
