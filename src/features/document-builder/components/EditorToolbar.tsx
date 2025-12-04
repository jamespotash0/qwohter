/**
 * Editor Toolbar Component
 * Formatting controls for the document editor
 */

'use client';

import { useCallback } from 'react';
import {
  useEditorRef,
  useEditorSelector,
} from 'platejs/react';
import { ReactEditor } from 'slate-react';
import { Button } from '@/components/ui/button';

// Mark type keys from @udecode/plate-basic-marks
const MARK_BOLD = 'bold';
const MARK_ITALIC = 'italic';
const MARK_UNDERLINE = 'underline';
const MARK_STRIKETHROUGH = 'strikethrough';

// Helper to focus editor (type-safe wrapper for Plate editor)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const focusEditor = (editor: any) => {
  ReactEditor.focus(editor);
};
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Variable,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VariableInsertMenu } from './VariableInsertMenu';
import type { FormFieldVariable } from '../types';

// ============================================================================
// Types
// ============================================================================

interface EditorToolbarProps {
  readOnly?: boolean;
  formFields?: FormFieldVariable[];
  formName?: string;
}

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolbarButton({
  icon,
  label,
  isActive = false,
  disabled = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-8 w-8 p-0',
        isActive && 'bg-gray-200 text-gray-900'
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </Button>
  );
}

// ============================================================================
// Component
// ============================================================================

export function EditorToolbar({ readOnly = false, formFields, formName }: EditorToolbarProps) {
  const editor = useEditorRef();

  // Check if marks are active using the new platejs API
  const isBold = useEditorSelector(
    (editor) => editor.api.hasMark(MARK_BOLD),
    []
  );
  const isItalic = useEditorSelector(
    (editor) => editor.api.hasMark(MARK_ITALIC),
    []
  );
  const isUnderline = useEditorSelector(
    (editor) => editor.api.hasMark(MARK_UNDERLINE),
    []
  );
  const isStrikethrough = useEditorSelector(
    (editor) => editor.api.hasMark(MARK_STRIKETHROUGH),
    []
  );

  // Toggle mark helper using new platejs API
  const toggleMark = useCallback(
    (key: string) => {
      if (editor.api.hasMark(key)) {
        editor.tf.removeMark(key);
      } else {
        editor.tf.addMark(key, true);
      }
      focusEditor(editor);
    },
    [editor]
  );

  // Toggle mark handlers
  const handleToggleBold = useCallback(() => {
    toggleMark(MARK_BOLD);
  }, [toggleMark]);

  const handleToggleItalic = useCallback(() => {
    toggleMark(MARK_ITALIC);
  }, [toggleMark]);

  const handleToggleUnderline = useCallback(() => {
    toggleMark(MARK_UNDERLINE);
  }, [toggleMark]);

  const handleToggleStrikethrough = useCallback(() => {
    toggleMark(MARK_STRIKETHROUGH);
  }, [toggleMark]);

  // Block type handler
  const handleBlockType = useCallback(
    (type: string) => {
      // For now, just focus - will implement block transforms
      focusEditor(editor);
    },
    [editor]
  );

  // Insert variable
  const handleInsertVariable = useCallback(
    (variableKey: string) => {
      // Insert variable as inline text placeholder
      editor.tf.insertText(`{{${variableKey}}}`);
      focusEditor(editor);
    },
    [editor]
  );

  if (readOnly) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b bg-white flex-wrap sticky top-0 z-10">
      {/* Block Type */}
      <Select defaultValue="p" onValueChange={handleBlockType}>
        <SelectTrigger className="w-[140px] h-8 text-sm">
          <SelectValue placeholder="Paragraph" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p">
            <div className="flex items-center gap-2">
              <Pilcrow className="h-4 w-4" />
              Paragraph
            </div>
          </SelectItem>
          <SelectItem value="h1">
            <div className="flex items-center gap-2">
              <Heading1 className="h-4 w-4" />
              Heading 1
            </div>
          </SelectItem>
          <SelectItem value="h2">
            <div className="flex items-center gap-2">
              <Heading2 className="h-4 w-4" />
              Heading 2
            </div>
          </SelectItem>
          <SelectItem value="h3">
            <div className="flex items-center gap-2">
              <Heading3 className="h-4 w-4" />
              Heading 3
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Formatting */}
      <ToolbarButton
        icon={<Bold className="h-4 w-4" />}
        label="Bold (Ctrl+B)"
        isActive={isBold}
        onClick={handleToggleBold}
      />
      <ToolbarButton
        icon={<Italic className="h-4 w-4" />}
        label="Italic (Ctrl+I)"
        isActive={isItalic}
        onClick={handleToggleItalic}
      />
      <ToolbarButton
        icon={<Underline className="h-4 w-4" />}
        label="Underline (Ctrl+U)"
        isActive={isUnderline}
        onClick={handleToggleUnderline}
      />
      <ToolbarButton
        icon={<Strikethrough className="h-4 w-4" />}
        label="Strikethrough"
        isActive={isStrikethrough}
        onClick={handleToggleStrikethrough}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment (placeholder for now) */}
      <ToolbarButton
        icon={<AlignLeft className="h-4 w-4" />}
        label="Align Left"
        onClick={() => focusEditor(editor)}
      />
      <ToolbarButton
        icon={<AlignCenter className="h-4 w-4" />}
        label="Align Center"
        onClick={() => focusEditor(editor)}
      />
      <ToolbarButton
        icon={<AlignRight className="h-4 w-4" />}
        label="Align Right"
        onClick={() => focusEditor(editor)}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists (placeholder for now) */}
      <ToolbarButton
        icon={<List className="h-4 w-4" />}
        label="Bullet List"
        onClick={() => focusEditor(editor)}
      />
      <ToolbarButton
        icon={<ListOrdered className="h-4 w-4" />}
        label="Numbered List"
        onClick={() => focusEditor(editor)}
      />

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Insert Variable */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-sm font-medium"
            title="Insert Variable"
            type="button"
          >
            <Variable className="h-4 w-4" />
            Insert Variable
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <VariableInsertMenu
            onSelect={handleInsertVariable}
            formFields={formFields}
            formName={formName}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
