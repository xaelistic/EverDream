# SPEC-14: Cost-Effective Image Generation (OpenRouter Priority)

**Status:** Draft — 2026-07-09 (Built Out)  
**Canonical app:** `ed.app.new/` + `supabase/functions/generate-image/`  
**Depends on:** Current multi-provider image edge function, Supabase secrets management, IMAGE_GENERATION_SETUP.md, userProfile.ts (for style prefs), analyze-dream (for context)  
**Priority:** High — Visuals (images + parallax video) are a core differentiator and user delight; budget is constrained  
**Goal:** Make OpenRouter the primary/strongest path for reliable, low-cost dream imagery while preserving quality for surreal/artistic styles. Treat Pollinations as non-production fallback. Add cost visibility and model selection.

---

## 1. Overview & Current State

**Current Implementation (supabase/functions/generate-image/index.ts + related):**
- Multi-provider fallback chain:
  1. Hugging Face (free tier SDXL via Inference API)
  2. Fal AI (paid, fast SDXL)
  3. Mentions of Pollinations (free but unreliable), Puter, Unsplash, local SD, SVG fallbacks.
- Prompt enhancement via STYLE_MAP (dreamlike, surreal, etc.).
- Returns binary image or JSON {imageUrl, source, prompt}.
- Frontend usage in DreamAssetGenerator, DreamAssetViewer, etc.
- Some client-side keys still referenced in docs (VITE_HF etc.) — should move fully server-side.

**Strengths:**
- Good fallback resilience.
- Style-aware prompting.
- Returns actual bytes (avoids CORS).

**Gaps (from code review + SPEC-14 draft):**
- No OpenRouter integration for images (even though OpenRouter is already used successfully for analysis and supports Flux/Gemini image models cheaply).
- Heavy reliance on free tiers that can be rate-limited or slow.
- No cost tracking/logging per generation.
- Pollinations treated as serious option in some docs (user explicitly wants it deprioritized).
- Higgsfield evaluated but noted as better for video/consistent characters than pure cheap images.
- Limited reference image / consistency support.
- Frontend still has some VITE_* image key references.
- No model selection or budget controls exposed.

**User Context (from query):**
- Small token budget.
- Prefer OpenRouter or Higgsfield for images.
- Pollinations only for "loyalty" / non-critical use.
- Needs to feed into (and be informed by) iterative user profiles (SPEC-15).

---

## 2. Goals & Scope

### MVP Goals (this spec)
- Add OpenRouter as **primary or co-primary** image provider (cheapest high-quality Flux variants + Gemini image models).
- Keep HF (free) + Fal (paid reliable) as fallbacks.
- Deprecate Pollinations from main production chain (keep as last-resort with clear labeling).
- Add cost logging + approximate per-generation tracking.
- Support basic reference image / style consistency where the model allows.
- Make model choice configurable via secrets + simple code priority.
- Update docs and remove client-side image key exposure where possible.

### Out of Scope for v1
- Full video generation pipeline (Higgsfield or otherwise — see separate evaluation).
- Advanced character consistency / LoRA training.
- Complex A/B testing or user-facing model picker (keep simple for now; Pro users can get basic selector later).
- Direct client-side calls (keep everything through edge functions for secrets + cost control).

**Non-Goals (explicit):**
- Building custom fine-tuned models.
- Heavy client-side generation.

---

## 3. Core Requirements

### 3.1 Provider Integration (OpenRouter First)
- Add `generateWithOpenRouter(prompt, style, width, height, referenceImage?)` in the edge function.
  - Use OpenRouter's image generation endpoints (chat/completions with image modalities or dedicated Flux endpoints).
  - Pass enhanced prompt using existing STYLE_MAP logic.
  - Support returning binary or JSON consistently with current contract.
- Update provider chain (configurable order via code or env):
  1. OpenRouter (primary — pick lowest-cost high-quality model, e.g. Flux.1 [schnell/dev] or equivalent)
  2. Fal AI
  3. Hugging Face (free tier)
  4. Pollinations (emergency only, clearly logged as "loyalty fallback")
- Add support for reference images / image-to-image when the chosen model supports it (for style consistency from previous dream assets or user uploads).

### 3.2 Cost Control & Observability (Critical for Small Budget)
- Log `cost_usd`, model used, and tokens/pixels per generation (OpenRouter returns pricing metadata).
- Add optional `max_cost_usd` parameter or daily/weekly caps (enforced in edge or via profile).
- Store generation cost metadata in `dream_assets` table (new columns or JSONB).
- Simple admin view or console log for "cost this week".
- Prefer cheapest viable model by default; document how to switch (e.g. `OPENROUTER_IMAGE_MODEL` secret).

### 3.3 Quality for Dream Imagery
- Keep/enhance surreal/ethereal prompt engineering.
- Allow style injection from `user_profile.image_style_prefs` (SPEC-15).
- Support aspect ratios and size controls.
- Return consistent metadata so UI can show "Generated with OpenRouter Flux — $0.012".

### 3.4 Fallbacks & Reliability
- Automatic fallback on 4xx/5xx, rate limits, or cost cap hit.
- Clear `source` + `model` + `cost` in responses.
- Graceful degraded experience (placeholder + message) when all paid paths exhausted.

### 3.5 Configuration & Secrets
- New secrets:
  - `OPENROUTER_API_KEY` (required for this path)
  - `OPENROUTER_IMAGE_MODEL` (optional, default to cheapest good Flux variant)
- Update `IMAGE_GENERATION_SETUP.md`:
  - Instructions for OpenRouter image models + current cheapest recommendations.
  - How to set secrets in Supabase/Coolify.
  - Cost expectations and monitoring.
- Clean up or deprecate client-side VITE image keys in docs and code where they are no longer primary.

### 3.6 Frontend & Integration
- `everdreamApi.ts` / generateImage should pass through any provider hints if needed.
- UI (DreamAssetGenerator, etc.) should display generation source + approximate cost.
- Tie into user profile: pass preferred styles from `user_profile` when generating.
- Optional (later): basic Pro feature to choose "cheapest" vs "higher quality" tier.

---

## 4. Data Model & Schema Changes

- Extend `dream_assets` table (or use existing metadata JSONB):
  - `source`: 'openrouter' | 'fal' | 'hf' | 'pollinations' | ...
  - `model`: string (e.g. "black-forest-labs/flux-1-schnell")
  - `cost_usd`: numeric
  - `reference_image_id`: optional (for consistency chains)

- Consider a lightweight `image_generation_costs` table or just rely on logs + dream_assets for now (keep simple).

- No major new tables needed for MVP.

---

## 5. Implementation Plan (Phased)

### Phase 0: Research & Validation (1–2h)
- Browse https://openrouter.ai/models?output_modalities=image (or equivalent) for current cheapest high-quality models suitable for surreal dream art.
- Test 3–5 sample dream prompts via OpenRouter playground/curl with different Flux variants.
- Note pricing, speed, and visual quality for "dreamlike/surreal" styles.
- Decide default model (recommend Flux.1 [schnell] or lowest-cost production-grade option).

### Phase 1: Edge Function Update (3–4h)
- Add `generateWithOpenRouter(...)` function.
- Integrate into the existing multi-provider chain with clear priority comments.
- Handle binary vs JSON responses uniformly.
- Capture and return cost/model metadata.
- Add basic reference image support if model allows.
- Update error handling and fallback logic.

### Phase 2: Secrets, Config & Docs (1–2h)
- Document new secrets.
- Update `IMAGE_GENERATION_SETUP.md` with OpenRouter instructions, current cheapest recommendations, and cost tips.
- Add note deprecating Pollinations for production ("use only as loyalty/emergency fallback").
- Clean any remaining client-side image key exposure in docs/frontend where possible.
- Add cost logging to console + (optionally) `dream_assets`.

### Phase 3: Frontend & Profile Integration (2h)
- Update generation call sites to pass style context from user profile (when available).
- Display source + cost in asset UI.
- Wire basic "use profile styles" behavior.

### Phase 4: Testing & Guardrails (1–2h)
- Manual generation via dev app with OpenRouter primary.
- Verify fallback chain (disable OpenRouter key temporarily).
- Measure/ log rough cost for 50–100 images.
- Add simple usage guard (e.g., reject if daily cost would exceed small budget).
- Update any admin/debug panels.

---

## 6. Technical Details & Code Sketches

### Example Edge Function Addition (pseudocode)
```ts
async function generateWithOpenRouter(prompt: string, style: string, width: number, height: number, refImage?: string) {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY');
  const model = Deno.env.get('OPENROUTER_IMAGE_MODEL') || 'black-forest-labs/flux-1-schnell'; // or current cheapest

  const enhanced = buildEnhancedPrompt(prompt, style);

  const body: any = {
    model,
    // Use appropriate image generation payload for OpenRouter
    prompt: enhanced,
    width, height,
    // reference_image if supported
  };

  const res = await fetch('https://openrouter.ai/api/v1/images/generations' /* or chat/completions variant */, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Parse response, extract image (base64 or url), cost info
  // Return consistent shape
}
```

Update the main handler to try providers in order.

### Cost Logging Example
```ts
const result = await generateWithOpenRouter(...);
await supabase.from('dream_assets').insert({
  ...,
  metadata: { source: 'openrouter', model: result.model, cost_usd: result.cost }
});
console.log(`[ImageGen] ${result.source} ${result.model} ~$${result.cost}`);
```

---

## 7. Testing Strategy

- **Happy path**: Generate several dreams → confirm OpenRouter is used (check logs/source in UI).
- **Fallback**: Temporarily remove OpenRouter key → should fall back to Fal/HF without user-visible failure.
- **Cost visibility**: Check logs and dream_assets metadata.
- **Quality**: Subjective review of surreal/dreamlike output using sample prompts from existing dreams.
- **Budget guard**: Test daily cap logic (if implemented).
- **Reference images**: If supported, test style transfer from previous asset.

---

## 8. Success Criteria & Definition of Done

- OpenRouter is the default/primary path and produces acceptable surreal dream imagery at lower per-image cost than previous paid options.
- Clear source + cost metadata is logged and stored.
- Pollinations is no longer relied upon for normal operation.
- Developers can easily switch models or see current cheapest recommendations in docs.
- Total image generation cost for typical usage stays very low (target: pennies per active user per week).

---

## 9. Risks & Mitigations

- **Pricing / model availability changes on OpenRouter**: Make `OPENROUTER_IMAGE_MODEL` easily configurable. Document how to pick alternatives.
- **Quality regression**: Keep strong fallbacks. Maintain a small set of "golden" dream prompts for manual regression checks.
- **Rate limits on free tiers (HF)**: OpenRouter primary reduces pressure on free tiers.
- **Prompt format differences**: Abstract the generation call per provider.

---

## 10. Related Specs & Dependencies

- **SPEC-15**: Profile building will supply `image_style_prefs` to improve prompts.
- **SPEC-09** (Conversational AI): May trigger or reference image generation.
- **SPEC-08** (Patterns): Can suggest visual motifs.
- **IMAGE_GENERATION_SETUP.md** and `DreamAssetGenerator.tsx` / `everdreamApi.ts`.

**Estimated Effort**: 1–2 days for solid MVP (mostly edge function + docs + light wiring). Can be done in parallel with SPEC-15.

---

**Next Actions After Approval**
1. Research current cheapest suitable OpenRouter image model.
2. Implement `generateWithOpenRouter` + integrate into chain.
3. Add cost metadata logging/storage.
4. Update docs and deprecate Pollinations reliance.
5. Hook profile style preferences (coordinate with SPEC-15).

This spec is now detailed enough to guide direct implementation.