/**
 * Smart page break utility that prevents content from being cut at page breaks
 * by dynamically calculating spacing needed to push sections to the next page
 */

interface PageBreakOptions {
  pageHeight?: number; // in pixels, approximate page height for A4 at scale 2
  currentPosition?: number; // current vertical position
  sectionMinHeight?: number; // minimum height to keep together
}

export const calculateSmartPageBreak = (
  htmlContent: string,
  options: PageBreakOptions = {}
): string => {
  const {
    pageHeight = 1123, // A4 at scale 2 (595 * 2 - margins)
    sectionMinHeight = 100
  } = options;

  // Create a temporary div to measure content sections
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '794px'; // A4 width at scale 2
  tempDiv.style.visibility = 'hidden';
  tempDiv.innerHTML = htmlContent;
  document.body.appendChild(tempDiv);

  try {
    // Find the static page break marker
    const pageBreakMarker = tempDiv.querySelector('[style*="height: 120px"]') as HTMLElement;
    if (!pageBreakMarker) {
      document.body.removeChild(tempDiv);
      return htmlContent;
    }

    // Get position of the page break marker
    const markerTop = pageBreakMarker.offsetTop;
    
    // Find all content sections that come after the page break
    const sectionsAfterBreak = tempDiv.querySelectorAll('.pocket-doors-section, .support-section, .general-section, .pricing-section, .terms-section, .signature-section, .acceptance-section');
    
    if (sectionsAfterBreak.length === 0) {
      document.body.removeChild(tempDiv);
      return htmlContent;
    }

    // Get the first section after the break to measure
    const firstSectionAfterBreak = sectionsAfterBreak[0] as HTMLElement;
    const firstSectionTop = firstSectionAfterBreak.offsetTop;
    const firstSectionHeight = firstSectionAfterBreak.offsetHeight;

    // Calculate which page we're on and remaining space
    const currentPage = Math.floor(markerTop / pageHeight);
    const positionOnCurrentPage = markerTop - (currentPage * pageHeight);
    const remainingSpaceOnPage = pageHeight - positionOnCurrentPage;

    // If the section would be cut (not enough space for minimum height), 
    // calculate extra spacing needed to push to next page
    let dynamicSpacing = 120; // default spacing
    
    if (firstSectionHeight > sectionMinHeight && remainingSpaceOnPage < firstSectionHeight + 50) {
      // Push to next page by adding extra spacing
      dynamicSpacing = remainingSpaceOnPage + 50; // 50px buffer
    }

    // Replace the static spacing with dynamic spacing
    const updatedContent = htmlContent.replace(
      '<div style="height: 120px;"></div>',
      `<div style="height: ${dynamicSpacing}px;"></div>`
    );

    document.body.removeChild(tempDiv);
    return updatedContent;

  } catch (error) {
    console.error('Error calculating smart page break:', error);
    document.body.removeChild(tempDiv);
    return htmlContent; // Return original content if measurement fails
  }
};

/**
 * Enhanced version that handles multiple sections and their spacing
 */
export const optimizeContentLayout = (htmlContent: string): string => {
  // Create temporary container for measurement
  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = '794px'; // A4 width at scale 2
  tempContainer.style.visibility = 'hidden';
  tempContainer.innerHTML = htmlContent;
  document.body.appendChild(tempContainer);

  try {
    const pageHeight = 1123; // A4 height at scale 2
    let optimizedContent = htmlContent;

    // Find sections that might need spacing adjustments
    const criticalSections = [
      '.pocket-doors-section',
      '.panel-doors-section',
      '.support-section', 
      '.general-section',
      '.pricing-section',
      '.terms-section'
    ];

    // Check each section and add appropriate spacing
    criticalSections.forEach(selectorClass => {
      const section = tempContainer.querySelector(selectorClass) as HTMLElement;
      if (section) {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        
        // Calculate page position
        const currentPage = Math.floor(sectionTop / pageHeight);
        const positionOnPage = sectionTop - (currentPage * pageHeight);
        const remainingSpace = pageHeight - positionOnPage;
        
        // If section would be cut and it's substantial content, try to push it
        if (sectionHeight > 80 && remainingSpace < sectionHeight && remainingSpace < pageHeight * 0.7) {
          // Find if there's content before this section we can add spacing to
          const prevElement = section.previousElementSibling as HTMLElement;
          if (prevElement && !prevElement.querySelector('.pricing-section')) {
            // Add spacing before this section to push it to next page
            const spacingNeeded = remainingSpace + 20;
            section.style.marginTop = `${spacingNeeded}px`;
          }
        }
      }
    });

    // Get the updated HTML
    optimizedContent = tempContainer.innerHTML;
    document.body.removeChild(tempContainer);
    
    return optimizedContent;

  } catch (error) {
    console.error('Error optimizing content layout:', error);
    document.body.removeChild(tempContainer);
    return htmlContent;
  }
};