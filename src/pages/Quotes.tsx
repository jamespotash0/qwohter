import { useState, useEffect } from "react";
import { Building2, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/layout";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import UnifiedQuoteEditor from "@/components/features/quotes/editing/UnifiedQuoteEditor";
import { SmartQuoteData } from "@/templates/SmartQuoteTemplate";
import { QuotesTable, QuoteFilters, QuotePagination } from "@/components/features/quotes/table";

const Quotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const {
    quotes,
    updateQuote,
    deleteQuote: deleteQuoteFromDB,
    markAsDownloaded,
    saveQuoteCustomization,
    refreshQuotes
  } = useQuotes();

  const { currentOrganization } = useOrganizations();
  const { profile } = useUserProfile(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const filteredQuotes = quotes.filter(quote => {
    const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "";
    const projectName = quote.project_name || quote.quote_details?.project_name || "";
    
    const matchesSearch = clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.proposal_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || quote.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredQuotes.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedQuotes = filteredQuotes.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus]);

  const updateQuoteStatus = async (id: string, newStatus: string) => {
    await updateQuote(id, { status: newStatus });
  };

  const handleDeleteQuote = async (id: string) => {
    await deleteQuoteFromDB(id);
    setDeleteQuoteId(null);
  };

  const editQuote = (quote: Quote) => {
    setEditingQuote(quote);
  };

  const handleUnifiedQuoteSave = async (customizedQuote: SmartQuoteData) => {
    try {
      if (editingQuote) {
        // First, save the form data changes to the main quote data
        const { customSections, customHTML, isCustomized, ...formDataUpdates } = customizedQuote;
        
        // Ensure wall_details has required id field if it exists
        const updates: Partial<Quote> = {
          ...formDataUpdates,
          ...(formDataUpdates.wall_details && {
            wall_details: {
              id: formDataUpdates.wall_details.id || editingQuote.wall_details?.id || '',
              walls: formDataUpdates.wall_details.walls || {}
            }
          })
        };
        
        // Update the main quote data with form changes
        await updateQuote(editingQuote.id, updates);
        
        // Then, save customizations if they exist
        if (customSections) {
          await saveQuoteCustomization(editingQuote.id, {
            customSections: customSections,
            customHTML: customHTML,
            isCustomized: isCustomized || true,
            lastModified: new Date(),
            version: 1
          });
        }
        
        setEditingQuote(null);
        refreshQuotes();
      }
    } catch (error) {
      // Error handling is done in updateQuote and saveQuoteCustomization
    }
  };

  const handleUnifiedQuoteDownload = async (html: string, isSmartPDF: boolean = false) => {
    if (!editingQuote) {
      console.error('❌ No editing quote available');
      return;
    }
    
    try {
      const quoteName = editingQuote.project_name || editingQuote.proposal_number || 'quote';
      
      // Create temp div with exactly the same styling as standard PDF download
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      tempDiv.style.cssText = `
        font-family: "Times New Roman", serif;
        font-size: 12pt;
        line-height: 1.15;
        width: 8.5in;
        margin: 0 auto;
        padding: 48px;
        color: black;
        background: white;
      `;

      // Position tempDiv off-screen to avoid layout shifts in the live preview
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.visibility = 'hidden';
      
      document.body.appendChild(tempDiv);

      try {
        const html2canvas = (await import('html2canvas')).default;
        
        if (isSmartPDF) {
          // Smart PDF mode - simplified implementation
          const pdf = new (await import('jspdf')).default('p', 'mm', 'letter');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 816,
            height: 1056
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pdfWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
          
          // Save Smart PDF with specific naming
          const currentVersion = editingQuote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_smart.pdf`;
          pdf.save(fileName);
          
        } else {
          // Standard PDF mode
          const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: tempDiv.scrollWidth,
            height: tempDiv.scrollHeight
          });

          const imgData = canvas.toDataURL('image/png');
          const pdf = new (await import('jspdf')).default('p', 'mm', 'letter');
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

          const currentVersion = editingQuote.version || 1;
          const today = new Date();
          const dateStr = today.toLocaleDateString('en-CA');
          const fileName = `${quoteName}_v${currentVersion}_${dateStr}_customized.pdf`;
          pdf.save(fileName);
        }
      } catch (canvasError) {
        console.error('Canvas rendering failed:', canvasError);
        throw canvasError;
      }
      
      // Clean up DOM elements
      document.body.removeChild(tempDiv);
      
      // Mark as downloaded
      await markAsDownloaded(editingQuote.id);
      
      toast({
        title: "PDF Downloaded",
        description: `Customized quote ${editingQuote.proposal_number} has been downloaded successfully.`,
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

  const handleCreateQuote = (quoteName: string) => {
    setShowNewQuoteDialog(false);
    navigate(`/newquote?name=${encodeURIComponent(quoteName)}`);
  };

  if (editingQuote) {
    return (
      <UnifiedQuoteEditor
        quote={editingQuote}
        onSave={handleUnifiedQuoteSave}
        onDownload={handleUnifiedQuoteDownload}
        onBack={() => {
          setEditingQuote(null);
          refreshQuotes();
        }}
      />
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main data-testid="quotes-page" className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-0">
            <header className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-lg rounded-[22px] px-6 py-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex-1" />
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium text-lg">{currentOrganization?.name || 'Loading...'}</span>
                </div>
                <div className="flex items-center gap-4 flex-1 justify-end">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{profile?.full_name || user.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </header>
          </div>

          <div className="flex-1 p-6 pt-3 space-y-4 overflow-auto">
            {/* Search and Filter */}
            <QuoteFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              onNewQuote={() => setShowNewQuoteDialog(true)}
            />

            {/* Quotes Table with Pagination */}
            <Card className="animate-fade-in hover:shadow-lg transition-all duration-300 flex-1 flex flex-col min-h-0">
              <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                <QuotesTable
                  quotes={paginatedQuotes}
                  onEditQuote={editQuote}
                  onDeleteQuote={(id) => setDeleteQuoteId(id)}
                  onStatusChange={updateQuoteStatus}
                />
                
                <QuotePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredQuotes.length}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteQuoteId} onOpenChange={() => setDeleteQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the quote.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteQuoteId && handleDeleteQuote(deleteQuoteId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Quote Dialog */}
      <CreateQuoteDialog 
        open={showNewQuoteDialog}
        onOpenChange={setShowNewQuoteDialog}
        onCreateQuote={handleCreateQuote}
      />
    </SidebarProvider>
  );
};

export default Quotes;