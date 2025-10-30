# Industry-Level Auth Architecture Refactor

## Overview

Refactor WallQu authentication to match industry-leading B2B SaaS applications (Linear, Stripe, Retool, Vercel).

**Goal:** Enterprise-ready, scalable, maintainable auth architecture with zero race conditions.

---

## Current State Analysis

### Issues Identified
1. ✅ Auth state in 2 places (Zustand + React Query) → sync bugs
2. ✅ Double initialization (2 entry points) → duplicate listeners
3. ✅ Profile cached in 3 places → divergence
4. ✅ No mutex for auth events → race conditions
5. ✅ Session fetching duplicated 5 times → performance
6. ❌ No SSO/SAML support → blocks enterprise deals
7. ❌ No MFA → security requirement
8. ❌ No session timeout → compliance risk

---

## Target Architecture (Industry Standard)

### The "Linear Pattern"

```
App.tsx
  └─ AuthProvider (React Context)
       ├─ Single Supabase listener
       ├─ Exposes: useAuth(), useUser(), useSession()
       └─ Uses React Query for ALL server state

  └─ QueryClientProvider
       ├─ User, profile, org data
       ├─ Automatic deduplication
       └─ Persistence with version control

  └─ ZustandProvider (UI state ONLY)
       ├─ Sidebar open/closed
       ├─ Modal state
       └─ Theme, preferences
```

### Benefits
- ✅ **Single source of truth** - React Query for ALL server state
- ✅ **Zero race conditions** - Serialized auth events with mutex
- ✅ **Zero sync bugs** - No duplicate state storage
- ✅ **Performance** - Automatic deduplication, smart caching
- ✅ **Scalable** - Clean separation of concerns
- ✅ **Enterprise-ready** - SSO, MFA, audit logs

---

## Implementation Phases

### **PHASE 1: Foundation (2-3 hours)**

#### 1.1 Create AuthProvider (Single Source of Truth)

**File:** `src/auth/AuthProvider.tsx`

```typescript
/**
 * AuthProvider - Industry Standard Pattern
 *
 * Inspired by: Linear, Vercel, Stripe
 *
 * Responsibilities:
 * - Register ONE Supabase auth listener (global)
 * - Coordinate auth state changes with React Query
 * - Provide hooks: useAuth(), useUser(), useSession()
 * - Handle session refresh, token management
 *
 * Does NOT:
 * - Store auth state locally (React Query does this)
 * - Duplicate listeners
 * - Mix UI state with auth state
 */

import { createContext, useContext, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';
import { AuthEventMutex } from './utils/authEventMutex';

interface AuthContextValue {
  isInitialized: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const authMutex = useRef(new AuthEventMutex());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Restore session on mount (ONE TIME)
    initializeAuth();

    // 2. Register auth listener (ONE TIME)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Serialize ALL auth events through mutex
        authMutex.current.execute(async () => {
          await handleAuthEvent(event, session);
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function initializeAuth() {
    try {
      setIsLoading(true);

      // Fetch session using React Query (deduplication!)
      const session = await queryClient.fetchQuery({
        queryKey: queryKeys.user.session(),
        queryFn: async () => {
          const { data: { session } } = await supabase.auth.getSession();
          return session;
        },
        staleTime: 60 * 1000,
      });

      if (session?.user) {
        // Prefetch user profile
        await queryClient.prefetchQuery({
          queryKey: queryKeys.user.profile(session.user.id),
          queryFn: async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            return data;
          },
        });
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuthEvent(event: string, session: Session | null) {
    console.log('🔐 Auth event:', event);

    switch (event) {
      case 'SIGNED_IN':
        // Invalidate and refetch user data
        await queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
        break;

      case 'SIGNED_OUT':
        // Clear ALL React Query cache
        queryClient.clear();
        // Clear Zustand UI state
        // (organization, quotes stores are now React Query only)
        break;

      case 'TOKEN_REFRESHED':
        // Update session in cache (no refetch needed)
        if (session) {
          queryClient.setQueryData(queryKeys.user.session(), session);
        }
        break;

      case 'USER_UPDATED':
        // Refetch profile
        if (session?.user) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.user.profile(session.user.id),
          });
        }
        break;
    }
  }

  return (
    <AuthContext.Provider value={{ isInitialized, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hooks
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Status:** ⏳ Not started

---

#### 1.2 Create Auth Event Mutex (Prevent Race Conditions)

**File:** `src/auth/utils/authEventMutex.ts`

```typescript
/**
 * Auth Event Mutex
 *
 * Serializes auth state changes to prevent race conditions.
 * Inspired by: Stripe's webhook processing
 */

export class AuthEventMutex {
  private queue: Promise<void> = Promise.resolve();
  private timeout = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentQueue = this.queue;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Auth event timeout')), this.timeout);
    });

    // Queue this operation
    this.queue = (async () => {
      await currentQueue;
      // Intentionally don't await fn() here - let it run
    })();

    try {
      // Race between operation and timeout
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      console.error('Auth event error:', error);
      throw error;
    }
  }

  clear() {
    this.queue = Promise.resolve();
  }
}
```

**Status:** ⏳ Not started

---

#### 1.3 Create Auth Hooks (Clean API)

**File:** `src/auth/hooks/useAuth.ts`

```typescript
/**
 * Auth Hooks - Industry Standard
 *
 * Exposes clean API for components to access auth state.
 * ALL data comes from React Query (single source of truth).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryClient';

export function useUser() {
  const { data: session } = useSession();
  return session?.user ?? null;
}

export function useSession() {
  return useQuery({
    queryKey: queryKeys.user.session(),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
    staleTime: 60 * 1000,
    retry: false,
  });
}

export function useProfile(userId?: string) {
  const user = useUser();
  const id = userId || user?.id;

  return useQuery({
    queryKey: queryKeys.user.profile(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useIsAuthenticated() {
  const user = useUser();
  return !!user;
}

// Auth actions (mutations)
export function useSignIn() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    onSuccess: () => {
      // React Query will auto-refetch queries
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Clear ALL data
      queryClient.clear();
    },
  });
}
```

**Status:** ⏳ Not started

---

#### 1.4 Update App.tsx (Single Entry Point)

**File:** `src/App.tsx`

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/auth/AuthProvider';
import { queryClient } from '@/lib/queryClient';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Your app routes */}
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

**Status:** ⏳ Not started

---

#### 1.5 Migrate Components to Use New Hooks

**Before:**
```typescript
const user = useAuthStore((s) => s.user);
const profile = useAuthStore((s) => s.profile);
```

**After:**
```typescript
const user = useUser();
const { data: profile } = useProfile();
```

**Files to Update:**
- All components using `useAuthStore`
- Remove Zustand auth store
- Remove old auth initialization code

**Status:** ⏳ Not started

---

### **PHASE 2: Enterprise Features (3-4 hours)**

#### 2.1 Add SSO/SAML Support

**Why:** 92% of enterprises require SSO for vendor selection.

**Files:**
- `src/auth/services/ssoService.ts` - SAML/OIDC integration
- `src/auth/hooks/useSSOLogin.ts` - SSO login flow
- `src/pages/Auth/SSOLogin.tsx` - SSO UI

**Supabase Support:** Supabase Auth supports SAML SSO (Enterprise plan).

**Status:** ⏳ Not started

---

#### 2.2 Add Multi-Factor Authentication (MFA)

**Why:** Required for SOC 2, ISO 27001 compliance.

**Files:**
- `src/auth/services/mfaService.ts` - MFA enrollment, verification
- `src/auth/hooks/useMFA.ts` - MFA hooks
- `src/pages/Auth/MFASetup.tsx` - MFA setup UI
- `src/pages/Auth/MFAVerify.tsx` - MFA verification UI

**Supabase Support:** Supabase Auth has built-in MFA (TOTP, SMS).

**Status:** ⏳ Not started

---

#### 2.3 Add Session Timeout & Activity Tracking

**Why:** Compliance requirement (SOC 2, HIPAA).

**Files:**
- `src/auth/services/sessionService.ts` - Idle detection, auto-logout
- `src/auth/hooks/useSessionTimeout.ts` - Session timeout hook

**Implementation:**
- Track user activity (mouse, keyboard)
- Auto-logout after 30 mins inactivity
- Show warning modal before logout

**Status:** ⏳ Not started

---

#### 2.4 Add Audit Logging

**Why:** Compliance requirement, security monitoring.

**Files:**
- `src/auth/services/auditService.ts` - Log auth events
- Database table: `audit_logs` - Store logs

**Events to Log:**
- Sign in/out
- Password changes
- MFA enrollment
- SSO logins
- Failed auth attempts
- Permission changes

**Status:** ⏳ Not started

---

### **PHASE 3: Advanced (Optional, 2-3 hours)**

#### 3.1 Device Management

- Track user devices (browser, OS, location)
- Allow users to revoke sessions
- Alert on suspicious logins

#### 3.2 Adaptive Authentication

- Risk-based MFA (require MFA for suspicious logins)
- Device fingerprinting
- Geolocation-based access control

#### 3.3 SCIM Provisioning

- Automated user provisioning from IdP (Okta, Azure AD)
- Sync user attributes
- Deprovisioning on employee offboarding

---

## Migration Steps (Recommended Order)

### Week 1: Foundation
- [ ] Day 1-2: Create AuthProvider, hooks, mutex
- [ ] Day 3: Migrate components to new hooks
- [ ] Day 4: Remove old Zustand auth store
- [ ] Day 5: Testing, bug fixes

### Week 2: Enterprise Features
- [ ] Day 1-2: SSO/SAML integration
- [ ] Day 3: MFA implementation
- [ ] Day 4: Session timeout, audit logs
- [ ] Day 5: Testing, documentation

### Week 3: Polish & Advanced (Optional)
- [ ] Device management
- [ ] Adaptive auth
- [ ] SCIM provisioning

---

## Success Metrics

### Performance
- ✅ Auth initialization < 500ms
- ✅ Zero race conditions
- ✅ < 3 API calls on page load

### Security
- ✅ SOC 2 compliant auth
- ✅ MFA support
- ✅ Session timeout
- ✅ Audit logging

### Enterprise Readiness
- ✅ SSO/SAML support
- ✅ SCIM provisioning (optional)
- ✅ Admin controls
- ✅ Compliance certifications

---

## Breaking Changes

### Removed:
- `useAuthStore` (Zustand) → Replace with `useUser()`, `useSession()`
- `authStore.initialize()` → Now automatic in `AuthProvider`
- `authStore.signIn()` → Replace with `useSignIn()` mutation
- Manual session fetching → React Query handles this

### Migration Guide:
```typescript
// ❌ OLD
const user = useAuthStore((s) => s.user);
const signOut = useAuthStore((s) => s.signOut);

// ✅ NEW
const user = useUser();
const { mutate: signOut } = useSignOut();
```

---

## Questions & Decisions

1. **Keep Zustand at all?**
   - YES for UI state (sidebar, modals)
   - NO for server state (auth, quotes, org)

2. **SSO Priority?**
   - HIGH if targeting enterprise customers
   - MEDIUM if mid-market only

3. **MFA Requirement?**
   - HIGH for compliance (SOC 2)
   - MEDIUM otherwise

4. **Timeline?**
   - Fast: Phase 1 only (1 week)
   - Complete: Phase 1 + 2 (2 weeks)
   - Enterprise: All phases (3 weeks)

---

## Resources

- [Supabase Auth Best Practices](https://supabase.com/docs/guides/auth)
- [React Query Auth Pattern](https://tkdodo.eu/blog/react-query-and-forms)
- [Linear's Auth Architecture](https://linear.app/blog/how-we-built-linear-authentication)
- [Enterprise SSO Guide](https://workos.com/blog/user-management-for-b2b-saas)

---

**Last Updated:** October 29, 2025
**Status:** Planning phase
