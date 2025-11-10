# Auth Page - Modular Architecture

Clean, maintainable multi-step authentication flow.

## 📁 File Structure

```
src/pages/Auth/
├── hooks/                        # State management hooks
│   ├── useAuthFlow.ts           # Flow state (step, userId, loading)
│   ├── useAuthFormState.ts      # Form inputs (email, password, etc.)
│   ├── useCompanyInfoState.ts   # Company information fields
│   └── index.ts                 # Exports
├── actions/                      # Business logic handlers
│   ├── handleAuth.ts            # Sign-in & sign-up
│   ├── handleOtpVerification.ts # OTP verification
│   ├── handleOrganizationSubmit.ts # Org creation/join
│   ├── handleCompanyInfo.ts     # Company info submission
│   └── index.ts                 # Exports
├── utils/                        # Utility functions
│   ├── authStatePersistence.ts  # Save/load auth state
│   ├── redirectHelpers.ts       # Post-auth redirects
│   └── index.ts                 # Exports
├── Auth.tsx                      # Main component (orchestrator)
└── README.md                     # This file
```

## 🎯 Design Principles

### 1. **Separation of Concerns**
- **Hooks**: Manage state
- **Actions**: Handle business logic
- **Utils**: Provide helper functions
- **Components**: Present UI

### 2. **Single Responsibility**
Each file does ONE thing:
- `useAuthFlow.ts` → Flow state management
- `handleAuth.ts` → Authentication logic
- `authStatePersistence.ts` → LocalStorage operations

### 3. **Testability**
All business logic is in pure functions that can be tested independently.

### 4. **Maintainability**
- Want to change sign-in logic? → Edit `handleAuth.ts`
- Want to add a field? → Edit relevant hook
- Want to change redirect? → Edit `redirectHelpers.ts`

## 📖 Usage

### Hooks

#### useAuthFlow
Manages multi-step flow state:

```typescript
const authFlow = useAuthFlow();
// Provides: step, setStep, userId, setUserId, loading, etc.
```

#### useAuthFormState
Manages form input state:

```typescript
const formState = useAuthFormState();
// Provides: email, setEmail, password, setPassword, etc.
```

#### useCompanyInfoState
Manages company information fields:

```typescript
const companyInfo = useCompanyInfoState();
// Provides: companyPhone, companyAddress, etc.
```

### Actions

All actions follow this pattern:

```typescript
import { handleAuth } from './actions';

await handleAuth({
  email,
  password,
  // ... other required params
  toast,
  navigate,
  setStep,
});
```

Available actions:
- `handleAuth` - Sign-in & sign-up
- `handleOtpVerification` - Verify OTP code
- `handleOrganizationSubmit` - Create or join organization
- `handleCompanyInfoSubmit` - Save company information
- `handleCompanyInfoSkip` - Skip company info step
- `handleLogoUpload` - Handle logo upload
- `handleLogoError` - Handle logo upload error

### Utilities

#### Auth State Persistence

```typescript
import { saveAuthState, loadAuthState, clearAuthState } from './utils';

// Save state
saveAuthState({ step: 'verify-otp', email, userId });

// Load state
const state = loadAuthState(); // Returns null if expired/not found

// Clear state
clearAuthState();
```

#### Redirect Helpers

```typescript
import { redirectAfterAuth, saveRedirectUrl } from './utils';

// Save current URL for redirect after auth
saveRedirectUrl(location.pathname);

// Redirect after successful auth
redirectAfterAuth(navigate);
```

## 🔄 Authentication Flow

### 1. Sign-Up Flow
```
Auth Form → OTP Verification → Organization Setup → Company Info → Dashboard
```

### 2. Sign-In Flow
```
Auth Form → Resume at saved step OR Dashboard (if complete)
```

### 3. Invite Token Flow
```
URL with token → Pre-fill org code → Auth Form → Join Organization → Dashboard
```

## 📊 State Management

### Flow State (useAuthFlow)
- `step`: Current step in auth flow
- `userId`: Authenticated user ID
- `orgChoice`: Join or create organization
- `loading`: Global loading state
- `submissionInProgress`: Prevents double submission
- `isSignUp`: Sign-up vs sign-in mode

### Form State (useAuthFormState)
- Email/password fields
- Name fields (first, last, full)
- OTP code
- Organization fields (name, code, industry, foundVia)

### Company Info State (useCompanyInfoState)
- Company contact info (phone, fax, address, website)
- Quote starting point
- Logo URL

## 🎨 Benefits

### Before Refactoring
```
Auth.tsx (919 lines)
├── 26+ state variables ❌
├── All business logic ❌
├── All utilities ❌
└── Hard to navigate ❌
```

### After Refactoring
```
Auth/
├── hooks/ (3 files, ~213 lines total)    ✅ Focused
├── actions/ (4 files, ~400 lines total)  ✅ Testable
├── utils/ (2 files, ~100 lines total)    ✅ Reusable
├── Auth.tsx (~150 lines target)          ✅ Clean
└── README.md                             ✅ Documented
```

## 🚀 Next Steps for Main Component

The main `Auth.tsx` file should be refactored to:

```typescript
const Auth = () => {
  // 1. Use hooks for state
  const authFlow = useAuthFlow();
  const formState = useAuthFormState();
  const companyInfo = useCompanyInfoState();

  // 2. Use actions for logic
  const onAuth = (e) => handleAuth({ ...formState, ...authFlow, ... });
  const onOtp = (e) => handleOtpVerification({ ... });
  const onOrg = (e) => handleOrganizationSubmit({ ... });
  const onCompany = (e) => handleCompanyInfoSubmit({ ... });

  // 3. Render appropriate step
  return (
    <div>
      {authFlow.step === 'auth' && <AuthForm onSubmit={onAuth} {...formState} />}
      {authFlow.step === 'verify-otp' && <OtpForm onSubmit={onOtp} {...formState} />}
      {authFlow.step === 'organization' && <OrgForm onSubmit={onOrg} {...formState} />}
      {authFlow.step === 'company-info' && <CompanyForm onSubmit={onCompany} {...companyInfo} />}
    </div>
  );
};
```

**Target**: ~150 lines of clean, readable code!

## 📝 Testing

Each module can be tested independently:

```typescript
// Test hooks
const { result } = renderHook(() => useAuthFlow());
expect(result.current.step).toBe('auth');

// Test actions
await handleAuth({ email: 'test@test.com', ... });
expect(mockToast).toHaveBeenCalledWith({ title: '...' });

// Test utilities
saveAuthState({ step: 'verify-otp' });
expect(localStorage.getItem('auth_flow_state')).toBeDefined();
```

## 🔗 Related Files

- `/src/auth/` - Auth v3.0.0 system (React Context + React Query)
- `/src/utils/authFlowHelpers.ts` - Auth flow business logic
- `/src/services/onboardingStateService.ts` - Onboarding persistence
- `/src/components/auth/` - Auth form components
