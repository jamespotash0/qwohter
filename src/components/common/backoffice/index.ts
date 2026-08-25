/**
 * Back office primitives
 *
 * The shared vocabulary for everything between a won quote and a paid invoice.
 * Screens in this area should reach for these rather than re-deriving a chip
 * colour or a table layout — four separate status colour maps is how the last
 * version got to eight hues for six meanings.
 */

export {
  JOB_STAGES,
  STAGE_LABELS,
  STAGE_SHORT_LABELS,
  STAGE_PRIMARY_ACTIONS,
  STAGE_DESCRIPTIONS,
  stageIndex,
  isJobStage,
  asJobStage,
  stagePosition,
  type JobStage,
  type StagePosition,
} from './stages';

export {
  toneFor,
  tonePillClass,
  ORDER_STATUS_TONES,
  WORK_ORDER_STATUS_TONES,
  CHANGE_ORDER_STATUS_TONES,
  VARIANCE_STATUS_TONES,
  VARIANCE_STATUS_LABELS,
  TONE_SOLID,
  TONE_SURFACE,
  TONE_SURFACE_TEXT,
  type Tone,
} from './tones';

export { StatusChip } from './StatusChip';

export { Callout } from './Callout';
export { MoneyTiles, type MoneyTile } from './MoneyTiles';
export { StageRail, StageRailCompact } from './StageRail';
export { DataTable, type DataColumn } from './DataTable';
export { EmptyState } from './EmptyState';
