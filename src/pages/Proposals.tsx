/**
 * Proposals Page
 * Enhanced table view matching the Quotes page design
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
  type Proposal,
} from '@/hooks/queries/useProposals';
import { FileText, Clock, CheckCircle, DollarSign, Plus, Sparkles, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageContent, ContentCard } from '@/components/common/layout';
import { EnhancedProposalsTable } from '@/components/features/proposals/table/EnhancedProposalsTable';
import CreateProposalDialog, { type ProposalInitialData } from '@/components/features/quotes/creation/CreateProposalDialog';
import { ImportProposalDialog } from '@/components/features/proposals/import';
import { groupProposalsByVersion } from '@/utils/proposalVersionGrouping';

export default function Proposals() {
  const navigate = useNavigate();
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Data fetching
  const { data: allProposals = [], isLoading } = useProposals(organization?.id);

  // Mutation hooks
  const deleteMutation = useDeleteProposal();
  const updateStatusMutation = useUpdateProposalStatus();
  const archiveMutation = useArchiveProposal();
  const unarchiveMutation = useUnarchiveProposal();
  const setMainVersionMutation = useSetMainVersion();
  const createVersionMutation = useCreateProposalVersion();

  // Local state
  const [showArchived, setShowArchived] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Filter proposals by archived status
  const activeProposals = useMemo(() => allProposals.filter(p => !p.archived), [allProposals]);
  const archivedProposals = useMemo(() => allProposals.filter(p => p.archived), [allProposals]);
  const displayedProposals = showArchived ? archivedProposals : activeProposals;

  // Calculate stats
  const stats = useMemo(() => {
    const proposals = activeProposals;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const createdThisMonth = proposals.filter(p => new Date(p.created_at) >= monthStart);
    const approvedThisMonth = proposals.filter(p =>
      p.status === 'Approved' && new Date(p.updated_at) >= monthStart
    );

    const totalValue = proposals
      .filter(p => p.status === 'Draft' || p.status === 'Complete' || p.status === 'Sent')
      .reduce((sum, p) => sum + (p.total_value || 0), 0);

    return {
      total: proposals.length,
      totalThisMonth: createdThisMonth.length,
      sent: proposals.filter(p => p.status === 'Sent').length,
      approved: proposals.filter(p => p.status === 'Approved').length,
      approvedThisMonth: approvedThisMonth.length,
      totalValue,
    };
  }, [activeProposals]);

  // Handlers
  const handleEditProposal = (proposal: Proposal) => {
    navigate(`/proposals/${proposal.id}/edit`);
  };

  const handleDeleteProposal = async (id: string) => {
    try {
      const groups = groupProposalsByVersion(allProposals);
      const proposal = allProposals.find(p => p.id === id);
      if (!proposal) {
        await deleteMutation.mutateAsync(id);
        return;
      }

      const group = groups.find(g => g.versions.some(v => v.id === id));
      if (group && group.hasMultipleVersions && group.mainVersion.id === id) {
        await Promise.all(group.versions.map(v => deleteMutation.mutateAsync(v.id)));
        toast.success('Proposal and all versions deleted');
      } else {
        await deleteMutation.mutateAsync(id);
        toast.success('Proposal deleted');
      }
    } catch {
      toast.error('Failed to delete proposal');
    }
  };

  const handleStatusChange = (id: string, status: string) => {
    updateStatusMutation.mutate({ proposalId: id, status }, {
      onSuccess: () => toast.success(`Status updated to ${status}`),
      onError: () => toast.error('Failed to update status'),
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
        toast.success('Proposal and all versions archived');
      } else {
        await archiveMutation.mutateAsync(id);
        toast.success('Proposal archived');
      }
    } catch {
      toast.error('Failed to archive proposal');
    }
  };

  const handleUnarchiveProposal = async (id: string) => {
    try {
      await unarchiveMutation.mutateAsync(id);
      toast.success('Proposal restored');
    } catch {
      toast.error('Failed to restore proposal');
    }
  };

  const handleCreateVersion = async (id: string) => {
    try {
      const newVersion = await createVersionMutation.mutateAsync(id);
      toast.success(`Version ${newVersion.proposal_number} created`);
      navigate(`/proposals/${newVersion.id}/edit`);
    } catch {
      toast.error('Failed to create version');
    }
  };

  const handleSetMainVersion = (proposalId: string, baseNumber: string) => {
    setMainVersionMutation.mutate({ proposalId, baseProposalNumber: baseNumber }, {
      onSuccess: () => toast.success('Main version updated'),
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

  const handleBulkStatusChange = (ids: string[], status: string) => {
    Promise.all(ids.map(id => updateStatusMutation.mutateAsync({ proposalId: id, status })))
      .then(() => toast.success(`${ids.length} proposal(s) updated to ${status}`))
      .catch(() => toast.error('Failed to update some proposals'));
  };

  const handleExportCSV = (data: Proposal[]) => {
    const headers = ['Proposal #', 'Project Name', 'Client', 'Status', 'Total Value', 'Created'];
    const rows = data.map(p => [
      p.proposal_number || '',
      p.project_name || '',
      p.client_name || p.client_company || '',
      p.status || 'Draft',
      p.total_value?.toString() || '0',
      p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleExportPDF = (data: Proposal[]) => {
    toast.info(`PDF export for ${data.length} proposals - coming soon`);
  };

  // Handle creating a new proposal from dialog
  const handleCreateProposal = async (data: ProposalInitialData) => {
    setCreateWizardOpen(false);
    try {
      // Create the proposal with the collected data
      const { createProposal } = await import('@/services/proposalsService');
      const proposal = await createProposal({
        form_id: data.formId,
        document_template_id: data.template,
        project_name: data.proposalName,
        client_name: data.clientName,
        client_company: data.clientCompany,
        job_location: data.jobLocation,
        status: data.status,
        quote_source: data.quoteSource,
        form_data: {
          client_address: data.clientAddress,
        },
      });
      toast.success('Proposal created successfully');
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
      ) : !isLoading && allProposals.length === 0 ? (
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

            <h3 className="text-2xl font-semibold text-[var(--content-header-text)] mb-2">
              No proposals yet
            </h3>

            <p className="text-[var(--content-muted-text)] text-center max-w-md mb-8">
              Start creating professional proposals using your custom forms. Track submissions, manage approvals, and win more business.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => setCreateWizardOpen(true)}
                className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white px-6 py-2.5"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Proposal
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                className="px-6 py-2.5"
              >
                <Upload className="w-5 h-5 mr-2" />
                Import Proposal
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h4 className="font-medium text-sm text-[var(--content-header-text)] mb-1">Custom Forms</h4>
                <p className="text-xs text-[var(--content-muted-text)]">Build proposals from your templates</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h4 className="font-medium text-sm text-[var(--content-header-text)] mb-1">Smart Tracking</h4>
                <p className="text-xs text-[var(--content-muted-text)]">Monitor status and approvals</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h4 className="font-medium text-sm text-[var(--content-header-text)] mb-1">Version Control</h4>
                <p className="text-xs text-[var(--content-muted-text)]">Create and manage revisions</p>
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
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.total}</p>
                    {stats.totalThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{stats.totalThisMonth} this month
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sent Proposals */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900 dark:to-yellow-800">
                    <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Sent Proposals</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.sent}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Approved Proposals */}
            <Card className="bg-[var(--content-card-bg)] shadow-[var(--content-card-shadow)] border-0 hover:shadow-2xl hover:scale-105 hover:bg-white dark:hover:bg-[var(--content-card-bg)] transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-[var(--content-muted-text)]">Approved</h3>
                    <p className="text-2xl font-bold text-[var(--content-header-text)]">{stats.approved}</p>
                    {stats.approvedThisMonth > 0 && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        +{stats.approvedThisMonth} this month
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

          {/* Proposals Table */}
          <EnhancedProposalsTable
            proposals={displayedProposals}
            onEditProposal={handleEditProposal}
            onDeleteProposal={handleDeleteProposal}
            onStatusChange={handleStatusChange}
            onCreateVersion={handleCreateVersion}
            onCreateProposal={() => setCreateWizardOpen(true)}
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
          />
        </>
      )}

      {/* Proposal Creation Dialog */}
      <CreateProposalDialog
        open={createWizardOpen}
        onOpenChange={setCreateWizardOpen}
        onCreateQuote={handleCreateProposal}
      />

      {/* Import Proposal Dialog */}
      <ImportProposalDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
      />
    </PageContent>
  );
}
