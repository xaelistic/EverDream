import React, { useState, useCallback } from 'react';
import { FEATURE_NFT_UI_ENABLED } from '../../config/features';
import { Button, Card, Modal, Badge, Spinner } from '../ui';
import { Award, ExternalLink, Check, Wallet, Copy } from 'lucide-react';
import {
  getOrCreateWallet,
  createDreamNFT,
  mintNFT,
  saveNFT,
  exportNFTMetadata,
  type DreamNFT,
  type WalletIdentity,
} from '../../lib/nft';
import type { Dream } from './DreamList';

interface NFTMintButtonProps {
  dream: Dream;
  onMinted?: (nft: DreamNFT) => void;
}

/**
 * NFTMintButton — "Mint as NFT" button for the dream detail page.
 *
 * Shows wallet address, displays NFT metadata preview before minting,
 * and after mint shows a "View on OpenSea" link (simulated).
 *
 * @example
 * <NFTMintButton dream={dream} onMinted={(nft) => console.log('Minted!', nft)} />
 */
export default function NFTMintButton({ dream, onMinted }: NFTMintButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [wallet, setWallet] = useState<WalletIdentity | null>(null);
  const [nft, setNft] = useState<DreamNFT | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = useCallback(() => {
    setError(null);
    setNft(null);
    const w = getOrCreateWallet();
    setWallet(w);
    setShowModal(true);
  }, []);

  const handleMint = useCallback(async () => {
    if (!wallet) return;
    setError(null);
    setIsMinting(true);

    try {
      // Create NFT from dream
      const newNFT = createDreamNFT(
        {
          id: dream.id,
          content: dream.content,
          category: dream.category,
          themes: dream.aiAnalysis?.themes || [],
          emotion: dream.mood || 'neutral',
          symbols: dream.aiAnalysis?.symbols || [],
          narrative: dream.aiAnalysis?.interpretation || dream.content,
          nugget: dream.content.substring(0, 100),
          generatedImage: dream.imageUrl ? { url: dream.imageUrl } : undefined,
        },
        wallet
      );

      // Mint the NFT (simulated)
      const minted = await mintNFT(newNFT);
      saveNFT(minted);

      setNft(minted);
      onMinted?.(minted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Minting failed');
    } finally {
      setIsMinting(false);
    }
  }, [wallet, dream, onMinted]);

  const handleCopyAddress = useCallback(() => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [wallet]);

  const handleDownloadMetadata = useCallback(() => {
    if (!nft) return;
    const metadata = exportNFTMetadata(nft);
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-nft-${nft.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nft]);

  if (!FEATURE_NFT_UI_ENABLED) {
    return null;
  }

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={handleOpen}
        icon={<Award size={16} />}
      >
        Mint as NFT
      </Button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Mint Dream NFT" size="md">
        {/* Wallet Section */}
        {wallet && (
          <Card style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Wallet size={16} color="#5ec4a8" />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4a4860', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Wallet
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <code style={{
                fontSize: '0.75rem',
                color: '#9b96b0',
                fontFamily: 'monospace',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {wallet.address}
              </code>
              <button
                onClick={handleCopyAddress}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#5ec4a8' : '#9b96b0' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#9b96b0', margin: '8px 0 0' }}>
              Display name: {wallet.displayName}
            </p>
          </Card>
        )}

        {/* NFT Metadata Preview */}
        <Card style={{ marginBottom: '20px', background: 'rgba(200,184,255,0.06)' }}>
          <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9b8fd4', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            NFT Metadata Preview
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#9b96b0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Name</span>
              <p style={{ fontSize: '0.85rem', color: '#4a4860', margin: '2px 0 0' }}>
                {dream.title || 'Untitled Dream'}
              </p>
            </div>
            <div>
              <span style={{ fontSize: '0.65rem', color: '#9b96b0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Category</span>
              <div style={{ marginTop: '4px' }}>
                <Badge variant={dream.category === 'nightmare' ? 'error' : dream.category === 'lucid' ? 'info' : 'success'}>
                  {dream.category}
                </Badge>
              </div>
            </div>
            {dream.aiAnalysis && (
              <div>
                <span style={{ fontSize: '0.65rem', color: '#9b96b0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Themes</span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {dream.aiAnalysis.themes.map((t, i) => (
                    <Badge key={i} variant="default">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {dream.imageUrl && (
              <div>
                <span style={{ fontSize: '0.65rem', color: '#9b96b0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Artwork</span>
                <img
                  src={dream.imageUrl}
                  alt="Dream artwork"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', marginTop: '4px' }}
                />
              </div>
            )}
          </div>
        </Card>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(232,143,160,0.1)',
            border: '1px solid rgba(232,143,160,0.3)',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '0.8rem', color: '#e88fa0', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Minting Result */}
        {nft && nft.status === 'minted' && (
          <Card style={{ marginBottom: '20px', background: 'rgba(94,196,168,0.08)', border: '1px solid rgba(94,196,168,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Check size={18} color="#5ec4a8" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#5ec4a8' }}>
                NFT Minted Successfully!
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#4a4860' }}>
              <div><strong>Token ID:</strong> <code>{nft.tokenId}</code></div>
              <div><strong>Contract:</strong> <code style={{ fontSize: '0.65rem' }}>{nft.contractAddress?.slice(0, 10)}...</code></div>
              <div><strong>Tx Hash:</strong> <code style={{ fontSize: '0.65rem' }}>{nft.txHash?.slice(0, 10)}...</code></div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <Button variant="ghost" size="sm" onClick={handleDownloadMetadata}>
                Download Metadata
              </Button>
              <Button variant="ghost" size="sm" icon={<ExternalLink size={14} />}>
                View on OpenSea
              </Button>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="md" onClick={() => setShowModal(false)}>
            {nft?.status === 'minted' ? 'Close' : 'Cancel'}
          </Button>
          {!nft && (
            <Button
              variant="primary"
              size="md"
              loading={isMinting}
              onClick={handleMint}
              icon={<Award size={16} />}
            >
              {isMinting ? 'Minting...' : 'Confirm Mint'}
            </Button>
          )}
        </div>
      </Modal>
    </>
  );
}
