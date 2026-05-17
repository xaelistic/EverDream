import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Moon,
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  Brain,
  Wind,
  Droplets,
} from 'lucide-react';
import {
  SLEEP_EDUCATION_CONTENT,
  GUIDED_MEDITATIONS,
  AMBIENT_SOUNDS,
  type EducationModule,
  type GuidedMeditation,
  type AmbientSound,
} from '../../lib/sleepEducation';

// ============================================================
// AMBIENT AUDIO PLAYER (Web Audio API - no external files needed)
// ============================================================

interface AudioPlayerProps {
  sound: AmbientSound;
  isPlaying: boolean;
  volume: number;
  onPlay: () => void;
  onPause: () => void;
  onVolumeChange: (v: number) => void;
}

export function AmbientAudioPlayer({ sound, isPlaying, volume, onPlay, onPause, onVolumeChange }: AudioPlayerProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);

  // Generate noise buffer
  const createNoiseBuffer = useCallback((type: 'white' | 'pink' | 'brown') => {
    const ctx = audioContextRef.current!;
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      // Brown noise
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
    }

    return buffer;
  }, []);

  // Generate nature-like sounds using oscillators
  const createNatureSound = useCallback((type: string) => {
    const ctx = audioContextRef.current!;
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.3;
    gain.connect(ctx.destination);

    if (type === 'rain') {
      // Rain = filtered noise
      const buffer = createNoiseBuffer('pink');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;

      source.connect(filter);
      filter.connect(gain);
      source.start();
      noiseNodeRef.current = source;
    } else if (type === 'ocean') {
      // Ocean = slow amplitude modulation of noise
      const buffer = createNoiseBuffer('brown');
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.1; // Slow wave
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.5;
      lfo.connect(lfoGain);
      
      const modGain = ctx.createGain();
      modGain.gain.value = 0.5;
      lfoGain.connect(modGain.gain);
      
      source.connect(modGain);
      modGain.connect(gain);
      source.start();
      lfo.start();
      noiseNodeRef.current = source;
    } else if (type === 'binaural') {
      // Binaural beats
      const freq = sound.frequency || 200;
      const baseFreq = sound.baseFrequency || 204;

      const osc1 = ctx.createOscillator();
      osc1.frequency.value = freq;
      const osc2 = ctx.createOscillator();
      osc2.frequency.value = baseFreq;

      const merger = ctx.createChannelMerger(2);
      osc1.connect(merger, 0, 0);
      osc2.connect(merger, 0, 1);
      merger.connect(gain);

      osc1.start();
      osc2.start();
      oscillatorRef.current = osc1;
    }

    gainNodeRef.current = gain;
  }, [sound.frequency, sound.baseFrequency, volume, createNoiseBuffer]);

  useEffect(() => {
    if (isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (sound.category === 'white_noise') {
        const noiseType = sound.id.includes('pink') ? 'pink' : sound.id.includes('brown') ? 'brown' : 'white';
        const buffer = createNoiseBuffer(noiseType);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = ctx.createGain();
        gain.gain.value = volume * 0.4;

        source.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        noiseNodeRef.current = source;
        gainNodeRef.current = gain;
      } else if (sound.category === 'nature') {
        const natureType = sound.id.includes('rain') ? 'rain' : sound.id.includes('ocean') ? 'ocean' : 'rain';
        createNatureSound(natureType);
      } else if (sound.category === 'binaural') {
        createNatureSound('binaural');
      }
    } else {
      // Stop all audio
      try {
        noiseNodeRef.current?.stop();
        oscillatorRef.current?.stop();
      } catch { /* ignore */ }
      noiseNodeRef.current = null;
      oscillatorRef.current = null;
      gainNodeRef.current = null;
    }

    return () => {
      try {
        noiseNodeRef.current?.stop();
        oscillatorRef.current?.stop();
      } catch { /* ignore */ }
    };
  }, [isPlaying, sound.id, createNoiseBuffer, createNatureSound]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume * 0.4;
    }
  }, [volume]);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        className="w-10 h-10 rounded-full bg-sage/10 hover:bg-sage/20 flex items-center justify-center transition"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-sageDark" strokeWidth={1.5} />
        ) : (
          <Play className="w-5 h-5 text-sageDark ml-0.5" strokeWidth={1.5} />
        )}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="flex-1 accent-sage h-1.5"
      />

      <span className="text-xs text-muted w-8 text-right">
        {Math.round(volume * 100)}%
      </span>
    </div>
  );
}

// ============================================================
// WIND-DOWN FLOW
// ============================================================

interface WindDownFlowProps {
  onClose: () => void;
  onMoodLogged: (mood: string, energy: number) => void;
  circadianProfile: {
    chronotype: string;
    naturalSleepTime: string;
    windDownMinutes: number;
  };
}

type WindDownStep = 'mood' | 'education' | 'meditation' | 'ambient' | 'ready';

export function WindDownFlow({ onClose, onMoodLogged, circadianProfile }: WindDownFlowProps) {
  const [step, setStep] = useState<WindDownStep>('mood');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState(50);
  const [selectedSound, setSelectedSound] = useState<AmbientSound | null>(null);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [selectedMeditation, setSelectedMeditation] = useState<GuidedMeditation | null>(null);
  const [meditationPlaying, setMeditationPlaying] = useState(false);
  const [currentScriptIndex, setCurrentScriptIndex] = useState(0);

  const moods = [
    { id: 'anxious', emoji: '😰', label: 'Anxious', color: 'bg-amber-100 border-amber-300 text-amber-800' },
    { id: 'excited', emoji: '🤩', label: 'Excited', color: 'bg-pink-100 border-pink-300 text-pink-800' },
    { id: 'tired', emoji: '😴', label: 'Tired', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { id: 'calm', emoji: '😌', label: 'Calm', color: 'bg-green-100 border-green-300 text-green-800' },
    { id: 'restless', emoji: '🥱', label: 'Restless', color: 'bg-orange-100 border-orange-300 text-orange-800' },
    { id: 'peaceful', emoji: '✨', label: 'Peaceful', color: 'bg-violet-100 border-violet-300 text-violet-800' },
  ];

  const handleMoodSubmit = () => {
    if (selectedMood) {
      onMoodLogged(selectedMood, energy);
      setStep('education');
    }
  };

  const handleMeditationComplete = () => {
    setMeditationPlaying(false);
    setStep('ready');
  };

  const stepIndex = ['mood', 'education', 'meditation', 'ambient', 'ready'].indexOf(step);

  return (
    <div className="fixed inset-0 z-[80] bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between border-b border-white/5">
        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition">
          <X className="w-5 h-5 text-white/60" />
        </button>
        <div className="flex gap-1.5">
          {['mood', 'education', 'meditation', 'ambient', 'ready'].map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition ${
                i <= stepIndex ? 'bg-sage' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Step 1: Mood Check */}
        {step === 'mood' && (
          <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center space-y-2">
              <Moon className="w-10 h-10 text-dusk mx-auto" strokeWidth={1.2} />
              <h2 className="text-xl font-serif text-white">How are you feeling?</h2>
              <p className="text-sm text-white/50">
                Bedtime: {circadianProfile.naturalSleepTime} • Wind-down: {circadianProfile.windDownMinutes}min
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {moods.map((mood) => (
                <button
                  key={mood.id}
                  type="button"
                  onClick={() => setSelectedMood(mood.id)}
                  className={`rounded-2xl border-2 p-4 text-center transition ${
                    selectedMood === mood.id
                      ? mood.color + ' scale-105 shadow-lg'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl block mb-1">{mood.emoji}</span>
                  <span className="text-xs font-medium">{mood.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Energy level</span>
                <span className="text-white/70">{energy}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="w-full accent-sage"
              />
            </div>

            <button
              type="button"
              onClick={handleMoodSubmit}
              disabled={!selectedMood}
              className="w-full bg-sage hover:bg-sageDark disabled:opacity-30 text-white font-semibold py-3.5 rounded-2xl transition text-sm"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Sleep Education */}
        {step === 'education' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="text-center space-y-2">
              <Brain className="w-10 h-10 text-dusk mx-auto" strokeWidth={1.2} />
              <h2 className="text-xl font-serif text-white">Sleep Tips</h2>
              <p className="text-sm text-white/50">Quick tips for better sleep tonight</p>
            </div>

            {/* Show relevant education based on mood */}
            <div className="space-y-3">
              {SLEEP_EDUCATION_CONTENT.filter(m => {
                if (selectedMood === 'anxious') return m.category === 'sleep_hygiene';
                if (selectedMood === 'excited') return m.category === 'sleep_hygiene' || m.id === 'meditation-sleep';
                if (selectedMood === 'tired') return m.id === 'sleep-routine' || m.id === 'circadian-rhythm';
                return m.category === 'sleep_hygiene';
              }).slice(0, 2).map((module) => (
                <div key={module.id} className="rounded-2xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{module.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{module.title}</h3>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">
                        {module.content.slice(0, 150)}...
                      </p>
                      <div className="mt-2 space-y-1">
                        {module.tips.slice(0, 3).map((tip, i) => (
                          <p key={i} className="text-xs text-sage/80 flex items-start gap-1.5">
                            <span className="text-sage mt-0.5">•</span>
                            {tip}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setStep('meditation')}
              className="w-full bg-sage hover:bg-sageDark text-white font-semibold py-3.5 rounded-2xl transition text-sm"
            >
              Continue to Relaxation
            </button>
          </div>
        )}

        {/* Step 3: Guided Meditation */}
        {step === 'meditation' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="text-center space-y-2">
              <Wind className="w-10 h-10 text-dusk mx-auto" strokeWidth={1.2} />
              <h2 className="text-xl font-serif text-white">Relaxation</h2>
              <p className="text-sm text-white/50">Choose a guided meditation or ambient sound</p>
            </div>

            {/* Meditation options */}
            <div className="space-y-2">
              {GUIDED_MEDITATIONS.map((med) => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => {
                    setSelectedMeditation(med);
                    setCurrentScriptIndex(0);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedMeditation?.id === med.id
                      ? 'bg-sage/20 border-sage/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{med.title}</p>
                      <p className="text-xs text-white/50">{med.description}</p>
                    </div>
                    <span className="text-xs text-white/40">{med.durationMinutes}min</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Meditation player */}
            {selectedMeditation && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{selectedMeditation.title}</h3>
                  <span className="text-xs text-white/40">
                    {currentScriptIndex + 1}/{selectedMeditation.script.length}
                  </span>
                </div>

                <p className="text-sm text-white/70 leading-relaxed min-h-[60px]">
                  {selectedMeditation.script[currentScriptIndex]}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentScriptIndex > 0) {
                        setCurrentScriptIndex(i => i - 1);
                      }
                    }}
                    disabled={currentScriptIndex === 0}
                    className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-white" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentScriptIndex < selectedMeditation.script.length - 1) {
                        setCurrentScriptIndex(i => i + 1);
                      } else {
                        handleMeditationComplete();
                      }
                    }}
                    className="flex-1 bg-sage/20 hover:bg-sage/30 text-white font-medium py-2 rounded-xl transition text-sm"
                  >
                    {currentScriptIndex < selectedMeditation.script.length - 1 ? 'Next' : 'Complete'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentScriptIndex < selectedMeditation.script.length - 1) {
                        setCurrentScriptIndex(i => i + 1);
                      }
                    }}
                    disabled={currentScriptIndex >= selectedMeditation.script.length - 1}
                    className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/10 rounded-full h-1">
                  <div
                    className="bg-sage h-1 rounded-full transition-all"
                    style={{ width: `${((currentScriptIndex + 1) / selectedMeditation.script.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('ambient')}
              className="w-full border border-white/20 hover:bg-white/5 text-white/70 font-medium py-3 rounded-2xl transition text-sm"
            >
              Skip to Ambient Sounds
            </button>
          </div>
        )}

        {/* Step 4: Ambient Sounds */}
        {step === 'ambient' && (
          <div className="space-y-4 max-w-md mx-auto">
            <div className="text-center space-y-2">
              <Droplets className="w-10 h-10 text-dusk mx-auto" strokeWidth={1.2} />
              <h2 className="text-xl font-serif text-white">Ambient Sounds</h2>
              <p className="text-sm text-white/50">Choose a sound to fall asleep to</p>
            </div>

            {/* Sound categories */}
            <div className="space-y-3">
              {(['nature', 'white_noise', 'binaural'] as const).map((category) => (
                <div key={category}>
                  <h3 className="text-xs uppercase tracking-wider text-white/40 mb-2">
                    {category.replace('_', ' ')}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {AMBIENT_SOUNDS.filter(s => s.category === category).map((sound) => (
                      <button
                        key={sound.id}
                        type="button"
                        onClick={() => {
                          setSelectedSound(sound);
                          setSoundPlaying(true);
                        }}
                        className={`rounded-xl border p-3 text-left transition ${
                          selectedSound?.id === sound.id && soundPlaying
                            ? 'bg-sage/20 border-sage/40'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-lg">{sound.icon}</span>
                        <p className="text-xs font-medium text-white mt-1">{sound.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Audio player */}
            {selectedSound && (
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{selectedSound.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{selectedSound.name}</p>
                    <p className="text-xs text-white/50">{selectedSound.description}</p>
                  </div>
                </div>
                <AmbientAudioPlayer
                  sound={selectedSound}
                  isPlaying={soundPlaying}
                  volume={volume}
                  onPlay={() => setSoundPlaying(true)}
                  onPause={() => setSoundPlaying(false)}
                  onVolumeChange={setVolume}
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('ready')}
              className="w-full bg-sage hover:bg-sageDark text-white font-semibold py-3.5 rounded-2xl transition text-sm"
            >
              I'm Ready for Sleep
            </button>
          </div>
        )}

        {/* Step 5: Ready for Sleep */}
        {step === 'ready' && (
          <div className="space-y-6 max-w-md mx-auto text-center">
            <div className="space-y-3">
              <Moon className="w-16 h-16 text-dusk mx-auto" strokeWidth={1} />
              <h2 className="text-2xl font-serif text-white">Sweet Dreams</h2>
              <p className="text-sm text-white/50 leading-relaxed">
                Your bedroom is your sanctuary. Let go of today and drift into restorative sleep.
              </p>
            </div>

            {/* Sleep affirmations */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm text-white/70 italic leading-relaxed">
                "I release the day. My body knows how to sleep. My dreams will be vivid and meaningful. 
                I will wake refreshed and inspired."
              </p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              {selectedSound && (
                <button
                  type="button"
                  onClick={() => setSoundPlaying(!soundPlaying)}
                  className="rounded-xl bg-white/5 border border-white/10 p-3 text-center hover:bg-white/10 transition"
                >
                  {soundPlaying ? <Pause className="w-5 h-5 text-white mx-auto" /> : <Play className="w-5 h-5 text-white mx-auto" />}
                  <p className="text-xs text-white/60 mt-1">{soundPlaying ? 'Pause' : 'Resume'} Sound</p>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-sage/20 border border-sage/30 p-3 text-center hover:bg-sage/30 transition"
              >
                <Moon className="w-5 h-5 text-sage mx-auto" />
                <p className="text-xs text-sage mt-1">Goodnight</p>
              </button>
            </div>

            {/* Keep sound playing note */}
            {soundPlaying && (
              <p className="text-xs text-white/30">
                🔊 Sound will continue playing. It will fade out after 30 minutes.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WindDownFlow;
