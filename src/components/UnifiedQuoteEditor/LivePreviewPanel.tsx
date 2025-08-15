import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, 
  ZoomOut, 
  FileText
} from 'lucide-react';
import { SmartQuoteHelper, QuoteSection } from '@/templates/SmartQuoteTemplate';

interface LivePreviewPanelProps {
  previewHTML: string;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSectionClick?: (sectionId: string, sectionData: QuoteSection) => void;
  className?: string;
}

interface DocumentPage {
  id: string;
  content: string;
  pageNumber: number;
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({
  previewHTML,
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onSectionClick,
  className = ''
}) => {
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [sections, setSections] = useState<QuoteSection[]>([]);
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

    try {
      // Apply dynamic page breaks to the HTML content
      const { enhanceWithPageBreaks } = await import('@/utils/pageBreakManager');
      const pagedHTML = enhanceWithPageBreaks(previewHTML);

      // Create a temporary element to parse the paged content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = pagedHTML;
      
      // Look for page elements created by the page break manager
      const pageElements = tempDiv.querySelectorAll('.page');
      
      const newPages: DocumentPage[] = [];
      
      if (pageElements.length > 0) {
        // Use the pages created by the page break manager
        pageElements.forEach((pageElement, index) => {
          newPages.push({
            id: `page-${index}`,
            content: pageElement.innerHTML,
            pageNumber: index + 1
          });
        });
      } else {
        // Fallback: put all content on one page if no page structure found
        newPages.push({
          id: 'page-0',
          content: pagedHTML,
          pageNumber: 1
        });
      }

      setPages(newPages);
    } catch (error) {
      console.error('Error calculating pages:', error);
      // Fallback to single page with original content
      setPages([{
        id: 'page-0',
        content: previewHTML,
        pageNumber: 1
      }]);
    }
  }, [previewHTML]);

  useEffect(() => {
    calculatePages();
  }, [calculatePages]);

  // Handle section clicks
  const handleSectionClick = useCallback((event: React.MouseEvent) => {
    if (!onSectionClick) return;

    const target = event.target as HTMLElement;
    
    // Find the closest section element or special clickable sections
    let sectionElement = target.closest('[class*="-section"]');
    let sectionId: string;
    let sectionMatch: RegExpMatchArray | null = null;

    if (!sectionElement) {
      // Check for special clickable sections
      sectionElement = target.closest('.proposal-intro') || target.closest('.pocket-doors-section') || target.closest('.panel-doors-section');
      if (!sectionElement) return;
      
      // Extract section ID from class name
      if (sectionElement.classList.contains('proposal-intro')) {
        sectionId = 'proposal-intro';
      } else if (sectionElement.classList.contains('pocket-doors-section')) {
        sectionId = 'pocket-doors-section';
      } else if (sectionElement.classList.contains('panel-doors-section')) {
        sectionId = 'panel-doors-section';
      } else {
        return;
      }
    } else {
      const className = sectionElement.className;
      
      // Find the class that ends with -section
      const classes = className.split(' ');
      const sectionClass = classes.find(cls => cls.endsWith('-section'));
      
      if (!sectionClass) return;
      
      // For special multi-word sections, use the full class name
      if (sectionClass === 'pocket-doors-section' || sectionClass === 'panel-doors-section') {
        sectionId = sectionClass;
      } else {
        // For normal sections, extract the base name (remove -section suffix)
        sectionId = sectionClass.replace('-section', '');
      }
    }
    
    // Skip read-only sections and billing/job info sections
    const readOnlySections = ['wall-specifications-list', 'pricing', 'billing-job-container', 'job-info-section', 'billing-table'];
    if (readOnlySections.includes(sectionId)) {
      return;
    }

    // Find section data or create mock data for special sections
    let sectionData = sections.find(s => s.id === sectionId);
    
    if (!sectionData) {
      // Create mock section data for special clickable sections
      if (sectionId === 'proposal-intro') {
        const content = sectionElement?.outerHTML || '';
        sectionData = {
          id: 'proposal-intro',
          title: 'Project Introduction & Specifications',
          content: content,
          isVisible: true,
          isRequired: true
        };
      } else if (sectionId === 'pocket-doors-section') {
        const content = sectionElement?.outerHTML || '';
        sectionData = {
          id: 'pocket-doors',
          title: 'Pocket Doors',
          content: content,
          isVisible: true,
          isRequired: false
        };
      } else if (sectionId === 'panel-doors-section') {
        const content = sectionElement?.outerHTML || '';
        sectionData = {
          id: 'panel-doors',
          title: 'Panel Doors',
          content: content,
          isVisible: true,
          isRequired: false
        };
      } else {
        return;
      }
    }

    event.preventDefault();
    event.stopPropagation();
    
    onSectionClick(sectionId, sectionData);
  }, [onSectionClick, sections]);

  // Handle section hover for visual feedback
  const handleSectionHover = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    let sectionElement = target.closest('[class*="-section"]');
    let sectionId: string | null = null;
    
    if (sectionElement) {
      const className = sectionElement.className;
      const sectionMatch = className.match(/(\w+)-section/);
      if (sectionMatch) {
        sectionId = sectionMatch[1];
      }
    } else {
      // Check for special clickable sections
      sectionElement = target.closest('.proposal-intro') || target.closest('.pocket-doors-section') || target.closest('.panel-doors-section');
      if (sectionElement) {
        if (sectionElement.classList.contains('proposal-intro')) {
          sectionId = 'proposal-intro';
        } else if (sectionElement.classList.contains('pocket-doors-section')) {
          sectionId = 'pocket-doors-section';
        } else if (sectionElement.classList.contains('panel-doors-section')) {
          sectionId = 'panel-doors-section';
        }
      }
    }
    
    if (sectionId) {
      const readOnlySections = ['wall-specifications-list', 'pricing', 'billing-job-container', 'job-info-section', 'billing-table'];
      
      if (!readOnlySections.includes(sectionId)) {
        setHoveredSectionId(sectionId);
        return;
      }
    }
    
    setHoveredSectionId(null);
  }, []);

  const handleSectionLeave = useCallback(() => {
    setHoveredSectionId(null);
  }, []);

  // Add custom styles for hover effects, click indicators, and page layout
  const customStyles = `
    <style>
      /* Page layout styles for live preview */
      .page {
        width: 100%;
        min-height: auto;
        margin: 0;
        padding: 0;
        background: transparent;
        box-shadow: none;
        page-break-after: auto;
      }
      
      .page-break {
        margin: 20px 0;
        border-top: 2px dashed #e2e8f0;
        position: relative;
      }
      
      .page-break::after {
        content: "Page Break";
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        background: #f8fafc;
        padding: 2px 8px;
        font-size: 10px;
        color: #64748b;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
      }
      
      .keep-together {
        outline: 1px dashed rgba(34, 197, 94, 0.3);
        outline-offset: 2px;
      }
      
      /* Section hover and click styles */
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table) {
        transition: all 0.2s ease;
        cursor: pointer;
        border-radius: 4px;
        position: relative;
      }
      
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table):hover {
        background-color: rgba(59, 130, 246, 0.05);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .quote-document [class*="-section"]:not(.wall-specifications-list):not(.pricing-section):not(.billing-job-container):not(.job-info-section):not(.billing-table):hover::after {
        content: "✏️ Click to edit";
        position: absolute;
        top: -25px;
        right: 0;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 10;
        pointer-events: none;
      }
      
      /* Make proposal intro, pocket doors, and panel doors sections hoverable */
      .quote-document .proposal-intro,
      .quote-document .pocket-doors-section,
      .quote-document .panel-doors-section {
        transition: all 0.2s ease;
        cursor: pointer;
        border-radius: 4px;
        position: relative;
      }
      
      .quote-document .proposal-intro:hover,
      .quote-document .pocket-doors-section:hover,
      .quote-document .panel-doors-section:hover {
        background-color: rgba(59, 130, 246, 0.05);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      
      .quote-document .proposal-intro:hover::after,
      .quote-document .pocket-doors-section:hover::after,
      .quote-document .panel-doors-section:hover::after {
        content: "✏️ Click to edit";
        position: absolute;
        top: -25px;
        right: 0;
        background: rgba(59, 130, 246, 0.9);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 10;
        pointer-events: none;
      }
      
      .quote-document .wall-specifications-list,
      .quote-document .pricing-section {
        cursor: not-allowed;
        opacity: 0.8;
      }
      
      .quote-document .wall-specifications-list:hover,
      .quote-document .pricing-section:hover {
        background-color: rgba(156, 163, 175, 0.1);
      }
      
      /* Google Docs-like styling */
      .quote-document {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.15;
        color: #000;
        background: transparent;
      }
      
      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 30px;
        padding-bottom: 20px;
      }
      
      .company-info { flex: 1; max-width: 40%; }
      .company-logo { display: flex; align-items: center; gap: 15px; }
      .logo-placeholder {
        width: 60px; height: 60px;
        background: linear-gradient(135deg, #3B82F6, #F59E0B);
        color: white; display: flex;
        align-items: center; justify-content: center;
        font-weight: bold; font-size: 16pt; border-radius: 8px;
      }
      
      .company-name { font-size: 14pt; font-weight: bold; color: #333; line-height: 1.2; }
      .contact-details { flex: 1; max-width: 55%; text-align: right; }
      .contact-row { margin-bottom: 2px; display: flex; justify-content: flex-end; align-items: center; line-height: 1.1; }
      .contact-row .label { font-weight: bold; margin-right: 8px; min-width: 80px; text-align: right; }
      .contact-row .value { text-align: left; flex: 1; }
      .website-link { color: #3B82F6; text-decoration: underline; }
      .billing-and-job-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; gap: 40px; }
      .billing-section { flex: 1; max-width: 45%; }
      .billed-to-details { margin-top: 10px; }
      .billed-line { margin-bottom: 2px; min-height: 20px; padding-bottom: 4px; }
      .underline { height: 1px; background-color: black; margin-bottom: 8px; width: 100%; }
      .job-info-section { flex: 1; max-width: 50%; }
      .job-row { display: flex; align-items: center; margin-bottom: 15px; position: relative; }
      .job-label { font-weight: bold; margin-right: 20px; min-width: 120px; }
      .job-value { flex: 1; padding-bottom: 2px; }
      .job-underline { position: absolute; bottom: 0; right: 0; left: 140px; height: 1px; background-color: black; }
      h2.section-header { font-weight: bold; font-size: 12pt; margin-top: 1.5em; margin-bottom: 0.5em; }
      .wall-specifications { line-height: 1.15; }
      .acceptance-section p { font-style: italic; font-size: 9pt; line-height: 1.2; }
      .pricing-section { margin-top: 20px; }
      .pricing-section table { width: 100%; border-collapse: collapse; }
      .pricing-section td { border: 1px solid #000; padding: 8px; }
      .terms-section { margin-top: 20px; }
      .terms-section ol { padding-left: 20px; list-style-type: none; }
      .terms-section li { margin-bottom: 4px; line-height: 1.1; display: list-item; }
      /* Ensure proper spacing in panels section */
      .panels-section p { 
        line-height: 1.15; 
        word-spacing: normal; 
        letter-spacing: normal; 
        white-space: normal;
      }
      .signature-section { margin-top: 30px; }
      .general-notes-section { margin-top: 20px; line-height: 1.0; }
      .general-notes-section p { margin: 0; line-height: 1.0; }
      .general-notes-section div { line-height: 1.0; }
      .general-notes-section br { line-height: 1.0; }
      /* Single spacing for general notes and terms content */
      .terms-section p { line-height: 1.1; margin-bottom: 4px; }
      .terms-section div { line-height: 1.1; }
      /* Ensure all list items are visible and properly spaced */
      .terms-section ol li { visibility: visible; overflow: visible; }
      .terms-section ol li div { margin-top: 2px; margin-bottom: 2px; }
      /* Fix Payment Terms nested divs display */
      .terms-section ol li div[style*="padding-left"] { 
        display: block !important; 
        visibility: visible !important; 
      }
      .terms-section ol li div[style*="padding-left"] div { 
        display: block !important; 
        visibility: visible !important; 
        margin-bottom: 2px !important;
        line-height: 1.1 !important;
      }
    </style>
  `;

  return (
    <div data-testid="live-preview-panel" className={`flex-1 overflow-auto ${className}`}>
      {/* Preview Controls */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Live Preview</span>
            {hoveredSectionId && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Hover: {hoveredSectionId.replace(/-/g, ' ')}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Click sections to edit • {sections.length} editable sections
            </span>
            
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
              <Button
                variant="ghost"
                size="sm"
                onClick={onZoomOut}
                className="h-7 w-7 p-0"
              >
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-xs font-medium min-w-[3rem] text-center">
                {zoomLevel}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onZoomIn}
                className="h-7 w-7 p-0"
              >
                <ZoomIn className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Canvas */}
      <div className="py-8 px-4 pb-20">
        <div className="max-w-none mx-auto">
          {pages.map((page, index) => (
            <div
              key={page.id}
              className="mx-auto mb-8 bg-white shadow-lg relative"
              style={{
                width: `${720 * zoomLevel / 100}px`,
                minHeight: `${932 * zoomLevel / 100}px`,
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'top center',
                marginBottom: `${32 * zoomLevel / 100}px`
              }}
            >
              {/* Page Content */}
              <div
                ref={index === 0 ? previewRef : undefined}
                className="quote-document p-8 pb-16"
                dangerouslySetInnerHTML={{ 
                  __html: page.content + customStyles
                }}
                style={{
                  fontSize: `${12 * zoomLevel / 100}pt`,
                  lineHeight: 1.15,
                  overflow: 'visible',
                  wordWrap: 'break-word',
                  width: '100%',
                  minHeight: '100%'
                }}
                onClick={handleSectionClick}
                onMouseMove={handleSectionHover}
                onMouseLeave={handleSectionLeave}
              />
              
              {/* Page Number */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                Page {page.pageNumber}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hidden measuring element */}
      <div ref={measureRef} className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none" />
    </div>
  );
};

export default LivePreviewPanel;