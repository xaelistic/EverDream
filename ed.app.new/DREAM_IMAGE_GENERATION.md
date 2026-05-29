# Dream Image Generation - Cost-Effective Solutions

## Overview

The EverDream app now uses a **tiered, cost-effective approach** for generating dream visualization images. The system automatically falls back through multiple providers, prioritizing **FREE** options before using any paid services.

## Architecture

```
Browser App  →  Supabase Edge Function  →  Pollinations.ai (FREE)
                (CORS proxy, keeps       (Flux model, unlimited
                 keys server-side)        free generations)
                      ↓
            Direct Pollinations.ai (FREE fallback)
                      ↓
            HuggingFace Inference API (FREE tier)
                      ↓
            SVG Placeholder (always works)
```

## Provider Comparison

| Provider | Cost | Speed | Quality | API Key Required | Notes |
|----------|------|-------|---------|------------------|-------|
| **Pollinations.ai** (via Edge Function) | **FREE** | 10-20s | High (Flux) | ❌ No | **RECOMMENDED** - Best balance |
| **Pollinations.ai** (direct) | **FREE** | 10-20s | High (Flux) | ❌ No | May have CORS issues |
| **HuggingFace SDXL** | **FREE** tier | 5-15s | Good | ⚠️ Optional | Rate limited on free tier |
| **SVG Placeholder** | **FREE** | Instant | N/A | ❌ No | Fallback only |
| OpenAI DALL-E 3 | ~$0.04/image | 10-15s | Excellent | ✅ Yes | Paid option |
| Stability AI SDXL | ~$0.007/image | 5-10s | Excellent | ✅ Yes | Paid option |
| Replicate SDXL | ~$0.002/image | 10-20s | Excellent | ✅ Yes | Cheapest paid option |

## Default Setup (FREE - Recommended)

The default configuration uses **zero-cost** image generation:

### 1. Supabase Edge Function (Primary)

The app first tries to call your Supabase Edge Function `generate-image`, which:
- Proxies requests to Pollinations.ai
- Avoids CORS issues by fetching images server-side
- Returns actual image bytes or JSON with URL
- **Cost: FREE** (uses Supabase's free tier: 500k invocations/month)

**Setup:**
```bash
# Deploy the edge function to your Supabase project
cd ed.app.new
npx supabase functions deploy generate-image
```

**Required .env variables:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Direct Pollinations.ai (Fallback 1)

If Supabase is not configured, the app calls Pollinations.ai directly:
- Uses Flux model for high-quality surreal/dreamlike images
- 1024×1024 resolution
- No authentication required
- **Cost: FREE** (unlimited generations)

**URL format:**
```
https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true&seed={random}
```

### 3. HuggingFace Inference API (Fallback 2)

Uses Stable Diffusion XL base model:
- Free tier available (no API key needed for public models)
- Rate limited on free tier
- Better with API key (get free key at https://huggingface.co/settings/tokens)

**Optional .env variable:**
```env
VITE_HF_INFERENCE_API_KEY=hf_xxx
```

### 4. SVG Placeholder (Final Fallback)

If all providers fail:
- Generates a deterministic gradient SVG based on dream text
- Always works, instant load
- Provides visual feedback even when APIs are down

## How It Works in Code

### Frontend Service (`src/modules/sleep/dreamAssetGenerator.ts`)

```typescript
export async function generateDreamImage(prompt: string): Promise<DreamAsset> {
  // Tier 1: Supabase Edge Function
  try {
    return await generateWithEdgeFunction(prompt);
  } catch (e) {
    console.warn('Edge function failed, trying direct...');
  }

  // Tier 2: Direct Pollinations
  try {
    return await generateWithPollinations(prompt);
  } catch (e) {
    console.warn('Pollinations failed, trying HuggingFace...');
  }

  // Tier 3: HuggingFace
  try {
    return await generateWithHuggingFace(prompt);
  } catch (e) {
    console.warn('HuggingFace failed, using placeholder...');
  }

  // Tier 4: SVG Placeholder
  return await generateFallbackImage(prompt);
}
```

### Edge Function (`supabase/functions/generate-image/index.ts`)

The Deno edge function:
1. Accepts POST request with `{ prompt, style, width, height }`
2. Builds enhanced prompt with style modifiers
3. Calls Pollinations.ai API
4. Fetches the actual image bytes (avoids CORS)
5. Returns binary image data or JSON with URL

## Deployment Steps

### Step 1: Configure Supabase (Recommended)

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the generate-image function
supabase functions deploy generate-image
```

### Step 2: Set Environment Variables

Create `.env` from `.env.example`:
```bash
cp .env.example .env
```

Fill in your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Test Image Generation

```bash
# Start the dev server
npm run dev

# In the app:
# 1. Create a new dream entry
# 2. Enable "Generate Image" option
# 3. Save the dream
# 4. Watch the spinner, then see your AI-generated dream image!
```

## Upgrading to Paid Options (Optional)

If you want higher quality or more consistent results, you can add paid providers:

### Option A: OpenAI DALL-E 3 (~$0.04/image)

1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env`:
   ```env
   VITE_OPENAI_API_KEY=sk-proj-xxx
   ```
3. Modify `dreamAssetGenerator.ts` to add `generateWithOpenAI()` function

### Option B: Replicate SDXL (~$0.002/image - Cheapest Paid)

1. Get API token from https://replicate.com/account/api-tokens
2. Add to `.env`:
   ```env
   VITE_REPLICATE_API_TOKEN=r8_xxx
   ```
3. Add `generateWithReplicate()` function calling SDXL model

### Option C: Stability AI (~$0.007/image)

1. Get API key from https://platform.stability.ai/
2. Add to `.env`:
   ```env
   VITE_STABILITY_API_KEY=sk_xxx
   ```
3. Add `generateWithStability()` function

## Cost Estimates

### FREE Tier (Default Setup)
- **Monthly cost: $0**
- Unlimited generations via Pollinations.ai
- Supabase Edge Functions: 500k invocations/month free
- Suitable for: Personal use, MVP, testing

### Budget Paid Tier (Replicate SDXL)
- **Cost: ~$0.002 per image**
- Example: 100 dreams/month = $0.20/month
- Example: 1000 dreams/month = $2.00/month
- Suitable for: Production apps with moderate usage

### Premium Tier (DALL-E 3)
- **Cost: ~$0.04 per image**
- Example: 100 dreams/month = $4.00/month
- Example: 1000 dreams/month = $40.00/month
- Suitable for: Commercial apps requiring highest quality

## Troubleshooting

### Images not generating?

1. **Check browser console** for error messages
2. **Verify Supabase connection**:
   ```javascript
   console.log(import.meta.env.VITE_SUPABASE_URL)
   ```
3. **Test edge function directly**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/generate-image \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"a surreal dreamscape","format":"json"}'
   ```

### CORS errors?

- Use the Supabase Edge Function (it proxies requests server-side)
- Don't call image APIs directly from the browser

### Slow generation?

- Pollinations.ai typically takes 10-20 seconds
- Show the loading spinner during generation
- Consider smaller image sizes (512×512 instead of 1024×1024)

## Best Practices

1. **Always show loading state** - Image generation takes 10-20 seconds
2. **Cache generated images** - Store URLs in your database to avoid regenerating
3. **Use deterministic seeds** - Same prompt + seed = same image (for consistency)
4. **Enhance prompts** - Add style keywords like "dreamlike, surreal, ethereal"
5. **Handle failures gracefully** - The SVG fallback ensures users always see something

## Summary

✅ **Default setup is 100% FREE** - No API keys required  
✅ **Automatic fallback chain** - Multiple providers for reliability  
✅ **Production-ready** - Supabase Edge Function handles CORS securely  
✅ **Upgrade path available** - Easy to add paid providers later  

Start with the free tier and upgrade only if you need higher quality or have specific requirements!
