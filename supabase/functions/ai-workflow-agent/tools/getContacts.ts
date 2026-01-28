/**
 * Get Contacts Tool
 *
 * Search and list contacts (read-only, no confirmation needed).
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface GetContactsParams {
  search_name?: string;
  contact_type?: string;
  company_name?: string;
  limit?: number;
}

interface PhoneNumber {
  number: string;
  type: string;
}

type ContactRow = {
  id: string;
  full_name: string;
  emails: string[];
  phones: PhoneNumber[] | null;
  company_name: string | null;
  contact_type: string | null;
  notes: string | null;
  created_at: string;
};

export const getContactsTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'get_contacts',
      description:
        'Search and list contacts. Use this when user asks for contact information like email addresses, phone numbers, or wants to look up a specific person. Can filter by name, company, or contact type (Customer, Vendor, Contractor, Architect, etc.).',
      parameters: {
        type: 'object',
        properties: {
          search_name: {
            type: ['string', 'null'],
            description: 'Search by contact name (partial match)',
          },
          contact_type: {
            type: ['string', 'null'],
            description: 'Filter by contact type (Customer, Vendor, Contractor, Architect, Designer, etc.)',
          },
          company_name: {
            type: ['string', 'null'],
            description: 'Filter by company name (partial match)',
          },
          limit: {
            type: ['number', 'null'],
            description: 'Maximum number of results (default 10, max 50)',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: false, // Read-only operation
    requiresProposalId: false,
    category: 'search',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId } = context;
    const searchParams = params as GetContactsParams;

    console.log('[get_contacts] Searching contacts:', { organizationId, ...searchParams });

    const resultLimit = Math.min(searchParams.limit || 10, 50);

    // Build query
    let query = supabase
      .from('contacts')
      .select('id, full_name, emails, phones, company_name, contact_type, notes, created_at')
      .eq('organization_id', organizationId)
      .order('full_name')
      .limit(resultLimit);

    // Apply filters
    if (searchParams.search_name) {
      query = query.ilike('full_name', `%${searchParams.search_name}%`);
    }

    if (searchParams.contact_type) {
      query = query.eq('contact_type', searchParams.contact_type);
    }

    if (searchParams.company_name) {
      query = query.ilike('company_name', `%${searchParams.company_name}%`);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('[get_contacts] Failed to fetch contacts:', error);
      return { success: false, error: `Failed to fetch contacts: ${error.message}` };
    }

    const typedContacts = (contacts ?? []) as ContactRow[];

    // Format results
    const formattedContacts = typedContacts.map(c => ({
      id: c.id,
      name: c.full_name,
      email: c.emails?.[0] || 'No email',
      allEmails: c.emails || [],
      phone: c.phones?.[0]?.number || 'No phone',
      allPhones: c.phones?.map(p => `${p.number} (${p.type})`) || [],
      company: c.company_name || '',
      type: c.contact_type || 'Contact',
      notes: c.notes || '',
    }));

    // Build summary
    let summary = `Found ${formattedContacts.length} contact${formattedContacts.length !== 1 ? 's' : ''}`;
    if (searchParams.search_name) summary += ` matching "${searchParams.search_name}"`;
    if (searchParams.contact_type) summary += ` of type "${searchParams.contact_type}"`;
    if (searchParams.company_name) summary += ` at company "${searchParams.company_name}"`;
    summary += '.';

    // Add details for small result sets
    if (formattedContacts.length > 0 && formattedContacts.length <= 5) {
      const details = formattedContacts.map(c =>
        `${c.name}${c.company ? ` (${c.company})` : ''}: ${c.email}${c.phone !== 'No phone' ? `, ${c.phone}` : ''}`
      ).join('; ');
      summary += ` ${details}`;
    }

    return {
      success: true,
      data: {
        id: 'contacts-search',
        title: 'Contacts Search',
        type: 'contacts',
        count: formattedContacts.length,
        contacts: formattedContacts,
        summary,
      },
    };
  },
});
