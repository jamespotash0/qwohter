import { useState, useEffect, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageContent, ContentCard } from "@/components/common/layout";
import CreateQuoteDialog from "@/components/features/quotes/creation/CreateQuoteDialog";
import { CreateInvoiceDialog } from "@/components/features/integrations/CreateInvoiceDialog";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/auth";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useQuotes, useUpdateQuote, useUpdateQuoteStatus, useArchiveQuote, useUnarchiveQuote, useDeleteQuote, useSetMainVersion, useCreateQuoteVersion } from "@/hooks/queries";
import type { Quote } from "@/services/quotesService";
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

  // ✅ v3.0.0: Use React Query hooks for automatic caching
  const user = useUser();
  const { data: allQuotes = [], isLoading: quotesLoading, isFetching } = useQuotes(user?.id);

  // Mutation hooks
  const { mutateAsync: updateQuoteMutation } = useUpdateQuote();
  const { mutate: updateStatusMutation } = useUpdateQuoteStatus();
  const { mutateAsync: archiveQuoteMutation } = useArchiveQuote();
  const { mutateAsync: unarchiveQuoteMutation } = useUnarchiveQuote();
  const { mutateAsync: deleteQuoteMutation } = useDeleteQuote();
  const { mutateAsync: setMainVersionMutation } = useSetMainVersion();
  const { mutateAsync: createVersionMutation } = useCreateQuoteVersion();

  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [invoiceQuote, setInvoiceQuote] = useState<Quote | null>(null);

  // Track the currently displayed "main" versions from the table
  const [currentMainVersions, setCurrentMainVersions] = useState<Quote[]>([]);

  // Get organization for invoice creation
  const { organization } = useCurrentOrganization(user?.id || '');

  // ✅ React Query automatically handles fetching and caching
  // No manual fetching or subscriptions needed!

  // Filter quotes into active and archived using memoization
  const filteredQuotes = useMemo(() => {
    return allQuotes.filter(q => !q.archived);
  }, [allQuotes]);

  const archivedQuotes = useMemo(() => {
    return allQuotes.filter(q => q.archived === true);
  }, [allQuotes]);

  // Quote management functions using React Query mutations
  const updateQuoteStatus = (id: string, newStatus: string) => {
    // Use dedicated status update hook to bypass quote_status_history trigger
    updateStatusMutation({ quoteId: id, status: newStatus });
  };

  const updateQuoteSource = async (id: string, newSource: string) => {
    try {
      await updateQuoteMutation({ id, updates: { quote_source: newSource } });
      // Toast for successful quote source update (mutation is silent by default)
      // Note: No toast here - user sees the dropdown change which is feedback enough
    } catch (error) {
      // Errors are logged in the mutation hook
    }
  };

  const handleDeleteQuote = async (id: string) => {
    // Find if this quote is part of a version group
    const quoteGroups = groupQuotesByVersion(allQuotes);
    const quoteToDelete = allQuotes.find(q => q.id === id);

    if (!quoteToDelete) {
      await deleteQuoteMutation(id);
      setDeleteQuoteId(null);
      return;
    }

    // Find the group this quote belongs to
    const group = quoteGroups.find(g =>
      g.versions.some(v => v.id === id)
    );

    if (group && group.hasMultipleVersions) {
      // Check if the quote being deleted is the displayed main version
      const isMainVersion = group.mainVersion.id === id || quoteToDelete.is_main_version === true;

      if (isMainVersion) {
        // This is the main version - delete ALL versions in the group (cascade delete)
        console.log('🗑️ Cascade deleting all versions for group:', group.baseNumber);
        // Delete all in parallel for better performance
        await Promise.all(group.versions.map(version => deleteQuoteMutation(version.id)));
      } else {
        // This is a child version - delete only this one
        await deleteQuoteMutation(id);
      }
    } else {
      // Single version, no group - just delete it
      await deleteQuoteMutation(id);
    }

    setDeleteQuoteId(null);
  };

  const handleArchiveQuote = async (id: string) => {
    // Find if this quote is part of a version group
    const quoteGroups = groupQuotesByVersion(allQuotes);
    const quoteToArchive = allQuotes.find(q => q.id === id);

    if (!quoteToArchive) {
      await archiveQuoteMutation(id);
      return;
    }

    // Find the group this quote belongs to
    const group = quoteGroups.find(g =>
      g.versions.some(v => v.id === id)
    );

    if (group && group.hasMultipleVersions) {
      // Check if the quote being archived is the displayed main version
      const isMainVersion = group.mainVersion.id === id || quoteToArchive.is_main_version === true;

      if (isMainVersion) {
        // This is the main version - archive ALL versions in the group (cascade archive)
        console.log('📦 Cascade archiving all versions for group:', group.baseNumber);
        // Archive all in parallel for better performance
        await Promise.all(group.versions.map(version => archiveQuoteMutation(version.id)));
      } else {
        // This is a child version - archive only this one
        await archiveQuoteMutation(id);
      }
    } else {
      // Single version, no group - just archive it
      await archiveQuoteMutation(id);
    }
  };

  const handleUnarchiveQuote = async (id: string) => {
    // Find if this quote is part of a version group
    const quoteGroups = groupQuotesByVersion(allQuotes);
    const quoteToUnarchive = allQuotes.find(q => q.id === id);

    if (!quoteToUnarchive) {
      await unarchiveQuoteMutation(id);
      return;
    }

    // Find the group this quote belongs to
    const group = quoteGroups.find(g =>
      g.versions.some(v => v.id === id)
    );

    if (group && group.hasMultipleVersions) {
      // Check if the quote being unarchived is the displayed main version
      const isMainVersion = group.mainVersion.id === id || quoteToUnarchive.is_main_version === true;

      if (isMainVersion) {
        // This is the main version - unarchive ALL versions in the group (cascade unarchive)
        console.log('📤 Cascade unarchiving all versions for group:', group.baseNumber);
        // Unarchive all in parallel for better performance
        await Promise.all(group.versions.map(version => unarchiveQuoteMutation(version.id)));
      } else {
        // This is a child version - unarchive only this one
        await unarchiveQuoteMutation(id);
      }
    } else {
      // Single version, no group - just unarchive it
      await unarchiveQuoteMutation(id);
    }
  };

  // Set main version handler
  const setMainVersion = (quoteId: string, baseProposalNumber: string) => {
    setMainVersionMutation({ quoteId, baseProposalNumber });
  };

  // Calculate quote statistics
  const metrics = useMemo(() => {
    // Use the main versions from the table (user-selected or default)
    // Fall back to automatic grouping if table hasn't sent data yet
    let mainVersions = currentMainVersions;

    if (mainVersions.length === 0) {
      const activeQuotes = allQuotes.filter(q => !q.archived);
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
  }, [currentMainVersions, allQuotes]);

  const editQuote = (quote: Quote) => {
    const proposalNumber = quote.proposal_number;

    if (quote.status === "Incomplete") {
      navigate(`/quotes/edit-incomplete/${proposalNumber}`);
    } else {
      navigate(`/editor/${proposalNumber}`);
    }
  };

  const handleCreateQuote = (proposalName: string, formId: string, template: string) => {
    setShowNewQuoteDialog(false);
    navigate(`/quotes/new?name=${encodeURIComponent(proposalName)}&formId=${encodeURIComponent(formId)}&template=${encodeURIComponent(template)}`);
  };

  const handleCreateVersion = async (quoteId: string) => {
    try {
      // Find the quote to create a version from
      const existingQuote = allQuotes.find(q => q.id === quoteId);
      if (!existingQuote) throw new Error('Quote not found');

      // Use ProposalNumberGenerator to get the next version number
      const proposalInfo = await ProposalNumberGenerator.getNextProposalNumber(existingQuote.proposal_number);

      // Create new quote version using React Query mutation (auto-invalidates cache)
      const newQuote = await createVersionMutation({
        quoteId,
        newProposalNumber: proposalInfo.fullNumber,
        versionNumber: proposalInfo.version
      });

      navigate(`/editor/${newQuote.proposal_number as string}`);
    } catch (error) {
      console.error('Error creating quote version:', error);
    }
  };

  const handleCreateInvoice = (quote: Quote) => {
    setInvoiceQuote(quote);
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
      const creator = quote.created_by_name || '';
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
      const creator = quote.created_by_name || '';
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
      {/* Loading State - Show while fetching fresh data from database */}
      {quotesLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[var(--content-muted-text)]">Loading proposals...</p>
        </div>
      ) : !quotesLoading && allQuotes.length === 0 ? (
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
          onCreateInvoice={handleCreateInvoice}
          onCreateQuote={() => setShowNewQuoteDialog(true)}
          // onSetReminder={handleSetReminder}
          onArchiveQuote={showArchived ? undefined : handleArchiveQuote}
          onUnarchiveQuote={showArchived ? handleUnarchiveQuote : undefined}
          isArchiveView={showArchived}
          showArchived={showArchived}
          archivedCount={archivedQuotes.length}
          onToggleArchive={() => setShowArchived(!showArchived)}
          onBulkDelete={(ids) => {
            ids.forEach(id => deleteQuoteMutation(id));
          }}
          onBulkStatusChange={(ids, status) => {
            ids.forEach(id => updateQuoteStatus(id, status));
          }}
          onBulkArchive={showArchived ? undefined : (ids) => {
            ids.forEach(id => archiveQuoteMutation(id));
          }}
          onBulkUnarchive={showArchived ? (ids) => {
            ids.forEach(id => unarchiveQuoteMutation(id));
          } : undefined}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onMainVersionsChange={setCurrentMainVersions}
          onSetMainVersion={setMainVersion}
        />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteQuoteId} onOpenChange={() => setDeleteQuoteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const quoteToDelete = allQuotes.find(q => q.id === deleteQuoteId);
                if (quoteToDelete) {
                  // Check if this is a main version with multiple versions
                  const quoteGroups = groupQuotesByVersion(allQuotes);
                  const group = quoteGroups.find(g => g.versions.some(v => v.id === deleteQuoteId));
                  const isMainVersion = group ? (group.mainVersion.id === deleteQuoteId || quoteToDelete.is_main_version === true) : false;
                  const hasMultipleVersions = group && group.hasMultipleVersions;

                  return (
                    <>
                      This action cannot be undone. This will permanently delete:
                      <div className="text-lg font-semibold text-foreground mt-2">
                        Quote #{quoteToDelete.proposal_number} - {quoteToDelete.project_name || 'Untitled Quote'}
                      </div>
                      {isMainVersion && hasMultipleVersions && (
                        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                          <div className="font-semibold">⚠️ Warning: This is the main version</div>
                          <div className="mt-1 text-sm">
                            Deleting it will also delete all {group!.versions.length - 1} other version(s) in this group.
                          </div>
                          <div className="mt-2 text-sm font-medium">
                            To delete only this version, first set a new main version using the dropdown in the quotes table.
                          </div>
                        </div>
                      )}
                    </>
                  );
                }
                return "This action cannot be undone. This will permanently delete the quote.";
              })()}
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

      {/* Create Proposal Dialog */}
      <CreateProposalDialog
        open={showNewQuoteDialog}
        onOpenChange={setShowNewQuoteDialog}
        onCreateQuote={handleCreateQuote}
      />

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        isOpen={!!invoiceQuote}
        onClose={() => setInvoiceQuote(null)}
        quote={invoiceQuote}
        organizationId={organization?.id || ''}
      />

    </PageContent>
  );
};

export default Quotes;