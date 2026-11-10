# EverDream project plan — 10 Nov 2026

Canonical app: `C:\Users\xaeli\Projects\EverDream` (`ed.app.new`), git `main` @ `32054cf` (30 Aug 2026), remote `xaelistic/EverDream`. No open GitHub issues. One uncommitted fix: `ed.app.new/supabase/migrations/20260825000001_dream_pipeline_status.sql` (the hourly pipeline cron script on `main` can abort; the working copy wraps `cron.unschedule` so a missing job does not roll the migration back).

Two older checkouts of the same repo are behind this tree. Do not build from them.

| Tree | Last commit | Status |
|---|---|---|
| `C:\Users\xaeli\Projects\EverDream` | 30 Aug 2026 | Current |
| `C:\Users\xaeli\Documents\GitHub\EverDream` | 13 Aug 2026 | Behind, plus local image experiments |
| `C:\Users\xaeli\Documents\GitHub\EDI\EverDream` | 27 Jul 2026 | Behind |

Live PWA: [https://everdream.n1g3.com](https://everdream.n1g3.com) returned 200 on 10 Nov 2026. Pricing, privacy, terms, verification, and `/exchange/` are up. `https://everdream.app` ended in a 404. `https://www.everdream.app` does not resolve. The live `<meta description>` still says “NFT minting.” Coolify’s API token on this machine was refused, so container health was not rechecked. Hosting from the repo docs: Coolify `185.249.74.204`, PWA app `qg4o8sw4wgcss8kc0wk88gg0`, Supabase `supabase-everdream-live` (`w9b3r7ces8npevhqcjwn4lzk`) at `https://supabase.n1g3.com`.

This plan has three phases. Phase 1 is the only build. Wearables start after the journal, comic, and clip are live and billed correctly. OpenBCI-class hardware starts after one real wearable is honest.

---

## What this version already is

EverDream is a signed-in dream journal (text, audio, video, photo upload) with AI analysis, a still image, an optional 2–3 panel comic, and an optional short clip. Sleep is a phone estimate plus a wearable screen that is mostly a scaffold. Billing is Stripe plans (Free, Plus $5.99, Pro $12.99) and credit packs.

Flags already hide NFT, 3D mesh, VR, and skins (`src/config/features.ts`). The code, routes, public pages, and copy for those products are still in the tree and on the live site.

The media path that actually runs:

1. Capture saves the dream. Audio and video transcribe, then `generateDreamImage` spends 1 server credit and calls the `generate-image` edge function.
2. OpenRouter is the only provider that persists a public image. Default still model is `black-forest-labs/flux.2-klein-4b`. Readable in-world text upgrades to `black-forest-labs/flux.2-flex`. Fal fast-SDXL and Hugging Face SDXL are fallbacks on URLs that are likely dead (`fal.ai/api/…`, legacy `api-inference.huggingface.co`). Pollinations is no longer called.
3. Medium dreams (≥90 words or one scene cue) get 2 comic panels. Long dreams (≥220 words or ≥3 cues) get 3. Short dreams get a still only. The user taps **Generate N-panel comic**. Each panel is its own Flux call at the **quality** model. Captions are drawn in canvas (`storyboardComic.ts`). The model is told not to letter the image.
4. **Generate clip** appears only after two panels exist. `generate-video` sends the first and last public stills to OpenRouter image-to-video. Default model `bytedance/seedance-2.0-fast`, fallback `alibaba/wan-2.6`. Duration 6s (medium) or 8s (long), 720p, or 1080p on long dreams. The file is saved on `parallaxVideoUrl`.

That architecture is the right one. It is not shippable until the bugs in the next sections are fixed. The comic page is built and then hidden. The clip button can be replaced by an old Ken Burns blob. Credits are two ledgers that disagree. Edge functions will generate for anyone who has the public anon key.

---

## Phase 1 — ship this version

**Outcome.** A person can sign up on `everdream.n1g3.com`, record a dream by voice or text, get an analysis and a still, turn a longer dream into a comic page they can see and share, and turn that page into one short clip. Capture stays free. Stills, panels, and clips spend credits. Nothing on screen promises NFTs, VR, XAEL, or a wearable that is not connected.

**Out of this phase.** New wearable brands, HealthKit, OpenBCI, store binaries, lucid-dream induction, friends as a growth loop, Spotify, Discord verification as a product.

### 1. Lock the product surface

Strip or unmount these before the next production deploy. Hiding with a flag is not enough when the page is already on the public URL.

| Remove from the user | Why |
|---|---|
| `/exchange/` and `#/exchange` | XAEL exchange. Flag is off. Live page still tells people to open it. Hash falls through to Home. |
| NFT, combine, simulacra, VR, mesh, `DreamVRScreen`, `DreamStudio` | Flagged off or unimported. `DreamStudio` still posts to Replicate with a browser token pattern. |
| `ProfileAndSettings.tsx`, `EnhancedAuth.tsx` | Nothing imports them. Settings screen has `href="#"` legal links and a fake “Connected” timeout, including WHOOP. |
| `PublicProfileScreen` share URL `#/profile/{handle}` | Parser has no `profile` route. Copied links open Home. |
| Skins picker | Flag off. Stop loading six skin CSS files on every boot until a theme is a real decision. |
| “Building XAEL” in the header | Processing chip should say the dream is being read. |
| PWA name “Lucid” | `vite.config.ts` and `PWAInstallPrompt.tsx`. Manifest already says EverDream. |
| Live meta description “NFT minting” | `index.html`. |
| Discord verify page as a primary path | `verification.html` links `https://discord.gg/everdream`. Keep legal pages. Do not send new users through Discord. |
| 12 wearable cards and “Load sample data” | Phase 2. Sample nights are labeled `oura` / `fitbit` / `garmin` and can land in `sleep_sessions`. |
| Facial-emotion as a selling point | Camera capture can keep a private mood tag. Do not show it as a feature on Home or More. |
| OCR / PDF import as a More item | `ocr.ts` returns empty text. Record screen already says PDF import is not ready. Hide **Import journal photos** until OCR works. |
| `video-journal` as a second recorder | `#/video-journal` is a parallel camera flow. Record already has Video. One recorder. |
| Admin hint on the public admin route | `#/admin` tells strangers to sign in as `admin@everdream.test`. |
| Test accounts in the client | `PhoneTestTools.tsx` is imported from `App.tsx` with password `EverDream!Test2026`. The panel returns null outside dev. Move it behind a dev-only dynamic import and rotate any live users seeded from `scripts/seed-admin.mjs`. |
| Contracts, discord-bot, vscode-agent, `legacy/` | Leave in the repo if useful. Do not deploy them with the PWA. |

Keep: Home, Journal, Tracker (phone estimate, labeled as a phone estimate), Record (audio and text first), Dream detail, Share, Insights, Billing / upgrade / credits, Privacy, Achievements only if the rewards are real tokens and not NFTs, Friends only if add-by-code still works after a smoke test. Wearables stays in More as a single “coming in the next release” row, or hidden, until Phase 2.

### 2. Cheaper images — stay on Klein, stop using Flex for every panel

Prices checked 10 Nov 2026. They move. Re-read OpenRouter `usage.cost` on a real call before changing the default.

| Model | About | Use |
|---|---|---|
| `black-forest-labs/flux.2-klein-4b` | $0.014 for the first megapixel on OpenRouter (official BFL rate). Already the hero default. | Every automatic still. Every comic panel. |
| `black-forest-labs/flux.2-flex` | About $0.05 per default image (OpenRouter measurement, 11 Sep 2026). | Only when the user taps **Sharper panel**, or when the prompt truly needs in-world writing. |
| FLUX.1 schnell ~$0.003, Z-Image Turbo ~$0.005 | Cheaper drafts. Weaker prompt match and weaker identity across panels. | Bake-off later if Klein margin is still tight. Do not switch the default on price pages that quote $0.001. That is far under the BFL list. |
| GPT Image, Nano Banana, Flux Max, Seedream Pro | $0.03–$0.13 | Wrong default for a nightly journal. |

A 3-panel comic on Flex is about $0.15 of model cost before the clip. The same comic on Klein is about $0.042. Personalization already lives in the prompt (`imageTaste.ts`), which is the right place.

Implementation:

- `routeImageModel`: `intent: 'storyboard'` uses `IMAGE_MODELS.cheap`, not `quality`.
- Panel 1 is the reference. Panels 2 and 3 pass `referenceImage` (the edge function already accepts it) so the character and light stay related. Generate panel 1, then the rest together.
- Hero stills stay on Klein unless the prompt matches the existing in-world-text rule.
- Fal and Hugging Face fallbacks: delete them or point them at live hosts. A missing OpenRouter key should fail with a clear error, not a silent data-URL that the comic cannot composite.
- Leave `VITE_OLLAMA_ENABLED` unset in production. That path skips the credit debit.

### 3. Comic strip — the page is the deliverable

The pipeline is already correct: split the telling in code, paint stills with no lettering, draw captions in canvas, stamp “EVERDREAM · DREAM STORYBOARD” and `everdream.app` on the page. Image models still garble speech bubbles. Do not ask them to draw the comic.

What the user should see:

1. On the dream, under the still: **Make a comic** when the telling is medium or long. The button shows the credit cost from the server balance (`2 credits` or `3 credits`) and the remaining balance.
2. While it runs: panel 1, then 2, then 3, each appearing as it lands. A failure keeps the finished panels and refunds only the failed calls.
3. When it finishes, the hero is the assembled page (`storyboardComicUrl`), full width, readable captions. Panels open in the lightbox from that page. The 2-up grid of pre-captioned crops is the wrong hero.
4. **Share comic** uses that page. **Regenerate page** and **Sharper panel** exist. Today a failed canvas assemble only `console.warn`s, the raw frames still count as success, and the button disappears.
5. Short dreams offer **Add a second beat** (user picks a second sentence, 2 credits) so a one-line dream can still become a strip. Default remains one still, so a short dream is not forced into a padded comic (`dreamScenes.ts` duplicates text when the telling is shorter than the panel count).

CORS: `loadImage` sets `crossOrigin = 'anonymous'`. Stills must be on `public-assets` with CORS that allows the PWA origin, or the page stays blank. Persist OpenRouter bytes there before captioning. Do not caption a 30-day signed `dream-media` URL and call it done.

Credits: one server `consume_image_credits` per panel, refund that panel if its call throws. Remove the extra `recordImageGeneration()` loop in `DreamDetailScreen`. That local counter uses `aiImagesPerMonth: 0` for Free, so the 14 starter credits never unlock the comic button.

### 4. Video — one clip through the comic, on a cheaper model

The clip is image-to-video from the first and last storyboard stills, with the dream text as the motion prompt. That is the product. A Ken Burns orbit is a different thing and must not occupy the same field.

Current default `bytedance/seedance-2.0-fast` is the expensive choice. Published rates in Nov 2026 run roughly $0.04–$0.12 per second. A 6 second 720p clip near $0.09/s is about $0.54. Plus credits are $5.99 / 40 = $0.15 each. Two credits ($0.30) do not cover that clip, and `generateDreamClip` does not debit credits at all. Long dreams ask for 8 seconds at 1080p on `seedance-2.0`, which is worse.

Decisions for v1:

- Cap every clip at **5 seconds, 720p, 1:1, no audio**.
- Change the default to the cheapest allowlisted model that accepts first and last frames and survives a 10-dream bake-off. Candidates already in `VIDEO_MODEL_ALLOWLIST`: `google/veo-3.1-lite` (Veo 3.1 official from about $0.03/s) and `alibaba/wan-2.6` (about $0.05/s). Add a bake-off row for a ~$0.01–$0.02/s image-to-video model (Vidu Q2-class or Wan 2.2-class) only if OpenRouter lists it and first/last frame works. Keep Seedance 2.0 as an explicit **Richer clip** that costs more credits.
- Price the default clip at **4 credits** until a week of `generation_jobs.cost_usd` shows 4 credits covers cost plus margin. Richer clip is 8 credits. Show the number on the button.
- Store the file on `clipUrl`. Leave `parallaxVideoUrl` for the old canvas orbit and stop writing new Ken Burns blobs into it (`DreamJournalApp.tsx` save path). The detail screen currently treats any `parallaxVideoUrl` as the finished clip and hides **Generate clip**.
- Copy: “A 5 second clip from the opening to the last panel.” The request does not animate the middle panel. Do not say it plays through every beat until middle frames are actually sent.
- Polling: the edge function waits 110s, then can return 202 with `jobId`. Confirm the client keeps polling. If the isolate dies before the 202, the provider has billed and the user has no clip. Download the mp4 without sending `Authorization: Bearer` and `Content-Type: application/json` to the CDN URL (`downloadClip` does that today).
- If the video provider fails, the comic page is still the deliverable. Offer **Save comic** and a retry. Do not substitute a silent Ken Burns file.

### 5. Get this build live

Order matters. Deploying the current `main` as-is publishes the admin-signup hole and an unmetered image API.

1. **Fix P0 in this list** (signup role, edge-function auth and debit, delete-account honesty, test passwords). Apply the uncommitted cron migration after the PL/pgSQL fix is committed.
2. **One credit ledger.** `consume_image_credits` / `refund_image_credits` inside `generate-image` and `generate-video`, keyed to `auth.uid()`. Reject the anon key. `complete-dream-pipeline` must not mint stills on the service role for free.
3. **Comic and clip UX** in section 3 and 4. Switch storyboard off Flex. Point the clip at the cheaper model. Separate `clipUrl` from Ken Burns.
4. **Smoke on production-like data**, two real users: sign up, voice dream, still appears, credits drop by 1, second user cannot read the dream, medium dream makes a comic page, clip returns a playable mp4, failed call refunds, Stripe test checkout lands on `#/billing` with the plan applied, delete account removes dreams and storage.
5. **Deploy** Coolify app `qg4o8sw4wgcss8kc0wk88gg0` from `main`, base directory `/ed.app.new`. Redeploy `generate-image`, `generate-video`, `analyze-dream`, `transcribe-audio`, `complete-dream-pipeline`, `stripe-checkout`, `stripe-webhook`. Set `OPENROUTER_API_KEY`, `SUPABASE_PUBLIC_URL=https://supabase.n1g3.com`. Confirm `public-assets` is public and CORS allows `https://everdream.n1g3.com`.
6. **Canonical host.** Keep `https://everdream.n1g3.com` as the live origin until `everdream.app` is a real 200. Update CORS, Stripe return URLs, and the comic footer to the host that actually resolves. Privacy and terms stay linked from More and from the footer of pricing.
7. **Tag** `pwa-v1` after the smoke. No store binaries in this tag.

`docs/coolify-go-live-checklist.md` (2 Jul 2026) is stale. It still lists `ai-proxy`, `nft-mint`, and Qwen as the launch gate, and it calls the database `supabase-test`. The launch gate is the list in step 5. Thirdweb, Amoy, and NFT webhooks wait.

---

## Outstanding bugs, in priority order

No GitHub issues are open. These are still in the 30 Aug tree unless noted. Live database state was not queried.

### P0 — do not call the deploy “live” until these are closed

| # | Bug | Evidence |
|---|---|---|
| 1 | Signup can set `is_admin` and `subscription_tier` from `raw_user_meta_data`. Admin skips `consume_image_credits`. The lock trigger is `BEFORE UPDATE` only, so the insert on signup is open. | `supabase/migrations/20260824000001_free_starter_credits.sql` `handle_new_user` |
| 2 | `generate-image`, `generate-video`, `analyze-dream`, and `transcribe-audio` do not require a user or debit credits. `verify_jwt = true` still accepts the public anon JWT. Results go to public `public-assets/generated/`. | Edge functions; `docs/SECURITY_REDTEAM_2026-08-23.md` |
| 3 | Hourly catch-up (`complete-dream-pipeline`, `verify_jwt = false`) generates stills with the service role and does not debit. The cron migration on `main` is invalid PL/pgSQL (`EXCEPTION` inside `IF`), so the job may never have installed. Working tree has the syntax fix, uncommitted. | `20260825000001_dream_pipeline_status.sql` |
| 4 | “Delete all data” clears local keys, does not delete cloud dreams or the auth user, and the dialog talks like erasure. | `DreamJournalApp.tsx` `deleteAllUserData`; `privacy.html` |
| 5 | Test password `EverDream!Test2026` and `admin@everdream.test` are in the client and on the public admin empty state. Seed script uses the same password. Whether those users exist on the live project is unknown. Rotate if they do. | `PhoneTestTools.tsx`, `App.tsx`, `DreamJournalApp.tsx` ~2795, `scripts/seed-admin.mjs` |

### P1 — the dream → comic → clip loop is unreliable or mispriced

| # | Bug | Evidence |
|---|---|---|
| 6 | Free comic and clip use a local counter whose free limit is 0, so the 14 starter credits never enable the buttons. | `entitlements.ts`, `usageLimits.ts`, `DreamDetailScreen` `spendCredits` |
| 7 | Storyboard also calls `generateDreamImage`, which debits the server ledger. The button debits the local ledger first. Two books. A failed panel refunds the server credit only. | `dreamAssetGenerator.ts`, `DreamDetailScreen.tsx` |
| 8 | Plus/Pro UI says the comic and clip are included. `plans.ts` says they use credits. The clip never calls `consumeImageCredits`. | `DreamDetailScreen.tsx` ~949 and ~1000; `plans.ts` |
| 9 | Save writes a Ken Burns blob into `parallaxVideoUrl`. The clip UI treats that as the finished video and hides **Generate clip**. | `DreamJournalApp.tsx` ~1356; `DreamDetailScreen.tsx` ~1012 |
| 10 | Opening a dream with `processingStatus === 'processing'` starts a second transcribe and image run. | `DreamDetailScreen.tsx` retry effect; `audioJournal.ts` |
| 11 | Comic assemble failure is a `console.warn`. Frames still save, the button is gone, the page is missing. Canvas dies when the still has no CORS. | `storyboardComic.ts`, `DreamDetailScreen.tsx` ~392 |
| 12 | Video download sends the OpenRouter bearer token to the CDN URL. In-function poll cap is 110s. A dead isolate loses the job id after the provider has billed. | `generate-video/index.ts` `downloadClip` |
| 13 | Fal and Hugging Face fallbacks return data URLs and use stale hosts. | `generate-image/index.ts` |
| 14 | Storyboard forces Flux Flex for every panel. | `modelRouting.ts` `intent === 'storyboard'` |
| 15 | Pro price strings disagree ($12.99 on the live upgrade page and `pricing.html`, $9.99 inside `subscriptionService.getOfferings()`). Confirm the Stripe Price ID that is actually charged. | `plans.ts`, `public/pricing.html`, `subscriptionService.ts` |
| 16 | Wearable sync can show invented numbers (awake default 20, score 75, snore 12, movement 18) and Home reads `sleepDuration` / `quality` while wearable rows use `durationMinutes` / `score`, so a real night can render as 0h. | `wearables.ts`, `DreamJournalApp.tsx`, Home |

### P2 — confusion, dead ends, legacy

| # | Bug |
|---|---|
| 17 | First capture mode is video. A morning note should open on audio or text. |
| 18 | Installed PWA name is Lucid. Product name is EverDream. |
| 19 | `#/profile/{handle}` is copied from Profile and is not a route. |
| 20 | `#/settings` is rewritten to billing. `#/reflection` is rewritten to home. `#/exchange` falls through to home. `/exchange/` is a public page that links to `#/exchange`. |
| 21 | `#/video-journal` is a second camera with no nav entry. |
| 22 | Photo OCR returns empty text. PDF import says “coming soon” and is still a capture mode. |
| 23 | `ProfileAndSettings` legal links are `href="#"` (unmounted, but do not revive that file). Privacy inside the app should open `/privacy.html` and `/terms.html`. |
| 24 | Wearable tokens sit in `localStorage` (`wearable_test_tokens`). The connect modal still offers paste-a-token. Apple Health fetches `api.apple-health.example.com`. |
| 25 | “Load sample data” writes fake Oura, Fitbit, and Garmin nights into the same state as real sync, and those nights can be upserted. |
| 26 | Provider cards list SpO2, snoring detection, Body Battery, and apnea. None of those are read. |
| 27 | CSP allows `unsafe-inline`, `unsafe-eval`, and `connect-src http: https:`. |
| 28 | Password reset depends on a recovery flag, not a `#/reset-password` route. Confirm the email path on the live GoTrue config. SMTP for production mail is still an open checklist item. |
| 29 | No Sentry, no CI workflow, app version `0.2.0`. |

### P3 — later, not this launch

NFT wallet obfuscation, Sony Wena placeholder, Gaussian splatting, $TAO bridge, RevenueCat not granting purchased credits, no Sign in with Apple, store shells not created. `EnhancedAuth.tsx` TODOs are dead code.

### Already fixed in this tree (do not re-open from old docs)

Login anonymous-flag bug, OAuth tokens left in the URL, Stripe checkout trusting a client `profile_id`, demo-open RLS migration, share-link and video-still CORS commits, friends as a localStorage mock, dream row schema mismatch (13 Aug), video audio extraction and `.opus` transcription. `BUG_FIXES_SUMMARY.md`, `BACKEND_STATUS.md`, and the 2 Jul go-live checklist describe an older stack. `docs/SECURITY_REDTEAM_2026-08-23.md` is still the right security note for items 2 and 24.

---

## UX red team

Reviewed against the current screens, not the 23 Aug note alone. That note’s leftover items are still true: capture opens on video, and dream-detail video failure is easy to miss. Header-to-home, tracker recording, and the billing screen were fixed in August.

### What a new user hits

Home leads with a large quote card (“Night note”), a second sleep-education card, an energy check-in, last night, and only then the journal. The job on a phone at 7am is “hold the mic and talk.” The quote can stay as one line. The primary button is **Record a dream**.

The center tab opens Record on **Video**, with Audio, Text, and Upload beside it. Video asks for camera permission, runs a face detector, and is the heaviest path. Default to **Audio**, with Text one tap away. Move Video and Upload off the first row.

After save, the still generates with no confirm. That is fine if the button on the dream said “Uses 1 credit” before they left Record. Today the credit story shows up later, on the wrong ledger.

### Comic and clip

The storyboard section is a grid and a second button that appears only after the grid exists. People will not understand that the comic page and the clip are one deliverable. Show one object: the page. Under it, one action: **Make a 5s clip (4 credits)**. Put share on that page.

Quality scores (“stills scored 61/100 · warn”) are operator language. If the stills are too soft, say “These panels are too soft to animate. Regenerate the page.” If they are fine, say nothing.

There is no regenerate. One bad panel ends the comic.

### Trust

- Header chip “Building XAEL” during the only moment the app is working for them.
- More → Achievements talks about tokens next to a product that used to mint NFTs. Say what the reward is, or remove the row.
- Profile → Share profile copies a link that opens Home.
- Wearables lists twelve brands, a token box, and sample data that looks like last night.
- Tracker can show snoring, sleep talking, and alpha/theta/beta that were filled in from stage ratios. Label the phone path “Phone estimate.” Hide rows the sensor did not measure.
- Delete-all and the privacy page disagree.
- Pricing on `everdream.app` is a dead domain. The page that works is `everdream.n1g3.com/pricing.html`. In-app upgrade must be the same numbers as that page.
- Friends, interests, dream goals, Spotify, and TikTok sit in the profile before the first dream is any good. Finish onboarding as display name and one intention. Hide social connect until Phase 2 or later.

### Recommendations, in the order to build them

1. Record opens on audio. Home’s first button is Record.
2. One credit number, on the generate buttons, from `get_credit_balance`.
3. Comic page is the hero. Clip is one action under it. Ken Burns is not that clip.
4. Errors name the failed step and offer retry. Refund the failed credit.
5. Strip the rows in the link audit below so every visible control lands on a real screen.
6. Phone sleep and wearable sleep never share a card with sample nights.
7. Privacy, terms, and delete-account do what they say.

---

## Links and buttons

Primary chrome is fine: Home, Journal, Tracker, More, center Record, logo → Home, avatar → Profile. Profile tabs Profile and Friends render. The third tab **More** closes the profile and opens the More screen.

| Control | Where it goes | Verdict |
|---|---|---|
| More → Favourites, Insights, Billing, Wearables, Achievements, Privacy | Matching hash screens | Live |
| More → Import journal photos | `#/import-photos` | Live screen, OCR empty. Hide. |
| More → App skin | Hidden by flag | Leave hidden |
| More → XAEL Exchange, Combine | Only if NFT flag on. Routes are not in the allow-list, so they open Home | Dead if the flag is ever turned on. Leave the flag off and delete the rows |
| Profile share link `#/profile/{handle}` | Unknown hash → Home | Dead. Remove the control until a public profile route exists |
| `#/settings` | Rewritten to `#/billing` | Trap. Fine if nothing else links to settings. Grep before shipping |
| `#/reflection` | Rewritten to Home | Trap. Home quote no longer depends on it |
| `#/video-journal` | Second camera | Orphan. Remove the route |
| `#/upgrade?plan=plus`, `#/credits?pack=pack_20` | Route works. Query is stored by `captureCheckoutIntent` in `main.tsx` before the hash is cleaned | Live, if checkout intent still reads session storage. Smoke it |
| `/pricing.html` CTAs | Same hashes | Live on n1g3.com |
| `/privacy.html`, `/terms.html` | Real pages, 200 | Live. Point in-app Privacy at these URLs |
| `/verification.html` → Discord | `discord.gg/everdream` returned HTTP 200. Invite quality not confirmed | Legacy. Remove from the app nav. Do not link it in onboarding |
| `/exchange/` → `#/exchange` | Home | Dead. Delete the public page |
| `everdream.app`, `www.everdream.app` | 404 and NXDOMAIN | Dead marketing host. Stop printing it until DNS works |
| Unmounted: `ProfileAndSettings` Privacy, Terms, Cookie, DPA | `href="#"` | Dead. Do not mount that component |
| Wearables → Sony | Honest “no public API” | Live and truthful. Hide with the other brands until Phase 2 |
| Wearables → Apple Health | Explains iOS is required, and the client can still call `api.apple-health.example.com` | Misleading. Hide |
| Wearables → Samsung, Huawei, Xiaomi | “Web sync not available” | Dead ends. Hide |
| Wearables → Garmin, Polar, Amazfit, Withings | Paste-a-token or unfinished OAuth | Not a connection. Hide |
| “Load sample data (test integrations)” | Writes fake device nights | Remove from any production build |

Screens that exist and are not in the tab bar, on purpose or by drift: dream detail, share, education (opened from Home cards), billing, upgrade, credits, admin, video-journal, public profile (unmounted), XAEL exchange (unmounted), VR (unmounted).

---

## Phase 2 — one wearable, after v1 is live

The wearable screen is a catalog. Oura, Fitbit, Google Fit, and Withings have some real fetch code. The browser calls the vendor API with a token kept in `localStorage`. There is no `wearable-sync` edge function, no refresh, and no unique key for the upsert the client already names. Google Fit is a sunset API. Apple Health has no HealthKit plugin. Samsung, Huawei, and Xiaomi endpoints are not a product. Whoop is only a fake toggle in the unmounted settings file.

**v1 of wearables is Oura only.** Fitbit joins only if the same server path is already boring. Everyone else stays off the screen.

Ship:

1. Edge `wearable-sync`. The app sends “sync” with the user JWT. The Oura token never returns to the browser. Secrets and refresh stay on the server. Oura scopes are the current set (`daily`, `heartrate`), not `daily_read`.
2. Encrypted `wearable_connections`. Disconnect deletes the token.
3. One row per night in `sleep_sessions`, with a real unique key. Vendor score stored as the vendor’s score. EverDream’s phone estimate stored separately. Missing stages stay null. No default score of 75, no invented snoring.
4. Home and the dream show last night as “Oura 84 · asleep 7h 10m” next to the dream the user rated (recall or vividness, 1–5, plus the emotion already on the dream). Fix the field names so `durationMinutes` and `score` actually render.
5. Consent line: sleep numbers sit beside dreams. This is not a diagnosis. Phone tracking stays available and is labeled “Phone estimate.”
6. Delete “Load sample data” and `generateMockSleepData()` on photo import (`source: 'apple_watch'`).

Out of Phase 2: Whoop, Garmin partner API, HealthKit, Health Connect, cron sync, writing dreams back into the vendor app, correlation copy that claims a clinical relationship. Insights can say “on nights you scored higher, your dreams were tagged more positive” only after the two scores are real and the sample is at least a week.

---

## Phase 3 — OpenBCI-class wearables and sleep masks

Nothing in the app talks to EEG, Muse, Dreem, or OpenBCI. Do not add a Connect card for them in Phase 2.

What this hardware can actually add:

- A hypnogram: time asleep, rough wake / light / deep / REM-like blocks, awakenings. That is the signal worth putting next to a dream.
- Sometimes heart rate or movement, if that device has it.
- A band-power summary is only a weak hint that a REM-like window happened. It does not contain the dream.

OpenBCI (Cyton, Ganglion, Galea) is lab hardware: a local USB or Bluetooth stream, electrodes, no consumer cloud. Muse is a meditation band and a poor all-night mask. A “sleep mask” product is only in scope if that specific device already exports a nightly summary (file, or Apple Health / Health Connect). Dreem’s old consumer cloud is not a roadmap dependency.

**Integration.** Prefer any mask that already writes stages into Apple Health or Health Connect, and read that summary through the Phase 2 pipe once Health Connect exists. For OpenBCI, a separate local app (BrainFlow or LSL on a machine by the bed) exports one JSON summary per night. EverDream imports the summary. Raw EEG stays on that machine.

**Dream iteration, stated narrowly.** The user sets an intention and an optional short sound before sleep. The local app may play that sound when its own stage estimate says a long REM-like block is underway, then wake them so they can record. EverDream stores the cue time, the hypnogram summary they opted in to upload, and their morning ratings (recall, vividness, lucidity, emotion). The chart is “REM-like minutes and awakenings next to how well you remembered the dream.” That is the iteration loop: better timing of the recording, and a visible correlation. It is an experiment the user turns on. It is not dream decoding, not therapy, and not a medical device.

**Privacy.** EEG is biometric. Default is on-device. Upload is a separate opt-in from Oura. No raw traces in `sleep_sessions`, no training on traces, no use on public share cards, delete with the account.

**Do not promise.** Reconstructing the dream as images or video from EEG. Clinical staging, apnea, or seizure detection. That a mask will induce lucid dreams. A browser button labeled Connect OpenBCI, Muse, or Dreem. Alpha, theta, and beta percentages unless a sensor measured them. The app already estimates those from stage ratios. Remove that row before this phase, so Phase 3 does not inherit a fake brain-wave chart.

---

## Suggested build order

| Week | Work | Done when |
|---|---|---|
| 1 | P0 security and credit ledger. Commit the cron migration fix. Strip dead routes and public `/exchange/`. | Two test users cannot mint admin, cannot call image gen without a debit, and delete removes their rows |
| 2 | Comic page UX, Klein for panels, reference still, CORS, refunds, regenerate | A 120-word dream produces a shareable page. A failed panel refunds one credit |
| 3 | Clip on the cheaper model, `clipUrl`, 5s / 720p, 4 credits, no Ken Burns collision | Ten real dreams return a playing mp4 or a clear retry. `cost_usd` is under the credit price |
| 4 | Audio-first capture, Home, copy, privacy links, smoke, deploy `pwa-v1` to `everdream.n1g3.com` | The checklist in “Get this build live” passes on the live URL |
| After | Phase 2 Oura | One account shows last night’s Oura score beside that night’s dream, with no sample data |
| After | Phase 3 summary import | A JSON hypnogram attaches to a night. Raw EEG is not in the database |

---

## Sources for prices

- OpenRouter, FLUX.2 Klein 4B: $0.014 per first megapixel. [openrouter.ai/black-forest-labs/flux.2-klein-4b](https://openrouter.ai/black-forest-labs/flux.2-klein-4b)
- OpenRouter measured default image costs, 11 Sep 2026: Klein 4B $0.014, Flex $0.050. Reported by AIB, 18 Sep 2026.
- AI Video & Image Model API Price Index, prices updated 10 Nov 2026: Seedance 2.0 Fast, Wan 2.6, Veo 3.1, Vidu Q2, FLUX.2 Flex. [aivideoapis.com/models](https://aivideoapis.com/models/)
- Seedance 2.0 Fast on OpenRouter, derived about $0.09/s at 720p from OpenRouter per-token rates read 22 Oct 2026 (Makernice). Re-check `usage.cost` on a 5 second job before locking the credit price.

Code references above are from `ed.app.new` on 10 Nov 2026.
