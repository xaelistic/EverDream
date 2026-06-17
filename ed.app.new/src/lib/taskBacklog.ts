/**
 * Task Backlog — IndexedDB queue for failed AI/transcription tasks
 *
 * Stores failed tasks locally and retries them on a schedule.
 */

const DB_NAME = 'everdream-task-backlog';
const DB_VERSION = 1;
const TASK_STORE = 'tasks';
const BLOB_STORE = 'blobs';

export type BacklogTaskType = 'transcription' | 'analysis' | 'image-generation';
export type BacklogTaskStatus = 'pending' | 'retrying' | 'completed' | 'failed';

export interface BacklogTask {
  id: string;
  type: BacklogTaskType;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  nextRetryAt: string;
  status: BacklogTaskStatus;
  errorMessage?: string;
  result?: unknown;
}

const RETRY_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_RETRIES = 10;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TASK_STORE)) {
        const store = db.createObjectStore(TASK_STORE, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('nextRetryAt', 'nextRetryAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE, { keyPath: 'id' });
      }
    };
  });

  return dbPromise;
}

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

async function putTask(task: BacklogTask): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, 'readwrite');
    tx.objectStore(TASK_STORE).put(task);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getTask(id: string): Promise<BacklogTask | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, 'readonly');
    const req = tx.objectStore(TASK_STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function getAllTasks(): Promise<BacklogTask[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TASK_STORE, 'readonly');
    const req = tx.objectStore(TASK_STORE).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function storeBlob(taskId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const buffer = await blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).put({
      id: taskId,
      data: buffer,
      mimeType: blob.type || 'application/octet-stream',
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTaskBlob(taskId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly');
    const req = tx.objectStore(BLOB_STORE).get(taskId);
    req.onsuccess = () => {
      const record = req.result as { data: ArrayBuffer; mimeType: string } | undefined;
      if (!record) {
        resolve(null);
        return;
      }
      resolve(new Blob([record.data], { type: record.mimeType }));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addToBacklog(
  type: BacklogTaskType,
  payload: Record<string, unknown>,
  audioBlob?: Blob,
  errorMessage?: string,
): Promise<BacklogTask> {
  const id = generateId();
  const now = new Date().toISOString();

  if (audioBlob) {
    await storeBlob(id, audioBlob);
    payload.audioBlobStored = true;
  }

  const task: BacklogTask = {
    id,
    type,
    payload,
    createdAt: now,
    retryCount: 0,
    nextRetryAt: new Date(Date.now() + RETRY_INTERVAL_MS).toISOString(),
    status: 'pending',
    errorMessage,
  };

  await putTask(task);
  console.log(`[TaskBacklog] Queued ${type} task ${id}`);
  return task;
}

export async function getPendingTasks(): Promise<BacklogTask[]> {
  const tasks = await getAllTasks();
  const now = Date.now();
  return tasks.filter(
    (t) =>
      (t.status === 'pending' || t.status === 'retrying') &&
      new Date(t.nextRetryAt).getTime() <= now,
  );
}

export async function getQueuedTaskCount(): Promise<number> {
  const tasks = await getAllTasks();
  return tasks.filter((t) => t.status === 'pending' || t.status === 'retrying').length;
}

export async function getAllBacklogTasks(): Promise<BacklogTask[]> {
  return getAllTasks();
}

export async function markRetrying(id: string): Promise<void> {
  const task = await getTask(id);
  if (!task) return;
  task.status = 'retrying';
  await putTask(task);
}

export async function markCompleted(id: string, result?: unknown): Promise<void> {
  const task = await getTask(id);
  if (!task) return;
  task.status = 'completed';
  task.result = result;
  await putTask(task);
}

export async function markFailed(id: string, errorMessage: string): Promise<void> {
  const task = await getTask(id);
  if (!task) return;
  task.status = 'failed';
  task.errorMessage = errorMessage;
  await putTask(task);
}

export async function scheduleRetry(id: string, errorMessage?: string): Promise<void> {
  const task = await getTask(id);
  if (!task) return;

  task.retryCount += 1;
  task.errorMessage = errorMessage ?? task.errorMessage;

  if (task.retryCount >= MAX_RETRIES) {
    task.status = 'failed';
  } else {
    task.status = 'pending';
    task.nextRetryAt = new Date(Date.now() + RETRY_INTERVAL_MS).toISOString();
  }

  await putTask(task);
}

export async function cancelTask(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TASK_STORE, BLOB_STORE], 'readwrite');
    tx.objectStore(TASK_STORE).delete(id);
    tx.objectStore(BLOB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function forceRetryNow(id: string): Promise<void> {
  const task = await getTask(id);
  if (!task) return;
  task.status = 'pending';
  task.nextRetryAt = new Date().toISOString();
  await putTask(task);
}