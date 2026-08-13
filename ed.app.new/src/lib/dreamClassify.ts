const CANONICAL_CATEGORIES = [
  'nightmare',
  'lucid',
  'recurring',
  'peaceful',
  'prophetic',
  'anxiety',
  'adventure',
] as const;

export type DreamCategory = (typeof CANONICAL_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, DreamCategory> = {
  nightmare: 'nightmare',
  horror: 'nightmare',
  terror: 'nightmare',
  scary: 'nightmare',
  fear: 'nightmare',
  lucid: 'lucid',
  awareness: 'lucid',
  'lucid dream': 'lucid',
  recurring: 'recurring',
  repeating: 'recurring',
  loop: 'recurring',
  peaceful: 'peaceful',
  calm: 'peaceful',
  serene: 'peaceful',
  healing: 'peaceful',
  joy: 'peaceful',
  positive: 'peaceful',
  prophetic: 'prophetic',
  precognitive: 'prophetic',
  omen: 'prophetic',
  anxiety: 'anxiety',
  anxious: 'anxiety',
  worry: 'anxiety',
  stress: 'anxiety',
  panic: 'anxiety',
  adventure: 'adventure',
  flying: 'adventure',
  chase: 'adventure',
  journey: 'adventure',
  quest: 'adventure',
};

const EMOTION_ALIASES: Record<string, string> = {
  joy: 'joy',
  happy: 'joy',
  happiness: 'joy',
  delight: 'joy',
  positive: 'joy',
  fear: 'fear',
  fearful: 'fear',
  scared: 'fear',
  terrified: 'fear',
  afraid: 'fear',
  sadness: 'sadness',
  sad: 'sadness',
  grief: 'sadness',
  anger: 'anger',
  angry: 'anger',
  rage: 'anger',
  surprise: 'surprise',
  surprised: 'surprise',
  shock: 'surprise',
  neutral: 'neutral',
  calm: 'peace',
  peace: 'peace',
  peaceful: 'peace',
  sleepy: 'peace',
  serene: 'peace',
  excitement: 'excitement',
  excited: 'excitement',
  anxiety: 'anxiety',
  anxious: 'anxiety',
  worried: 'anxiety',
  wonder: 'wonder',
  awe: 'wonder',
  disgusted: 'anger',
  disgust: 'anger',
};

export function normalizeCategory(
  raw?: string | null,
  text = '',
  valence?: number,
): DreamCategory {
  const key = (raw || '').toLowerCase().trim();
  if ((CANONICAL_CATEGORIES as readonly string[]).includes(key)) return key as DreamCategory;
  if (CATEGORY_ALIASES[key]) return CATEGORY_ALIASES[key];

  const blob = text.toLowerCase();
  if (/\b(chase|chased|monster|falling|attack|scream|darkness)\b/.test(blob)) return 'nightmare';
  if (/\b(i knew i was dreaming|lucid|i took control)\b/.test(blob)) return 'lucid';
  if (/\b(again|same dream|every night|recurring)\b/.test(blob)) return 'recurring';
  if (/\b(future|warning|omen|came true)\b/.test(blob)) return 'prophetic';
  if (/\b(late|exam|lost|can't find|missed the|worried)\b/.test(blob)) return 'anxiety';
  if (/\b(flying|ocean|journey|explore|mountain|ran toward)\b/.test(blob)) return 'adventure';
  if (typeof valence === 'number' && valence <= -0.35) return 'anxiety';
  if (typeof valence === 'number' && valence >= 0.35) return 'peaceful';
  if (/\b(calm|peace|garden|light|safe|warm)\b/.test(blob)) return 'peaceful';
  return 'adventure';
}

export function normalizeEmotion(
  raw?: string | null,
  extras?: { face?: string | null; text?: string; valence?: number },
): string {
  const face = extras?.face ? EMOTION_ALIASES[extras.face.toLowerCase()] : undefined;
  if (face && face !== 'neutral') return face;

  const fromModel = EMOTION_ALIASES[(raw || '').toLowerCase().trim()];
  if (fromModel && fromModel !== 'neutral') return fromModel;

  const blob = (extras?.text || '').toLowerCase();
  if (/\b(terrified|afraid|scared|panic)\b/.test(blob)) return 'fear';
  if (/\b(sad|crying|grief|lost someone)\b/.test(blob)) return 'sadness';
  if (/\b(angry|furious|rage)\b/.test(blob)) return 'anger';
  if (/\b(wonder|awe|beautiful|magical)\b/.test(blob)) return 'wonder';
  if (/\b(joy|laugh|delighted|happy)\b/.test(blob)) return 'joy';
  if (/\b(anxious|worried|uneasy)\b/.test(blob)) return 'anxiety';
  if (/\b(calm|peace|safe|gentle)\b/.test(blob)) return 'peace';
  if (typeof extras?.valence === 'number') {
    if (extras.valence <= -0.4) return 'fear';
    if (extras.valence >= 0.4) return 'joy';
  }
  return fromModel || 'wonder';
}

export function deriveDreamTitle(nugget?: string, content?: string): string {
  const fromNugget = (nugget || '').replace(/^["“]+|["”]+$/g, '').trim();
  if (fromNugget && !/^audio journal|^video journal|^processing/i.test(fromNugget)) {
    return fromNugget.length > 72 ? `${fromNugget.slice(0, 69).trim()}…` : fromNugget;
  }
  const source = (content || '').replace(/\s+/g, ' ').trim();
  if (!source) return 'Untitled dream';
  const sentence = source.split(/(?<=[.!?])\s+/)[0] || source;
  const words = sentence.split(' ').slice(0, 10).join(' ');
  return words.length > 72 ? `${words.slice(0, 69).trim()}…` : words;
}

export function formatDreamWhen(iso: string): { primary: string; secondary: string } {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { primary: iso, secondary: '' };

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return { primary: 'Today', secondary: time };
  if (isYesterday) return { primary: 'Yesterday', secondary: time };

  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const day = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return { primary: `${weekday} ${day}`, secondary: time };
}

export function emotionLabel(emotion?: string): string {
  const key = (emotion || '').toLowerCase();
  const labels: Record<string, string> = {
    joy: 'Joy',
    fear: 'Fear',
    sadness: 'Sadness',
    anger: 'Anger',
    surprise: 'Surprise',
    neutral: 'Neutral',
    excitement: 'Excitement',
    peace: 'Calm',
    anxiety: 'Anxiety',
    wonder: 'Wonder',
  };
  return labels[key] || 'Mood';
}

export type DreamPresentation = {
  category: DreamCategory | string;
  emotion: string;
  emotionName: string;
  title: string;
  when: { primary: string; secondary: string };
};

/** Display-time remapping so older uncategorized / video-journal entries still look right. */
export function presentDream(dream: {
  category?: string;
  emotion?: string;
  title?: string;
  nugget?: string;
  content?: string;
  narrative?: string;
  moodValence?: number;
  date?: string;
  processingStatus?: string;
  capturedEmotions?: { dominantEmotion?: string } | null;
}): DreamPresentation {
  const text = [dream.content, dream.narrative, dream.nugget].filter(Boolean).join(' ');
  const processing = dream.processingStatus === 'processing';
  const category = processing
    ? dream.category || 'processing'
    : normalizeCategory(dream.category, text, dream.moodValence);
  const emotion = processing
    ? normalizeEmotion(dream.emotion, {
        face: dream.capturedEmotions?.dominantEmotion,
        text,
        valence: dream.moodValence,
      })
    : normalizeEmotion(dream.emotion, {
        face: dream.capturedEmotions?.dominantEmotion,
        text,
        valence: dream.moodValence,
      });
  return {
    category,
    emotion,
    emotionName: emotionLabel(emotion),
    title: dream.title || deriveDreamTitle(dream.nugget, dream.narrative || dream.content),
    when: formatDreamWhen(dream.date || new Date().toISOString()),
  };
}
