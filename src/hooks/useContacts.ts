/**
 * useContacts Hook
 *
 * Custom hook for managing customer/prospect contacts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { contactsService } from '@/services/contactsService';
import type { Contact, CreateContactInput, UpdateContactInput } from '@/lib/types/contacts';
import { useToast } from '@/hooks/use-toast';

/**
 * Fetch all contacts for an organization with realtime updates
 */
export const useContacts = (organizationId: string | undefined) => {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    if (!organizationId) return;

    const channel = supabase
      .channel(`contacts:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Contacts realtime update:', payload);
          // Invalidate and refetch contacts when any change occurs
          queryClient.invalidateQueries({ queryKey: ['contacts', organizationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient]);

  return useQuery({
    queryKey: ['contacts', organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error('Organization ID is required');
      return contactsService.getContacts(organizationId);
    },
    enabled: !!organizationId,
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
