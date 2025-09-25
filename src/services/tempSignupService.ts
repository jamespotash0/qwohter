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
   */
  get(): TempSignupData | null {
    try {
      const stored = localStorage.getItem(TEMP_SIGNUP_KEY);
      if (!stored) return null;

      const data: TempSignupData = JSON.parse(stored);

      // Check if expired
      const now = Date.now();
      const expiryTime = data.timestamp + (EXPIRY_HOURS * 60 * 60 * 1000);

      if (now > expiryTime) {
        this.clear();
        return null;
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