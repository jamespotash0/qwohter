import jsPDF from 'jspdf';
import { Quote } from '@/hooks/useQuotes';

export const generateQuotePDF = async (quote: Quote, markAsDownloaded: (id: string) => Promise<any>) => {
  console.log('🔍 Starting PDF generation for quote:', quote.proposal_number);
  
  if (!quote.quote_details?.quoteName && !quote.project_name) {
    console.error('❌ Quote name is missing');
    throw new Error('Quote name is required for PDF generation');
  }

  try {
    const quoteName = quote.project_name || quote.proposal_number || 'quote';
    console.log('📝 Quote name:', quoteName);
    
    // Find the live preview container with the actual page layout
    const quoteDocuments = document.querySelectorAll('.quote-document');
    console.log('🔍 Found quote document elements:', quoteDocuments.length);
    
    if (quoteDocuments.length > 0) {
      // Use the already-rendered preview directly - capture each page separately
      console.log('📸 Using live preview documents for PDF generation');
      
      const pdf = new jsPDF('p', 'mm', 'letter');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < quoteDocuments.length; i++) {
        console.log(`📄 Processing live preview page ${i + 1} of ${quoteDocuments.length}`);
        const pageElement = quoteDocuments[i] as HTMLElement;
        
        // Log font information for debugging
        const computedStyle = window.getComputedStyle(pageElement);
        console.log(`📝 Page ${i + 1} font family:`, computedStyle.fontFamily);
        console.log(`📝 Page ${i + 1} font size:`, computedStyle.fontSize);
        console.log(`📝 Page ${i + 1} dimensions:`, pageElement.offsetWidth, 'x', pageElement.offsetHeight);
        
        // Wait for fonts to load before capturing
        await document.fonts.ready;
        
        const canvas = await (await import('html2canvas')).default(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          removeContainer: false,
          width: pageElement.offsetWidth,
          height: pageElement.offsetHeight,
          onclone: (clonedDoc) => {
            // Ensure fonts are loaded in the cloned document
            clonedDoc.fonts.ready;
            // Force Times New Roman font
            const styleElement = clonedDoc.createElement('style');
            styleElement.textContent = `
              * { 
                font-family: "Times New Roman", Times, serif !important; 
                font-size: 12pt !important;
                line-height: 1.15 !important;
              }
            `;
            clonedDoc.head.appendChild(styleElement);
          }
        });
        
        const imgData = canvas.toDataURL('image/png');
        console.log(`🖼️ Page ${i + 1} canvas dimensions:`, canvas.width, 'x', canvas.height);
        
        // Use full page width - no scaling or centering that causes margins
        const finalWidth = pdfWidth;
        const finalHeight = (canvas.height * finalWidth) / canvas.width;
        
        // No offsets - fill the entire page like live preview
        const xOffset = 0;
        const yOffset = 0;
        
        console.log(`📄 Page ${i + 1} PDF sizing: ${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)} mm at offset (${xOffset.toFixed(1)}, ${yOffset.toFixed(1)})`);
        console.log(`📏 Page ${i + 1} canvas vs PDF ratio: canvas=${canvas.height}px, would be ${finalHeight.toFixed(1)}mm on PDF`);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        // Check if content would extend beyond page - if so, we may need multiple PDF pages
        if (finalHeight > pdfHeight) {
          console.log(`⚠️  Page ${i + 1} content is too tall (${finalHeight.toFixed(1)}mm > ${pdfHeight.toFixed(1)}mm), consider splitting`);
          // For now, let it extend beyond the page rather than compressing
          pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        } else {
          // Content fits normally on the page
          pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        }
      }
      
      console.log('📑 Created PDF from live preview with', quoteDocuments.length, 'pages');
      const currentVersion = quote.version || 1;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-CA');
      const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
      
      pdf.save(fileName);
      console.log('✅ PDF generation completed successfully');
      
      // Mark as downloaded (will increment version for next download)
      await markAsDownloaded(quote.id);
      
    } else {
      console.error('❌ No quote document elements found in live preview');
      throw new Error('No quote document elements found. Please ensure the live preview is loaded.');
    }
    
  } catch (error) {
    console.error('❌ PDF generation failed with error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};