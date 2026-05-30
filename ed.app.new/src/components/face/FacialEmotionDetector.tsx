import { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, Smile, Frown, Meh, AlertCircle, Loader2 } from 'lucide-react';

export interface EmotionCapture {
  /** Dominant emotion detected */
  dominantEmotion: string;
  /** All emotions with confidence scores */
  emotions: Record<string, number>;
  /** Face detection confidence */
  confidence: number;
  /** Timestamp of capture */
  timestamp: string;
  /** Whether a face was detected */
  faceDetected: boolean;
}

interface FacialEmotionDetectorProps {
  /** Called when emotions are captured from video */
  onEmotionsCaptured: (emotions: EmotionCapture) => void;
  /** Whether the detector is active */
  isActive: boolean;
  /** Size of the video element */
  width?: number;
  height?: number;
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

/**
 * Load face-api.js models from CDN
 */
async function loadModels(): Promise<boolean> {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    ]);
    return true;
  } catch (error) {
    console.error('Failed to load face-api models:', error);
    return false;
  }
}

export function FacialEmotionDetector({
  onEmotionsCaptured,
  isActive,
  width = 320,
  height = 240,
}: FacialEmotionDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEmotions, setCurrentEmotions] = useState<EmotionCapture | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // Load models on mount
  useEffect(() => {
    if (isActive && !modelsLoaded) {
      setLoading(true);
      loadModels()
        .then((success) => {
          setModelsLoaded(success);
          if (!success) {
            setError('Failed to load face detection models');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isActive, modelsLoaded]);

  // Start/stop camera
  useEffect(() => {
    if (isActive && modelsLoaded) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isActive, modelsLoaded]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width, height },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      startDetection();
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera permissions.');
    }
  }, [width, height]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setFaceDetected(false);
    setCurrentEmotions(null);
  }, []);

  const startDetection = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceExpressions();

        if (detection) {
          setFaceDetected(true);
          const expressions = detection.expressions;

          // Find dominant emotion
          let dominant = 'neutral';
          let maxScore = 0;
          const emotionMap: Record<string, number> = {};

          expressions.forEach((emotion, score) => {
            const rounded = Math.round(score * 100) / 100;
            emotionMap[emotion] = rounded;
            if (score > maxScore) {
              maxScore = score;
              dominant = emotion;
            }
          });

          const capture: EmotionCapture = {
            dominantEmotion: dominant,
            emotions: emotionMap,
            confidence: Math.round(detection.detection.score * 100) / 100,
            timestamp: new Date().toISOString(),
            faceDetected: true,
          };

          setCurrentEmotions(capture);
          onEmotionsCaptured(capture);
        } else {
          setFaceDetected(false);
        }
      } catch (err) {
        // Silently skip frames that fail
      }
    }, 500); // Detect every 500ms
  }, [onEmotionsCaptured]);

  const getEmotionEmoji = (emotion: string): string => {
    const map: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      fearful: '😰',
      disgusted: '🤢',
      surprised: '😲',
      neutral: '😐',
    };
    return map[emotion] || '😐';
  };

  const getEmotionColor = (emotion: string): string => {
    const map: Record<string, string> = {
      happy: 'text-green-500',
      sad: 'text-blue-500',
      angry: 'text-red-500',
      fearful: 'text-purple-500',
      disgusted: 'text-yellow-600',
      surprised: 'text-amber-500',
      neutral: 'text-gray-500',
    };
    return map[emotion] || 'text-gray-500';
  };

  if (!isActive) return null;

  return (
    <div className="space-y-3">
      {/* Video preview */}
      <div className="relative rounded-2xl overflow-hidden border border-line bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          width={width}
          height={height}
          className="w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Face detection indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${faceDetected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-[10px] text-white/80 font-medium">
            {faceDetected ? 'Face detected' : 'No face'}
          </span>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading face detection...</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center text-white p-4">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Emotion display */}
      {currentEmotions && faceDetected && (
        <div className="rounded-2xl border border-line bg-cream p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getEmotionEmoji(currentEmotions.dominantEmotion)}</span>
              <div>
                <p className={`text-sm font-semibold capitalize ${getEmotionColor(currentEmotions.dominantEmotion)}`}>
                  {currentEmotions.dominantEmotion}
                </p>
                <p className="text-[10px] text-muted">
                  Confidence: {Math.round((currentEmotions.confidence || 0) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {/* Emotion bars */}
          <div className="space-y-1">
            {Object.entries(currentEmotions.emotions)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([emotion, score]) => (
                <div key={emotion} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted w-16 capitalize">{emotion}</span>
                  <div className="flex-1 bg-line rounded-full h-1.5">
                    <div
                      className="bg-sage h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round(score * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted w-8 text-right">
                    {Math.round(score * 100)}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FacialEmotionDetector;
