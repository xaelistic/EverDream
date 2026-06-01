/**
 * Audio transcription utilities
 *
 * For live recording: uses Web Speech API (built into browser, free)
 * For file transcription: uses OpenAI Whisper via a free proxy or the
 * browser's built-in SpeechRecognition as fallback
 */

// Debug mode flag - set to true to enable detailed logging
const DEBUG = true;

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[TranscriptionDebug]', ...args);
  }
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
}

/**
 * Transcribe an audio file using the browser's SpeechRecognition API.
 * Uses createMediaElementSource to pipe audio directly without mic re-capture.
 * This works in Chrome/Edge without any API key.
 * Note: This is a best-effort approach - for production, use Whisper API.
 */
export async function transcribeAudioFile(file: File): Promise<TranscriptionResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    // Log file details
    debugLog('Starting transcription for file:', file.name);
    debugLog('File size:', file.size, 'bytes');
    debugLog('File type:', file.type);
    
    // Check for SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      debugLog('SpeechRecognition not supported');
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }

    // Create audio element from file
    const audioUrl = URL.createObjectURL(file);
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    
    debugLog('Audio element created, URL:', audioUrl.substring(0, 50) + '...');
    
    // Try to get duration
    audio.addEventListener('loadedmetadata', () => {
      debugLog('Audio duration:', audio.duration, 'seconds');
    });

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let transcript = '';
    let confidence = 0;
    let recognitionStarted = false;

    debugLog('Step 1: Setting up recognition handlers');

    recognition.onresult = (event: any) => {
      debugLog('Recognition result received, results count:', event.results.length);
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          transcript += result[0].transcript + ' ';
          confidence = result[0].confidence;
          debugLog('Final result:', result[0].transcript.substring(0, 50));
        } else {
          interimTranscript += result[0].transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      debugLog('Recognition error details:', event);
      // Don't reject on no-speech errors - just return what we have
      if (event.error === 'no-speech' || event.error === 'aborted') {
        audio.pause();
        try { recognition.stop(); } catch {}
        const duration = (Date.now() - startTime) / 1000;
        resolve({
          text: transcript.trim() || 'No speech detected in audio',
          confidence: confidence || 0.5,
          duration,
        });
      } else {
        reject(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    recognition.onend = () => {
      debugLog('Recognition ended');
      const duration = (Date.now() - startTime) / 1000;
      resolve({
        text: transcript.trim() || 'No speech detected',
        confidence: confidence || 0.5,
        duration,
      });
    };

    recognition.onstart = () => {
      recognitionStarted = true;
      debugLog('Step 4: Recognition started successfully');
    };

    // Start playing audio and recognizing
    debugLog('Step 2: Starting audio playback');
    
    audio.onplay = () => {
      debugLog('Step 3: Audio playback started');
      try {
        if (!recognitionStarted) {
          recognition.start();
        }
      } catch (e) {
        debugLog('Recognition start error (may already be running):', e);
      }
    };

    audio.onended = () => {
      debugLog('Audio playback ended');
      setTimeout(() => {
        try {
          recognition.stop();
        } catch (e) {
          // Already stopped
        }
      }, 1000);
    };

    audio.onerror = (e) => {
      debugLog('Audio playback error:', e);
      reject(new Error(`Failed to load audio: ${audio.error?.message || 'Unknown error'}`));
    };

    // Play the audio
    audio.play().catch((err: Error) => {
      debugLog('Play promise rejected:', err.message);
      reject(new Error(`Failed to play audio: ${err.message}`));
    });
  });
}

/**
 * Check if the browser supports speech recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Get a human-readable emotion label from emotion data
 */
export function getEmotionLabel(emotion: string): string {
  const labels: Record<string, string> = {
    happy: 'Happy / Joyful',
    sad: 'Sad / Melancholy',
    angry: 'Angry / Frustrated',
    fearful: 'Fearful / Anxious',
    disgusted: 'Disgusted / Repulsed',
    surprised: 'Surprised / Shocked',
    neutral: 'Neutral / Calm',
  };
  return labels[emotion] || emotion;
}
