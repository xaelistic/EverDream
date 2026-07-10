/**
 * Dream Asset Viewer Component
 *
 * Displays generated dream assets (images, 360° environments, 3D models, videos)
 * with options to view in VR, download, or share.
 */

import React, { useState } from 'react';
import type { VRDreamAsset } from '../vr/VRHome';

interface DreamAssetViewerProps {
  assets: VRDreamAsset[];
  dreamId: string;
  onEnterVR?: () => void;
  onDownload?: (asset: VRDreamAsset) => void;
  onShare?: (asset: VRDreamAsset) => void;
}

export default function DreamAssetViewer({
  assets,
  onEnterVR,
  onDownload,
  onShare,
}: DreamAssetViewerProps) {
  const [selectedAsset, setSelectedAsset] = useState<VRDreamAsset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'fullscreen' | 'vr'>('grid');

  const images = assets.filter((a) => a.type === 'image' || a.type === 'parallax');
  const videos = assets.filter((a) => a.type === 'video');
  const skyboxes = assets.filter((a) => a.type === 'skybox');
  const meshes = assets.filter((a) => a.type === 'mesh_3d');

  if (assets.length === 0) {
    return (
      <div style={{
        padding: 40,
        textAlign: 'center',
        color: '#666',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>No assets yet</div>
        <div style={{ fontSize: 14 }}>
          Dream assets are generated overnight. Check back tomorrow to see your dream come to life.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Dream Assets</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {onEnterVR && (
            <button
              onClick={onEnterVR}
              style={{
                background: '#8b5cf6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Enter VR
            </button>
          )}
        </div>
      </div>

      {/* Skybox / 360° Environments */}
      {skyboxes.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, color: '#8b5cf6', marginBottom: 12 }}>360° Environments</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {skyboxes.map((asset) => (
              <SkyboxCard key={asset.id} asset={asset} onClick={() => setSelectedAsset(asset)} />
            ))}
          </div>
        </section>
      )}

      {/* Dream Images */}
      {images.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, color: '#06b6d4', marginBottom: 12 }}>Dream Images</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {images.map((asset) => (
              <ImageCard key={asset.id} asset={asset} onClick={() => setSelectedAsset(asset)} />
            ))}
          </div>
        </section>
      )}

      {/* 3D Objects */}
      {meshes.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, color: '#f59e0b', marginBottom: 12 }}>3D Objects</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {meshes.map((asset) => (
              <MeshCard key={asset.id} asset={asset} onClick={() => setSelectedAsset(asset)} />
            ))}
          </div>
        </section>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, color: '#ef4444', marginBottom: 12 }}>Dream Videos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {videos.map((asset) => (
              <VideoCard key={asset.id} asset={asset} onClick={() => setSelectedAsset(asset)} />
            ))}
          </div>
        </section>
      )}

      {/* Fullscreen viewer */}
      {selectedAsset && (
        <FullscreenViewer
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onDownload={onDownload}
          onShare={onShare}
        />
      )}
    </div>
  );
}

// ============================================================
// CARD COMPONENTS
// ============================================================

function ImageCard({ asset, onClick }: { asset: VRDreamAsset; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1a1a2e',
        transition: 'transform 0.2s',
      }}
    >
      <img
        src={asset.thumbnailUrl || asset.url}
        alt={asset.title || 'Dream'}
        style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
      />
      {asset.nugget && (
        <div style={{ padding: 8, fontSize: 12, color: '#aaa' }}>
          {asset.nugget.substring(0, 60)}...
        </div>
      )}
    </div>
  );
}

function SkyboxCard({ asset, onClick }: { asset: VRDreamAsset; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1a1a2e',
        border: '2px solid #8b5cf6',
      }}
    >
      <img
        src={asset.thumbnailUrl || asset.url}
        alt={asset.title || '360° Environment'}
        style={{ width: '100%', aspectRatio: '2/1', objectFit: 'cover' }}
      />
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#8b5cf6' }}>360° Environment</div>
        {asset.nugget && (
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{asset.nugget}</div>
        )}
      </div>
    </div>
  );
}

function MeshCard({ asset, onClick }: { asset: VRDreamAsset; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1a1a2e',
        border: '2px solid #f59e0b',
        padding: 16,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 8 }}>🎲</div>
      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#f59e0b' }}>3D Object</div>
      {asset.title && (
        <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{asset.title}</div>
      )}
    </div>
  );
}

function VideoCard({ asset, onClick }: { asset: VRDreamAsset; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1a1a2e',
        border: '2px solid #ef4444',
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio: '16/9',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
      }}>
        ▶
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', color: '#ef4444' }}>Dream Video</div>
        {asset.title && (
          <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>{asset.title}</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FULLSCREEN VIEWER
// ============================================================

function FullscreenViewer({
  asset,
  onClose,
  onDownload,
  onShare,
}: {
  asset: VRDreamAsset;
  onClose: () => void;
  onDownload?: (asset: VRDreamAsset) => void;
  onShare?: (asset: VRDreamAsset) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.95)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1001,
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          color: '#fff',
          borderRadius: 8,
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: 18,
        }}
      >
        x
      </button>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}>
        {asset.type === 'image' || asset.type === 'parallax' ? (
          <img
            src={asset.url}
            alt={asset.title || 'Dream'}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
          />
        ) : asset.type === 'skybox' ? (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🌐</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>360° Environment</div>
            <div style={{ fontSize: 14, color: '#aaa' }}>
              Enter VR mode to view this environment
            </div>
          </div>
        ) : asset.type === 'mesh_3d' ? (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎲</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>3D Object</div>
            <div style={{ fontSize: 14, color: '#aaa' }}>
              Enter VR mode to interact with this object
            </div>
          </div>
        ) : (
          <video
            src={asset.url}
            controls
            autoPlay
            loop
            muted
            playsInline
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }}
          />
        )}
      </div>

      {/* Actions */}
      <div style={{
        padding: 16,
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
      }}>
        {onDownload && (
          <button
            onClick={() => onDownload(asset)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            Download
          </button>
        )}
        {onShare && (
          <button
            onClick={() => onShare(asset)}
            style={{
              background: 'rgba(139,92,246,0.3)',
              border: '1px solid rgba(139,92,246,0.5)',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            Share
          </button>
        )}
      </div>
    </div>
  );
}
