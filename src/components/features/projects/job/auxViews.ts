/**
 * Aux views
 *
 * The panels that belong to the whole job rather than to a step of it. Kept
 * apart from the header component so both the header and the page can name
 * them without either importing the other.
 */

/** Panels that belong to the whole job rather than to a stage of it. */
export const AUX_VIEWS = ['lines', 'activity', 'tasks', 'changes', 'files'] as const;
export type AuxView = (typeof AUX_VIEWS)[number];

export const AUX_LABELS: Record<AuxView, string> = {
  // What was sold is worth reading at any stage, not only at the one where it
  // was the whole job, so the line list lives here rather than on the rail.
  lines: 'Lines',
  activity: 'Activity',
  tasks: 'Tasks',
  changes: 'Changes',
  files: 'Files',
};
