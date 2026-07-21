# EverDream Login Debug — 2026-07-21

## Symptom
User stuck on login screen; cannot get past sign-in.

## Live targets checked
- App: `https://everdream.n1g3.com` (up, HTML 200)
- Supabase public URL in live bundle: `https://supabase.n1g3.com`
- Auth API: returns **401 Unauthorized** for `/auth/v1/*` even with local anon JWT + `apikey` header
- Port `:8000` on host still serves **Coolify HTML**, not Kong (known misroute)
- Cloud project `olwviffbwcjbcyyleorp.supabase.co` does not resolve

## Root causes (stacked)

### 1. Client bug — successful login still treated as anonymous (FIXED in repo)
**File:** `ed.app.new/src/hooks/use-auth.tsx`

```ts
// BEFORE (bug)
isAnonymous: user.is_anonymous ?? true

// AFTER (fix)
isAnonymous: user.is_anonymous === true
```

When GoTrue omits `is_anonymous` (undefined) for email/password or OAuth users, `?? true` forced `isAnonymous: true`.

**File:** `ProtectedRoute.tsx` with auth gate on:

```ts
if (requireAuth && (!user || user.isAnonymous)) {
  return <LoginScreen />;
}
```

Result: sign-in can succeed (session saved) but UI never leaves the login screen. No error shown.

Also aligned `FEATURE_REQUIRE_AUTH` with `ProtectedRoute` / `useAuth` (previously only `VITE_REQUIRE_AUTH` was read).

### 2. Infrastructure — Supabase Auth API rejecting keys (NOT fixed; needs host access)
Probes against `https://supabase.n1g3.com`:

| Endpoint | Result |
|----------|--------|
| `/auth/v1/health` | 401 `{"message":"Unauthorized"}` |
| `/auth/v1/settings` | 401 |
| `/auth/v1/token?grant_type=password` | 401 |
| `/rest/v1/profiles` | 401 |

**Critical mismatch found in live app JS** (`https://everdream.n1g3.com/assets/index-CMantB_L.js`):
- `createClient` URL = `https://supabase.n1g3.com` (self-hosted Coolify Kong)
- Baked anon JWT payload = `{ iss: supabase, ref: **olwviffbwcjbcyyleorp**, role: anon }`  
  → that is a **Supabase Cloud project key**, not the self-hosted Kong anon key
- Cloud hostname `olwviffbwcjbcyyleorp.supabase.co` does not resolve anymore
- Self-hosted keys in `~/.hermes/scripts/supabase_SERVICE_SUPABASEANON_KEY.txt` are a different JWT (no `ref` claim) and also get 401 (may be stale vs current Kong JWT_SECRET)

So login fails at the network/auth layer because the **browser is calling self-hosted Kong with a cloud anon key** (and/or secrets are out of sync).

Also confirmed live still has the client bug: `is_anonymous??!0` (`?? true`) and ProtectedRoute keeps LoginScreen when `user.isAnonymous`.

Port `:8000` on host still serves **Coolify HTML**, not Kong (known misroute).

### 3. Docker build previously baked empty Supabase env (FIXED in Dockerfile)
Old Dockerfile ran `npm run build` with no `ARG VITE_*`. Vite then baked `undefined` client config (seen in local `dist/`).

Live `everdream.n1g3.com` bundle **does** contain `createClient(\`https://supabase.n1g3.com\`)` — so Coolify build args are partially set — but auth still 401s (secret mismatch or backend down).

Dockerfile now:
- Accepts `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REQUIRE_AUTH`, `VITE_APP_BASE_URL`
- Fails the image build if URL/key missing

### 4. Secondary UI bugs (login screen)
- **Phone “Continue”** sets `phoneStep` to `'input'` but phone number field only appears when `phoneStep !== 'input'` — phone path is non-functional.
- Google/Meta OAuth require providers enabled in GoTrue + redirect allow-list; with Auth 401 they will also fail.

## Schema expectations (cannot verify live)
Migrations define:
- `public.profiles` with `auth_user_id` → `auth.users`
- RLS on profiles/dreams via `auth.uid()`
- `handle_new_user` trigger (checklist claims verified with `pilot2@everdream.local`)

Login gate itself does **not** depend on profiles row existing — only on Supabase Auth session + non-anonymous user mapping.

## Code changes made (this session)
1. `src/hooks/use-auth.tsx` — fix `isAnonymous`; honor `FEATURE_REQUIRE_AUTH`
2. `src/components/auth/ProtectedRoute.tsx` — same feature flag
3. `Dockerfile` — required Vite build args

## What you need to do on the server (SSH to Coolify host)
```bash
# 1. Confirm Kong + Auth containers
docker ps | grep -E 'supabase|kong|auth|gotrue'

# 2. Check auth health from inside the network
docker exec <kong-container> wget -qO- http://auth:9999/health
# or
curl -sS -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  https://supabase.n1g3.com/auth/v1/health

# 3. If 401: regenerate/sync keys — ANON_KEY and SERVICE_ROLE_KEY must be
#    signed with the same JWT_SECRET Kong/GoTrue use. Update Coolify env,
#    restart kong + auth, then rebuild ed.app.new with matching build args:
#      VITE_SUPABASE_URL=https://supabase.n1g3.com
#      VITE_SUPABASE_ANON_KEY=<current anon jwt>
#      VITE_REQUIRE_AUTH=true

# 4. Optional: list users once service_role works
curl -sS -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "https://supabase.n1g3.com/auth/v1/admin/users"
```

## Redeploy app after server keys fixed
1. Set Coolify build args (above)
2. Redeploy `ed.app.new` so the isAnonymous fix ships
3. Hard-refresh browser (PWA service worker can cache old JS)
4. Test: sign in with known pilot user / create new account

## Local dev
There is **no** `ed.app.new/.env` (only `.env.example`). Create one with working URL+anon once Kong accepts keys:

```env
VITE_SUPABASE_URL=https://supabase.n1g3.com
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_REQUIRE_AUTH=true
```

## Priority order
1. **Unblock Auth API (401)** on `supabase.n1g3.com` — without this, no login works
2. **Redeploy app** with client `isAnonymous` fix — without this, even successful Auth leaves you on login
3. Fix phone OAuth UI later
4. SMTP for real email confirm when leaving `ENABLE_EMAIL_AUTOCONFIRM`

---
*Generated 2026-07-21 during login investigation.*

---

## Token-in-URL fix (same day)

OAuth returned URLs like:
`https://everdream.n1g3.com/#/#access_token=…&refresh_token=…&provider_token=…`

### Cause
1. OAuth `redirectTo` included a hash (`#/`), so GoTrue appended another fragment → `#/#access_token=…`
2. Implicit flow puts JWTs in the hash
3. `clearSocialOAuthParams` kept the dirty hash
4. Client `isAnonymous ?? true` kept the login screen even after session existed

### Fix (in repo)
- PKCE flow (`flowType: 'pkce'` in `client.ts`)
- OAuth / email redirects use clean origin + `?auth=callback` (no hash) — `redirects.ts` / `socialAuth.ts`
- `urlCleanup.ts` consumes session then `history.replaceState` to `#/` (or `#/reset-password`)
- Boot waits on `authRedirectReady` before rendering (`main.tsx`)
- `use-auth` strips residual artifacts on `SIGNED_IN` / recovery
- `isAnonymous` only true when GoTrue sets `is_anonymous === true`

### Deploy notes
1. Redeploy app with this code
2. GoTrue allow list must include origin without hash:
   - `https://everdream.n1g3.com`
   - `https://everdream.n1g3.com/`
3. Hard refresh / unregister service worker after deploy
4. If an old tab still shows tokens: close it. Treat pasted token URLs as session-compromised — sign out everywhere; revoke Google third-party access if needed
