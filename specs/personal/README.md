---
title: "Personal Spec Track"
description: "Spec track for your own work on the Media Editor system. Git tracks only this README and .gitkeep."
trigger_phrases:
  - "personal spec track"
  - "my own spec folders"
  - "personal specs"
---

# Personal

> Your own spec track: plan and record your changes to this system here, kept out of git.

---

## 1. OVERVIEW

`specs/` holds two tracks. `system/` carries the spec folders that build and maintain the Media Editor system itself, and they ship with the repository. `personal/` is yours: use it for spec folders about your own changes, experiments and tweaks to this system.

Keeping them apart means your work never mixes with the system's own history, and an update to the system never touches your folders.

---

## 2. USAGE

Create one numbered folder per piece of work, the same way `system/` does, for example `specs/personal/001-my-first-change/`. Put the plan, notes and results for that work inside it.

When you finish or drop a piece of work, move its folder into `z_archive/`, so this track lists only live work. See [`z_archive/README.md`](./z_archive/README.md).

---

## 3. WHAT STAYS PRIVATE

Everything you add here stays on your machine. The system's `.gitignore` keeps the contents of `specs/personal/` out of git, so your spec folders are never committed or shared with anyone who clones the repository.

| Path | Tracked by git |
| --- | --- |
| `specs/personal/README.md` | ✅ Yes |
| `specs/personal/.gitkeep` | ✅ Yes |
| `specs/personal/z_archive/README.md` and `.gitkeep` | ✅ Yes |
| Any other file or folder in `specs/personal/` | ❌ No |

To confirm, create a folder with a file in it and run `git status` from the system folder. The new folder does not appear in the output.
