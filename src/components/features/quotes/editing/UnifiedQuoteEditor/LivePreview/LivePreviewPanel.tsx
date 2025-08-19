import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SmartQuoteHelper } from '@/templates/SmartQuoteTemplate';
import { LivePreviewPanelProps, DocumentPage } from './types';
import { PageCalculator } from './page-calculator';
import { SectionInteractions } from './section-interactions';
import { PreviewControls } from './PreviewControls';
import { DocumentCanvas } from './DocumentCanvas';

export const LivePreviewPanelCore: React.FC<LivePreviewPanelProps> = ({
  previewHTML,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSectionClick,
  className = '',
  showSmartPDFPreview = false
}) => {
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<any[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Extract sections for click handling
  useEffect(() => {
    if (previewHTML) {
      const extractedSections = SmartQuoteHelper.extractSections(previewHTML);
      setSections(extractedSections);
    }
  }, [previewHTML]);

  // Calculate pages for pagination with dynamic page breaks
  const calculatePages = useCallback(async () => {
    if (!previewHTML) return;

    let newPages: DocumentPage[];

    if (showSmartPDFPreview) {
      newPages = await PageCalculator.calculateSmartPDFPages(previewHTML);
    } else {
      newPages = await PageCalculator.calculateNormalPages(previewHTML);
    }

    setPages(newPages);
  }, [previewHTML, showSmartPDFPreview]);

  useEffect(() => {
    calculatePages();
  }, [calculatePages]);

  // Create interaction handlers
  const handleSectionClick = useCallback(
    SectionInteractions.createSectionClickHandler(onSectionClick, sections),
    [onSectionClick, sections]
  );

  const handleSectionHover = useCallback(
    SectionInteractions.createSectionHoverHandler(setHoveredSectionId),
    []
  );

  const handleSectionLeave = useCallback(
    SectionInteractions.createSectionLeaveHandler(setHoveredSectionId),
    []
  );

  return (
    <div data-testid="live-preview-panel" className={`flex-1 overflow-auto ${className}`}>
      {/* Preview Controls */}
      <PreviewControls
        zoomLevel={zoomLevel}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        hoveredSectionId={hoveredSectionId}
        sectionsCount={sections.length}
      />

      {/* Document Canvas */}
      <DocumentCanvas
        pages={pages}
        zoomLevel={zoomLevel}
        previewRef={previewRef}
        onSectionClick={handleSectionClick}
        onSectionHover={handleSectionHover}
        onSectionLeave={handleSectionLeave}
      />

      {/* Hidden measuring element */}
      <div ref={measureRef} className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none" />
    </div>
  );
};

export default LivePreviewPanelCore;