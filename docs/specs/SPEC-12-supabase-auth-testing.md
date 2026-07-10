# SPEC-12: Supabase Setup, Auth Finalization & Database Field Validation

**Status:** Draft — 2026-07-09  
**Canonical app:** `ed.app.new/`  
**Depends on:** Existing Supabase project (olwviffbwcjbcyyleorp.supabase.co or equivalent), current migrations (up to social + admin), client.ts, use-auth.tsx  
**Priority:** High — Foundation for reliable data capture and user accounts  
**Goal:** Ensure Supabase is production-ready for auth and all capture fields. Create repeatable test accounts and validate every important database column.

## Overview

The app relies on Supabase for auth (anonymous + email OTP + emerging social), profiles, dreams, sleep_sessions, and related tables. Many fields are rich (JSONB for interpretation/context, arrays for themes/symbols, etc.).

Current gaps:
- No automated/repeatable test data creation.
- Limited validation that all capture fields (text, audio transcript, video metadata, AI outputs, wearable links, visibility, etc.) are correctly stored and queried.
- Auth flows need end-to-end testing (especially with recent social additions).
- No clear test harness for local/dev vs production Supabase.

## Goals
- Create 3–5 reusable test accounts (anonymous + named email).
- Write/run scripts that exercise **every major capture field** in dreams and sleep_sessions.
- Validate RLS, profile auto-creation, and relations (dream ↔ sleep_session).
- Finalize auth UX: ensure anonymous → upgrade, OTP, social (TikTok), password reset all work cleanly.
- Add basic test coverage or manual checklist that can be run before deploys.

## Core Requirements

### 1. Test Accounts
- Anonymous accounts (instant, no email).
- Named test accounts via email OTP.
- Optional: one with social-linked (TikTok) for testing new flows.
- Script or dashboard instructions to reset/recreate them easily.
- Store test account credentials in a non-committed `scripts/test-accounts.json` (or env).

### 2. Database Field Validation
Exercise these fields (from consolidated schema + later migrations):

**dreams table:**
- content, transcript
- capture_mode (text | audio | video)
- category, themes[], emotion, symbols[]
- narrative, nugget
- valence, interpretation (JSONB)
- lucidity_level, pre_sleep_intent, pre_sleep_note, mood_valence
- context (JSONB), media_urls (JSONB)
- generated_image_url, generated_image_prompt, generated_image_style, generated_image_source
- sleep_session_id (relation)
- visibility, license, allow_remix
- sleep_score, sleep_duration_minutes, rem_minutes
- is_sample, is_deleted, device_id

**sleep_sessions table:**
- All timing fields, awake/light/deep/rem/total, efficiency, awakenings, waso, movement_index
- heart_rate_avg, heart_rate_variability, algorithmic_score, user_report_score
- calibration_offset, calibrated_score, circadian_alignment_score
- chronotype_estimate, source, wearable_provider, device_id
- dream_id (relation), morning_check_in (JSONB)
- is_active

Also test:
- profiles (auth_user_id, display_name, tradition, etc.)
- user_settings (wearable_sync, image_generation_enabled, etc.)

### 3. Auth Finalization
- Confirm anonymous sign-in creates profile automatically.
- Email OTP flow (signInWithOtp) works end-to-end (including redirects).
- Social auth (new TikTok + others) integrates cleanly with profiles.
- Password reset / recovery mode handling.
- Protected routes and getCurrentUser behavior.
- Sign-out clears everything appropriately.
- Test both local dev and deployed (Coolify/Supabase) environments.

### 4. Tooling & Repeatability
- `scripts/test-supabase.mjs` (or .ts) that:
  - Signs in / creates test user(s)
  - Inserts full dreams + sleep_sessions with varied data
  - Updates relations
  - Queries and asserts key fields
  - Cleans up (or leaves for manual inspection)
- Instructions in README or SPEC for running against local Supabase or remote.
- Optional: simple Vitest or manual checklist in `src/test/`.

## Non-Goals (for this spec)
- Full e2e Playwright suite (future).
- Production user migration scripts.
- Advanced RLS edge-case testing beyond basic ownership.

## Implementation Steps

1. **Inspect & Document Current Schema** (1–2h)
   - Review all migrations.
   - Update or create a `docs/supabase-schema.md` summary if missing.

2. **Enhance/Create Test Script** (3–4h)
   - Expand `scripts/test-supabase.mjs`.
   - Support multiple accounts (via email sign-up or dashboard guidance).
   - Cover all listed fields with realistic sample data.
   - Add relation linking and verification queries.
   - Make it idempotent or provide cleanup.

3. **Auth Flow Testing & Polish** (2–3h)
   - Run through LoginScreen, EnhancedAuth, ProtectedRoute, use-auth.tsx.
   - Test social flows (use-social-auth.ts).
   - Fix any redirect or session persistence bugs.
   - Add console/logs or dev panel for auth state.

4. **Validation & Documentation** (1h)
   - Run script against the actual Supabase project.
   - Document results + any issues found.
   - Add "How to test Supabase locally" section to QUICKSTART.md or SETUP_INSTRUCTIONS.md.
   - Create test accounts in Supabase Studio and note their IDs.

5. **Edge Cases** (stretch)
   - Public visibility dreams.
   - Deleted items (is_deleted).
   - Large JSONB (interpretation, context).
   - Concurrent inserts.

## Dependencies
- Existing Supabase client and edge functions.
- Current auth components.
- Recent migrations (005_subscriptions, social_integrations, etc.).
- Ability to set SUPABASE_SERVICE_ROLE_KEY for advanced seeding if needed (currently commented).

## Success Criteria
- Script runs cleanly and populates 3+ dreams + 3+ sleep sessions with all major fields non-null where expected.
- Auth flows succeed for both anonymous and email users in dev.
- Developer can recreate test data in < 2 minutes.
- All critical capture fields are proven to round-trip correctly.

## Risks & Notes
- Remote Supabase may have email confirmation enabled — plan for OTP or dashboard user creation.
- Service role key is powerful; never commit it.
- Test data should be clearly marked (e.g., `is_sample: true` or specific display names).

**Owner:** TBD  
**Estimated effort:** 1–2 days  
**Related specs:** SPEC-07 (go-live), SPEC-09 (conversational AI — will consume this data)
