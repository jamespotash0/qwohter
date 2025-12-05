/**
 * Proposals Table Toolbar
 * Provides bulk actions, export, and table controls for the proposals table
 */

import React from 'react';
import { Table } from '@tanstack/react-table';
import {
  Plus, Archive, ArchiveRestore,
  SlidersHorizontal, Eye, Download, ChevronDown, Trash2,
  Copy, FileSpreadsheet, FileText
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import type { Proposal } from "@/services/proposalsService";

interface ProposalsTableToolbarProps {
  table: Table<Proposal>;
  proposals: Proposal[];
  dataDensity: 'compact' | 'comfortable' | 'spacious';
  setDataDensity: (density: 'compact' | 'comfortable' | 'spacious') => void;
  columnVisibilityOpen: boolean;
  setColumnVisibilityOpen: (open: boolean) => void;
  columnLabels: Record<string, string>;
  showArchived?: boolean;
  archivedCount?: number;
  onToggleArchive?: () => void;
  versionSelection: Record<string, boolean>;
  setVersionSelection: (selection: Record<string, boolean>) => void;
  onCreateProposal?: () => void;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onCreateVersion?: (id: string) => void;
  onExportCSV?: (proposals: Proposal[]) => void;
  onExportPDF?: (proposals: Proposal[]) => void;
}

export const ProposalsTableToolbar: React.FC<ProposalsTableToolbarProps> = ({
  table,
  proposals,
  dataDensity,
  setDataDensity,
  columnVisibilityOpen,
  setColumnVisibilityOpen,
  columnLabels,
  showArchived = false,
  archivedCount = 0,
  onToggleArchive,
  versionSelection,
  setVersionSelection,
  onCreateProposal,
  onBulkDelete,
  onBulkStatusChange,
  onCreateVersion,
  onExportCSV,
  onExportPDF,
}) => {
  const selectedMainRows = table.getFilteredSelectedRowModel().rows.length;
  const selectedMainIds = table.getFilteredSelectedRowModel().rows.map(row => row.original.id);
  const selectedVersionIds = Object.keys(versionSelection).filter(id => versionSelection[id]);
  const versionOnlyIds = selectedVersionIds.filter(id => !selectedMainIds.includes(id));
  const totalSelected = selectedMainRows + versionOnlyIds.length;
  const allSelectedIds = [...selectedMainIds, ...selectedVersionIds];
  const hasSelections = totalSelected > 0;

  const resetSelections = () => {
    setVersionSelection({});
    table.resetRowSelection();
  };

  return (
    <>
      {hasSelections && (
        <div className="flex items-center space-x-4 h-10">
          <div className="text-sm font-medium text-foreground">
            {totalSelected} proposal{totalSelected > 1 ? 's' : ''} selected
            {versionOnlyIds.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                ({selectedMainRows} main + {versionOnlyIds.length} version{versionOnlyIds.length > 1 ? 's' : ''})
              </span>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 px-3">
                Change Status
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {['Draft', 'Complete', 'Sent', 'Approved', 'Rejected'].map(status => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => {
                    if (onBulkStatusChange) {
                      onBulkStatusChange(allSelectedIds, status);
                      resetSelections();
                    }
                  }}
                >
                  Set to {status}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 px-3">
                More Actions
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                if (onExportCSV) {
                  const allSelected = [
                    ...table.getFilteredSelectedRowModel().rows.map(row => row.original),
                    ...proposals.filter(p => selectedVersionIds.includes(p.id))
                  ];
                  onExportCSV(allSelected);
                }
              }}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Selected (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                if (onExportPDF) {
                  const allSelected = [
                    ...table.getFilteredSelectedRowModel().rows.map(row => row.original),
                    ...proposals.filter(p => selectedVersionIds.includes(p.id))
                  ];
                  onExportPDF(allSelected);
                }
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Export Selected (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                allSelectedIds.forEach(id => {
                  if (onCreateVersion) onCreateVersion(id);
                });
                resetSelections();
              }}>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate Selected
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (onBulkDelete) {
                    onBulkDelete(allSelectedIds);
                    resetSelections();
                  }
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {!hasSelections && (
        <div className="flex items-center space-x-2 h-10">
          {onToggleArchive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleArchive}
              className={`w-10 h-10 p-0 ${showArchived ? 'bg-blue-50 text-blue-700' : ''}`}
              title={showArchived ? 'Show Active Proposals' : `View Archives (${archivedCount})`}
            >
              {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-10 h-10 p-0" title="Table Density">
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {(['compact', 'comfortable', 'spacious'] as const).map(density => (
                <DropdownMenuItem
                  key={density}
                  onClick={() => setDataDensity(density)}
                  className={dataDensity === density ? 'bg-blue-50' : ''}
                >
                  <span className={dataDensity === density ? 'font-semibold' : ''}>
                    {density.charAt(0).toUpperCase() + density.slice(1)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={columnVisibilityOpen} onOpenChange={setColumnVisibilityOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-10 h-10 p-0" title="Show/Hide Columns">
                <Eye className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="p-2" onClick={(e) => e.stopPropagation()}>
                <div className="text-xs text-muted-foreground mb-2 font-medium">Show/Hide Columns</div>
                {table.getAllColumns()
                  .filter(column => column.getCanHide() && column.id !== 'select')
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-10 h-10 p-0" title="Export Data">
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExportCSV?.(table.getFilteredRowModel().rows.map(row => row.original))}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExportPDF?.(table.getFilteredRowModel().rows.map(row => row.original))}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onCreateProposal && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCreateProposal}
              className="h-10 px-3 bg-primary hover:bg-primary/90 text-white border-primary"
              title="Create Proposal"
            >
              <Plus className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}
    </>
  );
};
