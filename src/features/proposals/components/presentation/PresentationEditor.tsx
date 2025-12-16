/**
 * Presentation Editor
 *
 * Notion-style rich text editor using Tiptap.
 * Features: slash commands, floating toolbar, tables, task lists, and more.
 */

import { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table }  from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Dropcursor from '@tiptap/extension-dropcursor';
import Gapcursor from '@tiptap/extension-gapcursor';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar';
import { BubbleMenuComponent } from './BubbleMenu';
import { SlashCommand } from './SlashCommand';
import { VariableExtension } from './VariableExtension';

// Editor content type (Tiptap JSON format)
export type EditorContent = {
  type: string;
  content?: EditorContent[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
};

// Default content when editor is empty
const DEFAULT_CONTENT: EditorContent = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Project Overview' }],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Start typing or press ' }, { type: 'text', text: '/', marks: [{ type: 'code' }] }, { type: 'text', text: ' for commands...' }],
    },
  ],
};

interface PresentationEditorProps {
  value?: EditorContent;
  onChange?: (value: EditorContent) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function PresentationEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Press "/" for commands...',
  className,
}: PresentationEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        dropcursor: false,
        gapcursor: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading...';
          }
          return placeholder;
        },
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
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
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Highlight.configure({
        multicolor: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Typography,
      Dropcursor.configure({
        color: '#ee6c4d',
        width: 2,
      }),
      Gapcursor,
      SlashCommand,
      VariableExtension,
    ],
    content: value || DEFAULT_CONTENT,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON() as EditorContent);
    },
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none',
      },
    },
  });

  // Update content when value prop changes
  useEffect(() => {
    if (editor && value && JSON.stringify(editor.getJSON()) !== JSON.stringify(value)) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  if (!editor) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={cn('presentation-editor', className)}>
      {!readOnly && <EditorToolbar editor={editor} />}
      {!readOnly && <BubbleMenuComponent editor={editor} />}
      <EditorContent
        editor={editor}
        className={cn(
          'min-h-[400px] p-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700',
          'focus-within:ring-2 focus-within:ring-coral/20 focus-within:border-coral',
          'transition-all duration-200',
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
          '[&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ul]:my-3',
          '[&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_ol]:my-3',
          '[&_.tiptap_li]:my-1 [&_.tiptap_li]:text-gray-600 dark:[&_.tiptap_li]:text-gray-400',
          // Task list
          '[&_.task-list]:list-none [&_.task-list]:pl-0',
          '[&_.task-item]:flex [&_.task-item]:items-start [&_.task-item]:gap-2 [&_.task-item]:my-1',
          '[&_.task-item_input]:mt-1 [&_.task-item_input]:w-4 [&_.task-item_input]:h-4 [&_.task-item_input]:rounded [&_.task-item_input]:border-2 [&_.task-item_input]:border-gray-300 dark:[&_.task-item_input]:border-gray-600 [&_.task-item_input]:checked:bg-coral [&_.task-item_input]:checked:border-coral',
          '[&_.task-item[data-checked=true]_p]:line-through [&_.task-item[data-checked=true]_p]:text-gray-400',
          // Horizontal rule
          '[&_.tiptap_hr]:border-gray-200 dark:[&_.tiptap_hr]:border-gray-700 [&_.tiptap_hr]:my-6',
          // Table
          '[&_.editor-table]:border-collapse [&_.editor-table]:w-full [&_.editor-table]:my-4',
          '[&_.editor-table_th]:bg-gray-50 dark:[&_.editor-table_th]:bg-gray-800 [&_.editor-table_th]:border [&_.editor-table_th]:border-gray-200 dark:[&_.editor-table_th]:border-gray-700 [&_.editor-table_th]:px-3 [&_.editor-table_th]:py-2 [&_.editor-table_th]:text-left [&_.editor-table_th]:font-semibold [&_.editor-table_th]:text-gray-700 dark:[&_.editor-table_th]:text-gray-300',
          '[&_.editor-table_td]:border [&_.editor-table_td]:border-gray-200 dark:[&_.editor-table_td]:border-gray-700 [&_.editor-table_td]:px-3 [&_.editor-table_td]:py-2 [&_.editor-table_td]:text-gray-600 dark:[&_.editor-table_td]:text-gray-400',
          '[&_.editor-table_.selectedCell]:bg-coral/10',
          // Link
          '[&_.editor-link]:text-coral [&_.editor-link]:underline [&_.editor-link]:cursor-pointer',
          // Code
          '[&_.tiptap_code]:bg-gray-100 dark:[&_.tiptap_code]:bg-gray-800 [&_.tiptap_code]:px-1.5 [&_.tiptap_code]:py-0.5 [&_.tiptap_code]:rounded [&_.tiptap_code]:text-sm [&_.tiptap_code]:font-mono [&_.tiptap_code]:text-coral',
          // Highlight
          '[&_.tiptap_mark]:bg-yellow-200 dark:[&_.tiptap_mark]:bg-yellow-500/30',
          // Variable
          '[&_.variable-node]:inline-flex [&_.variable-node]:items-center [&_.variable-node]:px-2 [&_.variable-node]:py-0.5 [&_.variable-node]:mx-0.5 [&_.variable-node]:rounded-md [&_.variable-node]:bg-coral/10 [&_.variable-node]:text-coral [&_.variable-node]:text-sm [&_.variable-node]:font-medium [&_.variable-node]:border [&_.variable-node]:border-coral/20',
          // Placeholder
          '[&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0',
          '[&_.is-empty::before]:text-gray-400 [&_.is-empty::before]:content-[attr(data-placeholder)] [&_.is-empty::before]:float-left [&_.is-empty::before]:pointer-events-none [&_.is-empty::before]:h-0'
        )}
      />
    </div>
  );
}

export default PresentationEditor;
export { DEFAULT_CONTENT };
