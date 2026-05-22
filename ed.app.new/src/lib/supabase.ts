import { createClient } from '@supabase/supabase-js';

// Database type definitions
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      dreams: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          category: string;
          themes: string[];
          emotion: string;
          symbols: string[];
          narrative: string;
          nugget: string;
          interpretation: Record<string, unknown>;
          sleep_data: Record<string, unknown> | null;
          generated_image: Record<string, unknown> | null;
          watermark: Record<string, unknown> | null;
          asset_metadata: Record<string, unknown> | null;
          context: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
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
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
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
          created_at?: string;
          updated_at?: string;
        };
      };
      sleep_logs: {
        Row: {
          id: string;
          user_id: string;
          bedtime: string;
          wake_time: string;
          sleep_duration: number;
          estimated_rem: number | null;
          movement_score: number | null;
          quality: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bedtime: string;
          wake_time: string;
          sleep_duration: number;
          estimated_rem?: number | null;
          movement_score?: number | null;
          quality?: number | null;
          source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bedtime?: string;
          wake_time?: string;
          sleep_duration?: number;
          estimated_rem?: number | null;
          movement_score?: number | null;
          quality?: number | null;
          source?: string;
          created_at?: string;
        };
      };
      settings: {
        Row: {
          id: string;
          user_id: string;
          alarm_time: string;
          alarm_enabled: boolean;
          music_preference: string;
          circadian_goal: string;
          notifications_enabled: boolean;
          wearable_sync: boolean;
          image_generation: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          alarm_time?: string;
          alarm_enabled?: boolean;
          music_preference?: string;
          circadian_goal?: string;
          notifications_enabled?: boolean;
          wearable_sync?: boolean;
          image_generation?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          alarm_time?: string;
          alarm_enabled?: boolean;
          music_preference?: string;
          circadian_goal?: string;
          notifications_enabled?: boolean;
          wearable_sync?: boolean;
          image_generation?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing environment variables. Using defaults for local dev.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
