import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  // getExpandedRowModel,
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
  Layers,
  Kanban
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Quote } from '@/services/quotesService';
import { sendQuoteToProjectBoard, removeQuoteFromProjectBoard } from '@/services/quotesService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateQueries } from '@/lib/queryClient';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
// import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";
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
  onSetReminder?: (id: string) => void;
  onQuoteSourceChange: (id: string, source: string) => void;
  onCreateVersion?: (id: string) => void;
  onCreateInvoice?: (quote: Quote) => void;
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
  onMainVersionsChange?: (mainVersions: Quote[]) => void;
  onSetMainVersion?: (quoteId: string, baseProposalNumber: string) => void;
}

const statusColors = {
  Incomplete: "bg-purple-100 text-purple-800",
  Draft: "bg-gray-100 text-gray-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Submitted: "bg-yellow-100 text-yellow-800",
  Won: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-red-100 text-red-800",
};

const getQuoteSourceOptions = () => [
  { value: "Manual Entry", label: "Manual Entry" },
  { value: "Website Lead", label: "Website Lead" },
  { value: "Contractor Referral", label: "Contractor Referral" },
  { value: "Manufacturer Referral", label: "Manufacturer Referral" },
  { value: "Architect Referral", label: "Architect Referral" },
  { value: "Phone Inquiry", label: "Phone Inquiry" },
  { value: "Email Inquiry", label: "Email Inquiry" },
  { value: "Trade Show", label: "Trade Show" },
  { value: "Repeat Customer", label: "Repeat Customer" }
];

// Helper function to format quote source for display (handles custom values)
const formatQuoteSource = (value: string | null | undefined): string => {
  if (!value) return "Not specified";

  const option = getQuoteSourceOptions().find(opt => opt.value === value);
  if (option) return option.label;

  // Return custom values exactly as entered (no transformation)
  return value;
};

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
    { value: "Submitted", label: "Submitted" },
    { value: "Won", label: "Won" },
    { value: "Rejected", label: "Rejected" }
  ];

  if (currentStatus === "Incomplete") return allStatuses;
  if (currentStatus === "Draft") return allStatuses.filter(s => s.value !== "Incomplete");

  const completedStatuses = ["Submitted", "Won", "Rejected"];
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
  onQuoteSourceChange,
  onCreateVersion,
  onCreateInvoice,
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
  onExportPDF,
  onMainVersionsChange,
  onSetMainVersion
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
  const [versionSelection, setVersionSelection] = useState<Record<string, boolean>>({});

  // Track which version is "main" for each base number (stored in local state only)
  const [mainVersions, setMainVersions] = useState<Record<string, string>>({});

  // Toast for notifications
  const { toast } = useToast();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Track pending status changes for confirmation
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    quoteId: string;
    currentStatus: string;
    newStatus: string;
  } | null>(null);

  // Track grouped quote deletion (warns all versions will be deleted)
  const [deleteGroupedQuote, setDeleteGroupedQuote] = useState<{
    id: string;
    baseNumber: string;
    versionCount: number;
  } | null>(null);

  // Group quotes by version
  const quoteGroups = useMemo(() => groupQuotesByVersion(quotes), [quotes]);

  // Create display data: show the main version based on is_main_version flag
  const displayQuotes = useMemo(() => {
    return quoteGroups.map(group => {
      // Priority: is_main_version from database > user selection > group.mainVersion
      const dbMainVersion = group.versions.find(v => v.is_main_version === true);
      if (dbMainVersion) return dbMainVersion;

      const userSelectedMainId = mainVersions[group.baseNumber];
      if (userSelectedMainId) {
        const userSelectedVersion = group.versions.find(v => v.id === userSelectedMainId);
        if (userSelectedVersion) return userSelectedVersion;
      }
      return group.mainVersion;
    });
  }, [quoteGroups, mainVersions]);

  // Track previous displayQuotes to avoid infinite loops
  const prevDisplayQuotesIds = useRef<string>('');

  // Notify parent component when displayQuotes actually changes (for metrics calculation)
  useEffect(() => {
    const currentIds = displayQuotes.map(q => q.id).join(',');
    if (onMainVersionsChange && currentIds !== prevDisplayQuotesIds.current) {
      prevDisplayQuotesIds.current = currentIds;
      onMainVersionsChange(displayQuotes);
    }
  }, [displayQuotes, onMainVersionsChange]);

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

  // Store original column sizes for reset functionality (compact to avoid scroll)
  const originalColumnSizes = useMemo(() => ({
    select: 40,
    proposal_number: 140,
    project_name: 240,
    client_name: 160,
    total: 110,
    status: 130,
    created_at: 110,
    actions: 60,
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

  // Handle sending quote to project board
  const handleSendToBoard = async (quoteId: string) => {
    try {
      console.log('Attempting to send quote to board:', quoteId);
      const result = await sendQuoteToProjectBoard(quoteId);
      console.log('Send result:', result);

      if (result.success) {
        // Invalidate queries to refetch with updated is_on_board status
        invalidateQueries.allQuotes();
        invalidateQueries.allBoard();

        toast({
          title: 'Sent to Project Board',
          description: 'Quote has been added to the project board',
        });
      } else {
        console.error('Failed to send to board:', result.error);
        toast({
          title: 'Error',
          description: result.error || 'Failed to send quote to project board',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Exception sending to board:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  // Handle removing quote from project board
  const handleRemoveFromBoard = async (quoteId: string) => {
    try {
      console.log('Attempting to remove quote from board:', quoteId);
      const result = await removeQuoteFromProjectBoard(quoteId);
      console.log('Remove result:', result);

      if (result.success) {
        // Invalidate queries to refetch with updated is_on_board status
        invalidateQueries.allQuotes();
        invalidateQueries.allBoard();

        toast({
          title: 'Removed from Project Board',
          description: 'Quote has been removed from the project board',
        });
      } else {
        console.error('Failed to remove from board:', result.error);
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove quote from project board',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Exception removing from board:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  // Handle deleting all versions in a group
  const handleDeleteAllVersions = async () => {
    if (!deleteGroupedQuote) return;

    try {
      // Find all quotes with the same base number
      const group = quoteGroups.find(g => g.baseNumber === deleteGroupedQuote.baseNumber);
      if (!group) {
        toast({
          title: 'Error',
          description: 'Could not find quote group',
          variant: 'destructive',
        });
        return;
      }

      // Delete all versions in the group
      for (const version of group.versions) {
        await onDeleteQuote(version.id);
      }

      toast({
        title: 'Deleted',
        description: `All ${deleteGroupedQuote.versionCount} version(s) have been deleted`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete all versions',
        variant: 'destructive',
      });
    } finally {
      setDeleteGroupedQuote(null);
    }
  };

  // Handle status change with confirmation for Won<->Rejected transitions
  const handleStatusChange = (quoteId: string, currentStatus: string, newStatus: string) => {
    // Check if we're switching between Won and Rejected
    const isWonToRejected = currentStatus === 'Won' && newStatus === 'Rejected';
    const isRejectedToWon = currentStatus === 'Rejected' && newStatus === 'Won';

    if (isWonToRejected || isRejectedToWon) {
      // Show confirmation dialog
      setPendingStatusChange({ quoteId, currentStatus, newStatus });
    } else {
      // Proceed directly without confirmation
      onStatusChange(quoteId, newStatus);
    }
  };

  // Confirm status change after user approval
  const confirmStatusChange = async () => {
    if (pendingStatusChange) {
      const { quoteId, newStatus } = pendingStatusChange;

      // Update the status
      onStatusChange(quoteId, newStatus);
      setPendingStatusChange(null);

      // Note: No need to manually remove from board - the database trigger
      // 'sync_project_on_quote_status_change' automatically deletes projects
      // when status changes FROM Won to anything else, and then
      // 'sync_quote_on_board_after_project_changes' updates is_on_board to false
    }
  };

  // Cancel status change
  const cancelStatusChange = () => {
    setPendingStatusChange(null);
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
      header: ({ table }) => {
        const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
          const checked = e.target.checked;

          // Select all main rows
          table.toggleAllPageRowsSelected(checked);

          // Also select all version rows
          if (checked) {
            const newVersionSelection: Record<string, boolean> = {};
            quoteGroups.forEach(group => {
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
        };

        return (
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={table.getIsAllPageRowsSelected()}
            onChange={handleSelectAll}
          />
        );
      },
      cell: ({ row }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        // Checkbox is checked if the main row is selected
        const isChecked = row.getIsSelected();

        const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
          e.stopPropagation();

          const checked = e.target.checked;

          // Toggle the main row (this counts as 1 main selection)
          row.toggleSelected(checked);

          // Also toggle ALL version rows in versionSelection
          // These will be counted separately as "versions" in the display
          if (versionGroup && versionGroup.hasMultipleVersions) {
            const newVersionSelection = { ...versionSelection };
            versionGroup.versions.forEach(version => {
              // Select all versions for visual consistency
              newVersionSelection[version.id] = checked;
            });
            setVersionSelection(newVersionSelection);
          }
        }, [row, versionGroup, versionSelection]);

        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={isChecked}
              onChange={handleChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      },
      size: 40,
      enableSorting: false,
      enableResizing: false,
    }),
    columnHelper.accessor('proposal_number', {
      id: 'proposal_number',
      header: () => (
        <div className="flex items-center">
          {/* <Tag className="w-3.5 h-3.5" /> */}
          <span>Proposal #</span>
        </div>
      ),
      cell: ({ getValue, row }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);
        const proposalNumber = getValue();
        const baseNumber = getBaseProposalNumber(proposalNumber);
        const isExpanded = expanded[baseNumber];
        const hasMultipleVersions = versionGroup && versionGroup.hasMultipleVersions;

        // Show full proposal number (with version suffix) if it's the main version of the group
        // or if it's a standalone quote
        const displayNumber = proposalNumber;

        return (
          <div className="flex items-center gap-2">
            <div className="font-mono text-sm font-medium">
              {displayNumber}
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
      size: 140,
      enableSorting: true,
    }),
    columnHelper.accessor((row) => `${row.project_name || row.quote_details?.project_name || "Untitled Project"}`, {
      id: 'project_name',
      header: () => (
        <div className="flex items-center">
          {/* <Building className="w-3.5 h-3.5" /> */}
          <span>Project</span>
        </div>
      ),
      cell: ({ row }) => {
        const projectName = row.original.project_name || row.original.quote_details?.project_name || "Untitled Project";
        const projectLocation = row.original.job_details?.job_location || "";
        return (
          <div className="space-y-0.5 min-w-0">
            <div className="font-medium text-sm truncate" title={projectName}>{projectName}</div>
            {projectLocation && (
              <div className="text-xs text-gray-500 truncate" title={projectLocation}>{projectLocation}</div>
            )}
          </div>
        );
      },
      size: 240,
      enableSorting: false,
    }),
    columnHelper.accessor((row) => row.job_details?.client_company || row.job_details?.client_name || "Untitled Client", {
      id: 'client_name',
      header: () => (
        <div className="flex items-center">
          {/* <User className="w-3.5 h-3.5" /> */}
          <span>Client</span>
        </div>
      ),
      cell: ({ row }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm text-gray-500 italic">Various</div>;
        }

        const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client";
        return <div className="font-medium text-sm truncate" title={clientName}>{clientName}</div>;
      },
      size: 160,
      enableSorting: false,
    }),
    columnHelper.accessor((row) => row.price_details?.final_selling_price || 0, {
      id: 'total',
      header: () => (
        <div className="flex items-center">
          {/* <DollarSign className="w-3.5 h-3.5" /> */}
          <span>Total</span>
        </div>
      ),
      cell: ({ row }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm italic text-gray-500">Range</div>;
        }

        const total = quote.price_details?.final_selling_price || 0;
        return <div className="font-semibold text-sm">{formatCurrency(total)}</div>;
      },
      size: 110,
      enableSorting: true,
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: ({ row, getValue }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-sm italic text-gray-500">Various</div>;
        }

        const currentStatus = getValue();

        return (
          <Select
            value={currentStatus || "Incomplete"}
            onValueChange={(value) => handleStatusChange(row.original.id, currentStatus || "Incomplete", value)}
          >
            <SelectTrigger className={`w-28 h-7 border-0 text-xs px-2 ${statusColors[currentStatus as keyof typeof statusColors]}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getAvailableStatusOptions(currentStatus || "Incomplete").map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
      size: 130,
      filterFn: 'equals',
      enableSorting: false,
    }),
    // columnHelper.accessor('quote_source', {
    //   id: 'quote_source',
    //   header: 'Quote Source',
    //   cell: ({ row, getValue }) => {
    //     const quote = row.original;
    //     const versionGroup = quoteToGroupMap.get(quote.id);
    //     const currentValue = getValue();

    //     if (versionGroup && versionGroup.hasMultipleVersions) {
    //       return <div className="text-sm italic text-gray-500">Various</div>;
    //     }

    //     // Check if current value is a custom source (not in standard options)
    //     const isCustomSource = currentValue && !getQuoteSourceOptions().some(opt => opt.value === currentValue);

    //     return (
    //       <Select
    //         value={currentValue || ""}
    //         onValueChange={(value) => onQuoteSourceChange(row.original.id, value)}
    //       >
    //         <SelectTrigger className={`w-full h-8 border-0 text-xs px-3 ${
    //           isCustomSource
    //             ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
    //             : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
    //         }`}>
    //           <SelectValue placeholder="Select source" />
    //         </SelectTrigger>
    //         <SelectContent>
    //           {/* Show current custom value first if it exists */}
    //           {isCustomSource && (
    //             <>
    //               <SelectItem value={currentValue!} className="bg-amber-50 dark:bg-amber-950/30">
    //                 {formatQuoteSource(currentValue)}
    //               </SelectItem>
    //               <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-b">
    //                 Standard Options:
    //               </div>
    //             </>
    //           )}
    //           {getQuoteSourceOptions().map((source) => (
    //             <SelectItem key={source.value} value={source.value}>
    //               {source.label}
    //             </SelectItem>
    //           ))}
    //         </SelectContent>
    //       </Select>
    //     );
    //   },
    //   size: 180,
    //   filterFn: 'equals',
    //   enableSorting: false,
    // }),
    // columnHelper.accessor('created_by_name', {
    //   id: 'created_by',
    //   header: 'Created By',
    //   cell: ({ row }) => {
    //     const quote = row.original;
    //     const versionGroup = quoteToGroupMap.get(quote.id);

    //     if (versionGroup && versionGroup.hasMultipleVersions) {
    //       return <div className="text-sm italic text-gray-500">Various</div>;
    //     }

    //     return <div className="text-sm text-gray-600">{quote.created_by_name || 'Unknown'}</div>;
    //   },
    //   size: 200,
    //   enableSorting: false,
    // }),
    columnHelper.accessor('created_at', {
      id: 'created_at',
      header: () => (
        <div className="flex items-center">
          {/* <Calendar className="w-3.5 h-3.5" /> */}
          <span>Created</span>
        </div>
      ),
      cell: ({ row, getValue }) => {
        const quote = row.original;
        const versionGroup = quoteToGroupMap.get(quote.id);

        if (versionGroup && versionGroup.hasMultipleVersions) {
          return <div className="text-xs italic text-gray-500">Various</div>;
        }

        return (
          <div className="text-xs text-gray-600">
            {formatDateEST(getValue())}
          </div>
        );
      },
      size: 110,
      enableSorting: true,
    }),
    // columnHelper.accessor('updated_at', {
    //   id: 'updated_at',
    //   header: () => (
    //     <div className="flex items-center gap-2">
    //       <Calendar className="w-4 h-4" />
    //       Last Updated
    //     </div>
    //   ),
    //   cell: ({ row, getValue }) => {
    //     const quote = row.original;
    //     const versionGroup = quoteToGroupMap.get(quote.id);

    //     if (versionGroup && versionGroup.hasMultipleVersions) {
    //       return <div className="text-sm italic text-gray-500">Various</div>;
    //     }

    //     return <div className="text-sm text-gray-600">{formatLastUpdated(getValue())}</div>;
    //   },
    //   size: 200,
    //   enableSorting: true,
    // }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const quote = row.original;
        const groupInfo = quoteToGroupMap.get(quote.id);
        const hasMultipleVersions = groupInfo?.hasMultipleVersions || false;

        // Grouped quotes (placeholder rows) only show Archive and Delete All Versions
        if (hasMultipleVersions) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                {isArchiveView && onUnarchiveQuote ? (
                  <DropdownMenuItem onClick={() => onUnarchiveQuote(quote.id)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" />
                    Unarchive
                  </DropdownMenuItem>
                ) : onArchiveQuote && (
                  <DropdownMenuItem onClick={() => onArchiveQuote(quote.id)}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (groupInfo) {
                      setDeleteGroupedQuote({
                        id: quote.id,
                        baseNumber: groupInfo.baseNumber,
                        versionCount: groupInfo.versions.length
                      });
                    }
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Versions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        // Single quotes or non-grouped quotes show full actions (but no Create Version if single)
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
              <DropdownMenuItem onClick={() => onEditQuote(quote)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {onCreateVersion && (
                <DropdownMenuItem onClick={() => onCreateVersion(quote.id)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Create Version
                </DropdownMenuItem>
              )}
              {onCreateInvoice && (
                <DropdownMenuItem onClick={() => onCreateInvoice(quote)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </DropdownMenuItem>
              )}
              {onSetReminder && (
                <DropdownMenuItem onClick={() => onSetReminder(quote.id)}>
                  <Bell className="mr-2 h-4 w-4" />
                  Set Reminder
                </DropdownMenuItem>
              )}
              {quote.status === 'Won' && quote.is_main_version && (
                quote.is_on_board ? (
                  <DropdownMenuItem onClick={() => handleRemoveFromBoard(quote.id)}>
                    <X className="mr-2 h-4 w-4" />
                    Remove from Board
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleSendToBoard(quote.id)}>
                    <Kanban className="mr-2 h-4 w-4" />
                    Send to Project Board
                  </DropdownMenuItem>
                )
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                // Open editor in new tab - user can download PDF from there
                const url = `/editor/${quote.proposal_number}`;
                window.open(url, '_blank');
              }}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchiveView && onUnarchiveQuote ? (
                <DropdownMenuItem onClick={() => onUnarchiveQuote(quote.id)}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Unarchive
                </DropdownMenuItem>
              ) : onArchiveQuote && (
                <DropdownMenuItem onClick={() => onArchiveQuote(quote.id)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteQuote(quote.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      size: 60,
      enableSorting: false,
    }),
  ], [onEditQuote, onDeleteQuote, onStatusChange, onQuoteSourceChange, onCreateVersion, onSetReminder, onArchiveQuote, onUnarchiveQuote, isArchiveView, forceUpdate]);

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
        <div className="flex items-center py-4 px-4 bg-white border-b border-gray-200 min-h-[72px]">
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

          {/* Toolbar Controls - Hide buttons when rows are selected */}
          {(() => {
            const selectedMainRows = table.getFilteredSelectedRowModel().rows.length;
            const selectedVersionIds = Object.keys(versionSelection).filter(id => versionSelection[id]);
            const hasSelections = selectedMainRows > 0 || selectedVersionIds.length > 0;

            return !hasSelections && (
              <div className="flex items-center space-x-2 h-10">
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
            );
          })()}

          {/* Bulk Actions - Show when rows are selected */}
          {(() => {
            const selectedMainRows = table.getFilteredSelectedRowModel().rows.length;
            const selectedMainIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
            const selectedVersionIds = Object.keys(versionSelection).filter(id => versionSelection[id]);

            // Remove main row IDs from version IDs to avoid double counting
            const versionOnlyIds = selectedVersionIds.filter(id => !selectedMainIds.includes(id));

            const totalSelected = selectedMainRows + versionOnlyIds.length;
            const allSelectedIds = [
              ...selectedMainIds,
              ...selectedVersionIds
            ];

            return totalSelected > 0 && (
              <div className="flex items-center space-x-4 h-10">
                <div className="text-sm font-medium text-[var(--content-header-text)] dark:text-[var(--content-header-text)]">
                  {totalSelected} quote{totalSelected > 1 ? 's' : ''} selected
                  {versionOnlyIds.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({selectedMainRows} main + {versionOnlyIds.length} version{versionOnlyIds.length > 1 ? 's' : ''})
                    </span>
                  )}
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
                        onBulkStatusChange(allSelectedIds, 'Draft');
                        setVersionSelection({});
                        table.resetRowSelection();
                      }
                    }}>
                      Set to Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (onBulkStatusChange) {
                        onBulkStatusChange(allSelectedIds, 'Pending');
                        setVersionSelection({});
                        table.resetRowSelection();
                      }
                    }}>
                      Set to Pending
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (onBulkStatusChange) {
                        onBulkStatusChange(allSelectedIds, 'Submitted');
                        setVersionSelection({});
                        table.resetRowSelection();
                      }
                    }}>
                      Set to Submitted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (onBulkStatusChange) {
                        onBulkStatusChange(allSelectedIds, 'Won');
                        setVersionSelection({});
                        table.resetRowSelection();
                      }
                    }}>
                      Set to Won
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (onBulkStatusChange) {
                        onBulkStatusChange(allSelectedIds, 'Rejected');
                        setVersionSelection({});
                        table.resetRowSelection();
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
                        const allSelected = [
                          ...table.getFilteredSelectedRowModel().rows.map(row => row.original),
                          ...quotes.filter(q => selectedVersionIds.includes(q.id))
                        ];
                        onExportCSV(allSelected);
                      }
                    }}>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Export Selected (CSV)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (onExportPDF) {
                        const allSelected = [
                          ...table.getFilteredSelectedRowModel().rows.map(row => row.original),
                          ...quotes.filter(q => selectedVersionIds.includes(q.id))
                        ];
                        onExportPDF(allSelected);
                      }
                    }}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export Selected (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      allSelectedIds.forEach(id => {
                        if (onCreateVersion) {
                          onCreateVersion(id);
                        }
                      });
                      setVersionSelection({});
                      table.resetRowSelection();
                    }}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (onBulkDelete) {
                          onBulkDelete(allSelectedIds);
                          setVersionSelection({});
                          table.resetRowSelection();
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
            );
          })()}
        </div>

        <div className="relative">
          {/* Table Area */}
          <div className="overflow-y-auto max-h-[600px] scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
            <table
              className="w-full border-collapse font-table"
              style={{
                fontFamily: 'var(--font-table)',
                tableLayout: 'fixed'
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
                        versionGroup.versions.map((version, _) => (
                          <tr
                            key={`${row.id}-version-${version.id}`}
                            className="bg-white border-l-4 border-l-blue-200 hover:bg-gray-50"
                          >
                            {/* Selection */}
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={versionSelection[version.id] || false}
                                onChange={(e) => {
                                  setVersionSelection(prev => ({
                                    ...prev,
                                    [version.id]: e.target.checked
                                  }));
                                }}
                              />
                            </td>

                            {/* Proposal Number */}
                            <td className="px-4 py-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">└─</span>
                                <span className="font-mono text-xs text-gray-600">
                                  {version.proposal_number}
                                </span>
                                {version.is_main_version === true ? (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                    Main
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-2 text-xs text-gray-500 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Update database
                                      if (onSetMainVersion) {
                                        onSetMainVersion(version.id, versionGroup.baseNumber);
                                      }
                                      // Update local state for immediate UI feedback
                                      setMainVersions(prev => ({
                                        ...prev,
                                        [versionGroup.baseNumber]: version.id
                                      }));
                                    }}
                                  >
                                    Set as Main
                                  </Button>
                                )}
                              </div>
                            </td>

                            {/* Project Name + Address */}
                            <td className="px-4 py-2">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{version.project_name || "Untitled"}</div>
                                {version.job_details?.job_location && (
                                  <div className="text-xs text-gray-500">{version.job_details.job_location}</div>
                                )}
                              </div>
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
                                onValueChange={(value) => handleStatusChange(version.id, version.status || "Incomplete", value)}
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
                              {(() => {
                                const versionQuoteSource = version.quote_source;
                                const isCustomVersionSource = versionQuoteSource && !getQuoteSourceOptions().some(opt => opt.value === versionQuoteSource);

                                return (
                                  <Select
                                    value={versionQuoteSource || ""}
                                    onValueChange={(value) => onQuoteSourceChange(version.id, value)}
                                  >
                                    <SelectTrigger className={`w-full h-8 border-0 text-xs px-3 ${
                                      isCustomVersionSource
                                        ? "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                                    }`}>
                                      <SelectValue placeholder="Select source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {/* Custom value for this version */}
                                      {isCustomVersionSource && versionQuoteSource && (
                                        <>
                                          <SelectItem value={versionQuoteSource} className="bg-amber-50 dark:bg-amber-950/30">
                                            {versionQuoteSource}
                                          </SelectItem>
                                          <div className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-b">
                                            Standard Options:
                                          </div>
                                        </>
                                      )}
                                      {/* Standard options - show new format only */}
                                      {getQuoteSourceOptions()
                                        .filter(source => !source.value.includes('_') && source.value !== 'Manual')
                                        .map((source) => (
                                          <SelectItem key={source.value} value={source.value}>
                                            {source.label}
                                          </SelectItem>
                                        ))}
                                      {/* Legacy format options - hidden but available for SelectValue */}
                                      {getQuoteSourceOptions()
                                        .filter(source => source.value.includes('_') || source.value === 'Manual')
                                        .map((source) => (
                                          <SelectItem key={source.value} value={source.value} className="hidden">
                                            {source.label}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                );
                              })()}
                            </td>

                            {/* Created By */}
                            <td className="px-4 py-2 text-xs text-gray-500">
                              {version.created_by_name || "Unknown"}
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
                            <td className="px-4 py-2 sticky right-0 bg-white border-l border-gray-200">
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
                                  {onCreateVersion && (
                                    <DropdownMenuItem onClick={() => onCreateVersion(version.id)}>
                                      <Copy className="mr-2 h-4 w-4" />
                                      Create Version
                                    </DropdownMenuItem>
                                  )}
                                  {onSetReminder && (
                                    <DropdownMenuItem onClick={() => onSetReminder(version.id)}>
                                      <Bell className="mr-2 h-4 w-4" />
                                      Set Reminder
                                    </DropdownMenuItem>
                                  )}
                                  {version.status === 'Won' && version.is_main_version && (
                                    version.is_on_board ? (
                                      <DropdownMenuItem onClick={() => handleRemoveFromBoard(version.id)}>
                                        <X className="mr-2 h-4 w-4" />
                                        Remove from Board
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem onClick={() => handleSendToBoard(version.id)}>
                                        <Kanban className="mr-2 h-4 w-4" />
                                        Send to Project Board
                                      </DropdownMenuItem>
                                    )
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    // Open editor in new tab - user can download PDF from there
                                    const url = `/editor/${version.proposal_number}`;
                                    window.open(url, '_blank');
                                  }}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {isArchiveView && onUnarchiveQuote ? (
                                    <DropdownMenuItem onClick={() => onUnarchiveQuote(version.id)}>
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      Unarchive
                                    </DropdownMenuItem>
                                  ) : onArchiveQuote && (
                                    <DropdownMenuItem onClick={() => onArchiveQuote(version.id)}>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onDeleteQuote(version.id)}
                                    className="text-red-600 focus:text-red-600"
                                  >
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

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={!!pendingStatusChange} onOpenChange={(open) => !open && cancelStatusChange()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {pendingStatusChange?.currentStatus === 'Won' && pendingStatusChange?.newStatus === 'Rejected' && (
                <div className="text-base">
                  Changing from <strong className="text-green-600">Won</strong> to <strong className="text-red-600">Rejected</strong> will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Remove the Won timestamp</strong></li>
                    <li><strong>Update analytics accordingly</strong></li>
                  </ul>
                </div>
              )}
              {pendingStatusChange?.currentStatus === 'Rejected' && pendingStatusChange?.newStatus === 'Won' && (
                <div className="text-base">
                  Changing from <strong className="text-red-600">Rejected</strong> to <strong className="text-green-600">Won</strong> will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Remove the Rejected timestamp</strong></li>
                    <li><strong>Update analytics accordingly</strong></li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelStatusChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Grouped Quote Confirmation Dialog */}
      <AlertDialog open={!!deleteGroupedQuote} onOpenChange={(open) => !open && setDeleteGroupedQuote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Versions</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-base">
                <p className="mb-3">
                  You are about to delete <strong className="text-red-600">{deleteGroupedQuote?.versionCount} version(s)</strong> of quote <strong>{deleteGroupedQuote?.baseNumber}</strong>.
                </p>
                <p className="text-red-600 font-semibold">
                  This action cannot be undone and will permanently delete all versions in this group.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteGroupedQuote(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllVersions}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};