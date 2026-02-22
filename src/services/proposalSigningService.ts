/**
 * Proposal Signing Service
 *
 * Handles e-signature operations for proposals:
 * - Sending proposals for signature
 * - Getting signing data for public signing page
 * - Submitting signatures
 * - Tracking signing activity
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface SigningToken {
  id: string;
  organization_id: string;
  proposal_id: string;
  access_token: string;
  client_email: string;
  client_name: string | null;
  client_company: string | null;
  status: 'Pending' | 'Viewed' | 'Signed' | 'Expired' | 'Revoked';
  unsigned_pdf_url: string | null;
  unsigned_pdf_path: string | null;
  sent_at: string;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  sent_by: string | null;
  created_at: string;
  updated_at: string;
  // Reminder fields
  reminder_config: { enabled: boolean; intervalDays: number; maxReminders: number } | null;
  last_reminder_sent_at: string | null;
  reminder_count: number;
}

export interface ProposalSignature {
  id: string;
  organization_id: string;
  proposal_id: string;
  signing_token_id: string | null;
  signer_name: string;
  signer_email: string;
  signer_company: string | null;
  signature_type: 'Draw' | 'Type';
  signature_data: string;
  signature_font: string | null;
  signed_pdf_url: string | null;
  signed_pdf_path: string | null;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SigningActivity {
  id: string;
  organization_id: string;
  proposal_id: string;
  signing_token_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SendForSignatureParams {
  proposalId: string;
  organizationId: string;
  clientEmail: string;
  clientName?: string;
  clientCompany?: string;
  expiresInDays?: number;
  /** Custom email subject (optional) */
  emailSubject?: string;
  /** Custom email body (optional) */
  emailBody?: string;
  /** App URL for signing link (auto-detected from window.location.origin) */
  appUrl?: string;
  /** Reminder configuration for unsigned proposals */
  reminderConfig?: {
    enabled: boolean;
    intervalDays: number;
    maxReminders: number;
  };
}

export interface SendForSignatureResult {
  success: boolean;
  signingTokenId?: string;
  signingUrl?: string;
  expiresAt?: string | null;
  error?: string;
  /** Whether the email was actually sent */
  emailSent?: boolean;
  /** Error message if email failed */
  emailError?: string | null;
}

export interface SigningPageData {
  proposal: {
    id: string;
    proposal_number: string;
    project_name: string;
  };
  organization: {
    id: string;
    name: string;
    logo_url?: string;
  };
  signingToken: {
    id: string;
    client_name: string | null;
    client_email: string;
    client_company: string | null;
    status: string;
    expires_at: string | null;
  };
  pdfUrl: string;
}

export interface SubmitSignatureParams {
  accessToken: string;
  signerName: string;
  signerEmail: string;
  signerCompany?: string;
  signatureType: 'draw' | 'type';
  signatureData: string; // Base64 PNG for draw, styled text for type
  signatureFont?: string;
}

export interface SubmitSignatureResult {
  success: boolean;
  signedPdfUrl?: string;
  error?: string;
}

// ============================================================================
// Send for Signature (Authenticated)
// ============================================================================

/**
 * Send a proposal for signature
 * Creates a signing token, exports PDF, and sends email to client
 */
export async function sendForSignature(
  params: SendForSignatureParams
): Promise<SendForSignatureResult> {
  try {
    // Auto-detect app URL from current origin (works for localhost and production)
    const bodyWithAppUrl = {
      ...params,
      appUrl: params.appUrl || window.location.origin,
    };

    const { data, error } = await supabase.functions.invoke('send-for-signature', {
      body: bodyWithAppUrl,
    });

    if (error) {
      console.error('[sendForSignature] Error:', error);
      return { success: false, error: error.message };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      signingTokenId: data.signingTokenId,
      signingUrl: data.signingUrl,
      expiresAt: data.expiresAt,
      emailSent: data.emailSent,
      emailError: data.emailError,
    };
  } catch (error) {
    console.error('[sendForSignature] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send for signature',
    };
  }
}

// ============================================================================
// Get Signing Data (Public - via token)
// ============================================================================

/**
 * Get data for the public signing page
 * This is called without authentication, using only the access token
 */
export async function getSigningData(accessToken: string): Promise<SigningPageData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('get-signing-data', {
      body: { accessToken },
    });

    if (error || data.error) {
      console.error('[getSigningData] Error:', error || data.error);
      return null;
    }

    return data as SigningPageData;
  } catch (error) {
    console.error('[getSigningData] Unexpected error:', error);
    return null;
  }
}

/**
 * Track when the signing page is viewed
 */
export async function trackSigningView(accessToken: string): Promise<void> {
  try {
    await supabase.functions.invoke('track-signing-view', {
      body: { accessToken },
    });
  } catch (error) {
    // Don't throw - view tracking is not critical
    console.error('[trackSigningView] Error:', error);
  }
}

// ============================================================================
// Submit Signature (Public - via token)
// ============================================================================

/**
 * Submit a signature on the public signing page
 * This embeds the signature in the PDF and updates the signing token status
 */
export async function submitSignature(
  params: SubmitSignatureParams
): Promise<SubmitSignatureResult> {
  try {
    // Map frontend params to edge function expected format
    // Edge function expects 'token', frontend uses 'accessToken'
    const { accessToken, ...rest } = params;
    const { data, error } = await supabase.functions.invoke('submit-signature', {
      body: { token: accessToken, ...rest },
    });

    if (error) {
      console.error('[submitSignature] Error:', error);
      return { success: false, error: error.message };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    return {
      success: true,
      signedPdfUrl: data.signedPdfUrl,
    };
  } catch (error) {
    console.error('[submitSignature] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit signature',
    };
  }
}

// ============================================================================
// Signing Token Management (Authenticated)
// ============================================================================

/**
 * Get all signing tokens for a proposal
 */
export async function getProposalSigningTokens(proposalId: string): Promise<SigningToken[]> {
  const { data, error } = await supabase
    .from('proposal_signing_tokens')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getProposalSigningTokens] Error:', error);
    throw new Error(`Failed to fetch signing tokens: ${error.message}`);
  }

  return (data || []) as SigningToken[];
}

/**
 * Revoke a signing token (prevents further signing)
 */
export async function revokeSigningToken(tokenId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('proposal_signing_tokens')
    .update({ status: 'Revoked' })
    .eq('id', tokenId);

  if (error) {
    console.error('[revokeSigningToken] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Stop reminders for a signing token (without revoking the signing link)
 */
export async function stopSigningReminders(tokenId: string): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from('proposal_signing_tokens') as any)
    .update({ reminder_config: { enabled: false, intervalDays: 0, maxReminders: 0 } })
    .eq('id', tokenId);

  if (error) {
    console.error('[stopSigningReminders] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Resend signing email
 */
export async function resendSigningEmail(tokenId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-signing-reminder', {
      body: { tokenId },
    });

    if (error || data?.error) {
      return { success: false, error: error?.message || data?.error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to resend email',
    };
  }
}

// ============================================================================
// Signatures (Authenticated)
// ============================================================================

/**
 * Get all signatures for a proposal
 */
export async function getProposalSignatures(proposalId: string): Promise<ProposalSignature[]> {
  const { data, error } = await supabase
    .from('proposal_signatures')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('signed_at', { ascending: false });

  if (error) {
    console.error('[getProposalSignatures] Error:', error);
    throw new Error(`Failed to fetch signatures: ${error.message}`);
  }

  return (data || []) as ProposalSignature[];
}

/**
 * Get all signatures for a proposal with fresh signed URLs
 * Use this when displaying signed PDFs - the stored URLs may have expired
 */
export async function getProposalSignaturesWithUrls(proposalId: string): Promise<ProposalSignature[]> {
  const signatures = await getProposalSignatures(proposalId);

  // Generate fresh signed URLs for each signature's PDF
  const signaturesWithUrls = await Promise.all(
    signatures.map(async (sig) => {
      if (!sig.signed_pdf_path) {
        return sig;
      }

      // Generate fresh signed URL (valid for 1 hour)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('proposal-documents')
        .createSignedUrl(sig.signed_pdf_path, 3600);

      if (urlError) {
        console.error('[getProposalSignaturesWithUrls] Error creating signed URL:', urlError);
        return sig;
      }

      return {
        ...sig,
        signed_pdf_url: signedUrlData.signedUrl,
      };
    })
  );

  return signaturesWithUrls;
}

// ============================================================================
// Activity Log (Authenticated)
// ============================================================================

/**
 * Get signing activity for a proposal
 */
export async function getSigningActivity(proposalId: string): Promise<SigningActivity[]> {
  const { data, error } = await supabase
    .from('proposal_signing_activity')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getSigningActivity] Error:', error);
    throw new Error(`Failed to fetch signing activity: ${error.message}`);
  }

  return (data || []) as SigningActivity[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a signing token is still valid (not expired, signed, or revoked)
 */
export function isTokenValid(token: SigningToken): boolean {
  if (token.status !== 'Pending' && token.status !== 'Viewed') {
    return false;
  }

  if (token.expires_at) {
    return new Date(token.expires_at) > new Date();
  }

  return true;
}

/**
 * Get the signing URL for a token
 */
export function getSigningUrl(accessToken: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/sign/${accessToken}`;
}
