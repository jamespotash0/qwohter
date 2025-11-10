/**
 * Proposals Page - Form Builder System
 * Beautiful table view for managing proposals created from custom forms
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import { type Proposal } from '@/stores/proposals/proposalsStore';
import { useProposals, useDeleteProposal, useArchiveProposal } from '@/hooks/queries';
import { useUser } from '@/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Archive,
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
// import { archiveProposal } from '@/services/proposalsService';

const STATUS_COLORS = {
  Draft: 'bg-gray-100 text-gray-700 border-gray-200',
  Incomplete: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Complete: 'bg-blue-100 text-blue-700 border-blue-200',
  Sent: 'bg-purple-100 text-purple-700 border-purple-200',
  Accepted: 'bg-green-100 text-green-700 border-green-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
};

export default function ProposalsFormBuilder() {
  const navigate = useNavigate();
  const user = useUser();

  // React Query hooks
  const { data: proposals = [], isLoading } = useProposals(user?.id);
  const { mutateAsync: deleteProposalMutation } = useDeleteProposal();
  const { mutateAsync: archiveProposalMutation } = useArchiveProposal();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [copyProjectName, setCopyProjectName] = useState('');

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch =
      proposal.proposal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.proposal_number.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || proposal.proposal_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async () => {
    if (!selectedProposalId) return;
    try {
      await deleteProposalMutation(selectedProposalId);
      setDeleteDialogOpen(false);
      setSelectedProposalId(null);
    } catch (error) {
      console.error('Failed to delete proposal:', error);
    }
  };

  const handleCopy = async () => {
    if (!selectedProposalId || !copyProjectName.trim()) return;
    try {
      const originalProposal = proposals.find(p => p.id === selectedProposalId);
      if (!originalProposal) return;

      // Use createVersionMutation to create a copy
      // Note: This is a simplified approach - you may want a dedicated copy mutation
      toast.info('Copy functionality needs to be implemented with proper proposal duplication');
      setCopyDialogOpen(false);
      setSelectedProposalId(null);
      setCopyProjectName('');
    } catch (error) {
      console.error('Failed to copy proposal:', error);
    }
  };

  const handleArchive = async (proposalId: string) => {
    try {
      await archiveProposalMutation(proposalId);
    } catch (error) {
      console.error('Failed to archive proposal:', error);
    }
  };

  const openCopyDialog = (proposalId: string, projectName?: string) => {
    setSelectedProposalId(proposalId);
    setCopyProjectName(`${projectName || 'Proposal'} (Copy)`);
    setCopyDialogOpen(true);
  };

  const openDeleteDialog = (proposalId: string) => {
    setSelectedProposalId(proposalId);
    setDeleteDialogOpen(true);
  };

  // Calculate stats
  const stats = {
    total: proposals.length,
    draft: proposals.filter((p) => p.proposal_status === 'Draft').length,
    complete: proposals.filter((p) => p.proposal_status === 'Complete').length,
    sent: proposals.filter((p) => p.proposal_status === 'Sent').length,
    accepted: proposals.filter((p) => p.proposal_status === 'Accepted').length,
  };

  return (
    <div className="h-full w-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Proposals</h1>
            <p className="text-muted-foreground mt-1">
              Manage proposals created from your custom forms
            </p>
          </div>
          <Button
            size="lg"
            onClick={() => navigate('/proposals/new')}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Proposal
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Proposals</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.draft}</p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.complete}</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.sent}</p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.accepted}</p>
                  <p className="text-xs text-muted-foreground">Accepted</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search proposals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'Draft', 'Incomplete', 'Complete', 'Sent', 'Accepted', 'Rejected'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="whitespace-nowrap"
              >
                {status === 'all' ? 'All' : status}
              </Button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading proposals...</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredProposals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No proposals yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {searchQuery
                ? 'No proposals match your search. Try a different query.'
                : 'Get started by creating your first proposal from a custom form.'}
            </p>
            {!searchQuery && (
              <Button
                size="lg"
                onClick={() => navigate('/proposals/new')}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Proposal
              </Button>
            )}
          </motion.div>
        )}

        {/* Proposals Table */}
        {!isLoading && filteredProposals.length > 0 && (
          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Proposal #</TableHead>
                  <TableHead className="font-semibold">Proposal Name</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Updated</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredProposals.map((proposal, index) => (
                    <motion.tr
                      key={proposal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.02 }}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                    >
                      <TableCell className="font-mono font-medium">{proposal.proposal_number}</TableCell>
                      <TableCell className="font-medium">{proposal.proposal_name || 'Untitled'}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${STATUS_COLORS[proposal.proposal_status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-700 border-gray-200'} border`}
                        >
                          {proposal.proposal_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(proposal.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(proposal.updated_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/proposals/${proposal.id}/edit`);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Proposal
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                openCopyDialog(proposal.id, proposal.proposal_name);
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Proposal
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(proposal.id);
                              }}
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="cursor-pointer text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteDialog(proposal.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Proposal
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this proposal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Proposal Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Proposal</DialogTitle>
            <DialogDescription>
              Create a copy of this proposal with a new proposal name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="copy-name">Proposal Name</Label>
              <Input
                id="copy-name"
                value={copyProjectName}
                onChange={(e) => setCopyProjectName(e.target.value)}
                placeholder="Enter proposal name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopy} disabled={!copyProjectName.trim()}>
              Create Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
