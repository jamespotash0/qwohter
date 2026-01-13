/**
 * Page Node Extension
 *
 * A custom TipTap node that represents a physical page in the document.
 * Each page has a fixed height based on page settings and hidden overflow.
 * Content that exceeds the page height is moved to the next page.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PageNodeView } from '../PageNodeView';

export interface PageNodeOptions {
  /** Page width in pixels */
  pageWidth: number;
  /** Page height in pixels (content area, excluding margins) */
  pageHeight: number;
  /** Page margins in pixels */
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  /** HTML attributes for the page element */
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageNode: {
      /** Insert a new page at the current position */
      insertPage: () => ReturnType;
      /** Wrap current content in pages */
      wrapInPages: () => ReturnType;
    };
  }
}

export const PageNode = Node.create<PageNodeOptions>({
  name: 'page',

  group: 'page',

  content: 'block+',

  defining: true,

  isolating: true,

  addOptions() {
    return {
      pageWidth: 816, // 8.5" at 96dpi
      pageHeight: 912, // 9.5" content height (11" - 1.5" margins) at 96dpi
      margins: {
        top: 72, // 0.75" at 96dpi
        bottom: 72,
        left: 72,
        right: 72,
      },
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      pageNumber: {
        default: 1,
        parseHTML: (element) => parseInt(element.getAttribute('data-page-number') || '1', 10),
        renderHTML: (attributes) => ({
          'data-page-number': attributes.pageNumber,
        }),
      },
      pageWidth: {
        default: this.options.pageWidth,
        parseHTML: (element) => parseInt(element.getAttribute('data-page-width') || String(this.options.pageWidth), 10),
        renderHTML: (attributes) => ({
          'data-page-width': attributes.pageWidth,
        }),
      },
      pageHeight: {
        default: this.options.pageHeight,
        parseHTML: (element) => parseInt(element.getAttribute('data-page-height') || String(this.options.pageHeight), 10),
        renderHTML: (attributes) => ({
          'data-page-height': attributes.pageHeight,
        }),
      },
      marginTop: {
        default: this.options.margins.top,
        parseHTML: (element) => parseInt(element.getAttribute('data-margin-top') || String(this.options.margins.top), 10),
        renderHTML: (attributes) => ({
          'data-margin-top': attributes.marginTop,
        }),
      },
      marginBottom: {
        default: this.options.margins.bottom,
        parseHTML: (element) => parseInt(element.getAttribute('data-margin-bottom') || String(this.options.margins.bottom), 10),
        renderHTML: (attributes) => ({
          'data-margin-bottom': attributes.marginBottom,
        }),
      },
      marginLeft: {
        default: this.options.margins.left,
        parseHTML: (element) => parseInt(element.getAttribute('data-margin-left') || String(this.options.margins.left), 10),
        renderHTML: (attributes) => ({
          'data-margin-left': attributes.marginLeft,
        }),
      },
      marginRight: {
        default: this.options.margins.right,
        parseHTML: (element) => parseInt(element.getAttribute('data-margin-right') || String(this.options.margins.right), 10),
        renderHTML: (attributes) => ({
          'data-margin-right': attributes.marginRight,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-page]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-page': '',
        class: 'page-node',
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageNodeView, {
      contentDOMElementTag: 'div',
    });
  },

  addCommands() {
    return {
      insertPage:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              pageNumber: 1,
              pageWidth: this.options.pageWidth,
              pageHeight: this.options.pageHeight,
            },
            content: [{ type: 'paragraph' }],
          });
        },

      wrapInPages:
        () =>
        ({ tr, state, dispatch }) => {
          if (dispatch) {
            const { doc } = state;
            const content: ReturnType<typeof doc.content.toJSON>[] = [];

            doc.forEach((node) => {
              if (node.type.name !== 'page') {
                content.push(node.toJSON());
              }
            });

            if (content.length > 0) {
              const newDoc = state.schema.nodeFromJSON({
                type: 'doc',
                content: [
                  {
                    type: 'page',
                    attrs: {
                      pageNumber: 1,
                      pageWidth: this.options.pageWidth,
                      pageHeight: this.options.pageHeight,
                    },
                    content,
                  },
                ],
              });

              tr.replaceWith(0, doc.content.size, newDoc.content);
            }
          }
          return true;
        },
    };
  },
});

export default PageNode;
