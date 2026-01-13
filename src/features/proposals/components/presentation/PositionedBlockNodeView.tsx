/**
 * PositionedBlock Node View Component
 *
 * React component that renders a positioned block with drag handles,
 * resize handles, and a context menu for block operations.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { useDragResize, type ResizeHandle } from './hooks/useDragResize';
import {
  Move,
  Lock,
  Unlock,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  GripVertical,
} from 'lucide-react';

interface PositionedBlockNodeViewProps extends NodeViewProps {
  node: NodeViewProps['node'] & {
    attrs: {
      x: number;
      y: number;
      width: number;
      height: number | null;
      zIndex: number;
      locked: boolean;
      blockId: string;
    };
  };
}

// Resize handle positions
const RESIZE_HANDLES: ResizeHandle[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
];

// Handle position styles
const HANDLE_STYLES: Record<ResizeHandle, string> = {
  'top-left': '-top-1 -left-1 cursor-nwse-resize',
  'top': 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
  'top-right': '-top-1 -right-1 cursor-nesw-resize',
  'right': 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
  'bottom-right': '-bottom-1 -right-1 cursor-nwse-resize',
  'bottom': 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
  'bottom-left': '-bottom-1 -left-1 cursor-nesw-resize',
  'left': 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
};

export const PositionedBlockNodeView: React.FC<PositionedBlockNodeViewProps> = ({
  node,
  editor,
  selected,
  updateAttributes,
  deleteNode,
}) => {
  const { x, y, width, height, zIndex, locked, blockId } = node.attrs;
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag and resize functionality
  const { state, position, handlers } = useDragResize({
    initialPosition: { x, y, width, height },
    constraints: {
      minWidth: 100,
      minHeight: 50,
      gridSize: 0, // No grid snapping by default
    },
    disabled: locked || !editor.isEditable,
    onDragEnd: (pos) => {
      updateAttributes({
        x: pos.x,
        y: pos.y,
      });
    },
    onResizeEnd: (pos) => {
      updateAttributes({
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      });
    },
  });

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!showContextMenu) return;

    const handleClick = () => setShowContextMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showContextMenu]);

  // Block operations
  const handleBringToFront = useCallback(() => {
    editor.commands.bringBlockToFront(blockId);
    setShowContextMenu(false);
  }, [editor, blockId]);

  const handleSendToBack = useCallback(() => {
    editor.commands.sendBlockToBack(blockId);
    setShowContextMenu(false);
  }, [editor, blockId]);

  const handleToggleLock = useCallback(() => {
    editor.commands.toggleBlockLock(blockId);
    setShowContextMenu(false);
  }, [editor, blockId]);

  const handleDelete = useCallback(() => {
    deleteNode();
    setShowContextMenu(false);
  }, [deleteNode]);

  const handleUnwrap = useCallback(() => {
    editor.commands.unwrapPositionedBlock();
    setShowContextMenu(false);
  }, [editor]);

  // Use live position during drag/resize
  const displayX = state.isDragging || state.isResizing ? position.x : x;
  const displayY = state.isDragging || state.isResizing ? position.y : y;
  const displayWidth = state.isDragging || state.isResizing ? position.width : width;
  const displayHeight = state.isDragging || state.isResizing ? position.height : height;

  const isInteracting = state.isDragging || state.isResizing;
  const showHandles = selected && editor.isEditable && !locked;

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={cn(
        'positioned-block-wrapper',
        'absolute',
        isInteracting && 'pointer-events-none select-none',
        selected && 'ring-2 ring-blue-500/50',
        locked && 'opacity-90'
      )}
      style={{
        left: `${displayX}px`,
        top: `${displayY}px`,
        width: `${displayWidth}px`,
        height: displayHeight ? `${displayHeight}px` : 'auto',
        zIndex,
      }}
      onContextMenu={handleContextMenu}
    >
      {/* Block container */}
      <div
        className={cn(
          'positioned-block-content',
          'relative w-full h-full',
          'bg-white dark:bg-gray-900',
          'border border-gray-200 dark:border-gray-700',
          'rounded-lg shadow-sm',
          'overflow-hidden',
          isInteracting && 'shadow-lg border-blue-400'
        )}
      >
        {/* Drag handle */}
        {showHandles && (
          <div
            className={cn(
              'absolute -top-6 left-1/2 -translate-x-1/2',
              'flex items-center gap-1 px-2 py-1',
              'bg-blue-500 text-white rounded-t-md',
              'cursor-move text-xs font-medium',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              selected && 'opacity-100'
            )}
            onMouseDown={handlers.onDragStart}
          >
            <GripVertical className="w-3 h-3" />
            <span>Drag to move</span>
          </div>
        )}

        {/* Lock indicator */}
        {locked && (
          <div
            className={cn(
              'absolute top-2 right-2 z-10',
              'p-1 bg-amber-100 dark:bg-amber-900/30 rounded',
              'text-amber-600 dark:text-amber-400'
            )}
            title="Block is locked"
          >
            <Lock className="w-3 h-3" />
          </div>
        )}

        {/* Content area */}
        <div className="p-4">
          <NodeViewContent className="positioned-block-inner" />
        </div>

        {/* Resize handles */}
        {showHandles &&
          RESIZE_HANDLES.map((handle) => (
            <div
              key={handle}
              className={cn(
                'absolute w-3 h-3',
                'bg-blue-500 border-2 border-white',
                'rounded-sm shadow-sm',
                'opacity-0 group-hover:opacity-100 transition-opacity',
                selected && 'opacity-100',
                HANDLE_STYLES[handle]
              )}
              onMouseDown={(e) => handlers.onResizeStart(e, handle)}
            />
          ))}
      </div>

      {/* Edge drag zones for easier dragging */}
      {showHandles && (
        <>
          {/* Top edge */}
          <div
            className="absolute -top-2 left-4 right-4 h-4 cursor-move"
            onMouseDown={handlers.onDragStart}
          />
          {/* Left edge */}
          <div
            className="absolute top-4 -left-2 bottom-4 w-4 cursor-move"
            onMouseDown={handlers.onDragStart}
          />
          {/* Right edge */}
          <div
            className="absolute top-4 -right-2 bottom-4 w-4 cursor-move"
            onMouseDown={handlers.onDragStart}
          />
          {/* Bottom edge */}
          <div
            className="absolute -bottom-2 left-4 right-4 h-4 cursor-move"
            onMouseDown={handlers.onDragStart}
          />
        </>
      )}

      {/* Context menu */}
      {showContextMenu && (
        <div
          className={cn(
            'fixed z-50',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            'py-1 min-w-[160px]'
          )}
          style={{
            left: `${contextMenuPos.x}px`,
            top: `${contextMenuPos.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenuItem
            icon={<ArrowUpToLine className="w-4 h-4" />}
            label="Bring to Front"
            onClick={handleBringToFront}
          />
          <ContextMenuItem
            icon={<ArrowDownToLine className="w-4 h-4" />}
            label="Send to Back"
            onClick={handleSendToBack}
          />
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <ContextMenuItem
            icon={locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            label={locked ? 'Unlock' : 'Lock'}
            onClick={handleToggleLock}
          />
          <ContextMenuItem
            icon={<Move className="w-4 h-4" />}
            label="Convert to Flow"
            onClick={handleUnwrap}
          />
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <ContextMenuItem
            icon={<Trash2 className="w-4 h-4" />}
            label="Delete"
            onClick={handleDelete}
            variant="danger"
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};

// Context menu item component
interface ContextMenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  icon,
  label,
  onClick,
  variant = 'default',
}) => (
  <button
    className={cn(
      'w-full px-3 py-2 flex items-center gap-2 text-sm',
      'hover:bg-gray-100 dark:hover:bg-gray-700',
      'transition-colors',
      variant === 'danger' && 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
    )}
    onClick={onClick}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default PositionedBlockNodeView;
