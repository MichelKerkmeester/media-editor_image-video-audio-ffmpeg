---
title: "tests/tools/image: image tool suites"
description: "One suite per image tool, plus suites for the shared sharp output layer, output names and write failures."
trigger_phrases:
  - "image tool tests"
  - "sharp output tests"
---

# tests/tools/image: image tool suites

---

## 1. OVERVIEW

`tests/tools/image/` covers the eight tools in `src/tools/image/` and the output layer they share. Inputs are generated with sharp by `generateImage`, and a fixture clip stands in for a file that is not an image.

---

## 2. KEY FILES

| File | What it covers |
|------|----------------|
| `resize.vitest.ts` | `image_resize` |
| `batch-resize.vitest.ts` | `image_batch_resize` |
| `convert.vitest.ts` | `image_convert` |
| `compress.vitest.ts` | `image_compress` |
| `crop.vitest.ts` | `image_crop` |
| `rotate.vitest.ts` | `image_rotate` |
| `flip.vitest.ts` | `image_flip` |
| `probe.vitest.ts` | `image_probe` |
| `sharp-output.vitest.ts` | Content gates, the pixel limit, format mapping, numbered folders and cleanup after a failed plan |
| `output-name.vitest.ts` | Every writing image tool with a plain `outputName` and with each rejected name |
| `write-failure.vitest.ts` | Folder cleanup when the disk refuses a write, and a normal write after it recovers |

---

## 3. VALIDATION

Run from `AI Systems/Media Editor/mcp server/`.

```bash
npx vitest run tests/tools/image
```

Expected result: `Test Files  11 passed (11)`.

---

## 4. RELATED

- [`../README.md`](../README.md): All tool suites
- [`../../../src/tools/image/README.md`](../../../src/tools/image/README.md): The image tools
