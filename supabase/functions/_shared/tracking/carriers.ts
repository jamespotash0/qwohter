/**
 * Carrier identity.
 *
 * A vendor writes "Old Dominion", "ODFL", "O.D. Freight" and "old dominion
 * freight line" on four consecutive acknowledgments, and all four have to
 * become one slug before any API will answer. This is that translation.
 *
 * Slugs follow AfterShip's courier list, which has become the de-facto naming
 * for multi-carrier tracking; the EasyPost adapter maps them onto its own
 * names. Anything not in this table is passed through as typed and handed to
 * the provider's own detection, which is better at the long tail of regional
 * freight lines than any list checked into a repo could be.
 */

/** Carriers common enough in contract furniture to be worth naming. */
export const KNOWN_CARRIERS: Record<string, { name: string; kind: 'parcel' | 'ltl' | 'dedicated' }> = {
  // Parcel
  fedex: { name: 'FedEx', kind: 'parcel' },
  'fedex-freight': { name: 'FedEx Freight', kind: 'ltl' },
  ups: { name: 'UPS', kind: 'parcel' },
  'ups-freight': { name: 'UPS Freight', kind: 'ltl' },
  usps: { name: 'USPS', kind: 'parcel' },
  'dhl-express': { name: 'DHL Express', kind: 'parcel' },
  dhl: { name: 'DHL eCommerce', kind: 'parcel' },
  ontrac: { name: 'OnTrac', kind: 'parcel' },
  'canada-post': { name: 'Canada Post', kind: 'parcel' },
  purolator: { name: 'Purolator', kind: 'parcel' },

  // LTL freight -- how most casegoods and systems furniture actually moves
  'estes-express': { name: 'Estes Express Lines', kind: 'ltl' },
  'old-dominion-freight': { name: 'Old Dominion Freight Line', kind: 'ltl' },
  'xpo-logistics': { name: 'XPO Logistics', kind: 'ltl' },
  'saia-freight': { name: 'Saia LTL Freight', kind: 'ltl' },
  'rl-carriers': { name: 'R+L Carriers', kind: 'ltl' },
  'abf-freight': { name: 'ABF Freight', kind: 'ltl' },
  'southeastern-freight-lines': { name: 'Southeastern Freight Lines', kind: 'ltl' },
  'averitt-express': { name: 'Averitt Express', kind: 'ltl' },
  'pitt-ohio': { name: 'PITT OHIO', kind: 'ltl' },
  'tforce-freight': { name: 'TForce Freight', kind: 'ltl' },
  'dayton-freight': { name: 'Dayton Freight Lines', kind: 'ltl' },
  'central-freight': { name: 'Central Freight Lines', kind: 'ltl' },
  'daylight-transport': { name: 'Daylight Transport', kind: 'ltl' },

  /**
   * The dealer's own truck, or an installer's. No API exists and none is
   * coming. It gets a code anyway, because the alternative is that exactly the
   * deliveries a dealer controls most directly are the ones invisible to the
   * system tracking everything else.
   */
  'own-truck': { name: 'Own truck', kind: 'dedicated' },
  /** A local delivery or white-glove agent the manufacturer subcontracts. */
  'delivery-agent': { name: 'Delivery agent', kind: 'dedicated' },
};

/** Carriers with nobody to ask. Recorded here, advanced by hand. */
export const MANUAL_CARRIERS = new Set(['own-truck', 'delivery-agent']);

/**
 * Spellings seen on real acknowledgments, mapped onto slugs. Deliberately
 * short: this catches the handful that appear constantly, and detection
 * handles the rest.
 */
const ALIASES: Record<string, string> = {
  'federal express': 'fedex',
  fedexground: 'fedex',
  'fedex ground': 'fedex',
  'fedex express': 'fedex',
  'fedex freight': 'fedex-freight',
  'united parcel service': 'ups',
  'ups ground': 'ups',
  'u.p.s.': 'ups',
  'us postal service': 'usps',
  'united states postal service': 'usps',
  'postal service': 'usps',
  dhl: 'dhl-express',
  'dhl express': 'dhl-express',
  estes: 'estes-express',
  'estes express': 'estes-express',
  'estes express lines': 'estes-express',
  odfl: 'old-dominion-freight',
  'old dominion': 'old-dominion-freight',
  'old dominion freight line': 'old-dominion-freight',
  'o.d. freight': 'old-dominion-freight',
  xpo: 'xpo-logistics',
  saia: 'saia-freight',
  'saia ltl freight': 'saia-freight',
  'r+l': 'rl-carriers',
  'r&l': 'rl-carriers',
  'r+l carriers': 'rl-carriers',
  abf: 'abf-freight',
  'arcbest': 'abf-freight',
  sefl: 'southeastern-freight-lines',
  southeastern: 'southeastern-freight-lines',
  averitt: 'averitt-express',
  'pitt ohio': 'pitt-ohio',
  tforce: 'tforce-freight',
  'ups freight': 'tforce-freight',
  'dayton freight': 'dayton-freight',
  daylight: 'daylight-transport',
  'our truck': 'own-truck',
  'own truck': 'own-truck',
  'company truck': 'own-truck',
  'will call': 'own-truck',
  'local delivery': 'delivery-agent',
  'white glove': 'delivery-agent',
};

/**
 * A slug from whatever a human typed, or null if it is not recognizable.
 *
 * Null is a real answer and not a failure: the provider's own detection is
 * better at regional freight lines than this table, and returning a wrong slug
 * is worse than returning none -- a wrong slug produces a confident "not
 * found" against a carrier that never had the freight.
 */
export function normalizeCarrier(input: string | null | undefined): string | null {
  if (!input) return null;

  const cleaned = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleaned) return null;

  if (KNOWN_CARRIERS[cleaned]) return cleaned;
  if (ALIASES[cleaned]) return ALIASES[cleaned];

  const slug = cleaned.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (KNOWN_CARRIERS[slug]) return slug;
  if (ALIASES[slug.replace(/-/g, ' ')]) return ALIASES[slug.replace(/-/g, ' ')];

  return slug || null;
}

/** Whether this carrier has an API worth asking, or is moved by hand. */
export function isManualCarrier(code: string | null | undefined): boolean {
  return !!code && MANUAL_CARRIERS.has(code);
}

export function carrierDisplayName(code: string | null | undefined): string | null {
  if (!code) return null;
  return KNOWN_CARRIERS[code]?.name ?? code;
}

/**
 * Stable identity for one scan, so re-polling is idempotent.
 *
 * Plain text rather than a hash: when a checkpoint turns up twice or fails to
 * dedup, the key is the first thing anyone reads, and a hex digest tells them
 * nothing. Timestamps are normalized to the minute -- some carriers re-report
 * the same scan with seconds that drift.
 */
export function checkpointKey(parts: {
  occurred_at: string;
  status?: string | null;
  location?: string | null;
  message?: string | null;
}): string {
  const minute = (() => {
    const d = new Date(parts.occurred_at);
    return Number.isNaN(d.getTime())
      ? String(parts.occurred_at)
      : d.toISOString().slice(0, 16);
  })();

  const norm = (v: string | null | undefined) =>
    (v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

  return [minute, norm(parts.status), norm(parts.location), norm(parts.message)]
    .join('|')
    .slice(0, 400);
}
