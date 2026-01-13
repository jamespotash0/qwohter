/**
 * Table Floating Menu Component
 *
 * A floating menu that appears when a table cell is selected,
 * providing quick access to table manipulation controls.
 * Uses tippy.js for positioning (same pattern as BubbleMenu).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { cn } from '@/lib/utils';
import {
  Plus,
  Minus,
  Trash2,
  Merge,
  Split,
  MoreHorizontal,
  Rows,
  Columns,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from 'lucide-react';

interface TableFloatingMenuProps {
  editor: Editor;
}

export const TableFloatingMenu: React.FC<TableFloatingMenuProps> = ({ editor }) => {
  const [showMore, setShowMore] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tippyInstanceRef = useRef<TippyInstance | null>(null);

  // Check if we're in a table cell
  const checkIsInTable = useCallback(() => {
    if (!editor) return false;
    const { state } = editor;
    const { $from } = state.selection;

    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        return true;
      }
    }
    return false;
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
    setShowMore(false);
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

  // Row height adjustment
  const increaseRowHeight = useCallback(() => {
    // Get current row height and increase by 10px
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'tableRow') {
        const currentHeight = node.attrs.minHeight || 30;
        editor.commands.setRowHeight(currentHeight + 10);
        break;
      }
    }
  }, [editor]);

  const decreaseRowHeight = useCallback(() => {
    // Get current row height and decrease by 10px
    const { $from } = editor.state.selection;
    for (let d = $from.depth; d >= 0; d--) {
      const node = $from.node(d);
      if (node.type.name === 'tableRow') {
        const currentHeight = node.attrs.minHeight || 30;
        if (currentHeight > 30) {
          editor.commands.setRowHeight(currentHeight - 10);
        }
        break;
      }
    }
  }, [editor]);

  // Table repositioning
  const moveTableUp = useCallback(() => {
    editor.commands.moveTableUp();
  }, [editor]);

  const moveTableDown = useCallback(() => {
    editor.commands.moveTableDown();
  }, [editor]);

  // Initialize tippy and handle visibility
  useEffect(() => {
    if (!editor || !menuRef.current) return;

    const editorElement = editor.view.dom;

    // Create tippy instance
    tippyInstanceRef.current = tippy(editorElement, {
      content: menuRef.current,
      interactive: true,
      trigger: 'manual',
      placement: 'top-start',
      offset: [0, 10],
      duration: [150, 100],
      hideOnClick: false,
      appendTo: () => document.body,
      // Prevent scroll jumping
      popperOptions: {
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              boundary: 'viewport',
              padding: 8,
            },
          },
          {
            name: 'flip',
            options: {
              fallbackPlacements: ['bottom-start', 'top-end', 'bottom-end'],
            },
          },
        ],
      },
      onShow: () => setIsVisible(true),
      onHide: () => {
        setIsVisible(false);
        setShowMore(false);
      },
      getReferenceClientRect: () => {
        const { state } = editor;
        const { from } = state.selection;

        try {
          const coords = editor.view.coordsAtPos(from);
          // Return valid rect only if we have reasonable values
          if (coords.top > 0 && coords.left > 0) {
            return {
              top: coords.top - 10,
              bottom: coords.bottom,
              left: coords.left,
              right: coords.right,
              width: 0,
              height: coords.bottom - coords.top,
              x: coords.left,
              y: coords.top - 10,
              toJSON: () => ({}),
            };
          }
        } catch {
          // Ignore errors
        }
        // Return a rect that won't cause scroll issues
        return {
          top: window.innerHeight / 2,
          bottom: window.innerHeight / 2,
          left: window.innerWidth / 2,
          right: window.innerWidth / 2,
          width: 0,
          height: 0,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          toJSON: () => ({}),
        };
      },
    });

    // Update visibility based on selection
    const updateVisibility = () => {
      const inTable = checkIsInTable();

      if (inTable && editor.isEditable && editor.isFocused) {
        tippyInstanceRef.current?.show();
      } else {
        tippyInstanceRef.current?.hide();
      }
    };

    editor.on('selectionUpdate', updateVisibility);
    editor.on('focus', updateVisibility);
    editor.on('blur', () => {
      // Delay hide to allow clicking menu items
      setTimeout(() => {
        if (!menuRef.current?.contains(document.activeElement)) {
          tippyInstanceRef.current?.hide();
        }
      }, 150);
    });

    // Initial check
    updateVisibility();

    return () => {
      tippyInstanceRef.current?.destroy();
      editor.off('selectionUpdate', updateVisibility);
      editor.off('focus', updateVisibility);
    };
  }, [editor, checkIsInTable]);

  // Close more menu on outside click
  useEffect(() => {
    if (!showMore) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMore(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMore]);

  const canMerge = editor?.can().mergeCells() ?? false;
  const canSplit = editor?.can().splitCell() ?? false;

  return (
    <div
      ref={menuRef}
      className={cn(
        'table-floating-menu',
        'flex items-center gap-0.5',
        'bg-white dark:bg-gray-800',
        'border border-gray-200 dark:border-gray-700',
        'rounded-lg shadow-lg',
        'px-1 py-1',
        !isVisible && 'hidden'
      )}
    >
      {/* Quick row controls */}
      <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-1 mr-1">
        <MenuButton
          icon={<Plus className="w-3.5 h-3.5" />}
          label="Add row above"
          onClick={addRowAbove}
          size="sm"
        />
        <MenuButton
          icon={<Rows className="w-3.5 h-3.5" />}
          label="Row"
          onClick={addRowBelow}
          size="sm"
        />
        <MenuButton
          icon={<Minus className="w-3.5 h-3.5" />}
          label="Delete row"
          onClick={deleteRow}
          size="sm"
          variant="danger"
        />
      </div>

      {/* Quick column controls */}
      <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-1 mr-1">
        <MenuButton
          icon={<Plus className="w-3.5 h-3.5" />}
          label="Add column left"
          onClick={addColumnLeft}
          size="sm"
        />
        <MenuButton
          icon={<Columns className="w-3.5 h-3.5" />}
          label="Add column right"
          onClick={addColumnRight}
          size="sm"
        />
        <MenuButton
          icon={<Minus className="w-3.5 h-3.5" />}
          label="Delete column"
          onClick={deleteColumn}
          size="sm"
          variant="danger"
        />
      </div>

      {/* Merge/Split */}
      <div className="flex items-center border-r border-gray-200 dark:border-gray-700 pr-1 mr-1">
        <MenuButton
          icon={<Merge className="w-3.5 h-3.5" />}
          label="Merge cells"
          onClick={mergeCells}
          size="sm"
          disabled={!canMerge}
        />
        <MenuButton
          icon={<Split className="w-3.5 h-3.5" />}
          label="Split cell"
          onClick={splitCell}
          size="sm"
          disabled={!canSplit}
        />
      </div>

      {/* More options */}
      <div className="relative">
        <MenuButton
          icon={<MoreHorizontal className="w-3.5 h-3.5" />}
          label="More options"
          onClick={() => setShowMore(!showMore)}
          size="sm"
          active={showMore}
        />

        {showMore && (
          <div
            className={cn(
              'absolute top-full right-0 mt-1',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'rounded-lg shadow-lg',
              'py-1 min-w-[180px]',
              'z-50'
            )}
          >
            {/* Row height controls */}
            <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
              Row Height
            </div>
            <div className="flex items-center gap-1 px-3 pb-1.5">
              <button
                type="button"
                onClick={decreaseRowHeight}
                className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Decrease row height"
              >
                <Minus className="w-3 h-3 mx-auto" />
              </button>
              <span className="flex-1 text-center">
                <ChevronsUpDown className="w-4 h-4 mx-auto text-gray-400" />
              </span>
              <button
                type="button"
                onClick={increaseRowHeight}
                className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Increase row height"
              >
                <Plus className="w-3 h-3 mx-auto" />
              </button>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {/* Table position controls */}
            <DropdownItem
              icon={<ArrowUp className="w-4 h-4" />}
              label="Move table up"
              onClick={moveTableUp}
            />
            <DropdownItem
              icon={<ArrowDown className="w-4 h-4" />}
              label="Move table down"
              onClick={moveTableDown}
            />
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {/* Header controls */}
            <DropdownItem
              icon={<Rows className="w-4 h-4" />}
              label="Toggle header row"
              onClick={toggleHeaderRow}
            />
            <DropdownItem
              icon={<Columns className="w-4 h-4" />}
              label="Toggle header column"
              onClick={toggleHeaderColumn}
            />
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
            <DropdownItem
              icon={<Trash2 className="w-4 h-4" />}
              label="Delete table"
              onClick={deleteTable}
              variant="danger"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Menu button component
interface MenuButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'danger';
  size?: 'sm' | 'md';
}

const MenuButton: React.FC<MenuButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  active = false,
  variant = 'default',
  size = 'md',
}) => (
  <button
    type="button"
    className={cn(
      'rounded transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
      size === 'sm' ? 'p-1' : 'p-1.5',
      disabled && 'opacity-40 cursor-not-allowed',
      active && 'bg-gray-100 dark:bg-gray-700',
      variant === 'default' && !disabled && [
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'text-gray-700 dark:text-gray-300',
      ],
      variant === 'danger' && !disabled && [
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

// Dropdown item component
interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  icon,
  label,
  onClick,
  variant = 'default',
}) => (
  <button
    type="button"
    className={cn(
      'w-full px-3 py-1.5 flex items-center gap-2 text-sm',
      'transition-colors',
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
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default TableFloatingMenu;
