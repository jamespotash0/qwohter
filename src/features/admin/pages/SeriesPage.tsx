/**
 * Series Admin Page
 * CRUD interface for product series under product lines
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
  type ProductSeries,
  type ProductLine,
  type ProductManufacturer,
} from '../services/productAdminService';

export function SeriesPage() {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<ProductManufacturer[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [series, setSeries] = useState<ProductSeries[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [selectedProductLineId, setSelectedProductLineId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<ProductSeries | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductSeries | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load manufacturers on mount
  useEffect(() => {
    loadManufacturers();
  }, []);

  // Load product lines when manufacturer changes
  useEffect(() => {
    if (selectedManufacturerId) {
      loadProductLines(selectedManufacturerId);
      setSelectedProductLineId('');
      setSeries([]);
    } else {
      setProductLines([]);
      setSeries([]);
    }
  }, [selectedManufacturerId]);

  // Load series when product line changes
  useEffect(() => {
    if (selectedProductLineId) {
      loadSeries(selectedProductLineId);
    } else {
      setSeries([]);
    }
  }, [selectedProductLineId]);

  const loadManufacturers = async () => {
    try {
      const data = await productAdminService.getManufacturers();
      setManufacturers(data);
      if (data.length > 0) {
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
    try {
      const data = await productAdminService.getProductLines(manufacturerId);
      setProductLines(data);
      if (data.length > 0) {
        setSelectedProductLineId(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product lines',
        variant: 'destructive',
      });
    }
  };

  const loadSeries = async (productLineId: string) => {
    setLoading(true);
    try {
      const data = await productAdminService.getSeries(productLineId);
      setSeries(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load series',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: ProductSeries) => {
    if (item) {
      setEditingSeries(item);
      setFormData({ name: item.name });
    } else {
      setEditingSeries(null);
      setFormData({ name: '' });
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

    if (!selectedProductLineId && !editingSeries) {
      toast({
        title: 'Validation Error',
        description: 'Please select a product line first',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingSeries) {
        await productAdminService.updateSeries(editingSeries.id, {
          name: formData.name.trim(),
        });
        toast({ title: 'Series updated' });
      } else {
        await productAdminService.createSeries({
          product_line_id: selectedProductLineId,
          name: formData.name.trim(),
        });
        toast({ title: 'Series created' });
      }
      setIsDialogOpen(false);
      loadSeries(selectedProductLineId);
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
      await productAdminService.deleteSeries(deleteTarget.id);
      toast({ title: 'Series deleted' });
      setDeleteTarget(null);
      loadSeries(selectedProductLineId);
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
  const selectedProductLine = productLines.find((pl) => pl.id === selectedProductLineId);

  const filteredSeries = series.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Series
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Series within product lines
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="gap-2"
          disabled={!selectedProductLineId}
        >
          <Plus className="w-4 h-4" />
          Add Series
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Manufacturer
          </label>
          <Select value={selectedManufacturerId} onValueChange={setSelectedManufacturerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select manufacturer" />
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
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Product Line
          </label>
          <Select
            value={selectedProductLineId}
            onValueChange={setSelectedProductLineId}
            disabled={!selectedManufacturerId || productLines.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={productLines.length === 0 ? 'No product lines' : 'Select product line'} />
            </SelectTrigger>
            <SelectContent>
              {productLines.map((pl) => (
                <SelectItem key={pl.id} value={pl.id}>
                  {pl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      {selectedProductLineId && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {!selectedProductLineId ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {productLines.length === 0 && selectedManufacturerId
              ? `No product lines for ${selectedManufacturer?.name}. Create a product line first.`
              : 'Select a manufacturer and product line to view series'}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'No series match your search'
              : `No series for ${selectedProductLine?.name || 'this product line'}`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeries.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
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
              {editingSeries ? 'Edit Series' : 'Create Series'}
            </DialogTitle>
            <DialogDescription>
              {editingSeries
                ? 'Update the series name.'
                : `Add a new series to ${selectedProductLine?.name || 'the product line'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Encore Series"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSeries ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Series</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also
              delete all associated models.
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
