/**
 * useDragResize Hook
 *
 * Provides drag and resize functionality for positioned blocks.
 * Handles mouse events, constraints, and snap-to-grid.
 */

import { useCallback, useRef, useState, useEffect } from 'react';

export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export interface DragResizeState {
  isDragging: boolean;
  isResizing: boolean;
  activeHandle: ResizeHandle | null;
}

export interface DragResizePosition {
  x: number;
  y: number;
  width: number;
  height: number | null;
}

export interface DragResizeConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  gridSize: number;
  bounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface UseDragResizeOptions {
  initialPosition: DragResizePosition;
  constraints: DragResizeConstraints;
  disabled?: boolean;
  onDragStart?: () => void;
  onDrag?: (position: DragResizePosition) => void;
  onDragEnd?: (position: DragResizePosition) => void;
  onResizeStart?: (handle: ResizeHandle) => void;
  onResize?: (position: DragResizePosition) => void;
  onResizeEnd?: (position: DragResizePosition) => void;
}

export interface UseDragResizeReturn {
  state: DragResizeState;
  position: DragResizePosition;
  handlers: {
    onDragStart: (e: React.MouseEvent) => void;
    onResizeStart: (e: React.MouseEvent, handle: ResizeHandle) => void;
  };
  setPosition: (position: DragResizePosition) => void;
}

/**
 * Snap value to grid
 */
function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max?: number): number {
  if (max !== undefined) {
    return Math.min(Math.max(value, min), max);
  }
  return Math.max(value, min);
}

export function useDragResize(options: UseDragResizeOptions): UseDragResizeReturn {
  const {
    initialPosition,
    constraints,
    disabled = false,
    onDragStart,
    onDrag,
    onDragEnd,
    onResizeStart,
    onResize,
    onResizeEnd,
  } = options;

  const [state, setState] = useState<DragResizeState>({
    isDragging: false,
    isResizing: false,
    activeHandle: null,
  });

  const [position, setPosition] = useState<DragResizePosition>(initialPosition);

  // Refs for tracking mouse movement
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startPositionRef = useRef<DragResizePosition>(initialPosition);
  const activeHandleRef = useRef<ResizeHandle | null>(null);

  // Update position when initialPosition changes externally
  useEffect(() => {
    if (!state.isDragging && !state.isResizing) {
      setPosition(initialPosition);
    }
  }, [initialPosition, state.isDragging, state.isResizing]);

  /**
   * Handle drag start
   */
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      startMouseRef.current = { x: e.clientX, y: e.clientY };
      startPositionRef.current = { ...position };

      setState((prev) => ({ ...prev, isDragging: true }));
      onDragStart?.();
    },
    [disabled, position, onDragStart]
  );

  /**
   * Handle resize start
   */
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      if (disabled) return;

      e.preventDefault();
      e.stopPropagation();

      startMouseRef.current = { x: e.clientX, y: e.clientY };
      startPositionRef.current = { ...position };
      activeHandleRef.current = handle;

      setState((prev) => ({ ...prev, isResizing: true, activeHandle: handle }));
      onResizeStart?.(handle);
    },
    [disabled, position, onResizeStart]
  );

  /**
   * Handle mouse move during drag/resize
   */
  useEffect(() => {
    if (!state.isDragging && !state.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startMouseRef.current.x;
      const deltaY = e.clientY - startMouseRef.current.y;
      const start = startPositionRef.current;

      if (state.isDragging) {
        let newX = start.x + deltaX;
        let newY = start.y + deltaY;

        // Apply grid snapping
        newX = snapToGrid(newX, constraints.gridSize);
        newY = snapToGrid(newY, constraints.gridSize);

        // Apply bounds
        if (constraints.bounds) {
          newX = clamp(newX, constraints.bounds.left, constraints.bounds.right - start.width);
          newY = clamp(newY, constraints.bounds.top, constraints.bounds.bottom - (start.height || 0));
        }

        const newPosition = { ...position, x: newX, y: newY };
        setPosition(newPosition);
        onDrag?.(newPosition);
      } else if (state.isResizing && activeHandleRef.current) {
        const handle = activeHandleRef.current;
        let newX = start.x;
        let newY = start.y;
        let newWidth = start.width;
        let newHeight = start.height;

        // Calculate new dimensions based on handle
        switch (handle) {
          case 'right':
            newWidth = start.width + deltaX;
            break;
          case 'bottom':
            newHeight = (start.height || 0) + deltaY;
            break;
          case 'left':
            newWidth = start.width - deltaX;
            newX = start.x + deltaX;
            break;
          case 'top':
            newHeight = (start.height || 0) - deltaY;
            newY = start.y + deltaY;
            break;
          case 'top-left':
            newWidth = start.width - deltaX;
            newHeight = (start.height || 0) - deltaY;
            newX = start.x + deltaX;
            newY = start.y + deltaY;
            break;
          case 'top-right':
            newWidth = start.width + deltaX;
            newHeight = (start.height || 0) - deltaY;
            newY = start.y + deltaY;
            break;
          case 'bottom-left':
            newWidth = start.width - deltaX;
            newHeight = (start.height || 0) + deltaY;
            newX = start.x + deltaX;
            break;
          case 'bottom-right':
            newWidth = start.width + deltaX;
            newHeight = (start.height || 0) + deltaY;
            break;
        }

        // Apply constraints
        newWidth = clamp(newWidth, constraints.minWidth, constraints.maxWidth);
        if (newHeight !== null) {
          newHeight = clamp(newHeight, constraints.minHeight, constraints.maxHeight);
        }

        // Apply grid snapping
        newWidth = snapToGrid(newWidth, constraints.gridSize);
        newX = snapToGrid(newX, constraints.gridSize);
        newY = snapToGrid(newY, constraints.gridSize);
        if (newHeight !== null) {
          newHeight = snapToGrid(newHeight, constraints.gridSize);
        }

        // Prevent position from going negative when resizing from left/top
        if (handle.includes('left') && newWidth < constraints.minWidth) {
          newX = start.x + start.width - constraints.minWidth;
          newWidth = constraints.minWidth;
        }
        if (handle.includes('top') && newHeight !== null && newHeight < constraints.minHeight) {
          newY = start.y + (start.height || 0) - constraints.minHeight;
          newHeight = constraints.minHeight;
        }

        const newPosition = { x: newX, y: newY, width: newWidth, height: newHeight };
        setPosition(newPosition);
        onResize?.(newPosition);
      }
    };

    const handleMouseUp = () => {
      if (state.isDragging) {
        onDragEnd?.(position);
      } else if (state.isResizing) {
        onResizeEnd?.(position);
      }

      setState({ isDragging: false, isResizing: false, activeHandle: null });
      activeHandleRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    state.isDragging,
    state.isResizing,
    position,
    constraints,
    onDrag,
    onDragEnd,
    onResize,
    onResizeEnd,
  ]);

  return {
    state,
    position,
    handlers: {
      onDragStart: handleDragStart,
      onResizeStart: handleResizeStart,
    },
    setPosition,
  };
}

export default useDragResize;
