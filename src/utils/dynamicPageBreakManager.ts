import { QuoteData } from '@/templates/BaseQuoteTemplate';
import { sanitizeHTML } from './security';

export interface PageBreakRule {
  sectionClass: string;
  minimumHeight: number;
  calculatedHeight?: number; // Actual measured height from content
  priority: number; // Higher priority gets more protection from breaking
  allowBreakInside?: boolean;
  isDynamic?: boolean; // Whether this rule should use calculated height instead of minimum
}

export class DynamicPageBreakManager {
  private pageHeight = 1123; // A4 at scale 2
  private marginBuffer = 50;
  private static cachedResults: Map<string, string> = new Map();
  private static lastContentHash: string | null = null;

  /**
   * Calculate actual section heights from HTML content
   */
  private calculateSectionHeights(htmlContent: string): Map<string, number> {
    const sectionHeights = new Map<string, number>();
    
    // Create temporary container for measurement
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '794px'; // A4 width at scale 2
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.fontFamily = '"Times New Roman", Times, serif';
    tempContainer.style.fontSize = '14px';
    tempContainer.style.lineHeight = '1.15';
    
    try {
      sanitizeHTML.setInnerHTML(tempContainer, sanitizeHTML.cleanForPDF(htmlContent));
      document.body.appendChild(tempContainer);

      // Define section selectors to measure
      const sectionSelectors = [
        'header-section',
        'billing-job-container', 
        'proposal-intro-section',
        'wall-specifications-list',
        'panels-section',
        'pricing-section',
        'terms-section',
        'signature-section',
        'pocket-doors-section',
        'pass-doors-section'
      ];

      sectionSelectors.forEach(sectionClass => {
        const section = tempContainer.querySelector(`.${sectionClass}`) as HTMLElement;
        if (section) {
          // Force layout calculation
          section.offsetHeight;
          const actualHeight = section.getBoundingClientRect().height;
          sectionHeights.set(sectionClass, Math.ceil(actualHeight));
          
          console.log(`📏 Measured ${sectionClass}: ${Math.ceil(actualHeight)}px`);
        }
      });

      document.body.removeChild(tempContainer);
    } catch (error) {
      console.error('Error calculating section heights:', error);
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }

    return sectionHeights;
  }

  private getPageBreakRules(data: QuoteData): PageBreakRule[] {
    const wallCount = this.getWallCount(data);
    const hasMultipleWalls = wallCount > 1;
    const hasPocketDoors = 
      // Check individual walls for pocket doors
      (data.wall_details && Object.values(data.wall_details.walls || {}).some(
        (wall: any) => wall.pocketDoors?.foldType && wall.pocketDoors.foldType.toLowerCase() !== 'none'
      ));
    
    const rules: PageBreakRule[] = [
      {
        sectionClass: 'header-section',
        minimumHeight: 200,
        priority: 10,
        allowBreakInside: false,
        isDynamic: true
      },
      {
        sectionClass: 'billing-job-container',
        minimumHeight: 150,
        priority: 9,
        allowBreakInside: false,
        isDynamic: true
      },
      {
        sectionClass: 'proposal-intro-section',
        minimumHeight: 50,
        priority: 10,
        allowBreakInside: false,
        isDynamic: true
      },
      {
        sectionClass: 'wall-specifications-list',
        minimumHeight: hasMultipleWalls ? wallCount * 50 + 80 : 120,
        priority: 8,
        allowBreakInside: hasMultipleWalls,
        isDynamic: true
      },
      {
        sectionClass: 'panels-section',
        minimumHeight: 180,
        priority: 7,
        allowBreakInside: true,
        isDynamic: true
      },
      {
        sectionClass: 'pricing-section',
        minimumHeight: 120,
        priority: 9,
        allowBreakInside: false,
        isDynamic: true
      },
      {
        sectionClass: 'terms-section',
        minimumHeight: 250,
        priority: 6,
        allowBreakInside: true,
        isDynamic: true
      },
      {
        sectionClass: 'signature-section',
        minimumHeight: 120,
        priority: 10,
        allowBreakInside: false,
        isDynamic: true
      }
    ];

    if (hasPocketDoors) {
      rules.push({
        sectionClass: 'pocket-doors-section',
        minimumHeight: 80,
        priority: 7,
        allowBreakInside: false,
        isDynamic: true
      });
    }

    return rules;
  }

  /**
   * Get page break rules with calculated heights from actual content
   */
  private getDynamicPageBreakRules(data: QuoteData, htmlContent: string): PageBreakRule[] {
    const baseRules = this.getPageBreakRules(data);
    const sectionHeights = this.calculateSectionHeights(htmlContent);
    
    // Update rules with calculated heights
    return baseRules.map(rule => {
      if (rule.isDynamic) {
        const measuredHeight = sectionHeights.get(rule.sectionClass);
        if (measuredHeight !== undefined) {
          return {
            ...rule,
            calculatedHeight: measuredHeight,
            // Use the larger of minimum or calculated height for safety
            minimumHeight: Math.max(rule.minimumHeight, measuredHeight)
          };
        }
      }
      return rule;
    });
  }

  private getWallCount(data: QuoteData): number {
    const walls = data.wall_details?.walls || {};
    return Object.keys(walls).length;
  }

  public processHTMLWithDynamicBreaks(htmlContent: string, data: QuoteData): string {
    console.log('🔄 Processing HTML with dynamic page breaks...');
    
    // Generate a hash for caching
    const contentHash = this.generateContentHash(htmlContent, data);
    
    // Check if we have a cached result and content hasn't changed significantly
    const cachedResult = DynamicPageBreakManager.cachedResults.get(contentHash);
    if (cachedResult && DynamicPageBreakManager.lastContentHash === contentHash) {
      console.log('✅ Using cached dynamic page break result');
      return cachedResult;
    }
    
    // Create temporary container for layout calculations
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '794px'; // A4 width at scale 2
    tempContainer.style.visibility = 'hidden';
    
    try {
      // Get rules with calculated heights from actual content
      const rules = this.getDynamicPageBreakRules(data, htmlContent);
      console.log('📋 Using dynamic rules:', rules.map(r => ({ 
        section: r.sectionClass, 
        min: r.minimumHeight, 
        calculated: r.calculatedHeight 
      })));

      sanitizeHTML.setInnerHTML(tempContainer, sanitizeHTML.cleanForPDF(htmlContent));
      document.body.appendChild(tempContainer);
      let processedContent = htmlContent;
      // let currentPageHeight = 0;

      // Process each section according to dynamic rules
      rules.forEach(rule => {
        const section = tempContainer.querySelector(`.${rule.sectionClass}`) as HTMLElement;
        if (section) {
          const sectionTop = section.offsetTop;
          const actualSectionHeight = section.offsetHeight;
          
          // Use calculated height if available, otherwise use actual measured height
          const effectiveHeight = rule.calculatedHeight || actualSectionHeight;
          const requiredHeight = rule.isDynamic && rule.calculatedHeight ? 
            rule.calculatedHeight : rule.minimumHeight;
          
          console.log(`📏 Processing ${rule.sectionClass}: actual=${actualSectionHeight}px, calculated=${rule.calculatedHeight}px, using=${effectiveHeight}px`);
          
          // Calculate which page we're on
          const currentPage = Math.floor(sectionTop / this.pageHeight);
          const positionOnPage = sectionTop - (currentPage * this.pageHeight);
          const remainingSpace = this.pageHeight - positionOnPage;

          // Check if section needs page break protection using dynamic height
          if (effectiveHeight >= requiredHeight && 
              remainingSpace < requiredHeight + this.marginBuffer) {
            
            if (!rule.allowBreakInside) {
              // Add page break before this section
              const spacingNeeded = Math.max(remainingSpace + 20, 80);
              const pageBreakHTML = `<div class="dynamic-page-break" style="height: ${spacingNeeded}px; page-break-before: auto;"></div>`;
              
              // Insert page break before the section
              const sectionHTML = section.outerHTML;
              processedContent = processedContent.replace(
                sectionHTML,
                pageBreakHTML + sectionHTML
              );
            } else if (rule.sectionClass === 'panels-section') {
              // Fragment the panels section
              const fragmentedHTML = this.fragmentPanelsSection(section, remainingSpace);
              if (fragmentedHTML) {
                processedContent = processedContent.replace(
                  section.outerHTML,
                  fragmentedHTML
                );
              }
            }
          }
        }
      });

      // Handle wall table specifically for multiple walls
      const wallCount = this.getWallCount(data);
      if (wallCount > 2) {
        processedContent = this.handleMultiWallTable(processedContent, wallCount);
      }

      document.body.removeChild(tempContainer);
      
      // Cache the result
      DynamicPageBreakManager.cachedResults.set(contentHash, processedContent);
      DynamicPageBreakManager.lastContentHash = contentHash;
      
      // Limit cache size to prevent memory issues
      if (DynamicPageBreakManager.cachedResults.size > 10) {
        const firstKey = DynamicPageBreakManager.cachedResults.keys().next().value;
        if (firstKey !== undefined) {
          DynamicPageBreakManager.cachedResults.delete(firstKey);
        }
      }
      
      return processedContent;

    } catch (error) {
      console.error('Error processing dynamic page breaks:', error);
      document.body.removeChild(tempContainer);
      return htmlContent;
    }
  }

  private handleMultiWallTable(htmlContent: string, wallCount: number): string {
    // For tables with many walls, ensure proper page breaking
    const estimatedTableHeight = wallCount * 50 + 100; // Rough estimate
    
    if (estimatedTableHeight > this.pageHeight * 0.6) {
      // Add strategic break before the table if it's very large
      const tableBreak = `<div class="table-page-break" style="height: 100px; page-break-before: auto;"></div>`;
      return htmlContent.replace(
        '<div class="wall-specifications-list"',
        tableBreak + '<div class="wall-specifications-list"'
      );
    }
    
    return htmlContent;
  }

  public calculateOptimalSpacing(contentSections: string[], data: QuoteData): number[] {
    const rules = this.getPageBreakRules(data);
    const spacingArray: number[] = [];
    let accumulatedHeight = 0;

    contentSections.forEach((section, _) => {
      const estimatedHeight = this.estimateSectionHeight(section, data);
      const rule = rules.find(r => section.includes(r.sectionClass));
      
      if (rule && !rule.allowBreakInside) {
        const currentPagePosition = accumulatedHeight % this.pageHeight;
        const remainingSpace = this.pageHeight - currentPagePosition;
        
        if (remainingSpace < rule.minimumHeight + this.marginBuffer) {
          // Add spacing to push to next page
          const spacing = remainingSpace + 20;
          spacingArray.push(spacing);
          accumulatedHeight += spacing;
        } else {
          spacingArray.push(0);
        }
      } else {
        spacingArray.push(0);
      }
      
      accumulatedHeight += estimatedHeight;
    });

    return spacingArray;
  }

  private estimateSectionHeight(sectionHTML: string, data: QuoteData): number {
    // Rough estimation based on content
    const lineCount = (sectionHTML.match(/<br>/g) || []).length + 1;
    const tableRows = (sectionHTML.match(/<tr>/g) || []).length;
    const hasImage = sectionHTML.includes('<img');
    
    let height = lineCount * 20; // ~20px per line
    height += tableRows * 40; // ~40px per table row
    height += hasImage ? 100 : 0; // Logo/image height
    
    // Special cases
    if (sectionHTML.includes('wall-specifications-list')) {
      const wallCount = this.getWallCount(data);
      height = Math.max(height, wallCount * 50 + 80);
    }
    
    return height;
  }

  private fragmentPanelsSection(section: HTMLElement, remainingSpace: number): string | null {
    const wallParagraphs = section.querySelectorAll('p.wall-paragraph');
    
    if (wallParagraphs.length <= 1) {
      return null; // No need to fragment if only one wall
    }

    // Calculate which paragraphs can fit in remaining space
    let accumulatedHeight = 0;
    let breakPoint = 0;
    const paragraphHeights: number[] = [];

    // Account for section header height
    const header = section.querySelector('h2.section-header');
    if (header) {
      accumulatedHeight += 60; // Approximate header height
    }

    // Calculate individual paragraph heights and find break point
    wallParagraphs.forEach((paragraph, index) => {
      const estimatedHeight = this.estimateParagraphHeight(paragraph.textContent || '');
      paragraphHeights.push(estimatedHeight);
      
      if (accumulatedHeight + estimatedHeight <= remainingSpace - this.marginBuffer) {
        breakPoint = index + 1;
        accumulatedHeight += estimatedHeight;
      }
    });

    // If no paragraphs fit, move entire section
    if (breakPoint === 0) {
      return null;
    }

    // If all paragraphs fit, no need to fragment
    if (breakPoint >= wallParagraphs.length) {
      return null;
    }

    // Create first fragment (what fits on current page)
    const firstFragment = document.createElement('div');
    firstFragment.className = 'panels-section page-fragment';
    firstFragment.style.cssText = section.style.cssText;

    // Add header to first fragment
    if (header) {
      firstFragment.appendChild(header.cloneNode(true));
    }

    // Add paragraphs that fit
    for (let i = 0; i < breakPoint; i++) {
      const paragraph = wallParagraphs[i];
      if (paragraph) {
        firstFragment.appendChild(paragraph.cloneNode(true));
      }
    }

    // Create second fragment (what goes to next page)  
    const secondFragment = document.createElement('div');
    secondFragment.className = 'panels-section page-fragment';
    secondFragment.style.cssText = section.style.cssText;

    // Add remaining paragraphs
    for (let i = breakPoint; i < wallParagraphs.length; i++) {
      const paragraph = wallParagraphs[i];
      if (paragraph) {
        secondFragment.appendChild(paragraph.cloneNode(true));
      }
    }

    // Insert page break between fragments
    const pageBreak = `<div class="dynamic-page-break" style="height: ${Math.max(remainingSpace - accumulatedHeight + 20, 80)}px; page-break-before: auto;"></div>`;

    return firstFragment.outerHTML + pageBreak + secondFragment.outerHTML;
  }

  private estimateParagraphHeight(text: string): number {
    // Estimate height based on text length and structure
    const wordsPerLine = 12; // Approximate words per line at 14px font size
    const lineHeight = 22; // Approximate line height in pixels
    const baseHeight = 16; // Base paragraph margin/padding
    
    const words = text.split(/\s+/).length;
    const estimatedLines = Math.ceil(words / wordsPerLine);
    
    return baseHeight + (estimatedLines * lineHeight);
  }

  /**
   * Public method to get current dynamic rules for a specific HTML content
   * This can be used by components to get updated rules when content changes
   */
  public getCurrentRules(htmlContent: string, data: QuoteData): PageBreakRule[] {
    return this.getDynamicPageBreakRules(data, htmlContent);
  }

  /**
   * Get the effective height for a specific section class
   */
  public getSectionHeight(sectionClass: string, htmlContent: string, data: QuoteData): number {
    const rules = this.getDynamicPageBreakRules(data, htmlContent);
    const rule = rules.find(r => r.sectionClass === sectionClass);
    
    if (rule) {
      return rule.calculatedHeight || rule.minimumHeight;
    }
    
    // Fallback: try to measure directly
    const sectionHeights = this.calculateSectionHeights(htmlContent);
    return sectionHeights.get(sectionClass) || 0;
  }

  /**
   * Check if content update requires rule recalculation
   */
  public shouldRecalculateRules(
    oldContent: string, 
    newContent: string, 
    // data: QuoteData
  ): boolean {
    // Simple check - if content length changes significantly, recalculate
    const lengthDifference = Math.abs(oldContent.length - newContent.length);
    const threshold = Math.min(oldContent.length, newContent.length) * 0.1; // 10% change threshold
    
    if (lengthDifference > threshold) {
      console.log(`📏 Content change detected: ${lengthDifference} chars difference, recalculating rules`);
      return true;
    }
    
    // Check if wall count changed (affects many rules)
    const oldWallCount = this.extractWallCountFromHTML(oldContent);
    const newWallCount = this.extractWallCountFromHTML(newContent);
    
    if (oldWallCount !== newWallCount) {
      console.log(`📏 Wall count changed: ${oldWallCount} → ${newWallCount}, recalculating rules`);
      return true;
    }
    
    return false;
  }

  private extractWallCountFromHTML(htmlContent: string): number {
    // Count wall specifications in HTML - rough estimate
    const wallMatches = htmlContent.match(/wall-specification-row/g);
    return wallMatches ? wallMatches.length : 0;
  }

  /**
   * Generate a hash for content caching
   */
  private generateContentHash(htmlContent: string, data: QuoteData): string {
    const wallCount = this.getWallCount(data);
    const contentLength = htmlContent.length;
    const hasMultipleWalls = wallCount > 1;
    const hasPocketDoors = data.wall_details && Object.values(data.wall_details.walls || {}).some(
      (wall: any) => wall.pocketDoors?.foldType && wall.pocketDoors.foldType.toLowerCase() !== 'none'
    );
    
    return `${contentLength}-${wallCount}-${hasMultipleWalls}-${hasPocketDoors}`;
  }

  /**
   * Clear the cache to force recalculation
   */
  public static clearCache(): void {
    this.cachedResults.clear();
    this.lastContentHash = null;
    console.log('🗑️ DynamicPageBreakManager cache cleared');
  }

  /**
   * Force recalculation on next processHTMLWithDynamicBreaks call
   */
  public forceRecalculation(): void {
    DynamicPageBreakManager.clearCache();
    console.log('🔄 DynamicPageBreakManager: Forced recalculation on next process');
  }
}