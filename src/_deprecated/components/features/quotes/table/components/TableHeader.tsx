import React from 'react';
import { Table, flexRender } from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import type { Quote } from "@/services/quotesService";

interface TableHeaderProps {
  table: Table<Quote>;
  dataDensity: 'compact' | 'comfortable' | 'spacious';
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  table,
  dataDensity,
}) => {
  const rowHeight = dataDensity === 'compact' ? 'h-10' : dataDensity === 'comfortable' ? 'h-12' : 'h-14';
  const paddingY = dataDensity === 'compact' ? 'py-2' : dataDensity === 'comfortable' ? 'py-3' : 'py-4';

  return (
    <thead className="bg-gray-50/80 border-b border-gray-200">
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id} className={`group ${rowHeight}`}>
          {headerGroup.headers.map((header) => {
            const isActionsColumn = header.column.id === 'actions';
            return (
              <th
                key={header.id}
                className={`px-4 ${paddingY} text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 relative ${
                  isActionsColumn
                    ? 'sticky right-0 bg-gray-50/80 border-l border-gray-200 z-20'
                    : ''
                } ${rowHeight}`}
                style={{ width: header.getSize() }}
              >
                {header.isPlaceholder ? null : (
                  <div
                    className={`flex items-center space-x-2 ${
                      header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100 rounded p-1 -m-1' : ''
                    }`}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <div className="flex flex-col">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ChevronUp className="w-4 h-4 text-blue-600" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ChevronDown className="w-4 h-4 text-blue-600" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Column Resizer */}
                {header.column.getCanResize() && (
                  <div
                    onMouseDown={header.getResizeHandler()}
                    onTouchStart={header.getResizeHandler()}
                    className={`absolute right-0 top-0 h-full w-1 bg-transparent hover:bg-blue-500 cursor-col-resize select-none touch-none ${
                      header.column.getIsResizing() ? 'bg-blue-500' : ''
                    }`}
                    style={{
                      transform: 'translateX(50%)',
                    }}
                  />
                )}
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
};