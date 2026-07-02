# SPEC-07: Go-Live Platform — Friends, Referrals, Tiers, Payments & AI Providers

**Status:** Draft — Jul 2, 2026  
**Canonical app:** `ed.app.new/` in `xaelistic/EverDream`  
**Depends on:** `005_subscriptions.sql`, Coolify `supabase-test`, `docs/coolify-go-live-checklist.md`  
**Goal:** Wire social, monetization, and AI generation so the product is built and only needs API keys + payment accounts to go live.

---

## Overview

| Area | Current state | Spec section |
|------|---------------|--------------|
| Friends | UI mock + localStorage friend codes | [§1 Friends](#1-friends) |
| Referral codes | Not built | [§2 Referral codes](#2-referral-codes) |
| Tiers & payments | Schema + client scaffold; not enforced server-side | [§3 Tiers, payments & upgrades](#3-tiers-payments--upgrades) |
| AI image gen | Ollama (laptop) → edge HF/Fal → Pollinations | [§4 AI media providers](#4-ai-media-providers) |
| AI video gen | Canvas parallax (free) + Replicate (client) | [§4 AI media providers](#4-ai-media-providers) |

### Recommended build order

```
P0  §3 Tier enforcement + Stripe/RevenueCat verification
P1  §4 Unified generate-media edge + provider env switch
P2  §2 Referrals (signup attribution + rewards hook)
P2  §1 Friends (replace ProfileHub mocks)
P3  Admin provider health + usage dashboards
```

---

## 1. Friends

**Status:** Not started (UI mock only)  
**Priority:** P2

### Current state

- `ProfileHubScreen.tsx` — hardcoded friend list; “add friend” shows a toast only
- `profileService.ts` — `friendCode` generated in `localStorage` (`DREAM-XXXXXX`), not persisted to Supabase
- No `friends` / `friend_requests` tables or RLS

### Goals

- Users can send, accept, decline, and remove friend connections
- Friend codes are stable, unique, and stored on `profiles`
- Optional: share dreams with friends (visibility `friends` already exists in local profile model)
- RLS ensures users only see their own network

### Schema (`007_friends.sql`)

```sql
-- Stable public friend code on profile (replaces localStorage-only codes)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS friend_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_friend_code ON public.profiles(friend_code);

-- Backfill: DREAM-{6 char from id}
UPDATE public.profiles
SET friend_code = 'DREAM-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 6))
WHERE friend_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN friend_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (from_user_id, to_user_id),
  CHECK (from_user_id <> to_user_id)
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)  -- canonical ordering, one row per pair
);

-- RLS: users see requests they sent or received; friendships where they are a or b
```

### API / RPC

| Endpoint | Method | Description |
|----------|--------|-------------|
| `lookup_friend_code(code)` | RPC | Resolve `friend_code` → `profiles.id`, `display_name`, `avatar_url` (no email) |
| `send_friend_request(to_user_id)` | RPC | Insert `friend_requests` pending; reject if blocked or duplicate |
| `respond_friend_request(request_id, accept)` | RPC | Accept → insert `friendships`; decline → update status |
| `list_friends()` | RPC | Return accepted friends + shared dream count (optional v2) |
| `remove_friend(friend_user_id)` | RPC | Delete `friendships` row |

### Client changes

| File | Change |
|------|--------|
| `src/lib/profileService.ts` | Load/save `friend_code` from `profiles`; remove local-only generation |
| `src/screens/ProfileHubScreen.tsx` | Replace mock `friends` array with `list_friends()` |
| `src/hooks/useFriends.ts` | New hook: requests, friends, send/accept/remove |
| `src/lib/supabase/friends.ts` | RPC wrappers |

### Acceptance criteria

- [ ] Each profile has a unique `friend_code` in Supabase
- [ ] User A can add User B by code; B sees pending request
- [ ] Accept creates bidirectional friendship visible to both
- [ ] Decline/block prevents re-request spam
- [ ] RLS: User C cannot see A↔B friendship or pending requests not involving C
- [ ] ProfileHub “Network” tab shows real data (empty state when no friends)

---

## 2. Referral codes

**Status:** Not started  
**Priority:** P2  
**Related:** §1 `friend_code` is for social graph; referral codes are for growth attribution (can share the same column or use a separate `referral_code` — recommend **separate** to avoid conflating friend-add with signup attribution)

### Current state

- No referral tables, hooks, or signup flow integration
- Friend code in localStorage is not suitable for attribution (not stable across devices pre-signup)

### Goals

- Every user gets a shareable referral link/code at signup
- New signups attributed to referrer when code present in signup URL or form
- Audit trail for rewards (even if rewards are manual at first)
- Optional: grant referrer + referee a tier perk (e.g. +5 bonus AI images)

### Schema (`008_referrals.sql`)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);

-- Set on profile creation via trigger (REF-{6 char})
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'REF-' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'qualified', 'rewarded', 'revoked')),
  qualified_at TIMESTAMPTZ,   -- e.g. referred user completed first dream
  rewarded_at TIMESTAMPTZ,
  reward_type TEXT,             -- 'bonus_images', 'plus_trial', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)     -- one referrer per new user
);

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,
  reward_type TEXT NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Signup flow

1. Landing/signup URL: `https://everdream.app/#/signup?ref=REF-ABC123`
2. `LoginScreen` reads `ref` query param → stores in `sessionStorage`
3. On successful `signUp`, edge function or DB trigger:
   - Resolve `referral_code` → `referrer_id`
   - Insert `referrals` row (`pending`)
4. On first dream save (or email verify), mark `qualified`

### API

| Endpoint | Description |
|----------|-------------|
| `apply_referral_code(code, referred_user_id)` | Called post-signup; idempotent |
| `get_referral_stats()` | Referrer dashboard: pending / qualified / rewarded counts |
| `grant_referral_reward(referral_id)` | Admin or automated; writes `referral_rewards` |

### Client changes

| File | Change |
|------|--------|
| `src/components/auth/LoginScreen.tsx` | Parse `?ref=`; pass to sign-up |
| `src/screens/ProfileHubScreen.tsx` | “Invite friends” section with referral link + copy |
| `src/lib/referrals.ts` | New module |

### Acceptance criteria

- [ ] New user signup with `?ref=` creates `referrals` row linked to referrer
- [ ] Self-referral rejected
- [ ] Invalid/expired code fails gracefully (signup still works)
- [ ] Referrer sees count of referred users in profile
- [ ] `referral_rewards` row created when qualification rule fires (configurable)

---

## 3. Tiers, payments & upgrades

**Status:** Scaffolded — needs keys, enforcement, usage tracking  
**Priority:** P0

### Current state

**Database** (`005_subscriptions.sql`):

```sql
profiles.subscription_tier      -- 'free' | 'plus' | 'pro'  (source of truth)
profiles.subscription_source    -- apple | google | stripe | revenuecat | manual
profiles.subscription_expires_at
profiles.stripe_customer_id / stripe_subscription_id
profiles.revenuecat_app_user_id
subscription_events             -- audit log
```

**Client:**

- `subscriptionService.ts` — RevenueCat (native) + Stripe (web)
- `entitlements.ts` — feature limits per tier
- `ProFeatureGate.tsx` — blocks VR/simulacra without Pro
- `usageLimits.ts` — **localStorage only** (not server-enforced)

**Edge:**

- `stripe-webhook`, `revenuecat-webhook` — update `profiles.subscription_tier`
- AI edge functions do **not** check tier today

### Tier matrix (source: `entitlements.ts`)

| Feature | Free | Plus | Pro |
|---------|------|------|-----|
| AI images / month | 5 | ∞ | ∞ |
| Cloud sync | ✗ | ✓ | ✓ |
| Wearables | ✗ | ✓ | ✓ |
| VR / simulacra | ✗ | ✗ | ✓ |
| Advanced analytics | ✗ | ✓ | ✓ |
| Export PDF | ✗ | ✓ | ✓ |

**Products:**

- `everdream_plus_monthly` — EverDream+ ($5.99/mo)
- `everdream_pro_monthly` — EverDream Pro

### Goals

- `profiles.subscription_tier` is the single access-level field (no duplicate “tier” tables)
- Stripe (web) and RevenueCat (iOS/Android) both write to `profiles`
- Server-side usage limits enforced before AI generation
- Client reads tier from profile on every session refresh

### Schema addition (`009_usage_counters.sql`)

```sql
CREATE TABLE IF NOT EXISTS public.usage_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_month TEXT NOT NULL,  -- 'YYYY-MM'
  images_generated INT NOT NULL DEFAULT 0,
  videos_generated INT NOT NULL DEFAULT 0,
  analyses_run INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_month)
);

CREATE OR REPLACE FUNCTION public.check_tier_limit(
  p_user_id UUID,
  p_feature TEXT  -- 'image' | 'video' | 'analysis' | 'vr'
)
RETURNS JSONB AS $$
  -- Read profiles.subscription_tier + usage_counters for current month
  -- Return { allowed: bool, tier: text, remaining: int, limit: int }
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_amount INT DEFAULT 1
)
RETURNS VOID AS $$
  -- Upsert usage_counters for current month
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Payment ops checklist

| Step | Platform | Action |
|------|----------|--------|
| 1 | Stripe | Create products/prices; set `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_PRO_MONTHLY` secrets |
| 2 | Stripe | Deploy `stripe-checkout`, `stripe-portal`, `stripe-webhook`; set `STRIPE_WEBHOOK_SECRET` |
| 3 | RevenueCat | Create project; entitlements `plus`, `pro`; link App Store + Play products |
| 4 | RevenueCat | Deploy `revenuecat-webhook`; set `REVENUECAT_WEBHOOK_SECRET` |
| 5 | Client | Set `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_REVENUECAT_*_API_KEY` in `.env` |
| 6 | Verify | Test purchase → webhook → `profiles.subscription_tier` updated → app reflects tier |

### Client changes

| File | Change |
|------|--------|
| `src/lib/subscriptions/usageLimits.ts` | Call `increment_usage` RPC after generation; read limits from `check_tier_limit` |
| `src/hooks/useSubscription.ts` | Refresh tier after purchase / on focus |
| `src/components/settings/ProfileAndSettings.tsx` | Upgrade CTA → Stripe checkout or RevenueCat paywall |
| Edge functions | Call `check_tier_limit` before `generate-image` / `generate-media` |

### Acceptance criteria

- [ ] Free user blocked at 6th image in a calendar month (server-side)
- [ ] Plus user gets unlimited images; Pro unlocks VR gate
- [ ] Stripe test checkout updates `subscription_tier` within 30s
- [ ] RevenueCat sandbox purchase updates tier on mobile
- [ ] Expired subscription reverts effective tier to `free`
- [ ] `subscription_events` logs every webhook payload

---

## 4. AI media providers

**Status:** Fragmented across client + multiple edge functions  
**Priority:** P1

### Current state

#### Dream text analysis

| Layer | Provider chain |
|-------|----------------|
| Client | `analyzeDreamWithAI()` → Supabase `analyze-dream` edge |
| Edge `analyze-dream` | OpenRouter → Gemini → OpenAI → NVIDIA Nemotron |
| Coolify (Expo stack) | `ai-proxy` with Qwen — **not unified** with `ed.app.new` |

#### Dream image generation

| Priority | Provider | Where |
|----------|----------|-------|
| 1 | **Ollama NWE** (`HSR-DeepThink/nwe`) | Laptop via Vite proxy `/ollama` → `localhost:11434` |
| 2 | Supabase `generate-image` edge | HF SDXL → Fal.ai |
| 3 | Pollinations direct URL | Client fallback (free) |

**Dev setup (laptop testing):**

```env
VITE_OLLAMA_URL=/ollama
VITE_OLLAMA_ENABLED=true
```

`vite.config.ts` proxies `/ollama` → `http://localhost:11434`.  
Production option documented: ngrok tunnel to same Windows host.

#### Dream video generation

| Type | Provider | Where |
|------|----------|-------|
| Parallax (pseudo-video) | Canvas + depth map | `lib/assets/pipeline.ts` — **free, client-side** |
| True AI video | Replicate SVD | `lib/videoGen.ts` — needs `VITE_REPLICATE_API_TOKEN` (client) |
| 3D / skybox / mesh | Meshy, Blockade, Tripo, Runway | `lib/assets/pipeline.ts` — separate asset types |

**Higgsfield:** not integrated anywhere in repo today.

### Goals

- Single env switch to move from **$0 dev** (Ollama) to **paid prod** (Higgsfield / Fal / OpenRouter)
- All generation routed through one edge function (keys server-side)
- Tier + usage checks before every generation
- Provider logged per job for cost tracking

### Architecture

```
Client
  └─ supabase.functions.invoke('generate-media', {
       type: 'image' | 'video',
       prompt: string,
       dreamId?: string,
       style?: string,
     })
       │
       ├─ auth.getUser() → profiles.id
       ├─ check_tier_limit(user_id, type)
       ├─ route by MEDIA_IMAGE_PROVIDER / MEDIA_VIDEO_PROVIDER
       ├─ increment_usage on success
       └─ insert generation_jobs row
```

### New edge function: `generate-media`

**Replaces / consolidates:** client-side `dreamAssetGenerator.ts` provider chain, direct Pollinations calls, client `videoGen.ts` for production paths.

**Request:**

```json
{
  "type": "image",
  "prompt": "floating city above clouds...",
  "style": "dreamlike",
  "width": 1024,
  "height": 1024,
  "dreamId": "uuid-optional"
}
```

**Response:**

```json
{
  "url": "https://...",
  "provider": "higgsfield",
  "model": "flux-pro",
  "jobId": "uuid"
}
```

### Provider adapters

#### Image providers

| Adapter ID | Env secret | Cost profile | Notes |
|------------|------------|--------------|-------|
| `ollama` | `OLLAMA_URL` (ngrok or internal) | $0 | Dev/default; model `HSR-DeepThink/nwe` |
| `pollinations` | none | $0 | Fallback; inconsistent quality |
| `fal` | `FAL_AI_KEY` | ~$0.001/image | Already in `generate-image` |
| `huggingface` | `HF_INFERENCE_API_KEY` | Free tier | SDXL; cold-start delays |
| `openrouter` | `OPENROUTER_API_KEY` | ~$0.01–0.05/image | Route to FLUX/SD models via chat/completions or image endpoints |
| `higgsfield` | `HIGGSFIELD_API_KEY` | Paid credits | Best cinematic quality; use `higgsfield-client` patterns |

#### Video providers

| Adapter ID | Env secret | Cost profile | Notes |
|------------|------------|--------------|-------|
| `parallax` | none | $0 | Client-side canvas; keep for free tier |
| `replicate` | `REPLICATE_API_TOKEN` | ~$0.05–0.20/clip | SVD img2vid; already in `videoGen.ts` |
| `fal` | `FAL_AI_KEY` | Pay-per-use | Fast video models on fal.ai |
| `runway` | `RUNWAY_API_KEY` | Higher | Image-to-video |
| `higgsfield` | `HIGGSFIELD_API_KEY` | Paid credits | Recommended prod default for dream clips |

### Environment switch (Coolify / Supabase secrets)

```bash
# Development (laptop Ollama via ngrok)
MEDIA_IMAGE_PROVIDER=ollama
OLLAMA_URL=https://YOUR-NGROK.ngrok-free.app
MEDIA_VIDEO_PROVIDER=parallax   # client-only; edge returns { deferToClient: true }

# Production — quality
MEDIA_IMAGE_PROVIDER=higgsfield
MEDIA_VIDEO_PROVIDER=higgsfield
HIGGSFIELD_API_KEY=...

# Production — budget
MEDIA_IMAGE_PROVIDER=fal
MEDIA_VIDEO_PROVIDER=replicate
FAL_AI_KEY=...
REPLICATE_API_TOKEN=...

# Analysis (unchanged or unified)
ANALYSIS_PROVIDER=openrouter
OPENROUTER_API_KEY=...
# Optional: route to Coolify ai-proxy / Qwen
# ANALYSIS_PROVIDER=qwen
# QWEN_API_URL=...
```

### Schema (`010_generation_jobs.sql`)

```sql
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dream_id UUID REFERENCES public.dreams(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('image', 'video', 'analysis')),
  provider TEXT NOT NULL,
  model TEXT,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  result_url TEXT,
  error TEXT,
  cost_estimate_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### Client changes

| File | Change |
|------|--------|
| `src/modules/sleep/dreamAssetGenerator.ts` | Thin wrapper → `generate-media` edge only |
| `src/lib/videoGen.ts` | Prod path → edge; keep parallax locally for free tier |
| `src/lib/dreamPipeline.ts` | Update step descriptions; single invoke |
| `src/lib/api/mediaProvider.ts` | **New** — `generateDreamImage()`, `generateDreamVideo()` |
| `src/config/features.ts` | Optional `FEATURE_MEDIA_PROVIDER` override for dev |
| `src/components/admin/InferenceProviders.tsx` | Add Higgsfield, Ollama, Fal health checks |

### Fallback chain (edge-internal)

```
IMAGE:  configured provider → fal → pollinations → 502
VIDEO:  configured provider → replicate → fal → { deferToClient: parallax }
```

### Acceptance criteria

- [ ] `MEDIA_IMAGE_PROVIDER=ollama` works with laptop + ngrok in dev
- [ ] Flip to `higgsfield` with only env change (no client redeploy)
- [ ] Free-tier user blocked when monthly image limit exceeded
- [ ] Every generation writes `generation_jobs` + increments `usage_counters`
- [ ] No API keys in client bundle (except anon key)
- [ ] `analyze-dream` optionally unified under same provider config pattern
- [ ] Admin panel shows last-known status per provider

---

## 5. Cross-cutting: access level on user account

**Rule:** `profiles.subscription_tier` is the canonical access level. Do not add a parallel `access_level` column unless a future B2B/API product needs it.

**Read path:**

```
auth.users.id
  → profiles (auth_user_id)
    → subscription_tier, subscription_expires_at
      → check_tier_limit() for feature gates
      → entitlements.ts on client (cache + refresh)
```

**Write path:**

```
Stripe / RevenueCat webhook
  → profiles.subscription_tier + subscription_source + subscription_expires_at
  → subscription_events (audit)
Manual override (pilot):
  → UPDATE profiles SET subscription_tier = 'pro', subscription_source = 'manual'
```

---

## 6. Implementation PR plan

| PR | Title | Spec | Files (indicative) |
|----|-------|------|-------------------|
| PR-1 | Server-side tier limits + usage_counters | §3 | `009_usage_counters.sql`, edge middleware, `usageLimits.ts` |
| PR-2 | Stripe/RevenueCat E2E verification | §3 | `.env.example`, webhook tests, ProfileAndSettings upgrade flow |
| PR-3 | `generate-media` edge + provider adapters | §4 | `supabase/functions/generate-media/`, `mediaProvider.ts` |
| PR-4 | Higgsfield adapter + env docs | §4 | adapter, secrets template, admin health |
| PR-5 | Referrals schema + signup hook | §2 | `008_referrals.sql`, `LoginScreen.tsx` |
| PR-6 | Friends schema + ProfileHub backend | §1 | `007_friends.sql`, `useFriends.ts` |

---

## 7. Ops: “ready for money” checklist

- [ ] Coolify secrets: `OPENROUTER_API_KEY`, `FAL_AI_KEY`, `HIGGSFIELD_API_KEY` (when chosen)
- [ ] Stripe live/test mode products created
- [ ] RevenueCat entitlements linked to store products
- [ ] DNS `supabase.n1g3.com` live
- [ ] `MEDIA_IMAGE_PROVIDER` set for prod
- [ ] RLS tested with two users
- [ ] Privacy policy mentions AI providers (Higgsfield, OpenRouter, etc.)

---

## Key files (today)

| Area | Path |
|------|------|
| Subscriptions schema | `ed.app.new/supabase/migrations/005_subscriptions.sql` |
| Entitlements | `ed.app.new/src/lib/subscriptions/entitlements.ts` |
| Usage (local only) | `ed.app.new/src/lib/subscriptions/usageLimits.ts` |
| Image gen (client) | `ed.app.new/src/modules/sleep/dreamAssetGenerator.ts` |
| Image gen (edge) | `ed.app.new/supabase/functions/generate-image/index.ts` |
| Analysis (edge) | `ed.app.new/supabase/functions/analyze-dream/index.ts` |
| Video (client) | `ed.app.new/src/lib/videoGen.ts` |
| Parallax video | `ed.app.new/src/lib/assets/pipeline.ts` |
| Friends UI (mock) | `ed.app.new/src/screens/ProfileHubScreen.tsx` |
| Go-live checklist | `docs/coolify-go-live-checklist.md` |