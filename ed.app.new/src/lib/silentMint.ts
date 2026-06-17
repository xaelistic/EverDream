/**
 * Client trigger for silent-mint-queue Supabase Edge Function.
 * Queues custodial NFT mint after dream save or explicit mint.
 */

import { supabase, getCurrentUser } from './supabase/client';
import { getProfileIdForAssets, isSupabaseAssetsEnabled } from './assets/assetPersistence';

export interface SilentMintPayload {
  dream_id: string;
  user_id: string;
  content: string;
  category: string;
  image_url?: string;
  animation_url?: string;
  metadata_uri?: string;
  created_at: string;
}

export async function triggerSilentMint(payload: Omit<SilentMintPayload, 'user_id'>): Promise<boolean> {
  if (!isSupabaseAssetsEnabled()) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  const profileId = await getProfileIdForAssets();
  if (!profileId) return false;

  try {
    const { data, error } = await supabase.functions.invoke('silent-mint-queue', {
      body: {
        ...payload,
        user_id: profileId,
      } satisfies SilentMintPayload,
    });

    if (error) {
      console.warn('[silentMint] Edge function error:', error.message);
      return false;
    }

    console.log('[silentMint] Queued:', data);
    return Boolean(data?.success);
  } catch (e) {
    console.warn('[silentMint] Invoke failed', e);
    return false;
  }
}