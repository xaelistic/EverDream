const running = new Set<string>();

export function pipelineIsRunning(dreamId: string): boolean {
  return running.has(dreamId);
}

export function tryAcquirePipeline(dreamId: string): boolean {
  if (!dreamId || running.has(dreamId)) return false;
  running.add(dreamId);
  return true;
}

export function releasePipeline(dreamId: string): void {
  running.delete(dreamId);
}

export async function withPipelineLock<T>(dreamId: string, fn: () => Promise<T>): Promise<T | null> {
  if (!tryAcquirePipeline(dreamId)) return null;
  try {
    return await fn();
  } finally {
    releasePipeline(dreamId);
  }
}
