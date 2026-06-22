/**
 * QuickBooks Desktop Integration Service
 *
 * Manages QB Desktop connections and invoice creation
 */

import { supabase } from '@/integrations/supabase/client';
import type { Proposal } from '@/services/proposalsService';
import { generateInvoiceQBXML, generateCustomerQBXML } from '@/lib/qbxml/generators';

export interface QBDesktopConnection {
  id: string;
  organization_id: string;
  company_file_name: string;
  username: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_frequency_minutes: number;
  web_connector_version: string | null;
  qb_version: string | null;
  qb_edition: string | null;
  created_at: string;
  updated_at: string;
}

export interface QBInvoiceSync {
  id: string;
  quote_id: string;
  organization_id: string;
  qb_txn_id: string | null;
  qb_edit_sequence: string | null;
  qb_invoice_number: string | null;
  sync_status: 'Pending' | 'Synced' | 'Error';
  last_sync_at: string | null;
  sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface QBRequestQueue {
  id: string;
  organization_id: string;
  request_type: string;
  qbxml_request: string;
  priority: number;
  queue_status: 'Pending' | 'Sent' | 'Completed' | 'Failed';
  attempts: number;
  max_attempts: number;
  qbxml_response: string | null;
  error_message: string | null;
  source_record_type: string | null;
  source_record_id: string | null;
  created_at: string;
  processed_at: string | null;
  completed_at: string | null;
}

export interface CreateConnectionData {
  organization_id: string;
  company_file_name: string;
  username: string;
  password: string;
  sync_frequency_minutes?: number;
}

/**
 * Check if organization has QuickBooks Desktop connected
 */
export async function checkQBDesktopConnection(
  organizationId: string
): Promise<QBDesktopConnection | null> {
  const { data, error } = await supabase
    .from('quickbooks_desktop_connections')
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
 * Create QuickBooks Desktop connection
 */
export async function createQBDesktopConnection(
  connectionData: CreateConnectionData
): Promise<QBDesktopConnection> {
  // Call Edge Function to hash password and create connection
  const { data, error } = await supabase.functions.invoke('qb-desktop-setup', {
    body: connectionData,
  });

  if (error) throw error;
  return data.connection;
}

/**
 * Fixed application identity for the Qwohter QBWC integration. OwnerID identifies
 * the *application* and MUST be the same GUID for every customer/install.
 */
const QBWC_OWNER_ID = '{8F3A1C2E-4B5D-4E6F-9A7B-0C1D2E3F4A5B}';

/**
 * Derive a stable GUID from a seed string (SHA-256 → 8-4-4-4-12 hex).
 * Used for FileID so re-downloading the .QWC always yields the same value —
 * a changing FileID makes the Web Connector treat it as a new app and can
 * create duplicate registrations.
 */
async function deterministicGuid(seed: string): Promise<string> {
  const bytes = new TextEncoder().encode(seed);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
}

/**
 * Generate .QWC file for Web Connector
 * User downloads this and opens it with QB Web Connector
 */
export async function generateQWCFile(organizationId: string): Promise<Blob> {
  const connection = await checkQBDesktopConnection(organizationId);

  if (!connection) {
    throw new Error('No QuickBooks Desktop connection found');
  }

  // Use Supabase Edge Function URL (must match the deployed function folder name)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/qb-web-connector`;

  // FileID is stable per connection so repeated downloads are identical.
  const fileId = await deterministicGuid(`qwohter-qbwc-file-${connection.id}`);

  const qwcContent = `<?xml version="1.0" encoding="utf-8"?>
<QBWCXML>
  <AppName>Qwohter</AppName>
  <AppID></AppID>
  <AppURL>${edgeFunctionUrl}</AppURL>
  <AppDescription>Sync quotes and invoices between Qwohter and QuickBooks Desktop</AppDescription>
  <AppSupport>https://yourapp.com/support</AppSupport>
  <UserName>${connection.username}</UserName>
  <OwnerID>${QBWC_OWNER_ID}</OwnerID>
  <FileID>${fileId}</FileID>
  <QBType>QBFS</QBType>
  <Scheduler>
    <RunEveryNMinutes>${connection.sync_frequency_minutes}</RunEveryNMinutes>
  </Scheduler>
  <IsReadOnly>false</IsReadOnly>
</QBWCXML>`;

  return new Blob([qwcContent], { type: 'application/xml' });
}

/**
 * Create invoice in QuickBooks Desktop (adds to request queue)
 */
export async function createInvoiceInQBDesktop(
  proposal: Proposal,
  organizationId: string
): Promise<void> {
  const connection = await checkQBDesktopConnection(organizationId);

  if (!connection) {
    throw new Error('QuickBooks Desktop not connected');
  }

  // Check if invoice already exists
  const { data: existingSync } = await supabase
    .from('quickbooks_desktop_invoice_sync')
    .select('*')
    .eq('quote_id', proposal.id)
    .single();

  if (existingSync && existingSync.sync_status === 'Synced') {
    throw new Error('Invoice already synced to QuickBooks');
  }

  // Generate QBXML for invoice
  const invoiceQBXML = generateInvoiceQBXML(proposal);

  // Add to request queue
  const { error: queueError } = await supabase
    .from('quickbooks_request_queue')
    .insert({
      organization_id: organizationId,
      request_type: 'InvoiceAdd',
      qbxml_request: invoiceQBXML,
      priority: 5,
      source_record_type: 'Proposal',
      source_record_id: proposal.id,
    } as any);

  if (queueError) throw queueError;

  // Create/update sync tracking
  if (existingSync) {
    await supabase
      .from('quickbooks_desktop_invoice_sync')
      .update({
        sync_status: 'Pending',
        sync_error: null,
      })
      .eq('quote_id', proposal.id);
  } else {
    await supabase
      .from('quickbooks_desktop_invoice_sync')
      .insert({
        quote_id: proposal.id,
        organization_id: organizationId,
        sync_status: 'Pending',
      } as any);
  }
}

/**
 * Get invoice sync status
 */
export async function getInvoiceSyncStatus(
  quoteId: string
): Promise<QBInvoiceSync | null> {
  const { data, error } = await supabase
    .from('quickbooks_desktop_invoice_sync')
    .select('*')
    .eq('quote_id', quoteId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Disconnect QuickBooks Desktop
 */
export async function disconnectQBDesktop(organizationId: string): Promise<void> {
  const { error } = await supabase
    .from('quickbooks_desktop_connections')
    .update({ is_active: false })
    .eq('organization_id', organizationId);

  if (error) throw error;
}

/**
 * Get sync activity logs
 */
export async function getQBSyncLogs(organizationId: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('quickbooks_desktop_session_logs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
