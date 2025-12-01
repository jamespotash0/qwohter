/**
 * Email Service
 *
 * Handles sending emails via Supabase Edge Functions
 */

import { supabase } from '@/integrations/supabase/client';

export interface ContactUsData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

/**
 * Send a contact us email
 *
 * @param data - Contact form data
 * @returns Promise with success status
 */
export async function sendContactUsEmail(data: ContactUsData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data: responseData, error } = await supabase.functions.invoke('contact-us-email', {
      body: data,
    });

    if (error) {
      console.error('Error invoking contact-us function:', error);
      return {
        success: false,
        error: error.message || 'Failed to send contact form'
      };
    }

    if (!responseData?.success) {
      console.error('Email sending failed:', responseData);
      return {
        success: false,
        error: responseData?.error || 'Failed to send contact form'
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error sending contact form:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}
