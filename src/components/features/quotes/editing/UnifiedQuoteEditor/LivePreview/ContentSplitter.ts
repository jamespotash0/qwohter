/**
 * Content-aware pagination with proper content splitting
 */

interface PageConfig {
  pageWidth: number; // 816px (8.5in at 96 DPI)
  pageHeight: number; // 1056px (11in at 96 DPI)
  topMargin: number; // 24px (0.25in)
  bottomMargin: number; // 24px (0.25in)
  leftMargin: number; // 38.4px (0.4in)
  rightMargin: number; // 38.4px (0.4in)
  contentHeight: number; // Available content height
}

interface SectionInfo {
  element: HTMLElement;
  height: number;
  className: string;
  html: string;
  canBreak: boolean;
}

interface Page {
  id: string;
  content: string;
  pageNumber: number;
  sections: string[];
}

export class ContentSplitter {
  private static readonly PAGE_CONFIG: PageConfig = {
    pageWidth: 816,
    pageHeight: 1056,
    topMargin: 72, // 0.75in at 96 DPI
    bottomMargin: 72, // 0.75in at 96 DPI
    leftMargin: 72, // 0.75in at 96 DPI
    rightMargin: 72, // 0.75in at 96 DPI
    contentHeight: 1056 - 144 // pageHeight - top/bottom margins (72 + 72)
  };

  private static readonly SECTION_SELECTORS = [
    '.header-section',
    '.billing-job-container', 
    '.wall-specifications-list',
    '.panels-section',
    '.pass-doors-section',
    '.pocket-doors-section',
    '.track-section',
    '.support-section',
    '.general-section',
    '.pricing-section',
    '.statement-section',
    '.terms-section',
    '.signature-acceptance-section'
  ];

  private static readonly UNBREAKABLE_SECTIONS = [
    'header-section',
    'billing-job-container',
    'wall-specifications-list',
    'pricing-section',
    'signature-acceptance-section'
  ];

  static splitContent(htmlContent: string): Page[] {
    console.log('🔄 ContentSplitter: Starting content analysis...');

    // Create measurement container
    const measureContainer = document.createElement('div');
    measureContainer.style.cssText = `
      position: absolute;
      left: -9999px;
      width: ${this.PAGE_CONFIG.pageWidth}px;
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.15;
      padding: ${this.PAGE_CONFIG.topMargin}px ${this.PAGE_CONFIG.rightMargin}px ${this.PAGE_CONFIG.bottomMargin}px ${this.PAGE_CONFIG.leftMargin}px;
      box-sizing: border-box;
      background: white;
      color: #000;
    `;

    measureContainer.innerHTML = htmlContent;
    document.body.appendChild(measureContainer);

    try {
      const sections = this.analyzeSections(measureContainer);
      const pages = this.distributeSections(sections);
      
      console.log(`📄 ContentSplitter: Created ${pages.length} pages`);
      return pages;

    } finally {
      document.body.removeChild(measureContainer);
    }
  }

  private static analyzeSections(container: HTMLElement): SectionInfo[] {
    const sections: SectionInfo[] = [];
    
    this.SECTION_SELECTORS.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      
      elements.forEach(element => {
        const htmlElement = element as HTMLElement;
        const className = htmlElement.className;
        const canBreak = !this.UNBREAKABLE_SECTIONS.some(unbreakable => 
          className.includes(unbreakable)
        );

        sections.push({
          element: htmlElement,
          height: htmlElement.offsetHeight + 20, // Add spacing
          className: className,
          html: htmlElement.outerHTML,
          canBreak: canBreak
        });

        console.log(`📏 Section: ${className} = ${htmlElement.offsetHeight}px (breakable: ${canBreak})`);
      });
    });

    return sections;
  }

  private static distributeSections(sections: SectionInfo[]): Page[] {
    const pages: Page[] = [];
    let currentPageContent = '';
    let currentPageHeight = 0;
    let currentPageSections: string[] = [];
    let pageNumber = 1;

    sections.forEach((section, index) => {
      // Check if section fits on current page
      if (currentPageHeight + section.height <= this.PAGE_CONFIG.contentHeight || currentPageContent === '') {
        // Section fits, add to current page
        currentPageContent += section.html;
        currentPageHeight += section.height;
        currentPageSections.push(section.className);
        
        console.log(`✅ Added ${section.className} to page ${pageNumber} (height: ${currentPageHeight}px)`);
      } else {
        // Section doesn't fit, start new page
        if (currentPageContent.trim()) {
          pages.push({
            id: `page-${pageNumber}`,
            content: currentPageContent,
            pageNumber: pageNumber,
            sections: [...currentPageSections]
          });
          
          console.log(`📄 Completed page ${pageNumber} with sections: ${currentPageSections.join(', ')}`);
        }

        // Start new page with this section
        pageNumber++;
        currentPageContent = section.html;
        currentPageHeight = section.height;
        currentPageSections = [section.className];
        
        console.log(`🆕 Started page ${pageNumber} with ${section.className}`);
      }
    });

    // Add final page if it has content
    if (currentPageContent.trim()) {
      pages.push({
        id: `page-${pageNumber}`,
        content: currentPageContent,
        pageNumber: pageNumber,
        sections: currentPageSections
      });
      
      console.log(`📄 Final page ${pageNumber} with sections: ${currentPageSections.join(', ')}`);
    }

    // Ensure at least one page
    if (pages.length === 0) {
      pages.push({
        id: 'page-1',
        content: sections.map(s => s.html).join(''),
        pageNumber: 1,
        sections: sections.map(s => s.className)
      });
    }

    return pages;
  }

  static getPageConfig(): PageConfig {
    return { ...this.PAGE_CONFIG };
  }
}