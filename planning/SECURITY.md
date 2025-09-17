# Security Documentation

## Overview

This document outlines the security measures implemented in the Wall Quote Wizard application to ensure safe distribution and prevent unauthorized access.

## 🔐 Security Architecture

### Authentication & Authorization
- **Supabase Auth**: Secure authentication with session management
- **Row Level Security (RLS)**: Database-level access controls
- **Organization-based Multi-tenancy**: Users can only access their organization's data
- **Role-based Access Control**: Owner > Admin > Member hierarchy

### Database Security

#### Row Level Security Policies
- **Quotes Table**: Users can only view/edit quotes in their organization
- **Profiles Table**: Users can only view profiles in their organization  
- **Organizations Table**: Proper isolation between organizations
#### Security Functions
- `get_organization_code_for_user()` - Admin-only organization code access
- `user_can_access_quote()` - Validates quote access permissions
- `user_has_admin_access()` - Validates admin privileges
- `validate_quote_data()` - Server-side input validation

### Input Validation & Sanitization

#### Client-side Validation
- XSS prevention with input sanitization
- Email format validation
- UUID format validation  
- Content safety checks for malicious patterns

#### Server-side Validation
- Database constraints and triggers
- RPC function validation
- Type checking and data sanitization

### Rate Limiting
- Authentication operations: 5 requests per 5 minutes
- Quote operations: 10 requests per minute
- Admin operations: Rate limited per user

## 🛡️ Security Checklist Compliance

### ✅ Protected Admin API Endpoints
- Admin functions use Supabase RPC with SECURITY DEFINER
- Server-side privilege validation
- No admin logic exposed in client code

### ✅ No Admin Logic in Client Side
- Removed client-side admin checks from Team.tsx
- All admin validation handled by database RLS policies
- UI role checks for display only, not security

### ✅ User Resource Isolation
- Organization-based data isolation
- RLS policies prevent cross-organization access
- Quote ownership validation on all operations

### ✅ No Frontend Secrets
- Environment variables properly configured
- Supabase credentials moved to .env files
- .env files added to .gitignore
- Production builds strip console.log statements

### ✅ Protected Properties Validation
- Server-side validation prevents role escalation
- Database constraints on critical fields
- Admin status cannot be modified by regular users

### ✅ Supabase RLS Configuration
```sql
-- Example RLS policy
CREATE POLICY "Users can view organization quotes" 
ON public.quotes 
FOR SELECT 
USING (
  organization_id = get_current_user_organization()
);
```

### ✅ Minimal Data Exposure
- No password hashes returned in API responses
- Profile data limited to organization context
- Sensitive fields excluded from client queries

### ✅ Non-incremental IDs
- All tables use UUID primary keys
- No sequential ID enumeration possible
- Prevents database dumping via ID iteration

## 🔧 Security Configuration

### Environment Variables
```bash
# Required environment variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Content Security Policy
```javascript
// Implemented in security.ts
'Content-Security-Policy': 
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline'; " +
  "connect-src 'self' https://*.supabase.co"
```

### Production Build Security
- Console.log statements stripped in production
- Source maps disabled for production
- Minification and code obfuscation enabled
- Chunk names randomized with hashes

## 🚨 Security Monitoring

### Audit Logging
- Admin actions logged with `log_admin_action()` function
- User authentication events tracked
- Failed access attempts monitored

### Rate Limiting
- Client-side rate limiting for user experience
- Server-side rate limiting via Supabase Edge Functions
- Automatic blocking of excessive requests

## 🔒 Deployment Security

### Required Headers
```javascript
// Security headers for production deployment
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

### SSL/TLS Requirements
- HTTPS enforced in production
- Supabase connections over TLS only
- HTTP Strict Transport Security enabled

## 🔍 Security Testing

### Regular Security Audits
1. **Input Validation Testing**
   - XSS payload injection tests
   - SQL injection attempt monitoring
   - File upload security validation

2. **Access Control Testing**
   - Cross-organization access attempts
   - Privilege escalation testing
   - Resource enumeration prevention

3. **Authentication Testing**
   - Session management validation
   - Token expiration handling
   - Brute force protection

## 📋 Security Maintenance

### Regular Tasks
- [ ] Update dependencies for security patches
- [ ] Review and rotate API keys quarterly  
- [ ] Audit user permissions monthly
- [ ] Monitor failed authentication attempts
- [ ] Review server logs for suspicious activity

### Incident Response
1. **Immediate Actions**
   - Revoke compromised credentials
   - Block suspicious IP addresses
   - Notify affected users if needed

2. **Investigation**
   - Analyze access logs
   - Identify scope of compromise
   - Document lessons learned

3. **Recovery**
   - Restore from secure backups if needed
   - Implement additional security measures
   - Update security procedures

## 📞 Security Contact

For security issues or questions:
- Create a secure GitHub issue
- Follow responsible disclosure practices
- Provide detailed reproduction steps

## 🔄 Security Updates

This document is updated with each security enhancement. Last updated: [Current Date]

**Security Version**: 1.0
**RLS Policies**: ✅ Implemented
**Input Validation**: ✅ Implemented  
**Rate Limiting**: ✅ Implemented
**Audit Logging**: ✅ Implemented