import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';
import type { User, Session } from '@supabase/supabase-js';

// Mock data
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  confirmation_sent_at: '2024-01-01T00:00:00Z',
} as User;

const mockSession: Session = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: mockUser,
} as Session;

const mockProfile = {
  id: 'user-123',
  organization_id: 'org-456',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'member' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('AuthStore', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Authentication State Management', () => {
    it('should set authenticated state correctly', () => {
      useAuthStore.getState().setAuthState(mockUser, mockSession);
      const state = useAuthStore.getState();
      
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.error).toBeNull();
    });

    it('should clear state on sign out', () => {
      // First set authenticated state
      useAuthStore.getState().setAuthState(mockUser, mockSession);
      useAuthStore.getState().setProfile(mockProfile);
      
      // Then clear it
      useAuthStore.getState().clearAuthState();
      const state = useAuthStore.getState();
      
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should check authentication status correctly', () => {
      // Initially not authenticated
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
      
      // After setting auth state
      useAuthStore.getState().setAuthState(mockUser, mockSession);
      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
      
      // After clearing
      useAuthStore.getState().clearAuthState();
      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });
  });

  describe('Profile Management', () => {
    it('should set profile correctly', () => {
      useAuthStore.getState().setProfile(mockProfile);
      const state = useAuthStore.getState();
      
      expect(state.profile).toEqual(mockProfile);
    });

    it('should get user role correctly', () => {
      useAuthStore.getState().setProfile(mockProfile);
      
      const role = useAuthStore.getState().getUserRole();
      expect(role).toBe('member');
    });

    it('should return null role when no profile', () => {
      const role = useAuthStore.getState().getUserRole();
      expect(role).toBeNull();
    });

    it('should check admin status correctly', () => {
      // Member role
      useAuthStore.getState().setProfile(mockProfile);
      expect(useAuthStore.getState().isAdmin()).toBe(false);
      
      // Admin role
      useAuthStore.getState().setProfile({ ...mockProfile, role: 'admin' });
      expect(useAuthStore.getState().isAdmin()).toBe(true);
      
      // No profile
      useAuthStore.getState().setProfile(null);
      expect(useAuthStore.getState().isAdmin()).toBe(false);
    });
  });

  describe('Organization Management', () => {
    it('should get organization ID correctly', () => {
      useAuthStore.getState().setProfile(mockProfile);
      
      const orgId = useAuthStore.getState().getOrganizationId();
      expect(orgId).toBe('org-456');
    });

    it('should return null organization ID when no profile', () => {
      const orgId = useAuthStore.getState().getOrganizationId();
      expect(orgId).toBeNull();
    });

    it('should handle profile with null organization_id', () => {
      const profileWithoutOrg = { ...mockProfile, organization_id: null };
      useAuthStore.getState().setProfile(profileWithoutOrg);
      
      const orgId = useAuthStore.getState().getOrganizationId();
      expect(orgId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should set error correctly', () => {
      const errorMessage = 'Authentication failed';
      useAuthStore.getState().setError(errorMessage);
      
      expect(useAuthStore.getState().error).toBe(errorMessage);
    });

    it('should clear error correctly', () => {
      useAuthStore.getState().setError('Some error');
      useAuthStore.getState().clearError();
      
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('Loading State', () => {
    it('should set loading state correctly', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('Initialization', () => {
    it('should set initialized state correctly', () => {
      useAuthStore.getState().setInitialized(true);
      expect(useAuthStore.getState().isInitialized).toBe(true);
      
      useAuthStore.getState().setInitialized(false);
      expect(useAuthStore.getState().isInitialized).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', () => {
      const store = useAuthStore.getState();
      
      // Start loading
      store.setLoading(true);
      expect(store.isLoading).toBe(true);
      
      // Set authenticated state
      store.setAuthState(mockUser, mockSession);
      store.setProfile(mockProfile);
      
      // Complete initialization
      store.setLoading(false);
      store.setInitialized(true);
      
      const finalState = useAuthStore.getState();
      expect(finalState.isAuthenticated()).toBe(true);
      expect(finalState.getUserRole()).toBe('member');
      expect(finalState.getOrganizationId()).toBe('org-456');
      expect(finalState.isLoading).toBe(false);
      expect(finalState.isInitialized).toBe(true);
    });

    it('should handle sign out flow', () => {
      const store = useAuthStore.getState();
      
      // Set up authenticated state
      store.setAuthState(mockUser, mockSession);
      store.setProfile(mockProfile);
      store.setInitialized(true);
      
      // Sign out
      store.clearAuthState();
      
      const finalState = useAuthStore.getState();
      expect(finalState.isAuthenticated()).toBe(false);
      expect(finalState.getUserRole()).toBeNull();
      expect(finalState.getOrganizationId()).toBeNull();
      expect(finalState.isInitialized).toBe(true); // Should remain initialized
    });
  });
});