import { useState, useEffect, useRef } from 'react';

export interface DocumentPage {
  id: string;
  content: string;
  pageNumber: number;
}

interface UseDocumentPagesProps {
  previewHTML: string;
  zoomLevel: number;
}

export const useDocumentPages = ({ previewHTML, zoomLevel }: UseDocumentPagesProps) => {
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  const calculatePages = async () => {
    if (!previewHTML) {
      setPages([]);
      return;
    }

    try {
      // Create a temporary element to measure content height
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = previewHTML;
      tempDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: 640px;
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.15;
        padding: 40px;
        margin: 0;
        left: -9999px;
        top: -9999px;
      `;
      
      document.body.appendChild(tempDiv);

      const contentHeight = tempDiv.scrollHeight;
      const pageHeight = 800; // Page content area height
      const totalPages = Math.ceil(contentHeight / pageHeight);

      // Clean up temp element
      document.body.removeChild(tempDiv);

      if (totalPages <= 1) {
        // Single page - use original content
        setPages([{
          id: 'page-1',
          content: previewHTML,
          pageNumber: 1
        }]);
      } else {
        // Multi-page - need to split content
        const newPages: DocumentPage[] = [];
        
        // For now, create pages with the full content
        // In a more sophisticated implementation, we would split content at appropriate break points
        for (let i = 0; i < totalPages; i++) {
          newPages.push({
            id: `page-${i + 1}`,
            content: i === 0 ? previewHTML : '', // Only show content on first page for now
            pageNumber: i + 1
          });
        }
        
        setPages(newPages);
      }
    } catch (error) {
      console.error('Error calculating pages:', error);
      // Fallback to single page
      setPages([{
        id: 'page-1',
        content: previewHTML,
        pageNumber: 1
      }]);
    }
  };

  // Recalculate pages when content or zoom changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculatePages();
    }, 300); // Debounce calculations

    return () => clearTimeout(timeoutId);
  }, [previewHTML, zoomLevel]);

  return {
    pages,
    totalPages: pages.length,
    measureRef
  };
};