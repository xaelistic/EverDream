## DEV / Archive for EverDream (2026-06-13 Cleanup)

This directory contains organized copies (or records) of defunct, legacy, and temporary development files that were cluttering the main repository.

**Goal:** Clean the repo while preserving history and context for future reference (e.g. by the nige-n15 / Everdream Foundation team or in production debugging).

**Date of cleanup:** 2026-06-13
**Source repo:** xaelistic/EverDream (main branch at f775aa8)
**Branch for changes:** chore/cleanup-defunct-to-DEV-20260613

## Organization

- `DEV/archive/legacy/` : Old prototype HTML/TSX files and mockups (pre-rebuild monolith, dream economy experiments, galleries).
- `DEV/archive/dev-docs/` : Accumulated implementation logs, security audits, quick fixes summaries, setup guides, status reports, feature-specific notes from rapid development. Grouped by origin (root vs ed.app.new).
- `DEV/archive/dev-screenshots/` : Tracker/preview images used during development (non-user assets).
- `DEV/archive/other/` : Duplicates, test scripts, priority notes etc.

## Full List of Defunct Files Removed from Active Tree

### Legacy Code (ed.app.new/legacy/)
- dream_economy_full_app.html (64k, duplicate of " copy" version)
- dream_economy_full_app copy.html (identical dup)
- dream-journal-mvp2.tsx (87b old mvp)
- journal-mockups-gallery.html
- MOCKUPS-GALLERY.md
- src_DreamJournalApp_backup.tsx (113k+ old monolith backup - had the CRITICAL vulns from old audit: direct Anthropic calls)

### Root-level Dev Docs & Scripts (clutter at repo root)
(Last touched dates from git)
- 2026-06-12: FIXES.md, VIDEO_JOURNAL_PRIORITY.md
- 2026-06-05/06: BUG_FIXES_SUMMARY.md, QUICK_FIXES_SUMMARY.md, SECURITY_AUDIT_REPORT.md, SECURITY_FIXES_APPLIED.md, DREAM_ANALYSIS_SETUP.md, QUICK_START.md
- Earlier: IMPLEMENTATION_LOG.md (May 25), IMPLEMENTATION_PLAN.md (May 29), and others
- test-dream-analysis.js

### ed.app.new/ Dev Notes & Clutter (inside the app dir, not served to prod)
- ANALYTICS_NEXT_STEPS.md, BACKEND_STATUS.md, DEPLOY.md, MVP_DEMO_READY.md, REBUILD_COMPLETE.md
- Multiple IMAGE_GENERATION_*.md , DREAM_IMAGE_GENERATION.md , POLLINATIONS_REMOVAL_SUMMARY.md
- ENCRYPTION_AUDIT.md, SECURITY_FIXES.md, UX_RECOMMENDATIONS.md
- VIDEO_JOURNAL_IMPLEMENTATION.md, VOICE_VIDEO_MEMO_IMPLEMENTATION.md, HYBRID_SCORING_MERGE.md
- SETUP_INSTRUCTIONS.md, QUICKSTART.md
- tracker-*.png (5 dev preview screenshots)
- ed.app.new/docs/IMAGE_GENERATION_SETUP.md (duplicate of root-level note)

(Full ~35+ items; see git history for exact prior paths and contents.)

## Why These Were Defunct
- Development process artifacts from "yolo" + feature-branch heavy workflow (15+ branches, many merged or abandoned).
- Superseded by REBUILD_COMPLETE, SECURITY_FIXES_APPLIED, current src/ structure and supabase/ edge functions.
- Legacy/ contains pre-rebuild code with known critical issues (hardcoded keys, direct browser API calls to Anthropic) - now isolated.
- Root and ed.app.new MDs made repo noisy; not part of built PWA or user docs.
- Duplicates and old trackers no longer referenced.

## Post-Cleanup State
- Active code: ed.app.new/src/ (components broken down, lib/, supabase/functions for secure AI proxying, PWA + Capacitor config, Vite build)
- Specs kept in docs/specs/ (active decomposition, a11y etc work remaining)
- Security: Old audit issues addressed per SECURITY_FIXES.md (device keys, CSP in index.html, input validation, IndexedDB primary, Supabase auth ready). Confirmed no old vulns in active src/ (only in archived legacy/).
- Deploy: Healthy at https://everdream.n1g3.com (coolify, base /ed.app.new, production env of Everdream Foundation project)

## How to Recover
- Git history on main (before this PR merge) or this branch has full prior contents.
- Legacy files can be re-examined in DEV/archive/legacy/ if needed for reference.

## Next Suggested Cleanups (not in this batch)
- Stale feature branches (delete merged ones like dream-share-and-mint-improvements-a672c after confirm)
- Prune more old specs once implemented
- Consider moving active user-facing docs to /docs or separate wiki
- npm audit + dependabot for deps in ed.app.new/package.json (react, three, supabase etc)
- Review src/components/dev/ and debug/ for prod strip

Maintained by cleanup automation + manual review 2026-06-13.
