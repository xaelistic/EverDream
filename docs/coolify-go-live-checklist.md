# Everdream Coolify Go-Live Checklist

**Server:** `185.249.74.204` (SSH alias: `coolify`)  
**Supabase service:** `supabase-test` (`w9b3r7ces8npevhqcjwn4lzk`)  
**Canonical app:** `ed.app.new/` in `xaelistic/EverDream`  
**Schema decision:** New project migrations (`supabase/migrations/001–005`)

Last updated: 2026-07-02

---

## Status legend

- [x] Done
- [ ] Not started
- [~] In progress / needs your input

---

## 1. Database schema (New project)

- [x] Decision: adopt New project schema (not legacy ED.App schema)
- [x] Drop legacy public tables on `supabase-test`
- [x] Apply migrations `001_initial_schema` through `005_functions`
- [x] Verify tables: `profiles`, `dreams`, `sleep_sessions`, `nft_registry`, `remix_registry`, `sync_queue`, `function_rate_limits`
- [x] Verify RPC: `check_rate_limit`, `handle_new_user` trigger on `auth.users`
- [x] Verify storage buckets: `dream-media`, `encrypted-blobs`, `public-assets`

---

## 2. Supabase edge functions

- [x] Functions deployed to `/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk/volumes/functions/`
- [x] Core env present in edge-runtime: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [~] **QWEN secrets** (required for `ai-proxy`) — add your values in Coolify → supabase-test → Environment:
  - `QWEN_API_URL`
  - `QWEN_API_KEY`
  - `QWEN_MODEL` (optional, default `qwen2.5-7b-instruct`)
- [~] **Thirdweb secrets** (required for `nft-mint`) — add your values:
  - `THIRDWEB_SECRET_KEY`
  - `THIRDWEB_MINTER_PRIVATE_KEY`
  - `THIRDWEB_CONTRACT_ADDRESS`
  - `THIRDWEB_CHAIN` (`amoy` for testnet)
- [ ] `NFT_WEBHOOK_URL` (optional — n8n/Discord after mint)
- [x] Restart `supabase-edge-functions` after env changes

---

## 3. HTTPS & public URL

- [x] Coolify env updated: `SERVICE_URL_SUPABASEKONG=https://supabase.n1g3.com`
- [ ] **DNS required:** Point A record `supabase.n1g3.com` → `185.249.74.204` (not resolving yet)
- [ ] Confirm Traefik TLS cert issued after DNS propagates
- [ ] Update `ed.app.new/.env` to `https://supabase.n1g3.com` once HTTPS works
- [x] Interim URL (working now): `http://supabasekong-w9b3r7ces8npevhqcjwn4lzk.185.249.74.204.sslip.io:8000`

---

## 4. Web app (`ed.app.new`)

- [x] `.env.example` with Coolify Supabase URL + anon key
- [x] Auth gate enabled (`FEATURE_REQUIRE_AUTH`) — sign-up / sign-in required
- [x] NFT UI hidden for launch (`FEATURE_NFT_UI_ENABLED=false`; backend `nft-mint` remains deployed)
- [x] Sign-out in Profile & Settings
- [ ] Copy `.env.example` → `.env` locally and run `npm run dev`
- [ ] Run `npm run typecheck` and `npm run build`
- [ ] Capacitor preview build for mobile (optional)

---

## 5. Auth & email

- [x] Enable `ENABLE_EMAIL_AUTOCONFIRM=true` for pilot (no inbox required)
- [x] Test sign-up creates `auth.users` row + `profiles` row via trigger (verified `pilot2@everdream.local`)
- [ ] Test RLS with two real users (dreams not visible cross-user)
- [ ] (Later) Configure SMTP for production email confirm/recovery

---

## 6. External services (your accounts)

- [ ] Qwen / LLM API endpoint + key
- [ ] Thirdweb: deploy SBT contract on Polygon Amoy
- [ ] Fund minter wallet with testnet MATIC
- [ ] n8n workflows for mint alerts / sync failures (optional for MVP)

---

## 7. Launch gate

- [ ] `ai-proxy`, `sync-processor`, `wearable-sync`, `nft-mint` respond in production with real JWT
- [ ] Pilot flow: sign in → capture dream → sync → verify → score (NFT mint deferred)
- [ ] Privacy policy published (encryption, Supabase, AI, NFT metadata)
- [ ] Apple Developer + Google Play accounts (for store release)

---

## Quick reference commands

### SSH
```bash
ssh coolify
```

### Redeploy edge functions after code change
```powershell
scp -r "C:\Users\xaeli\Documents\GitHub\EDI\EverDream\ed.app.new\supabase\functions\<name>" coolify:/data/coolify/services/w9b3r7ces8npevhqcjwn4lzk/volumes/functions/
ssh coolify "docker restart supabase-edge-functions-w9b3r7ces8npevhqcjwn4lzk"
```

### Apply migrations (if re-running on fresh DB)
```bash
ssh coolify
for f in /tmp/migrations/*.sql; do
  docker exec -i supabase-db-w9b3r7ces8npevhqcjwn4lzk psql -U postgres -d postgres < "$f"
done
```

### Supabase API (current)
```
http://supabasekong-w9b3r7ces8npevhqcjwn4lzk.185.249.74.204.sslip.io:8000
```

### Edge function paths
```
/functions/v1/ai-proxy
/functions/v1/sync-processor
/functions/v1/wearable-sync
/functions/v1/nft-mint
```