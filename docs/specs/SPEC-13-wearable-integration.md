# SPEC-13: Wearable Integration — From Placeholders to Functional

**Status:** Draft — 2026-07-09 (Built Out)  
**Canonical app:** `ed.app.new/`  
**Depends on:**  
- `src/lib/wearables.ts` (core library)  
- `src/components/wearables/WearableSettings.tsx`  
- `DreamJournalApp.tsx` and sleep tracking components  
- `user_settings` table + profiles  
- Supabase auth + edge functions (for secure token exchange)  
- Capacitor for native HealthKit (mobile)  
**Priority:** High — Core wellness + dream correlation feature  
**Goal:** Replace mocks and placeholders with real, secure, user-facing wearable connections that feed high-quality data into sleep tracking, dream correlation, and future coaching features.

---

## 1. Overview & Current State

The wearable system aims to import objective sleep data (stages, HRV, efficiency, etc.) from popular devices and correlate it with subjective dream data.

**Current Implementation Strengths:**
- Comprehensive `WearableProvider` union type and `WearableSleepRecord` normalized interface.
- `getOAuthUrl(...)` implemented for Oura, Fitbit, Google Fit, Samsung, Huawei, Xiaomi, Withings, Amazfit, Polar (Garmin is OAuth 1.0a, Apple is native-only).
- Partial but promising `fetch*` functions (Oura, Fitbit, Google Fit have real logic; others are stubs or use fallbacks).
- Basic `fetchAllWearableSleep` and some write helpers (Google Fit dream/sleep score writes).
- `WearableSettings.tsx` UI with provider cards, connect/disconnect, sync buttons, and last-sync tracking.
- `WearableConfig` state in `DreamJournalApp.tsx`.

**Current Gaps (Placeholders):**
- No secure, persistent storage of access/refresh tokens (currently only in-memory or localStorage mocks).
- `handleSync` and `syncWearableData` mostly generate fake data.
- No real OAuth callback + token exchange flow (client secrets can't live in browser).
- No insertion of real records into `sleep_sessions` table.
- No linking of wearable sleep to dreams.
- Incomplete implementations for most providers.
- No error handling, rate-limit awareness, or token refresh.
- No "Test mode" vs production path.

This spec defines a pragmatic, phased path to make the feature usable.

---

## 2. Goals & Scope

### MVP Goals (Build in this spec)
- Functional connection + sync for **Oura** (highest priority — best sleep data) and **Google Fit** (broad reach).
- Basic support for **Fitbit** and **Apple Health** (via native or documented bridge).
- Secure token storage.
- Real data flowing into `sleep_sessions` (with `source = 'wearable'`).
- Basic correlation in the UI (e.g., show wearable data next to dreams).
- Test-friendly "paste token" path for development + full OAuth path for production.
- Graceful fallback to estimated/manual data.

### Out of Scope (for v1 of this spec)
- Full support for all 12 providers at 100% fidelity.
- Background/auto-sync.
- Rich write-back to wearables beyond basic notes.
- Advanced data fusion/ML.

---

## 3. Data Model & Mapping

### WearableSleepRecord (already defined)
See `src/lib/wearables.ts` for the interface. It already maps well to sleep_sessions.

### Target: `sleep_sessions` table
Key fields to populate from wearables:

| WearableSleepRecord Field | sleep_sessions Column          | Notes |
|---------------------------|--------------------------------|-------|
| date                      | (derived from sleep_start)    | - |
| bedtime                   | sleep_start                    | ISO |
| wakeTime                  | sleep_end                      | ISO |
| durationMinutes           | time_in_bed_minutes / total_sleep_minutes | Calculate |
| remMinutes                | rem_minutes                    | - |
| deepMinutes               | deep_minutes                   | - |
| lightMinutes              | light_minutes                  | - |
| awakeMinutes              | awake_minutes / waso_minutes   | - |
| efficiency                | sleep_efficiency               | 0-100 |
| score                     | algorithmic_score or calibrated_score | Provider score |
| heartRateAvg              | heart_rate_avg                 | - |
| hrv                       | heart_rate_variability         | - |
| respiratoryRate           | (store in morning_check_in or context) | - |
| skinTempCelsius           | (store in context JSONB)       | - |
| source                    | source = 'wearable'            | Hardcode |
| provider                  | wearable_provider              | e.g. 'oura' |

Additional:
- `device_id` → from auth or response
- `morning_check_in` → can merge user-reported + wearable data
- `dream_id` → link via date proximity or manual UI

**Recommendation:** Create a small helper `mapWearableRecordToSleepSession(record, userId, wearableProvider): Partial<SleepSessionRecord>`

### Storage of Connections
**Preferred:** New table `wearable_connections` (or JSONB column in `user_settings` for simplicity).

Suggested schema addition (new migration):

```sql
CREATE TABLE IF NOT EXISTS public.wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,           -- encrypt at rest in production
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- RLS policies mirroring other user tables
ALTER TABLE public.wearable_connections ENABLE ROW LEVEL SECURITY;
-- ... (add SELECT/INSERT/UPDATE/DELETE policies for own user_id)
```

For MVP, we can start with storing in `user_settings.wearable_connections` (JSONB) and migrate later.

---

## 4. Authentication & Token Management

### Two Paths
1. **Development / Power User (MVP):** Paste access token directly in UI (Oura personal tokens are easy to generate).
2. **Production:** Full OAuth 2.0 flow.

**Critical Security Note:** Never put client secrets in the browser.

**Recommended Architecture:**
- Frontend calls a new Supabase Edge Function: `wearable-oauth-exchange`
- The edge function performs the `code → token` exchange using the provider's client_secret (stored as Supabase secret).
- Returns access/refresh tokens to the client (short-lived).
- Client stores tokens via `wearable_connections` table (using the user's session).

### OAuth Callback Handling
Current code sets `sessionStorage` for state/provider.

We need:
- A route or deep link handler (e.g., `/wearable-callback?code=...&state=...&provider=oura`)
- Or handle in a dedicated screen/component.
- Call the edge function to exchange.

Update `getOAuthUrl` calls to include proper scopes (already partially done).

### Token Refresh
Implement a `refreshWearableToken(provider, refreshToken)` helper. Call it automatically on 401s.

---

## 5. Provider Implementation Priorities & Details

### Phase 1 (MVP)
**Oura Ring** (highest value)
- API: https://cloud.ouraring.com/v2
- Use `/usercollection/daily_sleep` + `/usercollection/sleep`
- Already has good skeleton in `fetchOuraSleep`.
- **Task:** Complete pagination, error mapping, proper date handling, token refresh.

**Google Fit**
- Already has decent implementation for sessions + sleep segments.
- **Task:** Harden, handle auth scopes correctly, test with real tokens.

### Phase 2
- Fitbit (solid existing code)
- Apple Health (requires Capacitor plugin or "Health Auto Export" style bridge for web testing)
- Samsung / Huawei (popular in certain markets)

For Apple:
- Document that full native experience requires Capacitor Health plugin.
- Provide a web fallback using manual entry or exported data import.

### Generic Helpers to Add/Complete
- `fetchAllWearableSleep(configs, start, end)`
- `normalizeRecord(raw, provider): WearableSleepRecord`
- `refreshTokenIfNeeded(auth): WearableAuth`
- `validateToken(provider, token): boolean`

Many fetch functions already exist — the spec's job is to ensure they are called from the real app and data is persisted.

---

## 6. UI/UX Requirements

### WearableSettings Component
Enhance existing component:

- List of providers with status (Connected / Not connected / Last synced)
- **Connect** button:
  - OAuth providers → trigger `getOAuthUrl` + redirect (or open popup if possible)
  - After callback → show "Exchange token" or auto-exchange via edge
  - Test mode: input field for access token + "Connect with Token"
- **Sync** button per provider or "Sync All"
- Show mini stats from last sync (e.g., "7 nights • Avg 7.2h • 82 efficiency")
- Disconnect button (clears token server-side)
- "Use sample data" toggle for development

### Integration in Main App
In `DreamJournalApp.tsx` and Sleep views:
- Replace `syncWearableData` simulation with real call.
- On successful sync:
  ```ts
  const records = await fetchAllWearableSleep(...);
  // Convert to sleep_sessions payloads
  await insertSleepSessions(records.map(r => mapToSleepSession(r, currentUser)));
  ```
- Display wearable-sourced sessions distinctly (badge: "Oura").
- In morning check-in / dream correlation: show "Your Oura reported 92 REM minutes last night".
- Update `wearableConfigs` and persist to `user_settings`.

Add a small "Wearable" section in the Sleep dashboard.

---

## 7. Data Flow & Persistence

1. User connects wearable → tokens saved to `wearable_connections`.
2. User clicks Sync → client calls `fetchAllWearableSleep` (with tokens).
3. Normalize records.
4. Client (or edge) upserts into `sleep_sessions`:
   - Use `(user_id, sleep_start, wearable_provider)` as natural key for upsert.
5. Optionally link to nearest dream(s) by date.
6. Trigger any downstream effects (profile update, insights recalc).

Handle:
- Partial day data
- Multiple sessions per night
- Timezone normalization (store everything in UTC)

---

## 8. Implementation Plan (Phased)

### Phase 0: Foundations (0.5 day)
- Create `wearable_connections` table + migration + RLS.
- Add helper functions in `src/lib/supabase/` or new `wearableService.ts`:
  - `saveWearableConnection(userId, provider, tokens)`
  - `getWearableConnections(userId)`
  - `deleteWearableConnection(...)`

### Phase 1: Oura + Google Fit (1.5–2 days)
- Complete/harden fetch functions.
- Implement token exchange edge function (`supabase/functions/wearable-oauth-exchange`).
- Update `WearableSettings` connect + sync to use real paths + persist.
- Wire real sync into `DreamJournalApp.tsx` (replace mocks).
- Add basic UI indicators.

### Phase 2: Polish & More Providers (1–2 days)
- Fitbit + Apple (at least documented + mock bridge).
- Token refresh logic.
- Duplicate handling + date linking to dreams.
- Error states, loading, "last synced".
- Write simple unit tests for mapping functions.
- Update docs (add "Wearable Setup" section).

### Phase 3: Advanced (future)
- Background sync hints.
- Rich write-back.
- Full OAuth without manual token paste.

---

## 9. Technical Details & Code Tasks

### New/Updated Files
- `supabase/migrations/202507XX_wearable_connections.sql`
- `supabase/functions/wearable-oauth-exchange/index.ts`
- Enhance `src/lib/wearables.ts` (finish exchange, add refresh helpers)
- `src/lib/wearableService.ts` (or extend profileService)
- Update `WearableSettings.tsx` (major)
- Update `DreamJournalApp.tsx` (replace sync logic)
- Possibly new `WearableSyncButton.tsx` component

### Example: Persisting Synced Data
```ts
// After fetch
const sleepPayloads = records.map(r => ({
  user_id: currentProfile.id,
  sleep_start: r.bedtime,
  sleep_end: r.wakeTime,
  ...mapWearableToSleepFields(r),
  source: 'wearable',
  wearable_provider: provider,
}));

await supabase.from('sleep_sessions').upsert(sleepPayloads, { onConflict: 'user_id,sleep_start,wearable_provider' });
```

### OAuth Callback
Create handling in a new screen or in `useEffect` of settings:
```ts
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (code && state) {
    // Call edge function to exchange
    // Then save token and clean URL
  }
}, []);
```

---

## 10. Testing Strategy

- **Manual happy path:** Connect Oura (token or OAuth) → Sync 7 days → Verify rows in Supabase + UI shows data.
- **Error cases:** Expired token, no data, rate limit.
- **Fallback:** Disconnect all → app still works with estimates.
- **Persistence:** Refresh page → connections and data remain.
- **Multi-provider:** Connect two, sync all.
- **Date linking:** Create a dream on the same night as synced sleep → verify association UI.
- Unit tests for `map*` and normalization functions.

---

## 11. Security & Privacy

- Tokens must never be logged.
- Prefer refresh tokens + short access token lifetimes.
- All storage goes through Supabase (RLS enforced).
- Inform user what data is read (sleep stages, HR, etc.) — add consent in settings.
- Do not write sensitive dream content back to wearables without explicit user action.

---

## 12. Success Criteria & Definition of Done

- A user can connect Oura, press Sync, and see real sleep stage data appear in the app and database within 30 seconds.
- Same for at least one other major provider.
- No more `// Simulate wearable sync` or hardcoded arrays in production paths.
- Clear documentation exists for developers and end users.
- Tokens are stored server-side.
- Fallback behavior is solid.

---

## 13. Risks & Mitigations

- **OAuth complexity & client secrets:** Mitigated by using Edge Function for exchange.
- **API changes / rate limits:** Implement exponential backoff and clear error messages.
- **User privacy concerns:** Explicit scopes + in-app explanation.
- **Mobile vs Web:** Document native limitations clearly.

---

## Related Specs
- SPEC-10: Sleep Coaching & Readiness (will consume this data)
- SPEC-08: Patterns & Correlations (wearable + dream data is gold)
- SPEC-12: Supabase Testing (include wearable test cases)

**Estimated Total Effort:** 4–7 days for a solid, shippable MVP across priority providers.

---

**Next Actions After This Spec**
1. Create the `wearable_connections` migration.
2. Implement the `wearable-oauth-exchange` edge function.
3. Wire real Oura sync end-to-end.
4. Update UI to remove mocks.

This spec is now detailed enough to guide implementation directly.
