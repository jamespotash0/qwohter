/**
 * Document Preview Component
 * Renders a document template with variables replaced by actual values
 * Used for live preview in the proposal editor
 */

import { useMemo } from 'react';
import { replaceVariablesInContent } from './VariableElement';
import type { PlateElement } from './DocumentEditor';
import type { PageSettings } from '../types';

// ============================================================================
// Types
// ============================================================================

interface DocumentPreviewProps {
  content: PlateElement[];
  values: Record<string, string | number | undefined>;
  pageSettings?: PageSettings;
  className?: string;
  zoom?: number;
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
// Component
// ============================================================================

export function DocumentPreview({
  content,
  values,
  pageSettings = DEFAULT_PAGE_SETTINGS,
  className = '',
  zoom = 100,
}: DocumentPreviewProps) {
  // Replace variables in content
  const renderedContent = useMemo(() => {
    return replaceVariablesInContent(content, values);
  }, [content, values]);

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
  const marginStyle = useMemo(
    () => ({
      paddingTop: `${pageSettings.margins.top}px`,
      paddingRight: `${pageSettings.margins.right}px`,
      paddingBottom: `${pageSettings.margins.bottom}px`,
      paddingLeft: `${pageSettings.margins.left}px`,
    }),
    [pageSettings.margins]
  );

  // Render content to HTML
  const renderElement = (element: PlateElement, index: number): React.ReactNode => {
    const { type, children } = element;
    const key = `${type}-${index}`;

    // Render children
    const renderChildren = () => {
      return children.map((child, childIndex) => {
        if ('text' in child && typeof child.text === 'string') {
          // Text node with formatting
          let text: React.ReactNode = child.text;

          // Handle empty text
          if (!text) return null;

          // Apply formatting
          const childWithFormatting = child as {
            text: string;
            bold?: boolean;
            italic?: boolean;
            underline?: boolean;
            strikethrough?: boolean;
          };

          if (childWithFormatting.bold) {
            text = <strong key={`bold-${childIndex}`}>{text}</strong>;
          }
          if (childWithFormatting.italic) {
            text = <em key={`italic-${childIndex}`}>{text}</em>;
          }
          if (childWithFormatting.underline) {
            text = (
              <span key={`underline-${childIndex}`} className="underline">
                {text}
              </span>
            );
          }
          if (childWithFormatting.strikethrough) {
            text = (
              <span key={`strike-${childIndex}`} className="line-through">
                {text}
              </span>
            );
          }

          return <span key={childIndex}>{text}</span>;
        } else {
          // Nested element
          return renderElement(child as PlateElement, childIndex);
        }
      });
    };

    // Render based on element type
    switch (type) {
      case 'h1':
        return (
          <h1 key={key} className="text-3xl font-bold my-4 border-b pb-2">
            {renderChildren()}
          </h1>
        );
      case 'h2':
        return (
          <h2 key={key} className="text-2xl font-semibold my-3">
            {renderChildren()}
          </h2>
        );
      case 'h3':
        return (
          <h3 key={key} className="text-xl font-medium my-2">
            {renderChildren()}
          </h3>
        );
      case 'blockquote':
        return (
          <blockquote
            key={key}
            className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4"
          >
            {renderChildren()}
          </blockquote>
        );
      case 'ul':
        return (
          <ul key={key} className="list-disc ml-6 my-2">
            {renderChildren()}
          </ul>
        );
      case 'ol':
        return (
          <ol key={key} className="list-decimal ml-6 my-2">
            {renderChildren()}
          </ol>
        );
      case 'li':
        return <li key={key}>{renderChildren()}</li>;
      case 'p':
      default:
        return (
          <p key={key} className="my-2 leading-relaxed">
            {renderChildren()}
          </p>
        );
    }
  };

  return (
    <div className={`document-preview overflow-auto bg-gray-100 ${className}`}>
      <div
        className="mx-auto my-8 bg-white shadow-lg rounded-sm"
        style={{
          width: `${pageDimensions.width}in`,
          minHeight: `${pageDimensions.height}in`,
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top center',
          ...marginStyle,
        }}
      >
        <div className="prose prose-sm max-w-none">
          {renderedContent.map((element, index) =>
            renderElement(element as PlateElement, index)
          )}
        </div>
      </div>
    </div>
  );
}
