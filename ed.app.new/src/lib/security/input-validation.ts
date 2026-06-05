/**
 * Input Validation & Sanitization Module
 * 
 * SECURITY FIX: Provides comprehensive input validation to prevent:
 * - XSS (Cross-Site Scripting) attacks
 * - SQL/NoSQL injection attempts
 * - Command injection
 * - Path traversal attacks
 * - HTML/Script injection in user content
 */

// ============================================================
// SANITIZATION PATTERNS
// ============================================================

const DANGEROUS_HTML_PATTERN = /<script[^>]*>.*?<\/script>|<iframe[^>]*>.*?<\/iframe>|<object[^>]*>.*?<\/object>|<embed[^>]*>/gi;
const EVENT_HANDLER_PATTERN = /\s+on\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URL_PATTERN = /javascript\s*:/gi;
const DATA_URL_DANGEROUS_PATTERN = /data\s*:\s*text\/html/gi;

/**
 * Sanitize user-provided text content to prevent XSS
 * Removes dangerous HTML tags, event handlers, and javascript: URLs
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';
  
  let sanitized = String(input);
  
  // Remove dangerous HTML tags
  sanitized = sanitized.replace(DANGEROUS_HTML_PATTERN, '');
  
  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, '');
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(JAVASCRIPT_URL_PATTERN, 'blocked:');
  
  // Block dangerous data: URLs
  sanitized = sanitized.replace(DATA_URL_DANGEROUS_PATTERN, 'blocked:');
  
  return sanitized.trim();
}

/**
 * Escape HTML special characters for safe rendering
 * Use this when displaying user content as HTML
 */
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return String(input).replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

/**
 * Validate and sanitize email addresses
 */
export function validateEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(String(email).toLowerCase());
}

/**
 * Sanitize email to prevent injection
 */
export function sanitizeEmail(email: string): string {
  return String(email).trim().toLowerCase().slice(0, 254);
}

/**
 * Validate URL format
 * Only allows http, https, and blob URLs
 */
export function validateUrl(url: string, allowedProtocols: string[] = ['http:', 'https:', 'blob:']): boolean {
  try {
    const parsed = new URL(url);
    return allowedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize URL to prevent javascript: and data: injection
 */
export function sanitizeUrl(url: string, fallback: string = ''): string {
  if (validateUrl(url)) {
    return url;
  }
  return fallback;
}

/**
 * Validate dream content length and structure
 */
export function validateDreamContent(content: string): { valid: boolean; error?: string } {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Content is required' };
  }
  
  const trimmed = content.trim();
  
  if (trimmed.length < 10) {
    return { valid: false, error: 'Dream content must be at least 10 characters' };
  }
  
  if (trimmed.length > 50000) {
    return { valid: false, error: 'Dream content exceeds maximum length of 50,000 characters' };
  }
  
  // Check for potential injection attempts
  if (/<\?php|<%|%>|exec\s*\(|eval\s*\(/i.test(trimmed)) {
    return { valid: false, error: 'Invalid content detected' };
  }
  
  return { valid: true };
}

/**
 * Validate theme/tag names
 */
export function validateThemeName(name: string): boolean {
  const themePattern = /^[a-zA-Z0-9\s\-_]{1,50}$/;
  return themePattern.test(name.trim());
}

/**
 * Sanitize theme name for safe storage
 */
export function sanitizeThemeName(name: string): string {
  return name.trim().replace(/[^a-zA-Z0-9\s\-_]/g, '').slice(0, 50);
}

/**
 * Validate emotion values against allowed list
 */
export function validateEmotion(emotion: string, allowedEmotions: string[]): boolean {
  return allowedEmotions.includes(emotion.toLowerCase());
}

/**
 * Sanitize category names
 */
export function sanitizeCategory(category: string): string {
  return category.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-').slice(0, 50);
}

/**
 * Validate numeric ranges
 */
export function validateNumberRange(
  value: number | string,
  min: number,
  max: number,
  fieldName: string
): { valid: boolean; error?: string; value?: number } {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (numValue < min || numValue > max) {
    return { valid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  
  return { valid: true, value: numValue };
}

/**
 * Validate UUID format
 */
export function validateUuid(uuid: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(uuid);
}

/**
 * Validate object structure for dream data
 */
export function validateDreamData(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.content || typeof data.content !== 'string') {
    errors.push('Content is required and must be a string');
  } else {
    const contentValidation = validateDreamContent(data.content as string);
    if (!contentValidation.valid) {
      errors.push(contentValidation.error!);
    }
  }
  
  // Optional but validated fields
  if (data.emotion && typeof data.emotion === 'string') {
    if (!/^[a-zA-Z0-9\-_]{1,30}$/.test(data.emotion)) {
      errors.push('Invalid emotion format');
    }
  }
  
  if (data.category && typeof data.category === 'string') {
    if (!/^[a-zA-Z0-9\-_]{1,50}$/.test(data.category)) {
      errors.push('Invalid category format');
    }
  }
  
  if (data.themes && Array.isArray(data.themes)) {
    const invalidThemes = data.themes.filter(
      (t: unknown) => typeof t !== 'string' || !/^[a-zA-Z0-9\s\-_]{1,50}$/.test(t)
    );
    if (invalidThemes.length > 0) {
      errors.push('Invalid theme format');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limit check helper
 * Returns true if request should be allowed
 */
export function checkRateLimit(
  timestamps: number[],
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const recentRequests = timestamps.filter((ts) => now - ts < windowMs);
  return recentRequests.length < maxRequests;
}

/**
 * Create a rate limiter function
 */
export function createRateLimiter(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();
  
  return {
    check: (identifier: string): boolean => {
      const now = Date.now();
      const userRequests = requests.get(identifier) || [];
      const recentRequests = userRequests.filter((ts) => now - ts < windowMs);
      
      if (recentRequests.length >= maxRequests) {
        return false;
      }
      
      recentRequests.push(now);
      requests.set(identifier, recentRequests);
      return true;
    },
    
    reset: (identifier: string) => {
      requests.delete(identifier);
    },
  };
}
