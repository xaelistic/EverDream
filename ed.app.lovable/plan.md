# Plan: Login Screen + Auth Foundation

Focused on the login screen as requested. Other items (loading screen, home, video capture, calendar, settings, dream interpretation) come in follow-up turns.

## 1. Enable Lovable Cloud
Provisions auth, database, and server runtime. No action needed from you.

## 2. Database: profiles
Create `profiles` table linked to `auth.users`:
- `id` (uuid, PK, FK → auth.users, cascade)
- `display_name` (text)
- `avatar_url` (text)
- `bio` (text)
- `created_at`, `updated_at`
- RLS: users can select all (for social sharing) but only update/insert their own row
- Trigger: auto-create profile row on signup, seeding `display_name` from OAuth metadata

## 3. Auth providers
Configure in Cloud:
- Email/password (default)
- Google OAuth (managed by Cloud — no setup needed from you)
- Facebook/Meta OAuth (managed by Cloud — you'll need to add Meta app credentials in Cloud settings later; I'll surface that step)
- TikTok: button rendered with "Coming soon" badge, disabled. Real OAuth requires a TikTok Developer app + custom server route — deferred.

## 4. Login screen UI (`/login`)
Calm/minimal aesthetic — soft gradients, generous whitespace, wellness vibe.

Layout:
- Centered card on a soft gradient background (muted lavender → off-white)
- App wordmark + short tagline ("Track, reflect, share your dreams")
- Three social buttons stacked: **Continue with Google**, **Continue with Meta**, **Continue with TikTok (Coming soon)**
- Divider "or"
- Email + password fields with toggle between Sign in / Create account
- "Forgot password?" link
- Subtle micro-copy + footer link to terms/privacy (placeholder)

Design tokens added to `src/styles.css`:
- Calm palette: muted indigo primary, sand/cream background, soft shadow
- Rounded-2xl cards, generous padding

## 5. Auth wiring
- `src/integrations/supabase/client.ts` is auto-generated when Cloud is enabled
- Login form calls `supabase.auth.signInWithPassword` / `signUp` with `emailRedirectTo: window.location.origin`
- Social buttons call `supabase.auth.signInWithOAuth({ provider: 'google' | 'facebook' })`
- TikTok button is disabled with tooltip
- `useAuth` hook: subscribes to `onAuthStateChange` (set up BEFORE `getSession()`), exposes user/session/loading
- `_authenticated` layout route guards future protected routes; redirects to `/login` when signed out

## 6. Routes added
- `src/routes/login.tsx` — the login screen
- `src/routes/_authenticated.tsx` — pathless layout guard (for future home/calendar/settings)
- `src/routes/reset-password.tsx` — required companion for password reset flow
- Update `src/routes/index.tsx` — temporary: redirect to `/login` if signed out, otherwise show a stub "Home coming next" placeholder

## Out of scope (next turns)
Loading screen, combined Reflect+Record home, video capture, calendar view, settings redesign, dream interpretation/narrative expansion, real Meta credentials wiring, real TikTok OAuth.

## Notes on uploaded zip
The zip contains a marketing landing page (HeroSection, WaitlistSection, etc.) — not the in-app screens. I'm treating it as brand reference only and not importing it into the app. If you want the marketing site preserved as a separate `/` landing page, say the word.
