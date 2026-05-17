/**
 * Audio Transcription Module — Free Tier
 *
 * Uses HuggingFace Inference API for Whisper (free, no GPU needed).
 * Falls back to Web Speech API for live mic recording.
 *
 * Environment variable:
 *   VITE_HF_INFERENCE_API_KEY — HuggingFace API token (free at huggingface.co)
 *
 * Model: openai/whisper-large-v3 (free on HF Inference API)
 * Supports 99 languages, auto-detects language.
 */

const HF_WHISPER_URL =
  'https://api-inference.huggingface.co/models/openai/whisper-large-v3';

const HF_API_KEY = typeof import.meta !== 'undefined'
  ? (import.meta as any).env?.VITE_HF_INFERENCE_API_KEY || ''
  : '';

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  confidence?: number;
  source: 'hf-whisper' | 'web-speech' | 'fallback';
}

/**
 * Transcribe an audio file using HuggingFree Whisper via HF Inference API.
 * Completely free — no API key needed for public models, but key increases rate limits.
 *
 * @param audioData — Blob, File, ArrayBuffer, or base64 data URL of the audio
 * @param options — language hint ('auto' for auto-detect), timestamps
 */
export async function transcribeWithWhisper(
  audioData: Blob | File | ArrayBuffer | string,
  options: {
    language?: string;
    timestamps?: boolean;
    onProgress?: (status: string) => void;
  } = {}
): Promise<TranscriptionResult> {
  const { language = 'en', onProgress } = options;

  // Convert input to Blob
  let blob: Blob;
  if (typeof audioData === 'string') {
    // Handle data URL (base64)
    if (audioData.startsWith('data:')) {
      const response = await fetch(audioData);
      blob = await response.blob();
    } else {
      // Handle raw base64 string
      const binaryString = atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      blob = new Blob([bytes], { type: 'audio/wav' });
    }
  } else if (audioData instanceof ArrayBuffer) {
    blob = new Blob([audioData], { type: 'audio/wav' });
  } else {
    blob = audioData as Blob;
  }

  onProgress?.('Uploading audio to Whisper...');

  // Build headers
  const headers: Record<string, string> = {};
  if (HF_API_KEY) {
    headers['Authorization'] = `Bearer ${HF_API_KEY}`;
  }

  // HF Inference API for Whisper
  const response = await fetch(HF_WHISPER_URL, {
    method: 'POST',
    headers,
    body: blob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    // If model is loading, retry after delay
    if (response.status === 503 || errorText.includes('loading')) {
      onProgress?.('Model is loading, retrying in 5s...');
      await new Promise((r) => setTimeout(r, 5000));
      return transcribeWithWhisper(audioData, options);
    }
    throw new Error(`Whisper API error: ${response.status} — ${errorText}`);
  }

  onProgress?.('Transcribing...');

  const result = await response.json();

  // HF Whisper returns: { text: "..." } or { text: "...", chunks: [...] }
  const text = result.text || '';
  const language = result.language || language;

  return {
    text: text.trim(),
    language,
    source: 'hf-whisper',
  };
}

/**
 * Transcribe audio from a URL (e.g., a remote audio file).
 */
export async function transcribeFromUrl(
  url: string,
  options?: Parameters<typeof transcribeWithWhisper>[1]
): Promise<TranscriptionResult> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status}`);
  const blob = await response.blob();
  return transcribeWithWhisper(blob, options);
}

/**
 * Transcribe using Web Speech API (live mic only, browser-based).
 * This is the existing fallback — kept for live recording.
 */
export async function transcribeWithWebSpeech(
  file: File,
  language: string = 'en-US'
): Promise<TranscriptionResult> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      reject(new Error('Speech recognition not supported'));
      return;
    }

    const audio = new Audio(URL.createObjectURL(file));
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    let transcript = '';
    let confidence = 0;
    const startTime = Date.now();

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          transcript += result[0].transcript + ' ';
          confidence = result[0].confidence;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        resolve({
          text: transcript.trim() || 'No speech detected',
          confidence: confidence || 0.5,
          duration: (Date.now() - startTime) / 1000,
          source: 'web-speech',
        });
      } else {
        reject(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    recognition.onend = () => {
      resolve({
        text: transcript.trim() || 'No speech detected',
        confidence: confidence || 0.5,
        duration: (Date.now() - startTime) / 1000,
        source: 'web-speech',
      });
    };

    audio.onplay = () => {
      try { recognition.start(); } catch { /* already running */ }
    };

    audio.onended = () => {
      setTimeout(() => {
        try { recognition.stop(); } catch { /* already stopped */ }
      }, 1000);
    };

    audio.play().catch((err: Error) => reject(new Error(`Failed to play audio: ${err.message}`)));
  });
}

/**
 * Smart transcription — tries HF Whisper first, falls back to Web Speech.
 * This is the main entry point for audio file transcription.
 */
export async function transcribeAudio(
  audioData: Blob | File | ArrayBuffer | string,
  options: {
    language?: string;
    preferWebSpeech?: boolean;
    onProgress?: (status: string) => void;
  } = {}
): Promise<TranscriptionResult> {
  const { preferWebSpeech = false, onProgress } = options;

  // Try HF Whisper first (better quality, works with files)
  if (!preferWebSpeech) {
    try {
      onProgress?.('Transcribing with Whisper AI...');
      return await transcribeWithWhisper(audioData, { onProgress });
    } catch (err) {
      console.warn('[Transcription] Whisper failed, trying Web Speech:', err);
    }
  }

  // Fallback: Web Speech API (requires File object)
  if (audioData instanceof File || audioData instanceof Blob) {
    try {
      onProgress?.('Falling back to browser speech recognition...');
      const file = audioData instanceof File ? audioData : new File([audioData], 'audio.ogg');
      return await transcribeWithWebSpeech(file);
    } catch (err) {
      console.warn('[Transcription] Web Speech failed:', err);
    }
  }

  // Last resort
  return {
    text: 'Transcription unavailable — please type your dream manually',
    source: 'fallback',
  };
}

/**
 * Check if HF Whisper API is available (quick health check).
 */
export async function isWhisperAvailable(): Promise<boolean> {
  try {
    const headers: Record<string, string> = {};
    if (HF_API_KEY) headers['Authorization'] = `Bearer ${HF_API_KEY}`;

    // Send a tiny silent audio to test
    const silentAudio = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
    const response = await fetch(HF_WHISPER_URL, {
      method: 'POST',
      headers,
      body: silentAudio,
    });
    // Even a 400 error means the API is reachable
    return response.status !== 503;
  } catch {
    return false;
  }
}
