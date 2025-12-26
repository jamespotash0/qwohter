/**
 * Presentation Toolbar
 *
 * Comprehensive Word-like toolbar for the presentation editor.
 * Features:
 * - Font family and size selection
 * - Text formatting (bold, italic, underline, strikethrough)
 * - Text and highlight colors
 * - Headings and paragraph styles
 * - Lists (bullet, numbered, task)
 * - Alignment and indentation
 * - Line spacing
 * - Tables
 * - Links
 * - Variables panel toggle
 * - Preview and export
 */

import { useCallback, useState, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextStrikethrough,
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  ListChecks,
  Quotes,
  Minus,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  TextAlignJustify,
  TextIndent,
  TextOutdent,
  Link,
  HighlighterCircle,
  PaintBucket,
  Rows,
  BracketsCurly,
  Eye,
  FilePdf,
  FileDoc,
  Spinner,
  CaretDown,
  Check,
  GearSix,
  ArrowCounterClockwise,
  ArrowClockwise,
  Printer,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  ToolbarButton,
  ToolbarDivider,
  ColorPicker,
  TableSelector,
  LinkDialog,
  PageSettingsDialog,
  DEFAULT_PAGE_SETTINGS,
  FONT_FAMILIES,
  FONT_SIZES,
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
  LINE_SPACING_OPTIONS,
  type PageSettings,
} from './toolbar';

interface PresentationToolbarProps {
  editor: Editor;
  showVariables: boolean;
  onToggleVariables: () => void;
  onPreview: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onPrint?: () => void;
  isExporting?: boolean;
  pageSettings?: PageSettings;
  onPageSettingsChange?: (settings: PageSettings) => void;
  /** Word count for the document */
  wordCount?: number;
  /** Character count for the document */
  characterCount?: number;
}

export function PresentationToolbar({
  editor,
  showVariables,
  onToggleVariables,
  onPreview,
  onExportPdf,
  onExportDocx,
  onPrint,
  isExporting = false,
  pageSettings,
  onPageSettingsChange,
  wordCount = 0,
  characterCount = 0,
}: PresentationToolbarProps) {
  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [existingLinkUrl, setExistingLinkUrl] = useState('');

  // Page settings dialog state
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);

  // Current formatting state - updated on selection change
  const [currentFontFamily, setCurrentFontFamily] = useState('Font');
  const [currentFontSize, setCurrentFontSize] = useState('12');
  const [currentLineHeight, setCurrentLineHeight] = useState('1.5');

  // Text formatting states
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);

  // Alignment state
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');

  // List states
  const [isBulletList, setIsBulletList] = useState(false);
  const [isOrderedList, setIsOrderedList] = useState(false);
  const [isTaskList, setIsTaskList] = useState(false);

  // Block states
  const [isBlockquote, setIsBlockquote] = useState(false);
  const [isLink, setIsLink] = useState(false);

  // Update formatting state when selection changes
  useEffect(() => {
    const updateFormattingState = () => {
      try {
        // Get font family
        const textStyleAttrs = editor.getAttributes('textStyle');
        if (textStyleAttrs?.fontFamily) {
          const match = FONT_FAMILIES.find((f) => f.value === textStyleAttrs.fontFamily);
          setCurrentFontFamily(match?.label || 'Font');
        } else {
          // Check marks at cursor position
          const { from } = editor.state.selection;
          const marks = editor.state.doc.resolve(from).marks();
          const textStyleMark = marks.find(m => m.type.name === 'textStyle');
          if (textStyleMark?.attrs?.fontFamily) {
            const match = FONT_FAMILIES.find((f) => f.value === textStyleMark.attrs.fontFamily);
            setCurrentFontFamily(match?.label || 'Font');
          } else {
            setCurrentFontFamily('Font');
          }
        }

        // Get font size
        if (textStyleAttrs?.fontSize) {
          const match = textStyleAttrs.fontSize.match(/^(\d+)/);
          setCurrentFontSize(match ? match[1] : '12');
        } else {
          const { from } = editor.state.selection;
          const marks = editor.state.doc.resolve(from).marks();
          const textStyleMark = marks.find(m => m.type.name === 'textStyle');
          if (textStyleMark?.attrs?.fontSize) {
            const match = textStyleMark.attrs.fontSize.match(/^(\d+)/);
            setCurrentFontSize(match ? match[1] : '12');
          } else {
            setCurrentFontSize('12');
          }
        }

        // Get line height
        const paragraphAttrs = editor.getAttributes('paragraph');
        const headingAttrs = editor.getAttributes('heading');
        const lineHeight = paragraphAttrs?.lineHeight || headingAttrs?.lineHeight || '';
        setCurrentLineHeight(lineHeight || '1.5');

        // Update text formatting states
        setIsBold(editor.isActive('bold'));
        setIsItalic(editor.isActive('italic'));
        setIsUnderline(editor.isActive('underline'));
        setIsStrike(editor.isActive('strike'));

        // Update alignment state
        if (editor.isActive({ textAlign: 'center' })) {
          setTextAlign('center');
        } else if (editor.isActive({ textAlign: 'right' })) {
          setTextAlign('right');
        } else if (editor.isActive({ textAlign: 'justify' })) {
          setTextAlign('justify');
        } else {
          setTextAlign('left');
        }

        // Update list states
        setIsBulletList(editor.isActive('bulletList'));
        setIsOrderedList(editor.isActive('orderedList'));
        setIsTaskList(editor.isActive('taskList'));

        // Update block states
        setIsBlockquote(editor.isActive('blockquote'));
        setIsLink(editor.isActive('link'));
      } catch {
        // Keep current values on error
      }
    };

    // Update immediately
    updateFormattingState();

    // Listen to selection and transaction updates
    editor.on('selectionUpdate', updateFormattingState);
    editor.on('transaction', updateFormattingState);

    return () => {
      editor.off('selectionUpdate', updateFormattingState);
      editor.off('transaction', updateFormattingState);
    };
  }, [editor]);

  // Get current text color
  const getCurrentTextColor = useCallback(() => {
    try {
      const attrs = editor.getAttributes('textStyle');
      return attrs?.color || '';
    } catch {
      return '';
    }
  }, [editor]);

  // Get current highlight color
  const getCurrentHighlight = useCallback(() => {
    try {
      const attrs = editor.getAttributes('highlight');
      return attrs?.color || '';
    } catch {
      return '';
    }
  }, [editor]);

  // Set text color
  const setTextColor = useCallback(
    (color: string) => {
      if (color) {
        editor.chain().focus().setColor(color).run();
      } else {
        editor.chain().focus().unsetColor().run();
      }
    },
    [editor]
  );

  // Set highlight color
  const setHighlight = useCallback(
    (color: string) => {
      if (color) {
        editor.chain().focus().toggleHighlight({ color }).run();
      } else {
        editor.chain().focus().unsetHighlight().run();
      }
    },
    [editor]
  );

  // Insert table
  const insertTable = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    },
    [editor]
  );

  // Set font family
  const setFontFamily = useCallback(
    (fontFamily: string) => {
      if (fontFamily) {
        editor.chain().focus().setFontFamily(fontFamily).run();
      } else {
        editor.chain().focus().unsetFontFamily().run();
      }
    },
    [editor]
  );

  // Set font size
  const setFontSize = useCallback(
    (fontSize: string) => {
      if (fontSize) {
        editor.chain().focus().setFontSize(fontSize).run();
      } else {
        editor.chain().focus().unsetFontSize().run();
      }
    },
    [editor]
  );

  // Set line height
  const setLineHeight = useCallback(
    (lineHeight: string) => {
      if (lineHeight) {
        editor.chain().focus().setLineHeight(lineHeight).run();
      } else {
        editor.chain().focus().unsetLineHeight().run();
      }
    },
    [editor]
  );

  // Handle link button click
  const handleLinkClick = useCallback(() => {
    // Get existing link URL if any
    const attrs = editor.getAttributes('link');
    setExistingLinkUrl(attrs?.href || '');
    setLinkDialogOpen(true);
  }, [editor]);

  // Handle link submission
  const handleLinkSubmit = useCallback(
    (url: string, text?: string) => {
      if (text) {
        // Insert link with text (when no selection)
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: text,
            marks: [{ type: 'link', attrs: { href: url } }],
          })
          .run();
      } else {
        // Apply link to selection
        editor.chain().focus().setLink({ href: url }).run();
      }
    },
    [editor]
  );

  // Handle link removal
  const handleLinkRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run();
  }, [editor]);

  // Handle print
  const handlePrint = useCallback(() => {
    if (onPrint) {
      onPrint();
    } else {
      // Default print behavior
      window.print();
    }
  }, [onPrint]);

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Main Toolbar Row */}
      <div className="flex items-center gap-1 px-2 py-1.5 flex-wrap">
        {/* File Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-7 px-2 rounded',
                'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                'flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300'
              )}
            >
              <span>File</span>
              <CaretDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onPageSettingsChange && (
              <>
                <DropdownMenuItem onClick={() => setPageSettingsOpen(true)}>
                  <GearSix className="w-4 h-4 mr-2" />
                  Page Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={onExportPdf} disabled={isExporting}>
              <FilePdf className="w-4 h-4 mr-2 text-red-500" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportDocx} disabled={isExporting}>
              <FileDoc className="w-4 h-4 mr-2 text-blue-500" />
              Export as DOCX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarDivider />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
        >
          <ArrowCounterClockwise className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
        >
          <ArrowClockwise className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Font Family Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-7 px-2 rounded border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'flex items-center gap-1 min-w-[100px]'
              )}
            >
              <span className="truncate">{currentFontFamily}</span>
              <CaretDown className="w-3 h-3 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48">
            {FONT_FAMILIES.map((font) => (
              <DropdownMenuItem
                key={font.value || 'default'}
                onClick={() => setFontFamily(font.value)}
                style={font.value ? { fontFamily: font.value } : undefined}
                className="flex items-center justify-between"
              >
                <span>{font.label}</span>
                {currentFontFamily === font.label && (
                  <Check className="w-4 h-4 text-coral" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Size Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-7 px-2 rounded border border-gray-200 dark:border-gray-700',
                'bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                'flex items-center gap-1 min-w-[60px]'
              )}
            >
              <span>{currentFontSize}</span>
              <CaretDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-24 max-h-[300px] overflow-y-auto">
            {FONT_SIZES.map((size) => (
              <DropdownMenuItem
                key={size.value}
                onClick={() => setFontSize(size.value)}
                className="flex items-center justify-between"
              >
                <span>{size.label}</span>
                {currentFontSize === size.label && (
                  <Check className="w-4 h-4 text-coral" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarDivider />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={isBold}
          title="Bold (⌘B)"
        >
          <TextB className="w-4 h-4" weight="bold" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={isItalic}
          title="Italic (⌘I)"
        >
          <TextItalic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={isUnderline}
          title="Underline (⌘U)"
        >
          <TextUnderline className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={isStrike}
          title="Strikethrough"
        >
          <TextStrikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Text Color */}
        <ColorPicker
          colors={TEXT_COLORS}
          currentColor={getCurrentTextColor()}
          onSelect={setTextColor}
          icon={<PaintBucket className="w-4 h-4" />}
          title="Text Color"
        />

        {/* Highlight Color */}
        <ColorPicker
          colors={HIGHLIGHT_COLORS}
          currentColor={getCurrentHighlight()}
          onSelect={setHighlight}
          icon={<HighlighterCircle className="w-4 h-4" />}
          title="Highlight Color"
        />

        <ToolbarDivider />

        {/* Headings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'h-7 px-2 rounded',
                'hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                'flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400'
              )}
            >
              <span>Heading</span>
              <CaretDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              Normal text
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <TextHOne className="w-4 h-4 mr-2" />
              Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <TextHTwo className="w-4 h-4 mr-2" />
              Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <TextHThree className="w-4 h-4 mr-2" />
              Heading 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={textAlign === 'left'}
          title="Align Left"
        >
          <TextAlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={textAlign === 'center'}
          title="Align Center"
        >
          <TextAlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={textAlign === 'right'}
          title="Align Right"
        >
          <TextAlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={textAlign === 'justify'}
          title="Justify"
        >
          <TextAlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={isBulletList}
          title="Bullet List"
        >
          <ListBullets className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={isOrderedList}
          title="Numbered List"
        >
          <ListNumbers className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={isTaskList}
          title="Task List"
        >
          <ListChecks className="w-4 h-4" />
        </ToolbarButton>

        {/* Indent/Outdent */}
        <ToolbarButton
          onClick={() => editor.chain().focus().liftListItem('listItem').run()}
          disabled={!editor.can().liftListItem('listItem')}
          title="Decrease Indent"
        >
          <TextOutdent className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
          disabled={!editor.can().sinkListItem('listItem')}
          title="Increase Indent"
        >
          <TextIndent className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Line Spacing */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Line Spacing"
              className={cn(
                'p-1.5 rounded transition-all duration-150',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-600 dark:text-gray-400 flex items-center gap-0.5'
              )}
            >
              <Rows className="w-4 h-4" />
              <CaretDown className="w-2.5 h-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {LINE_SPACING_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setLineHeight(option.value)}
                className="flex items-center justify-between"
              >
                <span>{option.label}</span>
                {currentLineHeight === option.value && (
                  <Check className="w-4 h-4 text-coral" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarDivider />

        {/* Table */}
        <TableSelector onInsert={insertTable} />

        {/* Quote */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={isBlockquote}
          title="Quote"
        >
          <Quotes className="w-4 h-4" />
        </ToolbarButton>

        {/* Horizontal Rule */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        {/* Link */}
        <ToolbarButton
          onClick={handleLinkClick}
          isActive={isLink}
          title="Insert Link (⌘K)"
        >
          <Link className="w-4 h-4" />
        </ToolbarButton>

        {/* Variables */}
        <ToolbarButton
          onClick={onToggleVariables}
          isActive={showVariables}
          title="Variables Panel"
        >
          <BracketsCurly className="w-4 h-4" weight={showVariables ? 'bold' : 'regular'} />
        </ToolbarButton>

        <div className="flex-1" />

        {/* Word/Character Count */}
        {(wordCount > 0 || characterCount > 0) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mr-2">
            <span>{wordCount.toLocaleString()} words</span>
            <span>•</span>
            <span>{characterCount.toLocaleString()} chars</span>
          </div>
        )}

        {/* Export indicator */}
        {isExporting && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Spinner className="w-4 h-4 animate-spin" />
            <span>Exporting...</span>
          </div>
        )}
      </div>

      {/* Link Dialog */}
      <LinkDialog
        isOpen={linkDialogOpen}
        onClose={() => setLinkDialogOpen(false)}
        onSubmit={handleLinkSubmit}
        onRemove={isLink ? handleLinkRemove : undefined}
        initialUrl={existingLinkUrl}
        hasSelection={!editor.state.selection.empty}
      />

      {/* Page Settings Dialog */}
      {onPageSettingsChange && (
        <PageSettingsDialog
          isOpen={pageSettingsOpen}
          onClose={() => setPageSettingsOpen(false)}
          settings={pageSettings || DEFAULT_PAGE_SETTINGS}
          onSave={onPageSettingsChange}
        />
      )}
    </div>
  );
}

export default PresentationToolbar;
