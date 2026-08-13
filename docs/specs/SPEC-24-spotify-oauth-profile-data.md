# SPEC-24: Spotify OAuth + Profile Taste Import

**Status:** Research draft — 2026-08-13  
**Supersedes for product/architecture:** SPEC-23 (SPEC-23 remains the short operator checklist)  
**Canonical code:** `ed.app.new/supabase/functions/social-oauth-spotify/` + `src/lib/auth/socialAuth.ts` + `src/lib/social/profileSignals.ts`  
**Sources (Spotify for Developers, fetched 2026-08-13):**
- [Authorization](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [Authorization code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes)
- [Apps](https://developer.spotify.com/documentation/web-api/concepts/apps)
- [Redirect URIs](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri)
- [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)
- [Get User's Top Items](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks)
- [Feb 2026 Dev Mode migration](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)
- [Display profile data how-to](https://developer.spotify.com/documentation/web-api/howtos/web-app-profile)

---

## 1. Direct answer

**Yes. To pull a person's Spotify profile and listening tastes, that person must log in to Spotify and grant EverDream permission.** There is no unofficial scrape and no “just use an API key” path for private user data.

That Spotify login is **not** EverDream account login. The product rule is:

1. User already has an EverDream session (Google / Apple / email).
2. They tap **Connect Spotify** on Profile.
3. Spotify shows *its* login + consent screen.
4. We store tokens server-side and call Spotify on their behalf.
5. We map tastes onto EverDream interests.

**Client credentials** (app-only, no user) cannot read `/me`, top artists, or recently played. **Implicit grant** is deprecated. The correct flow for us is **Authorization Code** (server holds the client secret).

```
EverDream user (already signed in)
        │
        ▼
  POST social-oauth-spotify { action: "start" }     JWT required
        │
        ▼
  Spotify accounts.spotify.com/authorize
  (user logs into Spotify if needed, then consents)
        │
        ▼
  GET social-oauth-spotify?code=&state=
  exchange code → access_token + refresh_token
        │
        ▼
  GET api.spotify.com/v1/me
  GET api.spotify.com/v1/me/top/artists?time_range=medium_term
        │
        ▼
  Upsert social_accounts (tokens stay server-side)
  Redirect everdream.n1g3.com/?social=spotify_linked
        │
        ▼
  Client imports genres → profile interests (source = spotify)
```

---

## 2. What we already have

| Piece | Status | Path |
|-------|--------|------|
| Profile **Connect Spotify** button | Built | `ProfileHubScreen.tsx` |
| Start OAuth (needs EverDream JWT) | Built | `startSpotifyOAuth()` → `social-oauth-spotify` |
| Spotify authorize URL + scopes | Built | `user-read-email user-read-private user-top-read user-read-recently-played` |
| CSRF `oauth_states` | Built | `oauth_states` table |
| Code exchange (client secret, server-side) | Built | `POST https://accounts.spotify.com/api/token` |
| Fetch `/me` + `/me/top/artists` | Built | `fetchSpotifyTastes()` |
| Persist tokens + metadata | Built | `social_accounts` (service role) |
| Callback toast + interest import | Built | `use-social-auth.ts` + `profileSignals.ts` |
| Genre → EverDream interest map | Built | `SPOTIFY_GENRE_TO_INTERESTS` |
| Disconnect | Built | removes Spotify-sourced chips |

Live blocker: `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` are **not set** on `supabase-everdream-live`, so start returns **503**. There is no Spotify Developer app configured for production yet (or it is not wired).

This is **not** missing React. It is missing a Spotify app + secrets + allowlisted testers.

---

## 3. What Spotify requires (research)

### 3.1 A registered app

Create at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard):

- App name users will see: **EverDream**
- Description + website (`https://everdream.n1g3.com`)
- **Redirect URI (exact, HTTPS):**

  `https://supabase.n1g3.com/functions/v1/social-oauth-spotify`

- Client ID + Client Secret (secret never in the SPA)

Redirect rules (enforced for new apps since 2025-04-09; all clients by Nov 2025):

- Production must be **HTTPS**
- `localhost` is **not** allowed; loopback is `http://127.0.0.1:PORT` only
- String must match byte-for-byte (slash, case, no extras)

### 3.2 User authorization (the “Spotify login”)

Spotify implements OAuth 2.0. The user grants **scopes**. Without that grant we cannot call user endpoints.

| Flow | User data? | Secret on server? | Refresh? | Use for EverDream? |
|------|------------|-------------------|----------|--------------------|
| Authorization code | Yes | Yes | Yes | **Yes — current design** |
| Authorization code + PKCE | Yes | No | Yes | Optional later (native apps) |
| Client credentials | **No** | Yes | No | No — cannot read a profile |
| Implicit grant | Yes | No | No | **No — deprecated** |

Recommended (Spotify): long-running web app that can store the secret → Authorization Code.

### 3.3 Scopes vs data

Consent screen text is what the user sees. Ask only for what we use.

| Scope | User sees | Endpoint | EverDream use |
|-------|-----------|----------|---------------|
| `user-read-private` | Access subscription details | `GET /me` (display name, id, images) | Identify the Spotify account |
| `user-read-email` | Get your real email | `GET /me` email | Optional; **email field removed for Dev Mode apps (Feb 2026)** |
| `user-top-read` | Read your top artists and content | `GET /me/top/artists`, `/me/top/tracks` | **Primary taste import** |
| `user-read-recently-played` | Access recently played items | `GET /me/player/recently-played` | Reserved — “last night’s soundtrack”; **not used in v1 UI** |

Do **not** request playlist write, streaming, or library modify. We do not publish dreams to Spotify.

### 3.4 Development mode vs extended quota (2026 reality)

New apps start in **Development mode**:

- App **owner must have Spotify Premium** or the app stops working
- **5 authenticated users** unless each extra user is added under **Settings → Users Management**
- Unlisted users may appear to log in, then API calls return **403**
- Shared quota buckets; over-quota is `429` with `"reason": "QUOTA_EXCEEDED"`
- As of Feb/Mar 2026, Dev Mode also **drops several `/me` fields** (`email`, `country`, `followers`, `product`) and marks **artist `genres` as deprecated** on top-items responses

**Extended quota** (unlimited users, higher rate limits) is now for **organisations** only (since 2025-05-15), via a partner form, typically **250k MAU** and a launched service. Review can take up to six weeks.

**Implication:** EverDream stays in Development mode for the foreseeable future. Add every tester (including `gjones.official@gmail.com`) to the Spotify app allowlist. Do not plan a public “Connect Spotify” launch until quota is extended or we accept the 5-user cap.

### 3.5 Tokens

- Access token: short-lived (~1 hour). Sent as `Authorization: Bearer` to `api.spotify.com`.
- Refresh token: long-lived. We already persist it on `social_accounts`.
- **Gap:** nothing currently refreshes the access token or re-fetches tastes after the first connect. After ~1 hour a “refresh tastes” call would fail until we implement [Refreshing tokens](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens).

---

## 4. Profile data we can pull (and how)

### v1 (already coded, after secrets exist)

```
GET /v1/me
  → id, display_name, images[]

GET /v1/me/top/artists?time_range=medium_term&limit=20
  → name, genres[]   // genres marked Deprecated on this endpoint
```

Mapped into:

| Spotify | Stored | Profile UI |
|---------|--------|------------|
| Spotify user id | `social_accounts.provider_user_id` | not shown |
| display_name, avatar | `social_accounts` | Connected state |
| artist genres | `metadata.top_genres` | interest chips, source `spotify` |
| artist names | `metadata.top_artists` | reserved; not chips in v1 |

Cap imported interests at 12. Never overwrite `onboarding` / `manual` chips.

### v1.1 (should build next — robustness)

Artist **`genres` is deprecated**. If Spotify stops returning it, Connect will succeed with **zero interests**. Build fallbacks:

1. Keep using `genres` when present.
2. Else map **artist names** through a small curated table / keyword list.
3. Else call `GET /me/top/tracks?time_range=short_term` and map track/artist names (same scope).
4. Show empty state: “Spotify connected — no tastes to import yet. Listen more, then Refresh.”

Also implement:

- `POST social-oauth-spotify { action: "refresh" }` — use `refresh_token` grant, update `access_token` / `token_expires_at`.
- `POST social-oauth-spotify { action: "sync" }` — refresh if expired, re-fetch top artists/tracks, rewrite `metadata` + Spotify-sourced interests.
- Profile button **Refresh tastes** when already connected.

### v2 (optional product)

| Idea | Endpoint | Extra scope? |
|------|----------|--------------|
| Last-night soundtrack on morning card | `GET /me/player/recently-played` | already requested |
| Saved sleep/ambient playlists | `GET /me/playlists` | `playlist-read-private` if private |
| “Wind-down” from recent audio features | `GET /audio-features` | none extra; **Dev Mode field cuts** — verify before relying |

Do not build playlist creation or playback control.

---

## 5. What still needs doing (ordered)

### Blocker A — Spotify Developer app (operator, no more code)

1. Owner account: **Spotify Premium**.
2. Dashboard → Create app **EverDream**.
3. Redirect URI exactly: `https://supabase.n1g3.com/functions/v1/social-oauth-spotify`
4. Website: `https://everdream.n1g3.com`
5. Copy Client ID + Client Secret.
6. Users Management: add every tester’s **Spotify login email**.
7. Set on Coolify `supabase-everdream-live` (functions / edge env):

   ```
   SPOTIFY_CLIENT_ID=...
   SPOTIFY_CLIENT_SECRET=...
   APP_BASE_URL=https://everdream.n1g3.com
   SUPABASE_PUBLIC_URL=https://supabase.n1g3.com
   ```

8. Restart `supabase-edge-functions-*`.
9. Smoke: signed-in user → Profile → Connect Spotify → Spotify consent → return with interests or the empty-taste toast.

Until A is done, Connect cannot work. Send Grok the ID/secret when the app exists.

### Blocker B — product honesty (small code)

- [x] Toast when start returns 503 / “not configured” (Profile already does this).
- [ ] Copy on the button: “Sign in to EverDream first” when there is no session.
- [ ] After connect with 0 genres: “Connected. No tastes yet — use Refresh after you listen.”

### Build C — keep the link alive (required for real use)

- [ ] Refresh-token grant when `token_expires_at` is past.
- [ ] `sync` action + Profile **Refresh tastes**.
- [ ] Handle `401` from Spotify as “reconnect”.
- [ ] Handle `403` as “this Spotify user is not on the app allowlist”.
- [ ] Handle `429` / `QUOTA_EXCEEDED` as “try later”.

### Build D — tastes without genres (required soon)

- [ ] Stop treating empty `genres[]` as failure.
- [ ] Fall back to artist names / top tracks.
- [ ] Do not depend on `/me` email (removed in Dev Mode).

### Explicitly do **not** build

- Spotify as EverDream SSO (would split identity from Google).
- Client-side implicit OAuth or putting the client secret in Vite.
- Publishing dreams to Spotify / Canvas.
- Playback / Premium streaming SDK.
- Extended-quota application until we are an organisation with real MAU.

---

## 6. Security

- Client secret and refresh tokens: **service role / edge env only**.
- SPA only receives `{ authUrl }` or `{ ok, publicUrl-style status }`.
- `oauth_states` expires and is deleted after use.
- Rotate the secret in the Dashboard if it ever appears in chat or git.
- Redirect URI allowlist is the CSRF backstop alongside `state`.
- PKCE is optional while the secret lives on the function. Add PKCE if we ship a native Capacitor client that cannot hide the secret.

---

## 7. Acceptance criteria (v1 go-live)

- [ ] Spotify app exists; redirect URI matches the function URL.
- [ ] Secrets set; Connect opens `accounts.spotify.com` (not 503).
- [ ] After consent, `social_accounts` has `provider=spotify` for that profile.
- [ ] Profile shows Spotify-sourced interests **or** a clear empty-taste state.
- [ ] Disconnect removes only Spotify chips.
- [ ] Allowlisted tester works; a non-allowlisted Spotify user gets a readable 403.
- [ ] Google login is unchanged.
- [ ] Access token can be refreshed without asking the user to Connect again.

---

## 8. Operator one-pager

```
Dashboard:  https://developer.spotify.com/dashboard
Redirect:   https://supabase.n1g3.com/functions/v1/social-oauth-spotify
Scopes:     user-read-private user-top-read
            (user-read-email optional; user-read-recently-played reserved)
Allowlist:  every tester's Spotify email
Premium:    app owner must stay Premium (Dev Mode)
Secrets:    SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET on supabase-everdream-live
```

When the Client ID and Secret exist, we wire them and run the smoke test. The OAuth + `/me` + top-artists path is already in the repo.
