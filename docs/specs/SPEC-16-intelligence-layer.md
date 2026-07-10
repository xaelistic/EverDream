# SPEC-16: Intelligence Layer (AI Orchestration for Analysis, Profile, and Generation)

**Status:** Draft — 2026-07-10  
**Canonical app:** `ed.app.new/` + Supabase edge functions  
**Depends on:** SPEC-14 (image gen plumbing), SPEC-15 (profile data model + client merge), SPEC-13 (wearables), existing analyze-dream and generate-image edges, user_profile JSONB  
**Priority:** High — This is the "brain" that makes the app intelligent and personalized over time using cheap LLMs.  
**Goal:** Define a clean, cost-aware, pluggable intelligence layer on top of the non-AI plumbing already implemented. Use OpenRouter (DeepSeek/GLM primary for narrative/profile; image models for visuals) with strict cost controls, fallbacks, and observability. No direct client-side AI calls.

## Overview

The intelligence layer handles:
- Enhanced dream narrative/interpretation (beyond basic NVCNT).
- Iterative user profile building and merging (cross-referencing dreams + sleep + images + mood).
- Smart image/prompt generation (injecting learned styles/motifs).
- Sleep analysis and correlations.
- Future: companion responses, insights, coaching.

**Current State (post non-AI implementation):**
- Basic client-side profile merge in `userProfile.ts` (themes, valence, simple correlations).
- Profile updates hooked in saveDream (non-blocking).
- Image gen supports provider preference (stub for OpenRouter returning pollinations with mock cost).
- Edge functions exist for analysis/image but use current providers (HF/Fal/OpenRouter-owl for analysis).
- No LLM-based profile merge, no smart prompt enhancement, limited cost tracking.
- user_profile JSONB added via migration.

**Why separate layer?**
- Keeps core save/sync flows fast and offline-capable.
- Centralizes AI calls (for cost, rate limits, secrets, logging).
- Easy to swap models or add agents later.
- Aligns with small budget: only call when valuable, use cheapest strong models.

## Goals
- Central "intelligence" service/edge that orchestrates LLM calls.
- Use **DeepSeek or GLM via OpenRouter** as primary for text/narrative/profile (cheap + strong).
- Use cheapest suitable image models via OpenRouter for visuals.
- Automatic, incremental profile updates after key events (dream save, sleep sync).
- Profile data fed back into prompts, narratives, UI.
- Full cost tracking, budgets, and logging per user.
- Graceful degradation (client merge when AI unavailable).
- Pluggable: config per user or global via secrets.

## Core Requirements

### 1. Intelligence Service / Edge Function
- New edge: `intelligence-layer` (or extend existing analyze/update).
  - Endpoints/actions:
    - `enhance-narrative(dream)` → richer story + insights using profile context.
    - `update-profile(userId, newData)` → LLM merge into user_profile.
    - `enhance-image-prompt(basePrompt, userId)` → inject styles/motifs from profile.
    - `analyze-sleep(sleepSession, recentDreams)` → correlations + summary.
  - All calls go through OpenRouter for unified billing/keys.
  - Model selection:
    - Narrative/profile: deepseek-chat or glm-4 (cheap, high quality).
    - Image prompts: lightweight or same.
  - Always pass current profile snapshot + recent context for personalization.
  - Return structured + cost metadata.

### 2. Event Hooks (non-AI safe)
- After dream analysis/save: call update-profile + optional enhance-narrative.
- After sleep sync (especially with wearable data): call update-profile + analyze-sleep.
- Before image gen: call enhance-image-prompt using profile.
- These hooks must work without AI (fall to client logic in userProfile.ts).

### 3. Cost & Budget Controls
- Log every call: model, input/output tokens (or pixels), cost_usd, user_id, action.
- Store in new table `ai_usage_logs` (or extend dream_assets).
- Per-user daily/weekly caps (e.g., $0.05/week for profile/images).
- Global or profile-based "intelligence_level": basic (client-only) / full (LLM).
- Fallback if budget exceeded or API error: use simple merge + log warning.

### 4. Data Model
- `profiles.user_profile` (JSONB, as defined in SPEC-15).
- Optional `ai_usage_logs`:
  - id, user_id, action (narrative|profile|image_prompt|sleep), model, cost_usd, tokens_in, tokens_out, timestamp, metadata.
- Backfill user_profile for existing users.
- Versioning on profile (increment on each LLM update).

### 5. Integration Points
- Dream save flow (DreamJournalApp, dream-analyzer): after analysis, call intelligence.
- Sleep module: after insertSleepSession / wearable sync.
- Image gen (dreamAssetGenerator + edge): before/after call, enhance prompt + log cost.
- UI: show profile summary, "AI-enhanced" badges, cost indicators (for transparency).
- Future: companion (SPEC-09), patterns (SPEC-08), coaching (SPEC-10).

### 6. Security & Privacy
- All AI calls server-side only (edge functions).
- Never send full history; send profile summary + current event.
- User consent flag in settings (ai_analysis_consent).
- Logs are user-scoped; no cross-user data.

### 7. Observability
- Console + (optional) PostHog / Supabase logs with [Intelligence] tags.
- Admin view: per-user AI spend, profile version history.
- Alerts if spend spikes.

## Non-Goals (MVP)
- Real-time streaming LLM responses (batch ok).
- Multi-agent swarms (start with single cheap model calls).
- On-device models (keep cloud for consistency + cost).
- User-editable profile (AI owns it; user sees summary).

## Implementation Phases (after non-AI plumbing)

**Phase 1: Schema & Client Hooks (already partially done)**
- Migration for user_profile (done).
- Enhance client updateUserProfileFrom* with more rules.
- Wire calls in saveDream and sleep paths (partially done in DreamJournalApp).

**Phase 2: Intelligence Edge Function (core AI part)**
- Create `supabase/functions/intelligence-layer/index.ts`.
- Implement actions with OpenRouter calls (DeepSeek/GLM for text, image models).
- Strong prompts for merge / enhance.
- Cost extraction and logging.
- Fallback to client logic.

**Phase 3: Prompt & Integration Wiring**
- Modify image prompt builders to call enhance if profile available.
- Update analyze flow to use enhanced narrative.
- Feed profile into save flow results.

**Phase 4: UI, Cost, Polish**
- Display evolving profile in settings/insights.
- Add spend tracking UI / admin.
- Cost guards.
- Tests with mock responses.

**Phase 5: Full Enable**
- Set secrets: OPENROUTER_API_KEY, preferred models.
- Flip feature flags.
- Monitor costs for first users.

## Technical Notes

**OpenRouter Usage (unified):**
- One key for text + images.
- Models:
  - Text/narrative/profile: `deepseek/deepseek-chat` or `google/gemini-flash` or GLM.
  - Images: cheapest Flux via OpenRouter (see SPEC-14).
- Pricing: expect << $0.01 per profile update or image on cheap models.

**Example Profile Merge Call (in edge):**
Use a detailed system prompt + current profile + new event → ask for merged JSON only.

**Fallback Strategy:**
- If no OPENROUTER_API_KEY or budget hit → use pure client merge from userProfile.ts.
- Log "intelligence: fallback".

**Migration for Logs (if needed):**
```sql
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text,
  model text,
  cost_usd numeric(10,6),
  tokens_in int,
  tokens_out int,
  created_at timestamptz default now()
);
```

## Risks & Mitigations
- Cost overrun: strict per-user caps + alerts in edge + admin dashboard.
- Bad merges/hallucinations: conservative prompts, "only add supported by evidence", versioned profiles.
- Latency: call async/non-blocking where possible.
- Model changes: config-driven model names.
- Privacy: profile summaries only; user consent.

## Success Criteria
- After several dreams/sleeps, profile has meaningful, accurate cross-refs visible in UI.
- Image prompts visibly use learned prefs (e.g., recurring "dragon motifs").
- Narratives feel personalized ("Building on your water/transformation theme...").
- Total AI spend for active user < $0.10/month.
- All flows degrade gracefully without API key.
- Clear logs and metadata for every AI touchpoint.

## Related Specs
- SPEC-14, SPEC-15 (foundational plumbing)
- SPEC-09 (companion will use this layer heavily)
- SPEC-08, SPEC-10 (patterns + coaching will consume profile)
- SPEC-13 (wearables feed rich sleep data)

**Estimated Effort (AI part):** 4-7 days (mostly edge prompts, wiring, cost infra, testing). Can be done incrementally after plumbing.

**Recommended Starting Models (budget-friendly):**
- Narrative/Profile: DeepSeek via OpenRouter (top choice per user input)
- Images: Cheapest Flux on OpenRouter (per SPEC-14)

This layer turns the app from "feature collector" into a truly intelligent, evolving dream companion.

---

## Implementation Notes for Current Phase (Non-AI)
- All client-side profile updates and stubs are in place.
- Image provider selection (stub) is wired.
- No new real LLM/image API calls added beyond existing HF/Fal/Pollinations paths.
- Ready for intelligence layer to "plug in" the smart calls.

Next: Set secrets + implement the intelligence edge when budget allows.