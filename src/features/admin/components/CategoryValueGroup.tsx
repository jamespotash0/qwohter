/**
 * CategoryValueGroup
 * Renders a group of option values within a category
 */

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import type { OptionValue } from '../services/optionAdminService';

interface CategoryValueGroupProps {
  category: string;
  values: OptionValue[];
  allowedValueIds: Set<string>;
  defaultValueId: string | null;
  onToggleValue: (valueId: string) => void;
  onSetDefault: (valueId: string) => void;
}

export function CategoryValueGroup({
  category,
  values,
  allowedValueIds,
  defaultValueId,
  onToggleValue,
  onSetDefault,
}: CategoryValueGroupProps) {
  const selectedCount = values.filter((v) => allowedValueIds.has(v.id)).length;

  const handleSelectAll = () => {
    values.forEach((v) => {
      if (!allowedValueIds.has(v.id)) {
        onToggleValue(v.id);
      }
    });
  };

  const handleClearAll = () => {
    values.forEach((v) => {
      if (allowedValueIds.has(v.id)) {
        onToggleValue(v.id);
      }
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{category}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedCount} / {values.length}
          </Badge>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleSelectAll}>
            All
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleClearAll}>
            None
          </Button>
        </div>
      </div>
      <Table>
        <TableBody>
          {values.map((value) => (
            <TableRow key={value.id}>
              <TableCell className="w-16">
                <Checkbox
                  checked={allowedValueIds.has(value.id)}
                  onCheckedChange={() => onToggleValue(value.id)}
                />
              </TableCell>
              <TableCell>
                <span className={!value.is_active ? 'text-gray-400 line-through' : ''}>
                  {value.value}
                </span>
              </TableCell>
              <TableCell className="w-24">
                <Checkbox
                  checked={defaultValueId === value.id}
                  onCheckedChange={() => onSetDefault(value.id)}
                  disabled={!allowedValueIds.has(value.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
