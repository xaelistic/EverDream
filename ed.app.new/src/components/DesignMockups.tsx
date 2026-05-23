import React from 'react';

// Design Mockups Component - For reviewing V2 design directions
// This is a temporary component to help choose the best design direction

export const DesignMockups = () => {
  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">EverDream V2 Design Mockups</h1>
        
        {/* Option 1: Deep Space Dark Theme */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">Option 1: Deep Space Dark</h2>
          <div className="rounded-3xl overflow-hidden border border-white/10" style={{
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
          }}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-white">Good Evening</h3>
                  <p className="text-purple-300 mt-1">Ready to explore your dreams?</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-white font-bold">JD</span>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <button className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all">
                  <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center mb-2">
                    <span className="text-2xl">📝</span>
                  </div>
                  <p className="text-white text-sm font-medium">Text</p>
                </button>
                <button className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center mb-2">
                    <span className="text-2xl">🎤</span>
                  </div>
                  <p className="text-white text-sm font-medium">Voice</p>
                </button>
                <button className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition-all">
                  <div className="w-10 h-10 rounded-full bg-pink-500/30 flex items-center justify-center mb-2">
                    <span className="text-2xl">📹</span>
                  </div>
                  <p className="text-white text-sm font-medium">Video</p>
                </button>
              </div>
              
              {/* Dream Card Example */}
              <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 mb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-white/60 text-sm">Last Night</p>
                    <h4 className="text-xl font-semibold text-white mt-1">Flying Over Ocean</h4>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium border border-purple-500/30">
                    Peaceful
                  </span>
                </div>
                <p className="text-white/70 text-sm line-clamp-2 mb-4">
                  I was soaring above an endless ocean at sunset. The water shimmered in impossible shades of gold and blue...
                </p>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
                    Complexity: High
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-medium border border-pink-500/30">
                    Emotional: 8/10
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/30">
                    Novelty: Unique
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Option 2: Aurora Gradient */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">Option 2: Aurora Borealis</h2>
          <div className="rounded-3xl overflow-hidden border border-white/10" style={{
            background: 'linear-gradient(135deg, #0c1929 0%, #1a3a5c 35%, #2d5a4a 70%, #1a3a5c 100%)'
          }}>
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-emerald-300 to-teal-300">
                    Good Morning
                  </h3>
                  <p className="text-emerald-300/80 mt-1">Your dreams are waiting</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
                  <span className="text-white font-bold">JD</span>
                </div>
              </div>
              
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 text-center">
                  <p className="text-3xl font-bold text-cyan-300">12</p>
                  <p className="text-white/60 text-xs mt-1">Dreams</p>
                </div>
                <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-300">7.2h</p>
                  <p className="text-white/60 text-xs mt-1">Avg Sleep</p>
                </div>
                <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 text-center">
                  <p className="text-3xl font-bold text-teal-300">85%</p>
                  <p className="text-white/60 text-xs mt-1">REM Quality</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Option 3: Midnight Purple */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-white mb-4">Option 3: Midnight Purple</h2>
          <div className="rounded-3xl overflow-hidden border border-white/10" style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #2d1b4e 100%)'
          }}>
            <div className="p-8">
              {/* Bottom Navigation */}
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-2 px-2 py-2 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl">
                  <button className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium">
                    Home
                  </button>
                  <button className="px-6 py-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all font-medium">
                    Calendar
                  </button>
                  <button className="px-6 py-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all font-medium">
                    Capture
                  </button>
                  <button className="px-6 py-3 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all font-medium">
                    Insights
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Color Palette Reference */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-white mb-6">Recommended Color Palette</h2>
          <div className="grid grid-cols-5 gap-4">
            <div className="space-y-2">
              <div className="h-20 rounded-2xl" style={{ background: '#0f0c29' }}></div>
              <p className="text-white/60 text-xs">Deep Space</p>
              <p className="text-white/40 text-xs">#0f0c29</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-2xl" style={{ background: '#302b63' }}></div>
              <p className="text-white/60 text-xs">Royal Purple</p>
              <p className="text-white/40 text-xs">#302b63</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-2xl" style={{ background: '#6366f1' }}></div>
              <p className="text-white/60 text-xs">Indigo</p>
              <p className="text-white/40 text-xs">#6366f1</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-2xl" style={{ background: '#a855f7' }}></div>
              <p className="text-white/60 text-xs">Purple</p>
              <p className="text-white/40 text-xs">#a855f7</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 rounded-2xl" style={{ background: '#ec4899' }}></div>
              <p className="text-white/60 text-xs">Pink</p>
              <p className="text-white/40 text-xs">#ec4899</p>
            </div>
          </div>
        </div>
        
        {/* Typography Scale */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-white mb-6">Typography Scale</h2>
          <div className="space-y-4 text-white">
            <p className="text-5xl font-bold tracking-tight">Display Bold</p>
            <p className="text-4xl font-bold tracking-tight">Heading 1</p>
            <p className="text-3xl font-semibold">Heading 2</p>
            <p className="text-2xl font-semibold">Heading 3</p>
            <p className="text-xl font-medium">Body Large</p>
            <p className="text-base font-normal">Body Regular - This is how most text will appear</p>
            <p className="text-sm text-white/70">Small - For captions and secondary info</p>
            <p className="text-xs text-white/50">Extra Small - For timestamps and metadata</p>
          </div>
        </div>
        
        {/* Component Library Preview */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-white mb-6">Component Library</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Primary Button */}
            <div className="space-y-2">
              <p className="text-white/60 text-sm">Primary Button</p>
              <button className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all">
                Get Started
              </button>
            </div>
            
            {/* Secondary Button */}
            <div className="space-y-2">
              <p className="text-white/60 text-sm">Secondary Button</p>
              <button className="w-full py-3 px-6 rounded-2xl bg-white/10 backdrop-blur-sm text-white font-medium border border-white/20 hover:bg-white/20 transition-all">
                Learn More
              </button>
            </div>
            
            {/* Input Field */}
            <div className="space-y-2">
              <p className="text-white/60 text-sm">Input Field</p>
              <input 
                type="text" 
                placeholder="Enter your dream..." 
                className="w-full px-4 py-3 rounded-2xl border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/30 outline-none transition-all"
              />
            </div>
            
            {/* Card */}
            <div className="space-y-2">
              <p className="text-white/60 text-sm">Card</p>
              <div className="p-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
                <p className="text-white font-medium">Card Title</p>
                <p className="text-white/60 text-sm mt-1">Card description goes here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignMockups;
