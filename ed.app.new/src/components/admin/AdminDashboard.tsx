/**
 * Admin Analytics Dashboard
 *
 * Full dashboard showing:
 * - Overview stats (users, events, sessions, retention)
 * - Screen popularity
 * - Event breakdown
 * - API performance
 * - Error tracking
 * - Daily active users chart
 * - Recent sessions
 * - A/B test results
 * - Pain points
 *
 * Accessible via #/admin route (protected by simple admin key).
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Cpu,
  Download,
  Eye,
  Globe,
  Heart,
  Layers,
  Monitor,
  RefreshCw,
  Server,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { getAnalyticsSummary, exportAnalytics, clearAnalytics, getAnalyticsConfig, setAnalyticsConfig } from '../../lib/analytics';
import { getPerformanceSummary, getRecentAPICalls, clearPerformanceData } from '../../lib/performance';
import { getAdminDashboardData, syncAnalyticsToBackend, startAutoSync, stopAutoSync, type AdminDashboardData } from '../../lib/analytics-sync';
import type { AnalyticsSummary } from '../../lib/analytics';
import type { PerformanceSummary } from '../../lib/performance';
import { isAdminUser } from '../../lib/adminAuth';
import TaskQueue from './TaskQueue';
import Analytics from './Analytics';
import CronManager from './CronManager';
import InferenceProviders from './InferenceProviders';

interface AdminDashboardProps {
  onClose: () => void;
}

type DashboardTab = 'overview' | 'screens' | 'performance' | 'errors' | 'sessions' | 'ab-tests' | 'queue' | 'analytics-db' | 'cron' | 'providers' | 'settings';

export default function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [localSummary, setLocalSummary] = useState<AnalyticsSummary | null>(null);
  const [perfSummary, setPerfSummary] = useState<PerformanceSummary | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [apiCalls, setApiCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    isAdminUser().then(setIsAdmin);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setLocalSummary(getAnalyticsSummary());
      setPerfSummary(getPerformanceSummary());
      setApiCalls(getRecentAPICalls(20));
      const data = await getAdminDashboardData();
      setAdminData(data);
    } catch (err) {
      console.error('[Admin] Failed to load dashboard data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncAnalyticsToBackend();
      await loadData();
    } catch (err) {
      console.error('[Admin] Sync failed:', err);
    }
    setSyncing(false);
  };

  const handleToggleAutoSync = () => {
    if (autoSyncEnabled) {
      stopAutoSync();
      setAutoSyncEnabled(false);
    } else {
      startAutoSync(60000);
      setAutoSyncEnabled(true);
    }
  };

  const handleExport = () => {
    const data = exportAnalytics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `everdream-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleClearAll = () => {
    if (confirm('Clear ALL analytics and performance data? This cannot be undone.')) {
      clearAnalytics();
      clearPerformanceData();
      loadData();
    }
  };

  const toggleSection = (id: string) => {
    const next = new Set(expandedSections);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSections(next);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  const tabs: { id: DashboardTab; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'screens', label: 'Screens', icon: Smartphone },
    { id: 'performance', label: 'Performance', icon: Cpu },
    { id: 'errors', label: 'Errors', icon: AlertTriangle },
    { id: 'sessions', label: 'Sessions', icon: Users },
    { id: 'ab-tests', label: 'A/B Tests', icon: Layers },
    { id: 'queue', label: 'Task Queue', icon: Server },
    { id: 'analytics-db', label: 'Analytics', icon: Heart },
    { id: 'cron', label: 'Cron', icon: Clock },
    { id: 'providers', label: 'Providers', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Shield },
  ];

  if (isAdmin === false) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3 p-6">
          <Shield className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-white font-medium">Admin access required</p>
          <p className="text-white/40 text-sm">You do not have permission to view this dashboard.</p>
          <button type="button" onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading && !adminData) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-sage" strokeWidth={1.5} />
            <h1 className="text-lg font-semibold text-white">Analytics Dashboard</h1>
            <span className="text-xs bg-sage/20 text-sage px-2 py-0.5 rounded-full">ADMIN</span>
            {autoSyncEnabled && (
              <span className="text-xs bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Wifi className="w-3 h-3" /> Auto-sync
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="p-2 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white disabled:opacity-50"
              title="Sync to backend"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
              title="Export JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition text-white/60 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  tab === id
                    ? 'border-sage text-sage'
                    : 'border-transparent text-white/40 hover:text-white/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">

          {/* ==================== OVERVIEW ==================== */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  label="Total Events"
                  value={adminData?.summary.totalEvents?.toLocaleString() || '0'}
                  icon={Activity}
                  color="sage"
                />
                <SummaryCard
                  label="Sessions"
                  value={adminData?.summary.totalSessions?.toLocaleString() || '0'}
                  icon={Users}
                  color="blue"
                />
                <SummaryCard
                  label="Avg Duration"
                  value={formatDuration(adminData?.summary.avgSessionDuration || 0)}
                  icon={Clock}
                  color="amber"
                />
                <SummaryCard
                  label="Active Today"
                  value={String(adminData?.summary.activeToday || 0)}
                  icon={TrendingUp}
                  color="green"
                />
              </div>

              {/* Daily active users chart */}
              <Section title="Daily Active Users" icon={TrendingUp} id="dau" expanded={expandedSections} onToggle={toggleSection}>
                {adminData?.dailyActiveUsers && adminData.dailyActiveUsers.length > 0 ? (
                  <div className="space-y-1">
                    {adminData.dailyActiveUsers.slice(-14).map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-20 font-mono">{d.date}</span>
                        <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-sage rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (d.users / Math.max(...adminData.dailyActiveUsers.map(x => x.users), 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-white/60 w-8 text-right">{d.users}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No daily usage data yet.</p>
                )}
              </Section>

              {/* Events by type */}
              <Section title="Events by Type" icon={Layers} id="event-types" expanded={expandedSections} onToggle={toggleSection}>
                {adminData?.eventsByType && adminData.eventsByType.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {adminData.eventsByType.map((e, i) => (
                      <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                        <span className="text-xs text-white/60">{e.type}</span>
                        <span className="text-xs text-white font-medium">{e.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No events recorded yet.</p>
                )}
              </Section>

              {/* Pain points */}
              <Section title="Pain Points" icon={AlertTriangle} id="pain-points" expanded={expandedSections} onToggle={toggleSection}>
                {localSummary?.painPoints && localSummary.painPoints.length > 0 ? (
                  <div className="space-y-2">
                    {localSummary.painPoints.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs text-amber-400">{p.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/40">{p.topScreen}</span>
                          <span className="text-xs text-white/60 font-medium">{p.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No pain points detected. Good sign!</p>
                )}
              </Section>

              {/* Funnel completion */}
              <Section title="Funnel Completion" icon={TrendingUp} id="funnels" expanded={expandedSections} onToggle={toggleSection}>
                {localSummary?.funnelCompletionRates && localSummary.funnelCompletionRates.length > 0 ? (
                  <div className="space-y-2">
                    {localSummary.funnelCompletionRates.map((f, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60">{f.name}</span>
                          <span className="text-xs text-white font-medium">{(f.rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="bg-white/5 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${f.rate > 0.5 ? 'bg-sage' : f.rate > 0.2 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${f.rate * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No funnels defined yet.</p>
                )}
              </Section>
            </div>
          )}

          {/* ==================== SCREENS ==================== */}
          {tab === 'screens' && (
            <div className="space-y-6">
              <Section title="Top Screens" icon={Smartphone} id="top-screens" expanded={expandedSections} onToggle={toggleSection}>
                {adminData?.topScreens && adminData.topScreens.length > 0 ? (
                  <div className="space-y-2">
                    {adminData.topScreens.map((s, i) => {
                      const maxViews = adminData.topScreens[0]?.views || 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-white/40 w-6 text-right">#{i + 1}</span>
                          <span className="text-xs text-white/80 w-32 truncate font-mono">{s.screen}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-sage rounded-full transition-all"
                              style={{ width: `${(s.views / maxViews) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/60 w-12 text-right">{s.views.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No screen view data yet.</p>
                )}
              </Section>

              {/* Screen visit distribution */}
              <Section title="Screen Distribution" icon={Eye} id="screen-dist" expanded={expandedSections} onToggle={toggleSection}>
                {adminData?.topScreens && adminData.topScreens.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {adminData.topScreens.map((s, i) => {
                      const total = adminData.topScreens.reduce((sum, x) => sum + x.views, 0);
                      const pct = total > 0 ? ((s.views / total) * 100).toFixed(1) : '0';
                      return (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center">
                          <p className="text-lg font-semibold text-white">{pct}%</p>
                          <p className="text-xs text-white/40">{s.screen}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No data yet.</p>
                )}
              </Section>
            </div>
          )}

          {/* ==================== PERFORMANCE ==================== */}
          {tab === 'performance' && (
            <div className="space-y-6">
              {/* Performance summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                  label="Page Load"
                  value={formatDuration(perfSummary?.pageLoad.fullLoad || 0)}
                  icon={Globe}
                  color="blue"
                />
                <SummaryCard
                  label="API Latency"
                  value={formatDuration(adminData?.performance.avgApiLatency || 0)}
                  icon={Zap}
                  color="amber"
                />
                <SummaryCard
                  label="JS Heap"
                  value={formatBytes(perfSummary?.memory.currentHeap || 0)}
                  icon={Cpu}
                  color="green"
                />
                <SummaryCard
                  label="FPS"
                  value={String(perfSummary?.fps.avg || 0)}
                  icon={Monitor}
                  color="sage"
                />
              </div>

              {/* Page load breakdown */}
              <Section title="Page Load Timing" icon={Globe} id="page-load" expanded={expandedSections} onToggle={toggleSection}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatDuration(perfSummary?.pageLoad.ttfb || 0)}</p>
                    <p className="text-xs text-white/40">TTFB</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatDuration(perfSummary?.pageLoad.domReady || 0)}</p>
                    <p className="text-xs text-white/40">DOM Ready</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatDuration(perfSummary?.pageLoad.fullLoad || 0)}</p>
                    <p className="text-xs text-white/40">Full Load</p>
                  </div>
                </div>
              </Section>

              {/* API latency */}
              <Section title="API Performance" icon={Server} id="api-perf" expanded={expandedSections} onToggle={toggleSection}>
                {adminData?.apiLatency && adminData.apiLatency.length > 0 ? (
                  <div className="space-y-3">
                    {adminData.apiLatency.map((api, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{api.api}</span>
                          {api.errors > 0 && (
                            <span className="text-xs bg-red-400/20 text-red-400 px-2 py-0.5 rounded-full">
                              {api.errors} errors
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-sm text-white font-medium">{formatDuration(api.avgMs)}</p>
                            <p className="text-xs text-white/40">Avg</p>
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{formatDuration(api.p95)}</p>
                            <p className="text-xs text-white/40">P95</p>
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{api.errors}</p>
                            <p className="text-xs text-white/40">Errors</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No API calls recorded yet.</p>
                )}
              </Section>

              {/* Recent API calls */}
              <Section title="Recent API Calls" icon={Activity} id="recent-api" expanded={expandedSections} onToggle={toggleSection}>
                {apiCalls.length > 0 ? (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {apiCalls.map((call, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded px-3 py-1.5">
                        <span className="text-white/60 font-mono">{call.api}</span>
                        <span className="text-white/40">{call.endpoint}</span>
                        <span className={`font-mono ${call.duration && call.duration > 5000 ? 'text-red-400' : call.duration && call.duration > 2000 ? 'text-amber-400' : 'text-sage'}`}>
                          {call.duration ? formatDuration(call.duration) : '...'}
                        </span>
                        {call.error && <span className="text-red-400">ERR</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No recent API calls.</p>
                )}
              </Section>

              {/* Memory */}
              <Section title="Memory Usage" icon={Cpu} id="memory" expanded={expandedSections} onToggle={toggleSection}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatBytes(perfSummary?.memory.currentHeap || 0)}</p>
                    <p className="text-xs text-white/40">Current</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatBytes(perfSummary?.memory.avgHeap || 0)}</p>
                    <p className="text-xs text-white/40">Average</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatBytes(perfSummary?.memory.peakHeap || 0)}</p>
                    <p className="text-xs text-white/40">Peak</p>
                  </div>
                </div>
              </Section>

              {/* Long tasks */}
              <Section title="Main Thread Blocking" icon={Clock} id="long-tasks" expanded={expandedSections} onToggle={toggleSection}>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{perfSummary?.longTasks.count || 0}</p>
                    <p className="text-xs text-white/40">Long Tasks</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatDuration(perfSummary?.longTasks.totalBlockedMs || 0)}</p>
                    <p className="text-xs text-white/40">Total Blocked</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-lg font-semibold text-white">{formatDuration(perfSummary?.longTasks.avgDuration || 0)}</p>
                    <p className="text-xs text-white/40">Avg Duration</p>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* ==================== ERRORS ==================== */}
          {tab === 'errors' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                  label="Total Errors"
                  value={String(perfSummary?.errors.count || 0)}
                  icon={AlertTriangle}
                  color="red"
                />
                <SummaryCard
                  label="Error Rate"
                  value={`${((adminData?.performance.errorRate || 0) * 100).toFixed(2)}%`}
                  icon={Activity}
                  color="amber"
                />
              </div>

              <Section title="Error Types" icon={AlertTriangle} id="error-types" expanded={expandedSections} onToggle={toggleSection}>
                {perfSummary?.errors.types && perfSummary.errors.types.length > 0 ? (
                  <div className="space-y-2">
                    {perfSummary.errors.types.map((e, i) => (
                      <div key={i} className="flex items-center justify-between bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                        <span className="text-xs text-red-400 font-mono truncate flex-1">{e.type}</span>
                        <span className="text-xs text-white/60 ml-3">{e.count}x</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No errors recorded. Clean run!</p>
                )}
              </Section>

              <Section title="Backend Error Log" icon={Server} id="backend-errors" expanded={expandedSections} onToggle={toggleSection}>
                {adminData?.errorSummary && adminData.errorSummary.length > 0 ? (
                  <div className="space-y-2">
                    {adminData.errorSummary.map((e, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-red-400 font-mono truncate flex-1">{e.message}</span>
                          <span className="text-xs text-white/40 ml-2">{e.count}x</span>
                        </div>
                        <p className="text-xs text-white/30">Last seen: {new Date(e.lastSeen).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No backend errors.</p>
                )}
              </Section>
            </div>
          )}

          {/* ==================== SESSIONS ==================== */}
          {tab === 'sessions' && (
            <div className="space-y-6">
              <Section title="Recent Sessions" icon={Users} id="recent-sessions" expanded={expandedSections} onToggle={toggleSection}>
                {adminData?.recentSessions && adminData.recentSessions.length > 0 ? (
                  <div className="space-y-2">
                    {adminData.recentSessions.map((s, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white/60 font-mono">{s.id.slice(0, 16)}...</span>
                          <span className="text-xs text-white/40">{new Date(s.startedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/40">
                          <span>{formatDuration(s.duration)}</span>
                          <span>{s.eventCount} events</span>
                          <span>{s.screens.length} screens</span>
                        </div>
                        {s.screens.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.screens.map((screen, j) => (
                              <span key={j} className="text-xs bg-white/10 text-white/50 px-1.5 py-0.5 rounded">
                                {screen}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No sessions recorded yet.</p>
                )}
              </Section>
            </div>
          )}

          {/* ==================== A/B TESTS ==================== */}
          {tab === 'ab-tests' && (
            <div className="space-y-6">
              <Section title="A/B Test Results" icon={Layers} id="ab-results" expanded={expandedSections} onToggle={toggleSection}>
                {localSummary?.abTestResults && localSummary.abTestResults.length > 0 ? (
                  <div className="space-y-4">
                    {localSummary.abTestResults.map((test, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-4 space-y-3">
                        <h4 className="text-sm text-white font-medium">{test.name}</h4>
                        <div className="space-y-2">
                          {test.variantResults.map((v, j) => (
                            <div key={j} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-white/60">{v.variantId}</span>
                                <span className="text-white/40">
                                  {v.exposures} exposures · {v.conversions} conversions
                                </span>
                              </div>
                              <div className="bg-white/5 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${v.rate > 0.5 ? 'bg-sage' : v.rate > 0.2 ? 'bg-amber-400' : 'bg-white/20'}`}
                                  style={{ width: `${Math.max(5, v.rate * 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-white/30 text-right">{(v.rate * 100).toFixed(1)}% conversion</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/40">No A/B tests configured. Define tests in analytics.ts.</p>
                )}
              </Section>
            </div>
          )}

          {/* ==================== TASK QUEUE ==================== */}
          {tab === 'queue' && <TaskQueue />}

          {/* ==================== SUPABASE ANALYTICS ==================== */}
          {tab === 'analytics-db' && <Analytics />}

          {/* ==================== CRON MANAGER ==================== */}
          {tab === 'cron' && <CronManager />}

          {/* ==================== INFERENCE PROVIDERS ==================== */}
          {tab === 'providers' && <InferenceProviders />}

          {/* ==================== SETTINGS ==================== */}
          {tab === 'settings' && (
            <div className="space-y-6">
              {/* Analytics config */}
              <Section title="Analytics Configuration" icon={Shield} id="analytics-config" expanded={expandedSections} onToggle={toggleSection}>
                <div className="space-y-3">
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
              </Section>

              {/* Sync status */}
              <Section title="Sync Status" icon={Server} id="sync-status" expanded={expandedSections} onToggle={toggleSection}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Status</span>
                    <span className={`px-2 py-0.5 rounded-full ${
                      adminData?.syncMeta.status === 'idle' ? 'bg-green-400/20 text-green-400' :
                      adminData?.syncMeta.status === 'syncing' ? 'bg-amber-400/20 text-amber-400' :
                      'bg-red-400/20 text-red-400'
                    }`}>
                      {adminData?.syncMeta.status || 'idle'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Last Sync</span>
                    <span className="text-white/40">
                      {adminData?.syncMeta.lastSyncAt ? new Date(adminData.syncMeta.lastSyncAt).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Total Synced</span>
                    <span className="text-white/40">{adminData?.syncMeta.totalSynced || 0}</span>
                  </div>
                  {adminData?.syncMeta.lastError && (
                    <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-2">
                      <p className="text-xs text-red-400">{adminData.syncMeta.lastError}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-1 bg-sage hover:bg-sageDark text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleAutoSync}
                    className={`flex-1 text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2 ${
                      autoSyncEnabled
                        ? 'bg-green-400/20 text-green-400 hover:bg-green-400/30'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {autoSyncEnabled ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                    {autoSyncEnabled ? 'Auto-sync ON' : 'Auto-sync OFF'}
                  </button>
                </div>
              </Section>

              {/* Danger zone */}
              <Section title="Danger Zone" icon={Trash2} id="danger" expanded={expandedSections} onToggle={toggleSection}>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export All Data
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="w-full bg-red-400/20 hover:bg-red-400/30 text-red-400 text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear All Data
                  </button>
                </div>
              </Section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function SummaryCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string;
  icon: typeof Activity;
  color: 'sage' | 'blue' | 'amber' | 'green' | 'red';
}) {
  const colorMap = {
    sage: 'text-sage bg-sage/10',
    blue: 'text-blue-400 bg-blue-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
    green: 'text-green-400 bg-green-400/10',
    red: 'text-red-400 bg-red-400/10',
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
        </div>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, id, expanded, onToggle, children }: {
  title: string;
  icon: typeof Activity;
  id: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = expanded.has(id);
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-white/40" strokeWidth={1.5} />
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
