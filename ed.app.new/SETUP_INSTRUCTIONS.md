# EverDream Setup Instructions

## Dream Analysis Configuration (OpenRouter owl-alpha)

The dream analysis now uses **OpenRouter's owl-alpha model** as the primary provider. This is a FREE, high-performance model optimized for agentic workloads.

### Step 1: Get Your OpenRouter API Key

1. Go to https://openrouter.ai/keys
2. Sign up or log in
3. Create a new API key
4. Copy the key (starts with `sk-or-`)

### Step 2: Set the Supabase Secret

Run this command in your terminal from the project root:

```bash
cd /workspace/ed.app.new
supabase secrets set OPENROUTER_API_KEY=sk-or-your-actual-key-here
```

### Optional: Add Backup Providers

For redundancy, you can also set these optional backup providers:

```bash
# Google Gemini (FREE tier - 60 req/min)
supabase secrets set GEMINI_API_KEY=your-gemini-key

# OpenAI GPT-4o-mini (optional, ~$0.15/1M tokens)
supabase secrets set OPENAI_API_KEY=your-openai-key

# NVIDIA Nemotron (optional backup)
supabase secrets set NVIDIA_API_KEY=your-nvidia-key
```

Get keys from:
- Gemini: https://aistudio.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys
- NVIDIA: https://build.nvidia.com/explore/discover

## Image Generation Configuration

Image generation uses Hugging Face Inference API (FREE) as the primary provider.

### Step 1: Get Your Hugging Face Token

1. Go to https://huggingface.co/settings/tokens
2. Create a new token with "read" permissions
3. Copy the token

### Step 2: Set the Supabase Secret

```bash
supabase secrets set HF_INFERENCE_API_KEY=your-huggingface-token-here
```

### Optional: Fal AI Backup (cheap, ~$0.001-0.01/image)

```bash
supabase secrets set FAL_AI_KEY=your-fal-ai-key
```

Get from: https://fal.ai/dashboard/keys

## Deploy Edge Functions

After setting secrets, deploy the functions:

```bash
# Deploy analyze-dream function
supabase functions deploy analyze-dream

# Deploy generate-image function  
supabase functions deploy generate-image
```

## Frontend Environment Variables

Create or update your `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing

1. Start your dev server: `npm run dev` or `yarn dev`
2. Add a new dream entry
3. The dream should be analyzed using OpenRouter owl-alpha
4. An image should be generated using Hugging Face

## Troubleshooting

### Check Function Logs

```bash
supabase functions logs analyze-dream
supabase functions logs generate-image
```

### Verify Secrets

```bash
supabase secrets list
```

### Common Issues

1. **"OPENROUTER_API_KEY not set"** - Make sure you ran `supabase secrets set` command
2. **Model loading errors** - Hugging Face free tier may need time to load models, retry after a few seconds
3. **CORS errors** - The edge functions handle CORS automatically, ensure you're calling via Supabase client

## Provider Priority

### Dream Analysis
1. **OpenRouter owl-alpha** (FREE) ← Primary
2. Google Gemini 1.5 Flash (FREE tier)
3. OpenAI GPT-4o-mini (cheap)
4. NVIDIA Nemotron (cost-effective)

### Image Generation
1. **Hugging Face Inference API** (FREE) ← Primary
2. Fal AI (~$0.001-0.01/image)
