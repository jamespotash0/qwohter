import React from 'react';
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface QuoteFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  onNewQuote: () => void;
}

export const QuoteFilters: React.FC<QuoteFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  onNewQuote
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 animate-fade-in">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search quotes by client, project, or proposal number..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm h-12"
        />
      </div>
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[140px] bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm h-12">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="Incomplete">Incomplete</SelectItem>
          <SelectItem value="Draft">Draft</SelectItem>
          <SelectItem value="Pending">Pending</SelectItem>
          <SelectItem value="Submitted">Submitted</SelectItem>
          <SelectItem value="Won">Won</SelectItem>
          <SelectItem value="Rejected">Rejected</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        onClick={onNewQuote}
        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale h-12"
      >
        New Quote
      </Button>
    </div>
  );
};