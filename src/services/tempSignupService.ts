/**
 * Temporary Signup Storage Service
 *
 * Manages temporary storage of signup data before email verification.
 *
 * SECURITY NOTE: Password is stored in sessionStorage (not localStorage)
 * and is automatically cleared when the browser tab is closed.
 * This is a security improvement over localStorage which persists.
 */

export interface TempSignupData {
  email: string;
  password: string;
  fullName: string;
  timestamp: number;
  otpSent: boolean;
}

// Separate keys for different storage strategies
const TEMP_SIGNUP_KEY = 'temp-signup-data';
const TEMP_PASSWORD_KEY = 'temp-signup-pwd'; // Session-only, separate from other data
const EXPIRY_HOURS = 2; // Expire after 2 hours
const OTP_EXPIRY_MINUTES = 3; // OTP data expires after 10 minutes

export const tempSignupService = {
  /**
   * Store temporary signup data
   * Password is stored in sessionStorage (cleared on tab close) for security
   * Other data stored in localStorage for persistence across refreshes
   */
  store(data: Omit<TempSignupData, 'timestamp' | 'otpSent'>): void {
    // Store non-sensitive data in localStorage
    const publicData = {
      email: data.email,
      fullName: data.fullName,
      timestamp: Date.now(),
      otpSent: false
    };
    localStorage.setItem(TEMP_SIGNUP_KEY, JSON.stringify(publicData));

    // Store password separately in sessionStorage (cleared on tab close)
    // This reduces exposure - password only available in current session
    sessionStorage.setItem(TEMP_PASSWORD_KEY, data.password);
  },

  /**
   * Get temporary signup data if not expired
   * If otpSent is true, uses shorter OTP expiry (10 minutes)
   * Password is retrieved from sessionStorage for security
   */
  get(): TempSignupData | null {
    try {
      const stored = localStorage.getItem(TEMP_SIGNUP_KEY);
      if (!stored) return null;

      const publicData = JSON.parse(stored);
      const now = Date.now();

      // Use shorter expiry if OTP was sent (user is in verification flow)
      // This prevents orphaned users stuck on OTP page after reload/navigation
      if (publicData.otpSent) {
        const otpExpiryTime = publicData.timestamp + (OTP_EXPIRY_MINUTES * 60 * 1000);
        if (now > otpExpiryTime) {
          console.log('[TempSignup] OTP flow expired, clearing temp data');
          this.clear();
          return null;
        }
      } else {
        // Standard expiry for pre-OTP data
        const expiryTime = publicData.timestamp + (EXPIRY_HOURS * 60 * 60 * 1000);
        if (now > expiryTime) {
          this.clear();
          return null;
        }
      }

      // Retrieve password from sessionStorage (session-only storage)
      const password = sessionStorage.getItem(TEMP_PASSWORD_KEY);

      // Reconstruct the full data object
      const data: TempSignupData = {
        email: publicData.email,
        fullName: publicData.fullName,
        password: password || '', // Empty if session expired/tab closed
        timestamp: publicData.timestamp,
        otpSent: publicData.otpSent
      };

      return data;
    } catch (error) {
      console.error('Error reading temp signup data:', error);
      this.clear();
      return null;
    }
  },

  /**
   * Update OTP sent status
   */
  markOtpSent(): void {
    try {
      const stored = localStorage.getItem(TEMP_SIGNUP_KEY);
      if (stored) {
        const publicData = JSON.parse(stored);
        publicData.otpSent = true;
        localStorage.setItem(TEMP_SIGNUP_KEY, JSON.stringify(publicData));
      }
    } catch (error) {
      console.error('Error marking OTP sent:', error);
    }
  },

  /**
   * Clear temporary data from both localStorage and sessionStorage
   */
  clear(): void {
    localStorage.removeItem(TEMP_SIGNUP_KEY);
    sessionStorage.removeItem(TEMP_PASSWORD_KEY);
  },

  /**
   * Check if there's valid temporary data
   */
  hasValidData(): boolean {
    return this.get() !== null;
  },

  /**
   * Get email from temporary data
   */
  getEmail(): string | null {
    const data = this.get();
    return data?.email || null;
  }
};