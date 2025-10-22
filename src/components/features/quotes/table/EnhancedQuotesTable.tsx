import React, { useState, useEffect, useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
  ColumnResizeMode,
  ExpandedState,
  getExpandedRowModel,
} from '@tanstack/react-table';
import {
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Calendar,
  User,
  Building,
  DollarSign,
  Tag,
  Search,
  SlidersHorizontal,
  Eye,
  Download,
  RotateCcw,
  Plus,
  FileSpreadsheet,
  X,
  HelpCircle,
  FileText,
  Archive,
  ArchiveRestore,
  Bell,
  ChevronRight,
  Layers
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Quote } from "@/stores/quotes/quotesStore";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";
import useEnhancedSearch from '@/hooks/useEnhancedSearch';
import { PaginationControls } from './components/PaginationControls';
import { formatDateEST, formatDateTimeEST } from '@/utils/dateUtils';
import { groupQuotesByVersion, getBaseProposalNumber } from '@/utils/quoteVersionGrouping';
import type { QuoteVersionGroup } from '@/utils/quoteVersionGrouping';


interface EnhancedQuotesTableProps {
  quotes: Quote[];
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onFollowUpDateChange?: (id: string, date: Date | null) => void;
  onSetReminder?: (id: string) => void;
  onQuoteSourceChange: (id: string, source: string) => void;
  onCreateVersion?: (id: string) => void;
  onCreateQuote?: () => void;
  onArchiveQuote?: (id: string) => void;
  onUnarchiveQuote?: (id: string) => void;
  isArchiveView?: boolean;
  showArchived?: boolean;
  archivedCount?: number;
  onToggleArchive?: () => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onBulkArchive?: (ids: string[]) => void;
  onBulkUnarchive?: (ids: string[]) => void;
  onExportCSV?: (filteredData: Quote[]) => void;
  onExportPDF?: (filteredData: Quote[]) => void;
}

const statusColors = {
  Incomplete: "bg-gray-100 text-gray-800",
  Draft: "bg-blue-100 text-blue-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Submitted: "bg-blue-100 text-blue-800",
  Won: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const getQuoteSourceOptions = () => [
  { value: "Manual", label: "Manual Entry" },
  { value: "Website_Lead", label: "Website Lead" },
  { value: "Contractor_Referral", label: "Contractor Referral" },
  { value: "Phone_Inquiry", label: "Phone Inquiry" },
  { value: "Email_Inquiry", label: "Email Inquiry" },
  { value: "Trade_Show", label: "Trade Show" },
  { value: "Repeat_Customer", label: "Repeat Customer" }
];

const columnLabels: Record<string, string> = {
  proposal_number: "Proposal #",
  project_name: "Project Name",
  client_name: "Client",
  total: "Total Amount",
  status: "Status",
  quote_source: "Quote Source",
  created_by: "Creator",
  created_at: "Date Created",
  updated_at: "Last Updated",
  actions: "Actions"
};

const getAvailableStatusOptions = (currentStatus: string) => {
  const allStatuses = [
    { value: "Incomplete", label: "Incomplete" },
    { value: "Draft", label: "Draft" },
    { value: "Pending", label: "Pending" },
    { value: "Submitted", label: "Submitted" },
    { value: "Won", label: "Won" },
    { value: "Rejected", label: "Rejected" }
  ];

  if (currentStatus === "Incomplete") return allStatuses;
  if (currentStatus === "Draft") return allStatuses.filter(s => s.value !== "Incomplete");

  const completedStatuses = ["Pending", "Submitted", "Won", "Rejected"];
  if (completedStatuses.includes(currentStatus)) {
    return allStatuses.filter(s => s.value !== "Incomplete" && s.value !== "Draft");
  }
  return allStatuses;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatLastUpdated = (time: string) => {
  return formatDateTimeEST(time);
};



export const EnhancedQuotesTable: React.FC<EnhancedQuotesTableProps> = ({
  quotes,
  onEditQuote,
  onDeleteQuote,
  onStatusChange,
  onFollowUpDateChange,
  onQuoteSourceChange,
  onCreateVersion,
  onSetReminder,
  onCreateQuote,
  onArchiveQuote,
  onUnarchiveQuote,
  isArchiveView = false,
  showArchived = false,
  archivedCount = 0,
  onToggleArchive,
  onBulkDelete,
  onBulkStatusChange,
  // onBulkArchive,
  // onBulkUnarchive,
  onExportCSV,
  onExportPDF
}) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [forceUpdate, setForceUpdate] = useState(0);
  const [dataDensity, setDataDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
  const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  // Group quotes by version
  const quoteGroups = useMemo(() => groupQuotesByVersion(quotes), [quotes]);

  // Create display data: show only the "latest" version from each group as the main row
  const displayQuotes = useMemo(() => {
    return quoteGroups.map(group => group.latestVersion);
  }, [quoteGroups]);

  // Map to find version group for each quote
  const quoteToGroupMap = useMemo(() => {
    const map = new Map<string, QuoteVersionGroup>();
    quoteGroups.forEach(group => {
      group.versions.forEach(version => {
        map.set(version.id, group);
      });
    });
    return map;
  }, [quoteGroups]);

  // Enhanced search functionality
  const { search, getSearchExamples } = useEnhancedSearch(quotes);
  const searchExamples = getSearchExamples();

  // Custom filter function using enhanced search
  const enhancedFilter = React.useCallback((row: any, _columnId: string, filterValue: string) => {
    if (!filterValue) return true;

    const searchResults = search(filterValue);
    const resultIds = new Set(searchResults.map(result => result.item.id));

    return resultIds.has(row.original.id);
  }, [search]);

  // Store original column sizes for reset functionality
  const originalColumnSizes = useMemo(() => ({
    select: 50,
    proposal_number: 150,
    project_name: 300,
    client_name: 200,
    total: 150,
    status: 150,
    quote_source: 180,
    created_by: 150,
    created_at: 120,
    actions: 80,
  }), []);

  // Reset column sizes to original
  const resetColumnSizes = () => {
    table.getAllColumns().forEach(column => {
      const originalSize = originalColumnSizes[column.id as keyof typeof originalColumnSizes];
      if (originalSize) {
        column.resetSize();
      }
    });
  };

  // Reset column visibility to show all columns
  const resetColumnVisibility = () => {
    table.getAllColumns().forEach(column => {
      if (column.getCanHide()) {
        column.toggleVisibility(true);
      }
    });
    setColumnVisibility({});
  };

  // Update follow-up times every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setForceUpdate(prev => prev + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const columnHelper = createColumnHelper<Quote>();

  const columns = useMemo<ColumnDef<Quote, any>[]>(() => [
    // Selection column
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      size: 50,
      enableSorting: false,
      enableResizing: false,
    }),
    columnHelper.accessor('proposal_number', {
      id: 'proposal_number',
      header: () => (
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Proposal #
        </div>
      ),
      cell: ({ getValue, row }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);
        const baseNumber = getBaseProposalNumber(getValue());
        const isExpanded = expanded[baseNumber];
        const hasMultipleVersions = versionGroup && versionGroup.hasMultipleVersions;

        return (
          <div className="flex items-center gap-2">
            <div className="font-mono text-sm font-medium">
              {baseNumber}
            </div>
            {hasMultipleVersions && (
              <button
                onClick={() => setExpanded(prev => ({
                  ...prev as object,
                  [baseNumber]: !prev[baseNumber]
                }))}
                className="hover:bg-gray-100 rounded p-1 transition-colors"
              >
                <Badge variant="secondary" className="flex items-center gap-1 text-xs cursor-pointer">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <Layers className="h-3 w-3" />
                </Badge>
              </button>
            )}
          </div>
        );
      },
      size: 200,
      enableSorting: true,
    }),
    columnHelper.accessor((row) => `${row.project_name || row.quote_details?.project_name || "Untitled Project"}`, {
      id: 'project_name',
      header: () => (
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4" />
          Project Name
        </div>
      ),
      cell: ({ row }) => {
        const projectName = row.original.project_name || row.original.quote_details?.project_name || "Untitled Project";
        const projectLocation = row.original.job_details?.job_location || "";
        return (
          <div className="space-y-1">
            <div className="font-medium text-sm">{projectName}</div>
            {projectLocation && (
              <div className="text-xs text-gray-500">{projectLocation}</div>
            )}
          </div>
        );
      },
      size: 400,
      enableSorting: false,
    }),
    columnHelper.accessor((row) => row.job_details?.client_company || row.job_details?.client_name || "Untitled Client", {
      id: 'client_name',
      header: () => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          Client Name
        </div>
      ),
      cell: ({ row }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          // Check if all versions have the same client
          const clients = versionGroup.versions.map(v =>
            v.job_details?.client_company || v.job_details?.client_name || ""
          );
          const uniqueClients = [...new Set(clients.filter(c => c))];

          if (uniqueClients.length === 1) {
            return <div className="font-medium text-sm">{uniqueClients[0]}</div>;
          } else {
            return <div className="text-sm text-gray-500 italic">Multiple</div>;
          }
        }

        const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client";
        return <div className="font-medium text-sm">{clientName}</div>;
      },
      size: 200,
      enableSorting: false,
    }),
    columnHelper.accessor((row) => row.price_details?.final_selling_price || 0, {
      id: 'total',
      header: () => (
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Total
        </div>
      ),
      cell: ({ row }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          const totals = versionGroup.versions.map(v => v.price_details?.final_selling_price || 0);
          const minTotal = Math.min(...totals);
          const maxTotal = Math.max(...totals);

          if (minTotal === maxTotal) {
            return <div className="font-semibold text-sm">{formatCurrency(minTotal)}</div>;
          } else {
            return (
              <div className="text-sm">
                <span className="text-gray-600">{formatCurrency(minTotal)}</span>
                <span className="text-gray-400 mx-1">-</span>
                <span className="text-gray-600">{formatCurrency(maxTotal)}</span>
              </div>
            );
          }
        }

        const total = quote.price_details?.final_selling_price || 0;
        return <div className="font-semibold text-sm">{formatCurrency(total)}</div>;
      },
      size: 150,
      enableSorting: true,
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: ({ row, getValue }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          const statusSummary = versionGroup.statusSummary;

          return (
            <div className="flex flex-wrap gap-1">
              {statusSummary.won > 0 && (
                <Badge className="bg-emerald-100 text-emerald-800 text-xs">
                  {statusSummary.won} Won
                </Badge>
              )}
              {statusSummary.rejected > 0 && (
                <Badge className="bg-red-100 text-red-800 text-xs">
                  {statusSummary.rejected} Rejected
                </Badge>
              )}
              {statusSummary.submitted > 0 && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  {statusSummary.submitted} Submitted
                </Badge>
              )}
              {statusSummary.pending > 0 && (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  {statusSummary.pending} Pending
                </Badge>
              )}
              {statusSummary.draft > 0 && (
                <Badge className="bg-gray-100 text-gray-800 text-xs">
                  {statusSummary.draft} Draft
                </Badge>
              )}
            </div>
          );
        }

        return (
          <Select
            value={getValue() || "Incomplete"}
            onValueChange={(value) => onStatusChange(row.original.id, value)}
          >
            <SelectTrigger className={`w-32 h-8 border-0 text-xs px-3 ${statusColors[getValue() as keyof typeof statusColors]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableStatusOptions(getValue() || "Incomplete").map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      size: 150,
      filterFn: 'equals',
      enableSorting: false,
    }),
    columnHelper.accessor('quote_source', {
      id: 'quote_source',
      header: 'Quote Source',
      cell: ({ row, getValue }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          const sources = versionGroup.versions.map(v => v.quote_source || "");
          const uniqueSources = [...new Set(sources.filter(s => s))];

          if (uniqueSources.length === 1) {
            const source = getQuoteSourceOptions().find(s => s.value === uniqueSources[0]);
            return <div className="text-xs text-gray-600">{source?.label || uniqueSources[0]}</div>;
          } else {
            return <div className="text-sm text-gray-500 italic">Multiple</div>;
          }
        }

        return (
          <Select
            value={getValue() || ""}
            onValueChange={(value) => onQuoteSourceChange(row.original.id, value)}
          >
            <SelectTrigger className="w-full h-8 border-0 text-xs px-3 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {getQuoteSourceOptions().map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      size: 180,
      filterFn: 'equals',
      enableSorting: false,
    }),
    columnHelper.accessor('creator_name', {
      id: 'created_by',
      header: 'Created By',
      cell: ({ getValue }) => (
        <div className="text-sm text-gray-600">{getValue() || 'Unknown'}</div>
      ),
      size: 200,
      enableSorting: false,
    }),
    columnHelper.accessor('created_at', {
      id: 'created_at',
      header: () => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Created At
        </div>
      ),
      cell: ({ getValue }) => (
        <div className="text-sm text-gray-600">
          {formatDateEST(getValue())}
        </div>
      ),
      size: 200,
      enableSorting: true,
    }),
    columnHelper.accessor('updated_at', {
      id: 'updated_at',
      header: () => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Last Updated
        </div>
      ),
      cell: ({ getValue }) => (
        <div className="font-smn= text-gray-600">{formatLastUpdated(getValue())}</div>
      ),
      size: 200,
      enableSorting: true,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
            <DropdownMenuItem onClick={() => onEditQuote(row.original)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {onCreateVersion && (
              <DropdownMenuItem onClick={() => onCreateVersion(row.original.id)}>
                <Copy className="mr-2 h-4 w-4" />
                Create Version
              </DropdownMenuItem>
            )}
            {onSetReminder && (
              <DropdownMenuItem onClick={() => onSetReminder(row.original.id)}>
                <Bell className="mr-2 h-4 w-4" />
                Set Reminder
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isArchiveView && onUnarchiveQuote ? (
              <DropdownMenuItem onClick={() => onUnarchiveQuote(row.original.id)}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </DropdownMenuItem>
            ) : onArchiveQuote && (
              <DropdownMenuItem onClick={() => onArchiveQuote(row.original.id)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteQuote(row.original.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 80,
      enableSorting: false,
    }),
  ], [onEditQuote, onDeleteQuote, onStatusChange, onFollowUpDateChange, onQuoteSourceChange, onCreateVersion, onSetReminder, onArchiveQuote, onUnarchiveQuote, isArchiveView, forceUpdate]);

  const table = useReactTable({
    data: displayQuotes,
    columns,
    filterFns: {
      enhanced: enhancedFilter,
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange' as ColumnResizeMode,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: enhancedFilter,
  });

  return (
    <div className="space-y-0">
      {/* Table with integrated header */}
      <div style={{ borderRadius: 'var(--radius-quotes-table)' }} className="border border-gray-200 bg-white dark:bg-[var(--content-card-bg)] dark:border-[var(--content-card-border)] shadow-sm overflow-hidden">
        {/* Combined Search and Toolbar */}
        <div className="flex items-center py-4 px-4 bg-white border-b border-gray-200">
          {/* Search Input - Very wide, takes most space */}
          <div className="relative flex-1 mr-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search quotes... (try: client:ABC Corp, status:Draft)"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-20 py-2 text-sm border border-gray-300 dark:border-[var(--input-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--sidebar-icon-active)] dark:focus:ring-[var(--sidebar-icon-active)] focus:border-[var(--sidebar-icon-active)] dark:bg-[var(--input-bg)] dark:text-[var(--input-text)]"
            />

            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGlobalFilter('')}
                  className="w-8 h-6 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)] rounded-full"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}

              {!globalFilter && (
                <Popover open={showHelp} onOpenChange={setShowHelp}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-6 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)] rounded-full"
                      title="Search help"
                    >
                      <HelpCircle className="w-3 h-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Search Tips</h4>
                        <div className="text-xs text-gray-600 space-y-1">
                          <p>• Regular search: Just type anything</p>
                          <p>• Field-specific: Use "field:value" format</p>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Field-Specific Examples</h4>
                        <div className="space-y-1">
                          {searchExamples.map((example, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                setGlobalFilter(example);
                                setShowHelp(false);
                              }}
                              className="block w-full text-left"
                            >
                              <Badge
                                variant="outline"
                                className="text-xs hover:bg-blue-50 cursor-pointer w-full justify-start"
                              >
                                {example}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        <p><strong>Available fields:</strong></p>
                        <p>proposal, client, location, status, creator, project</p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Toolbar Controls - Hide when rows are selected */}
          {table.getFilteredSelectedRowModel().rows.length === 0 && (
          <div className="flex items-center space-x-2">
            {/* Archive Toggle Button */}
            {onToggleArchive && (
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleArchive}
                className={`w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)] ${
                  showArchived ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''
                }`}
                title={showArchived ? 'Show Active Quotes' : `View Archives (${archivedCount})`}
              >
                {showArchived ? (
                  <ArchiveRestore className="w-4 h-4" />
                ) : (
                  <Archive className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Data Density */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)]"
                  title={`Table Density: ${dataDensity.charAt(0).toUpperCase() + dataDensity.slice(1)}`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => setDataDensity('compact')}
                  className={dataDensity === 'compact' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-1 rounded mr-2 ${dataDensity === 'compact' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <span className={dataDensity === 'compact' ? 'font-semibold' : ''}>Compact</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDataDensity('comfortable')}
                  className={dataDensity === 'comfortable' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded mr-2 ${dataDensity === 'comfortable' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <span className={dataDensity === 'comfortable' ? 'font-semibold' : ''}>Comfortable</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDataDensity('spacious')}
                  className={dataDensity === 'spacious' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-3 rounded mr-2 ${dataDensity === 'spacious' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                    <span className={dataDensity === 'spacious' ? 'font-semibold' : ''}>Spacious</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Column Visibility */}
            <DropdownMenu open={columnVisibilityOpen} onOpenChange={setColumnVisibilityOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)]"
                  title="Show/Hide Columns"
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" onPointerDownOutside={() => setColumnVisibilityOpen(false)}>
                <div className="p-2" onClick={(e) => e.stopPropagation()}>
                  <div className="text-xs text-gray-500 mb-2 font-medium">Show/Hide Columns</div>
                  {table.getAllColumns()
                    .filter(column => column.getCanHide())
                    .map(column => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-sm py-2"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {columnLabels[column.id] ?? column.id.replace('_', ' ')}
                      </DropdownMenuCheckboxItem>
                    ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)]"
                  title="Export Data"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  if (onExportCSV) {
                    onExportCSV(table.getFilteredRowModel().rows.map(row => row.original));
                  }
                }}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  if (onExportPDF) {
                    onExportPDF(table.getFilteredRowModel().rows.map(row => row.original));
                  }
                }}>
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Reset Controls */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)]"
                  title="Reset Table"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={resetColumnSizes}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Column Sizes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={resetColumnVisibility}>
                  <Eye className="w-4 h-4 mr-2" />
                  Show All Columns
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Create Quote Button - Just a plus icon */}
            {onCreateQuote && (
              <Button
                onClick={onCreateQuote}
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0 bg-[var(--sidebar-icon-active)] hover:bg-[var(--sidebar-icon-hover)] text-white hover:text-white border-[var(--sidebar-icon-active)] hover:border-[var(--sidebar-icon-hover)] dark:bg-[var(--sidebar-icon-active)] dark:hover:bg-[var(--brand-orange-700)]"
                title="Create New Quote"
              >
                <Plus className="w-5 h-5 text-white" />
              </Button>
            )}
          </div>
          )}

          {/* Bulk Actions - Show when rows are selected */}
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <div className="flex items-center space-x-4">
              <div className="text-sm font-medium text-[var(--content-header-text)] dark:text-[var(--content-header-text)]">
                {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row{table.getFilteredSelectedRowModel().rows.length > 1 ? 's' : ''} selected
              </div>

              {/* Change Status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-[var(--sidebar-nav-bg-hover)] px-3">
                    Change Status
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => {
                    if (onBulkStatusChange) {
                      onBulkStatusChange(table.getFilteredSelectedRowModel().rows.map(row => row.original.id), 'Draft');
                    }
                  }}>
                    Set to Draft
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (onBulkStatusChange) {
                      onBulkStatusChange(table.getFilteredSelectedRowModel().rows.map(row => row.original.id), 'Pending');
                    }
                  }}>
                    Set to Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (onBulkStatusChange) {
                      onBulkStatusChange(table.getFilteredSelectedRowModel().rows.map(row => row.original.id), 'Submitted');
                    }
                  }}>
                    Set to Submitted
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (onBulkStatusChange) {
                      onBulkStatusChange(table.getFilteredSelectedRowModel().rows.map(row => row.original.id), 'Won');
                    }
                  }}>
                    Set to Won
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (onBulkStatusChange) {
                      onBulkStatusChange(table.getFilteredSelectedRowModel().rows.map(row => row.original.id), 'Rejected');
                    }
                  }}>
                    Set to Rejected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-[var(--sidebar-nav-bg-hover)] px-3">
                    More Actions
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => {
                    if (onExportCSV) {
                      onExportCSV(table.getFilteredSelectedRowModel().rows.map(row => row.original));
                    }
                  }}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export Selected (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (onExportPDF) {
                      onExportPDF(table.getFilteredSelectedRowModel().rows.map(row => row.original));
                    }
                  }}>
                    <FileText className="w-4 h-4 mr-2" />
                    Export Selected (PDF)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    table.getFilteredSelectedRowModel().rows.forEach(row => {
                      if (onCreateVersion) {
                        onCreateVersion(row.original.id);
                      }
                    });
                  }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate Selected
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (onBulkDelete) {
                        onBulkDelete(table.getFilteredSelectedRowModel().rows.map(row => row.original.id));
                      }
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="relative">
          {/* Scrollable Table Area */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <table
              className="border-collapse font-table"
              style={{
                width: Math.max(table.getTotalSize(), 1900),
                minWidth: '1900px',
                fontFamily: 'var(--font-table)'
              }}
            >
              <thead className="bg-gray-50/80 border-b border-gray-200 sticky top-0 z-10">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isActionsColumn = header.id === 'actions';
                      const rowHeight = dataDensity === 'compact' ? 'h-10' : dataDensity === 'comfortable' ? 'h-12' : 'h-16';
                      
                      return (
                        <th
                          key={header.id}
                          className={`relative px-4 py-3 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0 ${
                            isActionsColumn ? 'sticky right-0 bg-gray-50 border-l border-gray-200 z-20' : ''
                          } ${rowHeight}`}
                          style={{ width: header.getSize() }}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={`flex items-center space-x-2 ${
                                header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 rounded p-1 -m-1' : ''
                              }`}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getCanSort() && (
                                <div className="flex flex-col">
                                  {header.column.getIsSorted() === 'asc' ? (
                                    <ChevronUp className="w-4 h-4 text-blue-600" />
                                  ) : header.column.getIsSorted() === 'desc' ? (
                                    <ChevronDown className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <ArrowUpDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Column Resizer */}
                          {header.column.getCanResize() && (
                            <div
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className={`absolute right-0 top-0 h-full w-1 bg-transparent hover:bg-blue-500 cursor-col-resize select-none touch-none ${
                                header.column.getIsResizing() ? 'bg-blue-500' : ''
                              }`}
                              style={{
                                transform: 'translateX(50%)',
                              }}
                            />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => {
                  const rowHeight = dataDensity === 'compact' ? 'h-10' : dataDensity === 'comfortable' ? 'h-14' : 'h-18';
                  const paddingY = dataDensity === 'compact' ? 'py-1' : dataDensity === 'comfortable' ? 'py-2' : 'py-4';
                  const quote = row.original;
                  const versionGroup = quoteToGroupMap.get(quote.id);
                  const baseNumber = getBaseProposalNumber(quote.proposal_number);
                  const isExpanded = expanded[baseNumber];

                  return (
                    <React.Fragment key={row.id}>
                      {/* Main Row */}
                      <tr
                        className={`group transition-colors border-b border-gray-100 dark:border-[var(--content-table-border)] last:border-b-0 ${rowHeight} hover:bg-gray-50/50 dark:hover:bg-[var(--content-table-row-hover)]`}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const isActionsColumn = cell.column.id === 'actions';
                          return (
                            <td
                              key={cell.id}
                              className={`px-4 ${paddingY} text-sm border-r border-gray-100 dark:border-[var(--content-table-border)] last:border-r-0 ${
                                isActionsColumn
                                  ? 'sticky right-0 bg-white dark:bg-[var(--content-table-bg)] group-hover:bg-gray-50 dark:group-hover:bg-[var(--content-table-row-hover)] border-l border-gray-200 dark:border-[var(--content-table-border)] z-10'
                                  : ''
                              }`}
                              style={{ width: cell.column.getSize() }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expanded Version Rows */}
                      {isExpanded && versionGroup && versionGroup.hasMultipleVersions && (
                        versionGroup.versions.map((version, versionIndex) => (
                          <tr
                            key={`${row.id}-version-${version.id}`}
                            className="bg-gray-50/50 border-l-4 border-l-blue-200 hover:bg-gray-100/50"
                          >
                            {/* Selection */}
                            <td className="px-4 py-2"></td>

                            {/* Proposal Number */}
                            <td className="px-4 py-2 text-sm">
                              <div className="flex items-center gap-2 pl-8">
                                <span className="font-mono text-xs text-gray-600">
                                  {version.proposal_number}
                                </span>
                                {version.id === quote.id && (
                                  <Badge variant="outline" className="text-xs">
                                    Current
                                  </Badge>
                                )}
                              </div>
                            </td>

                            {/* Project Name */}
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {version.project_name || "Untitled"}
                            </td>

                            {/* Client */}
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {version.job_details?.client_company || version.job_details?.client_name || "—"}
                            </td>

                            {/* Total */}
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {formatCurrency(version.price_details?.final_selling_price || 0)}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-2">
                              <Select
                                value={version.status || "Incomplete"}
                                onValueChange={(value) => onStatusChange(version.id, value)}
                              >
                                <SelectTrigger className={`w-32 h-8 border-0 text-xs px-3 ${statusColors[version.status as keyof typeof statusColors]}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {getAvailableStatusOptions(version.status || "Incomplete").map((status) => (
                                    <SelectItem key={status.value} value={status.value}>
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>

                            {/* Quote Source */}
                            <td className="px-4 py-2">
                              <Select
                                value={version.quote_source || ""}
                                onValueChange={(value) => onQuoteSourceChange(version.id, value)}
                              >
                                <SelectTrigger className="w-full h-8 border-0 text-xs px-3 bg-gray-100 text-gray-800">
                                  <SelectValue placeholder="Select source" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getQuoteSourceOptions().map((source) => (
                                    <SelectItem key={source.value} value={source.value}>
                                      {source.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>

                            {/* Created By */}
                            <td className="px-4 py-2 text-xs text-gray-500">
                              {version.creator_name || "Unknown"}
                            </td>

                            {/* Created At */}
                            <td className="px-4 py-2 text-xs text-gray-500">
                              {formatDateEST(version.created_at)}
                            </td>

                            {/* Updated At */}
                            <td className="px-4 py-2 text-xs text-gray-500">
                              {formatLastUpdated(version.updated_at)}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-2 sticky right-0 bg-gray-50/50 border-l border-gray-200">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                                  <DropdownMenuItem onClick={() => onEditQuote(version)}>
                                    <Edit3 className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onDeleteQuote(version.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
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

        {/* Empty State - positioned in main viewing area */}
        {table.getFilteredRowModel().rows.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="flex flex-col items-center space-y-3">
              <Search className="w-12 h-12 text-gray-300" />
              <div className="text-xl font-medium text-gray-600">No quotes found</div>
              <div className="text-gray-500">Try adjusting your search or filters to find what you're looking for</div>
            </div>
          </div>
        )}

        {/* Pagination */}
        <PaginationControls table={table} />
      </div>
    </div>
  );
};