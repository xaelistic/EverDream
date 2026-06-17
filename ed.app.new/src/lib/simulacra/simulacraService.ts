/**
 * Dream Simulacrum — explorable 3D representation of a dream.
 * Combines image, depth terrain, optional GLB mesh, and skybox for VR.
 */

import { buildLocalDepthMap, imageTo3DBlocking, type ImageTo3DJob } from '../assets/imageTo3D';
import { generateParallaxVideo } from '../assets/pipeline';
import { persistSimulacrumToSupabase, loadSimulacrumFromSupabase } from './simulacraPersistence';

export type SimulacrumMode = 'depth_terrain' | 'mesh_glb' | 'skybox_vr';

export interface DreamSimulacrum {
  dreamId: string;
  title: string;
  narrative: string;
  imageUrl: string;
  depthMapUrl: string;
  meshUrl?: string;
  skyboxUrl?: string;
  parallaxVideoUrl?: string;
  mode: SimulacrumMode;
  meshJob?: ImageTo3DJob;
  builtAt: string;
}

const STORAGE_KEY = 'everdream_simulacra';

export interface BuildSimulacrumInput {
  dreamId: string;
  title: string;
  narrative: string;
  imageUrl: string;
  skyboxUrl?: string;
  hfApiKey?: string;
  meshyApiKey?: string;
  onProgress?: (msg: string) => void;
}

/** Build a simulacrum — always produces depth terrain; mesh/skybox when keys exist. */
export async function buildDreamSimulacrum(input: BuildSimulacrumInput): Promise<DreamSimulacrum> {
  input.onProgress?.('Estimating depth from dream image…');
  const depthMapUrl = await buildLocalDepthMap(input.imageUrl, input.hfApiKey);

  input.onProgress?.('Creating parallax motion layer…');
  let parallaxVideoUrl: string | undefined;
  try {
    parallaxVideoUrl = await generateParallaxVideo(input.imageUrl, depthMapUrl, {
      duration: 4,
      fps: 20,
      amplitude: 0.1,
      direction: 'circular',
    });
  } catch {
    /* non-critical */
  }

  let meshUrl: string | undefined;
  let meshJob: ImageTo3DJob | undefined;
  let mode: SimulacrumMode = 'depth_terrain';

  if (input.meshyApiKey) {
    input.onProgress?.('Generating 3D mesh from image (Meshy)…');
    try {
      meshJob = await imageTo3DBlocking(input.imageUrl, input.meshyApiKey);
      if (meshJob.status === 'completed' && meshJob.modelUrl) {
        meshUrl = meshJob.modelUrl;
        mode = 'mesh_glb';
      }
    } catch (e) {
      console.warn('[simulacra] Meshy image-to-3D failed', e);
    }
  }

  if (input.skyboxUrl) {
    mode = meshUrl ? 'mesh_glb' : 'skybox_vr';
  }

  const simulacrum: DreamSimulacrum = {
    dreamId: input.dreamId,
    title: input.title,
    narrative: input.narrative,
    imageUrl: input.imageUrl,
    depthMapUrl,
    meshUrl,
    skyboxUrl: input.skyboxUrl,
    parallaxVideoUrl,
    mode,
    meshJob,
    builtAt: new Date().toISOString(),
  };

  saveSimulacrum(simulacrum);
  persistSimulacrumToSupabase(simulacrum).catch((e) =>
    console.warn('[simulacra] Supabase persist failed', e),
  );
  input.onProgress?.('Simulacrum ready');
  return simulacrum;
}

export function saveSimulacrum(simulacrum: DreamSimulacrum): void {
  const all = loadAllSimulacra();
  all[simulacrum.dreamId] = simulacrum;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getSimulacrum(dreamId: string): DreamSimulacrum | null {
  return loadAllSimulacra()[dreamId] ?? null;
}

/** Load from localStorage, then Supabase dream_assets. */
export async function getSimulacrumAsync(dreamId: string): Promise<DreamSimulacrum | null> {
  const local = getSimulacrum(dreamId);
  if (local) return local;

  const remote = await loadSimulacrumFromSupabase(dreamId);
  if (remote) saveSimulacrum(remote);
  return remote;
}

function loadAllSimulacra(): Record<string, DreamSimulacrum> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}