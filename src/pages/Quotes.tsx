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
// import { useToast } from "@/hooks/use-toast";
import { QuotesTable, QuoteFilters, QuotePagination } from "@/components/features/quotes/table";

const Quotes = () => {
  const navigate = useNavigate();
  // const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const {
    quotes,
    updateQuote,
    updateFollowUpDays,
    createQuoteVersion,
    deleteQuote: deleteQuoteFromDB,
    // markAsDownloaded,
    // saveQuoteCustomization,
    // refreshQuotes
  } = useQuotes();

  const { currentOrganization } = useOrganizations();
  const { profile } = useUserProfile(user?.id);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
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
    const proposalNumber = quote.proposal_number;
    
    // Only incomplete quotes use the dedicated editing wizard
    if (quote.status === "Incomplete") {
      navigate(`/quotes/edit-incomplete/${proposalNumber}`);
    } 
    // All other statuses (Draft, Pending, Submitted, Won, Rejected) use the unified editor
    else {
      navigate(`/quotes/edit/${proposalNumber}`);
    }
  };


  const handleCreateQuote = (quoteName: string) => {
    setShowNewQuoteDialog(false);
    navigate(`/newquote?name=${encodeURIComponent(quoteName)}`);
  };

  const handleCreateVersion = async (quoteId: string) => {
    try {
      const newQuote = await createQuoteVersion(quoteId);
      navigate(`/quotes/edit/${newQuote.proposal_number}`);
    } catch (error) {
      console.error('Error creating quote version:', error);
    }
  };


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
                      <p className="text-sm font-medium text-foreground">{profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1).toLowerCase() : ""}</p>

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
                  onFollowUpDaysChange={updateFollowUpDays}
                  onCreateVersion={handleCreateVersion}
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