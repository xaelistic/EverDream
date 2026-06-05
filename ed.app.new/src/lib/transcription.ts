/**
 * Audio transcription utilities
 *
 * DEPRECATED: This file uses a flawed approach (playing audio through speakers).
 * Use transcriptionWhisper.ts instead, which properly transcribes audio files
 * via the Web Speech API or Whisper AI.
 *
 * This file is kept for backward compatibility but should not be used for new code.
 */

export interface TranscriptionResult {
  text: string;
  confidence: number;
  duration: number;
}

/**
 * @deprecated Use transcribeAudio from transcriptionWhisper.ts instead
 * 
 * Transcribe an audio file using the browser's SpeechRecognition API.
 * This works in Chrome/Edge without any API key.
 * Note: This approach plays audio through speakers and captures it via microphone,
 * which is unreliable. Use the Whisper-based transcription instead.
 */
export async function transcribeAudioFile(file: File): Promise<TranscriptionResult> {
  console.warn('[transcription.ts] transcribeAudioFile is deprecated. Use transcriptionWhisper.ts instead.');
  
  // Check for SpeechRecognition support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    throw new Error('Speech recognition not supported in this browser. Please use a modern browser or try manual transcription.');
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

  return new Promise((resolve, reject) => {
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
