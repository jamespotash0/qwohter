import { Quote } from '@/hooks/useQuotes';

/**
 * Adds section header repetition logic to HTML content
 * This ensures section headers are repeated when content continues on next page
 */
function addSectionHeaderRepetition(html: string): string {
  // Add invisible header markers that will be shown via CSS when content continues on next page
  const sectionsToRepeat = [
    { class: 'panels-section', title: 'PANELS:' },
    { class: 'tracks-section', title: 'TRACK:' }, 
    { class: 'support-section', title: 'SUPPORT STRUCTURE (HEADER):' },
    { class: 'pocket-doors-section', title: 'POCKET DOORS:' },
    { class: 'pass-doors-section', title: 'PASS DOORS:' },
    { class: 'general-notes-section', title: 'General Notes and Terms:' },
    { class: 'terms-section', title: 'ACCEPTANCE OF PROPOSAL:' }
  ];
  
  sectionsToRepeat.forEach(({ class: sectionClass, title }) => {
    // Find individual items within sections and add continuation headers
    const sectionRegex = new RegExp(
      `(<div class="${sectionClass}"[^>]*>)([\\s\\S]*?)(</div>)`,
      'gi'
    );
    
    html = html.replace(sectionRegex, (match, openTag, content, closeTag) => {
      // Add continuation header before each major item that could be moved to next page
      const itemPatterns = [
        /<div class="panel-wall-item"[^>]*>/gi,
        /<div class="term-item"[^>]*>/gi,
        /<div class="payment-terms-item"[^>]*>/gi,
        /<p[^>]*>/gi
      ];
      
      let processedContent = content;
      
      itemPatterns.forEach(pattern => {
        processedContent = processedContent.replace(pattern, (itemMatch: string) => {
          return `<div class="section-continuation-header" style="display: none;">
            <h2 class="section-header continuation-header">${title}</h2>
          </div>
          ${itemMatch}`;
        });
      });
      
      return openTag + processedContent + closeTag;
    });
  });
  
  return html;
}

export const generateQuotePDF = async (
  quote: Quote, 
  markAsDownloaded: (id: string) => Promise<any>
) => {
  console.log('🔍 Starting browser-native PDF generation for quote:', quote.proposal_number);
  
  if (!quote.quote_details?.quoteName && !quote.project_name) {
    console.error('❌ Quote name is missing');
    throw new Error('Quote name is required for PDF generation');
  }

  try {
    const quoteName = quote.project_name || quote.proposal_number || 'quote';
    console.log('📝 Quote name:', quoteName);
    
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
              [class*="-section"]:hover::after {
                display: none !important;
              }
              
              [class*="-section"]:hover {
                background-color: transparent !important;
                box-shadow: none !important;
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
              
              /* Section continuation headers - show when content moves to new page */
              .section-continuation-header {
                display: none; /* Hidden by default */
              }
              
              /* Show continuation header when item starts on a new page */
              .panel-wall-item,
              .term-item,
              .payment-terms-item {
                page-break-before: auto;
              }
              
              /* When an item is the first element on a page, show its continuation header */
              @media print {
                .panel-wall-item:first-child .section-continuation-header,
                .term-item:first-child .section-continuation-header,
                .payment-terms-item:first-child .section-continuation-header {
                  display: block !important;
                }
                
                /* Show continuation header when item appears at top of page after page break */
                .panel-wall-item[style*="page-break-before"] .section-continuation-header,
                .term-item[style*="page-break-before"] .section-continuation-header,
                .payment-terms-item[style*="page-break-before"] .section-continuation-header {
                  display: block !important;
                }
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
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 1000);
              }, 500);
            });
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(cleanHTML);
    printWindow.document.close();
    
    console.log('✅ PDF generation initiated successfully');
    
    // Mark as downloaded (will increment version for next download)
    await markAsDownloaded(quote.id);
    
  } catch (error) {
    console.error('❌ Browser PDF generation failed:', error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};