import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SmartQuoteHelper } from '@/templates/SmartQuoteTemplate';
import { LivePreviewPanelProps, DocumentPage } from './types';
import { SectionInteractions } from './section-interactions';
// REMOVED: PreviewControls - sticky header moved to main control panel
import { ContentSplitter } from './ContentSplitter';
import { getPreviewStyles } from './preview-styles';

export const LivePreviewPanelCore: React.FC<LivePreviewPanelProps> = ({
  previewHTML,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSectionClick,
  onSectionHover,
  className = '',
  // showSmartPDFPreview = false
}) => {
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previousHtmlRef = useRef<string>('');

  // Extract sections for click handling and detect content changes
  useEffect(() => {
    if (previewHTML) {
      const extractedSections = SmartQuoteHelper.extractSections(previewHTML);
      setSections(extractedSections);
      
      // Check for significant content changes that require immediate recalculation
      const hasSignificantChange = previousHtmlRef.current && 
        Math.abs(previewHTML.length - previousHtmlRef.current.length) > 100;
      
      if (hasSignificantChange) {
        console.log('🔄 Significant content change detected, forcing recalculation');
        ContentSplitter.forceRecalculation();
      }
      
      previousHtmlRef.current = previewHTML;
    }
  }, [previewHTML]);

  // Calculate pages using intelligent content splitting
  const calculatePages = useCallback(async () => {
    if (!previewHTML) return;

    console.log('🔄 Starting intelligent content-aware pagination');
    
    try {
      // Use ContentSplitter to properly split content across pages
      const splitPages = await ContentSplitter.splitContent(previewHTML);
      
      // Convert to DocumentPage format
      const newPages: DocumentPage[] = splitPages.map(page => ({
        id: page.id,
        content: page.content,
        pageNumber: page.pageNumber
      }));
      
      console.log(`✅ ContentSplitter created ${newPages.length} pages with proper content distribution`);
      console.log('📄 Pages:', newPages.map(p => `Page ${p.pageNumber}: ${p.content.length} chars`));
      setPages(newPages);
      
    } catch (error) {
      console.error('❌ Error in content splitting:', error);
      
      // Fallback to single page
      setPages([{
        id: 'fallback-page-1',
        content: previewHTML,
        pageNumber: 1
      }]);
    }
  }, [previewHTML]);

  useEffect(() => {
    // Add a small delay to ensure DOM is stable after content updates
    const timeoutId = setTimeout(() => {
      calculatePages();
    }, 150); // Increased delay to 150ms for better stability after edits
    
    return () => clearTimeout(timeoutId);
  }, [calculatePages]);

  // Create interaction handlers
  const handleSectionClick = useCallback(
    SectionInteractions.createSectionClickHandler(onSectionClick, sections),
    [onSectionClick, sections]
  );

  const handleSectionHover = useCallback(
    SectionInteractions.createSectionHoverHandler((sectionId) => {
      setHoveredSectionId(sectionId);
      onSectionHover?.(sectionId);
    }),
    [onSectionHover]
  );

  const handleSectionLeave = useCallback(
    SectionInteractions.createSectionLeaveHandler((sectionId) => {
      setHoveredSectionId(sectionId);
      onSectionHover?.(sectionId);
    }),
    [onSectionHover]
  );

  // Debug logging for rendering
  console.log(`🖼️ LivePreviewPanel rendering with ${pages.length} pages`);

  return (
    <div data-testid="live-preview-panel" className={`flex-1 overflow-auto ${className}`}>
      {/* Split Page Content */}
      <div className="py-8 px-4 pb-20">
        <div className="max-w-none mx-auto">
          {pages.length > 0 ? (
            pages.map((page, index) => (
            <div
              key={page.id}
              className="split-page-content"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                marginBottom: `${32 * zoomLevel / 100}px`,
                padding: '60px 72px 72px 72px', // Reduced top margin, standard sides/bottom
                boxSizing: 'border-box',
                minHeight: '1056px', // Full page height at 96 DPI
                width: '816px', // Page width at 96 DPI
                background: 'white',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            >

              {/* Page Content with Styles */}
              <div
                ref={index === 0 ? previewRef : undefined}
                className="quote-document"
                dangerouslySetInnerHTML={{ __html: page.content + getPreviewStyles() }}
                onClick={handleSectionClick}
                onMouseMove={handleSectionHover}
                onMouseLeave={handleSectionLeave}
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'visible'
                }}
              />
            </div>
          ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              Loading preview...
            </div>
          )}
        </div>
      </div>

      {/* Hidden measuring element */}
      <div ref={measureRef} className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none" />
    </div>
  );
};

export default LivePreviewPanelCore;