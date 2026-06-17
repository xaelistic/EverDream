/**
 * Dream Asset Generator UI — Phase 1 & 2 Integration
 *
 * Provides the UI for generating dream assets:
 * - Phase 1: Depth maps + parallax video (from dream images)
 * - Phase 2: 360° skybox environments (from dream text)
 *
 * Features:
 * - One-click "Visualize Dream" button
 * - Progress tracking for async generation
 * - Preview generated assets
 * - "Enter VR" button to view in WebXR viewer
 * - Works without API keys (uses free Pollinations for images,
 *   canvas-based parallax for video)
 *
 * API keys (optional, for enhanced quality):
 *   VITE_HF_INFERENCE_API_KEY — Depth Anything v2
 *   VITE_BLOCKADE_LABS_API_KEY — Skybox 360°
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  generateDepthMap,
  generateParallaxVideo,
  generateSkybox,
  pollSkyboxStatus,
  createAssetJob,
  processAssetStep,
  generateAssetPrompts,
} from '../../lib/assets/pipeline';
import type { AssetGenerationJob, AssetType, DreamAsset } from '../../lib/assets/pipeline';
import { persistPipelineAssets } from '../../lib/assets/assetPersistence';
import type { WebXRAsset } from '../vr/WebXRViewer';

// ============================================================
// TYPES
// ============================================================

interface DreamAssetGeneratorProps {
  dreamId: string;
  dreamText: string;
  dreamNugget?: string;
  dreamEmotion?: string;
  dreamThemes?: string[];
  existingImageUrl?: string;
  onEnterVR?: (config: { skyboxUrl?: string; assets: WebXRAsset[] }) => void;
  onAssetsGenerated?: (assets: DreamAsset[]) => void;
}

type GeneratorPhase = 'idle' | 'generating' | 'complete' | 'error';

// ============================================================
// PHASE CONFIG
// ============================================================

interface PhaseConfig {
  id: AssetType;
  label: string;
  description: string;
  icon: string;
  requiresKey?: string;
  free: boolean;
}

const PHASE_1_PHASES: PhaseConfig[] = [
  {
    id: 'depth_map',
    label: 'Depth Map',
    description: 'Estimating scene depth from your dream image',
    icon: '🔍',
    requiresKey: 'hf',
    free: true,
  },
  {
    id: 'parallax_video',
    label: 'Parallax Video',
    description: 'Creating 3D-like motion video',
    icon: '🎬',
    free: true,
  },
];

const PHASE_2_PHASES: PhaseConfig[] = [
  {
    id: 'skybox_360',
    label: '360° Environment',
    description: 'Generating immersive dream world',
    icon: '🌐',
    requiresKey: 'blockade',
    free: true,
  },
];

const PHASE_3_PHASES: PhaseConfig[] = [
  {
    id: 'mesh_3d',
    label: '3D Mesh (GLB)',
    description: 'Text-to-3D object for simulacrum & VR',
    icon: '📦',
    requiresKey: 'meshy',
    free: false,
  },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function DreamAssetGenerator({
  dreamId,
  dreamText,
  dreamNugget,
  dreamEmotion,
  dreamThemes,
  existingImageUrl,
  onEnterVR,
  onAssetsGenerated,
}: DreamAssetGeneratorProps) {
  const [phase, setPhase] = useState<GeneratorPhase>('idle');
  const [job, setJob] = useState<AssetGenerationJob | null>(null);
  const [currentPhaseLabel, setCurrentPhaseLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPhases, setSelectedPhases] = useState<AssetType[]>([
    'parallax_video',
    'skybox_360',
  ]);
  const abortRef = useRef(false);

  // Toggle a phase selection
  const togglePhase = useCallback((id: AssetType) => {
    setSelectedPhases((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  // Start generation
  const startGeneration = useCallback(async () => {
    if (selectedPhases.length === 0) return;

    setPhase('generating');
    setError(null);
    abortRef.current = false;

    try {
      // Create job
      const newJob = createAssetJob(dreamId, dreamText, selectedPhases, {
        dreamNugget,
        dreamEmotion,
        dreamThemes,
        existingImageUrl,
        priority: 'normal',
      });

      setJob(newJob);

      // Process each step
      let currentJob = newJob;
      const apiKeys = {
        hfApiKey: import.meta.env.VITE_HF_INFERENCE_API_KEY || '',
        blockadeApiKey: import.meta.env.VITE_BLOCKADE_LABS_API_KEY || '',
        meshyApiKey: import.meta.env.VITE_MESHY_API_KEY || '',
      };

      for (let i = 0; i < selectedPhases.length; i++) {
        if (abortRef.current) break;

        const phaseConfig = [...PHASE_1_PHASES, ...PHASE_2_PHASES, ...PHASE_3_PHASES].find(
          (p) => p.id === selectedPhases[i]
        );
        setCurrentPhaseLabel(phaseConfig?.label || selectedPhases[i]);

        const result = await processAssetStep(currentJob, apiKeys);
        currentJob = result.job;
        setJob({ ...currentJob });

        if (abortRef.current) break;
      }

      if (!abortRef.current) {
        setPhase('complete');
        persistPipelineAssets(dreamId, currentJob.assets).catch((e) =>
          console.warn('[DreamAssetGenerator] Cloud persist failed', e),
        );
        onAssetsGenerated?.(currentJob.assets);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      setPhase('error');
    }
  }, [
    dreamId,
    dreamText,
    dreamNugget,
    dreamEmotion,
    dreamThemes,
    existingImageUrl,
    selectedPhases,
    onAssetsGenerated,
  ]);

  // Cancel generation
  const cancelGeneration = useCallback(() => {
    abortRef.current = true;
    setPhase('idle');
  }, []);

  // Enter VR with generated assets
  const enterVR = useCallback(() => {
    if (!job) return;

    const skyboxAsset = job.assets.find((a) => a.type === 'skybox_360' && a.result_url);
    const mediaAssets: WebXRAsset[] = job.assets
      .filter((a) => a.result_url && ['parallax_video', 'depth_map'].includes(a.type))
      .map((a) => ({
        id: a.id,
        type: a.type === 'parallax_video' ? 'video' : 'image',
        url: a.result_url!,
        title: a.prompt.substring(0, 40),
      }));

    onEnterVR?.({
      skyboxUrl: skyboxAsset?.result_url,
      assets: mediaAssets,
    });
  }, [job, onEnterVR]);

  // Get asset by type
  const getAsset = (type: AssetType) => job?.assets.find((a) => a.type === type);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#8b5cf6' }}>
          Dream Visualizer
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
          Generate immersive visuals from your dream
        </p>
      </div>

      {/* Phase Selection (when idle) */}
      {phase === 'idle' && (
        <>
          {/* Phase 1 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#06b6d4', fontWeight: 'bold', marginBottom: 8 }}>
              PHASE 1 — Image to Video
            </div>
            {PHASE_1_PHASES.map((p) => (
              <PhaseToggle
                key={p.id}
                config={p}
                selected={selectedPhases.includes(p.id)}
                onToggle={() => togglePhase(p.id)}
              />
            ))}
          </div>

          {/* Phase 2 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 'bold', marginBottom: 8 }}>
              PHASE 2 — Dream World
            </div>
            {PHASE_2_PHASES.map((p) => (
              <PhaseToggle
                key={p.id}
                config={p}
                selected={selectedPhases.includes(p.id)}
                onToggle={() => togglePhase(p.id)}
              />
            ))}
          </div>

          {/* Phase 3 */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#5ec4a8', fontWeight: 'bold', marginBottom: 8 }}>
              PHASE 3 — 3D Simulacrum
            </div>
            {PHASE_3_PHASES.map((p) => (
              <PhaseToggle
                key={p.id}
                config={p}
                selected={selectedPhases.includes(p.id)}
                onToggle={() => togglePhase(p.id)}
              />
            ))}
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              fontSize: 12,
              cursor: 'pointer',
              marginBottom: 16,
              padding: 0,
            }}
          >
            {showAdvanced ? '▼' : '▶'} Advanced options
          </button>

          {showAdvanced && (
            <div style={{
              background: '#111',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              fontSize: 12,
              color: '#888',
            }}>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: '#aaa' }}>API Keys (optional):</strong>
              </div>
              <div>
                HF_API_KEY — for depth estimation (free at huggingface.co)
              </div>
              <div>
                BLOCKADE_API_KEY — for skybox generation (free at blockadelabs.com)
              </div>
              <div>
                MESHY_API_KEY — for 3D mesh GLB (meshy.ai)
              </div>
              <div style={{ marginTop: 8, color: '#666' }}>
                Without keys, uses fallback methods (lower quality but still works).
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={startGeneration}
            disabled={selectedPhases.length === 0}
            style={{
              width: '100%',
              background: selectedPhases.length > 0
                ? 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
                : '#333',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '14px 24px',
              cursor: selectedPhases.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: 15,
              fontWeight: 'bold',
              transition: 'opacity 0.2s',
            }}
          >
            {selectedPhases.length > 0
              ? `Generate ${selectedPhases.length} Asset${selectedPhases.length > 1 ? 's' : ''}`
              : 'Select at least one phase'}
          </button>
        </>
      )}

      {/* Progress (when generating) */}
      {phase === 'generating' && job && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#8b5cf6', marginBottom: 8 }}>
              Generating: {currentPhaseLabel}
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              height: 6,
              background: '#222',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div
                style={{
                  width: `${Math.round(
                    (job.assets.filter((a) => a.status === 'completed').length /
                      job.assets.length) *
                      100
                  )}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          {/* Asset status list */}
          {job.assets.map((asset) => (
            <div
              key={asset.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid #1a1a2e',
              }}
            >
              <span style={{ fontSize: 16 }}>
                {asset.status === 'completed' ? '✅' : asset.status === 'failed' ? '❌' : asset.status === 'processing' ? '⏳' : '⬜'}
              </span>
              <span style={{ fontSize: 13, color: '#aaa', flex: 1 }}>
                {asset.type.replace(/_/g, ' ')}
              </span>
              {asset.status === 'failed' && asset.error && (
                <span style={{ fontSize: 11, color: '#ef4444' }}>
                  {asset.error.substring(0, 40)}
                </span>
              )}
            </div>
          ))}

          {/* Cancel button */}
          <button
            onClick={cancelGeneration}
            style={{
              marginTop: 16,
              background: 'none',
              border: '1px solid #444',
              color: '#888',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Complete */}
      {phase === 'complete' && job && (
        <div>
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 4 }}>
              Dream Visualized!
            </div>
            <div style={{ fontSize: 13, color: '#888' }}>
              {job.assets.filter((a) => a.status === 'completed').length} of {job.assets.length} assets generated
            </div>
          </div>

          {/* Preview generated assets */}
          {job.assets.filter((a) => a.status === 'completed' && a.result_url).map((asset) => (
            <div
              key={asset.id}
              style={{
                marginBottom: 12,
                borderRadius: 8,
                overflow: 'hidden',
                background: '#111',
              }}
            >
              {asset.type === 'parallax_video' && asset.result_url ? (
                <video
                  src={asset.result_url}
                  controls
                  loop
                  muted
                  style={{ width: '100%', display: 'block' }}
                />
              ) : (
                <img
                  src={asset.result_url}
                  alt={asset.type}
                  style={{ width: '100%', display: 'block' }}
                />
              )}
              <div style={{ padding: '8px 12px', fontSize: 12, color: '#888' }}>
                {asset.type.replace(/_/g, ' ')}
              </div>
            </div>
          ))}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            {onEnterVR && job.assets.some((a) => a.status === 'completed') && (
              <button
                onClick={enterVR}
                style={{
                  flex: 1,
                  background: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 20px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 'bold',
                }}
              >
                Enter VR
              </button>
            )}
            <button
              onClick={() => {
                setPhase('idle');
                setJob(null);
              }}
              style={{
                flex: 1,
                background: 'none',
                border: '1px solid #444',
                color: '#aaa',
                borderRadius: 10,
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Generate More
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 14, color: '#ef4444', marginBottom: 8 }}>
            {error || 'Something went wrong'}
          </div>
          <button
            onClick={() => {
              setPhase('idle');
              setError(null);
            }}
            style={{
              background: 'none',
              border: '1px solid #444',
              color: '#aaa',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PHASE TOGGLE COMPONENT
// ============================================================

function PhaseToggle({
  config,
  selected,
  onToggle,
}: {
  config: PhaseConfig;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        background: selected ? 'rgba(139, 92, 246, 0.15)' : '#111',
        border: `1px solid ${selected ? '#8b5cf6' : '#222'}`,
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 6,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
    >
      <span style={{ fontSize: 20 }}>{config.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 'bold',
          color: selected ? '#8b5cf6' : '#ccc',
        }}>
          {config.label}
          {config.free && (
            <span style={{
              marginLeft: 6,
              fontSize: 9,
              background: '#22c55e',
              color: '#fff',
              padding: '1px 5px',
              borderRadius: 4,
            }}>
              FREE
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
          {config.description}
        </div>
      </div>
      <div style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        border: `2px solid ${selected ? '#8b5cf6' : '#444'}`,
        background: selected ? '#8b5cf6' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: '#fff',
      }}>
        {selected && '✓'}
      </div>
    </button>
  );
}
