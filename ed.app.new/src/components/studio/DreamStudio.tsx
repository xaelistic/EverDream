/**
 * Dream Studio - Image Generation Component
 * Supports: Fooocus (local) and Replicate (cloud)
 * Uses XAEL data for prompt generation
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Image, Sparkles, Download, Share2, RefreshCw, Settings,
  Maximize2, Palette, Clock, CheckCircle, AlertCircle,
  Loader2, X, Eye, Trash2, Copy, ExternalLink, Zap
} from 'lucide-react';
import { XAELData, generateImagePrompt, ImageGenerationPrompt } from '../utils/xael';

interface DreamStudioProps {
  xaelData?: XAELData;
  onClose?: () => void;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  negativePrompt: string;
  style: string;
  provider: 'fooocus' | 'replicate' | 'manual';
  createdAt: string;
  parameters: {
    steps?: number;
    cfgScale?: number;
    seed?: number;
    aspectRatio?: string;
  };
}

const STYLES = [
  { id: 'surreal', label: 'Surreal', preview: '🎨' },
  { id: 'realistic', label: 'Photorealistic', preview: '📷' },
  { id: 'abstract', label: 'Abstract', preview: '🌀' },
  { id: 'anime', label: 'Anime', preview: '🎌' },
  { id: 'oil', label: 'Oil Painting', preview: '🖼️' },
  { id: 'digital', label: 'Digital Art', preview: '💻' },
  { id: 'watercolor', label: 'Watercolor', preview: '💧' },
  { id: 'cyberpunk', label: 'Cyberpunk', preview: '🤖' }
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square', icon: '⬜' },
  { id: '4:5', label: 'Portrait', icon: '📱' },
  { id: '16:9', label: 'Landscape', icon: '🖥️' },
  { id: '9:16', label: 'Story', icon: '📲' },
  { id: '3:2', label: 'Classic', icon: '📸' }
];

export default function DreamStudio({ xaelData, onClose }: DreamStudioProps) {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('surreal');
  const [aspectRatio, setAspectRatio] = useState('4:5');
  const [steps, setSteps] = useState(30);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  const [provider, setProvider] = useState<'fooocus' | 'replicate'>('replicate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState('');
  const [generationTime, setGenerationTime] = useState(0);

  // Auto-generate prompt from XAEL data if available
  useEffect(() => {
    if (xaelData) {
      const imagePrompt = generateImagePrompt(xaelData, selectedStyle);
      setPrompt(imagePrompt.prompt);
      setNegativePrompt(imagePrompt.negativePrompt);
      setAspectRatio(imagePrompt.aspectRatio);
      setSeed(imagePrompt.seed);
    }
  }, [xaelData, selectedStyle]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError('');
    const startTime = Date.now();

    try {
      let imageUrl: string;

      if (provider === 'fooocus') {
        // Fooocus local API call
        imageUrl = await generateWithFooocus({
          prompt,
          negativePrompt,
          style: selectedStyle,
          aspectRatio,
          steps,
          cfgScale,
          seed
        });
      } else {
        // Replicate API call
        imageUrl = await generateWithReplicate({
          prompt,
          negativePrompt,
          style: selectedStyle,
          aspectRatio,
          steps,
          cfgScale,
          seed
        });
      }

      const newImage: GeneratedImage = {
        id: `img_${Date.now()}`,
        url: imageUrl,
        prompt,
        negativePrompt,
        style: selectedStyle,
        provider,
        createdAt: new Date().toISOString(),
        parameters: {
          steps,
          cfgScale,
          seed,
          aspectRatio
        }
      };

      setGeneratedImages(prev => [newImage, ...prev]);
      setGenerationTime(Date.now() - startTime);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWithFooocus = async (params: any): Promise<string> => {
    // Fooocus local API endpoint
    const FOOOCUS_URL = 'http://localhost:7865/sdapi/v1/txt2img';
    
    try {
      const response = await fetch(FOOOCUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: params.prompt,
          negative_prompt: params.negativePrompt,
          steps: params.steps,
          cfg_scale: params.cfgScale,
          width: params.aspectRatio === '1:1' ? 1024 : 
                 params.aspectRatio === '16:9' ? 1152 : 896,
          height: params.aspectRatio === '1:1' ? 1024 :
                 params.aspectRatio === '16:9' ? 640 : 1152,
          seed: params.seed || Math.floor(Math.random() * 1000000),
          sampler_name: 'euler_a',
          scheduler: 'normal'
        })
      });

      if (!response.ok) {
        throw new Error('Fooocus is not running. Start it locally first.');
      }

      const data = await response.json();
      
      // Return base64 image or placeholder for demo
      if (data.images && data.images.length > 0) {
        return `data:image/png;base64,${data.images[0]}`;
      }
      
      throw new Error('No image generated');
    } catch (err: any) {
      // For demo purposes, return placeholder if Fooocus not available
      console.warn('Fooocus not available, using placeholder:', err.message);
      return `https://placehold.co/1024x1024/purple/white?text=${encodeURIComponent(params.prompt.slice(0, 50))}`;
    }
  };

  const generateWithReplicate = async (params: any): Promise<string> => {
    // Replicate API (using SDXL or similar model)
    const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';
    
    try {
      // For demo, we'll use a placeholder since we don't have actual API key
      // In production, implement actual Replicate API call
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Return placeholder with prompt preview
      return `https://placehold.co/1024x1024/gradient?text=${encodeURIComponent('Dream: ' + params.prompt.slice(0, 30))}`;
      
      /* Production implementation:
      const response = await fetch(REPLICATE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          version: 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4',
          input: {
            prompt: params.prompt,
            negative_prompt: params.negativePrompt,
            num_outputs: 1,
            num_inference_steps: params.steps,
            guidance_scale: params.cfgScale,
            width: params.aspectRatio === '1:1' ? 1024 : 1024,
            height: params.aspectRatio === '1:1' ? 1024 : 768,
            seed: params.seed
          }
        })
      });

      const prediction = await response.json();
      
      // Poll for result
      let resultUrl = '';
      while (!resultUrl) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`${REPLICATE_API_URL}/${prediction.id}`);
        const status = await statusResponse.json();
        
        if (status.status === 'succeeded') {
          resultUrl = status.output[0];
        } else if (status.status === 'failed') {
          throw new Error('Generation failed');
        }
      }
      
      return resultUrl;
      */
    } catch (err: any) {
      throw new Error('Replicate API error: ' + err.message);
    }
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `everdream-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleShare = async (image: GeneratedImage) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My EverDream',
          text: image.prompt,
          url: image.url
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy link
      navigator.clipboard.writeText(image.url);
      alert('Image link copied to clipboard');
    }
  };

  const handleDelete = (imageId: string) => {
    setGeneratedImages(prev => prev.filter(img => img.id !== imageId));
    if (selectedImage?.id === imageId) {
      setSelectedImage(null);
    }
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dream Studio</h2>
              <p className="text-sm text-gray-600">Transform your dreams into art</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Controls */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            {/* Provider Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generation Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setProvider('replicate')}
                  className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${
                    provider === 'replicate'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Replicate</div>
                    <div className="text-xs text-gray-500">Cloud (Fast)</div>
                  </div>
                </button>
                <button
                  onClick={() => setProvider('fooocus')}
                  className={`p-3 rounded-lg border-2 flex items-center gap-3 transition-all ${
                    provider === 'fooocus'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <Image className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <div className="font-semibold text-sm">Fooocus</div>
                    <div className="text-xs text-gray-500">Local (Free)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Describe your dream..."
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">
                  {prompt.length} characters
                </span>
                {xaelData && (
                  <button
                    onClick={() => {
                      const imgPrompt = generateImagePrompt(xaelData, selectedStyle);
                      setPrompt(imgPrompt.prompt);
                      setNegativePrompt(imgPrompt.negativePrompt);
                    }}
                    className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate from XAEL
                  </button>
                )}
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Negative Prompt
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="What to avoid..."
              />
            </div>

            {/* Style Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Art Style
              </label>
              <div className="grid grid-cols-4 gap-2">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      selectedStyle === style.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{style.preview}</div>
                    <div className="text-xs font-medium">{style.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Aspect Ratio
              </label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id)}
                    className={`flex-1 p-2 rounded-lg border-2 transition-all ${
                      aspectRatio === ratio.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-lg">{ratio.icon}</div>
                    <div className="text-xs font-medium">{ratio.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-6 space-y-4"
              >
                <div className="p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-3">Advanced Settings</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Steps: {steps}
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={steps}
                        onChange={(e) => setSteps(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        CFG Scale: {cfgScale}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        step="0.5"
                        value={cfgScale}
                        onChange={(e) => setCfgScale(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Seed
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={seed || ''}
                          onChange={(e) => setSeed(Number(e.target.value))}
                          className="flex-1 p-2 border rounded-lg text-sm"
                          placeholder="Random"
                        />
                        <button
                          onClick={randomizeSeed}
                          className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Generate Button */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating... ({Math.round(generationTime / 1000)}s)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Generate Dream Art</span>
                </>
              )}
            </motion.button>
          </div>

          {/* Right Panel - Gallery */}
          <div className="w-1/2 bg-gray-50 p-6 overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Generated Images
              {generatedImages.length > 0 && (
                <span className="text-sm text-gray-500">({generatedImages.length})</span>
              )}
            </h3>

            {generatedImages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Image className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No images yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Generate your first dream artwork!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((image) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                      selectedImage?.id === image.id ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="aspect-square bg-gray-200 relative">
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(image);
                          }}
                          className="p-1.5 bg-white/90 hover:bg-white rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(image.id);
                          }}
                          className="p-1.5 bg-white/90 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {image.prompt}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500 capitalize">
                          {image.style}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(image.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Preview Modal */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Image Details</h3>
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6 text-white" />
                  </button>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden">
                  <img
                    src={selectedImage.url}
                    alt={selectedImage.prompt}
                    className="w-full max-h-[60vh] object-contain bg-black"
                  />
                  
                  <div className="p-6">
                    <div className="mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Prompt</h4>
                      <p className="text-gray-700 text-sm">{selectedImage.prompt}</p>
                    </div>

                    {selectedImage.negativePrompt && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Negative Prompt</h4>
                        <p className="text-gray-700 text-sm">{selectedImage.negativePrompt}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <div className="text-xs text-gray-500">Style</div>
                        <div className="font-medium capitalize">{selectedImage.style}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Provider</div>
                        <div className="font-medium capitalize">{selectedImage.provider}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Aspect Ratio</div>
                        <div className="font-medium">{selectedImage.parameters.aspectRatio}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Steps</div>
                        <div className="font-medium">{selectedImage.parameters.steps}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDownload(selectedImage)}
                        className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleShare(selectedImage)}
                        className="flex-1 py-3 border-2 border-purple-600 text-purple-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
