import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Quote, useUpdateQuote } from "@/stores/quotes/quotesStore";
import { useToast } from "@/hooks/use-toast";
import UnifiedQuoteEditor from "@/components/features/quotes/editing/UnifiedQuoteEditor";
import { SmartQuoteData } from "@/templates/SmartQuoteTemplate";
import { useUser } from "@/auth";
// import { WallDetails } from "@/types/quote";

const QuoteEdit = () => {
  const { proposalNumber } = useParams<{
    proposalNumber: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ✅ v3.0.0: Use new auth hook
  const user = useUser();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use React Query mutation hook
  const { mutateAsync: updateQuoteMutation } = useUpdateQuote();

  // Wrapper functions for backward compatibility with UnifiedQuoteEditor
  const updateQuote = async (id: string, updates: any) => {
    return await updateQuoteMutation({ id, updates });
  };

  // These were convenience wrappers that called updateQuote
  const updateWallSystem = async (quoteId: string, wallName: string, wallData: any) => {
    return await updateQuoteMutation({
      id: quoteId,
      updates: {
        wall_details: {
          walls: { [wallName]: wallData }
        }
      }
    });
  };

  const removeWallSystem = async (quoteId: string, wallName: string) => {
    return await updateQuoteMutation({ id: quoteId, updates: { wall_details: { id: '', walls: {} } } });
  };

  const markAsDownloaded = async (id: string) => {
    return await updateQuoteMutation({ id, updates: { date_last_downloaded: new Date().toISOString() } });
  };

  const saveQuoteCustomization = async (id: string, customization: any, currentDocumentVersion: number) => {
    // Increment document version when customization changes
    const newDocumentVersion = currentDocumentVersion + 1;

    // Store the new document version in customization metadata
    const customizationWithVersion = {
      ...customization,
      version: newDocumentVersion
    };

    return await updateQuoteMutation({
      id,
      updates: {
        customization: customizationWithVersion,
        document_version: newDocumentVersion
      }
    });
  };

  // React Query automatically refetches, no manual fetch needed
  const fetchQuotes = () => {
    // No-op: React Query handles this automatically
  };

  // Alias for compatibility
  const refreshQuotes = fetchQuotes;

  // Check authentication
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Load quote based on URL parameters
  useEffect(() => {
    const loadQuote = async () => {
      if (!proposalNumber || !user) return;

      try {
        setIsLoading(true);
        
        // Query for the quote based on proposal number only (get the latest version)
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('proposal_number', proposalNumber)
          .order('version', { ascending: false })
          .limit(1)
          .returns<Quote[]>();

        if (error) {
          throw error;
        }

        if (!quotes || quotes.length === 0) {
          toast({
            title: "Quote Not Found",
            description: `Quote with proposal number ${proposalNumber} not found.`,
            variant: "destructive",
          });
          navigate("/quotes");
          return;
        }

        const rawQuote = quotes[0];
        
        if (!rawQuote) {
          throw new Error('Quote not found');
        }
        
        // Convert the database quote to the proper Quote type
        const loadedQuote: Quote = {
          ...rawQuote as any,
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
  }, [proposalNumber, user, navigate, toast]);

  const handleUnifiedQuoteSave = async (customizedQuote: SmartQuoteData) => {
    if (!quote) return;

    try {
      // First, save the form data changes to the main quote data
      const { customSections, customHTML, isCustomized, wall_details, ...formDataUpdates } = customizedQuote;
      
      // Create updates object excluding wall_details first
      const updates: Partial<Quote> = {
        ...formDataUpdates
      };
      
      // Handle wall_details separately to ensure proper typing
      if (wall_details) {
        updates.wall_details = {
          id: wall_details.id || quote.wall_details?.id || crypto.randomUUID(),
          walls: wall_details.walls || {}
        };
      }
      
      // Update the main quote data with form changes
      await updateQuote(quote.id, updates);
      
      // Then, save customizations if they exist
      if (customSections) {
        const currentDocumentVersion = quote.document_version || 0;
        await saveQuoteCustomization(quote.id, {
          customSections: customSections,
          customHTML: customHTML,
          isCustomized: isCustomized || true,
          lastModified: new Date()
        }, currentDocumentVersion);
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
    
    if (!quote) {
      // console.error('❌ No quote available');
      return;
    }
    
    if (!html) {
      // console.error('❌ No HTML content provided for PDF generation');
      toast({
        title: "Download failed",
        description: "No preview content available. Please wait for the preview to load.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Create a temporary container with the exact live preview HTML
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.visibility = 'hidden';
      tempContainer.innerHTML = html;
      document.body.appendChild(tempContainer);
      
      try {
        // Use the centralized PDF generation utility
        const { generateQuotePDF } = await import('@/utils/playwrightPdfUtils');
        await generateQuotePDF(quote, markAsDownloaded);
        
        toast({
          title: "PDF Downloaded",
          description: `Quote ${quote.proposal_number} downloaded successfully.`,
        });
      } finally {
        // Clean up the temporary container
        document.body.removeChild(tempContainer);
      }
      
    } catch (error) {
      // console.error('❌ PDF download failed:', error);
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
      onUpdateWallSystem={updateWallSystem}
      onRemoveWallSystem={removeWallSystem}
    />
  );
};

export default QuoteEdit;