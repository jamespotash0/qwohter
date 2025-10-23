import { useState, useEffect, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageContent, ContentCard } from "@/components/common/layout";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuotesStore, type Quote } from "@/stores/quotes/quotesStore";
import { EnhancedQuotesTable } from "@/components/features/quotes/table/EnhancedQuotesTable";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";
import { groupQuotesByVersion } from "@/utils/quoteVersionGrouping";
import { FileText, Plus, Sparkles, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateEST } from "@/utils/dateUtils";

/**
 * Streamlined Quotes Page using AppLayout
 *
 * This demonstrates the new unified approach:
 * - AppLayout provides consistent structure (sidebar + main area)
 * - ContentCard provides consistent card styling
 * - Only page-specific content needs to be defined
 */
const Quotes = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const quotes = useQuotesStore((state) => state.quotes);
  const quotesLoading = useQuotesStore((state) => state.isLoading);
  const isInitialized = useQuotesStore((state) => state.isInitialized);
  const initialize = useQuotesStore((state) => state.initialize);
  const updateQuote = useQuotesStore((state) => state.updateQuote);
  const archiveQuote = useQuotesStore((state) => state.archiveQuote);
  const unarchiveQuote = useQuotesStore((state) => state.unarchiveQuote);
  const createQuoteVersion = useQuotesStore((state) => state.createQuoteVersion);
  const deleteQuoteFromDB = useQuotesStore((state) => state.deleteQuote);

  // Get filtered quotes using the selector
  const getFilteredQuotes = useQuotesStore((state) => state.getFilteredQuotes);
  const getArchivedQuotes = useQuotesStore((state) => state.getArchivedQuotes);

  const filteredQuotes = getFilteredQuotes();
  const archivedQuotes = getArchivedQuotes();

  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Track the currently displayed "main" versions from the table
  const [currentMainVersions, setCurrentMainVersions] = useState<Quote[]>([]);

  // Get current user for quotes initialization
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };
    getCurrentUser();
  }, []);

  // Initialize quotes store
  useEffect(() => {
    if (user && !isInitialized) {
      initialize();
    }
  }, [user, isInitialized, initialize]);

  // Quote management functions
  const updateQuoteStatus = async (id: string, newStatus: string) => {
    await updateQuote(id, { status: newStatus as any });
  };

  const updateQuoteSource = async (id: string, newSource: string) => {
    await updateQuote(id, { quote_source: newSource });
  };

  const handleDeleteQuote = async (id: string) => {
    await deleteQuoteFromDB(id);
    setDeleteQuoteId(null);
  };


  // Calculate quote statistics
  const metrics = useMemo(() => {
    // Use the main versions from the table (user-selected or default)
    // Fall back to automatic grouping if table hasn't sent data yet
    let mainVersions = currentMainVersions;

    if (mainVersions.length === 0) {
      const activeQuotes = quotes.filter(q => !q.archived);
      const quoteGroups = groupQuotesByVersion(activeQuotes);
      mainVersions = quoteGroups.map(group => group.mainVersion);
    }

    // Get current month start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter main versions created this month
    const createdThisMonth = mainVersions.filter(quote => {
      const createdDate = new Date(quote.created_at);
      return createdDate >= monthStart;
    });

    // Filter main versions that changed to Won status this month
    const wonThisMonth = mainVersions.filter(quote => {
      if (quote.status !== 'Won') return false;
      const updatedDate = new Date(quote.updated_at);
      return updatedDate >= monthStart;
    });

    // Filter main versions that are Pending/Submitted and changed this month
    const pendingThisMonth = mainVersions.filter(quote => {
      if (quote.status !== 'Pending' && quote.status !== 'Submitted') return false;
      const updatedDate = new Date(quote.updated_at);
      return updatedDate >= monthStart;
    });

    // Overall metrics - count based on main version status
    const totalQuotes = mainVersions.length;
    const pendingQuotes = mainVersions.filter(q =>
      q.status === 'Pending' || q.status === 'Submitted'
    ).length;
    const wonQuotes = mainVersions.filter(q =>
      q.status === 'Won'
    ).length;
    const draftQuotes = mainVersions.filter(q =>
      q.status === 'Draft'
    ).length;

    // Calculate total value of main versions (only Draft, Incomplete, and Submitted)
    const totalValue = mainVersions
      .filter(q => q.status === 'Draft' || q.status === 'Incomplete' || q.status === 'Submitted')
      .reduce((sum, quote) => {
        const finalPrice = quote.price_details?.final_selling_price || 0;
        return sum + finalPrice;
      }, 0);

    // Calculate value added this month (main versions created this month)
    const valueThisMonth = createdThisMonth.reduce((sum, quote) => {
      const finalPrice = quote.price_details?.final_selling_price || 0;
      return sum + finalPrice;
    }, 0);

    return {
      totalQuotes,
      totalQuotesThisMonth: createdThisMonth.length,
      pendingQuotes,
      pendingQuotesThisMonth: pendingThisMonth.length,
      wonQuotes,
      wonQuotesThisMonth: wonThisMonth.length,
      draftQuotes,
      totalValue,
      valueThisMonth
    };
  }, [currentMainVersions, quotes]);

  const editQuote = (quote: Quote) => {
    const proposalNumber = quote.proposal_number;

    if (quote.status === "Incomplete") {
      navigate(`/quotes/edit-incomplete/${proposalNumber}`);
    } else {
      navigate(`/editor/${proposalNumber}`);
    }
  };

  const handleCreateQuote = (quoteName: string) => {
    setShowNewQuoteDialog(false);
    navigate(`/quotes/new?name=${encodeURIComponent(quoteName)}`);
  };

  const handleCreateVersion = async (quoteId: string) => {
    try {
      const newQuote = await createQuoteVersion(quoteId);
      navigate(`/editor/${newQuote.proposal_number as string}`);
    } catch (error) {
      console.error('Error creating quote version:', error);
    }
  };

  // Export functions (same as before)
  const handleExportCSV = (filteredData: Quote[]) => {
    const escapeCsvField = (field: any): string => {
      const str = String(field || '');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount);
    };

    const headers = ['Proposal #', 'Project Name', 'Client Name', 'Total', 'Status', 'Quote Source', 'Creator', 'Created'];

    const rows = filteredData.map(quote => {
      const proposalInfo = ProposalNumberGenerator.parseProposalNumber(quote.proposal_number);
      const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
      const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client";
      const total = formatCurrency(quote.price_details?.final_selling_price || 0);
      const status = quote.status || 'Draft';
      const source = quote.quote_source || '';
      const creator = quote.creator_name || '';
      const created = formatDateEST(quote.created_at, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return [
        proposalInfo.displayNumber,
        projectName,
        clientName,
        total,
        status,
        source,
        creator,
        created
      ].map(escapeCsvField).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
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
  };

  const handleExportPDF = async (filteredData: Quote[]) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Quotes Export', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported on: ${formatDateEST(new Date().toISOString(), {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}`, 14, 25);

    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(amount);
    };

    const tableData = filteredData.map(quote => {
      const proposalInfo = ProposalNumberGenerator.parseProposalNumber(quote.proposal_number);
      const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
      const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client";
      const total = formatCurrency(quote.price_details?.final_selling_price || 0);
      const status = quote.status || 'Draft';
      const source = quote.quote_source || '';
      const creator = quote.creator_name || '';
      const created = formatDateEST(quote.created_at, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return [
        proposalInfo.displayNumber,
        projectName,
        clientName,
        total,
        status,
        source,
        creator,
        created
      ];
    });

    autoTable(doc, {
      head: [['Proposal #', 'Project Name', 'Client Name', 'Total', 'Status', 'Quote Source', 'Creator', 'Created']],
      body: tableData,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [63, 81, 181],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 18 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 22 }
      }
    });

    doc.save(`quotes-export-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <PageContent title="Proposals" subtitle="Manage and track all your project proposals" showPageHeader={true}>
      {/* Empty State - Show when no proposals exist */}
      {!quotesLoading && quotes.length === 0 ? (
        <ContentCard>
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 flex items-center justify-center">
                <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-semibold text-[var(--content-header-text)] dark:text-[var(--content-header-text)] mb-2">
              No quotes yet
            </h3>

            <p className="text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] text-center max-w-md mb-8">
              Start creating professional quotes for your wall covering projects. Track proposals, manage client communications, and win more business.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setShowNewQuoteDialog(true)}
                className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white px-6 py-2.5"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Quote
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-sm text-[var(--content-header-text)] mb-1">Professional Templates</h4>
                <p className="text-xs text-[var(--content-muted-text)]">Pre-built templates for faster quote creation</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-medium text-sm text-[var(--content-header-text)] mb-1">Smart Tracking</h4>
                <p className="text-xs text-[var(--content-muted-text)]">Follow-ups and status management built-in</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-medium text-sm text-[var(--content-header-text)] mb-1">Easy Collaboration</h4>
                <p className="text-xs text-[var(--content-muted-text)]">Share quotes with your team seamlessly</p>
              </div>
            </div>
          </div>
        </ContentCard>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Quotes */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Total Quotes</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.totalQuotes}</p>
                    {metrics.totalQuotesThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{metrics.totalQuotesThisMonth} this month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Quotes */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800">
                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Submitted Quotes</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.pendingQuotes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Won Quotes */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Won Quotes</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.wonQuotes}</p>
                    {metrics.wonQuotesThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{metrics.wonQuotesThisMonth} this month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Active Value */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800">
                    <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Total Active Value</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(metrics.totalValue)}
                    </p>
                    <p className="text-xs text-[var(--content-muted-text)] mt-1">
                      Outstanding Quotes Only
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main quotes table with archive toggle */}
          <EnhancedQuotesTable
          quotes={showArchived ? archivedQuotes : filteredQuotes}
          onEditQuote={editQuote}
          onDeleteQuote={(id) => setDeleteQuoteId(id)}
          onStatusChange={updateQuoteStatus}
          onQuoteSourceChange={updateQuoteSource}
          onCreateVersion={handleCreateVersion}
          onCreateQuote={() => setShowNewQuoteDialog(true)}
          // onSetReminder={handleSetReminder}
          onArchiveQuote={showArchived ? undefined : archiveQuote}
          onUnarchiveQuote={showArchived ? unarchiveQuote : undefined}
          isArchiveView={showArchived}
          showArchived={showArchived}
          archivedCount={archivedQuotes.length}
          onToggleArchive={() => setShowArchived(!showArchived)}
          onBulkDelete={(ids) => {
            ids.forEach(id => deleteQuoteFromDB(id));
          }}
          onBulkStatusChange={(ids, status) => {
            ids.forEach(id => updateQuoteStatus(id, status));
          }}
          onBulkArchive={showArchived ? undefined : (ids) => {
            ids.forEach(id => archiveQuote(id));
          }}
          onBulkUnarchive={showArchived ? (ids) => {
            ids.forEach(id => unarchiveQuote(id));
          } : undefined}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onMainVersionsChange={setCurrentMainVersions}
        />
        </>
      )}

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
              className="bg-red-600 hover:bg-red-700 text-white"
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

    </PageContent>
  );
};

export default Quotes;