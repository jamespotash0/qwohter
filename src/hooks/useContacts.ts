/**
 * useContacts Hook
 *
 * Custom hook for managing customer/prospect contacts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsService } from '@/services/contactsService';
import type { Contact, CreateContactInput, UpdateContactInput } from '@/lib/types/contacts';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/lib/realtimeSubscriptions';

/**
 * Fetch all contacts for an organization
 * Includes realtime for collaborative proposal creation
 */
export const useContacts = (organizationId: string | undefined) => {
  useRealtimeSubscription(
    'contacts',
    ['contacts', organizationId || ''],
    { filter: `organization_id=eq.${organizationId}` },
    !!organizationId
  );

  return useQuery({
    queryKey: ['contacts', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return contactsService.getContacts(organizationId);
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

/**
 * Fetch a single contact by ID
 */
export const useContact = (contactId: string | undefined) => {
  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => {
      if (!contactId) throw new Error('Contact ID is required');
      return contactsService.getContactById(contactId);
    },
    enabled: !!contactId,
  });
};

/**
 * Search contacts
 */
export const useSearchContacts = (
  organizationId: string | undefined,
  query: string
) => {
  return useQuery({
    queryKey: ['contacts', 'search', organizationId, query],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return contactsService.searchContacts(organizationId, query);
    },
    enabled: !!organizationId && query.length > 0,
  });
};

/**
 * Create a new contact
 */
export const useCreateContact = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateContactInput) =>
      contactsService.createContact(organizationId, input),
    onSuccess: (newContact: Contact) => {
      // Invalidate contacts query to refetch
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });

      toast({
        title: 'Contact Created',
        description: `${newContact.full_name} has been added to your contacts.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Creating Contact',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Update an existing contact
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      contactId,
      input,
    }: {
      contactId: string;
      input: UpdateContactInput;
    }) => contactsService.updateContact(contactId, input),
    onSuccess: (updatedContact: Contact) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['contacts', updatedContact.organization_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['contact', updatedContact.id],
      });

      toast({
        title: 'Contact Updated',
        description: `${updatedContact.full_name} has been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Contact',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Delete a contact
 */
export const useDeleteContact = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (contactId: string) =>
      contactsService.deleteContact(contactId),
    onSuccess: () => {
      // Invalidate contacts query to refetch
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });

      toast({
        title: 'Contact Deleted',
        description: 'The contact has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Contact',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

/**
 * Bulk delete multiple contacts
 */
export const useBulkDeleteContacts = (organizationId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (contactIds: string[]) =>
      contactsService.bulkDeleteContacts(contactIds),
    onSuccess: (_, contactIds) => {
      // Invalidate contacts query to refetch
      queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });

      toast({
        title: 'Contacts Deleted',
        description: `${contactIds.length} contact${contactIds.length === 1 ? '' : 's'} have been removed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Deleting Contacts',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
