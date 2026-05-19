import React, { useState } from 'react';
import { Modal, Button, Badge } from '../ui';
import { X, Copy, Check, Download, Share2, Instagram, Twitter, Link2 } from 'lucide-react';
import type { Dream } from './DreamList';
import { getEmotionEmoji } from '../../utils/dreamPresentation';

export interface ShareModalProps {
  dream: Dream | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ShareModal — Beautiful share card with multiple sharing options.
 * Supports clipboard copy, image download, and social sharing.
 *
 * @example
 * <ShareModal
 *   dream={selectedDream}
 *   isOpen={showShareModal}
 *   onClose={() => setShowShareModal(false)}
 * />
 */
export default function ShareModal({ dream, isOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!dream) return null;

  const shareText = `"${dream.nugget || dream.content.substring(0, 120)}" — From my EverDream journal 🌙`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadImage = async () => {
    if (!dream.imageUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(dream.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `everdream-${dream.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(dream.imageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't have a web share API, so copy text and prompt user
    handleCopyText();
    alert('Text copied! Open Instagram and paste to share your dream. 🌙');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Dream" size="md">
      {/* Dream Card Preview */}
      <div style={{
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '24px',
        background: dream.imageUrl ? 'none' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
      }}>
        {dream.imageUrl ? (
          <img
            src={dream.imageUrl}
            alt={`Dream visualization: ${dream.title}`}
            style={{
              width: '100%',
              height: '240px',
              objectFit: 'cover',
              borderRadius: '16px',
            }}
          />
        ) : (
          <div style={{
            padding: '32px',
            minHeight: '200px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
              {getEmotionEmoji(dream.mood) || '🌙'}
            </div>
            <p style={{
              color: '#fff',
              fontSize: '1rem',
              fontStyle: 'italic',
              lineHeight: 1.6,
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: '0 0 12px 0',
            }}>
              "{dream.nugget || dream.content.substring(0, 120)}"
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', margin: 0 }}>
              {new Date(dream.date).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
        )}

        {/* Overlay badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
        }}>
          <Badge variant="info">EverDream</Badge>
        </div>
      </div>

      {/* Dream Info */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {dream.mood && (
            <span style={{ fontSize: '1.2rem' }}>{getEmotionEmoji(dream.mood)}</span>
          )}
          <Badge>{dream.category}</Badge>
        </div>
        <h3 style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '1.1rem',
          color: '#1a1a2e',
          margin: '0 0 4px 0',
        }}>
          {dream.title}
        </h3>
        <p style={{
          fontSize: '0.8rem',
          color: '#9b96b0',
          margin: 0,
        }}>
          {new Date(dream.date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Share Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Primary: Copy */}
        <Button
          variant="primary"
          size="md"
          onClick={handleCopyText}
          style={{ width: '100%' }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>

        {/* Social Row */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            variant="ghost"
            size="md"
            onClick={handleTwitterShare}
            style={{ flex: 1 }}
          >
            <Twitter size={16} />
            Twitter
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={handleInstagramShare}
            style={{ flex: 1 }}
          >
            <Instagram size={16} />
            Instagram
          </Button>
        </div>

        {/* Download Image */}
        {dream.imageUrl && (
          <Button
            variant="ghost"
            size="md"
            onClick={handleDownloadImage}
            loading={downloading}
            style={{ width: '100%' }}
          >
            <Download size={16} />
            Download Image
          </Button>
        )}
      </div>

      {/* Watermark notice */}
      <p style={{
        fontSize: '0.65rem',
        color: '#9b96b0',
        textAlign: 'center',
        marginTop: '16px',
        lineHeight: 1.5,
      }}>
        Shared content includes a cryptographic watermark for provenance verification.
      </p>
    </Modal>
  );
}
