import React, { useState } from 'react';
import { Badge, Button, Spinner, Modal } from '../ui';
import { Card } from '../ui/Card';
import { ArrowLeft, Share2, Download, Sparkles, Brain, Eye, Image, Copy, Check } from 'lucide-react';
import { getEmotionEmoji } from '../../utils/dreamPresentation';
import type { Dream } from './DreamList';
import DreamVisualizer from './DreamVisualizer';

export interface DreamDetailProps {
  dream: Dream | null;
  isOpen?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  onShare?: (dream: Dream) => void;
  onDownloadImage?: (dream: Dream) => void;
  loading?: boolean;
}

/**
 * DreamDetail — Full dream view with content, AI analysis section,
 * generated image display, and share button.
 *
 * Can be used as a standalone page or inside a Modal.
 *
 * @example
 * // As modal
 * <DreamDetail
 *   dream={selectedDream}
 *   isOpen={!!selectedDream}
 *   onClose={() => setSelectedDream(null)}
 * />
 *
 * // As page
 * <DreamDetail
 *   dream={dream}
 *   onBack={() => navigate('/dreams')}
 * />
 */
export default function DreamDetail({
  dream,
  isOpen,
  onClose,
  onBack,
  onShare,
  onDownloadImage,
  loading = false,
}: DreamDetailProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // If used as modal
  if (isOpen !== undefined) {
    return (
      <Modal isOpen={isOpen} onClose={onClose || (() => {})} title={dream?.title || 'Dream Detail'} size="lg" data-component="DreamDetail">
        {dream && <DreamDetailContent
          dream={dream}
          onBack={onClose}
          onShare={onShare}
          onDownloadImage={onDownloadImage}
          loading={loading}
          imageLoaded={imageLoaded}
          setImageLoaded={setImageLoaded}
          copied={copied}
          setCopied={setCopied}
        />}
      </Modal>
    );
  }

  // If used as standalone page
  if (!dream) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <p style={{ color: '#9b96b0' }}>No dream selected.</p>
        {onBack && <Button variant="ghost" onClick={onBack}>Go Back</Button>}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <DreamDetailContent
        dream={dream}
        onBack={onBack}
        onShare={onShare}
        onDownloadImage={onDownloadImage}
        loading={loading}
        imageLoaded={imageLoaded}
        setImageLoaded={setImageLoaded}
        copied={copied}
        setCopied={setCopied}
      />
    </div>
  );
}

/* ─── Internal Content Component ─── */

interface DetailContentProps {
  dream: Dream;
  onBack?: () => void;
  onShare?: (dream: Dream) => void;
  onDownloadImage?: (dream: Dream) => void;
  loading: boolean;
  imageLoaded: boolean;
  setImageLoaded: (v: boolean) => void;
  copied: boolean;
  setCopied: (v: boolean) => void;
}

function DreamDetailContent({
  dream,
  onBack,
  onShare,
  onDownloadImage,
  loading,
  imageLoaded,
  setImageLoaded,
  copied,
  setCopied,
}: DetailContentProps) {
  const categoryVariant = getCategoryVariant(dream.category);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(dream.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = dream.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px' }}>
        <Spinner size={40} />
        <p style={{ color: '#9b96b0', marginTop: '16px', fontSize: '0.85rem' }}>
          Loading dream details...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#9b96b0', fontSize: '0.8rem', fontWeight: 600,
            padding: '8px 0', marginBottom: '16px',
          }}
        >
          <ArrowLeft size={16} />
          Back to Journal
        </button>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          {dream.mood && (
            <span style={{ fontSize: '1.5rem' }}>{getEmotionEmoji(dream.mood)}</span>
          )}
          <Badge variant={categoryVariant}>{dream.category}</Badge>
          <span style={{ fontSize: '0.75rem', color: '#9b96b0' }}>
            {formatFullDate(dream.date)}
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '2rem',
          color: '#1a1a2e',
          margin: 0,
          lineHeight: 1.3,
        }}>
          {dream.title}
        </h1>
      </div>

      {/* Dream Content */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{
            fontSize: '0.75rem', fontWeight: 600, color: '#4a4860',
            textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
          }}>
            Dream Narrative
          </h3>
          <button
            onClick={handleCopyText}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: copied ? '#5ec4a8' : '#9b96b0',
              fontSize: '0.7rem', fontWeight: 600,
              transition: 'color 180ms ease-out',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p style={{
          fontSize: '0.9rem',
          color: '#4a4860',
          lineHeight: 1.9,
          margin: 0,
          whiteSpace: 'pre-wrap',
        }}>
          {dream.content}
        </p>
      </Card>

      {/* Dream Visualizer — NEW */}
      <DreamVisualizer
        dreamId={dream.id}
        dreamText={dream.content}
        dreamTitle={dream.title}
        existingImageUrl={dream.imageUrl}
        onImageGenerated={(asset) => {
          // Update the dream's imageUrl in-place
          dream.imageUrl = asset.url;
        }}
      />

      {/* Legacy Generated Image (for backwards compat) */}
      {dream.imageUrl && !dream.aiAnalysis && (
        <Card style={{ marginBottom: '24px', overflow: 'hidden', padding: 0 }}>
          <div style={{ position: 'relative' }}>
            {!imageLoaded && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '300px', background: 'rgba(168,237,220,0.08)',
              }}>
                <Spinner size={32} />
              </div>
            )}
            <img
              src={dream.imageUrl}
              alt={`Dream visualization: ${dream.title}`}
              onLoad={() => setImageLoaded(true)}
              style={{
                width: '100%',
                display: imageLoaded ? 'block' : 'none',
                borderRadius: '16px 16px 0 0',
              }}
            />
          </div>
          <div style={{
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Image size={16} color="#9b8fd4" />
              <span style={{ fontSize: '0.75rem', color: '#9b8fd4', fontWeight: 600 }}>
                AI-Generated Visualization
              </span>
            </div>
            {onDownloadImage && (
              <Button variant="ghost" size="sm" onClick={() => onDownloadImage(dream)}>
                <Download size={14} />
                Download
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* AI Analysis Section */}
      {dream.aiAnalysis && (
        <Card style={{ marginBottom: '24px', background: 'rgba(200,184,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Brain size={18} color="#9b8fd4" />
            <h3 style={{
              fontSize: '0.85rem', fontWeight: 700, color: '#9b8fd4',
              textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
            }}>
              AI Dream Analysis
            </h3>
          </div>

          {/* Emotion & Valence */}
          {(dream.aiAnalysis.emotion || typeof dream.aiAnalysis.valence === 'number') && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                fontSize: '0.7rem', fontWeight: 600, color: '#9b96b0',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px',
              }}>
                Emotional Tone
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {dream.aiAnalysis.emotion && (
                  <Badge variant="default">{dream.aiAnalysis.emotion}</Badge>
                )}
                {typeof dream.aiAnalysis.valence === 'number' && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#9b96b0',
                  }}>
                    <span>Valence:</span>
                    <div style={{
                      width: '100px',
                      height: '6px',
                      background: 'linear-gradient(to right, #c44569 0%, #9b96b0 50%, #5ec4a8 100%)',
                      borderRadius: '3px',
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute',
                        left: `${((dream.aiAnalysis.valence || 0) + 1) / 2 * 100}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '12px',
                        height: '12px',
                        background: '#9b8fd4',
                        borderRadius: '50%',
                        border: '2px solid white',
                      }} />
                    </div>
                    <span>{(dream.aiAnalysis.valence || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Symbols */}
          {dream.aiAnalysis.symbols && dream.aiAnalysis.symbols.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                fontSize: '0.7rem', fontWeight: 600, color: '#9b96b0',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px',
              }}>
                <Eye size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Dream Symbols
              </h4>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {dream.aiAnalysis.symbols.map((symbol, i) => (
                  <Badge key={i} variant="info">{symbol}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Themes */}
          {dream.aiAnalysis.themes && dream.aiAnalysis.themes.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                fontSize: '0.7rem', fontWeight: 600, color: '#9b96b0',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px',
              }}>
                <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} />
                Themes
              </h4>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {dream.aiAnalysis.themes.map((theme, i) => (
                  <Badge key={i} variant="default">{theme}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Narrative */}
          {dream.aiAnalysis.narrative && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                fontSize: '0.7rem', fontWeight: 600, color: '#9b96b0',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px',
              }}>
                Enhanced Narrative
              </h4>
              <p style={{
                fontSize: '0.85rem',
                color: '#4a4860',
                lineHeight: 1.7,
                margin: 0,
                fontStyle: 'italic',
              }}>
                "{dream.aiAnalysis.narrative}"
              </p>
            </div>
          )}

          {/* Interpretation */}
          {dream.aiAnalysis.interpretation && (
            <div>
              <h4 style={{
                fontSize: '0.7rem', fontWeight: 600, color: '#9b96b0',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px',
              }}>
                Interpretation
              </h4>
              {typeof dream.aiAnalysis.interpretation === 'string' ? (
                <p style={{
                  fontSize: '0.85rem',
                  color: '#4a4860',
                  lineHeight: 1.7,
                  margin: 0,
                  fontStyle: 'italic',
                }}>
                  "{dream.aiAnalysis.interpretation}"
                </p>
              ) : (
                <>
                  {dream.aiAnalysis.interpretation.meaning && (
                    <p style={{
                      fontSize: '0.85rem',
                      color: '#4a4860',
                      lineHeight: 1.7,
                      margin: '0 0 12px 0',
                    }}>
                      <strong>Meaning:</strong> {dream.aiAnalysis.interpretation.meaning}
                    </p>
                  )}
                  {dream.aiAnalysis.interpretation.commonPattern && (
                    <p style={{
                      fontSize: '0.85rem',
                      color: '#4a4860',
                      lineHeight: 1.7,
                      margin: '0 0 12px 0',
                    }}>
                      <strong>Common Pattern:</strong> {dream.aiAnalysis.interpretation.commonPattern}
                    </p>
                  )}
                  {dream.aiAnalysis.interpretation.symbols && Object.keys(dream.aiAnalysis.interpretation.symbols).length > 0 && (
                    <div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#9b96b0',
                        margin: '0 0 8px 0',
                        fontWeight: 600,
                      }}>
                        Symbol Meanings:
                      </p>
                      <ul style={{
                        fontSize: '0.8rem',
                        color: '#4a4860',
                        lineHeight: 1.6,
                        margin: 0,
                        paddingLeft: '16px',
                      }}>
                        {Object.entries(dream.aiAnalysis.interpretation.symbols).map(([symbol, meaning]) => (
                          <li key={symbol}>
                            <strong>{symbol}:</strong> {meaning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', flexWrap: 'wrap' }}>
        {onShare && (
          <Button variant="primary" size="md" onClick={() => onShare(dream)}>
            <Share2 size={16} />
            Share Dream
          </Button>
        )}
      </div>
    </>
  );
}

/* ─── Helpers ─── */

function getCategoryVariant(category: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
  const map: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    normal: 'default',
    lucid: 'info',
    nightmare: 'error',
    recurring: 'warning',
    prophetic: 'success',
    adventure: 'success',
    peaceful: 'success',
    anxiety: 'warning',
  };
  return map[category] || 'default';
}

function formatFullDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
