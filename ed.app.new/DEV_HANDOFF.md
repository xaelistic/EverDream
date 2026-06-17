# EverDream Dev Handoff — May 16, 2026

**Branch:** `main` (create feature branches from here)
**Repo path:** `C:\Users\xaeli\Documents\GitHub\EDI\EverDream\ed.app.new\`
**Remote:** `xaelistic/EverDream` on GitHub

---

## ✅ Already Done (Do NOT re-implement)

### Reflection Sharing (Instagram Stories)
- **Status:** Code written, in `main` working tree (uncommitted)
- **Files modified:**
  - `src/DreamJournalApp.tsx` — Added `shareReflection()`, `generateReflectionShareableImage()`, `showReflectionShareModal` state, and reflection share modal JSX (around lines 1493–12000)
  - `src/screens/ReflectionScreen.tsx` — Added `onShareReflection` prop and "Share to Instagram Stories" button (lines 153–170)
- **What it does:** Generates a 1080×1080 canvas image with gradient background, mood emoji, energy bar, sleep summary, quote, and "everdream.app" watermark. Downloads as PNG.
- **Pattern:** Reuses the same canvas approach as the existing `generateShareableImage()` for dreams.

---

## 🔧 Tasks to Implement

### 1. VIDEO AUDIO TRANSCRIPTION — Extract audio from video BEFORE transcribing

**Problem:** When a user records a dream video, the audio transcription is terrible. The current code in `videoJournalProcessor.ts` `prepareAudioForTranscription()` just re-types the video blob as `audio/webm` without actually extracting the audio track. Whisper receives a video file and produces garbage.

**Current bad code** (`src/lib/videoJournalProcessor.ts`, line 80-85):
```typescript
function prepareAudioForTranscription(blob: Blob): Blob {
  if (!blob.type.startsWith('video/')) return blob;
  const audioType = blob.type.includes('webm') ? 'audio/webm' : 'audio/ogg';
  return new Blob([blob], { type: audioType }); // ← Just re-types the blob, doesn't extract audio!
}
```

**Required fix:** Actually extract the audio track from the video using the Web Audio API / MediaRecorder:
1. Create a `<video>` element, load the video blob
2. Use `captureStream()` or Web Audio API to extract the audio track
3. Re-encode as a clean audio file (WAV or OGG) using MediaRecorder or OfflineAudioContext
4. Pass the extracted audio blob to Whisper

**Suggested approach:**
```typescript
async function extractAudioFromVideo(videoBlob: Blob): Promise<Blob> {
  // 1. Create video element, load blob
  // 2. Use new MediaStream([videoElement.captureStream().getAudioTracks()[0]]) 
  // 3. Record with MediaRecorder as audio/ogg or audio/webm
  // 4. Return clean audio Blob
}
```

Then update `transcribeVideoJournal()` in the same file to call `extractAudioFromVideo()` instead of `prepareAudioForTranscription()`.

**Files to modify:**
- `src/lib/videoJournalProcessor.ts` — Replace `prepareAudioForTranscription` with real audio extraction

---

### 2. ADD .opus TO ACCEPTED AUDIO UPLOAD FORMATS

**Problem:** The upload audio input in DreamCapture only accepts `audio/*` but the actual validation or processing may reject `.opus` files.

**File:** `src/components/dreams/DreamCapture.tsx`, line 189:
```tsx
accept="audio/*"
```

**Fix:** Change to explicitly include `.opus`:
```tsx
accept="audio/*,.opus"
```

Also check `src/lib/transcriptionWhisper.ts` — the `transcribeWithWhisper` function accepts a Blob, so ensure the MIME type `audio/opus` is handled. Add `audio/opus` to the conversion logic if needed.

---

### 3. FIX "All providers failed" → "Experiencing heavy load, check back later" + BACKLOG

**Problem:** When inference providers fail (rate limits, 429s, 503s), the user sees technical error messages. Instead:
- Show: **"Experiencing heavy load. Check back later."**
- Queue the failed task to a backlog (Supabase table or local IndexedDB)
- Retry with cron jobs every 15 minutes

**Files to modify:**

**a) `src/lib/api/ai-provider.ts`** — `analyzeDreamWithAI()` function:
- On final failure (all retries exhausted), instead of returning `FALLBACK_ANALYSIS` silently, throw or return a user-friendly error
- Add the failed task to a backlog queue

**b) `src/lib/transcriptionWhisper.ts`** — `transcribeWithWhisper()` and `transcribeAudio()`:
- Same pattern: on final failure, queue to backlog

**c) Create a backlog system:**
- New file: `src/lib/taskBacklog.ts`
- Interface:
  ```typescript
  interface BacklogTask {
    id: string;
    type: 'transcription' | 'analysis' | 'image-generation';
    payload: any;  // the audio blob, text, etc.
    createdAt: string;
    retryCount: number;
    nextRetryAt: string;
    status: 'pending' | 'retrying' | 'completed' | 'failed';
  }
  ```
- Store in IndexedDB (use the existing `mediaStorageManager` pattern or a simple separate store)
- Functions: `addToBacklog()`, `getPendingTasks()`, `retryTask()`, `markCompleted()`

**d) Create a cron job retry mechanism:**
- New file: `src/lib/backlogRetry.ts`
- On app load, check for pending tasks and retry if `nextRetryAt` has passed
- Use `setInterval` every 15 minutes to retry pending tasks
- Show a subtle indicator in the UI (e.g., "3 tasks queued — retrying...")

**e) Update error messages in `src/lib/api/errorHandling.ts`:**
- Add new error code: `SERVICE_OVERLOADED: 'SERVICE_OVERLOADED'`
- Message: `'Experiencing heavy load. Check back later. Your task has been queued and will be retried automatically.'`
- Map rate_limit (429) and server (503) errors to this new code

---

### 4. FIX "Listen for full analysis" for uploaded audio

**Problem:** When a user uploads an audio file (not recorded live), the UI says "Listen for full analysis" which is wrong — it should transcribe the uploaded file, not listen.

**File:** `src/components/dreams/DreamCapture.tsx`

**Current flow:** Upload audio → saves to mediaStorage → adds a text note `[Audio upload: filename]` → but doesn't actually transcribe it.

**Required fix:**
1. After saving the uploaded audio file, trigger transcription using `transcribeAudio()` from `transcriptionWhisper.ts`
2. Show a progress indicator: "Transcribing audio..."
3. On completion, populate the dream text area with the transcript
4. Change the UI text from whatever "listen" reference exists to "Uploaded audio will be transcribed automatically"

**Also check:** `src/screens/VideoJournalScreen.tsx` — may have similar "listen" text for uploaded/recorded audio.

---

### 5. DEDUPLICATE SETTINGS — Merge Profile screen settings into single Settings screen

**Problem:** There are two settings locations:
- `src/screens/ProfileHubScreen.tsx` — Has a "Settings" tab with buttons (many are placeholders/alerts)
- `src/components/settings/ProfileAndSettings.tsx` — Full 7-tab settings component (Profile, Account, Theme, Notifications, Devices, Subscription, Privacy)

**Required fix:**
1. Remove the Settings tab from `ProfileHubScreen.tsx` entirely
2. Make the ProfileHub link to the main Settings component via navigation
3. Ensure all settings functionality lives ONLY in `ProfileAndSettings.tsx`
4. The "Settings" button in ProfileHub should call `navigate('settings')` or similar

**Files to modify:**
- `src/screens/ProfileHubScreen.tsx` — Remove settings tab, replace with navigation to main settings
- `src/DreamJournalApp.tsx` — Ensure the settings route renders `ProfileAndSettings`

---

### 6. PROFILE SCREEN — Replace placeholder buttons with working functionality

**Problem:** Most buttons in ProfileHubScreen show `alert('...')` instead of doing anything.

**File:** `src/screens/ProfileHubScreen.tsx`

**Placeholder buttons to fix:**
- **Integrations** (Spotify, Instagram, Apple Health, Oura) — `handleConnectIntegration()` just shows alert
  - For MVP: At minimum, show a "Coming Soon" toast instead of alert
  - Better: Implement OAuth flow or show a proper "Connect" modal
- **Add Friend** — `handleAddFriend()` just shows alert
  - For MVP: Show a proper friend code input with copy/share
- **Share Profile** — placeholder
- **Settings** — should navigate to real settings (see task 5)

**Required fix:** Replace all `alert()` calls with proper UI (toasts, modals, or navigation).

---

### 7. ADMIN BACKEND VIEW — Supabase analytics dashboard + task queue + cron management

**Problem:** There's no way to see what's happening in the backend — what tasks are queued, what's failing, what cron jobs are running.

**This is a SEPARATE app/page** — not part of the main EverDream user app. It's an admin panel.

**Required:** Create a new admin dashboard screen accessible only to admin users.

**New files to create:**
- `src/screens/AdminDashboard.tsx` — Main admin panel
- `src/components/admin/TaskQueue.tsx` — View/manage queued tasks
- `src/components/admin/Analytics.tsx` — Supabase analytics overview
- `src/components/admin/CronManager.tsx` — View/manage cron jobs
- `src/components/admin/InferenceProviders.tsx` — Connect/manage inference provider keys

**Features:**
- **Analytics tab:** Show dream count, active users, transcription success rate, analysis success rate (query Supabase)
- **Task Queue tab:** Show all tasks in the backlog (from task 3), with status, retry count, actions (retry now, cancel)
- **Cron Manager tab:** Show scheduled cron jobs, their status, last run, next run
- **Inference Providers tab:** Show configured providers (HF, OpenRouter, etc.), their status (healthy/degraded/down), allow adding new API keys

**Access control:** Check if user is admin (check Supabase user role or a simple admin flag in the profile table). If not admin, redirect to home.

**Route:** `/admin` or navigate via `navigate('admin')`

---

## 📋 Implementation Order (Priority)

1. **Task 1** — Video audio transcription fix (highest impact, user lost a good dream recording)
2. **Task 2** — Add .opus support (quick win)
3. **Task 3** — Error message fix + backlog system (important for reliability)
4. **Task 4** — Upload audio transcription fix
5. **Task 5** — Settings deduplication
6. **Task 6** — Profile placeholder fixes
7. **Task 7** — Admin dashboard (largest piece, do last)

---

## 🏗️ Build Notes

- Build command: `npm run build` (runs `tsc && vite build`)
- There's a known issue with `rolldown` native module — if build fails, try `npx vite build` directly
- TypeScript errors in existing files are pre-existing — don't fix unless related to your changes
- The app uses: React, Tailwind, Framer Motion, Supabase, Lucide icons

---

## 📁 Key File Reference

| File | Purpose |
|------|---------|
| `src/DreamJournalApp.tsx` | Main app, routing, all major state |
| `src/screens/RecordScreen.tsx` | Video/audio/text recording entry |
| `src/components/capture/VideoCaptureFlow.tsx` | Video camera capture |
| `src/lib/videoJournalProcessor.ts` | Video → transcription → analysis pipeline |
| `src/lib/transcriptionWhisper.ts` | Whisper transcription (Supabase edge function) |
| `src/lib/transcription.ts` | Legacy transcription (deprecated) |
| `src/lib/api/ai-provider.ts` | AI dream analysis via Supabase |
| `src/lib/api/errorHandling.ts` | Error classification & messages |
| `src/lib/dream-analyzer.ts` | Dream analysis orchestration |
| `src/components/dreams/DreamCapture.tsx` | Text + audio upload + analysis UI |
| `src/screens/ProfileHubScreen.tsx` | Profile with placeholder buttons |
| `src/components/settings/ProfileAndSettings.tsx` | Full settings (7 tabs) |
| `src/screens/ReflectionScreen.tsx` | Morning reflection screen |
| `supabase/functions/transcribe-audio/index.ts` | Whisper edge function |
| `supabase/functions/analyze-dream/index.ts` | Dream analysis edge function |
