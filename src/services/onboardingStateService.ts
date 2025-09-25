/**
 * Onboarding State Tracking Service
 *
 * Manages user onboarding progress to allow resume/continuation of incomplete flows
 */

import { supabase } from "@/integrations/supabase/client";

export interface OnboardingSessionData {
  fullName?: string;
  orgChoice?: 'join' | 'create';
  orgName?: string;
  orgCode?: string;
  industry?: string;
  foundVia?: string;
  companyPhone?: string;
  companyFax?: string;
  companyAddress?: string;
  companyWebsite?: string;
  quoteStartingPoint?: string;
}

export interface OnboardingProgress {
  id: string;
  user_id: string;
  current_step: string;
  completed_steps: string[];
  session_data: OnboardingSessionData;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export const onboardingStateHelpers = {
  /**
   * Save current onboarding progress and form data
   */
  saveOnboardingProgress: async (
    userId: string,
    step: string,
    sessionData?: OnboardingSessionData
  ): Promise<void> => {
    try {
      // For steps before authentication (verify-otp), save to localStorage
      if (step === 'verify-otp') {
        const localData = {
          userId,
          step,
          sessionData: sessionData || {},
          timestamp: Date.now()
        };
        localStorage.setItem('temp_onboarding_progress', JSON.stringify(localData));
        console.log('Onboarding progress saved to localStorage:', { userId, step, sessionData });
        return;
      }

      // For authenticated steps, save to database
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h expiry

      const { error } = await supabase
        .from('user_onboarding_progress')
        .upsert({
          user_id: userId,
          current_step: step,
          session_data: sessionData || {},
          updated_at: new Date().toISOString(),
          expires_at: expiresAt
        } as any, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Failed to save onboarding progress:', error);
        throw error;
      }

      console.log('Onboarding progress saved to database:', { userId, step, sessionData });
    } catch (error) {
      console.error('Error in saveOnboardingProgress:', error);
      throw error;
    }
  },

  /**
   * Get user's current onboarding progress
   */
  getOnboardingProgress: async (userId: string): Promise<OnboardingProgress | null> => {
    try {
      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found - user hasn't started onboarding or completed it
          return null;
        }
        console.error('Error fetching onboarding progress:', error);
        throw error;
      }

      // Check if progress has expired
      if (data && new Date(data.expires_at) < new Date()) {
        console.log('Onboarding progress expired, cleaning up');
        await onboardingStateHelpers.clearOnboardingProgress(userId);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getOnboardingProgress:', error);
      return null;
    }
  },

  /**
   * Mark a step as completed and move to next step
   */
  completeStep: async (
    userId: string,
    completedStep: string,
    nextStep: string,
    sessionData?: OnboardingSessionData
  ): Promise<void> => {
    try {
      // Get current progress
      const current = await onboardingStateHelpers.getOnboardingProgress(userId);

      const completedSteps = [...(current?.completed_steps || [])];

      // Add current step to completed if not already there
      if (!completedSteps.includes(completedStep)) {
        completedSteps.push(completedStep);
      }

      const { error } = await supabase
        .from('user_onboarding_progress')
        .update({
          current_step: nextStep,
          completed_steps: completedSteps,
          session_data: sessionData || current?.session_data || {},
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to complete step:', error);
        throw error;
      }

      console.log('Step completed:', { userId, completedStep, nextStep });
    } catch (error) {
      console.error('Error in completeStep:', error);
      throw error;
    }
  },

  /**
   * Update session data without changing step
   */
  updateSessionData: async (
    userId: string,
    sessionData: OnboardingSessionData
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('user_onboarding_progress')
        .update({
          session_data: sessionData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to update session data:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in updateSessionData:', error);
      throw error;
    }
  },

  /**
   * Clear onboarding progress (when user completes onboarding)
   */
  clearOnboardingProgress: async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('user_onboarding_progress')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to clear onboarding progress:', error);
        throw error;
      }

      console.log('Onboarding progress cleared for user:', userId);
    } catch (error) {
      console.error('Error in clearOnboardingProgress:', error);
      throw error;
    }
  },

  /**
   * Check if user has completed onboarding (has active membership)
   */
  isOnboardingComplete: async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'Active')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No membership found
          return false;
        }
        console.error('Error checking onboarding completion:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in isOnboardingComplete:', error);
      return false;
    }
  },

  /**
   * Get onboarding step for a user based on their current state
   */
  determineOnboardingStep: async (userId: string): Promise<string | null> => {
    try {
      // Check if user completed onboarding
      const isComplete = await onboardingStateHelpers.isOnboardingComplete(userId);
      if (isComplete) {
        return null; // Onboarding complete
      }

      // Check if user has saved progress
      const progress = await onboardingStateHelpers.getOnboardingProgress(userId);
      if (progress) {
        return progress.current_step;
      }

      // Check user profile completion
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        return 'profile'; // Start with profile setup
      }

      if (!profile.full_name) {
        return 'profile';
      }

      // Profile exists, check memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (membershipError || !memberships) {
        return 'organization'; // Need to set up organization
      }

      // Has membership but might need company info
      return 'company-info';
    } catch (error) {
      console.error('Error determining onboarding step:', error);
      return 'profile'; // Default to profile step
    }
  },

  /**
   * Clean up expired onboarding records (can be called periodically)
   */
  cleanupExpiredRecords: async (): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('user_onboarding_progress')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning up expired records:', error);
        return 0;
      }

      const cleanedCount = data?.length || 0;
      console.log(`Cleaned up ${cleanedCount} expired onboarding records`);
      return cleanedCount;
    } catch (error) {
      console.error('Error in cleanupExpiredRecords:', error);
      return 0;
    }
  }
};