import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Trash2, MoreHorizontal, Copy } from "lucide-react";
import { Quote } from "@/hooks/useQuotes";
import { ProposalNumberGenerator } from "@/utils/proposalNumberGenerator";

interface QuotesTableProps {
  quotes: Quote[];
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onFollowUpDaysChange: (id: string, days: number | null) => void;
  onCreateVersion?: (id: string) => void;
}

const statusColors = {
  Incomplete: "bg-gray-300 text-gray-800",
  Draft: "bg-gray-100 text-gray-800",
  Pending: "bg-yellow-100 text-yellow-800",
  Submitted: "bg-green-100 text-green-800",
  Won: "bg-blue-100 text-blue-800",
  Rejected: "bg-red-100 text-red-800",
};


const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Define which status transitions are allowed
const getAvailableStatusOptions = (currentStatus: string) => {
  const allStatuses = [
    { value: "Incomplete", label: "Incomplete" },
    { value: "Draft", label: "Draft" },
    { value: "Pending", label: "Pending" },
    { value: "Submitted", label: "Submitted" },
    { value: "Won", label: "Won" },
    { value: "Rejected", label: "Rejected" }
  ];

  // Incomplete can go to any status
  if (currentStatus === "Incomplete") {
    return allStatuses;
  }
  
  // Draft can go to any status except Incomplete
  if (currentStatus === "Draft") {
    return allStatuses.filter(status => status.value !== "Incomplete");
  }
  
  // Completed statuses (Pending, Submitted, Won, Rejected) cannot go back to Incomplete
  // They can move between completed statuses but not back to incomplete/draft workflow
  const completedStatuses = ["Pending", "Submitted", "Won", "Rejected"];
  if (completedStatuses.includes(currentStatus)) {
    return allStatuses.filter(status => 
      status.value !== "Incomplete" && status.value !== "Draft"
    );
  }

  return allStatuses;
};

// Helper function to calculate follow-up status
const getFollowUpStatus = (quote: Quote) => {
  if (!quote.follow_up_days || !quote.created_at) {
    return { daysRemaining: null, isOverdue: false, displayText: "Not set" };
  }

  const createdAt = new Date(quote.created_at);
  const followUpDate = new Date(createdAt);
  followUpDate.setDate(followUpDate.getDate() + quote.follow_up_days);
  
  const today = new Date();
  const timeDiff = followUpDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  const isOverdue = daysRemaining < 0;
  const displayText = isOverdue 
    ? `${Math.abs(daysRemaining)} days overdue`
    : daysRemaining === 0 
    ? "Due today"
    : `${daysRemaining} days left`;
    
  return { daysRemaining, isOverdue, displayText };
};

export const QuotesTable: React.FC<QuotesTableProps> = ({
  quotes,
  onEditQuote,
  onDeleteQuote,
  onStatusChange,
  onFollowUpDaysChange,
  onCreateVersion
}) => {
  return (
    <div className="relative max-h-[608px] overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[608px] pr-16"> {/* Leave space for sticky actions */}
        <Table className="min-w-[2400px] border-collapse"> {/* Wide enough to require horizontal scroll */}
          <colgroup>
            <col className="w-[24rem]" /> {/* Proposal # */}
            <col className="w-[64rem]"/> {/* Project Name */}
            <col className="w-[32rem]"/> {/* Client Name */}
            <col className="w-[24rem]" /> {/* Total */}
            <col className="w-[24rem]" /> {/* Status */}
            <col className="w-[24rem]" />  {/* Quote Source */}
            <col className="w-[24rem]" />  {/* Creator */}
            <col className="w-[24rem]" /> {/* Created */}
            <col className="w-[24rem]" /> {/* Status Updated */}
            <col className="w-[24rem]" /> {/* Follow Up Days */}
          </colgroup>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow className="bg-slate-50/50 h-10">
              <TableHead className="font-semibold py-4 text-sm">Proposal #</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Project Name</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Client Name</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Total</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Status</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Quote Source</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Creator</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Created</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Status Updated</TableHead>
              <TableHead className="font-semibold py-4 text-sm">Follow Up Days</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client Name";
            const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
            const total = quote.price_details?.final_selling_price || 0;
            const projectLocation = quote.job_details?.job_location || "";
            const quoteSource = quote.quote_source || "";
            const followUpStatus = getFollowUpStatus(quote);

            const proposalInfo = ProposalNumberGenerator.parseProposalNumber(quote.proposal_number);
            
            
            return (
              <TableRow key={quote.id} className="hover:bg-slate-50/50 transition-colors h-16">
                <TableCell className="font-medium py-2 text-sm">{proposalInfo.displayNumber}</TableCell>
                <TableCell className="py-2">
                  <div>
                    <div className="font-medium text-sm">
                      {projectName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {projectLocation}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="font-medium text-sm">
                    {clientName}
                  </div>
                </TableCell>
                <TableCell className="font-semibold py-2 text-sm">{formatCurrency(total)}</TableCell>
                <TableCell className="py-2">
                  <Select value={quote.status || "draft"} onValueChange={(value) => onStatusChange(quote.id, value)}>
                    <SelectTrigger className={`w-32 h-8 border-0 text-xs px-3 ${statusColors[quote.status as keyof typeof statusColors]} [&>svg]:hidden`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {getAvailableStatusOptions(quote.status || "Incomplete").map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                
                <TableCell className="py-2">
                  <div className="text-sm text-slate-600">
                    {quoteSource || 'Not specified'}
                  </div>
                </TableCell>

                <TableCell className="py-2">
                   <div className="text-slate-600 text-sm">
                      {quote.created_by || ''}
                  </div>
                </TableCell>

                <TableCell className="text-slate-600 py-2 text-sm">
                  {new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </TableCell>
                
                <TableCell className="py-2 text-sm text-slate-600">
                  {quote.status_last_updated
                    ? new Date(quote.status_last_updated).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'}
                </TableCell>

                <TableCell className="py-2">
                  {quote.follow_up_days === null || quote.follow_up_days === undefined ? (
                    <Select
                      value=""
                      onValueChange={(value) => onFollowUpDaysChange(quote.id, parseInt(value))}
                    >
                      <SelectTrigger className="w-32 h-8 border-0 text-xs px-3 bg-blue-50 text-blue-700 [&>svg]:hidden">
                        <SelectValue placeholder="Set days" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((days) => (
                          <SelectItem key={days} value={days.toString()}>
                            {days} day{days > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="relative group">
                      <div className={`w-32 h-8 border-0 text-xs px-3 flex items-center rounded-md cursor-pointer ${
                        followUpStatus.isOverdue 
                          ? 'bg-red-100 text-red-800 font-medium' 
                          : followUpStatus.daysRemaining === 0
                          ? 'bg-yellow-100 text-yellow-800 font-medium'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {followUpStatus.displayText}
                      </div>
                      <div className="absolute top-0 left-0 opacity-0 group-hover:opacity-100">
                        <Select
                          value={quote.follow_up_days.toString()}
                          onValueChange={(value) => onFollowUpDaysChange(quote.id, value === "clear" ? null : parseInt(value))}
                        >
                          <SelectTrigger className="w-22 h-7 border-0 text-xs px-2 bg-blue-50 text-blue-700 [&>svg]:hidden">
                            <SelectValue placeholder="Change..." />
                          </SelectTrigger>
                          <SelectContent className="bg-background border shadow-lg z-50">
                            {[1, 2, 3, 4, 5, 7, 10, 14, 21, 30].map((days) => (
                              <SelectItem key={days} value={days.toString()}>
                                {days} day{days > 1 ? "s" : ""}
                              </SelectItem>
                            ))}
                            <SelectItem value="clear" className="text-red-600">
                              Clear follow-up
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {quotes.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-6 text-slate-500 text-sm">
                No quotes match your search criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    
    {/* Sticky Actions Column */}
    <div className="absolute top-0 right-0 bg-white border-l border-slate-200 w-16 h-full">
      <div className="sticky top-0 bg-white z-20 border-b border-slate-200">
        <div className="h-[3.25rem] flex items-center justify-center bg-slate-50/50">
          <span className="font-semibold text-sm">Actions</span>
        </div>
      </div>
      <div>
        {quotes.map((quote) => (
          <div key={quote.id} className="h-16 flex items-center justify-center border-b border-slate-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-7 w-7 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          </div>
        ))}
        {quotes.length === 0 && (
          <div className="h-16 flex items-center justify-center">
            <span className="text-slate-400 text-xs">-</span>
          </div>
        )}
      </div>
    </div>
  </div>
  );
};