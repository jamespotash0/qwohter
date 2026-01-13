/**
 * useCheckGoogleDoc Hook
 *
 * Checks if a Google Doc exists and is accessible via the Drive API.
 * Used to detect deleted/inaccessible documents and auto-unlink them.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CheckDocResult {
  exists: boolean;
  accessible: boolean;
  error?: string;
}

/**
 * Check if a Google Doc exists by calling a simple edge function
 * that uses the organization's Google OAuth token
 */
async function checkGoogleDoc(
  docId: string,
  organizationId: string
): Promise<CheckDocResult> {
  try {
    const { data, error } = await supabase.functions.invoke('check-google-doc', {
      body: { docId, organizationId },
    });

    if (error) {
      console.warn('[checkGoogleDoc] Function error:', error);
      return { exists: false, accessible: false, error: error.message };
    }

    return {
      exists: data?.exists ?? false,
      accessible: data?.accessible ?? false,
      error: data?.error,
    };
  } catch (err) {
    console.error('[checkGoogleDoc] Error:', err);
    return {
      exists: false,
      accessible: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Hook to check if a linked Google Doc still exists
 *
 * @param docId - The Google Doc ID to check
 * @param organizationId - Organization ID for OAuth token lookup
 * @param options - Query options
 */
export function useCheckGoogleDoc(
  docId: string | null | undefined,
  organizationId: string | undefined,
  options?: {
    enabled?: boolean;
    onNotFound?: () => void;
  }
) {
  return useQuery({
    queryKey: ['google-doc-check', docId, organizationId],
    queryFn: async () => {
      if (!docId || !organizationId) {
        return { exists: true, accessible: true }; // Skip check if no doc
      }
      return checkGoogleDoc(docId, organizationId);
    },
    enabled: !!docId && !!organizationId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: false, // Don't retry on failure
  });
}

export default useCheckGoogleDoc;
