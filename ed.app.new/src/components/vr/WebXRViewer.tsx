/**
 * WebXR Viewer — Phase 2 VR Component
 *
 * Standalone 360° environment viewer for VR headsets.
 * Works on Meta Quest browser via WebXR — no app install needed.
 *
 * Features:
 * - Load a skybox (360° equirectangular image) as the environment
 * - VR headset support via WebXR immersive-vr mode
 * - Non-VR fallback: mouse/touch drag to look around
 * - Parallax video playback on a virtual screen
 * - Dream image gallery on virtual walls
 *
 * Usage:
 *   <WebXRViewer
 *     skyboxUrl="https://..."
 *     dreamAssets={[...]}
 *     onBack={() => navigate('/')}
 *   />
 */

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, createXRStore, XRButton } from '@react-three/xr';
import { OrbitControls, useTexture, Html, Text, Float } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================
// TYPES
// ============================================================

export interface WebXRAsset {
  id: string;
  type: 'image' | 'video' | 'parallax';
  url: string;
  thumbnailUrl?: string;
  title?: string;
}

export interface WebXRViewerProps {
  skyboxUrl?: string;
  assets?: WebXRAsset[];
  onBack?: () => void;
  enableVR?: boolean;
}

// ============================================================
// 360° SKYBOX ENVIRONMENT
// ============================================================

function SkyboxEnvironment({ url }: { url: string }) {
  const texture = useTexture(url);

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return () => texture.dispose();
  }, [texture]);

  return (
    <mesh>
      <sphereGeometry args={[50, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
}

// ============================================================
// DEFAULT STARFIELD (when no skybox)
// ============================================================

function Starfield() {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = React.useMemo(() => {
    const pos = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const r = 30 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial size={0.15} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
}

// ============================================================
// DREAM IMAGE ON VIRTUAL WALL
// ============================================================

function DreamImageFrame({
  asset,
  position,
  rotation,
  onClick,
}: {
  asset: WebXRAsset;
  position: [number, number, number];
  rotation: [number, number, number];
  onClick?: () => void;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      asset.url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => {}
    );
  }, [asset.url]);

  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2, 1.4, 0.05]} />
        <meshStandardMaterial
          color={hovered ? '#8b5cf6' : '#1a1a2e'}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Image */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[1.8, 1.2]} />
        {texture ? (
          <meshStandardMaterial map={texture} />
        ) : (
          <meshStandardMaterial color="#222" />
        )}
      </mesh>

      {/* Title */}
      {asset.title && (
        <Text
          position={[0, -0.8, 0.03]}
          fontSize={0.1}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.8}
        >
          {asset.title}
        </Text>
      )}
    </group>
  );
}

// ============================================================
// VIRTUAL SCREEN (for parallax video)
// ============================================================

function VirtualScreen({
  asset,
  position,
}: {
  asset: WebXRAsset;
  position: [number, number, number];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    const video = document.createElement('video');
    video.src = asset.url;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    videoRef.current = video;

    const tex = new THREE.VideoTexture(video);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    setTexture(tex);

    return () => {
      video.pause();
      video.src = '';
      tex.dispose();
    };
  }, [asset.url]);

  return (
    <group position={position}>
      {/* Screen border */}
      <mesh>
        <boxGeometry args={[3.2, 1.9, 0.1]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Video surface */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[2.9, 1.6]} />
        {texture ? (
          <meshStandardMaterial map={texture} />
        ) : (
          <meshStandardMaterial color="#000" emissive="#111" emissiveIntensity={0.2} />
        )}
      </mesh>

      {/* Label */}
      <Text
        position={[0, -1.1, 0.1]}
        fontSize={0.12}
        color="#888"
        anchorX="center"
      >
        {asset.title || 'Dream Video'}
      </Text>
    </group>
  );
}

// ============================================================
// FLOATING DREAM ORBS (ambient decoration)
// ============================================================

function DreamOrbs() {
  const orbs = React.useMemo(() => {
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];
    return Array.from({ length: 12 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 16,
        0.5 + Math.random() * 3,
        (Math.random() - 0.5) * 16,
      ] as [number, number, number],
      color: colors[i % colors.length],
      scale: 0.05 + Math.random() * 0.1,
      speed: 0.5 + Math.random() * 1.5,
    }));
  }, []);

  return (
    <>
      {orbs.map((orb, i) => (
        <Float key={i} speed={orb.speed} rotationIntensity={0.2} floatIntensity={0.5}>
          <mesh position={orb.position}>
            <sphereGeometry args={[orb.scale, 16, 16]} />
            <meshStandardMaterial
              color={orb.color}
              emissive={orb.color}
              emissiveIntensity={0.6}
              transparent
              opacity={0.7}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

// ============================================================
// MAIN SCENE
// ============================================================

function WebXRScene({
  skyboxUrl,
  assets,
}: {
  skyboxUrl?: string;
  assets: WebXRAsset[];
}) {
  const images = assets.filter((a) => a.type === 'image' || a.type === 'parallax');
  const videos = assets.filter((a) => a.type === 'video');

  // Position images in a semicircle
  const imagePositions = React.useMemo(() => {
    return images.map((_, i) => {
      const angle = ((i - (images.length - 1) / 2) / Math.max(images.length, 1)) * Math.PI * 0.8;
      const radius = 5;
      return {
        position: [
          Math.sin(angle) * radius,
          1.5,
          -Math.cos(angle) * radius,
        ] as [number, number, number],
        rotation: [0, angle, 0] as [number, number, number],
      };
    });
  }, [images.length]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 4, 0]} intensity={0.6} color="#e8d5b7" />
      <pointLight position={[-3, 3, -3]} intensity={0.3} color="#8b5cf6" />
      <pointLight position={[3, 3, -3]} intensity={0.3} color="#06b6d4" />

      {/* Environment */}
      {skyboxUrl ? (
        <SkyboxEnvironment url={skyboxUrl} />
      ) : (
        <>
          <Starfield />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#0a0a15" metalness={0.3} roughness={0.8} />
          </mesh>
        </>
      )}

      {/* Dream image frames */}
      {images.map((asset, i) => {
        const pos = imagePositions[i];
        if (!pos) return null;
        return (
          <DreamImageFrame
            key={asset.id}
            asset={asset}
            position={pos.position}
            rotation={pos.rotation}
          />
        );
      })}

      {/* Video screen (center back) */}
      {videos.length > 0 && (
        <VirtualScreen
          asset={videos[0]}
          position={[0, 1.5, -5]}
        />
      )}

      {/* Ambient orbs */}
      <DreamOrbs />

      {/* Camera controls for non-VR */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        maxPolarAngle={Math.PI * 0.85}
        minPolarAngle={Math.PI * 0.15}
        minDistance={1}
        maxDistance={10}
      />
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const xrStore = createXRStore();

export default function WebXRViewer({
  skyboxUrl,
  assets = [],
  onBack,
  enableVR = true,
}: WebXRViewerProps) {
  const [showHelp, setShowHelp] = useState(true);

  // Auto-hide help after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHelp(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', background: '#000' }}>
      {/* VR Button */}
      {enableVR && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 100 }}>
          <XRButton
            store={xrStore}
            style={{
              background: 'rgba(139, 92, 246, 0.9)',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold',
            }}
          />
        </div>
      )}

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 100,
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Back to Journal
        </button>
      )}

      {/* Help overlay */}
      {showHelp && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            borderRadius: 12,
            padding: '16px 24px',
            fontSize: 13,
            textAlign: 'center',
            maxWidth: 400,
            backdropFilter: 'blur(10px)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 'bold', color: '#8b5cf6' }}>
            Dream VR Viewer
          </div>
          <div>
            {enableVR
              ? 'Click "Enter VR" for headset view, or drag to look around.'
              : 'Drag to look around. Scroll to zoom.'}
          </div>
          {skyboxUrl && (
            <div style={{ marginTop: 4, color: '#aaa', fontSize: 11 }}>
              Viewing your dream environment in 360°
            </div>
          )}
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 3], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000');
        }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <WebXRScene skyboxUrl={skyboxUrl} assets={assets} />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
}
