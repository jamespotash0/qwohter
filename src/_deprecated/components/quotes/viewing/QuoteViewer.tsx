import React, { useEffect, useState } from 'react';
import { PageContainer } from '@/components/common/layout/PageContainer';
import { generateQuoteText } from '@/_deprecated/components/quotes/generation/QuoteTextGenerator';
import { DynamicPageBreakManager } from '@/utils/dynamicPageBreakManager';
import '@/styles/pages.css';

interface QuoteViewerProps {
  quote: any;
  showMarginGuides?: boolean;
  className?: string;
}

export const QuoteViewer: React.FC<QuoteViewerProps> = ({ 
  quote, 
  showMarginGuides = false, 
  className = '' 
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (quote) {
      generatePagedContent();
    }
  }, [quote]);

  const generatePagedContent = async () => {
    try {
      setIsLoading(true);
      
      // Generate the quote HTML using the appropriate template
      const rawQuoteText = generateQuoteText(quote);
      
      // Process with dynamic page breaks based on content
      const pageBreakManager = new DynamicPageBreakManager();
      const pagedContent = pageBreakManager.processHTMLWithDynamicBreaks(rawQuoteText, quote);
      
      setHtmlContent(pagedContent);
    } catch (error) {
      console.error('Error generating paged content:', error);
      setHtmlContent('<div>Error generating quote content</div>');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-container">
        <div className="page">
          <div className="page-content">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Generating quote preview...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`quote-viewer ${className}`}>
      <PageContainer showMarginGuides={showMarginGuides}>
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </PageContainer>
    </div>
  );
};

export default QuoteViewer;