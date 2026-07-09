import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../ui';
import {
  Copy, Check, Download, Share2, Instagram, Twitter, Facebook, Film,
  MessageCircle, Smartphone, Link2,
} from 'lucide-react';
import type { Dream } from './DreamList';
import { getEmotionEmoji } from '../../utils/dreamPresentation';
import {
  buildSharePayload,
  canNativeShare,
  copyToClipboard,
  downloadDreamImage,
  generateShareCardImage,
  getDreamImageUrl,
  toShareableDream,
  shareNative,
  shareToPlatform,
  createPublicShareLink,
  type ShareableDream,
  type SocialProviderId,
} from '../../lib/social/shareService';
import { useSocialAuth } from '../../hooks/use-social-auth';
import { isProviderLinkedInDb } from '../../lib/social/socialAccounts';

export interface ShareModalProps {
  dream: Dream | ShareableDream | Record<string, unknown> | null;
  isOpen: boolean;
  onClose: () => void;
}

type PlatformAction = {
  id: SocialProviderId;
  name: string;
  icon: React.ReactNode;
  className: string;
  hint?: string;
};

const PLATFORM_ACTIONS: PlatformAction[] = [
  { id: 'facebook', name: 'Facebook', icon: <Facebook size={16} />, className: 'bg-[#1877F2] hover:bg-[#166fe0] text-white' },
  { id: 'instagram', name: 'Instagram', icon: <Instagram size={16} />, className: 'bg-gradient-to-r from-[#E4405F] to-[#FD5F3D] text-white', hint: 'API post if linked, else save+copy' },
  { id: 'tiktok', name: 'TikTok', icon: <Film size={16} />, className: 'bg-ink text-cream', hint: 'API post if linked, else save+copy' },
  { id: 'twitter', name: 'X', icon: <Twitter size={16} />, className: 'bg-ink text-cream' },
  { id: 'whatsapp', name: 'WhatsApp', icon: <MessageCircle size={16} />, className: 'bg-[#25D366] hover:bg-[#1ebe57] text-white' },
  { id: 'line', name: 'LINE', icon: <span className="text-xs font-bold">LINE</span>, className: 'bg-[#06C755] hover:bg-[#05b34c] text-white' },
];

export default function ShareModal({ dream, isOpen, onClose }: ShareModalProps) {
  const { accounts } = useSocialAuth();
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [cardGenerating, setCardGenerating] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [publicLink, setPublicLink] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPublicLink(null);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!dream) return null;

  const shareable = 'content' in dream && typeof dream.content === 'string'
    ? (dream as ShareableDream)
    : toShareableDream(dream as Record<string, unknown>);
  const payload = buildSharePayload(shareable);
  const imageUrl = getDreamImageUrl(shareable);

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleCopy = async () => {
    await copyToClipboard(`${payload.text}\n${payload.url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    const result = await shareNative(payload);
    if (result.ok && result.method === 'native') onClose();
    if (result.message) showStatus(result.message);
  };

  const handlePlatformShare = async (providerId: SocialProviderId) => {
    setSharing(providerId);
    try {
      const result = await shareToPlatform(providerId, shareable, payload);
      if (result.message) showStatus(result.message);
      if (result.ok && result.method === 'api') onClose();
    } finally {
      setSharing(null);
    }
  };

  const handleCreateLink = async () => {
    const result = await createPublicShareLink(shareable, payload);
    if (!result.ok || !result.url) {
      showStatus(result.message || 'Could not create share link');
      return;
    }
    setPublicLink(result.url);
    await copyToClipboard(result.url);
    showStatus('Public link copied — great for Facebook OG previews.');
  };

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    setDownloading(true);
    try {
      await downloadDreamImage(imageUrl, `everdream-${shareable.id}`);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCard = async () => {
    setCardGenerating(true);
    try {
      await generateShareCardImage(shareable);
      showStatus('Share card downloaded.');
    } finally {
      setCardGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Dream" size="md">
      <div className="space-y-5">
        <div
          className="rounded-3xl overflow-hidden border border-line shadow-paper"
          style={{ background: imageUrl ? undefined : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={`Dream: ${shareable.title || 'Dream'}`} className="w-full h-56 object-cover" />
          ) : (
            <div className="p-8 min-h-[200px] flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">{getEmotionEmoji(shareable.mood) || '🌙'}</div>
              <p className="text-cream font-serif italic leading-relaxed">
                "{shareable.nugget || shareable.content.substring(0, 120)}"
              </p>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-serif text-lg text-ink">{shareable.title || 'Untitled dream'}</h3>
          <p className="text-xs text-muted mt-1">
            {new Date(shareable.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {canNativeShare() && (
          <Button
            variant="primary"
            size="md"
            onClick={handleNativeShare}
            className="w-full min-h-[52px] !bg-sage hover:!bg-sageDark"
            icon={<Smartphone size={18} />}
          >
            Share to apps (WhatsApp, LINE, …)
          </Button>
        )}

        <Button
          variant="ghost"
          size="md"
          onClick={handleCreateLink}
          className="w-full min-h-[44px]"
          icon={<Link2 size={16} />}
        >
          {publicLink ? 'Link copied' : 'Create public share link'}
        </Button>

        {publicLink && (
          <p className="text-[11px] text-muted break-all text-center">{publicLink}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_ACTIONS.map((platform) => {
            const linked = isProviderLinkedInDb(accounts, platform.id);
            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => handlePlatformShare(platform.id)}
                disabled={sharing === platform.id}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-sm font-semibold transition disabled:opacity-60 ${platform.className}`}
                title={platform.hint}
              >
                {platform.icon}
                <span>{platform.name}</span>
                {linked && <span className="text-[10px] opacity-80">✓</span>}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="ghost" size="md" onClick={handleCopy} className="w-full min-h-[44px]">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy caption'}
          </Button>
          <Button variant="ghost" size="md" onClick={handleDownloadCard} loading={cardGenerating} className="w-full min-h-[44px]" icon={<Download size={16} />}>
            Download card
          </Button>
        </div>

        {imageUrl && (
          <Button variant="ghost" size="md" onClick={handleDownloadImage} loading={downloading} className="w-full min-h-[44px]" icon={<Share2 size={16} />}>
            Download dream image
          </Button>
        )}

        {statusMessage && <p className="text-xs text-center text-muted leading-relaxed">{statusMessage}</p>}

        <p className="text-[11px] text-center text-muted leading-relaxed">
          Link Meta in Profile for API posting to your Facebook Page and Instagram Business account.
        </p>
      </div>
    </Modal>
  );
}