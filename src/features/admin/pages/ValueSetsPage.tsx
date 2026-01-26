/**
 * Value Sets Admin Page (v2)
 * CRUD interface for config_value_sets - the new shared value library system
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Settings } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { configValueSetsService } from '../services/configValueSetsService';
import { ValuesEditor } from '../components/ValuesEditor';
import type { ConfigValueSet, ValueSetListItem } from '@/lib/types/configValueSet';
import { VALUE_SET_CATEGORIES } from '@/lib/types/configValueSet';

export function ValueSetsPage() {
  const { toast } = useToast();
  const [valueSets, setValueSets] = useState<ValueSetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ConfigValueSet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: '' as string,
  });
  const [saving, setSaving] = useState(false);

  // Values editor dialog
  const [editingValuesSet, setEditingValuesSet] = useState<ConfigValueSet | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ValueSetListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadValueSets();
  }, [categoryFilter]);

  const loadValueSets = async () => {
    setLoading(true);
    try {
      const filters = categoryFilter !== 'all' ? { category: categoryFilter } : undefined;
      const data = await configValueSetsService.getValueSetsList(filters);
      setValueSets(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load value sets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleOpenDialog = async (setItem?: ValueSetListItem) => {
    if (setItem) {
      // Fetch full data for editing
      const fullSet = await configValueSetsService.getValueSet(setItem.id);
      if (fullSet) {
        setEditingSet(fullSet);
        setFormData({
          name: fullSet.name,
          slug: fullSet.slug,
          category: fullSet.category || '',
        });
      }
    } else {
      setEditingSet(null);
      setFormData({
        name: '',
        slug: '',
        category: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleEditValues = async (setItem: ValueSetListItem) => {
    const fullSet = await configValueSetsService.getValueSet(setItem.id);
    setEditingValuesSet(fullSet);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingSet ? prev.slug : generateSlug(name),
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and slug are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingSet) {
        await configValueSetsService.updateValueSet(editingSet.id, {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          category: formData.category || null,
        });
        toast({ title: 'Value set updated' });
      } else {
        await configValueSetsService.createValueSet({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          category: formData.category || undefined,
          values: [],
        });
        toast({ title: 'Value set created' });
      }
      setIsDialogOpen(false);
      loadValueSets();
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

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await configValueSetsService.deleteValueSet(deleteTarget.id);
      toast({ title: 'Value set deleted' });
      setDeleteTarget(null);
      loadValueSets();
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

  const filteredSets = valueSets.filter(
    (set) =>
      set.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      set.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Value Sets (v2)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shared value libraries referenced by config_schema (e.g., finish_color)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Value Set
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search value sets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {VALUE_SET_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No value sets match your search' : 'No value sets yet.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Values</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSets.map((set) => (
                <TableRow key={set.id}>
                  <TableCell className="font-medium">{set.name}</TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {set.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    {set.category ? (
                      <Badge variant="secondary">{set.category}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{set.value_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditValues(set)}
                        title="Edit values"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(set)}
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(set)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingSet ? 'Edit Value Set' : 'Create Value Set'}
            </DialogTitle>
            <DialogDescription>
              Value sets store shared option values that can be referenced by config_schema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Finish Colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., finish_color"
              />
              <p className="text-xs text-gray-500">
                Used in config_schema values_ref (must be unique)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={formData.category || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value === 'none' ? '' : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {VALUE_SET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSet ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Values Editor Dialog */}
      {editingValuesSet && (
        <ValuesEditor
          valueSet={editingValuesSet}
          open={!!editingValuesSet}
          onOpenChange={(open) => !open && setEditingValuesSet(null)}
          onUpdate={loadValueSets}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Value Set</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will remove
              all {deleteTarget?.value_count || 0} values and any config_schema references
              will break.
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
    </div>
  );
}
