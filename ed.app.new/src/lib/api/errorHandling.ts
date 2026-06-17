/**
 * API Error Handling Utilities
 *
 * Provides user-friendly error messages, retry logic, and error classification
 * for all API calls in the EverDream app.
 */

// ── Types ────────────────────────────────────────────────────

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ApiError {
  /** Machine-readable error code */
  code: string;
  /** User-friendly message to display in the UI */
  message: string;
  /** Whether the user can retry this action */
  retryable: boolean;
  /** Severity level for styling (e.g., toast color) */
  severity: ErrorSeverity;
  /** Original error for debugging */
  originalError?: Error;
  /** Suggested retry delay in ms */
  retryAfterMs?: number;
}

// ── Error Codes ──────────────────────────────────────────────

export const ErrorCodes = {
  // Network errors
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // API errors
  API_RATE_LIMITED: 'API_RATE_LIMITED',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  API_KEY_MISSING: 'API_KEY_MISSING',
  API_BAD_REQUEST: 'API_BAD_REQUEST',

  // Analysis errors
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  ANALYSIS_PARSE_ERROR: 'ANALYSIS_PARSE_ERROR',
  ANALYSIS_INPUT_TOO_SHORT: 'ANALYSIS_INPUT_TOO_SHORT',

  // Transcription errors
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  TRANSCRIPTION_MODEL_LOADING: 'TRANSCRIPTION_MODEL_LOADING',
  TRANSCRIPTION_NO_SPEECH: 'TRANSCRIPTION_NO_SPEECH',

  // Image generation errors
  IMAGE_GENERATION_FAILED: 'IMAGE_GENERATION_FAILED',
  IMAGE_VALIDATION_FAILED: 'IMAGE_VALIDATION_FAILED',

  // Supabase errors
  SUPABASE_NOT_CONFIGURED: 'SUPABASE_NOT_CONFIGURED',
  SUPABASE_FUNCTION_ERROR: 'SUPABASE_FUNCTION_ERROR',

  // Service overload (rate limits, 503s)
  SERVICE_OVERLOADED: 'SERVICE_OVERLOADED',

  // Unknown
  UNKNOWN: 'UNKNOWN',
} as const;

/** User-friendly message shown when all inference providers are overloaded */
export const SERVICE_OVERLOADED_MESSAGE =
  'Experiencing heavy load. Check back later. Your task has been queued and will be retried automatically.';

export class ServiceOverloadedError extends Error {
  public readonly code = ErrorCodes.SERVICE_OVERLOADED;
  public readonly retryable = true;

  constructor(message: string = SERVICE_OVERLOADED_MESSAGE) {
    super(message);
    this.name = 'ServiceOverloadedError';
  }
}

/** Returns true if an error indicates rate limiting or server overload */
export function isOverloadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many') ||
    message.includes('503') ||
    message.includes('502') ||
    message.includes('unavailable') ||
    message.includes('heavy load') ||
    message.includes('all providers') ||
    message.includes('overloaded')
  );
}

// ── Error Messages ───────────────────────────────────────────

const ERROR_MESSAGES: Record<string, { message: string; retryable: boolean; severity: ErrorSeverity }> = {
  [ErrorCodes.NETWORK_OFFLINE]: {
    message: 'You appear to be offline. Please check your internet connection and try again.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.NETWORK_TIMEOUT]: {
    message: 'The request took too long. Please try again.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.NETWORK_ERROR]: {
    message: 'A network error occurred. Please check your connection and try again.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.API_RATE_LIMITED]: {
    message: 'Too many requests. Please wait a moment and try again.',
    retryable: true,
    severity: 'info',
  },
  [ErrorCodes.API_UNAVAILABLE]: {
    message: 'The AI service is temporarily unavailable. Please try again in a moment.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.API_KEY_MISSING]: {
    message: 'AI service is not configured. Please contact support.',
    retryable: false,
    severity: 'error',
  },
  [ErrorCodes.API_BAD_REQUEST]: {
    message: 'Invalid request. Please check your input and try again.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.ANALYSIS_FAILED]: {
    message: 'Dream analysis failed. Please try again or type a longer description.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.ANALYSIS_PARSE_ERROR]: {
    message: 'The AI response was unexpected. Retrying usually fixes this.',
    retryable: true,
    severity: 'info',
  },
  [ErrorCodes.ANALYSIS_INPUT_TOO_SHORT]: {
    message: 'Please write at least a few sentences about your dream for meaningful analysis.',
    retryable: false,
    severity: 'info',
  },
  [ErrorCodes.TRANSCRIPTION_FAILED]: {
    message: 'Audio transcription failed. Please try again or type your dream manually.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.TRANSCRIPTION_MODEL_LOADING]: {
    message: 'The transcription model is warming up. Please try again in 10 seconds.',
    retryable: true,
    severity: 'info',
  },
  [ErrorCodes.TRANSCRIPTION_NO_SPEECH]: {
    message: 'No speech was detected. Please speak clearly and try again.',
    retryable: true,
    severity: 'info',
  },
  [ErrorCodes.IMAGE_GENERATION_FAILED]: {
    message: 'Image generation failed. Please try again.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.IMAGE_VALIDATION_FAILED]: {
    message: 'Generated image could not be validated. Please try again.',
    retryable: true,
    severity: 'warning',
  },
  [ErrorCodes.SUPABASE_NOT_CONFIGURED]: {
    message: 'Backend services are not configured. Some features may be unavailable.',
    retryable: false,
    severity: 'error',
  },
  [ErrorCodes.SUPABASE_FUNCTION_ERROR]: {
    message: 'A server error occurred. Please try again.',
    retryable: true,
    severity: 'error',
  },
  [ErrorCodes.SERVICE_OVERLOADED]: {
    message: SERVICE_OVERLOADED_MESSAGE,
    retryable: true,
    severity: 'info',
  },
  [ErrorCodes.UNKNOWN]: {
    message: 'An unexpected error occurred. Please try again.',
    retryable: true,
    severity: 'error',
  },
};

// ── Error Classification ─────────────────────────────────────

/**
 * Classify an error from any source into a structured ApiError.
 * Handles native Error objects, HTTP responses, and Supabase errors.
 *
 * @param error — The raw error to classify
 * @returns A structured ApiError with user-friendly message
 */
export function classifyError(error: unknown): ApiError {
  // Handle native Error objects
  if (error instanceof Error) {
    return classifyNativeError(error);
  }

  // Handle Supabase-style error objects
  if (error && typeof error === 'object' && 'message' in error) {
    return classifyNativeError(new Error((error as any).message));
  }

  // Handle string errors
  if (typeof error === 'string') {
    return classifyNativeError(new Error(error));
  }

  // Unknown error type
  return createApiError(ErrorCodes.UNKNOWN);
}

/**
 * Classify a native Error into an ApiError.
 */
function classifyNativeError(error: Error): ApiError {
  const message = error.message.toLowerCase();

  // Network errors
  if (!navigator.onLine || message.includes('offline') || message.includes('network')) {
    return createApiError(ErrorCodes.NETWORK_OFFLINE, error);
  }

  if (message.includes('timeout') || message.includes('timed out') || message.includes('abort')) {
    return createApiError(ErrorCodes.NETWORK_TIMEOUT, error);
  }

  // Service overload (rate limits + server errors)
  if (
    message.includes('all providers') ||
    message.includes('heavy load') ||
    message.includes('service_overloaded')
  ) {
    return createApiError(ErrorCodes.SERVICE_OVERLOADED, error, 900000);
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many')) {
    return createApiError(ErrorCodes.SERVICE_OVERLOADED, error, 900000);
  }

  // API unavailable
  if (message.includes('503') || message.includes('502') || message.includes('unavailable') || message.includes('loading')) {
    if (message.includes('loading') || message.includes('warming')) {
      return createApiError(ErrorCodes.TRANSCRIPTION_MODEL_LOADING, error, 10000);
    }
    return createApiError(ErrorCodes.SERVICE_OVERLOADED, error, 900000);
  }

  // API key missing
  if (message.includes('api key') || message.includes('not configured') || message.includes('unauthorized') || message.includes('401')) {
    return createApiError(ErrorCodes.API_KEY_MISSING, error);
  }

  // Bad request
  if (message.includes('400') || message.includes('bad request') || message.includes('invalid')) {
    return createApiError(ErrorCodes.API_BAD_REQUEST, error);
  }

  // Analysis errors
  if (message.includes('analysis') || message.includes('parse') || message.includes('json')) {
    if (message.includes('parse')) {
      return createApiError(ErrorCodes.ANALYSIS_PARSE_ERROR, error);
    }
    return createApiError(ErrorCodes.ANALYSIS_FAILED, error);
  }

  // Transcription errors
  if (message.includes('transcri') || message.includes('whisper') || message.includes('speech')) {
    if (message.includes('no speech') || message.includes('no-speech')) {
      return createApiError(ErrorCodes.TRANSCRIPTION_NO_SPEECH, error);
    }
    return createApiError(ErrorCodes.TRANSCRIPTION_FAILED, error);
  }

  // Image generation errors
  if (message.includes('image') || message.includes('pollinations') || message.includes('stable diffusion')) {
    return createApiError(ErrorCodes.IMAGE_GENERATION_FAILED, error);
  }

  // Supabase errors
  if (message.includes('supabase') || message.includes('edge function') || message.includes('functions')) {
    return createApiError(ErrorCodes.SUPABASE_FUNCTION_ERROR, error);
  }

  // Default: unknown
  return createApiError(ErrorCodes.UNKNOWN, error);
}

/**
 * Create an ApiError from an error code.
 */
function createApiError(
  code: string,
  originalError?: Error,
  retryAfterMs?: number
): ApiError {
  const config = ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCodes.UNKNOWN];

  return {
    code,
    message: config.message,
    retryable: config.retryable,
    severity: config.severity,
    originalError,
    retryAfterMs,
  };
}

// ── Retry Helper ─────────────────────────────────────────────

/**
 * Execute an async function with automatic retry on failure.
 * Only retries if the error is classified as retryable.
 *
 * @param fn — The async function to execute
 * @param maxRetries — Maximum number of retry attempts (default: 2)
 * @param onRetry — Callback invoked before each retry with (attempt, error, delayMs)
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  onRetry?: (attempt: number, error: ApiError, delayMs: number) => void
): Promise<T> {
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = classifyError(err);

      if (!lastError.retryable || attempt >= maxRetries) {
        throw lastError;
      }

      const delayMs = lastError.retryAfterMs || 2000 * (attempt + 1);
      onRetry?.(attempt + 1, lastError, delayMs);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should not reach here, but just in case
  throw lastError || createApiError(ErrorCodes.UNKNOWN);
}

/**
 * Format an ApiError for display in the UI.
 * Returns a user-friendly string with optional retry guidance.
 */
export function formatErrorForDisplay(error: ApiError): string {
  let display = error.message;

  if (error.retryable && error.retryAfterMs) {
    const seconds = Math.ceil(error.retryAfterMs / 1000);
    display += ` (retry in ${seconds}s)`;
  }

  return display;
}
