/**
 * Integration Test — Dream Pipeline End-to-End
 *
 * Tests the complete flow: dream capture → analysis → image generation → save
 * Uses the actual pipeline functions with skip options to avoid API calls.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  runDreamPipeline,
  analyzeAndVisualize,
  type PipelineInput,
  type PipelineResult,
} from '../lib/dreamPipeline';
import {
  getOrCreateWallet,
  createDreamNFT,
  mintNFT,
  saveNFT,
  getWalletNFTs,
  exportNFTMetadata,
  type DreamNFT,
  type WalletIdentity,
} from '../lib/nft';
import { generateDreamId, type DreamData } from '../lib/dreamService';

// ── Mock dream data ──────────────────────────────────────────

const MOCK_DREAM: DreamData = {
  id: generateDreamId(),
  content: 'I was flying over a vast ocean at sunset. The water was impossibly blue and gold. Dolphins leaped beside me as we soared together through the clouds.',
  title: 'Flying with Dolphins',
  mood: 'joy',
  category: 'adventure',
  themes: ['flying', 'ocean', 'freedom', 'dolphins'],
  emotion: 'joy',
  symbols: ['flying', 'ocean', 'dolphins'],
  narrative: 'I found myself soaring high above an endless ocean painted in impossible shades of blue and gold by the setting sun.',
  nugget: 'Flying with dolphins over a golden ocean, feeling completely free',
  captureMode: 'text',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('EverDream Integration — Full Pipeline', () => {
  describe('Dream Creation Flow', () => {
    it('should generate a valid dream ID', () => {
      const id = generateDreamId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should create a dream data object with all fields', () => {
      expect(MOCK_DREAM.id).toBeDefined();
      expect(MOCK_DREAM.content).toContain('flying');
      expect(MOCK_DREAM.category).toBe('adventure');
      expect(MOCK_DREAM.themes).toContain('flying');
      expect(MOCK_DREAM.emotion).toBe('joy');
      expect(MOCK_DREAM.captureMode).toBe('text');
    });
  });

  describe('Pipeline Execution (skipped API calls)', () => {
    it('should run pipeline with all steps skipped', async () => {
      const result = await runDreamPipeline(
        { text: MOCK_DREAM.content },
        {
          skipTranscription: true,
          skipAnalysis: true,
          skipImage: true,
          skipParallax: true,
        }
      );

      expect(result).toBeDefined();
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBe(4);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);

      // Transcription, image, and parallax should be skipped
      const transcribeStep = result.steps.find(s => s.name === 'Transcription');
      const imageStep = result.steps.find(s => s.name === 'Image Generation');
      const parallaxStep = result.steps.find(s => s.name === 'Parallax Video');
      expect(transcribeStep?.status).toBe('skipped');
      expect(imageStep?.status).toBe('skipped');
      expect(parallaxStep?.status).toBe('skipped');
    });
    it('should track progress via callback', async () => {
      const progressCalls: Array<{ step: string; status: string; message: string }> = [];

      await runDreamPipeline(
        { text: MOCK_DREAM.content },
        {
          skipTranscription: true,
          skipAnalysis: false,  // Let analysis run so callback fires
          skipImage: true,
          skipParallax: true,
          onProgress: (step, status, message) => {
            progressCalls.push({ step, status, message });
          },
        }
      );

      // Should have progress calls for the analysis step (which will fail gracefully)
      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('should handle empty text gracefully', async () => {
      const result = await runDreamPipeline(
        { text: '' },
        { skipImage: true, skipParallax: true }
      );

      expect(result).toBeDefined();
      // Transcription should be skipped (no audio), analysis should be skipped (text too short)
      const analyzeStep = result.steps.find(s => s.name === 'Dream Analysis');
      expect(analyzeStep?.status).toBe('skipped');
    });
  });

  describe('NFT Minting Flow', () => {
    it('should create wallet → create NFT → mint → save → retrieve', async () => {
      // Step 1: Create wallet
      const wallet = getOrCreateWallet();
      expect(wallet).toBeDefined();
      expect(wallet.address).toMatch(/^0x[a-f0-9]{40}$/);

      // Step 2: Create NFT from dream
      const nft = createDreamNFT(
        {
          id: MOCK_DREAM.id,
          content: MOCK_DREAM.content,
          category: MOCK_DREAM.category,
          themes: MOCK_DREAM.themes,
          emotion: MOCK_DREAM.emotion,
          symbols: MOCK_DREAM.symbols,
          narrative: MOCK_DREAM.narrative || MOCK_DREAM.content,
          nugget: MOCK_DREAM.nugget || MOCK_DREAM.content.substring(0, 100),
        },
        wallet
      );

      expect(nft.id).toContain(MOCK_DREAM.id);
      expect(nft.owner).toBe(wallet.address);
      expect(nft.status).toBe('pending');
      expect(nft.metadata.name).toBeDefined();

      // Step 3: Mint the NFT
      const minted = await mintNFT(nft);
      expect(minted.status).toBe('minted');
      expect(minted.txHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(minted.tokenId).toBeDefined();
      expect(minted.contractAddress).toBeDefined();

      // Step 4: Save NFT
      saveNFT(minted);

      // Step 5: Retrieve NFTs
      const nfts = getWalletNFTs(wallet.address);
      expect(nfts.length).toBe(1);
      expect(nfts[0].id).toBe(nft.id);
      expect(nfts[0].status).toBe('minted');
    });

    it('should export NFT metadata in OpenSea format', async () => {
      const wallet = getOrCreateWallet();
      const nft = createDreamNFT(
        {
          id: 'test-export',
          content: 'Test dream',
          category: 'normal',
          themes: [],
          emotion: 'neutral',
          symbols: [],
          narrative: 'Test',
          nugget: 'Test nugget',
        },
        wallet
      );

      const minted = await mintNFT(nft);
      const exported = exportNFTMetadata(minted);

      // Verify the exported metadata has the expected structure
      expect(exported).toBeDefined();
      expect(exported.name).toBeDefined();
      expect(exported.description).toBeDefined();
      expect(exported.attributes).toBeDefined();
      expect(Array.isArray(exported.attributes)).toBe(true);
    });
  });

  describe('Dream Data Shape Compatibility', () => {
    it('should have all fields needed for DreamList display', () => {
      expect(MOCK_DREAM.id).toBeDefined();
      expect(MOCK_DREAM.content).toBeDefined();
      expect(MOCK_DREAM.category).toBeDefined();
      expect(MOCK_DREAM.createdAt).toBeDefined();
    });

    it('should have all fields needed for DreamDetail display', () => {
      expect(MOCK_DREAM.title || MOCK_DREAM.nugget).toBeDefined();
      expect(MOCK_DREAM.narrative || MOCK_DREAM.content).toBeDefined();
      expect(MOCK_DREAM.themes).toBeDefined();
      expect(MOCK_DREAM.symbols).toBeDefined();
      expect(MOCK_DREAM.emotion).toBeDefined();
    });

    it('should have all fields needed for NFT minting', () => {
      expect(MOCK_DREAM.id).toBeDefined();
      expect(MOCK_DREAM.content).toBeDefined();
      expect(MOCK_DREAM.category).toBeDefined();
      expect(MOCK_DREAM.themes).toBeDefined();
      expect(MOCK_DREAM.emotion).toBeDefined();
      expect(MOCK_DREAM.symbols).toBeDefined();
    });

    it('should have all fields needed for DreamVisualizer', () => {
      expect(MOCK_DREAM.id).toBeDefined();
      expect(MOCK_DREAM.content).toBeDefined();
      expect(MOCK_DREAM.title || MOCK_DREAM.nugget).toBeDefined();
    });
  });
});
