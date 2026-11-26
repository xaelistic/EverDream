import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { mixToMono, peaksFromChannel } from '../../lib/whisperAudio';
import {
  playbackClockLabel,
  playbackRatio,
  resolvePlaybackDuration,
  type PlaybackPosition,
} from '../../lib/voiceNotePlayback';

const BARS = 48;

function readableDuration(audio: HTMLAudioElement): number {
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
  try {
    const ranges = audio.seekable;
    if (ranges.length > 0) {
      const end = ranges.end(ranges.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
  } catch {
    // Some recordings throw until the browser has a seekable range.
  }
  return Number.NaN;
}

interface VoiceNoteWaveformProps {
  src: string;
  /** Known length in seconds, used when the file does not report a finite duration. */
  durationSeconds?: number | null;
  /** The person's telling, shown on the note. */
  transcript?: string | null;
}

export function VoiceNoteWaveform({ src, durationSeconds, transcript }: VoiceNoteWaveformProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const durationHintRef = useRef(durationSeconds);
  const frameRef = useRef(0);
  const lastPublished = useRef({ second: -1, ratio: -1 });
  const [peaks, setPeaks] = useState<number[]>(() => Array.from({ length: BARS }, () => 0.15));
  const [position, setPosition] = useState<PlaybackPosition>({ current: 0, duration: 0, ratio: 0 });
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  durationHintRef.current = durationSeconds;
  const transcriptText = (transcript || '').trim();

  const publish = (audio: HTMLAudioElement, force = false) => {
    const duration = resolvePlaybackDuration(readableDuration(audio), durationHintRef.current);
    const current = Number.isFinite(audio.currentTime) ? Math.max(0, audio.currentTime) : 0;
    const ratio = playbackRatio(current, duration);
    const second = Math.floor(current);
    const last = lastPublished.current;
    if (!force && second === last.second && Math.abs(ratio - last.ratio) < 0.004) return;
    lastPublished.current = { second, ratio };
    setPosition({ current, duration, ratio });
  };

  useEffect(() => {
    let cancelled = false;
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioRef.current = audio;
    lastPublished.current = { second: -1, ratio: -1 };
    setPosition({
      current: 0,
      duration: resolvePlaybackDuration(NaN, durationHintRef.current),
      ratio: 0,
    });
    setPlaying(false);
    setFailed(false);

    const stopFrame = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
    const tick = () => {
      publish(audio);
      if (!cancelled && !audio.paused && !audio.ended) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    const onPlay = () => {
      if (cancelled) return;
      setPlaying(true);
      stopFrame();
      frameRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      if (cancelled) return;
      setPlaying(false);
      stopFrame();
      publish(audio, true);
    };
    const onEnded = () => {
      if (cancelled) return;
      setPlaying(false);
      stopFrame();
      publish(audio, true);
    };
    const onTime = () => {
      if (!cancelled) publish(audio);
    };
    const onMeta = () => {
      if (!cancelled) publish(audio, true);
    };
    const onError = () => {
      if (!cancelled) setFailed(true);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('seeked', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('error', onError);

    (async () => {
      try {
        const response = await fetch(src);
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        const context = new AudioContext();
        const decoded = await context.decodeAudioData(bytes.slice(0));
        await context.close();
        const channels: Float32Array[] = [];
        for (let i = 0; i < decoded.numberOfChannels; i++) channels.push(decoded.getChannelData(i));
        if (!cancelled) setPeaks(peaksFromChannel(mixToMono(channels), BARS));
      } catch {
        // A missing waveform still plays. The playhead follows currentTime.
      }
    })();

    return () => {
      cancelled = true;
      stopFrame();
      audio.pause();
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('seeked', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('error', onError);
      audio.src = '';
      audioRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    const duration = resolvePlaybackDuration(audio ? readableDuration(audio) : NaN, durationSeconds);
    setPosition((prev) => {
      if (duration === prev.duration && audio) return prev;
      const current = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : prev.current;
      return { current, duration, ratio: playbackRatio(current, duration) };
    });
  }, [durationSeconds]);

  const seekRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const duration = resolvePlaybackDuration(readableDuration(audio), durationHintRef.current);
    const next = Math.min(1, Math.max(0, ratio));
    const current = duration > 0 ? next * duration : 0;
    if (duration > 0) audio.currentTime = current;
    lastPublished.current = { second: Math.floor(current), ratio: next };
    setPosition({ current, duration, ratio: next });
  };

  const scrubTo = (clientX: number, element: HTMLDivElement) => {
    if (!Number.isFinite(clientX)) return;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0) return;
    seekRatio((clientX - rect.left) / rect.width);
  };

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused && !audio.ended) {
      audio.pause();
      return;
    }
    const duration = resolvePlaybackDuration(readableDuration(audio), durationHintRef.current);
    if (audio.ended || (duration > 0 && audio.currentTime >= duration - 0.05)) {
      audio.currentTime = 0;
    }
    void audio.play().catch(() => setFailed(true));
  };

  const clock = playbackClockLabel(position.current, position.duration);

  if (failed) {
    return (
      <div data-voice-note className="space-y-3 px-3 pb-3">
        <audio src={src} controls preload="metadata" className="w-full" />
        {transcriptText && <VoiceNoteTranscript text={transcriptText} />}
      </div>
    );
  }

  return (
    <div data-voice-note className="space-y-3 px-3 pb-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={playing ? 'Pause voice note' : 'Play voice note'}
          onClick={toggle}
          className="w-10 h-10 shrink-0 rounded-full bg-sage text-cream flex items-center justify-center"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div
          role="slider"
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, Math.round(position.duration))}
          aria-valuenow={Math.round(position.current)}
          aria-valuetext={clock}
          tabIndex={0}
          className="relative flex-1 h-10 cursor-pointer touch-none"
          onPointerDown={(event) => {
            const element = event.currentTarget;
            if (element.setPointerCapture) {
              try { element.setPointerCapture(event.pointerId); } catch { /* jsdom */ }
            }
            scrubTo(event.clientX, element);
          }}
          onPointerMove={(event) => {
            const element = event.currentTarget;
            if (!element.hasPointerCapture?.(event.pointerId)) return;
            scrubTo(event.clientX, element);
          }}
          onClick={(event) => scrubTo(event.clientX, event.currentTarget)}
          onKeyDown={(event) => {
            const duration = position.duration;
            const step = duration > 0 ? 5 / duration : 0.05;
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              seekRatio(position.ratio + step);
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              seekRatio(position.ratio - step);
            }
          }}
        >
          <div className="absolute inset-0 flex items-center gap-[2px] pointer-events-none">
            {peaks.map((peak, index) => {
              const played = (index + 0.5) / peaks.length <= position.ratio;
              return (
                <span
                  key={index}
                  className={`flex-1 rounded-full ${played ? 'bg-sageDark' : 'bg-sage/35'}`}
                  style={{ height: `${Math.round(peak * 100)}%` }}
                />
              );
            })}
          </div>
          <div
            data-testid="voice-note-playhead"
            className="absolute top-0 bottom-0 w-0.5 rounded-full bg-ink pointer-events-none"
            style={{ left: `${position.ratio * 100}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        <span className="shrink-0 whitespace-nowrap text-xs text-muted tabular-nums">{clock}</span>
      </div>
      {transcriptText && <VoiceNoteTranscript text={transcriptText} />}
    </div>
  );
}

function VoiceNoteTranscript({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split(/\n\n/).map((para, index) => (
        <p key={index} className="text-sm leading-relaxed text-ink whitespace-pre-wrap">
          {para}
        </p>
      ))}
    </div>
  );
}
