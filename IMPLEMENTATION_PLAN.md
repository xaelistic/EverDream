# EverDream Implementation Plan

## Issues Identified & Solutions

### 1. **Onboarding Improvements**
- ✅ Sleep/wake time already uses `<input type="time" />` for native datetime picker
- ⚠️ Need to ensure it works on Android/iOS (already using native time inputs)
- ✅ After onboarding, should open directly into journal - needs verification

### 2. **Emoji Wheel Enhancement** 
Current: `/workspace/ed.app.new/src/components/mood/EmojiWheel.tsx`
- Current implementation has valence (positive/negative/neutral) and intensity (1-5)
- **Requested**: X-Y axis with energy (how far out) and positivity (top/bottom)
- **Solution**: Create enhanced 2D mood wheel with:
  - Y-axis: Positivity (positive top, negative bottom)
  - X-axis/Radial: Energy level (center = low energy, outer = high energy)
  - Assign emoji based on position

### 3. **Dream Image Generation Not Working**
Location: `/workspace/ed.app.new/src/modules/sleep/dreamAssetGenerator.ts`
- Has multiple fallbacks: Edge Function → Pollinations → HuggingFace → SVG
- **Action**: Add logging to debug which step fails

### 4. **Dream Analysis Missing**
Location: `/workspace/ed.app.new/src/lib/dream-analyzer.ts`
- Analysis function exists but may not be integrated properly
- Uses Supabase Edge Function with Anthropic fallback
- **Action**: Verify integration in DreamCapture component

### 5. **Auth Testing Issues**
Location: `/workspace/ed.app.new/src/components/auth/LoginScreen.tsx`
- **Action**: Add debug logging for auth flow

### 6. **Journal Storage**
- Currently stays on device (localStorage)
- Can be removed from login screen or kept as option

### 7. **Tracker Screen - Weekly & Monthly View**
Location: `/workspace/ed.app.new/src/components/tracker/TrackerScreen.tsx`
- ✅ Already has weekly view via `WeeklySleepView`
- ✅ Already has monthly view via `MonthlySleepReport`
- **Status**: Appears to be built, needs testing

### 8. **Import Audio Not Working**
Location: `/workspace/ed.app.new/src/lib/transcriptionWhisper.ts`
- Uses Supabase Edge Function for Whisper transcription
- Falls back to Web Speech API
- **Action**: Add logging for debugging raw audio & transcription

### 9. **Full Screen Panels for Dream Insights & Quotes**
- Quotes exist in `DreamJournalApp.tsx` line 155
- Insights exist in tracker components
- **Action**: Create dedicated full-screen panels

### 10. **Navigation Changes**
Location: `/workspace/ed.app.new/src/components/Shell.tsx`
- **Request**: Make Home & Record the same, center in nav panel
- Current: 7 nav items (Home, Reflect, Journal, Tracker, Record, Insights, More)
- **Change**: Merge Home & Record into single centered button

### 11. **Profile Enhancement**
Location: `/workspace/ed.app.new/src/components/settings/ProfileAndSettings.tsx`
- **Request**: Compare to "loveable" reference and add:
  - User profile section
  - Long-term insights
  - Social features
  - Better profile UI

### 12. **Home Screen Consolidation**
- **Request**: Quote of the day & reflection should all be on home screen
- Currently scattered across different screens
- **Action**: Consolidate into home screen layout

### 13. **Video Capture & Transcription Issues**
Location: `/workspace/ed.app.new/src/components/VideoCaptureFlow.tsx`
- Direct camera capture works
- Transcription accuracy poor
- Saving doesn't add to journal
- **Actions**:
  - Add logging for raw audio & transcription
  - Fix video saving to journal
  - Ensure metrics are captured

---

## Priority Implementation Order

### Phase 1: Critical Fixes (P0)
1. Video save to journal + logging
2. Audio import + transcription logging  
3. Dream image generation logging
4. Dream analysis integration verification

### Phase 2: UX Improvements (P1)
5. Enhanced 2D emoji wheel
6. Navigation consolidation (Home+Record centered)
7. Home screen consolidation (quotes + reflections)
8. Full-screen insight panels

### Phase 3: Feature Enhancements (P2)
9. Profile enhancement with social features
10. Long-term insights dashboard
11. Auth flow improvements

---

## Files to Modify

1. `/workspace/ed.app.new/src/components/mood/EmojiWheel.tsx` - Enhanced 2D wheel
2. `/workspace/ed.app.new/src/components/Shell.tsx` - Navigation changes
3. `/workspace/ed.app.new/src/DreamJournalApp.tsx` - Home screen consolidation
4. `/workspace/ed.app.new/src/components/VideoCaptureFlow.tsx` - Logging + save fix
5. `/workspace/ed.app.new/src/lib/transcriptionWhisper.ts` - Add logging
6. `/workspace/ed.app.new/src/modules/sleep/dreamAssetGenerator.ts` - Add logging
7. `/workspace/ed.app.new/src/lib/dream-analyzer.ts` - Add logging
8. `/workspace/ed.app.new/src/components/settings/ProfileAndSettings.tsx` - Enhance profile
9. New: `/workspace/ed.app.new/src/components/insights/InsightsPanel.tsx` - Full screen panel
10. New: `/workspace/ed.app.new/src/components/quotes/QuotePanel.tsx` - Full screen panel

