# Auth Routes Refactor Plan

## Overview

Refactor the current single-page auth flow (step-based state) into separate routes with proper URL structure and navigation.

## Current State

- Single `Auth.tsx` page handles all steps via internal state
- URL stays `/create-account` or `/sign-in` throughout entire flow
- State managed via `useAuthFlow` hook with `step` variable
- Persistence via `authStatePersistence.ts` utilities

## Proposed Route Structure

```
/sign-in                    → Sign in form
/create-account             → Sign up form
/verify-email               → OTP verification (shared by sign-in/sign-up)
/onboarding/organization    → Org setup (authenticated users only)
/onboarding/details         → Company info (requires org)
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/stores/authFlowStore.ts` | Zustand store for cross-route auth state |
| `src/pages/VerifyEmail.tsx` | Standalone OTP verification page |
| `src/pages/Onboarding/Organization.tsx` | Organization setup page |
| `src/pages/Onboarding/Details.tsx` | Company details page |
| `src/components/auth/guards/RequiresPendingSignup.tsx` | Route guard - redirects if no pending signup |
| `src/components/auth/guards/RequiresAuth.tsx` | Route guard - redirects if not authenticated |
| `src/components/auth/guards/RequiresOrganization.tsx` | Route guard - redirects if no org |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add new routes to router config |
| `src/pages/Auth.tsx` | Strip down to just sign-in/sign-up form |
| `src/pages/Auth/actions/handleAuth.ts` | Change `setStep()` to `navigate()` |
| `src/pages/Auth/actions/handleOtpVerification.ts` | Change `setStep()` to `navigate()` |
| `src/pages/Auth/actions/handleOrganizationSubmit.ts` | Change `setStep()` to `navigate()` |
| `src/pages/Auth/hooks/useAuthFlow.ts` | Remove step management, use Zustand store |

## Files to Delete (Eventually)

- `src/pages/Auth/utils/authStatePersistence.ts` → replaced by Zustand persist middleware

## Zustand Store Design

```typescript
// src/stores/authFlowStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthFlowState {
  // Flow data
  email: string;
  fullName: string;
  userId: string | null;
  organizationId: string | null;
  flowType: 'signup' | 'signin' | null;

  // Invite flow
  pendingInviteToken: string | null;
  pendingOrganizationId: string | null;

  // Actions
  setEmail: (email: string) => void;
  setFullName: (fullName: string) => void;
  setUserId: (userId: string) => void;
  setOrganizationId: (orgId: string) => void;
  setFlowType: (type: 'signup' | 'signin') => void;
  setInviteData: (token: string, orgId: string) => void;
  clearFlow: () => void;
}

export const useAuthFlowStore = create<AuthFlowState>()(
  persist(
    (set) => ({
      email: '',
      fullName: '',
      userId: null,
      organizationId: null,
      flowType: null,
      pendingInviteToken: null,
      pendingOrganizationId: null,

      setEmail: (email) => set({ email }),
      setFullName: (fullName) => set({ fullName }),
      setUserId: (userId) => set({ userId }),
      setOrganizationId: (organizationId) => set({ organizationId }),
      setFlowType: (flowType) => set({ flowType }),
      setInviteData: (token, orgId) => set({
        pendingInviteToken: token,
        pendingOrganizationId: orgId
      }),
      clearFlow: () => set({
        email: '',
        fullName: '',
        userId: null,
        organizationId: null,
        flowType: null,
        pendingInviteToken: null,
        pendingOrganizationId: null,
      }),
    }),
    {
      name: 'auth-flow-storage',
    }
  )
);
```

## Route Guard Examples

```typescript
// src/components/auth/guards/RequiresPendingSignup.tsx
import { Navigate } from 'react-router-dom';
import { useAuthFlowStore } from '@/stores/authFlowStore';

export const RequiresPendingSignup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { email, flowType } = useAuthFlowStore();

  if (!email || !flowType) {
    return <Navigate to="/create-account" replace />;
  }

  return <>{children}</>;
};
```

```typescript
// src/components/auth/guards/RequiresAuth.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';

export const RequiresAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};
```

## Router Config Changes

```typescript
// In App.tsx or router config
<Routes>
  {/* Auth routes */}
  <Route path="/sign-in" element={<SignIn />} />
  <Route path="/create-account" element={<CreateAccount />} />
  <Route
    path="/verify-email"
    element={
      <RequiresPendingSignup>
        <VerifyEmail />
      </RequiresPendingSignup>
    }
  />

  {/* Onboarding routes */}
  <Route
    path="/onboarding/organization"
    element={
      <RequiresAuth>
        <OrganizationSetup />
      </RequiresAuth>
    }
  />
  <Route
    path="/onboarding/details"
    element={
      <RequiresAuth>
        <RequiresOrganization>
          <CompanyDetails />
        </RequiresOrganization>
      </RequiresAuth>
    }
  />

  {/* Protected routes */}
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
</Routes>
```

## Implementation Phases

### Phase 1: State Management Setup
- [ ] Create `authFlowStore.ts` with Zustand
- [ ] Add persist middleware for session storage
- [ ] Test store independently

### Phase 2: Route Guards
- [ ] Create `RequiresPendingSignup` guard
- [ ] Create `RequiresAuth` guard
- [ ] Create `RequiresOrganization` guard
- [ ] Test guards with mock scenarios

### Phase 3: Create Route Components
- [ ] Extract `/verify-email` page from Auth.tsx
- [ ] Extract `/onboarding/organization` page
- [ ] Extract `/onboarding/details` page
- [ ] Simplify Auth.tsx to just forms

### Phase 4: Update Navigation
- [ ] Update `handleAuth` to use `navigate('/verify-email')`
- [ ] Update `handleOtpVerification` to navigate appropriately
- [ ] Update `handleOrganizationSubmit` to navigate
- [ ] Update all action handlers

### Phase 5: Cleanup & Testing
- [ ] Remove step-based logic from Auth.tsx
- [ ] Remove `useAuthFlow` step management
- [ ] Delete `authStatePersistence.ts`
- [ ] Test all flows end-to-end

## Testing Scenarios

### Happy Paths
- [ ] Fresh signup → verify → org → details → dashboard
- [ ] Sign in (confirmed user) → dashboard
- [ ] Sign in (unconfirmed user) → verify → dashboard

### Edge Cases
- [ ] Refresh at each step - state should persist
- [ ] Direct URL access to `/verify-email` without signup → redirect to `/create-account`
- [ ] Direct URL access to `/onboarding/organization` without auth → redirect to `/sign-in`
- [ ] Browser back button behavior at each step
- [ ] Invite link flow with existing session

### Error Cases
- [ ] Invalid OTP multiple times
- [ ] Session expiry mid-flow
- [ ] Network failure during transitions

## Risk Areas

1. **Invite flow** - Has special logic for pre-populated org ID
2. **Unconfirmed user sign-in** - Needs to route to OTP, not org setup
3. **State restoration** - Users mid-flow who close browser
4. **Back button** - Decide: allow going back after OTP sent?

## Dependencies

- **None new** - Uses existing Zustand + React Router
- Zustand persist middleware (already available)

## Rollback Plan

If issues arise:
1. Keep old Auth.tsx as `Auth.legacy.tsx`
2. Route config can switch between old/new
3. Session storage keys are different, won't conflict
