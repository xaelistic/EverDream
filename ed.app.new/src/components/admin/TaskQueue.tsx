import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Play, XCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  getAllBacklogTasks,
  cancelTask,
  forceRetryNow,
  type BacklogTask,
} from '../../lib/taskBacklog';
import { retryPendingTasks } from '../../lib/backlogRetry';

export default function TaskQueue() {
  const [tasks, setTasks] = useState<BacklogTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllBacklogTasks();
      setTasks(all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('[TaskQueue] Failed to load tasks:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const handleRetryAll = async () => {
    setRetrying(true);
    await retryPendingTasks();
    await loadTasks();
    setRetrying(false);
  };

  const statusIcon = (status: BacklogTask['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'retrying': return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'retrying').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">Task Queue</h3>
          <p className="text-xs text-white/40">{pendingCount} pending · {tasks.length} total</p>
        </div>
        <button
          type="button"
          onClick={handleRetryAll}
          disabled={retrying || pendingCount === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sage/20 text-sage text-xs font-medium hover:bg-sage/30 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
          Retry All
        </button>
      </div>

      {loading && tasks.length === 0 ? (
        <p className="text-xs text-white/40">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-xs text-white/40">No queued tasks. Queue fills when inference providers are overloaded.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(task.status)}
                  <span className="text-xs text-white font-medium capitalize">{task.type}</span>
                  <span className="text-xs text-white/30 font-mono">{task.id.slice(0, 20)}...</span>
                </div>
                <span className="text-xs text-white/40">retries: {task.retryCount}</span>
              </div>
              <div className="text-xs text-white/40 space-y-0.5">
                <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
                <p>Next retry: {new Date(task.nextRetryAt).toLocaleString()}</p>
                {task.errorMessage && (
                  <p className="text-red-400/80 truncate">{task.errorMessage}</p>
                )}
              </div>
              {(task.status === 'pending' || task.status === 'retrying' || task.status === 'failed') && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => { await forceRetryNow(task.id); await loadTasks(); }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-sage/20 text-sage hover:bg-sage/30"
                  >
                    <Play className="w-3 h-3" /> Retry Now
                  </button>
                  <button
                    type="button"
                    onClick={async () => { await cancelTask(task.id); await loadTasks(); }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-400/20 text-red-400 hover:bg-red-400/30"
                  >
                    <XCircle className="w-3 h-3" /> Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}