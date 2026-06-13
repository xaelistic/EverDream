## DEV / Archive + Plans for EverDream

This directory is the home for:
- Archived defunct / legacy / temporary development artifacts (so the main repo stays clean).
- **Ongoing plans and daily notes** (so work is documented in-repo and easy to resume).

**Date of initial structure:** 2026-06-13
**Source repo:** xaelistic/EverDream
**Active branch for recent changes:** chore/cleanup-defunct-to-DEV-20260613 (see PR #65)

## Layout

- `DEV/README.md` (this file) - Index and quick reference.
- `DEV/archive/2026-06-13/` - Defunct files from the big cleanup (legacy code, old summaries, trackers, dups). See the sub-README or the historical list below.
- `DEV/daily/` - One file per day (YYYY-MM-DD.md). Use for session notes, what was accomplished, findings, and immediate next actions. Template in `DEV/plans/daily-template.md`.
- `DEV/plans/` - Longer-lived documents:
  - `next-steps.md` - Prioritized roadmap (P0/P1/P2/P3).
  - `daily-template.md` - Copy this when creating a new daily note.
  - (Add security-followup.md, deploy-checklist.md, etc. as needed.)

## Quick Start for Daily Work
1. At the end of each day (or session), create or update `DEV/daily/2026-MM-DD.md`.
2. Summarize progress and capture next steps (pull from / update `DEV/plans/next-steps.md`).
3. Commit + push (or let the MCP tools handle it).
4. Update this README if the structure evolves.

## Historical Cleanup List (2026-06-13)
(Kept here for reference; full details moved to the archive subdir + git history.)

### Legacy Code (ed.app.new/legacy/)
- dream_economy_full_app.html + copy (dups)
- dream-journal-mvp2.tsx
- journal-mockups-gallery.html
- MOCKUPS-GALLERY.md
- src_DreamJournalApp_backup.tsx (old monolith with original audit vulns)

### Root + ed.app.new Dev Clutter (logs, audits, notes, trackers)
See the original DEV/README content in git history or the archive for the exhaustive list with dates. All removed from active paths in the cleanup PR.

## Post-Cleanup State (as of 2026-06-13)
- Main tree cleaned of process noise.
- Active development continues in `ed.app.new/src/`, `supabase/`, `docs/specs/`, etc.
- Deploy remains healthy at https://everdream.n1g3.com.
- Security posture significantly improved (see archived reports + SECURITY_FIXES.md).

## How to Recover Anything
- Git history on main (pre-merge) or the cleanup branch.
- Everything under `DEV/archive/` or `DEV/daily/` is the living reference.

## Next Suggested Work (see DEV/plans/next-steps.md for full prioritized list)
- Merge the cleanup PR.
- npm audit + local verification.
- Execute specs (decompose monolith, a11y...).
- Continue security hardening + branch hygiene.
- Use daily/ for all future planning.

Maintained daily. Update this file when adding new plan categories.
