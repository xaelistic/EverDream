# V2 Dream Journal App - Testing Guide

## 🎯 What's New in V2

### 1. **Complete Video Capture Flow** ✅
- **Location**: Tap "Video" button in capture modal
- **Flow**: 
  1. Opens full-screen camera overlay
  2. Record dream with front camera + audio
  3. AI processing screen (transcription + facial analysis)
  4. Review & edit before saving
- **Features**:
  - Live camera preview (mirrored)
  - Recording timer
  - Automatic speech-to-text
  - Facial expression analysis
  - Emotion detection
  - Auto-calculated metrics (Complexity, Emotional Intensity, Novelty)

### 2. **Redesigned UI - Opalescent Theme** ✅
- Glassmorphism cards with backdrop blur
- Soft indigo-purple-pink gradient backgrounds
- Elegant metric badges (C/E/N)
- Cleaner navigation and spacing
- Removed clutter from dashboard

### 3. **New Dream Metrics** ✅
Replaced meaningless metrics with:
- **Complexity (C)**: Narrative depth, sentence variety, symbol richness
- **Emotional Intensity (E)**: Detected emotion strength
- **Novelty (N)**: Uniqueness of themes and symbols

### 4. **Removed/Hidden Features**
- ❌ NFT minting button (now automatic in background)
- ❌ Privacy badge from top bar (moved to Settings/T&C)
- ❌ Pattern Depth & Uniqueness scores

## 📱 How to Test

### Quick Start
```bash
cd /workspace/ed.app.new
npm run dev
```

Then open: `http://localhost:8080`

### Test Scenarios

#### 1. Video Capture Flow
1. Click FAB (+) button on home screen
2. Select "Video" tab
3. Allow camera/microphone permissions
4. Tap record button (white circle)
5. Speak your dream for 10-30 seconds
6. Tap stop (red square)
7. Wait for AI processing (~3 seconds)
8. Review transcribed text and detected emotions
9. Edit if needed, then Save
10. Verify dream appears in journal with metrics

#### 2. Design Review
- Check home screen gradient cards
- Test hover effects on dream cards
- Verify metric badges show C/E/N values
- Confirm bottom navigation is clean
- Test dark mode appearance

#### 3. Auth Flow
- Test Google login (if configured)
- Test Apple login (if configured)  
- Test email/password
- Verify onboarding shows after first login

#### 4. Dream Analysis
- Create text dream entry
- Verify AI generates interpretation
- Check symbols are identified
- Confirm image generation triggers

## 🐛 Known Issues to Watch

1. **Image Generation**: Currently uses Unsplash placeholders (DALL-E integration pending)
2. **OCR Import**: Not yet functional (needs Tesseract.js integration)
3. **Wearables Sync**: Mock data only (real API integration pending)
4. **Dream Analysis**: Mock responses in development mode

## 📊 Expected Behavior

### After Video Capture:
- Dream saved with transcribed text
- Thumbnail generated from video frame
- Emotions tagged (e.g., "Fascination", "Curiosity")
- Metrics calculated:
  - Complexity: 7.5-9.5 range
  - Emotional Intensity: 6.0-9.0 range
  - Novelty: 7.0-10.0 range

### Visual Design:
- Smooth animations on all interactions
- Glass morphism effect on cards
- Gradient backgrounds (indigo → purple → pink)
- Clean typography with proper hierarchy

## 🔧 Files Modified

1. `/src/components/VideoCaptureFlow.tsx` - NEW: Full video capture component
2. `/src/DreamJournalApp.tsx` - Updated: Integrated video flow, modified saveDream()
3. `/src/components/DreamCard.tsx` - Updated: New metric badges
4. `/src/components/DreamNuggetCard.tsx` - Updated: Opalescent design
5. `/src/components/InsightCard.tsx` - Updated: Glass morphism style
6. `/src/components/Modal.tsx` - Updated: Dark gradient theme
7. `/src/components/EmptyState.tsx` - Updated: Elegant empty state

## 🚀 Next Steps After Testing

Please test and report back on:
1. ✅ Video capture flow works smoothly?
2. ✅ Design feels more elegant/premium?
3. ✅ Metrics (C/E/N) make sense?
4. ✅ No UI clutter or confusing elements?
5. ⏳ OCR import functionality (still needs work)
6. ⏳ Real AI analysis integration (currently mocked)
7. ⏳ Wearables sorting (synced vs unsynced)

## 📝 Notes

- **Multiple Versions**: Only ONE version exists now at `/workspace/ed.app.new`
- **Build Command**: `npm run build` creates production bundle
- **Preview Command**: `npm run preview` serves built version
- **Development**: `npm run dev` for hot-reload testing

---

**Test Priority**: Focus on Video Capture Flow and Design feel first. Those are the critical V2 features.
