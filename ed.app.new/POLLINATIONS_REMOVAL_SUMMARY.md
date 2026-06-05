# EverDream System - Pollinations Removal Summary

## What Was Changed

### 1. Dream Analysis Edge Function (`supabase/functions/analyze-dream/index.ts`)

**Removed:**
- Pollinations Text API provider (which wasn't truly free - uses credits/usage)

**New Provider Order:**
1. **OpenRouter** (free tier models available) - Requires `OPENROUTER_API_KEY`
2. **Google Gemini 1.5 Flash** (FREE - 60 requests/minute) - Requires `GEMINI_API_KEY`
3. **OpenAI GPT-4o-mini** (cheap - ~$0.15/1M tokens) - Requires `OPENAI_API_KEY`
4. **NVIDIA Nemotron** (open source, cost-effective) - Requires `NVIDIA_API_KEY`

### 2. Image Generation Edge Function (`supabase/functions/generate-image/index.ts`)

**Removed:**
- Pollinations.ai image proxy

**New Provider Order:**
1. **Hugging Face Inference API** (FREE - Stable Diffusion XL) - Requires `HF_INFERENCE_API_KEY`
2. **Fal AI** (cheap - ~$0.001-0.01/image) - Requires `FAL_AI_KEY`

### 3. Master Environment File (`.env`)

Created comprehensive `.env` file with 9 organized sections:
1. Supabase Configuration (REQUIRED)
2. AI Dream Analysis (AT LEAST ONE REQUIRED)
3. Image Generation (AT LEAST ONE REQUIRED)
4. Speech-to-Text / Audio Transcription (OPTIONAL)
5. Wearable Data Integration (OPTIONAL)
6. Discord Bot Integration (OPTIONAL)
7. Email / Notifications (OPTIONAL)
8. Analytics & Monitoring (OPTIONAL)
9. Development & Debug (OPTIONAL)

## Required Environment Variables

### For Dream Analysis to Work:
Set at least ONE of these via `supabase secrets set`:
```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-your-key
# OR
supabase secrets set GEMINI_API_KEY=your-gemini-key
# OR
supabase secrets set OPENAI_API_KEY=sk-your-openai-key
# OR
supabase secrets set NVIDIA_API_KEY=nvapi-your-key
```

### For Image Generation to Work:
Set at least ONE of these via `supabase secrets set`:
```bash
supabase secrets set HF_INFERENCE_API_KEY=hf_your-token
# OR
supabase secrets set FAL_AI_KEY=your-fal-key
```

### For Audio/Video Transcription:
The `transcribe-audio` function already uses Hugging Face Whisper (FREE tier).
Set via `supabase secrets set`:
```bash
supabase secrets set HF_INFERENCE_API_KEY=hf_your-token
```

## Free Tier Options

### Completely Free (No Cost):
- **Google Gemini** - 60 requests/minute free, excellent for dream analysis
- **Hugging Face** - Free tier for image generation and audio transcription
- **OpenRouter** - Has free tier models available

### Very Low Cost:
- **OpenAI GPT-4o-mini** - ~$0.15 per 1M input tokens (~$0.001-0.01 per dream analysis)
- **Fal AI** - ~$0.001-0.01 per image generated

## Deployment Steps

1. **Update your `.env` file** with your Supabase credentials
2. **Deploy edge functions**:
   ```bash
   cd /workspace/ed.app.new/supabase
   ./deploy.sh
   ```
   Or manually:
   ```bash
   supabase functions deploy analyze-dream
   supabase functions deploy generate-image
   supabase functions deploy transcribe-audio
   ```

3. **Set API keys as secrets**:
   ```bash
   supabase secrets set OPENROUTER_API_KEY=your-key
   supabase secrets set GEMINI_API_KEY=your-key
   supabase secrets set HF_INFERENCE_API_KEY=hf_your-token
   ```

4. **Test the system**:
   ```bash
   node test-dream-analysis.js
   ```

## Complete Narrative Features

The dream analysis now provides:
- **Category**: nightmare/lucid/recurring/peaceful/prophetic/anxiety/adventure
- **Themes**: Array of identified themes
- **Emotion**: Primary emotional tone
- **Symbols**: Array of dream symbols with interpretations
- **Narrative**: Expanded 200-word vivid narrative in first person present tense
- **Nugget**: One captivating sentence (15-20 words)
- **Valence**: -1.0 to 1.0 emotional tone score
- **Interpretation**: 
  - Symbol meanings
  - Psychological insight
  - Common patterns

## Audio/Video Support

The system supports:
- **Audio files**: WAV, MP3, OGG, WebM
- **Video files**: MP4, WebM (audio extracted)
- **Speech-to-Text**: Via Hugging Face Whisper (free) or OpenAI Whisper (paid)
- **Emotion Detection**: Analyzed from transcribed text

## Wearable Data Integration

Ready for integration with:
- Fitbit (sleep stages, HRV, resting heart rate)
- Oura Ring (sleep score, readiness, activity)
- Apple HealthKit (sleep analysis, heart rate)
- Google Fit (sleep tracking)
- Withings (sleep monitoring)

## Troubleshooting

If dream analysis still isn't working:

1. **Check Supabase function logs**:
   ```bash
   supabase functions logs analyze-dream
   ```

2. **Verify API keys are set**:
   ```bash
   supabase secrets list
   ```

3. **Test individual providers**:
   - Try setting only one provider key at a time
   - Check provider dashboards for usage/credits

4. **Verify function deployment**:
   ```bash
   supabase functions list
   ```

5. **Check CORS settings** in your Supabase project

## Next Steps

1. Get your FREE API keys:
   - Gemini: https://aistudio.google.com/app/apikey
   - Hugging Face: https://huggingface.co/settings/tokens
   - OpenRouter: https://openrouter.ai/keys (optional, has free models)

2. Deploy the updated functions

3. Test with a sample dream entry

4. The system will automatically fall back through providers if one fails
