/**
 * Pagination Extension
 *
 * Handles automatic pagination of content across page nodes.
 * Runs after every transaction to ensure content flows correctly.
 *
 * Key behaviors:
 * - Creates new pages when content overflows
 * - Moves overflow content to next page (never splits mid-node)
 * - Removes empty pages
 * - Updates page numbers
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode, Fragment } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import {
  measurePageContent,
  calculatePageSplit,
  createPaginationDebouncer,
} from './pageMeasurement';

export interface PaginationOptions {
  /** Page content height in pixels */
  pageHeight: number;
  /** Page width in pixels */
  pageWidth: number;
  /** Page margins in pixels */
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  /** Debounce delay for pagination calculations */
  debounceMs: number;
  /** Callback when pagination changes */
  onPaginationChange?: (pageCount: number) => void;
}

interface PageAttrs {
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export const paginationPluginKey = new PluginKey('pagination');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pagination: {
      /** Force a pagination recalculation */
      repaginate: () => ReturnType;
      /** Set page dimensions */
      setPageDimensions: (width: number, height: number) => ReturnType;
    };
  }
}

export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return {
      pageHeight: 912, // 11" - 1.5" margins = 9.5" at 96dpi
      pageWidth: 816,
      margins: {
        top: 72, // 0.75" at 96dpi
        bottom: 72,
        left: 72,
        right: 72,
      },
      debounceMs: 50,
      onPaginationChange: undefined,
    };
  },

  addStorage() {
    return {
      pageHeight: this.options.pageHeight,
      pageWidth: this.options.pageWidth,
      margins: this.options.margins,
      isPaginating: false,
    };
  },

  addCommands() {
    return {
      repaginate:
        () =>
        ({ view }) => {
          queueMicrotask(() => {
            runPagination(view, this.storage);
          });
          return true;
        },

      setPageDimensions:
        (width: number, height: number) =>
        ({ view }) => {
          this.storage.pageWidth = width;
          this.storage.pageHeight = height;

          queueMicrotask(() => {
            runPagination(view, this.storage);
          });
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: paginationPluginKey,

        view(view) {
          const debouncer = createPaginationDebouncer(() => {
            runPagination(view, extension.storage);
          }, extension.options.debounceMs);

          requestAnimationFrame(() => {
            initializePages(view, extension.storage);
          });

          return {
            update(view, prevState) {
              if (prevState.doc.eq(view.state.doc)) {
                return;
              }

              if (extension.storage.isPaginating) {
                return;
              }

              debouncer.trigger();
            },

            destroy() {
              debouncer.cancel();
            },
          };
        },
      }),
    ];
  },
});

interface PaginationStorage {
  pageHeight: number;
  pageWidth: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  isPaginating: boolean;
}

/**
 * Create page attributes from storage
 */
function createPageAttrs(storage: PaginationStorage, pageNumber: number): PageAttrs {
  return {
    pageNumber,
    pageWidth: storage.pageWidth,
    pageHeight: storage.pageHeight,
    marginTop: storage.margins.top,
    marginBottom: storage.margins.bottom,
    marginLeft: storage.margins.left,
    marginRight: storage.margins.right,
  };
}

/**
 * Get page attributes from an existing page node
 */
function getPageAttrsFromNode(node: ProseMirrorNode): PageAttrs {
  return {
    pageNumber: node.attrs.pageNumber || 1,
    pageWidth: node.attrs.pageWidth || 816,
    pageHeight: node.attrs.pageHeight || 912,
    marginTop: node.attrs.marginTop || 72,
    marginBottom: node.attrs.marginBottom || 72,
    marginLeft: node.attrs.marginLeft || 72,
    marginRight: node.attrs.marginRight || 72,
  };
}

/**
 * Initialize pages for a document that doesn't have page nodes
 */
function initializePages(view: EditorView, storage: PaginationStorage): void {
  const { state } = view;
  const { doc, schema } = state;

  let hasPages = false;
  doc.forEach((node) => {
    if (node.type.name === 'page') {
      hasPages = true;
    }
  });

  if (hasPages) {
    runPagination(view, storage);
    return;
  }

  const pageType = schema.nodes.page;
  if (!pageType) {
    console.warn('Pagination: page node type not found in schema');
    return;
  }

  const content: ProseMirrorNode[] = [];
  doc.forEach((node) => {
    content.push(node);
  });

  if (content.length === 0) {
    const paragraph = schema.nodes.paragraph?.create();
    if (paragraph) {
      content.push(paragraph);
    }
  }

  try {
    const pageAttrs = createPageAttrs(storage, 1);
    const page = pageType.create(pageAttrs, Fragment.from(content));

    const tr = state.tr.replaceWith(0, doc.content.size, page);
    tr.setMeta('pagination', true);
    tr.setMeta('addToHistory', false);

    view.dispatch(tr);

    requestAnimationFrame(() => {
      runPagination(view, storage);
    });
  } catch (error) {
    console.error('Pagination: Failed to initialize pages', error);
  }
}

/**
 * Main pagination logic
 */
function runPagination(view: EditorView, storage: PaginationStorage): void {
  const { state } = view;
  const { doc, schema } = state;

  const pageType = schema.nodes.page;
  if (!pageType) return;

  // Collect all pages and their positions
  const pages: { node: ProseMirrorNode; pos: number }[] = [];
  doc.forEach((node, pos) => {
    if (node.type.name === 'page') {
      pages.push({ node, pos });
    }
  });

  if (pages.length === 0) {
    initializePages(view, storage);
    return;
  }

  // Get page attributes from first page for consistency
  const basePageAttrs = getPageAttrsFromNode(pages[0].node);
  const pageHeight = basePageAttrs.pageHeight;

  // Process each page
  let tr: Transaction | null = null;
  let pendingOverflow: ProseMirrorNode[] = [];
  let pageNumberOffset = 0;

  for (let i = 0; i < pages.length; i++) {
    const { node: pageNode, pos: pagePos } = pages[i];
    const adjustedPos = pagePos + pageNumberOffset;

    // Add any pending overflow from previous page to this page
    if (pendingOverflow.length > 0) {
      if (!tr) {
        tr = state.tr;
        tr.setMeta('pagination', true);
        tr.setMeta('addToHistory', false);
      }

      const insertPos = adjustedPos + 1;
      for (let j = pendingOverflow.length - 1; j >= 0; j--) {
        tr.insert(insertPos, pendingOverflow[j]);
        pageNumberOffset += pendingOverflow[j].nodeSize;
      }
      pendingOverflow = [];
    }

    // Measure content after potential overflow insertion
    const measurements = measurePageContent(view, adjustedPos, pageNode);
    const splitResult = calculatePageSplit(measurements, pageHeight);

    if (splitResult.splitNeeded && splitResult.overflowNodes.length > 0) {
      if (!tr) {
        tr = state.tr;
        tr.setMeta('pagination', true);
        tr.setMeta('addToHistory', false);
      }

      pendingOverflow = splitResult.overflowNodes.map((n) => n.node);

      const sortedOverflow = [...splitResult.overflowNodes].sort(
        (a, b) => b.pos - a.pos
      );

      for (const { node, pos } of sortedOverflow) {
        const deletePos = pos + pageNumberOffset;
        tr.delete(deletePos, deletePos + node.nodeSize);
        pageNumberOffset -= node.nodeSize;
      }
    }
  }

  // Create new page for remaining overflow
  if (pendingOverflow.length > 0) {
    if (!tr) {
      tr = state.tr;
      tr.setMeta('pagination', true);
      tr.setMeta('addToHistory', false);
    }

    try {
      // Create new page with same attributes as existing pages
      const newPageAttrs: PageAttrs = {
        ...basePageAttrs,
        pageNumber: pages.length + 1,
      };

      const newPage = pageType.create(newPageAttrs, Fragment.from(pendingOverflow));
      const insertPos = tr.doc.content.size;
      tr.insert(insertPos, newPage);
    } catch (error) {
      console.error('Pagination: Failed to create new page', error);
    }
  }

  // Remove empty pages
  if (tr) {
    const pagesToRemove: { pos: number; size: number }[] = [];

    tr.doc.forEach((node, pos) => {
      if (node.type.name === 'page' && node.content.size === 0) {
        pagesToRemove.push({ pos, size: node.nodeSize });
      }
    });

    pagesToRemove.reverse().forEach(({ pos, size }) => {
      tr!.delete(pos, pos + size);
    });
  }

  // Update page numbers
  if (tr) {
    let pageNumber = 1;
    tr.doc.forEach((node, pos) => {
      if (node.type.name === 'page') {
        if (node.attrs.pageNumber !== pageNumber) {
          tr!.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            pageNumber,
          });
        }
        pageNumber++;
      }
    });
  }

  // Dispatch transaction if changes were made
  if (tr && tr.docChanged) {
    // Preserve selection by mapping through the transaction
    const { selection } = state;
    const mappedSelection = selection.map(tr.doc, tr.mapping);
    tr.setSelection(mappedSelection);

    view.dispatch(tr);

    requestAnimationFrame(() => {
      runPagination(view, storage);
    });
  }
}

export default Pagination;
