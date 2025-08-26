import React, { useEffect, useRef } from 'react';
import '@/styles/pages.css';
import { sanitizeHTML } from '@/utils/security';

interface PageContainerProps {
  children: React.ReactNode;
  showMarginGuides?: boolean;
  className?: string;
}

// interface Page {
//   id: string;
//   content: HTMLElement[];
// }

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  showMarginGuides = false, 
  className = '' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      processContent();
    }
  }, [children]);

  const processContent = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const tempDiv = container.querySelector('.temp-content') as HTMLDivElement;
    if (!tempDiv) return;

    // Clear existing content
    const existingContent = container.querySelectorAll('.css-paginated-content');
    existingContent.forEach(el => el.remove());

    // Get the HTML content
    const htmlContent = tempDiv.innerHTML;
    
    if (!htmlContent.trim()) return;

    // Create CSS-paginated content container
    const contentContainer = document.createElement('div');
    contentContainer.className = `css-paginated-content ${showMarginGuides ? 'show-guides' : ''}`;
    
    // Apply CSS pagination styling and insert content
    sanitizeHTML.setInnerHTML(contentContainer, sanitizeHTML.clean(htmlContent));
    
    // Add margin guides overlay if requested
    if (showMarginGuides) {
      const guides = document.createElement('div');
      guides.className = 'margin-guides-overlay';
      contentContainer.appendChild(guides);
    }
    
    container.appendChild(contentContainer);
    console.log('📄 CSS-based pagination applied - content will break naturally using CSS rules');
  };

  // const getElementHeight = (element: HTMLElement): number => {
  //   // Create a temporary clone to measure height
  //   const clone = element.cloneNode(true) as HTMLElement;
  //   clone.style.position = 'absolute';
  //   clone.style.left = '-9999px';
  //   clone.style.width = '612px'; // 8.5 inches at 72 DPI
  //   clone.style.visibility = 'hidden';
    
  //   document.body.appendChild(clone);
  //   const height = clone.offsetHeight;
  //   document.body.removeChild(clone);
    
  //   return height;
  // };

  // const renderPages = (pageList: Page[]) => {
  //   if (!containerRef.current) return;

  //   const container = containerRef.current;
    
  //   pageList.forEach((page, index) => {
  //     const pageElement = document.createElement('div');
  //     pageElement.className = `page ${showMarginGuides ? 'show-guides' : ''}`;
  //     pageElement.setAttribute('data-page', (index + 1).toString());
      
  //     const pageContent = document.createElement('div');
  //     pageContent.className = 'page-content';
      
  //     page.content.forEach(element => {
  //       pageContent.appendChild(element);
  //     });
      
  //     pageElement.appendChild(pageContent);
      
  //     if (showMarginGuides) {
  //       const guides = document.createElement('div');
  //       guides.className = 'margin-guides';
  //       pageElement.appendChild(guides);
  //     }
      
  //     container.appendChild(pageElement);
  //   });
  // };

  return (
    <div ref={containerRef} className={`page-container ${className}`}>
      <div className="temp-content" style={{ display: 'none' }}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;