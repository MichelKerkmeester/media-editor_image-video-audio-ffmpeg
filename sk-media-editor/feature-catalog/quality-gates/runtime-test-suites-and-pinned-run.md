---
title: "Runtime test suites and pinned run"
description: "The Vitest suites cover runtime modules, server dispatch, every tool family, CLI behavior, and package builds, with a separate runner for pinned ffmpeg binaries."
trigger_phrases:
  - "Runtime test suites and pinned run"
  - "runtime test suites and pinned run"
  - "test:pinned"
version: "1.0.0.0"
---

# Runtime test suites and pinned run (test:pinned)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

The Vitest suites cover runtime modules, server dispatch, every tool family, CLI behavior, and package builds, with a separate runner for pinned ffmpeg binaries.

The tool suites use generated media and a local in-memory MCP client. test:pinned places verified platform binaries and runs Vitest with the pinned directory. Package scripts also cover bundle and plugin contents.

---

## 2. HOW IT WORKS

The tool suites use generated media and a local in-memory MCP client. test:pinned places verified platform binaries and runs Vitest with the pinned directory. Package scripts also cover bundle and plugin contents.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/tests/README.md](../../../runtime/tests/README.md) | Reference | Documents suite layout and test commands. |
| [../../../runtime/tests/tools/README.md](../../../runtime/tests/tools/README.md) | Reference | Maps tool suite groups. |
| [../../../runtime/scripts/test-pinned.ts](../../../runtime/scripts/test-pinned.ts) | Script | Places pinned binaries and runs Vitest. |
| [../../../runtime/package.json](../../../runtime/package.json) | Script | Declares test and test:pinned commands. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/core/README.md](../../../runtime/tests/core/README.md) | Reference | Maps shared module tests. |
| [../../../runtime/tests/server/README.md](../../../runtime/tests/server/README.md) | Reference | Maps server tests. |
| [../../../runtime/tests/cli/README.md](../../../runtime/tests/cli/README.md) | Reference | Maps command-line tests. |
| [../../../runtime/tests/packaging/README.md](../../../runtime/tests/packaging/README.md) | Reference | Maps packaging tests. |
| [../../../runtime/tests/tools/image/README.md](../../../runtime/tests/tools/image/README.md) | Reference | Maps image tests. |
| [../../../runtime/tests/tools/audio/README.md](../../../runtime/tests/tools/audio/README.md) | Reference | Maps audio tests. |
| [../../../runtime/tests/tools/video/README.md](../../../runtime/tests/tools/video/README.md) | Reference | Maps video tests. |
| [../../../runtime/tests/tools/composition/README.md](../../../runtime/tests/tools/composition/README.md) | Reference | Maps composition tests. |
| [../../../runtime/tests/tools/media/README.md](../../../runtime/tests/tools/media/README.md) | Reference | Maps media tests. |
| [../../../runtime/tests/fixtures/README.md](../../../runtime/tests/fixtures/README.md) | Reference | Documents fixture clips. |
| [../../../runtime/tests/helpers/README.md](../../../runtime/tests/helpers/README.md) | Reference | Documents test helpers. |

---

## 4. SOURCE METADATA

- Group: Quality Gates
- Canonical catalog source: `feature-catalog.md`
- Feature file path: quality-gates/runtime-test-suites-and-pinned-run.md

Related references:
- [Parity wrappers](parity-wrappers.md) - Neighboring quality gates entry.
