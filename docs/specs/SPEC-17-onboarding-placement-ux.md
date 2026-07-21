# SPEC-17: Onboarding Placement & "How You're Feeling" Card UX

**Status**: Draft → Debate → Synthesis → Implementation
**Owner**: Gareth + Hermes
**Date**: 2026-07-21

## Problem Statement

Onboarding flow is currently being rendered at the bottom of:
- Home screen
- Journal screen
- Tracker screen

This creates a broken, repetitive UX. The user expects onboarding elements to appear contextually in the "How you're feeling" section on the right-hand side of the home screen.

Additionally:
- "ENERGY TODAY" subheader should be removed.
- First row of icons in the energy section should be removed.

## Proposed Direction (Initial)

Move onboarding-related reflection/energy UI into the RHS "How you're feeling" card. Make it progressive and contextual rather than a full multi-step wizard on every screen.

---

## Red Team vs Blue Team Debate

### Round 1

**Blue (Keep some onboarding visibility on home):**
We should keep a lightweight version of the onboarding energy check-in visible on the home screen because first-time users need guidance. Putting it in the "How you're feeling" card makes sense. The current bottom placement is just a bug in conditional rendering. Removing "ENERGY TODAY" and the first icon row cleans it up. This is low-risk.

**Red (Strongly against persistent onboarding UI):**
The onboarding should be a one-time experience. Once the user has completed the 7-step flow, we should never show onboarding UI again on the home screen. Showing it on journal and tracker is especially bad — those are high-frequency screens. Persistent onboarding UI makes the app feel unfinished and patronising. Better to have a clean "Daily Check-in" that works for both new and returning users.

**Blue counter:**
But then how do we handle users who skipped onboarding or only partially completed it? We still need a way to collect goals, birth date, gender, average sleep etc.

**Red counter:**
We collect that data lazily when the user first interacts with features that need it (e.g. when they try to see personalised insights). We don't force a big onboarding block on the home screen forever.

### Round 2

**Blue:**
We can make the RHS card smart:
- If user has not completed onboarding → show "Complete your profile" with 2-3 quick questions.
- If user has completed onboarding → show normal energy/mood check-in.

This way new users get guided, returning users get a clean experience.

**Red:**
This is still onboarding leakage. The moment you show "Complete your profile" on the home screen, you're signalling the product is not ready. Users who have already been through onboarding will still see a different card than what they expect. Better to have one consistent "Daily reflection" card that works for everyone.

The energy icons and "ENERGY TODAY" header are legacy from an old design. The cleanest approach is:
- Remove the entire first row of icons.
- Remove "ENERGY TODAY" subheader.
- Have a simple mood + energy slider or emoji selector.
- Onboarding questions should live in a dedicated modal or settings page, not on the home screen.

**Blue counter:**
Some users genuinely want to see their streak and progress immediately. Hiding everything behind settings reduces engagement.

**Red counter:**
Engagement comes from actual dream content and insights, not from forcing profile completion on the home screen.

### Round 3

**Blue:**
Let's compromise on a hybrid:
- Home screen RHS card = "Daily Check-in" (mood + energy, no onboarding language).
- If the user has incomplete onboarding fields, show a small non-blocking banner or dot on the profile avatar that leads to a clean onboarding completion flow (not on home).
- This satisfies both "clean home" and "collect missing data".

**Red:**
This is acceptable if:
1. The banner/dot is very subtle.
2. The onboarding completion flow is a single consolidated screen (not 7 steps again).
3. We never show onboarding-related content on Journal or Tracker screens.

The "first row of icons" and "ENERGY TODAY" should be removed regardless — they add visual noise with no clear value.

**Consensus direction emerging:**
- Clean "Daily Check-in" card on home (mood + energy only).
- Onboarding completion moved to Profile or a dedicated "Complete Profile" route.
- No onboarding UI on Journal/Tracker.
- Remove "ENERGY TODAY" and first icon row.

---

## Synthesis (Best Approach)

**Recommended UX:**

1. **Home Screen – "How you're feeling" card (RHS)**
   - Simple daily check-in:
     - Mood emoji selector (5–7 options)
     - Energy level (simple 1–5 scale or slider, no icons in first row)
   - No "ENERGY TODAY" header.
   - No onboarding language or multi-step wizard.
   - Button: "Save check-in" + optional "Add note".

2. **Onboarding Completion**
   - If the user has missing onboarding fields (goals, birth_date, gender, average_sleep_hours), show a non-intrusive indicator in the Profile avatar or a small card in ProfileHub.
   - Clicking it opens a clean "Complete your profile" modal or dedicated screen that combines the remaining questions.
   - This flow should be short (max 3–4 questions).

3. **Journal & Tracker screens**
   - Never show onboarding content.
   - Show clean journal/tracker UI only.

4. **Data Source for Interests/Goals**
   - Interests and goals should only come from:
     - Explicit user input during onboarding or later editing.
     - Imported data (wearables, Spotify, etc. in future).
   - Never pre-populate with fake or example data.

---

## Implementation Notes

- Update `HomeScreen.tsx` to render a clean `DailyCheckinCard`.
- Move conditional onboarding rendering logic out of `DreamJournalApp.tsx` for journal/tracker.
- Update `OnboardingFlow.tsx` to support a "completion mode" for partial profiles.
- Profile page should read `onboarding_goals`, `interests` (if added), etc. from `profiles` table only.

---

## Acceptance Criteria

- [ ] Onboarding wizard no longer appears at bottom of home/journal/tracker.
- [ ] "How you're feeling" card on home is clean (no "ENERGY TODAY", no first icon row).
- [ ] Onboarding completion accessible from Profile only.
- [ ] No pre-generated interests/goals/friends anywhere.
- [ ] All data in Profile comes from real user input or imports.