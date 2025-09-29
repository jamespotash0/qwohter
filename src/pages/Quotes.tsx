import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/common/layout";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotesStore, type Quote } from "@/stores/quotes/quotesStore";
// import { useOrganizations } from "@/hooks/useOrganizations";
// import { useUserProfile } from "@/hooks/useUserProfile";
// import { useToast } from "@/hooks/use-toast";
import { EnhancedQuotesTable } from "@/components/features/quotes/table/EnhancedQuotesTable";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";

const Quotes = () => {
  const navigate = useNavigate();
  // const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const quotes = useQuotesStore((state) => state.quotes);
  const quotesLoading = useQuotesStore((state) => state.isLoading);
  const isInitialized = useQuotesStore((state) => state.isInitialized);
  const initialize = useQuotesStore((state) => state.initialize);
  const updateQuote = useQuotesStore((state) => state.updateQuote);
  const createQuoteVersion = useQuotesStore((state) => state.createQuoteVersion);
  const deleteQuoteFromDB = useQuotesStore((state) => state.deleteQuote);

  // const { currentOrganization } = useOrganizations();
  // const { profile } = useUserProfile(user?.id);

  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);

  // Check authentication first
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

  // Initialize quotes store only after user is authenticated
  useEffect(() => {
    if (user && !isInitialized) {
      console.log('🔑 User authenticated, initializing quotes store...');
      initialize();
    }
  }, [user, isInitialized]);

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

  const handleFollowUpDaysChange = async (id: string, days: number | null) => {
    await updateQuote(id, {
      follow_up_days: days,
      status_last_updated: new Date().toISOString()
    });
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
      navigate(`/quotes/edit/${newQuote.proposal_number as string}`);
    } catch (error) {
      console.error('Error creating quote version:', error);
    }
  };


  // Single loading check pattern - prevents flash by always maintaining layout
  if (!user || quotesLoading) {
    return (
      <SidebarProvider>
        <div className="h-screen flex w-full bg-bg-primary overflow-hidden">
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
      <div className="h-screen flex w-full bg-bg-primary overflow-hidden">
        <AppSidebar user={user.email || ""} onLogout={handleLogout} />
        
        <main data-testid="quotes-page" className="flex-1 flex flex-col overflow-hidden">
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
                onFollowUpDaysChange={handleFollowUpDaysChange}
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
                onExportCSV={(filteredData) => {
                  // Helper function to escape CSV fields
                  const escapeCsvField = (field: any): string => {
                    const str = String(field || '');
                    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
                    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                      return `"${str.replace(/"/g, '""')}"`;
                    }
                    return str;
                  };

                  // Format currency
                  const formatCurrency = (amount: number): string => {
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2
                    }).format(amount);
                  };

                  // Create CSV header
                  const headers = ['Proposal #', 'Project Name', 'Client Name', 'Total', 'Status', 'Quote Source', 'Creator', 'Created', 'Follow Up'];

                  // Create CSV rows
                  const rows = filteredData.map(quote => {
                    const proposalInfo = ProposalNumberGenerator.parseProposalNumber(quote.proposal_number);
                    const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
                    const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client";
                    const total = formatCurrency(quote.price_details?.final_selling_price || 0);
                    const status = quote.status || 'Draft';
                    const source = quote.quote_source || '';
                    const creator = quote.creator_name || '';
                    const created = new Date(quote.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    // Follow up status
                    let followUp = 'Not set';
                    if (quote.follow_up_days && quote.follow_up_days > 0) {
                      const baseDate = quote.status_last_updated ? new Date(quote.status_last_updated) : new Date(quote.created_at);
                      const followUpDate = new Date(baseDate);
                      followUpDate.setDate(followUpDate.getDate() + quote.follow_up_days);
                      const today = new Date();
                      const timeDiff = followUpDate.getTime() - today.getTime();
                      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

                      if (daysRemaining < 0) {
                        followUp = `${Math.abs(daysRemaining)}d overdue`;
                      } else if (daysRemaining === 0) {
                        followUp = 'Due today';
                      } else {
                        followUp = `${daysRemaining}d remaining`;
                      }
                    }

                    return [
                      proposalInfo.displayNumber,
                      projectName,
                      clientName,
                      total,
                      status,
                      source,
                      creator,
                      created,
                      followUp
                    ].map(escapeCsvField).join(',');
                  });

                  // Combine headers and rows
                  const csvContent = [headers.join(','), ...rows].join('\n');

                  // Create and download the file
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement("a");
                  const url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute("download", `quotes-export-${new Date().toISOString().split('T')[0]}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                onExportPDF={async (filteredData) => {
                  // Dynamic import to avoid loading jsPDF unless needed
                  const { jsPDF } = await import('jspdf');
                  const autoTable = (await import('jspdf-autotable')).default;

                  const doc = new jsPDF();

                  // Add title
                  doc.setFontSize(16);
                  doc.text('Quotes Export', 14, 15);

                  // Add export date
                  doc.setFontSize(10);
                  doc.text(`Exported on: ${new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}`, 14, 25);

                  // Format currency for PDF
                  const formatCurrency = (amount: number): string => {
                    return new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2
                    }).format(amount);
                  };

                  // Prepare table data
                  const tableData = filteredData.map(quote => {
                    const proposalInfo = ProposalNumberGenerator.parseProposalNumber(quote.proposal_number);
                    const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
                    const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client";
                    const total = formatCurrency(quote.price_details?.final_selling_price || 0);
                    const status = quote.status || 'Draft';
                    const source = quote.quote_source || '';
                    const creator = quote.creator_name || '';
                    const created = new Date(quote.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    });

                    // Follow up status
                    let followUp = 'Not set';
                    if (quote.follow_up_days && quote.follow_up_days > 0) {
                      const baseDate = quote.status_last_updated ? new Date(quote.status_last_updated) : new Date(quote.created_at);
                      const followUpDate = new Date(baseDate);
                      followUpDate.setDate(followUpDate.getDate() + quote.follow_up_days);
                      const today = new Date();
                      const timeDiff = followUpDate.getTime() - today.getTime();
                      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

                      if (daysRemaining < 0) {
                        followUp = `${Math.abs(daysRemaining)}d overdue`;
                      } else if (daysRemaining === 0) {
                        followUp = 'Due today';
                      } else {
                        followUp = `${daysRemaining}d remaining`;
                      }
                    }

                    return [
                      proposalInfo.displayNumber,
                      projectName,
                      clientName,
                      total,
                      status,
                      source,
                      creator,
                      created,
                      followUp
                    ];
                  });

                  // Add table
                  autoTable(doc, {
                    head: [['Proposal #', 'Project Name', 'Client Name', 'Total', 'Status', 'Quote Source', 'Creator', 'Created', 'Follow Up']],
                    body: tableData,
                    startY: 35,
                    styles: {
                      fontSize: 8,
                      cellPadding: 2
                    },
                    headStyles: {
                      fillColor: [63, 81, 181],
                      textColor: [255, 255, 255],
                      fontSize: 9,
                      fontStyle: 'bold'
                    },
                    alternateRowStyles: {
                      fillColor: [245, 245, 245]
                    },
                    columnStyles: {
                      0: { cellWidth: 20 }, // Proposal #
                      1: { cellWidth: 30 }, // Project Name
                      2: { cellWidth: 25 }, // Client Name
                      3: { cellWidth: 20, halign: 'right' }, // Total
                      4: { cellWidth: 18 }, // Status
                      5: { cellWidth: 20 }, // Quote Source
                      6: { cellWidth: 20 }, // Creator
                      7: { cellWidth: 20 }, // Created
                      8: { cellWidth: 22 }  // Follow Up
                    }
                  });

                  // Save the PDF
                  doc.save(`quotes-export-${new Date().toISOString().split('T')[0]}.pdf`);
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