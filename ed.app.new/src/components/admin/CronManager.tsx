import { useState, useEffect } from 'react';
import { Clock, Play, Pause, RefreshCw } from 'lucide-react';
import {
  isRetryLoopRunning,
  getRetryIntervalMs,
  retryPendingTasks,
  startBacklogRetryLoop,
  stopBacklogRetryLoop,
} from '../../lib/backlogRetry';
import { getQueuedTaskCount } from '../../lib/taskBacklog';

interface CronJob {
  id: string;
  name: string;
  intervalMs: number;
  status: 'running' | 'stopped';
  lastRun: string | null;
  nextRun: string | null;
  description: string;
}

export default function CronManager() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastManualRun, setLastManualRun] = useState<string | null>(null);

  useEffect(() => {
    const update = async () => {
      const count = await getQueuedTaskCount();
      setPendingCount(count);

      const running = isRetryLoopRunning();
      const interval = getRetryIntervalMs();

      setJobs([
        {
          id: 'backlog-retry',
          name: 'Task Backlog Retry',
          intervalMs: interval,
          status: running ? 'running' : 'stopped',
          lastRun: lastManualRun,
          nextRun: running ? new Date(Date.now() + interval).toISOString() : null,
          description: 'Retries failed transcription and analysis tasks every 15 minutes',
        },
        {
          id: 'media-cleanup',
          name: 'Media Storage Cleanup',
          intervalMs: 24 * 60 * 60 * 1000,
          status: 'running',
          lastRun: null,
          nextRun: null,
          description: 'Removes expired audio/video recordings (runs on app startup)',
        },
      ]);
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [lastManualRun]);

  const handleToggle = (jobId: string) => {
    if (jobId === 'backlog-retry') {
      if (isRetryLoopRunning()) {
        stopBacklogRetryLoop();
      } else {
        startBacklogRetryLoop();
      }
    }
  };

  const handleRunNow = async (jobId: string) => {
    if (jobId === 'backlog-retry') {
      await retryPendingTasks();
      setLastManualRun(new Date().toISOString());
    }
  };

  const formatInterval = (ms: number) => {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000} min`;
    return `${ms / 3600000}h`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Cron Jobs</h3>
        <span className="text-xs text-white/40">{pendingCount} tasks in queue</span>
      </div>

      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/40" />
                <span className="text-sm text-white font-medium">{job.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                job.status === 'running' ? 'bg-green-400/20 text-green-400' : 'bg-white/10 text-white/40'
              }`}>
                {job.status}
              </span>
            </div>
            <p className="text-xs text-white/40">{job.description}</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-white/40">
              <div>
                <span className="block text-white/30">Interval</span>
                {formatInterval(job.intervalMs)}
              </div>
              <div>
                <span className="block text-white/30">Last Run</span>
                {job.lastRun ? new Date(job.lastRun).toLocaleTimeString() : '—'}
              </div>
              <div>
                <span className="block text-white/30">Next Run</span>
                {job.nextRun ? new Date(job.nextRun).toLocaleTimeString() : '—'}
              </div>
            </div>
            {job.id === 'backlog-retry' && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(job.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-white/10 text-white/60 hover:bg-white/20"
                >
                  {job.status === 'running' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {job.status === 'running' ? 'Stop' : 'Start'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRunNow(job.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-sage/20 text-sage hover:bg-sage/30"
                >
                  <RefreshCw className="w-3 h-3" /> Run Now
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}