---
title: "Persistent probe cache"
description: "Probe results are cached under the configured data folder and reused only when the binary identity still matches."
trigger_phrases:
  - "Persistent probe cache"
  - "persistent probe cache"
  - "PersistentProbeCache"
version: "1.0.0.0"
---

# Persistent probe cache (PersistentProbeCache)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Probe results are cached under the configured data folder and reused only when the binary identity still matches.

The cache stores entries in probes.json and writes updates atomically. Its identity includes the resolved probe binary path, binary version, and the binary file's size and modification time. Media probes of input files are not cached. Concurrent requests for the same probe share in-flight work.

---

## 2. HOW IT WORKS

The cache stores entries in probes.json and writes updates atomically. Its identity includes the resolved probe binary path, binary version, and the binary file's size and modification time. Media probes of input files are not cached. Concurrent requests for the same probe share in-flight work.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/src/core/probe-cache.ts](../../../runtime/src/core/probe-cache.ts) | Shared | Implements persistent cache identity, storage, and in-flight sharing. |
| [../../../runtime/src/core/media-properties.ts](../../../runtime/src/core/media-properties.ts) | Shared | Uses probe cache for media property reads. |
| [../../../runtime/src/server/tool-context.ts](../../../runtime/src/server/tool-context.ts) | Shared | Owns the cache instance for tool calls. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/core/probe-cache.vitest.ts](../../../runtime/tests/core/probe-cache.vitest.ts) | Vitest | Covers cache keys, invalidation, persistence, and shared in-flight reads. |
| [../../../runtime/tests/core/media-properties.vitest.ts](../../../runtime/tests/core/media-properties.vitest.ts) | Vitest | Covers media probing through the cache. |

---

## 4. SOURCE METADATA

- Group: Shared Tool Behavior
- Canonical catalog source: `feature-catalog.md`
- Feature file path: shared-tool-behavior/persistent-probe-cache.md

Related references:
- [Error codes and result shape](error-codes-and-result-shape.md) - Neighboring shared tool behavior entry.
- [Preview image](preview-image.md) - Neighboring shared tool behavior entry.
