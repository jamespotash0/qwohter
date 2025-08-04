import { QuoteData } from '@/templates/BaseQuoteTemplate';

export interface PageBreakRule {
  sectionClass: string;
  minimumHeight: number;
  priority: number; // Higher priority gets more protection from breaking
  allowBreakInside?: boolean;
}

export class DynamicPageBreakManager {
  private pageHeight = 1123; // A4 at scale 2
  private marginBuffer = 50;

  private getPageBreakRules(data: QuoteData): PageBreakRule[] {
    const wallCount = this.getWallCount(data);
    const hasMultipleWalls = wallCount > 1;
    const hasPocketDoors = !!(data.pocket_doors?.foldType && data.pocket_doors?.foldStyle);
    
    const rules: PageBreakRule[] = [
      {
        sectionClass: 'header-section',
        minimumHeight: 200,
        priority: 10,
        allowBreakInside: false
      },
      {
        sectionClass: 'billing-job-container',
        minimumHeight: 150,
        priority: 9,
        allowBreakInside: false
      },
      {
        sectionClass: 'wall-specifications-list',
        minimumHeight: hasMultipleWalls ? wallCount * 50 + 80 : 120,
        priority: 8,
        allowBreakInside: hasMultipleWalls
      },
      {
        sectionClass: 'panels-section',
        minimumHeight: 180,
        priority: 7,
        allowBreakInside: true
      },
      {
        sectionClass: 'pricing-section',
        minimumHeight: 120,
        priority: 9,
        allowBreakInside: false
      },
      {
        sectionClass: 'terms-section',
        minimumHeight: 250,
        priority: 6,
        allowBreakInside: true
      },
      {
        sectionClass: 'signature-section',
        minimumHeight: 120,
        priority: 10,
        allowBreakInside: false
      }
    ];

    if (hasPocketDoors) {
      rules.push({
        sectionClass: 'pocket-doors-section',
        minimumHeight: 80,
        priority: 7,
        allowBreakInside: false
      });
    }

    return rules;
  }

  private getWallCount(data: QuoteData): number {
    const walls = data.wall_details?.walls || {};
    return Object.keys(walls).length;
  }

  public processHTMLWithDynamicBreaks(htmlContent: string, data: QuoteData): string {
    // Create temporary container for measurement
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '794px'; // A4 width at scale 2
    tempContainer.style.visibility = 'hidden';
    tempContainer.innerHTML = htmlContent;
    document.body.appendChild(tempContainer);

    try {
      const rules = this.getPageBreakRules(data);
      let processedContent = htmlContent;
      let currentPageHeight = 0;

      // Process each section according to rules
      rules.forEach(rule => {
        const section = tempContainer.querySelector(`.${rule.sectionClass}`) as HTMLElement;
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionHeight = section.offsetHeight;
          
          // Calculate which page we're on
          const currentPage = Math.floor(sectionTop / this.pageHeight);
          const positionOnPage = sectionTop - (currentPage * this.pageHeight);
          const remainingSpace = this.pageHeight - positionOnPage;

          // Check if section needs page break protection
          if (sectionHeight >= rule.minimumHeight && 
              remainingSpace < rule.minimumHeight + this.marginBuffer &&
              !rule.allowBreakInside) {
            
            // Add page break before this section
            const spacingNeeded = Math.max(remainingSpace + 20, 80);
            const pageBreakHTML = `<div class="dynamic-page-break" style="height: ${spacingNeeded}px; page-break-before: auto;"></div>`;
            
            // Insert page break before the section
            const sectionHTML = section.outerHTML;
            processedContent = processedContent.replace(
              sectionHTML,
              pageBreakHTML + sectionHTML
            );
          }
        }
      });

      // Handle wall table specifically for multiple walls
      const wallCount = this.getWallCount(data);
      if (wallCount > 2) {
        processedContent = this.handleMultiWallTable(processedContent, wallCount);
      }

      document.body.removeChild(tempContainer);
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

    contentSections.forEach((section, index) => {
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
}