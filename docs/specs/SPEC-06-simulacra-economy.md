# SPEC-06: Dream Simulacra, VR, NFT & XAEL Economy

**Status:** Complete (code) — Jun 18, 2026  
**Depends on:** Inference backlog (SPEC-03), dream assets pipeline (`lib/assets/pipeline.ts`)

## Vision

Turn dream images into **explorable 3D simulacra** → **WebXR VR rooms** → **tradeable NFTs** on an **XAEL exchange** where users trade experience tokens alongside **energy, data, and compute** credits. Discord broadcasts mints and trades.

## Architecture

```
Dream Image ──► Depth (HF/local) ──► Displaced terrain (browser 3D)
              ──► Meshy image-to-3D ──► GLTF simulacrum (API key)
              ──► Blockade skybox ──► VR environment
              ──► NFT metadata (IPFS-ready) ──► Marketplace listing
              ──► XAEL score (utils/xael.ts) ──► Exchange price floor
              ──► Discord webhook ──► Community feed
```

## Phases

### Phase 1 — Simulacra & VR (no chain) ✅
- [x] `imageTo3D.ts` — Meshy image-to-3D + local luminance depth fallback
- [x] `simulacraService.ts` — build `DreamSimulacrum` from dream record
- [x] `DreamSimulacrumScreen` — R3F explorable depth terrain
- [x] `DreamVRScreen` — wraps `WebXRViewer`
- [x] Routes: `#/simulacrum/:dreamId`, `#/vr/:dreamId`
- [x] Wire from dream detail (Explore 3D / VR / Exchange buttons)
- [x] Wire `DreamAssetGenerator` mesh_3d + pipeline in dream detail (collapsible)
- [x] Pro gate — `ProFeatureGate` + `vrSimulacra` entitlement (EverDream Pro)

### Phase 2 — NFT & Marketplace (local + Supabase) ✅
- [x] `nftMarketplace.ts` — listings, bids, XAEL-denominated prices, resource bundles
- [x] `ipfs.ts` — Pinata metadata upload on mint (fallback: local blob)
- [x] `contracts/EverDreamNFT.sol` + Hardhat deploy (Base Sepolia / Polygon Amoy)
- [x] `003_silent_mint_tables.sql` + `silentMint.ts` app trigger
- [x] `assetPersistence.ts` + `simulacraPersistence.ts` → Supabase `dream_assets`
- [x] `006_economy_marketplace.sql` + `economyPersistence.ts` — balances, orders, trades, listings
- [x] `DreamCombineScreen` — `#/combine` fuses parent NFTs via `createCombinedNFT()`
- [ ] **Ops:** Deploy contract & set `VITE_NFT_CONTRACT_ADDRESS`

### Phase 3 — XAEL Exchange ✅
- [x] `xaelEconomy.ts` — balances: XAEL, ENERGY, DATA, COMPUTE; `mintXAELFromDream` on save
- [x] `xaelOracle.ts` — spot prices for ENERGY/DATA/COMPUTE from order book
- [x] `XAELExchangeScreen` — order book, place-order UI, spot ticker, NFT bundles, TAO quote preview
- [x] `taoBridge.ts` — stub for on-chain $TAO ↔ $XAEL (enable via `VITE_TAO_BRIDGE_ENABLED`)
- [ ] **Ops:** On-chain $XAEL / $TAO bridge contract

### Phase 4 — Discord & Website ✅
- [x] `discord.ts` — webhooks for mint/trade/simulacra ready
- [x] `discordBot.ts` — slash command defs + combine webhook stub
- [x] `discord-bot/` worker (`/dream-combine`, `/simulacrum`, `/xael-price`) + Dockerfile
- [x] Standalone `exchange-web/index.html` (embeds `#/exchange`; deploy to exchange.everdream.app)
- [ ] **Ops:** Deploy bot to Coolify with `DISCORD_BOT_TOKEN`
- [ ] **Ops:** Deploy `exchange-web` to exchange.everdream.app

### Phase 5 — Inference-independent paths ✅
- Local depth from luminance (always works)
- Canvas parallax video (always works)
- Pollinations/Ollama image fallbacks (existing)

## Key files

| Module | Path |
|--------|------|
| Image→3D | `src/lib/assets/imageTo3D.ts` |
| Simulacrum builder | `src/lib/simulacra/simulacraService.ts` |
| 3D explorer | `src/screens/DreamSimulacrumScreen.tsx` |
| VR viewer | `src/screens/DreamVRScreen.tsx` |
| XAEL economy | `src/lib/xaelEconomy.ts` |
| Spot oracle | `src/lib/xaelOracle.ts` |
| Economy sync | `src/lib/economyPersistence.ts` |
| Dream→XAEL | `src/lib/dreamToXAEL.ts` |
| XAEL rewards | `src/lib/mintDreamRewards.ts` |
| TAO bridge stub | `src/lib/taoBridge.ts` |
| Exchange UI | `src/screens/XAELExchangeScreen.tsx` |
| Dream combine | `src/screens/DreamCombineScreen.tsx` |
| Pro gate | `src/components/subscriptions/ProFeatureGate.tsx` |
| NFT market | `src/lib/nftMarketplace.ts` |
| Discord | `src/lib/discord.ts` |

## Deferred (ops deploy)

1. `cd contracts && npm run deploy:base-sepolia` → set `VITE_NFT_CONTRACT_ADDRESS`
2. Supabase: `db push` migrations 003–006; deploy edge functions; set chain secrets
3. Pinata JWT + Discord webhook in production env
4. Coolify: `exchange-web` + `discord-bot` images
5. TAO bridge contract + `VITE_TAO_BRIDGE_ENABLED=true`