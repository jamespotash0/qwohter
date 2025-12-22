/**
 * Option Values Admin Page
 * CRUD interface for option values within option groups
 */

import { useState, useEffect, useMemo } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, GripVertical, Check, X, ListPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  optionAdminService,
  type OptionGroup,
  type OptionValue,
} from '../services/optionAdminService';

interface ValueFormData {
  value: string;
  sort_order: number;
  is_active: boolean;
}

export function OptionValuesPage() {
  const { toast } = useToast();
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [optionValues, setOptionValues] = useState<OptionValue[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingValue, setEditingValue] = useState<OptionValue | null>(null);
  const [formData, setFormData] = useState<ValueFormData>({
    value: '',
    sort_order: 0,
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<OptionValue | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk add dialog
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  // Parse bulk text into values for preview
  const bulkPreview = useMemo(() => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    const unique = [...new Set(lines)];
    return { total: lines.length, unique: unique.length, duplicates: lines.length - unique.length };
  }, [bulkText]);

  // Load option groups on mount
  useEffect(() => {
    loadOptionGroups();
  }, []);

  // Load values when group changes
  useEffect(() => {
    if (selectedGroupId) {
      loadOptionValues(selectedGroupId);
    } else {
      setOptionValues([]);
    }
  }, [selectedGroupId]);

  const loadOptionGroups = async () => {
    try {
      const data = await optionAdminService.getOptionGroups();
      setOptionGroups(data);
      if (data.length > 0) {
        setSelectedGroupId(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load option groups',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadOptionValues = async (groupId: string) => {
    setLoading(true);
    try {
      const data = await optionAdminService.getOptionValues(groupId);
      setOptionValues(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load option values',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: OptionValue) => {
    if (item) {
      setEditingValue(item);
      setFormData({
        value: item.value,
        sort_order: item.sort_order,
        is_active: item.is_active,
      });
    } else {
      setEditingValue(null);
      setFormData({
        value: '',
        sort_order: optionValues.length,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.value.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Value is required',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedGroupId && !editingValue) {
      toast({
        title: 'Validation Error',
        description: 'Please select an option group first',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingValue) {
        await optionAdminService.updateOptionValue(editingValue.id, {
          value: formData.value.trim(),
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        });
        toast({ title: 'Option value updated' });
      } else {
        await optionAdminService.createOptionValue({
          option_group_id: selectedGroupId,
          value: formData.value.trim(),
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        });
        toast({ title: 'Option value created' });
      }
      setIsDialogOpen(false);
      loadOptionValues(selectedGroupId);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: OptionValue) => {
    try {
      await optionAdminService.updateOptionValue(item.id, {
        is_active: !item.is_active,
      });
      toast({ title: item.is_active ? 'Value deactivated' : 'Value activated' });
      loadOptionValues(selectedGroupId);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await optionAdminService.deleteOptionValue(deleteTarget.id);
      toast({ title: 'Option value deleted' });
      setDeleteTarget(null);
      loadOptionValues(selectedGroupId);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenBulkDialog = () => {
    setBulkText('');
    setIsBulkDialogOpen(true);
  };

  const handleBulkAdd = async () => {
    if (!selectedGroupId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an option group first',
        variant: 'destructive',
      });
      return;
    }

    const values = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (values.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter at least one value',
        variant: 'destructive',
      });
      return;
    }

    setBulkSaving(true);
    try {
      const startOrder = optionValues.length;
      const result = await optionAdminService.bulkCreateOptionValues(
        selectedGroupId,
        values,
        startOrder
      );

      if (result.created === 0 && result.skipped > 0) {
        toast({
          title: 'No values added',
          description: `All ${result.skipped} values already exist`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Values added',
          description: `Created ${result.created} values${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}`,
        });
        setIsBulkDialogOpen(false);
        loadOptionValues(selectedGroupId);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add values',
        variant: 'destructive',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const selectedGroup = optionGroups.find((g) => g.id === selectedGroupId);

  const filteredValues = optionValues.filter((v) =>
    v.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFieldTypeInfo = (group: OptionGroup | undefined) => {
    if (!group) return '';
    if (group.field_type === 'input') {
      return `Input (${group.input_type || 'text'})`;
    }
    return group.field_type.charAt(0).toUpperCase() + group.field_type.slice(1);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Option Values
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Values within option groups (e.g., "Ceiling Mounted", "Floor Supported")
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenBulkDialog}
            className="gap-2"
            disabled={!selectedGroupId}
          >
            <ListPlus className="w-4 h-4" />
            Bulk Add
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="gap-2"
            disabled={!selectedGroupId}
          >
            <Plus className="w-4 h-4" />
            Add Value
          </Button>
        </div>
      </div>

      {/* Group Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Option Group
          </label>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option group" />
            </SelectTrigger>
            <SelectContent>
              {optionGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedGroup && (
          <div className="flex items-end">
            <div className="text-sm text-gray-500 dark:text-gray-400 pb-2">
              <span className="font-medium">Type:</span> {getFieldTypeInfo(selectedGroup)}
              {selectedGroup.description && (
                <span className="ml-4">
                  <span className="font-medium">Description:</span> {selectedGroup.description}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search */}
      {selectedGroupId && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {!selectedGroupId ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {optionGroups.length === 0
              ? 'No option groups available. Create an option group first.'
              : 'Select an option group to view its values'}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredValues.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'No values match your search'
              : `No values for ${selectedGroup?.name || 'this group'}`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Order</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredValues.map((item) => (
                <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2 text-gray-400">
                      <GripVertical className="w-4 h-4" />
                      <span>{item.sort_order}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{item.value}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleToggleActive(item)}
                      className="flex items-center gap-1.5"
                    >
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          <X className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(item)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingValue ? 'Edit Option Value' : 'Create Option Value'}
            </DialogTitle>
            <DialogDescription>
              {editingValue
                ? 'Update the option value details.'
                : `Add a new value to ${selectedGroup?.name || 'the option group'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Value *</label>
              <Input
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder="e.g., Ceiling Mounted"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                  Active
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingValue ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option Value</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.value}"? This may affect
              model configurations using this value.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Add Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Add Values</DialogTitle>
            <DialogDescription>
              Add multiple values at once to {selectedGroup?.name || 'the option group'}.
              Enter one value per line.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Values (one per line) *</label>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Silver Fan\nDover Gray\nRectory\nSkylight\n...`}
                rows={12}
                className="font-mono text-sm"
              />
              {bulkPreview.total > 0 && (
                <p className="text-xs text-gray-500">
                  {bulkPreview.unique} unique value{bulkPreview.unique !== 1 ? 's' : ''}
                  {bulkPreview.duplicates > 0 && (
                    <span className="text-amber-600">
                      {' '}({bulkPreview.duplicates} duplicate{bulkPreview.duplicates !== 1 ? 's' : ''} will be skipped)
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAdd} disabled={bulkSaving || bulkPreview.unique === 0}>
              {bulkSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add {bulkPreview.unique} Value{bulkPreview.unique !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
