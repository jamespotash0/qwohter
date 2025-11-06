# Auth v3.0.0 - Quick Reference Card

## 🎯 Import Statement
```typescript
import { useUser, useSession, useProfile, useSignIn, useSignOut } from '@/auth';
```

---

## 📘 Common Patterns

### Get Current User
```typescript
const user = useUser();
// Returns: User | null
```

### Check if Authenticated
```typescript
const isAuthenticated = useIsAuthenticated();
// Returns: boolean
```

### Get User Profile
```typescript
const { data: profile, isLoading, error } = useProfile();
```

### Sign In
```typescript
const { mutate: signIn, isPending } = useSignIn();

signIn({ email, password }, {
  onSuccess: () => navigate('/dashboard'),
  onError: (err) => toast.error(err.message),
});
```

### Sign Out
```typescript
const { mutate: signOut, isPending } = useSignOut();

signOut();
```

### Update Profile
```typescript
const user = useUser();
const { mutate: updateProfile } = useUpdateProfile();

updateProfile({
  userId: user.id,
  updates: { full_name: 'John Doe' }
});
```

### Protected Route
```typescript
function ProtectedRoute({ children }) {
  const { isInitialized } = useAuthStatus();
  const isAuthenticated = useIsAuthenticated();

  if (!isInitialized) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/sign-in" />;

  return children;
}
```

---

## 🔄 Migration Cheat Sheet

| Old (v2.0.0) | New (v3.0.0) |
|--------------|--------------|
| `useAuthStore((s) => s.user)` | `useUser()` |
| `useAuthStore((s) => s.profile)` | `useProfile()` |
| `useAuthStore((s) => !!s.user)` | `useIsAuthenticated()` |
| `useAuthStore((s) => s.isLoading)` | `useAuthStatus()` |
| `useAuthStore((s) => s.signOut)` | `useSignOut()` |
| `useAuthStore((s) => s.signIn)` | `useSignIn()` |

---

## 📋 All Available Hooks

### Data Hooks
- `useUser()` - Current user
- `useSession()` - Session with loading state
- `useProfile(userId?)` - User profile
- `useIsAuthenticated()` - Auth status boolean
- `useAuthStatus()` - Initialization & loading state

### Mutation Hooks
- `useSignIn()` - Sign in
- `useSignUp()` - Sign up
- `useSignOut()` - Sign out
- `useUpdateProfile()` - Update profile
- `useVerifyOtp()` - Verify OTP
- `useResendOtp()` - Resend OTP
- `useResetPassword()` - Send reset email
- `useUpdatePassword()` - Change password

---

## ⚡ Quick Wins

### Before: Duplicate API Calls
```typescript
// ❌ OLD - Each component fetches separately
const Component1 = () => {
  const user = useAuthStore((s) => s.user);
  // Triggers API call 1
};

const Component2 = () => {
  const user = useAuthStore((s) => s.user);
  // Triggers API call 2
};
```

### After: Automatic Deduplication
```typescript
// ✅ NEW - React Query deduplicates
const Component1 = () => {
  const user = useUser();
  // Triggers API call (cached)
};

const Component2 = () => {
  const user = useUser();
  // Returns cached result
};
// Total: 1 API call
```

---

## 🚨 Common Mistakes

### ❌ Wrong: Calling hook result
```typescript
const signOut = useSignOut();
await signOut(); // ERROR: signOut is an object
```

### ✅ Correct: Destructure mutate function
```typescript
const { mutate: signOut } = useSignOut();
signOut(); // ✅ Works
```

---

### ❌ Wrong: Accessing properties before check
```typescript
const user = useUser();
const userId = user.id; // ERROR: user might be null
```

### ✅ Correct: Check first
```typescript
const user = useUser();
if (!user) return null;
const userId = user.id; // ✅ Safe
```

---

## 📁 File Locations

```
src/auth/
├── AuthProvider.tsx       # Main provider
├── index.ts              # Exports
├── hooks/
│   └── useAuth.ts        # All hooks
├── services/
│   ├── authService.ts    # Auth operations
│   └── profileService.ts # Profile operations
└── utils/
    └── AuthEventMutex.ts # Race protection
```

---

## 🔗 Full Documentation

- **Migration Guide:** `MIGRATION_GUIDE_V3.md` (600 lines)
- **Architecture:** `AUTH_V3_ARCHITECTURE.md` (800 lines)
- **Summary:** `AUTH_REFACTOR_COMPLETE.md`

---

**Version:** 3.0.0
**Print this card** and keep it handy during migration!
