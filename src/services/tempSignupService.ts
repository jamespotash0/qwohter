/**
 * Temporary Signup Storage Service
 *
 * Manages temporary storage of signup data before email verification
 */

export interface TempSignupData {
  email: string;
  password: string;
  fullName: string;
  timestamp: number;
  otpSent: boolean;
}

const TEMP_SIGNUP_KEY = 'temp-signup-data';
const EXPIRY_HOURS = 2; // Expire after 2 hours
const OTP_EXPIRY_MINUTES = 10; // OTP data expires after 10 minutes

export const tempSignupService = {
  /**
   * Store temporary signup data
   */
  store(data: Omit<TempSignupData, 'timestamp' | 'otpSent'>): void {
    const tempData: TempSignupData = {
      ...data,
      timestamp: Date.now(),
      otpSent: false
    };

    localStorage.setItem(TEMP_SIGNUP_KEY, JSON.stringify(tempData));
  },

  /**
   * Get temporary signup data if not expired
   * If otpSent is true, uses shorter OTP expiry (10 minutes)
   */
  get(): TempSignupData | null {
    try {
      const stored = localStorage.getItem(TEMP_SIGNUP_KEY);
      if (!stored) return null;

      const data: TempSignupData = JSON.parse(stored);
      const now = Date.now();

      // Use shorter expiry if OTP was sent (user is in verification flow)
      // This prevents orphaned users stuck on OTP page after reload/navigation
      if (data.otpSent) {
        const otpExpiryTime = data.timestamp + (OTP_EXPIRY_MINUTES * 60 * 1000);
        if (now > otpExpiryTime) {
          console.log('[TempSignup] OTP flow expired, clearing temp data');
          this.clear();
          return null;
        }
      } else {
        // Standard expiry for pre-OTP data
        const expiryTime = data.timestamp + (EXPIRY_HOURS * 60 * 60 * 1000);
        if (now > expiryTime) {
          this.clear();
          return null;
        }
      }

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
    const data = this.get();
    if (data) {
      data.otpSent = true;
      localStorage.setItem(TEMP_SIGNUP_KEY, JSON.stringify(data));
    }
  },

  /**
   * Clear temporary data
   */
  clear(): void {
    localStorage.removeItem(TEMP_SIGNUP_KEY);
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