# SPEC-11: General Daily Journaling Layer + Prompts & Memory

**Status:** Draft — 2026-07-09  
**Priority:** Medium-High (rounds out the app beyond "dream + sleep only")

## Why
EverDream users live full lives. Many want to journal thoughts, gratitude, ideas, or daily events in addition to (or mixed with) dreams and sleep. Dedicated daily journal apps excel here; we should not force everything into a "dream" entry.

## Features (MVP)
- Optional "Daily Note" or "Life Entry" mode alongside dream capture (or unified composer with type selector: Dream / Reflection / General / Sleep Note).
- Rich media support (reuse existing capture components): text, photo, short audio/video, quick mood.
- Prompts library: gratitude, Stoic questions, "what went well", "one thing I'm curious about", season-specific, etc. Random or themed daily prompt.
- "On this Day" memory view pulling dreams + sleep + daily notes across years.
- Streaks / habit for consistent daily reflection (separate or combined with dream logging streak).
- Tagging + search that spans dreams + daily notes + sleep.
- AI: light summaries or "highlight of the week" for mixed entries (reuse companion).

## Data
- Reuse or lightly extend `dreams` table with `entry_type` (dream | daily | reflection | note) or new `journal_entries` table that links to dreams/sleep when relevant.
- Or keep dreams dedicated and add simple `daily_reflections` table.

## UX Integration
- Home screen already moving to reflection-first — extend naturally.
- Capture hub supports multiple types (recent unified hub work helps).
- Timeline / calendar shows mixed events.
- Insights surface cross-type patterns.

## Gaps Addressed
- Matches Day One / Journey / Apple Journal richness for non-dream days.
- Prevents the app feeling "only for dreamers".
- Feeds the companion (SPEC-09) and patterns (SPEC-08) with richer life context.

## Non-Goals
- Full social network or blogging.
- Complex templates builder (start with curated library + user favorites).

See COMPETITIVE_AUDIT_AND_GAPS.md for more context from Day One, Rosebud, Journey etc.

**Good follow-up after core creative + sleep coaching specs.**
