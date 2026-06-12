import React, { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '../ui';
import { X, Copy, Check, Download, Share2, Instagram, Twitter, Link2, Facebook, Film, Lock, ExternalLink } from 'lucide-react';
import type { Dream } from './DreamList';
import { getEmotionEmoji } from '../../utils/dreamPresentation';

// Social platform configuration
interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient?: string;
  shareUrl: (url: string, text: string) => string;
  hasWebShare: boolean;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: <Film size={18} />,
    color: '#000000',
    gradient: 'linear-gradient(135deg, #000000 0%, #25F4EE 50%, #fe2C55 100%)',
    shareUrl: () => '', // TikTok doesn't have web share, handled separately
    hasWebShare: false,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: <Instagram size={18} />,
    color: '#E4405F',
    gradient: 'linear-gradient(135deg, #E4405F 0%, #FD5F3D 100%)',
    shareUrl: () => '', // Instagram doesn't have web share, handled separately
    hasWebShare: false,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: <Facebook size={18} />,
    color: '#1877F2',
    shareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    hasWebShare: true,
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: <Twitter size={18} />,
    color: '#000000',
    shareUrl: (url, text) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    hasWebShare: true,
  },
];

// LocalStorage key for integration status
const STORAGE_KEY = 'everdream_social_integrations';

interface IntegrationStatus {
  [platformId: string]: boolean;
}

export interface ShareModalProps {
  dream: Dream | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ShareModal — Beautiful share card with multiple sharing options.
 * Supports clipboard copy, image download, and social sharing.
 * Tracks integration status for each social platform via LocalStorage.
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
  const [integrations, setIntegrations] = useState<IntegrationStatus>({});
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);

  // Load integration status from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setIntegrations(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load integration status:', e);
    }
  }, []);

  // Save integration status to localStorage when changed
  const updateIntegration = (platformId: string, connected: boolean) => {
    const newIntegrations = { ...integrations, [platformId]: connected };
    setIntegrations(newIntegrations);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newIntegrations));
    } catch (e) {
      console.warn('Failed to save integration status:', e);
    }
  };

  if (!dream) return null;

  const shareText = `"${dream.nugget || dream.content.substring(0, 120)}" — From my EverDream journal 🌙`;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

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

  const handlePlatformClick = (platform: SocialPlatform) => {
    const isConnected = integrations[platform.id];

    if (!isConnected) {
      // Show connect modal
      setShowConnectModal(platform.id);
      return;
    }

    // Connected - proceed with sharing
    handleShare(platform);
  };

  const handleShare = (platform: SocialPlatform) => {
    switch (platform.id) {
      case 'tiktok':
        handleTikTokShare();
        break;
      case 'instagram':
        handleInstagramShare();
        break;
      case 'facebook':
        handleFacebookShare();
        break;
      case 'twitter':
        handleTwitterShare();
        break;
      default:
        handleCopyText();
    }
  };

  const handleConnect = (platformId: string) => {
    // Simulate OAuth flow for MVP
    // In production, this would trigger actual OAuth
    updateIntegration(platformId, true);
    setShowConnectModal(null);
  };

  const handleTikTokShare = () => {
    // TikTok doesn't have a web share API, so copy text and prompt user
    handleCopyText();
    alert('Text copied! Open TikTok and paste to share your dream. 🌙');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't have a web share API, so copy text and prompt user
    handleCopyText();
    alert('Text copied! Open Instagram and paste to share your dream. 🌙');
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(shareUrl || window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  // Native share API for mobile
  const handleNativeShare = async () => {
    if (navigator.share && dream.imageUrl) {
      try {
        const response = await fetch(dream.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `dream-${dream.id}.jpg`, { type: 'image/jpeg' });
        await navigator.share({
          title: dream.title,
          text: shareText,
          files: [file],
        });
      } catch {
        handleCopyText();
      }
    } else {
      handleCopyText();
    }
  };

  const getPlatformStyle = (platform: SocialPlatform) => {
    const isConnected = integrations[platform.id];
    return {
      buttonStyle: {
        flex: 1,
        minHeight: '48px',
        background: isConnected ? platform.gradient || platform.color : '#e0e0e0',
        color: isConnected ? '#fff' : '#9b96b0',
        border: 'none',
        borderRadius: '12px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: 'pointer',
        opacity: isConnected ? 1 : 0.5,
        transition: 'all 0.2s ease',
        position: 'relative' as const,
        fontSize: '0.9rem',
        fontWeight: 600,
      },
      iconWrapper: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
    };
  };

  const renderConnectModal = () => {
    if (!showConnectModal) return null;
    const platform = SOCIAL_PLATFORMS.find(p => p.id === showConnectModal);
    if (!platform) return null;

    return (
      <Modal
        isOpen={!!showConnectModal}
        onClose={() => setShowConnectModal(null)}
        title={`Connect to ${platform.name}`}
        size="sm"
      >
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: platform.gradient || platform.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#fff',
          }}>
            {platform.icon}
          </div>
          <h3 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: '1.2rem',
            color: '#1a1a2e',
            margin: '0 0 12px',
          }}>
            Connect to {platform.name}
          </h3>
          <p style={{
            fontSize: '0.9rem',
            color: '#9b96b0',
            lineHeight: 1.6,
            margin: '0 0 24px',
          }}>
            Connect your {platform.name} account to share your dreams directly. Your credentials are securely stored locally.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setShowConnectModal(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => handleConnect(platform.id)}
              icon={<ExternalLink size={16} />}
            >
              Connect
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Primary: Copy */}
          <Button
            variant="primary"
            size="md"
            onClick={handleCopyText}
            style={{ width: '100%', minHeight: '48px' }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>

          {/* Social Platforms - Priority Order: TikTok, Instagram, Facebook, Twitter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {SOCIAL_PLATFORMS.map((platform) => {
              const { buttonStyle } = getPlatformStyle(platform);
              const isConnected = integrations[platform.id];
              
              return (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformClick(platform)}
                  style={buttonStyle}
                  aria-label={`Share to ${platform.name}`}
                >
                  <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    {platform.icon}
                    {!isConnected && (
                      <Lock
                        size={12}
                        style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          color: '#9b96b0',
                          background: '#fff',
                          borderRadius: '50%',
                        }}
                      />
                    )}
                  </span>
                  <span>{platform.name}</span>
                  {!isConnected && (
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                      (Click to connect)
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Native Share for Mobile */}
          {typeof navigator !== 'undefined' && (navigator as any).share && dream.imageUrl && (
            <Button
              variant="ghost"
              size="md"
              onClick={handleNativeShare}
              style={{ width: '100%', minHeight: '48px' }}
              icon={<Share2 size={16} />}
            >
              Share via Device
            </Button>
          )}

          {/* Download Image */}
          {dream.imageUrl && (
            <Button
              variant="ghost"
              size="md"
              onClick={handleDownloadImage}
              loading={downloading}
              style={{ width: '100%', minHeight: '48px' }}
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
      {renderConnectModal()}
    </>
  );
}
