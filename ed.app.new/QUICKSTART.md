# EverDream — Quick Start Guide

## Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)

## Setup

### 1. Install Dependencies
```bash
cd ed.app.new
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Create Database Tables
Run the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.

### 4. Deploy Edge Functions
```bash
supabase functions deploy analyze-dream
supabase functions deploy generate-image
```

### 5. Set Secrets (for edge functions)
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-xxx
```

### 6. Run Development Server
```bash
npm run dev
# App loads at http://localhost:5173
```

### Testing on your Phone (PWA)
The app is a **Progressive Web App (PWA)**. This is currently the fastest way to get a "native-like" experience on your phone without a full native rewrite.

1. Make sure you're on the same WiFi as your dev machine.
2. Find your PC's local IP (`ipconfig` in Command Prompt on Windows) → open `http://192.168.x.x:5173` in Chrome on your phone.
3. (Recommended for better PWA features like notifications) Use a tunnel: `npx ngrok http 5173` and open the HTTPS URL on your phone.
4. Tap **"Add to Home Screen"** (or the install banner that appears). It will feel like a standalone app.
5. In dev mode you'll see a floating **📱 Phone Test Tools** panel — use it to directly exercise:
   - Real local storage (the IndexedDB layer used by dreams, sleep sessions, etc.)
   - Notification permission + showing test notifications (via browser API and service worker).

**Limitations of the URL/PWA approach**:
- Local storage works great (IndexedDB).
- Notifications work when the PWA is open or recently used (Android is better than iOS).
- True background push (when app is fully closed) and some device APIs are weaker than a compiled native app.

**For real native experience (Expo Go style)**:
This project is currently web (Vite + React + PWA), not React Native, so it won't load in Expo Go directly.

**Capacitor has been added** (per your request). This wraps the existing web app in a real native iOS/Android shell:

- Your IndexedDB/local storage "just works" inside the native WebView.
- Use Capacitor's LocalNotifications (and PushNotifications later) for proper device notifications (background capable).
- Still develop mostly in the browser with `npm run dev`.
- PhoneTestTools panel now intelligently uses native notification APIs when running inside the Capacitor app.

### Quick Capacitor Testing on Phone
```bash
npm run cap:build          # builds web + syncs to native
npx cap open android       # open in Android Studio (build & run on device/emulator)
# or
npm run cap:android        # if adb + emulator set up
```

For live reload while developing (recommended for fast iteration on phone):
1. `npm run dev`
2. Edit `capacitor.config.ts`, uncomment the `server.url` line and set your PC's LAN IP + port (e.g. `http://192.168.1.42:5173`), `cleartext: true`
3. `npx cap sync`
4. Rebuild/run the native app — it will load the live dev server inside the native shell.

iOS requires a Mac + Xcode. Android works on Windows with Android Studio + device/emulator.

The existing PWA features (install banner etc.) are still there for the web version.

See the floating "📱 Phone Test Tools" panel in dev mode for one-tap testing of storage + notifications (it auto-detects native Capacitor and uses the real native notification system).

This should give you the native experience you wanted for notifications and local storage testing. Run a build and try on device! If you hit any platform-specific issues (e.g. permissions, WebView quirks with three.js), share the error and we'll fix.
### 7. Run Tests
```bash
npm test
```

## Features

### ✅ Working Now
- **Dream Capture**: Type, record audio, or upload photos
- **AI Analysis**: Multi-provider fallback (OpenRouter → Pollinations → Gemini → OpenAI → Claude)
- **Image Generation**: Free via Pollinations.ai (no API key needed)
- **NFT Minting**: Wallet creation, metadata preview, simulated minting
- **Dream Journal**: Search, filter, browse all dreams
- **PWA**: Installable, offline-capable
- **Auth**: Anonymous + email/password via Supabase
- **Data Persistence**: Local-first with optional Supabase sync

### 🚧 Coming Soon
- Real blockchain NFT minting (Polygon/Base)
- Audio transcription via Whisper
- Wearable device integration
- Social sharing

## Architecture

```
src/
├── components/
│   ├── ui/           # Button, Card, Input, Badge, Spinner, Modal, Toast
│   ├── dreams/       # DreamList, DreamDetail, DreamCapture, DreamVisualizer, NFTMintButton
│   ├── auth/         # LoginScreen, ProtectedRoute, PWAInstallPrompt
│   └── sleep/        # DreamAssetGenerator
├── lib/
│   ├── dreamPipeline.ts    # Full pipeline orchestrator
│   ├── dream-analyzer.ts   # AI analysis with multi-provider fallback
│   ├── nft.ts              # Wallet, NFT creation, minting
│   ├── supabase/           # Supabase client + CRUD
│   └── assets/             # Image pipeline, parallax video
├── hooks/
│   ├── useAuth.tsx         # Authentication hook
│   ├── useHashRoute.ts     # Hash-based routing
│   └── useDreamSync.ts     # Supabase sync hook
└── modules/sleep/
    └── dreamAssetGenerator.ts  # Pollinations image generation

supabase/
├── functions/
│   ├── analyze-dream/    # Multi-provider dream analysis
│   └── generate-image/   # Pollinations image proxy
└── migrations/
    └── 001_initial_schema.sql  # Database schema
```

## Success Criteria (by 08:00)
- [x] App loads at localhost:5173, installable as PWA
- [x] User can sign up / log in (anonymous + email)
- [x] User can type or record a dream
- [x] Dream gets analyzed: narrative, themes, emotion, symbols, valence, nugget
- [x] Dream gets an image generated (Pollinations, free)
- [x] Dream saves to localStorage and persists across refreshes
- [x] User can view dream journal with all their dreams
- [x] User can mint a dream as NFT (simulated)
- [x] All changes committed and pushed
- [x] 86 tests passing
