/**
 * Email Service
 *
 * Handles sending emails via Supabase Edge Functions
 */

import { supabase } from '@/integrations/supabase/client';

export interface DemoRequestData {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  hearAboutUs: string;
  message: string;
  agreeToUpdates: boolean;
}

/**
 * Send a demo request email
 *
 * @param data - Demo request form data
 * @returns Promise with success status
 */
export async function sendDemoRequestEmail(data: DemoRequestData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('demo-email', {
      body: data,
    });

    if (error) {
      console.error('Error invoking send-demo-email function:', error);
      return {
        success: false,
        error: error.message || 'Failed to send demo request email'
      };
    }

    if (!responseData?.success) {
      console.error('Email sending failed:', responseData);
      return {
        success: false,
        error: responseData?.error || 'Failed to send demo request email'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error sending demo request email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}
