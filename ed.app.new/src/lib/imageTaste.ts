/**
 * Visual taste learning for dream images.
 *
 * Goal: give each user images they actually like, using the cheapest
 * OpenRouter model. We learn *how* they like dreams depicted (style,
 * palette, mood) — not by stuffing every past dream motif into the next
 * picture.
 *
 * Signals (strong → weak):
 *   like / dislike     explicit
 *   mint               they claimed it
 *   share / download   they wanted it outside the app
 *   regenerate         previous image was not good enough
 *
 * Auto-generating an image on journal save is NOT a like.
 */

export const CHEAPEST_OPENROUTER_IMAGE_MODEL = 'black-forest-labs/flux.2-klein-4b';

export type TasteSignal =
  | 'like'
  | 'dislike'
  | 'share'
  | 'mint'
  | 'download'
  | 'regenerate';

export interface TasteContext {
  prompt?: string;
  style?: string;
  themes?: string[];
  emotion?: string;
  dreamId?: string;
  source?: string;
  model?: string;
}

export interface TasteEvent {
  signal: TasteSignal;
  at: string;
  dreamId?: string;
  traits: string[];
  motifs: string[];
  palettes: string[];
}

export interface ImageTaste {
  traits: Record<string, number>;
  motifs: Record<string, number>;
  palettes: Record<string, number>;
  events: TasteEvent[];
  last_updated: string;
}

export interface PsychographicHints {
  interests?: string[];
  dreamGoals?: string[];
  emotionalTendencies?: string[];
}

export interface ExtractedVisuals {
  traits: string[];
  motifs: string[];
  palettes: string[];
}

const STORAGE_KEY = 'everdream-image-taste';
const MAX_EVENTS = 80;
const TASTE_MARKER = 'visual taste:';

const SIGNAL_WEIGHTS: Record<TasteSignal, number> = {
  like: 3,
  dislike: -3,
  mint: 4,
  share: 2,
  download: 1.5,
  regenerate: -1.5,
};

const TRAIT_LEXICON: Record<string, string[]> = {
  ethereal: ['ethereal', 'soft lighting', 'mist', 'haze', 'glowing', 'luminous', 'airy'],
  surreal: ['surreal', 'impossible', 'melting', 'dreamlike', 'uncanny'],
  cinematic: ['cinematic', 'wide angle', 'film grain', 'dramatic lighting', 'anamorphic'],
  painterly: ['oil painting', 'impressionist', 'watercolor', 'painterly', 'brush'],
  photoreal: ['photorealistic', 'photograph', 'natural lighting', 'dslr'],
  dark: ['noir', 'dark', 'shadow', 'ominous', 'nightmare', 'gothic'],
  neon: ['neon', 'cyber', 'synthwave', 'magenta', 'electric'],
  minimal: ['minimal', 'minimalist', 'clean lines', 'sparse'],
  sacred: ['sacred', 'temple', 'ritual', 'holy', 'altar', 'mandala'],
  vibrant: ['vibrant', 'saturated', 'vivid', 'bold color'],
  peaceful: ['peaceful', 'calm', 'serene', 'quiet', 'still'],
  symbolic: ['symbolic', 'archetypal', 'mythic', 'allegorical'],
};

const PALETTE_LEXICON: Record<string, string[]> = {
  'moonlit-blue': ['moon', 'moonlit', 'silver', 'indigo', 'navy', 'starlight'],
  'golden-hour': ['gold', 'golden', 'sunset', 'amber', 'warm light'],
  bioluminescent: ['bioluminescent', 'lantern', 'firefly', 'glow-worm', 'phosphorescent'],
  pastel: ['pastel', 'blush', 'lavender', 'soft pink', 'mint'],
  monochrome: ['monochrome', 'black and white', 'greyscale', 'graphite'],
  'cool-teal': ['teal', 'aqua', 'cyan', 'turquoise'],
  'warm-earth': ['ochre', 'terracotta', 'umber', 'earth', 'rust'],
};

const MOTIF_LEXICON: Record<string, string[]> = {
  flying: ['flying', 'soar', 'wings', 'flight'],
  water: ['ocean', 'river', 'water', 'sea', 'lake', 'rain'],
  forest: ['forest', 'trees', 'woods', 'garden'],
  city: ['city', 'street', 'building', 'skyline'],
  animals: ['animal', 'wolf', 'bird', 'cat', 'horse', 'dolphin'],
  portals: ['door', 'portal', 'gate', 'threshold', 'mirror'],
  light: ['light', 'sun', 'star', 'lantern', 'glow'],
  transformation: ['transform', 'metamorph', 'becoming', 'shed'],
};

const INTEREST_TO_TRAITS: Record<string, string[]> = {
  art: ['painterly', 'vibrant'],
  psychology: ['symbolic'],
  meditation: ['ethereal', 'peaceful', 'sacred'],
  'lucid dreaming': ['surreal', 'vibrant'],
  spirituality: ['sacred', 'ethereal'],
  nature: ['peaceful'],
  music: ['cinematic'],
  photography: ['cinematic', 'photoreal'],
  film: ['cinematic'],
};

const GOAL_TO_TRAITS: Record<string, string[]> = {
  'better sleep': ['peaceful', 'moonlit-blue'],
  'creative inspiration': ['surreal', 'vibrant'],
  'self-discovery': ['symbolic', 'ethereal'],
  'lucid dreaming': ['surreal', 'vibrant'],
  'anxiety relief': ['peaceful', 'pastel'],
};

function normalize(text: string): string {
  return text.toLowerCase();
}

function matchesLexicon(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

export function extractVisuals(context: TasteContext): ExtractedVisuals {
  const haystack = normalize(
    [context.prompt, context.style, ...(context.themes || []), context.emotion]
      .filter(Boolean)
      .join(' '),
  );

  const pick = (lexicon: Record<string, string[]>) =>
    Object.entries(lexicon)
      .filter(([, keywords]) => matchesLexicon(haystack, keywords))
      .map(([key]) => key);

  const traits = pick(TRAIT_LEXICON);
  const styleKey = context.style?.split(':')[0];
  if (styleKey && TRAIT_LEXICON[styleKey]) {
    traits.unshift(styleKey);
  }

  const recipe = recipeFromStyle(context.style);
  if (recipe) {
    traits.push(...recipe.traits);
  }

  return {
    traits: unique(traits),
    motifs: unique(pick(MOTIF_LEXICON)),
    palettes: unique(pick(PALETTE_LEXICON)),
  };
}

export function emptyTaste(): ImageTaste {
  return {
    traits: {},
    motifs: {},
    palettes: {},
    events: [],
    last_updated: new Date().toISOString(),
  };
}

export function loadLocalTaste(): ImageTaste {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyTaste();
    const parsed = JSON.parse(raw) as ImageTaste;
    return {
      ...emptyTaste(),
      ...parsed,
      traits: parsed.traits || {},
      motifs: parsed.motifs || {},
      palettes: parsed.palettes || {},
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return emptyTaste();
  }
}

export function saveLocalTaste(taste: ImageTaste): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taste));
  } catch (err) {
    console.warn('[ImageTaste] local save failed', err);
  }
}

function bump(map: Record<string, number>, keys: string[], delta: number) {
  for (const key of keys) {
    map[key] = Math.round(((map[key] || 0) + delta) * 10) / 10;
  }
}

export function applySignal(taste: ImageTaste, signal: TasteSignal, context: TasteContext): ImageTaste {
  const extracted = extractVisuals(context);
  const weight = SIGNAL_WEIGHTS[signal];
  const next: ImageTaste = {
    traits: { ...taste.traits },
    motifs: { ...taste.motifs },
    palettes: { ...taste.palettes },
    events: [...taste.events],
    last_updated: new Date().toISOString(),
  };

  bump(next.traits, extracted.traits, weight);
  bump(next.motifs, extracted.motifs, weight * 0.6);
  bump(next.palettes, extracted.palettes, weight);

  next.events.push({
    signal,
    at: next.last_updated,
    dreamId: context.dreamId,
    traits: extracted.traits,
    motifs: extracted.motifs,
    palettes: extracted.palettes,
  });
  if (next.events.length > MAX_EVENTS) {
    next.events = next.events.slice(-MAX_EVENTS);
  }

  return next;
}

export function recordTasteSignal(signal: TasteSignal, context: TasteContext): ImageTaste {
  const extracted = extractVisuals(context);
  const updated = applySignal(loadLocalTaste(), signal, context);
  saveLocalTaste(updated);
  console.log(
    `[ImageTaste] ${signal} traits=${extracted.traits.join(',') || 'none'}`,
  );
  return updated;
}

function topPositive(scores: Record<string, number>, min: number, limit: number): string[] {
  return Object.entries(scores)
    .filter(([, score]) => score >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function topNegative(scores: Record<string, number>, max: number, limit: number): string[] {
  return Object.entries(scores)
    .filter(([, score]) => score <= max)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([key]) => key);
}

export function psychographicStyleHints(hints: PsychographicHints | null | undefined): string[] {
  if (!hints) return [];
  const out: string[] = [];
  for (const interest of hints.interests || []) {
    const mapped = INTEREST_TO_TRAITS[interest.toLowerCase()];
    if (mapped) out.push(...mapped);
  }
  for (const goal of hints.dreamGoals || []) {
    const mapped = GOAL_TO_TRAITS[goal.toLowerCase()];
    if (mapped) out.push(...mapped);
  }
  return unique(out);
}

export function tasteConfidence(taste: ImageTaste): number {
  const explicit = taste.events.filter((e) => e.signal === 'like' || e.signal === 'dislike').length;
  const implicit = taste.events.length - explicit;
  return Math.min(1, explicit * 0.18 + implicit * 0.06);
}

export function summarizeTaste(taste: ImageTaste): {
  likes: string[];
  avoids: string[];
  palettes: string[];
  motifs: string[];
  confidence: number;
} {
  return {
    likes: topPositive(taste.traits, 2, 4),
    avoids: topNegative(taste.traits, -2, 3),
    palettes: topPositive(taste.palettes, 1.5, 2),
    motifs: topPositive(taste.motifs, 2.5, 2),
    confidence: tasteConfidence(taste),
  };
}

/**
 * Build a short visual-direction suffix. Content of *this* dream stays
 * in the base prompt; we only steer look-and-feel.
 */
export function buildTastePromptSuffix(
  taste: ImageTaste,
  psychographics?: PsychographicHints | null,
): string {
  const summary = summarizeTaste(taste);
  const parts: string[] = [];

  const likeTraits = summary.likes.length
    ? summary.likes
    : psychographicStyleHints(psychographics).slice(0, 2);

  if (likeTraits.length) {
    parts.push(`favor ${likeTraits.join(', ')} rendering`);
  }
  if (summary.palettes.length) {
    parts.push(`${summary.palettes.join(' and ')} color palette`);
  }
  if (summary.avoids.length) {
    parts.push(`avoid ${summary.avoids.join(', ')}`);
  }
  // Only reuse motifs they *liked in images*, not every dream theme.
  if (summary.motifs.length && summary.confidence >= 0.35) {
    parts.push(`subtle echo of ${summary.motifs.join(' and ')} if it fits`);
  }

  if (!parts.length) return '';
  return `${TASTE_MARKER} ${parts.join('; ')}`;
}

export function applyTasteToPrompt(
  basePrompt: string,
  taste?: ImageTaste | null,
  psychographics?: PsychographicHints | null,
): string {
  const trimmed = basePrompt.trim();
  if (trimmed.toLowerCase().includes(TASTE_MARKER)) return trimmed;

  const suffix = buildTastePromptSuffix(taste || loadLocalTaste(), psychographics);
  if (!suffix) return trimmed;
  return `${trimmed}, ${suffix}`;
}

export function getLastSignalForDream(dreamId: string): TasteSignal | null {
  const events = loadLocalTaste().events;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].dreamId === dreamId && (events[i].signal === 'like' || events[i].signal === 'dislike')) {
      return events[i].signal;
    }
  }
  return null;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export interface ImageRecipe {
  id: string;
  style: string;
  fragment: string;
  traits: string[];
}

/** Distinct looks — one is chosen per generation so nights do not clone each other. */
export const IMAGE_RECIPES: ImageRecipe[] = [
  { id: 'ethereal-mist', style: 'dreamlike', traits: ['ethereal', 'peaceful'], fragment: 'soft mist, pearl haze, gentle bloom, weightless atmosphere' },
  { id: 'oil-nocturne', style: 'artistic', traits: ['painterly', 'dark'], fragment: 'oil nocturne, visible brushwork, deep umber and indigo glazes' },
  { id: 'moonlit-film', style: 'cinematic', traits: ['cinematic', 'ethereal'], fragment: 'anamorphic moonlight, film grain, wide still, quiet cinema' },
  { id: 'ukiyo-night', style: 'artistic', traits: ['painterly', 'symbolic'], fragment: 'ukiyo-e night scene, flattened perspective, woodblock grain, silver clouds' },
  { id: 'gilded-icon', style: 'dreamlike', traits: ['sacred', 'symbolic'], fragment: 'illuminated manuscript gold leaf, sacred geometry, icon-like stillness' },
  { id: 'analog-photo', style: 'realistic', traits: ['photoreal', 'cinematic'], fragment: 'shot on 50mm film, natural grain, available light, lived-in realism' },
  { id: 'pastel-liminal', style: 'minimal', traits: ['minimal', 'peaceful'], fragment: 'liminal pastel space, sparse composition, hush, empty architecture' },
  { id: 'neon-threshold', style: 'cinematic', traits: ['neon', 'surreal'], fragment: 'wet neon reflections, magenta-teal rim light, night-city threshold' },
  { id: 'watercolor-dawn', style: 'artistic', traits: ['painterly', 'peaceful'], fragment: 'watercolor wash at dawn, bleeding pigments, soft paper tooth' },
  { id: 'charcoal-myth', style: 'artistic', traits: ['symbolic', 'dark'], fragment: 'charcoal myth drawing, smudged graphite, archetypal silhouette' },
  { id: 'glass-garden', style: 'dreamlike', traits: ['ethereal', 'vibrant'], fragment: 'blown-glass flora, translucent petals, caustic light on water' },
  { id: 'ember-altar', style: 'cinematic', traits: ['sacred', 'dark'], fragment: 'ember glow on stone, ritual still, warm dark, slow firelight' },
  { id: 'ink-scroll', style: 'artistic', traits: ['painterly', 'minimal'], fragment: 'sumi-e ink wash, spare brush, large unpainted paper' },
  { id: 'frost-window', style: 'dreamlike', traits: ['ethereal', 'peaceful'], fragment: 'frosted glass, winter window light, pale bloom, hush' },
  { id: 'stained-glass', style: 'artistic', traits: ['sacred', 'vibrant'], fragment: 'stained glass colour fields, lead lines, chapel dusk' },
  { id: 'polaroid-night', style: 'realistic', traits: ['photoreal', 'cinematic'], fragment: 'instant film night photo, soft flash, lived-in grain' },
];

export function recipeFromStyle(style?: string): ImageRecipe | undefined {
  if (!style) return undefined;
  const id = style.includes(':') ? style.slice(style.indexOf(':') + 1) : style;
  return IMAGE_RECIPES.find((r) => r.id === id);
}

const RECENT_RECIPES_KEY = 'everdream-image-recipes-recent';

function loadRecentRecipeIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_RECIPES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecentRecipeId(id: string) {
  const next = [id, ...loadRecentRecipeIds().filter((x) => x !== id)].slice(0, 4);
  try {
    localStorage.setItem(RECENT_RECIPES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/** Weighted pick: likes pull, dislikes push, recent recipes are almost never repeated. */
export function pickImageRecipe(taste?: ImageTaste | null): ImageRecipe {
  const summary = summarizeTaste(taste || loadLocalTaste());
  const recent = loadRecentRecipeIds();
  const scored = IMAGE_RECIPES.map((recipe) => {
    let score = 0.8 + Math.random();
    if (recent.includes(recipe.id)) score *= 0.12;
    if (summary.likes.some((like) => recipe.traits.includes(like))) score *= 2.4;
    if (summary.avoids.some((avoid) => recipe.traits.includes(avoid))) score *= 0.2;
    if (summary.palettes.some((p) => recipe.fragment.includes(p.split('-')[0]))) score *= 1.3;
    return { recipe, score };
  });
  const total = scored.reduce((sum, row) => sum + row.score, 0);
  let dart = Math.random() * total;
  for (const row of scored) {
    dart -= row.score;
    if (dart <= 0) {
      saveRecentRecipeId(row.recipe.id);
      return row.recipe;
    }
  }
  const fallback = scored[0].recipe;
  saveRecentRecipeId(fallback.id);
  return fallback;
}

