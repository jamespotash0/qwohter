/**
 * Option Groups Admin Page
 * CRUD interface for shared option group definitions
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { optionAdminService, type OptionGroup } from '../services/optionAdminService';

const FIELD_TYPES = [
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'input', label: 'Input Field' },
  { value: 'multi-select', label: 'Multi-Select' },
  { value: 'auto', label: 'Auto-Calculated' },
] as const;

const INPUT_TYPES = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Integer' },
  { value: 'decimal', label: 'Decimal' },
] as const;

export function OptionGroupsPage() {
  const { toast } = useToast();
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    field_type: 'dropdown' as OptionGroup['field_type'],
    input_type: null as OptionGroup['input_type'],
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<OptionGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadOptionGroups();
  }, []);

  const loadOptionGroups = async () => {
    setLoading(true);
    try {
      const data = await optionAdminService.getOptionGroups();
      setOptionGroups(data);
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

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleOpenDialog = (group?: OptionGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        slug: group.slug,
        description: group.description || '',
        field_type: group.field_type,
        input_type: group.input_type,
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        field_type: 'dropdown',
        input_type: null,
      });
    }
    setIsDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: editingGroup ? prev.slug : generateSlug(name),
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
      if (editingGroup) {
        await optionAdminService.updateOptionGroup(editingGroup.id, {
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim() || null,
          field_type: formData.field_type,
          input_type: formData.field_type === 'input' ? formData.input_type : null,
        });
        toast({ title: 'Option group updated' });
      } else {
        await optionAdminService.createOptionGroup({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          description: formData.description.trim() || null,
          field_type: formData.field_type,
          input_type: formData.field_type === 'input' ? formData.input_type : null,
        });
        toast({ title: 'Option group created' });
      }
      setIsDialogOpen(false);
      loadOptionGroups();
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
      await optionAdminService.deleteOptionGroup(deleteTarget.id);
      toast({ title: 'Option group deleted' });
      setDeleteTarget(null);
      loadOptionGroups();
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

  const getFieldTypeLabel = (type: string) => {
    return FIELD_TYPES.find((ft) => ft.value === type)?.label || type;
  };

  const getInputTypeLabel = (type: string | null) => {
    if (!type) return null;
    return INPUT_TYPES.find((it) => it.value === type)?.label || type;
  };

  const filteredGroups = optionGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Option Groups
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Shared option definitions (e.g., Track System, Panel Face, Height)
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Option Group
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search option groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No option groups match your search' : 'No option groups yet.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Field Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {group.slug}
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      {getFieldTypeLabel(group.field_type)}
                      {group.input_type && (
                        <>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-500">{getInputTypeLabel(group.input_type)}</span>
                        </>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-gray-500">
                    {group.description || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(group)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(group)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Option Group' : 'Create Option Group'}
            </DialogTitle>
            <DialogDescription>
              Option groups define the types of options available for product configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Track System"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Slug *</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., track_system"
              />
              <p className="text-xs text-gray-500">
                Unique identifier used in code and database
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Field Type *</label>
              <Select
                value={formData.field_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, field_type: value as OptionGroup['field_type'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.field_type === 'input' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Input Type</label>
                <Select
                  value={formData.input_type || 'string'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, input_type: value as OptionGroup['input_type'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INPUT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this option group..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingGroup ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Option Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also
              delete all associated option values and model configurations.
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
