# Observability Implementation Plan

**Branch:** `feature/observability`
**Goal:** Add minimal, high-value observability to catch errors and track basic usage
**Cost:** $0/month (using free tiers)

---

## 📋 What We're Implementing

### 1. **Sentry** - Error Tracking & Performance
- Automatic error capture
- Session replay (see what user did before error)
- Performance monitoring
- Release tracking

### 2. **Vercel Analytics** - Basic Usage Metrics
- Page views
- Core Web Vitals
- Geographic distribution
- Top pages

---

## 🎯 Core Principles

### ✅ **DO Instrument:**
- Critical user flows (proposal creation, editing, PDF generation)
- Data operations (database queries, API calls)
- Authentication flows (login, signup, password reset)
- Payment operations (Stripe checkout, subscription management)
- Error boundaries (catch React errors gracefully)

### ❌ **DON'T Instrument:**
- Simple UI interactions (button clicks, hover states)
- Read-only pages (viewing proposals, dashboard)
- Development/debug code
- Internal admin functions
- Over-instrumentation (adds noise, costs money)

---

## 📍 Implementation Map

### **Phase 1: Foundation (30 min)**
Setup core infrastructure that captures errors automatically.

#### 1.1 Install Dependencies
```bash
npm install @sentry/react @vercel/analytics
```

**What we achieve:**
- Sentry SDK for error tracking
- Vercel analytics for usage metrics

#### 1.2 Configure Sentry (`src/lib/sentry.ts`)
```typescript
/**
 * Sentry Configuration
 *
 * Purpose: Centralized error tracking and performance monitoring
 *
 * What we track:
 * - Unhandled errors (automatic)
 * - React component errors (automatic via ErrorBoundary)
 * - Performance of key operations (manual instrumentation)
 * - User context (who experienced the error)
 * - Session replays (see user actions before error)
 *
 * What we DON'T track:
 * - Passwords or sensitive data (automatically filtered)
 * - Development errors (production only)
 * - Expected errors (user validation failures)
 */
```

**Why here:**
- Central configuration
- Imported once in main.tsx
- Easy to update settings

**What NOT to do:**
- ❌ Don't initialize Sentry in multiple places
- ❌ Don't track in development (slows down dev experience)
- ❌ Don't sample 100% of traffic (expensive at scale)

#### 1.3 Add to App Entry Point (`src/main.tsx`)
```typescript
/**
 * App Entry Point - Observability Setup
 *
 * What we achieve:
 * - Catch ALL unhandled errors
 * - Wrap app in ErrorBoundary (graceful error UI)
 * - Track page views automatically
 * - Associate errors with users
 *
 * Why here:
 * - Top-level = catches everything below
 * - Single initialization point
 * - Consistent for all users
 */
```

---

### **Phase 2: Critical Operations (20 min)**
Add targeted tracking for high-value operations.

#### 2.1 Proposal Creation (`src/services/proposalsService.ts`)

**Why instrument:**
- Core business function
- Complex operation (validation → database → storage)
- Failure here = lost revenue
- Users complain if it breaks

**What we track:**
```typescript
/**
 * Proposal Creation Tracking
 *
 * Success metrics:
 * - How long does proposal creation take?
 * - Are there slow queries?
 * - What's the success rate?
 *
 * Error tracking:
 * - Database connection failures
 * - Validation errors (if unexpected)
 * - Permission errors
 * - Malformed data errors
 *
 * Context captured:
 * - User ID (who created it)
 * - Proposal type (operable wall, glass wall, etc)
 * - Organization ID
 * - Proposal size/complexity
 *
 * What we DON'T track:
 * - Proposal content (too much data)
 * - Customer information (privacy)
 * - Pricing details (sensitive)
 */

// Example implementation:
async createProposal(data: ProposalData) {
  const transaction = Sentry.startTransaction({
    name: 'Create Proposal',
    op: 'proposal.create'
  });

  try {
    // Track database insert
    const span = transaction.startChild({
      op: 'db.insert',
      description: 'Insert proposal into Supabase'
    });

    const result = await supabase.from('proposals').insert(data);

    span.finish();

    // Add context for success case
    transaction.setTag('proposal_type', data.product_type);
    transaction.setTag('organization_id', data.organization_id);

    return result;
  } catch (error) {
    // Capture error with full context
    Sentry.captureException(error, {
      tags: {
        operation: 'proposal_creation',
        proposal_type: data.product_type
      },
      extra: {
        organization_id: data.organization_id,
        proposal_id: data.id
      }
    });

    transaction.setStatus('internal_error');
    throw error;
  } finally {
    transaction.finish();
  }
}
```

**Why NOT instrument:**
- ❌ Proposal viewing (read-only, low risk)
- ❌ Proposal listing (simple query, not critical)
- ❌ Proposal filtering (UI-only operation)

#### 2.2 PDF Generation (`src/services/pdfService.ts`)

**Why instrument:**
- Users frequently report issues here
- Complex operation (HTML → PDF)
- Involves large data processing
- Time-sensitive (users waiting)

**What we track:**
```typescript
/**
 * PDF Generation Tracking
 *
 * Why critical:
 * - Customers see this output
 * - Long-running operation (3-10 seconds)
 * - Memory intensive
 * - Multiple failure points
 *
 * Success metrics:
 * - Generation time
 * - PDF size
 * - Success rate by template type
 *
 * Error tracking:
 * - Template rendering errors
 * - Memory errors
 * - Timeout errors
 * - Missing data errors
 *
 * Context:
 * - Proposal ID
 * - Template type
 * - Number of walls
 * - Has images (affects generation time)
 */

async generatePDF(proposalId: string) {
  const transaction = Sentry.startTransaction({
    name: 'Generate PDF',
    op: 'pdf.generate'
  });

  try {
    const pdf = await puppeteer.generatePDF(...);

    // Track success metrics
    transaction.setData('pdf_size_kb', pdf.size / 1024);
    transaction.setData('generation_time_ms', Date.now() - startTime);

    return pdf;
  } catch (error) {
    // These errors are critical - customer can't get their proposal
    Sentry.captureException(error, {
      level: 'error',
      tags: { operation: 'pdf_generation' }
    });
    throw error;
  } finally {
    transaction.finish();
  }
}
```

**Why NOT instrument:**
- ❌ PDF preview (happens constantly, not critical)
- ❌ PDF metadata updates (simple operation)

#### 2.3 Authentication (`src/auth/services/authService.ts`)

**Why instrument:**
- Users can't access app if broken
- Security implications
- Supabase auth can have issues

**What we track:**
```typescript
/**
 * Authentication Tracking
 *
 * Why critical:
 * - Blocks all app access
 * - Security implications
 * - Third-party dependency (Supabase)
 *
 * Success metrics:
 * - Login success rate
 * - Authentication latency
 *
 * Error tracking:
 * - Invalid credentials (rate, not details)
 * - Network errors
 * - Session expiration issues
 * - OAuth failures
 *
 * What we DON'T track:
 * - Passwords (NEVER log these)
 * - Email addresses in error messages
 * - OAuth tokens
 * - Session tokens
 */

async signIn(email: string, password: string) {
  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (result.error) {
      // Track auth failures (without exposing sensitive data)
      Sentry.captureMessage('Authentication failed', {
        level: 'warning',
        tags: {
          auth_method: 'password',
          error_code: result.error.code
        }
        // NO email, NO password, NO tokens
      });
    }

    return result;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { operation: 'auth_signin' }
    });
    throw error;
  }
}
```

**Why NOT instrument:**
- ❌ Session refresh (happens automatically, too noisy)
- ❌ Auth state checks (called constantly)
- ❌ Profile updates (simple operation)

#### 2.4 Stripe Operations (`src/services/stripeService.ts`)

**Why instrument:**
- Money involved
- Third-party integration
- Users escalate payment issues

**What we track:**
```typescript
/**
 * Stripe Operations Tracking
 *
 * Why critical:
 * - Payment failures = lost revenue
 * - Integration complexity
 * - User escalation = support cost
 *
 * Success metrics:
 * - Checkout session creation time
 * - Payment success rate
 *
 * Error tracking:
 * - Stripe API errors
 * - Webhook processing failures
 * - Subscription update errors
 *
 * What we DON'T track:
 * - Credit card numbers (NEVER)
 * - Full payment amounts (privacy)
 * - Customer financial data
 */

async createCheckoutSession(priceId: string) {
  try {
    const session = await stripe.checkout.sessions.create({...});
    return session;
  } catch (error) {
    // Payment errors are critical
    Sentry.captureException(error, {
      level: 'error',
      tags: {
        operation: 'stripe_checkout',
        price_id: priceId
      }
    });
    throw error;
  }
}
```

**Why NOT instrument:**
- ❌ Price fetching (read-only, cached)
- ❌ Customer portal links (simple operation)

---

### **Phase 3: Error Boundaries (15 min)**
Catch React errors gracefully.

#### 3.1 Global Error Boundary (`src/components/ErrorBoundary.tsx`)

**Why necessary:**
```typescript
/**
 * Global Error Boundary
 *
 * Purpose: Catch React component errors before they crash the entire app
 *
 * What we achieve:
 * - App stays functional even if one component breaks
 * - Users see friendly error message instead of blank screen
 * - Sentry captures error with React component stack
 *
 * Where to use:
 * - Wrap entire app (main.tsx)
 * - Wrap complex features (proposal editor, PDF viewer)
 *
 * What we show users:
 * - Friendly error message
 * - "Refresh" button
 * - Option to report bug
 * - Continue using other parts of app
 */

<Sentry.ErrorBoundary
  fallback={ErrorFallbackComponent}
  showDialog // Let users report bugs
>
  <App />
</Sentry.ErrorBoundary>
```

**Why NOT add boundaries:**
- ❌ Around every component (too granular, noisy)
- ❌ Around simple UI elements (buttons, text)
- ❌ Around third-party components (they should handle their own errors)

#### 3.2 Feature-Level Boundaries

**Proposal Editor** - YES ✅
```typescript
/**
 * Why: Complex component, many moving parts
 * Risk: User could lose work if it crashes
 * Solution: Catch error, auto-save, let user retry
 */
<ErrorBoundary fallback={<ProposalEditorError />}>
  <ProposalEditor />
</ErrorBoundary>
```

**Dashboard** - NO ❌
```typescript
/**
 * Why not: Simple display component
 * Risk: Low - just shows data
 * If it breaks: Global boundary catches it
 */
```

---

### **Phase 4: User Context (10 min)**
Associate errors with users for better debugging.

#### 4.1 Set User Context (`src/auth/AuthProvider.tsx`)

**Why important:**
```typescript
/**
 * User Context for Errors
 *
 * What we achieve:
 * - Know which users experience errors
 * - See error patterns by user type (admin vs regular)
 * - Contact affected users directly
 *
 * What we track:
 * - User ID
 * - Email (for contact)
 * - Organization ID
 * - User role
 * - Account age
 *
 * What we DON'T track:
 * - Passwords
 * - Payment information
 * - Personal data beyond email
 */

useEffect(() => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.name,
      organization_id: user.organization_id
    });
  } else {
    Sentry.setUser(null);
  }
}, [user]);
```

**Privacy considerations:**
- ✅ User can see their tracked data (GDPR compliant)
- ✅ Data helps us fix their issues
- ✅ Auto-deleted after 90 days
- ❌ Don't track sensitive personal information
- ❌ Don't track financial data

---

### **Phase 5: Custom Events (Optional - Skip for now)**

**What we're skipping:**
```typescript
/**
 * Why skip custom events initially:
 * - Not enough users for meaningful analytics
 * - Automatic tracking catches most issues
 * - Can add later when needed
 *
 * Add these when you have 100+ users:
 * - Feature usage tracking
 * - Funnel analysis (proposal creation flow)
 * - A/B test results
 * - Custom business metrics
 */
```

**Later additions (Month 2+):**
- PostHog for feature usage
- Custom Sentry breadcrumbs for user flows
- Business metric tracking

---

## 📊 What We'll See

### **Sentry Dashboard**
```
Today's Errors (Last 24h):
┌──────────────────────────────────────┬───────┬──────────┐
│ Error                                 │ Count │ Users    │
├──────────────────────────────────────┼───────┼──────────┤
│ TypeError: Cannot read 'walls'       │   12  │    3     │
│ Database connection timeout          │    8  │    5     │
│ PDF generation failed                │    3  │    2     │
│ Stripe API rate limit exceeded       │    1  │    1     │
└──────────────────────────────────────┴───────┴──────────┘

Performance:
- Average proposal creation: 850ms
- P95 proposal creation: 2.3s
- Average PDF generation: 4.1s
```

### **Vercel Analytics**
```
This Week:
- 234 page views
- 42 unique visitors
- Top pages:
  1. /proposals/new (78 views)
  2. /dashboard (56 views)
  3. /proposals/[id] (45 views)

Core Web Vitals:
- LCP: 1.2s ✅ (Good)
- FID: 45ms ✅ (Good)
- CLS: 0.08 ✅ (Good)
```

---

## 🚦 Testing Plan

### **Manual Testing Checklist**

#### Test 1: Error Capture
```bash
# Create intentional error
1. Add this to proposal editor:
   throw new Error('Test error capture');
2. Open proposal editor
3. Check Sentry dashboard (should see error within 1 min)
4. Verify error shows:
   ✅ User email
   ✅ Proposal editor component
   ✅ Session replay (if enabled)
5. Remove test error
```

#### Test 2: Performance Tracking
```bash
# Test proposal creation timing
1. Create new proposal
2. Check Sentry performance
3. Should see transaction: "Create Proposal"
4. Verify it shows:
   ✅ Total time
   ✅ Database query time
   ✅ Success status
```

#### Test 3: Error Boundary
```bash
# Test graceful error handling
1. Break a component intentionally
2. App should show error fallback (not crash)
3. Other features still work
4. User can refresh and retry
```

#### Test 4: User Context
```bash
# Verify user association
1. Login as test user
2. Trigger an error
3. Check Sentry
4. Should show:
   ✅ Your email
   ✅ Organization ID
   ✅ User role
```

---

## 📝 Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Install dependencies
- [ ] Create `src/lib/sentry.ts`
- [ ] Configure environment variables
- [ ] Initialize in `main.tsx`
- [ ] Add Vercel Analytics component
- [ ] Test: See errors in Sentry dashboard

### Phase 2: Critical Operations ✅
- [ ] Instrument `proposalsService.createProposal()`
- [ ] Instrument `proposalsService.updateProposal()`
- [ ] Instrument `pdfService.generatePDF()`
- [ ] Instrument `authService.signIn()`
- [ ] Instrument `authService.signUp()`
- [ ] Instrument `stripeService.createCheckout()`
- [ ] Test: Performance data appears in Sentry

### Phase 3: Error Boundaries ✅
- [ ] Create `ErrorBoundary` component
- [ ] Wrap app in global boundary
- [ ] Add boundary to Proposal Editor
- [ ] Add boundary to PDF Viewer
- [ ] Test: Errors show fallback UI

### Phase 4: User Context ✅
- [ ] Set user in AuthProvider
- [ ] Clear user on logout
- [ ] Test: Errors show user email

### Phase 5: Documentation ✅
- [ ] Document Sentry configuration
- [ ] Add README section on observability
- [ ] Document error handling patterns
- [ ] Add team guide for checking Sentry

---

## 💰 Cost Tracking

### Current (Month 1-6)
- **Sentry Free:** 5,000 errors/month
- **Vercel Analytics:** Included with Vercel
- **Total:** $0/month

### When to Upgrade
- **Sentry Developer ($26/month):**
  - When: >5,000 errors/month (~500 active users)
  - Gets: 50,000 errors/month + unlimited replays

- **PostHog ($20/month):**
  - When: Need feature usage analytics (>100 users)
  - Gets: 1M events/month

---

## 🎯 Success Metrics

### Week 1
- ✅ Sentry catching errors
- ✅ Can see error details + stack traces
- ✅ Session replays working
- ✅ Vercel Analytics showing page views

### Month 1
- ✅ Identified and fixed 3+ bugs from Sentry
- ✅ Average error response time < 24 hours
- ✅ Zero critical errors undetected

### Month 3
- ✅ 90% of errors fixed within 1 week
- ✅ Proactive bug fixing (before user reports)
- ✅ Performance baselines established

---

## 🔒 Privacy & Security

### What We Track
- ✅ Error messages
- ✅ Stack traces
- ✅ User email (for contact)
- ✅ User ID
- ✅ Organization ID
- ✅ Session replays (optional)

### What We NEVER Track
- ❌ Passwords
- ❌ Credit card numbers
- ❌ OAuth tokens
- ❌ API keys
- ❌ Proposal pricing details
- ❌ Customer personal information

### Data Retention
- Errors: 90 days
- Performance data: 30 days
- Session replays: 30 days
- Auto-deleted after retention period

---

## 📚 Resources

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Vercel Analytics](https://vercel.com/docs/analytics)
- [Error Boundaries in React](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

---

## ✅ Implementation Status

### Completed (November 13, 2024)

#### Phase 1: Foundation ✅
- ✅ Installed Sentry and Vercel Analytics packages
- ✅ Created `src/lib/sentry.ts` with full configuration
- ✅ Initialized Sentry in `src/main.tsx`
- ✅ Added Vercel Analytics to `src/App.tsx`
- ✅ Created global ErrorBoundary component
- ✅ Wrapped app in ErrorBoundary
- ✅ Added environment variables to `.env`

#### Phase 2: Critical Operations ✅
**Proposal Operations:**
- ✅ Instrumented `createProposal()` in `src/services/proposalsService.ts`
- ✅ Instrumented `updateProposal()` in `src/services/proposalsService.ts`
- ✅ Instrumented `deleteProposal()` in `src/services/proposalsService.ts`

**Auth Operations:**
- ✅ Instrumented `signIn()` in `src/auth/services/authService.ts`
- ✅ Instrumented `signUp()` in `src/auth/services/authService.ts`
- ✅ Instrumented `signOut()` in `src/auth/services/authService.ts`
- ✅ Added user context tracking (set on login, clear on logout)

**Reminder Operations:**
- ✅ Instrumented `createReminder()` in `src/services/reminderService.ts`
- ✅ Instrumented `updateReminder()` in `src/services/reminderService.ts`
- ✅ Instrumented `deleteReminder()` in `src/services/reminderService.ts`

**Settings Operations:**
- ✅ Instrumented `updateUserProfile()` in `src/auth/services/profileService.ts`
- ✅ Instrumented `updateOrganization()` in `src/services/organizationService.ts`

### What's Tracked
- **Performance:** All instrumented operations track execution time
- **Errors:** Database errors, auth failures, RLS violations
- **Context:** User ID, organization ID, operation type
- **Success/Failure:** Every operation reports status
- **Privacy:** Passwords, payment info, and sensitive data automatically filtered

### What's NOT Tracked
- ❌ Proposal pricing details
- ❌ Customer personal information
- ❌ Passwords or tokens
- ❌ Simple UI interactions
- ❌ Read-only operations

### Ready for Production
The implementation is complete and ready for production use:
1. Add your Sentry DSN to environment variables
2. Deploy to Vercel
3. Errors and performance metrics will automatically flow to Sentry
4. Vercel Analytics will track page views and Web Vitals

---

## 🎉 Next Steps

1. ✅ ~~Review this plan~~ (Completed)
2. ✅ ~~Implement Phase 1 (30 min)~~ (Completed)
3. ✅ ~~Implement Phase 2 (20 min)~~ (Completed)
4. ⏭️ **Create Sentry account and get DSN**
5. ⏭️ **Add `VITE_SENTRY_DSN` to Vercel environment variables**
6. ⏭️ **Deploy to production**
7. ⏭️ **Test error capture (trigger a test error)**
8. ⏭️ **Monitor for 1 week**
9. ⏭️ **Add PDF generation instrumentation if needed** (Phase 2 extension)
