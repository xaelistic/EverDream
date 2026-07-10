# SPEC-15: Dream Narrative, Sleep Analysis & Iterative User Profile Building

**Status:** Draft — 2026-07-09 (Built Out)  
**Canonical app:** `ed.app.new/` + `supabase/functions/analyze-dream/` + new `update-user-profile` logic  
**Depends on:** Current analyze-dream edge function (NVCNT), dreams + sleep_sessions + profiles tables, OpenRouter access, wearable data (SPEC-13), image generation (SPEC-14)  
**Priority:** High — The "memory + personalization" layer that turns one-off analysis into a living, increasingly valuable user model  
**Goal:** Use a cheap, high-quality LLM (DeepSeek or GLM via OpenRouter) for strong narrative and analysis. Maintain an iterative `user_profile` that cross-references dreams, sleep, mood, image preferences, and patterns. Use the profile to make future outputs (narratives, images, insights) more personalized and insightful.

---

## 1. Overview & Current State

**Current Analysis (`supabase/functions/analyze-dream/index.ts`):**
- Produces structured NVCNT matrix (Narrative, Valence, Complexity, Novelty, Texture).
- Primary: OpenRouter (owl-alpha — described as free/high-performance).
- Fallbacks: Gemini 1.5 Flash, OpenAI GPT-4o-mini, NVIDIA Nemotron.
- Prompt is a detailed "Subconscious Data Structurer" instruction that returns strict JSON.
- Some sleep correlation already exists via `sleep_session_id` and basic fields.

**Current Profile Handling:**
- Basic stub exists in `src/lib/userProfile.ts`:
  - Simple client-side merge for themes, valence, placeholder sleep patterns.
  - `user_profile` JSONB on profiles (or planned).
  - TODO explicitly calls for an edge function using cheap LLM (DeepSeek/GLM) for smart merging.

**User Preference (from query):**
- DeepSeek or GLM 5.2 (or equivalents) for narrative strength.
- Same cheap model for:
  - Dream narrative / interpretation
  - Sleep analysis
  - Iterative profile building that cross-references dreams + images + sleep
- Small token budget → must be extremely cost-conscious.

**Gaps:**
- Narrative quality is good but can be more personalized and "alive" over time.
- Profile merging is currently naive (client-side appends).
- No automatic, LLM-powered cross-referencing of sleep data + dream content + image styles.
- No feedback loop into image generation prompts (SPEC-14) or companion (SPEC-09).
- No explicit sleep analysis pass.
- Cost and latency not optimized for frequent updates.

---

## 2. Goals & Scope

### MVP Goals (this spec)
- Adopt **DeepSeek** (primary) or **GLM equivalent** via **OpenRouter** as the go-to model for narrative-quality work (excellent reasoning + very low cost).
- Create a rich, versioned `user_profile` JSON structure.
- Add an `update-user-profile` edge function (or extend analyze-dream) that uses the cheap LLM to intelligently merge new data.
- Automatically call profile update after dream analysis and after significant sleep sync.
- Feed profile data back into:
  - Narrative/interpretation (personalized language)
  - Image generation prompts (style + motif preferences)
  - Future insights / companion features
- Add basic sleep analysis summarization + correlation extraction.
- Keep structured NVCNT scoring on fast/cheap models; use stronger narrative model only where it adds value.
- Strong cost controls (batch, significant-only updates, logging).

### Out of Scope for v1
- Full lifelong RAG / vector memory over every dream (start with profile summary + recent context).
- Real-time profile updates on every micro-event (batch is fine).
- User-editable profile (read-only summary + "what the AI knows about you" view is sufficient).
- Advanced multi-agent orchestration for profile (keep single cheap LLM call).

---

## 3. Core Requirements

### 3.1 LLM Selection & Dual-Path Usage
- Primary for narrative/profile work: **DeepSeek** (or GLM) via **OpenRouter**.
  - Why: Outstanding narrative, reasoning, and long-context summarization at extremely low token prices. One key via OpenRouter gives easy switching.
- Keep fast models (Gemini Flash, etc.) for the structured NVCNT scoring / valence / complexity numbers.
- In `analyze-dream` (or a new `analyze-dream-narrative` helper):
  - Run structured scoring on cheap/fast model.
  - Run rich narrative + insight generation on DeepSeek/GLM.
- Add sleep analysis: summarize recent sleep + extract correlations with dream content/themes.

### 3.2 Iterative User Profile Structure
Recommended shape (stored as JSONB on `profiles.user_profile` or dedicated table with history):

```json
{
  "recurring_themes": ["flying", "ocean", "transformation", "dragon"],
  "sleep_dream_correlations": [
    { "pattern": "High REM nights correlate with vivid/symbolic dreams and higher novelty scores", "confidence": 0.85, "supporting_entries": 12 }
  ],
  "image_style_prefs": ["surreal", "ethereal blue tones", "dragon motifs", "bioluminescent"],
  "emotional_profile": {
    "positive_valence_bias": 0.68,
    "common_emotions": ["wonder", "empowerment", "mild anxiety"],
    "growth_themes": ["embracing change", "personal power"]
  },
  "key_insights": [
    "User processes major life transitions through mythic transformation imagery",
    "Sleep quality strongly influences dream recall and emotional tone"
  ],
  "preferred_narrative_voice": "poetic and empowering",
  "last_updated": "2026-07-09T...",
  "version": 14,
  "recent_context_summary": "Last 5 dreams heavy on water + flying; recent sleep showing good REM"
}
```

Update rules:
- After every dream analysis (or batched).
- After meaningful sleep sync (e.g., new wearable data or significant score change).
- LLM is asked to **merge**, not just append: extract new patterns, update confidences, prune low-support items, suggest style implications.

### 3.3 Automatic Updates & Feedback Loops
- New or extended edge: `update-user-profile` (or integrate into analyze-dream success path).
- Call after:
  - Successful dream analysis
  - Sleep session insert/update with wearable data
- Pass to the LLM:
  - Current profile
  - New dream (content + NVCNT + narrative)
  - Recent sleep data + any correlations
  - Recent image generation metadata (styles used)
- Return updated profile + any "new insights surfaced".
- Use the profile when generating:
  - Future dream narratives ("Continuing your recurring theme of...")
  - Image prompts (inject `image_style_prefs` + motifs)
  - Insights / companion responses

### 3.4 Cost & Quality Controls (Small Budget)
- Use DeepSeek/GLM only for narrative + profile merge (not for every structured score).
- Only update on "significant" events (new dream, or sleep session with wearable data + score change > threshold).
- Log approximate cost per profile update.
- Add hard limits or warnings if weekly profile cost exceeds small threshold.
- Fallback: if LLM call fails or is too expensive, fall back to the simple merge logic in `userProfile.ts`.

### 3.5 Data Model & Migrations
- Add / ensure `user_profile JSONB` on `profiles` table (with history table optional for v1 — can store previous versions in the JSON or a simple audit table).
- Migration to add the column + backfill empty profiles for existing users.
- Consider a `profile_updates` table (lightweight) for audit + cost tracking if needed.

---

## 4. Implementation Steps (Phased)

### Phase 1: Model Selection & Basic Integration (2–3h)
- Confirm DeepSeek vs current GLM performance/price on 5–10 real dream narratives (use OpenRouter playground).
- Add `NARRATIVE_MODEL` / `PROFILE_MODEL` secret (default to best cheap DeepSeek variant via OpenRouter).
- In `analyze-dream`:
  - Keep structured NVCNT on fast model.
  - Add or route narrative/insight generation to DeepSeek/GLM path.
- Add basic sleep analysis helper (summarize stages + simple correlation extraction).

### Phase 2: Profile Schema + Edge Function (4–6h)
- Migration for `user_profile` JSONB (if not already present).
- Create/extend `update-user-profile` edge function.
  - Strong system prompt for merging + insight extraction.
  - Few-shot examples of good profile evolution.
  - Return both the full updated profile and "new insights" array.
- Basic client-side fallback in `userProfile.ts` (already partially exists) for when edge is unavailable.

### Phase 3: Automatic Calls & Feedback Loops (3–4h)
- Hook profile update:
  - After successful dream analysis in the analysis flow.
  - After `insertSleepSession` / wearable sync (when data is meaningful).
- Pass profile context when generating images (SPEC-14) and future narratives.
- Surface evolving profile summary in Profile/Settings or a new "My Dream Self" / Insights view.
- Update companion/chat (SPEC-09) to be profile-aware.

### Phase 4: Cost Controls, Polish & Testing (2–3h)
- Add cost logging for profile updates.
- Implement "significant event" guards + batching.
- Add usage guardrails / warnings.
- Test profile evolution with 8–12 real or seeded dreams + sleep data.
- Document expected cost (should be very low).
- Update relevant docs (DREAM_ANALYSIS_SETUP.md, etc.).

---

## 5. Technical Details & Code Sketches

### Example Profile Merge Prompt (for edge function)
```
You are maintaining a living user dream + sleep profile.

Current profile:
{currentProfileJson}

New dream:
Content: {dreamContent}
NVCNT: {nvcnt}
Narrative: {narrative}
Sleep context (if any): {sleepData}

Recent image styles used: {recentStyles}

Task:
1. Merge the new information into the profile.
2. Update recurring_themes, correlations, style prefs, emotional_profile, key_insights.
3. Increase confidence on patterns with more evidence; add new patterns only if supported.
4. Produce a short "recent_context_summary".
5. Return ONLY valid JSON matching the profile schema.

Output the full updated profile as JSON.
```

### Edge Function Skeleton
```ts
async function updateUserProfile(...) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  const model = Deno.env.get('PROFILE_MODEL') || 'deepseek/deepseek-chat'; // or glm equivalent

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: mergePrompt }] })
  });

  const updated = parseJSONFromResponse(...);
  await supabase.from('profiles').update({ user_profile: updated }).eq('id', userId);
  return updated;
}
```

Call this after analysis success and after meaningful sleep inserts.

---

## 6. Testing Strategy

- Seed or use 8–15 real dreams + associated sleep data.
- Run analysis + profile updates repeatedly.
- Verify:
  - Profile grows meaningfully (new correlations appear, confidences rise).
  - Image prompts start incorporating learned styles.
  - Narratives become more personalized over time.
- Cost measurement: log and sum approximate costs for a full test run.
- Failure modes: LLM returns bad JSON → fall back to simple merge + log.
- Privacy: all operations are per-user only.

---

## 7. Success Criteria & Definition of Done

- After a handful of dreams + sleep entries, the profile contains accurate, non-trivial cross-references (sleep ↔ dream themes, style evolution, emotional arcs).
- Future image generation and narratives visibly benefit from the profile (more consistent style, personal references).
- Narrative quality is strong while staying on very cheap models.
- Profile update cost is negligible (target: well under $0.01 per meaningful update).
- System gracefully degrades when LLM calls are unavailable or expensive.

---

## 8. Risks & Mitigations

- **Profile drift or hallucinated patterns**: Strong system prompt + few-shot examples + "only add patterns with evidence" instructions. Human review possible via insights view.
- **Cost spikes**: Significant-event gating + hard daily/weekly caps in the edge function.
- **Model deprecation or price changes**: Configurable model via secret + OpenRouter makes switching easy.
- **Privacy**: Everything stays user-scoped; never send data cross-user.

---

## 9. Related Specs & Dependencies

- **SPEC-14** (Image Generation): Profile supplies `image_style_prefs` and motifs.
- **SPEC-13** (Wearables): Provides rich sleep data for correlations.
- **SPEC-09** (Conversational AI Companion): Heavily benefits from (and can update) the profile.
- **SPEC-08** (Patterns & Correlations): Complementary — profile can consume or seed pattern data.
- **SPEC-10** (Sleep Coaching): Profile provides long-term context.

**Estimated Effort**: 3–5 days for a solid, production-usable first version. Can be done in parallel with SPEC-14.

---

**Next Actions After This Spec**
1. Confirm preferred narrative/profile model (DeepSeek vs GLM) via quick OpenRouter tests.
2. Add `user_profile` column if missing + backfill migration.
3. Implement `update-user-profile` edge function with strong merge prompt.
4. Hook calls after dream analysis and sleep sync.
5. Wire profile context into image prompts and narrative generation.
6. Add cost logging + basic guardrails.
7. Test profile evolution end-to-end.

This spec is now detailed enough to drive direct implementation while staying aligned with the small-budget, high-personalization vision.