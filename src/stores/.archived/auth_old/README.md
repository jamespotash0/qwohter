# Auth Store Architecture

Clean, modular authentication state management using Zustand.

## 📁 File Structure

```
src/stores/auth/
├── types.ts              # Type definitions (AuthState, AuthActions)
├── actions/              # Action creators (sign-in, sign-out, etc.)
│   ├── initialize.ts     # Session restore + auth listeners
│   ├── signIn.ts         # Email/password authentication
│   ├── signOut.ts        # Logout + cleanup
│   ├── updateProfile.ts  # Profile updates
│   └── index.ts          # Action exports
├── authStore.ts          # Main store (state + actions)
└── README.md             # This file
```

## 🎯 Design Principles

1. **Separation of Concerns** - Each action in its own file
2. **Single Responsibility** - Each file has one clear purpose
3. **Type Safety** - Centralized types for consistency
4. **Zero Redundancy** - No duplicate auth checks
5. **Performance** - Cached state, minimal API calls

## 📖 Usage

### Basic Usage

```typescript
import { useAuthStore, useUser, useIsAuthenticated } from '@/stores/auth/authStore';

// In a component
const user = useUser();
const isAuthenticated = useIsAuthenticated();
const { signIn, signOut } = useAuthStore();

// Sign in
await signIn('user@example.com', 'password');

// Sign out
await signOut();
```

### Advanced Usage

```typescript
// Access full state
const { user, session, profile, isLoading, error } = useAuthStore();

// Use specific selectors (optimized re-renders)
const user = useUser();
const profile = useProfile();
const isLoading = useAuthLoading();
const error = useAuthError();
const actions = useAuthActions();
```

## 🔧 How It Works

### Initialization Flow

1. **App loads** → `initialize()` called once
2. **Session restore** → Supabase checks cookies (fast)
3. **User loaded** → Fetch profile from database
4. **Listener setup** → Auth state changes trigger updates

### Auth State Changes

```
User signs in  → Supabase event → Update store → Fetch profile
User signs out → Supabase event → Clear store  → Clear caches
Token expires  → Supabase auto-refresh → Update store
```

### Cache Strategy

- ✅ **User/Session** - Stored in Zustand (in-memory)
- ✅ **Profile** - Stored in Zustand + localStorage
- ✅ **Organization** - Stored in org store + localStorage
- ✅ **No redundant API calls** - Everything uses cached auth

## 🚀 Performance Optimizations

1. **Single getSession() call** on app load
2. **Zero getUser() calls** - Everything uses store
3. **Selective re-renders** - Use specific selectors
4. **Cached listeners** - One auth listener for entire app
5. **localStorage caching** - Instant reload, no flicker

## 📝 Action Reference

### `initialize()`
Restores session and sets up auth listeners. Called once on app start.

### `signIn(email, password)`
Authenticates user with email/password. Updates handled by listener.

### `signOut()`
Logs out user and clears all caches. Updates handled by listener.

### `updateProfile(updates)`
Updates user profile in database and local store.

### `clearError()`
Clears error state.

## 🔒 Internal Methods (Prefixed with `_`)

These are for internal use only:

- `_setAuth(user, session)` - Updates user/session
- `_setProfile(profile)` - Updates profile
- `_setLoading(loading)` - Updates loading state
- `_setError(error)` - Updates error state

## 🧹 Cache Cleanup

On sign out, the following caches are cleared:

- `sidebar_cached_profile`
- `sidebar_cached_role`
- `auth_flow_state`
- `temp_onboarding_progress`
- `org_cached_organization`
- `org_cached_user_role`
- `org_cached_membership`

## 🎨 Benefits of This Architecture

✅ **Easy to understand** - Each file has one clear purpose
✅ **Easy to maintain** - Changes isolated to specific files
✅ **Easy to test** - Actions are pure functions
✅ **Easy to extend** - Add new actions without touching existing code
✅ **Type safe** - Centralized types prevent errors
✅ **Performant** - Zero redundant API calls

## 📚 Related Files

- `/src/hooks/useOrganizations.ts` - Uses auth store for user ID
- `/src/stores/quotes/quotesStore.ts` - Uses `getCurrentUser()` helper
- `/src/stores/organization/organizationStore.ts` - Caches organization data
- `/src/lib/auth-config.ts` - Auth initialization entry point
