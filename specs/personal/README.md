---
title: "Personal Spec Track"
description: "Spec track for your own work on the Media Editor system. Git tracks only this README, the archive README and their .gitkeep files."
trigger_phrases:
  - "personal spec track"
  - "my own spec folders"
  - "personal specs"
---

# Personal

> Your own spec track: plan and record your changes to this system here, kept out of git.

---

## 1. OVERVIEW

`specs/` holds two tracks. `system/` carries the spec folders that build and maintain the Media Editor system itself, and they ship with the repository. `personal/` is yours, for spec folders about your own changes and experiments.

Keeping them apart means your work never mixes with the system's own history, and an update to the system never touches your folders.

| Track | Holds | Tracked by git |
| --- | --- | --- |
| `specs/system/` | The system's own spec folders | ✅ Yes |
| `specs/personal/` | Your spec folders | ❌ No, only the READMEs and `.gitkeep` files |

---

## 2. USAGE

1. Create one numbered folder per piece of work, the same way `system/` does, for example `specs/personal/001-my-first-change/`.
2. Keep the plan and the results for that work inside it.
3. When you finish or drop the work, move its folder into `z_archive/`, so this track lists only live work.

---

## 3. STRUCTURE

```text
specs/personal/
├── README.md              this file
├── .gitkeep               keeps the empty track in the repository
├── z_archive/             your finished or dropped spec folders
│   ├── README.md          explains the archive
│   └── .gitkeep           keeps the empty archive in the repository
└── 001-my-first-change/   one of your spec folders
```

| Path | Tracked by git | Purpose |
| --- | --- | --- |
| `README.md` | ✅ Yes | Explains the track |
| `.gitkeep` | ✅ Yes | Keeps the empty track in the repository |
| `z_archive/README.md` and `z_archive/.gitkeep` | ✅ Yes | Explain and keep the archive folder |
| Any other file or folder | ❌ No | Your spec folders, kept on your machine |

---

## 4. VERIFICATION

Create a spec folder with a file in it, then run this from the system folder:

```bash
git status --short specs/personal/
```

Expected output: nothing. A folder listed there would be committed, so check the system's `.gitignore` before you commit.

---

## 5. RELATED RESOURCES

| Resource | What it is |
| --- | --- |
| [`z_archive/README.md`](./z_archive/README.md) | Where your finished or dropped spec folders go |
| [`../system/`](../system/) | The system's own spec track |
| [Skilled](https://github.com/MichelKerkmeester/skilled-agent-harness_spec-driven-loops) | The spec-driven agent framework behind both tracks: spec folders, memory, skills and agents |
