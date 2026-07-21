# SPEC-22: Post-Registration Onboarding + Education Personalization

**Status**: Implemented (2026-07-21)  
**App**: `ed.app.new`  
**Related**: SPEC-17 (placement), SPEC-18 (interests/goals source of truth)

## Research (dream-journal space)

Patterns that work in Lucidity, Oniri, and journal-app guidance:

| Pattern | Why it works | EverDream take |
|--------|---------------|----------------|
| **Value first, short setup** | Users want to capture a dream ASAP; long forms drop off | ≤6 steps, skippable, ends with “record first dream” |
| **Goal selection** | Lucidity: “set a lucid dream goal” drives later lessons | Multi-select goals + interests stored on profile |
| **Privacy line early** | Journal apps live or die on trust | One-line privacy on welcome step |
| **Habit framing** | Recall improves with morning capture | Experience + recall frequency steps |
| **Don’t gate value on demographics** | Birth/gender optional | Keep optional; never block finish |
| **Personalized follow-up content** | Lucidity: morning/evening lessons by goal | Daily education ranked by onboarding tags |
| **Empty profile > fake data** | Fake interests destroy trust | Default interests/goals = `[]` |

Sources informing this: Lucidity (goal + lessons), Oniri (tags/emotions/stats), dream-journal build guides (value prop → privacy → quick path → first entry).

## Goals

1. Post-auth users without `onboarded_at` get a focused full-screen flow (home only).
2. Capture **real** profile fields only — no placeholders.
3. Persist to Supabase `profiles` + local profile cache.
4. Rank daily education modules by onboarding interests/goals.
5. Profile hub shows only user-sourced interests/goals.

## Data model (profiles)

| Field | Type | Source |
|-------|------|--------|
| `onboarded_at` | timestamptz | finish/skip |
| `onboarding_goals` | text[] | goal chips |
| `interests` | text[] | interest chips |
| `dream_goals` | text[] | human labels of goals |
| `experience_level` | text | beginner / some / regular |
| `dream_recall` | text | rarely / sometimes / often |
| `average_sleep_hours` | numeric | optional slider |
| `birth_date` / `gender` | optional | demographics |

Education tags are **derived** from goals + interests (client-side), not a separate required column.

## Flow (steps)

0. Welcome + privacy  
1. Goals (required ≥1)  
2. Interests (optional multi)  
3. Experience + dream recall  
4. Sleep average (optional skip)  
5. Personalized “what we’ll focus on” preview  
6. Done → save → first dream entry  

## Education optimization

`getPersonalizedDailyEducation(goals, interests)`:

1. Map goals/interests → preferred `EducationModule.category` + id boosts.  
2. Score catalog modules; pick highest among “not shown recently” (day hash tie-break).  
3. Fallback to calendar rotation if no profile signals.

## Acceptance

- [x] No hardcoded profile interests/goals defaults  
- [x] Onboarding saves real arrays to profile + Supabase  
- [x] Home education uses personalization when onboarded  
- [x] Skip still sets `onboarded_at` so flow doesn’t loop forever  
- [x] Profile empty states when no data  

## Files

- `docs/specs/SPEC-22-post-registration-onboarding.md`
- `src/lib/onboarding/*`
- `src/components/onboarding/OnboardingFlow.tsx`
- `src/lib/profileService.ts`, `src/lib/dailyContent.ts`
- `supabase/migrations/20260721000001_onboarding_interests.sql`
