/**
 * Receipts Service
 *
 * What actually arrived on the dock, against what was ordered.
 *
 * Recording a delivery goes through `create_receipt_with_lines` so the header,
 * its lines, and the `received` events land together. Lines that exist without
 * their events would leave that product looking undelivered, and the next
 * delivery would receive it a second time.
 *
 * The distinction that matters here: `quantity_received` means USABLE product.
 * Damage is recorded beside it and deliberately does not count as received,
 * because the order line still needs that quantity delivered. Counting damaged
 * product as received reports a line complete while a crew stands in front of
 * two broken chairs.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ReceiptRow = Database['public']['Tables']['receipts']['Row'];
type ReceiptLineRow = Database['public']['Tables']['receipt_lines']['Row'];
type POProgressRow = Database['public']['Views']['vendor_po_progress']['Row'];

export type Receipt = ReceiptRow;
export type ReceiptLine = ReceiptLineRow;
export type VendorPOProgress = POProgressRow;

export interface CreateReceiptInput {
  organization_id: string;
  sales_order_id: string;
  vendor_po_id?: string | null;
  received_date?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  bill_of_lading?: string | null;
  notes?: string | null;
}

export interface CreateReceiptLineInput {
  order_line_id: string;
  quantity_received: number;
  quantity_damaged?: number;
  damage_notes?: string | null;
  notes?: string | null;
}

/**
 * Record a delivery. Returns the new receipt's id.
 *
 * Lines that record neither a received nor a damaged quantity are dropped
 * before the call rather than rejected by the database, because a receiving
 * screen legitimately shows every outstanding line and the clerk fills in only
 * the ones that turned up.
 */
export async function createReceipt(
  receipt: CreateReceiptInput,
  lines: CreateReceiptLineInput[]
): Promise<string> {
  const meaningful = lines.filter(
    line => line.quantity_received > 0 || (line.quantity_damaged ?? 0) > 0
  );

  if (meaningful.length === 0) {
    throw new Error('Nothing was recorded as received or damaged.');
  }

  const { data, error } = await supabase.rpc('create_receipt_with_lines' as never, {
    p_receipt: receipt,
    p_lines: meaningful,
  } as never);

  if (error) {
    console.error('[receiptsService] createReceipt failed:', error);
    throw new Error(`Failed to record the delivery: ${error.message}`);
  }

  const receiptId = data as unknown as string | null;
  if (!receiptId) {
    throw new Error('The delivery was not recorded.');
  }

  return receiptId;
}

/** Deliveries against one order, most recent first. */
export async function getReceipts(salesOrderId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('sales_order_id', salesOrderId)
    .order('received_date', { ascending: false });

  if (error) {
    console.error('[receiptsService] getReceipts failed:', error);
    throw new Error(`Failed to load deliveries: ${error.message}`);
  }

  return (data || []) as unknown as Receipt[];
}

export async function getReceiptLines(receiptId: string): Promise<ReceiptLine[]> {
  const { data, error } = await supabase
    .from('receipt_lines')
    .select('*')
    .eq('receipt_id', receiptId);

  if (error) {
    console.error('[receiptsService] getReceiptLines failed:', error);
    throw new Error(`Failed to load delivery lines: ${error.message}`);
  }

  return (data || []) as unknown as ReceiptLine[];
}

/**
 * Where each manufacturer order has got to, keyed by purchase order id.
 *
 * Derived from acknowledgments and receipts, not read from the stored status
 * column — same reasoning as sales order status, which is set once and then
 * quietly stops being true.
 */
export async function getPOProgress(
  salesOrderId: string
): Promise<Record<string, VendorPOProgress>> {
  const { data, error } = await supabase
    .from('vendor_po_progress')
    .select('*')
    .eq('sales_order_id', salesOrderId);

  if (error) {
    console.error('[receiptsService] getPOProgress failed:', error);
    throw new Error(`Failed to load order progress: ${error.message}`);
  }

  const rows = (data || []) as unknown as VendorPOProgress[];
  return Object.fromEntries(
    rows.map(row => [row.vendor_po_id as string, row])
  );
}

/**
 * Lines with damage across an organization, worst first.
 *
 * The backing query for a freight claim queue: damaged product is money the
 * dealer has already paid for and cannot install, and it stops being
 * recoverable once the carrier's claim window closes.
 */
export async function getDamagedLines(
  organizationId: string,
  limit = 100
): Promise<(ReceiptLine & { receipts: Receipt | null })[]> {
  const { data, error } = await supabase
    .from('receipt_lines')
    .select('*, receipts(*)')
    .eq('organization_id', organizationId)
    .gt('quantity_damaged', 0)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[receiptsService] getDamagedLines failed:', error);
    throw new Error(`Failed to load damaged lines: ${error.message}`);
  }

  return (data || []) as unknown as (ReceiptLine & { receipts: Receipt | null })[];
}
