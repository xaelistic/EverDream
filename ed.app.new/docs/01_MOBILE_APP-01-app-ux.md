# App UX: User Journey (MVP) — With Grok Expansion

> **Guiding Principles** (from EDI + App Spec)
> 1. **Radical Ownership**: User owns raw data + AI narratives.
> 2. **Non-coercion**: Gentle prompts, skippable everything, no guilt-based streaks.
> 3. **Relational Value**: Easy, honest sharing builds collective wisdom.
> 4. **Inspired by**: Calm (polish, sleep stories), Intelligent Change (morning reflection), Dream Journal Ultimate/Oniri (simple capture + lucidity hooks).

---

## Core Daily Loop (MVP)
Every day, the app supports a gentle rhythm: prepare for sleep, reflect on rest, capture dreams, verify AI meaning, then optionally create and share.

1. Evening wind-down
2. Morning reflection
3. Dream / vision capture
4. AI processing + verification
5. Optional imagery / sharing
6. Long-term insight and personal model refinement

All steps are optional and skip-friendly; the product is designed around choice and low friction.

---

## Detailed Flows (Modular for Phased Builds)

### Flow 1: Evening Wind-Down (Sleep Encouragement – Chunk A)
**Trigger**: User-set window OR wearable sleep-stage detection.

**Steps**:
1. Push notification: "Time to prepare the mind 🌙"
2. Quick-action sheet:
   - 🧘 Guided breathing (3-5 min, Calm-style)
   - 🌧️ Ambient sounds (rain, forest, white noise)
   - 💡 Blue-light reminder + circadian education tip
3. Optional intent setting:
   - Prompt: "What question do I carry into sleezp?"
   - Free-text or tag selection (e.g., "clarity", "release", "curiosity")
   - Stored as `pre_sleep_intent` → feeds dream capture context
4. Sensor integration (if available):
   - Phone/wearable temp + light sensors
   - Nudge: "Room is warm — consider cooling for deeper sleep"

**UX Notes**:
- All steps skippable; no forced engagement.
- Haptic feedback on selection.
- Progress ring for breathing exercises.

---

### Flow 2: Morning Reflection Prompt (Chunk B)
**Trigger**: Wearable sleep-end detection OR fixed morning window.

**Steps**:
1. Sleep summary card:
   - Score (0-100) + breakdown: REM/deep/light/awake (from wearable)
   - Duration + consistency streak (gentle, non-gamified)
2. Mood valence wheel:
   - 6 base emojis: 😌 😰 😢 😠 😲 🤩
   - Premium: 12-option wheel + dimensional sliders (valence/arousal)
   - Encouraged twice daily (evening + morning)
3. Quote of the day:
   - Localized per onboarding tradition (Buddhist, Celtic, Scientific, etc.)
   - Sources: Jungian archetypes, dream history, sleep science
4. CTA: "Capture last night's dream" (primary) or "Skip for now"

**UX Notes**:
- Quote tappable for source/context.
- Mood selection animates emoji + subtle sound.
- "Skip" preserves streak without penalty.

---

### Flow 3: Dream/Vision Capture (Chunk C – Highest Priority)
**Default**: Video (front camera, groggy-friendly) with live transcription.

**Toggles**:
- 🎙️ Audio-only (lower bandwidth)
- ✍️ Text input (paste-friendly)
- Hybrid: Start video → switch to text mid-capture

**Visceral Focus Prompts**:
- "Capture the feeling, the essence — not just the plot"
- "What stayed with you when you woke?"
- Optional context fields:
  - Pre-sleep events (free text)
  - Intent tag (from evening flow)
  - Lucidity level (slider: 0% "just a dream" → 100% "fully aware")

**Capture UI**:
- Full-screen camera with minimal overlay
- Big record button + pause/resume
- Live word counter + estimated duration
- Auto-save draft on exit/network loss

**UX Notes**:
- Front camera default (more personal, less performative)
- Live transcription preview (editable post-capture)
- "Groggy mode": Large tap targets, voice-first navigation

---

### Flow 4: AI Processing & Verification (Chunk C continued)
**Transparent Loading State**:
- Animation: "Reconstructing your experience…"
- Progress indicator with micro-insights ("Finding themes…", "Mapping emotions…")

**AI Outputs (Editable)**:
1. **Narrative "Nugget"**: 15-20 word essence statement
2. **Themes**: 2-3 tags (e.g., "water", "memory", "flight")
3. **Emotional tone**: Primary emotion + intensity slider (0-100%)
4. **Prosody-informed cues**: Voice tone/facial expression analysis (if video)

**User Verification Loop**:
- Edit any field directly
- Clarification popups (skippable):
  - "You mentioned 'flying' — was it more like (A) soaring freely or (B) struggling to stay aloft?"
  - "You felt 'peaceful' — was it more (A) calm contentment or (B) joyful liberation?"
- Affirmation step: "This honestly reflects my experience" (required to save)
- Provenance seal: Cryptographic hash + optional biometric tie-in

**UX Notes**:
- All edits preserved in version history
- "Why this suggestion?" tooltip explains AI reasoning
- Verification step builds trust + improves personal model

---

### Flow 5: Post-Capture (Chunk D)
**Optional Immediate Generation**:
- "Would you like to visualize this dream?"
- Free tier: 1 image every 3-4 days
- Premium: Daily images + weekly video
- Style prompts: Artistic, Realistic, Surreal, Minimal, Cinematic

**Privacy & Sharing**:
- Default: Copyleft (remixable with attribution)
- Toggles: Private / Trusted Circle / Public
- One-tap share: Instagram, Discord, internal feed
- Share preview: Auto-generates story card with nugget + image

**Longitudinal View**:
- Calendar with sleep + dream emojis (user-confirmable personal symbology)
- Pattern insights (gentle, non-gaming):
  - "You often dream of water after deep sleep"
  - "Peaceful dreams correlate with evening breathing exercises"

---

### Flow 6: Longitudinal Insight & Model Refinement (Chunk E)
**Trigger**: Weekly summary, pattern prompt, or user request.

**Steps**:
1. Personal insights dashboard:
   - Dream themes over time
   - Sleep habit correlations
   - Mood and lucidity trends
2. Gentle prompts:
   - "Notice how water dreams follow quiet evenings?"
   - "Would you like to save this pattern as a intention?"
3. Personal model refresh:
   - Update preference tags
   - Learn from verified edits
   - Surface smarter prompts next time
4. Optional archive:
   - Save favorite nuggets
   - Export dream journal entries
   - Build a private storybook

**UX Notes**:
- Wisdom should feel calm, not analytic.
- Offer insights as observations, not judgments.
- Keep sharing and export choices clearly separated from private reflection.

---

## MVP Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| First capture completion | 60% of new users within 3 days | Analytics event `dream_captured_first` |
| Verification rate | >80% of AI outputs confirmed/edited | `verification_completed` vs `verification_skipped` |
| Share conversion | 25% of verified dreams shared | `share_initiated` event |
| Retention (D7) | 40% of users return after first week | Cohort analysis |

---

## Out of Scope (Phase 2+ Markers)
❌ Full video generation (Higgsfield integration)  
❌ NFT minting + blockchain provenance  
❌ Advanced psychographics + Myers-Briggs profiling  
❌ Leaderboards + "dream popularity" metrics  
❌ VR dreamspaces + co-built meta-dreams  
❌ Tangibles store (printed journals, comics)  

> **Note**: All Phase 2 features should be architected for but hidden behind feature flags in MVP code.