# Hybrid C/E/N + XP Scoring System - Merge Complete

## Overview

This document describes the merged scoring system that combines:
1. **Simple C/E/N UI badges** (Clarity/Emotion/Nightmare) for user-facing display
2. **Advanced XP scoring formula** from everdream-mobile reference for backend calculations

## What Was Merged

### From `ed.app.old.reference/everdream-mobile/src/utils/scoringFormula.ts`:
- Sleep richness calculation (REM/deep sleep ratios)
- Semantic intensity from token analysis
- Valence multiplier system
- Multiplicative XP formula: `XP = (C × R × I × S × D × M × T) × 100`
- Named entity detection
- Theme suggestion algorithm

### From `ed.app.new/src/utils/dreamAnalysis.ts` (existing):
- C/E/N keyword-based scoring
- Facial emotion integration
- Nightmare detection
- Clarity breakdown (vividness, detail, coherence)

## New Architecture

### Two-Layer Scoring System

```
┌─────────────────────────────────────────────┐
│         USER INTERFACE LAYER                │
│  ┌─────────────────────────────────────┐    │
│  │  MetricBadges.tsx                   │    │
│  │  - Clarity (0-100)                  │    │
│  │  - Emotion (0-100)                  │    │
│  │  - Nightmare (0-100)                │    │
│  └─────────────────────────────────────┘    │
│              ↓ displays                     │
│  ┌─────────────────────────────────────┐    │
│  │  XPScoreDisplay.tsx                 │    │
│  │  - Complexity (CEN-C)               │    │
│  │  - Intensity (CEN-E)                │    │
│  │  - Novelty (CEN-N)                  │    │
│  │  - Total XP Score                   │    │
│  │  - Level progression                │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                    ↓ calculates from
┌─────────────────────────────────────────────┐
│         BACKEND CALCULATION LAYER           │
│  ┌─────────────────────────────────────┐    │
│  │  dreamAnalysis.ts                   │    │
│  │  - calculateDreamMetrics()          │    │
│  │  - calculateXPScore() ← NEW         │    │
│  │  - Full breakdown with all factors  │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### C/E/N Redefined (Dual Meaning)

**For Simple Badges (MetricBadges.tsx):**
- **C** = Clarity (vividness, memorability)
- **E** = Emotion (emotional intensity)
- **N** = Nightmare (fear indicators)

**For XP Display (XPScoreDisplay.tsx):**
- **C** = Complexity (token count, unique tokens)
- **E** = Intensity (valence × arousal)
- **N** = Novelty (named entities, rare themes)

Both systems run in parallel and inform each other.

## Files Modified/Created

### Modified Files
1. **`src/utils/dreamAnalysis.ts`** (+285 lines)
   - Added `XPScoreBreakdown` interface
   - Added `SleepSessionData` interface
   - Added `calculateSleepRichness()`
   - Added `tokenizeNarrative()`
   - Added `inferNamedEntityCount()`
   - Added `suggestThemesFromNarrative()`
   - Added `calculateSemanticIntensity()`
   - Added `calculateValenceMultiplier()`
   - Added `calculateXPScore()` ← Main hybrid function
   - Added `generateXPInsight()`
   - Added `mergeJsonObject()`
   - Updated `calculateDreamMetrics()` to include XP breakdown

### Created Files
2. **`src/components/dreams/XPScoreDisplay.tsx`** (328 lines)
   - `XPScoreDisplay` component (full detailed view)
   - `CompactCEN` component (for dream cards)
   - `XPBadge` component (level gamification)
   - Expandable breakdown view
   - Formula explanation tooltip

3. **`src/components/dreams/index.ts`** (updated)
   - Export new components

4. **`HYBRID_SCORING_MERGE.md`** (this file)

## Usage Examples

### Basic Usage (Simple C/E/N Badges)
```tsx
import { MetricBadges } from './components/MetricBadges';
import { calculateDreamMetrics } from './utils/dreamAnalysis';

const metrics = calculateDreamMetrics(dreamText, aiAnalysis, facialEmotions);

<MetricBadges metrics={metrics} size="md" />
```

### Advanced Usage (Full XP Breakdown)
```tsx
import { XPScoreDisplay } from './components/dreams/XPScoreDisplay';
import { calculateDreamMetrics } from './utils/dreamAnalysis';

const detailed = calculateDreamMetrics(dreamText, aiAnalysis, facialEmotions);

// Access XP breakdown
if (detailed.xpBreakdown) {
  <XPScoreDisplay 
    xpBreakdown={detailed.xpBreakdown} 
    showDetails={true}
  />
}
```

### Compact Usage (Dream Cards)
```tsx
import { CompactCEN } from './components/dreams/XPScoreDisplay';

// Inside DreamCard component
{dream.xpBreakdown && (
  <CompactCEN xpBreakdown={dream.xpBreakdown} />
)}
```

### With Sleep Session Data
```tsx
import { calculateXPScore } from './utils/dreamAnalysis';

const xpBreakdown = calculateXPScore({
  dreamText: narrative,
  sleepSession: {
    total_sleep_minutes: 420,
    rem_minutes: 95,
    deep_minutes: 78,
    light_minutes: 210,
    awake_minutes: 37,
  },
  resonanceScore: 0.85, // User-rated significance
  valence: 6, // -10 to 10
  arousal: 14, // 0-20
  themeCount: 4,
  tSocialScore: 1.2,
});
```

## XP Score Formula

```
XP = (C_raw × R_user × I_semantic × S_valence × D_density × M_sustain × T_social) × 100

Where:
- C_raw = Sleep richness (0.2-1.2) based on REM/deep ratio
- R_user = User resonance score (0-1)
- I_semantic = Semantic intensity (0.15-1.35) from token analysis
- S_valence = Valence multiplier (0.6-1.5)
- D_density = Dream density factor (default: 1)
- M_sustain = Memory sustain factor (default: 1)
- T_social = Social sharing score (0.5-2)
```

## CEN Metrics Calculation

```typescript
Complexity = clamp((tokenCount / 200 + uniqueTokenCount / 100) * 50, 0, 100)
Intensity  = clamp(s_valence * 60 + (arousal / 20) * 40, 0, 100)
Novelty    = clamp((namedEntityCount / 10 + uniqueTokenCount / 50) * 50, 0, 100)
```

## Gamification Features

- **Level System**: Every 100 XP = 1 level
- **Progress Bar**: Shows progress to next level
- **Score Colors**: 
  - 75+ = Emerald (Excellent)
  - 50-74 = Amber (Good)
  - 25-49 = Orange (Moderate)
  - 0-24 = Red (Low)

## Testing Checklist

- [ ] C/E/N badges display correctly on dream cards
- [ ] XP score calculates correctly with sleep data
- [ ] XP score calculates correctly without sleep data (defaults)
- [ ] Level progression works (100 XP per level)
- [ ] Detailed breakdown expands/collapses
- [ ] Compact CEN fits in dream card layout
- [ ] All metric tooltips show correct explanations
- [ ] Color coding matches score ranges
- [ ] Formula explanation is accurate
- [ ] Integration with existing DreamDetail page

## Next Steps

1. **Integrate into DreamCard**: Add `<CompactCEN />` to existing cards
2. **Add to DreamDetail**: Replace or augment existing metrics panel
3. **Update Database Schema**: Store `xp_score` and `xpBreakdown` in dreams table
4. **Leaderboard**: Create XP-based ranking system
5. **Achievements**: Unlock badges based on XP milestones
6. **Analytics Dashboard**: Show XP trends over time

## Migration Notes

- Existing dreams without XP data will use default values
- Sleep session linkage is optional (uses 0.55 default richness)
- Backwards compatible with existing C/E/N badge usage
- No breaking changes to existing APIs

## References

- Original formula: `/workspace/ed.app.old.reference/everdream-mobile/src/utils/scoringFormula.ts`
- XP Screen UI: `/workspace/ed.app.old.reference/everdream-mobile/src/components/XPScoringScreen.tsx`
- Current implementation: `/workspace/ed.app.new/src/utils/dreamAnalysis.ts`
