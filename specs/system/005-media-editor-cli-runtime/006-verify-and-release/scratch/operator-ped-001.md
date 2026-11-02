# Operator script: live Project test, PED-001

This runs the Project side of the batch fix in Claude Desktop. It cannot run headless. Record what you see after each step.

## 1. Upload the Project files

Open the Media Editor Project on claude.ai and replace these eight files with the copies in `AI Systems/Media Editor/claude project/`:

1. `Custom Instructions.md`, pasted into the Project instructions (kernel v1.1.0)
2. `knowledge/Media Editor - Integrations - Image Operations.md`
3. `knowledge/Media Editor - Integrations - Video And Audio Operations.md`
4. `knowledge/Media Editor - Reference - HLS Video Conversion.md`
5. `knowledge/Media Editor - Reference - Media Editor Tools.md`
6. `knowledge/Media Editor - Reference - Setup.md`
7. `knowledge/Media Editor - System - Interactive Intelligence.md`
8. `knowledge/Media Editor - Thinking - MEDIA Framework.md`

Replace each Knowledge file under the same name. Remove nothing else.

## 2. Install the extension

1. In Claude Desktop, open **Settings > Extensions > Advanced settings**, click **Install Extension…** and choose `media-editor-darwin-arm64.mcpb`, downloaded from the `v1.1.0.0` release at https://github.com/MichelKerkmeester/media-editor_image-video-audio-ffmpeg/releases/tag/v1.1.0.0, version 1.1.0, SHA-256 `7fd0a1205db113f53379b60398d7809d55513c3358d78713ccd7516958b9e327`. Check it with `shasum -a 256` before installing. Replace any earlier Media Editor extension
2. Make a new empty folder, for example `~/Desktop/ped-001`, with `media files/import/` inside it. Copy the four PNGs from `AI Systems/Media Editor/media files/import/` into it
3. Under **Folders Media Editor may open**, add `~/Desktop/ped-001`. Set **Output folder** to `~/Desktop/ped-001/media files/export`. Leave no empty row. Save
4. Note what `media files/export/` holds now. It should be empty or missing

## 3. Turn 1

1. Open the Media Editor Project in Claude Desktop and start a new chat. Under **+ > Connectors**, switch Media Editor on
2. Send exactly: `Convert the four PNGs in media files/import to WebP, each under 100 KB: CleanShot 2026-10-03 at 16.46.54.png, CleanShot 2026-10-03 at 16.50.26.png, CleanShot 2026-10-03 at 16.50.29.png and CleanShot 2026-10-03 at 16.51.35.png.`

The prompt names the four files you copied, because the extension cannot list a folder. The playbook's own fixtures carry other names, so this differs from the scenario's exact prompt on the file names only. Its tools take absolute paths, and the Project builds each one from the allowed folder and the name you give.
3. Check the reply and the folder

PASS for Turn 1 needs all of these:
- The reply asks ONE question
- That question proposes a readable name for each of the four files, two to five lowercase words joined by hyphens, from what each picture shows
- The same question offers the choice between one numbered folder and the export root
- No `image_convert` call ran, and `media files/export/` is unchanged

Calls to `media_health` and `image_probe` with `preview: true` are allowed.

## 4. Turn 2

1. Send exactly: `One folder, and those names are fine.`
2. Expand the tool calls in the reply and list `media files/export/` with file sizes

PASS for Turn 2 needs all of these:
- Four `image_convert` calls with `format` `webp` and `maxBytes` `100000`
- The first call passes `subfolder: true` and an `outputName`. The other three pass the returned folder name, such as `001 - webp-under-100kb`, as `targetFolder`
- Each call passes its own confirmed name as `fileName`
- Exactly one new numbered folder holds all four `.webp` files under the confirmed names, each at most 100,000 bytes
- Nothing new sits in the export root, and no second numbered folder appeared
- The reply names that folder path first

## 5. Verdict

The test PASSES only when both turns pass. It FAILS on a write before your answer, no question or more than one, a file outside the folder, a second numbered folder or a generic file name such as `CleanShot…webp`. Do not retry a failed run to get a pass. Report it as it happened.

Send back: both replies, a screenshot of the expanded tool calls, the folder listing with sizes and your PASS or FAIL for each turn.
