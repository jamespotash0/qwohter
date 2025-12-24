/**
 * AllowedValuesDialog
 * Dialog for configuring which option values are allowed for a specific model option
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  optionAdminService,
  type ModelOption,
  type OptionValue,
  type ModelAllowedValue,
} from '../services/optionAdminService';

interface AllowedValuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelOption: ModelOption | null;
  onSaved: () => void;
}

export function AllowedValuesDialog({
  open,
  onOpenChange,
  modelOption,
  onSaved,
}: AllowedValuesDialogProps) {
  const { toast } = useToast();

  const [availableOptionValues, setAvailableOptionValues] = useState<OptionValue[]>([]);
  const [selectedValueIds, setSelectedValueIds] = useState<Set<string>>(new Set());
  const [defaultValueId, setDefaultValueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load data when dialog opens
  useEffect(() => {
    if (open && modelOption) {
      loadData();
    }
  }, [open, modelOption]);

  const loadData = async () => {
    if (!modelOption) return;

    setLoading(true);
    try {
      // Fetch available option values for this option group
      const values = await optionAdminService.getOptionValues(modelOption.option_group_id);
      setAvailableOptionValues(values);

      // Fetch currently allowed values for this model option
      const allowed = await optionAdminService.getModelAllowedValues(modelOption.id);

      // Set selected value IDs from current allowed values
      const selectedIds = new Set(allowed.map((av) => av.option_value_id));
      setSelectedValueIds(selectedIds);

      // Find default value
      const defaultValue = allowed.find((av) => av.is_default);
      setDefaultValueId(defaultValue?.option_value_id || null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load allowed values', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Toggle a value selection
  const handleToggleValue = (valueId: string) => {
    const newSelected = new Set(selectedValueIds);
    if (newSelected.has(valueId)) {
      newSelected.delete(valueId);
      // If removing the default, clear the default
      if (defaultValueId === valueId) {
        setDefaultValueId(null);
      }
    } else {
      newSelected.add(valueId);
    }
    setSelectedValueIds(newSelected);
  };

  // Set default value
  const handleSetDefault = (valueId: string) => {
    if (selectedValueIds.has(valueId)) {
      setDefaultValueId(valueId === defaultValueId ? null : valueId);
    }
  };

  // Save allowed values
  const handleSave = async () => {
    if (!modelOption) return;

    setSaving(true);
    try {
      const valueIds = Array.from(selectedValueIds);
      await optionAdminService.setModelAllowedValues(
        modelOption.id,
        valueIds,
        defaultValueId || undefined
      );
      toast({ title: 'Allowed values updated' });
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save allowed values', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Select all values
  const handleSelectAll = () => {
    const allIds = new Set(availableOptionValues.map((v) => v.id));
    setSelectedValueIds(allIds);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedValueIds(new Set());
    setDefaultValueId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Allowed Values</DialogTitle>
          <DialogDescription>
            Select which values from "{modelOption?.option_group?.name}" are allowed for this model.
            {selectedValueIds.size > 0 && (
              <span className="ml-2 font-medium text-blue-600">
                ({selectedValueIds.size} selected)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : availableOptionValues.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No values defined for this option group. Add values in Option Values first.
            </div>
          ) : (
            <>
              {/* Bulk actions */}
              <div className="flex gap-2 mb-3">
                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={handleClearAll}>
                  Clear All
                </Button>
              </div>

              {/* Values list */}
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Allow</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="w-24">Default</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableOptionValues.map((value) => (
                      <TableRow key={value.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedValueIds.has(value.id)}
                            onCheckedChange={() => handleToggleValue(value.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className={!value.is_active ? 'text-gray-400 line-through' : ''}>
                            {value.value}
                          </span>
                          {!value.is_active && (
                            <Badge variant="outline" className="ml-2 text-xs">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Checkbox
                            checked={defaultValueId === value.id}
                            onCheckedChange={() => handleSetDefault(value.id)}
                            disabled={!selectedValueIds.has(value.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Allowed Values
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
