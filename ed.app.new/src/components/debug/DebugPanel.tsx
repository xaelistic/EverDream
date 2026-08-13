import { useState, useEffect } from 'react';
import {
  Bug,
  Moon,
  Sun,
  BarChart3,
  Play,
  Trash2,
  Download,
  Upload,
  Zap,
  Heart,
  Camera,
  Mic,
  Volume2,
  Eye,
  Clock,
  Users,
  Trophy,
  Image,
  Film,
  Box,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Terminal,
  Activity,
  Brain,
  Sparkles,
} from 'lucide-react';
import { WindDownFlow } from '../sleep/WindDownFlow';
import { MorningFlow } from '../sleep/MorningFlow';
import {
  getAnalyticsSummary,
  exportAnalytics,
  clearAnalytics,
  getHeatmapData,
  getPainPoints,
  trackEvent,
  getAnalyticsConfig,
  setAnalyticsConfig,
} from '../../lib/analytics';
import { getOrCreateWallet, getWalletNFTs, type WalletIdentity } from '../../lib/nft';
import { getMoodHistory, getMoodTrend } from '../mood/EmojiWheel';
import { estimateChronotype, generateNotificationSchedule, type CircadianProfile } from '../../lib/sleepEducation';

interface DebugPanelProps {
  onClose: () => void;
  dreams: any[];
  onDreamsChange: (dreams: any[]) => void;
}

type DebugSection = 'overview' | 'flows' | 'analytics' | 'nft' | 'mood' | 'notifications' | 'generation' | 'data';

export function DebugPanel({ onClose, dreams, onDreamsChange }: DebugPanelProps) {
  const [section, setSection] = useState<DebugSection>('overview');
  const [showWindDown, setShowWindDown] = useState(false);
  const [showMorning, setShowMorning] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [wallet, setWallet] = useState<WalletIdentity | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [nftCount, setNftCount] = useState(0);
  const [circadianProfile, setCircadianProfile] = useState<CircadianProfile | null>(null);
  const [notificationSchedule, setNotificationSchedule] = useState<any[]>([]);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load all debug data
    setWallet(getOrCreateWallet());
    setAnalyticsSummary(getAnalyticsSummary());
    setMoodHistory(getMoodHistory());
    setNftCount(getWalletNFTs(wallet?.address || '').length);

    // Calculate circadian profile from dreams with sleep data
    const sleepHistory = dreams
      .filter(d => d.sleepData?.bedtime && d.sleepData?.wakeTime)
      .map(d => ({
        bedtime: new Date(d.sleepData.bedtime).toTimeString().slice(0, 5),
        wakeTime: new Date(d.sleepData.wakeTime).toTimeString().slice(0, 5),
      }));

    if (sleepHistory.length > 0) {
      const profile = estimateChronotype(sleepHistory);
      setCircadianProfile(profile);
      setNotificationSchedule(generateNotificationSchedule(profile));
    } else {
      // Default profile
      const defaultProfile: CircadianProfile = {
        chronotype: 'intermediate',
        naturalSleepTime: '22:30',
        naturalWakeTime: '06:30',
        targetSleepHours: 8,
        windDownMinutes: 60,
      };
      setCircadianProfile(defaultProfile);
      setNotificationSchedule(generateNotificationSchedule(defaultProfile));
    }
  }, [dreams, wallet?.address]);

  const toggleSection = (s: string) => {
    const next = new Set(expandedSections);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setExpandedSections(next);
  };

  const runTest = (name: string, fn: () => boolean) => {
    try {
      const result = fn();
      setTestResults(prev => ({ ...prev, [name]: result }));
      trackEvent('custom', 'debug_test_run', { test: name, result });
    } catch (e) {
      setTestResults(prev => ({ ...prev, [name]: false }));
    }
  };

  const sections: { id: DebugSection; label: string; icon: typeof Bug }[] = [
    { id: 'overview', label: 'Overview', icon: Terminal },
    { id: 'flows', label: 'Test Flows', icon: Play },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'nft', label: 'NFT & Wallet', icon: Zap },
    { id: 'mood', label: 'Mood System', icon: Heart },
    { id: 'notifications', label: 'Notifications', icon: Clock },
    { id: 'generation', label: 'Generation', icon: Sparkles },
    { id: 'data', label: 'Data Management', icon: Trash2 },
  ];

  const handleOpenAdmin = () => {
    window.location.hash = '#/admin';
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
            <h1 className="text-lg font-semibold text-white">Test Harness</h1>
            <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full">DEV</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAdmin}
              className="text-xs bg-sage/20 text-sage px-2 py-0.5 rounded-full hover:bg-sage/30 transition"
            >
              Admin Dashboard
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-48 shrink-0 border-r border-white/10 bg-slate-900/50 overflow-y-auto">
          <div className="p-2 space-y-0.5">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition ${
                  section === id
                    ? 'bg-sage/20 text-sage'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* OVERVIEW */}
            {section === 'overview' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">System Overview</h2>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Dreams" value={dreams.length} icon={Moon} />
                  <StatCard label="Wallet" value={wallet ? 'Connected' : 'None'} icon={Zap} sub={wallet?.displayName} />
                  <StatCard label="NFTs" value={nftCount} icon={Image} />
                  <StatCard label="Mood Entries" value={moodHistory.length} icon={Heart} />
                  <StatCard label="Analytics Events" value={analyticsSummary?.totalEvents || 0} icon={BarChart3} />
                  <StatCard label="Sessions" value={analyticsSummary?.totalSessions || 0} icon={Activity} />
                </div>

                {/* Quick health checks */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Health Checks</h3>
                  <div className="space-y-2">
                    <HealthCheck label="LocalStorage available" test={() => !!window.localStorage} />
                    <HealthCheck label="Web Audio API" test={() => !!window.AudioContext || !!(window as any).webkitAudioContext} />
                    <HealthCheck label="Notifications API" test={() => 'Notification' in window} />
                    <HealthCheck label="Camera access" test={() => !!navigator.mediaDevices} />
                    <HealthCheck label="Speech Recognition" test={() => !!window.SpeechRecognition || !!(window as any).webkitSpeechRecognition} />
                    <HealthCheck label="Wallet created" test={() => !!wallet} />
                    <HealthCheck label="Analytics enabled" test={() => getAnalyticsConfig().enabled} />
                  </div>
                </div>

                {/* Wallet info */}
                {wallet && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white">Wallet Identity</h3>
                    <div className="text-xs text-white/60 space-y-1">
                      <p><span className="text-white/40">Address:</span> <span className="font-mono">{wallet.address}</span></p>
                      <p><span className="text-white/40">Display:</span> {wallet.displayName}</p>
                      <p><span className="text-white/40">Created:</span> {new Date(wallet.createdAt).toLocaleString()}</p>
                      <p><span className="text-white/40">Device ID:</span> <span className="font-mono">{wallet.deviceId}</span></p>
                    </div>
                  </div>
                )}

                {/* Circadian profile */}
                {circadianProfile && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white">Circadian Profile</h3>
                    <div className="text-xs text-white/60 space-y-1">
                      <p><span className="text-white/40">Chronotype:</span> {circadianProfile.chronotype}</p>
                      <p><span className="text-white/40">Sleep time:</span> {circadianProfile.naturalSleepTime}</p>
                      <p><span className="text-white/40">Wake time:</span> {circadianProfile.naturalWakeTime}</p>
                      <p><span className="text-white/40">Target hours:</span> {circadianProfile.targetSleepHours}h</p>
                      <p><span className="text-white/40">Wind-down:</span> {circadianProfile.windDownMinutes}min before bed</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FLOWS */}
            {section === 'flows' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Test Flows</h2>

                <div className="space-y-3">
                  <FlowCard
                    title="Wind-Down Flow"
                    description="Bedtime mood check → Education → Meditation → Ambient sounds → Sleep"
                    icon={Moon}
                    onRun={() => setShowWindDown(true)}
                  />
                  <FlowCard
                    title="Morning Flow"
                    description="A/B tested greeting → Mood check → Dream capture prompt"
                    icon={Sun}
                    onRun={() => setShowMorning(true)}
                  />
                  <FlowCard
                    title="Dream Capture"
                    description="Text / Audio / Video / Photo upload flows"
                    icon={Camera}
                    onRun={() => {}}
                  />
                  <FlowCard
                    title="Photo OCR Import"
                    description="Multi-photo upload → Organize → OCR → Review → Save"
                    icon={Upload}
                    onRun={() => {}}
                  />
                </div>

                {/* A/B Test status */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white">A/B Tests</h3>
                  <div className="text-xs text-white/60">
                    <p>Morning Flow V1: mood_first / dream_first / quote_first</p>
                    <p className="text-white/40 mt-1">Check Analytics → A/B Results for conversion data</p>
                  </div>
                </div>
              </div>
            )}

            {/* ANALYTICS */}
            {section === 'analytics' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Analytics</h2>

                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Total Events" value={analyticsSummary?.totalEvents || 0} icon={BarChart3} />
                  <StatCard label="Sessions" value={analyticsSummary?.totalSessions || 0} icon={Activity} />
                  <StatCard label="Avg Duration" value={`${Math.round((analyticsSummary?.avgSessionDuration || 0) / 1000)}s`} icon={Clock} />
                </div>

                {/* Top screens */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white">Top Screens</h3>
                  {(analyticsSummary?.topScreens || []).slice(0, 5).map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{s.screen}</span>
                      <span className="text-white/40">{s.views} views</span>
                    </div>
                  ))}
                </div>

                {/* Pain points */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white">Pain Points</h3>
                  {(analyticsSummary?.painPoints || []).length === 0 ? (
                    <p className="text-xs text-white/40">No pain points detected yet</p>
                  ) : (
                    (analyticsSummary?.painPoints || []).map((p: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-amber-400">{p.type}</span>
                        <span className="text-white/40">{p.count}x on {p.topScreen}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Analytics config */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Configuration</h3>
                  {Object.entries(getAnalyticsConfig()).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-xs text-white/60">{key}</span>
                      <button
                        type="button"
                        onClick={() => setAnalyticsConfig({ [key]: !value })}
                        className={`w-10 h-5 rounded-full transition ${value ? 'bg-sage' : 'bg-white/20'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setAnalyticsSummary(getAnalyticsSummary()); }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const data = exportAnalytics();
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `everdream-analytics-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
              </div>
            )}

            {/* NFT */}
            {section === 'nft' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">NFT & Wallet</h2>

                {wallet && (
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Wallet</h3>
                      <span className="text-xs bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <div className="text-xs text-white/60 space-y-1 font-mono">
                      <p className="break-all">{wallet.address}</p>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">NFT Status</h3>
                  <p className="text-xs text-white/60">
                    {nftCount} NFTs created. Each dream recording generates an NFT with metadata.
                  </p>
                  <p className="text-xs text-white/40">
                    In production, NFTs would be minted to Polygon/Base L2. Currently simulated locally.
                  </p>
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Dream Combinations</h3>
                  <p className="text-xs text-white/60">
                    Combine two dreams to create a new meta-dream NFT with 50:50 royalty split.
                  </p>
                  <p className="text-xs text-white/40">
                    This will be available through Discord bot commands.
                  </p>
                </div>
              </div>
            )}

            {/* MOOD */}
            {section === 'mood' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Mood System</h2>

                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Total Entries" value={moodHistory.length} icon={Heart} />
                  <StatCard label="7-Day Trend" value={getMoodTrend(7).length + ' days'} icon={BarChart3} />
                </div>

                {/* Mood history */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white">Recent Moods</h3>
                  {moodHistory.slice(-10).reverse().map((entry: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-white/60">{entry.moodId}</span>
                      <span className="text-white/40">Intensity: {entry.intensity}</span>
                      <span className="text-white/30">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                  {moodHistory.length === 0 && (
                    <p className="text-xs text-white/40">No mood entries yet. Use the wind-down or morning flow to log moods.</p>
                  )}
                </div>

                {/* Mood trend */}
                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white">7-Day Valence Trend</h3>
                  {getMoodTrend(7).map((day: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-white/40 w-8">{day.date.slice(5)}</span>
                      <div className="flex-1 bg-white/10 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            day.avgValence > 0 ? 'bg-green-400' : day.avgValence < 0 ? 'bg-red-400' : 'bg-gray-400'
                          }`}
                          style={{ width: `${Math.abs(day.avgValence) * 10 + 10}%` }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-12 text-right">
                        {day.avgValence > 0 ? '+' : ''}{day.avgValence.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {section === 'notifications' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Notification Schedule</h2>

                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Scheduled Notifications</h3>
                  {notificationSchedule.map((notif: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/80 capitalize">{notif.type.replace('_', ' ')}</p>
                        <p className="text-xs text-white/40">{notif.message.slice(0, 60)}...</p>
                      </div>
                      <span className="text-xs text-white/60 font-mono">{notif.time}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Notification Permission</h3>
                  <p className="text-xs text-white/60">
                    Status: {'Notification' in window ? Notification.permission : 'Not supported'}
                  </p>
                  {'Notification' in window && Notification.permission !== 'granted' && (
                    <button
                      type="button"
                      onClick={() => Notification.requestPermission()}
                      className="bg-sage hover:bg-sageDark text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
                    >
                      Request Permission
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* GENERATION */}
            {section === 'generation' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Content Generation</h2>

                <div className="space-y-3">
                  <GenerationCard
                    title="Image Generation"
                    description="OpenRouter image models via generate-image"
                    icon={Image}
                    status={generationStatus}
                    onTest={() => setGenerationStatus('Image generation tested via saveDream flow')}
                  />
                  <GenerationCard
                    title="Video Generation"
                    description="Replicate SVD / HuggingFace (free tier)"
                    icon={Film}
                    status={generationStatus}
                    onTest={() => setGenerationStatus('Video generation requires Replicate API key')}
                  />
                  <GenerationCard
                    title="3D / VR Generation"
                    description="Luma AI Genie / Three.js procedural"
                    icon={Box}
                    status={generationStatus}
                    onTest={() => setGenerationStatus('3D generation requires Luma API key')}
                  />
                  <GenerationCard
                    title="Ambient Audio"
                    description="Web Audio API (procedural, no files needed)"
                    icon={Volume2}
                    status={generationStatus}
                    onTest={() => setGenerationStatus('Test in Wind-Down flow → Ambient Sounds step')}
                  />
                </div>

                {generationStatus && (
                  <div className="rounded-xl bg-sage/10 border border-sage/20 p-3">
                    <p className="text-xs text-sage">{generationStatus}</p>
                  </div>
                )}
              </div>
            )}

            {/* DATA MANAGEMENT */}
            {section === 'data' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Data Management</h2>

                <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">Storage Usage</h3>
                  <div className="space-y-2">
                    {Object.keys(localStorage)
                      .filter(k => k.startsWith('ed_'))
                      .map(key => {
                        const size = (localStorage.getItem(key) || '').length;
                        return (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-white/60 font-mono">{key}</span>
                            <span className="text-white/40">{(size / 1024).toFixed(1)}KB</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const data = JSON.stringify(dreams, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `everdream-dreams-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export Dreams
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear all analytics data?')) {
                        clearAnalytics();
                        setAnalyticsSummary(getAnalyticsSummary());
                      }
                    }}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Clear Analytics
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Clear ALL app data? This cannot be undone.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium py-2 rounded-lg transition"
                >
                  Reset All Data
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Wind-Down Flow Overlay */}
      {showWindDown && (
        <WindDownFlow
          onClose={() => setShowWindDown(false)}
          onMoodLogged={(mood, energy) => {
            trackEvent('custom', 'wind_down_mood_logged', { mood, energy });
          }}
          circadianProfile={circadianProfile || {
            chronotype: 'intermediate',
            naturalSleepTime: '22:30',
            windDownMinutes: 60,
          }}
        />
      )}

      {/* Morning Flow Overlay */}
      {showMorning && (
        <MorningFlow
          onClose={() => setShowMorning(false)}
          onDreamCapture={() => {
            setShowMorning(false);
            // Navigate to record screen
          }}
          onMoodOnly={(mood, intensity) => {
            trackEvent('custom', 'morning_mood_logged', { mood, intensity });
          }}
          wakeTime={circadianProfile?.naturalWakeTime || '07:00'}
          quote={{
            text: 'Dreams are the touchstones of our character.',
            source: 'Henry David Thoreau',
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: typeof Bug; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
        <span className="text-xs text-white/40">{label}</span>
      </div>
      <p className="text-lg font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
}

function HealthCheck({ label, test }: { label: string; test: () => boolean }) {
  const [result, setResult] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setResult(test());
    } catch {
      setResult(false);
    }
  }, [test]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/60">{label}</span>
      {result === null ? (
        <span className="text-xs text-white/30">Checking...</span>
      ) : result ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <X className="w-4 h-4 text-red-400" />
      )}
    </div>
  );
}

function FlowCard({ title, description, icon: Icon, onRun }: { title: string; description: string; icon: typeof Bug; onRun: () => void }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-sage/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-sage" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <button
        type="button"
        onClick={onRun}
        className="bg-sage/20 hover:bg-sage/30 text-sage text-xs font-medium px-3 py-1.5 rounded-lg transition shrink-0"
      >
        Run
      </button>
    </div>
  );
}

function GenerationCard({ title, description, icon: Icon, status, onTest }: { title: string; description: string; icon: typeof Bug; status: string | null; onTest: () => void }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-dusk/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-dusk" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <button
        type="button"
        onClick={onTest}
        className="bg-dusk/20 hover:bg-dusk/30 text-dusk text-xs font-medium px-3 py-1.5 rounded-lg transition shrink-0"
      >
        Test
      </button>
    </div>
  );
}

export default DebugPanel;
