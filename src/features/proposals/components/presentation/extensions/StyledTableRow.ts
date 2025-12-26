/**
 * Styled TableRow Extension
 *
 * Custom TableRow that supports adjustable row height.
 * Allows users to set minimum height on table rows.
 */

import TableRow from '@tiptap/extension-table-row';

export interface StyledTableRowOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const StyledTableRow = TableRow.extend<StyledTableRowOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      minHeight: {
        default: null,
        parseHTML: (element) => {
          const height = element.style.minHeight;
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.minHeight) {
            return {};
          }
          return {
            style: `min-height: ${attributes.minHeight}px`,
          };
        },
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const styles: string[] = [];

    if (node.attrs.minHeight) {
      styles.push(`min-height: ${node.attrs.minHeight}px`);
    }

    const combinedAttrs = {
      ...HTMLAttributes,
      ...(styles.length > 0 ? { style: styles.join('; ') } : {}),
    };

    return ['tr', combinedAttrs, 0];
  },
});

export default StyledTableRow;
