# 🚀 Quick Start: Fix Dream Analysis NOW

## The Problem
Your dream analysis isn't working because the app needs to connect to Supabase edge functions.

## The Solution (5 minutes)

### Step 1: Create Free Supabase Account (2 min)

1. Go to https://supabase.com
2. Click "Start your project" 
3. Sign up with GitHub (fastest) or email
4. Create a new project
   - Name: `everdream` (or anything you like)
   - Database password: Choose something secure
   - Region: Pick closest to you
5. Wait ~2 minutes for provisioning

### Step 2: Get Your Credentials (30 sec)

In Supabase dashboard:
1. Go to **Settings** → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (long string)

### Step 3: Configure Environment (1 min)

```bash
cd /workspace/ed.app.new
cp .env.example .env
```

Now edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_ACTUAL_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### Step 4: Deploy Edge Functions (2 min)

```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login
npx supabase login

# Link to your project (get ref from Settings → API)
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the analyze-dream function
npx supabase functions deploy analyze-dream --no-verify-jwt
```

### Step 5: Test It! (30 sec)

```bash
# Start the app
npm run dev

# Open browser to http://localhost:5173
# Go to Dreams → Add New Dream
# Type: "I was flying over mountains with golden eagles"
# Click Analyze
```

## That's It! ✨

The system will now:
- ✅ Analyze dream text with AI
- ✅ Extract themes, emotions, symbols
- ✅ Generate vivid narratives
- ✅ Provide psychological insights
- ✅ Calculate C/E/N scores
- ✅ Support audio transcription
- ✅ Integrate wearable sleep data
- ✅ Detect facial emotions

## Free Tier Details

Your setup uses **Pollinations Text API** as the default fallback:
- **Cost**: $0.00 (completely free)
- **Limits**: Unlimited
- **Quality**: Good for dream analysis
- **No API key needed**

If you want better quality later, add ONE of these (optional):

```bash
# OpenRouter (free tier, many models)
npx supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxx

# Google Gemini (free tier, excellent quality)
npx supabase secrets set GEMINI_API_KEY=xxx

# HuggingFace (for audio transcription)
npx supabase secrets set HF_INFERENCE_API_KEY=hf_xxx
```

## Troubleshooting

### "Analysis unavailable" or empty results
- Check browser console (F12) for errors
- Verify `.env` has correct Supabase URL/key
- Make sure edge function deployed successfully

### CORS errors
- Use `--no-verify-jwt` flag when deploying
- Check that Supabase URL is correct

### Timeout
- The system has a 15-second timeout by default
- Try again - sometimes first request is slow (cold start)

## What You Get

### Dream Analysis Output:
```json
{
  "category": "adventure",
  "themes": ["flying", "freedom", "nature"],
  "emotion": "liberated",
  "symbols": ["mountains", "eagles", "sky"],
  "narrative": "I soar above majestic mountain peaks...",
  "nugget": "Freedom calls to the part of you that refuses to be grounded",
  "valence": 0.85,
  "interpretation": {
    "symbols": {
      "mountains": "obstacles you've overcome",
      "eagles": "vision and perspective"
    },
    "meaning": "This dream reflects your desire for independence",
    "commonPattern": "Common during life transitions"
  }
}
```

### Supported Inputs:
1. **Text**: Type or paste dream description
2. **Audio**: Record voice → auto-transcribe → analyze
3. **Video**: Extract audio → transcribe → analyze

### Enrichment Features:
- **Wearable Data**: Oura, Fitbit, Garmin sleep stages
- **Facial Emotions**: Camera detects emotions as you write
- **C/E/N Scoring**: Complexity, Emotion, Novelty metrics
- **XP System**: Gamified dream journaling

## Architecture

```
User Input
    ↓
Frontend (React/Vite)
    ↓
Supabase Edge Function (analyze-dream)
    ↓
AI Provider Chain:
  1. Pollinations (FREE, no key) ← Default
  2. OpenRouter (FREE tier)
  3. Gemini (FREE tier)
  4. OpenAI (cheap)
    ↓
Rich Analysis + Insights
```

## Files Modified/Created

- `/workspace/DREAM_ANALYSIS_SETUP.md` - Complete technical guide
- `/workspace/test-dream-analysis.js` - Health check script
- `/workspace/QUICK_START.md` - This file

## Next Steps After Setup

1. ✅ Test with sample dream text
2. ✅ Try audio recording feature
3. ✅ Connect wearable devices (optional)
4. ✅ Enable facial emotion detection
5. ✅ Customize analysis prompt if desired

## Need Help?

1. Run health check: `node /workspace/test-dream-analysis.js`
2. Check Supabase logs: Dashboard → Functions → Logs
3. Review full docs: `/workspace/DREAM_ANALYSIS_SETUP.md`

---

**You're all set!** The code is solid - just needs the Supabase connection. 🎯
