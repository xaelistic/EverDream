/**
 * Supabase persistence for DreamSimulacrum records via dream_assets rows.
 */

import type { DreamSimulacrum, SimulacrumMode } from './simulacraService';
import {
  getProfileIdForAssets,
  isSupabaseAssetsEnabled,
  resolvePersistableUrl,
} from '../assets/assetPersistence';
import {
  insertDreamAsset,
  fetchDreamAssets,
  type DreamAssetRecord,
} from '../supabase/client';

const SIMULACRUM_META_KEY = 'simulacrum_bundle';

export async function persistSimulacrumToSupabase(sim: DreamSimulacrum): Promise<void> {
  if (!isSupabaseAssetsEnabled()) return;

  const userId = await getProfileIdForAssets();
  if (!userId) return;

  const entries: Array<{ type: string; url?: string; meta?: Record<string, unknown> }> = [
    { type: 'depth_map', url: sim.depthMapUrl },
    { type: 'parallax_video', url: sim.parallaxVideoUrl },
    { type: 'mesh_3d', url: sim.meshUrl },
    { type: 'skybox_360', url: sim.skyboxUrl },
    { type: 'image', url: sim.imageUrl },
  ];

  for (const entry of entries) {
    if (!entry.url) continue;
    const url = await resolvePersistableUrl(entry.url, sim.dreamId, entry.type);

    await insertDreamAsset({
      dream_id: sim.dreamId,
      user_id: userId,
      asset_type: entry.type,
      prompt: sim.title,
      url,
      source: 'simulacra',
      metadata: {
        simulacrum_mode: sim.mode,
        narrative: sim.narrative.slice(0, 500),
        built_at: sim.builtAt,
        mesh_job: sim.meshJob,
        ...entry.meta,
      },
      status: 'completed',
      attempts: 1,
      completed_at: sim.builtAt,
    });
  }

  await insertDreamAsset({
    dream_id: sim.dreamId,
    user_id: userId,
    asset_type: 'multi_view',
    prompt: sim.title,
    url: sim.imageUrl,
    source: 'simulacra',
    metadata: {
      [SIMULACRUM_META_KEY]: true,
      mode: sim.mode,
      title: sim.title,
      narrative: sim.narrative,
      built_at: sim.builtAt,
    },
    status: 'completed',
    attempts: 1,
    completed_at: sim.builtAt,
  });
}

/** Reconstruct a DreamSimulacrum from dream_assets if present. */
export function simulacrumFromAssetRecords(
  dreamId: string,
  records: DreamAssetRecord[],
): DreamSimulacrum | null {
  if (records.length === 0) return null;

  const byType = (type: string) =>
    records.find((r) => r.asset_type === type && r.url)?.url ?? undefined;

  const bundle = records.find((r) => r.metadata?.[SIMULACRUM_META_KEY]);
  const imageUrl = byType('image');
  const depthMapUrl = byType('depth_map');

  if (!imageUrl && !depthMapUrl) return null;

  const meshUrl = byType('mesh_3d');
  const skyboxUrl = byType('skybox_360');
  const parallaxVideoUrl = byType('parallax_video');

  let mode: SimulacrumMode = 'depth_terrain';
  if (meshUrl) mode = 'mesh_glb';
  else if (skyboxUrl) mode = 'skybox_vr';

  const meta = bundle?.metadata as Record<string, unknown> | undefined;

  return {
    dreamId,
    title: (meta?.title as string) || 'Dream',
    narrative: (meta?.narrative as string) || '',
    imageUrl: imageUrl || depthMapUrl!,
    depthMapUrl: depthMapUrl || imageUrl!,
    meshUrl,
    skyboxUrl,
    parallaxVideoUrl,
    mode: (meta?.mode as SimulacrumMode) || mode,
    builtAt: (meta?.built_at as string) || records[0].completed_at || records[0].created_at,
  };
}

export async function loadSimulacrumFromSupabase(dreamId: string): Promise<DreamSimulacrum | null> {
  if (!isSupabaseAssetsEnabled()) return null;
  const records = await fetchDreamAssets(dreamId);
  return simulacrumFromAssetRecords(dreamId, records);
}