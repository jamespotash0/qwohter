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
  Clock,
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
  FileText
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Quote } from "@/stores/quotes/quotesStore";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";
import useEnhancedSearch from '@/hooks/useEnhancedSearch';
import { TableToolbar } from './components/TableToolbar';
import { PaginationControls } from './components/PaginationControls';
import { EnhancedSearchInput } from './components/EnhancedSearchInput';


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
  onExportCSV?: (filteredData: Quote[]) => void;
  onExportPDF?: (filteredData: Quote[]) => void;
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
  if (!quote.follow_up_days || quote.follow_up_days <= 0) {
    return { daysRemaining: null, isOverdue: false, displayText: "Not set", colorClass: "text-gray-500" };
  }

  // Use status_last_updated if available, otherwise fall back to created_at
  const baseDate = quote.status_last_updated ? new Date(quote.status_last_updated) : new Date(quote.created_at);
  const followUpDate = new Date(baseDate);
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
      cell: ({ row }) => {
        const quote = row.original;
        const followUpStatus = getFollowUpStatus(quote);
        const followUpDays = quote.follow_up_days;

        // Show "Set days" dropdown if no follow-up is set
        if (followUpDays === null || followUpDays === undefined || followUpDays <= 0) {
          return (
            <Select
              key={`empty-${quote.id}-${followUpDays}-${forceUpdate}`}
              value=""
              onValueChange={(value) => onFollowUpDaysChange(quote.id, parseInt(value))}
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

        // Show badge with follow-up status and hover menu to change
        return (
          <div key={`status-${quote.id}-${followUpDays}-${forceUpdate}`} className="relative group">
            <Badge
              variant="outline"
              className={`${followUpStatus.colorClass} border-0 cursor-pointer`}
            >
              {followUpStatus.displayText}
            </Badge>
            <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Select
                value={followUpDays?.toString() || ""}
                onValueChange={(value) => onFollowUpDaysChange(quote.id, value === "clear" ? null : parseInt(value))}
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
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
              className="w-full pl-10 pr-20 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {globalFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setGlobalFilter('')}
                  className="w-8 h-6 p-0 hover:bg-gray-100 rounded-full"
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
                      className="w-8 h-6 p-0 hover:bg-gray-100 rounded-full"
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

          {/* Toolbar Controls */}
          <div className="flex items-center space-x-2">
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
                  className="w-10 h-10 p-0 hover:bg-[#f57b46]"
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
                className="w-10 h-10 p-0 bg-[#e98135] hover:bg-[#d4751f] text-white border-[#e98135] hover:border-[#d4751f]"
                title="Create New Quote"
              >
                <Plus className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Toolbar - Only show when items selected */}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <TableToolbar
            table={table}
            dataDensity={dataDensity}
            setDataDensity={setDataDensity}
            columnVisibilityOpen={columnVisibilityOpen}
            setColumnVisibilityOpen={setColumnVisibilityOpen}
            columnLabels={columnLabels}
            resetColumnSizes={resetColumnSizes}
            resetColumnVisibility={resetColumnVisibility}
            onCreateQuote={undefined}
            onBulkDelete={onBulkDelete}
            onBulkStatusChange={onBulkStatusChange}
            onCreateVersion={onCreateVersion}
            onExportCSV={onExportCSV}
            onExportPDF={onExportPDF}
            setRowSelection={setRowSelection}
          />
        )}
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
        <PaginationControls table={table} />
      </div>
    </div>
  );
};