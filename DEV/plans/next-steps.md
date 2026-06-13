---
title: EverDream Next Steps & Roadmap
last_updated: 2026-06-13
---

# EverDream Next Steps & Roadmap

This document lives in `DEV/plans/` so it is easy to find, update daily, and survives repo cleanups.

## P0 - Immediate (Next 1-3 Days)
- [ ] Merge PR #65 (defunct cleanup + DEV/ structure).
- [ ] Full local build + test verification (after `npm i` + valid .env).
- [ ] `npm audit` in `ed.app.new/` + fix high/critical items.
- [ ] Comment on / approve PR #65 and merge to main.
- [ ] Create first follow-up daily note (2026-06-14).

## P1 - This Week
- [ ] Prune stale/merged feature branches (15+ remotes; confirm with `git branch -r` and team).
- [ ] Implement active `docs/specs/` items:
  - SPEC-01-fix-build.md
  - SPEC-02-decompose-monolith.md (target DreamJournalApp.tsx)
  - SPEC-03-accessibility.md
  - SPEC-04-cleanup-app-tsx.md
- [ ] Security follow-ups (from SECURITY_FIXES.md):
  - Full password-based key derivation + login/signup UI.
  - httpOnly cookie sessions (move away from remaining localStorage where possible).
  - Strip console/debug in production builds.
- [ ] Branding cleanup: make VitePWA manifest + titles consistent (EverDream primary; "Lucid" appears legacy).
- [ ] Review CSP in index.html + vite.config.ts (pollinations references post-removal summary).

## P2 - Next 2 Weeks
- [ ] Add proper dev vs production env in Coolify (Everdream Foundation project) if not present.
- [ ] Edge function hardening + monitoring (rate limits, logging, error tracking).
- [ ] Expand test coverage (vitest + e2e for critical flows: dream capture + analysis + share).
- [ ] Mobile (Capacitor) smoke on iOS/Android simulators.
- [ ] 3D / XR / face-api perf + privacy review (camera permissions, on-device only where possible).
- [ ] Move user-facing docs out of root/ed.app.new/ into proper /docs or wiki.

## P3 - Longer Term / Backlog
- [ ] End-to-end encryption for dreams (user-controlled keys).
- [ ] Multi-factor auth + account recovery.
- [ ] Automated CI (build, test, npm audit, secret scan) + dependabot.
- [ ] Bug bounty or public security reporting process.
- [ ] Integration with wearables (Oura/Fitbit/Garmin) production-ready.
- [ ] Dream NFT mint flow (contracts in separate xaelistic/everdream-contracts repo) + share improvements.
- [ ] Video journal + image generation full pipeline (current 2-stage / pollinations removal work).
- [ ] Analytics / XP system refinement.
- [ ] BCI / "Everdream Foundation" expansion (see coolify project).

## How to Update This File
- Edit directly in `DEV/plans/next-steps.md`.
- Or append daily progress to the relevant daily note and summarize here weekly.
- Keep prioritized; move completed items to a `done/` section or delete with note in git history.

## Related Documents
- `DEV/README.md` - Archive index from the 2026-06-13 cleanup.
- `DEV/daily/` - Day-by-day session notes and plans.
- `docs/specs/` - Active technical decomposition and improvement specs.
- Root security docs (now historical; see archive for older versions).

Last major update: 2026-06-13 (post initial repo review + cleanup PR).