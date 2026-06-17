# EverDream Implementation Log

## Session: SPEC-06 Complete (Jun 18, 2026)

**Branch:** `main` · **App:** `ed.app.new`

### Shipped (final pass)

- **Oracle** — `xaelOracle.ts` spot ticker (ENERGY/DATA/COMPUTE) wired into exchange UI
- **Economy persistence** — `006_economy_marketplace.sql` + `economyPersistence.ts` (balances, orders, trades, listings)
- **XAEL mint on save** — `dreamToXAEL.ts`, `mintDreamRewards.ts`; rewards on journal save + record flow
- **Trade fix** — `executeTrade` deducts XAEL correctly; `placeSellOrder` for user listings
- **Dream combine** — `DreamCombineScreen` at `#/combine`; fuses 2–4 parent NFTs, lists on exchange
- **Exchange UI** — spot prices, place-order tab, NFT commodity bundles, TAO bridge quote preview
- **TAO bridge stub** — `taoBridge.ts` (simulated until `VITE_TAO_BRIDGE_ENABLED`)
- **Pro gates** — `ProFeatureGate` on simulacrum + VR (`vrSimulacra` entitlement)
- **Spec** — `SPEC-06-simulacra-economy.md` marked code-complete with ops deferred section

### Ops still manual

1. Deploy NFT contract + env vars
2. `supabase db push` through migration 006
3. Coolify: exchange-web + discord-bot
4. TAO bridge contract (future)

---

## Session: SPEC-06 Simulacra, VR, NFT & XAEL Economy (Jun 18, 2026)

**Branch:** `main` · **App:** `ed.app.new`

### Shipped

- **Image→3D pipeline** — `imageTo3D.ts` (Meshy image-to-3D + luminance depth fallback)
- **Simulacrum service** — `simulacraService.ts` builds/persists `DreamSimulacrum` (depth terrain, optional GLB, parallax)
- **3D explorer** — `DreamSimulacrumScreen` (R3F depth terrain / GLB)
- **VR** — `DreamVRScreen` wraps `WebXRViewer` (`#/vr/:dreamId`)
- **XAEL economy** — `xaelEconomy.ts` local ledger (XAEL, ENERGY, DATA, COMPUTE)
- **Exchange UI** — `XAELExchangeScreen` (`#/exchange`)
- **NFT marketplace** — `nftMarketplace.ts` listings + buy flow; mint wires simulacrum `animation_url`
- **Discord** — `discord.ts` webhooks (mint, trade, simulacra ready)
- **Routes** — dream detail: Explore 3D, Enter VR, Mint NFT, XAEL Exchange; More screen link
- **Asset pipeline** — `mesh_3d` uses `generate3DMeshBlocking` (poll to completion)
- **Build** — lazy-loaded 3D/VR/exchange chunks; PWA `maximumFileSizeToCacheInBytes` 6MB
- **Exchange site stub** — `exchange-web/index.html` for `exchange.everdream.app`
- **Spec** — `docs/specs/SPEC-06-simulacra-economy.md`

### Session: SPEC-06 Phase 2 (Jun 18, 2026)

- **Supabase persistence** — `assetPersistence.ts`, `simulacraPersistence.ts`; blob→`dream-media` upload
- **Simulacrum reload** — `getSimulacrumAsync()` loads from cloud on screen open
- **Dream detail pipeline** — collapsible `DreamAssetGenerator` with Phase 3 `mesh_3d`
- **IPFS** — `ipfs.ts` Pinata upload in `mintNFT()`
- **Silent mint** — `silentMint.ts` + `003_silent_mint_tables.sql` (custodial_wallets, dream_nfts)
- **Discord bot stub** — `discordBot.ts` slash command definitions
- **Env** — `.env.example` Pinata, Discord, NFT contract vars

### Session: SPEC-06 Phase 3 — chain, bot, deploy (Jun 18, 2026)

- **ERC-721** — `contracts/EverDreamNFT.sol`, Hardhat deploy scripts, 2 passing tests
- **On-chain mint** — `silent-mint-queue` calls `mintDream` when `CHAIN_RPC_URL` + deployer key set
- **chainMint.ts** — explorer URLs, chain config (Base Sepolia / Polygon Amoy)
- **Discord bot** — `discord-bot/` with slash commands + Dockerfile
- **exchange-web** — nginx Dockerfile; `public/exchange` redirect in main app
- **Migration** — `004_dream_assets_text_id.sql`

### Session: RevenueCat + Stripe subscriptions (Jun 18, 2026)

- **Migration** `005_subscriptions.sql` — `profiles.subscription_tier`, Stripe/RC ids, `subscription_events`
- **Client** — `lib/subscriptions/*`, `useSubscription`, wired Settings → Subscription tab
- **RevenueCat** — `@revenuecat/purchases-capacitor` (Play + App Store on native)
- **Stripe** — `stripe-checkout`, `stripe-portal`, `stripe-webhook` edge functions
- **RevenueCat webhook** — `revenuecat-webhook` updates Supabase entitlements
- **Gating** — free tier 5 AI images/month via `usageLimits.ts`

### Next

1. `cd contracts && npm run deploy:base-sepolia` (set `DEPLOYER_PRIVATE_KEY`)
2. Supabase: `db push` migrations 003–004; deploy `silent-mint-queue`; set chain secrets
3. Coolify: deploy `exchange-web` + `discord-bot` images
4. Friend requests backend, public profile RLS (Phase 3 backlog)

---

# V2 Redesign Implementation Specification

**Document Version:** 1.0  
**Created:** May 25, 2025  
**Branch:** `ed.app.new`  
**Status:** ✅ Components Built - Ready for Integration

---

## 📋 Executive Summary

This document provides a complete blueprint for the V2 redesign of EverDream, including all newly created components, utilities, and design systems. Use this specification to manually integrate these features into your main branch.

### Key Achievements

✅ **VideoCaptureFlow Component** - Full-screen camera capture with emotion detection  
✅ **MetricBadges Component** - C/E/N (Clarity/Emotion/Nightmare) metrics display  
✅ **dreamAnalysis Utility** - AI-powered metric calculation engine  
✅ **Glassmorphism Design System** - Complete visual language with CSS variables  
✅ **Wearables Sorting Algorithm** - Intelligent device prioritization  

---

## 🎨 Complete Design System

### Color Palette

```css
/* Primary Brand Colors */
--brand-primary: #5ec4a8;      /* Sage green - primary actions */
--brand-primary-dark: #4ab392; /* Darker sage for hover states */
--brand-secondary: #a8eddc;    /* Light mint - backgrounds */
--brand-accent: #e88fa0;       /* Rose - alerts & highlights */

/* Neutral Palette */
--neutral-ink: #1a1a2e;        /* Primary text */
--neutral-slate: #4a4a68;      /* Secondary text */
--neutral-muted: #9b96b0;      /* Tertiary text */
--neutral-line: #d8dae2;       /* Borders */
--neutral-cream: #f8f7fa;      /* Light backgrounds */
--neutral-parchment: #f0eff4;  /* Card backgrounds */
```

### Glassmorphism CSS Variables

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.65);
  --glass-bg-light: rgba(255, 255, 255, 0.45);
  --glass-bg-heavy: rgba(255, 255, 255, 0.85);
  --glass-border: rgba(168, 237, 220, 0.22);
  --glass-border-strong: rgba(168, 237, 220, 0.45);
  --glass-shadow: 0 1px 6px rgba(168, 237, 220, 0.10);
  --glass-shadow-lg: 0 8px 32px rgba(168, 237, 220, 0.15);
  --glass-shadow-xl: 0 16px 48px rgba(168, 237, 220, 0.20);
  --glass-blur: blur(12px);
  --glass-blur-strong: blur(20px);
}
```

### Typography

```css
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-display: 'Playfair Display', Georgia, serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Gradients

```css
--gradient-dream: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
--gradient-sage: linear-gradient(135deg, #5ec4a8 0%, #a8eddc 100%);
--gradient-sunset: linear-gradient(135deg, #e88fa0 0%, #f5a623 100%);
--gradient-night: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%);
```

---

## 📁 File-by-File Changes

### NEW FILES CREATED

#### 1. `src/components/VideoCaptureFlow.tsx` (450 lines)

**Purpose:** Full-screen immersive video capture for dream recording

**Key Features:**
- Full-screen camera preview with gesture controls
- Recording timer with color-coded warnings
- Front/back camera toggle
- Audio mute/unmute
- Haptic feedback on mobile
- Auto-stop at max duration (default: 3 minutes)
- Emotion detection integration hook
- Thumbnail generation from video

**Exports:**
```typescript
interface VideoCaptureData {
  videoBlob: Blob;
  duration: number;
  thumbnail?: string;
  timestamp: string;
  hasAudio: boolean;
}

interface VideoCaptureFlowProps {
  onComplete: (data: VideoCaptureData) => void;
  onCancel: () => void;
  initialFacingMode?: 'user' | 'environment';
  maxDuration?: number;
  enableAudio?: boolean;
  onEmotionDetected?: (emotion: string, confidence: number) => void;
}
```

**Usage Example:**
```tsx
import { VideoCaptureFlow } from './components/VideoCaptureFlow';

function DreamRecorder() {
  const handleComplete = (data: VideoCaptureData) => {
    console.log('Recorded:', data.duration, 'seconds');
    // Save videoBlob to storage
  };
  
  return (
    <VideoCaptureFlow
      onComplete={handleComplete}
      onCancel={() => navigate('/journal')}
      maxDuration={180}
    />
  );
}
```

---

#### 2. `src/components/MetricBadges.tsx` (363 lines)

**Purpose:** Display C/E/N dream quality metrics with beautiful badges

**Key Features:**
- Three metric badges: Clarity, Emotion, Nightmare
- Color-coded gradients based on score ranges
- Animated value transitions
- Interactive tooltips with explanations
- Multiple size variants (sm, md, lg)
- Compact and detailed display modes

**Metrics Explained:**
- **Clarity (C):** 0-100 score for vividness and memorability
- **Emotion (E):** 0-100 score for emotional intensity
- **Nightmare (N):** 0-100 score for nightmare likelihood

**Exports:**
```typescript
interface DreamMetrics {
  clarity: number;
  emotion: number;
  nightmare: number;
}

// Components
export function MetricBadges({ metrics, size, showTooltips, animated })
export function CompactMetrics({ metrics })
export function MetricsPanel({ metrics })
```

**Score Labels:**
```
Clarity:
  80-100: "Crystal Clear"
  60-79:  "Vivid"
  40-59:  "Moderate"
  20-39:  "Fuzzy"
  0-19:   "Hazy"

Emotion:
  80-100: "Intense"
  60-79:  "Strong"
  40-59:  "Balanced"
  20-39:  "Mild"
  0-19:   "Subtle"

Nightmare:
  80-100: "Nightmare"
  60-79:  "Unsettling"
  40-59:  "Neutral"
  20-39:  "Peaceful"
  0-19:   "Serene"
```

**Usage Example:**
```tsx
import { MetricBadges, MetricsPanel } from './components/MetricBadges';

function DreamCard({ dream }) {
  return (
    <div className="dream-card">
      <MetricBadges 
        metrics={dream.metrics} 
        size="md"
        animated={true}
      />
      <MetricsPanel metrics={dream.metrics} />
    </div>
  );
}
```

---

#### 3. `src/utils/dreamAnalysis.ts` (389 lines)

**Purpose:** Calculate C/E/N metrics from dream content using AI and keyword analysis

**Key Features:**
- Keyword-based emotion detection
- Sentence structure analysis for coherence
- Sensory detail counting
- Facial expression integration
- AI analysis result incorporation
- Confidence scoring

**Functions:**
```typescript
// Main calculation function
function calculateDreamMetrics(
  dreamText: string,
  analysis?: DreamAnalysis,
  facialEmotions?: EmotionCapture[]
): DetailedMetrics

// Quick estimation without AI
function quickEstimateMetrics(dreamText: string): DreamMetrics

// Get overall quality score
function getDreamQualityScore(metrics: DreamMetrics): number

// Classify dream type
function classifyDreamType(metrics: DreamMetrics): string

// Generate insight text
function generateMetricInsight(metrics: DreamMetrics): string
```

**Detailed Metrics Structure:**
```typescript
interface DetailedMetrics extends DreamMetrics {
  clarityBreakdown: {
    vividness: number;
    detail: number;
    coherence: number;
  };
  emotionBreakdown: {
    intensity: number;
    variety: number;
    facialAlignment: number;
  };
  nightmareBreakdown: {
    fearIndicators: number;
    threatLevel: number;
    negativeEmotions: number;
  };
  confidence: number; // 0-1
}
```

**Keyword Databases:**
- `CLARITY_KEYWORDS`: 20+ words indicating high clarity
- `FUZZY_KEYWORDS`: 18+ words indicating low clarity
- `EMOTION_KEYWORDS`: 30+ emotions with intensity scores
- `NIGHTMARE_KEYWORDS`: 30+ nightmare indicators

**Usage Example:**
```tsx
import { calculateDreamMetrics, classifyDreamType } from './utils/dreamAnalysis';

async function analyzeDreamEntry(text: string, aiAnalysis: DreamAnalysis) {
  const metrics = calculateDreamMetrics(text, aiAnalysis);
  const dreamType = classifyDreamType(metrics);
  
  console.log(`${dreamType}: C${metrics.clarity}/E${metrics.emotion}/N${metrics.nightmare}`);
  
  return { metrics, dreamType };
}
```

---

#### 4. `src/skins/glassmorphism.ts` (395 lines)

**Purpose:** Complete glassmorphism design system with CSS variables and utilities

**Contents:**
- Full CSS custom properties definition
- Utility classes for glass effects
- Tailwind plugin configuration
- React inline styles
- Animation keyframes
- Dark mode support
- Accessibility enhancements

**CSS Classes Provided:**
```css
.glass              /* Standard glass effect */
.glass-light        /* Lighter transparency */
.glass-heavy        /* Heavier blur */
.glass-card         /* Card with hover effect */
.glass-button       /* Interactive button */
.glass-input        /* Form input field */

.gradient-dream     /* Purple dream gradient */
.gradient-sage      /* Sage green gradient */
.gradient-sunset    /* Orange sunset gradient */
.gradient-night     /* Dark night gradient */

.animate-float      /* Floating animation */
.animate-shimmer    /* Shimmer effect */
.animate-pulse-glow /* Pulsing glow */
```

**React Styles Object:**
```typescript
const glassStyles = {
  card: { /* CSSProperties for cards */ },
  button: { /* CSSProperties for buttons */ },
  input: { /* CSSProperties for inputs */ },
  modal: { /* CSSProperties for modals */ },
};
```

**Usage:**
```tsx
// Import CSS in your main file
import { glassmorphismCSS } from './skins/glassmorphism';

// Add to index.css or App.tsx
const style = document.createElement('style');
style.textContent = glassmorphismCSS;
document.head.appendChild(style);

// Use inline styles
import { glassStyles } from './skins/glassmorphism';

function MyCard() {
  return (
    <div style={glassStyles.card}>
      Beautiful glassmorphism card
    </div>
  );
}
```

---

#### 5. `src/utils/wearablesSorting.ts` (430 lines)

**Purpose:** Intelligent wearable device sorting and prioritization algorithm

**Key Features:**
- Multi-factor scoring (data quality, recency, completeness, reliability)
- Provider baseline rankings
- Automatic tier assignment
- Visual priority indicators
- Smart conflict resolution

**Priority Factors:**
```
Data Quality (35%):
  - Sleep stages availability
  - HRV data presence
  - Heart rate tracking
  - Respiratory rate
  - Temperature data
  - Sleep score

Recency (25%):
  - Time since last sync
  - Freshness of data

Completeness (20%):
  - Enabled status
  - Valid auth token
  - Historical sync count

Reliability (20%):
  - Provider baseline reputation
  - Historical success rate
  - Average response time
```

**Provider Baseline Rankings:**
```
oura:             95 (Industry leader)
apple_health:     90 (Excellent iOS integration)
garmin_connect:   88 (Athlete-focused)
withings:         85 (Medical-grade)
polar:            83 (Precision tracking)
fitbit:           80 (Popular choice)
samsung_health:   78 (Android standard)
huawei_health:    75 (TruSleep technology)
xiaomi_mi_fitness: 72 (Budget-friendly)
amazfit:          72 (Value option)
google_fit:       68 (Aggregator)
sony:             65 (Limited API)
```

**Priority Tiers:**
```
premium (85-100):  Primary Source - Green indicator
standard (65-84):  Reliable - Blue indicator
basic (45-64):     Limited Data - Amber indicator
low (0-44):        Minimal - Gray indicator
```

**Exports:**
```typescript
interface WearablePriority {
  provider: WearableProvider;
  priorityScore: number;
  dataQuality: number;
  recency: number;
  completeness: number;
  reliability: number;
  tier: 'premium' | 'standard' | 'basic' | 'low';
  indicatorColor: string;
  sortOrder: number;
}

function calculateWearablePriority(config, options): WearablePriority
function sortWearablesByPriority(configs[], options): SortedWearable[]
function getRecommendedPrimaryWearable(configs[]): WearableConfig | null
function getPriorityDisplayText(priority): string
function generatePriorityTooltip(priority): string
```

**Usage Example:**
```tsx
import { sortWearablesByPriority, getRecommendedPrimaryWearable } from './utils/wearablesSorting';

function WearableManager({ configs }) {
  const sorted = sortWearablesByPriority(configs, {
    recordsMap: sleepRecordsByProvider,
    lastSyncMap: lastSyncTimes,
    historicalSyncsMap: syncCounts,
  });
  
  const recommended = getRecommendedPrimaryWearable(configs);
  
  return (
    <div>
      {recommended && (
        <div>Recommended: {recommended.provider}</div>
      )}
      {sorted.map(wearable => (
        <WearableCard 
          key={wearable.provider}
          wearable={wearable}
          priority={wearable.priority}
        />
      ))}
    </div>
  );
}
```

---

## 🎥 Video Capture UX - 3-Screen Wireframe

### Screen 1: Preview State
```
┌─────────────────────────────────┐
│  [X]                    [Space] │  ← Top bar with cancel
│                                 │
│                                 │
│     ┌───────────────┐           │
│     │               │           │
│     │   CAMERA      │           │  ← Live camera preview
│     │   PREVIEW     │           │
│     │               │           │
│     └───────────────┘           │
│                                 │
│        Feeling: neutral         │  ← Emotion indicator
│                                 │
│    [Mic]  (●)  [Flip]          │  ← Bottom controls
│                                 │
│  Tap circle to start recording  │  ← Instructions
└─────────────────────────────────┘
```

### Screen 2: Recording State
```
┌─────────────────────────────────┐
│  [X]    🔴 01:23 / 03:00       │  ← Recording timer
│                                 │
│     ┌───────────────┐           │
│     │               │           │
│     │   RECORDING   │           │  ← Active recording
│     │   [PULSING]   │           │
│     │               │           │
│     └───────────────┘           │
│                                 │
│      Feeling: sleepy 😴         │  ← Real-time emotion
│                                 │
│    [Mic]  [■]  [Flip]          │  ← Stop button active
│                                 │
└─────────────────────────────────┘
```

### Screen 3: Processing State
```
┌─────────────────────────────────┐
│                                 │
│                                 │
│         ⟳ (spinning)            │  ← Loading spinner
│                                 │
│   Processing your dream...      │  ← Status message
│   This won't take long          │
│                                 │
│                                 │
└─────────────────────────────────┘
```

---

## 📊 New Metrics (C/E/N) - Calculation Logic

### Clarity Score Algorithm

```typescript
vividnessScore = 50 + (clarityKeywords * 8) - (fuzzyKeywords * 10)
detailScore = 50 + min(30, sensoryWords * 6) + min(20, themesCount * 3)
coherenceScore = based on sentence length analysis

clarity = (vividness * 0.4) + (detail * 0.35) + (coherence * 0.25)
```

### Emotion Score Algorithm

```typescript
intensityScore = average of found emotion intensities
varietyScore = min(100, uniqueEmotions * 15)
facialAlignmentScore = based on facial detection confidence

emotion = (intensity * 0.5) + (variety * 0.3) + (facialAlignment * 0.2)
```

### Nightmare Score Algorithm

```typescript
fearScore = min(100, nightmareKeywords * 12)
threatScore = min(100, threatPhrases * 15)
negativeEmotionScore = min(100, negativeEmotions * 18)

nightmare = (fear * 0.35) + (threat * 0.35) + (negativeEmotion * 0.3)
```

### Dream Type Classification

```typescript
if (nightmare >= 70) {
  if (clarity >= 70) return 'Lucid Nightmare'
  return 'Classic Nightmare'
}
if (clarity >= 80 && emotion >= 60) {
  if (emotion >= 80) return 'Intense Lucid Dream'
  return 'Clear Lucid Dream'
}
if (emotion >= 75 && nightmare < 30) {
  return 'Positive Emotional Dream'
}
if (clarity < 40 && emotion < 40) {
  return 'Fleeting Dream'
}
if (nightmare < 25 && emotion < 40) {
  return 'Peaceful Dream'
}
return 'Standard Dream'
```

---

## 🔒 Privacy & NFT Changes

### Before/After Comparison

**BEFORE:**
- Dreams stored locally only
- No encryption
- NFT minting available for all dreams

**AFTER:**
- Optional cloud sync with end-to-end encryption
- Per-dream privacy toggle (private/public)
- NFT minting only for public dreams
- Automatic metadata scrubbing for private dreams

### Privacy Toggle Implementation

```tsx
import { PrivacyToggle } from './components/dreams/PrivacyToggle';

function DreamSettings({ dream }) {
  return (
    <PrivacyToggle
      isPrivate={dream.isPrivate}
      onToggle={(isPrivate) => updateDreamPrivacy(dream.id, isPrivate)}
    />
  );
}
```

### NFT Minting Restrictions

```typescript
// Before minting, check privacy status
async function mintNFT(dreamId: string) {
  const dream = await getDream(dreamId);
  
  if (dream.isPrivate) {
    throw new Error('Cannot mint NFT for private dreams');
  }
  
  // Scrub personal metadata
  const cleanMetadata = {
    ...dream.metadata,
    location: undefined,
    timestamp: undefined,
    userId: undefined,
  };
  
  return nftService.mint(cleanMetadata);
}
```

---

## 👟 Wearables Sorting - Visual Indicators

### Priority Badge Component

```tsx
function WearablePriorityBadge({ priority }: WearablePriorityBadgeProps) {
  return (
    <div 
      className="priority-badge"
      style={{ borderColor: priority.indicatorColor }}
      title={generatePriorityTooltip(priority)}
    >
      <div 
        className="indicator-dot"
        style={{ backgroundColor: priority.indicatorColor }}
      />
      <span>{getPriorityDisplayText(priority)}</span>
      <span className="score">{priority.priorityScore}</span>
    </div>
  );
}
```

### Visual Tier Indicators

```
Premium (★):  [Green Dot] Primary Source - 92
Standard (✓): [Blue Dot]  Reliable - 78
Basic (-):    [Amber Dot] Limited Data - 55
Low (○):      [Gray Dot]  Minimal - 32
```

---

## 🛠️ Build Error Fixes

### Common Errors & Solutions

**Error 1: Module not found**
```
Error: Cannot find module 'face-api.js'
Solution: npm install @vladmandic/face-api
```

**Error 2: TypeScript interface mismatch**
```
Error: Property 'valence' does not exist on type 'DreamAnalysis'
Solution: Add optional valence property to DreamAnalysis interface
```

**Error 3: CSS variable undefined**
```
Warning: Unknown CSS variable --glass-bg
Solution: Import glassmorphismCSS in main entry point
```

---

## ✅ Testing Checklist

### VideoCaptureFlow Tests (8 tests)

- [ ] Camera permission request works
- [ ] Recording starts on button tap
- [ ] Timer displays correctly
- [ ] Auto-stop at max duration
- [ ] Camera flip toggles facing mode
- [ ] Audio toggle mutes/unmutes
- [ ] Video blob generated on complete
- [ ] Thumbnail extracted from video

### MetricBadges Tests (6 tests)

- [ ] Badges render with correct colors
- [ ] Tooltips appear on hover
- [ ] Animation counts from 0 to target
- [ ] Size variants apply correctly
- [ ] CompactMetrics renders inline
- [ ] MetricsPanel shows breakdown

### Dream Analysis Tests (7 tests)

- [ ] Clarity keywords detected correctly
- [ ] Emotion intensity calculated
- [ ] Nightmare indicators scored
- [ ] Facial emotions integrated
- [ ] AI analysis incorporated
- [ ] Confidence score computed
- [ ] Dream type classified

### Wearables Sorting Tests (6 tests)

- [ ] Priority scores calculated
- [ ] Sorting by enabled status first
- [ ] Recency affects score
- [ ] Data quality weighted correctly
- [ ] Recommended wearable selected
- [ ] Tooltip text generated

### Integration Tests (5 tests)

- [ ] VideoCaptureFlow → dream creation
- [ ] Metrics display on dream cards
- [ ] Wearables sync triggers re-sort
- [ ] Privacy toggle prevents NFT mint
- [ ] Glassmorphism styles applied

---

## 🚀 Deployment Guide

### Branch Strategy

```bash
# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/v2-redesign

# Cherry-pick or copy new files
cp /workspace/ed.app.new/src/components/VideoCaptureFlow.tsx src/components/
cp /workspace/ed.app.new/src/components/MetricBadges.tsx src/components/
cp /workspace/ed.app.new/src/utils/dreamAnalysis.ts src/utils/
cp /workspace/ed.app.new/src/skins/glassmorphism.ts src/skins/
cp /workspace/ed.app.new/src/utils/wearablesSorting.ts src/utils/

# Commit changes
git add .
git commit -m "feat: Add V2 redesign components

- VideoCaptureFlow: Full-screen camera capture
- MetricBadges: C/E/N metrics display
- dreamAnalysis: Metric calculation engine
- glassmorphism: Design system
- wearablesSorting: Priority algorithm"

# Push and create PR
git push origin feature/v2-redesign
```

### Merge Conflict Resolution

**Likely Conflicts:**
1. `DreamJournalApp.tsx` - Video capture integration
2. `InsightCard.tsx` - Replace with MetricBadges
3. `wearables.ts` - Sorting integration

**Resolution Strategy:**
```bash
# When conflicts occur
git merge main

# For each conflicted file
git mergetool  # Use your preferred merge tool

# Or manually edit
code src/components/DreamJournalApp.tsx

# After resolving all conflicts
git add .
git commit -m "Merge main into feature/v2-redesign"
```

### Rollback Plan

```bash
# If issues arise after deployment
git checkout main
git revert <merge-commit-hash>
git push origin main

# Or reset to previous tag
git tag backup-before-v2
git reset --hard <previous-stable-commit>
git push --force origin main
```

---

## 📦 Package Dependencies

Add these to `package.json` if not already present:

```json
{
  "dependencies": {
    "@vladmandic/face-api": "^1.7.12",
    "lucide-react": "^0.x.x"
  }
}
```

Install with:
```bash
npm install @vladmandic/face-api lucide-react
```

---

## 📝 Integration Steps

### Step 1: Copy Files
```bash
# Copy all new component files
cp -r /workspace/ed.app.new/src/components/VideoCaptureFlow.tsx your-project/src/components/
cp -r /workspace/ed.app.new/src/components/MetricBadges.tsx your-project/src/components/
cp -r /workspace/ed.app.new/src/utils/dreamAnalysis.ts your-project/src/utils/
cp -r /workspace/ed.app.new/src/skins/glassmorphism.ts your-project/src/skins/
cp -r /workspace/ed.app.new/src/utils/wearablesSorting.ts your-project/src/utils/
```

### Step 2: Import Design System
```tsx
// In your main entry point (main.tsx or App.tsx)
import { glassmorphismCSS } from './skins/glassmorphism';

// Inject CSS
const style = document.createElement('style');
style.textContent = glassmorphismCSS;
document.head.appendChild(style);
```

### Step 3: Update Dream Cards
```tsx
// Replace InsightCard with MetricBadges
import { MetricBadges } from './components/MetricBadges';

function DreamCard({ dream }) {
  return (
    <div className="glass-card">
      <MetricBadges metrics={dream.metrics} />
      {/* Rest of card content */}
    </div>
  );
}
```

### Step 4: Integrate Video Capture
```tsx
// In your dream entry flow
import { VideoCaptureFlow } from './components/VideoCaptureFlow';

function DreamEntryModal() {
  const [showCamera, setShowCamera] = useState(false);
  
  if (showCamera) {
    return (
      <VideoCaptureFlow
        onComplete={handleVideoComplete}
        onCancel={() => setShowCamera(false)}
      />
    );
  }
  
  return <button onClick={() => setShowCamera(true)}>Record Dream</button>;
}
```

### Step 5: Add Metrics Calculation
```tsx
// In your dream processing pipeline
import { calculateDreamMetrics } from './utils/dreamAnalysis';

async function processDream(text: string, analysis: DreamAnalysis) {
  const metrics = calculateDreamMetrics(text, analysis);
  
  await saveDream({
    text,
    analysis,
    metrics,
  });
}
```

### Step 6: Implement Wearable Sorting
```tsx
// In your wearable settings
import { sortWearablesByPriority } from './utils/wearablesSorting';

function WearableSettings({ configs }) {
  const sorted = sortWearablesByPriority(configs, {
    recordsMap: sleepData,
    lastSyncMap: syncTimes,
  });
  
  return (
    <div>
      {sorted.map(wearable => (
        <WearableRow 
          key={wearable.provider}
          wearable={wearable}
          priority={wearable.priority}
        />
      ))}
    </div>
  );
}
```

---

## 🎯 Success Criteria

After integration, verify:

- ✅ Video capture launches in full-screen mode
- ✅ C/E/N badges display on all dream cards
- ✅ Metrics update when dream is analyzed
- ✅ Glassmorphism styles applied throughout
- ✅ Wearables sorted by priority score
- ✅ Privacy toggle visible on dream settings
- ✅ NFT minting blocked for private dreams
- ✅ All animations smooth at 60fps
- ✅ Mobile responsive on all screen sizes
- ✅ Accessibility features working (keyboard nav, screen readers)

---

## 📞 Support

For questions or issues during integration:

1. Check this document's troubleshooting sections
2. Review component JSDoc comments
3. Inspect browser console for errors
4. Verify all dependencies are installed
5. Confirm CSS variables are injected

---

**End of Implementation Specification**

*Last updated: May 25, 2025*
