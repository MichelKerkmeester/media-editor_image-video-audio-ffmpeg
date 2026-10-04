---
title: "Media Editor - Integrations - Image Operations"
description: "The eight Media Editor image tools with their parameters and defaults, then the FFmpeg and ffprobe commands that run the same operations when the tools are not connected, with format support and quality guidance."
contextType: implementation
importance_tier: important
trigger_phrases:
  - "image tools"
  - "image resize convert compress"
  - "webp avif jpeg png"
  - "image operation commands"
  - "ffmpeg image fallback"
version: 1.7.0.0
---

# Media Editor - Integrations - Image Operations

Technical reference for image processing: the Media Editor image tools first, locally installed FFmpeg and ffprobe when the tools are not connected.

---

## 1. OVERVIEW

### Purpose

Defines how each image operation runs. Section 2 covers the eight image tools, which run on the sharp image library inside the Media Editor server. Sections 5 to 7 cover the FFmpeg commands for the same operations, which run when the tools are not connected or as advice when nothing can run.

### When to use

- Loaded for any image processing operation
- Looking up an image tool's parameters and defaults
- Looking up FFmpeg image commands, format support and quality settings for the fallback route

### Route order

1. **Media Editor tools connected:** call the image tool. The image tools run on sharp and need no ffmpeg, so they work even when `media_health` reports no ffmpeg
2. **No tools, FFmpeg on the path:** run the FFmpeg recipe from Section 5. Check for FFmpeg once per session with `ffmpeg -version`

If neither the tools nor the check answers, give the command as advice with install guidance and run nothing. Say where the result would land.

`references/tools.md` lists every tool with its parameters, the error codes and what to do about each one.

---

## 2. IMAGE TOOLS

Every image tool takes `inputPath`, an absolute path inside a folder the user allowed, and never changes that file. Every tool except `image_probe` also takes `outputName`, a 1 to 64 character description that names the new numbered output folder, and writes its result there.

| Tool | Operation | Key parameters and defaults |
| --- | --- | --- |
| `image_resize` | Resize to a width, a height or both | `width` and `height` 1 to 32768, an omitted side keeps the aspect ratio. `fit` is `cover`, `contain`, `fill`, `inside` or `outside`, default `cover`. `withoutEnlargement` default `true` |
| `image_convert` | Convert to another format | `format` is `jpeg`, `png`, `webp` or `avif`. `quality` 1 to 100, default 80 |
| `image_crop` | Cut one rectangle | `left` and `top` 0 to 32767, `width` and `height` 1 to 32768. The region must fit inside the image |
| `image_compress` | Compress in the image's own format | `quality` 1 to 100, default 80. `progressive` default `true`, JPEG only. Accepts JPEG, PNG, WebP and AVIF |
| `image_rotate` | Rotate by any angle | `angle` -360 to 360, positive is clockwise. `background` `#RRGGBB` fills the corners of a turn that is not a multiple of 90, default `#000000` |
| `image_flip` | Mirror | `direction` is `horizontal`, `vertical` or `both` |
| `image_probe` | Read format, size, channels, bit depth, colour space, density, alpha and byte size | Writes nothing |
| `image_batch_resize` | Resize one image into several sizes | `sizes` holds 1 to 20 entries of `width` with an optional `height`, one file each, all in one folder. `format` optional, the input format is kept when omitted |

Quality is the sharp scale, where higher is better. It is visual quality for JPEG, WebP and AVIF, and the palette colour target for PNG.

---

## 3. CORE CAPABILITIES

- **Resize:** `image_resize`, or `image_batch_resize` for several sizes from one source
- **Convert:** `image_convert`
- **Crop:** `image_crop`
- **Compress:** `image_compress` keeps the format, `image_convert` changes it and sets the quality in the same step
- **Rotate:** `image_rotate`, any angle
- **Flip:** `image_flip`
- **Metadata:** `image_probe`, or `media_probe` for the ffprobe view of the same file
- **Batch:** one tool call per file. `image_batch_resize` covers several sizes of one file, not several files

### Processing order

1. Check the route: the Media Editor tools when connected, otherwise FFmpeg on the path
2. Crop first to remove unwanted areas
3. Resize next
4. Rotate or flip
5. Convert format
6. Compress as the final step

Each tool call writes a new numbered folder, so a chain of operations reads the previous call's output path as its `inputPath`.

---

## 4. FORMAT SUPPORT

**Media Editor tools:**
- Output: JPEG, PNG, WebP and AVIF. The tools carry their own encoders, so no encoder check is needed
- Compress in place: JPEG, PNG, WebP and AVIF. Another input format returns `UNSUPPORTED_FORMAT`, so convert it first
- Input: whatever sharp reads. `image_probe` names the format of a given file

**FFmpeg fallback:**
- **JPEG:** input and output, no transparency, universal support
- **PNG:** input and output, transparency, lossless
- **WebP:** input always. Output only when the build includes a WebP encoder
- **AVIF:** input and output when the build includes an AV1 encoder
- **GIF, BMP and TIFF:** input and output on most builds
- **SVG:** neither input nor output on a plain build

Encoder availability varies by build. On the FFmpeg route an encoder check decides the promise. Do not promise WebP or AVIF output before `ffmpeg -encoders` shows the matching encoder:

```bash
ffmpeg -encoders | grep -E "mjpeg|png|libsvtav1|libwebp"
```

---

## 5. FFMPEG FALLBACK RECIPES

FFmpeg decodes, filters and re-encodes images with the same command shape as video: an input, one option set and an output. Write results to `media files/export/[###] - [description]/` in the runtime.

### Resize

```bash
ffmpeg -i INPUT.jpg -vf scale=1920:-1 OUTPUT.jpg
```

`scale=1920:-1` sets the width and derives the height while preserving the aspect ratio. Use `-2` instead of `-1` when the output encoder needs even dimensions.

### Convert

```bash
ffmpeg -i INPUT.png -q:v 3 OUTPUT.jpg
ffmpeg -i INPUT.png -compression_level 6 OUTPUT.png
ffmpeg -i INPUT.png -c:v libsvtav1 -crf 30 OUTPUT.avif
```

JPEG uses `-q:v` on a scale of 2 to 31 where lower is better. PNG uses `-compression_level` from 0 to 9. AVIF uses an AV1 encoder such as `libsvtav1` with `-crf`.

### Crop

```bash
ffmpeg -i INPUT.jpg -vf "crop=800:600:100:50" OUTPUT.jpg
```

The four values are width, height, x and y.

### Compress

```bash
ffmpeg -i INPUT.jpg -q:v 6 OUTPUT.jpg
```

Combine with `scale` when the use case allows a smaller frame:

```bash
ffmpeg -i INPUT.jpg -vf scale=1600:-1 -q:v 6 OUTPUT.jpg
```

### Rotate and flip

```bash
ffmpeg -i INPUT.jpg -vf "transpose=1" OUTPUT.jpg
ffmpeg -i INPUT.jpg -vf hflip OUTPUT.jpg
```

`transpose=1` rotates 90 degrees clockwise, `transpose=2` counterclockwise, and two passes give 180 degrees. `hflip` mirrors horizontally and `vflip` mirrors vertically.

### Metadata

```bash
ffprobe -v error -show_entries stream=width,height,codec_name,pix_fmt -of default=noprint_wrappers=1 INPUT.jpg
```

### Batch

```bash
mkdir -p "media files/export/001 - resized"
for file in *.jpg; do
  ffmpeg -i "$file" -vf scale=1600:-1 "media files/export/001 - resized/$file"
done
```

### EXIF orientation

FFmpeg reads the EXIF orientation flag and rotates the frame by default. Add `-noautorotate` to switch that off, or apply `transpose` explicitly when the source carries an orientation the target should not inherit.

---

## 6. QUALITY OPTIMIZATION

| Use case | Media Editor tools | FFmpeg | Note |
| --- | --- | --- | --- |
| Archive | PNG, or JPEG at `quality` 95 | JPEG `-q:v 2`, PNG `-compression_level 9` | Largest file, highest fidelity |
| Print and professional | JPEG at `quality` 90 | JPEG `-q:v 2` to `-q:v 4` | High quality |
| Web display | WebP at `quality` 85, AVIF for smaller files | WebP or AVIF when the encoder is present, JPEG `-q:v 5` otherwise | Balance of size and quality |
| Size priority | JPEG or WebP at `quality` 60 to 70 | JPEG `-q:v 8` to `-q:v 12` | Visible loss on close inspection |

Format guidance:
- Photos: JPEG or AVIF. On FFmpeg, JPEG `-q:v 3` to `-q:v 5` and AVIF `-crf 28` to `-crf 32`
- Graphics and screenshots: PNG
- Web: WebP, AVIF for smaller files, JPEG as the universal fallback

---

## 7. RESIZE STRATEGY

**Media Editor tools:** `fit` decides how the image meets a width and a height together.
- `cover` fills both sides and crops the overflow, the default
- `contain` fits inside both sides and pads the rest
- `inside` fits inside both sides without padding, so one side can come out smaller
- `fill` stretches to both sides and ignores the aspect ratio
- `outside` covers both sides without cropping, so one side can come out larger

Set one side only to keep the aspect ratio. `withoutEnlargement` stays `true` unless the user asks to enlarge.

**FFmpeg fallback:**
- Proportional resize: `scale=1920:-1` or `scale=-1:1080`
- Max dimensions: `scale='min(1920,iw)':-1`
- Fit inside a square with padding:

```bash
ffmpeg -i INPUT.jpg -vf "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2" OUTPUT.jpg
```

Common targets:
- Thumbnail: `image_resize` 300 by 300 with `fit` `cover`, or `scale=300:300:force_original_aspect_ratio=increase,crop=300:300`
- Web hero: `image_resize` width 1920, or `scale=1920:-1`
- Instagram square: `image_resize` 1080 by 1080 with `fit` `contain`, or `scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2`
- Vertical story: `image_resize` 1080 by 1920 with `fit` `contain`, or `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2`

---

## 8. LIMITATIONS

- Can do: resize, convert, crop, compress, rotate, flip, metadata and several sizes from one source
- Cannot do: generation, composition, text rendering on images, vector output such as SVG
- One file per tool call. A folder of images is one call per file
- On the FFmpeg route, WebP output needs a WebP encoder and AVIF output needs an AV1 encoder
- Keep enough free disk space for the output before starting a large batch

---

*This reference covers image processing with the Media Editor tools and with installed FFmpeg. For every tool's parameters and error codes, see the Media Editor Tools reference. For the MEDIA thinking method, see the MEDIA Framework. For conversation flow and error handling, see Interactive Intelligence.*
