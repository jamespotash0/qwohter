import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar, HeaderNav } from "@/components/common/layout";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useUserProfile } from "@/hooks/useUserProfile";
// import { useToast } from "@/hooks/use-toast";
import { EnhancedQuotesTable } from "@/components/features/quotes/table/EnhancedQuotesTable";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";

const Quotes = () => {
  const navigate = useNavigate();
  // const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const {
    quotes,
    loading: quotesLoading,
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

  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);

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


  const updateQuoteStatus = async (id: string, newStatus: string) => {
    await updateQuote(id, { status: newStatus });
  };

  const updateQuoteSource = async (id: string, newSource: string) => {
    await updateQuote(id, { quote_source: newSource });
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


  // Single loading check pattern - prevents flash by always maintaining layout
  if (!user || quotesLoading) {
    return (
      <SidebarProvider>
        <div className="h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
          <AppSidebar user={user?.email || ""} onLogout={handleLogout} />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading quotes...</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main data-testid="quotes-page" className="flex-1 flex flex-col overflow-hidden">
          {/* Header Nav Bar */}
          <HeaderNav 
            user={user.email || ""} 
            userProfile={profile}
            organizationName={currentOrganization?.name || 'Loading...'}
            onLogout={handleLogout} 
          />

          <div className="flex-1 p-6 space-y-4 overflow-auto">
            {/* Page Title */}
            <div className="mb-4">
              {/* <h1 className="text-2xl font-bold text-gray-900">Quotes</h1> */}
              {/* <p className="text-gray-600 mt-1">Manage and track all your project quotes</p> */}
            </div>

            {/* Enhanced Quotes Table */}
            <div>
              <EnhancedQuotesTable
                quotes={quotes}
                onEditQuote={editQuote}
                onDeleteQuote={(id) => setDeleteQuoteId(id)}
                onStatusChange={updateQuoteStatus}
                onFollowUpDaysChange={updateFollowUpDays}
                onQuoteSourceChange={updateQuoteSource}
                onCreateVersion={handleCreateVersion}
                onCreateQuote={() => setShowNewQuoteDialog(true)}
                onBulkDelete={(ids) => {
                  // Handle bulk delete
                  ids.forEach(id => deleteQuoteFromDB(id));
                }}
                onBulkStatusChange={(ids, status) => {
                  // Handle bulk status change
                  ids.forEach(id => updateQuoteStatus(id, status));
                }}
                onExport={(filteredData) => {
                  // Handle export - convert to CSV
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + "Proposal #,Project Name,Client Name,Total,Status,Quote Source,Creator,Created\n"
                    + filteredData.map(quote => {
                      const proposalInfo = ProposalNumberGenerator.parseProposalNumber(quote.proposal_number);
                      const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
                      const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client";
                      const total = quote.price_details?.final_selling_price || 0;
                      return `"${proposalInfo.displayNumber}","${projectName}","${clientName}","${total}","${quote.status}","${quote.quote_source || ''}","${quote.created_by || ''}","${new Date(quote.created_at).toLocaleDateString()}"`;
                    }).join("\n");
                  
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `quotes-${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              />
            </div>
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