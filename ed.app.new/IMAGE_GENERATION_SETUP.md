# Dream Image Generation Setup Guide

## Overview

The dream image generation system now uses a **multi-provider fallback strategy** to ensure images are always generated, even when some services are unavailable.

## Provider Order (Automatic Fallback)

1. **Hugging Face Inference API** (Primary - requires free token)
2. **Puter.com AI API** (Secondary - no token required)
3. **Supabase Edge Function → Pollinations.ai** (Tertiary)
4. **Unsplash Source API** (Stock photos fallback)
5. **Dynamic SVG Generator** (Custom placeholder with dream text)
6. **Simple SVG Placeholder** (Last resort)

## Setup Instructions

### 1. Get Your FREE Hugging Face Token (Recommended)

Hugging Face provides free access to their Inference API with high-quality Stable Diffusion XL models.

**Steps:**
1. Go to [huggingface.co](https://huggingface.co/)
2. Create a free account (or sign in)
3. Navigate to: **Settings → Access Tokens**
4. Click "New token"
5. Give it a name (e.g., "Everdream")
6. Select role: **"Read"** (no write permissions needed)
7. Copy the token (starts with `hf_`)

### 2. Configure Environment Variables

Add your Hugging Face token to your `.env` file:

```bash
# .env (or .env.local)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_HUGGINGFACE_TOKEN=hf_your_actual_token_here
```

### 3. Test Image Generation

1. Open your app
2. Go to a dream entry
3. Click "Generate Assets" or "Visualize Dream"
4. Open browser console (F12) to see detailed logs with `[AssetGen]` tags

## Console Logging

The system provides detailed logging to help debug issues:

```
[AssetGen] Starting dream image generation for: I flew over a city...
[AssetGen] Trying Hugging Face...
[AssetGen] Generating via Hugging Face Inference API...
[AssetGen] Calling Hugging Face API...
[AssetGen] Hugging Face response status: 200
[AssetGen] Hugging Face image validated successfully
[AssetGen] SUCCESS: Hugging Face generated image
```

If Hugging Face fails, you'll see:
```
[AssetGen] Hugging Face failed: Model is loading...
[AssetGen] Trying Puter.com AI...
```

## Fallback Behavior

### When Hugging Face Token is Missing
- System automatically skips Hugging Face
- Falls back to Puter.com AI (no token needed)
- Continues through remaining providers

### When All Cloud APIs Fail
- **Unsplash Source**: Returns real stock photos matching dream keywords
- **Dynamic SVG**: Creates beautiful, unique SVG with:
  - Gradient backgrounds based on dream text
  - Animated stars and glow effects
  - Dream text overlay
  - "Dream generation in progress" message
- **Simple SVG**: Minimal placeholder as absolute last resort

## Troubleshooting

### "Hugging Face model is loading"
- This is normal for first-time use
- The model needs to warm up (~20-30 seconds)
- Wait a moment and try again
- Subsequent requests will be fast

### "402 Payment Required" from Pollinations
- This is expected for `nologo=true` parameter
- System automatically uses `nologo=false` for free tier
- If still failing, system falls back to other providers

### No Images Appearing
1. Check browser console for `[AssetGen]` logs
2. Verify environment variables are set correctly
3. Ensure `.env` file is in the project root
4. Restart development server after changing `.env`

## API Comparison

| Provider | Free? | Quality | Speed | Requires Token |
|----------|-------|---------|-------|----------------|
| Hugging Face | ✅ Yes (free tier) | ⭐⭐⭐⭐⭐ High | Medium | ✅ Yes |
| Puter.com AI | ✅ Yes | ⭐⭐⭐⭐ Good | Fast | ❌ No |
| Pollinations.ai | ✅ Yes | ⭐⭐⭐ Medium | Fast | ❌ No |
| Unsplash Source | ✅ Yes | ⭐⭐⭐⭐ Stock Photos | Fast | ❌ No |
| Dynamic SVG | ✅ Always works | ⭐⭐ Placeholder | Instant | ❌ No |

## Next Steps

1. **Get your Hugging Face token** (takes 2 minutes)
2. **Add to `.env` file**
3. **Test generation** with a sample dream
4. **Monitor console** for any issues

For support, check the browser console logs tagged with `[AssetGen]`.
