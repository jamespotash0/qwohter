/**
 * Page-Based Presentation Editor
 *
 * A Word-style rich text editor using Tiptap with true page-based document structure.
 * Content is organized into discrete page nodes that handle overflow automatically.
 *
 * Key features:
 * - Real page nodes (not visual overlays)
 * - Automatic pagination on content changes
 * - Overflow content moves to next page
 * - Empty pages are removed
 * - Never splits content mid-node
 */

import {
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
} from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import type { Selection } from '@tiptap/pm/state';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Document from '@tiptap/extension-document';
import { cn } from '@/lib/utils';
import { BubbleMenuComponent } from './BubbleMenu';
import { SlashCommand } from './SlashCommand';
import { VariableExtension } from './VariableExtension';
import { VariableSuggestion } from './VariableSuggestion';
import { TableFloatingMenu } from './TableFloatingMenu';
import {
  FontSize,
  LineHeight,
  PageNode,
  Pagination,
  PositionedBlock,
  EnhancedTable,
} from './extensions';

// Page dimensions in pixels at 96dpi
const PAGE_DIMENSIONS = {
  letter: { width: 816, height: 1056 }, // 8.5" x 11"
  a4: { width: 794, height: 1123 }, // 8.27" x 11.69"
  legal: { width: 816, height: 1344 }, // 8.5" x 14"
} as const;

// Ref interface for external access to editor
export interface PageBasedEditorRef {
  getEditor: () => Editor | null;
  insertVariable: (key: string, label: string) => void;
  getPageCount: () => number;
  goToPage: (pageNumber: number) => void;
}

// Editor content type (Tiptap JSON format)
export type EditorContent = {
  type: string;
  content?: EditorContent[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
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

// Calculate content area height based on page settings
function calculateContentHeight(settings: PageSettings): number {
  const baseDimensions = PAGE_DIMENSIONS[settings.pageSize];
  const pageHeight =
    settings.orientation === 'landscape'
      ? baseDimensions.width
      : baseDimensions.height;

  // Subtract margins (in pixels, 96dpi)
  const topMargin = settings.margins.top * 96;
  const bottomMargin = settings.margins.bottom * 96;

  return pageHeight - topMargin - bottomMargin;
}

// Calculate page width based on settings
function calculatePageWidth(settings: PageSettings): number {
  const baseDimensions = PAGE_DIMENSIONS[settings.pageSize];
  return settings.orientation === 'landscape'
    ? baseDimensions.height
    : baseDimensions.width;
}

interface PageBasedPresentationEditorProps {
  value?: EditorContent;
  onChange?: (value: EditorContent) => void;
  onReady?: (editor: Editor) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  hideBubbleMenu?: boolean;
  pageSettings?: PageSettings;
  onPageCountChange?: (pageCount: number) => void;
}

// Default page settings - using 0.75" margins for more content space
const DEFAULT_PAGE_SETTINGS: PageSettings = {
  pageSize: 'letter',
  orientation: 'portrait',
  margins: {
    top: 0.75,
    bottom: 0.75,
    left: 0.75,
    right: 0.75,
  },
};

// Custom Document that only accepts page nodes
const PageDocument = Document.extend({
  content: 'page+',
});

export const PageBasedPresentationEditor = forwardRef<
  PageBasedEditorRef,
  PageBasedPresentationEditorProps
>(
  (
    {
      value,
      onChange,
      onReady,
      readOnly = false,
      placeholder = 'Start creating your document...',
      className,
      hideBubbleMenu = false,
      pageSettings = DEFAULT_PAGE_SETTINGS,
      onPageCountChange,
    },
    ref
  ) => {
    const lastSelectionRef = useRef<Selection | null>(null);
    const lastMarksRef = useRef<
      { type: string; attrs?: Record<string, unknown> }[]
    >([]);
    const [pageCount, setPageCount] = useState(1);

    // Calculate dimensions from settings
    const contentHeight = calculateContentHeight(pageSettings);
    const pageWidth = calculatePageWidth(pageSettings);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        PageDocument,
        PageNode.configure({
          pageWidth,
          pageHeight: contentHeight,
          margins: {
            top: pageSettings.margins.top * 96,
            bottom: pageSettings.margins.bottom * 96,
            left: pageSettings.margins.left * 96,
            right: pageSettings.margins.right * 96,
          },
        }),
        Pagination.configure({
          pageHeight: contentHeight,
          pageWidth,
          margins: {
            top: pageSettings.margins.top * 96,
            bottom: pageSettings.margins.bottom * 96,
            left: pageSettings.margins.left * 96,
            right: pageSettings.margins.right * 96,
          },
          debounceMs: 50,
          onPaginationChange: (count) => {
            setPageCount(count);
            onPageCountChange?.(count);
          },
        }),
        StarterKit.configure({
          document: false, // Use custom PageDocument
          heading: {
            levels: [1, 2, 3],
          },
          dropcursor: false,
          gapcursor: false,
        }),
        Underline,
        Placeholder.configure({
          placeholder: ({ node, editor: ed }) => {
            const isEmpty =
              ed.state.doc.childCount === 1 &&
              ed.state.doc.firstChild?.type.name === 'page' &&
              ed.state.doc.firstChild?.content.size <= 2;

            if (!isEmpty) return '';

            if (node.type.name === 'heading') {
              return 'Heading...';
            }
            return placeholder;
          },
          showOnlyWhenEditable: true,
          showOnlyCurrent: false,
          includeChildren: true,
        }),
        TaskList.configure({
          HTMLAttributes: { class: 'task-list' },
        }),
        TaskItem.configure({
          nested: true,
          HTMLAttributes: { class: 'task-item' },
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: { class: 'editor-table' },
        }),
        TableRow,
        TableHeader,
        TableCell,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: 'editor-link' },
        }),
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Dropcursor.configure({ color: '#ee6c4d', width: 2 }),
        Gapcursor,
        TextStyle,
        FontFamily,
        FontSize,
        Color,
        LineHeight,
        SlashCommand,
        VariableExtension,
        VariableSuggestion,
        // Canvas-like positioning
        PositionedBlock.configure({
          defaultWidth: 400,
          defaultHeight: null,
          minWidth: 100,
          minHeight: 50,
          gridSize: 0,
        }),
        // Enhanced table controls
        EnhancedTable.configure({
          minColumnWidth: 50,
          defaultColumnWidth: 100,
          minRowHeight: 30,
          showResizeHandles: true,
        }),
      ],
      content: value,
      editable: !readOnly,
      onCreate: ({ editor: ed }) => {
        onReady?.(ed);
        // Update page count on create
        updatePageCount(ed);
      },
      onUpdate: ({ editor: ed }) => {
        onChange?.(ed.getJSON() as EditorContent);
        updatePageCount(ed);
      },
      onSelectionUpdate: ({ editor: ed }) => {
        lastSelectionRef.current = ed.state.selection;
        const marks =
          ed.state.storedMarks || ed.state.selection.$from.marks();
        lastMarksRef.current = marks.map((mark) => ({
          type: mark.type.name,
          attrs: mark.attrs,
        }));
      },
      onBlur: ({ editor: ed }) => {
        lastSelectionRef.current = ed.state.selection;
        const marks =
          ed.state.storedMarks || ed.state.selection.$from.marks();
        lastMarksRef.current = marks.map((mark) => ({
          type: mark.type.name,
          attrs: mark.attrs,
        }));
      },
      editorProps: {
        attributes: {
          class: 'prose-editor focus:outline-none',
        },
        handleKeyDown: (view, event) => {
          if (event.key === 'Tab') {
            event.preventDefault();

            const { state, dispatch } = view;
            const { selection } = state;

            const isInList =
              state.doc.resolve(selection.from).parent.type.name ===
                'listItem' ||
              state.doc.resolve(selection.from).parent.type.name ===
                'taskItem';

            if (isInList) {
              return false;
            } else {
              if (event.shiftKey) {
                return true;
              } else {
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

    // Helper to count pages
    const updatePageCount = useCallback((ed: Editor) => {
      let count = 0;
      ed.state.doc.forEach((node) => {
        if (node.type.name === 'page') {
          count++;
        }
      });
      setPageCount(Math.max(1, count));
      onPageCountChange?.(Math.max(1, count));
    }, [onPageCountChange]);

    // Update content when value prop changes
    useEffect(() => {
      if (
        editor &&
        value &&
        JSON.stringify(editor.getJSON()) !== JSON.stringify(value)
      ) {
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

    // Update page dimensions when settings change
    useEffect(() => {
      if (editor) {
        editor.commands.setPageDimensions(pageWidth, contentHeight);
      }
    }, [editor, pageWidth, contentHeight]);

    // Expose editor methods via ref
    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        insertVariable: (key: string, label: string) => {
          if (editor) {
            if (lastSelectionRef.current) {
              editor.commands.setTextSelection({
                from: lastSelectionRef.current.from,
                to: lastSelectionRef.current.to,
              });
            }

            const variableContent: {
              type: string;
              attrs: Record<string, unknown>;
              marks?: { type: string; attrs?: Record<string, unknown> }[];
            } = {
              type: 'variable',
              attrs: { variableKey: key, variableLabel: label },
            };

            if (lastMarksRef.current.length > 0) {
              variableContent.marks = lastMarksRef.current;
            }

            editor.chain().focus().insertContent(variableContent).run();
          }
        },
        getPageCount: () => pageCount,
        goToPage: (pageNumber: number) => {
          if (editor) {
            let targetPos = 0;
            let currentPage = 0;

            editor.state.doc.forEach((node, pos) => {
              if (node.type.name === 'page') {
                currentPage++;
                if (currentPage === pageNumber) {
                  targetPos = pos + 1;
                }
              }
            });

            if (targetPos > 0) {
              editor.commands.setTextSelection(targetPos);
              editor.commands.scrollIntoView();
            }
          }
        },
      }),
      [editor, pageCount]
    );

    if (!editor) {
      return (
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading editor...</div>
        </div>
      );
    }

    // Typography styles for the editor content
    const typographyStyles = [
      '[&_.tiptap]:outline-none [&_.tiptap]:min-h-[350px]',
      // Headings
      '[&_.tiptap_h1]:text-3xl [&_.tiptap_h1]:font-bold [&_.tiptap_h1]:text-gray-900 dark:[&_.tiptap_h1]:text-gray-100 [&_.tiptap_h1]:mb-4 [&_.tiptap_h1]:mt-6 [&_.tiptap_h1]:first:mt-0',
      '[&_.tiptap_h2]:text-2xl [&_.tiptap_h2]:font-semibold [&_.tiptap_h2]:text-gray-800 dark:[&_.tiptap_h2]:text-gray-200 [&_.tiptap_h2]:mb-3 [&_.tiptap_h2]:mt-5',
      '[&_.tiptap_h3]:text-xl [&_.tiptap_h3]:font-medium [&_.tiptap_h3]:text-gray-700 dark:[&_.tiptap_h3]:text-gray-300 [&_.tiptap_h3]:mb-2 [&_.tiptap_h3]:mt-4',
      '[&_.tiptap_p]:text-gray-600 dark:[&_.tiptap_p]:text-gray-400 [&_.tiptap_p]:mb-3 [&_.tiptap_p]:leading-relaxed',
      // Blockquote
      '[&_.tiptap_blockquote]:border-l-4 [&_.tiptap_blockquote]:border-coral [&_.tiptap_blockquote]:pl-4 [&_.tiptap_blockquote]:py-1 [&_.tiptap_blockquote]:italic [&_.tiptap_blockquote]:my-4 [&_.tiptap_blockquote]:text-gray-600 dark:[&_.tiptap_blockquote]:text-gray-400',
      // Lists - tighter spacing, inherit font from paragraph
      '[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-5 [&_.tiptap_ul]:my-2 [&_.tiptap_ul]:ml-1',
      '[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-5 [&_.tiptap_ol]:my-2 [&_.tiptap_ol]:ml-1',
      '[&_.tiptap_li]:my-0.5 [&_.tiptap_li]:text-gray-600 dark:[&_.tiptap_li]:text-gray-400 [&_.tiptap_li]:leading-relaxed',
      '[&_.tiptap_li_p]:mb-0 [&_.tiptap_li_p]:inline', // Remove paragraph margin inside list items
      '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:ml-1',
      '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:ml-1',
      '[&_li]:my-0.5 [&_li]:text-gray-600 dark:[&_li]:text-gray-400 [&_li]:leading-relaxed',
      '[&_li_p]:mb-0', // Remove paragraph margin inside list items
      // Task list
      '[&_.task-list]:list-none [&_.task-list]:pl-0',
      '[&_.task-item]:flex [&_.task-item]:items-start [&_.task-item]:gap-2 [&_.task-item]:my-1',
      '[&_.task-item_input]:mt-1 [&_.task-item_input]:w-4 [&_.task-item_input]:h-4 [&_.task-item_input]:rounded [&_.task-item_input]:border-2 [&_.task-item_input]:border-gray-300 dark:[&_.task-item_input]:border-gray-600 [&_.task-item_input]:checked:bg-coral [&_.task-item_input]:checked:border-coral',
      '[&_.task-item[data-checked=true]_p]:line-through [&_.task-item[data-checked=true]_p]:text-gray-400',
      // Horizontal rule
      '[&_.tiptap_hr]:border-gray-200 dark:[&_.tiptap_hr]:border-gray-700 [&_.tiptap_hr]:my-6',
      // Table
      '[&_.editor-table]:border-collapse [&_.editor-table]:table-fixed [&_.editor-table]:w-full [&_.editor-table]:my-4 [&_.editor-table]:border [&_.editor-table]:border-gray-300 dark:[&_.editor-table]:border-gray-600',
      '[&_.editor-table_th]:bg-gray-100 dark:[&_.editor-table_th]:bg-gray-800 [&_.editor-table_th]:border [&_.editor-table_th]:border-gray-300 dark:[&_.editor-table_th]:border-gray-600 [&_.editor-table_th]:px-3 [&_.editor-table_th]:py-2 [&_.editor-table_th]:text-left [&_.editor-table_th]:font-semibold [&_.editor-table_th]:text-gray-700 dark:[&_.editor-table_th]:text-gray-300 [&_.editor-table_th]:overflow-hidden [&_.editor-table_th]:break-words',
      '[&_.editor-table_td]:border [&_.editor-table_td]:border-gray-300 dark:[&_.editor-table_td]:border-gray-600 [&_.editor-table_td]:px-3 [&_.editor-table_td]:py-2 [&_.editor-table_td]:text-gray-700 dark:[&_.editor-table_td]:text-gray-300 [&_.editor-table_td]:overflow-hidden [&_.editor-table_td]:break-words',
      '[&_.editor-table_.selectedCell]:bg-blue-50 dark:[&_.editor-table_.selectedCell]:bg-blue-900/20',
      '[&_table]:border-collapse [&_table]:table-fixed [&_table]:w-full [&_table]:my-4 [&_table]:border [&_table]:border-gray-300 dark:[&_table]:border-gray-600',
      '[&_th]:bg-gray-100 dark:[&_th]:bg-gray-800 [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:overflow-hidden [&_th]:text-ellipsis',
      '[&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600 [&_td]:px-3 [&_td]:py-2 [&_td]:overflow-hidden [&_td]:break-words',
      '[&_.selectedCell]:bg-blue-50 dark:[&_.selectedCell]:bg-blue-900/20',
      // Links
      '[&_.editor-link]:text-blue-600 dark:[&_.editor-link]:text-blue-400 [&_.editor-link]:underline [&_.editor-link]:cursor-pointer [&_.editor-link]:hover:text-blue-800 dark:[&_.editor-link]:hover:text-blue-300',
      '[&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_a]:cursor-pointer',
      // Code
      '[&_.tiptap_code]:bg-gray-100 dark:[&_.tiptap_code]:bg-gray-800 [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:rounded [&_.tiptap_code]:text-sm [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-gray-700 dark:[&_.tiptap_code]:text-gray-300',
      '[&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
      // Highlight
      '[&_.tiptap_mark]:bg-yellow-200 dark:[&_.tiptap_mark]:bg-yellow-500/30',
      // Variable
      '[&_.variable-node]:inline [&_.variable-node]:px-0.5 [&_.variable-node]:rounded [&_.variable-node]:bg-gray-100 dark:[&_.variable-node]:bg-gray-800 [&_.variable-node]:text-gray-700 dark:[&_.variable-node]:text-gray-300 [&_.variable-node]:font-medium [&_.variable-node]:border-b [&_.variable-node]:border-dashed [&_.variable-node]:border-gray-400',
      // Placeholder
      '[&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
      '[&_.is-empty::before]:text-gray-400 [&_.is-empty::before]:content-[attr(data-placeholder)] [&_.is-empty::before]:float-left [&_.is-empty::before]:pointer-events-none [&_.is-empty::before]:h-0',
      // Page styling
      '[&_.page-wrapper]:relative',
      '[&_.page-container]:bg-white dark:[&_.page-container]:bg-gray-900',
      // Positioned block styling
      '[&_.positioned-block-wrapper]:group',
      '[&_.positioned-block-content]:transition-shadow',
    ];

    return (
      <div className={cn('page-based-editor h-full', className)}>
        {!readOnly && !hideBubbleMenu && <BubbleMenuComponent editor={editor} />}
        {!readOnly && <TableFloatingMenu editor={editor} />}

        {/* Page container with gray background */}
        <div className="h-full overflow-y-auto bg-gray-100 dark:bg-gray-800 p-8">
          {/* Page count indicator */}
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </div>

          {/* Editor content - pages render vertically */}
          <EditorContent
            editor={editor}
            className={cn(...typographyStyles)}
          />
        </div>
      </div>
    );
  }
);

PageBasedPresentationEditor.displayName = 'PageBasedPresentationEditor';

export default PageBasedPresentationEditor;
