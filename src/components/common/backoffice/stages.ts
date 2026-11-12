/**
 * Job stages
 *
 * The vocabulary the whole back office navigates by.
 *
 * These seven are exactly what `project_progress.stage` can return — no more,
 * no fewer. The database derives the stage from an event log; this file only
 * names and orders it. Adding a stage here that the view cannot produce would
 * put a step on the rail that no job ever reaches, so the list is deliberately
 * a mirror rather than a superset. If a stage is added to the view's CASE,
 * add it here too and the rail picks it up.
 *
 * Note there is no 'Billed'. Billing is prompted rather than derived (see
 * lib/billing/milestones), so a job that has been invoiced still reads
 * 'Ready to bill' until the schedule says otherwise. That is the view's
 * position and this does not argue with it.
 */

export const JOB_STAGES = [
  'Quoted',
  'Released',
  'Ordering',
  'Awaiting delivery',
  'Receiving',
  'Installing',
  'Ready to bill',
] as const;

export type JobStage = (typeof JOB_STAGES)[number];

/** Long labels, for headers and prose. Same strings the view emits. */
export const STAGE_LABELS: Record<JobStage, string> = {
  Quoted: 'Quoted',
  Released: 'Released',
  Ordering: 'Ordering',
  'Awaiting delivery': 'Awaiting delivery',
  Receiving: 'Receiving',
  Installing: 'Installing',
  'Ready to bill': 'Ready to bill',
};

/**
 * Short labels for the rail, where seven words have to fit across a phone.
 * Only shortened where it stays unambiguous — 'Receiving' does not compress
 * to anything a warehouse would recognise, so it does not compress.
 */
export const STAGE_SHORT_LABELS: Record<JobStage, string> = {
  Quoted: 'Quoted',
  Released: 'Released',
  Ordering: 'Ordering',
  'Awaiting delivery': 'In transit',
  Receiving: 'Receiving',
  Installing: 'Installing',
  'Ready to bill': 'Bill',
};

/**
 * What a person does at each stage, in the imperative. This is the label on
 * the job header's single primary action, so it reads as a command rather than
 * a description — "Receive product", not "Receiving".
 */
export const STAGE_PRIMARY_ACTIONS: Record<JobStage, string> = {
  Quoted: 'Release to order',
  Released: 'Place with manufacturer',
  Ordering: 'Record acknowledgment',
  'Awaiting delivery': 'Add shipment',
  Receiving: 'Receive product',
  Installing: 'Schedule crew',
  'Ready to bill': 'Create billing schedule',
};

/** One line explaining what the stage means, for empty states and tooltips. */
export const STAGE_DESCRIPTIONS: Record<JobStage, string> = {
  Quoted: 'Won, but nothing has been ordered yet.',
  Released: 'Approved to order. Nothing has gone to a manufacturer.',
  Ordering: 'Placed with manufacturers, waiting on acknowledgments.',
  'Awaiting delivery': 'Everything orderable is on order. Product is in transit.',
  Receiving: 'Product is arriving at the dock.',
  Installing: 'A crew is on site.',
  'Ready to bill': 'Everything is installed. This is money owed.',
};

const STAGE_INDEX = new Map<string, number>(
  JOB_STAGES.map((stage, index) => [stage, index])
);

/** Position on the rail. Unknown stages sort to the front rather than throwing. */
export function stageIndex(stage: string | null | undefined): number {
  if (!stage) return 0;
  return STAGE_INDEX.get(stage) ?? 0;
}

/** Whether `stage` is a recognised job stage. */
export function isJobStage(stage: string | null | undefined): stage is JobStage {
  return !!stage && STAGE_INDEX.has(stage);
}

/**
 * Coerce whatever the view returned into a stage. A project with no orders is
 * 'Quoted', which is also the safest fallback for a null.
 */
export function asJobStage(stage: string | null | undefined): JobStage {
  return isJobStage(stage) ? stage : 'Quoted';
}

/** Where a stage sits relative to where the job is now. */
export type StagePosition = 'done' | 'current' | 'upcoming';

export function stagePosition(stage: JobStage, current: JobStage): StagePosition {
  const a = stageIndex(stage);
  const b = stageIndex(current);
  if (a < b) return 'done';
  if (a === b) return 'current';
  return 'upcoming';
}
