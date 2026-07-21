# SPEC-18: Profile Interests & Goals – Source of Truth & No Pre-generated Content

**Status**: Draft
**Date**: 2026-07-21

## Problem

The Profile page currently shows pre-generated or placeholder interests and goals. This adds no value and confuses users. Interests and goals should only come from:

- Onboarding flow
- Explicit user editing
- Future data imports (wearables, Spotify, etc.)

## Red Team vs Blue Team (3 Rounds)

### Round 1

**Blue**: Pre-populating a few sensible interests/goals makes the profile look alive and gives users ideas.

**Red**: Pre-generated content is worse than empty. Users immediately distrust the product when they see "Meditation", "Lucid Dreaming" etc. that they never chose. It feels fake.

### Round 2

**Blue**: We can make the pre-generated items very clearly marked as "Suggestions" with an easy "Add" button.

**Red**: Even "suggestions" create decision fatigue and pollute the data model. Better to start empty with a strong "Add interest" / "Add goal" CTA. The empty state itself can be educational.

### Round 3

**Blue**: At minimum we should import from onboarding_goals.

**Red**: Yes — onboarding_goals is the single source of truth. If the user later edits interests/goals, those become the source. Never mix in hardcoded examples.

## Synthesis (Chosen Approach)

- `profiles.onboarding_goals` is the initial source.
- Profile page shows a clean "Interests" and "Goals" section.
- Empty state: "Add your first interest" / "Add a goal".
- No pre-generated examples ever.
- Future: allow importing from other sources (Spotify genres, wearable tags, etc.).

## Implementation

- Update `ProfileHubScreen.tsx` to only render real data from `useProfile()`.
- Remove the hardcoded `interests` and fake goals arrays.
- Add proper empty states and add/edit flows.