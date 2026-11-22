import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { mixToMono, peaksFromChannel } from '../../lib/whisperAudio';

const BARS = 48;

interface VoiceNoteWaveformProps {
  src: string;
  durationLabel?: string | null;
}

export function VoiceNoteWaveform({ src, durationLabel }: VoiceNoteWaveformProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [peaks, setPeaks] = useState<number[]>(() => Array.from({ length: BARS }, () => 0.15));
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio(src);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const onTime = () => {
      if (!audio.duration || !Number.isFinite(audio.duration)) return;
      setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => {
      setPlaying(false);
      setProgress(0);
    };
    const onError = () => {
      if (!cancelled) setFailed(true);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) throw new Error('Could not load the recording');
        const bytes = await response.arrayBuffer();
        const context = new AudioContext();
        const decoded = await context.decodeAudioData(bytes.slice(0));
        await context.close();
        const channels: Float32Array[] = [];
        for (let i = 0; i < decoded.numberOfChannels; i++) channels.push(decoded.getChannelData(i));
        if (!cancelled) setPeaks(peaksFromChannel(mixToMono(channels), BARS));
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.src = '';
      audioRef.current = null;
    };
  }, [src]);

  if (failed) {
    return <audio src={src} controls preload="metadata" className="w-full" />;
  }

  const seek = (clientX: number, width: number, left: number) => {
    const ratio = Math.min(1, Math.max(0, (clientX - left) / width));
    const audio = audioRef.current;
    if (audio?.duration && Number.isFinite(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
    }
    setProgress(ratio);
  };

  return (
    <div className="flex items-center gap-3 px-3 pb-3">
      <button
        type="button"
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (playing) {
            audio.pause();
            setPlaying(false);
            return;
          }
          void audio.play().then(() => setPlaying(true)).catch(() => setFailed(true));
        }}
        className="w-10 h-10 shrink-0 rounded-full bg-sage text-cream flex items-center justify-center"
      >
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <button
        type="button"
        aria-label="Voice note waveform"
        className="flex-1 flex items-center gap-[2px] h-10"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          seek(event.clientX, rect.width, rect.left);
        }}
      >
        {peaks.map((peak, index) => {
          const played = (index + 1) / peaks.length <= progress;
          return (
            <span
              key={index}
              className={`flex-1 rounded-full ${played ? 'bg-sageDark' : 'bg-sage/35'}`}
              style={{ height: `${Math.round(peak * 100)}%` }}
            />
          );
        })}
      </button>
      {durationLabel && <span className="text-xs text-muted tabular-nums">{durationLabel}</span>}
    </div>
  );
}
