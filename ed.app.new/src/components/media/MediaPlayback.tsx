/**
 * MediaPlayback Component - Audio/Video Player with Cloud Backup
 * 
 * Beautiful, responsive media player for dream recordings with:
 * - Audio player with progress bar, play/pause, mute
 * - Video player with overlay controls
 * - Emotion badge display
 * - Cloud backup button with provider selection
 * - Delete functionality
 * - Transcription preview
 * - Glassmorphism design matching app aesthetic
 * 
 * @module MediaPlayback
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Trash2,
  Cloud,
  CheckCircle,
  Loader2,
  Mic,
  Video,
  X,
  Download,
  Share2,
  Heart,
} from 'lucide-react';
import { MediaMetadata } from '../../lib/mediaStorage';
import { CloudBackupProvider } from '../../hooks/useMediaPlayback';

export interface MediaPlaybackProps {
  /** Media metadata */
  metadata: MediaMetadata;
  /** Function to get media blob */
  getBlob: (id: string) => Promise<Blob | null>;
  /** Delete media handler */
  onDelete: (id: string) => void;
  /** Backup to cloud handler */
  onBackup: (mediaId: string, providerId: string) => Promise<void>;
  /** Available cloud providers */
  cloudProviders: CloudBackupProvider[];
  /** Whether backup is in progress */
  isBackingUp: boolean;
  /** Close handler (for modal view) */
  onClose?: () => void;
}

/**
 * Format seconds into MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get emotion color based on emotion type
 */
function getEmotionColor(emotion: string): string {
  const colors: Record<string, string> = {
    neutral: 'bg-gray-500/30 text-gray-200',
    sleepy: 'bg-indigo-500/30 text-indigo-200',
    calm: 'bg-emerald-500/30 text-emerald-200',
    anxious: 'bg-amber-500/30 text-amber-200',
    excited: 'bg-rose-500/30 text-rose-200',
    happy: 'bg-yellow-500/30 text-yellow-200',
    sad: 'bg-blue-500/30 text-blue-200',
    fearful: 'bg-purple-500/30 text-purple-200',
  };
  return colors[emotion.toLowerCase()] || 'bg-gray-500/30 text-gray-200';
}

/**
 * Audio Player Component
 */
const AudioPlayer: React.FC<{
  blobUrl: string;
  duration: number;
  onProgress: (time: number) => void;
}> = ({ blobUrl, duration, onProgress }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      onProgress(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onProgress]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  return (
    <div className="w-full space-y-4">
      <audio ref={audioRef} src={blobUrl} preload="metadata" />
      
      {/* Progress bar */}
      <div className="relative w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition transform active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-white" />
          ) : (
            <Play className="w-6 h-6 text-white ml-1" />
          )}
        </button>
        
        {/* Time display */}
        <div className="flex-1 mx-4 text-center">
          <span className="text-white/80 font-mono text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Video Player Component
 */
const VideoPlayer: React.FC<{
  blobUrl: string;
  thumbnail?: string;
  onProgress: (time: number) => void;
}> = ({ blobUrl, thumbnail, onProgress }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const controlTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onProgress(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setShowControls(true);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onProgress]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlTimeoutRef.current) {
      clearTimeout(controlTimeoutRef.current);
    }
    controlTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (controlTimeoutRef.current) {
        clearTimeout(controlTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="relative w-full aspect-video bg-black rounded-xl overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={blobUrl}
        poster={thumbnail}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />
      
      {/* Overlay gradient */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      )}
      
      {/* Controls overlay */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 p-4">
          {/* Progress bar */}
          <div className="relative w-full h-1 bg-white/20 rounded-full mb-4 overflow-hidden">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
          </div>
          
          {/* Play button */}
          <div className="flex items-center justify-center">
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition transform active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-white" />
              ) : (
                <Play className="w-8 h-8 text-white ml-1" />
              )}
            </button>
          </div>
          
          {/* Time display */}
          <div className="text-center mt-2">
            <span className="text-white/80 font-mono text-xs">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>
      )}
      
      {/* Play overlay when paused */}
      {!isPlaying && !showControls && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Play className="w-20 h-20 text-white/80" />
        </div>
      )}
    </div>
  );
};

/**
 * Cloud Backup Selector Component
 */
const CloudBackupSelector: React.FC<{
  providers: CloudBackupProvider[];
  isBackedUp: boolean;
  isBackingUp: boolean;
  onBackup: (providerId: string) => void;
}> = ({ providers, isBackedUp, isBackingUp, onBackup }) => {
  const [showSelector, setShowSelector] = useState(false);

  if (isBackedUp) {
    return (
      <div className="flex items-center gap-2 text-emerald-400">
        <CheckCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Backed up</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowSelector(!showSelector)}
        disabled={isBackingUp}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
      >
        {isBackingUp ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Cloud className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">
          {isBackingUp ? 'Backing up...' : 'Backup'}
        </span>
      </button>
      
      {showSelector && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden z-50">
          <div className="p-3 border-b border-white/10">
            <h4 className="text-white font-semibold text-sm">Select Provider</h4>
          </div>
          <div className="p-2 space-y-1">
            {providers.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  onBackup(provider.id);
                  setShowSelector(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition"
              >
                <span className="text-xl">{provider.icon}</span>
                <span className="text-white text-sm flex-1 text-left">{provider.name}</span>
                {provider.connected && (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main MediaPlayback Component
 */
export function MediaPlayback({
  metadata,
  getBlob,
  onDelete,
  onBackup,
  cloudProviders,
  isBackingUp,
  onClose,
}: MediaPlaybackProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    const loadBlob = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const blob = await getBlob(metadata.id);
        
        if (!blob) {
          throw new Error('Media not found');
        }
        
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load media';
        setError(message);
        console.error('[MediaPlayback] Error loading blob:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBlob();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [metadata.id, getBlob]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to delete this recording? This cannot be undone.')) {
      onDelete(metadata.id);
    }
  }, [onDelete, metadata.id]);

  const handleBackup = useCallback(async (providerId: string) => {
    try {
      await onBackup(metadata.id, providerId);
    } catch (err) {
      console.error('[MediaPlayback] Backup failed:', err);
    }
  }, [onBackup, metadata.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          {metadata.type === 'audio' ? (
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-emerald-400" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <Video className="w-5 h-5 text-purple-400" />
            </div>
          )}
          <div>
            <h3 className="text-white font-semibold">
              {metadata.type === 'audio' ? 'Voice Memo' : 'Video Recording'}
            </h3>
            <p className="text-white/60 text-sm">
              {new Date(metadata.recordedAt).toLocaleDateString()} at{' '}
              {new Date(metadata.recordedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>
      
      {/* Media Player */}
      <div className="mb-6">
        {metadata.type === 'audio' && blobUrl ? (
          <AudioPlayer
            blobUrl={blobUrl}
            duration={metadata.duration}
            onProgress={() => {}}
          />
        ) : metadata.type === 'video' && blobUrl ? (
          <VideoPlayer
            blobUrl={blobUrl}
            thumbnail={metadata.thumbnail}
            onProgress={() => {}}
          />
        ) : null}
      </div>
      
      {/* Metadata & Actions */}
      <div className="space-y-4">
        {/* Emotion badge */}
        {metadata.emotion && (
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Emotion:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEmotionColor(metadata.emotion)}`}>
              {metadata.emotion}
              {metadata.emotionConfidence && (
                <span className="ml-1 opacity-70">
                  ({Math.round(metadata.emotionConfidence * 100)}%)
                </span>
              )}
            </span>
          </div>
        )}
        
        {/* Transcription preview */}
        {metadata.transcription && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Transcription
            </h4>
            <p className="text-white/70 text-sm line-clamp-3">
              {metadata.transcription}
            </p>
          </div>
        )}
        
        {/* Actions bar */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <CloudBackupSelector
              providers={cloudProviders}
              isBackedUp={metadata.backedUp}
              isBackingUp={isBackingUp}
              onBackup={handleBackup}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              title="Share"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={handleDelete}
              className="w-10 h-10 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition"
              title="Delete"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaPlayback;
