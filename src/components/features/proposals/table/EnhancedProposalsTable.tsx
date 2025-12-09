/**
 * Enhanced Proposals Table
 * Feature-rich table matching the EnhancedQuotesTable styling
 */

import React, { useState, useMemo } from 'react';
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
  Edit3, Trash2, Copy, Archive, ArchiveRestore, ChevronRight, Star, Search, X, AlertTriangle, Plus, Upload, FileText
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
import { ProposalsTableToolbar } from './components/ProposalsTableToolbar';
import { groupProposalsByVersion, getBaseProposalNumber, type ProposalVersionGroup } from '@/utils/proposalVersionGrouping';
import { formatDateEST } from '@/utils/dateUtils';

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
}

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-800',
  Incomplete: 'bg-yellow-100 text-yellow-800',
  Submitted: 'bg-purple-100 text-purple-800',
  Won: 'bg-emerald-100 text-emerald-800',
  Rejected: 'bg-red-100 text-red-800',
};

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
}) => {
  // State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [versionSelection, setVersionSelection] = useState<Record<string, boolean>>({});
  const [dataDensity, setDataDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<DeleteInfo | null>(null);
  const [mainVersions, setMainVersions] = useState<Record<string, string>>({});
  const columnResizeMode: ColumnResizeMode = 'onChange';

  // Group proposals by version
  const proposalGroups = useMemo(() => groupProposalsByVersion(proposals), [proposals]);

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
      ),
      cell: ({ row }) => {
        const proposal = row.original;
        const versionGroup = proposalToGroupMap.get(proposal.id);
        return (
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
        const proposalNumber = getValue() || '';
        const baseNumber = getBaseProposalNumber(proposalNumber);
        const isExpanded = expanded[baseNumber] === true;
        const hasMultipleVersions = versionGroup && versionGroup.hasMultipleVersions;
        const displayNumber = hasMultipleVersions ? baseNumber : proposalNumber;

        return (
          <div className="flex items-center gap-1.5 group/versions">
            <div className="font-mono text-[13px] text-gray-900 dark:text-gray-100">
              {displayNumber}
            </div>
            {hasMultipleVersions && versionGroup && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(prev => ({ ...prev, [baseNumber]: !prev[baseNumber] }));
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
        const projectName = proposal.project_name || 'Untitled';
        const jobLocation = proposal.job_location || '';
        const isComplete = proposal.is_complete ?? false;
        return (
          <div className="space-y-0 min-w-0">
            <div className="flex items-center gap-1.5">
              {!isComplete && (
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
              <span className="text-[13px] text-gray-900 dark:text-gray-100 truncate" title={projectName}>{projectName}</span>
            </div>
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
        const total = proposal.total_value || 0;
        return <div className="text-[13px] text-gray-900 dark:text-gray-100">{formatCurrency(total)}</div>;
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
        return (
          <Select value={status} onValueChange={(value) => onStatusChange(proposal.id, value)}>
            <SelectTrigger className={`w-24 h-6 border-0 text-xs px-2 ${STATUS_COLORS[status]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Draft', 'Incomplete', 'Submitted', 'Won', 'Rejected'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      size: 130,
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
        return <div className="text-[13px] text-gray-900 dark:text-gray-100">{formatDateEST(proposal.created_at)}</div>;
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
                  <DropdownMenuItem onClick={() => onEditProposal(proposal)}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  {onCreateVersion && (
                    <DropdownMenuItem onClick={() => onCreateVersion(proposal.id)}>
                      <Copy className="mr-2 h-4 w-4" /> Create Version
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
              {isArchived ? (
                onUnarchiveProposal && (
                  <DropdownMenuItem onClick={() => onUnarchiveProposal(proposal.id)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Unarchive
                  </DropdownMenuItem>
                )
              ) : (
                onArchiveProposal && (
                  <DropdownMenuItem onClick={() => onArchiveProposal(proposal.id)}>
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                )
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
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
  ], [proposalGroups, proposalToGroupMap, expanded, versionSelection, onStatusChange, onEditProposal, onCreateVersion, onArchiveProposal, onUnarchiveProposal]);

  const table = useReactTable({
    data: displayProposals,
    columns,
    state: { sorting, globalFilter, columnVisibility, columnSizing, rowSelection, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
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
          {/* Search Input */}
          <div className="relative flex-1 mr-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search proposals..."
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-sm border border-gray-300 dark:border-[var(--input-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--sidebar-icon-active)] dark:focus:ring-[var(--sidebar-icon-active)] focus:border-[var(--sidebar-icon-active)] dark:bg-[var(--input-bg)] dark:text-[var(--input-text)]"
            />
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {globalFilter && (
                <Button variant="ghost" size="sm" onClick={() => setGlobalFilter('')} className="w-8 h-6 p-0 rounded-full">
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
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
              }}
            >
              <thead className="bg-[#EE6C4D]/10 border-b border-[#EE6C4D]/20 sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, headerIndex) => {
                      const isSelectColumn = header.id === 'select';
                      const isProposalColumn = header.id === 'proposal_number';
                      const isActionsColumn = header.id === 'actions';
                      const isLastColumn = headerIndex === headerGroup.headers.length - 1;
                      const columnPadding = isSelectColumn ? 'pl-3 pr-1' : isProposalColumn ? 'pl-1 pr-3' : 'px-3';
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
                              className={`flex items-center space-x-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 -m-1' : ''}`}
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
                          const isProposalColumn = cell.column.id === 'proposal_number';
                          const isLastColumn = cellIndex === row.getVisibleCells().length - 1;
                          const columnPadding = isSelectColumn ? 'pl-3 pr-1' : isProposalColumn ? 'pl-1 pr-3' : 'px-3';
                          const columnBorder = !isLastColumn ? 'border-r border-gray-100 dark:border-gray-700' : '';
                          return (
                            <td key={cell.id} className={`${columnPadding} ${paddingY} text-xs ${columnBorder}`} style={{ width: cell.column.getSize() }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expanded Version Rows */}
                      {isExpanded && versionGroup && versionGroup.hasMultipleVersions && (
                        versionGroup.versions.map((version) => (
                          <tr key={`${row.id}-version-${version.id}`} className="bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100/50 dark:hover:bg-gray-700/50">
                            <td className="pl-3 pr-1 py-1 border-r border-gray-100 dark:border-gray-700">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={versionSelection[version.id] || false}
                                onChange={(e) => setVersionSelection(prev => ({ ...prev, [version.id]: e.target.checked }))}
                              />
                            </td>
                            <td className="pl-1 pr-3 py-1 border-r border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-1.5">
                                <span className="text-gray-300 text-xs">└</span>
                                <span className="font-mono text-xs text-gray-500">{version.proposal_number}</span>
                                {version.is_main_version === true ? (
                                  <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                                ) : (
                                  <button
                                    className="text-gray-400 hover:text-amber-600 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSetMainVersion) onSetMainVersion(version.id, versionGroup.baseNumber);
                                      setMainVersions(prev => ({ ...prev, [versionGroup.baseNumber]: version.id }));
                                    }}
                                    title="Set as main version"
                                  >
                                    <Star className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-1 border-r border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-1.5">
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
                                <span className="text-[13px] text-gray-700 dark:text-gray-300 truncate">{version.project_name || '—'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-1 text-[13px] text-gray-700 dark:text-gray-300 truncate border-r border-gray-100 dark:border-gray-700">
                              {version.client_name || version.client_company || '—'}
                            </td>
                            <td className="px-3 py-1 text-[13px] text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">
                              {formatCurrency(version.total_value || 0)}
                            </td>
                            <td className="px-3 py-1 border-r border-gray-100 dark:border-gray-700">
                              <Select value={version.status || 'Draft'} onValueChange={(value) => onStatusChange(version.id, value)}>
                                <SelectTrigger className={`w-24 h-6 border-0 text-xs px-2 ${STATUS_COLORS[version.status || 'Draft']}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {['Draft', 'Incomplete', 'Submitted', 'Won', 'Rejected'].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-1 text-[13px] text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-700">
                              {formatDateEST(version.created_at)}
                            </td>
                            <td className="px-3 py-1">
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
          <div className="text-sm text-gray-500">{table.getFilteredRowModel().rows.length} proposal(s)</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
            <span className="text-sm">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
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
    </div>
  );
};
