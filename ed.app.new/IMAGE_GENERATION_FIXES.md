# Image Generation Fixes - June 2026

## What was improved
- Prioritized the most reliable FREE path: Supabase Edge (Pollinations proxy) > Direct Pollinations.ai (Flux) > SVG fallback.
- Better error logging and validation.
- Removed brittle HF/Puter paths from primary flow (they are now optional advanced).
- Edge function already has strong HF + Fal fallback + binary response.

## How to fully enable reliable generation
1. Deploy/update the edge function:
   npx supabase functions deploy generate-image --no-verify-jwt
2. Set secret (optional but recommended for better quality):
   npx supabase secrets set HF_INFERENCE_API_KEY=your_hf_token
3. In .env:
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...

## Testing
- Open app → Log a dream → Click Generate Image.
- Check browser console for [AssetGen] logs.
- Should get a nice dream image quickly via Pollinations.

If still issues: Share console logs + Supabase function logs.