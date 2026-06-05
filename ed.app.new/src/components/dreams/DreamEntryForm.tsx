import { useState, useCallback } from 'react';
import { Button, Card } from '../ui';
import { Mic, Camera, Type, Sparkles, Save } from 'lucide-react';
import { analyzeDreamWithAI } from '../../lib/api/ai-provider';
import { useRateLimiter } from '../../lib/hooks/useDebounce';
import { ErrorBanner, InlineError } from '../ui/ErrorBanner';

interface DreamEntryFormProps {
  onSave: (dream: {
    content: string;
    mood: string;
    category: string;
    captureMode: 'text' | 'audio' | 'photo';
  }) => void;
  loading?: boolean;
}

const MOODS = [
  { value: 'peaceful', emoji: '😌', label: 'Peaceful' },
  { value: 'joyful', emoji: '😊', label: 'Joyful' },
  { value: 'anxious', emoji: '😰', label: 'Anxious' },
  { value: 'scary', emoji: '😨', label: 'Scary' },
  { value: 'confusing', emoji: '😵', label: 'Confusing' },
  { value: 'exciting', emoji: '🤩', label: 'Exciting' },
  { value: 'sad', emoji: '😢', label: 'Sad' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
];

const CATEGORIES = [
  { value: 'normal', label: 'Normal Dream' },
  { value: 'lucid', label: 'Lucid Dream' },
  { value: 'nightmare', label: 'Nightmare' },
  { value: 'recurring', label: 'Recurring' },
  { value: 'prophetic', label: 'Prophetic' },
  { value: 'adventure', label: 'Adventure' },
];

/**
 * Dream Entry Form Component
 *
 * Allows users to record dreams via text, audio, or photo.
 * Features:
 * - 2-second debounce on AI analysis button to prevent API spam
 * - User-friendly error messages with retry buttons
 * - Inline validation errors
 * - AI analysis preview with loading state
 */
export default function DreamEntryForm({ onSave, loading = false }: DreamEntryFormProps) {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [category, setCategory] = useState('normal');
  const [captureMode, setCaptureMode] = useState<'text' | 'audio' | 'photo'>('text');
  const [error, setError] = useState('');
  const [analysisError, setAnalysisError] = useState<unknown>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisRetryCount, setAnalysisRetryCount] = useState(0);

  // 2-second rate limit on AI analysis API calls
  const { call: rateLimitedCall, isThrottled } = useRateLimiter(2000);

  const handleSubmit = () => {
    if (!content.trim()) {
      setError('Please write your dream before saving');
      return;
    }
    if (content.trim().length < 10) {
      setError('Dream is too short — please add more detail');
      return;
    }
    setError('');
    onSave({ content: content.trim(), mood, category, captureMode });
  };

  const handleAnalyze = useCallback(async () => {
    setAnalysisError(null);
    setIsAnalyzing(true);
    try {
      const result = await analyzeDreamWithAI(content);
      console.log('[DreamEntryForm] Analysis result:', result);
      // In a real app, this would show a preview modal
    } catch (err) {
      console.error('[DreamEntryForm] Analysis failed:', err);
      setAnalysisError(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [content]);

  // Rate-limited version of handleAnalyze
  const handleDebouncedAnalyze = useCallback(() => {
    rateLimitedCall(handleAnalyze);
  }, [rateLimitedCall, handleAnalyze]);

  const handleAnalysisRetry = useCallback(() => {
    setAnalysisRetryCount((c) => c + 1);
    handleDebouncedAnalyze();
  }, [handleDebouncedAnalyze]);

  const canAnalyze = content.trim().length >= 50 && !isAnalyzing && !isThrottled;

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{
        fontFamily: "'Playfair Display', Georgia, serif",
        fontSize: '1.8rem', color: '#1a1a2e', marginBottom: '8px',
      }}>
        Record Your Dream
      </h1>
      <p style={{ color: '#9b96b0', fontSize: '0.85rem', marginBottom: '32px' }}>
        Dreams fade quickly. Capture yours before they slip away.
      </p>

      {/* Capture Mode Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[
          { mode: 'text' as const, icon: Type, label: 'Text' },
          { mode: 'audio' as const, icon: Mic, label: 'Voice' },
          { mode: 'photo' as const, icon: Camera, label: 'Photo' },
        ].map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => setCaptureMode(mode)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '12px', border: 'none',
              background: captureMode === mode ? '#5ec4a8' : 'rgba(168,237,220,0.15)',
              color: captureMode === mode ? '#fff' : '#5ec4a8',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 180ms ease-out',
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Dream Content Input */}
      <Card>
        <label style={{
          display: 'block', fontSize: '0.75rem', fontWeight: 600,
          color: '#4a4860', textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: '12px',
        }}>
          What did you dream?
        </label>
        {captureMode === 'text' ? (
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setError(''); }}
            placeholder="I was walking through a forest when suddenly..."
            style={{
              width: '100%', minHeight: '200px', padding: '16px',
              borderRadius: '12px', border: `1px solid ${error ? '#e88fa0' : 'rgba(168,237,220,0.22)'}`,
              background: '#fffefb', fontSize: '0.9rem', lineHeight: 1.8,
              color: '#4a4860', fontFamily: "'Inter', system-ui, sans-serif",
              resize: 'vertical', outline: 'none',
              transition: 'border-color 180ms ease-out',
            }}
            onFocus={(e) => e.target.style.borderColor = '#5ec4a8'}
            onBlur={(e) => e.target.style.borderColor = error ? '#e88fa0' : 'rgba(168,237,220,0.22)'}
          />
        ) : captureMode === 'audio' ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '16px', padding: '48px 24px',
            background: 'rgba(168,237,220,0.08)', borderRadius: '12px',
            border: '2px dashed rgba(168,237,220,0.3)',
          }}>
            <Mic size={48} color="#5ec4a8" />
            <p style={{ color: '#9b96b0', fontSize: '0.85rem', textAlign: 'center' }}>
              Tap to start recording your dream
            </p>
            <Button variant="primary" size="md">
              Start Recording
            </Button>
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '16px', padding: '48px 24px',
            background: 'rgba(168,237,220,0.08)', borderRadius: '12px',
            border: '2px dashed rgba(168,237,220,0.3)',
          }}>
            <Camera size={48} color="#5ec4a8" />
            <p style={{ color: '#9b96b0', fontSize: '0.85rem', textAlign: 'center' }}>
              Upload an image related to your dream
            </p>
            <Button variant="primary" size="md">
              Choose Image
            </Button>
          </div>
        )}
        {error && (
          <p style={{ color: '#e88fa0', fontSize: '0.75rem', marginTop: '8px' }}>{error}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <span style={{ fontSize: '0.7rem', color: '#9b96b0' }}>
            {content.length} characters
          </span>
          {content.length >= 10 && (
            <span style={{ fontSize: '0.7rem', color: '#5ec4a8' }}>
              ✓ Good length for AI analysis
            </span>
          )}
        </div>
      </Card>

      {/* Mood Selector */}
      <Card style={{ marginTop: '20px' }}>
        <label style={{
          display: 'block', fontSize: '0.75rem', fontWeight: 600,
          color: '#4a4860', textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: '12px',
        }}>
          How did the dream feel?
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MOODS.map(m => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '20px', border: 'none',
                background: mood === m.value ? '#5ec4a8' : 'rgba(168,237,220,0.12)',
                color: mood === m.value ? '#fff' : '#4a4860',
                fontSize: '0.8rem', cursor: 'pointer',
                transition: 'all 180ms ease-out',
              }}
            >
              <span>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Category Selector */}
      <Card style={{ marginTop: '20px' }}>
        <label style={{
          display: 'block', fontSize: '0.75rem', fontWeight: 600,
          color: '#4a4860', textTransform: 'uppercase', letterSpacing: '0.05em',
          marginBottom: '12px',
        }}>
          Dream type
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              style={{
                padding: '8px 16px', borderRadius: '20px', border: 'none',
                background: category === c.value ? '#9b8fd4' : 'rgba(200,184,255,0.12)',
                color: category === c.value ? '#fff' : '#9b8fd4',
                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                transition: 'all 180ms ease-out',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Submit */}
      <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <Button variant="ghost" size="md">
          Save Draft
        </Button>
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          onClick={handleSubmit}
        >
          <Save size={16} />
          Save Dream
        </Button>
      </div>

      {/* AI Analysis Section */}
      {content.length >= 50 && (
        <Card style={{ marginTop: '24px', background: 'rgba(200,184,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Sparkles size={16} color="#9b8fd4" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9b8fd4' }}>
              AI Analysis
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#9b96b0', lineHeight: 1.6, marginBottom: '12px' }}>
            Get AI-powered analysis including dream symbols, themes, emotional interpretation, and a vivid narrative expansion.
          </p>

          {/* Debounced analyze button */}
          <Button
            variant="primary"
            size="md"
            loading={isAnalyzing}
            onClick={handleDebouncedAnalyze}
            disabled={!canAnalyze}
          >
            <Sparkles size={14} />
            {isAnalyzing ? 'Analyzing…' : isThrottled ? 'Waiting…' : 'Analyze with AI'}
          </Button>

          {isThrottled && (
            <p style={{ fontSize: '0.7rem', color: '#9b96b0', marginTop: '8px' }}>
              ⏳ Please wait 2 seconds between requests…
            </p>
          )}

          {/* Error banner with retry */}
          <div style={{ marginTop: '12px' }}>
            <ErrorBanner
              error={analysisError}
              onRetry={handleAnalysisRetry}
              onDismiss={() => setAnalysisError(null)}
            />
          </div>

          {analysisRetryCount > 0 && !analysisError && (
            <p style={{ fontSize: '0.7rem', color: '#9b96b0', marginTop: '8px' }}>
              Retry attempt {analysisRetryCount}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
