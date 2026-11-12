/**
 * Shipment manifest.
 *
 * What the vendor says is on the truck, from what someone typed. Pure and
 * separate for the same reason receiving's totals are: the visible rows narrow
 * as the order's lines load, while the entry map only ever grows, and a footer
 * that sums the map reports quantities for lines nobody can see.
 *
 * `visibleLineIds` is the authority, everywhere.
 */

export interface ShipmentEntry {
  shipped: string;
}

const qty = (value: string | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export interface ShipmentTotals {
  shipped: number;
  lineCount: number;
}

export const summarizeShipment = (
  entries: Record<string, ShipmentEntry | undefined>,
  visibleLineIds: string[]
): ShipmentTotals => {
  let shipped = 0;
  let lineCount = 0;

  for (const id of visibleLineIds) {
    const n = qty(entries[id]?.shipped);
    if (n > 0) {
      shipped += n;
      lineCount += 1;
    }
  }

  return { shipped, lineCount };
};

export interface ShipmentLinePayload {
  order_line_id: string;
  quantity_shipped: number;
}

export const buildShipmentLines = (
  entries: Record<string, ShipmentEntry | undefined>,
  visibleLineIds: string[]
): ShipmentLinePayload[] => {
  const payload: ShipmentLinePayload[] = [];

  for (const id of visibleLineIds) {
    const quantity_shipped = qty(entries[id]?.shipped);
    if (quantity_shipped === 0) continue;
    payload.push({ order_line_id: id, quantity_shipped });
  }

  return payload;
};

/**
 * Whether a shipment can be saved at all.
 *
 * A carrier with an API needs a number — there is nothing to watch otherwise,
 * and a row that silently never gets polled is worse than a refused save. An
 * own truck needs none, because there is nothing to give and forcing the field
 * is how "N/A" ends up in a tracking column.
 */
export const canSaveShipment = (input: {
  carrierCode: string | null;
  trackingNumber: string;
  proNumber: string;
  isManual: boolean;
}): boolean => {
  if (!input.carrierCode) return false;
  if (input.isManual) return true;
  return !!(input.trackingNumber.trim() || input.proNumber.trim());
};
