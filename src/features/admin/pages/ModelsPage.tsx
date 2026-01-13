/**
 * Models Admin Page
 * CRUD interface for product models under series
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
  type ProductModel,
  type ProductSeries,
  type ProductLine,
  type ProductManufacturer,
} from '../services/productAdminService';

export function ModelsPage() {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<ProductManufacturer[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [series, setSeries] = useState<ProductSeries[]>([]);
  const [models, setModels] = useState<ProductModel[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [selectedProductLineId, setSelectedProductLineId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ProductModel | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductModel | null>(null);
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
      setSelectedSeriesId('');
      setSeries([]);
      setModels([]);
    } else {
      setProductLines([]);
      setSeries([]);
      setModels([]);
    }
  }, [selectedManufacturerId]);

  // Load series when product line changes
  useEffect(() => {
    if (selectedProductLineId) {
      loadSeries(selectedProductLineId);
      setSelectedSeriesId('');
      setModels([]);
    } else {
      setSeries([]);
      setModels([]);
    }
  }, [selectedProductLineId]);

  // Load models when series changes (or when "no series" is selected)
  useEffect(() => {
    if (selectedSeriesId === 'no-series') {
      // Load models directly under manufacturer (no series)
      loadModelsWithoutSeries(selectedManufacturerId);
    } else if (selectedSeriesId) {
      loadModels(selectedSeriesId);
    } else {
      setModels([]);
    }
  }, [selectedSeriesId, selectedManufacturerId]);

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
    try {
      const data = await productAdminService.getSeries(productLineId);
      setSeries(data);
      if (data.length > 0) {
        setSelectedSeriesId(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load series',
        variant: 'destructive',
      });
    }
  };

  const loadModels = async (seriesId: string) => {
    setLoading(true);
    try {
      const data = await productAdminService.getModels(seriesId);
      setModels(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load models',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadModelsWithoutSeries = async (manufacturerId: string) => {
    setLoading(true);
    try {
      const data = await productAdminService.getModelsWithoutSeries(manufacturerId);
      setModels(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load models',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: ProductModel) => {
    if (item) {
      setEditingModel(item);
      setFormData({ name: item.name });
    } else {
      setEditingModel(null);
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

    if (!selectedSeriesId && !editingModel) {
      toast({
        title: 'Validation Error',
        description: 'Please select a series (or "No Series") first',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingModel) {
        await productAdminService.updateModel(editingModel.id, {
          name: formData.name.trim(),
        });
        toast({ title: 'Model updated' });
      } else {
        const isNoSeries = selectedSeriesId === 'no-series';
        await productAdminService.createModel({
          product_series_id: isNoSeries ? null : selectedSeriesId,
          product_manufacturer_id: selectedManufacturerId,
          name: formData.name.trim(),
        });
        toast({ title: 'Model created' });
      }
      setIsDialogOpen(false);
      if (selectedSeriesId === 'no-series') {
        loadModelsWithoutSeries(selectedManufacturerId);
      } else {
        loadModels(selectedSeriesId);
      }
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
      await productAdminService.deleteModel(deleteTarget.id);
      toast({ title: 'Model deleted' });
      setDeleteTarget(null);
      if (selectedSeriesId === 'no-series') {
        loadModelsWithoutSeries(selectedManufacturerId);
      } else {
        loadModels(selectedSeriesId);
      }
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
  const selectedSeries = series.find((s) => s.id === selectedSeriesId);

  const filteredModels = models.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Models
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Models within product series
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="gap-2"
          disabled={!selectedSeriesId}
        >
          <Plus className="w-4 h-4" />
          Add Model
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Series
          </label>
          <Select
            value={selectedSeriesId}
            onValueChange={setSelectedSeriesId}
            disabled={!selectedManufacturerId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-series" className="text-blue-600 font-medium">
                ⊕ No Series (Direct Models)
              </SelectItem>
              {series.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      {selectedSeriesId && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {!selectedSeriesId ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {series.length === 0 && selectedProductLineId
              ? `No series for ${selectedProductLine?.name}. Create a series first.`
              : productLines.length === 0 && selectedManufacturerId
              ? `No product lines for ${selectedManufacturer?.name}. Create a product line first.`
              : 'Select a manufacturer, product line, and series to view models'}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'No models match your search'
              : `No models for ${selectedSeries?.name || 'this series'}`}
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
              {filteredModels.map((item) => (
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
              {editingModel ? 'Edit Model' : 'Create Model'}
            </DialogTitle>
            <DialogDescription>
              {editingModel
                ? 'Update the model name.'
                : `Add a new model to ${selectedSeries?.name || 'the series'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., OPUS MK110"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingModel ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This will also
              delete all associated variants.
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
