import React, { useRef, useEffect } from 'react';

interface DocumentPage {
  id: string;
  content: string;
  pageNumber: number;
}

interface DocumentCanvasProps {
  pages: DocumentPage[];
  zoomLevel: number;
  previewHTML: string;
  onSectionClick?: (sectionId: string) => void;
  selectedSectionId?: string | null;
  className?: string;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  pages,
  zoomLevel,
  previewHTML,
  onSectionClick,
  selectedSectionId,
  className = ''
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Handle section clicking
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onSectionClick) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const section = target.closest('[data-section-id]');
      if (section) {
        const sectionId = section.getAttribute('data-section-id');
        if (sectionId) {
          onSectionClick(sectionId);
        }
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [onSectionClick]);

  // Apply selection highlighting
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Remove previous highlights
    const prevHighlighted = canvas.querySelectorAll('.section-highlighted');
    prevHighlighted.forEach(el => el.classList.remove('section-highlighted'));

    // Add highlight to selected section
    if (selectedSectionId) {
      const section = canvas.querySelector(`[data-section-id="${selectedSectionId}"]`);
      if (section) {
        section.classList.add('section-highlighted');
      }
    }
  }, [selectedSectionId]);

  const scaleStyle = {
    transform: `scale(${zoomLevel / 100})`,
    transformOrigin: 'top left',
    width: `${(100 / zoomLevel) * 100}%`,
  };

  return (
    <div className={`flex-1 overflow-auto bg-gray-100 ${className}`}>
      <div className="flex justify-center py-8">
        <div 
          ref={canvasRef}
          className="bg-white shadow-lg"
          style={scaleStyle}
        >
          {pages.length > 0 ? (
            // Multi-page layout
            <div className="space-y-6">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="page bg-white shadow-sm border border-gray-200 relative"
                  style={{
                    width: '640px',
                    minHeight: '800px',
                    padding: '40px',
                    pageBreakAfter: 'always'
                  }}
                >
                  <div 
                    dangerouslySetInnerHTML={{ __html: page.content }}
                    className="document-content"
                  />
                  {/* Page number */}
                  <div className="absolute bottom-2 right-4 text-xs text-gray-400">
                    Page {page.pageNumber}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single document layout (fallback)
            <div
              className="document-page bg-white"
              style={{
                width: '640px',
                minHeight: '800px',
                padding: '40px',
                fontFamily: '"Times New Roman", Times, serif',
                fontSize: '12pt',
                lineHeight: '1.15',
                color: '#000'
              }}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: previewHTML }}
                className="document-content"
              />
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        .section-highlighted {
          background-color: rgba(59, 130, 246, 0.1) !important;
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        [data-section-id]:hover {
          background-color: rgba(59, 130, 246, 0.05);
          cursor: pointer;
        }
        
        .document-content {
          /* Preserve the original document styling */
        }
        
        .document-content .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
        }
        
        .document-content .company-info { 
          flex: 1; 
          max-width: 40%; 
        }
        
        .document-content .company-logo { 
          display: flex; 
          align-items: center; 
          gap: 15px; 
        }
        
        .document-content .logo-placeholder {
          width: 60px; 
          height: 60px;
          background: linear-gradient(135deg, #3B82F6, #F59E0B);
          color: white; 
          display: flex;
          align-items: center; 
          justify-content: center;
          font-weight: bold; 
          font-size: 16pt; 
          border-radius: 8px;
        }
        
        .document-content .company-name { 
          font-size: 14pt; 
          font-weight: bold; 
          color: #333; 
          line-height: 1.2; 
        }
        
        .document-content .contact-details { 
          flex: 1; 
          max-width: 55%; 
          text-align: right; 
        }
        
        .document-content .contact-row { 
          margin-bottom: 2px; 
          display: flex; 
          justify-content: flex-end; 
          align-items: center; 
          line-height: 1.1; 
        }
        
        .document-content .contact-row .label { 
          font-weight: bold; 
          margin-right: 8px; 
          min-width: 80px; 
          text-align: right; 
        }
        
        .document-content .contact-row .value { 
          text-align: left; 
          flex: 1; 
        }
        
        .document-content .website-link { 
          color: #3B82F6; 
          text-decoration: underline; 
        }
        
        .document-content h2.section-header { 
          font-weight: bold; 
          font-size: 12pt; 
          margin-top: 1.5em; 
          margin-bottom: 0.5em; 
        }
        
        .document-content .wall-specifications { 
          line-height: 1.15; 
        }
        
        .document-content .acceptance-section p { 
          font-style: italic; 
          font-size: 9pt; 
          line-height: 1.2; 
        }
        
        .document-content .pricing-section { 
          margin-top: 20px; 
        }
        
        .document-content .pricing-section table { 
          width: 100%; 
          border-collapse: collapse; 
        }
        
        .document-content .pricing-section td { 
          border: 1px solid #000; 
          padding: 8px; 
        }
        
        .document-content .terms-section { 
          margin-top: 20px; 
        }
        
        .document-content .terms-section ol { 
          padding-left: 20px; 
        }
        
        .document-content .terms-section li { 
          margin-bottom: 8px; 
          line-height: 1.3; 
        }
        
        .document-content .signature-section { 
          margin-top: 30px; 
        }
      `}</style>
    </div>
  );
};