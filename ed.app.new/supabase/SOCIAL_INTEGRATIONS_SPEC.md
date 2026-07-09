# EverDream Social Integrations Spec

## Overview

Social auth and sharing share one OAuth layer. Login via Meta/Google/Apple stores provider tokens server-side; profile linking reuses the same flow; dream sharing can publish via platform APIs when tokens and scopes are present, with native share sheet and share-dialog fallbacks.

## Database

| Table | Purpose |
|-------|---------|
| `social_accounts` | Linked OAuth accounts + encrypted tokens (service-role writes only) |
| `social_accounts_public` | Client-safe view (no tokens) |
| `dream_share_links` | Public OG-friendly share URLs (`/#/share/{slug}`) |
| `dream_share_events` | Audit log for native/dialog/api/link shares |

Run migration: `supabase/migrations/20250616000001_social_integrations.sql`

## Supabase Auth Providers

Enable in Dashboard → Authentication → Providers:

| Provider | Used for | Scopes |
|----------|----------|--------|
| Facebook (Meta) | Login + link + FB feed/page publish | `public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish` |
| Google | Login + link | `openid profile email` |
| Apple | Login + link | default |

Redirect URLs (add all environments):

```
http://localhost:5173/#/
https://YOUR_PROD_DOMAIN/#/
```

## Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `social-token-sync` | JWT | Persist `provider_token` from session into `social_accounts`; fetch Meta page/IG metadata |
| `share-link` | JWT (create) / public (read) | Create and resolve public dream share links |
| `social-publish` | JWT | Publish dream to Facebook page, Instagram, or TikTok via stored tokens |
| `social-oauth-tiktok` | JWT (start) / public (callback) | TikTok Login Kit OAuth (Supabase has no native TikTok provider) |

### Secrets (`supabase secrets set`)

```
META_APP_ID=...              # same as Facebook provider client id
META_APP_SECRET=...
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...
APP_BASE_URL=https://everdream.app
```

## Client Modules

| Module | Role |
|--------|------|
| `src/lib/auth/socialAuth.ts` | Unified OAuth: login, link, scopes |
| `src/lib/social/socialAccounts.ts` | Fetch linked accounts from `social_accounts_public` |
| `src/lib/social/shareService.ts` | Share orchestration: API → dialog → native |
| `src/hooks/use-social-auth.ts` | Post-OAuth token sync + callback handling |

## Share Flow

```
User taps Share → ShareModal
  ├─ "Share to apps" → Web Share API / Capacitor Share (WhatsApp, LINE, …)
  ├─ Facebook → social-publish API if page token else FB Share Dialog
  ├─ Instagram → social-publish API if IG business linked else download+copy
  ├─ TikTok → social-publish if token else download+copy
  └─ Create share link → share-link edge fn → public URL for OG previews
```

## Meta Graph API Notes

- **Facebook feed**: Personal profile posting is restricted; we post to the user's first managed Page when `pages_manage_posts` is granted.
- **Instagram**: Requires IG Business/Creator account linked to that Page. Flow: create media container → publish.
- **TikTok**: Content Posting API v2 photo init; requires `video.publish` scope and app review.

## Testing Checklist

1. Login with Meta → confirm row in `social_accounts_public`
2. Profile → Link Instagram (marks ready; API publish after Meta IG link)
3. Share dream → Facebook → check `dream_share_events` status `published` or `dialog` fallback
4. Android Capacitor → "Share to apps" opens system sheet
5. Public link `/#/share/{slug}` loads dream preview without auth