/**
 * Auth State Persistence Utilities
 * Handles saving/loading/clearing auth flow state to localStorage
 */

interface AuthFlowState {
  step: string;
  email?: string;
  userId?: string;
  fullName?: string;
  orgChoice?: string;
  orgName?: string;
  orgCode?: string;
  timestamp?: number;
}

const AUTH_STATE_KEY = 'auth_flow_state';
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save auth flow state to localStorage with timestamp
 */
export const saveAuthState = (authState: Omit<AuthFlowState, 'timestamp'>) => {
  const stateWithTimestamp: AuthFlowState = {
    ...authState,
    timestamp: Date.now(),
  };
  localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(stateWithTimestamp));
};

/**
 * Load auth flow state from localStorage
 * Returns null if not found or expired
 */
export const loadAuthState = (): AuthFlowState | null => {
  try {
    const saved = localStorage.getItem(AUTH_STATE_KEY);
    if (!saved) return null;

    const state: AuthFlowState = JSON.parse(saved);

    // Check if state is too old (expire after 24 hours)
    if (state.timestamp && Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      console.log('Auth state expired, clearing');
      clearAuthState();
      return null;
    }

    return state;
  } catch (error) {
    console.error('Error loading auth state:', error);
    clearAuthState(); // Clear corrupted state
    return null;
  }
};

/**
 * Clear auth flow state from localStorage
 */
export const clearAuthState = () => {
  localStorage.removeItem(AUTH_STATE_KEY);
};
