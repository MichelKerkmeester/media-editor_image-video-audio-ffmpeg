---
title: "tests/packaging: bundle, plugin and pinned-run suites"
description: "Suites for the MCPB manifest, the bundle build helpers, the packed bundles, the plugin build, the pinned test run and the package-root guard."
trigger_phrases:
  - "packaging tests"
  - "bundle contents test"
  - "manifest test"
---

# tests/packaging: bundle, plugin and pinned-run suites

---

## 1. OVERVIEW

`tests/packaging/` checks everything between the compiled server and what a user installs. Most suites test `scripts/` directly with stubs and temp folders. `bundle-contents.vitest.ts` opens the real files in `dist-bundles/` and skips each bundle that has not been built. `build-plugin.vitest.ts` copies the Media Editor skill from `../sk-media-editor/`, so it needs that sibling folder.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `manifest.vitest.ts` | `manifest.json`: schema, author and version, entry point, icon, the tool list against the registry, platforms, the folder settings and their placeholders |
| `targets.vitest.ts` | Build arguments, npm install flags and variables, binary placement, bundle names, per-target manifests and the size limit |
| `artifacts.vitest.ts` | `runStep`, pinned downloads, gzip unpacking, ffprobe-static pruning and sharp's native parts |
| `notices.vitest.ts` | `renderSourceNotice`, the node_modules list and the licence file checks |
| `bundle-contents.vitest.ts` | Each packed bundle: size, top-level entries, its own platform's binaries and sharp packages, pinned digests and licences. On this machine's bundle it also lists tools, resolves ffmpeg and resizes an image |
| `build-plugin.vitest.ts` | Skill copies and link handling, `parsePluginArgs` and `buildPlugin` without a bundle |
| `test-pinned.vitest.ts` | `preparePinnedBinaries` placement, digest and fetch failures. `main` outside the package root. In a pinned run, that the resolved pair is the pinned one |
| `package-root.vitest.ts` | `assertPackageRoot` against every shape a wrong folder takes, a copy of this `package.json` without the source among them, and both build scripts stopping outside the package root |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/packaging
```

Expected result: `Test Files  8 passed (8)`. Build the bundles first with `npm run bundle -- --all` to run the bundle-content checks as well.

---

## 4. RELATED

- [`../README.md`](../README.md): Suite layout and commands
- [`../../scripts/README.md`](../../scripts/README.md): The scripts these suites cover
