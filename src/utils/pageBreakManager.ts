/**
 * Enhanced page break management system for visual page layout
 * Builds upon existing smartPageBreak functionality
 */

import { sanitizeHTML } from './security';

interface PageBreakConfig {
  pageHeight: number; // Page height in pixels
  pageWidth: number; // Page width in pixels  
  marginTop: number; // Top margin in pixels
  marginBottom: number; // Bottom margin in pixels
  marginLeft: number; // Left margin in pixels
  marginRight: number; // Right margin in pixels
}

interface ContentSection {
  element: HTMLElement;
  height: number;
  canBreak: boolean; // Whether this section can be split across pages
  minKeepTogether: number; // Minimum height to keep together
}

const DEFAULT_CONFIG: PageBreakConfig = {
  pageHeight: 1056, // 11 inches at 96 DPI
  pageWidth: 816, // 8.5 inches at 96 DPI
  marginTop: 72, // 0.75 inches
  marginBottom: 72,
  marginLeft: 72,
  marginRight: 72
};

export class PageBreakManager {
  private config: PageBreakConfig;
  private contentHeight: number;

  constructor(config: Partial<PageBreakConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contentHeight = this.config.pageHeight - this.config.marginTop - this.config.marginBottom;
  }

  /**
   * Analyzes HTML content and determines optimal page break points
   */
  analyzeContent(htmlContent: string): ContentSection[] {
    const tempDiv = this.createTempContainer(htmlContent);
    const sections: ContentSection[] = [];

    try {
      const elements = Array.from(tempDiv.children) as HTMLElement[];
      
      elements.forEach(element => {
        const section = this.analyzeElement(element);
        if (section) {
          sections.push(section);
        }
      });

      return sections;
    } finally {
      document.body.removeChild(tempDiv);
    }
  }

  /**
   * Distributes content across pages with intelligent break points
   */
  distributeContentAcrossPages(sections: ContentSection[]): HTMLElement[][] {
    const pages: HTMLElement[][] = [];
    let currentPage: HTMLElement[] = [];
    let currentPageHeight = 0;

    sections.forEach(section => {
      // Check if section fits on current page
      if (currentPageHeight + section.height <= this.contentHeight) {
        currentPage.push(section.element);
        currentPageHeight += section.height;
      } else {
        // Section doesn't fit, need to decide whether to break or start new page
        if (section.canBreak && section.height > this.contentHeight) {
          // Large section that spans multiple pages
          const fragments = this.fragmentLargeSection(section, this.contentHeight - currentPageHeight);
          
          // Add first fragment to current page if there's space
          if (fragments.length > 0 && currentPageHeight < this.contentHeight * 0.7) {
            currentPage.push(fragments[0]);
          }
          
          // Start new page
          if (currentPage.length > 0) {
            pages.push([...currentPage]);
            currentPage = [];
            currentPageHeight = 0;
          }
          
          // Add remaining fragments to new pages
          const remainingFragments = currentPageHeight === 0 ? fragments : fragments.slice(1);
          remainingFragments.forEach(fragment => {
            const fragmentHeight = this.measureElementHeight(fragment);
            if (currentPageHeight + fragmentHeight > this.contentHeight) {
              if (currentPage.length > 0) {
                pages.push([...currentPage]);
                currentPage = [];
                currentPageHeight = 0;
              }
            }
            currentPage.push(fragment);
            currentPageHeight += fragmentHeight;
          });
        } else {
          // Start new page for section that can't be broken
          if (currentPage.length > 0) {
            pages.push([...currentPage]);
            currentPage = [];
            currentPageHeight = 0;
          }
          
          currentPage.push(section.element);
          currentPageHeight = section.height;
        }
      }
    });

    // Add final page
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  /**
   * Generates HTML with proper page structure
   */
  generatePagedHTML(content: HTMLElement[][]): string {
    return content.map((pageContent, index) => {
      const pageHTML = pageContent.map(el => el.outerHTML).join('\n');
      return `
        <div class="page" data-page="${index + 1}">
          <div class="page-content">
            ${pageHTML}
          </div>
        </div>
      `;
    }).join('\n');
  }

  /**
   * Main entry point - converts HTML string to paged layout
   */
  processHTMLContent(htmlContent: string): string {
    const sections = this.analyzeContent(htmlContent);
    const pages = this.distributeContentAcrossPages(sections);
    return this.generatePagedHTML(pages);
  }

  private createTempContainer(htmlContent: string): HTMLElement {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = `${this.config.pageWidth - this.config.marginLeft - this.config.marginRight}px`;
    tempDiv.style.visibility = 'hidden';
    sanitizeHTML.setInnerHTML(tempDiv, sanitizeHTML.cleanForPDF(htmlContent));
    document.body.appendChild(tempDiv);
    return tempDiv;
  }

  private analyzeElement(element: HTMLElement): ContentSection | null {
    const height = this.measureElementHeight(element);
    
    // Determine if element can be broken
    const canBreak = this.canElementBreak(element);
    const minKeepTogether = this.getMinKeepTogether(element);

    return {
      element: element.cloneNode(true) as HTMLElement,
      height,
      canBreak,
      minKeepTogether
    };
  }

  private measureElementHeight(element: HTMLElement): number {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.width = `${this.config.pageWidth - this.config.marginLeft - this.config.marginRight}px`;
    clone.style.visibility = 'hidden';
    
    document.body.appendChild(clone);
    const height = clone.offsetHeight;
    document.body.removeChild(clone);
    
    return height;
  }

  private canElementBreak(element: HTMLElement): boolean {
    // Elements that should not be broken across pages
    const nonBreakableSelectors = [
      '.header-section',
      '.billing-job-container', 
      '.pricing-section table',
      '.signature-section',
      'table',
      'img'
    ];

    // Special handling for panels section - allow individual list items to break
    if (element.matches('.panels-section')) {
      return true; // Allow the panels section to break between wall descriptions
    }

    // Special handling for terms section - allow numbered items to break, but keep #10 with bullets
    if (element.matches('.terms-section')) {
      return true; // Allow the terms section to break between numbered items
    }

    return !nonBreakableSelectors.some(selector => 
      element.matches(selector) || element.querySelector(selector)
    );
  }

  private getMinKeepTogether(element: HTMLElement): number {
    // Minimum height to keep together for different element types
    if (element.matches('.header-section')) return 200;
    if (element.matches('table')) return 100;
    if (element.matches('.section-header')) return 50;
    
    // Special handling for terms section item #10 with nested bullets
    if (element.matches('li') && element.textContent?.includes('Payment Terms:')) {
      return 150; // Keep item #10 and its bullet points together
    }
    
    // Individual panel descriptions can be kept together but allow breaking between them
    if (element.matches('.panels-section li')) {
      return 80; // Keep individual wall descriptions together
    }
    
    return 30;
  }

  private fragmentLargeSection(section: ContentSection, availableHeight: number): HTMLElement[] {
    const element = section.element;
    
    // Handle panels section - break between individual wall descriptions (li elements)
    if (element.matches('.panels-section')) {
      return this.fragmentPanelsSection(element);
    }
    
    // Handle terms section - break between numbered items but keep #10 with bullets together
    if (element.matches('.terms-section')) {
      return this.fragmentTermsSection(element);
    }
    
    // For other elements, return the original element
    return [section.element];
  }

  private fragmentPanelsSection(element: HTMLElement): HTMLElement[] {
    const fragments: HTMLElement[] = [];
    const listItems = element.querySelectorAll('li');
    
    if (listItems.length <= 1) {
      return [element]; // No need to fragment if only one wall
    }
    
    // Create fragments with individual wall descriptions
    listItems.forEach((li, index) => {
      const fragment = document.createElement('div');
      fragment.className = 'panels-section page-fragment';
      fragment.style.cssText = element.style.cssText;
      
      // Add header only to first fragment
      if (index === 0) {
        const header = element.querySelector('h2.section-header');
        if (header) {
          fragment.appendChild(header.cloneNode(true));
        }
      }
      
      // Create ul with single li
      const ul = document.createElement('ul');
      ul.style.cssText = element.querySelector('ul')?.style.cssText || 'margin-left: 0px; padding-left: 0;';
      ul.appendChild(li.cloneNode(true));
      fragment.appendChild(ul);
      
      fragments.push(fragment);
    });
    
    return fragments;
  }

  private fragmentTermsSection(element: HTMLElement): HTMLElement[] {
    const fragments: HTMLElement[] = [];
    const listItems = element.querySelectorAll('ol > li');
    
    if (listItems.length <= 3) {
      return [element]; // No need to fragment if only a few terms
    }
    
    let currentFragment = this.createTermsFragment(element, true); // Include header
    let currentFragmentItems = 0;
    const maxItemsPerPage = 6;
    
    listItems.forEach((li, index) => {
      const itemNumber = index + 1;
      
      // Special handling for item #10 - keep it with its bullets together
      if (itemNumber === 10) {
        // If current fragment is almost full, start a new one for item #10
        if (currentFragmentItems >= 4) {
          fragments.push(currentFragment);
          currentFragment = this.createTermsFragment(element, false);
          currentFragmentItems = 0;
        }
      } else if (currentFragmentItems >= maxItemsPerPage) {
        // Start new fragment for regular items
        fragments.push(currentFragment);
        currentFragment = this.createTermsFragment(element, false);
        currentFragmentItems = 0;
      }
      
      const ol = currentFragment.querySelector('ol');
      if (ol) {
        ol.appendChild(li.cloneNode(true));
        currentFragmentItems++;
      }
    });
    
    // Add final fragment if it has content
    if (currentFragmentItems > 0) {
      fragments.push(currentFragment);
    }
    
    return fragments.length > 0 ? fragments : [element];
  }

  private createTermsFragment(originalElement: HTMLElement, includeHeader: boolean): HTMLElement {
    const fragment = document.createElement('div');
    fragment.className = 'terms-section page-fragment';
    fragment.style.cssText = originalElement.style.cssText;
    
    if (includeHeader) {
      const header = originalElement.querySelector('h2.section-header');
      if (header) {
        fragment.appendChild(header.cloneNode(true));
      }
    }
    
    const ol = document.createElement('ol');
    ol.style.cssText = originalElement.querySelector('ol')?.style.cssText || '';
    fragment.appendChild(ol);
    
    return fragment;
  }
}

/**
 * Enhanced version of existing smart page break function
 * that works with the new page system
 */
export const enhanceWithPageBreaks = (htmlContent: string): string => {
  const manager = new PageBreakManager();
  return manager.processHTMLContent(htmlContent);
};

/**
 * Legacy compatibility function
 */
export const calculateSmartPageBreak = (
  htmlContent: string,
  options: any = {}
): string => {
  const manager = new PageBreakManager(options);
  const sections = manager.analyzeContent(htmlContent);
  const pages = manager.distributeContentAcrossPages(sections);
  
  // Return enhanced HTML with better page breaks
  if (pages.length <= 1) {
    return htmlContent; // No page breaks needed
  }
  
  // Insert page break markers where new pages should start
  let result = htmlContent;
  const pageBreakMarker = '<div class="page-break" style="height: 200px; page-break-before: always;"></div>';
  
  // This is a simplified approach - in practice you'd need more sophisticated content analysis
  return result.replace(
    /<div style="height: 120px;"><\/div>/g,
    pageBreakMarker
  );
};
