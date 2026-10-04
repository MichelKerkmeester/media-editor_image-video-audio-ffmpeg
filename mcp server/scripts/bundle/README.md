---
title: "bundle: shared bundle build helpers"
description: "Helpers the bundle, plugin and pinned-test scripts share: child process steps, pinned downloads, licence notices and per-target settings."
trigger_phrases:
  - "bundle artifacts"
  - "bundle notices"
  - "bundle targets"
---

# bundle: shared bundle build helpers

---

## 1. OVERVIEW

`scripts/bundle/` holds the pieces of the bundle build that other scripts reuse. It runs child processes, downloads and checks the pinned ffmpeg archives, checks licence notices and turns a platform key into install settings, file names and a manifest.

Current state:

- Every download is checked against the SHA-256 in `../../src/core/pinned-builds.ts`, first the archive and then the binary it unpacks.
- `checkPackedBundle` re-reads a finished `.mcpb` and names each way it differs from its pinned build.
- `BUNDLE_SIZE_LIMIT` is 150,000,000 bytes, and `checkBundleSize` refuses a bundle above it.

---

## 2. KEY FILES

| File | Responsibility |
|------|----------------|
| `artifacts.ts` | `runStep`, `sha256File`, `fetchArtifact`, `extractBinary`, `pruneFfprobeStatic`, `findMissingNatives`, `checkPackedBundle` |
| `notices.ts` | `listNodeModules` and `checkNotices`: the package list and every licence and attribution file a bundle stage must carry |
| `targets.ts` | `parseBuildArgs`, `npmInstallArgs`, `npmInstallEnv`, `binaryDestinations`, `bundleFileName`, `targetManifest`, `checkBundleSize` |

---

## 3. BOUNDARIES

| Boundary | Rule |
|----------|------|
| Imports | `../../src/core/errors.ts` and `../../src/core/pinned-builds.ts`. No import from the scripts above |
| Consumers | `../build-bundle.ts` uses all three modules. `../build-plugin.ts` uses `runStep` and `bundleFileName`. `../test-pinned.ts` uses `fetchArtifact` and `extractBinary` |
| Cache | Archives land in `build/cache/` and are reused while their digest matches |

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/packaging/artifacts.vitest.ts tests/packaging/notices.vitest.ts \
  tests/packaging/targets.vitest.ts
```

Expected result: `Test Files  3 passed (3)`.

---

## 5. RELATED

- [`../README.md`](../README.md): The scripts that use these helpers
- [`../../tests/packaging/README.md`](../../tests/packaging/README.md): Packaging tests
