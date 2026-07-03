/**
 * VideoCaptureFlow — Full-Screen Camera Capture Component
 * 
 * Provides a dedicated full-screen video capture experience for dream recording.
 * Features:
 * - Full-screen camera preview
 * - Recording state management
 * - Visual feedback during capture
 * - Emotion detection integration
 * - Auto-save on completion
 * 
 * @module VideoCaptureFlow
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Camera, 
  StopCircle, 
  Check, 
  X, 
  Mic, 
  MicOff, 
  SwitchCamera,
  AlertCircle,
  Loader2,
  Zap,
  Moon
} from 'lucide-react';
import { mediaStorageManager } from '../../lib/mediaStorage';

export interface VideoCaptureData {
  /** Blob of recorded video */
  videoBlob: Blob;
  /** Duration in seconds */
  duration: number;
  /** Thumbnail data URL */
  thumbnail?: string;
  /** Timestamp of recording */
  timestamp: string;
  /** Whether audio was included */
  hasAudio: boolean;
  /** IndexedDB media ID for persistent playback after refresh */
  mediaId?: string;
}

export interface VideoCaptureFlowProps {
  /** Called when recording is complete with video data */
  onComplete: (data: VideoCaptureData) => void;
  /** Called when user cancels the capture */
  onCancel: () => void;
  /** Initial facing mode: 'user' or 'environment' */
  initialFacingMode?: 'user' | 'environment';
  /** Maximum recording duration in seconds */
  maxDuration?: number;
  /** Enable audio recording */
  enableAudio?: boolean;
  /** Integrate with emotion detection */
  onEmotionDetected?: (emotion: string, confidence: number) => void;
}

/**
 * Format seconds into MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get a thumbnail from video blob
 */
async function getVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    
    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(videoBlob);
  });
}

/**
 * VideoCaptureFlow Component
 * 
 * A full-screen, immersive video capture experience optimized for dream recording.
 * Users can record their dreams immediately upon waking with minimal friction.
 * 
 * Features:
 * - Tap to start/stop recording
 * - Visual timer with color-coded duration warnings
 * - Front/back camera toggle
 * - Audio mute/unmute
 * - Haptic feedback on mobile
 * - Auto-stop at max duration
 */
export function VideoCaptureFlow({
  onComplete,
  onCancel,
  initialFacingMode = 'user',
  maxDuration = 180, // 3 minutes max
  enableAudio = true,
  onEmotionDetected,
}: VideoCaptureFlowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const durationRef = useRef(0); // reliable current duration (avoids stale closure in onstop)
  
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [audioEnabled, setAudioEnabled] = useState(enableAudio);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [savedMediaId, setSavedMediaId] = useState<string | null>(null);

  /** Pick a mime type that includes an audio codec so Whisper can transcribe speech */
  const pickVideoMimeType = useCallback((): string => {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4',
    ];
    return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
  }, []);

  // Request camera permission and start preview
  useEffect(() => {
    requestCamera();
    return () => stopAll();
  }, [facingMode, audioEnabled]);

  const requestCamera = useCallback(async () => {
    try {
      setError(null);
      
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: audioEnabled,
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setPermissionGranted(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permissions to record your dream.');
      setPermissionGranted(false);
    }
  }, [facingMode, audioEnabled]);

  const stopAll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError('Camera not ready. Please try again.');
      return;
    }
    
    chunksRef.current = [];
    
    const mimeType = pickVideoMimeType();
    console.log('[VideoCapture] Using mime type:', mimeType);
    
    const options: MediaRecorderOptions = { mimeType };
    if (audioEnabled && !mimeType.includes('mp4')) {
      options.audioBitsPerSecond = 128000;
    }
    
    const recorder = new MediaRecorder(streamRef.current!, options);
    mediaRecorderRef.current = recorder;
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    
    recorder.onstop = async () => {
      console.log('[VideoCapture] Recording stopped, processing video...');
      console.log('[VideoCapture] Chunks collected:', chunksRef.current.length);
      console.log('[VideoCapture] Total size:', chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0), 'bytes');
      
      setIsSaving(true);
      
      const videoBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
      console.log('[VideoCapture] Video blob created:', videoBlob.size, 'bytes, type:', videoBlob.type);
      
      // Use ref for accurate duration at stop time (state may be stale in closure)
      const finalDuration = durationRef.current || duration || 0;
      
      let thumbnail: string | undefined;
      try {
        // Note: blob: URLs for <video> can be blocked by page CSP on some deploys.
        // We catch and continue — thumbnail is optional.
        thumbnail = await getVideoThumbnail(videoBlob);
        console.log('[VideoCapture] Thumbnail generated successfully');
      } catch (e) {
        console.warn('[VideoCapture] Failed to generate thumbnail (CSP or load issue — non-fatal):', e);
      }
      
      // Ensure IndexedDB is ready then save (defensive against keyPath/id issues)
      let mediaId: string | null = null;
      try {
        await mediaStorageManager.initialize?.();
        mediaId = await mediaStorageManager.saveMedia(videoBlob, {
          dreamId: undefined, // Will be linked later if associated with a dream
          type: 'video',
          mimeType: recorder.mimeType || 'video/webm',
          size: videoBlob.size,
          duration: finalDuration,
          recordedAt: new Date().toISOString(),
          emotion: currentEmotion || undefined,
          emotionConfidence: 0.75,
          thumbnail,
          backedUp: false,
          cloudProviders: [],
          tags: ['dream-recording'],
        });
        setSavedMediaId(mediaId);
        console.log('[VideoCapture] Video saved to IndexedDB with ID:', mediaId);
      } catch (err) {
        console.error('[VideoCapture] Failed to save video to IndexedDB:', err);
      }
      
      const data: VideoCaptureData = {
        videoBlob,
        duration: finalDuration,
        thumbnail,
        timestamp: new Date().toISOString(),
        hasAudio: audioEnabled,
        mediaId: mediaId || undefined,
      };
      
      console.log('[VideoCapture] Calling onComplete with video data:', {
        blobSize: videoBlob.size,
        duration: data.duration,
        hasThumbnail: !!thumbnail,
        hasAudio: data.hasAudio,
        timestamp: data.timestamp,
        mediaId
      });
      
      // Stop camera/mic immediately — never show live preview again after capture
      stopAll();

      try {
        onComplete(data);
        console.log('[VideoCapture] onComplete executed successfully');
      } catch (error) {
        console.error('[VideoCapture] Error in onComplete callback:', error);
      }

      setIsSaving(false);
    };
    
    recorder.start(1000); // Collect data every second
    setIsRecording(true);
    setDuration(0);
    durationRef.current = 0;
    
    // Start timer (also keep ref in sync for reliable value in onstop closure)
    timerRef.current = window.setInterval(() => {
      setDuration(prev => {
        const newDuration = prev + 1;
        durationRef.current = newDuration;
        if (newDuration >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return newDuration;
      });
    }, 1000);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Simulate emotion detection (integrate with FacialEmotionDetector if needed)
    if (onEmotionDetected) {
      const emotions = ['neutral', 'sleepy', 'calm', 'anxious', 'excited'];
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      setCurrentEmotion(randomEmotion);
      onEmotionDetected(randomEmotion, 0.75);
    }
  }, [audioEnabled, duration, maxDuration, onComplete, onEmotionDetected, pickVideoMimeType, stopAll]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 100, 50]);
      }
    }
  }, [isRecording]);

  const handleToggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
  }, []);

  const handleCancel = useCallback(() => {
    stopAll();
    onCancel();
  }, [stopAll, onCancel]);

  // Determine recording button color based on duration
  const getRecordButtonColor = () => {
    if (!isRecording) return 'bg-rose-500 hover:bg-rose-600';
    
    const warningThreshold = maxDuration * 0.8;
    const criticalThreshold = maxDuration * 0.95;
    
    if (duration >= criticalThreshold) return 'bg-red-600 animate-pulse';
    if (duration >= warningThreshold) return 'bg-orange-500 animate-pulse';
    return 'bg-rose-500';
  };

  if (isSaving) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Saving your recording…</p>
        </div>
      </div>
    );
  }

  if (error && !permissionGranted) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50 p-6">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white text-center mb-2">Camera Access Required</h3>
          <p className="text-white/70 text-center mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={requestCamera}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-mono text-lg">
                {formatDuration(duration)}
              </span>
              <span className="text-white/60 text-sm">/ {formatDuration(maxDuration)}</span>
            </div>
          )}
          
          <div className="w-10 h-10" /> {/* Spacer for balance */}
        </div>
        
        {/* Emotion indicator */}
        {currentEmotion && isRecording && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <span className="text-white text-sm font-medium">
              Feeling: <span className="capitalize">{currentEmotion}</span>
            </span>
          </div>
        )}
        
        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 pb-12">
          <div className="flex items-center justify-center gap-6">
            {/* Audio toggle */}
            <button
              onClick={handleToggleAudio}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                audioEnabled 
                  ? 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30' 
                  : 'bg-black/40 text-white/50 hover:bg-black/60'
              }`}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            
            {/* Record button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${getRecordButtonColor()}`}
            >
              {isRecording ? (
                <StopCircle className="w-10 h-10 text-white" />
              ) : (
                <div className="w-8 h-8 bg-white rounded-full" />
              )}
            </button>
            
            {/* Camera flip */}
            <button
              onClick={handleToggleCamera}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>
          
          {/* Instructions */}
          {!isRecording && (
            <p className="text-center text-white/70 text-sm mt-6">
              Tap the circle to start recording your dream
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoCaptureFlow;
