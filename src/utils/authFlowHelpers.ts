/**
 * Authentication Flow Helper Utilities - Updated for New Schema
 *
 * Handles authentication flow with memberships table and state tracking
 */

import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/security";
import { onboardingStateHelpers } from "@/services/onboardingStateService";
import { OrganizationCreationLimiter } from "@/services/rateLimitingService";
import { tempSignupService } from "@/services/tempSignupService";

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
  type: 'join' | 'create';
  orgCode?: string;
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
      // Try Supabase auth signin
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('SignIn error:', error);

        if (error.message === 'Invalid login credentials') {
          return {
            success: false,
            error: "Invalid email or password. Please check your credentials and try again."
          };
        }

        if (error.message === 'Email not confirmed') {
          return {
            success: false,
            error: "Please check your email and click the verification link before signing in."
          };
        }

        return {
          success: false,
          error: error.message
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: "Failed to sign in. Please try again."
        };
      }

      console.log('SignIn successful, determining next step...');

      // Determine where user should go next
      const nextStep = await onboardingStateHelpers.determineOnboardingStep(data.user.id);

      if (!nextStep) {
        // User completed onboarding
        return {
          success: true,
          nextStep: 'complete',
          data: { userId: data.user.id }
        };
      }

      return {
        success: true,
        nextStep: nextStep as any,
        data: { userId: data.user.id }
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
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (existingProfile && !profileError) {
        console.log('User already exists in profiles:', existingProfile);
        return {
          success: false,
          error: "An account with this email already exists. Please sign in instead or use a different email address."
        };
      }

      // If profile check fails for reasons other than "not found", handle it
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile check error:', profileError);
        return {
          success: false,
          error: `Email verification failed: ${profileError.message}. Please try again.`
        };
      }

      // Store signup data temporarily
      tempSignupService.store({
        email,
        password,
        fullName
      });

      // Create user with email and password - this will send OTP automatically
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        console.log('SignUp error:', error);

        // Clean up temp data on error
        tempSignupService.clear();

        if (error.message.includes('User already registered') ||
            error.message.includes('already exists') ||
            error.message.includes('duplicate')) {
          return {
            success: false,
            error: "An account with this email already exists. Please sign in instead."
          };
        }

        if (error.message.includes('Email rate limit exceeded') ||
            error.message.includes('rate limit')) {
          return {
            success: false,
            error: "Too many signup attempts. Please wait a few minutes and try again."
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

      // Verify the OTP code (user was already created by signUp)
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (verifyError) {
        if (verifyError.message.includes('expired')) {
          tempSignupService.clear();
          return {
            success: false,
            error: "Verification code has expired. Please sign up again."
          };
        }

        return {
          success: false,
          error: "Invalid verification code. Please try again."
        };
      }

      // User is now verified and logged in
      if (verifyData.user) {
        console.log('Email verified successfully for user:', verifyData.user.id);

        // Update profile with full name (user was created by signUp, profile created by trigger)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: tempData.fullName
          })
          .eq('id', verifyData.user.id);

        if (profileError) {
          console.error('Error updating profile with full name:', profileError);
        }

        // Clear temporary data
        tempSignupService.clear();

        return {
          success: true,
          data: { userId: verifyData.user.id },
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

    // Fetch auth user to get their email
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
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

      if (choice.type === 'create') {
        if (!choice.orgName) {
          return { success: false, error: "Organization name is required" };
        }

        // Rate limiting
        const rateLimitCheck = await OrganizationCreationLimiter.canCreateOrganization(userId);
        if (!rateLimitCheck.allowed) {
          await OrganizationCreationLimiter.logCreationAttempt(userId, 'Rate_Limited');
          return { success: false, error: rateLimitCheck.reason || "Rate limit exceeded" };
        }

        // Generate unique org code
        let orgCode = '';
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
          orgCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('organization_code', orgCode)
            .single();
          if (!existingOrg) break;
          attempts++;
        }

        if (attempts >= maxAttempts) {
          await OrganizationCreationLimiter.logCreationAttempt(userId, 'Failed', undefined, 'Failed to generate unique org code');
          return { success: false, error: "Failed to generate organization code. Please try again." };
        }

        // --- Transaction-safe insert via RPC function ---
        const { data: orgData, error: rpcError } = await supabase.rpc('create_org_with_owner', {
          org_name: sanitizeInput.string(choice.orgName),
          org_code: orgCode,
          found_via: foundVia,
          industry: industry,
          owner_id: userId
        } as any);

        if (rpcError) {
          await OrganizationCreationLimiter.logCreationAttempt(userId, 'Failed', undefined, rpcError.message);
          throw rpcError;
        }

        const organizationId = orgData[0].org_id;

        // Log success
        await OrganizationCreationLimiter.logCreationAttempt(userId, 'Success');

        // Complete onboarding step
        await onboardingStateHelpers.completeStep(
          userId,
          'organization',
          'company-info',
          { ...choice, orgCode }
        );

        return {
          success: true,
          data: {
            organizationName: choice.orgName,
            organizationCode: orgCode,
            organizationId
          },
          nextStep: 'company-info'
        };

      } else {
        // Join existing organization
        if (!choice.orgCode) {
          return { success: false, error: "Organization code is required" };
        }

        const cleanCode = choice.orgCode.trim().toUpperCase();

        console.log('🔍 Looking for organization with code:', cleanCode);

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('organization_code', cleanCode)
          .single();

        if (orgError) {
          console.error('❌ Organization query error:', orgError);
          return {
            success: false,
            error: `Organization not found. Please check the code and try again. (Error: ${orgError.message})`
          };
        }

        if (!orgData) {
          console.log('⚠️ No organization found with code:', cleanCode);
          return { success: false, error: "Organization not found. Please check the code and try again." };
        }

        console.log('✅ Found organization:', orgData.name);

        const { error: membershipsError } = await supabase
          .from('memberships')
          .insert({
            user_id: userId,
            organization_id: orgData.id,
            role: 'Member',
            status: 'Pending'
          } as any);

        if (membershipsError) throw membershipsError;

        // Clear onboarding progress
        await onboardingStateHelpers.clearOnboardingProgress(userId);

        return {
          success: true,
          data: {
            organizationName: orgData.name,
            organizationId: orgData.id
          },
          nextStep: 'complete'
        };
      }
    } catch (error: any) {
      console.error('Organization setup error:', error);
      return { success: false, error: error.message };
    }
  }
};