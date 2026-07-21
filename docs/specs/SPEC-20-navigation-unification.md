# SPEC-20: Navigation Unification – Profile / Friends / More

**Status**: Draft
**Date**: 2026-07-21

## Problem

There is significant overlap between the Profile screen and the /more screen. The current "profile/services" section duplicates functionality that belongs in /more.

## Proposed Structure (User Direction)

- **Profile** screen should contain:
  - Profile (user info, interests, goals, settings)
  - Friends
  - More → links to the /more screen

- Remove the "profile/services" duplication.

## Debate Summary

**Blue**: Keep services inside profile because users expect to manage connections from their profile.

**Red**: Services (Wearables, Spotify, Instagram, etc.) are features, not profile data. They belong in a dedicated More/Explore area. Mixing them pollutes the profile and makes the app feel like a settings graveyard.

**Synthesis**:
- Profile = identity + friends + account settings.
- More = features, services, discovery, help.
- Profile has a clear "More" link that navigates to /more.

## Implementation

- Refactor `ProfileHubScreen.tsx` to remove the services section.
- Add navigation items: Profile, Friends, More.
- Ensure `MoreScreen.tsx` remains the single source of truth for services and features.