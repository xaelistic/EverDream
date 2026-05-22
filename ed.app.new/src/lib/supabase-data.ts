import { supabase } from './supabase';

export interface DreamData {
  content: string;
  category?: string;
  themes?: string[];
  emotion?: string;
  symbols?: string[];
  narrative?: string;
  nugget?: string;
  interpretation?: Record<string, unknown>;
  sleep_data?: Record<string, unknown> | null;
  generated_image?: Record<string, unknown> | null;
  watermark?: Record<string, unknown> | null;
  asset_metadata?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
}

/**
 * Save a dream to Supabase
 */
export async function saveDream(dream: DreamData): Promise<{ id: string; error?: Error }> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { id: '', error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('dreams')
    .insert({
      user_id: user.id,
      content: dream.content,
      category: dream.category || 'uncategorized',
      themes: dream.themes || [],
      emotion: dream.emotion || 'neutral',
      symbols: dream.symbols || [],
      narrative: dream.narrative || dream.content,
      nugget: dream.nugget || dream.content.substring(0, 100),
      interpretation: dream.interpretation || {},
      sleep_data: dream.sleep_data || null,
      generated_image: dream.generated_image || null,
      watermark: dream.watermark || null,
      asset_metadata: dream.asset_metadata || null,
      context: dream.context || null,
    })
    .select()
    .single();

  if (error) {
    return { id: '', error };
  }

  return { id: data.id };
}

/**
 * Get all dreams for the current user
 */
export async function getUserDreams(): Promise<DreamData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dreams:', error);
    return [];
  }

  return data as unknown as DreamData[];
}

/**
 * Delete a dream
 */
export async function deleteDream(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('dreams')
    .delete()
    .eq('id', id);

  return !error;
}

/**
 * Save user settings
 */
export async function saveSettings(settings: {
  alarm_time?: string;
  alarm_enabled?: boolean;
  music_preference?: string;
  circadian_goal?: string;
  notifications_enabled?: boolean;
  wearable_sync?: boolean;
  image_generation?: boolean;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  // Check if settings exist
  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('settings')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    
    return !error;
  } else {
    const { error } = await supabase
      .from('settings')
      .insert({
        user_id: user.id,
        ...settings,
      });
    
    return !error;
  }
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<Record<string, unknown> | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as Record<string, unknown>;
}

/**
 * Save sleep log
 */
export async function saveSleepLog(log: {
  bedtime: string;
  wake_time: string;
  sleep_duration: number;
  estimated_rem?: number | null;
  movement_score?: number | null;
  quality?: number | null;
  source?: string;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('sleep_logs')
    .insert({
      user_id: user.id,
      ...log,
    });

  return !error;
}

/**
 * Get sleep logs for the current user
 */
export async function getUserSleepLogs(): Promise<Record<string, unknown>[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching sleep logs:', error);
    return [];
  }

  return data as unknown as Record<string, unknown>[];
}
