# Deployment Security Checklist

## 🚀 Pre-Deployment Security Checklist

### Environment Configuration
- [ ] All production environment variables are set in deployment platform
- [ ] No hardcoded credentials remain in source code
- [ ] `.env` files are not committed to version control
- [ ] Database connection uses SSL/TLS only

### Code Security
- [ ] Production build strips all console.log statements
- [ ] Source maps are disabled for production
- [ ] Admin logic is server-side only (no client-side checks)
- [ ] All user inputs are validated and sanitized

### Database Security
- [ ] Supabase RLS policies are enabled on all tables
- [ ] Security functions are deployed (`security-functions.sql`)
- [ ] Admin access requires proper role validation
- [ ] Cross-organization access is prevented

### Infrastructure Security
- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] Security headers are configured
- [ ] Content Security Policy is implemented
- [ ] Rate limiting is active

## 🔒 Supabase Configuration

### Required RLS Policies
```sql
-- Verify these policies exist:
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Security Functions Deployment
```sql
-- Run this file in Supabase SQL Editor:
-- database/security-functions.sql
```

### Environment Variables in Supabase
- [ ] JWT secret is secure and rotated
- [ ] API keys have appropriate permissions
- [ ] Database password is strong and unique

## 🌐 Web Server Configuration

### Security Headers
Configure these headers in your deployment platform:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Content Security Policy
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

## 🔍 Security Testing

### Pre-Production Tests
- [ ] Test cross-organization data access (should fail)
- [ ] Test admin function access without privileges (should fail)
- [ ] Test quote access from different organization (should fail)
- [ ] Verify rate limiting works
- [ ] Test input validation with XSS payloads

### Post-Deployment Verification
- [ ] HTTPS certificate is valid and trusted
- [ ] Security headers are present in response
- [ ] Console shows no errors or warnings
- [ ] Admin functions require proper authentication
- [ ] Organization isolation is working

## 📋 Platform-Specific Instructions

### Vercel Deployment
```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000" }
      ]
    }
  ]
}
```

### Netlify Deployment
```
# _headers file
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Strict-Transport-Security: max-age=31536000
```

### Environment Variables Setup
```bash
# In your deployment platform, set:
VITE_SUPABASE_URL=your_production_url
VITE_SUPABASE_ANON_KEY=your_production_anon_key
NODE_ENV=production
```

## 🚨 Security Incident Response

### If Security Issue Discovered
1. **Immediate Response**
   - Take application offline if necessary
   - Revoke compromised API keys
   - Document the incident

2. **Investigation**
   - Check Supabase logs for unauthorized access
   - Review user activity logs
   - Identify scope of potential data exposure

3. **Recovery**
   - Deploy security fixes
   - Rotate all credentials
   - Notify users if required by law/policy

## 🔄 Post-Deployment Monitoring

### Daily Checks
- [ ] Monitor error logs for security-related errors
- [ ] Check failed authentication attempts
- [ ] Review unusual API usage patterns

### Weekly Checks
- [ ] Audit user role assignments
- [ ] Review organization membership changes
- [ ] Check for new users requiring approval

### Monthly Checks
- [ ] Security dependency updates
- [ ] Access control policy review
- [ ] Security metrics analysis

## 📊 Security Metrics to Monitor

### Authentication Metrics
- Failed login attempts per day
- New user registrations
- Session duration patterns

### Access Control Metrics
- Cross-organization access attempts (should be 0)
- Admin function usage
- Quote access patterns

### Infrastructure Metrics
- SSL certificate expiration
- Security header compliance
- Rate limiting triggers

## ✅ Final Deployment Approval

Security review completed by: ________________
Date: ________________
Approved for production: [ ] Yes [ ] No

**Required Signatures:**
- Security Reviewer: ________________
- Technical Lead: ________________
- Product Owner: ________________

---

**Remember**: Security is an ongoing process, not a one-time setup. Regular monitoring and updates are essential for maintaining a secure application.