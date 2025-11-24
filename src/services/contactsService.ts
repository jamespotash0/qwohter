/**
 * Contacts Service
 *
 * Handles all operations related to customer/prospect contacts
 * (non-user accounts) for organizations
 */

import { supabase } from '@/integrations/supabase/client';
import type { Contact, CreateContactInput, UpdateContactInput } from '@/lib/types/contacts';

export class ContactsService {
  /**
   * Get all contacts for an organization
   */
  async getContacts(organizationId: string): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('full_name');

    if (error) {
      console.error('Failed to fetch contacts:', error);
      throw new Error(`Failed to fetch contacts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single contact by ID
   */
  async getContactById(contactId: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error) {
      console.error('Failed to fetch contact:', error);
      throw new Error(`Failed to fetch contact: ${error.message}`);
    }

    return data;
  }

  /**
   * Search contacts by name or email
   * Note: Searching in array fields requires different approach
   */
  async searchContacts(
    organizationId: string,
    query: string
  ): Promise<Contact[]> {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('full_name', `%${query}%`)
      .order('full_name')
      .limit(10);

    if (error) {
      console.error('Failed to search contacts:', error);
      throw new Error(`Failed to search contacts: ${error.message}`);
    }

    // Note: For searching within email arrays, consider implementing
    // a more advanced search on the client side after fetching
    return data || [];
  }

  /**
   * Create a new contact
   * Automatically links to team member if email matches
   */
  async createContact(
    organizationId: string,
    input: CreateContactInput
  ): Promise<Contact> {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if any of the contact's emails match an existing team member
    let linkedUserId: string | undefined;
    let isInOrganization = input.is_in_organization || false;

    if (input.emails && input.emails.length > 0) {
      const { data: members } = await supabase
        .from('memberships')
        .select('user_id, profiles(id, email)')
        .eq('organization_id', organizationId)
        .eq('status', 'Active');

      if (members && members.length > 0) {
        // Check if any contact email matches a member email
        for (const contactEmail of input.emails) {
          const matchingMember = members.find(
            (m: any) => m.profiles?.email?.toLowerCase() === contactEmail.toLowerCase()
          ) as { user_id: string; profiles: { id: string; email: string } } | undefined;

          if (matchingMember) {
            linkedUserId = matchingMember.user_id;
            isInOrganization = true;
            console.log(`Auto-linking contact to existing team member: ${matchingMember.user_id}`);
            break;
          }
        }
      }
    }

    // Build the insert object with proper typing
    const insertData: any = {
      organization_id: organizationId,
      created_by: user.id,
      ...input,
      is_in_organization: isInOrganization,
    };

    // Add user_id if we found a match
    if (linkedUserId) {
      insertData.user_id = linkedUserId;
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Failed to create contact:', error);
      throw new Error(`Failed to create contact: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing contact
   */
  async updateContact(
    contactId: string,
    input: UpdateContactInput
  ): Promise<Contact> {
    const updateData = {
      ...input,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', contactId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update contact:', error);
      throw new Error(`Failed to update contact: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a contact
   * Members can delete contacts in their organization (enforced by RLS)
   */
  async deleteContact(contactId: string): Promise<void> {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      console.error('Failed to delete contact:', error);

      // Check if it's a permission error
      if (error.code === 'PGRST301' || error.message.includes('policy')) {
        throw new Error('You do not have permission to delete contacts. Only active members can delete contacts.');
      }

      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  /**
   * Check if a contact email exists in the organization
   * Note: With emails as arrays, this checks if ANY contact has the email
   */
  async contactExists(
    organizationId: string,
    email: string
  ): Promise<boolean> {
    // Note: Postgres array contains operator @> can be used for this
    // For now, fetch all and check on client side
    const contacts = await this.getContacts(organizationId);

    return contacts.some(contact =>
      contact.emails.some(e => e.toLowerCase() === email.toLowerCase())
    );
  }
}

// Export singleton instance
export const contactsService = new ContactsService();
