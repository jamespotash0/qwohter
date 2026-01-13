/**
 * PositionedBlock Node Extension
 *
 * A wrapper node that allows free-form positioning of content on the page.
 * Supports absolute x/y positioning, width/height sizing, and z-index layering.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PositionedBlockNodeView } from '../PositionedBlockNodeView';

export interface PositionedBlockOptions {
  /** Default width for new positioned blocks */
  defaultWidth: number;
  /** Default height for new positioned blocks (null = auto) */
  defaultHeight: number | null;
  /** Minimum width */
  minWidth: number;
  /** Minimum height */
  minHeight: number;
  /** Grid size for snapping (0 = no snap) */
  gridSize: number;
  /** HTML attributes */
  HTMLAttributes: Record<string, unknown>;
}

export interface PositionedBlockAttrs {
  /** X position relative to page left edge */
  x: number;
  /** Y position relative to page top edge */
  y: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels (null = auto-fit content) */
  height: number | null;
  /** Z-index for layering */
  zIndex: number;
  /** Whether block is locked (can't be moved/resized) */
  locked: boolean;
  /** Unique ID for the block */
  blockId: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    positionedBlock: {
      /** Insert a new positioned block at coordinates */
      insertPositionedBlock: (attrs?: Partial<PositionedBlockAttrs>) => ReturnType;
      /** Update position of a positioned block */
      updateBlockPosition: (blockId: string, x: number, y: number) => ReturnType;
      /** Update size of a positioned block */
      updateBlockSize: (blockId: string, width: number, height: number | null) => ReturnType;
      /** Update z-index of a positioned block */
      updateBlockZIndex: (blockId: string, zIndex: number) => ReturnType;
      /** Bring block to front */
      bringBlockToFront: (blockId: string) => ReturnType;
      /** Send block to back */
      sendBlockToBack: (blockId: string) => ReturnType;
      /** Lock/unlock block */
      toggleBlockLock: (blockId: string) => ReturnType;
      /** Convert selection to positioned block */
      wrapInPositionedBlock: (attrs?: Partial<PositionedBlockAttrs>) => ReturnType;
      /** Unwrap positioned block back to flow content */
      unwrapPositionedBlock: () => ReturnType;
    };
  }
}

// Generate unique block ID
function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const PositionedBlock = Node.create<PositionedBlockOptions>({
  name: 'positionedBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  isolating: true,

  draggable: false, // We handle dragging ourselves

  addOptions() {
    return {
      defaultWidth: 400,
      defaultHeight: null,
      minWidth: 100,
      minHeight: 50,
      gridSize: 0,
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      x: {
        default: 0,
        parseHTML: (element) => parseFloat(element.getAttribute('data-x') || '0'),
        renderHTML: (attributes) => ({
          'data-x': attributes.x,
        }),
      },
      y: {
        default: 0,
        parseHTML: (element) => parseFloat(element.getAttribute('data-y') || '0'),
        renderHTML: (attributes) => ({
          'data-y': attributes.y,
        }),
      },
      width: {
        default: 400,
        parseHTML: (element) => parseFloat(element.getAttribute('data-width') || '400'),
        renderHTML: (attributes) => ({
          'data-width': attributes.width,
        }),
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const h = element.getAttribute('data-height');
          return h ? parseFloat(h) : null;
        },
        renderHTML: (attributes) => ({
          'data-height': attributes.height,
        }),
      },
      zIndex: {
        default: 1,
        parseHTML: (element) => parseInt(element.getAttribute('data-z-index') || '1', 10),
        renderHTML: (attributes) => ({
          'data-z-index': attributes.zIndex,
        }),
      },
      locked: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-locked') === 'true',
        renderHTML: (attributes) => ({
          'data-locked': attributes.locked ? 'true' : 'false',
        }),
      },
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-block-id'),
        renderHTML: (attributes) => ({
          'data-block-id': attributes.blockId || generateBlockId(),
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-positioned-block]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-positioned-block': '',
        class: 'positioned-block',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PositionedBlockNodeView, {
      contentDOMElementTag: 'div',
    });
  },

  addCommands() {
    return {
      insertPositionedBlock:
        (attrs = {}) =>
        ({ commands }) => {
          const blockId = generateBlockId();
          return commands.insertContent({
            type: this.name,
            attrs: {
              x: attrs.x ?? 50,
              y: attrs.y ?? 50,
              width: attrs.width ?? this.options.defaultWidth,
              height: attrs.height ?? this.options.defaultHeight,
              zIndex: attrs.zIndex ?? 1,
              locked: attrs.locked ?? false,
              blockId,
            },
            content: [{ type: 'paragraph' }],
          });
        },

      updateBlockPosition:
        (blockId: string, x: number, y: number) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          let updated = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.blockId === blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                x,
                y,
              });
              updated = true;
              return false; // Stop traversing
            }
            return true;
          });

          return updated;
        },

      updateBlockSize:
        (blockId: string, width: number, height: number | null) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          let updated = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.blockId === blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                width: Math.max(this.options.minWidth, width),
                height: height ? Math.max(this.options.minHeight, height) : null,
              });
              updated = true;
              return false;
            }
            return true;
          });

          return updated;
        },

      updateBlockZIndex:
        (blockId: string, zIndex: number) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          let updated = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.blockId === blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                zIndex,
              });
              updated = true;
              return false;
            }
            return true;
          });

          return updated;
        },

      bringBlockToFront:
        (blockId: string) =>
        ({ tr, state, dispatch, commands }) => {
          if (!dispatch) return true;

          // Find max z-index
          let maxZ = 0;
          state.doc.descendants((node) => {
            if (node.type.name === this.name) {
              maxZ = Math.max(maxZ, node.attrs.zIndex || 0);
            }
            return true;
          });

          return commands.updateBlockZIndex(blockId, maxZ + 1);
        },

      sendBlockToBack:
        (blockId: string) =>
        ({ tr, state, dispatch, commands }) => {
          if (!dispatch) return true;

          // Find min z-index
          let minZ = Infinity;
          state.doc.descendants((node) => {
            if (node.type.name === this.name) {
              minZ = Math.min(minZ, node.attrs.zIndex || 0);
            }
            return true;
          });

          return commands.updateBlockZIndex(blockId, Math.max(0, minZ - 1));
        },

      toggleBlockLock:
        (blockId: string) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return true;

          let updated = false;
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.blockId === blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                locked: !node.attrs.locked,
              });
              updated = true;
              return false;
            }
            return true;
          });

          return updated;
        },

      wrapInPositionedBlock:
        (attrs = {}) =>
        ({ tr, state, dispatch, commands }) => {
          const { selection } = state;
          const { $from, $to } = selection;

          if ($from.pos === $to.pos) {
            // No selection, just insert empty block
            return commands.insertPositionedBlock(attrs);
          }

          // Get the content to wrap
          const content = state.doc.slice($from.pos, $to.pos);
          const blockId = generateBlockId();

          if (dispatch) {
            const positionedBlock = state.schema.nodes.positionedBlock.create(
              {
                x: attrs.x ?? 50,
                y: attrs.y ?? 50,
                width: attrs.width ?? this.options.defaultWidth,
                height: attrs.height ?? this.options.defaultHeight,
                zIndex: attrs.zIndex ?? 1,
                locked: false,
                blockId,
              },
              content.content
            );

            tr.replaceWith($from.pos, $to.pos, positionedBlock);
          }

          return true;
        },

      unwrapPositionedBlock:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          const { $from } = selection;

          // Find the positioned block ancestor
          let blockPos: number | null = null;
          let blockNode: typeof state.doc | null = null;

          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === this.name) {
              blockPos = $from.before(d);
              blockNode = node;
              break;
            }
          }

          if (blockPos === null || !blockNode) {
            return false;
          }

          if (dispatch) {
            tr.replaceWith(blockPos, blockPos + blockNode.nodeSize, blockNode.content);
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Delete positioned block when backspace at start
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        // Check if we're at the start of a positioned block
        if ($from.parentOffset === 0) {
          for (let d = $from.depth; d >= 0; d--) {
            const node = $from.node(d);
            if (node.type.name === this.name && node.content.size <= 2) {
              // Empty or nearly empty block - delete it
              return editor.commands.unwrapPositionedBlock();
            }
          }
        }

        return false;
      },
    };
  },
});

export default PositionedBlock;
