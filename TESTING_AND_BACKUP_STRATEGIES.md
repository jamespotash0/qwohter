# Testing & Backup Strategies Guide

Complete guide for testing account creation, emails, Stripe workflows, and enterprise-grade backup strategies.

## Table of Contents

- [Testing Environment Strategy](#testing-environment-strategy)
- [Database Testing Strategies](#database-testing-strategies)
- [Email Testing](#email-testing)
- [Stripe Payment Testing](#stripe-payment-testing)
- [Database Backup Strategies](#database-backup-strategies)
- [Data Protection & Recovery](#data-protection--recovery)
- [Implementation Checklist](#implementation-checklist)

---

## Testing Environment Strategy

### Multi-Environment Setup (Industry Standard)

Most companies use **3+ environments**:

```
┌─────────────┬──────────────────┬─────────────────────────┬──────────────┐
│ Environment │ Purpose          │ Database Strategy       │ Data Policy  │
├─────────────┼──────────────────┼─────────────────────────┼──────────────┤
│ Development │ Local coding     │ Local DB or shared dev  │ Reset freely │
│ Staging     │ Pre-production   │ Clone of production     │ Anonymized   │
│ Production  │ Live users       │ Production database     │ Protected    │
│ Testing/CI  │ Automated tests  │ Ephemeral test DB       │ Disposable   │
└─────────────┴──────────────────┴─────────────────────────┴──────────────┘
```

### Environment Variables

```bash
# .env.production
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
VITE_APP_ENV=production

# .env.staging
VITE_SUPABASE_URL=https://yyyyy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJyyy
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_APP_ENV=staging

# .env.development
VITE_SUPABASE_URL=https://zzzzz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJzzz
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_APP_ENV=development
```

---

## Database Testing Strategies

### Option A: Separate Databases (Recommended)

**Structure:**
```
Production:  wall-quote-wizard-prod.supabase.co
Staging:     wall-quote-wizard-staging.supabase.co
Development: wall-quote-wizard-dev.supabase.co
Testing:     wall-quote-wizard-test.supabase.co (ephemeral)
```

**Benefits:**
- ✅ Complete isolation - no risk to production data
- ✅ Can test destructive operations safely
- ✅ Reset/seed data without affecting users
- ✅ Each environment has independent backups

**Setup Process:**

1. **Create Separate Supabase Projects:**
   ```bash
   # In Supabase Dashboard:
   # 1. Create new project for staging
   # 2. Export schema from production
   # 3. Import schema to staging
   # 4. Anonymize/seed test data
   ```

2. **Schema Synchronization Script:**
   ```bash
   # scripts/sync-staging-schema.sh

   # Export production schema (structure only, no data)
   supabase db dump --schema-only > schema.sql

   # Apply to staging
   psql $STAGING_DB_URL < schema.sql

   # Seed with test data
   psql $STAGING_DB_URL < test-data.sql
   ```

### Option B: Schema Isolation (Same DB, Different Schemas)

```sql
-- Production schema
CREATE SCHEMA production;

-- Staging schema (clone of production)
CREATE SCHEMA staging;

-- Development schema
CREATE SCHEMA development;

-- Set search path based on environment
SET search_path TO production; -- or staging, development
```

**Less common with Supabase, but possible with raw PostgreSQL.**

### Option C: Database Cloning/Snapshots

**Process:**
```bash
# 1. Take snapshot of production
supabase db dump --db-url $PROD_URL > prod-snapshot.sql

# 2. Anonymize sensitive data
# Replace real emails with test emails
sed 's/@company\.com/@test.local/g' prod-snapshot.sql > staging-data.sql

# Anonymize phone numbers
sed -E 's/[0-9]{3}-[0-9]{3}-[0-9]{4}/555-0100/g' staging-data.sql > staging-data-clean.sql

# 3. Load to staging
supabase db reset --db-url $STAGING_URL
psql $STAGING_URL < staging-data-clean.sql
```

### Data Anonymization Script Example

```sql
-- scripts/anonymize-data.sql
-- Run this on staging database after cloning from production

-- Anonymize user emails
UPDATE auth.users
SET email = 'user_' || id || '@staging.test',
    phone = NULL;

-- Anonymize organization data
UPDATE organizations
SET
  phone_number = '555-' || LPAD(CAST(id AS TEXT), 7, '0'),
  fax_number = NULL,
  company_address = 'Test Address ' || id,
  website = 'https://test-' || id || '.staging.test';

-- Clear sensitive payment data
UPDATE subscriptions
SET stripe_customer_id = 'cus_test_' || id;

-- Anonymize quote contact information
UPDATE quotes
SET quote_details = jsonb_set(
  quote_details,
  '{contactEmail}',
  to_jsonb('contact_' || id || '@staging.test')
);
```

---

## Email Testing

### Development/Staging: Email Capture Tools

#### Option A: Mailtrap (Most Popular)

**Setup:**
```typescript
// .env.staging
EMAIL_HOST=sandbox.smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_USER=your-mailtrap-user
EMAIL_PASS=your-mailtrap-pass
```

**Benefits:**
- ✅ Captures all emails without sending
- ✅ Test email rendering
- ✅ Check spam scores
- ✅ Test email links/content
- ✅ Free tier available

**Sign up:** https://mailtrap.io

#### Option B: MailHog (Self-Hosted)

```bash
# Run locally with Docker
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Access UI at http://localhost:8025
# SMTP server at localhost:1025
```

#### Option C: Email Routing by Environment

```typescript
// src/services/emailService.ts
const getEmailRecipient = (userEmail: string) => {
  const env = import.meta.env.VITE_APP_ENV;

  if (env === 'production') {
    return userEmail; // Send to real email
  }

  // Staging/Dev: Route all emails to test inbox
  return `test+${userEmail.replace('@', '-at-')}@yourdomain.com`;
  // Example: john@example.com → test+john-at-example.com@yourdomain.com
};

export const sendEmail = async (to: string, subject: string, body: string) => {
  const recipient = getEmailRecipient(to);

  // Send email to recipient
  await emailProvider.send({
    to: recipient,
    subject: `[${import.meta.env.VITE_APP_ENV.toUpperCase()}] ${subject}`,
    body
  });
};
```

#### Supabase Auth Email Configuration

```typescript
// Staging Supabase Project Settings:
// Authentication → Email Templates

// For development, disable email confirmations:
// Supabase Dashboard → Auth → Settings
// ☐ Enable email confirmations (disable for dev/staging)

// Or use custom SMTP:
// Settings → Project Settings → Auth
// Enable Custom SMTP
// Host: sandbox.smtp.mailtrap.io
// Port: 2525
```

---

## Stripe Payment Testing

### 1. Stripe Test Mode (Essential)

Stripe has **separate test and live modes**:

```bash
# .env.production
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx  # Server-side only

# .env.staging / .env.development
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx  # Server-side only
```

### 2. Test Card Numbers

```javascript
// Success
4242 4242 4242 4242  // Visa (any CVC, any future date)
5555 5555 5555 4444  // Mastercard
3782 822463 10005    // American Express

// Decline Scenarios
4000 0000 0000 0002  // Generic decline
4000 0000 0000 9995  // Insufficient funds
4000 0000 0000 9987  // Lost card
4000 0000 0000 9979  // Stolen card

// 3D Secure Authentication
4000 0027 6000 3184  // Requires authentication
4000 0025 0000 3155  // Requires authentication (decline)

// International
4000 0056 0000 0004  // Brazil (requires zip code)
4000 0003 6000 0006  // Canada

// More: https://stripe.com/docs/testing
```

### 3. Webhook Testing

#### Local Development: Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5173/api/stripe/webhook

# You'll receive a webhook signing secret (whsec_...)
# Add to .env.development:
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Test specific events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

#### Staging: Configure Test Webhooks

```bash
# Stripe Dashboard → Developers → Webhooks → Add endpoint
# Endpoint URL: https://staging.yourdomain.com/api/stripe/webhook
# Mode: Test mode
# Events to send:
#   - customer.subscription.created
#   - customer.subscription.updated
#   - customer.subscription.deleted
#   - invoice.payment_succeeded
#   - invoice.payment_failed
#   - customer.created
#   - customer.updated

# Copy webhook signing secret to staging environment
STRIPE_WEBHOOK_SECRET=whsec_staging_xxxxx
```

### 4. Testing Subscription Workflows

```typescript
// Test complete subscription lifecycle

// 1. Create test customer
const customer = await stripe.customers.create({
  email: 'test@staging.test',
  name: 'Test User',
  metadata: {
    environment: 'staging',
    test_scenario: 'subscription_lifecycle'
  }
});

// 2. Create test subscription
const subscription = await stripe.subscriptions.create({
  customer: customer.id,
  items: [{ price: 'price_test_xxxxx' }],
  trial_period_days: 7 // Test trial period
});

// 3. Simulate webhook events (using Stripe CLI)
// stripe trigger customer.subscription.updated

// 4. Test upgrade/downgrade
await stripe.subscriptions.update(subscription.id, {
  items: [{
    id: subscription.items.data[0].id,
    price: 'price_test_higher_tier'
  }]
});

// 5. Test cancellation
await stripe.subscriptions.cancel(subscription.id);

// 6. Test reactivation
const reactivated = await stripe.subscriptions.update(canceled_sub_id, {
  cancel_at_period_end: false
});
```

---

## Database Backup Strategies

### How Companies Prevent Data Loss

#### 1. Automated Backups (Multi-Layered)

**Production Backup Strategy:**

```
┌─────────────────────────────────────────────────────────┐
│ Backup Layer 1: Continuous Point-in-Time Recovery      │
│  - Every transaction logged                             │
│  - Can restore to any second in the past 7-30 days     │
│  - Supabase: Automatic PITR (Pro plan)                 │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Backup Layer 2: Daily Full Backups                     │
│  - Complete database snapshot                          │
│  - Stored for 30-90 days                               │
│  - Automated via cron job or Supabase built-in        │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Backup Layer 3: Weekly/Monthly Long-Term Archives      │
│  - Compressed backups                                   │
│  - Stored for 1-7 years                                │
│  - Offsite storage (AWS S3, Google Cloud Storage)     │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│ Backup Layer 4: Geo-Redundant Replication              │
│  - Real-time replication to different region           │
│  - Disaster recovery                                    │
│  - Production: Primary + 2 replicas in different zones │
└─────────────────────────────────────────────────────────┘
```

#### 2. Supabase Backup Features

**Built-in Backups (Automatic):**

```bash
# Supabase automatically provides:
# - Daily backups (retained 7 days on Free tier)
# - Point-in-Time Recovery (Pro plan: 7 days, Team: 14 days, Enterprise: 30+ days)
# - One-click restore from dashboard

# Access backups:
# Supabase Dashboard → Database → Backups
# - View backup history
# - Download backups
# - Restore to specific point
```

**Manual Backup Script:**

```bash
#!/bin/bash
# scripts/backup-database.sh

# Configuration
PROJECT_NAME="wall-quote-wizard"
BACKUP_DIR="./backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Database credentials from environment
DB_URL=$VITE_SUPABASE_URL
# Or use connection string:
# DB_CONNECTION="postgresql://postgres:password@host:5432/database"

# Full backup (schema + data)
echo "📦 Creating full backup..."
pg_dump $DB_CONNECTION > "$BACKUP_DIR/${PROJECT_NAME}_full_${DATE}.sql"

# Compress backup
echo "🗜️  Compressing backup..."
gzip "$BACKUP_DIR/${PROJECT_NAME}_full_${DATE}.sql"

# Schema-only backup (for version control)
echo "📋 Creating schema backup..."
pg_dump --schema-only $DB_CONNECTION > "$BACKUP_DIR/${PROJECT_NAME}_schema_${DATE}.sql"

# Upload to cloud storage (optional)
echo "☁️  Uploading to cloud..."
# AWS S3
aws s3 cp "$BACKUP_DIR/${PROJECT_NAME}_full_${DATE}.sql.gz" \
  "s3://your-backups-bucket/${PROJECT_NAME}/"

# Google Cloud Storage
# gsutil cp "$BACKUP_DIR/${PROJECT_NAME}_full_${DATE}.sql.gz" \
#   "gs://your-backups-bucket/${PROJECT_NAME}/"

# Clean up old backups (keep last 30 days)
echo "🧹 Cleaning up old backups..."
find $BACKUP_DIR -name "${PROJECT_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup complete: ${PROJECT_NAME}_full_${DATE}.sql.gz"
```

**Automated Backup Cron Job:**

```bash
# Run daily at 2 AM
# Add to crontab: crontab -e
0 2 * * * /path/to/wall-quote-wizard/scripts/backup-database.sh >> /var/log/db-backup.log 2>&1

# Or use GitHub Actions:
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install PostgreSQL client
        run: sudo apt-get install postgresql-client

      - name: Create backup
        env:
          DB_CONNECTION: ${{ secrets.PROD_DB_CONNECTION }}
        run: |
          DATE=$(date +%Y-%m-%d)
          pg_dump $DB_CONNECTION | gzip > backup_${DATE}.sql.gz

      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp backup_${DATE}.sql.gz s3://your-backups/
```

#### 3. Real-Time Replication (Enterprise)

**PostgreSQL Streaming Replication:**

```
┌─────────────────┐     Real-time      ┌─────────────────┐
│  Primary DB     │ ─────replication──→ │  Replica 1      │
│  (us-east-1)    │                     │  (us-west-2)    │
│                 │                     │  (read-only)    │
└─────────────────┘                     └─────────────────┘
         │
         │                              ┌─────────────────┐
         └────────replication──────────→│  Replica 2      │
                                        │  (eu-west-1)    │
                                        │  (read-only)    │
                                        └─────────────────┘
```

**Benefits:**
- ✅ Instant failover if primary fails
- ✅ Distribute read load across replicas
- ✅ Geographic redundancy

**Supabase:** Provides read replicas on Team/Enterprise plans

#### 4. Soft Deletes (Prevent Accidental Data Loss)

Instead of hard deleting data, use **soft deletes**:

```sql
-- Add to all tables
ALTER TABLE quotes
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id);

-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_quote(quote_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE quotes
  SET
    deleted_at = NOW(),
    deleted_by = auth.uid()
  WHERE id = quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modified queries (exclude soft-deleted)
-- Instead of: SELECT * FROM quotes
SELECT * FROM quotes WHERE deleted_at IS NULL;

-- Create view for active records
CREATE VIEW active_quotes AS
SELECT * FROM quotes WHERE deleted_at IS NULL;

-- Recovery: Restore soft-deleted record
UPDATE quotes
SET deleted_at = NULL, deleted_by = NULL
WHERE id = 'quote-to-restore';
```

#### 5. Audit Logging (Track All Changes)

**Track who changed what and when:**

```sql
-- Create audit log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to important tables
CREATE TRIGGER quotes_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON quotes
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER organizations_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON organizations
FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

**Query audit history:**

```sql
-- See all changes to a specific quote
SELECT
  action,
  old_data,
  new_data,
  changed_at,
  u.email as changed_by_email
FROM audit_log al
LEFT JOIN auth.users u ON u.id = al.changed_by
WHERE table_name = 'quotes' AND record_id = 'quote-id'
ORDER BY changed_at DESC;
```

#### 6. Disaster Recovery Plan

**Complete Recovery Process:**

```
┌─────────────────────────────────────────────────────────┐
│ Scenario 1: Accidental Data Deletion (last 5 minutes)  │
├─────────────────────────────────────────────────────────┤
│ Recovery: Check soft_deletes or audit_log              │
│ Time: < 5 minutes                                       │
│ Data Loss: None (if soft delete enabled)               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Scenario 2: Database Corruption (last 24 hours)        │
├─────────────────────────────────────────────────────────┤
│ Recovery: Point-in-Time Recovery to before corruption  │
│ Time: 15-30 minutes                                     │
│ Data Loss: Minimal (only data after corruption point)  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Scenario 3: Complete Database Loss                     │
├─────────────────────────────────────────────────────────┤
│ Recovery: Restore from daily backup + transaction logs │
│ Time: 1-2 hours                                         │
│ Data Loss: Up to 24 hours (last backup)                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Scenario 4: Regional Outage (AWS us-east-1 down)       │
├─────────────────────────────────────────────────────────┤
│ Recovery: Failover to geo-replicated instance          │
│ Time: < 5 minutes (automatic failover)                 │
│ Data Loss: None (real-time replication)                │
└─────────────────────────────────────────────────────────┘
```

**Recovery Testing Schedule:**

```bash
# Monthly: Test backup restoration
# - Restore latest backup to staging
# - Verify data integrity
# - Document time to restore

# Quarterly: Test disaster recovery
# - Simulate database failure
# - Execute complete recovery procedure
# - Update runbook with lessons learned

# Annually: Test geo-failover
# - Simulate regional outage
# - Failover to backup region
# - Verify application functionality
```

---

## Data Protection & Recovery

### 1. Data Retention Policies

```typescript
// config/dataRetention.ts
export const DATA_RETENTION_POLICIES = {
  // User data
  deleted_users: {
    retention_days: 30, // Keep 30 days before permanent deletion
    anonymize_after: 7   // Anonymize after 7 days
  },

  // Quote data
  archived_quotes: {
    retention_days: 365 * 7, // Keep 7 years for tax purposes
    compression: true         // Compress old data
  },

  // Audit logs
  audit_logs: {
    retention_days: 365 * 3, // Keep 3 years for compliance
    archive_to_cold_storage: 365 // Move to cheap storage after 1 year
  },

  // Backups
  daily_backups: {
    retention_days: 30
  },
  weekly_backups: {
    retention_days: 90
  },
  monthly_backups: {
    retention_days: 365 * 2 // 2 years
  }
};
```

**Automated Cleanup Script:**

```sql
-- Clean up old soft-deleted records
CREATE OR REPLACE FUNCTION cleanup_old_soft_deletes()
RETURNS void AS $$
BEGIN
  -- Permanently delete quotes deleted more than 30 days ago
  DELETE FROM quotes
  WHERE deleted_at < NOW() - INTERVAL '30 days';

  -- Archive old audit logs (move to separate table)
  INSERT INTO audit_log_archive
  SELECT * FROM audit_log
  WHERE changed_at < NOW() - INTERVAL '1 year';

  DELETE FROM audit_log
  WHERE changed_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Schedule with pg_cron extension
SELECT cron.schedule('cleanup-soft-deletes', '0 3 * * 0', 'SELECT cleanup_old_soft_deletes()');
```

### 2. Compliance & Legal Requirements

**GDPR/CCPA Considerations:**

```typescript
// User data deletion (Right to be Forgotten)
export const permanentlyDeleteUser = async (userId: string) => {
  // 1. Export user data (for records)
  const userData = await exportUserData(userId);
  await saveToComplianceArchive(userData);

  // 2. Anonymize associated records
  await supabase
    .from('quotes')
    .update({
      quote_details: {
        contactName: 'Deleted User',
        contactEmail: `deleted_${userId}@privacy.local`,
        contactPhone: null
      }
    })
    .eq('created_by', userId);

  // 3. Delete user account
  await supabase.auth.admin.deleteUser(userId);

  // 4. Log deletion for compliance
  await logComplianceAction('USER_DELETED', userId);
};
```

### 3. Monitoring & Alerts

**Set up alerts for critical events:**

```typescript
// Sentry/monitoring integration
export const setupDatabaseAlerts = () => {
  // Alert on backup failures
  monitorBackupStatus();

  // Alert on unusual delete operations
  if (deletedRecordsCount > 100) {
    sendAlert('High volume of deletions detected!');
  }

  // Alert on low disk space
  if (diskUsagePercent > 85) {
    sendAlert('Database disk usage critical!');
  }

  // Alert on replication lag
  if (replicationLagSeconds > 60) {
    sendAlert('Database replication falling behind!');
  }
};
```

---

## Implementation Checklist

### Phase 1: Basic Testing Setup (Week 1)

- [ ] **Create Staging Environment**
  - [ ] New Supabase project for staging
  - [ ] Copy schema from production
  - [ ] Set up environment variables in Vercel
  - [ ] Test deployment to staging

- [ ] **Email Testing**
  - [ ] Sign up for Mailtrap (free tier)
  - [ ] Configure Supabase SMTP for staging
  - [ ] Test account creation emails
  - [ ] Test password reset flow

- [ ] **Stripe Test Mode**
  - [ ] Get test API keys
  - [ ] Configure staging with test keys
  - [ ] Test subscription creation with test card
  - [ ] Set up webhook endpoint for staging

### Phase 2: Backup Strategy (Week 2)

- [ ] **Automated Backups**
  - [ ] Verify Supabase auto-backups are enabled
  - [ ] Upgrade to Pro plan for PITR (if needed)
  - [ ] Create manual backup script
  - [ ] Schedule daily backups via GitHub Actions

- [ ] **Backup Storage**
  - [ ] Set up S3 bucket for backups (or GCS)
  - [ ] Configure backup retention policy
  - [ ] Test backup restoration process
  - [ ] Document recovery procedures

### Phase 3: Data Protection (Week 3)

- [ ] **Soft Deletes**
  - [ ] Add deleted_at column to critical tables
  - [ ] Update delete queries to use soft delete
  - [ ] Create recovery procedures
  - [ ] Test soft delete and recovery

- [ ] **Audit Logging**
  - [ ] Create audit_log table
  - [ ] Add audit triggers to important tables
  - [ ] Test audit log queries
  - [ ] Set up audit log retention policy

### Phase 4: Disaster Recovery (Week 4)

- [ ] **Recovery Testing**
  - [ ] Test point-in-time recovery
  - [ ] Test full backup restoration
  - [ ] Measure recovery time
  - [ ] Document recovery steps

- [ ] **Monitoring & Alerts**
  - [ ] Set up Sentry for error tracking
  - [ ] Configure database health checks
  - [ ] Set up backup failure alerts
  - [ ] Create runbook for common issues

### Phase 5: Compliance (Ongoing)

- [ ] **Data Retention**
  - [ ] Define retention policies
  - [ ] Implement automated cleanup
  - [ ] Document data lifecycle
  - [ ] Test GDPR deletion flow

- [ ] **Security Audit**
  - [ ] Review RLS policies
  - [ ] Audit user permissions
  - [ ] Test data isolation
  - [ ] Penetration testing (optional)

---

## Quick Reference Commands

### Database Operations

```bash
# Export production schema
pg_dump --schema-only $PROD_DB > schema.sql

# Export with data
pg_dump $PROD_DB > full-backup.sql

# Restore to staging
psql $STAGING_DB < full-backup.sql

# Point-in-time recovery (Supabase Dashboard)
# Database → Backups → Restore to specific time
```

### Stripe Testing

```bash
# Listen to webhooks locally
stripe listen --forward-to localhost:5173/api/stripe/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created

# View webhook logs
stripe webhooks tail
```

### Email Testing

```bash
# View Mailtrap emails
# https://mailtrap.io/inboxes

# Test with curl
curl -X POST https://api.mailtrap.io/api/send \
  -H "Api-Token: your-token" \
  -d "to=test@example.com" \
  -d "subject=Test" \
  -d "text=Test email"
```

---

## Resources

### Tools & Services

- **Mailtrap:** https://mailtrap.io (Email testing)
- **Stripe Test Mode:** https://stripe.com/docs/testing
- **Supabase Backups:** https://supabase.com/docs/guides/platform/backups
- **pg_dump Documentation:** https://www.postgresql.org/docs/current/app-pgdump.html

### Best Practices

- **The Twelve-Factor App:** https://12factor.net/
- **Database Backup Best Practices:** https://wiki.postgresql.org/wiki/Backup
- **GDPR Compliance Guide:** https://gdpr.eu/
- **Stripe Best Practices:** https://stripe.com/docs/security/guide

---

**Last Updated:** 2025-01-20
**Version:** 1.0
**Maintained By:** Development Team
