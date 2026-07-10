# SPEC-10: Sleep Coaching, Readiness & Deeper Wellness Insights

**Status:** Draft — 2026-07-09  
**Canonical app:** ed.app.new/ + sleep module + edge functions  
**Priority:** High for wellness credibility vs Oura/Whoop/Sleep Cycle

## Problem
Current sleep tracking is data-rich (stages, scores, wearables) but light on **actionable coaching** and "readiness" style insights. Users get numbers but not "what should I do tonight?"

## Goals
- Compute a Readiness / Recovery score (in addition to sleep score).
- Provide personalized, data-driven coaching and recommendations.
- Correlate sleep with dreams/mood for unique value.
- Support smart routines and "wind down" intelligence.

## Features

### 1. Readiness / Recovery Score
- Composite: last night's sleep efficiency + stages balance + HRV trend + consistency (last 7 days) + user-reported morning feeling + (optionally) dream quality/novelty as creativity/recovery signal.
- Trend: day-over-day, week-over-week.
- Simple 0-100 or colored (like Oura readiness).
- Factors breakdown (what helped/hurt last night).

### 2. Coaching & Recommendations
- Daily/tonight suggestions:
  - "Your HRV is trending low — consider a 10-min wind-down breathing before bed."
  - "High REM last night correlated with vivid dreams — great for creativity. Protect that tonight."
  - Bedtime window suggestion based on chronotype + recent data.
- "What if" simulator (lightweight): "If I get 30 more min deep sleep, expected readiness +X".
- Integration with existing WindDownFlow, MorningCheckIn, SleepEducation.

### 3. Enhanced Visuals & Insights
- Sleep + Dream correlation cards (builds on SPEC-08).
- Long-term trends: consistency streaks, seasonal patterns.
- Alerts: "Your sleep efficiency dropped 3 nights in a row".
- Exportable weekly sleep + dream wellness report.

### 4. Wearable & Data Depth
- Better parsing/sync for common providers (improve on current `wearable_provider`).
- If data available: surface temp, SpO2, resp rate, resting HR.
- Hybrid: phone mic fallback (like Sleep Cycle) for basic stages/snore when no wearable.
- Smart alarm experiment (wake in light stage window) — optional.

### 5. Routines & Habits Tie-in
- Link sleep goals to daily reflection / journal prompts.
- "Sleep score goal" streaks.
- Evening/morning micro-habits surfaced by companion (SPEC-09).

## UX
- Prominent Readiness score on home / SleepDashboard (next to or instead of pure sleep score).
- "Tonight's Recommendation" card (actionable, one-tap "start wind down").
- Dedicated "Sleep Coach" section or tab.
- Mobile notifications for bedtime window or morning insight.

## Technical
- New or extended edge function for `compute_readiness(user_id, date)`.
- Store daily readiness snapshots (new table or in user_settings / analytics).
- Use existing sleep data + new pattern data.
- Simple rules + LLM for natural language coaching text (multi-provider, cheap model).
- Privacy: all per-user.

## Data Additions
- `readiness_scores` (date, score, components jsonb, recommendations).
- Enhance sleep_sessions with more raw fields if needed.

## Non-Goals v1
- Medical advice / diagnosis.
- Full mattress integration or hardware sales.
- Advanced audio ML on-device (start with existing transcription or simple).

## Metrics
- % users with wearable connected who view readiness daily.
- Completion of recommended wind-down / routines.
- Self-reported "sleep improved" in reflections.
- Retention lift for users engaging with coaching.

## Implementation Order
1. Compute basic readiness formula + UI display (using existing fields).
2. Simple rule-based + LLM-generated tonight recommendation.
3. Correlations with dreams (tie to SPEC-08).
4. Trends, alerts, export.
5. Wearable data depth + hybrid phone tracking.
6. Integration with conversational companion and Pro tier.

## References
- Oura readiness, Whoop recovery/strain coach, Sleep Cycle tips + smart alarm.
- Current EverDream sleep schema, morning check-in, wearable settings, education pages.
- SPEC-08 patterns (for dream-sleep links), SPEC-09 companion.

**Strong complement to the creative/AI side — makes the wellness claim credible.**
