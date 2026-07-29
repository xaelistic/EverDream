# EverDream Website Map

Public marketing + community site for **everdream.app** (and/or `everdream-landing`).  
Complements the mobile/PWA app (`ed.app.new`) and Discord bot workflows.

---

## Goals

1. **Acquire** — Introduce the app and drive installs (PWA / App Store / Play).
2. **Educate** — Features, sleep + dream science, roadmap, pricing.
3. **Engage** — Gallery of public dreams, leaderboards, community (Discord parity).
4. **Convert** — Referrals, subscriptions, share loops (virality).

---

## Information architecture

```
/                     Home (hero, value props, download CTA, featured dreams)
/features             Features deep-dive
/how-it-works         Journey: journal → assets → share → sleep insights
/gallery              Public dream gallery (filterable)
/gallery/:id          Single public dream / share card
/leaderboards         Streaks, rarity, shares, referrals
/roadmap              Goals, plans, product vision
/pricing              Free / Plus / Pro + referral incentives
/download             Store badges + PWA install + QR
/about                Mission, team, EDI
/blog | /learn        Education articles (reuse app sleep education)
/discord              Redirect / embed community join
/privacy              Privacy policy
/terms                Terms of use
/r/:code              Referral landing (?ref=CODE) → download + apply code
```

Optional authenticated web surfaces (later):

```
/app                  Redirect into PWA / hash app
/profile/:handle      Public profile (mirrors app PublicProfileScreen)
```

---

## Page briefs

### 1. Home `/`

| Block | Content |
|--------|---------|
| Hero | “Capture dreams. Understand sleep. Share wonder.” Primary CTA: **Get the app**. Secondary: **Explore gallery**. |
| Social proof | Dream count, active dreamers, Discord members (live stats when available). |
| Feature grid | Journal · AI art · Wearables · Achievements · Referrals · Simulacra/VR (if enabled). |
| Featured gallery strip | 6–12 public dreams from Discord + in-app shares. |
| Leaderboard teaser | Top streaks / most shared this week. |
| Download band | iOS · Android · Open web app. |
| Footer | Links, Discord, privacy, terms. |

### 2. Features `/features`

- **Dream journal** — text, voice, video, photo OCR.
- **AI dream assets** — narrative, image, rarity, keepsakes.
- **Sleep tracker** — stages, scores, wearables connect (`/wearables` in app).
- **Daily education** — full-screen learn pieces (not buried in tracker).
- **Social** — share cards, friends, public profiles.
- **Achievements & referrals** — first journal, first share, first friend; tokens + free month.
- **Economy** (flagged) — XAEL, mint, combine, Discord bot commands.

### 3. How it works `/how-it-works`

Step flow:

1. Morning capture → 2. Analysis & art → 3. Sleep context from wearables →  
4. Share / achieve → 5. Invite friends → earn generation tokens.

### 4. Gallery `/gallery`

Parity with **Discord workflow** public sharing:

| Capability | Notes |
|------------|--------|
| Masonry grid | Image + nugget + emotion + rarity badge |
| Filters | Category, emotion, rarity, date, “featured” |
| Sort | Newest, most shared, highest rarity |
| Open detail | Full narrative teaser, share CTA, “Made in EverDream” |
| Submit path | Only public shares from app (`#/share/:slug`) |
| Moderation | Report, hide NSFW, admin queue |

Data source: Supabase public shares + Discord-posted dream images (webhook ingest).

### 5. Leaderboards `/leaderboards`

| Board | Metric | Cadence |
|-------|--------|---------|
| Streak masters | Current journal streak | Live / weekly |
| Prolific dreamers | Dreams logged | Monthly |
| Share champions | Public shares / viral cards | Weekly (virality) |
| Rare collectors | High-rarity assets | All-time |
| Referral heroes | Signups / paid conversions | Monthly |
| Discord seasons | Event scores (bot) | Seasonal |

Privacy: opt-in display names / handles only.

### 6. Roadmap `/roadmap`

- **Now** — Journal, sleep tracker, wearables, achievements, referrals, PWA.
- **Next** — Full friends graph, backend referral claims, website gallery live.
- **Later** — Simulacra/VR, exchange, deeper coaching (SPEC-09/10).

Pull from product specs + Discord announcements.

### 7. Pricing `/pricing`

| Tier | Highlights |
|------|------------|
| Free | Journal, limited AI images/month, local-first |
| Plus | Unlimited images, wearables, sync, analytics |
| Pro | VR/simulacra, advanced exports |

**Referral incentives (site + app):**

- Referrer: **+5 generation tokens** per signup.
- Referee: **+3 welcome tokens** on first use of code.
- Both: **1 free month** when referee pays for Plus/Pro.

### 8. Download `/download`

- Smart platform detection.
- PWA install instructions.
- Deep link: `https://app.everdream…/#/` with `?ref=CODE`.
- QR for IRL / Discord.

### 9. Learn / Blog `/learn`

Reuse modules from `sleepEducation.ts` + long-form from `SleepEducationPage`.  
SEO landing pages for “lucid dreaming journal”, “REM sleep”, etc.

### 10. Discord bridge

Mirror bot capabilities for web visitors:

| Discord | Website |
|---------|---------|
| Share / showcase dreams | Gallery |
| Competitions / seasons | Leaderboards + seasonal pages |
| `/dream-combine`, `/simulacrum`, `/xael-price` | Feature docs + “Open in app / Discord” CTAs |
| Announcements | Roadmap + blog |

CTA everywhere: **Join Discord** + **Get the app**.

---

## Referral funnel (web)

```
Friend clicks /r/CODE or /?ref=CODE
  → Landing with personalised hero
  → Download / open app (code stored in session)
  → Sign up → applyReferralCode
  → Referrer: +tokens + first_referral achievement
  → If subscribe → free month credits + referral_subscriber achievement
```

App already implements client ledger: `ed.app.new/src/lib/referral.ts`.

---

## Technical sketch (landing repo)

Recommended stack (align with `everdream-landing` / Vite):

| Layer | Choice |
|-------|--------|
| Framework | Vite + React (or Astro for SEO marketing pages) |
| Styling | Tailwind — match app parchment/sage/dusk tokens |
| CMS | MDX for learn + roadmap; optional Sanity later |
| API | Supabase: `public_shares`, `leaderboard_snapshots`, `profiles` |
| Analytics | PostHog (already in app monorepo) |
| Hosting | Coolify / same infra as app |

### Suggested routes → components

```
src/pages/
  index.tsx
  features.tsx
  gallery/index.tsx
  gallery/[id].tsx
  leaderboards.tsx
  roadmap.tsx
  pricing.tsx
  download.tsx
  learn/[slug].tsx
  r/[code].tsx
src/components/
  Hero, FeatureGrid, GalleryGrid, LeaderboardTable,
  DownloadBand, ReferralBanner, DiscordCta, SiteNav, SiteFooter
src/lib/
  api/gallery.ts, api/leaderboards.ts, referral.ts
```

---

## Content & design principles

- **Editorial night journal** — serif headlines, cream/parchment, sage CTAs (match app).
- **Dream-first media** — large imagery, short text, strong share cards.
- **No fake social proof** — empty states over placeholder friends (SPEC-19 spirit).
- **Privacy default** — gallery is opt-in public shares only.

---

## MVP build order (website)

1. **Shell** — nav, footer, home hero, download CTAs.
2. **Features + How it works + Pricing** (static).
3. **Referral landing** `/r/:code` + `?ref=` capture.
4. **Gallery** read-only from public shares API.
5. **Leaderboards** weekly static → then live.
6. **Learn** pages from existing education modules.
7. **Discord / roadmap** integration.

---

## App ↔ web link map

| App surface | Website |
|-------------|---------|
| Home education “Learn more” | `/learn/:slug` (optional cross-link) |
| Share modal public link | `/gallery/:id` or `/share/:slug` |
| Achievements referrals | `/r/:code`, `/pricing#referrals` |
| Wearables | `/features#wearables` |
| Discord bot | `/discord`, gallery ingest |

---

## Success metrics

- Install conversion rate from landing.
- Gallery → app open rate.
- Referral code attach rate on signup.
- Share rate (first_share achievement) and K-factor.
- Discord joins from site.

---

*Document created to guide website build alongside app achievements, education fullscreen, and tracker CTAs (2026-07).*
