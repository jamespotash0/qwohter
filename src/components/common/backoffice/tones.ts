/**
 * Tones
 *
 * Six tones, and the status vocabularies that map onto them.
 *
 * It replaces four separate colour maps that between them used eight hues —
 * gray, blue, amber, indigo, cyan, violet, emerald and red — to say things
 * like "Ordered" and "Submitted". Eight colours is not a legend anybody
 * learns; it is decoration that looks like meaning. The six tones here are
 * semantic, and the same tone means the same thing on every screen:
 *
 *   neutral   nothing has happened yet, or it is over and nobody cares
 *   info      in flight, nothing wrong
 *   active    happening right now, usually with a person on site
 *   warn      waiting on somebody — this is the one that needs a human
 *   danger    costing money, or broken
 *   success   done, and done correctly
 *
 * Where a job is on the rail is shown by position, not hue, which is why the
 * stage progression is not encoded here.
 */

export type Tone = 'neutral' | 'info' | 'active' | 'warn' | 'danger' | 'success';

/** Filled pill styles, used for statuses. */
export const TONE_PILL: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  active: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  danger: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
};

/** Bordered styles, for chips sitting on an already-tinted surface. */
export const TONE_OUTLINE: Record<Tone, string> = {
  neutral: 'border-gray-200 text-gray-700 dark:border-gray-600 dark:text-gray-300',
  info: 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400',
  active: 'border-violet-200 text-violet-700 dark:border-violet-800 dark:text-violet-400',
  warn: 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400',
  danger: 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-400',
  success: 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400',
};

/** Solid fills, for the dot and stripe accents that sit beside a chip. */
export const TONE_SOLID: Record<Tone, string> = {
  neutral: 'bg-gray-400',
  info: 'bg-blue-500',
  active: 'bg-violet-500',
  warn: 'bg-amber-400',
  danger: 'bg-red-500',
  success: 'bg-emerald-500',
};

/** Border + tint for callouts and highlighted table rows. */
export const TONE_SURFACE: Record<Tone, string> = {
  neutral: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
  info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
  active: 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900/20',
  warn: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20',
  danger: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
  success: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20',
};

/** Body text that reads correctly on TONE_SURFACE. */
export const TONE_SURFACE_TEXT: Record<Tone, string> = {
  neutral: 'text-gray-700 dark:text-gray-300',
  info: 'text-blue-800 dark:text-blue-300',
  active: 'text-violet-800 dark:text-violet-300',
  warn: 'text-amber-800 dark:text-amber-300',
  danger: 'text-red-800 dark:text-red-300',
  success: 'text-emerald-800 dark:text-emerald-300',
};

// ============================================================================
// The status vocabularies, each mapped onto the six tones
/** sales_orders.status, and the derived_status the progress view reports. */
export const ORDER_STATUS_TONES: Record<string, Tone> = {
  Draft: 'neutral',
  Released: 'info',
  // Somebody ordered half a job and stopped. That is a person's problem, not a
  // state, so it warns rather than reading as normal progress.
  'Partially Ordered': 'warn',
  Ordered: 'info',
  Receiving: 'active',
  Installing: 'active',
  Complete: 'success',
  Cancelled: 'neutral',
};

/** work_orders.status */
export const WORK_ORDER_STATUS_TONES: Record<string, Tone> = {
  Draft: 'neutral',
  Scheduled: 'info',
  'In Progress': 'active',
  Complete: 'success',
  Cancelled: 'neutral',
};

/** change_orders.status */
export const CHANGE_ORDER_STATUS_TONES: Record<string, Tone> = {
  Requested: 'warn',
  Pricing: 'info',
  Submitted: 'info',
  Approved: 'success',
  Rejected: 'danger',
  Withdrawn: 'neutral',
};

/** po_line_variance.variance_status */
export const VARIANCE_STATUS_TONES: Record<string, Tone> = {
  awaiting_ack: 'warn',
  match: 'success',
  // A price that moved costs the dealer margin; a date that moved costs them a
  // crew booking. Both matter, but only one of them is money.
  price: 'danger',
  date: 'warn',
  price_and_date: 'danger',
};

/** Human labels for variance statuses, which arrive as snake_case. */
export const VARIANCE_STATUS_LABELS: Record<string, string> = {
  awaiting_ack: 'Awaiting ack',
  match: 'Match',
  price: 'Price',
  date: 'Date',
  price_and_date: 'Price + date',
};

/**
 * The chip's own fill classes, for controls that carry a status but are not
 * chips — a `<Select>` trigger that shows the status it sets, for instance.
 * Prefer `<StatusChip>` wherever the thing is genuinely just a label.
 */
export function tonePillClass(tone: Tone): string {
  return TONE_PILL[tone];
}

/** Look a status up in a vocabulary, falling back to neutral. */
export function toneFor(
  vocabulary: Record<string, Tone>,
  status: string | null | undefined
): Tone {
  if (!status) return 'neutral';
  return vocabulary[status] ?? 'neutral';
}

