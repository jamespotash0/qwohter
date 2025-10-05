// DEPRECATED: This file has been replaced by PaginationControls.tsx
// The new component integrates with TanStack Table and provides better functionality
// See: src/components/features/quotes/table/components/PaginationControls.tsx
// Migration completed: September 28, 2025

/*
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuotePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const QuotePagination: React.FC<QuotePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPageSizeChange
}) => {
  if (totalItems === 0) return null;

  return (
    <div className="border-t bg-white p-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-600">
          Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} quotes
        </div>
        <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="w-[70px] bg-white border-slate-200 shadow-sm h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-7 px-3 text-xs"
        >
          Previous
        </Button>
        <span className="text-xs text-slate-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="h-7 px-3 text-xs"
        >
          Next
        </Button>
      </div>
    </div>
  );
};
*/