---
title: "types: ambient type declarations"
description: "Type declarations for packages that ship no types of their own."
trigger_phrases:
  - "ffprobe-static types"
---

# types: ambient type declarations

---

## 1. OVERVIEW

`src/types/` holds ambient declarations for dependencies that publish no TypeScript types. The compiler picks them up through the `src/**/*.ts` include, and nothing imports them by path.

---

## 2. KEY FILES

| File | Responsibility |
|------|----------------|
| `ffprobe-static.d.ts` | Declares the `ffprobe-static` default export as `{ path: string }`, the shape `core/ffmpeg-resolver.ts` reads |

---

## 3. BOUNDARIES

| Boundary | Rule |
|----------|------|
| Contents | Declarations only. Runtime code belongs in `../core/` |
| Test shims | The pinned test run swaps `ffprobe-static` for `tests/helpers/pinned-ffprobe-static.ts`, which exports the same shape |

---

## 4. VALIDATION

Run from `AI Systems/Media Editor/runtime/`.

```bash
npm run typecheck
```

Expected result: no output and exit 0.

---

## 5. RELATED

- [`../README.md`](../README.md): Source layout
- [`../core/README.md`](../core/README.md): The resolver that uses this declaration
