import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import UnifiedQuoteEditor from "@/components/features/quotes/editing/UnifiedQuoteEditor";
import { SmartQuoteData } from "@/templates/SmartQuoteTemplate";
// import { WallDetails } from "@/types/quote";

const QuoteEdit = () => {
  const { proposalNumber } = useParams<{
    proposalNumber: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    updateQuote,
    updateWallSystem,
    removeWallSystem,
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
      if (!proposalNumber || !user) return;

      try {
        setIsLoading(true);
        
        // Query for the quote based on proposal number only (get the latest version)
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('proposal_number', proposalNumber)
          .order('version', { ascending: false })
          .limit(1);

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
        await saveQuoteCustomization(quote.id, {
          customSections: customSections,
          customHTML: customHTML,
          isCustomized: isCustomized || true,
          lastModified: new Date()
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
    console.log('🔍 Starting unified quote download with live preview HTML');
    
    if (!quote) {
      console.error('❌ No quote available');
      return;
    }
    
    if (!html) {
      console.error('❌ No HTML content provided for PDF generation');
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
      console.error('❌ PDF download failed:', error);
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