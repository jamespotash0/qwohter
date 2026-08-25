/**
 * Shipments Service
 *
 * Where the freight is between the factory and the dock.
 *
 * Two kinds of field live on a shipment and they are written by different
 * people. What a human knows — which order this covers, the carrier, the PRO
 * number off the acknowledgment, what the vendor says is on the truck — is
 * written here. What the carrier knows — status, ETA, scans — is written only
 * by the tracking edge functions under the service role, because a status
 * anyone can type is a status that proves nothing in a freight claim.
 *
 * So this service can create a shipment and correct its paperwork, and it can
 * *ask* for a tracking refresh, but it cannot set a tracking status. That is
 * deliberate and enforced in the database, not just here.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ShipmentRow = Database['public']['Tables']['shipments']['Row'];
type ShipmentLineRow = Database['public']['Tables']['shipment_lines']['Row'];
type TrackingEventRow = Database['public']['Tables']['shipment_tracking_events']['Row'];
type ShipmentProgressRow = Database['public']['Views']['shipment_progress']['Row'];

export type Shipment = ShipmentRow;
export type ShipmentLine = ShipmentLineRow;
export type ShipmentProgress = ShipmentProgressRow;
export type ShipmentTrackingEvent = Pick<
  TrackingEventRow,
  'id' | 'shipment_id' | 'occurred_at' | 'status' | 'message' | 'location'
>;

export interface CreateShipmentInput {
  organization_id: string;
  sales_order_id: string;
  vendor_po_id?: string | null;
  carrier_code?: string | null;
  carrier_name?: string | null;
  tracking_number?: string | null;
  pro_number?: string | null;
  bill_of_lading?: string | null;
  service_level?: string | null;
  ship_date?: string | null;
  estimated_delivery_date?: string | null;
  piece_count?: number | null;
  weight_lbs?: number | null;
  /** 'manual' for a carrier with nothing to ask — an own truck, a local agent. */
  tracking_provider?: 'aftership' | 'easypost' | 'manual';
  notes?: string | null;
}

export interface CreateShipmentLineInput {
  order_line_id: string;
  quantity_shipped: number;
  notes?: string | null;
}

/**
 * Record a shipment and what the vendor says is on it.
 *
 * Lines are optional. A tracking number that arrived by email with no manifest
 * is still worth watching, and refusing to record it until someone types a line
 * list is how tracking numbers end up in a spreadsheet instead.
 */
export async function createShipment(
  shipment: CreateShipmentInput,
  lines: CreateShipmentLineInput[] = []
): Promise<string> {
  const meaningful = lines.filter(line => Number(line.quantity_shipped) > 0);

  const { data, error } = await supabase.rpc('create_shipment_with_lines', {
    p_shipment: shipment,
    p_lines: meaningful,
  });

  if (error) {
    console.error('[shipmentsService] createShipment failed:', error);
    throw new Error(`Failed to record the shipment: ${error.message}`);
  }

  const shipmentId = data as string | null;
  if (!shipmentId) throw new Error('The shipment was not recorded.');

  return shipmentId;
}

/** Shipments against one order, most recently shipped first. */
export async function getShipments(salesOrderId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('sales_order_id', salesOrderId)
    .order('ship_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[shipmentsService] getShipments failed:', error);
    throw new Error(`Failed to load shipments: ${error.message}`);
  }

  return data ?? [];
}

export async function getShipmentLines(shipmentId: string): Promise<ShipmentLine[]> {
  const { data, error } = await supabase
    .from('shipment_lines')
    .select('*')
    .eq('shipment_id', shipmentId);

  if (error) {
    console.error('[shipmentsService] getShipmentLines failed:', error);
    throw new Error(`Failed to load shipment lines: ${error.message}`);
  }

  return data ?? [];
}

/**
 * The carrier's scan history, newest first.
 *
 * Read-only everywhere in the app, and read-only in the database too: this is
 * what a freight claim is argued from, and a history the dealer can edit is
 * worth nothing.
 */
export async function getTrackingEvents(shipmentId: string): Promise<ShipmentTrackingEvent[]> {
  const { data, error } = await supabase
    .from('shipment_tracking_events')
    .select('id, shipment_id, occurred_at, status, message, location')
    .eq('shipment_id', shipmentId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('[shipmentsService] getTrackingEvents failed:', error);
    throw new Error(`Failed to load tracking history: ${error.message}`);
  }

  return data ?? [];
}

/** Manifest against counted, keyed by shipment id. */
export async function getShipmentProgress(
  salesOrderId: string
): Promise<Record<string, ShipmentProgress>> {
  const { data, error } = await supabase
    .from('shipment_progress')
    .select('*')
    .eq('sales_order_id', salesOrderId);

  if (error) {
    console.error('[shipmentsService] getShipmentProgress failed:', error);
    throw new Error(`Failed to load shipment progress: ${error.message}`);
  }

  const rows = data ?? [];
  return Object.fromEntries(
    rows.flatMap(row => (row.shipment_id ? [[row.shipment_id, row] as const] : []))
  );
}

/**
 * Everything in the air across the organization.
 *
 * Deliberately includes delivered-but-uncounted shipments rather than filtering
 * to what is moving: a pallet on the dock that nobody has opened is more urgent
 * than one still in Memphis, and a screen that hides it is why claim windows
 * get missed.
 */
export async function getOpenShipments(organizationId: string, limit = 200): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .eq('organization_id', organizationId)
    .neq('tracking_status', 'expired')
    .order('estimated_delivery_date', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('[shipmentsService] getOpenShipments failed:', error);
    throw new Error(`Failed to load shipments: ${error.message}`);
  }

  return data ?? [];
}

/** Paperwork corrections only. Observed carrier state is not settable here. */
export type UpdateShipmentInput = Partial<
  Pick<
    Shipment,
    | 'vendor_po_id'
    | 'carrier_code'
    | 'carrier_name'
    | 'tracking_number'
    | 'pro_number'
    | 'bill_of_lading'
    | 'service_level'
    | 'ship_date'
    | 'piece_count'
    | 'weight_lbs'
    | 'notes'
    | 'tracking_active'
  >
>;

export async function updateShipment(
  shipmentId: string,
  updates: UpdateShipmentInput
): Promise<void> {
  const { error } = await supabase
    .from('shipments')
    .update(updates)
    .eq('id', shipmentId);

  if (error) {
    console.error('[shipmentsService] updateShipment failed:', error);
    throw new Error(`Failed to update the shipment: ${error.message}`);
  }
}

/**
 * Assert delivery on a carrier with nobody to ask.
 *
 * Own truck and white-glove agents have no API and never will, so their
 * shipments sat at 'pending' forever — invisible to the "landed, not counted"
 * alarm, and permanently late once an ETA passed. This is the one sanctioned
 * hand-written status; the database rejects it on a tracked carrier.
 *
 * Deliberately only delivery. An intermediate status on an own truck is a field
 * somebody has to remember to keep current, and a stale status is read as fact.
 *
 * @param deliveredAt When it landed. `null` undoes a mis-click.
 */
export async function markManualDelivery(
  shipmentId: string,
  deliveredAt: string | null = new Date().toISOString()
): Promise<void> {
  const { error } = await supabase.rpc('mark_manual_delivery', {
    p_shipment_id: shipmentId,
    p_delivered_at: deliveredAt,
  });

  if (error) {
    console.error('[shipmentsService] markManualDelivery failed:', error);
    throw new Error(`Failed to record the delivery: ${error.message}`);
  }
}

/** The edge function's own message, dug out of a FunctionsHttpError response. */
async function readFunctionError(error: unknown): Promise<string> {
  const response = (error as { context?: Response } | null)?.context;

  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // Not JSON, or already consumed. Fall through to the generic message.
    }
  }

  return error instanceof Error ? error.message : 'Tracking lookup failed';
}

export interface TrackingRefreshResult {
  status: string;
  status_changed: boolean;
  previous_status: string | null;
  checkpoints_added: number;
}

/**
 * Ask the carrier now, rather than waiting for the next poll.
 *
 * `register` on first use, `refresh` afterwards — but the function registers
 * automatically when it finds no provider handle, so a caller that gets this
 * wrong still works.
 */
export async function refreshTracking(
  shipmentId: string,
  action: 'register' | 'refresh' = 'refresh'
): Promise<TrackingRefreshResult> {
  const { data, error } = await supabase.functions.invoke('track-shipment', {
    body: { action, shipmentId },
  });

  if (error) {
    console.error('[shipmentsService] refreshTracking failed:', error);
    // supabase-js reports a non-2xx only as "Edge Function returned a non-2xx
    // status code" and leaves `data` null, so the useful message has to be read
    // out of the response body. That message is the whole point here: it
    // distinguishes a bad tracking number from an unconfigured provider from a
    // carrier outage, and each of those needs a different thing done about it.
    throw new Error(await readFunctionError(error));
  }

  if ((data as { error?: string } | null)?.error) {
    throw new Error((data as { error: string }).error);
  }

  return (data as { result: TrackingRefreshResult }).result;
}

/** Which carriers a number could belong to, best guess first. */
export async function detectCarrier(trackingNumber: string): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('track-shipment', {
    body: { action: 'detect', trackingNumber },
  });

  // Detection is a convenience on top of a field the user can fill in
  // themselves. A failure here must never block recording a shipment, so it
  // returns nothing rather than throwing.
  if (error || (data as { error?: string } | null)?.error) {
    console.warn('[shipmentsService] carrier detection unavailable');
    return [];
  }

  return ((data as { carriers?: string[] }).carriers ?? []);
}
