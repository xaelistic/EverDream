/**
 * API Error Handler — User-friendly error messages and retry logic
 *
 * Provides consistent error handling across all API calls with:
 * - User-friendly error messages (no raw API errors shown to users)
 * - Automatic retry with exponential backoff
 * - Error categorization (network, rate limit, auth, server)
 *
 * @example
 * ```ts
 * const result = await withRetry(
 *   () => analyzeDreamWithAI(text),
 *   { maxRetries: 3, baseDelay: 2000 }
 * );
 * ```
 */

/**
 * Categorized API error types
 */
export type ErrorCategory =
  | 'network'      // No internet, CORS, timeout
  | 'rate_limit'   // 429 Too Many Requests
  | 'auth'         // 401/403 Unauthorized
  | 'server'       // 5xx Server errors
  | 'validation'   // 400 Bad Request
  | 'unknown';     // Anything else

/**
 * Structured API error with user-friendly messaging
 */
export class ApiError extends Error {
  public readonly category: ErrorCategory;
  public readonly statusCode: number | null;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    category: ErrorCategory = 'unknown',
    statusCode: number | null = null
  ) {
    super(message);
    this.name = 'ApiError';
    this.category = category;
    this.statusCode = statusCode;
    this.isRetryable = category === 'network' || category === 'rate_limit' || category === 'server';
    this.userMessage = ApiError.getUserMessage(category, statusCode);
  }

  /**
   * Get a user-friendly error message based on category
   */
  static getUserMessage(category: ErrorCategory, statusCode: number | null): string {
    switch (category) {
      case 'network':
        return 'Unable to connect. Please check your internet connection and try again.';
      case 'rate_limit':
        return 'Too many requests. Please wait a moment and try again.';
      case 'auth':
        return 'Authentication failed. Please sign in again.';
      case 'server':
        return statusCode === 502
          ? 'The AI service is temporarily unavailable. Please try again in a moment.'
          : 'Something went wrong on our end. Please try again.';
      case 'validation':
        return 'The request was invalid. Please check your input and try again.';
      default:
        return 'Something unexpected happened. Please try again.';
    }
  }

  /**
   * Categorize an HTTP status code
   */
  static categorizeStatus(status: number): ErrorCategory {
    if (status === 429) return 'rate_limit';
    if (status === 401 || status === 403) return 'auth';
    if (status === 400 || status === 422) return 'validation';
    if (status >= 500) return 'server';
    return 'unknown';
  }

  /**
   * Create an ApiError from a fetch Response
   */
  static async fromResponse(response: Response): Promise<ApiError> {
    const category = ApiError.categorizeStatus(response.status);
    let message = `HTTP ${response.status}`;

    try {
      const body = await response.json();
      if (body.error) message += `: ${body.error}`;
      else if (body.message) message += `: ${body.message}`;
    } catch {
      // Response body wasn't JSON
    }

    return new ApiError(message, category, response.status);
  }

  /**
   * Create an ApiError from a caught exception
   */
  static fromError(err: unknown): ApiError {
    if (err instanceof ApiError) return err;

    if (err instanceof TypeError && err.message.includes('fetch')) {
      return new ApiError('Network error', 'network');
    }

    if (err instanceof Error) {
      return new ApiError(err.message, 'unknown');
    }

    return new ApiError(String(err), 'unknown');
  }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms between retries (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Function to determine if an error should trigger a retry */
  shouldRetry?: (error: ApiError, attempt: number) => boolean;
  /** Callback for retry attempts */
  onRetry?: (error: ApiError, attempt: number, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute an async function with automatic retry and exponential backoff.
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration
 * @returns The result of the function
 * @throws ApiError if all retries are exhausted
 *
 * @example
 * ```ts
 * // Basic retry
 * const result = await withRetry(() => fetchDreams(userId));
 *
 * // Custom retry with callback
 * const result = withRetry(
 *   () => analyzeDreamWithAI(text),
 *   {
 *     maxRetries: 2,
 *     baseDelay: 2000,
 *     onRetry: (err, attempt, delay) => {
 *       showToast(`Retrying in ${delay / 1000}s... (${attempt}/2)`);
 *     },
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const apiError = ApiError.fromError(err);
      lastError = apiError;

      // Don't retry on the last attempt
      if (attempt >= opts.maxRetries) break;

      // Check if this error is retryable
      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(apiError, attempt)
        : apiError.isRetryable;

      if (!shouldRetry) break;

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.baseDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      // Add jitter (±25%) to prevent thundering herd
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      const finalDelay = Math.round(delay + jitter);

      options.onRetry?.(apiError, attempt + 1, finalDelay);

      await sleep(finalDelay);
    }
  }

  throw lastError ?? new ApiError('All retries exhausted', 'unknown');
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a debounced version of an API function with built-in retry.
 * Combines rate limiting with error resilience.
 *
 * @param fn - The API function to wrap
 * @param debounceMs - Debounce delay in ms (default: 2000)
 * @param retryOptions - Retry options
 */
export function createResilientApiCall<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  debounceMs = 2000,
  retryOptions: RetryOptions = {}
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pending: {
    resolve: (value: Awaited<ReturnType<T>>) => void;
    reject: (reason: any) => void;
  } | null = null;

  return function (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    return new Promise((resolve, reject) => {
      if (timeoutId) clearTimeout(timeoutId);

      // If there's already a pending call, replace it with the new one
      if (pending) {
        pending.reject(new Error('Superseded by newer request'));
      }
      pending = { resolve, reject };

      timeoutId = setTimeout(async () => {
        try {
          const result = await withRetry(() => fn(...args), retryOptions);
          pending?.resolve(result);
        } catch (err) {
          pending?.reject(err);
        } finally {
          timeoutId = null;
          pending = null;
        }
      }, debounceMs);
    });
  };
}
