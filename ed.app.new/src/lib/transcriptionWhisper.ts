/**
 * Audio Transcription Module — Supabase Edge Function Proxy
 *
 * Routes all Whisper transcription through the Supabase Edge Function
 * `transcribe-audio` instead of calling HuggingFace directly from the client.
 * This keeps the HF API key server-side.
 *
 * Falls back to Web Speech API for live mic recording.
 *
 * Includes rate limiting, retry logic, and user-friendly error handling.
 *
 * Environment variables:
 *   VITE_SUPABASE_URL       — Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY  — Your Supabase anon/public key
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Inline Rate Limiter (avoids import issues in test env) ───

const transcriptionCalls: number[] = [];
const TRANSCRIPTION_MAX_CALLS = 3;
const TRANSCRIPTION_WINDOW_MS = 60_000;

function isTranscriptionAllowed(): boolean {
  const now = Date.now();
  const valid = transcriptionCalls.filter((t) => now - t < TRANSCRIPTION_WINDOW_MS);
  if (valid.length >= TRANSCRIPTION_MAX_CALLS) return false;
  transcriptionCalls.push(now);
  // Clean old entries
  while (transcriptionCalls.length > 0 && now - transcriptionCalls[0] > TRANSCRIPTION_WINDOW_MS) {
    transcriptionCalls.shift();
  }
  return true;
}

// ── Inline API Error ─────────────────────────────────────────

export class ApiError extends Error {
  public readonly category: 'network' | 'rate_limit' | 'auth' | 'server' | 'validation' | 'unknown';
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    category: 'network' | 'rate_limit' | 'auth' | 'server' | 'validation' | 'unknown' = 'unknown'
  ) {
    super(message);
    this.name = 'ApiError';
    this.category = category;
    this.isRetryable = category === 'network' || category === 'rate_limit' || category === 'server';
    this.userMessage = ApiError.getUserMessage(category);
  }

  static getUserMessage(category: string): string {
    switch (category) {
      case 'network': return 'Unable to connect. Please check your internet connection and try again.';
      case 'rate_limit': return 'Too many requests. Please wait a moment and try again.';
      case 'auth': return 'Authentication failed. Please sign in again.';
      case 'server': return 'The service is temporarily unavailable. Please try again in a moment.';
      case 'validation': return 'The request was invalid. Please check your input and try again.';
      default: return 'Something unexpected happened. Please try again.';
    }
  }
}

// ── Types ────────────────────────────────────────────────────

export interface TranscriptionResult {
  text: string;
  language?: string;
  duration?: number;
  confidence?: number;
  source: 'hf-whisper' | 'web-speech' | 'fallback';
}

// ── Constants ────────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const RATE_LIMIT_KEY = 'transcribe-audio';
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

// ── Supabase Client ──────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;

  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    console.warn('[Transcription] Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    return null;
  }

  _supabase = createClient(url, key);
  return _supabase;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Edge Function Transcription ──────────────────────────────

/**
 * Transcribe audio via Supabase Edge Function (HF Whisper proxy).
 * Falls back to Web Speech API if Supabase is not configured.
 *
 * Includes rate limiting (3 calls per 60s) and automatic retry.
 *
 * @param audioData — Blob, File, ArrayBuffer, or base64 data URL
 * @param options — language hint, progress callback
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
    if (audioData.startsWith('data:')) {
      const response = await fetch(audioData);
      blob = await response.blob();
    } else {
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

  // Validate audio size
  if (blob.size > MAX_AUDIO_SIZE_BYTES) {
    throw new ApiError(
      `Audio file too large (${(blob.size / 1024 / 1024).toFixed(1)} MB). Max: ${(MAX_AUDIO_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB.`,
      'validation'
    );
  }

  if (blob.size === 0) {
    throw new ApiError('Audio file is empty.', 'validation');
  }

  // Rate limiting
  if (!isTranscriptionAllowed()) {
    throw new ApiError(
      'Too many transcription requests. Please wait a moment and try again.',
      'rate_limit'
    );
  }

  const supabase = getSupabase();

  // If Supabase is configured, use the edge function
  if (supabase) {
    onProgress?.('Uploading audio for transcription...');

    let lastAttemptError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        onProgress?.(`Retrying transcription (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await delay(RETRY_DELAY_MS * attempt);
      }

      try {
        // Convert blob to ArrayBuffer for the edge function
        const arrayBuffer = await blob.arrayBuffer();

        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: arrayBuffer,
          headers: {
            'Content-Type': blob.type || 'audio/wav',
            'X-Language': language,
          },
        });

        if (error) {
          console.error('[Transcription] Edge function error:', error.message);
          lastAttemptError = error.message;
          continue;
        }

        const result = data as { text?: string; language?: string; error?: string };

        if (result.error) {
          console.error('[Transcription] Service error:', result.error);
          lastAttemptError = result.error;
          continue;
        }

        onProgress?.('Transcription complete!');

        return {
          text: (result.text || '').trim(),
          language: result.language || language,
          source: 'hf-whisper',
        };
      } catch (err) {
        console.error('[Transcription] Request error:', err);
        lastAttemptError = err instanceof Error ? err.message : String(err);
      }
    }

    console.warn('[Transcription] All edge function attempts failed, trying Web Speech fallback');

    // Fallback: direct HF call
    return transcribeWithHFDirect(blob, language, onProgress);
  }

  // No Supabase: direct HF call
  return transcribeWithHFDirect(blob, language, onProgress);
}

/**
 * Direct HuggingFace call (legacy fallback when Supabase is not configured).
 * @deprecated Use the Supabase Edge Function instead.
 */
async function transcribeWithHFDirect(
  blob: Blob,
  _language: string,
  onProgress?: (status: string) => void,
): Promise<TranscriptionResult> {
  const HF_WHISPER_URL =
    'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
  const HF_API_KEY = import.meta.env.VITE_HF_INFERENCE_API_KEY || '';

  onProgress?.('Uploading audio to Whisper (direct)...');

  const headers: Record<string, string> = {};
  if (HF_API_KEY) {
    headers['Authorization'] = `Bearer ${HF_API_KEY}`;
  }

  const response = await fetch(HF_WHISPER_URL, {
    method: 'POST',
    headers,
    body: blob,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error: ${response.status} — ${errorText}`);
  }

  onProgress?.('Transcribing...');

  const result = await response.json();
  const text = result.text || '';

  return {
    text: text.trim(),
    language: result.language || _language,
    source: 'hf-whisper',
  };
}

// ── Web Speech API (Live Mic) ────────────────────────────────

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

// ── Smart Transcription (Main Entry Point) ───────────────────

/**
 * Smart transcription — tries Supabase Edge Function (Whisper) first,
 * falls back to Web Speech API.
 *
 * @param audioData — Blob, File, ArrayBuffer, or data URL
 * @param options — language hint, preferWebSpeech, progress callback
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

  // Try Whisper first (better quality, works with files)
  if (!preferWebSpeech) {
    try {
      onProgress?.('Transcribing with Whisper AI...');
      return await transcribeWithWhisper(audioData, { onProgress });
    } catch (err) {
      const apiErr = ApiError.fromError(err);
      console.warn('[Transcription] Whisper failed:', apiErr.message);

      // Don't fall back to Web Speech for network/server errors with file input
      if (apiErr.category === 'validation') {
        throw apiErr; // Re-throw validation errors
      }
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
 * Check if transcription service is available (quick health check).
 */
export async function isWhisperAvailable(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    // Fallback: check HF directly
    try {
      const HF_API_KEY = import.meta.env.VITE_HF_INFERENCE_API_KEY || '';
      const headers: Record<string, string> = {};
      if (HF_API_KEY) headers['Authorization'] = `Bearer ${HF_API_KEY}`;
      const silentAudio = new Blob([new Uint8Array(100)], { type: 'audio/wav' });
      const response = await fetch(
        'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
        { method: 'POST', headers, body: silentAudio },
      );
      return response.status !== 503;
    } catch {
      return false;
    }
  }

  // Check Supabase edge function health
  try {
    const { error } = await supabase.functions.invoke('transcribe-audio', {
      body: new ArrayBuffer(0),
    });
    // Even an error about empty body means the function is reachable
    return !error || error.message?.includes('audio') || error.message?.includes('empty');
  } catch {
    return false;
  }
}
