---
title: "Bundle and plugin build scripts"
description: "Build scripts compile the runtime, create per-platform Desktop extension bundles, fill the Claude Code plugin, and run tests on pinned binaries."
trigger_phrases:
  - "Bundle and plugin build scripts"
  - "bundle and plugin build scripts"
  - "build-bundle.ts"
version: "1.0.0.0"
---

# Bundle and plugin build scripts (build-bundle.ts)

<!-- sk-doc-template: skill_asset_feature_catalog -->

## 1. OVERVIEW

Build scripts compile the runtime, create per-platform Desktop extension bundles, fill the Claude Code plugin, and run tests on pinned binaries.

npm run bundle accepts one platform target or all supported targets. npm run plugin fills the plugin from a built bundle. npm run test:pinned places the machine's pinned binaries and runs Vitest with the pinned binary directory configured.

---

## 2. HOW IT WORKS

npm run bundle accepts one platform target or all supported targets. npm run plugin fills the plugin from a built bundle. npm run test:pinned places the machine's pinned binaries and runs Vitest with the pinned binary directory configured.

---

## 3. SOURCE FILES

### Implementation

| File | Layer | Role |
|---|---|---|
| [../../../runtime/package.json](../../../runtime/package.json) | Script | Defines build, bundle, plugin, and test:pinned commands. |
| [../../../runtime/scripts/build-bundle.ts](../../../runtime/scripts/build-bundle.ts) | Script | Builds Desktop extension bundles. |
| [../../../runtime/scripts/build-plugin.ts](../../../runtime/scripts/build-plugin.ts) | Script | Fills the Claude Code plugin. |
| [../../../runtime/scripts/test-pinned.ts](../../../runtime/scripts/test-pinned.ts) | Script | Runs the suite with verified pinned binaries. |
| [../../../runtime/scripts/package-root.ts](../../../runtime/scripts/package-root.ts) | Shared | Requires scripts to run from the package root. |

### Validation And Tests

| File | Type | Role |
|---|---|---|
| [../../../runtime/tests/packaging/build-plugin.vitest.ts](../../../runtime/tests/packaging/build-plugin.vitest.ts) | Vitest | Covers plugin build behavior. |
| [../../../runtime/tests/packaging/test-pinned.vitest.ts](../../../runtime/tests/packaging/test-pinned.vitest.ts) | Vitest | Covers the pinned test runner. |
| [../../../runtime/scripts/README.md](../../../runtime/scripts/README.md) | Reference | Documents packaging and pinned test commands. |

---

## 4. SOURCE METADATA

- Group: Distribution
- Canonical catalog source: `feature-catalog.md`
- Feature file path: distribution/bundle-and-plugin-build-scripts.md

Related references:
- [Claude Code plugin](claude-code-plugin.md) - Neighboring distribution entry.
