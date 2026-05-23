import React, { useState, useRef, useEffect } from 'react';
import { Camera, Mic, Square, X, Check, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoCaptureFlowProps {
  onClose: () => void;
  onSave: (data: any) => void;
}

export default function VideoCaptureFlow({ onClose, onSave }: VideoCaptureFlowProps) {
  const [step, setStep] = useState<'camera' | 'processing' | 'review'>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  // Mock analysis results
  const [analysis, setAnalysis] = useState({
    text: '',
    emotions: [] as string[],
    intensity: 0,
    complexity: 0,
    novelty: 0
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: true 
        });
        setVideoStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Camera access denied. Please enable permissions to record dreams.");
        onClose();
      }
    };
    startCamera();

    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    audioChunksRef.current = [];

    // Start Timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);

    // Start Media Recorder
    if (videoStream) {
      const mediaRecorder = new MediaRecorder(videoStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        
        // Create video preview thumbnail
        if (canvasRef.current && videoRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setVideoPreview(canvas.toDataURL('image/jpeg'));
          }
        }
        
        handleProcessing();
      };

      mediaRecorder.start();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleProcessing = () => {
    setStep('processing');
    
    // Stop camera stream to save battery during processing
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }

    // Simulate AI Processing Pipeline
    setTimeout(() => {
      // Mock Results - In real app, send blob to API here
      setAnalysis({
        text: "I was walking through a city made entirely of glass. The buildings were transparent and I could see people living their lives inside like dolls in a house. Suddenly, the ground started to ripple like water. I wasn't scared, just fascinated. Then I woke up.",
        emotions: ["Fascination", "Curiosity", "Calm"],
        intensity: 7.5,
        complexity: 8.2,
        novelty: 9.0
      });
      setStep('review');
    }, 3000);
  };

  const handleSave = () => {
    onSave({
      content: analysis.text,
      type: 'video',
      thumbnail: videoPreview,
      metrics: {
        complexity: analysis.complexity,
        emotionalIntensity: analysis.intensity,
        novelty: analysis.novelty
      },
      tags: analysis.emotions,
      rawAudio: audioBlob, // Would upload to storage in real app
      createdAt: new Date().toISOString()
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      <AnimatePresence mode="wait">
        {step === 'camera' && (
          <motion.div 
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 relative flex flex-col"
          >
            {/* Video Feed */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
            />
            
            {/* Overlay UI */}
            <div className="relative z-10 flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-black/60 via-transparent to-black/80">
              
              {/* Top Bar */}
              <div className="flex justify-between items-center">
                <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition">
                  <X size={24} />
                </button>
                <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white text-sm font-medium flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  AI Analysis Active
                </div>
                <div className="w-12" /> {/* Spacer */}
              </div>

              {/* Center Instructions */}
              {!isRecording && (
                <div className="text-center text-white/80">
                  <h3 className="text-xl font-light mb-2">Record your dream</h3>
                  <p className="text-sm opacity-70">Speak naturally. We'll analyze your voice & expressions.</p>
                </div>
              )}

              {/* Bottom Controls */}
              <div className="flex flex-col items-center gap-6 pb-8">
                {isRecording && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-white font-mono text-2xl tracking-widest bg-black/50 px-4 py-2 rounded-lg backdrop-blur-md border border-white/10"
                  >
                    {formatTime(recordingTime)}
                  </motion.div>
                )}

                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isRecording 
                      ? 'bg-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.6)]' 
                      : 'bg-white/20 backdrop-blur-md border-2 border-white/40 hover:bg-white/30'
                  }`}
                >
                  {isRecording ? (
                    <Square size={32} className="text-white fill-white" />
                  ) : (
                    <div className="w-8 h-8 bg-white rounded-full" />
                  )}
                  
                  {/* Recording Pulse Ring */}
                  {isRecording && (
                    <motion.div
                      animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 rounded-full border-2 border-red-500"
                    />
                  )}
                </button>
                
                <p className="text-white/50 text-xs uppercase tracking-wider">
                  {isRecording ? 'Tap to Stop' : 'Tap to Record'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div 
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white p-8"
          >
            <div className="relative w-24 h-24 mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-r-2 border-purple-500"
              />
              <div className="absolute inset-2 rounded-full bg-gray-800 flex items-center justify-center">
                <Sparkles size={32} className="text-purple-400" />
              </div>
            </div>
            
            <h3 className="text-2xl font-light mb-2">Analyzing Dream...</h3>
            <div className="space-y-2 text-center">
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.5 }}
                className="text-gray-400 flex items-center gap-2 justify-center"
              >
                <Check size={16} className="text-green-500" /> Transcribing audio
              </motion.p>
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 1.5 }}
                className="text-gray-400 flex items-center gap-2 justify-center"
              >
                <Check size={16} className="text-green-500" /> Detecting facial micro-expressions
              </motion.p>
              <motion.p 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 2.5 }}
                className="text-purple-400 flex items-center gap-2 justify-center"
              >
                <Loader2 size={16} className="animate-spin" /> Generating insights
              </motion.p>
            </div>
          </motion.div>
        )}

        {step === 'review' && (
          <motion.div 
            key="review"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="flex-1 bg-gray-900 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-gray-900/90 backdrop-blur-md p-4 border-b border-gray-800 flex justify-between items-center z-20">
              <button onClick={() => setStep('camera')} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
              <h3 className="text-white font-medium">Review Dream</h3>
              <button 
                onClick={handleSave}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2 rounded-full font-medium transition flex items-center gap-2"
              >
                Save <Check size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Video Thumbnail */}
              {videoPreview && (
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-800 relative shadow-2xl">
                  <img src={videoPreview} alt="Dream capture" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                      <Mic size={12} /> Audio Captured
                    </span>
                    <span className="bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full flex items-center gap-1">
                      <Camera size={12} /> Face Analyzed
                    </span>
                  </div>
                </div>
              )}

              {/* Generated Text */}
              <div className="space-y-2">
                <label className="text-gray-400 text-sm font-medium">Transcribed Dream</label>
                <textarea 
                  value={analysis.text}
                  onChange={(e) => setAnalysis({...analysis, text: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white min-h-[200px] focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              {/* Detected Emotions */}
              <div className="space-y-2">
                <label className="text-gray-400 text-sm font-medium">Detected Emotions</label>
                <div className="flex flex-wrap gap-2">
                  {analysis.emotions.map((emotion, i) => (
                    <span key={i} className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-4 py-2 rounded-full text-sm">
                      {emotion}
                    </span>
                  ))}
                </div>
              </div>

              {/* Metrics Preview */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
                <div className="text-center p-3 bg-gray-800/50 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1">Complexity</div>
                  <div className="text-xl font-bold text-blue-400">{analysis.complexity}</div>
                </div>
                <div className="text-center p-3 bg-gray-800/50 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1">Intensity</div>
                  <div className="text-xl font-bold text-pink-400">{analysis.intensity}</div>
                </div>
                <div className="text-center p-3 bg-gray-800/50 rounded-xl">
                  <div className="text-xs text-gray-400 mb-1">Novelty</div>
                  <div className="text-xl font-bold text-amber-400">{analysis.novelty}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
