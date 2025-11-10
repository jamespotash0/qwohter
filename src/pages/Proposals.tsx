import { useState, useEffect, useMemo } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageContent, ContentCard } from "@/components/common/layout";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/auth";
import { useProposals, useUpdateProposal, useUpdateProposalStatus, useArchiveProposal, useUnarchiveProposal, useDeleteProposal, useSetMainVersion, useCreateProposalVersion } from "@/hooks/queries";
import type { Proposal } from "@/stores/proposals/proposalsStore";
import { EnhancedProposalsTable } from "@/components/features/quotes/table/EnhancedProposalsTable";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";
import { groupProposalsByVersion } from "@/utils/proposalVersionGrouping";
import { FileText, Plus, Sparkles, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateEST } from "@/utils/dateUtils";

/**
 * Streamlined Proposals Page using AppLayout
 *
 * This demonstrates the new unified approach:
 * - AppLayout provides consistent structure (sidebar + main area)
 * - ContentCard provides consistent card styling
 * - Only page-specific content needs to be defined
 */
const Proposals = () => {
  const navigate = useNavigate();

  // ✅ v3.0.0: Use React Query hooks for automatic caching
  const user = useUser();
  const { data: allProposals = [], isLoading: proposalsLoading, isFetching } = useProposals(user?.id);

  // Mutation hooks
  const { mutateAsync: updateProposalMutation } = useUpdateProposal();
  const { mutate: updateStatusMutation } = useUpdateProposalStatus();
  const { mutateAsync: archiveProposalMutation } = useArchiveProposal();
  const { mutateAsync: unarchiveProposalMutation } = useUnarchiveProposal();
  const { mutateAsync: deleteProposalMutation } = useDeleteProposal();
  const { mutateAsync: setMainVersionMutation } = useSetMainVersion();
  const { mutateAsync: createVersionMutation } = useCreateProposalVersion();

  const [deleteProposalId, setDeleteProposalId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Track the currently displayed "main" versions from the table
  const [currentMainVersions, setCurrentMainVersions] = useState<Proposal[]>([]);

  // ✅ React Query automatically handles fetching and caching
  // No manual fetching or subscriptions needed!

  // Filter proposals into active and archived using memoization
  const filteredProposals = useMemo(() => {
    return allProposals.filter(q => !q.archived);
  }, [allProposals]);

  const archivedProposals = useMemo(() => {
    return allProposals.filter(q => q.archived === true);
  }, [allProposals]);

  // Proposal management functions using React Query mutations
  const updateProposalStatus = (id: string, newStatus: string) => {
    // Use dedicated status update hook to bypass proposal_status_history trigger
    updateStatusMutation({ proposalId: id, status: newStatus });
  };

  const updateProposalSource = async (id: string, newSource: string) => {
    await updateProposalMutation({ id, updates: { proposal_source: newSource } });
  };

  const handleDeleteProposal = async (id: string) => {
    // Find if this proposal is part of a version group
    const proposalGroups = groupProposalsByVersion(allProposals);
    const proposalToDelete = allProposals.find(q => q.id === id);

    if (!proposalToDelete) {
      await deleteProposalMutation(id);
      setDeleteProposalId(null);
      return;
    }

    // Find the group this proposal belongs to
    const group = proposalGroups.find(g =>
      g.versions.some(v => v.id === id)
    );

    if (group && group.hasMultipleVersions) {
      // Check if the proposal being deleted is the displayed main version
      const isMainVersion = group.mainVersion.id === id || proposalToDelete.is_main_version === true;

      if (isMainVersion) {
        // This is the main version - delete ALL versions in the group (cascade delete)
        console.log('🗑️ Cascade deleting all versions for group:', group.baseNumber);
        // Delete all in parallel for better performance
        await Promise.all(group.versions.map(version => deleteProposalMutation(version.id)));
      } else {
        // This is a child version - delete only this one
        await deleteProposalMutation(id);
      }
    } else {
      // Single version, no group - just delete it
      await deleteProposalMutation(id);
    }

    setDeleteProposalId(null);
  };

  const handleArchiveProposal = async (id: string) => {
    // Find if this proposal is part of a version group
    const proposalGroups = groupProposalsByVersion(allProposals);
    const proposalToArchive = allProposals.find(q => q.id === id);

    if (!proposalToArchive) {
      await archiveProposalMutation(id);
      return;
    }

    // Find the group this proposal belongs to
    const group = proposalGroups.find(g =>
      g.versions.some(v => v.id === id)
    );

    if (group && group.hasMultipleVersions) {
      // Check if the proposal being archived is the displayed main version
      const isMainVersion = group.mainVersion.id === id || proposalToArchive.is_main_version === true;

      if (isMainVersion) {
        // This is the main version - archive ALL versions in the group (cascade archive)
        console.log('📦 Cascade archiving all versions for group:', group.baseNumber);
        // Archive all in parallel for better performance
        await Promise.all(group.versions.map(version => archiveProposalMutation(version.id)));
      } else {
        // This is a child version - archive only this one
        await archiveProposalMutation(id);
      }
    } else {
      // Single version, no group - just archive it
      await archiveProposalMutation(id);
    }
  };

  const handleUnarchiveProposal = async (id: string) => {
    // Find if this proposal is part of a version group
    const proposalGroups = groupProposalsByVersion(allProposals);
    const proposalToUnarchive = allProposals.find(q => q.id === id);

    if (!proposalToUnarchive) {
      await unarchiveProposalMutation(id);
      return;
    }

    // Find the group this proposal belongs to
    const group = proposalGroups.find(g =>
      g.versions.some(v => v.id === id)
    );

    if (group && group.hasMultipleVersions) {
      // Check if the proposal being unarchived is the displayed main version
      const isMainVersion = group.mainVersion.id === id || proposalToUnarchive.is_main_version === true;

      if (isMainVersion) {
        // This is the main version - unarchive ALL versions in the group (cascade unarchive)
        console.log('📤 Cascade unarchiving all versions for group:', group.baseNumber);
        // Unarchive all in parallel for better performance
        await Promise.all(group.versions.map(version => unarchiveProposalMutation(version.id)));
      } else {
        // This is a child version - unarchive only this one
        await unarchiveProposalMutation(id);
      }
    } else {
      // Single version, no group - just unarchive it
      await unarchiveProposalMutation(id);
    }
  };

  // Set main version handler
  const setMainVersion = (proposalId: string, baseProposalNumber: string) => {
    setMainVersionMutation({ proposalId, baseProposalNumber });
  };

  // Calculate proposal statistics
  const metrics = useMemo(() => {
    // Use the main versions from the table (user-selected or default)
    // Fall back to automatic grouping if table hasn't sent data yet
    let mainVersions = currentMainVersions;

    if (mainVersions.length === 0) {
      const activeProposals = allProposals.filter(q => !q.archived);
      const proposalGroups = groupProposalsByVersion(activeProposals);
      mainVersions = proposalGroups.map(group => group.mainVersion);
    }

    // Get current month start date
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter main versions created this month
    const createdThisMonth = mainVersions.filter(proposal => {
      const createdDate = new Date(proposal.created_at);
      return createdDate >= monthStart;
    });

    // Filter main versions that changed to Accepted status this month
    const acceptedThisMonth = mainVersions.filter(proposal => {
      if (proposal.proposal_status !== 'Accepted') return false;
      const updatedDate = new Date(proposal.updated_at);
      return updatedDate >= monthStart;
    });

    // Filter main versions that are Pending/Submitted and changed this month
    const pendingThisMonth = mainVersions.filter(proposal => {
      if (proposal.proposal_status !== 'Submitted') return false;
      const updatedDate = new Date(proposal.updated_at);
      return updatedDate >= monthStart;
    });

    // Overall metrics - count based on main version proposal_status
    const totalProposals = mainVersions.length;
    const pendingProposals = mainVersions.filter(q =>
      q.proposal_status === 'Submitted'
    ).length;
    const acceptedProposals = mainVersions.filter(q =>
      q.proposal_status === 'Accepted'
    ).length;
    const draftProposals = mainVersions.filter(q =>
      q.proposal_status === 'Draft'
    ).length;

    // Calculate total value of main versions (only Draft, Incomplete, and Submitted)
    const totalValue = mainVersions
      .filter(q => q.proposal_status === 'Draft' || q.proposal_status === 'Incomplete' || q.proposal_status === 'Submitted')
      .reduce((sum, proposal) => {
        const finalPrice = proposal.price_details?.final_selling_price || 0;
        return sum + finalPrice;
      }, 0);

    // Calculate value added this month (main versions created this month)
    const valueThisMonth = createdThisMonth.reduce((sum, proposal) => {
      const finalPrice = proposal.price_details?.final_selling_price || 0;
      return sum + finalPrice;
    }, 0);

    return {
      totalProposals,
      totalProposalsThisMonth: createdThisMonth.length,
      pendingProposals,
      pendingProposalsThisMonth: pendingThisMonth.length,
      acceptedProposals,
      acceptedProposalsThisMonth: acceptedThisMonth.length,
      draftProposals,
      totalValue,
      valueThisMonth
    };
  }, [currentMainVersions, allProposals]);

  const editProposal = (proposal: Proposal) => {
    // TODO: Implement proposal editing with form builder system
    // For now, proposals are created via the form builder but editing is not yet implemented
    console.log('Edit proposal:', proposal.id);

    // Navigate to proposals page for now
    // In the future, this should load the proposal data and form, then allow editing
    navigate(`/proposals/${proposal.id}`);
  };

  const handleCreateProposal = () => {
    navigate(`/proposals/new`);
  };

  const handleCreateVersion = async (proposalId: string) => {
    try {
      // Find the proposal to create a version from
      const existingProposal = allProposals.find(q => q.id === proposalId);
      if (!existingProposal) throw new Error('Proposal not found');

      // Use ProposalNumberGenerator to get the next version number
      const proposalInfo = await ProposalNumberGenerator.getNextProposalNumber(existingProposal.proposal_number);

      // Create new proposal version using React Query mutation (auto-invalidates cache)
      const newProposal = await createVersionMutation({
        proposalId,
        newProposalNumber: proposalInfo.fullNumber,
        versionNumber: proposalInfo.version
      });

      navigate(`/editor/${newProposal.proposal_number as string}`);
    } catch (error) {
      console.error('Error creating proposal version:', error);
    }
  };

  // Export functions (same as before)
  const handleExportCSV = (filteredData: Proposal[]) => {
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

    const headers = ['Proposal #', 'Proposal Name', 'Client Name', 'Total', 'Status', 'Proposal Source', 'Creator', 'Created'];

    const rows = filteredData.map(proposal => {
      const proposalInfo = ProposalNumberGenerator.parseProposalNumber(proposal.proposal_number);
      const projectName = proposal.proposal_name || proposal.proposal_details?.proposal_name || "Untitled Project";
      const clientName = proposal.job_details?.client_company || proposal.job_details?.client_name || "Untitled Client";
      const total = formatCurrency(proposal.price_details?.final_selling_price || 0);
      const status = proposal.proposal_status || 'Draft';
      const source = proposal.proposal_source || '';
      const creator = proposal.created_by_name || '';
      const created = formatDateEST(proposal.created_at, {
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
    link.setAttribute("download", `proposals-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async (filteredData: Proposal[]) => {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('proposals Export', 14, 15);
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

    const tableData = filteredData.map(proposal => {
      const proposalInfo = ProposalNumberGenerator.parseProposalNumber(proposal.proposal_number);
      const projectName = proposal.proposal_name || proposal.proposal_details?.proposal_name || "Untitled Project";
      const clientName = proposal.job_details?.client_company || proposal.job_details?.client_name || "Untitled Client";
      const total = formatCurrency(proposal.price_details?.final_selling_price || 0);
      const status = proposal.proposal_status || 'Draft';
      const source = proposal.proposal_source || '';
      const creator = proposal.created_by_name || '';
      const created = formatDateEST(proposal.created_at, {
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
      head: [['Proposal #', 'Project Name', 'Client Name', 'Total', 'Status', 'Proposal Source', 'Creator', 'Created']],
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

    doc.save(`proposals-export-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <PageContent title="Proposals" subtitle="Manage and track all your project proposals" showPageHeader={true}>
      {/* Loading State - Show while fetching fresh data from database */}
      {proposalsLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[var(--content-muted-text)]">Loading proposals...</p>
        </div>
      ) : !proposalsLoading && allProposals.length === 0 ? (
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
              No proposals yet
            </h3>

            <p className="text-[var(--content-muted-text)] dark:text-[var(--content-muted-text)] text-center max-w-md mb-8">
              Start creating professional proposals for your wall covering projects. Track proposals, manage client communications, and win more business.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleCreateProposal}
                className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white px-6 py-2.5"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Proposal
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-sm text-[var(--content-header-text)] mb-1">Professional Templates</h4>
                <p className="text-xs text-[var(--content-muted-text)]">Pre-built templates for faster proposal creation</p>
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
                <p className="text-xs text-[var(--content-muted-text)]">Share proposals with your team seamlessly</p>
              </div>
            </div>
          </div>
        </ContentCard>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Proposals */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Total Proposals</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.totalProposals}</p>
                    {metrics.totalProposalsThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{metrics.totalProposalsThisMonth} this month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submitted Proposals */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800">
                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Submitted Proposals</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.pendingProposals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accepted Proposals */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Accepted Proposals</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{metrics.acceptedProposals}</p>
                    {metrics.acceptedProposalsThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{metrics.acceptedProposalsThisMonth} this month
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
                      Outstanding Proposals Only
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main proposals table with archive toggle */}
          <EnhancedProposalsTable
          proposals={showArchived ? archivedProposals : filteredProposals}
          onEditProposal={editProposal}
          onDeleteProposal={(id) => setDeleteProposalId(id)}
          onStatusChange={updateProposalStatus}
          onProposalSourceChange={updateProposalSource}
          onCreateVersion={handleCreateVersion}
          onCreateProposal={handleCreateProposal}
          // onSetReminder={handleSetReminder}
          onArchiveProposal={showArchived ? undefined : handleArchiveProposal}
          onUnarchiveProposal={showArchived ? handleUnarchiveProposal : undefined}
          isArchiveView={showArchived}
          showArchived={showArchived}
          archivedCount={archivedProposals.length}
          onToggleArchive={() => setShowArchived(!showArchived)}
          onBulkDelete={(ids) => {
            ids.forEach(id => deleteProposalMutation(id));
          }}
          onBulkStatusChange={(ids, status) => {
            ids.forEach(id => updateProposalStatus(id, status));
          }}
          onBulkArchive={showArchived ? undefined : (ids) => {
            ids.forEach(id => archiveProposalMutation(id));
          }}
          onBulkUnarchive={showArchived ? (ids) => {
            ids.forEach(id => unarchiveProposalMutation(id));
          } : undefined}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          onMainVersionsChange={setCurrentMainVersions}
          onSetMainVersion={setMainVersion}
        />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteProposalId} onOpenChange={() => setDeleteProposalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const proposalToDelete = allProposals.find(q => q.id === deleteProposalId);
                if (proposalToDelete) {
                  // Check if this is a main version with multiple versions
                  const proposalGroups = groupProposalsByVersion(allProposals);
                  const group = proposalGroups.find(g => g.versions.some(v => v.id === deleteProposalId));
                  const isMainVersion = group ? (group.mainVersion.id === deleteProposalId || proposalToDelete.is_main_version === true) : false;
                  const hasMultipleVersions = group && group.hasMultipleVersions;

                  return (
                    <>
                      This action cannot be undone. This will permanently delete:
                      <div className="text-lg font-semibold text-foreground mt-2">
                        Proposal #{proposalToDelete.proposal_number} - {proposalToDelete.proposal_name || 'Untitled Proposal'}
                      </div>
                      {isMainVersion && hasMultipleVersions && (
                        <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive">
                          <div className="font-semibold">⚠️ Warning: This is the main version</div>
                          <div className="mt-1 text-sm">
                            Deleting it will also delete all {group!.versions.length - 1} other version(s) in this group.
                          </div>
                          <div className="mt-2 text-sm font-medium">
                            To delete only this version, first set a new main version using the dropdown in the proposals table.
                          </div>
                        </div>
                      )}
                    </>
                  );
                }
                return "This action cannot be undone. This will permanently delete the proposal.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProposalId && handleDeleteProposal(deleteProposalId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </PageContent>
  );
};

export default Proposals;