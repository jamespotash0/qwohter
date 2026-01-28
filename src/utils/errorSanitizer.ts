/**
 * Error Sanitization Utility
 * Prevents information leakage through error messages (Security Vuln #5, #11)
 *
 * This utility sanitizes error messages before displaying to users,
 * preventing exposure of:
 * - Database structure/schema
 * - Internal function names
 * - Stack traces
 * - Credentials or tokens
 * - Server paths
 */

interface SanitizedError {
  userMessage: string;
  errorCode: string;
  shouldLog: boolean;
}

type ErrorCategory =
  | 'auth'
  | 'database'
  | 'network'
  | 'validation'
  | 'permission'
  | 'rate_limit'
  | 'storage'
  | 'unknown';

interface ErrorPattern {
  pattern: RegExp;
  category: ErrorCategory;
  userMessage: string;
  errorCode: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  // Authentication errors
  {
    pattern: /invalid login credentials/i,
    category: 'auth',
    userMessage: 'Invalid email or password',
    errorCode: 'AUTH_INVALID_CREDENTIALS',
  },
  {
    pattern: /email not confirmed/i,
    category: 'auth',
    userMessage: 'Please verify your email before signing in',
    errorCode: 'AUTH_EMAIL_NOT_VERIFIED',
  },
  {
    pattern: /user already registered/i,
    category: 'auth',
    userMessage: 'An account with this email already exists',
    errorCode: 'AUTH_USER_EXISTS',
  },
  {
    pattern: /password.*?(too short|weak|invalid)/i,
    category: 'auth',
    userMessage: 'Password must be at least 8 characters with mixed case and numbers',
    errorCode: 'AUTH_WEAK_PASSWORD',
  },
  {
    pattern: /invalid.*?token|token.*?(expired|invalid)/i,
    category: 'auth',
    userMessage: 'Your session has expired. Please sign in again.',
    errorCode: 'AUTH_TOKEN_EXPIRED',
  },
  {
    pattern: /refresh.*?token/i,
    category: 'auth',
    userMessage: 'Please sign in again to continue',
    errorCode: 'AUTH_REFRESH_FAILED',
  },
  {
    pattern: /otp.*?(invalid|expired|incorrect)/i,
    category: 'auth',
    userMessage: 'Invalid or expired verification code',
    errorCode: 'AUTH_OTP_INVALID',
  },

  // Database/constraint errors
  {
    pattern: /duplicate key|unique constraint|already exists/i,
    category: 'database',
    userMessage: 'This record already exists',
    errorCode: 'DB_DUPLICATE',
  },
  {
    pattern: /foreign key|referenced.*?not found/i,
    category: 'database',
    userMessage: 'Related record not found',
    errorCode: 'DB_FK_VIOLATION',
  },
  {
    pattern: /check constraint|violates.*?constraint/i,
    category: 'validation',
    userMessage: 'Invalid data provided',
    errorCode: 'DB_CONSTRAINT_VIOLATION',
  },
  {
    pattern: /not.*?null|null value/i,
    category: 'validation',
    userMessage: 'Required field is missing',
    errorCode: 'DB_NOT_NULL_VIOLATION',
  },

  // RLS/permission errors
  {
    pattern: /row[- ]level security|policy|permission denied/i,
    category: 'permission',
    userMessage: 'You do not have permission to perform this action',
    errorCode: 'PERMISSION_DENIED',
  },
  {
    pattern: /insufficient.*?permission|not authorized/i,
    category: 'permission',
    userMessage: 'You do not have permission to perform this action',
    errorCode: 'PERMISSION_DENIED',
  },

  // Network/connection errors
  {
    pattern: /network|fetch.*?failed|connection.*?(refused|timeout|reset)/i,
    category: 'network',
    userMessage: 'Unable to connect to the server. Please check your connection.',
    errorCode: 'NETWORK_ERROR',
  },
  {
    pattern: /timeout|timed out|deadline exceeded/i,
    category: 'network',
    userMessage: 'Request timed out. Please try again.',
    errorCode: 'TIMEOUT_ERROR',
  },
  {
    pattern: /service.*?unavailable|503/i,
    category: 'network',
    userMessage: 'Service temporarily unavailable. Please try again later.',
    errorCode: 'SERVICE_UNAVAILABLE',
  },

  // Rate limiting
  {
    pattern: /rate limit|too many (requests|attempts)|429/i,
    category: 'rate_limit',
    userMessage: 'Too many requests. Please wait a moment before trying again.',
    errorCode: 'RATE_LIMITED',
  },
  {
    pattern: /blocked|temporarily.*?blocked/i,
    category: 'rate_limit',
    userMessage: 'Access temporarily blocked. Please try again later.',
    errorCode: 'BLOCKED',
  },

  // Storage errors
  {
    pattern: /file.*?(too large|exceeds|size limit)/i,
    category: 'storage',
    userMessage: 'File is too large. Please choose a smaller file.',
    errorCode: 'FILE_TOO_LARGE',
  },
  {
    pattern: /file type|mime type|unsupported.*?format/i,
    category: 'storage',
    userMessage: 'File type not supported',
    errorCode: 'INVALID_FILE_TYPE',
  },
  {
    pattern: /storage.*?(quota|limit|full)/i,
    category: 'storage',
    userMessage: 'Storage limit reached',
    errorCode: 'STORAGE_LIMIT',
  },
];

// Patterns that indicate sensitive information that must be stripped
const SENSITIVE_PATTERNS = [
  /password[=:]["']?[^"'\s]+/gi,
  /api[_-]?key[=:]["']?[^"'\s]+/gi,
  /secret[=:]["']?[^"'\s]+/gi,
  /token[=:]["']?[^"'\s]+/gi,
  /bearer\s+[a-zA-Z0-9._-]+/gi,
  /authorization[=:]["']?[^"'\s]+/gi,
  /\/Users\/[^\s]+/gi, // File paths
  /\/home\/[^\s]+/gi,
  /C:\\[^\s]+/gi,
  /at\s+\S+\s+\([^)]+\)/g, // Stack traces
  /Error:\s*at\s+/g,
];

/**
 * Sanitize an error message to prevent information leakage
 */
export function sanitizeError(error: unknown): SanitizedError {
  const errorMessage = extractErrorMessage(error);
  const sanitized = matchErrorPattern(errorMessage);

  return {
    userMessage: sanitized.userMessage,
    errorCode: sanitized.errorCode,
    shouldLog: true,
  };
}

/**
 * Extract error message from various error formats
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;

    // Supabase error format
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      return errorObj.message;
    }

    // API error format
    if ('error' in errorObj) {
      if (typeof errorObj.error === 'string') {
        return errorObj.error;
      }
      if (
        typeof errorObj.error === 'object' &&
        errorObj.error &&
        'message' in errorObj.error
      ) {
        return String((errorObj.error as Record<string, unknown>).message);
      }
    }

    // Try to stringify
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown error';
    }
  }

  return 'Unknown error';
}

/**
 * Match error message against known patterns
 */
function matchErrorPattern(message: string): {
  userMessage: string;
  errorCode: string;
  category: ErrorCategory;
} {
  // First, strip any sensitive information from the message for logging
  let sanitizedForMatching = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitizedForMatching = sanitizedForMatching.replace(pattern, '[REDACTED]');
  }

  // Try to match against known patterns
  for (const errorPattern of ERROR_PATTERNS) {
    if (errorPattern.pattern.test(sanitizedForMatching)) {
      return {
        userMessage: errorPattern.userMessage,
        errorCode: errorPattern.errorCode,
        category: errorPattern.category,
      };
    }
  }

  // Default fallback - generic error message
  return {
    userMessage: 'An error occurred. Please try again or contact support.',
    errorCode: 'UNKNOWN_ERROR',
    category: 'unknown',
  };
}

/**
 * Create a sanitized error for logging (removes sensitive data but keeps context)
 */
export function sanitizeForLogging(error: unknown): Record<string, unknown> {
  const message = extractErrorMessage(error);

  let sanitizedMessage = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitizedMessage = sanitizedMessage.replace(pattern, '[REDACTED]');
  }

  return {
    message: sanitizedMessage,
    timestamp: new Date().toISOString(),
    type: error instanceof Error ? error.name : typeof error,
  };
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return /rate limit|too many|429|blocked/i.test(message);
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return /auth|login|credentials|token|session|unauthorized|401/i.test(message);
}

/**
 * Check if an error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return /permission|policy|rls|forbidden|403/i.test(message);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  return sanitizeError(error).userMessage;
}
