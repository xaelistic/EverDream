# Dream Image Generation - Setup Guide

This document explains how to configure dream image generation in EverDream. The app uses a **tiered fallback approach** to ensure images are always generated, even if some services are unavailable.

## Provider Priority Order

The app tries providers in this order (first successful one wins):

1. **Supabase Edge Function** (FREE) - Proxies Pollinations.ai, avoids CORS issues
2. **Direct Pollinations.ai** (FREE) - No API key needed, unlimited generations
3. **Fal AI** (~$0.001/image) - Very fast, requires API key
4. **Local Generation** (FREE) - Run ComfyUI or A1111 on your machine
5. **HuggingFace Inference API** (FREE tier) - Requires optional API key
6. **SVG Placeholder** (Always works) - Gradient with text overlay

## Quick Start (Free, No Setup Required)

Out of the box, the app works with **no configuration**:
- Just save a dream and an image will be generated automatically
- Uses Pollinations.ai (free, unlimited) via Supabase Edge Function
- If that fails, falls back to direct Pollinations call
- Final fallback is a beautiful SVG gradient placeholder

## Optional: Faster/Cheaper Options

### Fal AI (Recommended for Production)

**Cost:** ~$0.001 per image (extremely cheap)
**Speed:** 2-5 seconds
**Quality:** Excellent (SDXL-based)

1. Get your API key at [fal.ai](https://fal.ai)
2. Add to your `.env` file:
   ```
   VITE_FAL_AI_KEY=your_fal_ai_key_here
   ```
3. Restart the app

Fal AI will be tried after the free options, giving you faster generation at minimal cost.

### Local Generation (Best for Testing/Development)

**Cost:** FREE (uses your GPU)
**Speed:** Depends on your hardware (typically 10-30 seconds)
**Quality:** Whatever model you configure

#### Option A: AUTOMATIC1111 (A1111)

1. Install [AUTOMATIC1111 Stable Diffusion WebUI](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
2. Start it with `--api` flag:
   ```bash
   python launch.py --api
   ```
3. Add to your `.env`:
   ```
   VITE_LOCAL_GEN_URL=http://localhost:7860
   ```

#### Option B: ComfyUI

1. Install [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
2. Start ComfyUI (it enables API by default):
   ```bash
   python main.py
   ```
3. Add to your `.env`:
   ```
   VITE_LOCAL_GEN_URL=http://localhost:8188
   ```

**Note:** For local generation, make sure your SD installation allows CORS or run the browser with CORS disabled for testing.

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required for cloud sync (optional for local-only use)
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Fal AI (optional, for faster generation)
VITE_FAL_AI_KEY=

# Local generation (optional, for testing with your own SD)
VITE_LOCAL_GEN_URL=http://localhost:7860

# HuggingFace (optional, additional fallback)
# VITE_HF_INFERENCE_API_KEY=hf_xxx
```

## Debugging

Open browser DevTools Console to see detailed logs:

```
[AssetGen] Starting image generation for prompt: ...
[AssetGen] Attempting Edge Function...
[AssetGen] Generating image via Edge Function with prompt: ...
[AssetGen] Invoking Supabase generate-image function...
[AssetGen] Edge function response received
[AssetGen] Image URL received: https://...
```

If a provider fails, you'll see:
```
[AssetGen] Edge function failed: ...
[AssetGen] Attempting Pollinations direct...
```

## Troubleshooting

### No images appearing

1. Check browser console for errors
2. Verify Pollinations.ai is accessible from your network
3. Try setting `VITE_LOCAL_GEN_URL` for local testing

### CORS errors

- Use Supabase Edge Function (default) - it proxies requests server-side
- Or run with local generation on localhost
- Or install a CORS-unblocking browser extension for testing

### Slow generation

- Add `VITE_FAL_AI_KEY` for ~2 second generation
- Or use local generation if you have a good GPU

### Images not saving with dreams

Check that:
1. `settings.imageGeneration` is enabled (default: true)
2. The dream object has `generatedImage.url` populated
3. Browser storage is working (check DevTools > Application > Local Storage)

## Cost Comparison

| Provider | Cost/Image | Speed | Quality | Setup |
|----------|-----------|-------|---------|-------|
| Pollinations (via Edge) | FREE | 5-10s | Good | None |
| Pollinations (direct) | FREE | 5-10s | Good | None |
| Fal AI | ~$0.001 | 2-5s | Excellent | API key |
| Local (A1111/ComfyUI) | FREE* | 10-30s | Configurable | Install SD |
| HuggingFace | FREE* | 10-20s | Good | Optional key |
| SVG Placeholder | FREE | Instant | Basic | None |

*Electricity/hardware costs apply for local generation

## Architecture

```
┌─────────────────┐
│   Dream Save    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ generateDream   │
│ Image(prompt)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │  Try 1  │───► Supabase Edge Function (proxies Pollinations)
    └────┬────┘
         │ Failed?
    ┌────▼────┐
    │  Try 2  │───► Direct Pollinations.ai
    └────┬────┘
         │ Failed?
    ┌────▼────┐
    │  Try 3  │───► Fal AI (if key configured)
    └────┬────┘
         │ Failed?
    ┌────▼────┐
    │  Try 4  │───► Local ComfyUI/A1111 (if URL configured)
    └────┬────┘
         │ Failed?
    ┌────▼────┐
    │  Try 5  │───► HuggingFace Inference API
    └────┬────┘
         │ Failed?
    ┌────▼────┐
    │ Fallback│───► SVG gradient placeholder
    └─────────┘
```

## Code Location

- Main generator: `src/modules/sleep/dreamAssetGenerator.ts`
- Supabase Edge Function: `supabase/functions/generate-image/index.ts`
- Integration: `src/DreamJournalApp.tsx` (see `generateDreamImageAsync`)
- Display: `src/components/dreams/DreamCard.tsx`, `DreamDetail` view
