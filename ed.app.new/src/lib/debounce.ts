/**
 * Debounce & Rate Limiting Utilities
 *
 * Provides client-side debounce for API call buttons to prevent
 * accidental double-clicks and excessive API usage.
 *
 * @example
 * ```ts
 * import { debounce, useDebouncedCallback } from './debounce';
 *
 * // Standalone debounce
 * const debouncedAnalyze = debounce(analyzeDream, 2000);
 *
 * // React hook
 * const handleClick = useDebouncedCallback(() => {
 *   runPipeline();
 * }, 2000);
 * ```
 */

/**
 * Creates a debounced version of a function that delays execution
 * until after `wait` milliseconds have elapsed since the last call.
 *
 * @param fn — The function to debounce
 * @param wait — Milliseconds to wait (default: 2000)
 * @returns Debounced function with `.cancel()` method
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  wait: number = 2000
): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, wait);
  };

  debounced.cancel = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled version of a function that only executes
 * at most once per `interval` milliseconds.
 *
 * @param fn — The function to throttle
 * @param interval — Minimum ms between calls (default: 2000)
 * @returns Throttled function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number = 2000
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>): void => {
    const now = Date.now();
    const remaining = interval - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Rate limiter that tracks calls in a sliding window.
 * Useful for enforcing API rate limits client-side.
 */
export class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private windowMs: number;

  /**
   * @param maxCalls — Maximum calls allowed in the window
   * @param windowMs — Window size in milliseconds
   */
  constructor(maxCalls: number, windowMs: number) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  /**
   * Check if a call is allowed right now.
   */
  isAllowed(): boolean {
    this.cleanup();
    return this.calls.length < this.maxCalls;
  }

  /**
   * Record a call. Returns true if the call is within limits.
   */
  tryCall(): boolean {
    this.cleanup();
    if (this.calls.length >= this.maxCalls) {
      return false;
    }
    this.calls.push(Date.now());
    return true;
  }

  /**
   * Get the number of remaining calls in the current window.
   */
  remaining(): number {
    this.cleanup();
    return Math.max(0, this.maxCalls - this.calls.length);
  }

  /**
   * Get milliseconds until the next call is allowed.
   * Returns 0 if calls are currently allowed.
   */
  msUntilNext(): number {
    this.cleanup();
    if (this.calls.length < this.maxCalls) {
      return 0;
    }
    const oldest = this.calls[0];
    return Math.max(0, this.windowMs - (Date.now() - oldest));
  }

  /**
   * Reset all tracked calls.
   */
  reset(): void {
    this.calls = [];
  }

  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    this.calls = this.calls.filter((t) => t > cutoff);
  }
}

/**
 * Pre-configured rate limiters for EverDream API endpoints.
 */
export const rateLimiters = {
  /** Analysis: 5 calls per 30 seconds */
  analysis: new RateLimiter(5, 30_000),
  /** Transcription: 3 calls per 60 seconds */
  transcription: new RateLimiter(3, 60_000),
  /** Image generation: 10 calls per 60 seconds */
  imageGeneration: new RateLimiter(10, 60_000),
  /** NFT minting: 2 calls per 30 seconds */
  nftMint: new RateLimiter(2, 30_000),
};
