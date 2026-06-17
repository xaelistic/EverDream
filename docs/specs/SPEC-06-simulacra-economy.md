# SPEC-06: Dream Simulacra, VR, NFT & XAEL Economy

**Status:** Phase 2 in progress (Jun 2026)  
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

### Phase 1 — Simulacra & VR (no chain)
- [x] `imageTo3D.ts` — Meshy image-to-3D + local luminance depth fallback
- [x] `simulacraService.ts` — build `DreamSimulacrum` from dream record
- [x] `DreamSimulacrumScreen` — R3F explorable depth terrain
- [x] `DreamVRScreen` — wraps `WebXRViewer`
- [x] Routes: `#/simulacrum/:dreamId`, `#/vr/:dreamId`
- [x] Wire from dream detail (Explore 3D / VR / Exchange buttons)
- [x] Wire `DreamAssetGenerator` mesh_3d + pipeline in dream detail (collapsible)

### Phase 2 — NFT & Marketplace (local + Supabase)
- [x] `nftMarketplace.ts` — listings, bids, XAEL-denominated prices
- [x] `ipfs.ts` — Pinata metadata upload on mint (fallback: local blob)
- [x] `contracts/EverDreamNFT.sol` + Hardhat deploy (Base Sepolia / Polygon Amoy)
- [ ] Deploy contract & set `VITE_NFT_CONTRACT_ADDRESS`
- [x] `003_silent_mint_tables.sql` + `silentMint.ts` app trigger
- [x] `assetPersistence.ts` + `simulacraPersistence.ts` → Supabase `dream_assets`

### Phase 3 — XAEL Exchange
- [x] `xaelEconomy.ts` — balances: XAEL, ENERGY, DATA, COMPUTE
- [x] `XAELExchangeScreen` — order book UI (simulated matching)
- [ ] On-chain $XAEL / $TAO bridge (future)
- [ ] Oracle for energy/compute spot prices

### Phase 4 — Discord & Website
- [x] `discord.ts` — webhooks for mint/trade/simulacra ready
- [x] `discordBot.ts` — slash command defs + combine webhook stub
- [x] `discord-bot/` worker (`/dream-combine`, `/simulacrum`, `/xael-price`) + Dockerfile
- [ ] Deploy bot to Coolify with `DISCORD_BOT_TOKEN`
- [x] Standalone `exchange-web/index.html` (embeds `#/exchange`; deploy to exchange.everdream.app)

### Phase 5 — Inference-independent paths
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
| Exchange UI | `src/screens/XAELExchangeScreen.tsx` |
| NFT market | `src/lib/nftMarketplace.ts` |
| Discord | `src/lib/discord.ts` |

## Next steps (priority)

1. ~~Complete mesh polling in `processAssetStep` for `mesh_3d`~~ (uses `generate3DMeshBlocking`)
2. ~~Persist simulacra assets to Supabase `dream_assets`~~
3. ~~Link NFT mint to simulacrum `animation_url`~~
4. Deploy Discord webhook + Pinata JWT via env
5. Deploy `exchange-web` to exchange.everdream.app
6. ~~dream_id TEXT migration~~ (`004_dream_assets_text_id.sql`)
7. Deploy `exchange-web` Docker image to exchange.everdream.app
8. Set Supabase secrets for on-chain silent-mint