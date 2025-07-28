import React, { useEffect, useRef, useState } from 'react';
import { enhanceWithPageBreaks } from '@/utils/pageBreakManager';
import '@/styles/pages.css';

interface PageContainerProps {
  children: React.ReactNode;
  showMarginGuides?: boolean;
  className?: string;
}

interface Page {
  id: string;
  content: HTMLElement[];
}

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  showMarginGuides = false, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      processContentIntoPages();
    }
  }, [children]);

  const processContentIntoPages = () => {
    if (!containerRef.current || isProcessing) return;

    setIsProcessing(true);
    
    const container = containerRef.current;
    const tempDiv = container.querySelector('.temp-content') as HTMLDivElement;
    if (!tempDiv) {
      setIsProcessing(false);
      return;
    }

    // Clear existing pages
    const pageElements = container.querySelectorAll('.page');
    pageElements.forEach(page => page.remove());

    // Get the HTML content and process it with page breaks
    const htmlContent = tempDiv.innerHTML;
    
    if (!htmlContent.trim()) {
      setIsProcessing(false);
      return;
    }

    // Use the enhanced page break manager to create proper page structure
    try {
      const pagedHTML = enhanceWithPageBreaks(htmlContent);
      
      // Create a temporary container to parse the paged HTML
      const tempPageContainer = document.createElement('div');
      tempPageContainer.innerHTML = pagedHTML;
      
      // Check if the content already has page structure
      const existingPages = tempPageContainer.querySelectorAll('.page');
      
      if (existingPages.length > 0) {
        // Content already has page structure, use it directly
        existingPages.forEach((page, index) => {
          const pageElement = page.cloneNode(true) as HTMLElement;
          pageElement.classList.add(showMarginGuides ? 'show-guides' : '');
          container.appendChild(pageElement);
        });
      } else {
        // Fall back to simple single page layout
        createSinglePage(tempPageContainer.innerHTML);
      }
    } catch (error) {
      console.error('Error processing pages:', error);
      // Fallback to simple layout
      createSinglePage(htmlContent);
    }
    
    setIsProcessing(false);
  };

  const createSinglePage = (content: string) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const pageElement = document.createElement('div');
    pageElement.className = `page ${showMarginGuides ? 'show-guides' : ''}`;
    pageElement.setAttribute('data-page', '1');
    
    const pageContent = document.createElement('div');
    pageContent.className = 'page-content';
    pageContent.innerHTML = content;
    
    pageElement.appendChild(pageContent);
    
    if (showMarginGuides) {
      const guides = document.createElement('div');
      guides.className = 'margin-guides';
      pageElement.appendChild(guides);
    }
    
    container.appendChild(pageElement);
  };

  const getElementHeight = (element: HTMLElement): number => {
    // Create a temporary clone to measure height
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.width = '612px'; // 8.5 inches at 72 DPI
    clone.style.visibility = 'hidden';
    
    document.body.appendChild(clone);
    const height = clone.offsetHeight;
    document.body.removeChild(clone);
    
    return height;
  };

  const renderPages = (pageList: Page[]) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    
    pageList.forEach((page, index) => {
      const pageElement = document.createElement('div');
      pageElement.className = `page ${showMarginGuides ? 'show-guides' : ''}`;
      pageElement.setAttribute('data-page', (index + 1).toString());
      
      const pageContent = document.createElement('div');
      pageContent.className = 'page-content';
      
      page.content.forEach(element => {
        pageContent.appendChild(element);
      });
      
      pageElement.appendChild(pageContent);
      
      if (showMarginGuides) {
        const guides = document.createElement('div');
        guides.className = 'margin-guides';
        pageElement.appendChild(guides);
      }
      
      container.appendChild(pageElement);
    });
  };

  return (
    <div ref={containerRef} className={`page-container ${className}`}>
      <div className="temp-content" style={{ display: 'none' }}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;