/**
 * Audio Recording & Feature Extraction
 * Privacy-first: Extracts audio features locally, never stores raw audio without consent
 * Prepares for future cloud processing with explicit user opt-in
 */

import { sleepSessionManager } from './sleepSession';

export interface AudioRecorderConfig {
  /** Sample rate (Hz) - 16000 is good balance between quality & storage */
  sampleRate: number;
  /** Audio frame size for feature extraction */
  frameSize: number;
  /** Enable silence detection */
  detectSilence: boolean;
  /** Silence threshold (0-1) */
  silenceThreshold: number;
  /** Store raw audio data locally? (requires explicit consent) */
  storeRawAudio: boolean;
}

class AudioRecorderManager {
  private isRecording = false;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: AudioRecorderConfig = {
    sampleRate: 16000,
    frameSize: 512,
    detectSilence: true,
    silenceThreshold: 0.02,
    storeRawAudio: false,
  };
  private rawAudioBuffer: Float32Array[] = [];
  private silenceCount = 0;
  private readonly maxSilenceDuration = 5000; // 5 seconds

  /**
   * Request microphone permission
   */
  async requestPermissions(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('[AudioRecorder] Microphone permission granted');
      return true;
    } catch (err) {
      console.error('[AudioRecorder] Microphone permission denied:', err);
      return false;
    }
  }

  /**
   * Start recording and extracting audio features
   * Audio data is processed locally; raw audio is discarded unless storeRawAudio is true
   */
  async start(customConfig?: Partial<AudioRecorderConfig>): Promise<boolean> {
    if (this.isRecording) return true;

    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    // Request microphone if not already done
    if (!this.mediaStream) {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[AudioRecorder] Cannot start recording without microphone access');
        return false;
      }
    }

    // Setup Web Audio API
    try {
      this.audioContext =
        this.audioContext ||
        new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream!);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.frameSize * 2;

      // Create script processor for real-time feature extraction
      this.processor = this.audioContext.createScriptProcessor(
        this.config.frameSize,
        1, // mono input
        1 // mono output
      );

      source.connect(this.processor);
      this.processor.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.processor.onaudioprocess = this.onAudioProcess;

      this.isRecording = true;
      this.silenceCount = 0;
      console.log('[AudioRecorder] Started recording');
      return true;
    } catch (err) {
      console.error('[AudioRecorder] Failed to setup audio context:', err);
      return false;
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (!this.isRecording) return;

    this.isRecording = false;
    this.processor?.disconnect();
    this.analyser?.disconnect();

    // Release microphone
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    console.log('[AudioRecorder] Stopped recording');
  }

  /**
   * Get stored raw audio (if enabled)
   * Should only be called after explicit user consent
   */
  getRawAudioData(): ArrayBuffer | null {
    if (!this.config.storeRawAudio || this.rawAudioBuffer.length === 0) {
      return null;
    }

    // Concatenate buffer
    const totalLength = this.rawAudioBuffer.reduce((acc, buf) => acc + buf.length, 0);
    const concatenated = new Float32Array(totalLength);

    let offset = 0;
    for (const buf of this.rawAudioBuffer) {
      concatenated.set(buf, offset);
      offset += buf.length;
    }

    return this.encodeWAV(concatenated);
  }

  /**
   * Clear stored audio data
   */
  clearAudioData(): void {
    this.rawAudioBuffer = [];
  }

  private onAudioProcess = (event: AudioProcessingEvent): void => {
    if (!this.isRecording) return;

    const inputData = event.inputBuffer.getChannelData(0);

    // Store raw audio if enabled (requires consent)
    if (this.config.storeRawAudio) {
      this.rawAudioBuffer.push(new Float32Array(inputData));
    }

    // Extract features locally
    const features = this.extractAudioFeatures(inputData);

    // Check for silence
    if (this.config.detectSilence && features.energy < this.config.silenceThreshold) {
      this.silenceCount += this.config.frameSize / this.audioContext!.sampleRate;
      if (this.silenceCount > this.maxSilenceDuration / 1000) {
        // Extended silence - could indicate deep sleep or user away
        console.log('[AudioRecorder] Extended silence detected');
        this.silenceCount = 0;
      }
    } else {
      this.silenceCount = 0;
    }

    // Send features to sleep session
    sleepSessionManager.addAudioFeature({
      energy: features.energy,
      spectralFeature: features.spectralCentroid,
    });
  };

  /**
   * Extract audio features (local processing, privacy-first)
   */
  private extractAudioFeatures(
    audioData: Float32Array
  ): { energy: number; spectralCentroid: number } {
    // Energy: RMS (root mean square)
    let sumOfSquares = 0;
    for (let i = 0; i < audioData.length; i++) {
      sumOfSquares += audioData[i] * audioData[i];
    }
    const rms = Math.sqrt(sumOfSquares / audioData.length);
    const energy = Math.min(rms / 0.5, 1); // Normalize to 0-1 range

    // Spectral centroid via FFT (simple approximation)
    const fft = this.computeFFT(audioData);
    let weightedSum = 0;
    let energySum = 0;
    const freqBinSize = this.audioContext!.sampleRate / audioData.length;

    for (let i = 0; i < fft.length; i++) {
      weightedSum += fft[i] * i * freqBinSize;
      energySum += fft[i];
    }

    const spectralCentroid = energySum > 0 ? weightedSum / energySum : 0;
    const normalizedCentroid = Math.min(spectralCentroid / 8000, 1); // 8kHz normalized

    return {
      energy,
      spectralCentroid: normalizedCentroid,
    };
  }

  /**
   * Simple FFT approximation using Goertzel or basic DFT
   * (Simplified - real implementation would use FFT.js library)
   */
  private computeFFT(audioData: Float32Array): number[] {
    const bins = 64;
    const fft = new Array(bins).fill(0);

    // Simplified magnitude spectrum (real implementation uses proper FFT)
    for (let bin = 0; bin < bins; bin++) {
      let real = 0,
        imag = 0;
      const freq = (bin / bins) * this.audioContext!.sampleRate;

      for (let i = 0; i < Math.min(audioData.length, 512); i++) {
        const angle = (2 * Math.PI * freq * i) / this.audioContext!.sampleRate;
        real += audioData[i] * Math.cos(angle);
        imag += audioData[i] * Math.sin(angle);
      }

      fft[bin] = Math.sqrt(real * real + imag * imag);
    }

    return fft;
  }

  /**
   * Encode audio data as WAV format
   */
  private encodeWAV(samples: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    const sampleRate = this.config.sampleRate;
    const channels = 1;
    const bytesPerSample = 2;
    const byteRate = sampleRate * channels * bytesPerSample;

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, channels * bytesPerSample, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let index = 44;
    const volume = 0.8;
    for (let i = 0; i < samples.length; i++) {
      view.setInt16(index, samples[i] < 0 ? samples[i] * 0x8000 : samples[i] * 0x7fff, true);
      index += 2;
    }

    return buffer;
  }
}

export const audioRecorderManager = new AudioRecorderManager();
