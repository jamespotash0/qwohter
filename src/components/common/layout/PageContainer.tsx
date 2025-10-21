import React, { useEffect, useRef } from 'react';
import '@/styles/pages.css';
import { sanitizeHTML } from '@/utils/security';

interface PageContainerProps {
  children: React.ReactNode;
  showMarginGuides?: boolean;
  className?: string;
}

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
    
    if (showMarginGuides) {
      const guides = document.createElement('div');
      guides.className = 'margin-guides-overlay';
      contentContainer.appendChild(guides);
    }
    
    container.appendChild(contentContainer);
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