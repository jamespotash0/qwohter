/**
 * Styled ListItem Extension
 *
 * Custom ListItem that supports font styling on the list item itself,
 * allowing list markers (bullets, numbers) to inherit the font family.
 *
 * Features:
 * - Syncs font styling from text nodes to the list item element
 * - Preserves font styling when pressing Enter to create new list items
 * - Works with both bullet and numbered lists
 */

import ListItem from '@tiptap/extension-list-item';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface StyledListItemOptions {
  HTMLAttributes: Record<string, unknown>;
}

const styledListItemPluginKey = new PluginKey('styledListItem');

// Store the last known font styling for preserving across Enter presses
let lastKnownFontFamily: string | null = null;
let lastKnownFontSize: string | null = null;

export const StyledListItem = ListItem.extend<StyledListItemOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontFamily: {
        default: null,
        parseHTML: (element) => element.style.fontFamily?.replace(/['"]/g, '') || null,
        renderHTML: () => ({}),
      },
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const styles: string[] = [];

    if (node.attrs.fontFamily) {
      styles.push(`font-family: ${node.attrs.fontFamily}`);
    }
    if (node.attrs.fontSize) {
      styles.push(`font-size: ${node.attrs.fontSize}`);
    }

    const combinedAttrs = {
      ...HTMLAttributes,
      ...(styles.length > 0 ? { style: styles.join('; ') } : {}),
    };

    return ['li', combinedAttrs, 0];
  },

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // Check if we're in a list item
        const { $from } = editor.state.selection;
        let inListItem = false;

        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d).type.name === 'listItem') {
            inListItem = true;
            break;
          }
        }

        if (!inListItem) {
          return false; // Let default behavior handle it
        }

        // Get current text styling from marks at cursor
        const marks = $from.marks();
        const textStyleMark = marks.find(m => m.type.name === 'textStyle');

        if (textStyleMark) {
          lastKnownFontFamily = textStyleMark.attrs.fontFamily || null;
          lastKnownFontSize = textStyleMark.attrs.fontSize || null;
        }

        // Let the default Enter behavior happen, but set stored marks after
        // Use setTimeout to ensure the new list item is created first
        setTimeout(() => {
          if (lastKnownFontFamily || lastKnownFontSize) {
            const markAttrs: Record<string, string> = {};
            if (lastKnownFontFamily) markAttrs.fontFamily = lastKnownFontFamily;
            if (lastKnownFontSize) markAttrs.fontSize = lastKnownFontSize;

            editor.chain().setMark('textStyle', markAttrs).run();
          }
        }, 0);

        return false; // Let default behavior create the new list item
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: styledListItemPluginKey,
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some(tr => tr.docChanged)) {
            return null;
          }

          const { tr } = newState;
          let modified = false;

          // Track font styling from cursor position for preservation
          const { $from } = newState.selection;
          for (let d = $from.depth; d >= 0; d--) {
            if ($from.node(d).type.name === 'listItem') {
              const marks = $from.marks();
              const textStyleMark = marks.find(m => m.type.name === 'textStyle');
              if (textStyleMark) {
                lastKnownFontFamily = textStyleMark.attrs.fontFamily || lastKnownFontFamily;
                lastKnownFontSize = textStyleMark.attrs.fontSize || lastKnownFontSize;
              }
              break;
            }
          }

          // Traverse the document to find list items and sync font styling
          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'listItem') {
              let fontFamily: string | null = null;
              let fontSize: string | null = null;

              // First, try to get font from text content
              node.descendants((child) => {
                if (child.isText && child.marks.length > 0) {
                  const textStyleMark = child.marks.find(m => m.type.name === 'textStyle');
                  if (textStyleMark) {
                    if (!fontFamily && textStyleMark.attrs.fontFamily) {
                      fontFamily = textStyleMark.attrs.fontFamily;
                    }
                    if (!fontSize && textStyleMark.attrs.fontSize) {
                      fontSize = textStyleMark.attrs.fontSize;
                    }
                  }
                }
                return !(fontFamily && fontSize);
              });

              // If this is an empty list item, check if it needs styling from previous item
              const isEmptyListItem = node.textContent.trim() === '';
              if (isEmptyListItem && !fontFamily && !fontSize) {
                // Use last known font styling for empty new list items
                fontFamily = lastKnownFontFamily;
                fontSize = lastKnownFontSize;
              }

              const currentFontFamily = node.attrs.fontFamily;
              const currentFontSize = node.attrs.fontSize;

              if (fontFamily !== currentFontFamily || fontSize !== currentFontSize) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  fontFamily: fontFamily || null,
                  fontSize: fontSize || null,
                });
                modified = true;
              }
            }
            return true;
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

export default StyledListItem;
