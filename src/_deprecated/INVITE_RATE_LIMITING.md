# Invite Token Rate Limiting & Email Verification

## Overview

This document describes the security improvements implemented for the invite token system:

1. **Email Verification Security**: Ensures users can only accept invites sent to their verified email
2. **Rate Limiting**: Prevents brute force attacks on invite tokens

## What Was Implemented

### 1. Email Verification (handleInviteJoin.ts)

**Security Issue Fixed**:
Previously, anyone with an invite token could join an organization, even if the token was sent to a different email address. This allowed attackers who intercepted tokens to join organizations.

**Solution**:
- Retrieve the invited email from the invite token
- Get the current user's verified email (already verified via Supabase OTP)
- Compare them (case-insensitive)
- Reject the join attempt if emails don't match

**Code Location**: [src/pages/Auth/actions/handleInviteJoin.ts](src/pages/Auth/actions/handleInviteJoin.ts:70-136)

**Example Error Message**:
```
Email Mismatch
This invitation was sent to john@example.com.
Please sign up with that email address.
```

### 2. Rate Limiting System

**Protection Against**:
- Brute force token scanning
- Repeated failed join attempts
- Token enumeration attacks

**How It Works**:

#### Database Layer
- **Table**: `invite_token_attempts` - Tracks all invite validation attempts
- **Functions**:
  - `check_invite_rate_limit()` - Checks if attempt is allowed
  - `log_invite_attempt()` - Logs success/failure of attempts
  - `cleanup_old_invite_attempts()` - Maintenance function

#### Frontend Layer
- **Utility**: [src/utils/rateLimiting.ts](src/utils/rateLimiting.ts)
- **Integration**: [src/pages/Auth/actions/handleInviteJoin.ts](src/pages/Auth/actions/handleInviteJoin.ts)

#### Rate Limit Rules

| Limit Type | Threshold | Window | Purpose |
|------------|-----------|--------|---------|
| IP-based | 5 attempts | 5 minutes | Prevent brute force from single IP |
| User-based | 5 attempts | 5 minutes | Prevent per-user abuse |
| Token-based | 2 attempts | 5 minutes | Prevent token scanning |

**Why Different Limits?**
- **IP & User limits (5)**: Allow legitimate retry attempts (typos, browser issues)
- **Token limit (2)**: Lower threshold prevents attackers from trying many tokens

#### User Experience

**Blocked Attempt**:
```
Too Many Attempts
Too many failed attempts from this IP address.
Please try again in 3 minutes.
```

**Successful Join**:
- Attempt logged with `success: true`
- No rate limit impact on successful joins
- Only failed attempts count toward limits

## Files Created/Modified

### New Files
1. **supabase/migrations/20251123000001_create_invite_rate_limiting.sql**
   - Creates `invite_token_attempts` table
   - Creates rate limiting functions
   - Sets up RLS policies
   - Adds indexes for performance

2. **src/utils/rateLimiting.ts**
   - `checkInviteRateLimit()` - Check if attempt allowed
   - `logInviteAttempt()` - Log attempt
   - `getUserIpAddress()` - Get user's IP (best effort)
   - `formatRateLimitReset()` - Format time remaining

3. **INVITE_RATE_LIMITING.md** (this file)
   - Complete documentation

### Modified Files
1. **src/pages/Auth/actions/handleInviteJoin.ts**
   - Added email verification (lines 70-136)
   - Added rate limiting checks (lines 48-67)
   - Added attempt logging throughout

2. **src/integrations/supabase/types.ts**
   - Added `invite_token_attempts` table types
   - Added `check_invite_rate_limit` function type
   - Added `log_invite_attempt` function type

## Deployment Steps

### 1. Run the Migration

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20251123000001_create_invite_rate_limiting.sql
```

Or via Supabase CLI:
```bash
supabase db push
```

### 2. Verify Migration

Check that these exist in your database:
```sql
-- Table exists
SELECT * FROM invite_token_attempts LIMIT 1;

-- Functions exist
SELECT check_invite_rate_limit('0.0.0.0'::INET);
```

### 3. Deploy Frontend

```bash
npm run build
# Deploy to Vercel/your hosting
```

### 4. Test Rate Limiting

**Test Invalid Token (should rate limit after 5 attempts)**:
```bash
# Try invalid token 6 times
# First 5 should show "Invalid Invite"
# 6th should show "Too Many Attempts"
```

**Test Email Mismatch (should rate limit after 5 attempts)**:
```bash
# Sign up with wrong@email.com
# Try to join invite sent to right@email.com
# Should see "Email Mismatch"
# Counts toward rate limit
```

## Security Benefits

### Defense in Depth
1. **Token Security**: 256-bit cryptographically secure tokens
2. **Expiration**: Tokens expire after 2 hours
3. **Single-Use**: Tokens can only be used once
4. **Email Verification**: Must match invited email
5. **Rate Limiting**: Prevents brute force attacks

### Attack Scenarios Prevented

#### Scenario 1: Token Interception
**Attack**: Attacker intercepts invite email, tries to use token
**Defense**: Email verification - attacker would need to sign up with victim's email (which requires OTP access)

#### Scenario 2: Token Scanning
**Attack**: Attacker tries to guess/enumerate tokens
**Defense**:
- Rate limiting blocks after 2 failed attempts per token
- 256-bit entropy makes guessing impractical
- IP-based limiting prevents distributed scanning

#### Scenario 3: Shared Computer
**Attack**: User A gets invite, User B on same computer tries to use it
**Defense**: Email verification - User B must sign up with User A's email

## Monitoring & Maintenance

### View Rate Limit Attempts

```sql
-- Recent failed attempts
SELECT
  ip_address,
  user_id,
  invite_token,
  error_message,
  attempted_at
FROM invite_token_attempts
WHERE success = false
  AND attempted_at > NOW() - INTERVAL '1 hour'
ORDER BY attempted_at DESC;

-- Top blocked IPs
SELECT
  ip_address,
  COUNT(*) as failed_attempts,
  MAX(attempted_at) as last_attempt
FROM invite_token_attempts
WHERE success = false
  AND attempted_at > NOW() - INTERVAL '24 hours'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY failed_attempts DESC;
```

### Cleanup Old Attempts

```sql
-- Manually cleanup attempts older than 30 days
SELECT cleanup_old_invite_attempts(30);

-- Or set up a cron job (Supabase pg_cron)
SELECT cron.schedule(
  'cleanup-invite-attempts',
  '0 2 * * *',  -- 2 AM daily
  $$ SELECT cleanup_old_invite_attempts(30); $$
);
```

## Configuration

### Adjust Rate Limits

To change the default limits, modify the function call in [handleInviteJoin.ts](src/pages/Auth/actions/handleInviteJoin.ts:49-53):

```typescript
const rateLimitCheck = await checkInviteRateLimit({
  ipAddress: userIp,
  userId: userId,
  inviteToken: inviteToken,
  windowMinutes: 5,    // Change window duration
  maxAttempts: 5,      // Change max attempts
});
```

### IP Detection

Current implementation uses a public API (ipify.org). For production, consider:

1. **Cloudflare**: Access real IP from CF-Connecting-IP header
2. **Vercel**: Access IP from X-Forwarded-For header
3. **Supabase Edge Function**: Implement IP detection server-side

Example with Cloudflare:
```typescript
// In an edge function
const ip = request.headers.get('CF-Connecting-IP') ||
           request.headers.get('X-Forwarded-For') ||
           '0.0.0.0';
```

## Performance Considerations

### Database Indexes

The migration creates these indexes for fast lookups:
- `idx_invite_attempts_ip_time` - IP + time (most common query)
- `idx_invite_attempts_user_time` - User + time
- `idx_invite_attempts_token_time` - Token + time

### Query Performance

Rate limit check queries are optimized:
```sql
-- Only scans recent attempts (5 minute window)
-- Uses index on (ip_address, attempted_at)
WHERE ip_address = '...'
  AND attempted_at >= NOW() - INTERVAL '5 minutes'
  AND success = FALSE
```

Expected query time: < 10ms for typical datasets

## Troubleshooting

### Issue: "Too Many Attempts" for Legitimate User

**Cause**: Shared IP (office, VPN, etc.)

**Solutions**:
1. Wait for rate limit window to reset (5 minutes)
2. Adjust `maxAttempts` in code
3. Consider user-based limits only (remove IP-based)

### Issue: Rate Limit Not Working

**Checklist**:
1. ✅ Migration ran successfully
2. ✅ Functions exist: `SELECT * FROM pg_proc WHERE proname = 'check_invite_rate_limit'`
3. ✅ RLS policies active: `SELECT * FROM pg_policies WHERE tablename = 'invite_token_attempts'`
4. ✅ Permissions granted: `SELECT * FROM information_schema.routine_privileges WHERE routine_name = 'check_invite_rate_limit'`

### Issue: IP Address Shows as "0.0.0.0"

**Cause**: IP detection failed (API timeout, network issue)

**Impact**: Falls back to 0.0.0.0, rate limiting still works but all users share same IP limit

**Fix**: Implement server-side IP detection via edge function

## Future Enhancements

### Recommended Additions

1. **Admin Dashboard**: View and manage rate limit attempts
2. **IP Whitelist**: Allow certain IPs to bypass rate limits
3. **Temporary Blocks**: Auto-block IPs after X failures for Y minutes
4. **Email Notifications**: Alert admins of suspicious activity
5. **CAPTCHA Integration**: Add CAPTCHA after 2 failed attempts

### Example: Add CAPTCHA

```typescript
// After 2 failed attempts, require CAPTCHA
if (rateLimitCheck.attempts_used >= 2) {
  // Show CAPTCHA challenge
  const captchaValid = await verifyCaptcha(captchaToken);
  if (!captchaValid) {
    return; // Block attempt
  }
}
```

## Support

For questions or issues:
1. Check migration logs in Supabase SQL Editor
2. Review browser console for frontend errors
3. Check database logs for backend errors
4. Verify RLS policies aren't blocking legitimate requests

---

**Security Note**: This rate limiting is one layer of defense. Always keep Supabase security rules updated and monitor for suspicious activity.
