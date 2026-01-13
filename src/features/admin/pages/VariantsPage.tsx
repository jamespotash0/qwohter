/**
 * Variants Admin Page
 * CRUD interface for product variants under models
 */

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  type ProductVariant,
  type ProductModel,
  type ProductSeries,
  type ProductLine,
  type ProductManufacturer,
} from '../services/productAdminService';

interface VariantFormData {
  name: string;
  description: string;
  is_default: boolean;
  sort_order: number;
}

export function VariantsPage() {
  const { toast } = useToast();
  const [manufacturers, setManufacturers] = useState<ProductManufacturer[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [series, setSeries] = useState<ProductSeries[]>([]);
  const [models, setModels] = useState<ProductModel[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [selectedProductLineId, setSelectedProductLineId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState<VariantFormData>({
    name: '',
    description: '',
    is_default: false,
    sort_order: 0,
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);
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
      setSelectedModelId('');
      setSeries([]);
      setModels([]);
      setVariants([]);
    } else {
      setProductLines([]);
      setSeries([]);
      setModels([]);
      setVariants([]);
    }
  }, [selectedManufacturerId]);

  // Load series when product line changes
  useEffect(() => {
    if (selectedProductLineId) {
      loadSeries(selectedProductLineId);
      setSelectedSeriesId('');
      setSelectedModelId('');
      setModels([]);
      setVariants([]);
    } else {
      setSeries([]);
      setModels([]);
      setVariants([]);
    }
  }, [selectedProductLineId]);

  // Load models when series changes
  useEffect(() => {
    if (selectedSeriesId) {
      loadModels(selectedSeriesId);
      setSelectedModelId('');
      setVariants([]);
    } else {
      setModels([]);
      setVariants([]);
    }
  }, [selectedSeriesId]);

  // Load variants when model changes
  useEffect(() => {
    if (selectedModelId) {
      loadVariants(selectedModelId);
    } else {
      setVariants([]);
    }
  }, [selectedModelId]);

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
    try {
      const data = await productAdminService.getModels(seriesId);
      setModels(data);
      if (data.length > 0) {
        setSelectedModelId(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load models',
        variant: 'destructive',
      });
    }
  };

  const loadVariants = async (modelId: string) => {
    setLoading(true);
    try {
      const data = await productAdminService.getVariants(modelId);
      setVariants(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load variants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: ProductVariant) => {
    if (item) {
      setEditingVariant(item);
      setFormData({
        name: item.name,
        description: item.description || '',
        is_default: item.is_default,
        sort_order: item.sort_order,
      });
    } else {
      setEditingVariant(null);
      setFormData({
        name: '',
        description: '',
        is_default: false,
        sort_order: variants.length,
      });
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

    if (!selectedModelId && !editingVariant) {
      toast({
        title: 'Validation Error',
        description: 'Please select a model first',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      if (editingVariant) {
        await productAdminService.updateVariant(editingVariant.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_default: formData.is_default,
          sort_order: formData.sort_order,
        });
        toast({ title: 'Variant updated' });
      } else {
        await productAdminService.createVariant({
          model_id: selectedModelId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          is_default: formData.is_default,
          sort_order: formData.sort_order,
        });
        toast({ title: 'Variant created' });
      }
      setIsDialogOpen(false);
      loadVariants(selectedModelId);
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
      await productAdminService.deleteVariant(deleteTarget.id);
      toast({ title: 'Variant deleted' });
      setDeleteTarget(null);
      loadVariants(selectedModelId);
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
  const selectedModel = models.find((m) => m.id === selectedModelId);

  const filteredVariants = variants.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEmptyStateMessage = () => {
    if (models.length === 0 && selectedSeriesId) {
      return `No models for ${selectedSeries?.name}. Create a model first.`;
    }
    if (series.length === 0 && selectedProductLineId) {
      return `No series for ${selectedProductLine?.name}. Create a series first.`;
    }
    if (productLines.length === 0 && selectedManufacturerId) {
      return `No product lines for ${selectedManufacturer?.name}. Create a product line first.`;
    }
    return 'Select a manufacturer, product line, series, and model to view variants';
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Product Variants
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Variants within product models
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="gap-2"
          disabled={!selectedModelId}
        >
          <Plus className="w-4 h-4" />
          Add Variant
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
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
              <SelectValue placeholder={productLines.length === 0 ? 'No product lines' : 'Select'} />
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
            disabled={!selectedProductLineId || series.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={series.length === 0 ? 'No series' : 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {series.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Model
          </label>
          <Select
            value={selectedModelId}
            onValueChange={setSelectedModelId}
            disabled={!selectedSeriesId || models.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={models.length === 0 ? 'No models' : 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search */}
      {selectedModelId && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search variants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {!selectedModelId ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {getEmptyStateMessage()}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredVariants.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery
              ? 'No variants match your search'
              : `No variants for ${selectedModel?.name || 'this model'}`}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-20">Default</TableHead>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVariants.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-gray-500 max-w-xs truncate">
                    {item.description || '—'}
                  </TableCell>
                  <TableCell>
                    {item.is_default && (
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">{item.sort_order}</TableCell>
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
              {editingVariant ? 'Edit Variant' : 'Create Variant'}
            </DialogTitle>
            <DialogDescription>
              {editingVariant
                ? 'Update the variant details.'
                : `Add a new variant to ${selectedModel?.name || 'the model'}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard, Premium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort Order</label>
                <Input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_default: checked === true })
                  }
                />
                <label htmlFor="is_default" className="text-sm font-medium cursor-pointer">
                  Default variant
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
              {editingVariant ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Variant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
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
