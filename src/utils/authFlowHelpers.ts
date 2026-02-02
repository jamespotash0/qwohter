/**
 * Authentication Flow Helper Utilities - Updated for New Schema
 *
 * Handles authentication flow with memberships table and state tracking
 */

import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/security";
import { onboardingStateHelpers } from "@/services/onboardingStateService";
import { OrganizationCreationLimiter } from "@/services/rateLimitingService";
import { generateOrgPrefix } from "@/utils/orgPrefixGenerator";
import { tempSignupService } from "@/services/tempSignupService";
import * as authService from "@/auth/services/authService";


export interface AuthResult {
  success: boolean;
  data?: any;
  error?: string;
  nextStep?: 'verify-otp' | 'profile' | 'organization' | 'company-info' | 'complete';
}

export interface ProfileSetupData {
  userId: string;
  fullName: string;
}

export interface OrganizationChoice {
  type: 'create';
  orgName?: string;
  industry?: string;
  foundVia?: string;
}

export interface OrganizationSetupData {
  userId: string;
  choice: OrganizationChoice;
}

/**
 * Authentication flow helper functions
 */
export const authFlowHelpers = {
  /**
   * Handle user sign in with email and password
   */
  handleSignIn: async (email: string, password: string): Promise<AuthResult> => {
    console.log('=== SIGNIN FUNCTION START ===');
    console.log('Email:', email);

    try {
      // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
      const { user, error } = await authService.signIn({ email, password });

      if (error) {
        console.log('SignIn error:', error);

        if (error.message === 'Invalid login credentials') {
          return {
            success: false,
            error: "Invalid email or password. Please check your credentials and try again."
          };
        }

        if (error.message === 'Email not confirmed') {
          // User exists but hasn't verified email - try to resend OTP
          console.log('User email not confirmed, attempting to resend OTP');
          const resendResult = await authService.resendOtp(email);

          if (!resendResult.error) {
            console.log('Resent OTP to unconfirmed user from sign-in');
            // Store minimal data for OTP verification
            // Note: We don't have fullName, but we can update it later if needed
            tempSignupService.store({ email, password, fullName: '' });
            tempSignupService.markOtpSent();

            return {
              success: true,
              data: { email, isResend: true, fromSignIn: true },
              nextStep: 'verify-otp'
            };
          }

          // If resend failed (rate limited), show helpful message
          console.log('Resend OTP failed:', resendResult.error);
          return {
            success: false,
            error: "Your email hasn't been verified yet. Please go to Create Account to complete verification."
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      if (!user) {
        return {
          success: false,
          error: "Failed to sign in. Please try again."
        };
      }

      console.log('SignIn successful, determining next step...');

      // Determine where user should go next
      const nextStep = await onboardingStateHelpers.determineOnboardingStep(user.id);

      if (!nextStep) {
        // User completed onboarding
        return {
          success: true,
          nextStep: 'complete',
          data: { userId: user.id }
        };
      }

      return {
        success: true,
        nextStep: nextStep as any,
        data: { userId: user.id }
      };

    } catch (error: any) {
      console.log('SignIn catch error:', error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred during signin."
      };
    }
  },

  /**
   * Handle user sign up with email and password - New approach using OTP without creating user first
   */
  handleSignUp: async (email: string, password: string, fullName: string): Promise<AuthResult> => {
    console.log('=== SIGNUP FUNCTION START (NEW APPROACH) ===');
    console.log('Email:', email);

    try {
      // Check if user already exists in profiles (should work with fixed RLS policy)
      // Note: This may fail if RLS policy doesn't allow anonymous access
      // We'll handle this gracefully and let Supabase auth handle duplicate detection
      try {
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .eq('email', email)
          .maybeSingle(); // Returns null if no rows found (no error)

        if (existingProfile) {
          console.log('User already exists in profiles:', existingProfile);
          // User has a profile, which means they completed OTP verification
          // They should sign in instead
          return {
            success: false,
            error: "An account with this email already exists. Please sign in instead. If you're having trouble accessing your account, please contact support."
          };
        }

        // If profile check fails due to RLS or other errors, log but continue
        // Let Supabase auth handle duplicate detection instead
        if (profileError) {
          console.warn('Profile check failed, continuing with signup:', profileError.message);
          // Continue with signup - Supabase will catch duplicates
        }
      } catch (profileCheckError) {
        // Unexpected errors - log and continue
        console.warn('Profile check failed with exception, continuing with signup:', profileCheckError);
        // Supabase auth will handle duplicate detection
      }

      // Store signup data temporarily
      tempSignupService.store({
        email,
        password,
        fullName
      });

      // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
      const { user, error } = await authService.signUp({
        email,
        password,
        fullName
      });

      if (error) {
        console.log('SignUp error:', error);

        // Clean up temp data on error
        tempSignupService.clear();

        // Handle rate limiting with specific guidance
        if (error.message.includes('Email rate limit exceeded') ||
            error.message.includes('rate limit') ||
            error.message.includes('429') ||
            error.message.includes('Too Many Requests')) {

          // Extract wait time if available
          const waitTimeMatch = error.message.match(/(\d+)\s*(seconds?|minutes?)/i);
          const waitTime = waitTimeMatch
            ? `${waitTimeMatch[1]} ${waitTimeMatch[2]}`
            : '60 seconds';

          return {
            success: false,
            error: `Rate limit exceeded. Supabase limits signup attempts to prevent abuse. Please wait ${waitTime} before trying again. If you already have an account, try signing in instead.`
          };
        }

        if (error.message.includes('User already registered') ||
            error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.message.includes('already been registered')) {
          // This might be an unconfirmed user - try to resend OTP
          console.log('User already exists error, attempting to resend OTP for unconfirmed user');
          const resendResult = await authService.resendOtp(email);

          if (!resendResult.error) {
            console.log('Resent OTP to existing unconfirmed user');
            // Store their data so they can complete verification
            tempSignupService.store({ email, password, fullName });
            tempSignupService.markOtpSent();

            return {
              success: true,
              data: { email, isResend: true },
              nextStep: 'verify-otp'
            };
          }

          // If resend failed, user is likely confirmed
          console.log('Resend OTP failed:', resendResult.error);
          return {
            success: false,
            error: "An account with this email already exists. Please sign in instead. If you believe this is an error, please contact support."
          };
        }

        if (error.message.includes('Invalid email')) {
          return {
            success: false,
            error: "Please enter a valid email address."
          };
        }

        if (error.message.includes('Password')) {
          return {
            success: false,
            error: "Password must be at least 6 characters long."
          };
        }

        return {
          success: false,
          error: "Failed to create account. Please try again."
        };
      }

      // Check if user already exists (Supabase returns user with empty identities array for existing users)
      if (user && (!user.identities || user.identities.length === 0)) {
        console.log('SignUp detected existing user (empty identities)');

        // This might be an unconfirmed user who needs to complete OTP verification
        // Try to resend OTP and allow them to continue
        const resendResult = await authService.resendOtp(email);

        if (!resendResult.error) {
          console.log('Resent OTP to existing unconfirmed user');
          // Store their data so they can complete verification
          tempSignupService.store({ email, password, fullName });
          tempSignupService.markOtpSent();

          return {
            success: true,
            data: { email, isResend: true },
            nextStep: 'verify-otp'
          };
        }

        // If resend failed, user is likely confirmed - tell them to sign in
        console.log('Resend OTP failed, user is likely confirmed:', resendResult.error);
        tempSignupService.clear();
        return {
          success: false,
          error: "An account with this email already exists. Please sign in instead. If you're having trouble accessing your account, please contact support."
        };
      }

      // Mark OTP as sent
      tempSignupService.markOtpSent();

      console.log('OTP sent successfully');

      return {
        success: true,
        data: { email },
        nextStep: 'verify-otp'
      };

    } catch (error: any) {
      console.log('SignUp catch error:', error);
      tempSignupService.clear();
      return {
        success: false,
        error: error.message || "An unexpected error occurred during signup."
      };
    }
  },

  /**
   * Handle OTP verification - Verifies email confirmation code
   */
  handleOtpVerification: async (email: string, otpCode: string): Promise<AuthResult> => {
    if (!otpCode || !email) {
      return {
        success: false,
        error: "Email and verification code are required"
      };
    }

    try {
      // Get temporary signup data (has fullName)
      const tempData = tempSignupService.get();
      if (!tempData || tempData.email !== email) {
        return {
          success: false,
          error: "Verification session expired. Please sign up again."
        };
      }

      // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
      const { user: verifyUser, error: verifyError } = await authService.verifyOtp(email, otpCode);

      if (verifyError) {
        // Don't clear temp data on error - user should be able to retry
        if (verifyError.message.includes('expired')) {
          return {
            success: false,
            error: "Verification code has expired. Please request a new code."
          };
        }

        return {
          success: false,
          error: "Invalid verification code. Please check the code and try again."
        };
      }

      // User is now verified and logged in
      if (verifyUser) {
        console.log('Email verified successfully for user:', verifyUser.id);

        // Update profile with full name (only if we have one - sign-in flow may not have fullName)
        if (tempData.fullName) {
          // @ts-ignore - Supabase types issue with update
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ full_name: tempData.fullName })
            .eq('id', verifyUser.id);

          if (profileError) {
            console.error('Error updating profile with full name:', profileError);
          }
        }

        // Clear temporary data
        tempSignupService.clear();

        return {
          success: true,
          data: { userId: verifyUser.id },
          nextStep: 'organization'
        };
      }

      tempSignupService.clear();
      return {
        success: false,
        error: "Verification failed. Please try again."
      };

    } catch (error: any) {
      console.error('OTP verification error:', error);
      tempSignupService.clear();
      return {
        success: false,
        error: error.message || "An error occurred during verification."
      };
    }
  },

  /**
   * Resend OTP verification code
   */
  handleResendOtp: async (email: string): Promise<AuthResult> => {
    if (!email) {
      return {
        success: false,
        error: "Email is required"
      };
    }

    try {
      // Verify temp signup data exists
      const tempData = tempSignupService.get();
      if (!tempData || tempData.email !== email) {
        return {
          success: false,
          error: "Session expired. Please sign up again."
        };
      }

      const { error } = await authService.resendOtp(email);

      if (error) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          return {
            success: false,
            error: "Too many requests. Please wait a minute before requesting another code."
          };
        }

        return {
          success: false,
          error: "Failed to resend code. Please try again."
        };
      }

      return {
        success: true,
        data: { message: "Verification code resent successfully" }
      };
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      return {
        success: false,
        error: error.message || "An error occurred while resending the code."
      };
    }
  },

  /**
   * Handle profile setup - now only handles full_name
   */
  handleProfileSetup: async ({ userId, fullName }: ProfileSetupData): Promise<AuthResult> => {
    if (!fullName || !userId) {
      return {
        success: false,
        error: "Full name and user ID are required"
      };
    }

    try {
    console.log('Profile setup: updating full_name for userId:', userId);

    // ✅ v3.0.0: Use authService instead of direct supabase.auth calls
    const authUser = await authService.getCurrentUser();
    if (!authUser) {
      return { success: false, error: "Failed to fetch user email" };
    }

    // Upsert profile including email
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: authUser.email, // include email from auth
        full_name: sanitizeInput.string(fullName),
        updated_at: new Date().toISOString()
      } as any, { onConflict: 'id' });

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile updated successfully');

      // Complete profile step and move to organization
      await onboardingStateHelpers.completeStep(
        userId,
        'profile',
        'organization',
        { fullName }
      );

      return {
        success: true,
        nextStep: 'organization'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  handleOrganizationSetup: async ({ userId, choice }: OrganizationSetupData): Promise<AuthResult> => {
    if (!choice.type || !userId) {
      return { success: false, error: "Organization choice and user ID are required" };
    }

    try {
      // Get industry and foundVia from choice, with fallbacks
      const industry = choice.industry || null;
      const foundVia = choice.foundVia || null;

      if (!choice.orgName) {
        return { success: false, error: "Organization name is required" };
      }

      // Rate limiting
      const rateLimitCheck = await OrganizationCreationLimiter.canCreateOrganization(userId);
      if (!rateLimitCheck.allowed) {
        await OrganizationCreationLimiter.logCreationAttempt(userId, 'Rate_Limited');
        return { success: false, error: rateLimitCheck.reason || "Rate limit exceeded" };
      }

      // --- Transaction-safe insert via RPC function ---
      console.log('🏢 [DEBUG] Creating organization with RPC:', {
        orgName: choice.orgName,
        userId,
        industry,
        foundVia
      });

      const orgPrefix = generateOrgPrefix(choice.orgName);

      const { data: orgData, error: rpcError } = await supabase.rpc('create_org_with_owner', {
        org_name: sanitizeInput.string(choice.orgName),
        found_via: foundVia,
        industry: industry,
        owner_id: userId,
        org_prefix: orgPrefix
      } as any);

      if (rpcError) {
        console.error('🏢 [DEBUG] RPC Error:', rpcError);
        await OrganizationCreationLimiter.logCreationAttempt(userId, 'Failed', undefined, rpcError.message);
        throw rpcError;
      }

      const organizationId = orgData[0].org_id;
      console.log('🏢 [DEBUG] Organization created successfully:', {
        organizationId,
        userId,
        orgData
      });

      // Verify membership was created
      const { data: membershipCheck, error: membershipCheckError } = await supabase
        .from('memberships')
        .select('id, user_id, organization_id, role, status')
        .eq('user_id', userId)
        .eq('organization_id', organizationId);

      console.log('🏢 [DEBUG] Membership verification:', {
        userId,
        organizationId,
        membershipExists: !!membershipCheck && membershipCheck.length > 0,
        membershipData: membershipCheck,
        error: membershipCheckError
      });

      // Log success
      await OrganizationCreationLimiter.logCreationAttempt(userId, 'Success');

      // Note: Trial enrollment moved to company-info step completion

      // Complete onboarding step
      await onboardingStateHelpers.completeStep(
        userId,
        'organization',
        'company-info',
        choice
      );

      return {
        success: true,
        data: {
          organizationName: choice.orgName,
          organizationId
        },
        nextStep: 'company-info'
      };
    } catch (error: any) {
      console.error('Organization setup error:', error);
      return { success: false, error: error.message };
    }
  }
};