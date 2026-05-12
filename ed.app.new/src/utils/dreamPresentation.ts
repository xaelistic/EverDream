export function getCategoryBadgeClass(category: string): string {
  const colors: Record<string, string> = {
    nightmare: 'bg-rose-50 text-rose-900 border border-rose-200/90',
    lucid: 'bg-violet-50 text-violet-900 border border-violet-200/90',
    recurring: 'bg-sky-50 text-sky-900 border border-sky-200/90',
    peaceful: 'bg-emerald-50 text-emerald-900 border border-emerald-200/90',
    prophetic: 'bg-amber-50 text-amber-900 border border-amber-200/90',
    anxiety: 'bg-orange-50 text-orange-900 border border-orange-200/90',
    adventure: 'bg-teal-50 text-teal-900 border border-teal-200/90',
    uncategorized: 'bg-stone-100 text-stone-700 border border-stone-200/90',
  };
  return colors[category] || colors.uncategorized;
}

export function getEmotionEmoji(emotion: string | undefined): string {
  const emojis: Record<string, string> = {
    joy: '😊',
    fear: '😰',
    sadness: '😢',
    anger: '😠',
    surprise: '😲',
    neutral: '😐',
    excitement: '🤩',
    peace: '😌',
    anxiety: '😟',
    wonder: '✨',
  };
  return emojis[emotion?.toLowerCase() ?? ''] || '💭';
}
