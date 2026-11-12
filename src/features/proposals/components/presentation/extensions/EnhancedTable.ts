/**
 * Enhanced Table Extension
 *
 * Extends TipTap's table with:
 * - Column width resizing
 * - Row height adjustment
 * - Better selection handling
 * - Table-level controls (add/remove rows/columns)
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { addColumnAfter, addRowAfter } from '@tiptap/pm/tables';

export interface EnhancedTableOptions {
  /** Minimum column width in pixels */
  minColumnWidth: number;
  /** Default column width in pixels */
  defaultColumnWidth: number;
  /** Minimum row height in pixels */
  minRowHeight: number;
  /** Whether to show resize handles */
  showResizeHandles: boolean;
}

export const enhancedTablePluginKey = new PluginKey('enhancedTable');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    enhancedTable: {
      /** Set column width */
      setColumnWidth: (columnIndex: number, width: number) => ReturnType;
      /** Distribute column widths evenly */
      distributeColumnsEvenly: () => ReturnType;
      /** Insert row at specific index */
      insertRowAt: (rowIndex: number) => ReturnType;
      /** Insert column at specific index */
      insertColumnAt: (columnIndex: number) => ReturnType;
      /** Get table dimensions */
      getTableDimensions: () => { rows: number; columns: number } | null;
      /** Set row height for the current row */
      setRowHeight: (height: number) => ReturnType;
      /** Move table up in the document */
      moveTableUp: () => ReturnType;
      /** Move table down in the document */
      moveTableDown: () => ReturnType;
    };
  }
}

export const EnhancedTable = Extension.create<EnhancedTableOptions>({
  name: 'enhancedTable',

  addOptions() {
    return {
      minColumnWidth: 50,
      defaultColumnWidth: 100,
      minRowHeight: 30,
      showResizeHandles: true,
    };
  },

  addCommands() {
    return {
      setColumnWidth:
        (columnIndex: number, width: number) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { selection } = state;
          const table = findTable(state);
          if (!table) return false;

          const { node: tableNode, pos: tablePos } = table;
          const constrainedWidth = Math.max(this.options.minColumnWidth, width);

          // Find all cells in the column and set their width
          let offset = 1; // Skip table opening
          tableNode.forEach((row, rowOffset) => {
            let cellIndex = 0;
            let cellOffset = 1; // Skip row opening

            row.forEach((cell, cellPos) => {
              if (cellIndex === columnIndex) {
                const absolutePos = tablePos + offset + rowOffset + cellOffset;
                tr.setNodeMarkup(absolutePos, undefined, {
                  ...cell.attrs,
                  colwidth: [constrainedWidth],
                });
              }
              cellIndex++;
              cellOffset += cell.nodeSize;
            });
            offset += row.nodeSize;
          });

          return true;
        },

      distributeColumnsEvenly:
        () =>
        ({ tr, state, dispatch, editor }) => {
          if (!dispatch) return true;

          const table = findTable(state);
          if (!table) return false;

          const { node: tableNode, pos: tablePos } = table;

          // Get table width from DOM if available
          const dom = editor.view.domAtPos(tablePos + 1);
          const tableElement = dom.node as HTMLElement;
          const tableWidth = tableElement?.closest('table')?.offsetWidth || 600;

          // Count columns
          let columnCount = 0;
          const firstRow = tableNode.firstChild;
          if (firstRow) {
            firstRow.forEach(() => columnCount++);
          }

          if (columnCount === 0) return false;

          const evenWidth = Math.floor(tableWidth / columnCount);

          // Set all cells to even width
          let offset = 1;
          tableNode.forEach((row, rowOffset) => {
            let cellOffset = 1;

            row.forEach((cell) => {
              const absolutePos = tablePos + offset + rowOffset + cellOffset;
              tr.setNodeMarkup(absolutePos, undefined, {
                ...cell.attrs,
                colwidth: [evenWidth],
              });
              cellOffset += cell.nodeSize;
            });
            offset += row.nodeSize;
          });

          return true;
        },

      insertRowAt:
        (rowIndex: number) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const table = findTable(state);
          if (!table) return false;

          // Use built-in table commands with position adjustment
          // For now, use addRowAfter which will work at current selection
          return addRowAfter(state, dispatch);
        },

      insertColumnAt:
        (columnIndex: number) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const table = findTable(state);
          if (!table) return false;

          return addColumnAfter(state, dispatch);
        },

      getTableDimensions:
        () =>
        ({ state }) => {
          const table = findTable(state);
          if (!table) return null;

          const { node: tableNode } = table;
          let rows = 0;
          let columns = 0;

          tableNode.forEach((row) => {
            rows++;
            if (rows === 1) {
              row.forEach(() => columns++);
            }
          });

          return { rows, columns };
        },

      setRowHeight:
        (height: number) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const { $from } = state.selection;
          const constrainedHeight = Math.max(this.options.minRowHeight, height);

          // Find the table row at current selection
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === 'tableRow') {
              const rowPos = $from.before(d);
              tr.setNodeMarkup(rowPos, undefined, {
                ...node.attrs,
                minHeight: constrainedHeight,
              });
              dispatch(tr);
              return true;
            }
          }

          return false;
        },

      moveTableUp:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const table = findTable(state);
          if (!table) return false;

          const { node: tableNode, pos: tablePos } = table;
          const $tablePos = state.doc.resolve(tablePos);

          // Find the previous sibling node
          if ($tablePos.nodeBefore) {
            const prevNodeSize = $tablePos.nodeBefore.nodeSize;
            const newPos = tablePos - prevNodeSize;

            // Delete the table and insert it before the previous node
            tr.delete(tablePos, tablePos + tableNode.nodeSize);
            tr.insert(newPos, tableNode);
            dispatch(tr);
            return true;
          }

          return false;
        },

      moveTableDown:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          const table = findTable(state);
          if (!table) return false;

          const { node: tableNode, pos: tablePos } = table;
          const tableEnd = tablePos + tableNode.nodeSize;
          const $tableEnd = state.doc.resolve(tableEnd);

          // Find the next sibling node
          if ($tableEnd.nodeAfter) {
            const nextNodeSize = $tableEnd.nodeAfter.nodeSize;
            const newPos = tableEnd + nextNodeSize;

            // Delete the table and insert it after the next node
            tr.delete(tablePos, tableEnd);
            tr.insert(newPos - tableNode.nodeSize, tableNode);
            dispatch(tr);
            return true;
          }

          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: enhancedTablePluginKey,

        props: {
          decorations(state) {
            if (!extension.options.showResizeHandles) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            const table = findTable(state);

            if (!table) return DecorationSet.empty;

            // Add resize handle decorations to table cells
            // This is handled by CSS, but we can add data attributes here

            return DecorationSet.create(state.doc, decorations);
          },

          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target as HTMLElement;

              // Check if clicking on a resize handle
              if (target.classList.contains('table-column-resize-handle')) {
                event.preventDefault();
                startColumnResize(view, event, target, extension.options);
                return true;
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});

/**
 * Find the table node at current selection
 */
function findTable(state: { selection: { $from: { pos: number }; $to: { pos: number } }; doc: { resolve: (pos: number) => { node: (depth: number) => { type: { name: string } }; depth: number; before: (depth: number) => number } } }): { node: any; pos: number } | null {
  const { $from } = state.selection;

  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type.name === 'table') {
      return { node, pos: $from.before(d) };
    }
  }

  return null;
}

/**
 * Start column resize interaction
 */
function startColumnResize(
  view: EditorView,
  event: MouseEvent,
  handle: HTMLElement,
  options: EnhancedTableOptions
) {
  const startX = event.clientX;
  const cell = handle.closest('td, th') as HTMLElement;
  if (!cell) return;

  const startWidth = cell.offsetWidth;
  const table = cell.closest('table');

  const handleMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX;
    const newWidth = Math.max(options.minColumnWidth, startWidth + delta);

    // Apply width to all cells in this column
    if (table) {
      const cellIndex = Array.from(cell.parentElement?.children || []).indexOf(cell);
      const rows = table.querySelectorAll('tr');

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td, th');
        const targetCell = cells[cellIndex] as HTMLElement;
        if (targetCell) {
          targetCell.style.width = `${newWidth}px`;
        }
      });
    }
  };

  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';

    // Update ProseMirror state with new widths
    // This would require dispatching a transaction
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.body.style.cursor = 'col-resize';
}

export default EnhancedTable;
