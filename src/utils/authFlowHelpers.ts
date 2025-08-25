/**
 * Authentication Flow Helper Utilities
 * 
 * Extracted from Auth.tsx to provide reusable authentication flow logic
 * including sign up, sign in, OTP verification, profile setup, and organization management
 */

import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput, authRateLimiter } from "@/utils/security";

export interface AuthResult {
  success: boolean;
  data?: any;
  error?: string;
  nextStep?: 'verify-otp' | 'profile' | 'organization' | 'complete';
}

export interface ProfileSetupData {
  userId: string;
  fullName: string;
}

export interface OrganizationChoice {
  type: 'join' | 'create';
  orgCode?: string;
  orgName?: string;
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
    // Rate limiting check
    if (!authRateLimiter.isAllowed(email)) {
      return {
        success: false,
        error: "Too many attempts. Please wait before trying again."
      };
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return {
        success: true,
        nextStep: 'complete'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Handle user sign up with email and password
   */
  handleSignUp: async (email: string, password: string): Promise<AuthResult> => {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(email)) {
      return {
        success: false,
        error: "Too many attempts. Please wait before trying again."
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      if (error) throw error;
      
      if (data.user) {
        return {
          success: true,
          data: { userId: data.user.id },
          nextStep: 'verify-otp'
        };
      }

      return {
        success: false,
        error: "Failed to create account"
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Handle OTP verification
   */
  handleOtpVerification: async (email: string, otpCode: string): Promise<AuthResult> => {
    if (!otpCode || !email) {
      return {
        success: false,
        error: "Email and verification code are required"
      };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (error) throw error;

      if (data.user) {
        return {
          success: true,
          data: { userId: data.user.id },
          nextStep: 'profile'
        };
      }

      return {
        success: false,
        error: "Failed to verify email"
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Handle profile setup
   */
  handleProfileSetup: async ({ userId, fullName }: ProfileSetupData): Promise<AuthResult> => {
    if (!fullName || !userId) {
      return {
        success: false,
        error: "Full name and user ID are required"
      };
    }

    try {
      // Update the existing profile with full name (profile was created by trigger)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: sanitizeInput.string(fullName)
        })
        .eq('id', userId);

      if (error) throw error;

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

  /**
   * Handle organization setup (create or join)
   */
  handleOrganizationSetup: async ({ userId, choice }: OrganizationSetupData): Promise<AuthResult> => {
    if (!choice.type || !userId) {
      return {
        success: false,
        error: "Organization choice and user ID are required"
      };
    }

    try {
      if (choice.type === "create") {
        if (!choice.orgName) {
          return {
            success: false,
            error: "Organization name is required"
          };
        }
        
        // Create organization using the userId from signup
        const orgCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        console.log('Creating organization with userId:', userId);
        
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: sanitizeInput.string(choice.orgName),
            organization_code: orgCode
          })
          .select()
          .single();

        if (orgError) {
          console.error('Organization creation error:', orgError);
          throw orgError;
        }

        console.log('Organization created successfully:', orgData);

        // Update profile with organization and set as owner
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: orgData.id,
            role: 'admin',
            status: 'active'
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw profileError;
        }

        return {
          success: true,
          data: { 
            organizationName: choice.orgName, 
            organizationCode: orgCode 
          },
          nextStep: 'complete'
        };
      } else {
        // Join existing organization
        if (!choice.orgCode) {
          return {
            success: false,
            error: "Organization code is required"
          };
        }
        
        // Find organization by code (trim whitespace and convert to uppercase)
        const cleanCode = choice.orgCode.trim().toUpperCase();
        console.log('Searching for organization with code:', cleanCode);
        
        const { data: orgData, error: orgError } = await supabase
          .rpc('get_organization_by_code', { input_code: cleanCode });

        console.log('Organization search result:', { orgData, orgError });

        if (orgError) {
          console.error('Organization search error:', orgError);
          // Handle specific error cases
          if (orgError.code === 'PGRST116') {
            throw new Error("Organization code not found. Please check the code and try again.");
          }
          throw new Error("Error searching for organization. Please try again.");
        }

        if (!orgData || !orgData.length) {
          throw new Error("Organization not found. Please check the code and try again.");
        }

        // Update profile with organization as pending member
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: orgData[0].id,
            role: 'member',
            status: 'pending'
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Profile update error:', profileError);
          throw profileError;
        }

        return {
          success: true,
          data: { organizationName: 'Organization' }, // Will be updated with proper name from RPC response
          nextStep: 'complete'
        };
      }
    } catch (error: any) {
      console.error('Organization setup error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};