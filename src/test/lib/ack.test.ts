/**
 * Acknowledgment ingestion
 *
 * Reading a manufacturer's answer, and attaching each row to the ordered line
 * it belongs to.
 */

import { describe, it, expect } from 'vitest';
import {
  matchAcknowledgment,
  needsReview,
  normalizeModel,
  guessAckMapping,
  canMatchOn,
  normalizeShipDate,
  rowsToAckRows,
  ingestAcknowledgmentFile,
  type AckRow,
  type MatchTarget,
} from '@/lib/ack';

function target(over: Partial<MatchTarget> = {}): MatchTarget {
  return {
    poLineId: 'po-1',
    lineNumber: 1,
    modelNumber: 'AN-4830',
    description: 'Panel, 48W x 30H',
    quantity: 4,
    unitCost: 225,
    ...over,
  };
}

function row(over: Partial<AckRow> = {}): AckRow {
  return {
    modelNumber: 'AN-4830',
    description: 'Panel, 48W x 30H',
    quantity: 4,
    unitCost: 231,
    shipDate: '2026-09-14',
    sourceRow: 1,
    ...over,
  };
}

describe('normalizeModel', () => {
  it('treats every way a part number gets written as the same part', () => {
    // The specification tool, the dealer and the factory all punctuate
    // differently, and none of them are wrong.
    const expected = 'AN4830';
    expect(normalizeModel('AN-4830')).toBe(expected);
    expect(normalizeModel('an 4830')).toBe(expected);
    expect(normalizeModel('AN.4830')).toBe(expected);
    expect(normalizeModel('AN4830')).toBe(expected);
  });

  it('is empty for nothing, rather than throwing', () => {
    expect(normalizeModel(null)).toBe('');
    expect(normalizeModel(undefined)).toBe('');
  });
});

describe('matchAcknowledgment', () => {
  it('matches on model number regardless of punctuation', () => {
    const result = matchAcknowledgment(
      [row({ modelNumber: 'an 4830' })],
      [target()]
    );
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.confidence).toBe('exact');
    expect(result.matches[0]!.poLineId).toBe('po-1');
  });

  it('says so when quantity agrees too', () => {
    const result = matchAcknowledgment([row({ quantity: 4 })], [target({ quantity: 4 })]);
    expect(result.matches[0]!.reason).toContain('quantity');
  });

  it('falls back to an exact description when there is no model number', () => {
    const result = matchAcknowledgment(
      [row({ modelNumber: null })],
      [target({ modelNumber: null })]
    );
    expect(result.matches[0]!.confidence).toBe('likely');
  });

  it('offers a similar description as weak rather than applying it', () => {
    const result = matchAcknowledgment(
      [row({ modelNumber: null, description: 'Panel 48W 30H acoustic' })],
      [target({ modelNumber: null, description: 'Panel, 48W x 30H' })]
    );
    expect(result.matches[0]!.confidence).toBe('weak');
    expect(result.matches[0]!.reason).toContain('check this one');
  });

  it('refuses to match two descriptions with nothing in common', () => {
    const result = matchAcknowledgment(
      [row({ modelNumber: null, description: 'Task chair, mesh back' })],
      [target({ modelNumber: null, description: 'Panel, 48W x 30H' })]
    );
    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedRows).toHaveLength(1);
    expect(result.unmatchedTargets).toHaveLength(1);
  });

  it('never lets two rows claim the same line', () => {
    const result = matchAcknowledgment(
      [row({ sourceRow: 1 }), row({ sourceRow: 2 })],
      [target()]
    );
    expect(result.matches).toHaveLength(1);
    expect(result.unmatchedRows).toHaveLength(1);
  });

  it('lets an exact match win a line over another row’s weak one', () => {
    // Processing in file order would let the weak row arrive first and take it.
    const weakRow = row({
      sourceRow: 1,
      modelNumber: null,
      description: 'Panel 48W 30H acoustic',
    });
    const exactRow = row({ sourceRow: 2, modelNumber: 'AN-4830' });

    const result = matchAcknowledgment([weakRow, exactRow], [target()]);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]!.confidence).toBe('exact');
    expect(result.matches[0]!.row.sourceRow).toBe(2);
  });

  it('reports what the acknowledgment never mentioned', () => {
    // A line nobody answered is invisible if only unmatched rows are shown, and
    // it is the half that means the order is not fully acknowledged.
    const result = matchAcknowledgment(
      [row()],
      [target(), target({ poLineId: 'po-2', modelNumber: 'TC-100', description: 'Task chair' })]
    );
    expect(result.matches).toHaveLength(1);
    expect(result.unmatchedTargets).toHaveLength(1);
    expect(result.unmatchedTargets[0]!.poLineId).toBe('po-2');
  });

  it('returns matches in file order', () => {
    const result = matchAcknowledgment(
      [
        row({ sourceRow: 2, modelNumber: 'TC-100', description: 'Task chair' }),
        row({ sourceRow: 1, modelNumber: 'AN-4830' }),
      ],
      [target(), target({ poLineId: 'po-2', modelNumber: 'TC-100', description: 'Task chair' })]
    );
    expect(result.matches.map(m => m.row.sourceRow)).toEqual([1, 2]);
  });

  it('handles an empty acknowledgment without claiming anything', () => {
    const result = matchAcknowledgment([], [target()]);
    expect(result.matches).toEqual([]);
    expect(result.unmatchedTargets).toHaveLength(1);
  });
});

describe('needsReview', () => {
  it('counts everything a person has to look at', () => {
    const result = matchAcknowledgment(
      [
        row({ sourceRow: 1 }),
        row({ sourceRow: 2, modelNumber: null, description: 'Nothing like it' }),
      ],
      [target()]
    );
    // One exact match needs nothing; the orphan row does.
    expect(needsReview(result)).toBe(1);
  });
});

describe('guessAckMapping', () => {
  it('finds the usual columns', () => {
    const mapping = guessAckMapping([
      'Part Number',
      'Description',
      'Ship Qty',
      'Net Price',
      'Est Ship Date',
    ]);
    expect(mapping.model_number).toBe(0);
    expect(mapping.description).toBe(1);
    expect(mapping.quantity).toBe(2);
    expect(mapping.unit_cost).toBe(3);
    expect(mapping.ship_date).toBe(4);
  });

  it('takes net over list when a file carries both', () => {
    // Taking the list price makes every margin on the job wrong.
    const mapping = guessAckMapping(['Model', 'List Price', 'Net Price']);
    expect(mapping.unit_cost).toBe(2);
  });

  it('claims each column once', () => {
    const mapping = guessAckMapping(['Part', 'Model']);
    const claimed = Object.values(mapping);
    expect(new Set(claimed).size).toBe(claimed.length);
  });

  it('knows when a file identifies nothing', () => {
    expect(canMatchOn(guessAckMapping(['Qty', 'Net Price']))).toBe(false);
    expect(canMatchOn(guessAckMapping(['Model', 'Qty']))).toBe(true);
  });
});

describe('normalizeShipDate', () => {
  it('passes ISO through', () => {
    expect(normalizeShipDate('2026-09-14')).toBe('2026-09-14');
  });

  it('converts a US date with a four-digit year', () => {
    expect(normalizeShipDate('9/14/2026')).toBe('2026-09-14');
    expect(normalizeShipDate('09/04/2026')).toBe('2026-09-04');
  });

  it('refuses a two-digit year rather than picking a century', () => {
    expect(normalizeShipDate('03/04/25')).toBeNull();
  });

  it('refuses an impossible date', () => {
    expect(normalizeShipDate('13/40/2026')).toBeNull();
  });

  it('is null for nothing', () => {
    expect(normalizeShipDate(null)).toBeNull();
    expect(normalizeShipDate('')).toBeNull();
  });
});

describe('rowsToAckRows', () => {
  const mapping = {
    model_number: 0,
    description: 1,
    quantity: 2,
    unit_cost: 3,
    ship_date: 4,
  };

  it('reads a row', () => {
    const [ackRow] = rowsToAckRows(
      [['AN-4830', 'Panel', '4', '$231.00', '9/14/2026']],
      mapping
    );
    expect(ackRow).toMatchObject({
      modelNumber: 'AN-4830',
      description: 'Panel',
      quantity: 4,
      unitCost: 231,
      shipDate: '2026-09-14',
      sourceRow: 1,
    });
  });

  it('drops rows naming no product', () => {
    // Subtotal and page-footer rows, which cannot attach to anything.
    const rows = rowsToAckRows(
      [
        ['AN-4830', 'Panel', '4', '225', ''],
        ['', '', '', '900', ''],
      ],
      mapping
    );
    expect(rows).toHaveLength(1);
  });

  it('numbers rows by their place in the file', () => {
    const rows = rowsToAckRows(
      [
        ['AN-4830', 'Panel', '1', '1', ''],
        ['TC-100', 'Chair', '1', '1', ''],
      ],
      mapping
    );
    expect(rows.map(r => r.sourceRow)).toEqual([1, 2]);
  });
});

describe('ingestAcknowledgmentFile', () => {
  const targets: MatchTarget[] = [
    target({ poLineId: 'po-1', modelNumber: 'AN-4830', description: 'Panel', quantity: 4, unitCost: 225 }),
    target({ poLineId: 'po-2', modelNumber: 'TC-100', description: 'Task chair', quantity: 10, unitCost: 410 }),
  ];

  const file = [
    'Part Number\tDescription\tShip Qty\tNet Price\tEst Ship Date',
    'AN-4830\tPanel\t4\t231.00\t9/14/2026',
    'TC-100\tTask chair\t10\t402.50\t9/28/2026',
  ].join('\n');

  it('fills in every line the acknowledgment answered', () => {
    const result = ingestAcknowledgmentFile(file, targets);
    expect(result.appliedCount).toBe(2);
    expect(result.applied['po-1']).toEqual({ quantity: '4', unitCost: '231' });
    expect(result.applied['po-2']).toEqual({ quantity: '10', unitCost: '402.5' });
  });

  it('takes the latest ship date, because that is what gates the install', () => {
    const result = ingestAcknowledgmentFile(file, targets);
    expect(result.shipDate).toBe('2026-09-28');
  });

  it('reports a line the acknowledgment never mentioned', () => {
    const partial = [
      'Part Number\tDescription\tShip Qty\tNet Price',
      'AN-4830\tPanel\t4\t231.00',
    ].join('\n');
    const result = ingestAcknowledgmentFile(partial, targets);
    expect(result.appliedCount).toBe(1);
    expect(result.unmatchedTargets.map(t => t.poLineId)).toEqual(['po-2']);
  });

  it('keeps what was ordered when a row omits a figure', () => {
    const sparse = [
      'Part Number\tDescription\tShip Qty\tNet Price',
      'AN-4830\tPanel\t\t',
    ].join('\n');
    const result = ingestAcknowledgmentFile(sparse, targets);
    // Silence about a figure means unchanged, not zero.
    expect(result.applied['po-1']).toEqual({ quantity: '4', unitCost: '225' });
  });

  it('reports a weak match instead of applying it', () => {
    const fuzzy = [
      'Description\tShip Qty\tNet Price',
      'Panel 48W 30H acoustic\t4\t999',
    ].join('\n');
    const result = ingestAcknowledgmentFile(fuzzy, targets);
    expect(result.appliedCount).toBe(0);
    expect(result.needsCheck).toHaveLength(1);
    expect(result.needsCheck[0]!.confidence).toBe('weak');
  });

  it('refuses a file that names no product', () => {
    const useless = ['Ship Qty\tNet Price', '4\t231'].join('\n');
    const result = ingestAcknowledgmentFile(useless, targets);
    expect(result.error).toContain('names a product');
    expect(result.appliedCount).toBe(0);
  });

  it('refuses an empty file', () => {
    const result = ingestAcknowledgmentFile('', targets);
    expect(result.error).toBeTruthy();
    expect(result.unmatchedTargets).toHaveLength(2);
  });
});
