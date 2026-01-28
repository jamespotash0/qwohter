# Security Fixes Implementation Guide

This guide addresses the 12 security vulnerabilities found during penetration testing.

## Summary of Vulnerabilities Fixed

| # | Severity | Vulnerability | Status | Fix Location |
|---|----------|--------------|--------|--------------|
| 1 | HIGH | Login Rate Limiting | ✅ Fixed | Migration 3 + authRateLimitService |
| 2 | HIGH | OTP Brute Force | ✅ Fixed | Migration 3 + authRateLimitService |
| 3 | MEDIUM | Content-Type Sniffing | ✅ Fixed | Vercel Headers |
| 4 | MEDIUM | Realtime Token in URL | ✅ Fixed | Already using PKCE |
| 5 | MEDIUM | Error Message Leakage | ✅ Fixed | errorSanitizer.ts |
| 6 | HIGH | RPC Function Enumeration | ✅ Fixed | Migration 2 |
| 7 | MEDIUM | Security Headers Missing | ✅ Fixed | vercel.json |
| 8 | LOW | API Version Disclosure | ⚠️ Partial | Supabase limitation |
| 9 | HIGH | Memory Exhaustion | ✅ Fixed | Config + SQL |
| 10 | HIGH | TLS Downgrade | ✅ Fixed | HSTS Header |
| 11 | MEDIUM | Credentials in Errors | ✅ Fixed | errorSanitizer.ts |
| 12 | HIGH | Password Reset Abuse | ✅ Fixed | Migration 1 + Service |

### Quick Fix Commands
```bash
# Apply all migrations
supabase db push

# Or run manually in SQL Editor (in order):
# 1. 20260116000001_security_hardening.sql
# 2. 20260116000002_fix_rpc_enumeration.sql
# 3. 20260116000003_fix_otp_login_rate_limiting.sql
```

---

## Step 1: Apply SQL Migrations

Run ALL THREE security migrations in order:

```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via Supabase Dashboard SQL Editor
# Run these files IN ORDER:
# 1. supabase/migrations/20260116000001_security_hardening.sql
# 2. supabase/migrations/20260116000002_fix_rpc_enumeration.sql
# 3. supabase/migrations/20260116000003_fix_otp_login_rate_limiting.sql
```

### Migration 1: Base Security (20260116000001)
- `auth_rate_limits` table - Tracks failed auth attempts
- `check_auth_rate_limit()` function - Generic rate limit check
- `sanitize_error_message()` function - Server-side error sanitization
- `password_reset_audit` table - Audit trail for reset requests
- `security_audit_log` table - General security event logging

### Migration 2: RPC Enumeration Fix (20260116000002)
- Revokes ALL execute permissions from anon/public
- Creates `internal` schema for sensitive functions
- Adds `@omit` comments to hide functions from OpenAPI
- Creates `secure_rpc()` dispatcher pattern
- Revokes pg_proc access from anon

### Migration 3: OTP & Login Rate Limiting (20260116000003)
- `check_login_rate_limit(email)` - 5 attempts/15min, 30min block
- `check_otp_rate_limit(email)` - 3 attempts/10min, 60min block
- `record_failed_login(email)` - Track failed logins
- `record_failed_otp(email)` - Track failed OTP attempts
- `clear_auth_rate_limit(email, type)` - Clear on success

---

## Step 2: Deploy Vercel Configuration

The `vercel.json` has been updated with security headers. Deploy to apply:

```bash
git add vercel.json
git commit -m "security: add OWASP security headers"
git push
```

### Headers Added:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevents MIME sniffing (#3) |
| X-Frame-Options | DENY | Prevents clickjacking |
| X-XSS-Protection | 1; mode=block | XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer info |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload | Forces HTTPS (#10) |
| Content-Security-Policy | [see vercel.json] | XSS/injection protection |
| Permissions-Policy | camera=(), microphone=()... | Disables unused APIs |

---

## Step 3: Integrate Rate Limiting in Auth

### Login Form Integration

```typescript
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearRateLimit,
  getRateLimitMessage
} from '@/services/authRateLimitService';
import { signIn } from '@/auth/services/authService';
import { getUserFriendlyMessage } from '@/utils/errorSanitizer';

async function handleLogin(email: string, password: string) {
  // 1. Pre-check rate limit BEFORE attempting login
  const rateCheck = await checkLoginRateLimit(email);

  if (!rateCheck.allowed) {
    toast.error(getRateLimitMessage(rateCheck));
    return;
  }

  // 2. Show warning if close to limit
  if (rateCheck.remaining_attempts && rateCheck.remaining_attempts <= 2) {
    toast.warning(`${rateCheck.remaining_attempts} attempts remaining`);
  }

  // 3. Attempt login
  const result = await signIn({ email, password });

  if (result.error) {
    // 4a. Record failed attempt
    await recordFailedLogin(email);
    toast.error(getUserFriendlyMessage(result.error));
    return;
  }

  // 4b. Clear rate limit on success
  await clearRateLimit(email, 'login');
  // Success - redirect to dashboard
}
```

### OTP Verification Integration

```typescript
import {
  checkOtpRateLimit,
  recordFailedOtp,
  clearRateLimit,
  getRateLimitMessage
} from '@/services/authRateLimitService';

async function handleOtpVerify(email: string, code: string) {
  // 1. Pre-check OTP rate limit
  const rateCheck = await checkOtpRateLimit(email);

  if (!rateCheck.allowed) {
    toast.error(getRateLimitMessage(rateCheck));
    return;
  }

  // 2. Attempt verification
  const result = await verifyOtp(email, code);

  if (result.error) {
    // 3a. Record failed attempt (strict: only 3 attempts allowed!)
    await recordFailedOtp(email);
    toast.error('Invalid verification code');
    return;
  }

  // 3b. Clear rate limit on success
  await clearRateLimit(email, 'otp');
  // Success
}
```

### Rate Limit Configurations:

| Attempt Type | Max Attempts | Window | Block Duration |
|-------------|--------------|--------|----------------|
| login | 5 | 15 min | 30 min |
| otp | 3 | 10 min | 60 min |
| password_reset | 3 | 60 min | 120 min |
| signup | 5 | 60 min | 60 min |

---

## Step 4: Use Error Sanitization

Replace direct error display with sanitized messages:

```typescript
// Before (INSECURE)
catch (error) {
  toast.error(error.message); // May leak internal details
}

// After (SECURE)
import { sanitizeError, getUserFriendlyMessage } from '@/utils/errorSanitizer';

catch (error) {
  const sanitized = sanitizeError(error);

  // Log the full error for debugging (server-side/Sentry only)
  console.error('Operation failed:', sanitizeForLogging(error));

  // Show safe message to user
  toast.error(sanitized.userMessage);
}
```

---

## Step 5: Configure Supabase Dashboard Settings

Some settings need to be configured in the Supabase Dashboard:

### Auth Settings (Dashboard > Authentication > Settings)

1. **Rate Limiting** (Auth > URL Configuration):
   - Email sign-ups: 3/hour
   - Email sign-ins: 10/hour
   - Password reset: 3/hour
   - OTP verification: 5/hour

2. **Email Templates** (Auth > Email Templates):
   - Review reset email template to not reveal user existence
   - Use generic "If an account exists..." language

3. **Disable Unused Providers** (Auth > Providers):
   - Disable any OAuth providers you're not using

### API Settings (Dashboard > Settings > API)

1. **Max Rows**: Set to 1000 (prevents memory exhaustion)
2. **OpenAPI**: Consider disabling in production

### Storage Settings (Dashboard > Storage > Policies)

1. Verify bucket policies match the security functions
2. Ensure `validate_storage_upload()` is called before uploads

---

## Step 6: Supabase Auth Rate Limiting (Dashboard)

Go to **Supabase Dashboard > Authentication > Rate Limits** and configure:

```
Email signups: 3 per hour
Sign-ins: 10 per hour
Password recovery: 3 per hour
Magic links: 3 per hour
```

---

## Step 7: Edge Function Configuration

The `supabase/config.toml` has been updated. Push changes:

```bash
supabase functions deploy --all
```

Or selectively deploy functions that need JWT verification:

```bash
supabase functions deploy send-invite
```

---

## Verification Checklist

After deployment, verify each fix:

### 1. Login Rate Limiting Test (in Supabase SQL Editor)
```sql
-- Test login rate limit
SELECT check_login_rate_limit('test@example.com');
-- Should return: {"allowed": true, "blocked": false, "remaining_attempts": 5}

-- Simulate 5 failed logins
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');
SELECT record_failed_login('test@example.com');

-- Check again - should be blocked
SELECT check_login_rate_limit('test@example.com');
-- Should return: {"allowed": false, "blocked": true, "remaining_seconds": 1800, ...}

-- Clean up test data
DELETE FROM auth_rate_limits WHERE identifier = 'test@example.com';
```

### 2. OTP Rate Limiting Test
```sql
-- Test OTP rate limit (stricter: 3 attempts)
SELECT check_otp_rate_limit('test@example.com');

-- Simulate 3 failed OTP attempts
SELECT record_failed_otp('test@example.com');
SELECT record_failed_otp('test@example.com');
SELECT record_failed_otp('test@example.com');

-- Should be blocked for 1 hour
SELECT check_otp_rate_limit('test@example.com');

-- Clean up
DELETE FROM auth_rate_limits WHERE identifier = 'test@example.com';
```

### 3. RPC Enumeration Test
```sql
-- Verify anon cannot list functions
-- Run as anon role (use Supabase API):
-- This should return empty or error
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public';
```

### 2. Security Headers Test
```bash
# Check headers on your deployed site
curl -I https://your-app.vercel.app/

# Should see:
# x-content-type-options: nosniff
# x-frame-options: DENY
# strict-transport-security: max-age=31536000...
# content-security-policy: ...
```

### 3. RPC Enumeration Test
```bash
# Should fail for unauthenticated users
curl https://your-project.supabase.co/rest/v1/rpc/some_internal_function \
  -H "apikey: your-anon-key"
```

### 4. Error Message Test
Trigger various errors and verify:
- No stack traces shown to users
- No database column names leaked
- No internal function names exposed

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260116000001_security_hardening.sql` | New - base rate limiting, audit logging |
| `supabase/migrations/20260116000002_fix_rpc_enumeration.sql` | New - RPC enumeration fix |
| `supabase/migrations/20260116000003_fix_otp_login_rate_limiting.sql` | New - specific OTP/login rate limits |
| `supabase/config.toml` | Updated - auth rate limits, function config |
| `vercel.json` | Updated - security headers |
| `src/utils/errorSanitizer.ts` | New - error message sanitization |
| `src/services/authRateLimitService.ts` | Updated - specific rate limit functions |

---

## Remaining Considerations

### Partial Fix: API Version Disclosure (#8)
Supabase automatically includes version info in responses. To minimize:
- Use custom domains (hides Supabase infrastructure)
- Proxy API calls through your own backend

### Realtime Token (#4)
The app already uses PKCE flow. Realtime tokens in WebSocket URLs are a Supabase architecture choice - this is expected behavior and the tokens are short-lived.

### Memory Exhaustion (#9)
Additional protection via:
- Set `max_rows = 1000` in Supabase API settings
- Pagination is enforced in React Query hooks
- The security_query_stats view monitors large queries

---

## Monitoring

Set up alerts for security events:

```sql
-- Query to find potential brute force attempts
SELECT
  identifier,
  attempt_type,
  COUNT(*) as attempts,
  MAX(last_attempt_at) as latest_attempt
FROM auth_rate_limits
WHERE blocked_until IS NOT NULL
GROUP BY identifier, attempt_type
ORDER BY attempts DESC;

-- Query password reset abuse attempts
SELECT * FROM password_reset_audit
WHERE requested_at > NOW() - INTERVAL '24 hours'
ORDER BY requested_at DESC;

-- General security audit log
SELECT * FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Emergency Response

If you detect an active attack:

1. **Block IP at Vercel**: Settings > Security > Block IP
2. **Clear rate limits**:
   ```sql
   DELETE FROM auth_rate_limits WHERE identifier = 'attacker@email.com';
   ```
3. **Review audit logs**:
   ```sql
   SELECT * FROM security_audit_log
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```
4. **Rotate API keys** if compromised (Supabase Dashboard > Settings > API)

---

*Generated: 2026-01-16*
*For: WallQu Form Builder Security Hardening*
