import { DocumentPage } from './types';

export class PageCalculator {
  /**
   * Calculate pages for Smart PDF preview mode
   */
  static async calculateSmartPDFPages(previewHTML: string): Promise<DocumentPage[]> {
    console.log('🚀 Smart PDF Preview Mode ACTIVATED');
    try {
      // Use EXACT same logic as Smart PDF download - work with raw HTML, not PageBreakManager processed
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = previewHTML; // Use raw preview HTML directly
      
      const newPages: DocumentPage[] = [];
      
      // Apply the EXACT same splitting logic as Smart PDF download
      console.log('📄 Smart PDF Preview: Applying custom split at Support Structure');
      
      const content = tempDiv.innerHTML;
      const supportSectionIndex = content.indexOf('SUPPORT STRUCTURE (HEADER)');
      
      if (supportSectionIndex > 0) {
        // Find the COMPLETE Support Structure section including its content
        const supportSectionStart = content.lastIndexOf('<div', supportSectionIndex);
        
        // Look for the END of the Support Structure section to include it on page 1
        let supportSectionEnd = supportSectionIndex;
        
        // Find the closing div for Support Structure section
        let openDivs = 1;
        let pos = content.indexOf('>', supportSectionStart) + 1;
        
        while (pos < content.length && openDivs > 0) {
          const nextOpenDiv = content.indexOf('<div', pos);
          const nextCloseDiv = content.indexOf('</div>', pos);
          
          if (nextCloseDiv !== -1 && (nextOpenDiv === -1 || nextCloseDiv < nextOpenDiv)) {
            openDivs--;
            pos = nextCloseDiv + 6;
            if (openDivs === 0) {
              supportSectionEnd = pos;
              break;
            }
          } else if (nextOpenDiv !== -1) {
            openDivs++;
            pos = nextOpenDiv + 4;
          } else {
            break;
          }
        }
        
        // Now find the next section after Support Structure for clean page 2 start
        const nextSectionStart = content.indexOf('<div class=', supportSectionEnd);
        const splitPoint = nextSectionStart > 0 ? nextSectionStart : supportSectionEnd;
        
        const page1HTML = content.substring(0, splitPoint);
        const page2HTML = content.substring(splitPoint);
        
        // Debug: Count approximate lines in each page
        const page1Lines = (page1HTML.match(/<br>|<\/p>|<\/div>|<\/li>/g) || []).length;
        const page2Lines = (page2HTML.match(/<br>|<\/p>|<\/div>|<\/li>/g) || []).length;
        
        console.log('📊 Smart PDF Content Analysis:');
        console.log(`📄 Page 1: ~${page1Lines} line breaks, ${page1HTML.length} chars`);
        console.log(`📄 Page 2: ~${page2Lines} line breaks, ${page2HTML.length} chars`);
        console.log(`🎯 Split point: Support Structure INCLUDED on Page 1, next section starts Page 2`);
        
        // Check what sections are on each page
        const sectionsOnPage1 = (page1HTML.match(/class="[^"]*-section"/g) || []).map(s => s.match(/class="([^"]*)"/)?.[1]).filter(Boolean);
        const sectionsOnPage2 = (page2HTML.match(/class="[^"]*-section"/g) || []).map(s => s.match(/class="([^"]*)"/)?.[1]).filter(Boolean);
        
        console.log('📋 Page 1 sections:', sectionsOnPage1);
        console.log('📋 Page 2 sections:', sectionsOnPage2);
        
        newPages.push({
          id: 'smart-page-0',
          content: page1HTML,
          pageNumber: 1
        });
        
        newPages.push({
          id: 'smart-page-1', 
          content: page2HTML,
          pageNumber: 2
        });
        
        console.log('📄 Smart PDF Split at Support Structure - Page 1:', page1HTML.length, 'chars, Page 2:', page2HTML.length, 'chars');
      } else {
        // Fallback: split roughly in half
        const midPoint = Math.floor(content.length / 2);
        newPages.push({
          id: 'smart-page-0',
          content: content.substring(0, midPoint),
          pageNumber: 1
        });
        newPages.push({
          id: 'smart-page-1',
          content: content.substring(midPoint),
          pageNumber: 2
        });
        console.log('📄 Smart PDF Fallback split at midpoint');
      }

      return newPages;
    } catch (error) {
      console.error('Error calculating Smart PDF pages:', error);
      // Fallback to single page
      return [{
        id: 'smart-page-0',
        content: previewHTML,
        pageNumber: 1
      }];
    }
  }

  /**
   * Calculate pages for normal preview mode using page break manager
   */
  static async calculateNormalPages(previewHTML: string): Promise<DocumentPage[]> {
    console.log('📄 Normal Preview Mode ACTIVATED');
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

      return newPages;
    } catch (error) {
      console.error('Error calculating pages:', error);
      // Fallback to single page with original content
      return [{
        id: 'page-0',
        content: previewHTML,
        pageNumber: 1
      }];
    }
  }
}