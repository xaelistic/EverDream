# SPEC-09: Conversational AI Companion (Dreams + Life Reflection)

**Status:** Draft — 2026-07-09  
**Canonical app:** ed.app.new/ + new or extended edge function  
**Priority:** High (matches expectations from Rosebud/Reflection/Day One AI tiers)

## Problem
Current AI is excellent but one-shot per dream (analysis + image). Users want an ongoing "companion" they can talk to about their dreams, sleep, mood, and life — asking follow-ups, getting deeper reflection, connecting dots over time.

## Goals
- Persistent or session-based chat grounded in the user's own data (dreams, sleep sessions, reflections, patterns).
- "Dig deeper" style probing questions + summaries.
- Dream-specific + general life reflection modes.
- Feels personal and therapeutic (without claiming to be therapy).

## Features

### 1. Entry Points
- From any DreamDetail or Sleep session: "Talk to AI about this".
- Dedicated "Companion" or "Reflect" chat screen/tab (always available).
- From home reflection card or insights.
- Voice input support (reuse transcription).

### 2. Chat Capabilities
- Context-aware: loads recent + relevant history (last N dreams, sleep data, selected patterns).
- Modes / personas (user selectable or prompt-engineered):
  - Dream Interpreter (builds on NVCNT + adds follow-ups).
  - Sleep Coach (ties data to recommendations).
  - Life Reflector / Journal Companion (general daily + growth).
  - Creative Muse (for simulacra ideas, story continuation).
- Multi-turn: remembers conversation within session or across days (store thread summaries).
- Actions: "Generate image for this idea", "Log this as reflection", "Add tag to dream X".
- Grounded answers: cite user's own entries ("In your dream from June 12 you mentioned...").

### 3. Memory & Personalization
- Short-term context window + long-term user profile summary (stored per user, updated periodically).
- "What have I been dreaming about lately?" or "How has my sleep been affecting my mood?"
- Weekly "Companion check-in" prompt (optional notification).

### 4. Safety & Polish
- Clear disclaimer: "AI companion for reflection and creativity, not a substitute for professional help."
- Rate limits + cost controls (use cheapest good models first, like existing multi-provider).
- Export chat or "save as reflection".
- Beautiful UI: chat bubbles, suggestions chips, attach dream/sleep context.
- Mobile-first (PWA/Capacitor).

## Technical Approach
- New Supabase Edge Function: `companion-chat` (or extend analyze-dream).
  - Input: user message + optional context selectors (dream_ids, date range).
  - Fetch relevant user data (dreams, analyses, sleep, patterns via new SPEC-08 or existing).
  - Build prompt with system instructions + retrieved context + conversation history.
  - Stream response (or normal) from chosen provider (OpenRouter strong for chat, or Gemini).
- Store chat threads in new table `companion_threads` + `messages` (or use existing analytics if light).
- For grounding/RAG light: start with recent relevant + keyword/embedding search on user's content (pgvector if enabled).
- Cost: track usage; tie advanced chat to Pro tier.

## Data Model (new migration)
```sql
create table companion_threads (
  id uuid primary key,
  user_id uuid references profiles(id),
  title text,
  context_summary jsonb,  -- e.g. {"recent_dreams": [...], "focus": "sleep"}
  created_at, updated_at
);

create table companion_messages (
  id, thread_id, role (user/assistant), content, metadata (cited dreams etc.),
  created_at
);
```

## Non-Goals (MVP)
- Full persistent memory across all history without summarization (expensive).
- Voice output or full agent actions (tool use later).
- Multi-user shared companions.

## Success Metrics
- Daily/weekly active companion users.
- Messages per session > 4-5 (engagement).
- "Saved as reflection" or "generated image from chat" conversions.
- User feedback: "This helped me understand..."

## Implementation Phases
1. Basic chat UI + stateless (per dream or recent context) using existing providers.
2. Thread persistence + basic history.
3. Grounding with user's data + citations.
4. Modes + suggestions.
5. Integration with new patterns (SPEC-08), sleep coaching, social/share.
6. Cost monitoring, Pro gating, streaming.

## References
- Rosebud "Dig Deeper", Reflection AI coach, Day One Gold chat/summaries.
- Existing multi-provider analyze-dream and image gen edges.
- New social and subscription work (gating advanced companion).

**Build after core patterns + post go-live stability.**
