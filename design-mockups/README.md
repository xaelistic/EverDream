# 🌙 Dream Journal V2 - Design Mockups

Welcome to the design mockup folder for the Dream Journal V2 redesign.

## 📁 Files in This Folder

1. **`VIDEO_CAPTURE_UX.md`** - Detailed text-based mockups and specifications for the video capture flow
2. **`interactive-mockup.html`** - Interactive HTML mockup you can open in your browser

## 🎨 How to View the Mockups

### Option 1: Open Interactive HTML (Recommended)
```bash
# On Mac
open /workspace/design-mockups/interactive-mockup.html

# On Windows
start /workspace/design-mockups/interactive-mockup.html

# Or just drag the file into your browser
```

### Option 2: Read the Markdown
Open `VIDEO_CAPTURE_UX.md` in any markdown viewer or text editor.

## 🎥 Video Capture Flow Summary

The new UX has **4 key screens**:

### Screen 1: Full-Screen Camera
- **Immersive** - No navbar, no distractions
- **Front camera default** - For facial analysis
- **Simple controls** - Flash, switch camera, record button
- **Timer visible** - Shows recording duration
- **Subtle prompt** - "Tell me about your dream..." fades after 3 seconds

### Screen 2: AI Processing
- **Step-by-step progress**:
  1. ✓ Speech-to-Text
  2. ⟳ Facial Analysis  
  3. ⏳ AI Dream Interpretation
- **Blurred thumbnail** background
- **Soothing animations** - Not jarring loading states

### Screen 3: Review & Edit
- **Video preview** - Tap to play
- **Editable transcript** - Fix any STT errors
- **Emotion bars** - Visual display of detected emotions
- **Two actions** - Regenerate or Save

### Screen 4: Saved Dream Card
- **Video thumbnail** 
- **C/E/N Metrics** - Complexity, Emotional Intensity, Novelty
- **Keywords** - Auto-extracted themes
- **Actions** - View Analysis, Share

## 🎯 Key Design Principles

1. **Opalescent Aesthetic** - Soft gradients, glassmorphism, ethereal feel
2. **Elegant Spacing** - Generous padding, not cluttered
3. **Meaningful Metrics** - C/E/N instead of vague "pattern depth"
4. **Progressive Disclosure** - Show info when needed, not all at once
5. **Smooth Animations** - Subtle, calming transitions

## 📋 Next Steps After Review

Once you approve the mockups, I will implement:

1. ✅ Full-screen camera component with recording
2. ✅ Processing screen with real-time progress
3. ✅ Review/edit interface
4. ✅ Integration with:
   - Speech-to-text API
   - Facial expression analysis
   - AI dream interpretation
   - Metric calculation (C/E/N)
5. ✅ Save flow creating proper dream cards

## 🔍 Testing Instructions

After implementation, test by:

1. Navigate to home screen
2. Tap the FAB (+) button
3. Select "Video" option
4. **Should see full-screen camera** (not modal)
5. Record a short video
6. Watch processing steps
7. Review transcript and emotions
8. Save and verify dream card appears with metrics

---

**Questions or changes?** Let me know which aspects need adjustment before I begin implementation!
