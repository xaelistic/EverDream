import { useState, useEffect } from 'react';
import { BarChart3, Users, Mic, Brain, Moon } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { getAllBacklogTasks } from '../../lib/taskBacklog';
import { getAnalyticsSummary } from '../../lib/analytics';

interface AnalyticsStats {
  dreamCount: number;
  activeUsers: number;
  transcriptionSuccessRate: number;
  analysisSuccessRate: number;
  localEvents: number;
}

export default function Analytics() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let dreamCount = 0;
      let activeUsers = 0;

      try {
        const { count: dreams } = await supabase
          .from('dreams')
          .select('*', { count: 'exact', head: true });
        dreamCount = dreams ?? 0;
      } catch {
        // Table may not exist in local dev
      }

      try {
        const { count: profiles } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        activeUsers = profiles ?? 0;
      } catch {
        // Fallback
      }

      const tasks = await getAllBacklogTasks();
      const transcriptionTasks = tasks.filter((t) => t.type === 'transcription');
      const analysisTasks = tasks.filter((t) => t.type === 'analysis');

      const transcriptionCompleted = transcriptionTasks.filter((t) => t.status === 'completed').length;
      const analysisCompleted = analysisTasks.filter((t) => t.status === 'completed').length;

      const localSummary = getAnalyticsSummary();

      setStats({
        dreamCount,
        activeUsers,
        transcriptionSuccessRate: transcriptionTasks.length > 0
          ? (transcriptionCompleted / transcriptionTasks.length) * 100
          : 100,
        analysisSuccessRate: analysisTasks.length > 0
          ? (analysisCompleted / analysisTasks.length) * 100
          : 100,
        localEvents: localSummary.totalEvents,
      });
      setLoading(false);
    }

    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <p className="text-xs text-white/40">Loading analytics...</p>;
  }

  const cards = [
    { label: 'Dreams (Supabase)', value: String(stats?.dreamCount ?? 0), icon: Moon, color: 'sage' },
    { label: 'Active Users', value: String(stats?.activeUsers ?? 0), icon: Users, color: 'blue' },
    { label: 'Transcription Success', value: `${(stats?.transcriptionSuccessRate ?? 0).toFixed(0)}%`, icon: Mic, color: 'amber' },
    { label: 'Analysis Success', value: `${(stats?.analysisSuccessRate ?? 0).toFixed(0)}%`, icon: Brain, color: 'green' },
    { label: 'Local Events', value: String(stats?.localEvents ?? 0), icon: BarChart3, color: 'sage' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-white">Supabase Analytics</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">{label}</span>
              <Icon className={`w-4 h-4 text-${color}-400`} strokeWidth={1.5} />
            </div>
            <p className="text-xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-white/30">
        Success rates are calculated from the local task backlog. Supabase counts require a configured backend.
      </p>
    </div>
  );
}