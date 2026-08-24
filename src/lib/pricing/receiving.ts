/**
 * Receiving
 *
 * What a delivery adds up to, and what it is safe to record.
 *
 * Pure, and extracted from the receiving dialog after a bug that only a pure
 * function makes obvious: the dialog summed every entry it had ever seeded,
 * while the rows it displayed narrowed once the manufacturer order's lines
 * loaded. The footer reported a quantity for a line the clerk could not see and
 * had not agreed to — which, on a screen whose entire job is quantities, is the
 * fastest way to lose their trust in every other number on it.
 *
 * The rule that falls out of that: totals and payloads are both derived from
 * the VISIBLE lines, never from the accumulated entry map.
 */

/** What a clerk has typed against one line. Strings, because inputs are. */
export interface ReceiptEntry {
  received: string;
  damaged: string;
  damageNotes?: string;
}

export interface ReceiptTotals {
  received: number;
  damaged: number;
  /** Lines carrying any damage. What a freight claim is scoped from. */
  damagedLineCount: number;
}

/** A number from an input, or 0. Blank, whitespace, and junk all mean 0. */
const qty = (value: string | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Totals for a delivery, over the lines actually on screen.
 *
 * `visibleLineIds` is the authority. An entry with no matching visible line is
 * ignored rather than summed: the scope narrows as data loads, and seeding only
 * ever adds keys, so the map outlives the rows.
 */
export const summarizeReceipt = (
  entries: Record<string, ReceiptEntry | undefined>,
  visibleLineIds: string[]
): ReceiptTotals => {
  let received = 0;
  let damaged = 0;
  let damagedLineCount = 0;

  for (const id of visibleLineIds) {
    const entry = entries[id];
    if (!entry) continue;
    received += qty(entry.received);
    const d = qty(entry.damaged);
    damaged += d;
    if (d > 0) damagedLineCount += 1;
  }

  return { received, damaged, damagedLineCount };
};

export interface ReceiptLinePayload {
  order_line_id: string;
  quantity_received: number;
  quantity_damaged: number;
  damage_notes: string | null;
}

/**
 * The lines worth writing, from what the clerk typed.
 *
 * Lines recording neither a receipt nor damage are dropped rather than sent and
 * rejected: a receiving screen legitimately lists everything outstanding, and a
 * clerk fills in only what turned up.
 *
 * Damage notes are dropped along with the quantity when nothing was damaged, so
 * a note typed and then zeroed out cannot survive as an orphan claim.
 */
export const buildReceiptLines = (
  entries: Record<string, ReceiptEntry | undefined>,
  visibleLineIds: string[]
): ReceiptLinePayload[] => {
  const payload: ReceiptLinePayload[] = [];

  for (const id of visibleLineIds) {
    const entry = entries[id];
    if (!entry) continue;

    const quantity_received = qty(entry.received);
    const quantity_damaged = qty(entry.damaged);
    if (quantity_received === 0 && quantity_damaged === 0) continue;

    const note = entry.damageNotes?.trim();
    payload.push({
      order_line_id: id,
      quantity_received,
      quantity_damaged,
      damage_notes: quantity_damaged > 0 && note ? note : null,
    });
  }

  return payload;
};
