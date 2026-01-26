/**
 * Model Options Admin Page
 * Configure which option groups apply to each model and their settings
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Settings2, GripVertical, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  productAdminService,
  type ProductModel,
  type ProductSeries,
  type ProductLine,
  type ProductManufacturer,
} from '../services/productAdminService';
import {
  optionAdminService,
  type ModelOption,
  type OptionGroup,
} from '../services/optionAdminService';
import { AllowedValuesDialog } from '../components/AllowedValuesDialog';
import { ModelOptionFormDialog } from '../components/ModelOptionFormDialog';

export function ModelOptionsPage() {
  const { toast } = useToast();

  // Cascading filters
  const [manufacturers, setManufacturers] = useState<ProductManufacturer[]>([]);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [series, setSeries] = useState<ProductSeries[]>([]);
  const [models, setModels] = useState<ProductModel[]>([]);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('');
  const [selectedProductLineId, setSelectedProductLineId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // Data
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ModelOption | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ModelOption | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Allowed values dialog state
  const [allowedValuesDialogOpen, setAllowedValuesDialogOpen] = useState(false);
  const [selectedModelOption, setSelectedModelOption] = useState<ModelOption | null>(null);

  // Load initial data
  useEffect(() => {
    loadManufacturers();
    loadOptionGroups();
  }, []);

  // Cascading loads
  useEffect(() => {
    if (selectedManufacturerId) {
      loadProductLines(selectedManufacturerId);
      setSelectedProductLineId('');
      setSelectedSeriesId('');
      setSelectedModelId('');
    }
  }, [selectedManufacturerId]);

  useEffect(() => {
    if (selectedProductLineId) {
      loadSeries(selectedProductLineId);
      setSelectedSeriesId('');
      setSelectedModelId('');
    }
  }, [selectedProductLineId]);

  useEffect(() => {
    if (selectedSeriesId) {
      loadModels(selectedSeriesId);
      setSelectedModelId('');
    }
  }, [selectedSeriesId]);

  useEffect(() => {
    if (selectedModelId) {
      loadModelOptions(selectedModelId);
    } else {
      setModelOptions([]);
    }
  }, [selectedModelId]);

  const loadManufacturers = async () => {
    try {
      const data = await productAdminService.getManufacturers();
      setManufacturers(data);
      if (data.length > 0) setSelectedManufacturerId(data[0].id);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load manufacturers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadProductLines = async (manufacturerId: string) => {
    const data = await productAdminService.getProductLines(manufacturerId);
    setProductLines(data);
    if (data.length > 0) setSelectedProductLineId(data[0].id);
  };

  const loadSeries = async (productLineId: string) => {
    const data = await productAdminService.getSeries(productLineId);
    setSeries(data);
    if (data.length > 0) setSelectedSeriesId(data[0].id);
  };

  const loadModels = async (seriesId: string) => {
    const data = await productAdminService.getModels(seriesId);
    setModels(data);
    if (data.length > 0) setSelectedModelId(data[0].id);
  };

  const loadOptionGroups = async () => {
    try {
      const data = await optionAdminService.getOptionGroups();
      setOptionGroups(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load option groups', variant: 'destructive' });
    }
  };

  const loadModelOptions = async (modelId: string) => {
    setLoading(true);
    try {
      const data = await optionAdminService.getModelOptions(modelId);
      setModelOptions(data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load model options', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item?: ModelOption) => {
    setEditingOption(item || null);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await optionAdminService.deleteModelOption(deleteTarget.id);
      toast({ title: 'Option removed from model' });
      setDeleteTarget(null);
      loadModelOptions(selectedModelId);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  // Open allowed values dialog
  const handleOpenAllowedValuesDialog = (modelOption: ModelOption) => {
    setSelectedModelOption(modelOption);
    setAllowedValuesDialogOpen(true);
  };

  // Get available option groups (not already added to this model)
  const availableGroups = optionGroups.filter(
    (og) => !modelOptions.some((mo) => mo.option_group_id === og.id) ||
            editingOption?.option_group_id === og.id
  );

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Model Options</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure which options are available for each model
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2" disabled={!selectedModelId}>
          <Plus className="w-4 h-4" />
          Add Option
        </Button>
      </div>

      {/* Cascading Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Manufacturer</label>
          <Select value={selectedManufacturerId} onValueChange={setSelectedManufacturerId}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {manufacturers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Product Line</label>
          <Select value={selectedProductLineId} onValueChange={setSelectedProductLineId} disabled={productLines.length === 0}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {productLines.map((pl) => (
                <SelectItem key={pl.id} value={pl.id}>{pl.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Series</label>
          <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={series.length === 0}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {series.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Model</label>
          <Select value={selectedModelId} onValueChange={setSelectedModelId} disabled={models.length === 0}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Options Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {!selectedModelId ? (
          <div className="text-center py-12 text-gray-500">
            Select a model to configure its options
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : modelOptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No options configured for {selectedModel?.name}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Option Group</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Display Group</TableHead>
                <TableHead>Allowed Values</TableHead>
                <TableHead>Settings</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modelOptions
                .sort((a, b) => a.display_order - b.display_order)
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </TableCell>
                    <TableCell className="font-medium">
                      {item.option_group?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.option_group?.field_type || 'dropdown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.display_group === 'primary' ? 'default' : 'secondary'}>
                        {item.display_group}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {['dropdown', 'multi-select', 'auto'].includes(item.option_group?.field_type || '') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => handleOpenAllowedValuesDialog(item)}
                        >
                          <ListChecks className="w-3 h-3" />
                          Configure
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {item.is_required && <Badge variant="outline" className="text-xs">Required</Badge>}
                        {item.is_multi_select && <Badge variant="outline" className="text-xs">Multi</Badge>}
                        {!item.is_visible && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                          <Settings2 className="w-4 h-4" />
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

      {/* Add/Edit Dialog */}
      <ModelOptionFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingOption={editingOption}
        modelId={selectedModelId}
        modelName={selectedModel?.name || ''}
        availableGroups={availableGroups}
        existingOptionsCount={modelOptions.length}
        onSaved={() => loadModelOptions(selectedModelId)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Option</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{deleteTarget?.option_group?.name}" from this model? This won't delete the option group itself.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Allowed Values Dialog */}
      <AllowedValuesDialog
        open={allowedValuesDialogOpen}
        onOpenChange={setAllowedValuesDialogOpen}
        modelOption={selectedModelOption}
        onSaved={() => loadModelOptions(selectedModelId)}
      />
    </div>
  );
}
