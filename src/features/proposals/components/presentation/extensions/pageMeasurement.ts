/**
 * Page Measurement Utilities
 *
 * Provides DOM measurement functions for determining content heights
 * and managing page overflow calculations.
 */

import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

export interface PageMeasurement {
  /** Total height of content within the page */
  contentHeight: number;
  /** Maximum allowed content height */
  maxHeight: number;
  /** Whether the page is overflowing */
  isOverflowing: boolean;
  /** Amount of overflow in pixels */
  overflowAmount: number;
}

export interface NodeMeasurement {
  /** The ProseMirror node */
  node: ProseMirrorNode;
  /** Position of the node in the document */
  pos: number;
  /** Height of the node in the DOM */
  height: number;
  /** Whether this node can be split (false for atomic nodes like images) */
  canSplit: boolean;
}

/**
 * Get the DOM element for a ProseMirror node at a given position
 */
export function getNodeDomElement(
  view: EditorView,
  pos: number
): HTMLElement | null {
  try {
    const nodePos = view.state.doc.resolve(pos);
    const domNode = view.nodeDOM(nodePos.pos);

    if (domNode instanceof HTMLElement) {
      return domNode;
    }

    // Try to get the parent if the node itself doesn't have a DOM representation
    if (domNode?.parentElement) {
      return domNode.parentElement;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Measure the height of a DOM element including margins
 */
export function measureElementHeight(element: HTMLElement): number {
  const style = window.getComputedStyle(element);
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;

  return element.offsetHeight + marginTop + marginBottom;
}

/**
 * Measure all block-level nodes within a page
 */
export function measurePageContent(
  view: EditorView,
  pagePos: number,
  pageNode: ProseMirrorNode
): NodeMeasurement[] {
  const measurements: NodeMeasurement[] = [];
  let offset = 1; // Start after the page node opening

  pageNode.forEach((child, childOffset) => {
    const absolutePos = pagePos + offset + childOffset;
    const domElement = getNodeDomElement(view, absolutePos);

    const measurement: NodeMeasurement = {
      node: child,
      pos: absolutePos,
      height: domElement ? measureElementHeight(domElement) : estimateNodeHeight(child),
      canSplit: canNodeBeSplit(child),
    };

    measurements.push(measurement);
    offset += child.nodeSize;
  });

  return measurements;
}

/**
 * Estimate the height of a node when DOM measurement isn't possible
 * This is a fallback and should be avoided when possible
 */
function estimateNodeHeight(node: ProseMirrorNode): number {
  const baseLineHeight = 24; // Approximate line height in pixels

  switch (node.type.name) {
    case 'heading': {
      const level = node.attrs.level || 1;
      const multipliers = { 1: 2.5, 2: 2, 3: 1.75 };
      return baseLineHeight * (multipliers[level as keyof typeof multipliers] || 1.5);
    }
    case 'paragraph': {
      // Estimate based on text content length
      const textLength = node.textContent.length;
      const charsPerLine = 80;
      const lines = Math.max(1, Math.ceil(textLength / charsPerLine));
      return lines * baseLineHeight + 12; // Add margin
    }
    case 'bulletList':
    case 'orderedList':
    case 'taskList': {
      let height = 0;
      node.forEach((listItem) => {
        height += estimateNodeHeight(listItem) + 4;
      });
      return height + 12; // Add list margin
    }
    case 'listItem':
    case 'taskItem': {
      let height = 0;
      node.forEach((child) => {
        height += estimateNodeHeight(child);
      });
      return height;
    }
    case 'table': {
      let rows = 0;
      node.forEach(() => rows++);
      return rows * 40 + 16; // Approximate row height + table margins
    }
    case 'blockquote': {
      let height = 0;
      node.forEach((child) => {
        height += estimateNodeHeight(child);
      });
      return height + 16; // Add blockquote padding
    }
    case 'codeBlock': {
      const lines = node.textContent.split('\n').length;
      return lines * 20 + 24; // Code line height + padding
    }
    case 'horizontalRule':
      return 32; // hr with margins
    default:
      return baseLineHeight;
  }
}

/**
 * Determine if a node can be split across pages
 * Atomic nodes like images, horizontal rules should not be split
 */
function canNodeBeSplit(node: ProseMirrorNode): boolean {
  const atomicTypes = [
    'horizontalRule',
    'image',
    'hardBreak',
    'variable',
  ];

  return !atomicTypes.includes(node.type.name);
}

/**
 * Calculate page overflow measurements
 */
export function calculatePageOverflow(
  view: EditorView,
  pagePos: number,
  pageNode: ProseMirrorNode,
  maxHeight: number
): PageMeasurement {
  const measurements = measurePageContent(view, pagePos, pageNode);
  const contentHeight = measurements.reduce((sum, m) => sum + m.height, 0);

  return {
    contentHeight,
    maxHeight,
    isOverflowing: contentHeight > maxHeight,
    overflowAmount: Math.max(0, contentHeight - maxHeight),
  };
}

/**
 * Find the index of the first node that causes overflow
 * Returns -1 if no overflow
 */
export function findOverflowNodeIndex(
  measurements: NodeMeasurement[],
  maxHeight: number
): number {
  let accumulatedHeight = 0;

  for (let i = 0; i < measurements.length; i++) {
    accumulatedHeight += measurements[i].height;
    if (accumulatedHeight > maxHeight) {
      return i;
    }
  }

  return -1;
}

/**
 * Get the content that should remain on the current page
 * and the content that should overflow to the next page
 */
export interface PageSplitResult {
  /** Nodes that fit on the current page */
  remainingNodes: { node: ProseMirrorNode; pos: number }[];
  /** Nodes that should move to the next page */
  overflowNodes: { node: ProseMirrorNode; pos: number }[];
  /** Whether a split was needed */
  splitNeeded: boolean;
}

export function calculatePageSplit(
  measurements: NodeMeasurement[],
  maxHeight: number
): PageSplitResult {
  const overflowIndex = findOverflowNodeIndex(measurements, maxHeight);

  if (overflowIndex === -1) {
    return {
      remainingNodes: measurements.map((m) => ({ node: m.node, pos: m.pos })),
      overflowNodes: [],
      splitNeeded: false,
    };
  }

  // Never split on the first node - page must have at least one node
  const splitIndex = Math.max(1, overflowIndex);

  return {
    remainingNodes: measurements.slice(0, splitIndex).map((m) => ({ node: m.node, pos: m.pos })),
    overflowNodes: measurements.slice(splitIndex).map((m) => ({ node: m.node, pos: m.pos })),
    splitNeeded: true,
  };
}

/**
 * Debounce utility for pagination calculations
 */
export function createPaginationDebouncer(
  callback: () => void,
  delay: number = 100
): { trigger: () => void; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    trigger: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        callback();
        timeoutId = null;
      }, delay);
    },
    cancel: () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  };
}
