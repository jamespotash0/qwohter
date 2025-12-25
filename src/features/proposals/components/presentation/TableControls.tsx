/**
 * Table Controls Component
 *
 * Floating control panel for table manipulation.
 * Provides buttons for adding/removing rows and columns,
 * merging cells, and other table operations.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import {
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
  Merge,
  Split,
  Grid3X3,
  ToggleLeft,
  Columns,
  Rows,
} from 'lucide-react';

interface TableControlsProps {
  editor: Editor;
  className?: string;
}

interface TableInfo {
  rows: number;
  columns: number;
  isInTable: boolean;
  canMerge: boolean;
  canSplit: boolean;
}

export const TableControls: React.FC<TableControlsProps> = ({ editor, className }) => {
  const [tableInfo, setTableInfo] = useState<TableInfo>({
    rows: 0,
    columns: 0,
    isInTable: false,
    canMerge: false,
    canSplit: false,
  });
  const [isVisible, setIsVisible] = useState(false);

  // Update table info on selection change
  useEffect(() => {
    const updateTableInfo = () => {
      const { state } = editor;
      const { $from } = state.selection;

      // Check if we're in a table
      let isInTable = false;
      let rows = 0;
      let columns = 0;

      for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node.type.name === 'table') {
          isInTable = true;

          // Count rows and columns
          node.forEach((row) => {
            rows++;
            if (rows === 1) {
              row.forEach(() => columns++);
            }
          });
          break;
        }
      }

      // Check merge/split capabilities
      const canMerge = editor.can().mergeCells();
      const canSplit = editor.can().splitCell();

      setTableInfo({ rows, columns, isInTable, canMerge, canSplit });
      setIsVisible(isInTable);
    };

    editor.on('selectionUpdate', updateTableInfo);
    editor.on('update', updateTableInfo);

    // Initial check
    updateTableInfo();

    return () => {
      editor.off('selectionUpdate', updateTableInfo);
      editor.off('update', updateTableInfo);
    };
  }, [editor]);

  // Table operations
  const addRowAbove = useCallback(() => {
    editor.chain().focus().addRowBefore().run();
  }, [editor]);

  const addRowBelow = useCallback(() => {
    editor.chain().focus().addRowAfter().run();
  }, [editor]);

  const deleteRow = useCallback(() => {
    editor.chain().focus().deleteRow().run();
  }, [editor]);

  const addColumnLeft = useCallback(() => {
    editor.chain().focus().addColumnBefore().run();
  }, [editor]);

  const addColumnRight = useCallback(() => {
    editor.chain().focus().addColumnAfter().run();
  }, [editor]);

  const deleteColumn = useCallback(() => {
    editor.chain().focus().deleteColumn().run();
  }, [editor]);

  const deleteTable = useCallback(() => {
    editor.chain().focus().deleteTable().run();
  }, [editor]);

  const mergeCells = useCallback(() => {
    editor.chain().focus().mergeCells().run();
  }, [editor]);

  const splitCell = useCallback(() => {
    editor.chain().focus().splitCell().run();
  }, [editor]);

  const toggleHeaderRow = useCallback(() => {
    editor.chain().focus().toggleHeaderRow().run();
  }, [editor]);

  const toggleHeaderColumn = useCallback(() => {
    editor.chain().focus().toggleHeaderColumn().run();
  }, [editor]);

  const distributeColumns = useCallback(() => {
    // Distribute columns evenly
    if (editor.commands.distributeColumnsEvenly) {
      editor.commands.distributeColumnsEvenly();
    }
  }, [editor]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'table-controls',
        'fixed z-50',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'rounded-lg shadow-lg',
        'p-2',
        'flex flex-col gap-2',
        className
      )}
    >
      {/* Table info */}
      <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        <Grid3X3 className="w-3 h-3 inline mr-1" />
        {tableInfo.rows} × {tableInfo.columns} table
      </div>

      {/* Row controls */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 w-12">Rows:</span>
        <ControlButton
          icon={<ArrowUp className="w-3 h-3" />}
          label="Add row above"
          onClick={addRowAbove}
        />
        <ControlButton
          icon={<ArrowDown className="w-3 h-3" />}
          label="Add row below"
          onClick={addRowBelow}
        />
        <ControlButton
          icon={<Minus className="w-3 h-3" />}
          label="Delete row"
          onClick={deleteRow}
          variant="danger"
        />
      </div>

      {/* Column controls */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 w-12">Cols:</span>
        <ControlButton
          icon={<ArrowLeft className="w-3 h-3" />}
          label="Add column left"
          onClick={addColumnLeft}
        />
        <ControlButton
          icon={<ArrowRight className="w-3 h-3" />}
          label="Add column right"
          onClick={addColumnRight}
        />
        <ControlButton
          icon={<Minus className="w-3 h-3" />}
          label="Delete column"
          onClick={deleteColumn}
          variant="danger"
        />
      </div>

      {/* Cell operations */}
      <div className="flex items-center gap-1 border-t border-gray-200 dark:border-gray-700 pt-2">
        <ControlButton
          icon={<Merge className="w-3 h-3" />}
          label="Merge cells"
          onClick={mergeCells}
          disabled={!tableInfo.canMerge}
        />
        <ControlButton
          icon={<Split className="w-3 h-3" />}
          label="Split cell"
          onClick={splitCell}
          disabled={!tableInfo.canSplit}
        />
      </div>

      {/* Header controls */}
      <div className="flex items-center gap-1">
        <ControlButton
          icon={<Rows className="w-3 h-3" />}
          label="Toggle header row"
          onClick={toggleHeaderRow}
        />
        <ControlButton
          icon={<Columns className="w-3 h-3" />}
          label="Toggle header column"
          onClick={toggleHeaderColumn}
        />
      </div>

      {/* Table actions */}
      <div className="flex items-center gap-1 border-t border-gray-200 dark:border-gray-700 pt-2">
        <ControlButton
          icon={<ToggleLeft className="w-3 h-3" />}
          label="Distribute columns"
          onClick={distributeColumns}
        />
        <ControlButton
          icon={<Trash2 className="w-3 h-3" />}
          label="Delete table"
          onClick={deleteTable}
          variant="danger"
        />
      </div>
    </div>
  );
};

// Control button component
interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

const ControlButton: React.FC<ControlButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'default',
}) => (
  <button
    type="button"
    className={cn(
      'p-1.5 rounded',
      'transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      disabled && 'opacity-50 cursor-not-allowed',
      variant === 'default' && [
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'text-gray-700 dark:text-gray-300',
      ],
      variant === 'danger' && [
        'hover:bg-red-100 dark:hover:bg-red-900/30',
        'text-red-600 dark:text-red-400',
      ]
    )}
    onClick={onClick}
    disabled={disabled}
    title={label}
  >
    {icon}
  </button>
);

export default TableControls;
