# Sleep Tracker And Sleep Scoring Design

Date: 2026-05-15
Branch: ed.app.new
Scope: Phase A browser UI and shared scoring model, with native capture ingestion later

## Objective

Build a dedicated `tracker` screen for sleep tracking and reporting. The home screen remains the daily check-in surface. The tracker owns weekly sleep performance, daily sleep detail, sleep score breakdowns, circadian alignment, dream linkage, and the entry point for monthly reporting.

Phase A stores summary-only nightly metrics. Native raw motion/audio capture can feed the same summary contract later without changing the tracker UI.

## Product Structure

The app should add a `tracker` route and navigation item. The tracker is separate from the journal and home screens.

The weekly tracker shows one row or column per wake date. Each day displays:

- sleep score and quality symbol
- dream logged indicator
- mood or valence indicator
- total sleep duration versus target

Selecting a day opens a daily detail view for that wake date. The detail view includes:

- overall sleep score
- stage breakdown for awake, light, deep, and REM
- stacked sleep quality column or bar
- circadian rhythm graph showing preferred rhythm versus actual sleep window
- disturbance summary from movement/audio aggregates
- estimated alpha, theta, and beta state proxies
- morning calibration prompt: "How did you sleep?"
- linked dream entry when a dream exists for that wake date

Monthly reporting remains a secondary action inside the tracker. It should be implemented as an in-app report first and later reused for notification and email output.

## Canonical Data Contract

Create one canonical `NightlySleepSummary` per sleep night. The summary is keyed by wake date, not bedtime date, because morning calibration, dream recall, and daily reflection happen after waking.

Required fields:

- `id: string`
- `sleepDate: string`
- `sleepStart: string`
- `sleepEnd: string`
- `timeInBedMinutes: number`
- `totalSleepMinutes: number`
- `targetSleepMinutes: number`
- `stageMinutes: { awake: number; light: number; deep: number; rem: number }`
- `sleepEfficiency: number`
- `awakenings: number`
- `wasoMinutes: number`
- `movementIndex: number`
- `snoreIndex: number`
- `sleepTalkIndex: number`
- `heartRateAvg?: number`
- `heartRateVariability?: number`
- `circadianAlignmentScore: number`
- `estimatedStateProxy: { alpha: number; theta: number; beta: number }`
- `scoreBreakdown: SleepScoreBreakdown`
- `algorithmicSleepScore: number`
- `restednessScore?: number`
- `calibratedSleepScore: number`
- `moodValence?: number`
- `dreamLogged: boolean`
- `dreamId?: string`
- `educationTier: 'foundation' | 'rhythm-repair' | 'advanced'`
- `signalsSource: 'manual' | 'browser-estimate' | 'wearable' | 'native-device'`

The current `SleepData` module can be adapted into this summary format. Existing completed sessions should be mapped into `NightlySleepSummary` at the view boundary so older local data remains usable.

## Sleep Score

The score is a 0 to 100 weighted composite.

Components:

- Duration score: total sleep compared with target sleep duration.
- Stage quality score: deep and REM minutes compared with target percentages.
- Continuity score: awakenings and WASO penalties.
- Circadian alignment score: overlap between actual sleep window and preferred rhythm.
- Disturbance score: movement, snore, and sleep talk aggregate penalties.

Phase A weights:

- Duration: 25 percent
- Stage quality: 30 percent
- Continuity: 20 percent
- Circadian alignment: 20 percent
- Disturbance: 5 percent

Keep both `algorithmicSleepScore` and `calibratedSleepScore`. The algorithmic score is the raw estimate. The calibrated score incorporates the user's answer to "How did you sleep?" over time.

Calibration rule:

- Convert the morning answer to a 0 to 100 subjective score.
- Compare it with the raw algorithmic score.
- Apply only a bounded moving correction to future calibrated scores.
- Preserve the original algorithmic score for analytics and debugging.

## Circadian Model

The tracker should compute a preferred sleep window from settings:

- preferred bedtime
- preferred wake time
- target sleep duration

For each night, calculate alignment by measuring how much of the actual sleep window overlaps the preferred window, then apply a small penalty for large start-time or wake-time drift.

Education tiers:

- `advanced`: high score and strong circadian alignment.
- `rhythm-repair`: weak circadian alignment or repeated bedtime drift.
- `foundation`: incomplete data, short sleep, or low sleep consistency.

The app should show education content based on tier, but avoid medical claims.

## Sensor And Source Semantics

Phase A uses summary-only metrics in the browser app. Browser motion/audio may be used for demo estimates while the app is foregrounded, but the product model should treat real overnight capture as a native-device or wearable source.

Movement/audio can estimate:

- restlessness
- awakenings
- snoring likelihood
- sleep talking likelihood
- rough sleep-stage proxies

Movement/audio cannot measure actual alpha, theta, or beta brainwaves. Until wearable or BCI support exists, the UI must label those fields as estimated state proxies.

## Components

Add or reshape these units:

- `src/modules/sleep/sleepSummary.ts`
  - Converts current `SleepData` and future native/wearable payloads into `NightlySleepSummary`.
- `src/modules/sleep/sleepScoring.ts`
  - Pure scoring functions with deterministic inputs and outputs.
- `src/modules/sleep/circadian.ts`
  - Preferred rhythm, alignment scoring, and education tier helpers.
- `src/hooks/useSleepTracker.ts`
  - Loads summaries, maps existing local data, links dreams by wake date, and exposes weekly/monthly selectors.
- `src/components/tracker/TrackerScreen.tsx`
  - Main weekly tracker screen.
- `src/components/tracker/WeeklySleepView.tsx`
  - 7-day overview with sleep, dream, and mood signals.
- `src/components/tracker/SleepDayDetail.tsx`
  - Daily detail and dream link.
- `src/components/tracker/CircadianRhythmChart.tsx`
  - Preferred rhythm versus actual sleep window.
- `src/components/tracker/SleepStageStack.tsx`
  - Stacked stage visualization.
- `src/components/tracker/MonthlySleepReport.tsx`
  - In-app monthly report view.

Use the existing app visual language instead of introducing a separate dashboard style. The tracker should feel like part of the current EverDream app.

## Navigation

Extend `RouteScreen` with `tracker`.

Add `tracker` to the bottom navigation. The user explicitly requested the tracker route name, so use that route instead of overloading journal or insights.

The dream detail route remains `dream/:dreamId`. From a daily sleep detail, tapping the dream indicator should navigate to the existing dream detail route when a linked dream exists.

## Monthly Report

The in-app monthly report should include:

- total nights tracked
- number of good nights
- average calibrated sleep score
- total slept hours versus target
- week-by-week score breakdown
- best three dream-linked nights when enough data exists
- worst three dream-linked nights when enough data exists
- strongest recurring education recommendation

Email and notification delivery are later delivery channels. The report content should be generated as structured data first so those channels can reuse it.

## Error Handling

The tracker should render useful states for:

- no sleep data yet
- partial sleep data without dream linkage
- dream exists without sleep summary
- malformed stored local data
- sensor-source fields missing from older sessions

Scoring functions should clamp invalid values and return explainable breakdowns instead of throwing in the UI path.

## Testing

Add focused tests for:

- sleep score calculation and clamping
- circadian alignment scoring
- calibration behavior
- weekly summary generation by wake date
- dream linking by wake date
- monthly report aggregation

Use deterministic fixture data for one strong week, one poor week, and one partial-data week.

## Out Of Scope For Phase A

Phase A does not implement production overnight native capture, raw audio storage, raw motion storage, BCI integrations, wearable API sync, or email delivery. It prepares the model and UI so those can be connected later.
