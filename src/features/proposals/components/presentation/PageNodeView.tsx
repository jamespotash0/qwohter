/**
 * Page Node View Component
 *
 * React component that renders a page node in the TipTap editor.
 * Provides visual page styling with fixed dimensions and proper overflow handling.
 */

import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';

interface PageNodeViewProps extends NodeViewProps {
  node: NodeViewProps['node'] & {
    attrs: {
      pageNumber: number;
      pageWidth: number;
      pageHeight: number;
      marginTop: number;
      marginBottom: number;
      marginLeft: number;
      marginRight: number;
    };
  };
}

export const PageNodeView: React.FC<PageNodeViewProps> = ({
  node,
  selected,
}) => {
  const {
    pageNumber,
    pageWidth,
    pageHeight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
  } = node.attrs;

  // Calculate total page height (content height + margins)
  const totalPageHeight = pageHeight + marginTop + marginBottom;

  return (
    <NodeViewWrapper
      className={cn(
        'page-wrapper',
        'mb-8 last:mb-0', // Gap between pages
        selected && 'ring-2 ring-coral/30'
      )}
    >
      {/* Page container */}
      <div
        className={cn(
          'page-container',
          'relative mx-auto',
          'bg-white dark:bg-gray-900',
          'shadow-lg',
          'rounded-sm',
          'transition-shadow duration-200',
          'hover:shadow-xl'
        )}
        style={{
          width: `${pageWidth}px`,
          height: `${totalPageHeight}px`,
          // Clip overflow - pagination handles moving content
          overflow: 'hidden',
        }}
      >
        {/* Page number indicator */}
        <div
          className={cn(
            'page-number',
            'absolute -top-6 left-0 right-0',
            'text-center text-xs text-gray-400 dark:text-gray-500',
            'select-none pointer-events-none'
          )}
        >
          Page {pageNumber}
        </div>

        {/* Content area with margins */}
        <div
          className="page-content"
          style={{
            paddingTop: `${marginTop}px`,
            paddingBottom: `${marginBottom}px`,
            paddingLeft: `${marginLeft}px`,
            paddingRight: `${marginRight}px`,
            height: '100%',
            boxSizing: 'border-box',
          }}
        >
          <NodeViewContent className="page-content-inner" />
        </div>

        {/* Page footer with page number (for print) */}
        <div
          className={cn(
            'page-footer',
            'absolute bottom-2 left-0 right-0',
            'text-center text-xs text-gray-300 dark:text-gray-600',
            'select-none pointer-events-none',
            'print:text-gray-400'
          )}
        >
          {pageNumber}
        </div>

        {/* Visual page boundary indicator */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0',
            'h-px bg-gray-200 dark:bg-gray-700',
            'opacity-50'
          )}
        />
      </div>
    </NodeViewWrapper>
  );
};

export default PageNodeView;
