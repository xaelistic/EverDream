# App Functionality: Feature Specs (MVP) — Chunk-Based Build

> **Build Strategy**: Ship one chunk at a time. Each chunk is independently testable and valuable.

---

## Chunk A: Sleep Encouragement & Education
**Goal**: Help users establish healthy sleep habits without coercion.

### Features
- [ ] Guided meditations/breathing library (5-10 min sessions)
  - Categories: Wind-down, anxiety relief, lucid prep
  - Offline download support
- [ ] Ambient soundscape player
  - Presets: Rain, forest, ocean, white noise, binaural beats
  - Timer + fade-out options
- [ ] Sleep timing reminders
  - User-set window + smart suggestions (based on sleep score history)
  - Gentle notification copy: "Consider winding down soon 🌙"
- [ ] Circadian education cards
  - Short, skimmable tips: blue light, room temperature, chronotypes
  - Sources: Foster protocols, sleep science research
  - Localized per user tradition (Buddhist, Celtic, Scientific, etc.)
- [ ] Ethical affiliate shelf (optional)
  - OTC sleep aids that encourage dreaming: melatonin, L-theanine, ashwagandha
  - Clear disclaimer: "Not medical advice; consult your doctor"
  - Revenue share to fund open development

### Technical Specs
```typescript
interface SleepEducationCard {
  id: string;
  title: string;
  content: string;
  source: string;
  tradition?: 'buddhist' | 'celtic' | 'scientific' | 'general';
  readTimeSec: number;
}

interface AmbientSound {
  id: string;
  name: string;
  url: string; // CDN
  durationSec: number;
  tags: ['rain', 'calm', 'sleep'];
}
```

## Chunk B: Morning Reflection & Dream Prompt
**Goal**: Capture fresh morning context and prepare the user to remember and record dreams.

### Features
- [ ] Sleep summary card with duration, sleep stages, and consistency insights
- [ ] Mood and energy capture with emoji and optional dimensional sliders
- [ ] Daily quote or prompt tied to tradition and reflection
- [ ] One-tap entry CTA with “Capture last night’s dream” and “Skip for now” options
- [ ] Saved pre-sleep intent and lucidity context surfaced from the previous evening
- [ ] Optional morning journal entry for mood, intention, and gratitude

### Technical Specs
```typescript
interface SleepSummary {
  date: string;
  totalMinutes: number;
  stages: {
    rem: number;
    light: number;
    deep: number;
    awake: number;
  };
  score?: number;
  consistencyBadge?: string;
}

interface MoodEntry {
  moodId: string;
  label: string;
  intensity: number; // 0-100
  energy: number; // 0-100
  note?: string;
}

interface ReflectionCard {
  id: string;
  title: string;
  prompt: string;
  source: string;
  tradition?: string;
}
```

## Chunk C: Dream & Vision Capture + AI Verification
**Goal**: Make it easy to record dreams and validate AI meaning while preserving trust.

### Features
- [ ] Video-first capture with live transcription and voice entry
- [ ] Audio-only and text-only input modes
- [ ] Draft autosave and recover on exit or network loss
- [ ] Context fields for pre-sleep events, intent tags, and lucidity rating
- [ ] AI-assisted synthesis into narrative nugget, themes, tone, and optional image cues
- [ ] Editable verification flow with “why this?” explanations and provenance notes
- [ ] Save, edit, and version history for every captured dream

### Technical Specs
```typescript
interface DreamCaptureDraft {
  id: string;
  userId: string;
  createdAt: string;
  mode: 'video' | 'audio' | 'text';
  transcript?: string;
  text?: string;
  attachedMedia?: { type: 'image' | 'video' | 'audio'; url: string }[];
  intents?: string[];
  lucidityLevel?: number;
  preSleepNote?: string;
}

interface AiAnalysisResult {
  dreamId: string;
  summary: string;
  themes: string[];
  emotions: { label: string; intensity: number }[];
  confidence: number;
  reasoning?: string;
  tags?: string[];
  createdAt: string;
}
```

## Chunk D: Visualization, Sharing, and Privacy
**Goal**: Offer optional creative expression and sharing without pressuring the core journaling flow.

### Features
- [ ] Dream visualization generator with preset styles
- [ ] Share card creation for stories, social posts, or internal circles
- [ ] Privacy controls: Private, Trusted Circle, Public
- [ ] Preview and edit sharing metadata before publication
- [ ] Optional internal feed and read-only shared collections
- [ ] Export options for PDF, text archive, or image storybook

### Technical Specs
```typescript
interface MediaGenerationRequest {
  dreamId: string;
  style: 'artistic' | 'realistic' | 'surreal' | 'minimal' | 'cinematic';
  seed?: string;
  outputType: 'image' | 'video';
}

interface ShareSettings {
  dreamId: string;
  visibility: 'private' | 'trusted' | 'public';
  caption?: string;
  tags?: string[];
  sharedAt?: string;
}
```

## Chunk E: Longitudinal Insight & Personal Model
**Goal**: Help users see longer-term patterns and refine their personal dream intelligence.

### Features
- [ ] Calendar view with sleep and dream icons
- [ ] Pattern summary cards for recurring themes, moods, and sleep habits
- [ ] Personal model ledger: preferred prompts, tag associations, and verified edits
- [ ] Smart suggestions for future capture prompts based on user history
- [ ] Weekly or monthly insight recaps with optional reflection actions

### Technical Specs
```typescript
interface DreamHistoryEntry {
  id: string;
  date: string;
  themeTags: string[];
  moodSummary?: string;
  lucidityLevel?: number;
}

interface PatternInsight {
  insightId: string;
  title: string;
  description: string;
  confidenceScore: number;
  relatedDates: string[];
  tags: string[];
}
```

### Analytics Events
- `morning_reflection_completed`
- `dream_capture_started`
- `ai_verification_completed`
- `share_card_created`
- `insight_reviewed`
