# Sleep Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `tracker` screen with sleep scoring, weekly sleep review, daily detail, and monthly reporting.

**Architecture:** Add pure sleep-summary, scoring, circadian, and report modules under `src/modules/sleep`, then consume them through a small `useSleepTracker` hook and tracker components. Keep current home/journal behavior intact and link tracker days to existing dream detail routes.

**Tech Stack:** React 18, Vite, TypeScript strict mode, Tailwind CSS, lucide-react.

---

## File Structure

- Create `src/modules/sleep/sleepSummary.ts`: canonical `NightlySleepSummary` types, legacy `SleepData` mapping, dream mapping, date helpers, deterministic demo summaries.
- Create `src/modules/sleep/sleepScoring.ts`: pure score, calibration, and sleep quality helpers.
- Create `src/modules/sleep/circadian.ts`: preferred rhythm window, alignment scoring, and education tier helpers.
- Create `src/modules/sleep/monthlyReport.ts`: monthly aggregation for top dreams, worst dreams, assets, trends, education, and email-ready summary text.
- Modify `src/modules/sleep/index.ts`: export the new tracker modules.
- Create `src/hooks/useSleepTracker.ts`: load completed sleep sessions from local storage, map dreams into summaries, build week/month selectors.
- Create `src/components/tracker/SleepStageStack.tsx`: compact stage visualization.
- Create `src/components/tracker/CircadianRhythmChart.tsx`: preferred versus actual sleep window graph.
- Create `src/components/tracker/WeeklySleepView.tsx`: seven-day tracker grid.
- Create `src/components/tracker/SleepDayDetail.tsx`: selected day detail view.
- Create `src/components/tracker/MonthlySleepReport.tsx`: in-app monthly report view.
- Create `src/components/tracker/TrackerScreen.tsx`: tracker orchestration.
- Modify `src/hooks/useHashRoute.ts`: add `tracker`.
- Modify `src/components/Shell.tsx`: add tracker navigation item.
- Modify `src/DreamJournalApp.tsx`: render `TrackerScreen`, pass dreams/settings/navigation.

## Task 1: Add Sleep Summary And Scoring Modules

**Files:**
- Create: `src/modules/sleep/sleepScoring.ts`
- Create: `src/modules/sleep/circadian.ts`
- Create: `src/modules/sleep/sleepSummary.ts`
- Modify: `src/modules/sleep/index.ts`

- [ ] **Step 1: Add scoring types and helpers**

Create `sleepScoring.ts` with `SleepScoreBreakdown`, `calculateSleepScore`, `calibrateSleepScore`, `getSleepQualityLabel`, and `getSleepQualitySymbol`. Each function must clamp values to stable 0-100 output and return deterministic results for missing or partial data.

- [ ] **Step 2: Add circadian helpers**

Create `circadian.ts` with `calculateCircadianAlignment`, `buildPreferredSleepWindow`, `getEducationTier`, and `getCircadianEducation`. The graph code will consume alignment plus preferred/actual windows.

- [ ] **Step 3: Add canonical summary mapper**

Create `sleepSummary.ts` with `NightlySleepSummary`, `DreamLike`, `TrackerSettings`, `createNightlySummary`, `mapLegacySleepDataToSummary`, `buildDemoSleepSummaries`, and date utilities. Key summaries by wake date.

- [ ] **Step 4: Export new modules**

Update `src/modules/sleep/index.ts` so tracker code can import summary, scoring, circadian, and report helpers from the module barrel.

- [ ] **Step 5: Verify strict TypeScript compatibility**

Run: `npx tsc --noEmit`

Expected: no errors from the new pure modules.

## Task 2: Add Monthly Report Aggregation

**Files:**
- Create: `src/modules/sleep/monthlyReport.ts`
- Modify: `src/modules/sleep/index.ts`

- [ ] **Step 1: Add monthly report types**

Define `MonthlySleepReport` with month label, tracked nights, good nights, average score, total sleep hours, target hours, weekly breakdown, top three dreams, worst three dreams, top assets, trend label, education text, and email subject/body strings.

- [ ] **Step 2: Add aggregation logic**

Implement `buildMonthlySleepReport(summaries, dreams, monthDate)` using calibrated scores, dream asset rarity, and wake-date matching. Good nights are nights with calibrated score at least 75.

- [ ] **Step 3: Export monthly report helpers**

Update `src/modules/sleep/index.ts`.

- [ ] **Step 4: Verify build-time types**

Run: `npx tsc --noEmit`

Expected: no type errors.

## Task 3: Add Tracker Hook

**Files:**
- Create: `src/hooks/useSleepTracker.ts`

- [ ] **Step 1: Build hook inputs and outputs**

The hook accepts `dreams`, app `settings`, and `wearableData`. It returns `summaries`, `weekDays`, `selectedDay`, `setSelectedDate`, `selectedSummary`, `monthlyReport`, and `currentMonth`.

- [ ] **Step 2: Load local sleep sessions safely**

Read `sleep_completed_sessions` from localStorage and ignore malformed entries. Merge legacy sessions, wearable sessions, dream `sleepData`, and demo summaries into canonical summaries.

- [ ] **Step 3: Link dreams by wake date**

Use each dream's `date` as the wake date and attach `dreamId`, `dreamLogged`, mood valence, and generated asset metadata to matching summaries.

- [ ] **Step 4: Verify hook types**

Run: `npx tsc --noEmit`

Expected: no type errors.

## Task 4: Build Tracker UI Components

**Files:**
- Create: `src/components/tracker/SleepStageStack.tsx`
- Create: `src/components/tracker/CircadianRhythmChart.tsx`
- Create: `src/components/tracker/WeeklySleepView.tsx`
- Create: `src/components/tracker/SleepDayDetail.tsx`
- Create: `src/components/tracker/MonthlySleepReport.tsx`
- Create: `src/components/tracker/TrackerScreen.tsx`

- [ ] **Step 1: Build `SleepStageStack`**

Render awake/light/deep/REM as a stacked horizontal bar with labels and minutes. Handle zero total minutes by showing an empty state.

- [ ] **Step 2: Build `CircadianRhythmChart`**

Render a 24-hour horizontal chart with preferred sleep window and actual sleep window bars. Show alignment score and drift copy.

- [ ] **Step 3: Build `WeeklySleepView`**

Render seven day buttons with score symbol, dream indicator, mood indicator, duration, and selected state.

- [ ] **Step 4: Build `SleepDayDetail`**

Render score, stage stack, circadian chart, disturbance metrics, estimated state proxies, "How did you sleep?" calibration display, and a dream detail button.

- [ ] **Step 5: Build `MonthlySleepReport`**

Render monthly good nights, total sleep versus target, weekly breakdown, top dreams, worst dreams, asset highlights, education, and email-preview text.

- [ ] **Step 6: Build `TrackerScreen`**

Compose the weekly view, selected day detail, and monthly report toggle. Preserve current EverDream visual language.

- [ ] **Step 7: Verify component types**

Run: `npx tsc --noEmit`

Expected: no type errors.

## Task 5: Wire Route And Navigation

**Files:**
- Modify: `src/hooks/useHashRoute.ts`
- Modify: `src/components/Shell.tsx`
- Modify: `src/DreamJournalApp.tsx`

- [ ] **Step 1: Add `tracker` route**

Extend `RouteScreen`, `parseHash`, and allowed routes with `tracker`.

- [ ] **Step 2: Add tracker nav item**

Add a tracker item to the bottom nav using an existing lucide icon.

- [ ] **Step 3: Render tracker route**

Import `TrackerScreen` in `DreamJournalApp.tsx` and render it when `route.screen === 'tracker'`. Pass `dreams`, `settings`, `wearableData`, and `onOpenDream={(id) => navigate('dream', id)}`.

- [ ] **Step 4: Verify app build**

Run: `npm run build`

Expected: Vite build succeeds.

## Task 6: Visual And Functional Verification

**Files:**
- No planned source edits unless verification finds bugs.

- [ ] **Step 1: Run production build**

Run: `npm run build`

Expected: build completes successfully.

- [ ] **Step 2: Start preview server**

Run: `npm run preview -- --host 127.0.0.1`

Expected: local preview URL is available.

- [ ] **Step 3: Inspect tracker screen**

Open `/#/tracker` in the in-app browser. Verify the weekly view appears, selecting days updates the detail panel, monthly report toggle works, and dream buttons route to existing dream detail pages.

- [ ] **Step 4: Record follow-on backlog**

Keep AI narrative extension, real-time capture prompting, audio/video valence inference, and wearable ingestion as separate implementation tracks. Do not blend them into the sleep tracker commit.
