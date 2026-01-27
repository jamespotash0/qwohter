// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// import {
//   createColumnHelper,
//   flexRender,
//   getCoreRowModel,
//   getFilteredRowModel,
//   getPaginationRowModel,
//   getSortedRowModel,
//   useReactTable,
//   ColumnDef,
//   SortingState,
//   ColumnFiltersState,
//   VisibilityState,
//   PaginationState,
//   ColumnResizeMode,
//   ExpandedState,
//   // getExpandedRowModel,
// } from '@tanstack/react-table';
// import {
//   ChevronDown,
//   ChevronUp,
//   ArrowUpDown,
//   MoreHorizontal,
//   Edit3,
//   Trash2,
//   Copy,
//   Calendar,
//   User,
//   Building,
//   DollarSign,
//   Tag,
//   Search,
//   SlidersHorizontal,
//   Eye,
//   Download,
//   Plus,
//   FileSpreadsheet,
//   X,
//   HelpCircle,
//   FileText,
//   Archive,
//   ArchiveRestore,
//   Bell,
//   ChevronRight,
//   Kanban,
//   Star,
//   FileUp
// } from 'lucide-react';

// import { Button } from "@/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import type { Quote } from '@/services/quotesService';
// import { sendQuoteToProjectBoard, removeQuoteFromProjectBoard } from '@/services/quotesService';
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
// import { useWorkflowColumns } from '@/hooks/queries/useBoard';
// import { useToast } from '@/hooks/use-toast';
// import { supabase } from '@/integrations/supabase/client';
// import { useQueryClient } from '@tanstack/react-query';
// import { invalidateQueries } from '@/lib/queryClient';
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "@/components/ui/alert-dialog";
// import { Badge } from "@/components/ui/badge";
// // import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";
// import useEnhancedSearch from '@/hooks/useEnhancedSearch';
// import { PaginationControls } from './components/PaginationControls';
// import { TableToolbar } from './components/TableToolbar';
// import { formatDateEST } from '@/utils/dateUtils';
// import { groupQuotesByVersion, getBaseProposalNumber } from '@/_deprecated/utils/quoteVersionGrouping';
// import type { QuoteVersionGroup } from '@/_deprecated/utils/quoteVersionGrouping';


// interface EnhancedQuotesTableProps {
//   quotes: Quote[];
//   onEditQuote: (quote: Quote) => void;
//   onDeleteQuote: (id: string) => void;
//   onStatusChange: (id: string, status: string) => void;
//   onSetReminder?: (id: string) => void;
//   onQuoteSourceChange: (id: string, source: string) => void;
//   onCreateVersion?: (id: string) => void;
//   onCreateInvoice?: (quote: Quote) => void;
//   onCreateQuote?: () => void;
//   onImportQuote?: () => void;
//   onArchiveQuote?: (id: string) => void;
//   onUnarchiveQuote?: (id: string) => void;
//   isArchiveView?: boolean;
//   showArchived?: boolean;
//   archivedCount?: number;
//   onToggleArchive?: () => void;
//   onBulkDelete?: (ids: string[]) => void;
//   onBulkStatusChange?: (ids: string[], status: string) => void;
//   onBulkArchive?: (ids: string[]) => void;
//   onBulkUnarchive?: (ids: string[]) => void;
//   onExportCSV?: (filteredData: Quote[]) => void;
//   onExportPDF?: (filteredData: Quote[]) => void;
//   onMainVersionsChange?: (mainVersions: Quote[]) => void;
//   onSetMainVersion?: (quoteId: string, baseProposalNumber: string) => void;
// }

// const statusColors = {
//   Incomplete: "bg-purple-100 text-purple-800",
//   Draft: "bg-gray-100 text-gray-800",
//   Submitted: "bg-yellow-100 text-yellow-800",
//   Won: "bg-emerald-100 text-emerald-800",
//   Rejected: "bg-red-100 text-red-800",
// };

// const getQuoteSourceOptions = () => [
//   { value: "Manual Entry", label: "Manual Entry" },
//   { value: "Website Lead", label: "Website Lead" },
//   { value: "Contractor Referral", label: "Contractor Referral" },
//   { value: "Manufacturer Referral", label: "Manufacturer Referral" },
//   { value: "Architect Referral", label: "Architect Referral" },
//   { value: "Phone Inquiry", label: "Phone Inquiry" },
//   { value: "Email Inquiry", label: "Email Inquiry" },
//   { value: "Trade Show", label: "Trade Show" },
//   { value: "Repeat Customer", label: "Repeat Customer" }
// ];

// // Helper function to format quote source for display (handles custom values)
// const formatQuoteSource = (value: string | null | undefined): string => {
//   if (!value) return "Not specified";

//   const option = getQuoteSourceOptions().find(opt => opt.value === value);
//   if (option) return option.label;

//   // Return custom values exactly as entered (no transformation)
//   return value;
// };

// const columnLabels: Record<string, string> = {
//   proposal_number: "Proposal #",
//   project_name: "Project Name",
//   client_name: "Client",
//   total: "Total Amount",
//   status: "Status",
//   quote_source: "Quote Source",
//   created_by: "Creator",
//   created_at: "Date Created",
//   updated_at: "Last Updated",
//   actions: "Actions"
// };

// const getAvailableStatusOptions = (currentStatus: string) => {
//   const allStatuses = [
//     { value: "Incomplete", label: "Incomplete" },
//     { value: "Draft", label: "Draft" },
//     { value: "Submitted", label: "Submitted" },
//     { value: "Won", label: "Won" },
//     { value: "Rejected", label: "Rejected" }
//   ];

//   if (currentStatus === "Incomplete") return allStatuses;
//   if (currentStatus === "Draft") return allStatuses.filter(s => s.value !== "Incomplete");

//   const completedStatuses = ["Submitted", "Won", "Rejected"];
//   if (completedStatuses.includes(currentStatus)) {
//     return allStatuses.filter(s => s.value !== "Incomplete" && s.value !== "Draft");
//   }
//   return allStatuses;
// };

// const formatCurrency = (amount: number) => {
//   return new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency: 'USD',
//   }).format(amount);
// };

// export const EnhancedQuotesTable: React.FC<EnhancedQuotesTableProps> = ({
//   quotes,
//   onEditQuote,
//   onDeleteQuote,
//   onStatusChange,
//   onQuoteSourceChange,
//   onCreateVersion,
//   onCreateInvoice,
//   onSetReminder,
//   onCreateQuote,
//   onImportQuote,
//   onArchiveQuote,
//   onUnarchiveQuote,
//   isArchiveView = false,
//   showArchived = false,
//   archivedCount = 0,
//   onToggleArchive,
//   onBulkDelete,
//   onBulkStatusChange,
//   // onBulkArchive,
//   // onBulkUnarchive,
//   onExportCSV,
//   onExportPDF,
//   onMainVersionsChange,
//   onSetMainVersion
// }) => {
//   const [globalFilter, setGlobalFilter] = useState('');
//   const [sorting, setSorting] = useState<SortingState>([]);
//   const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
//   const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
//   const [rowSelection, setRowSelection] = useState({});
//   const [pagination, setPagination] = useState<PaginationState>({
//     pageIndex: 0,
//     pageSize: 10,
//   });
//   const [forceUpdate, setForceUpdate] = useState(0);
//   const [dataDensity, setDataDensity] = useState<'compact' | 'comfortable' | 'spacious'>('comfortable');
//   const [columnVisibilityOpen, setColumnVisibilityOpen] = useState(false);
//   const [showHelp, setShowHelp] = useState(false);
//   const [expanded, setExpanded] = useState<ExpandedState>({});
//   const [versionSelection, setVersionSelection] = useState<Record<string, boolean>>({});

//   // Track which version is "main" for each base number (stored in local state only)
//   const [mainVersions, setMainVersions] = useState<Record<string, string>>({});

//   // Toast for notifications
//   const { toast } = useToast();

//   // Query client for cache invalidation
//   const queryClient = useQueryClient();

//   // Get workflow columns for "Send to Board" column selection
//   const organizationId = quotes[0]?.organization_id;
//   const { data: workflowColumns = [] } = useWorkflowColumns(organizationId || '', !!organizationId);

//   // Track pending status changes for confirmation
//   const [pendingStatusChange, setPendingStatusChange] = useState<{
//     quoteId: string;
//     currentStatus: string;
//     newStatus: string;
//   } | null>(null);

//   // Track grouped quote deletion (warns all versions will be deleted)
//   const [deleteGroupedQuote, setDeleteGroupedQuote] = useState<{
//     id: string;
//     baseNumber: string;
//     versionCount: number;
//   } | null>(null);

//   // Group quotes by version
//   const quoteGroups = useMemo(() => groupQuotesByVersion(quotes), [quotes]);

//   // Create display data: show the main version based on is_main_version flag
//   const displayQuotes = useMemo(() => {
//     return quoteGroups.map(group => {
//       // Priority: is_main_version from database > user selection > group.mainVersion
//       const dbMainVersion = group.versions.find(v => v.is_main_version === true);
//       if (dbMainVersion) return dbMainVersion;

//       const userSelectedMainId = mainVersions[group.baseNumber];
//       if (userSelectedMainId) {
//         const userSelectedVersion = group.versions.find(v => v.id === userSelectedMainId);
//         if (userSelectedVersion) return userSelectedVersion;
//       }
//       return group.mainVersion;
//     });
//   }, [quoteGroups, mainVersions]);

//   // Track previous displayQuotes to avoid infinite loops
//   const prevDisplayQuotesIds = useRef<string>('');

//   // Notify parent component when displayQuotes actually changes (for metrics calculation)
//   useEffect(() => {
//     const currentIds = displayQuotes.map(q => q.id).join(',');
//     if (onMainVersionsChange && currentIds !== prevDisplayQuotesIds.current) {
//       prevDisplayQuotesIds.current = currentIds;
//       onMainVersionsChange(displayQuotes);
//     }
//   }, [displayQuotes, onMainVersionsChange]);

//   // Map to find version group for each quote
//   const quoteToGroupMap = useMemo(() => {
//     const map = new Map<string, QuoteVersionGroup>();
//     quoteGroups.forEach(group => {
//       group.versions.forEach(version => {
//         map.set(version.id, group);
//       });
//     });
//     return map;
//   }, [quoteGroups]);

//   // Enhanced search functionality
//   const { search, getSearchExamples } = useEnhancedSearch(quotes);
//   const searchExamples = getSearchExamples();

//   // Custom filter function using enhanced search
//   const enhancedFilter = React.useCallback((row: any, _columnId: string, filterValue: string) => {
//     if (!filterValue) return true;

//     const searchResults = search(filterValue);
//     const resultIds = new Set(searchResults.map(result => result.item.id));

//     return resultIds.has(row.original.id);
//   }, [search]);

//   // Handle sending quote to project board
//   const handleSendToBoard = async (quoteId: string, columnName?: string) => {
//     try {
//       console.log('Attempting to send quote to board:', quoteId, 'column:', columnName);
//       const result = await sendQuoteToProjectBoard(quoteId, columnName);
//       console.log('Send result:', result);

//       if (result.success) {
//         // Invalidate queries to refetch with updated is_on_board status
//         invalidateQueries.allQuotes();
//         invalidateQueries.allBoard();

//         toast({
//           title: 'Sent to Project Board',
//           description: `Quote has been added to "${columnName || 'first column'}"`,
//         });
//       } else {
//         console.error('Failed to send to board:', result.error);
//         toast({
//           title: 'Error',
//           description: result.error || 'Failed to send quote to project board',
//           variant: 'destructive',
//         });
//       }
//     } catch (error) {
//       console.error('Exception sending to board:', error);
//       toast({
//         title: 'Error',
//         description: 'An unexpected error occurred',
//         variant: 'destructive',
//       });
//     }
//   };

//   // Handle removing quote from project board
//   const handleRemoveFromBoard = async (quoteId: string) => {
//     try {
//       console.log('Attempting to remove quote from board:', quoteId);
//       const result = await removeQuoteFromProjectBoard(quoteId);
//       console.log('Remove result:', result);

//       if (result.success) {
//         // Invalidate queries to refetch with updated is_on_board status
//         invalidateQueries.allQuotes();
//         invalidateQueries.allBoard();

//         toast({
//           title: 'Removed from Project Board',
//           description: 'Quote has been removed from the project board',
//         });
//       } else {
//         console.error('Failed to remove from board:', result.error);
//         toast({
//           title: 'Error',
//           description: result.error || 'Failed to remove quote from project board',
//           variant: 'destructive',
//         });
//       }
//     } catch (error) {
//       console.error('Exception removing from board:', error);
//       toast({
//         title: 'Error',
//         description: 'An unexpected error occurred',
//         variant: 'destructive',
//       });
//     }
//   };

//   // Handle deleting all versions in a group
//   const handleDeleteAllVersions = async () => {
//     if (!deleteGroupedQuote) return;

//     try {
//       // Find all quotes with the same base number
//       const group = quoteGroups.find(g => g.baseNumber === deleteGroupedQuote.baseNumber);
//       if (!group) {
//         toast({
//           title: 'Error',
//           description: 'Could not find quote group',
//           variant: 'destructive',
//         });
//         return;
//       }

//       // Delete all versions in the group
//       for (const version of group.versions) {
//         await onDeleteQuote(version.id);
//       }

//       toast({
//         title: 'Deleted',
//         description: `All ${deleteGroupedQuote.versionCount} version(s) have been deleted`,
//       });
//     } catch (error) {
//       toast({
//         title: 'Error',
//         description: 'Failed to delete all versions',
//         variant: 'destructive',
//       });
//     } finally {
//       setDeleteGroupedQuote(null);
//     }
//   };

//   // Handle status change with confirmation for Won<->Rejected transitions
//   const handleStatusChange = (quoteId: string, currentStatus: string, newStatus: string) => {
//     // Check if we're switching between Won and Rejected
//     const isWonToRejected = currentStatus === 'Won' && newStatus === 'Rejected';
//     const isRejectedToWon = currentStatus === 'Rejected' && newStatus === 'Won';

//     if (isWonToRejected || isRejectedToWon) {
//       // Show confirmation dialog
//       setPendingStatusChange({ quoteId, currentStatus, newStatus });
//     } else {
//       // Proceed directly without confirmation
//       onStatusChange(quoteId, newStatus);
//     }
//   };

//   // Confirm status change after user approval
//   const confirmStatusChange = async () => {
//     if (pendingStatusChange) {
//       const { quoteId, newStatus } = pendingStatusChange;

//       // Update the status
//       onStatusChange(quoteId, newStatus);
//       setPendingStatusChange(null);

//       // Note: No need to manually remove from board - the database trigger
//       // 'sync_project_on_quote_status_change' automatically deletes projects
//       // when status changes FROM Won to anything else, and then
//       // 'sync_quote_on_board_after_project_changes' updates is_on_board to false
//     }
//   };

//   // Cancel status change
//   const cancelStatusChange = () => {
//     setPendingStatusChange(null);
//   };

//   // Update follow-up times every minute
//   useEffect(() => {
//     const interval = setInterval(() => {
//       setForceUpdate(prev => prev + 1);
//     }, 60000);
//     return () => clearInterval(interval);
//   }, []);

//   const columnHelper = createColumnHelper<Quote>();

//   const columns = useMemo<ColumnDef<Quote, any>[]>(() => [
//     // Selection column
//     columnHelper.display({
//       id: 'select',
//       header: ({ table }) => {
//         const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
//           const checked = e.target.checked;

//           // Select all main rows
//           table.toggleAllPageRowsSelected(checked);

//           // Also select all version rows
//           if (checked) {
//             const newVersionSelection: Record<string, boolean> = {};
//             quoteGroups.forEach(group => {
//               if (group.hasMultipleVersions) {
//                 group.versions.forEach(version => {
//                   newVersionSelection[version.id] = true;
//                 });
//               }
//             });
//             setVersionSelection(newVersionSelection);
//           } else {
//             setVersionSelection({});
//           }
//         };

//         return (
//           <input
//             type="checkbox"
//             className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
//             checked={table.getIsAllPageRowsSelected()}
//             onChange={handleSelectAll}
//           />
//         );
//       },
//       cell: ({ row }) => {
//         const quote = row.original;
//         const versionGroup = quoteToGroupMap.get(quote.id);

//         // Checkbox is checked if the main row is selected
//         const isChecked = row.getIsSelected();

//         const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
//           e.stopPropagation();

//           const checked = e.target.checked;

//           // Toggle the main row (this counts as 1 main selection)
//           row.toggleSelected(checked);

//           // Also toggle ALL version rows in versionSelection
//           // These will be counted separately as "versions" in the display
//           if (versionGroup && versionGroup.hasMultipleVersions) {
//             const newVersionSelection = { ...versionSelection };
//             versionGroup.versions.forEach(version => {
//               // Select all versions for visual consistency
//               newVersionSelection[version.id] = checked;
//             });
//             setVersionSelection(newVersionSelection);
//           }
//         }, [row, versionGroup, versionSelection]);

//         return (
//           <input
//             type="checkbox"
//             className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
//             checked={isChecked}
//             onChange={handleChange}
//             onClick={(e) => e.stopPropagation()}
//           />
//         );
//       },
//       size: 32,
//       enableSorting: false,
//       enableResizing: false,
//     }),
//     columnHelper.accessor('proposal_number', {
//       id: 'proposal_number',
//       header: () => (
//         <div className="flex items-center">
//           {/* <Tag className="w-3.5 h-3.5" /> */}
//           <span>Proposal #</span>
//         </div>
//       ),
//       cell: ({ getValue, row }) => {
//         const quote = row.original;
//         const versionGroup = quoteToGroupMap.get(quote.id);
//         const proposalNumber = getValue();
//         const baseNumber = getBaseProposalNumber(proposalNumber);
//         const isExpanded = (expanded as Record<string, boolean>)[baseNumber] === true;
//         const hasMultipleVersions = versionGroup && versionGroup.hasMultipleVersions;

//         // Always show the base proposal number (without version suffix) for grouped quotes
//         // For standalone quotes, show the full proposal number
//         const displayNumber = hasMultipleVersions ? baseNumber : proposalNumber;

//         // Check if this quote was imported
//         const isImported = quote.quote_details?.quoteSource === 'Imported';

//         return (
//           <div className="flex items-center gap-1.5 group/versions">
//             {isImported && (
//               <FileUp className="w-3.5 h-3.5 text-orange-500" title="Imported quote" />
//             )}
//             <div className="font-mono text-[13px] text-gray-900">
//               {displayNumber}
//             </div>
//             {hasMultipleVersions && versionGroup && (
//               <button
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   setExpanded(prev => ({
//                     ...(prev as Record<string, boolean>),
//                     [baseNumber]: !(prev as Record<string, boolean>)[baseNumber]
//                   }));
//                 }}
//                 className="flex items-center gap-0.5 text-[11px] text-gray-400 hover:text-blue-600 transition-colors"
//                 title={isExpanded ? 'Collapse versions' : `Show ${versionGroup.versions.length} versions`}
//               >
//                 <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
//                 <span className="hover:underline">{versionGroup.versions.length - 1} more</span>
//               </button>
//             )}
//           </div>
//         );
//       },
//       size: 140,
//       enableSorting: true,
//     }),
//     columnHelper.accessor((row) => `${row.project_name || row.quote_details?.project_name || "-"}`, {
//       id: 'project_name',
//       header: () => (
//         <div className="flex items-center">
//           {/* <Building className="w-3.5 h-3.5" /> */}
//           <span>Project</span>
//         </div>
//       ),
//       cell: ({ row }) => {
//         const projectName = row.original.project_name || row.original.quote_details?.project_name || "-";
//         const projectLocation = row.original.job_details?.job_location || "";
//         return (
//           <div className="space-y-0 min-w-0">
//             <div className="text-[13px] text-gray-900 truncate" title={projectName}>{projectName}</div>
//             {projectLocation && (
//               <div className="text-xs text-gray-500 truncate" title={projectLocation}>{projectLocation}</div>
//             )}
//           </div>
//         );
//       },
//       size: 240,
//       enableSorting: false,
//     }),
//     columnHelper.accessor((row) => row.job_details?.client_company || row.job_details?.client_name || "-", {
//       id: 'client_name',
//       header: () => (
//         <div className="flex items-center">
//           {/* <User className="w-3.5 h-3.5" /> */}
//           <span>Client</span>
//         </div>
//       ),
//       cell: ({ row }) => {
//         const quote = row.original;
//         const versionGroup = quoteToGroupMap.get(quote.id);

//         if (versionGroup && versionGroup.hasMultipleVersions) {
//           return <div className="text-sm text-gray-500 italic">Various</div>;
//         }

//         const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "-";
//         return <div className="text-[13px] text-gray-900 truncate" title={clientName}>{clientName}</div>;
//       },
//       size: 160,
//       enableSorting: false,
//     }),
//     columnHelper.accessor((row) => row.price_details?.final_selling_price || 0, {
//       id: 'total',
//       header: () => (
//         <div className="flex items-center">
//           {/* <DollarSign className="w-3.5 h-3.5" /> */}
//           <span>Total</span>
//         </div>
//       ),
//       cell: ({ row }) => {
//         const quote = row.original;
//         const versionGroup = quoteToGroupMap.get(quote.id);

//         if (versionGroup && versionGroup.hasMultipleVersions) {
//           return <div className="text-sm italic text-gray-500">Range</div>;
//         }

//         const total = quote.price_details?.final_selling_price || 0;
//         return <div className="text-[13px] text-gray-900">{formatCurrency(total)}</div>;
//       },
//       size: 110,
//       enableSorting: true,
//     }),
//     columnHelper.accessor('status', {
//       id: 'status',
//       header: 'Status',
//       cell: ({ row, getValue }) => {
//         const quote = row.original;
//         const versionGroup = quoteToGroupMap.get(quote.id);

//         if (versionGroup && versionGroup.hasMultipleVersions) {
//           return <div className="text-sm italic text-gray-500">Various</div>;
//         }

//         const currentStatus = getValue();

//         return (
//           <Select
//             value={currentStatus || "Incomplete"}
//             onValueChange={(value) => handleStatusChange(row.original.id, currentStatus || "Incomplete", value)}
//           >
//             <SelectTrigger className={`w-24 h-6 border-0 text-xs px-2 ${statusColors[currentStatus as keyof typeof statusColors]}`}>
//               <SelectValue />
//             </SelectTrigger>
//             <SelectContent>
//               {getAvailableStatusOptions(currentStatus || "Incomplete").map((status) => (
//                 <SelectItem key={status.value} value={status.value}>
//                   {status.label}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         );
//       },
//       size: 130,
//       filterFn: 'equals',
//       enableSorting: false,
//     }),
    
//     columnHelper.accessor('created_at', {
//       id: 'created_at',
//       header: () => (
//         <div className="flex items-center">
//           {/* <Calendar className="w-3.5 h-3.5" /> */}
//           <span>Created</span>
//         </div>
//       ),
//       cell: ({ row, getValue }) => {
//         const quote = row.original;
//         const versionGroup = quoteToGroupMap.get(quote.id);

//         if (versionGroup && versionGroup.hasMultipleVersions) {
//           return <div className="text-sm italic text-gray-500">Various</div>;
//         }

//         return (
//           <div className="text-[13px] text-gray-900">
//             {formatDateEST(getValue())}
//           </div>
//         );
//       },
//       size: 110,
//       enableSorting: true,
//     }),
    
//     columnHelper.display({
//       id: 'actions',
//       header: 'Actions',
//       cell: ({ row }) => {
//         const quote = row.original;
//         const groupInfo = quoteToGroupMap.get(quote.id);
//         const hasMultipleVersions = groupInfo?.hasMultipleVersions || false;

//         // Grouped quotes (placeholder rows) only show Archive and Delete All Versions
//         if (hasMultipleVersions) {
//           return (
//             <DropdownMenu>
//               <DropdownMenuTrigger asChild>
//                 <button className="h-8 w-8 p-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
//                   <MoreHorizontal className="h-4 w-4" />
//                 </button>
//               </DropdownMenuTrigger>
//               <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
//                 {isArchiveView && onUnarchiveQuote ? (
//                   <DropdownMenuItem onClick={() => onUnarchiveQuote(quote.id)}>
//                     <ArchiveRestore className="mr-2 h-4 w-4" />
//                     Unarchive
//                   </DropdownMenuItem>
//                 ) : onArchiveQuote && (
//                   <DropdownMenuItem onClick={() => onArchiveQuote(quote.id)}>
//                     <Archive className="mr-2 h-4 w-4" />
//                     Archive
//                   </DropdownMenuItem>
//                 )}
//                 <DropdownMenuSeparator />
//                 <DropdownMenuItem
//                   onClick={() => {
//                     if (groupInfo) {
//                       setDeleteGroupedQuote({
//                         id: quote.id,
//                         baseNumber: groupInfo.baseNumber,
//                         versionCount: groupInfo.versions.length
//                       });
//                     }
//                   }}
//                   className="text-red-600 focus:text-red-600"
//                 >
//                   <Trash2 className="mr-2 h-4 w-4" />
//                   Delete All Versions
//                 </DropdownMenuItem>
//               </DropdownMenuContent>
//             </DropdownMenu>
//           );
//         }

//         // Single quotes or non-grouped quotes show full actions (but no Create Version if single)
//         return (
//           <DropdownMenu>
//             <DropdownMenuTrigger asChild>
//               <button className="h-8 w-8 p-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
//                 <MoreHorizontal className="h-4 w-4" />
//               </button>
//             </DropdownMenuTrigger>
//             <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
//               <DropdownMenuItem onClick={() => onEditQuote(quote)}>
//                 <Edit3 className="mr-2 h-4 w-4" />
//                 Edit
//               </DropdownMenuItem>
//               {onCreateVersion && (
//                 <DropdownMenuItem onClick={() => onCreateVersion(quote.id)}>
//                   <Copy className="mr-2 h-4 w-4" />
//                   Create Version
//                 </DropdownMenuItem>
//               )}
//               {onCreateInvoice && (
//                 <DropdownMenuItem onClick={() => onCreateInvoice(quote)}>
//                   <FileText className="mr-2 h-4 w-4" />
//                   Create Invoice
//                 </DropdownMenuItem>
//               )}
//               {onSetReminder && (
//                 <DropdownMenuItem onClick={() => onSetReminder(quote.id)}>
//                   <Bell className="mr-2 h-4 w-4" />
//                   Set Reminder
//                 </DropdownMenuItem>
//               )}
//               {quote.status === 'Won' && quote.is_main_version && (
//                 quote.is_on_board ? (
//                   <DropdownMenuItem onClick={() => handleRemoveFromBoard(quote.id)}>
//                     <X className="mr-2 h-4 w-4" />
//                     Remove from Board
//                   </DropdownMenuItem>
//                 ) : (
//                   <DropdownMenuSub>
//                     <DropdownMenuSubTrigger>
//                       <Kanban className="mr-2 h-4 w-4" />
//                       Send to Project Board
//                     </DropdownMenuSubTrigger>
//                     <DropdownMenuSubContent>
//                       {workflowColumns.length > 0 ? (
//                         workflowColumns
//                           .sort((a, b) => a.column_order - b.column_order)
//                           .map((col) => (
//                             <DropdownMenuItem
//                               key={col.id}
//                               onClick={() => handleSendToBoard(quote.id, col.name)}
//                             >
//                               <div
//                                 className="w-2 h-2 rounded-full mr-2"
//                                 style={{ backgroundColor: col.color }}
//                               />
//                               {col.name}
//                             </DropdownMenuItem>
//                           ))
//                       ) : (
//                         <DropdownMenuItem onClick={() => handleSendToBoard(quote.id)}>
//                           Active (default)
//                         </DropdownMenuItem>
//                       )}
//                     </DropdownMenuSubContent>
//                   </DropdownMenuSub>
//                 )
//               )}
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onClick={() => {
//                 // Open editor in new tab - user can download PDF from there
//                 const url = `/editor/${quote.proposal_number}`;
//                 window.open(url, '_blank');
//               }}>
//                 <Download className="mr-2 h-4 w-4" />
//                 Download PDF
//               </DropdownMenuItem>
//               <DropdownMenuSeparator />
//               {isArchiveView && onUnarchiveQuote ? (
//                 <DropdownMenuItem onClick={() => onUnarchiveQuote(quote.id)}>
//                   <ArchiveRestore className="mr-2 h-4 w-4" />
//                   Unarchive
//                 </DropdownMenuItem>
//               ) : onArchiveQuote && (
//                 <DropdownMenuItem onClick={() => onArchiveQuote(quote.id)}>
//                   <Archive className="mr-2 h-4 w-4" />
//                   Archive
//                 </DropdownMenuItem>
//               )}
//               <DropdownMenuSeparator />
//               <DropdownMenuItem
//                 onClick={() => onDeleteQuote(quote.id)}
//                 className="text-red-600 focus:text-red-600"
//               >
//                 <Trash2 className="mr-2 h-4 w-4" />
//                 Delete
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         );
//       },
//       size: 60,
//       enableSorting: false,
//     }),
//   ], [onEditQuote, onDeleteQuote, onStatusChange, onQuoteSourceChange, onCreateVersion, onSetReminder, onArchiveQuote, onUnarchiveQuote, isArchiveView, forceUpdate, expanded]);

//   const table = useReactTable({
//     data: displayQuotes,
//     columns,
//     filterFns: {
//       enhanced: enhancedFilter,
//     },
//     state: {
//       sorting,
//       columnFilters,
//       globalFilter,
//       columnVisibility,
//       rowSelection,
//       pagination,
//     },
//     enableRowSelection: true,
//     enableColumnResizing: false,
//     onSortingChange: setSorting,
//     onColumnFiltersChange: setColumnFilters,
//     onGlobalFilterChange: setGlobalFilter,
//     onColumnVisibilityChange: setColumnVisibility,
//     onRowSelectionChange: setRowSelection,
//     onPaginationChange: setPagination,
//     getCoreRowModel: getCoreRowModel(),
//     getFilteredRowModel: getFilteredRowModel(),
//     getSortedRowModel: getSortedRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     globalFilterFn: enhancedFilter,
//   });

//   return (
//     <div className="space-y-0">
//       {/* Table with integrated header */}
//       <div style={{ borderRadius: 'var(--radius-quotes-table)' }} className="border border-gray-200 bg-white dark:bg-[var(--content-card-bg)] dark:border-[var(--content-card-border)] shadow-sm overflow-hidden">
//         {/* Combined Search and Toolbar */}
//         <div className="flex items-center py-4 px-4 bg-white border-b border-gray-200 min-h-[72px]">
//           {/* Search Input - Very wide, takes most space */}
//           <div className="relative flex-1 mr-4">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//             <input
//               type="text"
//               placeholder="Search quotes... (try: client:ABC Corp, status:Draft)"
//               value={globalFilter ?? ''}
//               onChange={(e) => setGlobalFilter(e.target.value)}
//               className="w-full pl-10 pr-20 py-2 text-sm border border-gray-300 dark:border-[var(--input-border)] rounded-md focus:outline-none focus:ring-1 focus:ring-[var(--sidebar-icon-active)] dark:focus:ring-[var(--sidebar-icon-active)] focus:border-[var(--sidebar-icon-active)] dark:bg-[var(--input-bg)] dark:text-[var(--input-text)]"
//             />

//             <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
//               {globalFilter && (
//                 <Button
//                   variant="ghost"
//                   size="sm"
//                   onClick={() => setGlobalFilter('')}
//                   className="w-8 h-6 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)] rounded-full"
//                   title="Clear search"
//                 >
//                   <X className="w-3 h-3" />
//                 </Button>
//               )}

//               {!globalFilter && (
//                 <Popover open={showHelp} onOpenChange={setShowHelp}>
//                   <PopoverTrigger asChild>
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="w-8 h-6 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)] rounded-full"
//                       title="Search help"
//                     >
//                       <HelpCircle className="w-3 h-3" />
//                     </Button>
//                   </PopoverTrigger>
//                   <PopoverContent align="end" className="w-80">
//                     <div className="space-y-3">
//                       <div>
//                         <h4 className="font-medium text-sm mb-2">Search Tips</h4>
//                         <div className="text-xs text-gray-600 space-y-1">
//                           <p>• Regular search: Just type anything</p>
//                           <p>• Field-specific: Use "field:value" format</p>
//                         </div>
//                       </div>

//                       <div>
//                         <h4 className="font-medium text-sm mb-2">Field-Specific Examples</h4>
//                         <div className="space-y-1">
//                           {searchExamples.map((example, index) => (
//                             <button
//                               key={index}
//                               onClick={() => {
//                                 setGlobalFilter(example);
//                                 setShowHelp(false);
//                               }}
//                               className="block w-full text-left"
//                             >
//                               <Badge
//                                 variant="outline"
//                                 className="text-xs hover:bg-blue-50 cursor-pointer w-full justify-start"
//                               >
//                                 {example}
//                               </Badge>
//                             </button>
//                           ))}
//                         </div>
//                       </div>

//                       <div className="text-xs text-gray-500">
//                         <p><strong>Available fields:</strong></p>
//                         <p>proposal, client, location, status, creator, project</p>
//                       </div>
//                     </div>
//                   </PopoverContent>
//                 </Popover>
//               )}
//             </div>
//           </div>

//           {/* Toolbar - Archive, Density, Columns, Export, Create, Bulk Actions */}
//           <TableToolbar
//             table={table}
//             quotes={quotes}
//             dataDensity={dataDensity}
//             setDataDensity={setDataDensity}
//             columnVisibilityOpen={columnVisibilityOpen}
//             setColumnVisibilityOpen={setColumnVisibilityOpen}
//             columnLabels={columnLabels}
//             showArchived={showArchived}
//             archivedCount={archivedCount}
//             onToggleArchive={onToggleArchive}
//             versionSelection={versionSelection}
//             setVersionSelection={setVersionSelection}
//             onCreateQuote={onCreateQuote}
//             onImportQuote={onImportQuote}
//             onBulkDelete={onBulkDelete}
//             onBulkStatusChange={onBulkStatusChange}
//             onCreateVersion={onCreateVersion}
//             onExportCSV={onExportCSV}
//             onExportPDF={onExportPDF}
//           />
//         </div>

//         <div className="relative">
//           {/* Table Area */}
//           <div className="overflow-y-auto max-h-[600px] scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
//             <table
//               className="w-full border-collapse font-table"
//               style={{
//                 fontFamily: 'var(--font-table)',
//                 tableLayout: 'fixed'
//               }}
//             >
//               <thead className="bg-[#EE6C4D]/10 border-b border-[#EE6C4D]/20 sticky top-0 z-10">
//                 {table.getHeaderGroups().map(headerGroup => (
//                   <tr key={headerGroup.id}>
//                     {headerGroup.headers.map((header) => {
//                       const isSelectColumn = header.id === 'select';
//                       const isProposalColumn = header.id === 'proposal_number';
//                       const rowHeight = dataDensity === 'compact' ? 'h-8' : dataDensity === 'comfortable' ? 'h-9' : 'h-10';
//                       const columnPadding = isSelectColumn ? 'pl-3 pr-1' : isProposalColumn ? 'pl-1 pr-3' : 'px-3';

//                       return (
//                         <th
//                           key={header.id}
//                           className={`relative ${columnPadding} py-1 text-left text-xs font-medium text-gray-500 ${rowHeight}`}
//                           style={{ width: header.getSize() }}
//                         >
//                           {header.isPlaceholder ? null : (
//                             <div
//                               className={`flex items-center space-x-1 ${
//                                 header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 rounded p-1 -m-1' : ''
//                               }`}
//                               onClick={header.column.getToggleSortingHandler()}
//                             >
//                               {flexRender(header.column.columnDef.header, header.getContext())}
//                               {header.column.getCanSort() && (
//                                 <div className="flex flex-col">
//                                   {header.column.getIsSorted() === 'asc' ? (
//                                     <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
//                                   ) : header.column.getIsSorted() === 'desc' ? (
//                                     <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
//                                   ) : (
//                                     <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
//                                   )}
//                                 </div>
//                               )}
//                             </div>
//                           )}
//                         </th>
//                       );
//                     })}
//                   </tr>
//                 ))}
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {table.getRowModel().rows.map(row => {
//                   const rowHeight = dataDensity === 'compact' ? 'h-9' : dataDensity === 'comfortable' ? 'h-11' : 'h-14';
//                   const paddingY = dataDensity === 'compact' ? 'py-1' : dataDensity === 'comfortable' ? 'py-1.5' : 'py-2';
//                   const quote = row.original;
//                   const versionGroup = quoteToGroupMap.get(quote.id);
//                   const baseNumber = getBaseProposalNumber(quote.proposal_number);
//                   const isExpanded = expanded[baseNumber];

//                   return (
//                     <React.Fragment key={row.id}>
//                       {/* Main Row */}
//                       <tr
//                         className={`group transition-colors ${rowHeight} hover:bg-gray-50/50 dark:hover:bg-[var(--content-table-row-hover)]`}
//                       >
//                         {row.getVisibleCells().map((cell) => {
//                           const isSelectColumn = cell.column.id === 'select';
//                           const isProposalColumn = cell.column.id === 'proposal_number';
//                           const columnPadding = isSelectColumn ? 'pl-3 pr-1' : isProposalColumn ? 'pl-1 pr-3' : 'px-3';
//                           return (
//                             <td
//                               key={cell.id}
//                               className={`${columnPadding} ${paddingY} text-xs`}
//                               style={{ width: cell.column.getSize() }}
//                             >
//                               {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                             </td>
//                           );
//                         })}
//                       </tr>

//                       {/* Expanded Version Rows */}
//                       {isExpanded && versionGroup && versionGroup.hasMultipleVersions && (
//                         versionGroup.versions.map((version) => (
//                           <tr
//                             key={`${row.id}-version-${version.id}`}
//                             className="bg-gray-50/50 hover:bg-gray-100/50"
//                           >
//                             {/* Selection */}
//                             <td className="pl-3 pr-1 py-1">
//                               <input
//                                 type="checkbox"
//                                 className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
//                                 checked={versionSelection[version.id] || false}
//                                 onChange={(e) => {
//                                   setVersionSelection(prev => ({
//                                     ...prev,
//                                     [version.id]: e.target.checked
//                                   }));
//                                 }}
//                               />
//                             </td>

//                             {/* Proposal Number */}
//                             <td className="pl-1 pr-3 py-1">
//                               <div className="flex items-center gap-1.5">
//                                 <span className="text-gray-300 text-xs">└</span>
//                                 <span className="font-mono text-xs text-gray-500">
//                                   {version.proposal_number}
//                                 </span>
//                                 {version.is_main_version === true ? (
//                                   <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600">
//                                     <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
//                                   </span>
//                                 ) : (
//                                   <button
//                                     className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
//                                     onClick={(e) => {
//                                       e.stopPropagation();
//                                       if (onSetMainVersion) {
//                                         onSetMainVersion(version.id, versionGroup.baseNumber);
//                                       }
//                                       setMainVersions(prev => ({
//                                         ...prev,
//                                         [versionGroup.baseNumber]: version.id
//                                       }));
//                                     }}
//                                     title="Set as main version"
//                                   >
//                                     <Star className="w-3 h-3" />
//                                   </button>
//                                 )}
//                               </div>
//                             </td>

//                             {/* Project Name */}
//                             <td className="px-3 py-1">
//                               <div className="space-y-0">
//                                 <div className="text-[13px] text-gray-700 truncate">{version.project_name || "-"}</div>
//                                 {version.job_details?.job_location && (
//                                   <div className="text-xs text-gray-500 truncate">{version.job_details.job_location}</div>
//                                 )}
//                               </div>
//                             </td>

//                             {/* Client */}
//                             <td className="px-3 py-1 text-[13px] text-gray-700 truncate">
//                               {version.job_details?.client_company || version.job_details?.client_name || "-"}
//                             </td>

//                             {/* Total */}
//                             <td className="px-3 py-1 text-[13px] text-gray-700">
//                               {formatCurrency(version.price_details?.final_selling_price || 0)}
//                             </td>

//                             {/* Status */}
//                             <td className="px-3 py-1">
//                               <Select
//                                 value={version.status || "Incomplete"}
//                                 onValueChange={(value) => handleStatusChange(version.id, version.status || "Incomplete", value)}
//                               >
//                                 <SelectTrigger className={`w-24 h-6 border-0 text-xs px-2 ${statusColors[version.status as keyof typeof statusColors]}`}>
//                                   <SelectValue />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                   {getAvailableStatusOptions(version.status || "Incomplete").map((status) => (
//                                     <SelectItem key={status.value} value={status.value}>
//                                       {status.label}
//                                     </SelectItem>
//                                   ))}
//                                 </SelectContent>
//                               </Select>
//                             </td>

//                             {/* Created At */}
//                             <td className="px-3 py-1 text-[13px] text-gray-700">
//                               {formatDateEST(version.created_at)}
//                             </td>

//                             {/* Actions */}
//                             <td className="px-3 py-1">
//                               <DropdownMenu>
//                                 <DropdownMenuTrigger asChild>
//                                   <button className="h-6 w-6 p-0 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
//                                     <MoreHorizontal className="h-3.5 w-3.5" />
//                                   </button>
//                                 </DropdownMenuTrigger>
//                                 <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
//                                   <DropdownMenuItem onClick={() => onEditQuote(version)}>
//                                     <Edit3 className="mr-2 h-4 w-4" />
//                                     Edit
//                                   </DropdownMenuItem>
//                                   {onCreateVersion && (
//                                     <DropdownMenuItem onClick={() => onCreateVersion(version.id)}>
//                                       <Copy className="mr-2 h-4 w-4" />
//                                       Create Version
//                                     </DropdownMenuItem>
//                                   )}
//                                   {onSetReminder && (
//                                     <DropdownMenuItem onClick={() => onSetReminder(version.id)}>
//                                       <Bell className="mr-2 h-4 w-4" />
//                                       Set Reminder
//                                     </DropdownMenuItem>
//                                   )}
//                                   {version.status === 'Won' && version.is_main_version && (
//                                     version.is_on_board ? (
//                                       <DropdownMenuItem onClick={() => handleRemoveFromBoard(version.id)}>
//                                         <X className="mr-2 h-4 w-4" />
//                                         Remove from Board
//                                       </DropdownMenuItem>
//                                     ) : (
//                                       <DropdownMenuItem onClick={() => handleSendToBoard(version.id)}>
//                                         <Kanban className="mr-2 h-4 w-4" />
//                                         Send to Project Board
//                                       </DropdownMenuItem>
//                                     )
//                                   )}
//                                   <DropdownMenuSeparator />
//                                   <DropdownMenuItem onClick={() => {
//                                     const url = `/editor/${version.proposal_number}`;
//                                     window.open(url, '_blank');
//                                   }}>
//                                     <Download className="mr-2 h-4 w-4" />
//                                     Download PDF
//                                   </DropdownMenuItem>
//                                   <DropdownMenuSeparator />
//                                   {isArchiveView && onUnarchiveQuote ? (
//                                     <DropdownMenuItem onClick={() => onUnarchiveQuote(version.id)}>
//                                       <ArchiveRestore className="mr-2 h-4 w-4" />
//                                       Unarchive
//                                     </DropdownMenuItem>
//                                   ) : onArchiveQuote && (
//                                     <DropdownMenuItem onClick={() => onArchiveQuote(version.id)}>
//                                       <Archive className="mr-2 h-4 w-4" />
//                                       Archive
//                                     </DropdownMenuItem>
//                                   )}
//                                   <DropdownMenuSeparator />
//                                   <DropdownMenuItem
//                                     onClick={() => onDeleteQuote(version.id)}
//                                     className="text-red-600 focus:text-red-600"
//                                   >
//                                     <Trash2 className="mr-2 h-4 w-4" />
//                                     Delete
//                                   </DropdownMenuItem>
//                                 </DropdownMenuContent>
//                               </DropdownMenu>
//                             </td>
//                           </tr>
//                         ))
//                       )}
//                     </React.Fragment>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         </div>

//         {/* Empty State - positioned in main viewing area */}
//         {table.getFilteredRowModel().rows.length === 0 && (
//           <div className="text-center py-16 px-6">
//             <div className="flex flex-col items-center space-y-3">
//               <Search className="w-12 h-12 text-gray-300" />
//               <div className="text-xl font-medium text-gray-600">No quotes found</div>
//               <div className="text-gray-500">Try adjusting your search or filters to find what you're looking for</div>
//             </div>
//           </div>
//         )}

//         {/* Pagination */}
//         <PaginationControls table={table} />
//       </div>

//       {/* Status Change Confirmation Dialog */}
//       <AlertDialog open={!!pendingStatusChange} onOpenChange={(open) => !open && cancelStatusChange()}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
//             <AlertDialogDescription className="space-y-3">
//               {pendingStatusChange?.currentStatus === 'Won' && pendingStatusChange?.newStatus === 'Rejected' && (
//                 <div className="text-base">
//                   Changing from <strong className="text-green-600">Won</strong> to <strong className="text-red-600">Rejected</strong> will:
//                   <ul className="list-disc list-inside mt-2 space-y-1">
//                     <li><strong>Remove the Won timestamp</strong></li>
//                     <li><strong>Update analytics accordingly</strong></li>
//                   </ul>
//                 </div>
//               )}
//               {pendingStatusChange?.currentStatus === 'Rejected' && pendingStatusChange?.newStatus === 'Won' && (
//                 <div className="text-base">
//                   Changing from <strong className="text-red-600">Rejected</strong> to <strong className="text-green-600">Won</strong> will:
//                   <ul className="list-disc list-inside mt-2 space-y-1">
//                     <li><strong>Remove the Rejected timestamp</strong></li>
//                     <li><strong>Update analytics accordingly</strong></li>
//                   </ul>
//                 </div>
//               )}
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel onClick={cancelStatusChange}>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={confirmStatusChange}
//               className="bg-orange-600 hover:bg-orange-700 text-white"
//             >
//               Proceed
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Delete Grouped Quote Confirmation Dialog */}
//       <AlertDialog open={!!deleteGroupedQuote} onOpenChange={(open) => !open && setDeleteGroupedQuote(null)}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Delete All Versions</AlertDialogTitle>
//             <AlertDialogDescription className="space-y-3">
//               <div className="text-base">
//                 <p className="mb-3">
//                   You are about to delete <strong className="text-red-600">{deleteGroupedQuote?.versionCount} version(s)</strong> of quote <strong>{deleteGroupedQuote?.baseNumber}</strong>.
//                 </p>
//                 <p className="text-red-600 font-semibold">
//                   This action cannot be undone and will permanently delete all versions in this group.
//                 </p>
//               </div>
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel onClick={() => setDeleteGroupedQuote(null)}>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDeleteAllVersions}
//               className="bg-red-600 hover:bg-red-700 text-white"
//             >
//               Delete All
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// };