# Inventory spot check (T002)

Produced by a read-only MiMo v2.6 Pro dispatch on 2026-09-28, verified by the orchestrator where noted.

Sources: `AI Systems/Media Editor/specs/003-media-editor-extension/context/imagician-main/src/index.ts` and `AI Systems/Media Editor/specs/003-media-editor-extension/context/video-audio-mcp-main/server.py`.

| Citation | Claim | What the source shows at that line | Verdict |
|---|---|---|---|
| `imagician/src/index.ts:16-17` (inv. A:12) | server id `name: 'imagician', version: '0.1.0'` | `name: 'imagician',` / `version: '0.1.0',` | CONFIRMED |
| `index.ts:209-217` (inv. A:16) | `sharp(inputPath).resize({width,height,fit,withoutEnlargement})` | `pipeline = pipeline.resize({ width: …, height: …, fit: fit as any, withoutEnlargement: preserveAspectRatio })` (:212-217) | CONFIRMED (note: `withoutEnlargement` is wired to `preserveAspectRatio`, the semantic bug G.12 cites at `:216`) |
| `index.ts:242-252` (inv. A:17) | `.jpeg({quality,progressive:true})`, `.png/.webp/.avif({quality})` | `pipeline.jpeg({ quality, progressive: true })` (:242), `.png({ quality })` (:245), `.webp({ quality })` (:248), `.avif({ quality })` (:251) | CONFIRMED |
| `index.ts:376-387` (inv. A:22) | JSON dump with format/width/height/channels/bitDepth/colorSpace/density/hasAlpha/fileSize/lastModified | `JSON.stringify({ format: metadata.format, … fileSize: stats.size, lastModified: stats.mtime }, null, 2)` (:376-387) | CONFIRMED (inventory's field list duplicates `density` — source has it once) |
| `index.ts:451-459` (inv. A:16/G:12) | non-McpError wrapped as `McpError(InternalError, "Image processing error: …")` | `throw new McpError(ErrorCode.InternalError, \`Image processing error: ${…}\`)` (:456-458) | CONFIRMED |
| `vam/server.py:10` (inv. B:37) | `mcp = FastMCP("VideoAudioServer")` | `mcp = FastMCP("VideoAudioServer")` | CONFIRMED |
| `server.py:332` (inv. C:79) | `_run_ffmpeg_with_fallback(input_path, output_path, primary_kwargs, fallback_kwargs) -> str` | `def _run_ffmpeg_with_fallback(input_path: str, output_path: str, primary_kwargs: dict, fallback_kwargs: dict) -> str:` | CONFIRMED (fallback/combined-stderr logic at `:334-348` matches) |
| `server.py:1012` (inv. G:2) | concat-list injection `f.write(f"file '{path}'\n")` | `f.write(f"file '{path}'\n")` | CONFIRMED |
| `server.py:1016-1024` (inv. B row 23) | `['ffmpeg','-f','concat','-safe','0','-i',list,'-c','copy','-y',out]` | `subprocess.run(['ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_list_path, '-c', 'copy', '-y', output_video_path], check=True, capture_output=True)` | CONFIRMED |
| `server.py:181,201` (inv. G:9) | "sets `codec_to_use = 'copy'` (`:181,201`)" | `:181` is `codec_to_use = None` — only `:201` is `codec_to_use = 'copy'` | **WRONG** at `:181` (correct line for `'copy'` is `:201` alone; `:181` initializes `None`). Substance CONFIRMED: grep finds only these two assignments, so the var is dead, and the pad run at `:223` (`output(…, vf=vf_filter, acodec='copy')`) always re-encodes video as G.9 says |

## Orchestrator verification (2026-09-28)

Re-read `vam/server.py:181`, `:201` and `:223` directly: `:181` is `codec_to_use = None`, `:201` is `codec_to_use = 'copy'`, and `:223` runs the pad with `acodec='copy'` and no video codec, so the video is re-encoded. The WRONG verdict is correct and only the line citation changes: inventory G.9 should cite `:201` for the `'copy'` assignment. Result: 9 of 10 citations confirmed exactly, 1 confirmed in substance with a corrected line.
