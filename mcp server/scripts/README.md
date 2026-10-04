---
title: "scripts: bundle, plugin and pinned-test builds"
description: "Node scripts that pack the per-platform Desktop extensions, fill the Claude Code plugin and run the suite on the pinned ffmpeg."
trigger_phrases:
  - "build bundle script"
  - "build plugin script"
  - "test pinned script"
---

# scripts: bundle, plugin and pinned-test builds

---

## 1. OVERVIEW

`scripts/` holds the build tooling. None of it ships: `tsconfig.scripts.json` compiles it into `build/tools/`, and each npm script runs the compiled entry from the package root. Every script stops with a `MediaError` and prints what failed. Each one first calls `assertPackageRoot`, which wants this package's `package.json` and `src/index.ts` side by side. A start from any other folder fails with `not-package-root`, including the staged plugin server, which carries a copy of `package.json` and no source.

Current state:

- `build-bundle.ts` writes `dist-bundles/media-editor-<key>.mcpb` and prints one line per bundle with its size and SHA-256.
- `build-plugin.ts` needs the bundle for its target to exist first.
- `test-pinned.ts` fetches nothing when `build/cache/` already holds the pinned archives, and checks every binary it places.

---

## 2. DIRECTORY TREE

```text
scripts/
├── build-bundle.ts   # npm run bundle: stage, install, pin ffmpeg, check, pack, re-read
├── build-plugin.ts   # npm run plugin: unpack one bundle and copy the skill into claude-plugin/
├── test-pinned.ts    # npm run test:pinned: place the pinned pair, run vitest on it
├── package-root.ts   # assertPackageRoot, the guard all three scripts run first
└── bundle/           # Helpers the bundle build shares: artifacts, notices, targets
```

---

## 3. DATA FLOW

`npm run bundle -- --target <key>` runs these steps for each target:

```text
stage dist/, assets/, licenses/ and package files in build/stage/<key>/
  ─▶ write the manifest limited to <key>, check it matches package.json
  ─▶ npm install the production dependencies for <key>
  ─▶ fetch the pinned archives into build/cache/, unpack, check digests
  ─▶ prune unused ffprobe-static binaries, check sharp's native parts
  ─▶ write licence notices and the node_modules list, check them
  ─▶ mcpb validate, mcpb pack, size limit, re-read the packed file
```

A packed file that differs from its pinned build is removed before the script fails.

---

## 4. ENTRYPOINTS

| Command | Script | Purpose |
|---------|--------|---------|
| `npm run bundle -- --target <key>` | `build-bundle.ts` | Packs one Desktop extension. `--all` packs all five |
| `npm run plugin` | `build-plugin.ts` | Unpacks this machine's bundle into `claude-plugin/server/` and replaces `claude-plugin/skills/` with a copy of `../sk-media-editor/` at `claude-plugin/skills/sk-media-editor/`. `-- --target <key>` picks another platform |
| `npm run test:pinned` | `test-pinned.ts` | Places this machine's pinned ffmpeg and ffprobe in `build/pinned/<key>/` and runs vitest with `MEDIA_EDITOR_TEST_BIN_DIR` set. Arguments after `--` go to `vitest run` |

`<key>` is one of `darwin-arm64`, `darwin-x64`, `win32-x64`, `linux-x64` or `linux-arm64`.

---

## 5. BOUNDARIES

| Boundary | Rule |
|----------|------|
| Imports | `../src/core/errors.ts`, `../src/core/pinned-builds.ts` and `../src/core/source-notice.ts`, plus `bundle/` and `package-root.ts` |
| Consumers | npm scripts and `tests/packaging/`. Nothing under `src/` imports a script |
| Network | Only the pinned artifact URLs, each checked against its SHA-256 |

---

## 6. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/packaging
```

Expected result: `Test Files  8 passed (8)`. The bundle-content tests skip when `dist-bundles/` is empty.

---

## 7. RELATED

- [`bundle/README.md`](./bundle/README.md): Shared bundle helpers
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md): Packaging overview
- [`../tests/packaging/README.md`](../tests/packaging/README.md): Packaging tests
- [`../claude-plugin/README.md`](../claude-plugin/README.md): The plugin these scripts fill
