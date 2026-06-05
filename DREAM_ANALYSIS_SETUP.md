# Dream Analysis System - Complete Setup Guide

## Problem Summary

The dream analysis feature requires:
1. **Supabase project** with edge functions deployed
2. **API keys** configured as Supabase secrets
3. **Environment variables** set in the frontend

Without these, the system returns fallback (empty) analysis.

## Architecture Overview

Your system already has the correct architecture:

```
User Input (Text/Audio/Video)
    ↓
Frontend (dream-analyzer.ts / ai-provider.ts)
    ↓
Supabase Edge Function (analyze-dream)
    ↓
AI Provider Fallback Chain:
  1. OpenRouter (owl-alpha) - FREE tier
  2. Pollinations Text API - FREE, unlimited
  3. Google Gemini 1.5 Flash - FREE tier
  4. OpenAI GPT-4o-mini - Cheap (~$0.001/request)
  5. NVIDIA Nemotron - Cost-effective
    ↓
Returns: { category, themes, emotion, symbols, narrative, nugget, valence, interpretation }
```

## Quick Start - Get It Working NOW

### Option A: Use Free Tier Only (Recommended for Testing)

The `analyze-dream` edge function already supports **Pollinations Text API** which is:
- ✅ Completely FREE
- ✅ No API key required
- ✅ Unlimited requests

**The code already has this!** Just need to ensure the edge function is deployed.

### Option B: Full Setup with Multiple Providers

#### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create a new project (free tier is fine)
3. Copy your project URL and anon key

#### Step 2: Deploy Edge Functions

```bash
cd /workspace/ed.app.new

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy all edge functions
npx supabase functions deploy analyze-dream --no-verify-jwt
npx supabase functions deploy transcribe-audio --no-verify-jwt
npx supabase functions deploy generate-image --no-verify-jwt
```

#### Step 3: Set API Secrets (Optional but Recommended)

```bash
# OpenRouter (FREE tier available) - get key at https://openrouter.ai
npx supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Google Gemini (FREE tier) - get key at https://aistudio.google.com
npx supabase secrets set GEMINI_API_KEY=xxxxx

# HuggingFace (for transcription) - get key at https://huggingface.co
npx supabase secrets set HF_INFERENCE_API_KEY=hf_xxxxx

# Optional: OpenAI (cheap fallback)
npx supabase secrets set OPENAI_API_KEY=sk-xxxxx

# Optional: NVIDIA (cost-effective)
npx supabase secrets set NVIDIA_API_KEY=nvapi-xxxxx
```

#### Step 4: Configure Frontend Environment

Create `/workspace/ed.app.new/.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

#### Step 5: Run Database Migrations

```bash
npx supabase db push
```

Or run the SQL manually in Supabase Studio.

## How The Analysis Works

### Input Support

The system already supports:

1. **Text Input**: Direct dream journal entry
2. **Audio Input**: Speech-to-text via Whisper
   - Web Speech API (browser-based, free)
   - Whisper Large V3 via HuggingFace (better quality)
3. **Video Input**: Extract audio → transcribe → analyze

### Analysis Output

```typescript
interface DreamAnalysis {
  category: "nightmare" | "lucid" | "recurring" | "peaceful" | "prophetic" | "anxiety" | "adventure";
  themes: string[];           // ["flying", "water", "freedom"]
  emotion: string;            // "excited"
  symbols: string[];          // ["ocean", "bird", "sunrise"]
  narrative: string;          // Expanded 200-word vivid retelling
  nugget: string;             // One captivating sentence
  valence: number;            // -1.0 to 1.0 (negative to positive)
  interpretation: {
    symbols: Record<string, string>;  // {"ocean": "emotional depth"}
    meaning: string;                  // Psychological insight
    commonPattern: string;            // When people have this dream
  };
}
```

### C/E/N Metrics (Complexity/Emotion/Novelty)

Calculated in `dreamAnalysis.ts`:
- **Complexity**: Token diversity, named entities, theme count
- **Emotion**: Valence × arousal × facial alignment
- **Novelty**: Rare themes, unique tokens

## Wearable Data Integration

Already implemented in `wearables.ts`:
- Oura Ring (priority: 95)
- Garmin Connect (priority: 88)
- Fitbit (priority: 80)

Sleep data enriches the analysis:
- REM sleep → increases clarity score
- Deep sleep → improves memory consolidation
- Sleep stages → affect XP scoring

## Facial Emotion Detection

Already implemented in `FacialEmotionDetector.tsx`:
- Real-time emotion capture during dream entry
- Aligns text emotions with facial expressions
- Increases confidence score

## Testing The System

### Test Edge Function Directly

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/analyze-dream \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{"text": "I was flying over a vast ocean with colorful birds"}'
```

Expected response:
```json
{
  "analysis": {
    "category": "adventure",
    "themes": ["flying", "ocean", "freedom"],
    "emotion": "liberated",
    "symbols": ["ocean", "birds"],
    "narrative": "...",
    "nugget": "...",
    "valence": 0.8,
    "interpretation": {...}
  },
  "provider": "pollinations",
  "model": "text"
}
```

### Test In App

1. Start dev server: `npm run dev`
2. Navigate to Dreams → Add New Dream
3. Enter text: "I was flying over mountains"
4. Click "Analyze" button
5. Check browser console for logs

## Troubleshooting

### Issue: Returns fallback analysis

**Check:**
1. Is Supabase URL/key set in `.env`?
2. Are edge functions deployed?
3. Check browser console for errors
4. Check Supabase function logs

### Issue: CORS errors

**Fix:** Edge functions already have CORS headers. Make sure you're using:
```typescript
supabase.functions.invoke('analyze-dream', { body: { text } })
```

### Issue: Timeout

**Fix:** Increase timeout in `dream-analyzer.ts`:
```typescript
const ANALYSIS_TIMEOUT_MS = 30000; // 30 seconds
```

### Issue: All providers fail

**Solution:** The code already handles this with fallback. To improve:
1. Add more free providers to the chain
2. Use Pollinations (already included, no key needed)
3. Check network connectivity

## Enhanced Narrative Generation

The current prompt generates:
- Category classification
- Theme extraction
- Emotion detection
- Symbol interpretation
- Expanded narrative (200 words)
- One-sentence nugget
- Psychological meaning

To make it MORE chat-like and conversational, modify the prompt in `analyze-dream/index.ts`:

```typescript
const ANALYSIS_PROMPT = `You are a compassionate dream interpreter having a conversation with someone about their dream.

Analyze this dream and respond in a warm, insightful way:

Dream: {DREAM_TEXT}

Provide your response as JSON:
{
  "category": "...",
  "themes": [...],
  "emotion": "...",
  "symbols": [...],
  "narrative": "Tell the story of this dream in vivid, present-tense first person, like you're experiencing it now...",
  "nugget": "One profound insight about this dream",
  "valence": -1.0 to 1.0,
  "interpretation": {
    "symbols": {...},
    "meaning": "What this dream might reveal about the dreamer's inner world...",
    "commonPattern": "This type of dream often occurs when..."
  }
}

Respond ONLY with valid JSON.`;
```

## Next Steps

1. **Deploy edge functions** (5 minutes)
2. **Set at least one API key** (OpenRouter free tier recommended)
3. **Test with sample dream text**
4. **Add wearable integration** if you have devices
5. **Enable facial emotion detection** in DreamEntryForm

## Files Reference

- `/src/lib/dream-analyzer.ts` - Client-side analyzer
- `/src/lib/api/ai-provider.ts` - AI provider with rate limiting
- `/src/lib/dreamPipeline.ts` - Complete pipeline (audio → text → analysis → image)
- `/supabase/functions/analyze-dream/index.ts` - Edge function
- `/src/utils/dreamAnalysis.ts` - C/E/N metric calculation
- `/src/lib/wearables.ts` - Wearable data integration
- `/src/components/face/FacialEmotionDetector.tsx` - Facial analysis

## Support

If issues persist:
1. Check Supabase dashboard → Functions → Logs
2. Enable debug logging in browser console
3. Test edge function directly with curl
4. Verify API keys are active
