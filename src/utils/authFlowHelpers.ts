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
      console.log('Attempting sign in for:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        
        // Handle specific error cases
        if (error.message === 'Invalid login credentials') {
          return {
            success: false,
            error: "Invalid email or password. Please check your credentials or sign up if you don't have an account."
          };
        }
        
        throw error;
      }
      
      console.log('Sign in successful:', data);
      
      return {
        success: true,
        nextStep: 'complete'
      };
    } catch (error: any) {
      console.error('Sign in catch error:', error);
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
      console.log('Attempting sign up for:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });
      
      console.log('Sign up response:', { data, error });
      
      if (error) {
        console.error('Sign up error:', error);
        // Handle specific signup errors from Supabase
        if (error.message === 'User already registered') {
          return {
            success: false,
            error: "An account with this email already exists. Please sign in instead."
          };
        }
        if (error.message.includes('already registered')) {
          return {
            success: false,
            error: "An account with this email already exists. Please sign in instead."
          };
        }
        throw error;
      }
      
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
      console.log('Profile setup: updating full_name for userId:', userId, 'fullName:', fullName);
      
      // Use service role to bypass RLS during profile setup
      const { data, error } = await supabase.rpc('update_user_profile', {
        user_id: userId,
        full_name_value: sanitizeInput.string(fullName)
      });

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      console.log('Profile updated successfully:', data);

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
        
        // Create organization and link user in single atomic operation
        // Retry up to 3 times if organization code already exists
        let organizationData = null;
        let orgCode = '';
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts && !organizationData) {
          orgCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          console.log(`Creating organization with userId: ${userId}, attempt: ${attempts + 1}`);
          
          const { data, error: orgError } = await supabase.rpc('create_organization_and_link_user', {
            org_name: sanitizeInput.string(choice.orgName),
            org_code: orgCode,
            creator_user_id: userId
          });

          if (orgError) {
            // If organization code already exists, try again with new code
            if (orgError.message?.includes('Organization code already exists') && attempts < maxAttempts - 1) {
              console.log('Organization code conflict, retrying with new code...');
              attempts++;
              continue;
            }
            
            console.error('Organization creation error:', orgError);
            throw orgError;
          }
          
          organizationData = data;
          break;
        }

        console.log('Organization created successfully:', organizationData);

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

        if (!orgData || !orgData.length || !orgData[0]) {
          throw new Error("Organization not found. Please check the code and try again.");
        }

        // Update profile with organization as pending member
        const organizationId = orgData[0]?.id;
        if (!organizationId) {
          throw new Error("Organization ID not found. Please check the code and try again.");
        }

        console.log('Updating profile for org joiner with status: pending');
        const { data: updatedProfile, error: profileError } = await supabase.rpc('update_org_creator_profile', {
          user_id: userId,
          org_id: organizationId,
          role_value: 'member',
          status_value: 'pending'
        });

        console.log('Profile updated after org join:', updatedProfile);

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