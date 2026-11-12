/**
 * Specification file parsing
 *
 * Reads what a designer exported from CET, Giza, or 2020 and turns it into
 * rows a human can check before anything is written.
 *
 * Deliberately TOLERANT rather than a parser for one dialect. SIF is a family
 * of formats, not a single one: it varies by tool, by version, and by which
 * catalog produced it, and a parser hard-coded to one layout silently
 * mis-reads every other one. So this detects the shape, hands back what it
 * found, and lets the import screen confirm the mapping — which is also how a
 * dealer discovers their tool exports something unexpected, rather than
 * discovering it when 500 lines land wrong.
 *
 * The mapping is the contract. Once confirmed for a manufacturer or a tool it
 * can be stored and reused, so the second file of the same shape needs no
 * confirming.
 */

/** A delimiter we know how to split on, in order of how distinctive it is. */
const CANDIDATE_DELIMITERS = ['\t', '|', ';', ','] as const;
export type Delimiter = (typeof CANDIDATE_DELIMITERS)[number];

export interface ParsedFile {
  delimiter: Delimiter;
  /** Header row, when the file appears to have one. */
  headers: string[];
  /** Every data row, already split. Ragged rows are padded, never dropped. */
  rows: string[][];
  /** Lines that could not be split into the expected shape. */
  skipped: { lineNumber: number; text: string }[];
  /** True when the first row looked like labels rather than data. */
  hasHeaderRow: boolean;
}

/**
 * Split one delimited line, honouring double quotes.
 *
 * Option strings routinely contain commas — `"48W, 30D, LH"` is one field, not
 * three — so a naive split corrupts exactly the field that decides which
 * product gets built.
 */
export function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;

    if (ch === '"') {
      // A doubled quote inside a quoted field is a literal quote.
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      out.push(field.trim());
      field = '';
      continue;
    }

    field += ch;
  }

  out.push(field.trim());
  return out;
}

/**
 * Which delimiter this file uses.
 *
 * Chosen by consistency, not by frequency. A file full of prose commas can
 * contain more commas than tabs while still being tab-delimited, so the winner
 * is the delimiter that yields the same non-trivial field count on the most
 * lines.
 */
export function detectDelimiter(lines: string[]): Delimiter {
  const sample = lines.slice(0, 50);
  let best: { delimiter: Delimiter; score: number; fields: number } = {
    delimiter: ',',
    score: 0,
    fields: 0,
  };

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = sample.map(line => splitLine(line, delimiter).length);
    const withFields = counts.filter(n => n > 1);
    if (withFields.length === 0) continue;

    // The most common field count, and how many lines agree on it.
    const tally = new Map<number, number>();
    for (const n of withFields) tally.set(n, (tally.get(n) ?? 0) + 1);
    let modeCount = 0;
    let modeFields = 0;
    for (const [fields, count] of tally) {
      if (count > modeCount) {
        modeCount = count;
        modeFields = fields;
      }
    }

    // Prefer agreement; break ties toward more columns, which is more signal.
    if (modeCount > best.score || (modeCount === best.score && modeFields > best.fields)) {
      best = { delimiter, score: modeCount, fields: modeFields };
    }
  }

  return best.delimiter;
}

/**
 * Whether the first row is labels rather than data.
 *
 * A header row is mostly non-numeric; a data row in a specification file almost
 * always carries a quantity and a price. Getting this wrong costs one row, and
 * the import screen shows the first rows anyway so a person can correct it.
 */
export function looksLikeHeader(row: string[]): boolean {
  const filled = row.filter(cell => cell.length > 0);
  if (filled.length === 0) return false;
  const numeric = filled.filter(cell => /^-?[\d.,$%]+$/.test(cell)).length;
  return numeric / filled.length < 0.25;
}

/**
 * Parse a specification export into rows.
 *
 * Blank lines are dropped. Rows shorter than the header are padded rather than
 * skipped, because a trailing empty field is routinely omitted by exporters and
 * dropping the row would lose real product.
 */
export function parseSpecFile(text: string): ParsedFile {
  const rawLines = text
    .split(/\r\n|\r|\n/)
    .map((line, index) => ({ text: line, lineNumber: index + 1 }))
    .filter(l => l.text.trim().length > 0);

  if (rawLines.length === 0) {
    return {
      delimiter: ',',
      headers: [],
      rows: [],
      skipped: [],
      hasHeaderRow: false,
    };
  }

  const delimiter = detectDelimiter(rawLines.map(l => l.text));
  const split = rawLines.map(l => ({
    lineNumber: l.lineNumber,
    text: l.text,
    fields: splitLine(l.text, delimiter),
  }));

  // The shape most rows agree on. Preamble and footer lines rarely match it.
  const tally = new Map<number, number>();
  for (const line of split) tally.set(line.fields.length, (tally.get(line.fields.length) ?? 0) + 1);
  let width = 0;
  let widthCount = 0;
  for (const [fields, count] of tally) {
    if (count > widthCount || (count === widthCount && fields > width)) {
      width = fields;
      widthCount = count;
    }
  }

  const kept: string[][] = [];
  const skipped: ParsedFile['skipped'] = [];

  for (const line of split) {
    if (line.fields.length === 1 && width > 1) {
      // A line with no delimiters at all is a title or a note, not a record.
      skipped.push({ lineNumber: line.lineNumber, text: line.text });
      continue;
    }
    const padded = [...line.fields];
    while (padded.length < width) padded.push('');
    kept.push(padded.slice(0, Math.max(width, line.fields.length)));
  }

  const hasHeaderRow = kept.length > 0 && looksLikeHeader(kept[0]!);
  const headers = hasHeaderRow
    ? kept[0]!.map((cell, i) => (cell.length > 0 ? cell : `Column ${i + 1}`))
    : Array.from({ length: width }, (_, i) => `Column ${i + 1}`);

  return {
    delimiter,
    headers,
    rows: hasHeaderRow ? kept.slice(1) : kept,
    skipped,
    hasHeaderRow,
  };
}
