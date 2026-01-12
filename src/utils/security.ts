/**
 * Security utilities and configurations
 * 
 * This module provides security-related utilities and ensures
 * proper security practices are followed throughout the application.
 */

import DOMPurify from 'dompurify';

/**
 * HTML sanitization utilities
 */
export const sanitizeHTML = {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  clean: (html: string): string => {
    if (typeof html !== 'string') return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
      ALLOWED_ATTR: ['class', 'style', 'data-conditional', 'data-deps', 'data-type', 'data-value', 'data-format', 'data-show-if', 'data-user-edited', 'data-original-value'],
      ALLOW_DATA_ATTR: true,  // Required for semantic markup in proposal templates
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'select', 'button'],
      KEEP_CONTENT: true
    });
  },
  
  /**
   * Sanitize HTML for PDF generation (more permissive but still safe)
   */
  cleanForPDF: (html: string): string => {
    if (typeof html !== 'string') return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'tbody', 'thead', 'img'],
      ALLOWED_ATTR: ['class', 'style', 'src', 'alt', 'width', 'height', 'data-conditional', 'data-deps', 'data-type', 'data-value', 'data-format', 'data-show-if', 'data-user-edited', 'data-original-value'],
      ALLOW_DATA_ATTR: true,  // Required for semantic markup in proposal templates
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe', 'form', 'input', 'textarea', 'select', 'button', 'link'],
      KEEP_CONTENT: true
    });
  },

  /**
   * Safe way to set innerHTML with sanitization
   */
  setInnerHTML: (element: HTMLElement, html: string): void => {
    if (!element || typeof html !== 'string') return;
    element.innerHTML = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'tbody', 'thead'],
      ALLOWED_ATTR: ['class', 'style', 'data-conditional', 'data-deps', 'data-type', 'data-value', 'data-format', 'data-show-if', 'data-user-edited', 'data-original-value'],
      ALLOW_DATA_ATTR: true,  // Required for semantic markup in proposal templates
      FORBID_TAGS: ['script', 'object', 'embed', 'iframe'],
      KEEP_CONTENT: true
    });
  }
};

/**
 * Input sanitization utilities
 */
export const sanitizeInput = {
  /**
   * Sanitize string input to prevent XSS
   */
  string: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  },

  /**
   * Sanitize email input - allow typing but filter dangerous characters
   */
  email: (email: string): string => {
    if (typeof email !== 'string') return '';
    
    // Allow email characters while typing, but filter dangerous ones
    return email
      .replace(/[<>;"'\\]/g, '') // Remove dangerous characters
      .replace(/\s+/g, '') // Remove spaces
      .toLowerCase()
      .slice(0, 254); // Max email length
  },

  /**
   * Sanitize numeric input
   */
  number: (input: string | number): number => {
    const num = parseFloat(String(input));
    return isNaN(num) ? 0 : num;
  },

  /**
   * Sanitize UUID input
   */
  uuid: (input: string): string => {
    if (typeof input !== 'string') return '';
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(input) ? input : '';
  }
};

/**
 * Security validation utilities
 */
export const validateSecurity = {
  /**
   * Validate that user can access a resource within their organization
   */
  organizationAccess: (userOrgId: string | null, resourceOrgId: string | null): boolean => {
    if (!userOrgId || !resourceOrgId) return false;
    return userOrgId === resourceOrgId;
  },

  /**
   * Validate user role for admin operations
   */
  adminRole: (userRole: string | null): boolean => {
    return userRole === 'admin' || userRole === 'owner';
  },

  /**
   * Validate that content doesn't contain malicious patterns
   */
  contentSafety: (content: string): boolean => {
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
    ];

    return !maliciousPatterns.some(pattern => pattern.test(content));
  }
};

/**
 * Security headers configuration
 */
export const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'nonce-RANDOM_NONCE'", // Use nonce instead of unsafe-inline
    "style-src 'self' 'nonce-RANDOM_NONCE'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.net",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'"
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

/**
 * Environment validation
 */
export const validateEnvironment = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!import.meta.env.VITE_SUPABASE_URL) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }
  
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }
  
  // Validate URL format
  if (import.meta.env.VITE_SUPABASE_URL && 
      !import.meta.env.VITE_SUPABASE_URL.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must use HTTPS');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Production security check
 */
export const isProductionSecure = (): boolean => {
  const env = validateEnvironment();
  
  // Check if we're in production mode
  const isProduction = import.meta.env.PROD;
  
  if (!isProduction) return true; // Development is OK
  
  return env.isValid && 
         import.meta.env.VITE_SUPABASE_URL.includes('supabase.co'); // Ensure using real Supabase
};

/**
 * Rate limiting utility (client-side)
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this key
    const requests = this.requests.get(key) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Check if under limit
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    return true;
  }
}

// Initialize rate limiter for auth operations
export const authRateLimiter = new RateLimiter(5, 300000); // 5 requests per 5 minutes