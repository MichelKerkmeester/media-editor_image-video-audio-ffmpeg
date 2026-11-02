# Kernel size and planned version

Measured 2026-09-29 with `wc -c -l`.

| Item | Value |
|------|-------|
| File | `AI Systems/Media Editor/claude project/Custom Instructions.md` |
| Size before this phase | 18,086 bytes, 313 lines |
| H1 version before this phase | v1.4.3 |
| Planned H1 version | v1.5.0, a minor bump, because the routing rule changes (`SYNC.md`: a rule change is a minor bump) |
| Planned Skill version | 1.5.0, with `sk-media-editor/changelog/v1.5.0.0.md` |

## Size headroom

The custom instructions cap has never been measured (`AI Systems/z — Claude Project Sync Loop/runtime-register.md:27`, claim 4, "unmeasured"). The only evidence of what fits is what already runs: five live kernels are larger than this one, the largest at 37,118 bytes (`Sales - HubSpot & Automation`). A kernel that stays under 37,118 bytes stays inside proven territory.

| Kernel | Bytes |
|--------|------:|
| Sales - HubSpot & Automation | 37,118 |
| Product Owner | 29,528 |
| Prompt Improver | 24,024 |
| Sales - Direct Communication | 22,832 |
| Barter - Copywriter | 22,728 |
| Media Editor (this one, before) | 18,086 |

Budget for this phase: the three-route routing may add at most about 4,000 bytes, which keeps the kernel near 22 KB, still below four live kernels.
