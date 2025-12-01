/**
 * QuickBooks Online Service
 *
 * Handles OAuth authentication and API operations for QuickBooks Online
 */

import { supabase } from '@/integrations/supabase/client';
import type { Quote } from './quotesService';
import type {
  QBOnlineConnection,
  QBOnlineInvoice,
  QBOnlineInvoiceSync,
  QBOnlineCustomer,
  OAuthCallbackParams,
  InvoiceCreationResult,
} from '@/lib/types/integrations';

// ============================================================================
// Constants
// ============================================================================

const QB_OAUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QB_API_BASE_URL = 'https://quickbooks.api.intuit.com/v3/company';

// Environment variables (will be set in .env)
const QB_CLIENT_ID = import.meta.env.VITE_QB_CLIENT_ID || '';
const QB_REDIRECT_URI = import.meta.env.VITE_QB_REDIRECT_URI || '';

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * Generate OAuth authorization URL for QuickBooks Online
 */
export function generateOAuthUrl(organizationId: string): string {
  const state = btoa(JSON.stringify({
    organization_id: organizationId,
    nonce: crypto.randomUUID(),
  }));

  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID,
    scope: 'com.intuit.quickbooks.accounting',
    redirect_uri: QB_REDIRECT_URI,
    response_type: 'code',
    state,
  });

  return `${QB_OAUTH_URL}?${params.toString()}`;
}

/**
 * Handle OAuth callback and exchange code for tokens
 * This should be called from a Supabase Edge Function for security
 */
export async function handleOAuthCallback(
  params: OAuthCallbackParams,
  organizationId: string
): Promise<QBOnlineConnection> {
  // Call Edge Function to securely exchange code for tokens
  const { data, error } = await supabase.functions.invoke('quickbooks-online-oauth', {
    body: {
      code: params.code,
      realm_id: params.realmId,
      organization_id: organizationId,
    },
  });

  if (error) {
    console.error('OAuth callback error:', error);
    throw new Error(`OAuth failed: ${error.message}`);
  }

  return data.connection;
}

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Check if organization has QuickBooks Online connected
 */
export async function checkQBOnlineConnection(
  organizationId: string
): Promise<QBOnlineConnection | null> {
  const { data, error } = await supabase
    .from('quickbooks_online_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No rows returned
    throw error;
  }

  return data;
}

/**
 * Disconnect QuickBooks Online
 */
export async function disconnectQBOnline(organizationId: string): Promise<void> {
  const { error } = await supabase
    .from('quickbooks_online_connections')
    .update({ is_active: false })
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Failed to disconnect QB Online:', error);
    throw new Error(`Failed to disconnect: ${error.message}`);
  }
}

// ============================================================================
// Invoice Operations
// ============================================================================

/**
 * Create invoice in QuickBooks Online
 * Delegates to Edge Function for API calls with stored tokens
 */
export async function createInvoiceInQBOnline(
  quote: Quote,
  organizationId: string,
  options?: {
    customerId?: string;
    sendToCustomer?: boolean;
    paymentTerms?: string;
    notes?: string;
    customerMemo?: string;
  }
): Promise<InvoiceCreationResult> {
  // Check connection exists
  const connection = await checkQBOnlineConnection(organizationId);
  if (!connection) {
    throw new Error('QuickBooks Online not connected');
  }

  // Check if invoice already exists
  const existingSync = await getInvoiceSyncStatus(quote.id);
  if (existingSync && existingSync.sync_status === 'Synced') {
    throw new Error('Invoice already synced to QuickBooks');
  }

  try {
    // Call Edge Function to create invoice using stored tokens
    const { data, error } = await supabase.functions.invoke('quickbooks-online-create-invoice', {
      body: {
        quote_id: quote.id,
        organization_id: organizationId,
        options,
      },
    });

    if (error) throw error;

    // Record successful sync
    await supabase
      .from('quickbooks_online_invoice_sync')
      .upsert({
        quote_id: quote.id,
        organization_id: organizationId,
        qb_invoice_id: data.invoice.Id,
        qb_invoice_number: data.invoice.DocNumber,
        qb_sync_token: data.invoice.SyncToken,
        sync_status: 'Synced',
        last_sync_at: new Date().toISOString(),
      });

    return {
      success: true,
      invoice_id: data.invoice.Id,
      invoice_number: data.invoice.DocNumber,
      invoice_url: data.invoice_url,
    };
  } catch (error) {
    console.error('Failed to create QB Online invoice:', error);

    // Record failed sync
    await supabase
      .from('quickbooks_online_invoice_sync')
      .upsert({
        quote_id: quote.id,
        organization_id: organizationId,
        sync_status: 'Error',
        sync_error: error instanceof Error ? error.message : 'Unknown error',
        last_sync_at: new Date().toISOString(),
      });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get invoice sync status
 */
export async function getInvoiceSyncStatus(
  quoteId: string
): Promise<QBOnlineInvoiceSync | null> {
  const { data, error } = await supabase
    .from('quickbooks_online_invoice_sync')
    .select('*')
    .eq('quote_id', quoteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build QuickBooks Online invoice data from quote
 */
export function buildQBOnlineInvoice(quote: Quote): Partial<QBOnlineInvoice> {
  const quoteDetails = quote.quote_details;
  const jobDetails = quote.job_details;
  const wallDetails = quote.wall_details;
  const priceDetails = quote.price_details;
  const deliveryDetails = quote.delivery_details;

  const lineItems: QBOnlineInvoice['Line'] = [];

  // Materials line item
  if (priceDetails.materials_cost && priceDetails.materials_cost > 0) {
    lineItems.push({
      Amount: priceDetails.materials_cost,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: {
          value: '1', // Will be replaced with actual QB item ID
          name: 'Materials',
        },
        Qty: 1,
        UnitPrice: priceDetails.materials_cost,
      },
      Description: `Materials for ${jobDetails.jobType}`,
    });
  }

  // Labor line item
  if (priceDetails.labor_cost && priceDetails.labor_cost > 0) {
    lineItems.push({
      Amount: priceDetails.labor_cost,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: {
          value: '2', // Will be replaced with actual QB item ID
          name: 'Labor',
        },
        Qty: 1,
        UnitPrice: priceDetails.labor_cost,
      },
      Description: `Labor for ${wallDetails.squareFootage || 0} sq ft`,
    });
  }

  // Additional costs
  if (priceDetails.additional_costs && Array.isArray(priceDetails.additional_costs)) {
    priceDetails.additional_costs.forEach((cost: any) => {
      if (cost.amount > 0) {
        lineItems.push({
          Amount: cost.amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: {
              value: '3', // Will be replaced with actual QB item ID
              name: 'Service',
            },
            Qty: 1,
            UnitPrice: cost.amount,
          },
          Description: cost.description || 'Additional Service',
        });
      }
    });
  }

  // Discount (if applicable)
  if (priceDetails.discount_amount && priceDetails.discount_amount > 0) {
    lineItems.push({
      Amount: -priceDetails.discount_amount,
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: {
          value: '4', // Will be replaced with actual QB discount item ID
          name: 'Discount',
        },
        Qty: 1,
        UnitPrice: -priceDetails.discount_amount,
      },
      Description: `Discount: ${priceDetails.discount_percentage || 0}%`,
    });
  }

  const invoiceData: Partial<QBOnlineInvoice> = {
    Line: lineItems,
    CustomerRef: {
      value: '1', // Will be replaced with actual QB customer ID
      name: quoteDetails.contactName || 'Unknown Customer',
    },
    DocNumber: quote.proposal_number,
    TxnDate: new Date().toISOString().split('T')[0],
    DueDate: deliveryDetails?.estimated_completion
      ? new Date(deliveryDetails.estimated_completion).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    PrivateNote: `Created from quote ${quote.proposal_number}`,
  };

  // Add billing address if available
  if (quoteDetails.address) {
    invoiceData.BillAddr = {
      Line1: quoteDetails.address,
      City: quoteDetails.city,
      CountrySubDivisionCode: quoteDetails.state,
      PostalCode: quoteDetails.zipCode,
      Country: 'USA',
    };
  }

  return invoiceData;
}

/**
 * Build QuickBooks Online customer data from quote
 */
export function buildQBOnlineCustomer(quote: Quote): Partial<QBOnlineCustomer> {
  const quoteDetails = quote.quote_details;
  const jobDetails = quote.job_details;

  const customerData: Partial<QBOnlineCustomer> = {
    DisplayName: quoteDetails.contactName || 'Unknown Customer',
    CompanyName: jobDetails.client_company || quoteDetails.contactName,
  };

  // Add email if available
  if (quoteDetails.email) {
    customerData.PrimaryEmailAddr = {
      Address: quoteDetails.email,
    };
  }

  // Add phone if available
  if (quoteDetails.phone) {
    customerData.PrimaryPhone = {
      FreeFormNumber: quoteDetails.phone,
    };
  }

  // Add address if available
  if (quoteDetails.address) {
    customerData.BillAddr = {
      Line1: quoteDetails.address,
      City: quoteDetails.city,
      CountrySubDivisionCode: quoteDetails.state,
      PostalCode: quoteDetails.zipCode,
      Country: 'USA',
    };
  }

  return customerData;
}
