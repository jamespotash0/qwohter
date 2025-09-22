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
  FilterFn,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
  ColumnResizeMode,
} from '@tanstack/react-table';
import { rankItem } from '@tanstack/match-sorter-utils';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpDown,
  Filter,
  Eye,
  EyeOff,
  Download,
  MoreHorizontal,
  Edit3,
  Trash2,
  Copy,
  Calendar,
  Clock,
  User,
  Building,
  DollarSign,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Settings,
  RotateCcw,
  CheckSquare,
  Square,
  Minus,
  SlidersHorizontal,
  FileSpreadsheet,
  Archive
} from 'lucide-react';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Quote } from "@/hooks/useQuotes";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";

// Global filter function for search across multiple fields including addresses
const fuzzyFilter: FilterFn<any> = (row, _columnId, value, addMeta) => {
  // Get the original quote data
  const quote = row.original as Quote;
  
  // Build a searchable string from all relevant fields
  const searchableFields = [
    // Basic fields
    quote.proposal_number,
    quote.project_name,
    quote.quote_details?.project_name,
    quote.status,
    quote.quote_source,
    quote.creator_name,
    
    // Client information
    quote.job_details?.client_company,
    quote.job_details?.client_name,
    
    // Address/Location fields - this is the key fix
    quote.job_details?.job_location,
    quote.job_details?.address,
    quote.job_details?.city,
    quote.job_details?.state,
    quote.job_details?.zip_code,
    
    // Additional searchable fields
    quote.price_details?.final_selling_price?.toString(),
  ];
  
  // Join all non-empty fields into a single searchable string
  const searchableText = searchableFields
    .filter(field => field !== null && field !== undefined && field !== '')
    .join(' ')
    .toLowerCase();
  
  // Use rankItem to fuzzy search across the combined text
  const itemRank = rankItem(searchableText, value);
  addMeta({ itemRank });
  return itemRank.passed;
};

interface EnhancedQuotesTableProps {
  quotes: Quote[];
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onFollowUpDaysChange: (id: string, days: number | null) => void;
  onQuoteSourceChange: (id: string, source: string) => void;
  onCreateVersion?: (id: string) => void;
  onCreateQuote?: () => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onExport?: (filteredData: Quote[]) => void;
}

const statusColors = {
  Incomplete: "bg-gray-100 text-gray-800",
  Draft: "bg-blue-100 text-blue-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Submitted: "bg-green-100 text-green-800",
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
  status_last_updated: "Status Updated",
  follow_up_days: "Follow Up",
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
  if (!time) return "-"; // fallback if null/undefined

  const date = new Date(time);

  return date.toLocaleString("en-US", {
    month: "short",   // "Sep"
    day: "numeric",   // "17"
    year: "numeric",  // "2025"
    hour: "numeric",  // "8"
    minute: "2-digit", // "12"
    hour12: true      // AM/PM
  }).replace(",", ""); // remove extra comma
};



const getFollowUpStatus = (quote: Quote) => {
  if (!quote.follow_up_days || !quote.created_at) {
    return { daysRemaining: null, isOverdue: false, displayText: "Not set", colorClass: "text-gray-500" };
  }

  const createdAt = new Date(quote.created_at);
  const followUpDate = new Date(createdAt);
  followUpDate.setDate(followUpDate.getDate() + quote.follow_up_days);
  
  const today = new Date();
  const timeDiff = followUpDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  const isOverdue = daysRemaining < 0;
  
  let displayText: string;
  let colorClass: string;
  
  if (isOverdue) {
    const absTimeDiff = Math.abs(timeDiff);
    const overdueDays = Math.floor(absTimeDiff / (1000 * 3600 * 24));
    const overdueHours = Math.floor((absTimeDiff % (1000 * 3600 * 24)) / (1000 * 3600));
    
    if (overdueDays > 0) {
      displayText = `${overdueDays}d overdue`;
    } else {
      displayText = `${overdueHours}h overdue`;
    }
    colorClass = "text-red-600 font-medium";
  } else if (daysRemaining === 0) {
    const hoursRemaining = Math.floor(timeDiff / (1000 * 3600));
    const minutesRemaining = Math.floor((timeDiff % (1000 * 3600)) / (1000 * 60));
    
    if (hoursRemaining > 0) {
      displayText = `${hoursRemaining}h ${minutesRemaining}m left`;
    } else if (minutesRemaining > 0) {
      displayText = `${minutesRemaining}m left`;
    } else {
      displayText = "Due now";
    }
    colorClass = "text-yellow-600 font-medium";
  } else {
    displayText = `${daysRemaining}d left`;
    colorClass = "text-green-600";
  }
    
  return { daysRemaining, isOverdue, displayText, colorClass };
};

export const EnhancedQuotesTable: React.FC<EnhancedQuotesTableProps> = ({
  quotes,
  onEditQuote,
  onDeleteQuote,
  onStatusChange,
  onFollowUpDaysChange,
  onQuoteSourceChange,
  onCreateVersion,
  onCreateQuote,
  onBulkDelete,
  onBulkStatusChange,
  onExport
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
    follow_up_days: 140,
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
      cell: ({ getValue }) => {
        const proposalInfo = ProposalNumberGenerator.parseProposalNumber(getValue());
        return (
          <div className="font-mono text-sm font-medium">
            {proposalInfo.displayNumber}
          </div>
        );
      },
      size: 175,
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
      cell: ({ getValue }) => (
        <div className="font-medium text-sm">{getValue()}</div>
      ),
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
      cell: ({ getValue }) => (
        <div className="font-semibold text-sm">{formatCurrency(getValue())}</div>
      ),
      size: 150,
      enableSorting: true,
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: ({ row, getValue }) => (
        <Select 
          value={getValue() || "Incomplete"} 
          onValueChange={(value) => onStatusChange(row.original.id, value)}
        >
          <SelectTrigger className={`w-32 h-8 border-0 text-xs px-3 ${statusColors[getValue() as keyof typeof statusColors]}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border shadow-lg z-50">
            {getAvailableStatusOptions(getValue() || "Incomplete").map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
      size: 150,
      filterFn: 'equals',
      enableSorting: false,
    }),
    columnHelper.accessor('quote_source', {
      id: 'quote_source',
      header: 'Quote Source',
      cell: ({ row, getValue }) => (
        <Select 
          value={getValue() || ""} 
          onValueChange={(value) => onQuoteSourceChange(row.original.id, value)}
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
      ),
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
          {new Date(getValue()).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      ),
      size: 200,
      enableSorting: true,
    }),
    columnHelper.accessor('status_last_updated', {
      id: 'status_last_updated',
      header: () => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Status Updated
        </div>
      ),
      cell: ({ getValue }) => (
        <div className="font-smn= text-gray-600">{formatLastUpdated(getValue())}</div>
      ),
      size: 200,
      enableSorting: true,
    }),
    columnHelper.accessor('follow_up_days', {
      id: 'follow_up_days',
      header: () => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Follow Up
        </div>
      ),
      cell: ({ row, getValue }) => {
        const followUpStatus = getFollowUpStatus(row.original);
        
        if (getValue() === null || getValue() === undefined) {
          return (
            <Select
              value=""
              onValueChange={(value) => onFollowUpDaysChange(row.original.id, parseInt(value))}
            >
              <SelectTrigger className="w-32 h-8 border-0 text-xs px-3 bg-blue-50 text-blue-700">
                <SelectValue placeholder="Set days" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((days) => (
                  <SelectItem key={days} value={days.toString()}>
                    {days} day{days > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        return (
          <div className="relative group">
            <Badge 
              variant="outline" 
              className={`${followUpStatus.colorClass} border-0 cursor-pointer`}
            >
              {followUpStatus.displayText}
            </Badge>
            <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-100">
              <Select
                value={getValue()?.toString()}
                onValueChange={(value) => onFollowUpDaysChange(row.original.id, value === "clear" ? null : parseInt(value))}
              >
                <SelectTrigger className="w-24 h-7 border-0 text-xs px-2 bg-blue-50 text-blue-700">
                  <SelectValue placeholder="Change" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days}d
                    </SelectItem>
                  ))}
                  <SelectItem value="clear" className="text-red-600">
                    Clear
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      },
      size: 140,
      enableSorting: false,
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
  ], [onEditQuote, onDeleteQuote, onStatusChange, onFollowUpDaysChange, onQuoteSourceChange, onCreateVersion, forceUpdate]);

  const table = useReactTable({
    data: quotes,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
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
    globalFilterFn: fuzzyFilter,
  });

  // Get selected rows for bulk actions
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelection = selectedRows.length > 0;

  return (
    <div className="space-y-0">
      {/* Table with integrated header */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Search and Controls Header - Attached to table */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            {/* Search - Full Width */}
            <div className="flex items-center space-x-3 flex-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <Input
                  placeholder="Search quotes, clients, projects, addresses..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGlobalFilter('')}
                  className="text-gray-400 hover:text-gray-600 w-10 h-10 p-0"
                  title="Clear search"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Right Side Controls - All Icon Only */}
            <div className="flex items-center space-x-2">
              {/* Bulk Actions - Only show when items selected */}
              {hasSelection && (
                <div className="flex items-center space-x-3 bg-blue-50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200 mr-2">
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {selectedRows.length} quote{selectedRows.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Quick Status Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800 hover:bg-blue-100 px-3">
                          Change Status
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          if (onBulkStatusChange) {
                            onBulkStatusChange(selectedRows.map(row => row.original.id), 'Draft');
                          }
                        }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded mr-2"></div>
                            Set to Draft
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          if (onBulkStatusChange) {
                            onBulkStatusChange(selectedRows.map(row => row.original.id), 'Pending');
                          }
                        }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-yellow-500 rounded mr-2"></div>
                            Set to Pending
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          if (onBulkStatusChange) {
                            onBulkStatusChange(selectedRows.map(row => row.original.id), 'Submitted');
                          }
                        }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-green-500 rounded mr-2"></div>
                            Set to Submitted
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          if (onBulkStatusChange) {
                            onBulkStatusChange(selectedRows.map(row => row.original.id), 'Won');
                          }
                        }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-600 rounded mr-2"></div>
                            Set to Won
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          if (onBulkStatusChange) {
                            onBulkStatusChange(selectedRows.map(row => row.original.id), 'Rejected');
                          }
                        }}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-red-500 rounded mr-2"></div>
                            Set to Rejected
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* More Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800 hover:bg-blue-100 px-3">
                          More Actions
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => {
                          if (onExport) {
                            onExport(selectedRows.map(row => row.original));
                          }
                        }}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Export Selected
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          // Duplicate selected quotes
                          selectedRows.forEach(row => {
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
                            if (onBulkDelete && confirm(`Are you sure you want to delete ${selectedRows.length} quote${selectedRows.length > 1 ? 's' : ''}?`)) {
                              onBulkDelete(selectedRows.map(row => row.original.id));
                            }
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRowSelection({})}
                      className="text-blue-700 hover:text-blue-800 hover:bg-blue-100 w-8 h-8 p-0"
                      title="Clear selection"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Data Density */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-10 h-10 p-0 hover:bg-[#e98135]"
                    title={`Table Density: ${dataDensity.charAt(0).toUpperCase() + dataDensity.slice(1)}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem 
                    onClick={() => setDataDensity('compact')}
                    className={dataDensity === 'compact' ? 'bg-blue-50 text-blue-700' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <div className="w-2 h-1 bg-gray-400 rounded mr-2"></div>
                        Compact
                      </div>
                      {dataDensity === 'compact' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDataDensity('comfortable')}
                    className={dataDensity === 'comfortable' ? 'bg-blue-50 text-blue-700' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded mr-2"></div>
                        Comfortable
                      </div>
                      {dataDensity === 'comfortable' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDataDensity('spacious')}
                    className={dataDensity === 'spacious' ? 'bg-blue-50 text-blue-700' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <div className="w-2 h-3 bg-gray-400 rounded mr-2"></div>
                        Spacious
                      </div>
                      {dataDensity === 'spacious' && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
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
                    className="w-10 h-10 p-0 hover:bg-[#f57b46]"
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
                          {/* {column.id.replace('_', ' ')} */}
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
                    className="w-10 h-10 p-0 hover:bg-[#f57b46]"
                    title="Export Data"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {
                    if (onExport) {
                      onExport(table.getFilteredRowModel().rows.map(row => row.original));
                    }
                  }}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (onExport) {
                      onExport(table.getFilteredRowModel().rows.map(row => row.original));
                    }
                  }}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                  {hasSelection && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        if (onExport) {
                          onExport(selectedRows.map(row => row.original));
                        }
                      }}>
                        <Archive className="w-4 h-4 mr-2" />
                        Export Selected ({selectedRows.length})
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Reset Options */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-10 h-10 p-0 hover:bg-[#f57b46]"
                    title="Reset Options"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                  <DropdownMenuItem onClick={resetColumnSizes}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Column Sizes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={resetColumnVisibility}>
                    <Eye className="w-4 h-4 mr-2" />
                    Reset Column Visibility
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Settings */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-10 h-10 p-0 hover:bg-[#f57b46]"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>

              {/* Create Quote Button */}
              <Button 
                onClick={onCreateQuote}
                className="bg-blue-600 hover:bg-blue-700 text-white w-10 h-10 p-0 rounded-lg shadow-md"
                title="Create New Quote"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="relative">
          {/* Scrollable Table Area */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
            <table 
              className="border-collapse" 
              style={{ 
                width: Math.max(table.getTotalSize(), 1900),
                minWidth: '1900px'
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
                  
                  return (
                    <tr 
                      key={row.id} 
                      className={`group hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-b-0 ${rowHeight} ${
                        row.getIsSelected() ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isActionsColumn = cell.column.id === 'actions';
                        return (
                          <td
                            key={cell.id}
                            className={`px-4 ${paddingY} text-sm border-r border-gray-100 last:border-r-0 ${
                              isActionsColumn 
                                ? 'sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-200 z-10' 
                                : ''
                            } ${row.getIsSelected() && isActionsColumn ? 'bg-blue-50' : ''}`}
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        );
                      })}
                    </tr>
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
        <div className="bg-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-700">
              {table.getFilteredRowModel().rows.length === 0 ? (
                'No results'
              ) : (
                <>
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                  {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of{' '}
                  {table.getFilteredRowModel().rows.length} results
                </>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Select
              value={table.getState().pagination.pageSize.toString()}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50].map(pageSize => (
                  <SelectItem key={pageSize} value={pageSize.toString()}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-700 px-2">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};