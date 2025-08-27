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
  onCreateVersion?: (id: string) => void;
}

const statusColors = {
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

export const QuotesTable: React.FC<QuotesTableProps> = ({
  quotes,
  onEditQuote,
  onDeleteQuote,
  onStatusChange,
  onCreateVersion
}) => {
  return (
    <div className="overflow-auto max-h-[608px]"> {/* Adjust max height as needed */}
      <Table>
        <colgroup>
          <col className="w-24" />
          <col />
          <col />
          <col className="w-20" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-16" />
        </colgroup>
        <TableHeader className="sticky top-0 bg-white z-10">
          <TableRow className="bg-slate-50/50 h-10">
            <TableHead className="font-semibold py-2 text-xs">Proposal #</TableHead>
            <TableHead className="font-semibold py-2 text-xs">Project Name</TableHead>
            <TableHead className="font-semibold py-2 text-xs">Client Name</TableHead>
            <TableHead className="font-semibold py-2 text-xs">Created</TableHead>
            <TableHead className="font-semibold py-2 text-xs">Total</TableHead>
            <TableHead className="font-semibold py-2 text-xs">Status</TableHead>
            <TableHead className="font-semibold py-2 text-xs">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => {
            const clientName = quote.job_details?.client_company || quote.job_details?.client_name || "Untitled Client Name";
            const projectName = quote.project_name || quote.quote_details?.project_name || "Untitled Project";
            const total = quote.price_details?.total || 0;
            const projectLocation = quote.job_details?.job_location || "";

            const proposalInfo = ProposalNumberGenerator.parseProposalNumber(quote.proposal_number);
            
            return (
              <TableRow key={quote.id} className="hover:bg-slate-50/50 transition-colors h-14">
                <TableCell className="font-medium py-2 text-sm">{proposalInfo.displayNumber}</TableCell>
                <TableCell className="py-2">
                  <div>
                    <div className="font-medium text-sm truncate">{projectName}</div>
                    <div className="text-xs text-slate-500 truncate">{projectLocation}</div>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="font-medium text-sm truncate">{clientName}</div>
                </TableCell>
                <TableCell className="text-slate-600 py-2 text-sm">
                  {new Date(quote.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </TableCell>
                <TableCell className="font-semibold py-2 text-sm">{formatCurrency(total)}</TableCell>
                <TableCell className="py-2">
                  <Select value={quote.status || "draft"} onValueChange={(value) => onStatusChange(quote.id, value)}>
                    <SelectTrigger className={`w-22 h-7 border-0 text-xs px-2 ${statusColors[quote.status as keyof typeof statusColors]} [&>svg]:hidden`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Submitted">Submitted</SelectItem>
                      <SelectItem value="Won">Won</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-2">
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
                </TableCell>
              </TableRow>
            );
          })}
          {quotes.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-6 text-slate-500 text-sm">
                No quotes match your search criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};