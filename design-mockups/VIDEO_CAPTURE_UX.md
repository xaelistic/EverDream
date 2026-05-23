# Dream Journal V2 - Video Capture UX Mockups

## 🎥 Primary Video Capture Flow

### Screen 1: Direct Camera Launch (Full Screen)
```
┌─────────────────────────────────────┐
│                                     │
│  [Flash: Auto]        [Switch Cam]  │
│                                     │
│                                     │
│         ┌───────────────┐           │
│         │               │           │
│         │   CAMERA      │           │
│         │    FEED       │           │
│         │   (Live)      │           │
│         │               │           │
│         │  👤 User      │           │
│         │  facing cam   │           │
│         │               │           │
│         └───────────────┘           │
│                                     │
│     "Tell me about your dream..."   │
│         (subtle text prompt)        │
│                                     │
│         ┌─────────────┐             │
│         │   ● REC     │             │
│         │  (00:00)    │             │
│         └─────────────┘             │
│                                     │
│  [Gallery]    [Cancel]    [Done]    │
│                                     │
└─────────────────────────────────────┘

Design Notes:
- Full-screen camera, no navbar/header
- Opalescent gradient overlay at bottom (20% opacity)
- Record button: Large circular button with gradient ring
- Subtle animated pulse when recording
- Timer counts up in MM:SS format
- Flash/Switch controls semi-transparent at top
- Text prompt fades out after 3 seconds
```

---

### Screen 2: Processing State (After Recording Stops)
```
┌─────────────────────────────────────┐
│                                     │
│         ✨ Processing...            │
│                                     │
│    ┌─────────────────────────┐      │
│    │                         │      │
│    │   🎬 Video Thumbnail    │      │
│    │      (blurred)          │      │
│    │                         │      │
│    │   ━━━━━━━━━━━━━━━━      │      │
│    │   Transcribing audio... │      │
│    │                         │      │
│    └─────────────────────────┘      │
│                                     │
│   Step 1/3: Speech-to-Text    ✓    │
│   Step 2/3: Facial Analysis   ⟳    │
│   Step 3/3: AI Dream Analysis ⏳    │
│                                     │
│   "Analyzing your expressions..."   │
│                                     │
└─────────────────────────────────────┘

Design Notes:
- Dark overlay with glassmorphism card
- Progress steps with checkmarks/animations
- Subtle loading spinner for current step
- Background shows blurred last frame
- Soothing animation (not jarring)
```

---

### Screen 3: Review & Edit (Post-Processing)
```
┌─────────────────────────────────────┐
│  ← Back              Save Draft     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   Video Preview             │    │
│  │   [▶ Play] [📹 View]        │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  📝 Transcript                      │
│  ┌─────────────────────────────┐    │
│  │ "I was flying over a city   │    │
│  │ made of crystal. The sky    │    │
│  │ was purple and I felt..."   │    │
│  │                             │    │
│  │ [Edit Text]                 │    │
│  └─────────────────────────────┘    │
│                                     │
│  😊 Emotional Analysis              │
│  ┌─────────────────────────────┐    │
│  │ Wonder: ████████░░ 80%      │    │
│  │ Calm:   █████░░░░░ 50%      │    │
│  │ Anxiety: ██░░░░░░░░ 20%     │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Regenerate Analysis] [Save]       │
│                                     │
└─────────────────────────────────────┘

Design Notes:
- Clean vertical layout
- Video thumbnail tappable to play
- Transcript in editable glass card
- Emotion bars with gradient colors
- Save button prominent at bottom
- Back button allows re-recording
```

---

### Screen 4: Final Dream Card (Saved)
```
┌─────────────────────────────────────┐
│  Today's Dreams                     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │  [Video Thumbnail]          │    │
│  │                             │    │
│  │  Flying over crystal city   │    │
│  │  2 min video • Just now     │    │
│  │                             │    │
│  │  C:8  E:7  N:9              │    │
│  │  ─────────────────────      │    │
│  │  Keywords: Flying, Crystal, │    │
│  │            Freedom, Purple  │    │
│  │                             │    │
│  │  [View Analysis] [Share]    │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  [Sketch Thumbnail]         │    │
│  │  Morning sketch             │    │
│  │  5 min ago                  │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎨 Design Specifications

### Color Palette (Opalescent Theme)
```
Primary Gradient: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)
Secondary Gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)
Glass Background: rgba(255, 255, 255, 0.1)
Glass Border: rgba(255, 255, 255, 0.2)
Blur: backdrop-filter: blur(20px)
Text Primary: #ffffff
Text Secondary: rgba(255, 255, 255, 0.7)
Accent Pink: #f093fb
Accent Purple: #764ba2
Accent Blue: #667eea
Success Green: #10b981
Warning Amber: #f59e0b
Error Red: #ef4444
```

### Typography
```
Headings: Inter, 24-32px, weight 600-700
Body: Inter, 16px, weight 400
Labels: Inter, 14px, weight 500, uppercase tracking
Metrics: Inter, 12px, weight 700
```

### Animations
```
Button Press: scale(0.95) 150ms ease
Card Hover: translateY(-4px) 200ms ease
Sheen Effect: linear gradient sweep 2s infinite
Pulse Recording: scale(1.05) 1s infinite
Fade In: opacity 0→1 300ms ease
Slide Up: translateY(20px) → 0 300ms ease
```

### Component Spacing
```
Container Padding: 20px
Card Padding: 20px
Element Gap: 16px
Button Height: 56px
Border Radius: 16px (cards), 28px (buttons)
Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)
```

---

## 🔄 User Flow Diagram

```
[Home Screen]
     ↓
[Tap FAB (+)]
     ↓
[Capture Modal]
     ↓
[Tap "Video"] → [FULL SCREEN CAMERA] ← Entry Point
     ↓
[User speaks to camera]
     ↓
[Tap Stop/Checkmark]
     ↓
[PROCESSING SCREEN]
  ├─ Speech-to-Text
  ├─ Facial Expression Analysis
  └─ AI Dream Interpretation
     ↓
[REVIEW SCREEN]
  ├─ Watch video preview
  ├─ Edit transcript if needed
  ├─ View emotion analysis
  └─ Confirm or re-record
     ↓
[Save to Journal]
     ↓
[Dream Card appears in feed]
  ├─ Shows metrics (C/E/N)
  ├─ Shows keywords
  ├─ Tappable for full analysis
  └─ Shareable
```

---

## 📱 Technical Requirements

### Camera Features Needed:
- [ ] Front-facing camera default
- [ ] Flash control (auto/on/off)
- [ ] Camera switch (front/back)
- [ ] Real-time preview
- [ ] Recording indicator (red dot + timer)
- [ ] Max recording time: 5 minutes
- [ ] Pause/resume capability

### Processing Pipeline:
1. **Video/Audio Capture**: WebRTC or device camera API
2. **Speech-to-Text**: Whisper API or browser SpeechRecognition
3. **Facial Analysis**: 
   - Face detection (face-api.js or similar)
   - Emotion classification (7 basic emotions)
   - Intensity scoring per emotion
4. **AI Analysis**: Send transcript + emotions to Claude API
5. **Metric Calculation**: Complexity, Emotional Intensity, Novelty

### Storage:
- Video file (compressed, max 50MB)
- Transcript text
- Emotion data (JSON)
- AI analysis results
- Thumbnail image (extracted from video)

---

## 🚀 Implementation Priority

### Phase 1 (Core UX):
1. Full-screen camera component
2. Recording controls (start/stop/timer)
3. Basic processing screen
4. Simple transcript display
5. Save to journal

### Phase 2 (AI Integration):
1. Speech-to-text integration
2. Facial expression analysis
3. Emotion visualization
4. AI dream interpretation
5. Metric calculation

### Phase 3 (Polish):
1. Video playback in review
2. Transcript editing
3. Re-record option
4. Advanced animations
5. Error handling

---

## 🎯 Key Differences from Current Implementation

| Current | Proposed V2 |
|---------|-------------|
| Modal with small video preview | Full-screen immersive camera |
| Text input primary | Video-first capture |
| No facial analysis | Real-time emotion detection |
| Manual text entry | Auto STT + edit option |
| Generic processing message | Step-by-step progress |
| No preview before save | Full review & edit flow |
| Basic metrics | Meaningful C/E/N scores |

---

## 📋 Testing Checklist

- [ ] Camera launches instantly on tap
- [ ] Front camera is default
- [ ] Recording starts immediately
- [ ] Timer is visible and accurate
- [ ] Stop button is obvious
- [ ] Processing screen shows progress
- [ ] Transcript is accurate
- [ ] Emotions are detected correctly
- [ ] Review screen allows edits
- [ ] Save creates proper dream card
- [ ] Metrics display correctly
- [ ] Video plays back smoothly
- [ ] Flow works on mobile devices
- [ ] Graceful error handling
