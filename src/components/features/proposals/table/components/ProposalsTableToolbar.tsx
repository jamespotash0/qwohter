/**
 * Proposals Table Toolbar
 * Provides bulk actions, export, and table controls for the proposals table
 */

import React from 'react';
import { Table } from '@tanstack/react-table';
import {
  Plus, Archive, ArchiveRestore,
  SlidersHorizontal, Eye, Download, ChevronDown, Trash2,
  Copy, FileSpreadsheet, FileText, FileUp
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu";
import type { Proposal } from "@/services/proposalsService";
import { trackEvent } from '@/lib/analytics';

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
  onImportProposal?: () => void;
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
  onImportProposal,
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
              {['Draft', 'Submitted', 'Won', 'Rejected'].map(status => (
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
          {/* Archive Toggle Button */}
          {onToggleArchive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleArchive}
              className={`w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)] ${
                showArchived ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''
              }`}
              title={showArchived ? 'Show Active Proposals' : `View Archives (${archivedCount})`}
            >
              {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </Button>
          )}

          {/* Data Density */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)]"
                title={`Table Density: ${dataDensity.charAt(0).toUpperCase() + dataDensity.slice(1)}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => setDataDensity('compact')}
                className={dataDensity === 'compact' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              >
                <div className="flex items-center">
                  <div className={`w-2 h-1 rounded mr-2 ${dataDensity === 'compact' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                  <span className={dataDensity === 'compact' ? 'font-semibold' : ''}>Compact</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDataDensity('comfortable')}
                className={dataDensity === 'comfortable' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              >
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded mr-2 ${dataDensity === 'comfortable' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                  <span className={dataDensity === 'comfortable' ? 'font-semibold' : ''}>Comfortable</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDataDensity('spacious')}
                className={dataDensity === 'spacious' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
              >
                <div className="flex items-center">
                  <div className={`w-2 h-3 rounded mr-2 ${dataDensity === 'spacious' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                  <span className={dataDensity === 'spacious' ? 'font-semibold' : ''}>Spacious</span>
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
                className="w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)]"
                title="Show/Hide Columns"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" onPointerDownOutside={() => setColumnVisibilityOpen(false)}>
              <div className="p-2" onClick={(e) => e.stopPropagation()}>
                <div className="text-xs text-gray-500 mb-2 font-medium">Show/Hide Columns</div>
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

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-10 h-10 p-0 hover:bg-[var(--sidebar-nav-bg-hover)] dark:hover:bg-[var(--sidebar-nav-bg-hover)]"
                title="Export Data"
              >
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { trackEvent('export_initiated', { type: 'csv' }); onExportCSV?.(table.getFilteredRowModel().rows.map(row => row.original)); }}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { trackEvent('export_initiated', { type: 'pdf' }); onExportPDF?.(table.getFilteredRowModel().rows.map(row => row.original)); }}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Proposal Dropdown */}
          {(onCreateProposal || onImportProposal) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 px-3 bg-[var(--sidebar-icon-active)] hover:bg-[var(--sidebar-icon-hover)] text-white hover:text-white border-[var(--sidebar-icon-active)] hover:border-[var(--sidebar-icon-hover)] dark:bg-[var(--sidebar-icon-active)] dark:hover:bg-[var(--brand-orange-700)]"
                  title="Add Proposal"
                >
                  <Plus className="w-5 h-5 text-white" />
                  <ChevronDown className="w-4 h-4 ml-1 text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onCreateProposal && (
                  <DropdownMenuItem onClick={onCreateProposal} className="cursor-pointer">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New
                  </DropdownMenuItem>
                )}
                {onImportProposal && (
                  <DropdownMenuItem onClick={onImportProposal} className="cursor-pointer">
                    <FileUp className="w-4 h-4 mr-2" />
                    Import from File
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </>
  );
};
