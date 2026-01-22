/**
 * Add Contact Tool
 *
 * Creates a new contact (customer/prospect) in the organization's contact list.
 */

import { createTool } from './toolRegistry.ts';
import type { RegisteredTool, ToolContext, ToolResult } from './types.ts';

interface AddContactParams {
  full_name: string;
  email?: string;
  phone?: string;
  phone_type?: string;
  company_name?: string;
  contact_type?: string;
  address?: string;
  notes?: string;
}

// Valid contact types
const CONTACT_TYPES = [
  'Customer',
  'Employee',
  'Salesperson',
  'Vendor',
  'Contractor',
  'Architect',
  'Designer',
  'Engineer',
  'Manufacturer',
  'Business',
  'Supplier',
  'Lead',
  'Other',
] as const;

// Valid phone types
const PHONE_TYPES = ['Mobile', 'Business', 'Home', 'Fax', 'Other'] as const;

export const addContactTool: RegisteredTool = createTool({
  definition: {
    type: 'function',
    function: {
      name: 'add_contact',
      description:
        'Add a new contact to the organization contact list. Use when user wants to save a new customer, client, vendor, contractor, or other business contact.',
      parameters: {
        type: 'object',
        properties: {
          full_name: {
            type: 'string',
            description: 'Full name of the contact (required)',
          },
          email: {
            type: ['string', 'null'],
            description: 'Email address of the contact',
          },
          phone: {
            type: ['string', 'null'],
            description: 'Phone number of the contact',
          },
          phone_type: {
            type: ['string', 'null'],
            enum: ['Mobile', 'Business', 'Home', 'Fax', 'Other', null as any],
            description: 'Type of phone number (Mobile, Business, Home, Fax, Other)',
          },
          company_name: {
            type: ['string', 'null'],
            description: 'Company or organization the contact works for',
          },
          contact_type: {
            type: ['string', 'null'],
            enum: [
              'Customer',
              'Employee',
              'Salesperson',
              'Vendor',
              'Contractor',
              'Architect',
              'Designer',
              'Engineer',
              'Manufacturer',
              'Business',
              'Supplier',
              'Lead',
              'Other',
              null as any,
            ],
            description: 'Type/category of contact (Customer, Vendor, Contractor, etc.)',
          },
          address: {
            type: ['string', 'null'],
            description: 'Address of the contact',
          },
          notes: {
            type: ['string', 'null'],
            description: 'Additional notes about the contact',
          },
        },
        required: ['full_name'],
        additionalProperties: false,
      },
    },
  },
  metadata: {
    requiresConfirmation: true,
    requiresProposalId: false,
    category: 'communication',
  },
  execute: async (params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
    const { supabase, organizationId, userId } = context;
    const contactParams = params as unknown as AddContactParams;

    console.log('[add_contact] Creating new contact:', contactParams.full_name);

    // Build contact data
    const contactData: Record<string, unknown> = {
      organization_id: organizationId,
      created_by: userId,
      full_name: contactParams.full_name,
      emails: contactParams.email ? [contactParams.email] : [],
      is_in_organization: false,
    };

    // Add phone if provided
    if (contactParams.phone) {
      const phoneType = contactParams.phone_type && PHONE_TYPES.includes(contactParams.phone_type as typeof PHONE_TYPES[number])
        ? contactParams.phone_type
        : 'Business';
      contactData.phones = [{ number: contactParams.phone, type: phoneType }];
    }

    // Add optional fields
    if (contactParams.company_name) {
      contactData.company_name = contactParams.company_name;
    }
    if (contactParams.contact_type && CONTACT_TYPES.includes(contactParams.contact_type as typeof CONTACT_TYPES[number])) {
      contactData.contact_type = contactParams.contact_type;
    }
    if (contactParams.address) {
      contactData.addresses = [contactParams.address];
    }
    if (contactParams.notes) {
      contactData.notes = contactParams.notes;
    }

    const { data: contact, error: createError } = await supabase
      .from('contacts')
      .insert(contactData)
      .select('id, full_name, company_name')
      .single();

    if (createError) {
      console.error('[add_contact] Failed to create contact:', createError);
      return {
        success: false,
        error: `Failed to create contact: ${createError.message}`,
      };
    }

    const displayName = contact.company_name
      ? `${contact.full_name} (${contact.company_name})`
      : contact.full_name;

    return {
      success: true,
      data: {
        id: contact.id,
        title: displayName,
        type: 'contact',
      },
    };
  },
});
