/**
 * Rate Limiter — Debounce and throttle API calls
 *
 * Prevents rapid-fire API calls that could hit rate limits or
 * waste resources. All API call buttons should use this.
 *
 * @example
 * ```ts
 * const debouncedAnalyze = debounce(analyzeDreamWithAI, 2000);
 * const result = await debouncedAnalyze(dreamText);
 * ```
 */

/**
 * Debounce a function — only executes after `wait` ms of inactivity.
 * Perfect for "Analyze Dream" buttons to prevent double-clicks.
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: ReturnType<T>) => void) | null = null;
  let pendingReject: ((reason: any) => void) | null = null;

  return function (...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      pendingResolve = resolve;
      pendingReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          pendingResolve?.(result as ReturnType<T>);
        } catch (err) {
          pendingReject?.(err);
        } finally {
          timeoutId = null;
          pendingResolve = null;
          pendingReject = null;
        }
      }, wait);
    });
  };
}

/**
 * Throttle a function — executes at most once per `limit` ms.
 * Good for progress callbacks and status updates.
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>): void {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Simple in-memory rate limiter.
 * Tracks call timestamps per key and rejects if over limit.
 */
export class RateLimiter {
  private calls: Map<string, number[]> = new Map();

  /**
   * @param maxCalls - Maximum calls allowed in the window
   * @param windowMs - Time window in milliseconds
   */
  constructor(
    private maxCalls: number,
    private windowMs: number
  ) {}

  /**
   * Check if a call is allowed for the given key.
   * Returns true if allowed, false if rate limited.
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const timestamps = this.calls.get(key) || [];

    // Remove old timestamps outside the window
    const valid = timestamps.filter((t) => now - t < this.windowMs);

    if (valid.length >= this.maxCalls) {
      this.calls.set(key, valid);
      return false;
    }

    valid.push(now);
    this.calls.set(key, valid);
    return true;
  }

  /**
   * Get the time (ms) until the next call is allowed for this key.
   * Returns 0 if a call is currently allowed.
   */
  getTimeUntilNext(key: string): number {
    const now = Date.now();
    const timestamps = this.calls.get(key) || [];
    const valid = timestamps.filter((t) => now - t < this.windowMs);

    if (valid.length < this.maxCalls) return 0;

    const oldest = valid[0];
    return this.windowMs - (now - oldest);
  }

  /**
   * Reset all rate limits for a key.
   */
  reset(key: string): void {
    this.calls.delete(key);
  }

  /**
   * Reset all rate limits.
   */
  resetAll(): void {
    this.calls.clear();
  }
}

// ── Pre-configured rate limiters ──────────────────────────────

/** Rate limiter for dream analysis: max 5 calls per 30 seconds */
export const analysisRateLimiter = new RateLimiter(5, 30_000);

/** Rate limiter for image generation: max 3 calls per 60 seconds */
export const imageRateLimiter = new RateLimiter(3, 60_000);

/** Rate limiter for transcription: max 3 calls per 60 seconds */
export const transcriptionRateLimiter = new RateLimiter(3, 60_000);
