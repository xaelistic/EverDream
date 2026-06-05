/**
 * EverDream Performance Monitor
 *
 * Tracks:
 * - Page load timing (TTFB, DOM ready, full load)
 * - Screen render times (time to interactive per route)
 * - API call latency (AI provider, Whisper, image gen, etc.)
 * - Memory usage (JS heap)
 * - Long tasks (main thread blocking > 50ms)
 * - Network status
 * - Error rates
 *
 * All metrics stored locally and synced to analytics backend.
 */

export interface PerformanceMetric {
  id: string;
  type: PerformanceMetricType;
  name: string;
  value: number;          // milliseconds or bytes
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
  sessionId: string;
  screen?: string;
  metadata?: Record<string, any>;
}

export type PerformanceMetricType =
  | 'page_load'
  | 'screen_render'
  | 'api_call'
  | 'memory_usage'
  | 'long_task'
  | 'error'
  | 'network_change'
  | 'fps';

export interface APICallMetric {
  api: string;            // 'ai-provider', 'whisper', 'image_gen', etc.
  endpoint: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: string;
  screen?: string;
}

export interface PerformanceSummary {
  pageLoad: {
    ttfb: number;
    domReady: number;
    fullLoad: number;
  };
  apiLatency: {
    api: string;
    avgDuration: number;
    callCount: number;
    errorRate: number;
    p95: number;
  }[];
  memory: {
    currentHeap: number;
    peakHeap: number;
    avgHeap: number;
  };
  longTasks: {
    count: number;
    totalBlockedMs: number;
    avgDuration: number;
  };
  errors: {
    count: number;
    types: { type: string; count: number }[];
  };
  fps: {
    avg: number;
    low: number;
  };
}

const STORAGE_PREFIX = 'ed_perf_';
const METRICS_KEY = `${STORAGE_PREFIX}metrics`;
const API_CALLS_KEY = `${STORAGE_PREFIX}api_calls`;

let sessionId = '';
let longTaskObserver: PerformanceObserver | null = null;
let fpsFrames: number[] = [];
let fpsInterval: ReturnType<typeof setInterval> | null = null;

// ============================================================
// INIT
// ============================================================

export function initPerformanceMonitor(sessionIdValue: string): void {
  sessionId = sessionIdValue;

  // Track page load timing
  trackPageLoad();

  // Track memory periodically
  trackMemory();

  // Track long tasks
  trackLongTasks();

  // Track FPS
  trackFPS();

  // Track network changes
  trackNetworkChanges();

  // Track unhandled errors
  trackErrors();
}

// ============================================================
// PAGE LOAD
// ============================================================

function trackPageLoad(): void {
  if (!window.performance?.timing) return;

  const timing = window.performance.timing;
  const now = Date.now();

  const metrics: PerformanceMetric[] = [
    {
      id: generateId(),
      type: 'page_load',
      name: 'ttfb',
      value: timing.responseStart - timing.requestStart,
      unit: 'ms',
      timestamp: now,
      sessionId,
    },
    {
      id: generateId(),
      type: 'page_load',
      name: 'dom_ready',
      value: timing.domContentLoadedEventEnd - timing.navigationStart,
      unit: 'ms',
      timestamp: now,
      sessionId,
    },
    {
      id: generateId(),
      type: 'page_load',
      name: 'full_load',
      value: timing.loadEventEnd - timing.navigationStart,
      unit: 'ms',
      timestamp: now,
      sessionId,
    },
  ];

  storeMetrics(metrics);
}

// ============================================================
// SCREEN RENDER TIMING
// ============================================================

let screenRenderStart = 0;

export function startScreenRender(screenName: string): void {
  screenRenderStart = performance.now();
}

export function endScreenRender(screenName: string): void {
  if (screenRenderStart === 0) return;
  const duration = performance.now() - screenRenderStart;
  screenRenderStart = 0;

  storeMetrics([{
    id: generateId(),
    type: 'screen_render',
    name: `render_${screenName}`,
    value: Math.round(duration),
    unit: 'ms',
    timestamp: Date.now(),
    sessionId,
    screen: screenName,
  }]);
}

// ============================================================
// API CALL TRACKING
// ============================================================

export function startAPICall(api: string, endpoint: string, method = 'POST', screen?: string): APICallMetric {
  return {
    api,
    endpoint,
    method,
    startTime: Date.now(),
    screen,
  };
}

export function endAPICall(metric: APICallMetric, status?: number, error?: string): void {
  metric.endTime = Date.now();
  metric.duration = metric.endTime - metric.startTime;
  metric.status = status;
  metric.error = error;

  // Store as performance metric
  storeMetrics([{
    id: generateId(),
    type: 'api_call',
    name: `api_${metric.api}`,
    value: metric.duration,
    unit: 'ms',
    timestamp: metric.endTime,
    sessionId,
    screen: metric.screen,
    metadata: {
      endpoint: metric.endpoint,
      method: metric.method,
      status: metric.status,
      error: metric.error,
    },
  }]);

  // Also store full API call record
  try {
    const calls = getStoredAPICalls();
    calls.push(metric);
    localStorage.setItem(API_CALLS_KEY, JSON.stringify(calls.slice(-200)));
  } catch { /* ignore */ }
}

// ============================================================
// MEMORY TRACKING
// ============================================================

function trackMemory(): void {
  const recordMemory = () => {
    const memory = (performance as any).memory;
    if (!memory) return;

    storeMetrics([{
      id: generateId(),
      type: 'memory_usage',
      name: 'js_heap_used',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      timestamp: Date.now(),
      sessionId,
      metadata: {
        totalHeap: memory.totalJSHeapSize,
        heapLimit: memory.jsHeapSizeLimit,
        usagePercent: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100),
      },
    }]);
  };

  // Record every 30 seconds
  recordMemory();
  setInterval(recordMemory, 30000);
}

// ============================================================
// LONG TASK TRACKING
// ============================================================

function trackLongTasks(): void {
  if (!window.PerformanceObserver) return;

  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        storeMetrics([{
          id: generateId(),
          type: 'long_task',
          name: 'long_task',
          value: entry.duration,
          unit: 'ms',
          timestamp: Date.now(),
          sessionId,
          metadata: {
            startTime: entry.startTime,
          },
        }]);
      }
    });
    longTaskObserver.observe({ type: 'longtask', buffered: true });
  } catch {
    // longtask observer not supported
  }
}

// ============================================================
// FPS TRACKING
// ============================================================

function trackFPS(): void {
  let lastTime = performance.now();
  let frameCount = 0;

  const tick = () => {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      const fps = Math.round(frameCount * 1000 / (now - lastTime));
      fpsFrames.push(fps);
      if (fpsFrames.length > 60) fpsFrames.shift();
      frameCount = 0;
      lastTime = now;

      // Record FPS metric every second
      storeMetrics([{
        id: generateId(),
        type: 'fps',
        name: 'fps',
        value: fps,
        unit: 'count',
        timestamp: Date.now(),
        sessionId,
      }]);
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

// ============================================================
// NETWORK TRACKING
// ============================================================

function trackNetworkChanges(): void {
  const connection = (navigator as any).connection;
  if (!connection) return;

  connection.addEventListener('change', () => {
    storeMetrics([{
      id: generateId(),
      type: 'network_change',
      name: 'network_change',
      value: 0,
      unit: 'count',
      timestamp: Date.now(),
      sessionId,
      metadata: {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      },
    }]);
  });
}

// ============================================================
// ERROR TRACKING
// ============================================================

function trackErrors(): void {
  window.addEventListener('error', (event) => {
    storeMetrics([{
      id: generateId(),
      type: 'error',
      name: 'uncaught_error',
      value: 0,
      unit: 'count',
      timestamp: Date.now(),
      sessionId,
      screen: window.location.hash || 'unknown',
      metadata: {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    }]);
  });

  window.addEventListener('unhandledrejection', (event) => {
    storeMetrics([{
      id: generateId(),
      type: 'error',
      name: 'unhandled_promise',
      value: 0,
      unit: 'count',
      timestamp: Date.now(),
      sessionId,
      screen: window.location.hash || 'unknown',
      metadata: {
        reason: String(event.reason),
      },
    }]);
  });
}

// ============================================================
// STORAGE
// ============================================================

function storeMetrics(metrics: PerformanceMetric[]): void {
  try {
    const existing = getStoredMetrics();
    existing.push(...metrics);
    // Keep last 5000 metrics
    const trimmed = existing.slice(-5000);
    localStorage.setItem(METRICS_KEY, JSON.stringify(trimmed));
  } catch { /* ignore */ }
}

function getStoredMetrics(): PerformanceMetric[] {
  try {
    return JSON.parse(localStorage.getItem(METRICS_KEY) || '[]');
  } catch { return []; }
}

function getStoredAPICalls(): APICallMetric[] {
  try {
    return JSON.parse(localStorage.getItem(API_CALLS_KEY) || '[]');
  } catch { return []; }
}

// ============================================================
// SUMMARY
// ============================================================

export function getPerformanceSummary(): PerformanceSummary {
  const metrics = getStoredMetrics();
  const apiCalls = getStoredAPICalls();

  // Page load
  const pageLoads = metrics.filter(m => m.type === 'page_load');
  const ttfbVals = pageLoads.filter(m => m.name === 'ttfb').map(m => m.value);
  const domVals = pageLoads.filter(m => m.name === 'dom_ready').map(m => m.value);
  const fullVals = pageLoads.filter(m => m.name === 'full_load').map(m => m.value);

  // API latency per API
  const apiGroups = new Map<string, APICallMetric[]>();
  for (const call of apiCalls) {
    const existing = apiGroups.get(call.api) || [];
    existing.push(call);
    apiGroups.set(call.api, existing);
  }

  const apiLatency = Array.from(apiGroups.entries()).map(([api, calls]) => {
    const durations = calls.map(c => c.duration || 0);
    const errors = calls.filter(c => c.error || (c.status && c.status >= 400));
    const sorted = [...durations].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    return {
      api,
      avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      callCount: calls.length,
      errorRate: calls.length > 0 ? errors.length / calls.length : 0,
      p95: Math.round(p95),
    };
  });

  // Memory
  const memMetrics = metrics.filter(m => m.type === 'memory_usage');
  const heaps = memMetrics.map(m => m.value);
  const limits = memMetrics.map(m => m.metadata?.heapLimit || 0);

  // Long tasks
  const longTasks = metrics.filter(m => m.type === 'long_task');
  const ltDurations = longTasks.map(m => m.value);

  // Errors
  const errors = metrics.filter(m => m.type === 'error');
  const errorTypes = new Map<string, number>();
  for (const e of errors) {
    const type = e.metadata?.message?.split(':')[0] || e.name;
    errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
  }

  // FPS
  const fpsMetrics = metrics.filter(m => m.type === 'fps');
  const fpsVals = fpsMetrics.map(m => m.value);

  return {
    pageLoad: {
      ttfb: ttfbVals.length > 0 ? Math.round(ttfbVals.reduce((a, b) => a + b, 0) / ttfbVals.length) : 0,
      domReady: domVals.length > 0 ? Math.round(domVals.reduce((a, b) => a + b, 0) / domVals.length) : 0,
      fullLoad: fullVals.length > 0 ? Math.round(fullVals.reduce((a, b) => a + b, 0) / fullVals.length) : 0,
    },
    apiLatency,
    memory: {
      currentHeap: heaps.length > 0 ? heaps[heaps.length - 1] : 0,
      peakHeap: heaps.length > 0 ? Math.max(...heaps) : 0,
      avgHeap: heaps.length > 0 ? Math.round(heaps.reduce((a, b) => a + b, 0) / heaps.length) : 0,
    },
    longTasks: {
      count: longTasks.length,
      totalBlockedMs: Math.round(ltDurations.reduce((a, b) => a + b, 0)),
      avgDuration: ltDurations.length > 0 ? Math.round(ltDurations.reduce((a, b) => a + b, 0) / ltDurations.length) : 0,
    },
    errors: {
      count: errors.length,
      types: Array.from(errorTypes.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    },
    fps: {
      avg: fpsVals.length > 0 ? Math.round(fpsVals.reduce((a, b) => a + b, 0) / fpsVals.length) : 0,
      low: fpsVals.length > 0 ? Math.min(...fpsVals) : 0,
    },
  };
}

export function getRecentAPICalls(limit = 50): APICallMetric[] {
  return getStoredAPICalls().slice(-limit).reverse();
}

export function getRecentMetrics(type?: PerformanceMetricType, limit = 100): PerformanceMetric[] {
  let metrics = getStoredMetrics();
  if (type) metrics = metrics.filter(m => m.type === type);
  return metrics.slice(-limit).reverse();
}

export function clearPerformanceData(): void {
  localStorage.removeItem(METRICS_KEY);
  localStorage.removeItem(API_CALLS_KEY);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
