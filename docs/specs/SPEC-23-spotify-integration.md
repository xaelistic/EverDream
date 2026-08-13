# SPEC-23: Spotify Taste Link (Profile Connect)

**Status:** Draft — 2026-08-13  
**Canonical app:** `ed.app.new/` + `supabase/functions/social-oauth-spotify/`  
**Related:** SPEC-18 (interests), `supabase/SOCIAL_INTEGRATIONS_SPEC.md`, `src/lib/social/profileSignals.ts`  
**Priority:** High — Profile **Connect** is visible and currently does nothing useful in production

---

## 1. Problem

The profile hub and settings screens show **Connect Spotify**. Tapping it should open Spotify's consent screen, then write listening tastes onto the EverDream profile as interests (genre / artist vibes).

Today the client already calls `startSpotifyOAuth('link')` → edge function `social-oauth-spotify`. That function returns **503** when `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` are unset on the live Supabase stack. The user sees a toast or a silent no-op. The button is not a stub in code — it is an unfinished production integration.

This is **link tastes, not login**. Google / Apple remain the identity providers. Spotify never creates an EverDream account.

---

## 2. Current code (already built)

| Layer | Path | Role |
|-------|------|------|
| Profile UI | `src/screens/ProfileHubScreen.tsx` | Connect / disconnect buttons |
| Settings | `src/components/settings/ProfileAndSettings.tsx` | Same providers list |
| Hook | `src/hooks/useProfile.ts` | `handleConnectSocial('spotify')` |
| Client OAuth | `src/lib/auth/socialAuth.ts` → `startSpotifyOAuth` | JWT invoke, then `window.location = authUrl` |
| Callback | `src/hooks/use-social-auth.ts` | `?social=spotify_linked` / `spotify_error` |
| Taste mapping | `src/lib/social/profileSignals.ts` | Spotify genres → EverDream interest labels |
| Edge function | `supabase/functions/social-oauth-spotify/index.ts` | Start + callback |
| Tables | `social_accounts`, `oauth_states` | Tokens + CSRF state |

### Intended flow

```
Signed-in user taps Connect
  → POST /functions/v1/social-oauth-spotify  { action: "start", intent: "link" }
  → row in oauth_states (auth_user_id, provider=spotify, expires)
  → { authUrl } Spotify authorize
  → user consents
  → GET /functions/v1/social-oauth-spotify?code=&state=
  → exchange code, fetch /me + /me/top/artists
  → upsert social_accounts (tokens + metadata.top_genres / top_artists)
  → redirect https://everdream.n1g3.com/?auth=callback&social=spotify_linked
  → client maps genres to interests and writes profile
```

### Why Connect does nothing live

1. **Secrets missing** on `supabase-everdream-live` (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`).
2. **Spotify Developer App** may not exist, or the redirect URI is not registered.
3. No operator runbook — the UI cannot tell the user "integration not configured" vs "you cancelled".

Redirect URI that **must** be exact:

```
https://supabase.n1g3.com/functions/v1/social-oauth-spotify
```

Also set `APP_BASE_URL=https://everdream.n1g3.com` and `SUPABASE_PUBLIC_URL=https://supabase.n1g3.com` on the function environment.

---

## 3. Product rules

- Spotify is **optional taste import**, never required for journaling.
- We store: display name, avatar, top genres, top artists, refresh token.
- We do **not** store playlists, recently played tracks, or audio features in v1.
- Disconnect deletes `social_accounts` row for Spotify and removes interests whose source is `spotify`. Manual / onboarding interests stay.
- Tokens are service-role only. The client reads `social_accounts_public` (no tokens).
- Scopes stay read-only:

  `user-read-email user-read-private user-top-read user-read-recently-played`

  `user-read-recently-played` is reserved for a later "last night's soundtrack" feature; v1 does not surface it in the UI.

---

## 4. Spotify Developer setup (operator)

1. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
2. App name: **EverDream**. Redirect URI (exact, one line):

   `https://supabase.n1g3.com/functions/v1/social-oauth-spotify`

   Local / staging later: `http://127.0.0.1:54321/functions/v1/social-oauth-spotify` only if we run functions locally.
3. Copy Client ID and Client Secret.
4. Put them on the live Supabase service env (Coolify → `supabase-everdream-live` → functions / Kong-reachable Deno runtime):

   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   APP_BASE_URL=https://everdream.n1g3.com
   SUPABASE_PUBLIC_URL=https://supabase.n1g3.com
   ```

5. Redeploy / restart the functions container so Deno picks up the secrets.
6. Confirm `GET` to the function without query params returns 400 JSON (function is live), not 404.

Spotify apps in **Development mode** only allow users listed in the dashboard. Add `gjones.official@gmail.com` (and any testers) until the app is submitted for extended quota.

---

## 5. Data mapping

`fetchSpotifyTastes` already pulls top 20 medium-term artists and flattens genres.

`profileSignals.ts` maps genres onto EverDream interest chips (ambient → calm / soundscape, metal → intensity, folk → nature, etc.). Rules:

| Spotify signal | Profile field | Source tag |
|----------------|---------------|------------|
| top genres (mapped) | `interests[]` | `spotify` |
| unmatched genre pretty-name | `interests[]` | `spotify` |
| display name / avatar | `social_accounts` only | — |
| top artists | `social_accounts.metadata.top_artists` | not interests in v1 |

Cap imported interests at 12. Do not overwrite `onboarding` or `manual` chips with the same label.

---

## 6. UX (make Connect honest)

**Before secrets exist**

- If start returns 503 / "not configured", toast:  
  `Spotify isn't connected on this server yet.`  
  Do not spin forever.

**After secrets exist**

1. Connect → Spotify account picker → consent → return to Profile.
2. Success toast: `Spotify connected — added N tastes to your profile.`
3. Interest chips gain a small "Spotify" source badge (already styled).
4. Button label becomes **Connected** with a disconnect confirm.
5. Failure / cancel: `Spotify connection was cancelled or failed. Try again.`

Optional later: show top 3 artists as read-only text under the button. Not required for v1.

---

## 7. Implementation plan (to finish Connect)

Work is mostly ops + two small product polish items. OAuth code is already in tree.

1. **Create the Spotify app** and register the redirect URI above.
2. **Set secrets** on `supabase-everdream-live` and restart functions.
3. **Smoke test** as the live Google user:
   - Connect → consent → `social=spotify_linked`
   - `social_accounts` row for provider `spotify`
   - interests appear on Profile
   - Disconnect removes the row and Spotify-sourced chips
4. **Client polish** (this PR or next):
   - Surface the 503 message verbatim (already mostly done via toast).
   - Disable Connect when signed out with copy: `Sign in first to connect Spotify.`
5. **Do not** add Spotify as a login provider.
6. **Do not** publish dreams to Spotify. There is no write API for that.

---

## 8. Security

- `oauth_states` rows expire and are deleted after use.
- Refresh tokens stay in `social_accounts` (service role). Never send them to the SPA.
- Rotate `SPOTIFY_CLIENT_SECRET` if it appears in logs or chat.
- PKCE is not required for confidential server-side exchange; keep the current authorization-code + basic auth token post.
- If we later add recently-played night context, document it as a new scope review — do not silently expand scopes.

---

## 9. Acceptance criteria

- [ ] Live Connect opens the real Spotify consent screen.
- [ ] After consent, Profile shows at least one Spotify-sourced interest (or an explicit "no genres returned" empty state).
- [ ] Disconnect removes Spotify interests only.
- [ ] Unsigned users cannot start OAuth (401).
- [ ] Missing secrets produce a clear 503 + toast, not a dead button.
- [ ] Google login is unchanged.
- [ ] No Pollinations / third-party image branding is involved (unrelated; do not couple).

---

## 10. Out of scope

- Spotify login / SSO
- Sharing dreams to Spotify or Canvas
- Playlist generation from a dream
- Using audio features to classify dream mood (interesting later; not this spec)
- Meta / Instagram (separate provider)

---

## 11. Operator checklist (when you are ready)

Send Grok the **Client ID** and **Client Secret** (or set them yourself on Coolify). Then we:

1. Write secrets onto the live functions env.
2. Restart the functions container.
3. Tap Connect on https://everdream.n1g3.com/#/profile and confirm the Spotify screen.
4. Verify `social_accounts` + profile interests.

Until those two secrets exist, the profile button cannot complete OAuth. The implementation is waiting on the Spotify app, not on more React.
