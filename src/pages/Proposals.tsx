/**
 * Proposals Page
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import {
  useProposals,
  useDeleteProposal,
  useUpdateProposalStatus,
  useArchiveProposal,
  useUnarchiveProposal,
  useSetMainVersion,
  useCreateProposalVersion,
  useDeleteVersionGroup,
  useDeleteVersionWithPromotion,
  type Proposal,
} from '@/hooks/queries/useProposals';
import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { Card, CardContent } from '@/components/ui/card';
import { PageContent } from '@/components/common/layout';
import { EnhancedProposalsTable } from '@/components/features/proposals/table/EnhancedProposalsTable';
import CreateProposalDialog, { type ProposalInitialData } from '@/components/features/proposals/creation/CreateProposalDialog';
import { ImportProposalDialog } from '@/components/features/proposals/import';
import { groupProposalsByVersion } from '@/utils/proposalVersionGrouping';
import { formatTimestamp } from '@/lib/utils';
import { createProposal, type CreateProposalData } from '@/services/proposalsService';
import { checkApprovalRequired, requestApproval, approveProposal, getLatestApprovalRequest } from '@/services/proposalApprovalService';
import { ApprovalRequestDialog } from '@/components/features/proposals/ApprovalRequestDialog';
import { ManageRemindersDialog } from '@/components/features/signing/ManageRemindersDialog';
import { useQuickBooksInvoicing, isAlreadySyncedError } from '@/hooks/queries/useQuickBooksInvoicing';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Proposals() {
  const navigate = useNavigate();
  const user = useUser();
  const { organization, role } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Data fetching
  const { data: allProposals = [], isLoading } = useProposals(organization?.id);

  // Mutation hooks
  const deleteMutation = useDeleteProposal();
  const deleteVersionGroupMutation = useDeleteVersionGroup();
  const deleteVersionWithPromotionMutation = useDeleteVersionWithPromotion();
  const updateStatusMutation = useUpdateProposalStatus();
  const archiveMutation = useArchiveProposal();
  const unarchiveMutation = useUnarchiveProposal();
  const setMainVersionMutation = useSetMainVersion();
  const createVersionMutation = useCreateProposalVersion();

  // QuickBooks invoicing (admins only; routes to Online or Desktop)
  const qbInvoicing = useQuickBooksInvoicing(organization?.id);
  const isAdmin = role === 'Owner' || role === 'Admin';
  const canCreateInvoice = isAdmin && qbInvoicing.isConnected;

  // Local state
  const [showArchived, setShowArchived] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    proposalIds: string[];
    proposalNumber?: string;
  }>({ open: false, proposalIds: [] });
  const [remindersDialog, setRemindersDialog] = useState<{
    open: boolean;
    proposalId: string;
    proposalNumber?: string;
  }>({ open: false, proposalId: '' });
  // "Proposal won — create invoice?" prompt
  const [wonInvoicePrompt, setWonInvoicePrompt] = useState<{
    open: boolean;
    proposal: Proposal | null;
  }>({ open: false, proposal: null });

  // Filter proposals by archived status
  const activeProposals = useMemo(() => allProposals.filter(p => !p.archived), [allProposals]);
  const archivedProposals = useMemo(() => allProposals.filter(p => p.archived), [allProposals]);
  const displayedProposals = showArchived ? archivedProposals : activeProposals;

  // Calculate stats from main versions only (for version groups)
  const stats = useMemo(() => {
    // Group proposals by version and count only main versions for accurate stats
    const groups = groupProposalsByVersion(activeProposals);
    const mainVersions = groups.map(g => g.mainVersion);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const createdThisMonth = mainVersions.filter(p => new Date(p.created_at) >= monthStart);
    const wonThisMonth = mainVersions.filter(p =>
      p.status === 'Won' && new Date(p.updated_at) >= monthStart
    );

    // Total value from main versions (only active: Draft, Submitted)
    const totalValue = mainVersions
      .filter(p => p.status === 'Draft' || p.status === 'Submitted')
      .reduce((sum, p) => sum + (p.total_value || 0), 0);

    return {
      totalProposals: mainVersions.length,
      totalProposalsThisMonth: createdThisMonth.length,
      submitted: mainVersions.filter(p => p.status === 'Submitted').length,
      won: mainVersions.filter(p => p.status === 'Won').length,
      wonThisMonth: wonThisMonth.length,
      totalValue,
    };
  }, [activeProposals]);

  // Handlers
  const handleEditProposal = (proposal: Proposal) => {
    navigate(`/proposals/${proposal.id}/edit`);
  };

  // Delete a single proposal (no versions)
  const handleDeleteProposal = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Proposal deleted');
    } catch {
      toast.error('Failed to delete proposal');
    }
  };

  // Delete entire version group (all versions)
  const handleDeleteVersionGroup = async (baseNumber: string) => {
    if (!organization?.id) return;
    try {
      const count = await deleteVersionGroupMutation.mutateAsync({
        baseProposalNumber: baseNumber,
        organizationId: organization.id,
      });
      toast.success(`Deleted ${count} version${count > 1 ? 's' : ''} of ${baseNumber}`);
    } catch {
      toast.error('Failed to delete version group');
    }
  };

  // Delete single version with main version promotion
  const handleDeleteVersion = async (id: string) => {
    try {
      const result = await deleteVersionWithPromotionMutation.mutateAsync(id);
      if (result.promotedId) {
        toast.success('Version deleted. A new main version has been promoted.');
      } else {
        toast.success('Version deleted');
      }
    } catch {
      toast.error('Failed to delete version');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    // Check if this is a Member trying to change to "Submitted"
    // and approval workflow is enabled
    if (status === 'Submitted' && role === 'Member' && organization?.id && user?.id) {
      const approvalRequired = await checkApprovalRequired(organization.id);

      if (approvalRequired) {
        // Find the proposal to get its number for the dialog
        const proposal = allProposals.find(p => p.id === id);
        // Show approval dialog instead of direct status change
        setApprovalDialog({
          open: true,
          proposalIds: [id],
          proposalNumber: proposal?.proposal_number || undefined,
        });
        return;
      }
    }

    // Direct status change (for Admins/Owners or when approval not required)
    updateStatusMutation.mutate({ proposalId: id, status }, {
      onError: () => toast.error('Failed to update status'),
      onSuccess: () => {
        // Nudge the admin to push the won deal to QuickBooks (deliberate click,
        // not auto-created). Only when QB is connected and the user can invoice.
        if (status === 'Won' && canCreateInvoice) {
          const proposal = allProposals.find(p => p.id === id);
          if (proposal) setWonInvoicePrompt({ open: true, proposal });
        }
      },
    });
  };

  const handleCreateInvoice = (proposal: Proposal) => {
    const dest = qbInvoicing.provider === 'desktop' ? 'QuickBooks Desktop' : 'QuickBooks';
    qbInvoicing.createInvoice.mutate(proposal, {
      onSuccess: () => {
        toast.success(
          qbInvoicing.provider === 'desktop'
            ? 'Invoice queued — it will sync to QuickBooks Desktop on the next Web Connector run.'
            : `Invoice created in ${dest}.`
        );
      },
      onError: (error) => {
        if (isAlreadySyncedError(error)) {
          toast.info('This proposal has already been sent to QuickBooks.');
        } else {
          toast.error(error instanceof Error ? error.message : 'Failed to create invoice');
        }
      },
    });
  };

  const handleArchiveProposal = async (id: string) => {
    try {
      const groups = groupProposalsByVersion(allProposals);
      const proposal = allProposals.find(p => p.id === id);
      if (!proposal) return;

      const group = groups.find(g => g.versions.some(v => v.id === id));
      if (group && group.hasMultipleVersions && group.mainVersion.id === id) {
        await Promise.all(group.versions.map(v => archiveMutation.mutateAsync(v.id)));
      } else {
        await archiveMutation.mutateAsync(id);
      }
    } catch {
      toast.error('Failed to archive proposal');
    }
  };

  const handleUnarchiveProposal = async (id: string) => {
    try {
      // Check if this is a main version with multiple versions - unarchive ALL versions in the group
      const groups = groupProposalsByVersion(allProposals);
      const proposal = allProposals.find(p => p.id === id);
      if (!proposal) return;

      const group = groups.find(g => g.versions.some(v => v.id === id));
      if (group && group.hasMultipleVersions && group.mainVersion.id === id) {
        // This is the main version - unarchive ALL versions in the group (cascade unarchive)
        await Promise.all(group.versions.map(v => unarchiveMutation.mutateAsync(v.id)));
        toast.success(`Restored ${group.versions.length} version${group.versions.length > 1 ? 's' : ''}`);
      } else {
        await unarchiveMutation.mutateAsync(id);
        toast.success('Proposal restored');
      }
    } catch {
      toast.error('Failed to restore proposal');
    }
  };

  const handleCreateVersion = async (id: string) => {
    try {
      const newVersion = await createVersionMutation.mutateAsync(id);
      navigate(`/proposals/${newVersion.id}/edit`);
    } catch {
      toast.error('Failed to create version');
    }
  };

  const handleSetMainVersion = (proposalId: string, baseNumber: string) => {
    setMainVersionMutation.mutate({ proposalId, baseProposalNumber: baseNumber }, {
      onError: () => toast.error('Failed to set main version'),
    });
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => deleteMutation.mutateAsync(id)));
      toast.success(`${ids.length} proposal(s) deleted`);
    } catch {
      toast.error('Failed to delete some proposals');
    }
  };

  const handleBulkStatusChange = async (ids: string[], status: string) => {
    // Check if this is a Member trying to change to "Submitted" and approval is required
    if (status === 'Submitted' && role === 'Member' && organization?.id && user?.id) {
      const approvalRequired = await checkApprovalRequired(organization.id);

      if (approvalRequired) {
        // Show approval dialog for bulk approval
        setApprovalDialog({
          open: true,
          proposalIds: ids,
          proposalNumber: ids.length === 1
            ? allProposals.find(p => p.id === ids[0])?.proposal_number || undefined
            : undefined,
        });
        return;
      }
    }

    // Direct status change (for Admins/Owners or when approval not required)
    Promise.all(ids.map(id => updateStatusMutation.mutateAsync({ proposalId: id, status })))
      .catch(() => toast.error('Failed to update some proposals'));
  };

  const handleApprovalConfirm = async (comment?: string) => {
    if (!organization?.id || !user?.id) return;

    const results = await Promise.all(
      approvalDialog.proposalIds.map(id =>
        requestApproval({
          proposalId: id,
          organizationId: organization.id!,
          requestedBy: user.id!,
          comment,
        })
      )
    );

    const successCount = results.filter(r => r.success).length;
    if (successCount === approvalDialog.proposalIds.length) {
      toast.success(
        approvalDialog.proposalIds.length === 1
          ? 'Approval request sent to your admin'
          : `Approval requested for ${successCount} proposal(s)`
      );
    } else if (successCount > 0) {
      toast.warning(`Approval requested for ${successCount} of ${approvalDialog.proposalIds.length} proposals`);
    } else {
      toast.error('Failed to request approval');
    }
  };

  // Handler for Admin/Owner to approve a pending proposal
  const handleApproveProposal = async (proposalId: string) => {
    if (!user?.id) return;

    try {
      // Get the latest approval request for this proposal
      const approvalRequest = await getLatestApprovalRequest(proposalId);
      if (!approvalRequest) {
        toast.error('No pending approval request found');
        return;
      }

      const result = await approveProposal(approvalRequest.id, user.id);
      if (result.success) {
        toast.success('Proposal approved and submitted');
      } else {
        toast.error(result.error || 'Failed to approve proposal');
      }
    } catch (error) {
      console.error('Error approving proposal:', error);
      toast.error('Failed to approve proposal');
    }
  };

  const handleExportCSV = (data: Proposal[]) => {
    // Helper to escape CSV fields with commas, proposals, or newlines
    const escapeCsvField = (field: string | number | null | undefined): string => {
      const str = String(field ?? '');
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

    const headers = ['Proposal #', 'Project Name', 'Client Name', 'Total', 'Status', 'Source', 'Created'];

    const rows = data.map(p => {
      return [
        p.proposal_number || '',
        p.project_name || 'Untitled Project',
        p.client_name || p.client_company || 'Untitled Client',
        formatCurrency(p.total_value || 0),
        p.status || 'Draft',
        p.proposal_source || '',
        formatTimestamp(p.created_at, { year: 'numeric', month: 'short', day: 'numeric' }),
      ].map(escapeCsvField).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `proposals-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async (data: Proposal[]) => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Proposals Export', 14, 15);
      doc.setFontSize(10);
      doc.text(`Exported on: ${formatTimestamp(new Date().toISOString(), {
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

      const tableData = data.map(p => [
        p.proposal_number || '',
        p.project_name || 'Untitled Project',
        p.client_name || p.client_company || 'Untitled Client',
        formatCurrency(p.total_value || 0),
        p.status || 'Draft',
        p.proposal_source || '',
        formatTimestamp(p.created_at, { year: 'numeric', month: 'short', day: 'numeric' }),
      ]);

      autoTable(doc, {
        head: [['Proposal #', 'Project Name', 'Client', 'Total', 'Status', 'Source', 'Created']],
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
          0: { cellWidth: 22 },
          1: { cellWidth: 35 },
          2: { cellWidth: 30 },
          3: { cellWidth: 22, halign: 'right' },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 }
        }
      });

      doc.save(`proposals-export-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Handle creating a new proposal from dialog
  const handleCreateProposal = async (data: ProposalInitialData) => {
    setCreateWizardOpen(false);
    try {
      // Create the proposal with the collected data
      // document_type is inherited from the form automatically
      const proposalData: CreateProposalData = {
        form_id: data.formId,
        project_name: data.projectName,
        status: 'Draft',
        // Add optional custom proposal number if provided
        proposal_number: data.proposalNumber || undefined,
        // Add optional custom date if provided
        created_at: data.proposalDate || undefined,
      };

      const proposal = await createProposal(proposalData);
      // Navigate to the form filler to complete the proposal
      navigate(`/proposals/${proposal.id}/edit`);
    } catch (error) {
      console.error('Failed to create proposal:', error);
      toast.error('Failed to create proposal');
    }
  };

  return (
    <PageContent title="Proposals" subtitle="Manage proposals from your custom forms" showPageHeader={true}>
      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[var(--content-muted-text)]">Loading proposals...</p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Total Proposals</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.totalProposals}</p>
                    {stats.totalProposalsThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{stats.totalProposalsThisMonth} this month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800">
                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Submitted</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.submitted}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Won</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.won}</p>
                    {stats.wonThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{stats.wonThisMonth} this month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      }).format(stats.totalValue)}
                    </p>
                    <p className="text-xs text-[var(--content-muted-text)] mt-1">
                      Outstanding Proposals Only
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Proposals Table (handles its own empty state) */}
          <EnhancedProposalsTable
            proposals={displayedProposals}
            onEditProposal={handleEditProposal}
            onDeleteProposal={handleDeleteProposal}
            onDeleteVersionGroup={handleDeleteVersionGroup}
            onDeleteVersion={handleDeleteVersion}
            onStatusChange={handleStatusChange}
            onCreateVersion={handleCreateVersion}
            onCreateProposal={() => setCreateWizardOpen(true)}
            onImportProposal={() => setShowImportDialog(true)}
            onArchiveProposal={showArchived ? undefined : handleArchiveProposal}
            onUnarchiveProposal={showArchived ? handleUnarchiveProposal : undefined}
            showArchived={showArchived}
            archivedCount={archivedProposals.length}
            onToggleArchive={() => setShowArchived(!showArchived)}
            onBulkDelete={handleBulkDelete}
            onBulkStatusChange={handleBulkStatusChange}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            onSetMainVersion={handleSetMainVersion}
            userRole={role || undefined}
            onApproveProposal={handleApproveProposal}
            onManageReminders={(proposalId, proposalNumber) =>
              setRemindersDialog({ open: true, proposalId, proposalNumber })
            }
            onCreateInvoice={handleCreateInvoice}
            canCreateInvoice={canCreateInvoice}
          />
        </>
      )}

      <CreateProposalDialog
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        onCreateProposal={handleCreateProposal}
      />

      <ImportProposalDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />

      <ApprovalRequestDialog
        open={approvalDialog.open}
        onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}
        proposalNumber={approvalDialog.proposalIds.length === 1 ? approvalDialog.proposalNumber : undefined}
        onConfirm={handleApprovalConfirm}
      />

      {remindersDialog.proposalId && (
        <ManageRemindersDialog
          isOpen={remindersDialog.open}
          onClose={() => setRemindersDialog(prev => ({ ...prev, open: false }))}
          proposalId={remindersDialog.proposalId}
          proposalNumber={remindersDialog.proposalNumber}
        />
      )}

      <AlertDialog
        open={wonInvoicePrompt.open}
        onOpenChange={(open) => setWonInvoicePrompt(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Proposal won 🎉</AlertDialogTitle>
            <AlertDialogDescription>
              {wonInvoicePrompt.proposal?.proposal_number
                ? `Create an invoice for ${wonInvoicePrompt.proposal.proposal_number} in ${qbInvoicing.provider === 'desktop' ? 'QuickBooks Desktop' : 'QuickBooks'}?`
                : 'Create an invoice for this proposal in QuickBooks?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (wonInvoicePrompt.proposal) handleCreateInvoice(wonInvoicePrompt.proposal);
              }}
            >
              Create Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContent>
  );
}
