---
title: "tests/core: core module suites"
description: "One vitest suite per src/core module, covering configuration, paths, processes, ffmpeg resolution, probing, filters, output folders, results and pinned downloads."
trigger_phrases:
  - "core tests"
  - "path guard tests"
  - "process runner tests"
---

# tests/core: core module suites

---

## 1. OVERVIEW

`tests/core/` holds one suite per module in `src/core/`, named after it. Most suites test pure functions with tables of inputs. The resolver, runner, capability and probing suites also run real ffmpeg or ffprobe, or a stub the suite builds on purpose. `source-notice.ts` has no suite here, because `tests/packaging/notices.vitest.ts` covers it.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `config.vitest.ts` | `loadConfig` arguments, variables, fallbacks and warnings. `defaultDataDir` per platform |
| `errors.vitest.ts` | `MediaError`, `isMediaError` and `toMediaError` |
| `logger.vitest.ts` | Level filtering and the one-line stderr format |
| `path-guard.vitest.ts` | Root checks, UNC paths, path strings, symlinks, `verifyUnchanged` and output-on-input refusals |
| `output-folder.vitest.ts` | Slugs, numbered folders, exclusive writes, UTF-8 cuts, file names and `resolveTargetFolder` containment |
| `process-runner.vitest.ts` | Child environment, runner flags, stderr sanitizing, content gates, temp folders and `runProcess` limits |
| `ffmpeg-resolver.vitest.ts` | The four lookup steps, rejected overrides, caching and pinned binary digests |
| `capabilities.vitest.ts` | Encoder and filter list parsing, detection, `TOOL_NAMES`, `TOOL_REQUIREMENTS` and `assertCapabilities` |
| `media-properties.vitest.ts` | ffprobe JSON parsing, `probeMedia`, intermediate probes and stream requirements |
| `media-containers.vitest.ts` | Container tables, aliases, probed audio containers and the MP4 portability rule |
| `filter-escape.vitest.ts` | Escaping, quoting and a drawtext round trip that every filter graph must hold |
| `font-path.vitest.ts` | The bundled font path and a render with it |
| `overlay-position.vitest.ts` | Grid anchors, aliases and x and y expressions |
| `time-parse.vitest.ts` | Time strings into seconds and back |
| `concat-list.vitest.ts` | The concat demuxer list text and file |
| `hls-folders.vitest.ts` | Rung folders, segment counts and folder totals |
| `result.vitest.ts` | Success and error result shapes and probe read-back |
| `pinned-builds.vitest.ts` | The pinned table, platform keys and executable names |
| `artifact-download.vitest.ts` | Digest-checked downloads, unpacking and cleanup of failed steps |
| `zip-entry.vitest.ts` | Zip central directory reads and single-entry extraction |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/core
```

Expected result: `Test Files  20 passed (20)`. Cases that depend on the platform or the file system, such as Windows drive paths, case sensitivity and folder locking, skip where they cannot run.

---

## 4. RELATED

- [`../README.md`](../README.md): Suite layout and commands
- [`../../src/core/README.md`](../../src/core/README.md): The modules these suites cover
