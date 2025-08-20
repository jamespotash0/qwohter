import jsPDF from 'jspdf';
import { Quote } from '@/hooks/useQuotes';

export const generateQuotePDF = async (quote: Quote, markAsDownloaded: (id: string) => Promise<any>) => {
  console.log('🔍 Starting PDF generation for quote:', quote.proposal_number);
  
  if (!quote.quote_details?.quoteName && !quote.project_name) {
    console.error('❌ Quote name is missing');
    throw new Error('Quote name is required for PDF generation');
  }

  try {
    console.log('📝 Importing quote generation modules...');
    const { generateQuoteText } = await import('@/components/features/quotes/generation/QuoteTextGenerator');
    const { PageBreakManager } = await import('@/utils/pageBreakManager');
   
    console.log('🔨 Generating quote text...');
    const rawQuoteText = generateQuoteText(quote);
    console.log('✅ Raw quote text generated, length:', rawQuoteText.length);
    console.log('📄 First 200 chars:', rawQuoteText.substring(0, 200));
    
    const manager = new PageBreakManager();
    let quoteText = manager.processHTMLContent(rawQuoteText);
    console.log('✅ Page break processing complete, final length:', quoteText.length);
  
  // If no page structure was created, force create a single page wrapper
  if (!quoteText.includes('class="page"')) {
    quoteText = `<div class="page" data-page="1"><div class="page-content">${rawQuoteText}</div></div>`;
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = quoteText;
  tempDiv.style.cssText = `
    font-family: "Times New Roman", serif;
    font-size: 12pt;
    line-height: 1.15;
    width: 8.5in;
    margin: 0 auto;
    padding: 48px;
    color: black;
    background: white;
    position: absolute;
    left: -9999px;
    top: 0px;
    visibility: visible;
    pointer-events: none;
  `;

  // Add enhanced styles for the header layout
  const style = document.createElement('style');
  style.textContent = `
    .quote-container {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.15;
      width: 8.5in;
      margin: 0 auto;
      color: black;
    }
    
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
    }
    
    .company-info {
      flex: 1;
      max-width: 40%;
    }
    
    .company-logo {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .logo-placeholder {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #3B82F6, #F59E0B);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16pt;
      border-radius: 8px;
    }
    
    .company-name {
      font-size: 14pt;
      font-weight: bold;
      color: #333;
      line-height: 1.2;
    }
    
    .contact-details {
      flex: 1;
      max-width: 55%;
      text-align: right;
    }
    
    .contact-row {
      margin-bottom: 2px;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      line-height: 1.15;
    }
    
    .contact-row .label {
      font-weight: bold;
      margin-right: 8px;
      min-width: 80px;
      text-align: right;
    }
    
    .contact-row .value {
      text-align: left;
      flex: 1;
    }
    
    .website-link {
      color: #3B82F6;
      text-decoration: underline;
    }
    
    .billing-and-job-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      gap: 40px;
    }
    
    .billing-section {
      flex: 1;
      max-width: 45%;
    }
    
    .billed-to-details {
      margin-top: 10px;
    }
    
    .billed-line {
      margin-bottom: 2px;
      min-height: 20px;
      padding-bottom: 4px;
    }
    
    .underline {
      height: 1px;
      background-color: black;
      margin-bottom: 8px;
      width: 100%;
    }
    
    .job-info-section {
      flex: 1;
      max-width: 50%;
    }
    
    .job-row {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      position: relative;
    }
    
    .job-label {
      font-weight: bold;
      margin-right: 20px;
      min-width: 120px;
    }
    
    .job-value {
      flex: 1;
      padding-bottom: 2px;
    }
    
    .job-underline {
      position: absolute;
      bottom: 0;
      right: 0;
      left: 140px;
      height: 1px;
      background-color: black;
    }
    
    h2.section-header {
      font-weight: bold;
      font-size: 12pt;
      margin-top: 1.5em;
      margin-bottom: 0.5em;
    }
    
    .wall-specifications {
      line-height: 1.15;
      max-width: 7.25in;
    }
    
    .acceptance-section {
      font-size: 9pt;
      font-style: italic;
      margin-top: 2em;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
    }
    
    td {
      padding: 4px 8px;
    }
    
    strong {
      font-weight: bold;
    }
    
    ol, ul {
      margin: 0;
      padding-left: 20px;
    }
    
    li {
      margin-bottom: 4px;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(tempDiv);

  try {
    // Try HTML-to-canvas rendering first with enhanced page support
    const html2canvas = (await import('html2canvas')).default;
    
    // Check if content has page structure
    const pageElements = tempDiv.querySelectorAll('.page');
    
    if (pageElements.length > 0) {
      // Handle multi-page content
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement;
        
        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: pageElement.scrollWidth,
          height: pageElement.scrollHeight,
          logging: true,
          removeContainer: false
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      }
      
      // Save the PDF
      const currentVersion = quote.version || 1;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-CA');
      const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
      
      const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
      pdf.save(fileName);
      
    } else {
      // Single page fallback
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: tempDiv.scrollWidth,
        height: tempDiv.scrollHeight,
        logging: true,
        removeContainer: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Use current version (starts at 1) and increment after download
      const currentVersion = quote.version || 1;
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-CA');
      const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
      
      const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
      pdf.save(fileName);
    }
  } catch (canvasError) {
    console.error('❌ Canvas rendering failed, falling back to text PDF:', canvasError);
    
    // Fallback to text-based PDF if HTML rendering fails
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const plainText = rawQuoteText.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    const splitText = doc.splitTextToSize(plainText, 180);
    doc.setFontSize(10);
    let y = 20;
    const lineHeight = 5;
    
    splitText.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += lineHeight;
    });
    
    const currentVersion = quote.version || 1;
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA');
    const quoteName = quote.quote_details?.quoteName || quote.project_name || quote.proposal_number;
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Version: ${currentVersion}`, 15, 290);
    
    const fileName = `${quoteName}_v${currentVersion}_${dateStr}.pdf`;
    doc.save(fileName);
  }
  
  // Clean up DOM elements
  document.body.removeChild(tempDiv);
  document.head.removeChild(style);
  
  console.log('✅ PDF generation completed successfully');
  
  // Mark as downloaded (will increment version for next download)
  await markAsDownloaded(quote.id);
  
  } catch (error) {
    console.error('❌ PDF generation failed with error:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
};