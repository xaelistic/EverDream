import React, { useState, useCallback } from 'react';
import { Sparkles, Download, RefreshCw, Wand2 } from 'lucide-react';
import { generateDreamImage } from '../../modules/sleep/dreamAssetGenerator';
import type { DreamAsset } from '../../modules/sleep/types';
import { Button, Spinner, Card } from '../ui';

interface DreamVisualizerProps {
  dreamId: string;
  dreamText: string;
  dreamTitle?: string;
  existingImageUrl?: string;
  onImageGenerated?: (asset: DreamAsset) => void;
}

/**
 * DreamVisualizer — "Visualize Dream" button + image display.
 *
 * When clicked, calls generateDreamImage(dreamText) and shows the result.
 * Shows a loading spinner while generating.
 * Displays the generated image with a "Save/Download" button.
 * Works with Pollinations (free, no API key needed).
 *
 * @example
 * <DreamVisualizer
 *   dreamId={dream.id}
 *   dreamText={dream.content}
 *   dreamTitle={dream.title}
 *   onImageGenerated={(asset) => saveToDream(dream.id, asset.url)}
 * />
 */
export default function DreamVisualizer({
  dreamId,
  dreamText,
  dreamTitle,
  existingImageUrl,
  onImageGenerated,
}: DreamVisualizerProps) {
  const [asset, setAsset] = useState<DreamAsset | null>(
    existingImageUrl
      ? {
          id: `${dreamId}-existing`,
          prompt: dreamText,
          url: existingImageUrl,
          source: 'pollinations',
          style: 'dreamlike',
          generatedAt: new Date().toISOString(),
        }
      : null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(!!existingImageUrl);

  const handleVisualize = useCallback(async () => {
    setError(null);
    setIsGenerating(true);
    setImageLoaded(false);

    try {
      const result = await generateDreamImage(dreamText, 'dreamlike');
      setAsset(result);
      onImageGenerated?.(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate image';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [dreamText, onImageGenerated]);

  const handleDownload = useCallback(() => {
    if (!asset?.url) return;

    // Create a download link
    const a = document.createElement('a');
    a.href = asset.url;
    a.download = `dream-${dreamId}-${Date.now()}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [asset, dreamId]);

  return (
    <Card style={{ marginBottom: '24px' }} data-component="DreamVisualizer">
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wand2 size={18} color="#9b8fd4" />
          <h3 style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#9b8fd4',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: 0,
          }}>
            Dream Visualization
          </h3>
        </div>
      </div>

      {/* Generate Button */}
      {!asset && !isGenerating && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{
            fontSize: '0.8rem',
            color: '#9b96b0',
            marginBottom: '16px',
            lineHeight: 1.6,
          }}>
            Generate an AI visualization of your dream. Powered by Pollinations — free, no API key needed.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={handleVisualize}
            icon={<Sparkles size={16} />}
          >
            Visualize Dream
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          gap: '16px',
        }}>
          <Spinner size={40} color="#9b8fd4" />
          <span style={{
            fontSize: '0.85rem',
            color: '#9b96b0',
            textAlign: 'center',
          }}>
            Visualizing your dream...
            <br />
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
              This may take 10-30 seconds
            </span>
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '16px',
          background: 'rgba(232,143,160,0.1)',
          border: '1px solid rgba(232,143,160,0.3)',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.8rem', color: '#e88fa0', marginBottom: '12px' }}>
            {error}
          </p>
          <Button variant="ghost" size="sm" onClick={handleVisualize} icon={<RefreshCw size={14} />}>
            Try Again
          </Button>
        </div>
      )}

      {/* Generated Image */}
      {asset && !isGenerating && (
        <div>
          <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
            {!imageLoaded && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '300px',
                background: 'rgba(168,237,220,0.08)',
              }}>
                <Spinner size={32} />
              </div>
            )}
            <img
              src={asset.url}
              alt={`Dream visualization: ${dreamTitle || 'Your dream'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              style={{
                width: '100%',
                display: imageLoaded ? 'block' : 'none',
                borderRadius: '12px',
              }}
            />
          </div>

          {/* Image Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(168,237,220,0.15)',
          }}>
            <span style={{
              fontSize: '0.65rem',
              color: '#9b96b0',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              {asset.source === 'pollinations' ? '✨ Pollinations.ai' : asset.source === 'fallback' ? '📷 Stock Photo' : `✨ ${asset.source}`}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="ghost" size="sm" onClick={handleDownload} icon={<Download size={14} />}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleVisualize} icon={<RefreshCw size={14} />}>
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
