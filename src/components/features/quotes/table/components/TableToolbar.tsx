import React from 'react';
import { Table, Row } from '@tanstack/react-table';
import {
  Plus, RotateCcw, CheckSquare, Square, Minus,
  SlidersHorizontal, Eye, Download, ChevronDown, Trash2,
  Copy, FileSpreadsheet
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Quote } from "@/stores/quotes/quotesStore";

interface TableToolbarProps {
  table: Table<Quote>;
  dataDensity: 'compact' | 'comfortable' | 'spacious';
  setDataDensity: (density: 'compact' | 'comfortable' | 'spacious') => void;
  columnVisibilityOpen: boolean;
  setColumnVisibilityOpen: (open: boolean) => void;
  columnLabels: Record<string, string>;
  resetColumnSizes: () => void;
  resetColumnVisibility: () => void;
  onCreateQuote?: () => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onCreateVersion?: (id: string) => void;
  onExport?: (quotes: Quote[]) => void;
  setRowSelection: (selection: any) => void;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  table,
  dataDensity,
  setDataDensity,
  columnVisibilityOpen,
  setColumnVisibilityOpen,
  columnLabels,
  resetColumnSizes,
  resetColumnVisibility,
  onCreateQuote,
  onBulkDelete,
  onBulkStatusChange,
  onCreateVersion,
  onExport,
  setRowSelection,
}) => {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const totalSelectableRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-3">
        {/* Bulk Selection Info */}
        {selectedCount > 0 && (
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-600">
              {selectedCount} of {totalSelectableRows} row{selectedCount > 1 ? 's' : ''} selected
            </div>

            <div className="flex items-center space-x-2">
              {/* Bulk Status Change */}
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
                      <div className="w-2 h-2 bg-gray-500 rounded mr-2"></div>
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
                      if (onBulkDelete && confirm(`Are you sure you want to delete ${selectedCount} quote${selectedCount > 1 ? 's' : ''}?`)) {
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
            </div>
          </div>
        )}

        {/* Show message when no rows selected */}
        {selectedCount === 0 && (
          <div className="text-sm text-gray-500">
            Select rows to perform bulk actions
          </div>
        )}
      </div>

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
              if (onExport) {
                onExport(table.getFilteredRowModel().rows.map(row => row.original));
              }
            }}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export All
            </DropdownMenuItem>
            {selectedCount > 0 && (
              <DropdownMenuItem onClick={() => {
                if (onExport) {
                  onExport(selectedRows.map(row => row.original));
                }
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Selected ({selectedCount})
              </DropdownMenuItem>
            )}
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
  );
};