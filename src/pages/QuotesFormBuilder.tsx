// /**
//  * @deprecated This page is DEPRECATED. Use Proposals.tsx instead.
//  *
//  * This file uses the old quotesStore which no longer exists.
//  * The new Proposals page uses the proposals table with React Query.
//  *
//  * Migration:
//  * - OLD: QuotesFormBuilder
//  * - NEW: Proposals page at /proposals route
//  *
//  * See: src/pages/Proposals.tsx
//  * See: src/hooks/queries/useProposals.ts
//  *
//  * ============================================================================
//  * DEPRECATED - DO NOT USE
//  * ============================================================================
//  */

// import { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useQuotesStore, type Quote } from '@/stores/quotes/quotesStore';
// import { useOrganizationStore } from '@/stores/organization/organizationStore';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from '@/components/ui/alert-dialog';
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog';
// import { Label } from '@/components/ui/label';
// import {
//   Plus,
//   Search,
//   MoreVertical,
//   Edit,
//   Copy,
//   Trash2,
//   Archive,
//   FileText,
//   Calendar,
//   DollarSign,
//   TrendingUp,
//   Clock,
//   CheckCircle,
// } from 'lucide-react';
// import { motion, AnimatePresence } from 'framer-motion';
// import { format } from 'date-fns';
// import { toast } from 'sonner';
// import { QuoteCreationWizard } from '@/components/quotes/QuoteCreationWizard';

// const STATUS_COLORS = {
//   Draft: 'bg-gray-100 text-gray-700 border-gray-200',
//   Incomplete: 'bg-yellow-100 text-yellow-700 border-yellow-200',
//   Complete: 'bg-blue-100 text-blue-700 border-blue-200',
//   Sent: 'bg-purple-100 text-purple-700 border-purple-200',
//   Accepted: 'bg-green-100 text-green-700 border-green-200',
//   Rejected: 'bg-red-100 text-red-700 border-red-200',
// };

// export default function QuotesFormBuilder() {
//   const navigate = useNavigate();
//   const { currentOrganization } = useOrganizationStore();
//   const { quotes, isLoading, fetchQuotes, deleteQuote, copyQuote, archiveQuote } = useQuotesStore();

//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState<string>('all');
//   const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
//   const [copyDialogOpen, setCopyDialogOpen] = useState(false);
//   const [createWizardOpen, setCreateWizardOpen] = useState(false);
//   const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
//   const [copyProjectName, setCopyProjectName] = useState('');

//   useEffect(() => {
//     if (currentOrganization?.id) {
//       fetchQuotes(currentOrganization.id);
//     }
//   }, [currentOrganization?.id, fetchQuotes]);

//   const filteredQuotes = quotes.filter((quote) => {
//     const matchesSearch =
//       quote.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       quote.proposal_number.toLowerCase().includes(searchQuery.toLowerCase());

//     const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

//     return matchesSearch && matchesStatus;
//   });

//   const handleDelete = async () => {
//     if (!selectedQuoteId) return;
//     const success = await deleteQuote(selectedQuoteId);
//     if (success) {
//       toast.success('Quote deleted successfully');
//       setDeleteDialogOpen(false);
//       setSelectedQuoteId(null);
//     } else {
//       toast.error('Failed to delete quote');
//     }
//   };

//   const handleCopy = async () => {
//     if (!selectedQuoteId || !copyProjectName.trim()) return;
//     const copied = await copyQuote(selectedQuoteId, copyProjectName);
//     if (copied) {
//       toast.success('Quote copied successfully');
//       setCopyDialogOpen(false);
//       setSelectedQuoteId(null);
//       setCopyProjectName('');
//     } else {
//       toast.error('Failed to copy quote');
//     }
//   };

//   const handleArchive = async (quoteId: string) => {
//     const success = await archiveQuote(quoteId);
//     if (success) {
//       toast.success('Quote archived successfully');
//     } else {
//       toast.error('Failed to archive quote');
//     }
//   };

//   const openCopyDialog = (quoteId: string, projectName?: string) => {
//     setSelectedQuoteId(quoteId);
//     setCopyProjectName(`${projectName || 'Quote'} (Copy)`);
//     setCopyDialogOpen(true);
//   };

//   const openDeleteDialog = (quoteId: string) => {
//     setSelectedQuoteId(quoteId);
//     setDeleteDialogOpen(true);
//   };

//   // Calculate stats
//   const stats = {
//     total: quotes.length,
//     draft: quotes.filter((q) => q.status === 'Draft').length,
//     complete: quotes.filter((q) => q.status === 'Complete').length,
//     sent: quotes.filter((q) => q.status === 'Sent').length,
//     accepted: quotes.filter((q) => q.status === 'Accepted').length,
//   };

//   return (
//     <div className="h-full w-full overflow-auto bg-background">
//       <div className="max-w-7xl mx-auto p-8">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-8">
//           <div>
//             <h1 className="text-3xl font-bold text-foreground">Quotes & Proposals</h1>
//             <p className="text-muted-foreground mt-1">
//               Manage quotes created from your custom forms
//             </p>
//           </div>
//           <Button
//             size="lg"
//             onClick={() => setCreateWizardOpen(true)}
//             className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
//           >
//             <Plus className="w-5 h-5 mr-2" />
//             Create Quote
//           </Button>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0 }}
//           >
//             <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
//                   <FileText className="w-5 h-5 text-primary" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold text-foreground">{stats.total}</p>
//                   <p className="text-xs text-muted-foreground">Total Quotes</p>
//                 </div>
//               </div>
//             </div>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.1 }}
//           >
//             <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
//                   <Clock className="w-5 h-5 text-gray-600" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold text-foreground">{stats.draft}</p>
//                   <p className="text-xs text-muted-foreground">Drafts</p>
//                 </div>
//               </div>
//             </div>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.2 }}
//           >
//             <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
//                   <CheckCircle className="w-5 h-5 text-blue-600" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold text-foreground">{stats.complete}</p>
//                   <p className="text-xs text-muted-foreground">Complete</p>
//                 </div>
//               </div>
//             </div>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.3 }}
//           >
//             <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
//                   <TrendingUp className="w-5 h-5 text-purple-600" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold text-foreground">{stats.sent}</p>
//                   <p className="text-xs text-muted-foreground">Sent</p>
//                 </div>
//               </div>
//             </div>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.4 }}
//           >
//             <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
//                   <DollarSign className="w-5 h-5 text-green-600" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold text-foreground">{stats.accepted}</p>
//                   <p className="text-xs text-muted-foreground">Accepted</p>
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         </div>

//         {/* Filters */}
//         <div className="flex flex-col sm:flex-row gap-4 mb-6">
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
//             <Input
//               placeholder="Search quotes..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-9"
//             />
//           </div>
//           <div className="flex gap-2 overflow-x-auto">
//             {['all', 'Draft', 'Incomplete', 'Complete', 'Sent', 'Accepted', 'Rejected'].map((status) => (
//               <Button
//                 key={status}
//                 variant={statusFilter === status ? 'default' : 'outline'}
//                 size="sm"
//                 onClick={() => setStatusFilter(status)}
//                 className="whitespace-nowrap"
//               >
//                 {status === 'all' ? 'All' : status}
//               </Button>
//             ))}
//           </div>
//         </div>

//         {/* Loading State */}
//         {isLoading && (
//           <div className="flex items-center justify-center py-12">
//             <div className="text-muted-foreground">Loading quotes...</div>
//           </div>
//         )}

//         {/* Empty State */}
//         {!isLoading && filteredQuotes.length === 0 && (
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="flex flex-col items-center justify-center py-16"
//           >
//             <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
//               <FileText className="w-12 h-12 text-primary" />
//             </div>
//             <h3 className="text-xl font-semibold text-foreground mb-2">No quotes yet</h3>
//             <p className="text-muted-foreground text-center max-w-md mb-6">
//               {searchQuery
//                 ? 'No quotes match your search. Try a different query.'
//                 : 'Get started by creating your first quote from a custom form.'}
//             </p>
//             {!searchQuery && (
//               <Button
//                 size="lg"
//                 onClick={() => setCreateWizardOpen(true)}
//                 className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
//               >
//                 <Plus className="w-5 h-5 mr-2" />
//                 Create Your First Quote
//               </Button>
//             )}
//           </motion.div>
//         )}

//         {/* Quotes Table */}
//         {!isLoading && filteredQuotes.length > 0 && (
//           <div className="rounded-lg border bg-card overflow-hidden">
//             <Table>
//               <TableHeader>
//                 <TableRow className="bg-muted/50">
//                   <TableHead className="font-semibold">Proposal #</TableHead>
//                   <TableHead className="font-semibold">Project Name</TableHead>
//                   <TableHead className="font-semibold">Status</TableHead>
//                   <TableHead className="font-semibold">Created</TableHead>
//                   <TableHead className="font-semibold">Updated</TableHead>
//                   <TableHead className="text-right font-semibold">Actions</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 <AnimatePresence>
//                   {filteredQuotes.map((quote, index) => (
//                     <motion.tr
//                       key={quote.id}
//                       initial={{ opacity: 0, y: 10 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       exit={{ opacity: 0, x: -20 }}
//                       transition={{ delay: index * 0.02 }}
//                       className="group hover:bg-muted/30 transition-colors cursor-pointer"
//                       onClick={() => navigate(`/quotes/${quote.id}`)}
//                     >
//                       <TableCell className="font-mono font-medium">{quote.proposal_number}</TableCell>
//                       <TableCell className="font-medium">{quote.project_name || 'Untitled'}</TableCell>
//                       <TableCell>
//                         <Badge
//                           variant="outline"
//                           className={`${STATUS_COLORS[quote.status]} border`}
//                         >
//                           {quote.status}
//                         </Badge>
//                       </TableCell>
//                       <TableCell className="text-muted-foreground text-sm">
//                         {format(new Date(quote.created_at), 'MMM d, yyyy')}
//                       </TableCell>
//                       <TableCell className="text-muted-foreground text-sm">
//                         {format(new Date(quote.updated_at), 'MMM d, yyyy')}
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
//                             <Button
//                               variant="ghost"
//                               size="sm"
//                               className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
//                             >
//                               <MoreVertical className="w-4 h-4" />
//                             </Button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent align="end" className="w-48">
//                             <DropdownMenuItem
//                               className="cursor-pointer"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 navigate(`/quotes/${quote.id}/edit`);
//                               }}
//                             >
//                               <Edit className="w-4 h-4 mr-2" />
//                               Edit Quote
//                             </DropdownMenuItem>
//                             <DropdownMenuItem
//                               className="cursor-pointer"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 openCopyDialog(quote.id, quote.project_name);
//                               }}
//                             >
//                               <Copy className="w-4 h-4 mr-2" />
//                               Copy Quote
//                             </DropdownMenuItem>
//                             <DropdownMenuItem
//                               className="cursor-pointer"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 handleArchive(quote.id);
//                               }}
//                             >
//                               <Archive className="w-4 h-4 mr-2" />
//                               Archive
//                             </DropdownMenuItem>
//                             <DropdownMenuSeparator />
//                             <DropdownMenuItem
//                               className="cursor-pointer text-destructive focus:text-destructive"
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 openDeleteDialog(quote.id);
//                               }}
//                             >
//                               <Trash2 className="w-4 h-4 mr-2" />
//                               Delete Quote
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </TableCell>
//                     </motion.tr>
//                   ))}
//                 </AnimatePresence>
//               </TableBody>
//             </Table>
//           </div>
//         )}
//       </div>

//       {/* Delete Confirmation Dialog */}
//       <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
//         <AlertDialogContent>
//           <AlertDialogHeader>
//             <AlertDialogTitle>Delete Quote</AlertDialogTitle>
//             <AlertDialogDescription>
//               Are you sure you want to delete this quote? This action cannot be undone.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel>Cancel</AlertDialogCancel>
//             <AlertDialogAction
//               onClick={handleDelete}
//               className="bg-destructive hover:bg-destructive/90"
//             >
//               Delete
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* Copy Quote Dialog */}
//       <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Copy Quote</DialogTitle>
//             <DialogDescription>
//               Create a copy of this quote with a new project name.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4 py-4">
//             <div className="space-y-2">
//               <Label htmlFor="copy-name">Project Name</Label>
//               <Input
//                 id="copy-name"
//                 value={copyProjectName}
//                 onChange={(e) => setCopyProjectName(e.target.value)}
//                 placeholder="Enter project name"
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleCopy} disabled={!copyProjectName.trim()}>
//               Create Copy
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* Quote Creation Wizard */}
//       <QuoteCreationWizard
//         open={createWizardOpen}
//         onOpenChange={setCreateWizardOpen}
//       />
//     </div>
//   );
// }
