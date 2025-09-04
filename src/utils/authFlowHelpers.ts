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
      console.log('Profile setup: updating full_name for userId:', userId, 'fullName:', fullName);
      
      // Update the existing profile with full name (profile was created by trigger)
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: sanitizeInput.string(fullName)
        })
        .eq('id', userId)
        .select()
        .single();

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
        
        // Create organization using the userId from signup
        const orgCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        console.log('Creating organization with userId:', userId);
        
        // Insert organization without immediate SELECT to avoid RLS policy conflict
        const { error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: sanitizeInput.string(choice.orgName),
            organization_code: orgCode,
            organization_info: {} // Initialize with empty object
          });

        if (orgError) {
          console.error('Organization creation error:', orgError);
          throw orgError;
        }

        console.log('Organization created successfully with code:', orgCode);

        // Since we can't immediately SELECT the organization due to RLS policy,
        // we'll skip linking the organization_id for now and let the user refresh
        // or we'll update the profile in a separate step
        
        // First, get the current profile to preserve full_name
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching current profile:', fetchError);
          throw fetchError;
        }

        // Update profile status and role (without organization_id for now)
        console.log('Updating profile for org creator with status: active');
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({
            role: 'admin',
            status: 'active', 
            full_name: currentProfile?.full_name // Preserve the full_name
          })
          .eq('id', userId)
          .select()
          .single();

        console.log('Profile updated after org creation:', updatedProfile);

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

        if (!orgData || !orgData.length || !orgData[0]) {
          throw new Error("Organization not found. Please check the code and try again.");
        }

        // Update profile with organization as pending member
        const organizationId = orgData[0]?.id;
        if (!organizationId) {
          throw new Error("Organization ID not found. Please check the code and try again.");
        }

        // First, get the current profile to preserve full_name
        const { data: currentProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching current profile for join:', fetchError);
          throw fetchError;
        }

        console.log('Updating profile for org joiner with status: pending');
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({
            organization_id: organizationId,
            role: 'member',
            status: 'pending',
            full_name: currentProfile?.full_name // Preserve the full_name
          })
          .eq('id', userId)
          .select()
          .single();

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