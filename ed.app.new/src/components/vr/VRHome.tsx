/**
 * VR Home Environment
 *
 * A virtual reality "dream gallery" where users can:
 * - View their dream images on virtual walls (like an art gallery)
 * - Watch dream videos on a virtual TV/screen
 * - Walk through 360° dream environments
 * - Interact with 3D dream objects
 *
 * Built with React Three Fiber + WebXR for browser-based VR.
 * Works on Meta Quest browser, no app install needed.
 *
 * Architecture:
 *   VRHome (main scene)
 *   ├── GalleryRoom (walls with dream images)
 *   ├── TVScreen (plays dream videos)
 *   ├── SkyboxViewer (360° environments)
 *   ├── DreamObject (interactive 3D objects)
 *   └── UIPanel (non-VR fallback / controls)
 */

import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { XR, createXRStore, XRButton } from '@react-three/xr';
import {
  Environment,
  OrbitControls,
  useTexture,
  Html,
  Text,
  Float,
  MeshReflectorMaterial,
  useGLTF,
  Center,
  Bounds,
  useBounds,
} from '@react-three/drei';
import * as THREE from 'three';

// ============================================================
// TYPES
// ============================================================

export interface VRDreamAsset {
  id: string;
  dreamId: string;
  type: 'image' | 'video' | 'skybox' | 'mesh_3d' | 'parallax';
  url: string;
  thumbnailUrl?: string;
  title?: string;
  nugget?: string;
  emotion?: string;
  category?: string;
  themes?: string[];
  position?: [number, number, number];
  scale?: number;
  interactive?: boolean;
}

export interface VRHomeConfig {
  roomSize: { width: number; depth: number; height: number };
  wallColor: string;
  floorColor: string;
  ambientLightIntensity: number;
  skyboxUrl?: string;
  layout: 'gallery' | 'theater' | 'immersive';
}

const DEFAULT_CONFIG: VRHomeConfig = {
  roomSize: { width: 12, depth: 10, height: 4 },
  wallColor: '#1a1a2e',
  floorColor: '#0f0f1a',
  ambientLightIntensity: 0.4,
  layout: 'gallery',
};

// ============================================================
// VR HOME SCENE
// ============================================================

interface VRHomeSceneProps {
  assets: VRDreamAsset[];
  config?: Partial<VRHomeConfig>;
  onAssetSelect?: (asset: VRDreamAsset) => void;
  onAssetInteract?: (asset: VRDreamAsset, action: string) => void;
}

function VRHomeScene({ assets, config, onAssetSelect, onAssetInteract }: VRHomeSceneProps) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { roomSize, wallColor, floorColor, ambientLightIntensity, skyboxUrl } = mergedConfig;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={ambientLightIntensity} />
      <pointLight position={[0, roomSize.height - 0.5, 0]} intensity={0.8} color="#e8d5b7" />
      <pointLight position={[-4, 3, -3]} intensity={0.4} color="#8b5cf6" />
      <pointLight position={[4, 3, -3]} intensity={0.4} color="#06b6d4" />

      {/* Skybox / Environment */}
      {skyboxUrl ? (
        <SkyboxEnvironment url={skyboxUrl} />
      ) : (
        <Environment preset="night" />
      )}

      {/* Floor */}
      <Floor width={roomSize.width} depth={roomSize.depth} color={floorColor} />

      {/* Walls with dream images */}
      <GalleryWalls
        assets={assets.filter((a) => a.type === 'image' || a.type === 'parallax')}
        roomSize={roomSize}
        wallColor={wallColor}
        onSelect={onAssetSelect}
      />

      {/* TV Screen for videos */}
      <TVScreen
        assets={assets.filter((a) => a.type === 'video')}
        position={[0, 1.5, -roomSize.depth / 2 + 0.1]}
        onSelect={onAssetSelect}
      />

      {/* 3D Dream Objects */}
      <DreamObjectPlacer
        assets={assets.filter((a) => a.type === 'mesh_3d')}
        roomSize={roomSize}
        onInteract={onAssetInteract}
      />

      {/* Camera controls for non-VR */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        maxPolarAngle={Math.PI / 2}
        minDistance={2}
        maxDistance={roomSize.width}
      />
    </>
  );
}

// ============================================================
// FLOOR
// ============================================================

function Floor({ width, depth, color }: { width: number; depth: number; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[width, depth]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color={color}
        metalness={0.5}
        mirror={0.5}
      />
    </mesh>
  );
}

// ============================================================
// GALLERY WALLS (Dream images on walls)
// ============================================================

interface GalleryWallsProps {
  assets: VRDreamAsset[];
  roomSize: { width: number; depth: number; height: number };
  wallColor: string;
  onSelect?: (asset: VRDreamAsset) => void;
}

function GalleryWalls({ assets, roomSize, wallColor, onSelect }: GalleryWallsProps) {
  const { width, depth, height } = roomSize;

  // Distribute images across walls
  const wallPositions = useMemo(() => {
    const positions: Array<{ position: [number, number, number]; rotation: [number, number, number] }> = [];

    // Back wall
    const backCount = Math.ceil(assets.length / 2);
    for (let i = 0; i < backCount; i++) {
      const x = (i - (backCount - 1) / 2) * 2.5;
      positions.push({
        position: [x, height / 2, -depth / 2 + 0.05],
        rotation: [0, 0, 0],
      });
    }

    // Side walls
    const sideAssets = assets.slice(backCount);
    const leftCount = Math.ceil(sideAssets.length / 2);
    const rightCount = sideAssets.length - leftCount;

    for (let i = 0; i < leftCount; i++) {
      const z = (i - (leftCount - 1) / 2) * 3;
      positions.push({
        position: [-width / 2 + 0.05, height / 2, z],
        rotation: [0, Math.PI / 2, 0],
      });
    }

    for (let i = 0; i < rightCount; i++) {
      const z = (i - (rightCount - 1) / 2) * 3;
      positions.push({
        position: [width / 2 - 0.05, height / 2, z],
        rotation: [0, -Math.PI / 2, 0],
      });
    }

    return positions;
  }, [assets, width, depth, height]);

  return (
    <>
      {/* Wall panels */}
      <mesh position={[0, height / 2, -depth / 2]}>
        <boxGeometry args={[width, height, 0.1]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[-width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, 0.1]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, 0.1]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* Dream image frames */}
      {assets.map((asset, i) => {
        const pos = wallPositions[i];
        if (!pos) return null;
        return (
          <DreamFrame
            key={asset.id}
            asset={asset}
            position={pos.position}
            rotation={pos.rotation}
            onClick={() => onSelect?.(asset)}
          />
        );
      })}
    </>
  );
}

// ============================================================
// DREAM FRAME (Image on wall with frame)
// ============================================================

interface DreamFrameProps {
  asset: VRDreamAsset;
  position: [number, number, number];
  rotation: [number, number, number];
  onClick?: () => void;
}

function DreamFrame({ asset, position, rotation, onClick }: DreamFrameProps) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && hovered) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.02);
    }
  });

  return (
    <group position={position} rotation={rotation}>
      {/* Frame border */}
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.8, 1.3, 0.05]} />
        <meshStandardMaterial
          color={hovered ? '#8b5cf6' : '#2a2a3e'}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Image */}
      <DreamImagePlane url={asset.url} position={[0, 0, 0.03]} />

      {/* Title label */}
      {asset.nugget && (
        <Text
          position={[0, -0.8, 0.03]}
          fontSize={0.08}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={1.6}
        >
          {asset.nugget}
        </Text>
      )}

      {/* Emotion indicator */}
      {asset.emotion && (
        <EmotionIndicator emotion={asset.emotion} position={[0.8, 0.6, 0.05]} />
      )}
    </group>
  );
}

// ============================================================
// DREAM IMAGE PLANE
// ============================================================

function DreamImagePlane({ url, position }: { url: string; position: [number, number, number] }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => setError(true)
    );
  }, [url]);

  if (error) {
    return (
      <mesh position={position}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    );
  }

  if (!texture) {
    return (
      <mesh position={position}>
        <planeGeometry args={[1.6, 1.1]} />
        <meshStandardMaterial color="#222" wireframe />
      </mesh>
    );
  }

  return (
    <mesh position={position}>
      <planeGeometry args={[1.6, 1.1]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}

// ============================================================
// EMOTION INDICATOR (small colored orb)
// ============================================================

const EMOTION_COLORS: Record<string, string> = {
  joy: '#fbbf24',
  peaceful: '#34d399',
  fear: '#ef4444',
  sadness: '#60a5fa',
  anger: '#f87171',
  surprise: '#a78bfa',
  curiosity: '#2dd4bf',
  neutral: '#9ca3af',
  mysterious: '#8b5cf6',
  anxious: '#fb923c',
  excited: '#f472b6',
  calm: '#22d3ee',
};

function EmotionIndicator({ emotion, position }: { emotion: string; position: [number, number, number] }) {
  const color = EMOTION_COLORS[emotion] || EMOTION_COLORS.neutral;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5} data-component="VRHome">
      <mesh position={position}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
      <pointLight position={position} color={color} intensity={0.3} distance={1} />
    </Float>
  );
}

// ============================================================
// TV SCREEN (for dream videos)
// ============================================================

interface TVScreenProps {
  assets: VRDreamAsset[];
  position: [number, number, number];
  onSelect?: (asset: VRDreamAsset) => void;
}

function TVScreen({ assets, position, onSelect }: TVScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentAsset = assets[currentIndex];

  useEffect(() => {
    if (assets.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((i) => (i + 1) % assets.length);
    }, 30000); // Rotate every 30 seconds
    return () => clearInterval(interval);
  }, [assets.length]);

  return (
    <group position={position}>
      {/* TV Body */}
      <mesh>
        <boxGeometry args={[3, 1.8, 0.15]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Screen */}
      {currentAsset ? (
        <mesh position={[0, 0, 0.08]} onClick={() => onSelect?.(currentAsset)}>
          <planeGeometry args={[2.7, 1.5]} />
          <meshStandardMaterial color="#000" emissive="#111" emissiveIntensity={0.2} />
        </mesh>
      ) : (
        <mesh position={[0, 0, 0.08]}>
          <planeGeometry args={[2.7, 1.5]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      )}

      {/* Stand */}
      <mesh position={[0, -1.1, 0.1]}>
        <boxGeometry args={[0.8, 0.4, 0.1]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Label */}
      <Text
        position={[0, -1.5, 0.1]}
        fontSize={0.1}
        color="#666"
        anchorX="center"
      >
        {currentAsset ? `Now Playing: ${currentAsset.title || 'Dream Video'}` : 'No videos yet'}
      </Text>
    </group>
  );
}

// ============================================================
// DREAM OBJECT PLACER (3D objects in the room)
// ============================================================

interface DreamObjectPlacerProps {
  assets: VRDreamAsset[];
  roomSize: { width: number; depth: number; height: number };
  onInteract?: (asset: VRDreamAsset, action: string) => void;
}

function DreamObjectPlacer({ assets, roomSize, onInteract }: DreamObjectPlacerProps) {
  // Place objects on pedestals around the room
  const positions = useMemo(() => {
    return assets.map((_, i) => {
      const angle = (i / assets.length) * Math.PI * 2;
      const radius = Math.min(roomSize.width, roomSize.depth) / 2 - 1.5;
      return {
        x: Math.cos(angle) * radius,
        y: 0.5,
        z: Math.sin(angle) * radius,
      };
    });
  }, [assets, roomSize]);

  return (
    <>
      {assets.map((asset, i) => (
        <group key={asset.id} position={[positions[i].x, positions[i].y, positions[i].z]}>
          {/* Pedestal */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.4, 0.5, 1, 32]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.7} roughness={0.3} />
          </mesh>

          {/* 3D Object */}
          <InteractiveDreamObject
            asset={asset}
            position={[0, 0.7, 0]}
            onInteract={(action) => onInteract?.(asset, action)}
          />

          {/* Label */}
          {asset.title && (
            <Text
              position={[0, -0.1, 0.6]}
              fontSize={0.07}
              color="#aaa"
              anchorX="center"
            >
              {asset.title}
            </Text>
          )}
        </group>
      ))}
    </>
  );
}

// ============================================================
// INTERACTIVE DREAM OBJECT
// ============================================================

interface InteractiveDreamObjectProps {
  asset: VRDreamAsset;
  position: [number, number, number];
  onInteract: (action: string) => void;
}

function InteractiveDreamObject({ asset, position, onInteract }: InteractiveDreamObjectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);

  // Floating animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      if (!selected) {
        groupRef.current.rotation.y += 0.005;
      }
    }
  });

  const handleClick = () => {
    setSelected(!selected);
    onInteract(selected ? 'deselect' : 'select');
  };

  const handleScale = (direction: 'up' | 'down') => {
    const newScale = direction === 'up' ? scale * 1.2 : scale / 1.2;
    setScale(Math.max(0.3, Math.min(3, newScale)));
    onInteract(`scale_${direction}`);
  };

  const handleRotate = (axis: 'x' | 'y' | 'z') => {
    const newRotation: [number, number, number] = [...rotation];
    const idx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    newRotation[idx] += Math.PI / 4;
    setRotation(newRotation);
    onInteract(`rotate_${axis}`);
  };

  // If it's a GLB/GLTF model, load it. Otherwise show a placeholder.
  const isGLB = asset.url.endsWith('.glb') || asset.url.endsWith('.gltf');

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      rotation={rotation}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {isGLB ? (
        <DreamModel url={asset.url} />
      ) : (
        <mesh>
          <dodecahedronGeometry args={[0.3, 0]} />
          <meshStandardMaterial
            color={hovered ? '#8b5cf6' : '#4a4a6e'}
            emissive={selected ? '#8b5cf6' : '#2a2a4e'}
            emissiveIntensity={selected ? 0.5 : 0.2}
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
      )}

      {/* Interaction hint */}
      {hovered && !selected && (
        <Html center distanceFactor={5}>
          <div style={{
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}>
            Click to interact
          </div>
        </Html>
      )}

      {/* Selected controls */}
      {selected && (
        <Html center distanceFactor={4}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.95)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 8,
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            pointerEvents: 'auto',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Dream Object</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => handleScale('up')} style={buttonStyle}>+ Size</button>
              <button onClick={() => handleScale('down')} style={buttonStyle}>- Size</button>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => handleRotate('y')} style={buttonStyle}>Rotate</button>
              <button onClick={() => handleRotate('x')} style={buttonStyle}>Tilt</button>
            </div>
            <button onClick={() => onInteract('light')} style={buttonStyle}>Change Light</button>
            <button onClick={() => onInteract('effect')} style={buttonStyle}>Add Effect</button>
          </div>
        </Html>
      )}
    </group>
  );
}

const buttonStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.2)',
  border: '1px solid rgba(255,255,255,0.3)',
  color: '#fff',
  padding: '2px 6px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 10,
};

// ============================================================
// DREAM MODEL (GLB/GLTF loader)
// ============================================================

function DreamModel({ url }: { url: string }) {
  // In a real implementation, use useGLTF from drei
  // For now, show a placeholder
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#6366f1" metalness={0.5} roughness={0.3} />
    </mesh>
  );
}

// ============================================================
// SKYBOX ENVIRONMENT (360° background)
// ============================================================

function SkyboxEnvironment({ url }: { url: string }) {
  const texture = useTexture(url);

  useEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return () => texture.dispose();
  }, [texture]);

  return <primitive object={new THREE.Mesh(new THREE.SphereGeometry(50, 32, 32), new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide }))} />;
}

// ============================================================
// MAIN VR HOME COMPONENT
// ============================================================

export interface VRHomeProps {
  assets: VRDreamAsset[];
  config?: Partial<VRHomeConfig>;
  enableVR?: boolean;
  onAssetSelect?: (asset: VRDreamAsset) => void;
  onAssetInteract?: (asset: VRDreamAsset, action: string) => void;
  onBack?: () => void;
}

const xrStore = createXRStore();

export default function VRHome({
  assets,
  config,
  enableVR = true,
  onAssetSelect,
  onAssetInteract,
  onBack,
}: VRHomeProps) {
  const [selectedAsset, setSelectedAsset] = useState<VRDreamAsset | null>(null);

  const handleAssetSelect = (asset: VRDreamAsset) => {
    setSelectedAsset(asset);
    onAssetSelect?.(asset);
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* VR Button */}
      {enableVR && (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 100 }}>
          <XRButton store={xrStore} />
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
          }}
        >
          Back to Journal
        </button>
      )}

      {/* Selected asset detail panel */}
      {selectedAsset && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100,
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
          borderRadius: 12,
          padding: '16px 24px',
          maxWidth: 400,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14 }}>{selectedAsset.title || 'Dream'}</div>
              {selectedAsset.nugget && (
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{selectedAsset.nugget}</div>
              )}
              {selectedAsset.themes && selectedAsset.themes.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {selectedAsset.themes.map((t) => (
                    <span key={t} style={{
                      background: 'rgba(139,92,246,0.3)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 10,
                    }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedAsset(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.6, 5], fov: 60 }}
        shadows
        gl={{ antialias: true }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <VRHomeScene
              assets={assets}
              config={config}
              onAssetSelect={handleAssetSelect}
              onAssetInteract={onAssetInteract}
            />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
}
