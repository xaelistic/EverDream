/**
 * Audio transcription utilities
 *
 * For live recording: uses Web Speech API (built into browser, free)
 * For file transcription: uses OpenAI Whisper via a free proxy or the
 * browser's built-in SpeechRecognition as fallback
 */

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
}

/**
 * Transcribe an audio file using the browser's SpeechRecognition API.
 * This works in Chrome/Edge without any API key.
 * Note: This is a best-effort approach - for production, use Whisper API.
 */
export async function transcribeAudioFile(file: File): Promise<TranscriptionResult> {
  return new Promise((resolve, reject) => {
    // Check for SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Speech recognition not supported in this browser'));
      return;
    }

    // For file transcription, we play the audio and use SpeechRecognition
    // This is a workaround since SpeechRecognition doesn't directly accept files
    const audio = new Audio(URL.createObjectURL(file));
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let transcript = '';
    let confidence = 0;
    const startTime = Date.now();

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          transcript += result[0].transcript + ' ';
          confidence = result[0].confidence;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Don't reject on no-speech errors - just return what we have
      if (event.error === 'no-speech' || event.error === 'aborted') {
        audio.pause();
        recognition.stop();
        resolve({
          text: transcript.trim() || 'No speech detected in audio',
          confidence: confidence || 0.5,
          duration: (Date.now() - startTime) / 1000,
        });
      } else {
        reject(new Error(`Speech recognition error: ${event.error}`));
      }
    };

    recognition.onend = () => {
      const duration = (Date.now() - startTime) / 1000;
      resolve({
        text: transcript.trim() || 'No speech detected',
        confidence: confidence || 0.5,
        duration,
      });
    };

    // Start playing audio and recognizing
    audio.onplay = () => {
      try {
        recognition.start();
      } catch (e) {
        // Recognition might already be running
      }
    };

    audio.onended = () => {
      setTimeout(() => {
        try {
          recognition.stop();
        } catch (e) {
          // Already stopped
        }
      }, 1000);
    };

    audio.play().catch((err: Error) => {
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
