import { useState, useRef, useEffect } from 'react';
import { Video, Camera, Mic, Square, Play, Pause, X, Check, Sparkles } from 'lucide-react';
import { Button } from '../components/ui';
import { Card } from '../components/ui/Card';
import FacialEmotionDetector, { EmotionCapture } from '../components/face/FacialEmotionDetector';

interface VideoJournalScreenProps {
  onComplete: (videoUrl: string, thumbnailUrl: string, duration: number, videoBlob?: Blob, emotion?: EmotionCapture | null) => Promise<void>;
  onCancel: () => void;
}

export function VideoJournalScreen({ onComplete, onCancel }: VideoJournalScreenProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [capturedEmotion, setCapturedEmotion] = useState<EmotionCapture | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Request camera and microphone permission
  useEffect(() => {
    const requestPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        streamRef.current = stream;
        setHasPermission(true);
      } catch (err) {
        console.error('Error accessing camera/microphone:', err);
        setError('Unable to access camera or microphone. Please check permissions.');
        setHasPermission(false);
      }
    };

    requestPermission();

    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Capture thumbnail from video stream
  const captureThumbnail = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 240;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.7);
    }
    return null;
  };

  const startRecording = () => {
    if (!streamRef.current) {
      setError('Camera stream not available');
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? 'video/webm;codecs=vp9' 
        : 'video/webm'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setVideoBlob(blob);  // persist blob for saving + transcription
      
      // Capture thumbnail from the first frame
      const thumbnail = captureThumbnail();
      setThumbnailUrl(thumbnail);
    };

    mediaRecorder.start(100); // Collect data every 100ms
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    setIsPaused(false);
    setRecordingDuration(0);

    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop the live stream to prevent double video feed / overlaid captures
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  };

  const retake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setThumbnailUrl(null);
    setRecordingDuration(0);
    startRecording();
  };

  const handleSave = async () => {
    if (previewUrl && thumbnailUrl) {
      await onComplete(previewUrl, thumbnailUrl, recordingDuration, videoBlob || undefined, capturedEmotion);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Force autoplay for preview video (fixes common browser autoplay policy issues)
  useEffect(() => {
    if (previewUrl && previewVideoRef.current) {
      const v = previewVideoRef.current;
      v.play().catch((e) => {
        console.warn('[VideoJournal] Autoplay prevented for preview, user may need to click play:', e);
      });
    }
  }, [previewUrl]);

  if (hasPermission === false) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="text-center py-8">
            <Camera className="w-16 h-16 mx-auto mb-4 text-muted opacity-50" />
            <h3 className="text-lg font-semibold text-ink mb-2">Camera Access Required</h3>
            <p className="text-sm text-muted mb-4">
              To record your dream as a video journal, we need access to your camera and microphone.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => window.location.reload()}
              icon={<Check size={16} />}
            >
              Retry Permission
            </Button>
          </div>
        </Card>
        <Button
          variant="ghost"
          size="md"
          onClick={onCancel}
          fullWidth
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden canvas for thumbnail capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video Preview/Recording Area */}
      <Card className="overflow-hidden">
        <div className="relative bg-black aspect-[4/3] rounded-2xl overflow-hidden">
          {!previewUrl ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Recording overlay */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-xs font-medium text-white">
                    {isPaused ? 'Paused' : 'Recording'}
                  </span>
                  <span className="text-xs text-white/80 ml-1">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <video
                ref={previewVideoRef}
                src={previewUrl}
                controls
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt="Video thumbnail"
                  className="absolute bottom-4 right-4 w-16 h-12 object-cover rounded-lg border-2 border-white shadow-lg"
                />
              )}
            </>
          )}
        </div>

        {/* Facial / Emotional Recognition during live recording */}
        {!previewUrl && isRecording && (
          <div className="mt-4">
            <FacialEmotionDetector
              isActive={true}
              onEmotionsCaptured={(emotion) => setCapturedEmotion(emotion)}
              width={320}
              height={180}
            />
          </div>
        )}
      </Card>

      {/* Error message */}
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-600">{error}</p>
        </div>
      )}

      {/* Instructions */}
      {!previewUrl && (
        <Card>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sage mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-ink mb-1">Video Journal</h3>
              <p className="text-sm text-muted leading-relaxed">
                Record yourself describing your dream while it's still fresh. 
                Speak naturally—there's no wrong way to do this. Your video stays private on your device.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        {!previewUrl ? (
          <>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-sage to-sageDark text-cream flex items-center justify-center shadow-lift hover:shadow-xl transition-all hover:scale-105"
              >
                <Square className="w-6 h-6 fill-current" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="w-14 h-14 rounded-full border-2 border-sage text-sageDark flex items-center justify-center hover:bg-sage/10 transition-colors"
                >
                  {isPaused ? <Play className="w-6 h-6 fill-current" /> : <Pause className="w-6 h-6 fill-current" />}
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center shadow-lift hover:shadow-xl transition-all hover:scale-105"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={retake}
              className="w-14 h-14 rounded-full border-2 border-line text-muted flex items-center justify-center hover:bg-parchment transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-sage to-sageDark text-cream flex items-center justify-center shadow-lift hover:shadow-xl transition-all hover:scale-105"
            >
              <Check className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button
          variant="ghost"
          size="md"
          onClick={onCancel}
          disabled={isRecording}
          fullWidth
        >
          Cancel
        </Button>
        {previewUrl && (
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            icon={<Video size={16} />}
            fullWidth
          >
            Save Video Journal
          </Button>
        )}
      </div>
    </div>
  );
}
