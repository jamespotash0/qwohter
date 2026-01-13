import React from 'react';
import { Table } from '@tanstack/react-table';
import { Filter, RotateCcw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Quote } from "@/services/quotesService";
import { EnhancedSearchInput } from './EnhancedSearchInput';

interface TableFiltersProps {
  table: Table<Quote>;
  globalFilter: string;
  setGlobalFilter: (value: string) => void;
  quotes: Quote[];
}

export const TableFilters: React.FC<TableFiltersProps> = ({
  table,
  globalFilter,
  setGlobalFilter,
  quotes,
}) => {
  const resetFilters = () => {
    setGlobalFilter('');
    table.resetColumnFilters();
  };

  const hasActiveFilters = globalFilter !== '' || table.getState().columnFilters.length > 0;

  return (
    <div className="flex items-center space-x-3 py-4 px-4 bg-white border-b border-gray-200">
      {/* Search Input - Takes most space */}
      <div className="flex-1">
        <EnhancedSearchInput
          quotes={quotes}
          value={globalFilter ?? ''}
          onChange={setGlobalFilter}
          placeholder="Search quotes... (try: client:ABC Corp, status:Draft)"
        />
      </div>
    </div>
  );
};