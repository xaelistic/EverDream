# UX red team + competitor recommendations — 2026-08-23

## UX issues found and fixed

| Issue | Fix |
|---|---|
| Header moon/name did nothing | Goes Home |
| Tracker showed fake nights, never recorded | Phone mic + motion session on Tracker |
| Wearable Sync did nothing useful | Real config fetch, merge, persist |
| Upgrade Now button was a dummy | Live Plan & credits screen |
| VR/Pro gate sent users to missing `#/settings` | `#/billing` |
| Credits only in localStorage | DB balance + ledger + buy packs |
| Empty hash query after Stripe (`#/billing?...`) dropped the route | Hash parser strips `?` |

## Remaining UX nits (not all shipped)

- Profile modal still has leftover dummy biometric toggles.
- More screen still mixes “features” with future NFT rows when the flag is on.
- Capture flow has four modes; first-run still defaults to video (heavy for a first dream).
- Dream detail retry exists for audio; video stuck state is quieter.

## vs top 3 (2026)

**1. Elsewhere Dreams / Oniri-class dream journals**  
They win on *one-tap morning capture* and *style-pick images*. EverDream wins on sleep correlation and audio/video journals. **Do next:** first-open should be a 10-second voice note, not a video studio. Add 3 image styles on the first generate.

**2. Oura / Sleep Cycle (sleep)**  
They win on *last night at a glance* and *hardware-grade stages*. Phone tracking will never beat a ring. **Do next:** keep phone tracking as the zero-hardware on-ramp; put wearable score as the hero when synced; never mix demo data with real nights (done).

**3. Day One / Reflectly (daily journal)**  
They win on *streaks, prompts, on-this-day*. EverDream is dream-first. **Do next:** a single morning prompt card (“What stayed with you?”) before the capture hub; export PDF for Plus (already gated).

## Product recommendations (priority)

1. Morning path: Home → one prompt → audio 30s → image. Hide video until second session.
2. Show remaining credits in the generate button, not only on Billing.
3. After a tracked night, pre-fill “sleep was short/high-REM” on the journal composer.
4. Public gallery on the marketing site (map already exists) — Elsewhere’s dream wall is the social loop we lack.
5. Lucid tools can wait; sleep+dream correlation is the actual wedge.
