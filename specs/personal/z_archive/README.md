---
title: "Personal Spec Archive"
description: "Archive for your own finished or dropped spec folders on the Media Editor system. Git tracks only this README and .gitkeep."
trigger_phrases:
  - "personal spec archive"
  - "archive my spec folders"
  - "personal z_archive"
---

# Personal Archive

> Move your own spec folders here once you are done with them, so the personal track lists only live work.

---

## 1. OVERVIEW

`z_archive/` holds spec folders from `specs/personal/` that you finished or dropped. The `z_` prefix sorts it last, so the folders you still work on stay at the top of the track.

It works like the archive in the system track, which does the same for the system's own spec folders.

| Archive | Holds | Tracked by git |
| --- | --- | --- |
| `specs/personal/z_archive/` | Your finished or dropped spec folders | ❌ No, only this README and `.gitkeep` |
| `specs/system/z_archive/` | The system's own finished spec folders | ✅ Yes |

---

## 2. USAGE

Move a whole spec folder in when you stop working on it. Keep its number so your track still reads in order. Run this from the system folder:

```bash
mv specs/personal/003-old-idea specs/personal/z_archive/
```

Move it back out the same way if you pick the work up again.

---

## 3. STRUCTURE

```text
z_archive/
├── README.md        this file
├── .gitkeep         keeps the empty folder in the repository
└── 003-old-idea/    an archived spec folder
```

| Path | Tracked by git | Purpose |
| --- | --- | --- |
| `README.md` | ✅ Yes | Explains the archive |
| `.gitkeep` | ✅ Yes | Keeps the empty folder in the repository |
| Any other file or folder | ❌ No | Your archived spec folders, kept on your machine |

---

## 4. VERIFICATION

After you archive a folder, run this from the system folder:

```bash
git status --short specs/personal/
```

Expected output: nothing. A folder listed there would be committed, so check the system's `.gitignore` before you commit.

---

## 5. RELATED RESOURCES

| Resource | What it is |
| --- | --- |
| [`../README.md`](../README.md) | The personal track this archive belongs to |
| [`../../system/z_archive/`](../../system/z_archive/) | The system track's archive |
| [Skilled](https://github.com/MichelKerkmeester/skilled-agent-harness_spec-driven-loops) | The spec-driven agent framework behind both tracks: spec folders, memory, skills and agents |
