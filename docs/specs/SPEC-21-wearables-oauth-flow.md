# SPEC-21: Wearables Connection – Proper OAuth Flow (No Token Paste)

**Status**: Draft
**Date**: 2026-07-21

## Problem

Current Google Fit / wearable connection uses a "Connect with token" flow that requires the user to generate a token and paste it. This is poor UX and not how modern apps handle OAuth.

## Debate

**Blue**: Some providers (especially Google Fit) have complex OAuth scopes and token exchange. A token paste flow is sometimes necessary for testing or restricted clients.

**Red**: Token paste is a developer/debug flow, not a user flow. Every major app (Oura, Whoop, Garmin, Apple Health via HealthKit, Google Fit) supports proper OAuth2 redirect flows or native SDKs. Users should never have to copy-paste tokens.

**Synthesis**:
- Replace the token paste modal with a proper OAuth2 redirect flow.
- For Google Fit: Use the standard Google OAuth consent screen with the required scopes (`https://www.googleapis.com/auth/fitness.sleep.read` etc.).
- Store the resulting tokens server-side or in a secure client store.
- Show clear "Connect" buttons that open the provider's consent screen.

## Implementation Plan

1. Update `WearableConnectModal.tsx` and `WearableSettings.tsx`.
2. Use `lib/wearableOAuth.ts` (or enhance it) to handle proper redirect + callback.
3. For Google Fit specifically, register the app in Google Cloud Console and use the standard flow.
4. Remove the manual token input fields.
5. After successful OAuth, store the connection in `wearable_connections` table (or equivalent) and refresh the list.

## Acceptance Criteria

- No token paste UI remains for any wearable.
- Google Fit connection uses standard OAuth redirect.
- User sees clear success/failure states.
- Connection persists across sessions.