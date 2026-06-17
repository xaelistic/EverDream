import { useState, useEffect } from 'react';
import { Server, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { isWhisperAvailable } from '../../lib/transcriptionWhisper';
import { supabase } from '../../lib/supabase/client';

interface ProviderStatus {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  configured: boolean;
  lastChecked: string;
  note?: string;
}

export default function InferenceProviders() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [checking, setChecking] = useState(false);

  const checkProviders = async () => {
    setChecking(true);
    const now = new Date().toISOString();
    const results: ProviderStatus[] = [];

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const hfKey = import.meta.env.VITE_HF_INFERENCE_API_KEY || '';
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';

    results.push({
      id: 'supabase-transcribe',
      name: 'Supabase transcribe-audio',
      type: 'Whisper Proxy',
      configured: !!(supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')),
      status: 'unknown',
      lastChecked: now,
    });

    results.push({
      id: 'supabase-analyze',
      name: 'Supabase analyze-dream',
      type: 'AI Analysis',
      configured: !!(supabaseUrl && supabaseKey && !supabaseUrl.includes('placeholder')),
      status: 'unknown',
      lastChecked: now,
    });

    results.push({
      id: 'hf-whisper',
      name: 'HuggingFace Whisper',
      type: 'Transcription (fallback)',
      configured: !!hfKey,
      status: 'unknown',
      lastChecked: now,
      note: hfKey ? 'Direct client fallback' : 'No VITE_HF_INFERENCE_API_KEY',
    });

    results.push({
      id: 'openrouter',
      name: 'OpenRouter',
      type: 'LLM Analysis',
      configured: !!openRouterKey,
      status: openRouterKey ? 'healthy' : 'down',
      lastChecked: now,
      note: 'Configured server-side in edge functions',
    });

    try {
      const whisperOk = await isWhisperAvailable();
      const transcribeIdx = results.findIndex((p) => p.id === 'supabase-transcribe');
      if (transcribeIdx >= 0) {
        results[transcribeIdx].status = whisperOk ? 'healthy' : 'degraded';
      }
      const hfIdx = results.findIndex((p) => p.id === 'hf-whisper');
      if (hfIdx >= 0 && hfKey) {
        results[hfIdx].status = whisperOk ? 'healthy' : 'degraded';
      }
    } catch {
      results.forEach((p) => {
        if (p.status === 'unknown') p.status = 'down';
      });
    }

    if (supabase) {
      try {
        const { error } = await supabase.functions.invoke('analyze-dream', {
          body: { text: 'health check ping for admin dashboard' },
        });
        const analyzeIdx = results.findIndex((p) => p.id === 'supabase-analyze');
        if (analyzeIdx >= 0) {
          results[analyzeIdx].status = error ? 'degraded' : 'healthy';
          if (error) results[analyzeIdx].note = error.message;
        }
      } catch (err) {
        const analyzeIdx = results.findIndex((p) => p.id === 'supabase-analyze');
        if (analyzeIdx >= 0) {
          results[analyzeIdx].status = 'down';
          results[analyzeIdx].note = err instanceof Error ? err.message : 'Unreachable';
        }
      }
    }

    setProviders(results);
    setChecking(false);
  };

  useEffect(() => {
    checkProviders();
  }, []);

  const statusIcon = (status: ProviderStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'down': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Server className="w-4 h-4 text-white/40" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Inference Providers</h3>
        <button
          type="button"
          onClick={checkProviders}
          disabled={checking}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          Check Health
        </button>
      </div>

      <div className="space-y-2">
        {providers.map((provider) => (
          <div key={provider.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {statusIcon(provider.status)}
                <div>
                  <p className="text-sm text-white font-medium">{provider.name}</p>
                  <p className="text-xs text-white/40">{provider.type}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                  provider.status === 'healthy' ? 'bg-green-400/20 text-green-400' :
                  provider.status === 'degraded' ? 'bg-amber-400/20 text-amber-400' :
                  provider.status === 'down' ? 'bg-red-400/20 text-red-400' :
                  'bg-white/10 text-white/40'
                }`}>
                  {provider.status}
                </span>
                <p className="text-xs text-white/30 mt-1">
                  {provider.configured ? 'Configured' : 'Not configured'}
                </p>
              </div>
            </div>
            {provider.note && (
              <p className="text-xs text-white/30 mt-2 truncate">{provider.note}</p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-white/30">
        API keys are managed via environment variables and Supabase edge function secrets.
        Add keys in your .env file or Supabase dashboard — never commit secrets to git.
      </p>
    </div>
  );
}