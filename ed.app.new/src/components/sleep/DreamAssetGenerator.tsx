import React, { useState } from 'react';
import { X, Sparkles, ImagePlus, Sparkle } from 'lucide-react';
import { generateDreamAssets } from '../../modules/sleep/dreamAssetGenerator';
import type { DreamAsset } from '../../modules/sleep/types';

interface DreamAssetGeneratorProps {
  onClose?: () => void;
}

export const DreamAssetGenerator: React.FC<DreamAssetGeneratorProps> = ({ onClose }) => {
  const [dreamText, setDreamText] = useState(
    'A glowing moonlit garden with floating lanterns, soft music in the air, and a river of stars.'
  );
  const [assets, setAssets] = useState<DreamAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const generated = await generateDreamAssets(dreamText, 2);
      setAssets(generated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate assets';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-950/95 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5 bg-slate-900 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-purple-300 font-semibold uppercase tracking-[0.2em] text-xs">
              <Sparkles className="w-4 h-4" /> Dream Asset Lab
            </div>
            <h2 className="text-2xl font-bold text-white">Generate visual assets from any dream</h2>
            <p className="text-sm text-slate-400 max-w-2xl mt-1">
              Enter your dream memory and let the system create a first-pass asset set. Puter AI is used for image generation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 p-5">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-200">Dream description</label>
            <textarea
              value={dreamText}
              onChange={(event) => setDreamText(event.target.value)}
              className="w-full min-h-[180px] rounded-3xl border border-slate-700 bg-slate-950/90 p-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Describe the dream you want to turn into an asset..."
            />
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || dreamText.trim().length === 0}
                className="inline-flex items-center gap-2 rounded-3xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 transition"
              >
                <ImagePlus className="w-4 h-4" />
                {isGenerating ? 'Generating…' : 'Generate Assets'}
              </button>
              <span className="text-xs text-slate-400">
                Puter AI provides free unlimited image generation. If unavailable, a visual fallback is used.
              </span>
            </div>
            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/90 p-4 text-slate-300">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100 mb-3">
              <Sparkle className="w-4 h-4 text-amber-300" /> Output summary
            </div>
            <p className="text-sm leading-6 text-slate-400">
              Use this panel to explore how a dream description becomes an image prompt and asset. The goal is a fast, tangible prototype for dream asset generation without requiring the morning wake flow.
            </p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Configuration</div>
                <div className="mt-2">Puter API: <span className="text-slate-200 break-all">https://api.puter.com/v1/generate-image</span></div>
                <div className="mt-1 text-xs text-slate-500">Free unlimited image generation</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Tips</div>
                <ul className="list-disc pl-5 space-y-2 text-slate-400">
                  <li>Keep prompts vivid and sensory.</li>
                  <li>Use mood, colors, lighting, and symbolic objects.</li>
                  <li>Generate multiple assets to compare styles.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {assets.length > 0 && (
          <div className="border-t border-slate-800/70 p-5 bg-slate-950/95">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-slate-500">Generated assets</div>
                <h3 className="text-xl font-semibold text-white">Visual asset previews</h3>
              </div>
              <div className="text-xs text-slate-400">
                {assets.length} asset{assets.length === 1 ? '' : 's'} generated
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {assets.map((asset) => (
                <div key={asset.id} className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl shadow-black/20">
                  <div className="h-64 overflow-hidden bg-slate-800">
                    <img
                      src={asset.url}
                      alt={asset.prompt}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <div className="p-4 space-y-3 text-slate-200">
                    <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                      <span>{asset.source === 'pollinations' ? 'Pollinations.ai' : asset.source === 'replicate' ? 'HuggingFace' : asset.source === 'fallback' ? 'Fallback' : asset.source}</span>
                      <span>{new Date(asset.generatedAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{asset.prompt}</p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span className="rounded-full bg-slate-800 px-2 py-1">{asset.style}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-1">{asset.metadata?.provider}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
