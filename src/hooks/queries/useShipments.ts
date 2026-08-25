/**
 * React Query hooks for shipments and carrier tracking.
 *
 * Recording a shipment writes `shipped` events, so it invalidates the sales
 * order namespace wholesale — fulfillment quantities and both derived statuses
 * are summed from those events.
 *
 * A tracking refresh does not: it changes only observed carrier state, which no
 * fulfillment number is derived from. Keeping that invalidation narrow matters
 * because a shipments panel refreshes on an interval, and re-fetching every
 * order line each time is how a tracking screen makes the rest of the app feel
 * broken.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import {
  createShipment,
  getShipments,
  getShipmentLines,
  getShipmentProgress,
  getOpenShipments,
  getShipmentProgressForOrg,
  getTrackingEvents,
  updateShipment,
  markManualDelivery,
  refreshTracking,
  detectCarrier,
  type CreateShipmentInput,
  type CreateShipmentLineInput,
  type Shipment,
  type ShipmentProgress,
  type UpdateShipmentInput,
} from '@/services/shipmentsService';
import { salesOrderKeys } from './useSalesOrders';
import { receiptKeys } from './useReceipts';

export type {
  Shipment,
  ShipmentLine,
  ShipmentProgress,
  ShipmentTrackingEvent,
} from '@/services/shipmentsService';

export const shipmentKeys = {
  all: ['shipments'] as const,
  forOrder: (salesOrderId: string) => [...shipmentKeys.all, 'order', salesOrderId] as const,
  lines: (shipmentId: string) => [...shipmentKeys.all, 'lines', shipmentId] as const,
  events: (shipmentId: string) => [...shipmentKeys.all, 'events', shipmentId] as const,
  progress: (salesOrderId: string) => [...shipmentKeys.all, 'progress', salesOrderId] as const,
  open: (organizationId: string) => [...shipmentKeys.all, 'open', organizationId] as const,
};

export function useShipments(salesOrderId?: string) {
  return useQuery({
    queryKey: shipmentKeys.forOrder(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Shipment[]> => {
      if (!salesOrderId) return [];
      return getShipments(salesOrderId);
    },
  });
}

export function useShipmentLines(shipmentId?: string) {
  return useQuery({
    queryKey: shipmentKeys.lines(shipmentId ?? '__pending__'),
    enabled: !!shipmentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!shipmentId) return [];
      return getShipmentLines(shipmentId);
    },
  });
}

/** The carrier's scan history for one shipment. */
export function useTrackingEvents(shipmentId?: string) {
  return useQuery({
    queryKey: shipmentKeys.events(shipmentId ?? '__pending__'),
    enabled: !!shipmentId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!shipmentId) return [];
      return getTrackingEvents(shipmentId);
    },
  });
}

/** What each shipment claims to carry against what has been counted off it. */
export function useShipmentProgress(salesOrderId?: string) {
  return useQuery({
    queryKey: shipmentKeys.progress(salesOrderId ?? '__pending__'),
    enabled: !!salesOrderId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<Record<string, ShipmentProgress>> => {
      if (!salesOrderId) return {};
      return getShipmentProgress(salesOrderId);
    },
  });
}

/**
 * Everything in the air across the organization.
 *
 * Refetched on an interval because this is the one screen someone leaves open
 * on a second monitor all morning, and a webhook that arrives while they are
 * looking at it should land on the page rather than wait for a manual reload.
 */
/**
 * Shipment progress across the organization, keyed by shipment id.
 *
 * Pairs with `useOpenShipments`: the shipments say where the freight is, this
 * says whether anybody has counted it. Without it a delivered shipment cannot
 * be told apart from a delivered shipment nobody opened, and the queue would
 * flag every arrival as uncounted.
 */
export function useShipmentProgressForOrg(organizationId?: string) {
  return useQuery({
    queryKey: [...shipmentKeys.all, 'progress-org', organizationId ?? '__pending__'],
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!organizationId) return {};
      return getShipmentProgressForOrg(organizationId);
    },
  });
}

export function useOpenShipments(organizationId?: string) {
  return useQuery({
    queryKey: shipmentKeys.open(organizationId ?? '__pending__'),
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    queryFn: async (): Promise<Shipment[]> => {
      if (!organizationId) return [];
      return getOpenShipments(organizationId);
    },
  });
}

export function useCreateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shipment,
      lines,
    }: {
      shipment: CreateShipmentInput;
      lines?: CreateShipmentLineInput[];
    }) => createShipment(shipment, lines ?? []),
    onSuccess: async (shipmentId, variables) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      // `shipped` events change fulfillment quantities and derived status.
      queryClient.invalidateQueries({ queryKey: salesOrderKeys.all });

      const shipped = (variables.lines ?? []).reduce(
        (sum, line) => sum + Number(line.quantity_shipped || 0),
        0
      );

      toast.success('Shipment recorded', {
        description: shipped > 0 ? `${shipped} on the truck` : 'Watching for carrier updates',
      });

      // Registering is a network round trip to the provider and is allowed to
      // fail: the shipment is already recorded, the hourly poller will pick it
      // up, and a failed registration must not read as a failed save.
      if (variables.shipment.tracking_provider !== 'manual') {
        try {
          await refreshTracking(shipmentId, 'register');
          queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
        } catch {
          console.warn('[useCreateShipment] Provider registration deferred to the poller');
        }
      }
    },
    onError: (error: unknown) =>
      toast.error('Could not record the shipment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

export function useUpdateShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ shipmentId, updates }: { shipmentId: string; updates: UpdateShipmentInput }) =>
      updateShipment(shipmentId, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shipmentKeys.all }),
    onError: (error: unknown) =>
      toast.error('Could not update the shipment', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

/**
 * Record delivery on a carrier with nobody to ask.
 *
 * Invalidates receipts as well as shipments: 'delivered' with nothing counted
 * against it is what raises "landed, not counted", and that alarm is the reason
 * this action exists at all.
 */
export function useMarkManualDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shipmentId,
      deliveredAt,
    }: {
      shipmentId: string;
      deliveredAt?: string | null;
    }) => markManualDelivery(shipmentId, deliveredAt === undefined ? new Date().toISOString() : deliveredAt),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });

      toast.success(
        variables.deliveredAt === null ? 'Delivery undone' : 'Marked delivered',
        {
          description:
            variables.deliveredAt === null
              ? 'Back to awaiting delivery'
              : 'Count it in when the boxes are opened',
        }
      );
    },
    onError: (error: unknown) =>
      toast.error('Could not record the delivery', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

/**
 * Ask the carrier now.
 *
 * The toast reports whether anything actually moved, because "refreshed" with
 * no further detail teaches people that the button does nothing.
 */
export function useRefreshTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      shipmentId,
      action,
    }: {
      shipmentId: string;
      action?: 'register' | 'refresh';
    }) => refreshTracking(shipmentId, action ?? 'refresh'),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      // A delivered scan changes what the receiving screen should be showing.
      queryClient.invalidateQueries({ queryKey: receiptKeys.all });

      toast.success(
        result.status_changed ? 'Status changed' : 'Tracking up to date',
        {
          description: result.status_changed
            ? `Now ${result.status.replace(/_/g, ' ')}`
            : result.checkpoints_added > 0
              ? `${result.checkpoints_added} new scan${result.checkpoints_added === 1 ? '' : 's'}`
              : 'The carrier has nothing new to report',
        }
      );
    },
    onError: (error: unknown) =>
      toast.error('Could not reach the carrier', {
        description: error instanceof Error ? error.message : 'Unknown error',
      }),
  });
}

/** Carrier detection for a typed tracking number. Never throws. */
export function useDetectCarrier() {
  return useMutation({ mutationFn: (trackingNumber: string) => detectCarrier(trackingNumber) });
}
