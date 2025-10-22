import { Quote } from '@/stores/quotes/quotesStore';

/**
 * Adds section header repetition logic to HTML content
 * This ensures section headers are repeated when content continues on next page
 */
function addSectionHeaderRepetition(html: string): string {
  // Enhanced approach: Add explicit continuation detection
  const sectionsToRepeat = [
    { class: 'panels-section', title: 'PANELS:' },
    { class: 'terms-section', title: 'GENERAL NOTES AND TERMS:' }
  ];
  
  sectionsToRepeat.forEach(({ class: sectionClass, title }) => {
    // Find sections and add continuation markers
    const sectionRegex = new RegExp(
      `(<div class="${sectionClass}"[^>]*>\\s*)(<h2[^>]*>[^<]+</h2>)([\\s\\S]*?)(</div>)`,
      'gi'
    );
    
    html = html.replace(sectionRegex, (match, openTag, originalHeader, content, closeTag) => {
      let processedContent = content;
      
      if (sectionClass === 'panels-section') {
        // Add continuation header element after original header
        const continuationHeader = `
          <div class="section-continuation-marker" data-section="panels" style="position: absolute; top: -1000px;">
            <h2 class="section-header continuation-header">${title}</h2>
          </div>
        `;
        
        // Mark paragraphs for potential continuation headers
        processedContent = processedContent.replace(
          /<p class="wall-paragraph"([^>]*)>/gi, 
          (_match: string, attrs: string) => {
            return `<p class="wall-paragraph"${attrs} data-continuation-header="${title}">`;
          }
        );
        
        return openTag + originalHeader + continuationHeader + processedContent + closeTag;
      }
      
      if (sectionClass === 'terms-section') {
        // Add continuation header element after original header  
        const continuationHeader = `
          <div class="section-continuation-marker" data-section="terms" style="position: absolute; top: -1000px;">
            <h2 class="section-header continuation-header">${title}</h2>
          </div>
        `;
        
        // Mark term items for potential continuation headers
        processedContent = processedContent.replace(
          /<div class="term-item"([^>]*)>/gi,
          (_match: string, attrs: string) => {
            return `<div class="term-item"${attrs} data-continuation-header="${title}">`;
          }
        );
        
        return openTag + originalHeader + continuationHeader + processedContent + closeTag;
      }
      
      return match;
    });
  });
  
  return html;
}

export const generateQuotePDF = async (
  quote: Quote, 
  markAsDownloaded: (id: string) => Promise<any>
) => {
  
  if (!quote.quote_details?.quoteName && !quote.project_name) {
    console.error('❌ Quote name is missing');
    throw new Error('Quote name is required for PDF generation');
  }

  try {
    const quoteName = quote.project_name || quote.proposal_number || 'quote';
    
    // Create a new window with just the quote content for clean PDF generation
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }
    
    // Get the exact live preview content with all its styling
    const livePreviewPanel = document.querySelector('[data-testid="live-preview-panel"]');
    if (!livePreviewPanel) {
      throw new Error('No live preview panel found');
    }
    
    // Extract all CSS rules that apply to the live preview
    const allStyles = Array.from(document.styleSheets)
      .map(styleSheet => {
        try {
          return Array.from(styleSheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n');
        } catch (e) {
          return '';
        }
      })
      .join('\n');
    
    // Get the quote documents with their complete structure
    const quoteDocuments = document.querySelectorAll('.quote-document');
    if (quoteDocuments.length === 0) {
      throw new Error('No quote document elements found');
    }
    
    // Process content to add section header repetition logic
    let quotePagesHTML = Array.from(quoteDocuments)
      .map(doc => doc.outerHTML)
      .join('');
    
    // Add CSS-based section header repetition using CSS counters and content
    quotePagesHTML = addSectionHeaderRepetition(quotePagesHTML);
    
    const cleanHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${quoteName}</title>
          <style>
            /* Import all existing styles from the live preview */
            ${allStyles}
            
            @page {
              size: letter;
              margin: 0.75in;
              /* Remove browser default headers and footers */
              @top-left { content: none; }
              @top-center { content: none; }
              @top-right { content: none; }
              @bottom-left { content: none; }
              @bottom-center { content: none; }
              @bottom-right { content: none; }
            }
            
            @media print {
              body {
                margin: 0;
                padding: 0;
                background: white;
                color: black;
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
              }
              
              /* Hide UI elements that shouldn't be in PDF */
              .live-preview-controls,
              .editor-panel,
              .zoom-controls,
              .page-break-indicator,
              [data-testid="live-preview-panel"] > div:first-child,
              .py-8.px-4.pb-20 {
                display: none !important;
              }
              
              /* Remove interactive hover effects for print */
              [class*="-section"]:hover::after,
              .proposal-intro-section:hover::after,
              .pocket-doors-section:hover::after,
              .pass-doors-section:hover::after {
                display: none !important;
              }
              
              [class*="-section"]:hover,
              .proposal-intro-section:hover,
              .pocket-doors-section:hover,
              .pass-doors-section:hover {
                background-color: transparent !important;
                box-shadow: none !important;
              }
              
              /* Remove all interactive styles from sections during print */
              .proposal-intro-section,
              .pocket-doors-section,
              .pass-doors-section,
              [class*="-section"] {
                cursor: default !important;
                transition: none !important;
                border-radius: 0 !important;
              }
              
              /* Ensure quote document styling is preserved */
              .quote-document {
                background: white !important;
                box-shadow: none !important;
                transform: none !important;
                margin: 0 !important;
                width: 100% !important;
                height: auto !important;
              }
              
              /* Handle page breaks naturally */
              .split-page-content {
                transform: none !important;
                margin-bottom: 0 !important;
                page-break-after: auto;
              }
              
              .split-page-content:last-child {
                page-break-after: avoid;
              }
              
              /* Keep only essential layout sections together */
              .header-section,
              .billing-job-container,
              .wall-specifications-list {
                page-break-inside: avoid;
              }
              
              /* Allow all content sections to flow dynamically - no block protection */
              .panels-section,
              .tracks-section,
              .support-section,
              .pocket-doors-section,
              .pass-doors-section,
              .general-notes-section,
              .terms-section {
                page-break-inside: auto;
                page-break-after: auto;
              }
              
              /* Ensure section headers match live preview exactly */
              h2.section-header {
                font-weight: bold !important;
                font-size: 12pt !important;
                margin-top: 1.5em !important;
                margin-bottom: 0.5em !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                orphans: 3;
                widows: 3;
              }
              
              /* Keep section headers with their content */
              .panels-section,
              .tracks-section,
              .support-section,
              .pocket-doors-section,
              .pass-doors-section,
              .general-notes-section,
              .terms-section {
                orphans: 2;
                widows: 2;
              }
              
              /* Ensure first content after header stays with header */
              h2.section-header + p,
              h2.section-header + div,
              h2.section-header + * {
                page-break-before: avoid !important;
              }
              
              /* Enhanced section header repetition for page breaks */
              .section-continuation-header {
                display: none !important;
              }
              
              /* Force headers to stay with content and maintain spacing */
              .panels-section h2,
              .terms-section h2 {
                page-break-after: avoid !important;
                keep-with-next: always !important;
                margin-top: 1.5em !important;
                margin-bottom: 0.5em !important;
              }
              
              /* Ensure first content item stays with header */
              .panels-section h2 + p,
              .terms-section h2 + div,
              .panels-section h2 + *,
              .terms-section h2 + * {
                page-break-before: avoid !important;
                margin-top: 0 !important;
              }
              
              /* Prevent section headers from being orphaned */
              .panels-section,
              .terms-section {
                page-break-inside: auto !important;
                orphans: 3 !important;
                widows: 3 !important;
              }
              
              /* Show continuation headers using data attributes */
              p[data-continuation-header]::before,
              div[data-continuation-header]::before {
                content: attr(data-continuation-header);
                display: block;
                font-weight: bold !important;
                font-size: 12pt !important;
                margin-top: 1.5em !important;
                margin-bottom: 0.5em !important;
                page-break-after: avoid !important;
                visibility: hidden; /* Hidden by default */
              }
              
              /* Show continuation header only when element starts on new page */
              @media print {
                /* Use page break detection */
                p[data-continuation-header]:first-child::before,
                div[data-continuation-header]:first-child::before {
                  visibility: visible;
                }
                
                /* Alternative: Show for elements that get pushed to new page */
                .wall-paragraph:first-of-type::before {
                  content: attr(data-continuation-header);
                  display: block;
                  font-weight: bold !important;
                  font-size: 12pt !important;
                  margin-top: 1.5em !important;
                  margin-bottom: 0.5em !important;
                  page-break-after: avoid !important;
                }
              }
              
              /* Ensure proper spacing for section content */
              .panels-section .wall-paragraph:first-of-type,
              .terms-section .term-item:first-of-type {
                margin-top: 0 !important;
                padding-top: 0 !important;
              }
              
              /* Force section headers to always appear with proper spacing */
              .panels-section > h2,
              .terms-section > h2 {
                margin-top: 1.5em !important;
                margin-bottom: 0.5em !important;
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
              
              /* Ensure section headers maintain proper spacing when splitting */
              h2.section-header {
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
                margin-top: 1.5em !important;
                margin-bottom: 0.5em !important;
                orphans: 3;
                widows: 3;
              }
              
              /* Better page break handling for sectioned content */
              .panels-section {
                orphans: 2;
                widows: 2;
              }
              
              .terms-section {
                orphans: 2; 
                widows: 2;
              }
              
              /* Ensure proper spacing is maintained on continued pages */
              .panel-wall-item,
              .term-item {
                page-break-inside: avoid;
                margin-bottom: 8px !important;
                orphans: 2;
                widows: 2;
              }
              
              /* Add top margin when content starts new page */
              .panel-wall-item:first-child,
              .term-item:first-child {
                margin-top: 0 !important;
              }
              
              /* Style continuation headers same as original headers */
              .continuation-header {
                font-weight: bold !important;
                font-size: 12pt !important;
                margin-top: 1.5em !important;
                margin-bottom: 0.5em !important;
                page-break-after: avoid !important;
              }
              
              /* Protect individual content items from splitting mid-content */
              .panel-wall-item,
              .track-section,
              .support-section,
              .pocket-doors-section,
              .pass-doors-section,
              .term-item,
              .payment-terms-item {
                page-break-inside: avoid;
                page-break-after: auto;
                margin-bottom: 12px;
              }
              
              /* Protect individual paragraphs and list items */
              .general-notes-section p,
              .terms-section p,
              .terms-section ol li,
              .terms-section div {
                page-break-inside: avoid;
                page-break-after: auto;
                margin-bottom: 6px;
              }
              
              /* Remove redundant section margins - let headers control spacing */
            }
            
            /* Base styles that match live preview */
            body {
              font-family: var(--page-font-family, 'Times New Roman', Times, serif);
              font-size: var(--page-font-size, 12pt);
              line-height: var(--page-line-height, 1.15);
              color: #000;
              background: white;
              margin: 0;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          ${quotePagesHTML}
          <script>
            // Auto-print when loaded
            window.addEventListener('load', function() {
              // Create a more professional print instruction overlay
              const overlay = document.createElement('div');
              overlay.innerHTML = \`
                <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                           background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
                           align-items: center; justify-content: center; font-family: Arial;">
                  <div style="background: white; padding: 30px; border-radius: 10px; 
                             max-width: 500px; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3);">
                    <h3 style="margin-top: 0; color: #333;">Clean PDF Print Settings</h3>
                    <p style="color: #666; line-height: 1.5;">For a professional PDF without headers/footers:</p>
                    <ol style="text-align: left; color: #666; margin: 20px 0;">
                      <li>In the print dialog, click <strong>"More settings"</strong></li>
                      <li>Uncheck <strong>"Headers and footers"</strong></li>
                      <li>This removes date/time and page numbers/URL</li>
                    </ol>
                    <button onclick="this.parentElement.parentElement.remove(); window.print();" 
                            style="background: #3B82F6; color: white; border: none; padding: 10px 20px; 
                                   border-radius: 5px; cursor: pointer; font-size: 14px;">
                      Continue
                    </button>
                  </div>
                </div>
              \`;
              document.body.appendChild(overlay);
              
              // Close window after print
              window.addEventListener('afterprint', function() {
                setTimeout(function() {
                  window.close();
                }, 500);
              });
            });
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(cleanHTML);
    printWindow.document.close();
    
    
    // Mark as downloaded (will increment version for next download)
    await markAsDownloaded(quote.id);
    
  } catch (error) {
    console.error('❌ Browser PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};