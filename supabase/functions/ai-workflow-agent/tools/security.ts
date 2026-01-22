/**
 * Tool Security Module
 *
 * Provides security utilities for tool execution:
 * - Input validation and sanitization
 * - Injection attack prevention
 * - Parameter bounds checking
 * - Audit logging
 */

// ============================================================================
// Dangerous Patterns (Injection Prevention)
// ============================================================================

const INJECTION_PATTERNS = [
  // SQL injection
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|TRUNCATE|EXEC|EXECUTE)\b.*\b(FROM|INTO|TABLE|DATABASE|WHERE)\b)/i,
  /('|"|;|--|\*|\/\*|\*\/|xp_|sp_|0x)/i,

  // NoSQL injection
  /(\$where|\$gt|\$lt|\$ne|\$regex|\$or|\$and)/i,

  // Script injection (XSS)
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[\s\S]*?>/gi,

  // Path traversal
  /\.\.\//g,
  /\.\.\\]/g,

  // Command injection
  /[;&|`$(){}[\]<>]/,

  // Template injection
  /\{\{[\s\S]*?\}\}/g,
  /\$\{[\s\S]*?\}/g,
];

// Patterns specifically dangerous for database operations
const DB_DANGEROUS_PATTERNS = [
  /;\s*(DROP|DELETE|TRUNCATE|ALTER)/i,
  /UNION\s+SELECT/i,
  /OR\s+1\s*=\s*1/i,
  /AND\s+1\s*=\s*1/i,
  /'\s*OR\s*'/i,
];

// ============================================================================
// Sensitive Data Patterns
// ============================================================================

const SENSITIVE_PATTERNS = [
  // API keys and tokens
  /\b(api[_-]?key|apikey|access[_-]?token|auth[_-]?token|bearer)\s*[:=]\s*['"]?[\w-]+/gi,
  // Passwords
  /\b(password|passwd|pwd)\s*[:=]\s*['"]?[^\s'"]+/gi,
  // Credit cards (basic pattern)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  // SSN
  /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  // Private keys
  /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/gi,
];

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  sanitized: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  blocked: boolean;
  blockedReason?: string;
}

// ============================================================================
// Core Security Functions
// ============================================================================

/**
 * Check if a string contains injection patterns
 */
function containsInjection(value: string): { found: boolean; pattern?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(value)) {
      return { found: true, pattern: pattern.toString() };
    }
  }
  return { found: false };
}

/**
 * Check if a string contains database-specific dangerous patterns
 */
function containsDBInjection(value: string): boolean {
  return DB_DANGEROUS_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Check if a string contains sensitive data that shouldn't be stored
 */
function containsSensitiveData(value: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Sanitize a string by removing/escaping dangerous characters
 */
function sanitizeString(value: string, maxLength: number = 10000): string {
  if (!value || typeof value !== 'string') return '';

  // Truncate to max length
  let sanitized = value.slice(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Escape HTML entities for storage (prevents XSS when displayed)
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized.trim();
}

/**
 * Validate and sanitize a single parameter value
 */
function validateParamValue(
  key: string,
  value: unknown,
  options: { maxStringLength?: number; allowHTML?: boolean } = {}
): { valid: boolean; sanitized: unknown; error?: string } {
  const { maxStringLength = 5000, allowHTML = false } = options;

  // Null/undefined pass through
  if (value === null || value === undefined) {
    return { valid: true, sanitized: value };
  }

  // Handle strings
  if (typeof value === 'string') {
    // Check for injection attacks
    const injection = containsInjection(value);
    if (injection.found) {
      console.warn(`[Security] Injection pattern detected in "${key}":`, injection.pattern);
      return {
        valid: false,
        sanitized: '',
        error: `Potentially dangerous content detected in "${key}"`,
      };
    }

    // Check for DB-specific injections
    if (containsDBInjection(value)) {
      console.warn(`[Security] DB injection pattern detected in "${key}"`);
      return {
        valid: false,
        sanitized: '',
        error: `Potentially dangerous database content in "${key}"`,
      };
    }

    // Warn about sensitive data (but allow - just log)
    if (containsSensitiveData(value)) {
      console.warn(`[Security] Sensitive data pattern detected in "${key}" - consider masking`);
    }

    // Sanitize the string
    const sanitized = allowHTML ? value.slice(0, maxStringLength) : sanitizeString(value, maxStringLength);
    return { valid: true, sanitized };
  }

  // Handle numbers
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return { valid: false, sanitized: 0, error: `Invalid number in "${key}"` };
    }
    return { valid: true, sanitized: value };
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return { valid: true, sanitized: value };
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const sanitizedArray: unknown[] = [];
    for (let i = 0; i < Math.min(value.length, 100); i++) {
      const result = validateParamValue(`${key}[${i}]`, value[i], options);
      if (!result.valid) {
        return { valid: false, sanitized: [], error: result.error };
      }
      sanitizedArray.push(result.sanitized);
    }
    return { valid: true, sanitized: sanitizedArray };
  }

  // Handle objects
  if (typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const result = validateParamValue(`${key}.${k}`, v, options);
      if (!result.valid) {
        return { valid: false, sanitized: {}, error: result.error };
      }
      sanitizedObj[k] = result.sanitized;
    }
    return { valid: true, sanitized: sanitizedObj };
  }

  // Unknown types are rejected
  return { valid: false, sanitized: null, error: `Unsupported type for "${key}"` };
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate and sanitize tool parameters before execution
 */
export function validateToolParams(
  toolName: string,
  params: Record<string, unknown>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitized: Record<string, unknown> = {};

  console.log(`[Security] Validating params for tool: ${toolName}`);

  // Check for overly large payloads
  const paramsStr = JSON.stringify(params);
  if (paramsStr.length > 50000) {
    return {
      valid: false,
      sanitized: {},
      errors: ['Parameter payload too large'],
      warnings: [],
      blocked: true,
      blockedReason: 'Payload size exceeds limit',
    };
  }

  // Validate each parameter
  for (const [key, value] of Object.entries(params)) {
    const result = validateParamValue(key, value);

    if (!result.valid) {
      errors.push(result.error || `Invalid value for "${key}"`);
    } else {
      sanitized[key] = result.sanitized;
    }
  }

  // Tool-specific validations
  const toolValidation = validateToolSpecificRules(toolName, sanitized);
  errors.push(...toolValidation.errors);
  warnings.push(...toolValidation.warnings);

  const blocked = errors.length > 0;

  return {
    valid: !blocked,
    sanitized,
    errors,
    warnings,
    blocked,
    blockedReason: blocked ? errors.join('; ') : undefined,
  };
}

/**
 * Tool-specific validation rules
 */
function validateToolSpecificRules(
  toolName: string,
  params: Record<string, unknown>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (toolName) {
    case 'create_task':
    case 'create_reminder': {
      // Title is required and must be reasonable length
      if (!params.title || typeof params.title !== 'string') {
        errors.push('Title is required');
      } else if (params.title.length > 500) {
        errors.push('Title too long (max 500 characters)');
      }

      // Due date validation
      if (params.due_date && typeof params.due_date === 'string') {
        const date = new Date(params.due_date);
        if (isNaN(date.getTime())) {
          warnings.push('Invalid due date format');
        }
      }

      // Priority must be valid enum
      if (params.priority && !['low', 'medium', 'high', 'Low', 'Medium', 'High'].includes(params.priority as string)) {
        errors.push('Invalid priority value');
      }
      break;
    }

    case 'update_status': {
      const validStatuses = ['Draft', 'Submitted', 'Won', 'Rejected'];
      if (!params.status || !validStatuses.includes(params.status as string)) {
        errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
      }
      break;
    }

    case 'draft_email': {
      if (!params.body || typeof params.body !== 'string') {
        errors.push('Email body is required');
      } else if ((params.body as string).length > 50000) {
        errors.push('Email body too long');
      }
      break;
    }

    case 'web_search': {
      if (!params.search_query || typeof params.search_query !== 'string') {
        errors.push('Search query is required');
      } else if ((params.search_query as string).length > 500) {
        errors.push('Search query too long');
      }
      break;
    }

    case 'create_proposal':
    case 'update_proposal': {
      if (params.project_name && (params.project_name as string).length > 500) {
        errors.push('Project name too long');
      }
      if (params.client_name && (params.client_name as string).length > 200) {
        errors.push('Client name too long (max 200 characters)');
      }
      if (params.client_email && typeof params.client_email === 'string') {
        // Basic email format check
        if (!params.client_email.includes('@') || params.client_email.length > 254) {
          warnings.push('Invalid email format');
        }
      }
      if (params.total_value !== undefined && typeof params.total_value === 'number') {
        if (params.total_value < 0 || params.total_value > 999999999) {
          errors.push('Total value must be between 0 and 999,999,999');
        }
      }
      break;
    }

    case 'update_task': {
      // task_id is required
      if (!params.task_id || typeof params.task_id !== 'string') {
        errors.push('Task ID is required');
      }
      // Title length check if provided
      if (params.title && (params.title as string).length > 500) {
        errors.push('Title too long (max 500 characters)');
      }
      // Status validation
      if (params.status) {
        const validStatuses = ['To Do', 'In Progress', 'Done', 'todo', 'in progress', 'done'];
        if (!validStatuses.some(s => s.toLowerCase() === (params.status as string).toLowerCase())) {
          errors.push('Invalid task status');
        }
      }
      // Priority validation
      if (params.priority && !['low', 'medium', 'high', 'Low', 'Medium', 'High'].includes(params.priority as string)) {
        errors.push('Invalid priority value');
      }
      break;
    }

    case 'update_notification': {
      // notification_id is required
      if (!params.notification_id || typeof params.notification_id !== 'string') {
        errors.push('Notification ID is required');
      }
      // Message length check
      if (params.message && (params.message as string).length > 1000) {
        errors.push('Message too long (max 1000 characters)');
      }
      // Type validation
      if (params.type && !['Reminder', 'Alert', 'Info'].includes(params.type as string)) {
        errors.push('Invalid notification type');
      }
      // Status validation
      if (params.status && !['Pending', 'Sent', 'Read', 'Dismissed'].includes(params.status as string)) {
        errors.push('Invalid notification status');
      }
      break;
    }

    case 'move_to_project_board': {
      // Workflow status length check
      if (params.workflow_status && (params.workflow_status as string).length > 100) {
        errors.push('Workflow status too long (max 100 characters)');
      }
      // Priority validation
      if (params.priority && !['Highest', 'High', 'Medium', 'Low', 'Lowest'].includes(params.priority as string)) {
        errors.push('Invalid project priority');
      }
      break;
    }

    case 'add_contact': {
      // full_name is required
      if (!params.full_name || typeof params.full_name !== 'string') {
        errors.push('Full name is required');
      } else if ((params.full_name as string).length > 200) {
        errors.push('Full name too long (max 200 characters)');
      }
      // Email validation
      if (params.email && typeof params.email === 'string') {
        if (!params.email.includes('@') || params.email.length > 254) {
          warnings.push('Invalid email format');
        }
      }
      // Company name length
      if (params.company_name && (params.company_name as string).length > 200) {
        errors.push('Company name too long (max 200 characters)');
      }
      // Contact type validation
      const validContactTypes = [
        'Customer', 'Employee', 'Salesperson', 'Vendor', 'Contractor',
        'Architect', 'Designer', 'Engineer', 'Manufacturer', 'Business',
        'Supplier', 'Lead', 'Other'
      ];
      if (params.contact_type && !validContactTypes.includes(params.contact_type as string)) {
        warnings.push('Unknown contact type, will default to Other');
      }
      break;
    }
  }

  return { errors, warnings };
}

// ============================================================================
// Audit Logging
// ============================================================================

export interface AuditLogEntry {
  timestamp: string;
  toolName: string;
  userId: string;
  organizationId: string;
  action: 'execute' | 'blocked' | 'error';
  params: Record<string, unknown>;
  result?: string;
  securityFlags?: string[];
}

/**
 * Create an audit log entry for tool execution
 */
export function createAuditLog(
  toolName: string,
  userId: string,
  organizationId: string,
  action: AuditLogEntry['action'],
  params: Record<string, unknown>,
  result?: string,
  securityFlags?: string[]
): AuditLogEntry {
  // Redact sensitive values in params for logging
  const redactedParams = redactForLogging(params);

  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    toolName,
    userId,
    organizationId,
    action,
    params: redactedParams,
    result,
    securityFlags,
  };

  // Log to console (in production, this would go to a proper audit system)
  console.log('[Security Audit]', JSON.stringify(entry));

  return entry;
}

/**
 * Redact sensitive values for logging
 */
function redactForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential', 'auth'];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((k) => lowerKey.includes(k))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactForLogging(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================================
// Rate Limiting (Simple in-memory implementation)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if a user/org is rate limited
 */
export function checkRateLimit(
  userId: string,
  organizationId: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetIn: number } {
  const key = `${organizationId}:${userId}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // Reset if window expired
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    rateLimitStore.set(key, record);
  }

  record.count++;

  const allowed = record.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - record.count);
  const resetIn = Math.max(0, record.resetTime - now);

  if (!allowed) {
    console.warn(`[Security] Rate limit exceeded for ${key}`);
  }

  return { allowed, remaining, resetIn };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute
