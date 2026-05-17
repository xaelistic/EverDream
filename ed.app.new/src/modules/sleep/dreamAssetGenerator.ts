import { DreamAsset } from './types';

// Pollinations.ai - completely free, no auth needed
const POLLINATIONS_API_URL = 'https://image.pollinations.ai/prompt';

// HuggingFace Inference API (free tier, no auth for public models)
const HF_API_URL = 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0';

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildDreamPrompt(dreamText: string) {
  const trimmed = dreamText.trim();
  const seed = trimmed.length > 0 ? trimmed : 'a surreal dreamscape filled with stars';
  return `${seed}, dreamlike, ethereal, surreal, cinematic lighting, fantasy, digital art, highly detailed`;
}

/**
 * Generate image using Pollinations.ai - completely free, no API key needed
 */
async function generateWithPollinations(prompt: string): Promise<DreamAsset> {
  const enhancedPrompt = buildDreamPrompt(prompt);
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  const imageUrl = `${POLLINATIONS_API_URL}/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now() % 1000000}`;

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'pollinations',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'pollinations.ai',
      model: 'flux',
      note: 'Free unlimited generation',
    },
  };
}

/**
 * Generate image using HuggingFace Inference API (free, no auth for public models)
 */
async function generateWithHuggingFace(prompt: string): Promise<DreamAsset> {
  const enhancedPrompt = buildDreamPrompt(prompt);

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: enhancedPrompt,
      parameters: {
        negative_prompt: 'blurry, low quality, distorted, ugly',
        num_inference_steps: 20,
        guidance_scale: 7.5,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HuggingFace API failed: ${response.status}`);
  }

  const blob = await response.blob();
  const imageUrl = URL.createObjectURL(blob);

  return {
    id: makeId(),
    prompt: enhancedPrompt,
    url: imageUrl,
    source: 'replicate',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'huggingface.co',
      model: 'stabilityai/stable-diffusion-xl-base-1.0',
      note: 'Free generation via Inference API',
    },
  };
}

/**
 * Generate a fallback image using Unsplash
 */
async function generateFallbackImage(prompt: string): Promise<DreamAsset> {
  const query = encodeURIComponent(
    prompt
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .slice(0, 6)
      .join(',') || 'dreamscape'
  );

  const imageUrl = `https://source.unsplash.com/800x600/?${query},dream,ethereal`;

  return {
    id: makeId(),
    prompt,
    url: imageUrl,
    source: 'fallback',
    style: 'dreamlike',
    generatedAt: new Date().toISOString(),
    metadata: {
      provider: 'unsplash-fallback',
    },
  };
}

/**
 * Main image generation function - tries free providers in order
 */
export async function generateDreamImage(dreamText: string): Promise<DreamAsset> {
  // Try Pollinations first (always available, no auth)
  try {
    console.log('Generating image with Pollinations.ai...');
    return await generateWithPollinations(dreamText);
  } catch (error) {
    console.warn('Pollinations failed:', error);
  }

  // Try HuggingFace as second option
  try {
    console.log('Generating image with HuggingFace...');
    return await generateWithHuggingFace(dreamText);
  } catch (error) {
    console.warn('HuggingFace failed:', error);
  }

  // Fallback to Unsplash
  console.log('Using Unsplash fallback...');
  return generateFallbackImage(dreamText);
}

/**
 * Generate multiple dream assets
 */
export async function generateDreamAssets(dreamText: string, count = 2): Promise<DreamAsset[]> {
  const assets: DreamAsset[] = [];
  const errors: string[] = [];

  // Try to generate with different providers for variety
  const generators = [
    () => generateWithPollinations(dreamText),
    () => generateFallbackImage(dreamText),
  ];

  for (const generator of generators) {
    if (assets.length >= count) break;
    try {
      const asset = await generator();
      assets.push(asset);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      console.warn('Dream asset provider skipped:', message);
    }
  }

  // If everything failed, return at least a fallback
  if (assets.length === 0) {
    assets.push(await generateFallbackImage(dreamText));
  }

  return assets.slice(0, count);
}
