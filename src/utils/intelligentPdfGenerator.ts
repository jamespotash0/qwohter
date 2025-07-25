import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ContentSection {
  name: string;
  element: HTMLElement;
  height: number;
  isEssential: boolean; // Cannot be split across pages
}

interface PageBreakOptions {
  pageHeight: number;
  marginTop: number;
  marginBottom: number;
  sectionSpacing: number;
}

export class IntelligentPdfGenerator {
  private pageHeight: number;
  private marginTop: number;
  private marginBottom: number;
  private sectionSpacing: number;
  private currentPageHeight: number;
  private sections: ContentSection[] = [];

  constructor(options: Partial<PageBreakOptions> = {}) {
    // A4 dimensions in pixels at 96 DPI (standard web DPI)
    this.pageHeight = options.pageHeight || 1123; // A4 height in pixels
    this.marginTop = options.marginTop || 50;
    this.marginBottom = options.marginBottom || 50;
    this.sectionSpacing = options.sectionSpacing || 20;
    this.currentPageHeight = this.marginTop;
  }

  /**
   * Analyzes HTML content and identifies logical sections
   */
  private identifySections(container: HTMLElement): ContentSection[] {
    const sections: ContentSection[] = [];
    
    // Define section selectors and their importance
    const sectionSelectors = [
      { selector: '.header-section', name: 'Header', essential: true },
      { selector: '.billing-job-container', name: 'Billing Info', essential: true },
      { selector: '.proposal-intro', name: 'Proposal Introduction', essential: false },
      { selector: '.wall-specifications', name: 'Wall Specifications Title', essential: false },
      { selector: '.wall-specifications-list', name: 'Wall Specifications Table', essential: true },
      { selector: '.panels-section', name: 'Panels Section', essential: false },
      { selector: '.track-section', name: 'Track Section', essential: false },
      { selector: '.pocket-doors-section', name: 'Pocket Doors Section', essential: false },
      { selector: '.support-section', name: 'Support Structure Section', essential: false },
      { selector: '.general-section', name: 'General Section', essential: false },
      { selector: '.pricing-section', name: 'Pricing Table', essential: true },
      { selector: '.statement-section', name: 'Statement Section', essential: false },
      { selector: '.terms-section', name: 'Terms Section', essential: false },
      { selector: '.signature-section', name: 'Signature Section', essential: true },
      { selector: '.acceptance-section', name: 'Acceptance Section', essential: true }
    ];

    for (const sectionDef of sectionSelectors) {
      const element = container.querySelector(sectionDef.selector) as HTMLElement;
      if (element && this.hasVisibleContent(element)) {
        const height = this.measureElementHeight(element);
        sections.push({
          name: sectionDef.name,
          element,
          height,
          isEssential: sectionDef.essential
        });
      }
    }

    return sections;
  }

  /**
   * Checks if an element has visible content (not just empty strings)
   */
  private hasVisibleContent(element: HTMLElement): boolean {
    const text = element.textContent?.trim() || '';
    
    // Skip elements that are empty or contain only whitespace/default placeholder text
    if (!text) return false;
    
    // Skip sections with only "N/A", empty, or placeholder content
    const hasRealContent = text.length > 3 && 
                          !text.match(/^(N\/A|n\/a|TBD|tbd|\s*-\s*)$/);
    
    // Special handling for tables - check if they have data rows
    if (element.querySelector('table')) {
      const rows = element.querySelectorAll('tr');
      return rows.length > 1; // Has header + at least one data row
    }

    return hasRealContent;
  }

  /**
   * Measures the actual rendered height of an element
   */
  private measureElementHeight(element: HTMLElement): number {
    // Create a temporary clone to measure without affecting the original
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Apply the same styles as the original for accurate measurement
    const computedStyle = window.getComputedStyle(element);
    clone.style.cssText = computedStyle.cssText;
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.left = '-9999px';
    clone.style.width = element.offsetWidth + 'px';
    
    document.body.appendChild(clone);
    const height = clone.offsetHeight;
    document.body.removeChild(clone);
    
    return height;
  }

  /**
   * Determines where page breaks should be placed
   */
  private calculatePageBreaks(sections: ContentSection[]): ContentSection[][] {
    const pages: ContentSection[][] = [];
    let currentPage: ContentSection[] = [];
    let currentPageHeight = this.marginTop;

    for (const section of sections) {
      const sectionHeight = section.height + this.sectionSpacing;
      const availableSpace = this.pageHeight - this.marginBottom - currentPageHeight;

      // If this section would exceed the page and we have content, start a new page
      if (sectionHeight > availableSpace && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [section];
        currentPageHeight = this.marginTop + sectionHeight;
      } else {
        currentPage.push(section);
        currentPageHeight += sectionHeight;
      }
    }

    // Add the last page if it has content
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  /**
   * Adds page break markers to the HTML content
   */
  private addPageBreakMarkers(container: HTMLElement, pageGroups: ContentSection[][]): void {
    // Remove any existing page break markers
    container.querySelectorAll('.page-break-marker').forEach(el => el.remove());

    for (let i = 0; i < pageGroups.length - 1; i++) {
      const currentPageSections = pageGroups[i];
      const lastSectionInPage = currentPageSections[currentPageSections.length - 1];
      
      // Create a page break marker
      const pageBreak = document.createElement('div');
      pageBreak.className = 'page-break-marker';
      pageBreak.style.cssText = `
        page-break-after: always;
        break-after: page;
        height: 1px;
        margin: 20px 0;
        border: none;
        clear: both;
      `;

      // Insert the page break after the last section of the current page
      if (lastSectionInPage.element.nextSibling) {
        lastSectionInPage.element.parentNode?.insertBefore(pageBreak, lastSectionInPage.element.nextSibling);
      } else {
        lastSectionInPage.element.parentNode?.appendChild(pageBreak);
      }
    }
  }

  /**
   * Generates PDF with intelligent page breaks
   */
  async generatePDF(htmlContent: string, options: {
    filename: string;
    containerWidth?: number;
    scale?: number;
  }): Promise<void> {
    const { filename, containerWidth = 800, scale = 2 } = options;

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: ${containerWidth}px;
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.4;
      background: white;
      padding: 20px;
    `;

    document.body.appendChild(container);

    try {
      // Identify and analyze sections
      this.sections = this.identifySections(container);
      console.log('Identified sections:', this.sections.map(s => ({ name: s.name, height: s.height })));

      // Calculate optimal page breaks
      const pageGroups = this.calculatePageBreaks(this.sections);
      console.log('Page groups:', pageGroups.map(page => page.map(s => s.name)));

      // Add page break markers to the HTML
      this.addPageBreakMarkers(container, pageGroups);

      // Generate the PDF using html2canvas
      const canvas = await html2canvas(container, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: containerWidth,
        height: container.scrollHeight
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add the image to PDF, handling page breaks automatically
      const pageHeight = 297; // A4 height in mm
      let yPosition = 0;

      while (yPosition < imgHeight) {
        const pageCanvas = document.createElement('canvas');
        const pageCtx = pageCanvas.getContext('2d');
        
        if (pageCtx) {
          pageCanvas.width = canvas.width;
          pageCanvas.height = (pageHeight * canvas.width) / imgWidth;

          // Draw the portion of the main canvas for this page
          pageCtx.drawImage(
            canvas,
            0, (yPosition * canvas.width) / imgWidth,
            canvas.width, pageCanvas.height,
            0, 0,
            canvas.width, pageCanvas.height
          );

          const pageDataUrl = pageCanvas.toDataURL('image/png');
          
          if (yPosition > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(pageDataUrl, 'PNG', 0, 0, imgWidth, pageHeight);
        }

        yPosition += pageHeight;
      }

      // Save the PDF
      pdf.save(filename);

    } finally {
      // Clean up
      document.body.removeChild(container);
    }
  }

  /**
   * Enhanced fallback method with intelligent text wrapping
   */
  async generateTextPDF(htmlContent: string, filename: string): Promise<void> {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Parse HTML content into structured text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const sections = this.extractTextSections(tempDiv);
    
    let yPosition = 20;
    const lineHeight = 5;
    const pageHeight = 280;
    const leftMargin = 15;
    const rightMargin = 195;

    pdf.setFontSize(10);

    for (const section of sections) {
      // Add section title if it exists
      if (section.title) {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFont(undefined, 'bold');
        pdf.text(section.title, leftMargin, yPosition);
        yPosition += lineHeight * 1.5;
        pdf.setFont(undefined, 'normal');
      }

      // Add section content
      for (const line of section.content) {
        if (yPosition > pageHeight) {
          pdf.addPage();
          yPosition = 20;
        }

        const splitText = pdf.splitTextToSize(line, rightMargin - leftMargin);
        for (const textLine of splitText) {
          if (yPosition > pageHeight) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(textLine, leftMargin, yPosition);
          yPosition += lineHeight;
        }
      }

      yPosition += lineHeight; // Add spacing between sections
    }

    pdf.save(filename);
  }

  /**
   * Extracts structured text from HTML for fallback PDF generation
   */
  private extractTextSections(container: HTMLElement): Array<{ title: string; content: string[] }> {
    const sections: Array<{ title: string; content: string[] }> = [];
    
    const sectionElements = container.querySelectorAll('.header-section, .billing-job-container, .wall-specifications, .panels-section, .track-section, .pocket-doors-section, .support-section, .general-section, .pricing-section, .terms-section, .signature-section, .acceptance-section');
    
    sectionElements.forEach(element => {
      const titleElement = element.querySelector('h2, .section-header, strong');
      const title = titleElement?.textContent?.trim() || '';
      
      const content: string[] = [];
      const textContent = element.textContent || '';
      
      // Split content into meaningful lines
      const lines = textContent.split('\n').filter(line => line.trim().length > 0);
      
      lines.forEach(line => {
        const cleanLine = line.trim().replace(/\s+/g, ' ');
        if (cleanLine && cleanLine !== title) {
          content.push(cleanLine);
        }
      });

      if (content.length > 0) {
        sections.push({ title, content });
      }
    });

    return sections;
  }
}

// Export utility function for easy use
export const generateIntelligentPDF = async (
  htmlContent: string,
  filename: string,
  options: {
    containerWidth?: number;
    scale?: number;
    fallbackToText?: boolean;
  } = {}
): Promise<void> => {
  const generator = new IntelligentPdfGenerator();
  
  try {
    await generator.generatePDF(htmlContent, {
      filename,
      containerWidth: options.containerWidth || 800,
      scale: options.scale || 2
    });
  } catch (error) {
    console.error('Intelligent PDF generation failed, falling back to text PDF:', error);
    
    if (options.fallbackToText !== false) {
      await generator.generateTextPDF(htmlContent, filename);
    } else {
      throw error;
    }
  }
};