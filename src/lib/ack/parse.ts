/**
 * Reading an acknowledgment file
 *
 * Manufacturers acknowledge in whatever their order system exports — usually a
 * spreadsheet or a delimited dump, occasionally a PDF. This handles the
 * delimited case, which is the one that can be read deterministically.
 *
 * The tolerant splitting is borrowed from the specification importer rather
 * than written twice: quoted fields containing commas, delimiters chosen by
 * consistency instead of frequency, and ragged rows padded rather than dropped
 * are the same problems here. Only the column vocabulary differs, because an
 * acknowledgment answers different questions than a specification asks.
 *
 * The extraction source is deliberately separable from the matching that
 * follows it. A PDF or an emailed acknowledgment read by a model produces the
 * same `AckRow[]`, and everything downstream is unchanged.
 */

import { parseNumber } from '@/lib/sif/map';
import type { AckRow } from './match';

export type AckField =
  | 'model_number'
  | 'description'
  | 'quantity'
  | 'unit_cost'
  | 'ship_date';

export type AckMapping = Partial<Record<AckField, number>>;

/**
 * Header patterns, most specific first. Order matters: a file with both `Net
 * Price` and `List Price` must take the net one, because the acknowledgment's
 * job is to tell a dealer what they will be charged.
 */
const HEADER_PATTERNS: { field: AckField; patterns: RegExp[] }[] = [
  {
    field: 'model_number',
    patterns: [
      /^(mfg|manufacturer)?\s*(part|model|catalog|item)\s*(number|no|#|code)?$/i,
      /^(sku|part|model|catalog)$/i,
    ],
  },
  {
    field: 'description',
    patterns: [/^(item\s*)?desc(ription)?$/i, /^product(\s*name)?$/i],
  },
  {
    field: 'quantity',
    patterns: [/^(ack(nowledged)?|ship|order(ed)?)?\s*(qty|quantity)$/i],
  },
  {
    field: 'unit_cost',
    patterns: [
      // Net beats price: an acknowledgment carrying both means the dealer pays
      // the net one, and taking the list price makes every margin wrong.
      /^(net|dealer|your)\s*(unit\s*)?(cost|price)$/i,
      /^unit\s*(cost|price)$/i,
      /^(cost|net)$/i,
    ],
  },
  {
    field: 'ship_date',
    patterns: [
      /^(est(imated)?|sched(uled)?|ack(nowledged)?|confirmed)\s*ship(\s*date)?$/i,
      /^ship\s*date$/i,
      /^(eta|delivery\s*date)$/i,
    ],
  },
];

/**
 * Guess which column holds what.
 *
 * Each column is claimed once, and the first pattern to match a header wins the
 * field — so a file with `Part Number` and `Item Code` does not map both to the
 * model, which would silently drop one of them.
 */
export function guessAckMapping(headers: string[]): AckMapping {
  const mapping: AckMapping = {};
  const claimedColumns = new Set<number>();

  for (const { field, patterns } of HEADER_PATTERNS) {
    for (const pattern of patterns) {
      const index = headers.findIndex(
        (header, i) => !claimedColumns.has(i) && pattern.test(header.trim())
      );
      if (index !== -1) {
        mapping[field] = index;
        claimedColumns.add(index);
        break;
      }
    }
  }

  return mapping;
}

/** A field is useless if it identifies nothing — a row must name its product. */
export function canMatchOn(mapping: AckMapping): boolean {
  return mapping.model_number !== undefined || mapping.description !== undefined;
}

const cell = (row: string[], index: number | undefined): string | null => {
  if (index === undefined) return null;
  const value = row[index]?.trim();
  return value && value.length > 0 ? value : null;
};

/**
 * Normalise a ship date to `YYYY-MM-DD`, or null.
 *
 * Null rather than a guess. Ambiguous input — `03/04/25` is March or April
 * depending on which side of the Atlantic wrote it — moves a crew booking by a
 * month if guessed wrong, and an empty field a person fills in is cheaper than a
 * confident wrong one they do not check.
 */
export function normalizeShipDate(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return trimmed;

  // US convention only, and only with a four-digit year: a two-digit year is
  // not worth the century it implies.
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) {
    const [, month, day, year] = us;
    const m = Number(month);
    const d = Number(day);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return null;
}

/** Turn mapped rows into acknowledgment rows, ready for matching. */
export function rowsToAckRows(rows: string[][], mapping: AckMapping): AckRow[] {
  const out: AckRow[] = [];

  rows.forEach((row, index) => {
    const modelNumber = cell(row, mapping.model_number);
    const description = cell(row, mapping.description);

    // A row naming no product cannot be attached to anything, so it is dropped
    // here rather than becoming an unmatchable row downstream.
    if (!modelNumber && !description) return;

    out.push({
      modelNumber,
      description,
      quantity: parseNumber(cell(row, mapping.quantity)),
      unitCost: parseNumber(cell(row, mapping.unit_cost)),
      shipDate: normalizeShipDate(cell(row, mapping.ship_date)),
      sourceRow: index + 1,
    });
  });

  return out;
}
