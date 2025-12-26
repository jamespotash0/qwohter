/**
 * Presentation Editor
 *
 * Word-style rich text editor using Tiptap.
 * Features: slash commands, floating toolbar, tables, task lists, and more.
 *
 * The editor is designed to look like a Microsoft Word document with
 * page margins and a paper-like appearance.
 * */

import { useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import type { Selection } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
// Typography disabled - was causing unwanted character insertions
// import Typography from '@tiptap/extension-typography';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
// Font and color extensions (named exports)
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { cn } from '@/lib/utils';
import { BubbleMenuComponent } from './BubbleMenu';
import { SlashCommand } from './SlashCommand';
import { VariableExtension } from './VariableExtension';
import { VariableSuggestion } from './VariableSuggestion';
import { FontSize, LineHeight, StyledListItem, StyledTableRow } from './extensions';

// Ref interface for external access to editor
export interface PresentationEditorRef {
  getEditor: () => Editor | null;
  insertVariable: (key: string, label: string) => void;
}

// Editor content type (Tiptap JSON format)
export type EditorContent = {
  type: string;
  content?: EditorContent[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
};

// Empty default content - placeholder will show when empty
const DEFAULT_CONTENT: EditorContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

// Page settings types
export interface PageSettings {
  pageSize: 'letter' | 'a4' | 'legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

// Page dimensions in pixels at 96dpi (CSS pixels)
const PAGE_DIMENSIONS = {
  letter: { width: 816, height: 1056 }, // 8.5" x 11"
  a4: { width: 794, height: 1123 }, // 8.27" x 11.69"
  legal: { width: 816, height: 1344 }, // 8.5" x 14"
} as const;

interface PresentationEditorProps {
  value?: EditorContent;
  onChange?: (value: EditorContent) => void;
  /** Called when the editor is ready */
  onReady?: (editor: Editor) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  /** If true, renders with Word-like page styling */
  pageStyle?: boolean;
  /** If true, shows the bubble menu (hidden by default) */
  showBubbleMenu?: boolean;
  /** Page layout settings */
  pageSettings?: PageSettings;
}

export const PresentationEditor = forwardRef<PresentationEditorRef, PresentationEditorProps>(({
  value,
  onChange,
  onReady,
  readOnly = false,
  placeholder = 'Start creating your document...',
  className,
  pageStyle = false,
  showBubbleMenu = false,
  pageSettings,
}, ref) => {
  // Store last selection so we can restore it when inserting from external panels
  const lastSelectionRef = useRef<Selection | null>(null);
  // Store current marks at cursor position for variable styling
  const lastMarksRef = useRef<{ type: string; attrs?: Record<string, unknown> }[]>([]);

  const editor = useEditor({
    immediatelyRender: false, // Prevent hydration issues and improve initial render
    editorProps: {
      // Prevent unwanted scroll behavior when clicking in the editor
      scrollThreshold: { top: 100, bottom: 100, left: 0, right: 0 },
      scrollMargin: { top: 100, bottom: 100, left: 0, right: 0 },
      handleScrollToSelection: () => false, // Disable auto-scroll to selection
    },
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        dropcursor: false,
        gapcursor: false,
        listItem: false, // Using custom StyledListItem instead
      }),
      StyledListItem, // Custom list item with font styling support
      Underline,
      Placeholder.configure({
        placeholder: ({ node, editor }) => {
          // Only show placeholder when the entire document is empty
          const isEmpty = editor.state.doc.childCount === 1 &&
            editor.state.doc.firstChild?.isTextblock &&
            editor.state.doc.firstChild?.content.size === 0;

          if (!isEmpty) return '';

          if (node.type.name === 'heading') {
            return 'Heading...';
          }
          return placeholder;
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: false, // Don't show on current node, only on empty doc
        includeChildren: true,
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      StyledTableRow, // Custom TableRow with height adjustment
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Highlight.configure({
        multicolor: true, // Enable multiple highlight colors
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      // Typography disabled - was causing unwanted character insertions
      Dropcursor.configure({
        color: '#ee6c4d',
        width: 2,
      }),
      Gapcursor,
      // Font and color extensions
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      LineHeight,
      // Custom extensions
      SlashCommand,
      VariableExtension,
      VariableSuggestion,
    ],
    content: value || DEFAULT_CONTENT,
    editable: !readOnly,
    onCreate: ({ editor }) => {
      onReady?.(editor);
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as EditorContent);
    },
    onSelectionUpdate: ({ editor }) => {
      // Save selection whenever it changes (for restoring after external panel clicks)
      lastSelectionRef.current = editor.state.selection;
      // Save current marks at cursor for applying to inserted variables
      const marks = editor.state.storedMarks || editor.state.selection.$from.marks();
      lastMarksRef.current = marks.map(mark => ({
        type: mark.type.name,
        attrs: mark.attrs,
      }));
    },
    onBlur: ({ editor }) => {
      // Save selection when editor loses focus (clicking variable panel, etc.)
      lastSelectionRef.current = editor.state.selection;
      const marks = editor.state.storedMarks || editor.state.selection.$from.marks();
      lastMarksRef.current = marks.map(mark => ({
        type: mark.type.name,
        attrs: mark.attrs,
      }));
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none',
      },
      // Handle Tab key for indentation
      handleKeyDown: (view, event) => {
        if (event.key === 'Tab') {
          event.preventDefault();

          const { state, dispatch } = view;
          const { selection } = state;

          // Check if we're in a list
          const isInList = state.doc.resolve(selection.from).parent.type.name === 'listItem' ||
                          state.doc.resolve(selection.from).parent.type.name === 'taskItem';

          if (isInList) {
            // Use native list indent/outdent
            if (event.shiftKey) {
              // Outdent - lift list item
              return false; // Let default handler try
            } else {
              // Indent - sink list item
              return false; // Let default handler try
            }
          } else {
            // Insert tab character (4 spaces) in regular text
            if (event.shiftKey) {
              // Shift+Tab: do nothing in regular text
              return true;
            } else {
              // Tab: insert 4 spaces
              const tr = state.tr.insertText('    ');
              dispatch(tr);
              return true;
            }
          }
        }
        return false;
      },
    },
  });

  // Update content when value prop changes
  // Use queueMicrotask to avoid flushSync warning during React lifecycle
  useEffect(() => {
    if (editor && value && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      queueMicrotask(() => {
        editor.commands.setContent(value);
      });
    }
  }, [editor, value]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Expose editor methods via ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    insertVariable: (key: string, label: string) => {
      if (editor) {
        // Restore saved selection if we have one (handles clicking from external panel)
        if (lastSelectionRef.current) {
          editor.commands.setTextSelection({
            from: lastSelectionRef.current.from,
            to: lastSelectionRef.current.to,
          });
        }

        // Build variable node content with marks applied
        const variableContent: { type: string; attrs: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[] } = {
          type: 'variable',
          attrs: { variableKey: key, variableLabel: label },
        };

        // Apply saved marks (font family, size, color, etc.) to the variable
        if (lastMarksRef.current.length > 0) {
          variableContent.marks = lastMarksRef.current;
        }

        editor
          .chain()
          .focus()
          .insertContent(variableContent)
          .run();
      }
    },
  }), [editor]);

  if (!editor) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading editor...</div>
      </div>
    );
  }

  // Base typography styles (used by both page and non-page modes)
  const typographyStyles = [
    // Tiptap editor styles
    '[&_.tiptap]:outline-none [&_.tiptap]:min-h-[350px]',
    // Typography
    '[&_.tiptap_h1]:text-3xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:text-gray-900 dark:[&_.tiptap_h1]:text-gray-100 [&_.tiptap_h1]:mb-4 [&_.tiptap_h1]:mt-6 [&_.tiptap_h1]:first:mt-0',
    '[&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:text-gray-800 dark:[&_.tiptap_h2]:text-gray-200 [&_.tiptap_h2]:mb-3 [&_.tiptap_h2]:mt-5',
    '[&_.tiptap_h3]:text-xl [&_.tiptap_h3]:font-medium [&_.tiptap_h3]:text-gray-700 dark:[&_.tiptap_h3]:text-gray-300 [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:mt-4',
    '[&_.tiptap_p]:text-gray-600 dark:[&_.tiptap_p]:text-gray-400 [&_.tiptap_p]:mb-3 [&_.tiptap_p]:leading-relaxed',
    // Blockquote
    '[&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-coral [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:py-1 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:my-4 [&_.tiptap_blockquote]:text-gray-600 dark:[&_.tiptap_blockquote]:text-gray-400',
    // Lists
    '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2',
    '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2',
    '[&_li]:my-1 [&_li]:text-gray-600 dark:[&_li]:text-gray-400',
    '[&_li_p]:mb-0 [&_li_p]:my-0', // Remove paragraph margin inside list items
    // Nested lists
    '[&_li_ul]:my-1 [&_li_ol]:my-1',
    '[&_li_ul]:pl-5 [&_li_ol]:pl-5',
    // Task list
    '[&_.task-list]:list-none [&_.task-list]:pl-0',
    '[&_.task-item]:flex [&_.task-item]:items-start [&_.task-item]:gap-2 [&_.task-item]:my-1',
    '[&_.task-item_input]:mt-1 [&_.task-item_input]:w-4 [&_.task-item_input]:h-4 [&_.task-item_input]:rounded [&_.task-item_input]:border-2 [&_.task-item_input]:border-gray-300 dark:[&_.task-item_input]:border-gray-600 [&_.task-item_input]:checked:bg-coral [&_.task-item_input]:checked:border-coral',
    '[&_.task-item[data-checked=true]_p]:line-through [&_.task-item[data-checked=true]_p]:text-gray-400',
    // Horizontal rule
    '[&_.tiptap_hr]:border-gray-200 dark:[&_.tiptap_hr]:border-gray-700 [&_.tiptap_hr]:my-6',
    // Table - visible borders with fixed layout to prevent column shifting
    '[&_.editor-table]:border-collapse [&_.editor-table]:table-fixed [&_.editor-table]:w-full [&_.editor-table]:my-4 [&_.editor-table]:border [&_.editor-table]:border-gray-300 dark:[&_.editor-table]:border-gray-600',
    '[&_.editor-table_th]:bg-gray-100 dark:[&_.editor-table_th]:bg-gray-800 [&_.editor-table_th]:border [&_.editor-table_th]:border-gray-300 dark:[&_.editor-table_th]:border-gray-600 [&_.editor-table_th]:px-3 [&_.editor-table_th]:py-2 [&_.editor-table_th]:text-left [&_.editor-table_th]:font-semibold [&_.editor-table_th]:text-gray-700 dark:[&_.editor-table_th]:text-gray-300 [&_.editor-table_th]:overflow-hidden [&_.editor-table_th]:break-words',
    '[&_.editor-table_td]:border [&_.editor-table_td]:border-gray-300 dark:[&_.editor-table_td]:border-gray-600 [&_.editor-table_td]:px-3 [&_.editor-table_td]:py-2 [&_.editor-table_td]:text-gray-700 dark:[&_.editor-table_td]:text-gray-300 [&_.editor-table_td]:overflow-hidden [&_.editor-table_td]:break-words',
    '[&_.editor-table_.selectedCell]:bg-blue-50 dark:[&_.editor-table_.selectedCell]:bg-blue-900/20',
    // Also style table, th, td directly for Tiptap tables
    '[&_table]:border-collapse [&_table]:table-fixed [&_table]:w-full [&_table]:my-4 [&_table]:border [&_table]:border-gray-300 dark:[&_table]:border-gray-600',
    '[&_th]:bg-gray-100 dark:[&_th]:bg-gray-800 [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:overflow-hidden [&_th]:text-ellipsis',
    '[&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600 [&_td]:px-3 [&_td]:py-2 [&_td]:overflow-hidden [&_td]:break-words',
    '[&_.selectedCell]:bg-blue-50 dark:[&_.selectedCell]:bg-blue-900/20',
    // Link - cleaner blue style like Gmail
    '[&_.editor-link]:text-blue-600 dark:[&_.editor-link]:text-blue-400 [&_.editor-link]:underline [&_.editor-link]:cursor-pointer [&_.editor-link]:hover:text-blue-800 dark:[&_.editor-link]:hover:text-blue-300',
    '[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_a]:cursor-pointer',
    // Code
    '[&_.tiptap_code]:bg-gray-100 dark:[&_.tiptap_code]:bg-gray-800 [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:rounded [&_.tiptap_code]:text-sm [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-gray-700 dark:[&_.tiptap_code]:text-gray-300',
    '[&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
    // Highlight
    '[&_.tiptap_mark]:bg-yellow-200 dark:[&_.tiptap_mark]:bg-yellow-500/30',
    // Variable - clean, subtle styling
    '[&_.variable-node]:inline [&_.variable-node]:px-0.5 [&_.variable-node]:rounded [&_.variable-node]:bg-gray-100 dark:[&_.variable-node]:bg-gray-800 [&_.variable-node]:text-gray-700 dark:[&_.variable-node]:text-gray-300 [&_.variable-node]:font-medium [&_.variable-node]:border-b [&_.variable-node]:border-dashed [&_.variable-node]:border-gray-400',
    // Placeholder
    '[&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
    '[&_.is-empty::before]:text-gray-400 [&_.is-empty::before]:content-[attr(data-placeholder)] [&_.is-empty::before]:float-left [&_.is-empty::before]:pointer-events-none [&_.is-empty::before]:h-0'
  ];

  return (
    <div className={cn('presentation-editor h-full', className)}>
      {!readOnly && showBubbleMenu && <BubbleMenuComponent editor={editor} />}

      {/* Word-like page container */}
      {pageStyle ? (
        <div className="h-full overflow-y-auto bg-gray-100 dark:bg-gray-800 p-8">
          <div
            className={cn(
              // Page styling - mimics Word document
              'mx-auto bg-white dark:bg-gray-900',
              'shadow-lg rounded-sm',
              ...typographyStyles
            )}
            style={pageSettings ? {
              // Apply page dimensions based on settings
              width: `${pageSettings.orientation === 'landscape'
                ? PAGE_DIMENSIONS[pageSettings.pageSize].height
                : PAGE_DIMENSIONS[pageSettings.pageSize].width}px`,
              minHeight: `${pageSettings.orientation === 'landscape'
                ? PAGE_DIMENSIONS[pageSettings.pageSize].width
                : PAGE_DIMENSIONS[pageSettings.pageSize].height}px`,
              // Apply margins (convert inches to pixels at 96dpi)
              paddingTop: `${pageSettings.margins.top * 96}px`,
              paddingBottom: `${pageSettings.margins.bottom * 96}px`,
              paddingLeft: `${pageSettings.margins.left * 96}px`,
              paddingRight: `${pageSettings.margins.right * 96}px`,
            } : {
              // Default dimensions
              maxWidth: '816px', // ~8.5" at 96dpi
              minHeight: '1056px', // ~11" at 96dpi
              padding: '48px 64px', // ~0.5" top/bottom, ~0.67" left/right
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      ) : (
        <EditorContent
          editor={editor}
          className={cn(
            'min-h-[400px] p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700',
            'focus-within:ring-2 focus-within:ring-coral/20 focus-within:border-coral',
            'transition-all duration-200',
            ...typographyStyles
          )}
        />
      )}
    </div>
  );
});

PresentationEditor.displayName = 'PresentationEditor';

export default PresentationEditor;
export { DEFAULT_CONTENT };
