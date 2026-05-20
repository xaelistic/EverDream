#!/bin/bash
# ============================================================
# EverDream — Backend Deployment Script
# Run this after setting up your Supabase project
# ============================================================

set -e

echo "🌙 EverDream Backend Deployment"
echo "================================"

# Check prerequisites
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI not installed. Run: npm install -g supabase"; exit 1; }
command -v deno >/dev/null 2>&1 || { echo "❌ Deno not installed. Run: curl -fsSL https://deno.land/install.sh | sh"; exit 1; }

# Step 1: Link to Supabase project
echo ""
echo "📡 Step 1: Linking to Supabase project..."
echo "   You need your Supabase project reference ID."
echo "   Find it at: https://supabase.com/dashboard/project/_/settings/general"
read -p "   Enter project ref: " PROJECT_REF
supabase link --project-ref "$PROJECT_REF"

# Step 2: Run database migrations
echo ""
echo "🗄️  Step 2: Running database migrations..."
supabase db push

# Step 3: Deploy Edge Functions
echo ""
echo "⚡ Step 3: Deploying Edge Functions..."

echo "   Deploying analyze-dream..."
supabase functions deploy analyze-dream

echo "   Deploying generate-image..."
supabase functions deploy generate-image

echo "   Deploying transcribe-audio..."
supabase functions deploy transcribe-audio

# Step 4: Set secrets
echo ""
echo "🔐 Step 4: Setting Edge Function secrets..."
echo "   The following secrets are needed:"
echo "   - OPENROUTER_API_KEY (required for dream analysis)"
echo "   - HF_INFERENCE_API_KEY (optional, for Whisper transcription)"
echo "   - GEMINI_API_KEY (optional, for Gemini fallback)"
echo "   - OPENAI_API_KEY (optional, for OpenAI fallback)"
echo "   - ANTHROPIC_API_KEY (optional, for Claude fallback)"
echo ""

read -p "   Enter OPENROUTER_API_KEY (or press Enter to skip): " OPENROUTER_KEY
if [ -n "$OPENROUTER_KEY" ]; then
  supabase secrets set OPENROUTER_API_KEY="$OPENROUTER_KEY"
  echo "   ✅ OPENROUTER_API_KEY set"
fi

read -p "   Enter HF_INFERENCE_API_KEY (or press Enter to skip): " HF_KEY
if [ -n "$HF_KEY" ]; then
  supabase secrets set HF_INFERENCE_API_KEY="$HF_KEY"
  echo "   ✅ HF_INFERENCE_API_KEY set"
fi

read -p "   Enter GEMINI_API_KEY (or press Enter to skip): " GEMINI_KEY
if [ -n "$GEMINI_KEY" ]; then
  supabase secrets set GEMINI_API_KEY="$GEMINI_KEY"
  echo "   ✅ GEMINI_API_KEY set"
fi

read -p "   Enter OPENAI_API_KEY (or press Enter to skip): " OPENAI_KEY
if [ -n "$OPENAI_KEY" ]; then
  supabase secrets set OPENAI_API_KEY="$OPENAI_KEY"
  echo "   ✅ OPENAI_API_KEY set"
fi

read -p "   Enter ANTHROPIC_API_KEY (or press Enter to skip): " ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
  supabase secrets set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
  echo "   ✅ ANTHROPIC_API_KEY set"
fi

# Step 5: Verify deployment
echo ""
echo "✅ Step 5: Verifying deployment..."
echo "   Testing analyze-dream function..."
curl -s -o /dev/null -w "   HTTP %{http_code}" \
  "$(supabase status | grep 'API URL' | awk '{print $3}')/functions/v1/analyze-dream" \
  -X POST -H "Content-Type: application/json" \
  -d '{"text":"test"}' || true
echo ""

echo ""
echo "🌙 Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Update .env with your Supabase URL and anon key"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:5173"
echo ""
echo "To test the pipeline:"
echo "  curl -X POST \$(supabase status | grep 'API URL' | awk '{print \$3}')/functions/v1/analyze-dream \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"text\":\"I was flying over a vast ocean at sunset...\"}'"
