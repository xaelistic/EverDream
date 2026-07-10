# SPEC-08: Long-Term Patterns, Recurring Themes & Cross-Domain Correlations

**Status:** Draft — 2026-07-09  
**Canonical app:** ed.app.new/  
**Depends on:** Existing dreams/sleep_sessions tables, analytics events, AI analysis outputs.  
**Priority:** High (core differentiator for dream + sleep hybrid)

## Overview

Users want to understand not just "what was this dream" but "what does this mean over time?" and "how do my dreams relate to my actual sleep data, mood, and life?"

Currently EverDream has per-dream AI (NVCNT) and some stats, but lacks:
- Automatic detection of recurring elements (symbols, characters, locations, emotions, themes).
- Correlations between dreams ↔ sleep metrics (e.g. high novelty dreams on high REM nights).
- Timeline views and "On this Day / pattern over months" insights.
- Actionable "insights" that surface across the journal.

## Goals
- Surface recurring patterns automatically.
- Correlate dream qualities with objective sleep data and user-reported mood/reflection.
- Provide beautiful, insightful visualizations and "what changed" narratives.
- Enable "ask about my patterns" queries (powered by existing or new AI).

## Core Features

### 1. Pattern Extraction Engine
- Background job (or on-demand) that processes user's historical dreams + analyses.
- Extract entities: people/characters, locations, objects/symbols, emotions, actions, themes (using LLM + embeddings or rules on top of existing NVCNT + tags).
- Frequency scoring, first/last seen, trend (increasing/decreasing).
- Cluster similar dreams (semantic similarity).

**Data model additions (migration):**
- `dream_patterns` table or JSONB aggregates per user.
- `pattern_occurrences` linking dream_id + pattern_id + strength.
- Or leverage existing `interpretation` JSONB + add `patterns` array.

### 2. Correlations Dashboard
Sections:
- Dream quality vs Sleep stages (%REM, deep, efficiency, score).
- Novelty/Complexity vs HRV or movement.
- Emotion valence vs morning mood or sleep sufficiency.
- Recurring symbol frequency vs wearable metrics.
- Time-of-night or weekday patterns.

Visuals: scatter plots, heatmaps, trend lines (use existing charting or Recharts/three.js if 3D).

### 3. Timeline & Memory Views
- "On this Day" (across years) for dreams + sleep + reflections.
- Pattern timeline: when a symbol first appeared, clusters of activity.
- Calendar heatmaps colored by dominant emotion or sleep score + dream count.
- "Significant periods" detection (e.g. "your most lucid month was...").

### 4. AI-Powered Insights & Queries
- Weekly/Monthly "Pattern Report" generated via edge function (reuse analyze-dream style multi-provider).
- Free-text: "Why do I keep dreaming about water?" or "How does my sleep affect creativity in dreams?" → grounded answers using user's data + RAG over their entries.
- "Dream companion" chat that remembers patterns (store summary embeddings).

### 5. UX & Polish
- New "Patterns" or "Insights" tab/screen (or integrate into existing InsightsScreen).
- Cards for "Top recurring patterns this month", "Correlations worth noting".
- Export patterns report (PDF or shareable card).
- Privacy: all processing server-side or client with user data only; opt-in for advanced analysis.

## Non-Goals (v1)
- Cross-user patterns or global stats.
- Predictive "you will have X dream tonight".
- Full RAG vector DB (start with simple aggregation + LLM summarization; add later).

## Technical Notes
- Use existing Supabase + edge functions.
- Add a `process_user_patterns(user_id)` RPC or cron via n8n / edge.
- For embeddings/similarity: use Supabase pgvector if available, or simple LLM clustering first.
- Cache results; invalidate on new dream/sleep entry (or daily batch).
- Leverage new analytics events for tracking "user viewed pattern insight".

## Success Metrics
- % of active users who visit Patterns/Insights monthly.
- Time spent in insights vs pure journal.
- Qualitative: "This helped me understand my recurring anxiety dreams after poor sleep nights."
- Reduction in "I feel like I have the same dream" support tickets / feedback.

## Dependencies & Risks
- Data volume: start with users who have >20 dreams or 10 sleep sessions.
- Accuracy of extraction: validate with user feedback ("is this pattern accurate?").
- Performance: background processing important so it doesn't block capture.
- Mobile performance for viz.

## Implementation Order
1. Schema + basic extraction job (LLM call per batch of dreams).
2. Simple list view of top patterns + frequency.
3. Sleep ↔ dream correlation basic charts (use existing data).
4. "On this Day" + timeline enhancements.
5. Conversational query interface (new or extend existing AI).
6. Polish, caching, reports.

## References
- Existing NVCNT + dreamAnalysis utils.
- Sleep session schema.
- SPEC-05-analytics-tables.md, SPEC-06-simulacra-economy.md.
- Competitor examples: DreamStream pattern tracking, Elsewhere recurring elements.

**Owner / ETA:** TBD post go-live basics.
