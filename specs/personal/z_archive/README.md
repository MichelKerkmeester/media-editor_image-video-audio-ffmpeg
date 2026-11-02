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

`z_archive/` holds spec folders from `specs/personal/` that are finished, dropped or superseded. The `z_` prefix sorts it last, so the folders you are still working on stay at the top of the track. It mirrors the `z_archive/` in `specs/system/`, which does the same for the system's own spec folders.

---

## 2. USAGE

Move a whole spec folder in when you no longer work on it, for example `specs/personal/003-old-idea/` to `specs/personal/z_archive/003-old-idea/`. Keep its number so the history of your track still reads in order. Move it back out if you pick the work up again.

---

## 3. WHAT STAYS PRIVATE

Archived folders stay on your machine, like everything else in `specs/personal/`. The system's `.gitignore` keeps them out of git.

| Path | Tracked by git |
| --- | --- |
| `specs/personal/z_archive/README.md` | ✅ Yes |
| `specs/personal/z_archive/.gitkeep` | ✅ Yes |
| Any other file or folder in `specs/personal/z_archive/` | ❌ No |
