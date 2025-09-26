/**
 * Organization code management utilities
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a new organization code
 */
export const generateOrganizationCode = (): string => {
  // Generate a random 8-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if organization code is unique
 */
export const isOrganizationCodeUnique = async (code: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('organization_code', code)
    .single();

  if (error && error.code === 'PGRST116') {
    // No rows found - code is unique
    return true;
  }

  // If data exists or there's another error, code is not unique
  return false;
};

/**
 * Generate a unique organization code
 */
export const generateUniqueOrganizationCode = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateOrganizationCode();
    const isUnique = await isOrganizationCodeUnique(code);

    if (isUnique) {
      return code;
    }

    attempts++;
  }

  throw new Error('Unable to generate unique organization code after multiple attempts');
};

/**
 * Regenerate organization code for an organization
 */
export const regenerateOrganizationCode = async (
  organizationId: string,
  currentUserRole: string
): Promise<{ newCode: string; invalidatedTokens: number }> => {
  // Check if user has permission (Admin or Owner)
  if (!['Admin', 'Owner'].includes(currentUserRole)) {
    throw new Error('Only administrators can regenerate organization codes');
  }

  // Generate new unique code
  const newCode = await generateUniqueOrganizationCode();

  // Start transaction
  const { data: updatedOrg, error: updateError } = await supabase
    .from('organizations')
    .update({
      organization_code: newCode,
      updated_at: new Date().toISOString()
    })
    .eq('id', organizationId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating organization code:', updateError);
    throw new Error('Failed to update organization code');
  }

  // Invalidate all existing invite tokens for this organization
  const { data: invalidatedTokens, error: tokenError } = await supabase
    .from('invite_tokens')
    .update({ is_used: true }) // Mark as used to invalidate
    .eq('organization_id', organizationId)
    .eq('is_used', false)
    .select('id');

  if (tokenError) {
    console.error('Error invalidating invite tokens:', tokenError);
    // Don't fail the operation if token invalidation fails
  }

  const invalidatedCount = invalidatedTokens?.length || 0;

  console.log(`Regenerated organization code: ${newCode}, invalidated ${invalidatedCount} tokens`);

  return {
    newCode,
    invalidatedTokens: invalidatedCount
  };
};

/**
 * Get organization code history/audit (if implemented)
 */
export const getOrganizationCodeHistory = async (organizationId: string) => {
  // This could be implemented with an audit table in the future
  // For now, just return current code info
  const { data, error } = await supabase
    .from('organizations')
    .select('organization_code, updated_at')
    .eq('id', organizationId)
    .single();

  if (error) {
    throw new Error('Failed to get organization code information');
  }

  return {
    currentCode: data.organization_code,
    lastUpdated: data.updated_at
  };
};