/**
 * React Query Hooks for Document Number Sequences
 *
 * Server state management for organization-level document numbering.
 * Allows organizations to configure number sequences for different document types.
 *
 * Usage:
 * ```typescript
 * const { data: sequences } = useDocumentSequences(organizationId);
 * const updateSequence = useUpdateDocumentSequence();
 * ```
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DocumentType } from '@/stores/forms/formsStore';

// ============================================================================
// Types
// ============================================================================

export interface DocumentNumberSequence {
  id: string;
  organization_id: string;
  document_type: DocumentType;
  prefix: string;
  current_number: number;
  padding: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSequenceData {
  organization_id: string;
  document_type: DocumentType;
  prefix?: string;
  current_number?: number;
  padding?: number;
}

export interface UpdateSequenceData {
  prefix?: string;
  current_number?: number;
  padding?: number;
}

// Default prefixes for each document type
export const DEFAULT_PREFIXES: Record<DocumentType, string> = {
  quote: 'Q-',
  invoice: 'INV-',
  service_request: 'SR-',
  estimate: 'EST-',
  proposal: 'P-',
};

// ============================================================================
// Query Keys
// ============================================================================

export const documentSequenceQueryKeys = {
  all: ['documentSequences'] as const,
  lists: () => [...documentSequenceQueryKeys.all, 'list'] as const,
  list: (organizationId: string) => [...documentSequenceQueryKeys.lists(), organizationId] as const,
  details: () => [...documentSequenceQueryKeys.all, 'detail'] as const,
  detail: (organizationId: string, documentType: DocumentType) =>
    [...documentSequenceQueryKeys.details(), organizationId, documentType] as const,
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch all document number sequences for an organization
 */
async function fetchDocumentSequences(organizationId: string): Promise<DocumentNumberSequence[]> {
  const { data, error } = await supabase
    .from('document_number_sequences')
    .select('*')
    .eq('organization_id', organizationId)
    .order('document_type');

  if (error) {
    console.error('Error fetching document sequences:', error);
    throw new Error(`Failed to fetch document sequences: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single document sequence by org and type
 */
async function fetchDocumentSequence(
  organizationId: string,
  documentType: DocumentType
): Promise<DocumentNumberSequence | null> {
  const { data, error } = await supabase
    .from('document_number_sequences')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('document_type', documentType)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching document sequence:', error);
    throw new Error(`Failed to fetch document sequence: ${error.message}`);
  }

  return data;
}

/**
 * Create a new document number sequence
 */
async function createDocumentSequence(data: CreateSequenceData): Promise<DocumentNumberSequence> {
  const insertData = {
    organization_id: data.organization_id,
    document_type: data.document_type,
    prefix: data.prefix ?? DEFAULT_PREFIXES[data.document_type],
    current_number: data.current_number ?? 1000,
    padding: data.padding ?? 4,
  };

  const { data: result, error } = await supabase
    .from('document_number_sequences')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating document sequence:', error);
    throw new Error(`Failed to create document sequence: ${error.message}`);
  }

  return result;
}

/**
 * Update a document number sequence
 */
async function updateDocumentSequence(
  sequenceId: string,
  updates: UpdateSequenceData
): Promise<DocumentNumberSequence> {
  const { data, error } = await supabase
    .from('document_number_sequences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sequenceId)
    .select()
    .single();

  if (error) {
    console.error('Error updating document sequence:', error);
    throw new Error(`Failed to update document sequence: ${error.message}`);
  }

  return data;
}

/**
 * Upsert a document sequence (create if not exists, update if exists)
 */
async function upsertDocumentSequence(
  organizationId: string,
  documentType: DocumentType,
  updates: UpdateSequenceData
): Promise<DocumentNumberSequence> {
  // Check if sequence exists
  const existing = await fetchDocumentSequence(organizationId, documentType);

  if (existing) {
    return updateDocumentSequence(existing.id, updates);
  } else {
    return createDocumentSequence({
      organization_id: organizationId,
      document_type: documentType,
      ...updates,
    });
  }
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook: Fetch all document sequences for an organization
 */
export function useDocumentSequences(organizationId: string | undefined) {
  return useQuery({
    queryKey: documentSequenceQueryKeys.list(organizationId || '__pending__'),
    queryFn: () => {
      if (!organizationId) return [];
      return fetchDocumentSequences(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Fetch a single document sequence
 */
export function useDocumentSequence(
  organizationId: string | undefined,
  documentType: DocumentType
) {
  return useQuery({
    queryKey: documentSequenceQueryKeys.detail(organizationId || '__pending__', documentType),
    queryFn: () => {
      if (!organizationId) return null;
      return fetchDocumentSequence(organizationId, documentType);
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook: Create a new document sequence
 */
export function useCreateDocumentSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDocumentSequence,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: documentSequenceQueryKeys.list(data.organization_id),
      });
    },
  });
}

/**
 * Hook: Update a document sequence
 */
export function useUpdateDocumentSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sequenceId,
      organizationId,
      updates,
    }: {
      sequenceId: string;
      organizationId: string;
      updates: UpdateSequenceData;
    }) => {
      return updateDocumentSequence(sequenceId, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: documentSequenceQueryKeys.list(data.organization_id),
      });
    },
  });
}

/**
 * Hook: Upsert a document sequence (create or update)
 * Useful for settings pages where you want to save regardless of whether sequence exists
 */
export function useUpsertDocumentSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      documentType,
      updates,
    }: {
      organizationId: string;
      documentType: DocumentType;
      updates: UpdateSequenceData;
    }) => {
      return upsertDocumentSequence(organizationId, documentType, updates);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: documentSequenceQueryKeys.list(data.organization_id),
      });
    },
  });
}

/**
 * Utility: Format a preview of what the next document number will look like
 */
export function formatDocumentNumberPreview(
  prefix: string,
  number: number,
  padding: number
): string {
  return `${prefix}${String(number).padStart(padding, '0')}`;
}
