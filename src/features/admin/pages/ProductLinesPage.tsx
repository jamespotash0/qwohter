/**
 * Product Lines Admin Page
 * CRUD interface for product lines under manufacturers
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import {
  productAdminService,
  type ProductLine,
  type ProductManufacturer,
} from '../services/productAdminService';

export function ProductLinesPage() {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<ProductManufacturer[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<ProductLine | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductLine | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load manufacturers on mount
  useEffect(() => {
    loadManufacturers();
  }, []);

  // Load product lines when manufacturer changes
  useEffect(() => {
    if (selectedManufacturerId) {
      loadProductLines(selectedManufacturerId);
    } else {
      setProductLines([]);
    }
  }, [selectedManufacturerId]);

  const loadManufacturers = async () => {
    try {
      const data = await productAdminService.getManufacturers();
      setManufacturers(data);
      // Auto-select first manufacturer if available
      if (data.length > 0 && !selectedManufacturerId) {
        setSelectedManufacturerId(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load manufacturers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProductLines = async (manufacturerId: string) => {
    setLoading(true);
    try {
      const data = await productAdminService.getProductLines(manufacturerId);
      setProductLines(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product lines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (line?: ProductLine) => {
    if (line) {
      setEditingLine(line);
      setFormData({ name: line.name, code: line.code || '' });
    } else {
      setEditingLine(null);
      setFormData({ name: '', code: '' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedManufacturerId && !editingLine) {
      toast({
        title: 'Validation Error',
        description: 'Please select a manufacturer first',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingLine) {
        await productAdminService.updateProductLine(editingLine.id, {
          name: formData.name.trim(),
          code: formData.code.trim() || null,
        });
        toast({ title: 'Product line updated' });
      } else {
        await productAdminService.createProductLine({
          manufacturer_id: selectedManufacturerId,
          name: formData.name.trim(),
          code: formData.code.trim() || null,
        });
        toast({ title: 'Product line created' });
      }
      setIsDialogOpen(false);
      loadProductLines(selectedManufacturerId);
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
      await productAdminService.deleteProductLine(deleteTarget.id);
      toast({ title: 'Product line deleted' });
      setDeleteTarget(null);
      loadProductLines(selectedManufacturerId);
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

  const selectedManufacturer = manufacturers.find((m) => m.id === selectedManufacturerId);

  const filteredLines = productLines.filter(
    (line) =>
      line.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      line.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Lines
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Product lines organized by manufacturer
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="gap-2"
          disabled={!selectedManufacturerId}
        >
          <Plus className="w-4 h-4" />
          Add Product Line
        </Button>
      </div>

      {/* Manufacturer Filter */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
          Select Manufacturer
        </label>
        <Select value={selectedManufacturerId} onValueChange={setSelectedManufacturerId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Select a manufacturer" />
          </SelectTrigger>
          <SelectContent>
            {manufacturers.map((mfr) => (
              <SelectItem key={mfr.id} value={mfr.id}>
                {mfr.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search */}
      {selectedManufacturerId && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search product lines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {!selectedManufacturerId ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            Select a manufacturer to view product lines
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'No product lines match your search'
              : `No product lines for ${selectedManufacturer?.name || 'this manufacturer'}`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">{line.name}</TableCell>
                  <TableCell>
                    {line.code ? (
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        {line.code}
                      </code>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(line.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(line)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(line)}
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
              {editingLine ? 'Edit Product Line' : 'Create Product Line'}
            </DialogTitle>
            <DialogDescription>
              {editingLine
                ? 'Update the product line details.'
                : `Add a new product line to ${selectedManufacturer?.name || 'the manufacturer'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Operable Partitions"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., OP"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingLine ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Line</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also
              delete all associated series and models.
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
