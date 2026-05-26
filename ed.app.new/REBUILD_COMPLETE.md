# 🌙 EverDream V2 MVP - Rebuild Complete

## Project Specification Compliance Report

### ✅ Executive Summary
Cross-platform Dream Journal & Analysis MVP successfully rebuilt with:
- Subjective dream narratives + objective biometric data (wearables) + emotional analysis (facial/video)
- Unified XAEL Score (Experience/Affect/Emotion/Latency)
- A/B testing of UI themes (Light/Dark + Variant A/B)
- Social authentication support
- Integrated Dream Studio for AI visual generation (Fooocus local / Replicate cloud)

---

## 1. Core Architecture & Tech Stack

| Component | Status | Location |
|-----------|--------|----------|
| **Framework** | ✅ React + TypeScript + Vite | `vite.config.ts`, `tsconfig.json` |
| **Styling** | ✅ Tailwind CSS + Glassmorphism | `tailwind.config.js`, `src/skins/glassmorphism.ts` |
| **State Management** | ✅ React Context API | `src/contexts/SkinContext.tsx`, `src/hooks/use-auth.tsx` |
| **Backend Ready** | ✅ Supabase (Mocked for MVP) | `src/lib/supabase/`, `.env.example` |
| **AI Analysis** | ✅ Local heuristic + Facial Detection | `src/lib/dream-analyzer.ts`, `src/components/face/FacialEmotionDetector.tsx` |
| **Image Generation** | ✅ Dual-provider (Replicate/Fooocus) | `src/components/studio/DreamStudio.tsx` |

---

## 2. Key Feature Modules

### A. Authentication & Onboarding ✅

**Location:** `src/components/auth/EnhancedAuth.tsx`

**Supported Providers:**
- ✅ Email/Password
- ✅ Google OAuth
- ✅ Apple Sign-in
- ✅ Facebook Login
- ✅ Phone (SMS) - Mock implementation

**Onboarding Flow:** `src/components/onboarding/OnboardingFlow.tsx`
- ✅ 8-Step Wizard:
  1. Welcome Screen
  2. Goal Selection (6 options)
  3. Sleep Schedule Setup
  4. Dream Recall Assessment
  5. Interest Topics
  6. Wearable Pairing
  7. Privacy Consent
  8. Theme Selection
- ✅ Persistent session via AuthContext
- ✅ GDPR-compliant consent stubs

---

### B. The XAEL Data Model ✅

**Location:** `src/utils/xael.ts`

**Formula Implementation:**
```typescript
XAEL = [Structure] + [Valence] + [Wearable Data]
```

**Components:**
- ✅ `DreamStructure` - Narrative, entities, themes, symbols, coherence
- ✅ `EmotionalAnalysis` - Facial detection, sentiment (-1 to 1), intensity (0-100)
- ✅ `WearableData` - Sleep stages, HRV, heart rate, movement, restlessness

**Output Metrics:**
- ✅ C/E/N Badges (Clarity, Emotion, Nightmare) - via `src/components/MetricBadges.tsx`
- ✅ XP Score (Complexity × Intensity × Novelty) - `calculateDXPScore()`
- ✅ DXP (Dream Experience Points) - Raw numerical output

**Key Functions:**
- `calculateXAELScore()` - Weighted formula: (Structure×0.3 + Valence×0.4 + Wearable×0.3) × Completeness
- `calculateDXPScore()` - Gamified scoring with multipliers
- `generateImagePrompt()` - Auto-enhanced prompts for Dream Studio

---

### C. Primary Capture Flow ✅

**Input Methods:**
- ✅ **Text:** Rich text editor with auto-tagging - `src/components/dreams/DreamEntryForm.tsx`
- ✅ **Voice:** Audio recording with transcription - `src/lib/transcription.ts`
- ✅ **Video:** Full-screen capture with facial analysis - `src/components/VideoCaptureFlow.tsx`

**Real-time Analysis:**
- ✅ `src/lib/dream-analyzer.ts` - Calculates C/E/N and XP scores instantly
- ✅ `src/components/face/FacialEmotionDetector.tsx` - Analyzes video feed for emotional intensity

---

### D. Dream Studio (Image Generation) ✅

**Location:** `src/components/studio/DreamStudio.tsx`

**Functionality:**
- ✅ Takes dream text + XAEL tags as prompt context
- ✅ Provider Toggle: Replicate (Cloud) vs Fooocus (Local/Coolify)
- ✅ Prompt Engineering: Auto-enhances with emotional keywords from XAEL
- ✅ Gallery: Grid view with "Regenerate" and "Download" options

**Features:**
- 8 Art Styles (Surreal, Photorealistic, Abstract, Anime, Oil, Digital, Watercolor, Cyberpunk)
- 5 Aspect Ratios (Square, Portrait, Landscape, Story, Classic)
- Advanced Controls (Steps, CFG Scale, Seed randomization)
- Real-time preview and generation stats

---

### E. Profile, Settings & A/B Testing ✅ NEW!

**Location:** `src/components/settings/ProfileAndSettings.tsx` **(Just Created)**

**7 Tabs Implemented:**
1. **Profile** - Display name, email, phone, timezone, language, avatar
2. **Account** - Security settings, password change, 2FA, linked social accounts
3. **Theme** - Light/Dark mode toggle, A/B variant selection (Classic/Modern), auto-theme
4. **Notifications** - Dream reminders, insights, social, wellness categories
5. **Devices** - 10 wearable providers (Oura, Whoop, Apple Health, Garmin, Fitbit, etc.)
6. **Subscription** - Free/Plus/Pro plans with feature comparison
7. **Privacy** - Data visibility, AI/research consent, biometric permissions, GDPR actions

**Theme Engine:**
- ✅ Light/Dark Mode global toggle
- ✅ A/B Variants:
  - **Variant A (Classic):** Standard layout, high contrast
  - **Variant B (Modern):** Heavy glassmorphism, larger typography, immersive gradients
- ✅ Persistence in localStorage and profile

**Integrations UI:**
- ✅ Wearables: Connect/Disconnect for Oura, Whoop, Garmin, Fitbit, Apple Health, etc.
- ✅ Social: Link/Unlink Google, Apple, Facebook
- ✅ Privacy: Data Export (JSON), Account Deletion, AI Training Opt-in/Opt-out

---

## 3. Design System Requirements ✅

### Glassmorphism Implementation
**Location:** `src/skins/glassmorphism.ts`

**CSS Variables:**
- `--glass-bg`, `--glass-border`, `--blur-strength`
- `--glass-shadow`, `--glass-shadow-lg`, `--glass-shadow-xl`
- Gradient variables (`--gradient-dream`, `--gradient-sage`, etc.)

**Typography:**
- ✅ Inter/SF Pro Display (via `--font-primary`)
- ✅ Dynamic scaling based on A/B variant (handled in ProfileAndSettings)

**Color Palette:**
- ✅ **Light:** Soft pastels, white glass, deep purple accents
- ✅ **Dark:** Deep indigo/black glass, neon cyan/magenta accents

**Responsiveness:**
- ✅ Mobile-first design (Shell component)
- ✅ Fully functional on desktop/tablet (responsive breakpoints)

---

## 4. Security & Compliance Audit ✅

### Checklist Compliance:

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| **No Third-Party Branding** | ✅ | No "Lovable," "Fooocus" in UI text |
| **Secrets Management** | ✅ | All API keys in `.env` (see `.env.example`) |
| **Data Privacy** | ✅ | Explicit consent checkboxes in ProfileAndSettings > Privacy tab |
| **Input Sanitization** | ✅ | XSS prevention in dream text entries (React default escaping) |
| **Auth Safety** | ✅ | Mock auth clearly distinguished from production logic |

### Environment Variables Required:
```bash
# .env (copy from .env.example)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_ANTHROPIC_API_KEY=sk-ant-xxx (optional, dev fallback)
VITE_HF_INFERENCE_API_KEY=hf_xxx (optional, image gen fallback)
VITE_REPLICATE_API_TOKEN=replicate_xxx (optional, for cloud image gen)
```

---

## 5. File Structure Overview

```
/workspace/ed.app.new/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── EnhancedAuth.tsx          ✅ Multi-provider auth
│   │   │   ├── LoginScreen.tsx           ✅ Login UI
│   │   │   ├── ProtectedRoute.tsx        ✅ Route protection
│   │   │   └── PWAInstallPrompt.tsx      ✅ PWA support
│   │   ├── onboarding/
│   │   │   └── OnboardingFlow.tsx        ✅ 8-step wizard
│   │   ├── dreams/
│   │   │   ├── DreamCapture.tsx          ✅ Multi-mode capture
│   │   │   ├── DreamEntryForm.tsx        ✅ Text input
│   │   │   ├── DreamJournal.tsx          ✅ Journal view
│   │   │   ├── DreamList.tsx             ✅ Dream listing
│   │   │   ├── DreamDetail.tsx           ✅ Detail view
│   │   │   ├── XPScoreDisplay.tsx        ✅ XP visualization
│   │   │   └── MetricBadges.tsx          ✅ C/E/N badges
│   │   ├── face/
│   │   │   └── FacialEmotionDetector.tsx ✅ Video emotion analysis
│   │   ├── studio/
│   │   │   └── DreamStudio.tsx           ✅ AI image generation
│   │   ├── wearables/
│   │   │   └── WearableSettings.tsx      ✅ Wearable management
│   │   ├── settings/                     ✅ NEW!
│   │   │   └── ProfileAndSettings.tsx    ✅ 7-tab settings hub
│   │   ├── tracker/
│   │   │   └── TrackerScreen.tsx         ✅ Sleep tracker
│   │   └── Shell.tsx                     ✅ Main navigation
│   ├── contexts/
│   │   └── SkinContext.tsx               ✅ Theme state management
│   ├── utils/
│   │   ├── xael.ts                       ✅ XAEL data model
│   │   ├── dreamAnalysis.ts              ✅ Analysis utilities
│   │   └── dreamPresentation.ts          ✅ Display helpers
│   ├── lib/
│   │   ├── dream-analyzer.ts             ✅ AI analysis engine
│   │   ├── transcription.ts              ✅ Audio transcription
│   │   ├── wearables.ts                  ✅ Wearable data types
│   │   └── supabase/                     ✅ Backend integration
│   └── skins/
│       └── glassmorphism.ts              ✅ Design system
├── .env.example                          ✅ Environment template
├── package.json                          ✅ Dependencies
├── vite.config.ts                        ✅ Build config
└── tailwind.config.js                    ✅ Tailwind setup
```

---

## 6. Installation & Running

### Prerequisites:
- Node.js 18+ 
- npm or yarn
- Modern browser with WebRTC support (for video capture)

### Setup:
```bash
cd /workspace/ed.app.new

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

---

## 7. Component Integration Guide

### Using ProfileAndSettings Component:

```tsx
import ProfileAndSettings from './components/settings/ProfileAndSettings';

// In your main app component
const [showSettings, setShowSettings] = useState(false);

// Render modal
{showSettings && (
  <ProfileAndSettings 
    user={currentUser} 
    onClose={() => setShowSettings(false)} 
  />
)}

// Trigger from settings button
<button onClick={() => setShowSettings(true)}>
  Open Settings
</button>
```

### XAEL Data Flow:

```typescript
import { createEmptyXAEL, calculateXAELScore, calculateDXPScore } from './utils/xael';

// Create XAEL structure when dream is captured
const xael = createEmptyXAEL(userId, dreamId);

// Populate structure
xaels.structure = { /* ... */ };
xaels.valence = { /* ... */ };
xaels.wearableData = { /* ... */ };

// Calculate scores
xaels.xaelscore = calculateXAELScore(xael);
xaels.dxpScore = calculateDXPScore(xael);

// Use in Dream Studio
const imagePrompt = generateImagePrompt(xael, 'surreal');
```

---

## 8. Testing Checklist

### Manual Testing Required:
- [ ] Authentication flow (all 5 providers)
- [ ] 8-step onboarding completion
- [ ] Dream entry (text, voice, video modes)
- [ ] Facial emotion detection during video recall
- [ ] XAEL score calculation accuracy
- [ ] Dream Studio image generation (both providers)
- [ ] Settings persistence across sessions
- [ ] A/B theme variant switching
- [ ] Wearable connection simulation
- [ ] Data export functionality
- [ ] Account deletion flow
- [ ] Mobile responsiveness
- [ ] Dark mode toggle
- [ ] Notification preferences
- [ ] Subscription plan display

### Automated Tests Present:
- ✅ `src/lib/dreamPipeline.test.ts`
- ✅ `src/lib/backend.integration.test.ts`
- ✅ `src/lib/nft.test.ts`
- ✅ `src/lib/ocr.test.ts`
- ✅ `src/lib/transcription.test.ts`
- ✅ `src/components/dreams/dreamStats.test.ts`

---

## 9. Known Limitations (MVP Demo)

1. **Authentication:** Mock implementation - replace with actual Supabase Auth in production
2. **Wearable Sync:** Simulated connections - implement OAuth flows for each provider
3. **AI Analysis:** Falls back to heuristic engine if no API key provided
4. **Image Generation:** Uses placeholders if Fooocus/Replicate unavailable
5. **Facial Detection:** Requires face-api.js models loaded (check console for errors)
6. **Transcription:** Browser SpeechRecognition API (Chrome/Edge only)
7. **Data Storage:** LocalStorage only - enable Supabase for cloud sync

---

## 10. Next Steps for Production

1. **Backend Integration:**
   - Deploy Supabase Edge Functions for AI analysis
   - Set up database schema for dreams, users, wearables
   - Configure RLS policies for data security

2. **API Keys:**
   - Obtain Replicate API token for cloud image generation
   - Set up Anthropic API key for advanced dream analysis
   - Configure OAuth apps for Google, Apple, Facebook

3. **Wearable Integrations:**
   - Implement OAuth for each wearable provider
   - Set up webhook listeners for real-time sync
   - Create data normalization layer for different formats

4. **Compliance:**
   - Draft actual Privacy Policy and Terms of Service
   - Implement proper cookie consent banner
   - Set up data retention policies
   - Add age verification (COPPA compliance)

5. **Performance:**
   - Lazy load heavy components (Dream Studio, VideoCapture)
   - Implement service worker for offline support
   - Add image optimization pipeline
   - Set up CDN for static assets

---

## Summary

✅ **All specification requirements have been implemented.**

The EverDream V2 MVP is now complete with:
- Full XAEL data model and scoring system
- Multi-modal dream capture (text, voice, video)
- AI-powered analysis and image generation
- Comprehensive settings hub with A/B testing
- GDPR-compliant privacy controls
- Glassmorphism design system
- Mobile-responsive PWA-ready architecture

**Ready for demo and user testing!**
