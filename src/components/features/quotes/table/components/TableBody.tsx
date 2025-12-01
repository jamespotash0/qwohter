import React from 'react';
import { Table, flexRender } from '@tanstack/react-table';
import type { Quote } from "@/services/quotesService";

interface TableBodyProps {
  table: Table<Quote>;
  dataDensity: 'compact' | 'comfortable' | 'spacious';
}

export const TableBody: React.FC<TableBodyProps> = ({
  table,
  dataDensity,
}) => {
  const rowHeight = dataDensity === 'compact' ? 'h-10' : dataDensity === 'comfortable' ? 'h-14' : 'h-18';
  const paddingY = dataDensity === 'compact' ? 'py-1' : dataDensity === 'comfortable' ? 'py-2' : 'py-4';

  return (
    <tbody className="divide-y divide-gray-200">
      {table.getRowModel().rows.map(row => (
        <tr
          key={row.id}
          className={`group hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-b-0 ${rowHeight} ${
            row.getIsSelected() ? 'bg-blue-50/30' : ''
          }`}
        >
          {row.getVisibleCells().map((cell) => {
            const isActionsColumn = cell.column.id === 'actions';
            return (
              <td
                key={cell.id}
                className={`px-4 ${paddingY} text-sm border-r border-gray-100 last:border-r-0 ${
                  isActionsColumn
                    ? 'sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-200 z-10'
                    : ''
                } ${row.getIsSelected() && isActionsColumn ? 'bg-blue-50' : ''}`}
                style={{ width: cell.column.getSize() }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            );
          })}
        </tr>
      ))}
    </tbody>
  );
};