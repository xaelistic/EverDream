# Security red team — 2026-08-23

## Implemented this round

1. **Stripe checkout IDOR** — checkout no longer trusts client `profile_id`. JWT required; profile loaded from `auth.uid()`.
2. **Stripe portal IDOR** — same: portal sessions only for the signed-in user's customer.
3. **Open redirects** — `success_url` / `cancel_url` / `return_url` must match allowlisted origins.
4. **Billing field lock** — trigger blocks client updates to `subscription_tier`, Stripe ids, and credit counters (RPCs/service_role only).
5. **Credits in Postgres** — `credit_ledger` + `get_credit_balance` / `consume_image_credits` / `refund_image_credits` / `grant_purchased_credits`.
6. **Demo-open RLS** — drop leftover `demo anon *` policies on analytics tables if present.
7. **Error leakage** — Stripe functions return generic errors to the client.

## Still watch (not fully closed)

- Image generation edge function itself does not deduct credits; the client RPC does. A raw `functions.invoke('generate-image')` still bypasses billing until generate-image is wired to consume server-side.
- Wearable OAuth tokens still sit in `localStorage` (`wearableConnectionStore`). XSS = token theft. Move to httpOnly or `wearable_connections` only.
- `analyze-dream` / `transcribe-audio` are usage-uncapped besides client rate limits.
- CORS allowlists are origin-based but default fallback is production origin (not `*`).
- Service-role keys in Coolify must stay off the frontend (already the model).

## Test notes

- Attempt checkout while signed out → 401.
- Pass another user's `profile_id` in body → ignored; billed to JWT user.
- Direct profile update of `subscription_tier` as authenticated user → denied.
- Image gen with 0 credits → client error, no spend.
