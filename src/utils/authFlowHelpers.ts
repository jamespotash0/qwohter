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
   * Auth-first approach: Try auth signin first, then check profile completion
   */
  handleSignIn: async (email: string, password: string): Promise<AuthResult> => {
    console.log('=== SIGNIN FUNCTION START (Auth-First) ===');
    console.log('Email:', email);
    
    try {
      // Try Supabase auth signin first - it's the authoritative system
      console.log('Attempting Supabase auth.signInWithPassword...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Supabase signIn response:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        error: error?.message 
      });
      
      if (error) {
        console.log('SignIn error:', error);
        
        if (error.message === 'Invalid login credentials') {
          // Check if user exists in Supabase Auth by trying with a different dummy password
          // This helps distinguish between "email doesn't exist" vs "wrong password"
          console.log('Checking if email exists in Supabase Auth...');
          
          try {
            const { error: testError } = await supabase.auth.signInWithPassword({
              email,
              password: 'definitely-wrong-password-12345'
            });
            
            console.log('Test signin result:', { testError: testError?.message });
            
            // If we get the same "Invalid login credentials" error, email exists - wrong password
            if (testError?.message === 'Invalid login credentials') {
              console.log('Email exists in auth - password incorrect');
              return {
                success: false,
                error: "Incorrect password. Please try again."
              };
            }
            
            // If we get a different error or success (!), email exists - wrong password  
            if (!testError || testError.message !== error.message) {
              console.log('Email exists in auth - password incorrect (different response)');
              return {
                success: false,
                error: "Incorrect password. Please try again."
              };
            }
            
          } catch (testErr) {
            console.log('Test signin failed:', testErr);
          }
          
          // If test failed in same way, likely email doesn't exist
          // But to be safe, check profiles table as secondary confirmation
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', email)
            .single();
            
          if (profile) {
            // Profile exists but signin failed - likely wrong password
            console.log('Profile exists but signin failed - wrong password');
            return {
              success: false,
              error: "Incorrect password. Please try again."
            };
          } else {
            // No profile and signin failed - likely email doesn't exist
            console.log('No profile found and signin failed - email likely doesn\'t exist');
            return {
              success: false,
              error: "No account found with this email. Please create an account first."
            };
          }
        }
        
        // Handle other auth errors
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

      console.log('SignIn successful, checking profile completion...');
      
      // Check if user completed onboarding
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, organization_id')
        .eq('id', data.user.id)
        .single();

      console.log('Profile completion check:', { 
        profileExists: !!profile, 
        hasFullName: !!profile?.full_name, 
        hasOrgId: !!profile?.organization_id,
        profileError: profileError?.message
      });

      // Profile doesn't exist yet - user needs to complete signup flow
      if (profileError || !profile) {
        console.log('Profile not found - resuming onboarding at profile step');
        return {
          success: true,
          nextStep: 'profile',
          data: { userId: data.user.id }
        };
      }

      // Profile exists but incomplete - determine next step
      if (!profile.full_name) {
        console.log('Profile missing full_name - resuming at profile step');
        return {
          success: true,
          nextStep: 'profile',
          data: { userId: data.user.id }
        };
      }
      
      if (!profile.organization_id) {
        console.log('Profile missing organization - resuming at organization step');
        return {
          success: true,
          nextStep: 'organization',
          data: { userId: data.user.id }
        };
      }

      // Profile is complete
      console.log('Profile complete - signin successful');
      return {
        success: true,
        nextStep: 'complete',
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
   * Handle user sign up with email and password
   * Auth-first approach: Check auth users first, then attempt signup
   */
  handleSignUp: async (email: string, password: string): Promise<AuthResult> => {
    console.log('=== SIGNUP FUNCTION START (Auth-First) ===');
    console.log('Email:', email);
    
    try {
      // First, do an explicit check if email exists by attempting a signin with dummy password
      // This is more reliable than relying on signup behavior which varies by Supabase config
      console.log('Pre-checking if email exists in Supabase Auth...');
      
      const { error: preCheckError } = await supabase.auth.signInWithPassword({
        email,
        password: 'intentionally-wrong-password-for-check-12345'
      });
      
      // If we get "Invalid login credentials", the email exists in auth system
      if (preCheckError?.message === 'Invalid login credentials') {
        console.log('Email already exists in Supabase Auth - blocking signup');
        return {
          success: false,
          error: "An account with this email already exists. Please sign in to complete your setup or continue where you left off."
        };
      }
      
      // If no error or different error, email might not exist - proceed with signup
      console.log('Pre-check complete, proceeding with signup. Pre-check result:', preCheckError?.message || 'no error');

      // Try Supabase auth signup
      console.log('Attempting Supabase auth.signUp...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });
      
      console.log('Supabase signUp response:', { 
        hasUser: !!data?.user, 
        userEmail: data?.user?.email,
        hasSession: !!data?.session,
        error: error?.message,
        errorCode: error?.status 
      });
      
      if (error) {
        console.log('SignUp error:', error);
        // Handle specific Supabase errors for better UX
        
        // Account already exists - direct user to sign in
        if (error.message.includes('User already registered') || 
            error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.message.includes('A user with this email address has already been registered')) {
          console.log('Account already exists in Supabase Auth');
          return {
            success: false,
            error: "An account with this email already exists. Please sign in to complete your setup or continue where you left off."
          };
        }
        
        // Rate limiting
        if (error.message.includes('Email rate limit exceeded') || 
            error.message.includes('rate limit')) {
          return {
            success: false,
            error: "Too many signup attempts. Please wait a few minutes and try again."
          };
        }
        
        // Invalid email format
        if (error.message.includes('Invalid email') || 
            error.message.includes('email')) {
          return {
            success: false,
            error: "Please enter a valid email address."
          };
        }
        
        // Password requirements
        if (error.message.includes('Password') || 
            error.message.includes('password')) {
          return {
            success: false,
            error: "Password must be at least 6 characters long."
          };
        }
        
        // Generic fallback
        return {
          success: false,
          error: error.message || "Failed to create account. Please try again."
        };
      }
      
      if (data.user) {
        console.log('SignUp returned user:', data.user.id);
        
        // Check if this is actually a new user or existing user
        // Some Supabase configs return existing users without error
        if (data.user.email_confirmed_at) {
          console.log('User email already confirmed - account exists');
          return {
            success: false,
            error: "An account with this email already exists and is verified. Please sign in instead."
          };
        }
        
        // Check if user was created recently (within last 10 seconds)
        const userCreatedAt = new Date(data.user.created_at || '');
        const tenSecondsAgo = new Date(Date.now() - 10000);
        
        if (userCreatedAt < tenSecondsAgo) {
          console.log('User was created earlier - likely existing account');
          return {
            success: false,
            error: "An account with this email already exists. Please sign in to complete your setup."
          };
        }
        
        console.log('SignUp successful, new user created:', data.user.id);
        return {
          success: true,
          data: { userId: data.user.id },
          nextStep: 'verify-otp'
        };
      }

      console.log('SignUp failed - no user returned');
      return {
        success: false,
        error: "Failed to create account. Please try again."
      };
    } catch (error: any) {
      console.log('SignUp catch error:', error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred during signup."
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