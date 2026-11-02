### 3.1 Image tool schemas

These eight schemas are the zod contracts behind rows 1 to 8 of the unified table. Section 1.1 fixes the names, section 1.2 fixes the shared parameter names and ranges, section 1.3 fixes the meaning of `quality`, and the tables below add the tool-specific fields. A call that fails its schema is the SDK's `-32602` protocol error (section 5). A call that passes its schema and then fails a handler check returns a tool result with one code from the section 5 list.

Every table reads `parameter | type | required or default | range or enum | unit | notes`, in that order.

Four rules hold for the whole group before the tool tables:

- Each `inputPath` is resolved by the section 4.2 real-path check before sharp opens the file. Every writing tool writes into `<output folder>/NNN - <slug>/` as section 4.3 defines, one fresh folder per call, and never onto an input.
- No image tool runs ffmpeg or ffprobe on a successful path. sharp encodes jpeg, png, webp and avif itself, so image output never depends on an ffmpeg encoder (inventory section F.5, `../context/source-inventory.md:221`).
- A file sharp cannot decode fails with `UNSUPPORTED_FORMAT`, the section 5 code for an image tool given a video.
- `quality` appears only on `image_convert` and `image_compress`. `image_batch_resize` keeps the source's fixed 80, the four transform tools (`image_resize`, `image_crop`, `image_rotate`, `image_flip`) re-encode at sharp defaults, and `image_probe` writes nothing.

The output lines below use `<basename>` for the input's base name without its extension (`imagician/src/index.ts:398`) and `<ext>` for the format written, where `jpeg` writes `.jpg`.

#### `image_resize`

Source: `resize_image` (`imagician/src/index.ts:29`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `width` | integer | optional | 1 to 32768 | pixels | at least one of `width` and `height` is required, enforced by a `.refine()` on the object |
| `height` | integer | optional | 1 to 32768 | pixels | the omitted side keeps the aspect ratio (`skill/references/mcp-imagician.md:107`) |
| `fit` | enum | default `cover` | `cover`, `contain`, `fill`, `inside`, `outside` | none | the source's list, passed to sharp unchanged (`imagician/src/index.ts:40`) |
| `withoutEnlargement` | boolean | default true | true or false | none | replaces the source `preserveAspectRatio`, which toggled upscaling and nothing else (`imagician/src/index.ts:47,216`) |

**Behavior**: `sharp(inputPath).resize({ width, height, fit, withoutEnlargement })`, then `.toFile(target)` (`imagician/src/index.ts:209-217`, `:220`). The source cast `fit as any` (`:215`), allowed a call with neither dimension that wrote an unchanged copy (`:211`), and created whatever directory the caller's `outputPath` implied (`:207`). The schema validates the enum, requires one dimension and drops the caller-chosen output path.

**Output**: one file, `<basename>-resized.<ext>`.

#### `image_convert`

Source: `convert_format` (`imagician/src/index.ts:54`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `format` | enum | required | `jpeg`, `png`, `webp`, `avif`, plus the alias `jpg` that normalizes to `jpeg` | none | the source enum (`imagician/src/index.ts:63`), descriptions list the canonical four only (section 1.5) |
| `quality` | integer | default 80 | 1 to 100 | sharp quality scale, higher is better | the lossy encoders read it as visual quality, png reads it as the palette colour target (`imagician/src/index.ts:242-252`) |

**Behavior**: one encoder call per format, `.jpeg({ quality, progressive: true })`, `.png({ quality })`, `.webp({ quality })` or `.avif({ quality })`, then `.toFile` (`imagician/src/index.ts:242-252`, `:255`). sharp carries webp and avif itself, so no ffmpeg encoder check applies (inventory section F.5).

**Output**: one file, `<basename>-converted.<ext>`, where the extension follows the target format.

#### `image_crop`

Source: `crop_image` (`imagician/src/index.ts:78`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `left` | integer | required | 0 to 32767 | pixels | distance from the left edge, `left + width` must fit the image |
| `top` | integer | required | 0 to 32767 | pixels | distance from the top edge, `top + height` must fit the image |
| `width` | integer | required | 1 to 32768 | pixels | required in the source too (`imagician/src/index.ts:90`) |
| `height` | integer | required | 1 to 32768 | pixels | required in the source too (`imagician/src/index.ts:90`) |

**Behavior**: the handler reads `sharp(inputPath).metadata()` and checks the region against the real image width and height, then runs `sharp(inputPath).extract({ left, top, width, height }).toFile(target)` (`imagician/src/index.ts:272-274`). The source had no bounds check, so an oversized region surfaced from sharp as a generic `Image processing error` (`imagician/src/index.ts:451-459`, inventory section G.12). A region that does not fit now returns `INVALID_INPUT` with `parameter`, `value` and `reason`, the worked example in section 5.

**Output**: one file, `<basename>-cropped.<ext>`.

#### `image_compress`

Source: `compress_image` (`imagician/src/index.ts:94`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `quality` | integer | default 80 | 1 to 100 | sharp quality scale, higher is better | applied with the encoder of the input's own format (`imagician/src/index.ts:295-303`) |
| `progressive` | boolean | default true | true or false | none | JPEG only, the source default (`imagician/src/index.ts:111`) |

**Behavior**: reads `sharp(inputPath).metadata()` (`imagician/src/index.ts:291`), re-encodes with the branch for the detected format (`.jpeg({ quality, progressive })`, `.png({ quality })`, `.webp({ quality })`, `.avif({ quality })`, `:295-303`), writes the file (`:305`), and compares the two byte counts with `fs.stat` (`:307-315`). Only those four input formats are accepted. The source applied no encoder to anything else and still printed a `Size reduction` figure, so the new contract fails earlier with `UNSUPPORTED_FORMAT`, whose `accepted` field names the four. The byte delta is reported as the two byte counts in the structured result of section 7, so a file that grew shows as growth instead of the source's negative percentage (`imagician/src/index.ts:309,315`).

**Output**: one file, `<basename>-compressed.<ext>`. The extension stays that of the input format.

#### `image_rotate`

Source: `rotate_image` (`imagician/src/index.ts:118`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `angle` | number | required | -360 to 360 | degrees, positive clockwise | any angle, not quarter turns only (`imagician/src/index.ts:127`) |
| `background` | string | default `#000000` | `#RRGGBB`, the hex pattern only, either case | none | fills the exposed corners, named colours are rejected (`imagician/src/index.ts:129-133`) |

**Behavior**: `sharp(inputPath).rotate(angle, { background }).toFile(target)` (`imagician/src/index.ts:326-328`). The source accepted any string, named colours included, and passed it to sharp unvalidated (`imagician/src/index.ts:129-133`). The schema accepts the six-digit hex form only, the colour rule of section 1.2.

**Output**: one file, `<basename>-rotated.<ext>`.

#### `image_flip`

Source: `flip_image` (`imagician/src/index.ts:139`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `direction` | enum | required | `horizontal`, `vertical`, `both` | none | the source enum and its required flag (`imagician/src/index.ts:148,152`) |

**Behavior**: `.flop()` when the direction is `horizontal` or `both`, `.flip()` when it is `vertical` or `both`, then `.toFile` (`imagician/src/index.ts:347-354`). An unlisted value applied neither flip and wrote a copy, because the source had no runtime validation. The required enum turns that call into a `-32602` schema failure (section 5).

**Output**: one file, `<basename>-flipped.<ext>`.

#### `image_probe`

Source: `get_image_info` (`imagician/src/index.ts:156`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, no write anywhere (section 4.3) |

**Behavior**: `sharp(inputPath).metadata()` plus `fs.stat` (`imagician/src/index.ts:369-370`), returned as the fields the source dumped (`:376-387`): `format`, `width` (pixels), `height` (pixels), `channels`, `bitDepth`, `colorSpace`, `density` (pixels per inch when the file carries it), `hasAlpha` and `fileSize` (bytes). `lastModified` is dropped, because the source leaked the local file mtime (inventory section G.12), and fields the file does not carry are omitted. This is the image-only sharp path, and `media_probe` stays the ffprobe path for any media kind (section 2).

**Output**: none. A read-only tool creates no output folder (section 4.3). The fields arrive as structured content with the section 7 result shape.

#### `image_batch_resize`

Source: `batch_resize` (`imagician/src/index.ts:167`).

| Parameter | Type | Required or default | Range or enum | Unit | Notes |
|---|---|---|---|---|---|
| `inputPath` | string | required | an absolute path inside an allowed root | path | read only, resolved by real path (section 4.2) |
| `outputName` | string | required | 1 to 64 characters, no path separators | text | a description, never a path, slugged into the folder name (sections 1.4 and 4.3) |
| `sizes` | array of objects | required | 1 to 20 entries | count | one output file per entry (`imagician/src/index.ts:401-432`) |
| `sizes[].width` | integer | required | 1 to 32768 | pixels | required in the source too (`imagician/src/index.ts:183`) |
| `sizes[].height` | integer | optional | 1 to 32768 | pixels | the omitted side keeps the aspect ratio |
| `sizes[].suffix` | string | required | 1 to 16 characters, `^[a-z0-9]([a-z0-9_-]{0,14}[a-z0-9])?$` | text | becomes part of the file name, no two entries may share one |
| `format` | enum | optional, default: the input's own format | `jpeg`, `png`, `webp`, `avif`, plus the alias `jpg` that normalizes to `jpeg` | none | the source enum (`imagician/src/index.ts:189`) |

**Behavior**: for each entry, `sharp(inputPath).resize({ width, height, fit: 'cover', withoutEnlargement: true })` (`imagician/src/index.ts:405-411`), then the format encoder when `format` is given (`.jpeg({ quality: 80, progressive: true })`, `.png()`, `.webp({ quality: 80 })`, `.avif({ quality: 80 })`, `:413-428`), then `.toFile` (`:431`). Quality is fixed at 80 for the lossy encoders, the value the source hardcoded (`:417,423,426`), and no `quality` parameter is exposed, as the source schema carries none. The source pasted the caller's suffix into the file name unvalidated (`:402-403`), so a suffix could introduce a path separator or collide with another entry. The schema restricts the alphabet, forbids dots and separators, forces lowercase, and rejects duplicate suffixes so no entry can overwrite another.

**Output**: one file per entry, `<basename>-<suffix>.<ext>`, all inside the single numbered folder of the call.

#### Shared error codes

Besides the path and config codes that section 4 defines (`CONFIG_MISSING`, `PATH_NOT_ALLOWED`), the eight image tools return these codes from the section 5 list:

| Code | Raised when |
|---|---|
| `INPUT_NOT_FOUND` | the resolved input path is not a readable file |
| `OUTPUT_EXISTS` | the planned output file exists at the pre-write `lstat` check (section 4.3) |
| `INVALID_INPUT` | the crop region does not fit the image, or two size entries share a suffix |
| `UNSUPPORTED_FORMAT` | sharp cannot decode the file as an image, for example a video or an audio file |
| `INTERNAL` | an unmapped sharp error reaches the handler boundary, where the source wrapped every failure into one `McpError` (`imagician/src/index.ts:451-459`) |

#### Source defects closed by these schemas

One line per image-side defect that inventory section G names:

- **`preserveAspectRatio` semantics**: the source wired it to `withoutEnlargement` (`imagician/src/index.ts:216`), so the name now states the real behavior, no upscaling, while the source default is kept.
- **`fit as any` cast**: the untyped cast (`imagician/src/index.ts:215`) becomes a validated enum, so no string reaches sharp.
- **Crop bounds**: the source had none and let sharp throw (`imagician/src/index.ts:272-274`, section G.12). `image_crop` checks the region against the image first and returns `INVALID_INPUT`.
- **Background validation**: the source passed hex or named colours through unvalidated (`imagician/src/index.ts:129-133`). `image_rotate` accepts `#RRGGBB` only (section 1.2).
- **Unlisted enum values**: the source silently wrote a copy for a `direction` outside its enum and for a missing `format` (section G.12). The required enums now fail at the schema layer.
- **Quality range**: declared in the source JSON schema but never enforced (`imagician/src/index.ts:68-69,103-104`). The zod bounds enforce 1 to 100 on every call.
- **Caller-chosen output paths**: every `outputPath` and `outputDir` parameter is replaced by `outputName`, and no image tool creates a caller-named directory (`imagician/src/index.ts:207`, section 4.3).
- **Output equal to input**: no parameter can name an output file, so the `toFile(outputPath)` form that can destroy the source (`imagician/src/index.ts:220`) cannot be expressed (section G.3).
- **Suffix path escape**: a suffix with a separator previously escaped the output directory (`imagician/src/index.ts:402-403`). The schema forbids separators and dots (section G.3).
- **Silent overwrite of generated names**: duplicate suffixes are rejected instead of writing one file over another (section G.5).
- **Metadata leak**: `image_probe` drops the local `lastModified` the source returned (`imagician/src/index.ts:376-387`, section G.12).
- **Resize no-op**: a call with neither dimension is rejected by the `.refine()`, where the source wrote an unchanged copy and reported success (`imagician/src/index.ts:211`).
