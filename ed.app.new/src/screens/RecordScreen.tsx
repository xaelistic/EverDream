import React, { useState, useRef } from 'react';
import DreamCapture from '../components/dreams/DreamCapture';
import VideoCaptureFlow from '../components/capture/VideoCaptureFlow';
import type { ExtractedDreamEntry } from './PhotoUploadFlow';
import type { VideoCaptureData } from '../components/capture/VideoCaptureFlow';
import { Mic, Square, Loader2, X } from 'lucide-react';
import { mediaStorageManager } from '../lib/mediaStorage';

interface RecordScreenProps {
  onComplete: (result: any, text: string) => Promise<void>;
  onCancel: () => void;
  captureMode?: 'text' | 'video' | 'audio';
}

/**
 * Simple full-screen audio journal recorder.
 * Uses direct MediaRecorder for audio-only (no camera).
 * Saves to mediaStorage (IndexedDB) for consistency with video.
 * Ported/adapted from legacy audio journal features in old versions + current audioRecorder module.
 */
function AudioJournalCapture({ 
  onComplete, 
  onCancel 
}: { 
  onComplete: (result: any, text: string) => Promise<void>; 
  onCancel: () => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true, 
          autoGainControl: true 
        } 
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setIsProcessing(true);
        
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const recordingDuration = duration;

        // Save to IndexedDB via mediaStorage (consistent with video path)
        let mediaId: string | null = null;
        try {
          mediaId = await mediaStorageManager.saveMedia(audioBlob, {
            type: 'audio',
            mimeType,
            size: audioBlob.size,
            duration: recordingDuration,
            recordedAt: new Date().toISOString(),
            backedUp: false,
            cloudProviders: [],
            tags: ['audio-journal'],
          });
        } catch (err) {
          console.error('[AudioJournal] Failed to save audio:', err);
        }

        // Create audio URL for immediate use (like videoUrl)
        const audioUrl = URL.createObjectURL(audioBlob);

        await onComplete({
          audioBlob,
          audioUrl,
          duration: recordingDuration,
          timestamp: new Date().toISOString(),
          mediaId,
          hasAudio: true,
        }, '');

        cleanup();
        setIsProcessing(false);
      };

      recorder.start(1000);
      setIsRecording(true);
      setDuration(0);

      // Timer
      timerRef.current = window.setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          if (next >= 300) { // 5 min max for audio journal
            stopAudioRecording();
            return 300;
          }
          return next;
        });
      }, 1000);

      console.log('[AudioJournal] Audio recording started');
    } catch (error) {
      console.error('[AudioJournal] Failed to start audio recording:', error);
      alert('Unable to access microphone for audio journal. Please check permissions.');
      cleanup();
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
    setDuration(0);
  };

  const handleCancel = () => {
    if (isRecording) stopAudioRecording();
    cleanup();
    onCancel();
  };

  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Saving your audio journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950 to-black z-50 flex flex-col">
      {/* Top bar */}
      <div className="p-4 flex justify-between items-center text-white">
        <button onClick={handleCancel} className="p-2">
          <X className="w-6 h-6" />
        </button>
        <div className="text-sm opacity-70">Audio Journal</div>
        <div className="w-8" />
      </div>

      {/* Main content - big mic UI */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-white">
        <div className="mb-8">
          <Mic className={`w-24 h-24 ${isRecording ? 'text-rose-400 animate-pulse' : 'text-white/80'}`} />
        </div>

        <div className="text-5xl font-mono tracking-[4px] mb-2">
          {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
        </div>
        <p className="text-white/60 mb-12">
          {isRecording ? 'Recording your dream...' : 'Tap the microphone to begin'}
        </p>

        <button
          onClick={isRecording ? stopAudioRecording : startAudioRecording}
          className={`w-28 h-28 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            isRecording 
              ? 'bg-rose-600 hover:bg-rose-700' 
              : 'bg-white/10 hover:bg-white/20 border border-white/30'
          }`}
        >
          {isRecording ? (
            <Square className="w-12 h-12" />
          ) : (
            <Mic className="w-12 h-12" />
          )}
        </button>

        <p className="mt-8 text-xs text-white/50 max-w-[260px]">
          Speak clearly about your dream. Audio is saved privately to your device first.
        </p>
      </div>

      {/* Bottom hint */}
      <div className="p-6 text-center text-[10px] text-white/40">
        Audio journals are great for quick voice notes without the camera
      </div>
    </div>
  );
}

export function RecordScreen({ onComplete, onCancel, captureMode = 'video' }: RecordScreenProps) {
  // Full-screen video capture mode (immersive, camera)
  if (captureMode === 'video') {
    return (
      <VideoCaptureFlow
        onComplete={(data: VideoCaptureData) => {
          const videoUrl = URL.createObjectURL(data.videoBlob);
          onComplete({
            videoBlob: data.videoBlob,
            videoUrl,
            thumbnail: data.thumbnail,
            duration: data.duration,
            timestamp: data.timestamp,
            hasAudio: data.hasAudio,
          }, '');
        }}
        onCancel={onCancel}
        maxDuration={180}
        enableAudio={true}
      />
    );
  }

  // Dedicated audio journal mode (mic / voice note)
  if (captureMode === 'audio') {
    return (
      <AudioJournalCapture 
        onComplete={onComplete} 
        onCancel={onCancel} 
      />
    );
  }

  // Text (or fallback) capture mode
  return (
    <DreamCapture
      onComplete={onComplete}
      onCancel={onCancel}
    />
  );
}
