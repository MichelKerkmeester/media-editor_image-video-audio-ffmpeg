---
title: "core: shared policies and helpers"
description: "The policies every tool shares: configuration, path guard, output folders, process runner, ffmpeg resolution, capabilities, probing, filter escaping, results and pinned builds."
trigger_phrases:
  - "media editor core"
  - "path guard"
  - "process runner"
  - "ffmpeg resolver"
---

# core: shared policies and helpers

---

## 1. OVERVIEW

`src/core/` holds the rules and helpers that no single tool owns. Security and safety policy lives here: which paths a tool may open, how a child process starts, where output goes and which ffmpeg runs. A tool reaches most of it through `ToolContext`, and imports the pure helpers directly.

Current state:

- Every failure a tool reports is a `MediaError` with a code from `ERROR_CODES`.
- The runner starts at most `MAX_CONCURRENT_PROCESSES` (two) children at once, never through a shell.
- The resolver and the capability reader cache per binary path, and `runBinary` drops both caches when a spawn fails.

---

## 2. KEY FILES

| File | Responsibility |
|------|----------------|
| `config.ts` | `loadConfig`: arguments and `MEDIA_EDITOR_*` variables into a `ServerConfig`, with warnings that never repeat a value |
| `errors.ts` | `ERROR_CODES`, `MediaError`, `isMediaError`, `toMediaError` and `nodeErrorCode`, which reads the code of a Node.js system error |
| `logger.ts` | `writeLog` and `shouldLog`: one line per message on stderr, filtered by level |
| `path-guard.ts` | `resolveInputPath`, `verifyUnchanged`, `assertOutputNotOnInput`: inputs must be regular files inside an allowed root |
| `output-folder.ts` | `allocateOutputFolder`, `resolveTargetFolder`, `useOutputRoot`, `writeExclusive`, `writeUnderFreeName`, `outputFileName`, `placedFileName`, `readableFileName`: the export root or numbered `NNN - <slug>` folders, an existing numbered folder named by `targetFolder`, `-2` names for a taken name in the root or a targeted folder and names within 120 UTF-8 bytes |
| `process-runner.ts` | `runProcess`, `withTempDir`, `buildChildEnv`, `sanitizeStderr`: argv-only spawns, allowlisted environment, C locale, timeout, stderr tail. `terminateAll` and `registerCleanupPath` let a signal stop live children and remove temp folders and half-written output |
| `probe-cache.ts` | `PersistentProbeCache`: binary lookups and encoder and filter lists kept as JSON in `<data folder>/cache/`, keyed by path, size, modification time and version, written atomically and advisory, so a bad cache only costs a fresh probe |
| `ffmpeg-resolver.ts` | `resolveBinary`, `lookupBinary`: override, bundled, `PATH`, then installed, each checked with `-version` |
| `capabilities.ts` | `detectCapabilities`, `assertCapabilities`, `TOOL_NAMES`, `TOOL_REQUIREMENTS`: encoder and filter checks per tool |
| `media-properties.ts` | `probeMedia`, `probeIntermediate`, `probeIntermediateCodecs`, `requireVideoStream`, `requireAudioStream`: ffprobe JSON into typed stream data |
| `media-containers.ts` | Container and encoder tables, alias normalizers and the MP4 portability policy |
| `result.ts` | `successResult`, `errorResult`, `describeOutput`: the result shape every tool returns |
| `filter-escape.ts` | `escapeFilterValue`, `quoteFilterValue`, `filterSafePath`, `filterSafeSubtitle`, `filterSafeFontDir`: safe values and paths for filter graphs |
| `font-path.ts` | `bundledFontPath`, `assertBundledFont`: the font in `assets/fonts/` every text filter uses |
| `overlay-position.ts` | `normalizePosition`, `positionXY`: the nine grid anchors and the b-roll full-frame anchor |
| `time-parse.ts` | `parseTimeToSeconds`, `requireSeconds`, `formatSeconds`: caller times into seconds |
| `concat-list.ts` | `writeConcatList`: the concat demuxer list inside a run's temp folder |
| `hls-folders.ts` | `createRungFolders`, `countSegments`, `folderTotals`: HLS rung folders and their totals |
| `pinned-builds.ts` | `PINNED_BUILDS`, `platformKeyOf`, `executableFileName`: the frozen table of pinned ffmpeg builds per platform |
| `artifact-download.ts` | `downloadArtifact`, `unpackArtifact`, `sha256OfFile`, `removeQuietly`: digest-checked download and extraction |
| `zip-entry.ts` | `listZipEntries`, `readSingleZipEntry`: reads the one entry of a pinned zip archive |
| `source-notice.ts` | `renderSourceNotice`: the provenance and licence notice written beside a pinned build |

---

## 3. BOUNDARIES

| Boundary | Rule |
|----------|------|
| Imports | Node built-ins, the SDK types and sibling core modules. Only the resolver imports `ffmpeg-static` and `ffprobe-static`. The one `../server/` import is `import type` |
| Consumers | `../server/`, every tool group and `../../scripts/`, which uses `errors.ts`, `pinned-builds.ts` and `source-notice.ts` |
| Ownership | A rule that more than one tool needs lives here. A rule for one tool stays in that tool's module |

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/core
```

Expected result: `Test Files  20 passed (20)`.

---

## 5. RELATED

- [`../README.md`](../README.md): Source layout
- [`../server/README.md`](../server/README.md): How `ToolContext` exposes these services
- [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md): Runtime subsystems in detail
- [`../../tests/core/README.md`](../../tests/core/README.md): Core tests
