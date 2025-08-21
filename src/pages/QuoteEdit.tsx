import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import UnifiedQuoteEditor from "@/components/features/quotes/editing/UnifiedQuoteEditor";
import { SmartQuoteData } from "@/templates/SmartQuoteTemplate";

const QuoteEdit = () => {
  const { proposalNumber, versionDownloaded } = useParams<{
    proposalNumber: string;
    versionDownloaded: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    updateQuote,
    markAsDownloaded,
    saveQuoteCustomization,
    refreshQuotes
  } = useQuotes();

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };
    checkAuth();
  }, [navigate]);

  // Load quote based on URL parameters
  useEffect(() => {
    const loadQuote = async () => {
      if (!proposalNumber || !versionDownloaded || !user) return;

      try {
        setIsLoading(true);
        
        // Query for the quote based on proposal number and version
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('proposal_number', proposalNumber)
          .eq('version', parseInt(versionDownloaded) || 1);

        if (error) {
          throw error;
        }

        if (!quotes || quotes.length === 0) {
          toast({
            title: "Quote Not Found",
            description: `Quote with proposal number ${proposalNumber} and version ${versionDownloaded} not found.`,
            variant: "destructive",
          });
          navigate("/quotes");
          return;
        }

        const rawQuote = quotes[0];
        
        // Convert the database quote to the proper Quote type
        const loadedQuote: Quote = {
          ...rawQuote,
          wall_details: rawQuote.wall_details ? 
            (typeof rawQuote.wall_details === 'string' ? 
              JSON.parse(rawQuote.wall_details) : 
              rawQuote.wall_details) : 
            { id: '', walls: {} }
        } as Quote;
        
        setQuote(loadedQuote);
      } catch (error) {
        console.error('Error loading quote:', error);
        toast({
          title: "Error Loading Quote",
          description: "Failed to load the quote. Please try again.",
          variant: "destructive",
        });
        navigate("/quotes");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuote();
  }, [proposalNumber, versionDownloaded, user, navigate, toast]);

  const handleUnifiedQuoteSave = async (customizedQuote: SmartQuoteData) => {
    if (!quote) return;

    try {
      // First, save the form data changes to the main quote data
      const { customSections, customHTML, isCustomized, ...formDataUpdates } = customizedQuote;
      
      // Ensure wall_details has required id field if it exists
      const updates: Partial<Quote> = {
        ...formDataUpdates,
        ...(formDataUpdates.wall_details && {
          wall_details: {
            id: formDataUpdates.wall_details.id || quote.wall_details?.id || '',
            walls: formDataUpdates.wall_details.walls || {}
          }
        })
      };
      
      // Update the main quote data with form changes
      await updateQuote(quote.id, updates);
      
      // Then, save customizations if they exist
      if (customSections) {
        await saveQuoteCustomization(quote.id, {
          customSections: customSections,
          customHTML: customHTML,
          isCustomized: isCustomized || true,
          lastModified: new Date(),
          version: 1
        });
      }
      
      refreshQuotes();
      
      toast({
        title: "Quote Saved",
        description: "All changes have been saved successfully.",
      });
      
    } catch (error) {
      console.error('Save error:', error);
      // Error handling is done in updateQuote and saveQuoteCustomization
    }
  };

  const handleUnifiedQuoteDownload = async (html: string, isSmartPDF: boolean = false) => {
    console.log('🔍 Starting unified quote download, isSmartPDF:', isSmartPDF);
    console.log('📄 HTML length:', html.length);
    
    if (!quote) {
      console.error('❌ No quote available');
      return;
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
        
        const pdf = new (await import('jspdf')).default('p', 'mm', 'letter');
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
          
          // Calculate proper scaling - but never compress content smaller than natural size
          
          // Use a fixed scale that maintains readability rather than fitting to page
          // This ensures text isn't compressed and remains readable
          const scale = 0.75; // Slightly smaller than full size but maintains readability
          const finalWidth = pdfWidth * scale;
          const finalHeight = (canvas.height * finalWidth) / canvas.width;
          
          // Center the content on the page
          const xOffset = (pdfWidth - finalWidth) / 2;
          const yOffset = Math.max(0, (pdfHeight - finalHeight) / 2); // Don't use negative offset
          
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
        const fileName = `${quoteName}_v${currentVersion}_${dateStr}_live.pdf`;
        pdf.save(fileName);

        await markAsDownloaded(quote.id);
        
        toast({
          title: "PDF Downloaded",
          description: `Quote ${quote.proposal_number} downloaded successfully from live preview (${quoteDocuments.length} pages).`,
        });
        
        return; // Exit early since we used the live preview
      }
      
      // Fallback to original method if live preview not found
      console.log('⚠️ Live preview not found, using fallback method');
      
      // Create temp div with exactly the same styling as the live preview
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.className = 'quote-preview-content'; // Use same class as live preview
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

      try {
        const html2canvas = (await import('html2canvas')).default;
        
        // Check if content has page structure
        const pageElements = tempDiv.querySelectorAll('.page');
        console.log('📑 Found page elements:', pageElements.length);
        
        if (pageElements.length > 0) {
          // Handle multi-page content
          console.log('📑 Processing multi-page content...');
          const pdf = new (await import('jspdf')).default('p', 'mm', 'letter');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          for (let i = 0; i < pageElements.length; i++) {
            console.log(`📄 Processing page ${i + 1} of ${pageElements.length}`);
            const pageElement = pageElements[i] as HTMLElement;
            
            const canvas = await html2canvas(pageElement, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              width: pageElement.scrollWidth,
              height: pageElement.scrollHeight,
              logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (i > 0) {
              pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
          }
          
          // Save multi-page PDF
          const currentVersion = quote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_multi.pdf`;
          pdf.save(fileName);
          
        } else if (isSmartPDF) {
          // Smart PDF mode - simplified implementation
          const pdf = new (await import('jspdf')).default('p', 'mm', 'letter');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
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
          console.log('🖼️ Canvas dimensions:', canvas.width, 'x', canvas.height);
          console.log('🖼️ Image data length:', imgData.length);
          console.log('🖼️ Image data preview:', imgData.substring(0, 100));
          
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          console.log('📄 PDF dimensions:', imgWidth, 'x', imgHeight);
          
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
          
          // Save Smart PDF with specific naming
          const currentVersion = quote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_smart.pdf`;
          pdf.save(fileName);
          
        } else {
          // Fallback: No page elements found, split content intelligently
          console.log('📄 No page structure found, using intelligent splitting...');
          
          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: tempDiv.scrollWidth,
            height: tempDiv.scrollHeight,
            logging: false,
            removeContainer: false
          });

          const imgData = canvas.toDataURL('image/png');
          console.log('🖼️ Canvas dimensions (fallback):', canvas.width, 'x', canvas.height);
          console.log('🖼️ Image data length (fallback):', imgData.length);
          
          const pdf = new (await import('jspdf')).default('p', 'mm', 'letter');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          console.log('📄 PDF dimensions (fallback):', imgWidth, 'x', imgHeight);

          // Smart page splitting - avoid cutting content mid-section
          const maxHeightPerPage = pdfHeight * 0.95; // Leave some margin
          let heightLeft = imgHeight;
          let position = 0;
          let pageCount = 0;

          // First page
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, Math.min(imgHeight, maxHeightPerPage));
          heightLeft -= maxHeightPerPage;
          pageCount++;

          // Additional pages if needed
          while (heightLeft > 0) {
            position = -(pageCount * maxHeightPerPage);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= maxHeightPerPage;
            pageCount++;
          }

          console.log('📑 Created PDF with', pageCount, 'pages');

          const currentVersion = quote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_split.pdf`;
          pdf.save(fileName);
        }
      } catch (canvasError) {
        console.error('Canvas rendering failed:', canvasError);
        throw canvasError;
      }
      
      // Clean up DOM elements
      document.body.removeChild(tempDiv);
      
      // Mark as downloaded
      await markAsDownloaded(quote.id);
      
      toast({
        title: "PDF Downloaded",
        description: `Customized quote ${quote.proposal_number} has been downloaded successfully.`,
      });
      
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate("/quotes");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading quote...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Quote not found</div>
      </div>
    );
  }

  return (
    <UnifiedQuoteEditor
      quote={quote}
      onSave={handleUnifiedQuoteSave}
      onDownload={handleUnifiedQuoteDownload}
      onBack={handleBack}
    />
  );
};

export default QuoteEdit;