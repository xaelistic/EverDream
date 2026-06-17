/**
 * Backlog Retry — Periodic retry of queued failed tasks
 *
 * Runs on app load and every 15 minutes via setInterval.
 */

import {
  getPendingTasks,
  getQueuedTaskCount,
  getTaskBlob,
  markCompleted,
  markRetrying,
  scheduleRetry,
  type BacklogTask,
} from './taskBacklog';
import { transcribeWithWhisper } from './transcriptionWhisper';
import { analyzeDreamWithAI } from './api/ai-provider';
import { generateDreamImage } from '../modules/sleep/dreamAssetGenerator';

const RETRY_INTERVAL_MS = 15 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

type BacklogListener = (pendingCount: number) => void;
const listeners = new Set<BacklogListener>();

export function subscribeBacklogStatus(listener: BacklogListener): () => void {
  listeners.add(listener);
  getQueuedTaskCount().then(listener).catch(() => listener(0));
  return () => listeners.delete(listener);
}

async function notifyListeners(): Promise<void> {
  const count = await getQueuedTaskCount();
  listeners.forEach((fn) => fn(count));
}

async function executeTask(task: BacklogTask): Promise<boolean> {
  await markRetrying(task.id);

  try {
    switch (task.type) {
      case 'transcription': {
        const blob = await getTaskBlob(task.id);
        if (!blob) throw new Error('Audio blob missing from backlog');
        const language = (task.payload.language as string) || 'en';
        const result = await transcribeWithWhisper(blob, { language, skipBacklog: true });
        await markCompleted(task.id, result);
        return true;
      }
      case 'analysis': {
        const text = task.payload.text as string;
        if (!text) throw new Error('Dream text missing from backlog');
        const result = await analyzeDreamWithAI(text, { skipBacklog: true });
        await markCompleted(task.id, result);
        return true;
      }
      case 'image-generation': {
        const prompt = task.payload.prompt as string;
        if (!prompt) throw new Error('Image prompt missing from backlog');
        const result = await generateDreamImage(prompt);
        await markCompleted(task.id, result);
        return true;
      }
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[BacklogRetry] Task ${task.id} failed:`, message);
    await scheduleRetry(task.id, message);
    return false;
  }
}

export async function retryPendingTasks(): Promise<{ succeeded: number; failed: number }> {
  if (isProcessing) return { succeeded: 0, failed: 0 };
  isProcessing = true;

  let succeeded = 0;
  let failed = 0;

  try {
    const pending = await getPendingTasks();
    if (pending.length > 0) {
      console.log(`[BacklogRetry] Retrying ${pending.length} pending task(s)...`);
    }

    for (const task of pending) {
      const ok = await executeTask(task);
      if (ok) succeeded++;
      else failed++;
    }
  } finally {
    isProcessing = false;
    await notifyListeners();
  }

  return { succeeded, failed };
}

export function startBacklogRetryLoop(): void {
  if (intervalId) return;

  retryPendingTasks().catch(console.error);

  intervalId = setInterval(() => {
    retryPendingTasks().catch(console.error);
  }, RETRY_INTERVAL_MS);

  console.log('[BacklogRetry] Started retry loop (every 15 min)');
}

export function stopBacklogRetryLoop(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function getRetryIntervalMs(): number {
  return RETRY_INTERVAL_MS;
}

export function isRetryLoopRunning(): boolean {
  return intervalId !== null;
}