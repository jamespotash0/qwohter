/**
 * Enhanced Proposals Table
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
  PaginationState,
  ColumnResizeMode,
  ColumnSizingState,
} from '@tanstack/react-table';
import {
  ChevronDown, ChevronUp, ArrowUpDown, MoreHorizontal,
  Edit3, Trash2, Copy, Archive, ArchiveRestore, ChevronRight, Star, Search, X, AlertTriangle, Plus, Upload, FileText, Clock, Kanban, CheckCircle2, Bell
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import type { Proposal } from "@/services/proposalsService";
import { sendProposalToProjectBoard, removeProposalFromProjectBoard } from "@/services/proposalsService";
import { toast } from '@/components/ui/sonner';
import { invalidateQueries } from "@/lib/queryClient";
import { ProposalsTableToolbar } from './components/ProposalsTableToolbar';
import { groupProposalsByVersion, getBaseProposalNumber, type ProposalVersionGroup } from '@/utils/proposalVersionGrouping';
import { formatTimestamp } from '@/lib/utils';
import useEnhancedProposalSearch from '@/hooks/useEnhancedProposalSearch';
import { usePagePreferences } from '@/stores';
import { trackEvent } from '@/lib/analytics';

// ============================================================================
// Types & Constants
// ============================================================================

export type DeleteType = 'single' | 'version' | 'group';

export interface DeleteInfo {
  id: string;
  type: DeleteType;
  baseNumber: string;
  versionCount: number;
  isMainVersion: boolean;
}

interface EnhancedProposalsTableProps {
  proposals: Proposal[];
  onEditProposal: (proposal: Proposal) => void;
  onDeleteProposal: (id: string) => void;
  onDeleteVersionGroup?: (baseNumber: string) => void;
  onDeleteVersion?: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onCreateVersion?: (id: string) => void;
  onCreateProposal?: () => void;
  onImportProposal?: () => void;
  onArchiveProposal?: (id: string) => void;
  onUnarchiveProposal?: (id: string) => void;
  showArchived?: boolean;
  archivedCount?: number;
  onToggleArchive?: () => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onExportCSV?: (data: Proposal[]) => void;
  onExportPDF?: (data: Proposal[]) => void;
  onSetMainVersion?: (proposalId: string, baseNumber: string) => void;
  userRole?: 'Owner' | 'Admin' | 'Member';
  onApproveProposal?: (proposalId: string) => void;
  onManageReminders?: (proposalId: string, proposalNumber?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800',
  'Pending Approval': 'bg-orange-100 text-orange-700 border border-orange-300',
  Submitted: 'bg-purple-100 text-purple-800',
  Won: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-red-800',
};

// Statuses that users can manually select (excludes system-only statuses like "Pending Approval")
const USER_SELECTABLE_STATUSES = ['Draft', 'Submitted', 'Won', 'Rejected'];

const COLUMN_LABELS: Record<string, string> = {
  proposal_number: 'Proposal #',
  project_name: 'Project Name',
  client_name: 'Client',
  total_value: 'Total',
  status: 'Status',
  created_at: 'Created',
  actions: 'Actions',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

// ============================================================================
// Component
// ============================================================================

export const EnhancedProposalsTable: React.FC<EnhancedProposalsTableProps> = ({
  proposals,
  onEditProposal,
  onDeleteProposal,
  onDeleteVersionGroup,
  onDeleteVersion,
  onStatusChange,
  onCreateVersion,
  onCreateProposal,
  onImportProposal,
  onArchiveProposal,
  onUnarchiveProposal,
  showArchived = false,
  archivedCount = 0,
  onToggleArchive,
  onBulkDelete,
  onBulkStatusChange,
  onExportCSV,
  onExportPDF,
  onSetMainVersion,
  userRole = 'Member',
  onApproveProposal,
  onManageReminders,
}) => {
  // Centralized page preferences from UI store (persisted to localStorage)
  const {
    expandedRows: expanded = {},
    columnVisibility: storedColumnVisibility = {},
    dataDensity = 'comfortable',
    pageSize: storedPageSize = 10,
    toggleExpandedRow,
    setColumnVisibility: setStoredColumnVisibility,
    setDataDensity,
    setPageSize: setStoredPageSize,
  } = usePagePreferences('proposals');

  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Local input state for immediate feedback
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(storedColumnVisibility);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: storedPageSize });
  const [versionSelection, setVersionSelection] = useState<Record<string, boolean>>({});
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null);
  const [statusChangeConfirm, setStatusChangeConfirm] = useState<{
    proposalId: string;
    proposalNumber: string;
    currentStatus: string;
    newStatus: string;
  } | null>(null);
  const [mainVersions, setMainVersions] = useState<Record<string, string>>({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const columnResizeMode: ColumnResizeMode = 'onChange';
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle status change with confirmation for status changes that have side effects
  // - Won -> anything: removes from project board, affects analytics
  // - Rejected -> Draft/Submitted: reopens the proposal
  const handleStatusChangeWithConfirm = useCallback((proposal: Proposal, newStatus: string) => {
    const currentStatus = proposal.status || 'Draft';

    // Show confirmation when leaving Won status (removes from project board)
    const leavingWon = currentStatus === 'Won' && newStatus !== 'Won';
    // Show confirmation when reopening a rejected proposal
    const reopeningRejected = currentStatus === 'Rejected' && (newStatus === 'Draft' || newStatus === 'Submitted');

    const needsConfirmation = leavingWon || reopeningRejected;

    if (needsConfirmation) {
      setStatusChangeConfirm({
        proposalId: proposal.id,
        proposalNumber: proposal.proposal_number || 'this proposal',
        currentStatus,
        newStatus,
      });
    } else {
      onStatusChange(proposal.id, newStatus);
    }
  }, [onStatusChange]);

  // Handle sending proposal to project board
  const handleSendToBoard = useCallback(async (proposalId: string) => {
    try {
      const result = await sendProposalToProjectBoard(proposalId);
      if (result.success) {
        invalidateQueries.allBoard();
        toast.success('Sent to Project Board', {
          description: 'Proposal has been added to the project board',
        });
      } else {
        toast.error('Error', { description: result.error || 'Failed to send proposal to project board' });
      }
    } catch (error) {
      console.error('Exception sending to board:', error);
      toast.error('Error', { description: 'An unexpected error occurred' });
    }
  }, []);

  // Handle removing proposal from project board
  const handleRemoveFromBoard = useCallback(async (proposalId: string) => {
    try {
      const result = await removeProposalFromProjectBoard(proposalId);
      if (result.success) {
        invalidateQueries.allBoard();
        toast.success('Removed from Project Board', {
          description: 'Proposal has been removed from the project board',
        });
      } else {
        toast.error('Error', { description: result.error || 'Failed to remove proposal from project board' });
      }
    } catch (error) {
      console.error('Exception removing from board:', error);
      toast.error('Error', { description: 'An unexpected error occurred' });
    }
  }, []);

  // Debounced search - updates globalFilter after user stops typing
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value); // Update input immediately for responsive UI
    setShowSuggestions(true);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the actual filter update (150ms delay)
    debounceTimerRef.current = setTimeout(() => {
      setGlobalFilter(value);
    }, 150);
  }, []);

  // Clear search handler
  const clearSearch = useCallback(() => {
    setSearchInput('');
    setGlobalFilter('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle column visibility changes - sync to store
  const handleColumnVisibilityChange = useCallback((updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) => {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sync to store (avoid calling if empty initial state)
      if (Object.keys(next).length > 0) {
        setStoredColumnVisibility(next);
      }
      return next;
    });
  }, [setStoredColumnVisibility]);

  // Handle pagination changes - sync page size to store
  const handlePaginationChange = useCallback((updater: PaginationState | ((old: PaginationState) => PaginationState)) => {
    setPagination((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Sync page size to store if changed
      if (next.pageSize !== prev.pageSize) {
        setStoredPageSize(next.pageSize);
      }
      return next;
    });
  }, [setStoredPageSize]);

  // Enhanced search with Fuse.js
  const { search, getSearchSuggestions } = useEnhancedProposalSearch(proposals);

  // Filter proposals using enhanced search
  const filteredProposals = useMemo(() => {
    if (!globalFilter.trim()) return proposals;
    const results = search(globalFilter);
    return results.map(r => r.item);
  }, [proposals, globalFilter, search]);

  // Get search suggestions (based on searchInput for immediate feedback)
  const searchSuggestions = useMemo(() => {
    if (!searchInput.trim() || searchInput.length < 2) return [];
    return getSearchSuggestions(searchInput, 5);
  }, [searchInput, getSearchSuggestions]);

  // Group proposals by version (using filtered proposals)
  const proposalGroups = useMemo(() => groupProposalsByVersion(filteredProposals), [filteredProposals]);

  // Create display data: show the main version
  const displayProposals = useMemo(() => {
    return proposalGroups.map(group => {
      const dbMainVersion = group.versions.find(v => v.is_main_version === true);
      if (dbMainVersion) return dbMainVersion;
      const userSelectedMainId = mainVersions[group.baseNumber];
      if (userSelectedMainId) {
        const userSelectedVersion = group.versions.find(v => v.id === userSelectedMainId);
        if (userSelectedVersion) return userSelectedVersion;
      }
      return group.mainVersion;
    });
  }, [proposalGroups, mainVersions]);

  // Map to find version group for each proposal
  const proposalToGroupMap = useMemo(() => {
    const map = new Map<string, ProposalVersionGroup>();
    proposalGroups.forEach(group => {
      group.versions.forEach(version => {
        map.set(version.id, group);
      });
    });
    return map;
  }, [proposalGroups]);

  const columnHelper = createColumnHelper<Proposal>();

  const columns = useMemo(() => [
    // Selection column
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => {
              table.toggleAllPageRowsSelected(e.target.checked);
              if (e.target.checked) {
                const newVersionSelection: Record<string, boolean> = {};
                proposalGroups.forEach(group => {
                  if (group.hasMultipleVersions) {
                    group.versions.forEach(version => {
                      newVersionSelection[version.id] = true;
                    });
                  }
                });
                setVersionSelection(newVersionSelection);
              } else {
                setVersionSelection({});
              }
            }}
          />
        </div>
      ),
      cell: ({ row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={row.getIsSelected()}
              onChange={(e) => {
                e.stopPropagation();
                row.toggleSelected(e.target.checked);
                if (versionGroup && versionGroup.hasMultipleVersions) {
                  const newVersionSelection = { ...versionSelection };
                  versionGroup.versions.forEach(version => {
                    newVersionSelection[version.id] = e.target.checked;
                  });
                  setVersionSelection(newVersionSelection);
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      },
      size: 32,
      enableSorting: false,
    }),
    columnHelper.accessor('proposal_number', {
      id: 'proposal_number',
      header: () => <span>Proposal #</span>,
      cell: ({ getValue, row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);
        const proposalNumber = getValue() || '—';
        const baseNumber = getBaseProposalNumber(proposalNumber);
        const isExpanded = expanded[baseNumber] === true;
        const hasMultipleVersions = versionGroup && versionGroup.hasMultipleVersions;
        const displayNumber = hasMultipleVersions ? baseNumber : proposalNumber;
        const isComplete = proposal.is_complete ?? false;

        // Check if proposal is expired (validUntil date has passed)
        // Compare date strings to avoid timezone issues (validUntil is "YYYY-MM-DD")
        const formData = proposal.form_data as Record<string, any> | null;
        const validUntil = formData?.info?.validUntil as string | undefined;
        // Get today's date in local timezone as "YYYY-MM-DD"
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        // Expired if validUntil is before today (not including today)
        const isExpired = validUntil ? validUntil < todayStr : false;
        const formattedExpiredDate = validUntil
          ? new Date(validUntil + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '';

        return (
          <div className="flex items-center gap-1.5 group/versions">
            {/* Expired indicator - only show for single proposals (version groups show on children) */}
            {!hasMultipleVersions && isExpired && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Proposal no longer valid as of {formattedExpiredDate}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Unfinished indicator - only show for single proposals */}
            {!hasMultipleVersions && !isComplete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Unfinished</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="font-mono text-[13px] text-gray-900 dark:text-gray-100">
              {displayNumber}
            </div>
            {hasMultipleVersions && versionGroup && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpandedRow(baseNumber);
                }}
                className="flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
                title={isExpanded ? 'Collapse versions' : `Show ${versionGroup.versions.length} versions`}
              >
                <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                <span className="hover:underline">{versionGroup.versions.length - 1} more</span>
              </button>
            )}
          </div>
        );
      },
      size: 140,
      enableSorting: true,
    }),
    columnHelper.accessor('project_name', {
      id: 'project_name',
      header: () => <span>Project</span>,
      cell: ({ row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);

        // For version groups, show "Various" like other columns
        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm text-gray-500 italic">Various</div>;
        }

        const projectName = proposal.project_name || '—';
        const jobLocation = proposal.job_location || '';
        return (
          <div className="space-y-0 min-w-0">
            <span className="text-[13px] text-gray-900 dark:text-gray-100 truncate block" title={projectName}>{projectName}</span>
            {jobLocation && (
              <div className="text-xs text-gray-500 truncate" title={jobLocation}>{jobLocation}</div>
            )}
          </div>
        );
      },
      size: 240,
      enableSorting: false,
    }),
    columnHelper.accessor('client_name', {
      id: 'client_name',
      header: () => <span>Client</span>,
      cell: ({ row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);
        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm text-gray-500 italic">Various</div>;
        }
        const clientName = proposal.client_name || proposal.client_company || '—';
        return <div className="text-[13px] text-gray-900 dark:text-gray-100 truncate" title={clientName}>{clientName}</div>;
      },
      size: 160,
      enableSorting: false,
    }),
    columnHelper.accessor('total_value', {
      id: 'total_value',
      header: () => <span>Total</span>,
      cell: ({ row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);
        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm italic text-gray-500">Range</div>;
        }
        const total = proposal.total_value;
        return (
          <div className="text-[13px] text-gray-900 dark:text-gray-100">
            {total != null ? formatCurrency(total) : '—'}
          </div>
        );
      },
      size: 110,
      enableSorting: true,
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);
        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm italic text-gray-500">Various</div>;
        }
        const status = proposal.status || 'Draft';

        // Pending Approval: Show static badge with approve button for Admin/Owner
        if (status === 'Pending Approval') {
          const canApprove = (userRole === 'Owner' || userRole === 'Admin') && onApproveProposal;
          return (
            <div className="flex items-center gap-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status]}`}>
                Pending
              </span>
              {canApprove && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onApproveProposal(proposal.id);
                        }}
                        className="p-1 rounded hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Approve & Submit</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        }

        return (
          <Select value={status} onValueChange={(value) => handleStatusChangeWithConfirm(proposal, value)}>
            <SelectTrigger className={`w-24 h-6 border-0 text-xs px-2 ${STATUS_COLORS[status]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_SELECTABLE_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      size: 150,
      enableSorting: false,
    }),
    columnHelper.accessor('created_at', {
      id: 'created_at',
      header: () => <span>Created</span>,
      cell: ({ row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);
        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm italic text-gray-500">Various</div>;
        }
        return (
          <div className="text-[13px] text-gray-900 dark:text-gray-100">
            {proposal.created_at ? formatTimestamp(proposal.created_at) : '—'}
          </div>
        );
      },
      size: 110,
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const proposal = row.original;
        const groupInfo = proposalToGroupMap.get(proposal.id);
        const hasMultipleVersions = groupInfo?.hasMultipleVersions || false;
        const isArchived = proposal.archived;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 p-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border shadow-lg z-50">
              {!hasMultipleVersions && (
                <>
                  <DropdownMenuItem onClick={() => { trackEvent('proposal_menu_action', { action: 'edit' }); onEditProposal(proposal); }}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  {onCreateVersion && (
                    <DropdownMenuItem onClick={() => { trackEvent('proposal_menu_action', { action: 'create_version' }); onCreateVersion(proposal.id); }}>
                      <Copy className="mr-2 h-4 w-4" /> Create Version
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              {/* Manage Reminders - for non-draft proposals */}
              {!hasMultipleVersions && onManageReminders && proposal.status !== 'Draft' && (
                <DropdownMenuItem onClick={() => { trackEvent('proposal_menu_action', { action: 'manage_reminders' }); onManageReminders(proposal.id, proposal.proposal_number || undefined); }}>
                  <Bell className="mr-2 h-4 w-4" /> Manage Reminders
                </DropdownMenuItem>
              )}
              {/* Project Board options - only for Won + main version proposals */}
              {proposal.status === 'Won' && proposal.is_main_version && (
                proposal.is_on_board ? (
                  <DropdownMenuItem onClick={() => { trackEvent('proposal_menu_action', { action: 'remove_from_board' }); handleRemoveFromBoard(proposal.id); }}>
                    <X className="mr-2 h-4 w-4" /> Remove from Board
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => { trackEvent('proposal_menu_action', { action: 'send_to_board' }); handleSendToBoard(proposal.id); }}>
                    <Kanban className="mr-2 h-4 w-4" /> Send to Project Board
                  </DropdownMenuItem>
                )
              )}
              {isArchived ? (
                onUnarchiveProposal && (
                  <DropdownMenuItem onClick={() => { trackEvent('proposal_menu_action', { action: 'unarchive' }); onUnarchiveProposal(proposal.id); }}>
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                  </DropdownMenuItem>
                )
              ) : (
                onArchiveProposal && (
                  <DropdownMenuItem onClick={() => { trackEvent('proposal_menu_action', { action: 'archive' }); onArchiveProposal(proposal.id); }}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                )
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  trackEvent('proposal_menu_action', { action: 'delete' });
                  const baseNumber = getBaseProposalNumber(proposal.proposal_number || '');
                  setDeleteInfo({
                    id: proposal.id,
                    type: hasMultipleVersions ? 'group' : 'single',
                    baseNumber,
                    versionCount: groupInfo?.versions.length || 1,
                    isMainVersion: proposal.is_main_version === true,
                  });
                }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {hasMultipleVersions ? 'Delete All Versions' : 'Delete'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 60,
      enableSorting: false,
    }),
  ], [proposalGroups, proposalToGroupMap, expanded, versionSelection, handleStatusChangeWithConfirm, onEditProposal, onCreateVersion, onArchiveProposal, onUnarchiveProposal, handleSendToBoard, handleRemoveFromBoard, userRole, onApproveProposal, onManageReminders]);

  const table = useReactTable({
    data: displayProposals,
    columns,
    state: { sorting, globalFilter, columnVisibility, columnSizing, rowSelection, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode,
  });

  const rowHeight = dataDensity === 'compact' ? 'h-9' : dataDensity === 'comfortable' ? 'h-11' : 'h-14';
  const headerHeight = dataDensity === 'compact' ? 'h-8' : dataDensity === 'comfortable' ? 'h-9' : 'h-10';
  const paddingY = dataDensity === 'compact' ? 'py-1' : dataDensity === 'comfortable' ? 'py-1.5' : 'py-2';

  return (
    <div className="space-y-0">
      {/* Table with integrated header */}
      <div style={{ borderRadius: 'var(--radius-quotes-table, 8px)' }} className="border border-gray-200 bg-white dark:bg-[var(--content-card-bg)] dark:border-[var(--content-card-border)] shadow-sm overflow-hidden">
        {/* Combined Search and Toolbar */}
        <div className="flex items-center py-4 px-4 bg-white dark:bg-[var(--content-card-bg)] border-b border-gray-200 dark:border-[var(--content-card-border)] min-h-[72px]">
          {/* Enhanced Search Input with Suggestions */}
          <div className="relative flex-1 mr-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <input
              type="text"
              placeholder="Search by name, client, proposal #... (e.g. client:Acme)"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full pl-10 pr-20 py-2 text-sm border border-gray-300 dark:border-[var(--input-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--sidebar-icon-active)] dark:focus:ring-[var(--sidebar-icon-active)] focus:border-[var(--sidebar-icon-active)] dark:bg-[var(--input-bg)] dark:text-[var(--input-text)]"
            />
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 z-10">
              {searchInput && (
                <Button variant="ghost" size="sm" onClick={clearSearch} className="w-8 h-6 p-0 rounded-full">
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchInput(suggestion);
                      setGlobalFilter(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    <Search className="w-3 h-3 text-gray-400" />
                    <span className="truncate">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toolbar */}
          <ProposalsTableToolbar
            table={table}
            proposals={proposals}
            dataDensity={dataDensity}
            setDataDensity={setDataDensity}
            columnVisibilityOpen={columnVisibilityOpen}
            setColumnVisibilityOpen={setColumnVisibilityOpen}
            columnLabels={COLUMN_LABELS}
            showArchived={showArchived}
            archivedCount={archivedCount}
            onToggleArchive={onToggleArchive}
            versionSelection={versionSelection}
            setVersionSelection={setVersionSelection}
            onCreateProposal={onCreateProposal}
            onImportProposal={onImportProposal}
            onBulkDelete={onBulkDelete}
            onBulkStatusChange={onBulkStatusChange}
            onCreateVersion={onCreateVersion}
            onExportCSV={onExportCSV}
            onExportPDF={onExportPDF}
          />
        </div>

        {/* Table Area */}
        <div className="relative">
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] scroll-smooth">
            <table
              className="w-full border-collapse font-table"
              style={{
                fontFamily: 'var(--font-table)',
                width: table.getCenterTotalSize(),
                minWidth: '100%',
                tableLayout: 'fixed',
              }}
            >
              <thead className="bg-[#EE6C4D]/10 border-b border-[#EE6C4D]/20 sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, headerIndex) => {
                      const isSelectColumn = header.id === 'select';
                      const isActionsColumn = header.id === 'actions';
                      const isLastColumn = headerIndex === headerGroup.headers.length - 1;
                      const columnPadding = isSelectColumn ? 'px-1' : 'px-3';
                      const canResize = header.column.getCanResize() && !isSelectColumn && !isActionsColumn;
                      const columnBorder = !isLastColumn ? 'border-r border-gray-200 dark:border-gray-700' : '';

                      return (
                        <th
                          key={header.id}
                          className={`relative ${columnPadding} py-1 text-left text-xs font-medium text-gray-500 ${headerHeight} group ${columnBorder}`}
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={`flex items-center ${isSelectColumn ? 'justify-center' : 'space-x-1'} ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 -m-1' : ''}`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <div className="flex flex-col">
                                  {header.column.getIsSorted() === 'asc' ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
                                  ) : header.column.getIsSorted() === 'desc' ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                                  ) : (
                                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Column Resize Handle */}
                          {canResize && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none opacity-0 group-hover:opacity-100 transition-opacity ${
                                header.column.getIsResizing() ? 'bg-blue-500 opacity-100' : 'bg-gray-300 hover:bg-gray-400'
                              }`}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-20">
                      <div className="flex flex-col items-center justify-center text-center">
                        {globalFilter ? (
                          <>
                            <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-base font-semibold text-[var(--content-header-text)] mb-1">
                              No results found
                            </p>
                            <p className="text-sm text-[var(--content-muted-text)] mb-5">
                              No proposals match "{globalFilter}". Try a different search term.
                            </p>
                            <Button
                              variant="outline"
                              size="default"
                              onClick={clearSearch}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Clear Search
                            </Button>
                          </>
                        ) : showArchived ? (
                          <>
                            <Archive className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-base font-semibold text-[var(--content-header-text)] mb-1">
                              No archived proposals
                            </p>
                            <p className="text-sm text-[var(--content-muted-text)]">
                              Archived proposals will appear here.
                            </p>
                          </>
                        ) : (
                          <>
                            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="text-base font-semibold text-[var(--content-header-text)] mb-1">
                              No proposals...
                            </p>
                            <p className="text-sm text-[var(--content-muted-text)] mb-5">
                              Start visualizing your proposal pipeline. Add or import a new proposal.
                            </p>
                            <div className="flex gap-3">
                              {onImportProposal && (
                                <Button variant="outline" size="default" onClick={onImportProposal}>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Import
                                </Button>
                              )}
                              {onCreateProposal && (
                                <Button size="default" onClick={onCreateProposal} className="bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white">
                                  <Plus className="w-4 h-4 mr-2" />
                                  New Proposal
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.map(row => {
                  const proposal = row.original;
                  const versionGroup = proposalToGroupMap.get(proposal.id);
                  const baseNumber = getBaseProposalNumber(proposal.proposal_number || '');
                  const isExpanded = expanded[baseNumber];

                  return (
                    <React.Fragment key={row.id}>
                      {/* Main Row */}
                      <tr className={`group transition-colors ${rowHeight} hover:bg-gray-50/50 dark:hover:bg-[var(--content-table-row-hover)]`}>
                        {row.getVisibleCells().map((cell, cellIndex) => {
                          const isSelectColumn = cell.column.id === 'select';
                          const isLastColumn = cellIndex === row.getVisibleCells().length - 1;
                          const columnPadding = isSelectColumn ? 'px-1' : 'px-3';
                          const columnBorder = !isLastColumn ? 'border-r border-gray-100 dark:border-gray-700' : '';
                          return (
                            <td key={cell.id} className={`${columnPadding} ${paddingY} text-xs ${columnBorder}`} style={{ width: cell.column.getSize() }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expanded Version Rows - use same column widths as main table */}
                      {isExpanded && versionGroup && versionGroup.hasMultipleVersions && (
                        versionGroup.versions.map((version) => (
                          <tr key={`${row.id}-version-${version.id}`} className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                            <td className="px-1 py-1 border-r border-gray-100 dark:border-gray-700" style={{ width: table.getColumn('select')?.getSize() }}>
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  checked={versionSelection[version.id] || false}
                                  onChange={(e) => setVersionSelection(prev => ({ ...prev, [version.id]: e.target.checked }))}
                                />
                              </div>
                            </td>
                            <td className="px-3 py-1 border-r border-gray-100 dark:border-gray-700" style={{ width: table.getColumn('proposal_number')?.getSize() }}>
                              {(() => {
                                // Check if this version is expired
                                const versionFormData = version.form_data as Record<string, any> | null;
                                const versionValidUntil = versionFormData?.info?.validUntil as string | undefined;
                                const nowDate = new Date();
                                const todayDateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`;
                                const versionIsExpired = versionValidUntil ? versionValidUntil < todayDateStr : false;
                                const versionExpiredDate = versionValidUntil
                                  ? new Date(versionValidUntil + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : '';

                                return (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-gray-300 text-xs">└</span>
                                    {/* Expired indicator for child version */}
                                    {versionIsExpired && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Proposal no longer valid as of {versionExpiredDate}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    {/* Unfinished indicator for child version */}
                                    {!(version.is_complete ?? false) && (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Unfinished</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                    <span className="font-mono text-xs text-gray-500">{version.proposal_number}</span>
                                    <button
                                      className={`transition-colors cursor-pointer ${
                                        version.is_main_version === true
                                          ? 'text-amber-500 hover:text-amber-600'
                                          : 'text-gray-400 hover:text-amber-600'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onSetMainVersion) onSetMainVersion(version.id, versionGroup.baseNumber);
                                        setMainVersions(prev => ({ ...prev, [versionGroup.baseNumber]: version.id }));
                                      }}
                                      title={version.is_main_version === true ? 'Current main version (click to keep)' : 'Set as main version'}
                                    >
                                      <Star className={`w-3 h-3 ${version.is_main_version === true ? 'fill-amber-400 stroke-amber-500' : ''}`} />
                                    </button>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-3 py-1 border-r border-gray-100 dark:border-gray-700" style={{ width: table.getColumn('project_name')?.getSize() }}>
                              <div className="space-y-0 min-w-0">
                                <span className="text-[13px] text-gray-700 dark:text-gray-300 truncate block">{version.project_name || '—'}</span>
                                {version.job_location && (
                                  <div className="text-xs text-gray-500 truncate">{version.job_location}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1 text-[13px] text-gray-700 dark:text-gray-300 truncate border-r border-gray-100 dark:border-gray-700" style={{ width: table.getColumn('client_name')?.getSize() }}>
                              {version.client_name || version.client_company || '—'}
                            </td>
                            <td className="px-3 py-1 text-[13px] text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700" style={{ width: table.getColumn('total_value')?.getSize() }}>
                              {version.total_value != null ? formatCurrency(version.total_value) : '—'}
                            </td>
                            <td className="px-3 py-1 border-r border-gray-100 dark:border-gray-700" style={{ width: table.getColumn('status')?.getSize() }}>
                              {version.status === 'Pending Approval' ? (
                                <div className="flex items-center gap-1">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS['Pending Approval']}`}>
                                    Pending
                                  </span>
                                  {(userRole === 'Owner' || userRole === 'Admin') && onApproveProposal && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onApproveProposal(version.id);
                                            }}
                                            className="p-1 rounded hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Approve & Submit</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              ) : (
                                <Select value={version.status || 'Draft'} onValueChange={(value) => handleStatusChangeWithConfirm(version, value)}>
                                  <SelectTrigger className={`w-24 h-6 border-0 text-xs px-2 ${STATUS_COLORS[version.status || 'Draft']}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {USER_SELECTABLE_STATUSES.map(s => (
                                      <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </td>
                            <td className="px-3 py-1 text-[13px] text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700" style={{ width: table.getColumn('created_at')?.getSize() }}>
                              {version.created_at ? formatTimestamp(version.created_at) : '—'}
                            </td>
                            <td className="px-3 py-1" style={{ width: table.getColumn('actions')?.getSize() }}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-6 w-6 p-0 flex items-center justify-center text-gray-400 hover:text-gray-600">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border shadow-lg z-50">
                                  <DropdownMenuItem onClick={() => onEditProposal(version)}>
                                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  {version.archived ? (
                                    onUnarchiveProposal && (
                                      <DropdownMenuItem onClick={() => onUnarchiveProposal(version.id)}>
                                        <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                                      </DropdownMenuItem>
                                    )
                                  ) : (
                                    onArchiveProposal && (
                                      <DropdownMenuItem onClick={() => onArchiveProposal(version.id)}>
                                        <Archive className="mr-2 h-4 w-4" /> Archive
                                      </DropdownMenuItem>
                                    )
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDeleteInfo({
                                        id: version.id,
                                        type: 'version',
                                        baseNumber: versionGroup.baseNumber,
                                        versionCount: versionGroup.versions.length,
                                        isMainVersion: version.is_main_version === true,
                                      });
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Version
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-[var(--content-card-border)]">
          <div className="text-sm text-gray-500">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length} results
          </div>
          <div className="flex items-center gap-2">
            {/* Page Size Selector */}
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-16 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 50, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* First Page */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              «
            </Button>

            {/* Previous Page */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              ‹
            </Button>

            {/* Page Info */}
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
            </span>

            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              ›
            </Button>

            {/* Last Page */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              »
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteInfo} onOpenChange={() => setDeleteInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteInfo?.type === 'group'
                ? `Delete All ${deleteInfo.versionCount} Versions`
                : deleteInfo?.type === 'version'
                ? 'Delete Version'
                : 'Delete Proposal'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteInfo?.type === 'group' ? (
                <>
                  This will permanently delete <strong>{deleteInfo.baseNumber}</strong> and all {deleteInfo.versionCount} versions.
                  This action cannot be undone.
                </>
              ) : deleteInfo?.type === 'version' ? (
                deleteInfo.isMainVersion ? (
                  <>
                    This is the <strong>main version</strong>. Deleting it will promote the next most recent version to main.
                    Are you sure you want to continue?
                  </>
                ) : (
                  <>
                    This will delete this version only. The main version and other versions will remain.
                    This action cannot be undone.
                  </>
                )
              ) : (
                'Are you sure you want to delete this proposal? This action cannot be undone.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteInfo) return;

                if (deleteInfo.type === 'group' && onDeleteVersionGroup) {
                  onDeleteVersionGroup(deleteInfo.baseNumber);
                } else if (deleteInfo.type === 'version' && onDeleteVersion) {
                  onDeleteVersion(deleteInfo.id);
                } else {
                  onDeleteProposal(deleteInfo.id);
                }
                setDeleteInfo(null);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteInfo?.type === 'group' ? 'Delete All' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation (for status changes with side effects) */}
      <AlertDialog open={!!statusChangeConfirm} onOpenChange={() => setStatusChangeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status to {statusChangeConfirm?.newStatus}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{statusChangeConfirm?.proposalNumber}</strong> is currently marked as <strong>{statusChangeConfirm?.currentStatus}</strong>.
              {statusChangeConfirm?.currentStatus === 'Won' && statusChangeConfirm?.newStatus === 'Rejected' && (
                <> Changing to Rejected will remove it from the Project Board and affect your Analytics.</>
              )}
              {statusChangeConfirm?.currentStatus === 'Won' && statusChangeConfirm?.newStatus !== 'Rejected' && (
                <> Changing to {statusChangeConfirm?.newStatus} will remove it from the Project Board and affect your Analytics.</>
              )}
              {statusChangeConfirm?.currentStatus === 'Rejected' && (
                <> Are you sure you want to reopen this proposal?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (statusChangeConfirm) {
                  onStatusChange(statusChangeConfirm.proposalId, statusChangeConfirm.newStatus);
                  setStatusChangeConfirm(null);
                }
              }}
            >
              Yes, Change Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
