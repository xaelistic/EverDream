/**
 * Iterative User Profile Builder
 * 
 * Uses cheap LLM (via edge or direct) to maintain a living user_profile JSONB.
 * Cross-references dreams, sleep data, image preferences, mood etc.
 * Call this after new dream analysis or sleep sync.
 */

import { supabase } from './supabase/client';

export interface UserProfile {
  recurring_themes: string[];
  sleep_patterns: Record<string, any>;
  image_style_prefs: string[];
  emotional_tendencies: string[];
  key_insights: string[];
  last_updated: string;
  version: number;
}

export async function updateUserProfileFromDream(
  userId: string,
  newDreamAnalysis: any,
  sleepContext?: any,
  generatedImage?: any
) {
  const { data: prof } = await supabase
    .from('profiles')
    .select('user_profile')
    .eq('id', userId)
    .single();

  const current: UserProfile = prof?.user_profile || {
    recurring_themes: [],
    sleep_patterns: {},
    image_style_prefs: [],
    emotional_tendencies: [],
    key_insights: [],
    last_updated: new Date().toISOString(),
    version: 0
  };

  // Client-side merge logic (no LLM - to be enhanced in intelligence layer)
  if (newDreamAnalysis.themes && Array.isArray(newDreamAnalysis.themes)) {
    current.recurring_themes = [...new Set([...(current.recurring_themes || []), ...newDreamAnalysis.themes])].slice(0, 20);
  }

  if (typeof newDreamAnalysis.valence === 'number') {
    const tendency = newDreamAnalysis.valence > 0.3 ? 'positive' : newDreamAnalysis.valence < -0.3 ? 'challenging' : 'neutral';
    if (!current.emotional_tendencies.includes(tendency)) {
      current.emotional_tendencies.push(tendency);
    }
    current.emotional_tendencies = current.emotional_tendencies.slice(-5); // keep recent
  }

  if (newDreamAnalysis.narrative) {
    // Simple keyword extraction for insights (no LLM)
    const keywords = (newDreamAnalysis.narrative.toLowerCase().match(/\b(flying|water|dragon|transformation|ocean|night|light|dark)\b/g) || []);
    keywords.forEach((kw: string) => {
      if (!current.recurring_themes.includes(kw)) current.recurring_themes.push(kw);
    });
  }

  if (generatedImage && generatedImage.style) {
    if (!current.image_style_prefs.includes(generatedImage.style)) {
      current.image_style_prefs.push(generatedImage.style);
    }
    current.image_style_prefs = current.image_style_prefs.slice(-10);
  }

  if (sleepContext) {
    current.sleep_patterns = current.sleep_patterns || {};
    if (sleepContext.rem_minutes && sleepContext.rem_minutes > 90) {
      current.sleep_patterns.recent_high_rem = true;
      current.sleep_patterns.last_high_rem_date = new Date().toISOString();
    }
    if (newDreamAnalysis.valence && sleepContext.score) {
      current.sleep_patterns.last_correlation = {
        dream_valence: newDreamAnalysis.valence,
        sleep_score: sleepContext.score,
        timestamp: new Date().toISOString()
      };
    }
  }

  current.last_updated = new Date().toISOString();
  current.version = (current.version || 0) + 1;

  await supabase.from('profiles').update({ user_profile: current }).eq('id', userId);

  console.log('[Profile] Updated iterative profile for user', userId, 'version', current.version);
  return current;
}

export async function updateUserProfileFromSleep(
  userId: string,
  sleepSession: any,
  recentDreams: any[] = []
) {
  const { data: prof } = await supabase
    .from('profiles')
    .select('user_profile')
    .eq('id', userId)
    .single();

  const current: UserProfile = prof?.user_profile || {
    recurring_themes: [],
    sleep_patterns: {},
    image_style_prefs: [],
    emotional_tendencies: [],
    key_insights: [],
    last_updated: new Date().toISOString(),
    version: 0
  };

  current.sleep_patterns = current.sleep_patterns || {};

  if (sleepSession.rem_minutes) {
    current.sleep_patterns.total_rem_tracked = (current.sleep_patterns.total_rem_tracked || 0) + sleepSession.rem_minutes;
  }
  if (sleepSession.score) {
    current.sleep_patterns.last_sleep_score = sleepSession.score;
    current.sleep_patterns.last_sleep_date = sleepSession.sleep_start || new Date().toISOString();
  }

  // Simple correlation if recent dreams provided (no LLM)
  if (recentDreams.length > 0 && sleepSession.score) {
    const avgDreamValence = recentDreams.reduce((sum, d) => sum + (d.valence || 0), 0) / recentDreams.length;
    current.sleep_patterns.sleep_dream_correlation = {
      avg_valence: avgDreamValence,
      sleep_score: sleepSession.score,
      sample_size: recentDreams.length,
      updated: new Date().toISOString()
    };
  }

  current.last_updated = new Date().toISOString();
  current.version = (current.version || 0) + 1;

  await supabase.from('profiles').update({ user_profile: current }).eq('id', userId);
  console.log('[Profile] Updated from sleep for user', userId);
  return current;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data: prof } = await supabase
    .from('profiles')
    .select('user_profile')
    .eq('id', userId)
    .single();

  return prof?.user_profile || {
    recurring_themes: [],
    sleep_patterns: {},
    image_style_prefs: [],
    emotional_tendencies: [],
    key_insights: [],
    last_updated: new Date().toISOString(),
    version: 0
  };
}
