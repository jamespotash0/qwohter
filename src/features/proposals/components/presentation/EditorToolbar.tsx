/**
 * Editor Toolbar
 *
 * Formatting controls for the Tiptap presentation editor.
 * Supports text formatting, headings, and variable insertion.
 */

import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextHOne,
  TextHTwo,
  TextHThree,
  Quotes,
  Minus,
  BracketsCurly,
  ListBullets,
  ListNumbers,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { VariableInserter } from './VariableInserter';

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}

function ToolbarButton({ onClick, isActive, disabled, children, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded-lg transition-all duration-200',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isActive
          ? 'bg-coral/10 text-coral'
          : 'text-gray-600 dark:text-gray-400'
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />;
}

interface EditorToolbarProps {
  editor: Editor;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const [showVariables, setShowVariables] = useState(false);

  const handleInsertVariable = useCallback((variableKey: string, variableLabel: string) => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'variable',
        attrs: { variableKey, variableLabel },
      })
      .run();
    setShowVariables(false);
  }, [editor]);

  return (
    <div className="flex items-center gap-1 p-2 mb-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex-wrap">
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Cmd+B)"
      >
        <TextB className="w-4 h-4" weight={editor.isActive('bold') ? 'bold' : 'regular'} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Cmd+I)"
      >
        <TextItalic className="w-4 h-4" weight={editor.isActive('italic') ? 'bold' : 'regular'} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Cmd+U)"
      >
        <TextUnderline className="w-4 h-4" weight={editor.isActive('underline') ? 'bold' : 'regular'} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <TextHOne className="w-4 h-4" weight={editor.isActive('heading', { level: 1 }) ? 'bold' : 'regular'} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <TextHTwo className="w-4 h-4" weight={editor.isActive('heading', { level: 2 }) ? 'bold' : 'regular'} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <TextHThree className="w-4 h-4" weight={editor.isActive('heading', { level: 3 }) ? 'bold' : 'regular'} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <ListBullets className="w-4 h-4" weight={editor.isActive('bulletList') ? 'bold' : 'regular'} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListNumbers className="w-4 h-4" weight={editor.isActive('orderedList') ? 'bold' : 'regular'} />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Blocks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quotes className="w-4 h-4" weight={editor.isActive('blockquote') ? 'bold' : 'regular'} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Variable Insertion */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setShowVariables(!showVariables)}
          isActive={showVariables}
          title="Insert Variable"
        >
          <BracketsCurly className="w-4 h-4" weight={showVariables ? 'bold' : 'regular'} />
        </ToolbarButton>
        {showVariables && (
          <VariableInserter
            onClose={() => setShowVariables(false)}
            onSelect={handleInsertVariable}
          />
        )}
      </div>
    </div>
  );
}

export default EditorToolbar;
