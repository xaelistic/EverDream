# 🔧 Dream Analysis Fix Guide

## Problem Diagnosis
Your dream analysis shows "Analysis unavailable" because:
1. **Supabase credentials are placeholders** in `.env`
2. **No AI provider API keys** are configured
3. **Edge functions may not be deployed** to your Supabase project

## Quick Fix (Choose ONE AI Provider)

### Option A: Google Gemini (RECOMMENDED - FREE, 60 req/min)
1. Get free API key: https://aistudio.google.com/app/apikey
2. Update your `.env` file:
   ```bash
   GEMINI_API_KEY=your-actual-gemini-key-here
   ```
3. Deploy to Supabase:
   ```bash
   cd /workspace/ed.app.new/supabase
   supabase secrets set GEMINI_API_KEY=your-actual-gemini-key-here
   supabase functions deploy analyze-dream
   ```

### Option B: OpenRouter (FREE tier available)
1. Get API key: https://openrouter.ai/keys
2. Update your `.env` file:
   ```bash
   OPENROUTER_API_KEY=sk-or-your-actual-key-here
   ```
3. Deploy to Supabase:
   ```bash
   cd /workspace/ed.app.new/supabase
   supabase secrets set OPENROUTER_API_KEY=sk-or-your-actual-key-here
   supabase functions deploy analyze-dream
   ```

## Complete Setup Steps

### Step 1: Update Your .env File
Edit `/workspace/ed.app.new/.env` with your ACTUAL Supabase credentials:

```bash
# SECTION 1: SUPABASE (REQUIRED)
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...your-actual-anon-key

# SECTION 2: AI DREAM ANALYSIS (AT LEAST ONE REQUIRED)
# Choose at least one - Gemini recommended (FREE)
GEMINI_API_KEY=AIzaSy...your-actual-gemini-key
```

### Step 2: Set Supabase Secrets
These are server-side and NEVER exposed to the browser:

```bash
cd /workspace/ed.app.new/supabase

# Set at least ONE AI provider key (Gemini recommended)
supabase secrets set GEMINI_API_KEY=AIzaSy...your-actual-gemini-key

# Optional: Add more providers for fallback
supabase secrets set OPENROUTER_API_KEY=sk-or-...your-openrouter-key
supabase secrets set OPENAI_API_KEY=sk-...your-openai-key
```

### Step 3: Deploy Edge Functions
```bash
cd /workspace/ed.app.new/supabase
supabase functions deploy analyze-dream
supabase functions deploy generate-image
```

### Step 4: Verify Deployment
```bash
supabase functions list
```

You should see:
- `analyze-dream` ✓
- `generate-image` ✓
- `transcribe-audio` ✓
- `health-check` ✓

### Step 5: Test the Analysis
1. Start your dev server: `npm run dev`
2. Go to the journal screen
3. Enter a dream (at least 10 characters)
4. Check browser console (F12) for logs:
   - `[DreamAnalyzer] ========== DREAM ANALYSIS STARTED ==========`
   - `[DreamAnalyzer] Step 2: Invoking Supabase analyze-dream edge function...`
   - `[analyze-dream] Trying gemini...`
   - `[analyze-dream] gemini succeeded`

## Troubleshooting

### Error: "Supabase not configured"
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` are real values
- Restart dev server after editing `.env`

### Error: "All providers failed"
- Check Supabase secrets: `supabase secrets list`
- Verify at least one API key is set
- Check edge function logs: `supabase functions logs analyze-dream`

### Error: "Function not found"
- Deploy the function: `supabase functions deploy analyze-dream`
- Check your Supabase project URL matches `.env`

### Still showing "Analysis unavailable"?
1. Open browser DevTools (F12)
2. Go to Console tab
3. Submit a dream
4. Look for error messages starting with `[DreamAnalyzer]` or `[analyze-dream]`
5. Share the exact error message for further help

## Free AI Provider Comparison

| Provider | Free Tier | Rate Limit | Cost After Free |
|----------|-----------|------------|-----------------|
| **Gemini** | ✅ Yes | 60 req/min | Free up to 1M tokens/day |
| OpenRouter | ✅ Some models | Varies | ~$0.10-0.50/1M tokens |
| OpenAI | ❌ No (trial credit) | N/A | ~$0.15-2.00/1M tokens |
| NVIDIA | ❌ No (trial credit) | N/A | ~$0.25-1.00/1M tokens |

**Recommendation**: Start with Gemini (completely free), add OpenRouter as backup.

## Alternative: Local Testing Without Deployment

If you want to test immediately without Supabase deployment, you can use the mock data mode:

1. Edit `.env`:
   ```bash
   VITE_USE_MOCK_DATA=true
   ```

2. Restart dev server

This will show sample analysis results for testing the UI.
