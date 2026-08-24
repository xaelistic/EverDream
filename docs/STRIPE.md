# Stripe (PWA + website)

Checkout is **Stripe Checkout Sessions** via the `stripe-checkout` edge function.

- Marketing site (`everdream_website`): pricing CTAs link to `https://everdream.n1g3.com/#/upgrade?plan=plus` (or `#/credits?pack=…`). The Docker build `ARG VITE_APP_URL` must be `https://everdream.n1g3.com` — not `app.everdream.n1g3.com`.
- PWA: after sign-in, `#/upgrade` and `#/credits` start Checkout. Website `?plan=` / `?pack=` is stored in `sessionStorage` so Google OAuth cannot drop it.
- The browser does **not** need `VITE_STRIPE_PUBLISHABLE_KEY`. Set `VITE_STRIPE_DISABLED=true` only to hide pay buttons.

## Coolify — `supabase-everdream-live` (edge-functions env)

Set these runtime secrets, then restart `supabase-edge-functions`:

| Secret | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` or `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the webhook endpoint |
| `STRIPE_PRICE_PLUS_MONTHLY` | Price ID for EverDream+ $5.99/mo |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID for Pro $12.99/mo |
| `STRIPE_PRICE_CREDITS_20` | Price ID for 20 credits $4.99 |
| `STRIPE_PRICE_CREDITS_60` | Price ID for 60 credits $11.99 |
| `STRIPE_PRICE_CREDITS_150` | Price ID for 150 credits $24.99 |

## Stripe Dashboard

1. Products: Plus monthly, Pro monthly, three one-time credit packs.
2. Webhook URL: `https://supabase.n1g3.com/functions/v1/stripe-webhook`  
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`.
3. Customer portal enabled for Plus/Pro.

Until these secrets exist, Unlock/Buy shows “Stripe not configured”.
