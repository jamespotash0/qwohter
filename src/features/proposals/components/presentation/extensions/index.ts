/**
 * Custom Tiptap Extensions
 */

export { FontSize } from './FontSize';
export { LineHeight } from './LineHeight';

// Page-based editor extensions
export { PageNode } from './PageNode';
export type { PageNodeOptions } from './PageNode';
export { Pagination, paginationPluginKey } from './Pagination';
export type { PaginationOptions } from './Pagination';
export * from './pageMeasurement';

// Canvas-like positioning extensions
export { PositionedBlock } from './PositionedBlock';
export type { PositionedBlockOptions, PositionedBlockAttrs } from './PositionedBlock';

// Enhanced table extensions
export { EnhancedTable, enhancedTablePluginKey } from './EnhancedTable';
export type { EnhancedTableOptions } from './EnhancedTable';
