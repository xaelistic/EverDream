/**
 * Persist generated dream assets to Supabase dream_assets (+ storage for blob URLs).
 */

import {
  supabase,
  getCurrentUser,
  insertDreamAsset,
  fetchDreamAssets,
  type DreamAssetRecord,
} from '../supabase/client';
import type { DreamAsset as PipelineAsset, AssetType } from './pipeline';

const PERSISTABLE_TYPES: AssetType[] = [
  'depth_map',
  'parallax_video',
  'skybox_360',
  'mesh_3d',
  'multi_view',
];

function isHttpUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/** Upload blob/data URLs to dream-media so they survive reloads. */
export async function resolvePersistableUrl(
  url: string,
  dreamId: string,
  assetType: string,
): Promise<string> {
  if (isHttpUrl(url)) return url;
  if (!url.startsWith('blob:') && !url.startsWith('data:')) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const ext =
      blob.type.includes('video') ? 'webm' :
      blob.type.includes('gltf') || blob.type.includes('model') ? 'glb' :
      'png';
    const path = `assets/${dreamId}/${assetType}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from('dream-media').upload(path, blob, {
      contentType: blob.type || 'application/octet-stream',
      upsert: true,
    });
    if (error) {
      console.warn('[assetPersistence] Storage upload failed:', error.message);
      return url;
    }
    const { data } = supabase.storage.from('dream-media').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn('[assetPersistence] Could not upload asset blob', e);
    return url;
  }
}

export async function getProfileIdForAssets(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  return profile?.id ?? null;
}

export function isSupabaseAssetsEnabled(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key && !url.includes('placeholder'));
}

/** Save pipeline assets to dream_assets (best-effort). */
export async function persistPipelineAssets(
  dreamId: string,
  assets: PipelineAsset[],
): Promise<DreamAssetRecord[]> {
  if (!isSupabaseAssetsEnabled()) return [];

  const userId = await getProfileIdForAssets();
  if (!userId) return [];

  const saved: DreamAssetRecord[] = [];

  for (const asset of assets) {
    if (!PERSISTABLE_TYPES.includes(asset.type)) continue;
    if (asset.status !== 'completed') continue;

    const rawUrl = asset.result_url || asset.result_urls?.[0];
    if (!rawUrl) continue;

    const url = await resolvePersistableUrl(rawUrl, dreamId, asset.type);

    const record = await insertDreamAsset({
      dream_id: dreamId,
      user_id: userId,
      asset_type: asset.type,
      prompt: asset.prompt,
      url,
      source: (asset.metadata?.source as string) || 'pipeline',
      style: 'dreamlike',
      metadata: {
        ...asset.metadata,
        result_urls: asset.result_urls,
        pipeline_asset_id: asset.id,
      },
      status: 'completed',
      attempts: asset.attempts,
      completed_at: asset.completed_at || new Date().toISOString(),
    });

    if (record) saved.push(record);
  }

  return saved;
}

export async function loadDreamAssetsFromSupabase(dreamId: string): Promise<DreamAssetRecord[]> {
  if (!isSupabaseAssetsEnabled()) return [];
  return fetchDreamAssets(dreamId);
}