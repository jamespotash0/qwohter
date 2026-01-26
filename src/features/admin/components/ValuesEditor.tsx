/**
 * Values Editor Component
 * Editable interface for managing values within a config_value_set
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Save, X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { configValueSetsService } from '../services/configValueSetsService';
import type { ConfigValueSet, ValueOption } from '@/lib/types/configValueSet';

interface ValuesEditorProps {
  valueSet: ConfigValueSet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

interface ValueFormData {
  code: string;
  label: string;
  hex: string;
  category: string;
  description: string;
  sort_order: string;
}

const EMPTY_FORM: ValueFormData = {
  code: '',
  label: '',
  hex: '',
  category: '',
  description: '',
  sort_order: '',
};

export function ValuesEditor({
  valueSet,
  open,
  onOpenChange,
  onUpdate,
}: ValuesEditorProps) {
  const { toast } = useToast();
  const [values, setValues] = useState<ValueOption[]>([]);
  const [loading, setLoading] = useState(false);

  // Add/Edit value dialog
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<ValueOption | null>(null);
  const [formData, setFormData] = useState<ValueFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ValueOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Initialize values when valueSet changes
  useEffect(() => {
    if (valueSet) {
      setValues([...(valueSet.values || [])]);
    }
  }, [valueSet]);

  const handleOpenValueDialog = (value?: ValueOption) => {
    if (value) {
      setEditingValue(value);
      setFormData({
        code: value.code,
        label: value.label,
        hex: value.hex || '',
        category: value.category || '',
        description: value.description || '',
        sort_order: value.sort_order?.toString() || '',
      });
    } else {
      setEditingValue(null);
      setFormData({
        ...EMPTY_FORM,
        sort_order: String(values.length),
      });
    }
    setIsValueDialogOpen(true);
  };

  const generateCodeFromLabel = (label: string): string => {
    return label
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 20);
  };

  const handleLabelChange = (label: string) => {
    setFormData((prev) => ({
      ...prev,
      label,
      code: editingValue ? prev.code : generateCodeFromLabel(label),
    }));
  };

  const handleSaveValue = async () => {
    if (!formData.code.trim() || !formData.label.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Code and label are required',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate codes (only for new values or if code changed)
    if (!editingValue || editingValue.code !== formData.code.trim()) {
      const codeExists = values.some(
        (v) => v.code === formData.code.trim() && v.code !== editingValue?.code
      );
      if (codeExists) {
        toast({
          title: 'Validation Error',
          description: 'A value with this code already exists',
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);
    try {
      const newValue: ValueOption = {
        code: formData.code.trim(),
        label: formData.label.trim(),
        hex: formData.hex.trim() || undefined,
        category: formData.category.trim() || undefined,
        description: formData.description.trim() || undefined,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : undefined,
      };

      let updatedValues: ValueOption[];

      if (editingValue) {
        // Update existing value
        updatedValues = values.map((v) =>
          v.code === editingValue.code ? newValue : v
        );
      } else {
        // Add new value
        updatedValues = [...values, newValue];
      }

      // Save to database
      await configValueSetsService.updateValueSet(valueSet.id, {
        values: updatedValues,
      });

      setValues(updatedValues);
      setIsValueDialogOpen(false);
      toast({
        title: editingValue ? 'Value updated' : 'Value added',
      });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save value',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteValue = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const updatedValues = values.filter((v) => v.code !== deleteTarget.code);

      await configValueSetsService.updateValueSet(valueSet.id, {
        values: updatedValues,
      });

      setValues(updatedValues);
      setDeleteTarget(null);
      toast({ title: 'Value deleted' });
      onUpdate();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete value',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  // Sort values by sort_order, then by label
  const sortedValues = [...values].sort((a, b) => {
    const orderA = a.sort_order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.sort_order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.label.localeCompare(b.label);
  });

  return (
    <>
      {/* Main Values Editor Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Values: {valueSet.name}</DialogTitle>
            <DialogDescription>
              Manage the values in this value set. Each value needs a unique code and a label.
            </DialogDescription>
          </DialogHeader>

          {/* Add Value Button */}
          <div className="flex justify-end py-2">
            <Button onClick={() => handleOpenValueDialog()} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Value
            </Button>
          </div>

          {/* Values Table */}
          <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
            {values.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No values yet. Click "Add Value" to add your first value.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedValues.map((value, index) => (
                    <TableRow key={value.code}>
                      <TableCell className="text-gray-400 text-sm">
                        {value.sort_order ?? index}
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                          {value.code}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{value.label}</TableCell>
                      <TableCell>
                        {value.category ? (
                          <Badge variant="secondary" className="text-xs">
                            {value.category}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {value.hex ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded border border-gray-300"
                              style={{ backgroundColor: value.hex }}
                            />
                            <span className="text-xs text-gray-500">{value.hex}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenValueDialog(value)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(value)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="pt-4">
            <div className="text-sm text-gray-500">
              {values.length} value{values.length !== 1 ? 's' : ''} in this set
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Value Dialog */}
      <Dialog open={isValueDialogOpen} onOpenChange={setIsValueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingValue ? 'Edit Value' : 'Add Value'}
            </DialogTitle>
            <DialogDescription>
              {editingValue
                ? 'Update the value properties below.'
                : 'Add a new value to this value set.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Label *</label>
              <Input
                value={formData.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g., Arctic White"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Code *</label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                placeholder="e.g., AW"
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Unique identifier used in form data (auto-generated from label)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Color (hex)</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.hex}
                    onChange={(e) =>
                      setFormData({ ...formData, hex: e.target.value })
                    }
                    placeholder="#FFFFFF"
                    className="font-mono flex-1"
                  />
                  {formData.hex && (
                    <div
                      className="w-10 h-10 rounded border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: formData.hex }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Standard Vinyl"
              />
              <p className="text-xs text-gray-500">
                Used for cascading/filtering by parent field selection
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValueDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveValue} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingValue ? 'Save Changes' : 'Add Value'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Value</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.label}" ({deleteTarget?.code})?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteValue}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
