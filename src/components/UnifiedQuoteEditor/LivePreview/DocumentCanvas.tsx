import React from 'react';
import { DocumentPage } from './types';
import { getPreviewStyles } from './preview-styles';

interface DocumentCanvasProps {
  pages: DocumentPage[];
  zoomLevel: number;
  previewRef?: React.RefObject<HTMLDivElement>;
  onSectionClick: (event: React.MouseEvent) => void;
  onSectionHover: (event: React.MouseEvent) => void;
  onSectionLeave: () => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  pages,
  zoomLevel,
  previewRef,
  onSectionClick,
  onSectionHover,
  onSectionLeave
}) => {
  const customStyles = getPreviewStyles();

  return (
    <div className="py-8 px-4 pb-20">
      <div className="max-w-none mx-auto">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="mx-auto mb-8 bg-white shadow-lg relative"
            style={{
              width: `${816 * zoomLevel / 100}px`,  // 8.5 inches at 96 DPI
              minHeight: `${1056 * zoomLevel / 100}px`, // 11 inches at 96 DPI  
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'top center',
              marginBottom: `${32 * zoomLevel / 100}px`
            }}
          >
            {/* Page Content */}
            <div
              ref={index === 0 ? previewRef : undefined}
              className="quote-document"
              dangerouslySetInnerHTML={{ 
                __html: page.content + customStyles
              }}
              style={{
                padding: '48px', // 0.5 inch margins on all sides
                fontSize: `${12 * zoomLevel / 100}pt`,
                lineHeight: 1.15,
                overflow: 'visible',
                wordWrap: 'break-word',
                width: '100%',
                minHeight: '100%'
              }}
              onClick={onSectionClick}
              onMouseMove={onSectionHover}
              onMouseLeave={onSectionLeave}
            />
            
            {/* Page Number */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
              Page {page.pageNumber}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};