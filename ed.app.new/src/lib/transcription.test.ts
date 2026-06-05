import { describe, it, expect } from 'vitest';
import {
  transcribeWithWhisper,
  transcribeFromUrl,
  transcribeWithWebSpeech,
  transcribeAudio,
  isWhisperAvailable,
  type TranscriptionResult,
} from '../lib/transcriptionWhisper';
import { generateImagePrompt } from '../lib/api/ai-provider';

describe('Transcription Module', () => {
  describe('transcribeAudio', () => {
    it('should be defined and callable', () => {
      expect(transcribeAudio).toBeDefined();
      expect(typeof transcribeAudio).toBe('function');
    });

    it('should return fallback when no API available', async () => {
      // Without API keys, should return fallback
      const result = await transcribeAudio(new Blob(['test']), {
        preferWebSpeech: true,
      });

      expect(result).toBeDefined();
      expect(result.source).toBe('fallback');
      expect(result.text).toContain('Transcription unavailable');
    });
  });

  describe('transcribeWithWhisper', () => {
    it('should be defined', () => {
      expect(transcribeWithWhisper).toBeDefined();
    });
  });

  describe('transcribeFromUrl', () => {
    it('should be defined', () => {
      expect(transcribeFromUrl).toBeDefined();
    });
  });

  describe('isWhisperAvailable', () => {
    it('should be defined and return boolean', async () => {
      expect(isWhisperAvailable).toBeDefined();
      const result = await isWhisperAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('TranscriptionResult type', () => {
    it('should have correct structure', () => {
      const result: TranscriptionResult = {
        text: 'Hello world',
        language: 'en',
        duration: 5.2,
        confidence: 0.95,
        source: 'hf-whisper',
      };

      expect(result.text).toBe('Hello world');
      expect(result.language).toBe('en');
      expect(result.duration).toBe(5.2);
      expect(result.confidence).toBe(0.95);
      expect(result.source).toBe('hf-whisper');
    });
  });
});

describe('Dream Analyzer Module', () => {
  describe('generateImagePrompt', () => {
    it('should generate a dreamlike prompt by default', () => {
      const prompt = generateImagePrompt('Flying over mountains');
      expect(prompt).toContain('Flying over mountains');
      expect(prompt).toContain('dreamlike');
      expect(prompt).toContain('ethereal');
    });

    it('should support different styles', () => {
      const realistic = generateImagePrompt('Test', 'realistic');
      expect(realistic).toContain('photorealistic');

      const artistic = generateImagePrompt('Test', 'artistic');
      expect(artistic).toContain('oil painting');

      const minimal = generateImagePrompt('Test', 'minimal');
      expect(minimal).toContain('minimalist');

      const cinematic = generateImagePrompt('Test', 'cinematic');
      expect(cinematic).toContain('cinematic lighting');
    });

    it('should truncate long text to 200 chars', () => {
      const longText = 'a'.repeat(500);
      const prompt = generateImagePrompt(longText);
      expect(prompt.length).toBeLessThanOrEqual(200 + 100); // 200 chars + style text
    });

    it('should use dreamlike for unknown styles', () => {
      const prompt = generateImagePrompt('Test', 'unknown-style');
      expect(prompt).toContain('dreamlike');
    });
  });
});
