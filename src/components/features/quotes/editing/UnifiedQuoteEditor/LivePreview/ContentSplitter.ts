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
  canSplitParagraphs?: boolean;
  paragraphs?: ParagraphInfo[];
}

interface ParagraphInfo {
  element: HTMLElement;
  height: number;
  html: string;
  isTitle?: boolean;
}

interface SectionSplitResult {
  beforePageBreak: string | null;
  afterPageBreak: string | null;
  beforePageBreakHeight: number;
  afterPageBreakHeight: number;
  beforeParagraphCount: number;
  afterParagraphCount: number;
}

interface Page {
  id: string;
  content: string;
  pageNumber: number;
  sections: string[];
}

interface ContentItem {
  type: 'section' | 'section-header' | 'paragraph';
  html: string;
  height: number;
  sectionClass: string;
  canBreakAfter: boolean;
  id: string;
}

export class ContentSplitter {
  private static previousContent: string | null = null;
  private static cachedPages: Page[] | null = null;
  private static lastAnalyzedSections: SectionInfo[] | null = null;

  private static readonly PAGE_CONFIG: PageConfig = {
    pageWidth: 816,
    pageHeight: 1056,
    topMargin: 60, // Reduced top margin for better balance
    bottomMargin: 72, // 0.75in at 96 DPI
    leftMargin: 72, // 0.75in at 96 DPI
    rightMargin: 72, // 0.75in at 96 DPI
    contentHeight: 1056 - 148 // pageHeight - top (60) - bottom (72) - extra buffer (16px)
  };

  // Tolerance for measurement inconsistencies (5px buffer for edge cases)
  private static readonly MEASUREMENT_TOLERANCE = 5;

  private static readonly SECTION_SELECTORS = [
    '.header-section',
    '.billing-job-container', 
    '.proposal-intro-section',
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

  private static readonly PARAGRAPH_BREAKABLE_SECTIONS = [
    'panels-section',
    'terms-section'
  ];

  static async splitContent(htmlContent: string): Promise<Page[]> {
    console.log('🔄 ContentSplitter: Starting content analysis...');
    
    // Temporarily disable caching in editing mode for better real-time updates
    // TODO: Re-enable with more sophisticated caching logic later
    this.clearCache();

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
      // Wait for fonts to load and styles to be applied
      await this.ensureRenderingComplete(measureContainer);
      
      const sections = this.analyzeSections(measureContainer);
      const pages = this.distributeWithReflow(sections);
      
      // Note: Caching temporarily disabled for better real-time updates
      // this.previousContent = htmlContent;
      // this.cachedPages = pages;
      // this.lastAnalyzedSections = sections;
      
      console.log(`📄 ContentSplitter: Created ${pages.length} pages`);
      return pages;

    } finally {
      document.body.removeChild(measureContainer);
    }
  }

  /**
   * Determine if content has changed significantly enough to require recalculation
   */
  private static shouldRecalculate(newContent: string): boolean {
    if (!this.previousContent || !this.cachedPages) {
      return true; // First time or no cache
    }

    // Quick length-based check for significant changes
    const lengthDifference = Math.abs(newContent.length - this.previousContent.length);
    const threshold = Math.min(this.previousContent.length, newContent.length) * 0.05; // 5% change threshold
    
    if (lengthDifference > threshold) {
      console.log(`📏 Content length changed significantly: ${lengthDifference} chars (threshold: ${Math.round(threshold)})`);
      return true;
    }

    // Check for structural changes in key sections
    const structuralChanges = this.hasStructuralChanges(this.previousContent, newContent);
    if (structuralChanges) {
      console.log('📏 Structural changes detected in content');
      return true;
    }

    return false;
  }

  /**
   * Check for structural changes that would affect page layout
   */
  private static hasStructuralChanges(oldContent: string, newContent: string): boolean {
    // Check for changes in section structure
    const oldSectionMatches = oldContent.match(/class="[^"]*(?:header-section|billing-job-container|panels-section|terms-section|pricing-section|signature-acceptance-section)[^"]*"/g) || [];
    const newSectionMatches = newContent.match(/class="[^"]*(?:header-section|billing-job-container|panels-section|terms-section|pricing-section|signature-acceptance-section)[^"]*"/g) || [];
    
    if (oldSectionMatches.length !== newSectionMatches.length) {
      return true;
    }

    // Check for changes in wall count (affects panels section)
    const oldWallMatches = oldContent.match(/wall-paragraph|Wall [A-Z]:/g) || [];
    const newWallMatches = newContent.match(/wall-paragraph|Wall [A-Z]:/g) || [];
    
    if (oldWallMatches.length !== newWallMatches.length) {
      console.log(`📏 Wall count changed: ${oldWallMatches.length} → ${newWallMatches.length}`);
      return true;
    }

    // Check for changes in terms/list items (affects terms section)
    const oldTermMatches = oldContent.match(/term-item|<li>/g) || [];
    const newTermMatches = newContent.match(/term-item|<li>/g) || [];
    
    if (Math.abs(oldTermMatches.length - newTermMatches.length) > 2) { // Allow small variations
      console.log(`📏 Terms/list items changed significantly: ${oldTermMatches.length} → ${newTermMatches.length}`);
      return true;
    }

    return false;
  }

  /**
   * Clear the cache to force recalculation
   */
  private static clearCache(): void {
    this.previousContent = null;
    this.cachedPages = null;
    this.lastAnalyzedSections = null;
    console.log('🗑️ ContentSplitter cache cleared');
  }

  /**
   * Force a recalculation on the next splitContent call
   */
  static forceRecalculation(): void {
    this.clearCache();
    console.log('🔄 ContentSplitter: Forced recalculation on next split');
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
        const canSplitParagraphs = this.PARAGRAPH_BREAKABLE_SECTIONS.some(breakable =>
          className.includes(breakable)
        );

        let paragraphs: ParagraphInfo[] = [];
        
        // If section can split paragraphs, analyze its content
        if (canSplitParagraphs) {
          paragraphs = this.analyzeParagraphs(htmlElement);
        }

        sections.push({
          element: htmlElement,
          height: htmlElement.offsetHeight + 24, // Increased spacing buffer to prevent overflow
          className: className,
          html: htmlElement.outerHTML,
          canBreak: canBreak,
          canSplitParagraphs: canSplitParagraphs,
          paragraphs: paragraphs
        });

        console.log(`📏 Section: ${className} = ${htmlElement.offsetHeight}px (breakable: ${canBreak}, paragraphSplittable: ${canSplitParagraphs})`);
      });
    });

    return sections;
  }

  private static analyzeParagraphs(sectionElement: HTMLElement): ParagraphInfo[] {
    const paragraphs: ParagraphInfo[] = [];
    
    // Special handling for different section types
    const isPanelsSection = sectionElement.classList.contains('panels-section');
    const isTermsSection = sectionElement.classList.contains('terms-section');
    const isGeneralSection = sectionElement.classList.contains('general-section');
    
    if (isPanelsSection) {
      console.log('🏢 Analyzing panels section for paragraph-level splitting');
      
      // Look for paragraph elements in panels section - these are the individual wall descriptions
      const wallParagraphs = sectionElement.querySelectorAll('p.wall-paragraph, p');
      
      console.log(`🔍 Found ${wallParagraphs.length} paragraphs in panels section`);
      
      wallParagraphs.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        
        if (htmlElement.textContent?.trim()) {
          const isTitle = htmlElement.classList.contains('quote-section-title') ||
                         htmlElement.classList.contains('section-header') ||
                         htmlElement.classList.contains('section-header-item') ||
                         htmlElement.tagName.toLowerCase() === 'h2';
          
          // Each wall paragraph gets its own entry for splitting
          paragraphs.push({
            element: htmlElement,
            height: htmlElement.offsetHeight + 4, // Small spacing buffer
            html: htmlElement.outerHTML,
            isTitle: isTitle
          });
          
          console.log(`🏗️ Panel paragraph ${index + 1}: "${htmlElement.textContent?.substring(0, 60)}..." (${htmlElement.offsetHeight}px, isTitle: ${isTitle})`);
        }
      });
      
      // If we don't find proper paragraphs, fall back to any content elements
      if (paragraphs.length === 0) {
        console.log('⚠️ No paragraphs found, falling back to broader search');
        const allElements = sectionElement.querySelectorAll('*');
        allElements.forEach(element => {
          const htmlElement = element as HTMLElement;
          if (htmlElement.textContent?.trim() && htmlElement.offsetHeight > 10) {
            const isTitle = htmlElement.classList.contains('section-header') || htmlElement.tagName.toLowerCase() === 'h2';
            paragraphs.push({
              element: htmlElement,
              height: htmlElement.offsetHeight + 4,
              html: htmlElement.outerHTML,
              isTitle: isTitle
            });
          }
        });
      }
    } else if (isTermsSection) {
      console.log('📜 Analyzing terms section for individual term items');
      console.log('🔍 Terms section HTML structure:', sectionElement.innerHTML.substring(0, 200));
      
      // Look for individual term items - the actual structure uses .term-item divs
      const termItems = sectionElement.querySelectorAll('.term-item, .terms-section ol li, .payment-terms-item, .terms-section > p, .terms-section > div[style], div[style*="margin-bottom"]');
      
      console.log(`🔍 Found ${termItems.length} potential term items with selectors`);
      
      // If we don't find enough items, try broader search
      if (termItems.length < 5) {
        const allDivs = sectionElement.querySelectorAll('div');
        console.log(`🔍 Fallback: Found ${allDivs.length} total divs in terms section`);
        
        allDivs.forEach((div, index) => {
          const htmlDiv = div as HTMLElement;
          if (htmlDiv.textContent?.trim() && htmlDiv.textContent.length > 10) {
            console.log(`🔍 Div ${index}: "${htmlDiv.textContent.substring(0, 30)}..." class="${htmlDiv.className}"`);
          }
        });
      }
      
      termItems.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        
        if (htmlElement.textContent?.trim()) {
          // Don't treat the terms-list wrapper as a paragraph
          if (htmlElement.classList.contains('terms-list')) {
            return;
          }
          
          const isTitle = htmlElement.classList.contains('quote-section-title') ||
                         htmlElement.classList.contains('section-header') ||
                         htmlElement.classList.contains('section-header-item') ||
                         htmlElement.tagName.toLowerCase() === 'h2' ||
                         /^GENERAL NOTES AND TERMS|Payment Terms|Terms|Conditions|PANELS:/i.test(htmlElement.textContent?.trim() || '');
          
          paragraphs.push({
            element: htmlElement,
            height: htmlElement.offsetHeight + (isTitle ? 10 : 3), // Small spacing for term items
            html: htmlElement.outerHTML,
            isTitle: isTitle
          });
          
          console.log(`📋 Terms item ${index + 1}: "${htmlElement.textContent?.substring(0, 50)}..." (${htmlElement.offsetHeight}px, isTitle: ${isTitle})`);
        }
      });
    } else if (isGeneralSection) {
      console.log('📝 Analyzing general section for individual notes');
      
      // Look for paragraphs, list items, and note blocks
      const noteItems = sectionElement.querySelectorAll('p, li, .general-notes-section > div, div[style*="margin"]');
      
      noteItems.forEach(element => {
        const htmlElement = element as HTMLElement;
        
        if (htmlElement.textContent?.trim()) {
          const isTitle = htmlElement.classList.contains('quote-section-title') ||
                         htmlElement.classList.contains('section-header') ||
                         /^General Notes|Notes|Important/i.test(htmlElement.textContent?.trim() || '');
          
          paragraphs.push({
            element: htmlElement,
            height: htmlElement.offsetHeight + (isTitle ? 10 : 3), // Small spacing for note items
            html: htmlElement.outerHTML,
            isTitle: isTitle
          });
          
          console.log(`📋 General item: "${htmlElement.textContent?.substring(0, 50)}..." (${htmlElement.offsetHeight}px, isTitle: ${isTitle})`);
        }
      });
    } else {
      // Standard paragraph analysis for other sections
      const paragraphSelectors = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'div.quote-section-title', 'div.quote-section-content > div'];
      
      paragraphSelectors.forEach(selector => {
        const elements = sectionElement.querySelectorAll(selector);
        
        elements.forEach(element => {
          const htmlElement = element as HTMLElement;
          
          // Skip if this element is nested within another paragraph element we're already tracking
          const isNested = paragraphSelectors.some(otherSelector => {
            if (otherSelector === selector) return false;
            return htmlElement.closest(otherSelector) && htmlElement.closest(otherSelector) !== htmlElement;
          });
          
          if (!isNested && htmlElement.textContent?.trim()) {
            const isTitle = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(htmlElement.tagName.toLowerCase()) || 
                            htmlElement.classList.contains('quote-section-title') ||
                            htmlElement.classList.contains('section-header') ||
                            (htmlElement.tagName.toLowerCase() === 'strong' && htmlElement.textContent?.includes(':')) ||
                            // Detect common section headers like "Track System:", "Panel Configuration:", etc.
                            /^[A-Z][a-z\s]+:/.test(htmlElement.textContent?.trim() || '');
            
            paragraphs.push({
              element: htmlElement,
              height: htmlElement.offsetHeight + (isTitle ? 12 : 6), // Reduced spacing for better fit
              html: htmlElement.outerHTML,
              isTitle: isTitle
            });
          }
        });
      });
    }
    
    // Sort paragraphs by their position in the document
    paragraphs.sort((a, b) => {
      const aRect = a.element.getBoundingClientRect();
      const bRect = b.element.getBoundingClientRect();
      return aRect.top - bRect.top;
    });
    
    console.log(`📝 Found ${paragraphs.length} paragraphs in section (isPanels: ${isPanelsSection})`);
    return paragraphs;
  }

  /**
   * Distribute sections with intelligent reflow - when content is removed from earlier pages,
   * content from later pages flows back to fill the space
   */
  private static distributeWithReflow(sections: SectionInfo[]): Page[] {
    console.log('🌊 Starting content distribution with reflow...');
    
    // Create a flat list of all content items (sections + paragraphs)
    const contentItems = this.flattenToContentItems(sections);
    
    // Distribute items across pages with reflow capability
    return this.distributeItemsWithReflow(contentItems);
  }

  /**
   * Flatten sections into individual content items that can be distributed
   */
  private static flattenToContentItems(sections: SectionInfo[]): ContentItem[] {
    const items: ContentItem[] = [];
    
    sections.forEach((section, sectionIndex) => {
      if (section.canSplitParagraphs && section.paragraphs && section.paragraphs.length > 1) {
        // Add section header first if it exists
        const sectionHeaderMatch = section.html.match(/<h2[^>]*class="[^"]*section-header[^"]*"[^>]*>.*?<\/h2>/s);
        if (sectionHeaderMatch) {
          items.push({
            type: 'section-header',
            html: sectionHeaderMatch[0],
            height: 40, // Estimated header height
            sectionClass: section.className,
            canBreakAfter: false, // Don't break immediately after headers
            id: `section-${sectionIndex}-header`
          });
        }
        
        // Add each paragraph as individual item
        section.paragraphs.forEach((paragraph, paragraphIndex) => {
          // Skip if this paragraph is already included in the header
          if (sectionHeaderMatch && paragraph.html === sectionHeaderMatch[0]) {
            return;
          }
          
          items.push({
            type: 'paragraph',
            html: this.wrapParagraphInSection(paragraph.html, section.className),
            height: paragraph.height,
            sectionClass: section.className,
            canBreakAfter: !paragraph.isTitle, // Don't break after titles
            id: `section-${sectionIndex}-para-${paragraphIndex}`
          });
        });
      } else {
        // Add entire section as single item
        items.push({
          type: 'section',
          html: section.html,
          height: section.height,
          sectionClass: section.className,
          canBreakAfter: section.canBreak,
          id: `section-${sectionIndex}`
        });
      }
    });
    
    console.log(`📦 Flattened ${sections.length} sections into ${items.length} content items`);
    return items;
  }

  /**
   * Wrap paragraph HTML in minimal section structure for proper styling
   */
  private static wrapParagraphInSection(paragraphHtml: string, sectionClass: string): string {
    // Extract the section wrapper structure
    const wrapperStart = `<div class="${sectionClass}" style="margin: 0;">`;
    const wrapperEnd = `</div>`;
    
    return wrapperStart + paragraphHtml + wrapperEnd;
  }

  /**
   * Distribute content items across pages with true reflow capability
   */
  private static distributeItemsWithReflow(items: ContentItem[]): Page[] {
    const pages: Page[] = [];
    let currentPageItems: ContentItem[] = [];
    let currentPageHeight = 0;
    let pageNumber = 1;

    console.log(`🌊 Distributing ${items.length} items across pages with reflow...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const wouldFit = currentPageHeight + item.height <= this.PAGE_CONFIG.contentHeight + this.MEASUREMENT_TOLERANCE;
      
      if (wouldFit || currentPageItems.length === 0) {
        // Item fits on current page
        currentPageItems.push(item);
        currentPageHeight += item.height;
        
        console.log(`✅ Added ${item.type} (${item.sectionClass}) to page ${pageNumber} - height: ${currentPageHeight}px`);
      } else {
        // Item doesn't fit, finalize current page and start new one
        if (currentPageItems.length > 0) {
          pages.push(this.createPageFromItems(currentPageItems, pageNumber));
          console.log(`📄 Completed page ${pageNumber} with ${currentPageItems.length} items (${currentPageHeight}px)`);
        }
        
        // Start new page
        pageNumber++;
        currentPageItems = [item];
        currentPageHeight = item.height;
        
        console.log(`🆕 Started page ${pageNumber} with ${item.type} (${item.sectionClass})`);
      }
    }
    
    // Add final page if it has content
    if (currentPageItems.length > 0) {
      pages.push(this.createPageFromItems(currentPageItems, pageNumber));
      console.log(`📄 Final page ${pageNumber} with ${currentPageItems.length} items`);
    }

    // Ensure at least one page
    if (pages.length === 0) {
      pages.push({
        id: 'page-1',
        content: items.map(item => item.html).join(''),
        pageNumber: 1,
        sections: [...new Set(items.map(item => item.sectionClass))]
      });
    }

    console.log(`🌊 Content reflow complete: ${pages.length} pages created`);
    return pages;
  }

  /**
   * Create a page object from content items
   */
  private static createPageFromItems(items: ContentItem[], pageNumber: number): Page {
    const content = items.map(item => item.html).join('');
    const sections = [...new Set(items.map(item => item.sectionClass))];
    
    return {
      id: `page-${pageNumber}`,
      content,
      pageNumber,
      sections
    };
  }

  private static distributeSections(sections: SectionInfo[]): Page[] {
    const pages: Page[] = [];
    let currentPageContent = '';
    let currentPageHeight = 0;
    let currentPageSections: string[] = [];
    let pageNumber = 1;

    sections.forEach((section) => {
      // Check if section fits on current page (with tolerance for measurement inconsistencies)
      const wouldFitWithTolerance = currentPageHeight + section.height <= this.PAGE_CONFIG.contentHeight + this.MEASUREMENT_TOLERANCE;
      if (wouldFitWithTolerance || currentPageContent === '') {
        // Section fits, add to current page
        currentPageContent += section.html;
        currentPageHeight += section.height;
        currentPageSections.push(section.className);
        
        console.log(`✅ Added ${section.className} to page ${pageNumber} (height: ${currentPageHeight}px / ${this.PAGE_CONFIG.contentHeight}px available)`);
      } else if (section.canSplitParagraphs && section.paragraphs && section.paragraphs.length > 1) {
        // Only attempt to split if we have multiple paragraphs (avoid splitting single paragraph sections)
        console.log(`🔍 Attempting paragraph-level split for ${section.className}: ${section.paragraphs.length} paragraphs, canSplit: ${section.canSplitParagraphs}`);
        // Section doesn't fit but can be split at paragraph level
        const splitResult = this.splitSectionByParagraphs(
          section, 
          currentPageHeight, 
          this.PAGE_CONFIG.contentHeight
        );

        if (splitResult.beforePageBreak) {
          // Add content that fits on current page
          currentPageContent += splitResult.beforePageBreak;
          currentPageSections.push(section.className);
          
          console.log(`✂️ Split ${section.className}: added ${splitResult.beforeParagraphCount} paragraphs to page ${pageNumber}`);
        }

        // Finalize current page if it has content
        if (currentPageContent.trim()) {
          pages.push({
            id: `page-${pageNumber}`,
            content: currentPageContent,
            pageNumber: pageNumber,
            sections: [...currentPageSections]
          });
          
          console.log(`📄 Completed page ${pageNumber} with sections: ${currentPageSections.join(', ')} (final height: ${currentPageHeight}px)`);
        }

        // Start new page with remaining content
        if (splitResult.afterPageBreak) {
          pageNumber++;
          currentPageContent = splitResult.afterPageBreak;
          currentPageHeight = splitResult.afterPageBreakHeight;
          currentPageSections = [section.className];
          
          console.log(`🆕 Started page ${pageNumber} with remaining ${splitResult.afterParagraphCount} paragraphs from ${section.className}`);
        } else {
          // Reset for next section
          pageNumber++;
          currentPageContent = '';
          currentPageHeight = 0;
          currentPageSections = [];
        }
      } else {
        // Section doesn't fit and can't be split, move to new page
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
        
        console.log(`🆕 Started page ${pageNumber} with ${section.className} (unbreakable)`);
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

  private static splitSectionByParagraphs(
    section: SectionInfo,
    currentPageHeight: number,
    maxPageHeight: number
  ): SectionSplitResult {
    const availableHeight = maxPageHeight - currentPageHeight;
    const paragraphs = section.paragraphs || [];
    
    let beforeParagraphs: ParagraphInfo[] = [];
    let afterParagraphs: ParagraphInfo[] = [];
    let heightAccumulator = 0;
    let splitIndex = -1;

    console.log(`📏 Available height: ${availableHeight}px for ${paragraphs.length} paragraphs`);

    // Find the optimal split point - fit as many paragraphs as possible while avoiding orphans
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (!paragraph) {
        console.warn(`⚠️ Undefined paragraph at index ${i}`);
        continue;
      }
      
      // Apply tolerance to paragraph-level measurements as well
      const wouldExceed = heightAccumulator + paragraph.height > availableHeight + this.MEASUREMENT_TOLERANCE;
      
      console.log(`📝 Paragraph ${i + 1}: ${paragraph.height}px, accumulated: ${heightAccumulator}px, would exceed: ${wouldExceed}, isTitle: ${paragraph.isTitle}`);
      
      // CRITICAL: Prevent orphaned section headers
      if (paragraph.isTitle && wouldExceed && heightAccumulator > 0) {
        // Don't leave a title by itself on a page - move it to next page with its content
        console.log(`🚫 Preventing orphaned title: "${paragraph.element.textContent?.substring(0, 30)}..." - moving to next page`);
        splitIndex = i;
        break;
      }
      
      // Check if this is a title and we need to ensure it has following content
      if (paragraph.isTitle && !wouldExceed) {
        // For list-based sections (panels, terms), be more generous
        const isListBasedSection = section.className.includes('panels-section') || 
                                   section.className.includes('terms-section');
        
        // Special handling for the embedded section headers (like "PANELS:" or "GENERAL NOTES AND TERMS:")
        const isEmbeddedSectionHeader = paragraph.element.classList.contains('section-header-item');
        
        if (!isListBasedSection && !isEmbeddedSectionHeader) {
          // Standard title handling for non-list sections
          let titleWithContentHeight = heightAccumulator + paragraph.height;
          let hasFollowingContent = false;
          
          for (let j = i + 1; j < paragraphs.length; j++) {
            const nextParagraph = paragraphs[j];
            if (!nextParagraph) {
              console.warn(`⚠️ Undefined nextParagraph at index ${j}`);
              continue;
            }
            if (!nextParagraph.isTitle) {
              titleWithContentHeight += nextParagraph.height;
              if (titleWithContentHeight <= availableHeight + this.MEASUREMENT_TOLERANCE) {
                hasFollowingContent = true;
              }
              break; // Only check the first content paragraph
            }
          }
          
          // If title + first content paragraph won't fit, move title to next page (apply tolerance)
          if (!hasFollowingContent && titleWithContentHeight > availableHeight + this.MEASUREMENT_TOLERANCE && heightAccumulator > 0) {
            console.log(`🚫 Moving title to next page to keep with content: "${paragraph.element.textContent?.substring(0, 30)}..."`);
            splitIndex = i;
            break;
          }
        } else {
          if (isEmbeddedSectionHeader) {
            console.log(`📋 Embedded section header: allowing flexible placement`);
          } else {
            console.log(`📋 List-based section: allowing flexible title placement`);
          }
        }
      }
      
      // If adding this paragraph would exceed available space
      if (wouldExceed && heightAccumulator > 0) {
        splitIndex = i;
        break;
      }
      
      // Add this paragraph to the current page
      heightAccumulator += paragraph.height;
      beforeParagraphs.push(paragraph);
      
      console.log(`✅ Added paragraph ${i + 1} to current page, new total: ${heightAccumulator}px`);
    }

    // Handle edge cases for split point determination
    if (splitIndex > 0) {
      afterParagraphs = paragraphs.slice(splitIndex);
    } else if (splitIndex === 0) {
      // No content fits on current page - move everything to next page
      beforeParagraphs = [];
      afterParagraphs = paragraphs;
    } else {
      // All paragraphs fit on current page
      afterParagraphs = [];
    }

    console.log(`📊 Split result: ${beforeParagraphs.length} paragraphs before (${heightAccumulator}px), ${afterParagraphs.length} paragraphs after`);

    // Build HTML for before page break
    let beforePageBreak: string | null = null;
    let beforePageBreakHeight = 0;
    
    if (beforeParagraphs.length > 0) {
      const sectionStart = this.extractSectionStart(section.html);
      const beforeContent = beforeParagraphs.map(p => p.html).join('');
      const sectionEnd = this.extractSectionEnd(section.html);
      
      beforePageBreak = sectionStart + beforeContent + sectionEnd;
      beforePageBreakHeight = beforeParagraphs.reduce((sum, p) => sum + p.height, 0);
    }

    // Build HTML for after page break
    let afterPageBreak: string | null = null;
    let afterPageBreakHeight = 0;
    
    if (afterParagraphs.length > 0) {
      // For split sections, check if the first paragraph being moved is the header itself
      const firstAfterParagraph = afterParagraphs[0];
      const isMovingHeaderWithContent = firstAfterParagraph && firstAfterParagraph.isTitle;
      
      console.log(`🔍 First paragraph being moved is title: ${isMovingHeaderWithContent}`);
      console.log(`🔍 First paragraph content: "${firstAfterParagraph?.element?.textContent?.substring(0, 50)}..."`);
      
      const sectionStart = this.extractSectionStart(section.html, false); // Don't include original header
      const afterContent = afterParagraphs.map(p => p.html).join('');
      const sectionEnd = this.extractSectionEnd(section.html);
      
      afterPageBreak = sectionStart + afterContent + sectionEnd;
      afterPageBreakHeight = afterParagraphs.reduce((sum, p) => sum + p.height, 0);
      
      if (isMovingHeaderWithContent) {
        console.log(`🔄 Moving section header with its content - no duplicate header needed`);
      } else {
        console.log(`📋 Continuing section content without header`);
      }
      
      console.log(`🔍 Section start without header: "${sectionStart.substring(0, 100)}..."`);
      console.log(`🔍 After content: "${afterContent.substring(0, 100)}..."`);
      console.log(`🔍 Section end: "${sectionEnd}"`);
      console.log(`🔍 Full afterPageBreak: "${afterPageBreak.substring(0, 150)}..."`);;
    }

    console.log(`📊 Split section: ${beforeParagraphs.length} paragraphs before, ${afterParagraphs.length} after`);

    return {
      beforePageBreak,
      afterPageBreak,
      beforePageBreakHeight,
      afterPageBreakHeight,
      beforeParagraphCount: beforeParagraphs.length,
      afterParagraphCount: afterParagraphs.length
    };
  }

  private static extractSectionStart(sectionHtml: string, includeHeader = true): string {
    console.log(`🔍 extractSectionStart called with includeHeader: ${includeHeader}`);
    
    if (includeHeader) {
      // Extract opening tags and section header, including list containers
      const match = sectionHtml.match(/^(<[^>]+[^>]*>)(?:.*?)(<[^>]*class="[^"]*quote-section-title[^"]*"[^>]*>.*?<\/[^>]+>|<h2[^>]*class="[^"]*section-header[^"]*"[^>]*>.*?<\/h2>)?(?:.*?)(<ol[^>]*>|<ul[^>]*>|<div[^>]*class="[^"]*terms-list[^"]*"[^>]*>)?/s);
      if (match) {
        const openingTag = match[1];
        const titleElement = match[2] || '';
        const listOpening = match[3] || '';
        const result = openingTag + titleElement + listOpening;
        console.log(`🔍 With header result: "${result.substring(0, 100)}..."`);
        return result;
      }
    } else {
      // Extract opening tag and list container WITHOUT header
      // Parse HTML to remove headers properly
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sectionHtml;
      
      // Find the section wrapper
      const sectionDiv = tempDiv.firstElementChild as HTMLElement;
      if (sectionDiv) {
        // Remove all headers from the section
        const headers = sectionDiv.querySelectorAll('h2.section-header, h2.editable-header, .quote-section-title');
        headers.forEach(header => header.remove());
        
        // Create a clean section start with just the wrapper and any list containers
        const cleanSectionDiv = document.createElement('div');
        cleanSectionDiv.className = sectionDiv.className;
        cleanSectionDiv.setAttribute('style', sectionDiv.getAttribute('style') || '');
        
        // Find list containers and add them
        const listContainers = sectionDiv.querySelectorAll('ol, ul, .terms-list');
        if (listContainers.length > 0) {
          listContainers.forEach(list => {
            const listClone = list.cloneNode(false) as HTMLElement; // Clone without children
            cleanSectionDiv.appendChild(listClone);
          });
        }
        
        const result = cleanSectionDiv.outerHTML.replace(/<\/[^>]+>$/, ''); // Remove closing tag
        console.log(`🔍 Without header result (DOM-based): "${result}"`);
        return result;
      }
      
      console.log(`⚠️ No section element found for header-less extraction`);
    }
    
    // Check if this section contains a list that we need to preserve
    const listMatch = sectionHtml.match(/^([^]*?)(<ol[^>]*>|<ul[^>]*>|<div[^>]*class="[^"]*terms-list[^"]*"[^>]*>)/s);
    if (listMatch?.[1] && listMatch?.[2]) {
      return includeHeader ? listMatch[1] + listMatch[2] : listMatch[2];
    }
    
    // Fallback: extract just the opening tag
    const tagMatch = sectionHtml.match(/^<[^>]+>/);
    return tagMatch ? tagMatch[0] : '<div>';
  }


  private static extractSectionEnd(sectionHtml: string): string {
    // Use DOM parsing for reliable extraction
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sectionHtml;
    
    const sectionDiv = tempDiv.firstElementChild as HTMLElement;
    if (sectionDiv) {
      // Find list containers that need closing
      const listContainers = sectionDiv.querySelectorAll('ol, ul, .terms-list');
      let closingTags = '';
      
      // Add closing tags for lists in reverse order
      if (listContainers.length > 0) {
        Array.from(listContainers).reverse().forEach(list => {
          closingTags += `</${list.tagName.toLowerCase()}>`;
        });
      }
      
      // Add the main section closing tag
      closingTags += `</${sectionDiv.tagName.toLowerCase()}>`;
      
      console.log(`🔍 Section end tags: "${closingTags}"`);
      return closingTags;
    }
    
    // Fallback
    console.log(`⚠️ Using fallback section end: </div>`);
    return '</div>';
  }

  private static extractSectionTitle(sectionHtml: string): string | null {
    // Use DOM parsing to extract the section header text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sectionHtml;
    
    const sectionDiv = tempDiv.firstElementChild as HTMLElement;
    if (sectionDiv) {
      // Look for h2 section headers
      const header = sectionDiv.querySelector('h2.section-header, h2.editable-header');
      if (header && header.textContent) {
        console.log(`🏷️ Extracted section title: "${header.textContent.trim()}"`);
        return header.textContent.trim();
      }
      
      // Fallback: look for any h2 element
      const anyHeader = sectionDiv.querySelector('h2');
      if (anyHeader && anyHeader.textContent) {
        console.log(`🏷️ Extracted fallback section title: "${anyHeader.textContent.trim()}"`);
        return anyHeader.textContent.trim();
      }
    }
    
    console.log(`⚠️ No section title found in HTML`);
    return null;
  }

  /**
   * Ensures that fonts are loaded and layout is complete before measurement
   */
  private static async ensureRenderingComplete(container: HTMLElement): Promise<void> {
    // Wait for fonts to load
    await document.fonts.ready;
    
    // Force a style calculation
    container.offsetHeight;
    
    // Use requestAnimationFrame to ensure layout is complete
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        // Double RAF to ensure rendering pipeline is complete
        requestAnimationFrame(() => {
          resolve();
        });
      });
    });
    
    console.log('✅ ContentSplitter: Rendering and font loading complete');
  }

  static getPageConfig(): PageConfig {
    return { ...this.PAGE_CONFIG };
  }
}