/**
 * Auth State Persistence Utilities
 * Handles saving/loading/clearing auth flow state to localStorage
 */

interface AuthFlowState {
  step: string;
  email?: string;
  userId?: string;
  fullName?: string;
  orgName?: string;
  timestamp?: number;
}

const AUTH_STATE_KEY = 'auth_flow_state';
const STATE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const OTP_STEP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes for OTP step

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

    // Check if state is too old
    const expiryTime = state.step === 'verify-otp' ? OTP_STEP_EXPIRY_MS : STATE_EXPIRY_MS;

    if (state.timestamp && Date.now() - state.timestamp > expiryTime) {
      console.log(`Auth state expired (step: ${state.step}), clearing`);
      clearAuthState();
      return null;
    }

    // If on OTP step, don't restore - require user to start fresh
    // This prevents users from being stuck on OTP screen after page reload
    if (state.step === 'verify-otp') {
      console.log('OTP verification step detected on reload, clearing state');
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
