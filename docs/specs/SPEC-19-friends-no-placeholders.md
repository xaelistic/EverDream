# SPEC-19: Friends Section – No Placeholder Data

**Status**: Draft
**Date**: 2026-07-21

## Problem

`ProfileHubScreen.tsx` has a hardcoded `friends` array with placeholder users (Luna, Orpheus, Somnus). This is fake social proof and damages trust.

## Debate Summary

**Blue**: Show a few example friends so the section doesn't look broken.

**Red**: Fake friends are worse than an empty "Find friends" state. Users will immediately notice they are fake and lose confidence.

**Synthesis**: 
- Remove the hardcoded friends array completely.
- Show a clean empty state with "Find friends" / "Invite friends" CTAs.
- Real friends come from future social features or manual invites.

## Implementation

- Delete the `friends` constant and related UI in `ProfileHubScreen.tsx`.
- Replace with proper empty state + future friend list rendering from Supabase.