import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF, Html } from '@react-three/drei';
import { ArrowLeft, Box, Loader2, Glasses, Share2 } from 'lucide-react';
import * as THREE from 'three';
import type { DreamSimulacrum } from '../lib/simulacra/simulacraService';
import { buildDreamSimulacrum, getSimulacrumAsync } from '../lib/simulacra/simulacraService';
import { notifySimulacraReady } from '../lib/discord';
import { ProFeatureGate } from '../components/subscriptions/ProFeatureGate';

interface DreamSimulacrumScreenProps {
  dreamId: string;
  title: string;
  narrative: string;
  imageUrl?: string;
  navigate: (screen: string, id?: string) => void;
}

function DepthTerrain({ imageUrl, depthUrl }: { imageUrl: string; depthUrl: string }) {
  const colorMap = useLoader(THREE.TextureLoader, imageUrl);
  const depthMap = useLoader(THREE.TextureLoader, depthUrl);
  const meshRef = useRef<THREE.Mesh>(null);

  useMemo(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    depthMap.wrapS = depthMap.wrapT = THREE.ClampToEdgeWrapping;
  }, [colorMap, depthMap]);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.z += delta * 0.02;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2.2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[8, 8, 128, 128]} />
      <meshStandardMaterial
        map={colorMap}
        displacementMap={depthMap}
        displacementScale={1.8}
        metalness={0.1}
        roughness={0.85}
      />
    </mesh>
  );
}

function DreamMesh({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()} scale={1.5} position={[0, 0, 0]} />;
}

function SceneContent({ sim }: { sim: DreamSimulacrum }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <fog attach="fog" args={['#e8f0e6', 8, 22]} />
      {sim.meshUrl ? (
        <Suspense fallback={null}>
          <DreamMesh url={sim.meshUrl} />
        </Suspense>
      ) : (
        <Suspense fallback={null}>
          <DepthTerrain imageUrl={sim.imageUrl} depthUrl={sim.depthMapUrl} />
        </Suspense>
      )}
      <Text
        position={[0, 3, -2]}
        fontSize={0.35}
        color="#2d3a2d"
        maxWidth={6}
        textAlign="center"
        anchorX="center"
      >
        {sim.title}
      </Text>
      <mesh position={[0, -0.2, 3]} rotation={[0, 0, 0]}>
        <planeGeometry args={[3, 0.4]} />
        <meshBasicMaterial color="#7a9e7a" transparent opacity={0.85} />
      </mesh>
      <Text position={[0, -0.2, 3.01]} fontSize={0.12} color="#f4f7f2" anchorX="center">
        everdream.app
      </Text>
    </>
  );
}

export function DreamSimulacrumScreen({
  dreamId,
  title,
  narrative,
  imageUrl,
  navigate,
}: DreamSimulacrumScreenProps) {
  const [sim, setSim] = useState<DreamSimulacrum | null>(null);
  const [building, setBuilding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSimulacrumAsync(dreamId).then((existing) => {
      if (!cancelled && existing) setSim(existing);
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [dreamId]);

  const build = async () => {
    if (!imageUrl) {
      setError('This dream needs a generated image before building a simulacrum.');
      return;
    }
    setBuilding(true);
    setError(null);
    try {
      const result = await buildDreamSimulacrum({
        dreamId,
        title,
        narrative: narrative.slice(0, 500),
        imageUrl,
        hfApiKey: import.meta.env.VITE_HF_INFERENCE_API_KEY,
        meshyApiKey: import.meta.env.VITE_MESHY_API_KEY,
        onProgress: setProgress,
      });
      setSim(result);
      notifySimulacraReady(title, dreamId, imageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Build failed');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <ProFeatureGate
      feature="Dream Simulacrum"
      description="Build explorable 3D terrain and GLB meshes from your dream images. Included with EverDream Pro."
      onUpgrade={() => navigate('settings')}
    >
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('dream', dreamId)}
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="w-4 h-4" /> Dream
        </button>
        {sim && (
          <button
            type="button"
            onClick={() => navigate('vr', dreamId)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-sageDark border border-sage/30 bg-sage/10 px-3 py-1.5 rounded-full"
          >
            <Glasses className="w-4 h-4" /> Enter VR
          </button>
        )}
      </div>

      <div className="rounded-3xl border border-line bg-cream overflow-hidden shadow-lift">
        <div className="px-5 py-4 border-b border-line">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Dream simulacrum</p>
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          <p className="text-xs text-muted mt-1">
            {sim?.mode === 'mesh_glb' ? '3D mesh · explorable' : 'Depth terrain · explorable'}
          </p>
        </div>

        <div className="relative h-[min(70vh,520px)] bg-gradient-to-b from-parchment to-sage/20">
          {sim ? (
            <Canvas camera={{ position: [0, 2, 6], fov: 55 }}>
              <Suspense
                fallback={
                  <Html center>
                    <Loader2 className="w-8 h-8 text-sage animate-spin" />
                  </Html>
                }
              >
                <SceneContent sim={sim} />
              </Suspense>
              <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2} />
            </Canvas>
          ) : loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-sage animate-spin" />
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <Box className="w-12 h-12 text-sage/60" strokeWidth={1.25} />
              <p className="text-sm text-muted max-w-sm">
                Transform your dream image into an explorable 3D simulacrum. Works offline via depth mapping;
                add Meshy API key for full GLB meshes.
              </p>
              {building ? (
                <div className="flex items-center gap-2 text-sageDark text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> {progress || 'Building…'}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={build}
                  disabled={!imageUrl}
                  className="bg-sage hover:bg-sageDark text-cream px-6 py-3 rounded-2xl font-semibold disabled:opacity-40"
                >
                  Build simulacrum
                </button>
              )}
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
          )}
        </div>

        {sim && (
          <div className="p-4 flex flex-wrap gap-2 border-t border-line">
            <button
              type="button"
              onClick={() => navigate('exchange')}
              className="flex-1 min-w-[140px] border border-line bg-parchment py-2.5 rounded-xl text-sm font-medium"
            >
              List on XAEL Exchange
            </button>
            <button
              type="button"
              onClick={() => navigate('dream', dreamId)}
              className="flex-1 min-w-[140px] border border-sage/30 bg-sage/10 text-sageDark py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Mint NFT
            </button>
          </div>
        )}
      </div>
    </div>
    </ProFeatureGate>
  );
}