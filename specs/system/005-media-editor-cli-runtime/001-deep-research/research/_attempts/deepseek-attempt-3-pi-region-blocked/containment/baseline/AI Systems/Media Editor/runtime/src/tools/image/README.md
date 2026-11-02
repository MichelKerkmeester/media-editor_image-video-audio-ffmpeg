---
title: "image: sharp image tools"
description: "The eight image tools, which read and write images with sharp, and the shared output module that checks, encodes and names every image they write."
trigger_phrases:
  - "media editor image tools"
  - "sharp output"
---

# image: sharp image tools

---

## 1. OVERVIEW

`src/tools/image/` holds the image tools. They use sharp and never start ffmpeg. `sharp-output.ts` is the shared layer: it checks that a file really is an image, applies the pixel limit, encodes each planned image and writes it into the call's destination: the export root for one file, a new numbered folder for several, unless the caller's `subfolder` says otherwise, or the existing folder the caller names as `targetFolder`.

Current state:

- Accepted input signatures are JPEG, PNG, WebP, GIF, TIFF and AVIF. Anything else fails before sharp decodes it.
- `IMAGE_PIXEL_LIMIT` caps the pixels sharp may decode, so an oversized header cannot exhaust memory.
- Output formats are `jpeg`, `png`, `webp` and `avif`, and `jpg` is accepted as an alias.

---

## 2. KEY FILES

| File | Responsibility |
|------|----------------|
| `sharp-output.ts` | `assertImageContent`, `openImage`, `readImageMetadata`, `writeImageOutputs` and the format helpers every writing tool uses |
| `resize.ts` | `image_resize`: resizes one image to a width, a height or both |
| `batch-resize.ts` | `image_batch_resize`: resizes one image into each listed size, all in one folder |
| `convert.ts` | `image_convert`: converts one image to JPEG, PNG, WebP or AVIF |
| `compress.ts` | `image_compress`: compresses one JPEG, PNG, WebP or AVIF image in its own format |
| `crop.ts` | `image_crop`: crops one rectangular region |
| `rotate.ts` | `image_rotate`: rotates one image by an angle in degrees |
| `flip.ts` | `image_flip`: mirrors one image horizontally, vertically or both ways |
| `probe.ts` | `image_probe`: reads format, pixel size, channels, bit depth, colour space, density, alpha and byte size. Read-only |

---

## 3. BOUNDARIES AND FLOW

| Boundary | Rule |
|----------|------|
| Imports | `../../server/` for `defineTool`, `ToolContext` and `outputNameField`, `../../core/` for paths, folders and results |
| Engine | sharp only. No module here calls `runBinary` |
| Output | Every writing tool goes through `writeImageOutputs`, which names files `<stem>-<operation><extension>` |

```text
resolveInput ─▶ assertImageContent ─▶ openImage (pixel limit)
             ─▶ sharp pipeline ─▶ writeImageOutputs ─▶ successResult
```

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npx vitest run tests/tools/image
```

Expected result: `Test Files  11 passed (11)`.

---

## 5. RELATED

- [`../README.md`](../README.md): All tool groups
- [`../../../tests/tools/image/README.md`](../../../tests/tools/image/README.md): Image tool tests
- [`../../core/README.md`](../../core/README.md): Paths, output folders and results
