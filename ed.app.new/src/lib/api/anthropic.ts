/**
 * Anthropic API Client
 *
 * Extracted from DreamJournalApp.tsx for cleaner separation.
 * All AI dream analysis goes through here.
 *
 * Environment variable:
 *   VITE_ANTHROPIC_API_KEY=YOUR_KEY
 *
 * NOTE: In production, this should proxy through a backend function
 * to avoid exposing the API key in the client bundle.
 * Supabase Edge Functions is the recommended approach.
 */

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface DreamAnalysis {
  category: string;
  themes: string[];
  emotion: string;
  symbols: string[];
  narrative: string;
  nugget: string;
  interpretation: {
    symbols: Record<string, string>;
    meaning: string;
    commonPattern: string;
  };
}

const FALLBACK_ANALYSIS: DreamAnalysis = {
  category: 'uncategorized',
  themes: ['dream', 'experience'],
  emotion: 'neutral',
  symbols: [],
  narrative: '',
  nugget: '',
  interpretation: {
    symbols: {},
    meaning: 'Analysis unavailable',
    commonPattern: '',
  },
};

export async function analyzeDreamWithAI(text: string): Promise<DreamAnalysis> {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[AI] No API key configured, returning fallback analysis');
    return { ...FALLBACK_ANALYSIS, narrative: text, nugget: text.substring(0, 100) };
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Analyze this dream and provide detailed response in JSON format:
{
  "category": "nightmare/lucid/recurring/peaceful/prophetic/anxiety/adventure",
  "themes": ["theme1", "theme2", "theme3"],
  "emotion": "primary emotional tone",
  "symbols": ["symbol1", "symbol2", "symbol3"],
  "narrative": "expanded 200-word vivid narrative in first person present tense",
  "nugget": "one captivating sentence (15-20 words)",
  "interpretation": {
    "symbols": {
      "symbol1": "what it represents",
      "symbol2": "what it represents"
    },
    "meaning": "psychological insight about what this dream reveals",
    "commonPattern": "when people typically have dreams like this"
  }
}

Dream: ${text}

Respond ONLY with valid JSON, no markdown.`,
        }],
      }),
    });

    if (!response.ok) {
      console.error('[AI] API error:', response.status);
      return FALLBACK_ANALYSIS;
    }

    const data = await response.json();
    const analysisText = data.content?.find((c: any) => c.type === 'text')?.text || '{}';
    const cleanText = analysisText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText) as DreamAnalysis;
  } catch (error) {
    console.error('[AI] Analysis error:', error);
    return FALLBACK_ANALYSIS;
  }
}

/**
 * Generate a dream image prompt from dream text.
 * Returns a prompt suitable for image generation APIs.
 */
export function generateImagePrompt(dreamText: string, style: string = 'dreamlike'): string {
  const styleMap: Record<string, string> = {
    dreamlike: 'surreal, ethereal, soft lighting, dreamlike atmosphere',
    realistic: 'photorealistic, detailed, natural lighting',
    artistic: 'oil painting style, impressionistic, vibrant colors',
    minimal: 'minimalist, clean lines, simple composition',
    cinematic: 'cinematic lighting, dramatic, wide angle, film grain',
  };

  const styleDesc = styleMap[style] || styleMap.dreamlike;
  return `${dreamText.substring(0, 200)}, ${styleDesc}, 4k, high quality`;
}
