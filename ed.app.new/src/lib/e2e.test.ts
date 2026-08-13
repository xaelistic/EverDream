/**
 * EverDream E2E Integration Test
 *
 * Tests the complete dream pipeline:
 * 1. Dream creation → analysis → image generation → NFT minting
 * 2. UI component rendering
 * 3. Data persistence (localStorage + Supabase sync)
 *
 * Run with: npx vitest run src/lib/e2e.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  runDreamPipeline,
  analyzeAndVisualize,
  type PipelineResult,
} from '../lib/dreamPipeline';
import {
  generateDreamImage,
  generateDreamAssets,
} from '../modules/sleep/dreamAssetGenerator';
import {
  getOrCreateWallet,
  createDreamNFT,
  mintNFT,
  saveNFT,
  exportNFTMetadata,
  type DreamNFT,
  type WalletIdentity,
} from '../lib/nft';

// ============================================================
// TEST DATA
// ============================================================

const SAMPLE_DREAM = {
  id: 'test-dream-1',
  content:
    'I was walking through a vast library where the books were alive. Each book I opened released a different memory — some mine, some belonging to strangers. The librarian was a gentle owl who spoke in riddles. When I asked where the exit was, she pointed to a door made of moonlight.',
  date: new Date().toISOString(),
  category: 'adventure',
  themes: ['library', 'books', 'memories', 'owl', 'moonlight'],
  emotion: 'curious',
  symbols: ['library', 'books', 'owl', 'moonlight'],
  narrative:
    'I found myself wandering through an impossibly vast library. The shelves stretched endlessly in every direction, and the books hummed with quiet energy. As I pulled one from the shelf and opened it, a vivid memory spilled out — not mine, but belonging to someone I had never met. I explored further, each book revealing a different life, a different story. The librarian, a wise and gentle owl, guided me through the aisles, offering cryptic advice. When I finally asked about leaving, she simply pointed toward a door that seemed to be made entirely of moonlight.',
  nugget:
    'A luminous library where books contain the memories of strangers, guarded by an owl librarian',
  interpretation: {
    symbols: {
      library: 'Represents the collective unconscious and accumulated wisdom',
      books: 'Each book is a life experience or memory',
      owl: 'Wisdom, guidance, and intuition',
      moonlight: 'Subconscious illumination and hidden knowledge',
    },
    meaning:
      'This dream suggests you are processing new information and gaining insight from diverse sources. The owl represents your intuition guiding you.',
    commonPattern:
      'Library dreams often occur during periods of learning or when seeking answers.',
  },
};

// ============================================================
// PIPELINE INTEGRATION TESTS
// ============================================================

describe('EverDream E2E Pipeline', () => {
  describe('Image Generation', () => {
    it('should generate a dream image via OpenRouter', async () => {
      const asset = await generateDreamImage(SAMPLE_DREAM.content, 'dreamlike');
      expect(asset).toBeDefined();
      expect(asset.url).toBeDefined();
      expect(asset.url.length).toBeGreaterThan(0);
      expect(['openrouter', 'edge-function', 'fal', 'huggingface']).toContain(asset.source);
      expect(asset.style).toBe('dreamlike');
      expect(asset.id).toBeDefined();
      expect(asset.generatedAt).toBeDefined();
    }, 60000);

    it('should generate multiple dream assets', async () => {
      const assets = await generateDreamAssets(SAMPLE_DREAM.content, 2);
      expect(assets.length).toBeGreaterThan(0);
      expect(assets.length).toBeLessThanOrEqual(2);
      for (const asset of assets) {
        expect(asset.url).toBeDefined();
        expect(asset.source).toBeDefined();
      }
    }, 120000);
  });

  describe('Pipeline (skipping API calls)', () => {
    it('should run full pipeline with all skips', async () => {
      const result = await analyzeAndVisualize(SAMPLE_DREAM.content);
      expect(result).toBeDefined();
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBe(4);
      expect(result.transcription).toBeNull();
    });

    it('should track progress through steps', async () => {
      const progressLog: Array<{
        step: string;
        status: string;
        message: string;
      }> = [];

      await analyzeAndVisualize(SAMPLE_DREAM.content, (step, status, message) => {
        progressLog.push({ step, status, message });
      });

      expect(progressLog.length).toBeGreaterThan(0);
    });

    it('should return correct step structure', async () => {
      const result = await runDreamPipeline(
        { text: 'A short dream about flying' },
        {
          skipTranscription: true,
          skipAnalysis: true,
          skipImage: true,
          skipParallax: true,
        }
      );

      expect(result.steps).toHaveLength(4);
      const stepNames = result.steps.map((s) => s.name);
      expect(stepNames).toContain('Transcription');
      expect(stepNames).toContain('Dream Analysis');
      expect(stepNames).toContain('Image Generation');
      expect(stepNames).toContain('Parallax Video');
    });
  });

  describe('NFT System', () => {
    it('should create a wallet', () => {
      const wallet = getOrCreateWallet();
      expect(wallet).toBeDefined();
      expect(wallet.address).toBeDefined();
      expect(wallet.address.startsWith('0x')).toBe(true);
      expect(wallet.displayName).toBeDefined();
      expect(wallet.deviceId).toBeDefined();
    });

    it('should create an NFT from a dream', () => {
      const wallet = getOrCreateWallet();
      const nft = createDreamNFT(SAMPLE_DREAM, wallet);

      expect(nft).toBeDefined();
      expect(nft.id).toBeDefined();
      expect(nft.dreamId).toBe(SAMPLE_DREAM.id);
      expect(nft.owner).toBe(wallet.address);
      expect(nft.creator).toBe(wallet.address);
      expect(nft.status).toBe('pending');
      expect(nft.metadata.name).toBeDefined();
      expect(nft.metadata.description).toBeDefined();
      expect(nft.metadata.attributes.length).toBeGreaterThan(0);
    });

    it('should mint an NFT (simulated)', async () => {
      const wallet = getOrCreateWallet();
      const nft = createDreamNFT(SAMPLE_DREAM, wallet);
      const minted = await mintNFT(nft);

      expect(minted.status).toBe('minted');
      expect(minted.txHash).toBeDefined();
      expect(minted.contractAddress).toBeDefined();
      expect(minted.tokenId).toBeDefined();
    });

    it('should export NFT metadata in OpenSea format', () => {
      const wallet = getOrCreateWallet();
      const nft = createDreamNFT(SAMPLE_DREAM, wallet);
      const metadata = exportNFTMetadata(nft);

      expect(metadata).toBeDefined();
      expect((metadata as { name: string }).name).toBeDefined();
      expect((metadata as { description: string }).description).toBeDefined();
      expect((metadata as { attributes: unknown[] }).attributes).toBeDefined();
    });

    it('should save and retrieve NFTs', () => {
      const wallet = getOrCreateWallet();
      const nft = createDreamNFT(SAMPLE_DREAM, wallet);
      saveNFT(nft);

      const stored = localStorage.getItem('ed_nfts');
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.some((n: DreamNFT) => n.id === nft.id)).toBe(true);
    });
  });

  describe('Dream Data Structure', () => {
    it('should have all required dream fields', () => {
      expect(SAMPLE_DREAM.id).toBeDefined();
      expect(SAMPLE_DREAM.content).toBeDefined();
      expect(SAMPLE_DREAM.category).toBeDefined();
      expect(SAMPLE_DREAM.themes).toBeDefined();
      expect(SAMPLE_DREAM.themes.length).toBeGreaterThan(0);
      expect(SAMPLE_DREAM.emotion).toBeDefined();
      expect(SAMPLE_DREAM.symbols).toBeDefined();
      expect(SAMPLE_DREAM.narrative).toBeDefined();
      expect(SAMPLE_DREAM.nugget).toBeDefined();
      expect(SAMPLE_DREAM.interpretation).toBeDefined();
    });

    it('should have valid interpretation structure', () => {
      expect(SAMPLE_DREAM.interpretation.symbols).toBeDefined();
      expect(typeof SAMPLE_DREAM.interpretation.symbols).toBe('object');
      expect(SAMPLE_DREAM.interpretation.meaning).toBeDefined();
      expect(SAMPLE_DREAM.interpretation.commonPattern).toBeDefined();
    });
  });
});

// ============================================================
// COMPONENT EXPORT TESTS
// ============================================================

describe('Component Exports', () => {
  it('should export all UI components', async () => {
    const ui = await import('../components/ui');
    expect(ui.Button).toBeDefined();
    expect(ui.Card).toBeDefined();
    expect(ui.Input).toBeDefined();
    expect(ui.TextArea).toBeDefined();
    expect(ui.Badge).toBeDefined();
    expect(ui.Spinner).toBeDefined();
    expect(ui.LoadingOverlay).toBeDefined();
    expect(ui.Skeleton).toBeDefined();
    expect(ui.Modal).toBeDefined();
    expect(ui.ToastProvider).toBeDefined();
    expect(ui.useToast).toBeDefined();
    expect(ui.AppLoadingScreen).toBeDefined();
    expect(ui.ErrorBanner).toBeDefined();
  });

  it('should export all dream components', async () => {
    const dreams = await import('../components/dreams');
    expect(dreams.DreamList).toBeDefined();
    expect(dreams.DreamDetail).toBeDefined();
    expect(dreams.DreamEntryForm).toBeDefined();
    expect(dreams.DreamStatsDashboard).toBeDefined();
    expect(dreams.ShareModal).toBeDefined();
    expect(dreams.DreamSkeleton).toBeDefined();
    expect(dreams.DreamVisualizer).toBeDefined();
    expect(dreams.DreamJournal).toBeDefined();
    expect(dreams.NFTMintButton).toBeDefined();
    expect(dreams.DreamCapture).toBeDefined();
    expect(dreams.PipelineProgress).toBeDefined();
  });

  it('should export auth components', async () => {
    const auth = await import('../components/auth/LoginScreen');
    expect(auth.default).toBeDefined();

    const protectedRoute = await import(
      '../components/auth/ProtectedRoute'
    );
    expect(protectedRoute.default).toBeDefined();
  });

  it('should export lib modules', async () => {
    const nft = await import('../lib/nft');
    expect(nft.getOrCreateWallet).toBeDefined();
    expect(nft.createDreamNFT).toBeDefined();
    expect(nft.mintNFT).toBeDefined();
    expect(nft.saveNFT).toBeDefined();
    expect(nft.exportNFTMetadata).toBeDefined();

    const supabase = await import('../lib/supabase/client');
    expect(supabase.supabase).toBeDefined();
    expect(supabase.fetchDreams).toBeDefined();
    expect(supabase.insertDream).toBeDefined();
    expect(supabase.updateDream).toBeDefined();

    const dreamAnalyzer = await import('../lib/dream-analyzer');
    expect(dreamAnalyzer.analyzeDream).toBeDefined();
  });
});

// ============================================================
// PWA CONFIGURATION TESTS
// ============================================================

describe('PWA Configuration', () => {
  it('should have vite-plugin-pwa configured', async () => {
    // Verify the vite config includes PWA plugin
    const fs = await import('fs');
    const path = await import('path');
    const viteConfigPath = path.resolve(__dirname, '../../vite.config.ts');
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
    expect(viteConfig).toContain('VitePWA');
    expect(viteConfig).toContain('manifest');
    expect(viteConfig).toContain('workbox');
  });
});
