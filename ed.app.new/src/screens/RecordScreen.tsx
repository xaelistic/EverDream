import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import DreamCapture from '../components/dreams/DreamCapture';
import VideoCaptureFlow from '../components/capture/VideoCaptureFlow';
import type { VideoCaptureData } from '../components/capture/VideoCaptureFlow';
import { CaptureModeBar, type CaptureMode } from '../components/capture/CaptureModeBar';
import { AudioWaveform } from '../components/capture/AudioWaveform';
import { Mic, Square, Loader2, X, Upload, FileText, ArrowLeft } from 'lucide-react';
import { mediaStorageManager } from '../lib/mediaStorage';
import { stopCaptureMedia } from '../lib/stopCaptureMedia';


interface RecordScreenProps {
  onComplete: (result: any, text: string) => Promise<void>;
  onCancel: () => void;
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Audio journal with live waveform (WhatsApp / Messenger style) */
function AudioJournalCapture({
  onComplete,
  onCancel,
  onModeChange,
}: {
  onComplete: (result: any, text: string) => Promise<void>;
  onCancel: () => void;
  onModeChange: (mode: CaptureMode) => void;
}) {
  const { addToast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const durationRef = useRef(0);

  const stopLiveCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAnalyser(null);
    mediaRecorderRef.current = null;
    setIsRecording(false);
    stopCaptureMedia();
  }, []);

  const resetCaptureState = useCallback(() => {
    stopLiveCapture();
    chunksRef.current = [];
    setDuration(0);
    durationRef.current = 0;
  }, [stopLiveCapture]);

  useEffect(() => () => resetCaptureState(), [resetCaptureState]);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      source.connect(analyserNode);
      setAnalyser(analyserNode);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setIsSaving(true);
        const savedChunks = [...chunksRef.current];
        const recordingDuration = durationRef.current;
        stopLiveCapture();

        const audioBlob = new Blob(savedChunks, { type: mimeType });

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

        const audioUrl = URL.createObjectURL(audioBlob);

        try {
          await onComplete({
            audioBlob,
            audioUrl,
            duration: recordingDuration,
            mediaId,
            hasAudio: true,
          }, '');
        } finally {
          chunksRef.current = [];
          setDuration(0);
          durationRef.current = 0;
          setIsSaving(false);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      setDuration(0);
      durationRef.current = 0;

      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          durationRef.current = next;
          if (next >= 300) {
            stopAudioRecording();
            return 300;
          }
          return next;
        });
      }, 1000);
    } catch (error) {
      console.error('[AudioJournal] Failed to start:', error);
      addToast({ type: 'error', message: 'Unable to access microphone. Please check permissions.' });
      resetCaptureState();
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleCancel = () => {
    if (isRecording) stopAudioRecording();
    resetCaptureState();
    onCancel();
  };

  if (isSaving) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-center text-white px-6">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Saving your recording…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950 to-black z-50 flex flex-col">
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center text-white">
          <button type="button" onClick={handleCancel} className="p-2" aria-label="Cancel">
            <X className="w-6 h-6" />
          </button>
          <span className="text-sm opacity-70">Audio journal</span>
          <div className="w-10" />
        </div>
        {!isRecording && (
          <CaptureModeBar active="audio" onChange={onModeChange} variant="dark" />
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center text-white">
        <AudioWaveform
          analyser={analyser}
          isActive={isRecording}
          className="mb-8 opacity-90"
        />

        <div className="text-5xl font-mono tracking-[4px] mb-2">
          {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
        </div>
        <p className="text-white/60 mb-10">
          {isRecording ? 'Describe your dream…' : 'Tap to record your dream'}
        </p>

        <button
          type="button"
          onClick={isRecording ? stopAudioRecording : startAudioRecording}
          className={`w-28 h-28 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            isRecording ? 'bg-rose-600 hover:bg-rose-700' : 'bg-white/10 hover:bg-white/20 border border-white/30'
          }`}
        >
          {isRecording ? <Square className="w-12 h-12" /> : <Mic className="w-12 h-12" />}
        </button>
      </div>
    </div>
  );
}

/** Upload text or audio files */
function UploadCapturePanel({
  onComplete,
  onCancel,
  onModeChange,
}: {
  onComplete: (result: any, text: string) => Promise<void>;
  onCancel: () => void;
  onModeChange: (mode: CaptureMode) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTextUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      const text = await readTextFile(file);
      if (text.trim().length < 10) {
        setError('File is too short — need at least a few sentences about your dream.');
        return;
      }
      await onComplete({ uploadedText: true, fileName: file.name }, text.trim());
    } catch {
      setError('Could not read that file. Try .txt or .md for now.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAudioUpload = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    try {
      let mediaId: string | null = null;
      try {
        mediaId = await mediaStorageManager.saveMedia(file, {
          type: 'audio',
          mimeType: file.type,
          size: file.size,
          duration: 0,
          recordedAt: new Date().toISOString(),
          backedUp: false,
          cloudProviders: [],
          tags: ['audio-upload'],
        });
      } catch { /* continue */ }

      const audioUrl = URL.createObjectURL(file);
      await onComplete({ audioBlob: file, audioUrl, duration: 0, mediaId }, '');
    } catch (err) {
      console.error('[Upload] Audio pipeline failed:', err);
      setError('Could not process audio file. Try a shorter clip or different format.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <CaptureModeBar active="upload" onChange={onModeChange} />

      <div className="rounded-3xl border border-line bg-cream p-6 shadow-lift space-y-4">
        <h2 className="font-serif text-xl text-ink">Upload a dream</h2>
        <p className="text-sm text-muted">
          Import a text file you wrote earlier, or an audio voice memo. We&apos;ll transcribe audio,
          extract emotional tone, and build your XAEL narrative.
        </p>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">{error}</div>
        )}

        {isProcessing ? (
          <div className="flex items-center justify-center gap-3 py-8 text-muted">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Processing upload…</span>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-line hover:border-sage/50 hover:bg-sage/5 cursor-pointer transition">
              <FileText className="w-10 h-10 text-sage" />
              <span className="font-semibold text-ink text-sm">Text file</span>
              <span className="text-xs text-muted text-center">.txt, .md, .text</span>
              <input
                type="file"
                accept=".txt,.md,.text,text/plain,text/markdown"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleTextUpload(file);
                  e.target.value = '';
                }}
              />
            </label>

            <label className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-line hover:border-sage/50 hover:bg-sage/5 cursor-pointer transition">
              <Upload className="w-10 h-10 text-dusk" />
              <span className="font-semibold text-ink text-sm">Audio file</span>
              <span className="text-xs text-muted text-center">.m4a, .mp3, .ogg, .webm</span>
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAudioUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        )}

        <p className="text-xs text-muted text-center">
          PDF import coming soon — for now save as .txt or paste in Text mode.
        </p>
      </div>
    </div>
  );
}

export function RecordScreen({ onComplete, onCancel }: RecordScreenProps) {
  const { addToast } = useToast();
  const [mode, setMode] = useState<CaptureMode>('video');

  const handleModeChange = (next: CaptureMode) => {
    setMode(next);
  };

  if (mode === 'video') {
    return (
      <div className="relative">
        <div className="fixed top-16 left-0 right-0 z-[60] px-4 max-w-lg mx-auto pointer-events-none">
          <div className="pointer-events-auto">
            <CaptureModeBar active="video" onChange={handleModeChange} variant="dark" />
          </div>
        </div>
        <VideoCaptureFlow
          onComplete={async (data: VideoCaptureData) => {
            const videoUrl = URL.createObjectURL(data.videoBlob);
            await onComplete({
              videoBlob: data.videoBlob,
              videoUrl,
              thumbnail: data.thumbnail,
              duration: data.duration,
              timestamp: data.timestamp,
              hasAudio: data.hasAudio,
              mediaId: data.mediaId,
            }, '');
          }}
          onCancel={onCancel}
          maxDuration={180}
          enableAudio={true}
        />
      </div>
    );
  }

  if (mode === 'audio') {
    return (
      <AudioJournalCapture
        onComplete={onComplete}
        onCancel={onCancel}
        onModeChange={handleModeChange}
      />
    );
  }

  if (mode === 'upload') {
    return (
      <UploadCapturePanel
        onComplete={onComplete}
        onCancel={onCancel}
        onModeChange={handleModeChange}
      />
    );
  }

  // Text mode
  return (
    <div className="space-y-4">
      <CaptureModeBar active="text" onChange={handleModeChange} />
      <DreamCapture onComplete={onComplete} onCancel={onCancel} />
    </div>
  );
}