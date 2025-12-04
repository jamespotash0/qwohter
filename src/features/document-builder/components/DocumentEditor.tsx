/**
 * Document Editor Component
 * Rich text editor built on Plate.js for document templates
 */

'use client';

import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Plate,
  PlateContent,
  createPlateEditor,
  ParagraphPlugin,
} from 'platejs/react';
import type { Value } from 'platejs';
import {
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
} from '@udecode/plate-basic-marks';
import { BaseHeadingPlugin } from '@udecode/plate-heading';
// Removed due to compatibility issues with platejs v52:
// import { BaseBlockquotePlugin } from '@udecode/plate-block-quote';
// import { BaseHorizontalRulePlugin } from '@udecode/plate-horizontal-rule';
// import { BaseLinkPlugin } from '@udecode/plate-link';
import { cn } from '@/lib/utils';
import { EditorToolbar } from './EditorToolbar';
import type { PageSettings, FormFieldVariable } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface PlateElement {
  type: string;
  children: Array<{ text: string } | PlateElement>;
  [key: string]: unknown;
}

interface DocumentEditorProps {
  initialContent?: PlateElement[];
  onChange?: (content: PlateElement[]) => void;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
  pageSettings?: PageSettings;
  formFields?: FormFieldVariable[];
  formName?: string;
}

// Page size dimensions in inches
const PAGE_SIZES = {
  letter: { width: 8.5, height: 11 },
  a4: { width: 8.27, height: 11.69 },
  legal: { width: 8.5, height: 14 },
};

const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'letter',
  orientation: 'portrait',
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
};

// ============================================================================
// Default Content
// ============================================================================

const DEFAULT_CONTENT: PlateElement[] = [
  {
    type: 'p',
    children: [{ text: '' }],
  },
];

// ============================================================================
// Component
// ============================================================================

export function DocumentEditor({
  initialContent,
  onChange,
  readOnly = false,
  className,
  placeholder = 'Start typing your document...',
  pageSettings = DEFAULT_PAGE_SETTINGS,
  formFields,
  formName,
}: DocumentEditorProps) {
  // Track if initial content has been set
  const hasInitializedRef = useRef(false);

  // Create editor with plugins
  const editor = useMemo(
    () =>
      createPlateEditor({
        plugins: [
          ParagraphPlugin,
          BaseHeadingPlugin,
          BaseBoldPlugin,
          BaseItalicPlugin,
          BaseUnderlinePlugin,
          BaseStrikethroughPlugin,
        ],
        value: DEFAULT_CONTENT,
      }),
    []
  );

  // Sync initialContent when it changes (e.g., after data fetch)
  useEffect(() => {
    if (initialContent && initialContent.length > 0 && !hasInitializedRef.current) {
      // Check if content is not just the default empty paragraph
      const hasContent = initialContent.some((node) => {
        if (node.type !== 'p') return true;
        if (!node.children) return false;
        return node.children.some((child) => {
          if ('text' in child && typeof child.text === 'string') {
            return child.text.length > 0;
          }
          return false;
        });
      });

      if (hasContent) {
        editor.tf.setValue(initialContent);
        hasInitializedRef.current = true;
      }
    }
  }, [initialContent, editor]);

  const handleChange = useCallback(
    ({ value }: { value: Value }) => {
      if (onChange) {
        onChange(value as PlateElement[]);
      }
    },
    [onChange]
  );

  // Calculate page dimensions based on settings
  const pageDimensions = useMemo(() => {
    const size = PAGE_SIZES[pageSettings.size];
    const isLandscape = pageSettings.orientation === 'landscape';

    return {
      width: isLandscape ? size.height : size.width,
      height: isLandscape ? size.width : size.height,
    };
  }, [pageSettings.size, pageSettings.orientation]);

  // Convert margins from px to appropriate units
  const marginStyle = useMemo(() => ({
    paddingTop: `${pageSettings.margins.top}px`,
    paddingRight: `${pageSettings.margins.right}px`,
    paddingBottom: `${pageSettings.margins.bottom}px`,
    paddingLeft: `${pageSettings.margins.left}px`,
  }), [pageSettings.margins]);

  return (
    <div className={cn('document-editor flex flex-col h-full', className)}>
      <Plate editor={editor} onChange={handleChange}>
        <EditorToolbar readOnly={readOnly} formFields={formFields} formName={formName} />
        <div className="flex-1 overflow-auto bg-gray-100">
          <div
            className="mx-auto my-8 bg-white shadow-lg rounded-sm"
            style={{
              width: `${pageDimensions.width}in`,
              minHeight: `${pageDimensions.height}in`,
              ...marginStyle,
            }}
          >
            <PlateContent
              readOnly={readOnly}
              placeholder={placeholder}
              className={cn(
                'outline-none min-h-full focus:outline-none',
                'prose prose-sm max-w-none',
                '[&_p]:my-2 [&_p]:leading-relaxed',
                '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:my-4 [&_h1]:border-b [&_h1]:pb-2',
                '[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:my-3',
                '[&_h3]:text-xl [&_h3]:font-medium [&_h3]:my-2',
                '[&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6',
                '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600',
                '[&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800',
                '[&_hr]:my-4 [&_hr]:border-gray-200'
              )}
            />
          </div>
        </div>
      </Plate>
    </div>
  );
}
