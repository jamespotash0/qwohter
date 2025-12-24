/**
 * Model Allowed Values Admin Page
 * Configure which option values are allowed for each model option
 */

import { useState, useEffect } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  type OptionValue,
} from '../services/optionAdminService';
import { CategoryValueGroup } from '../components/CategoryValueGroup';

interface ModelOptionWithValues extends ModelOption {
  availableValues: OptionValue[];
  allowedValueIds: Set<string>;
  defaultValueId: string | null;
}

export function ModelAllowedValuesPage() {
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
  const [modelOptionsWithValues, setModelOptionsWithValues] = useState<ModelOptionWithValues[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOptionId, setSavingOptionId] = useState<string | null>(null);

  // Load manufacturers on mount
  useEffect(() => {
    loadManufacturers();
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
      loadModelOptionsWithValues(selectedModelId);
    } else {
      setModelOptionsWithValues([]);
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

  const loadModelOptionsWithValues = async (modelId: string) => {
    setLoading(true);
    try {
      // Get model options
      const options = await optionAdminService.getModelOptions(modelId);

      // For each option, load available values and allowed values
      const optionsWithValues: ModelOptionWithValues[] = await Promise.all(
        options
          .filter((opt) => {
            const fieldType = opt.option_group?.field_type;
            return fieldType === 'dropdown' || fieldType === 'multi-select' || fieldType === 'auto';
          })
          .map(async (option) => {
            const [availableValues, allowedValues] = await Promise.all([
              optionAdminService.getOptionValues(option.option_group_id),
              optionAdminService.getModelAllowedValues(option.id),
            ]);

            const allowedValueIds = new Set(allowedValues.map((av) => av.option_value_id));
            const defaultValue = allowedValues.find((av) => av.is_default);

            return {
              ...option,
              availableValues,
              allowedValueIds,
              defaultValueId: defaultValue?.option_value_id || null,
            };
          })
      );

      setModelOptionsWithValues(optionsWithValues);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load model options', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleValue = (optionIndex: number, valueId: string) => {
    setModelOptionsWithValues((prev) => {
      const updated = [...prev];
      const option = { ...updated[optionIndex] };
      const newAllowedIds = new Set(option.allowedValueIds);

      if (newAllowedIds.has(valueId)) {
        newAllowedIds.delete(valueId);
        // Clear default if removing it
        if (option.defaultValueId === valueId) {
          option.defaultValueId = null;
        }
      } else {
        newAllowedIds.add(valueId);
      }

      option.allowedValueIds = newAllowedIds;
      updated[optionIndex] = option;
      return updated;
    });
  };

  const handleSetDefault = (optionIndex: number, valueId: string) => {
    setModelOptionsWithValues((prev) => {
      const updated = [...prev];
      const option = { ...updated[optionIndex] };

      if (option.allowedValueIds.has(valueId)) {
        option.defaultValueId = option.defaultValueId === valueId ? null : valueId;
        updated[optionIndex] = option;
      }

      return updated;
    });
  };

  const handleSelectAll = (optionIndex: number) => {
    setModelOptionsWithValues((prev) => {
      const updated = [...prev];
      const option = { ...updated[optionIndex] };
      option.allowedValueIds = new Set(option.availableValues.map((v) => v.id));
      updated[optionIndex] = option;
      return updated;
    });
  };

  const handleClearAll = (optionIndex: number) => {
    setModelOptionsWithValues((prev) => {
      const updated = [...prev];
      const option = { ...updated[optionIndex] };
      option.allowedValueIds = new Set();
      option.defaultValueId = null;
      updated[optionIndex] = option;
      return updated;
    });
  };

  const handleSave = async (optionIndex: number) => {
    const option = modelOptionsWithValues[optionIndex];
    setSavingOptionId(option.id);

    try {
      await optionAdminService.setModelAllowedValues(
        option.id,
        Array.from(option.allowedValueIds),
        option.defaultValueId || undefined
      );
      toast({ title: 'Saved', description: `Allowed values updated for ${option.option_group?.name}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save allowed values', variant: 'destructive' });
    } finally {
      setSavingOptionId(null);
    }
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Model Allowed Values</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Configure which option values are allowed for each model's dropdown options
        </p>
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

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {!selectedModelId ? (
          <div className="text-center py-12 text-gray-500">
            Select a model to configure its allowed values
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : modelOptionsWithValues.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No dropdown/multi-select options configured for {selectedModel?.name}.
            <br />
            <span className="text-sm">Add options in the Model Options page first.</span>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {modelOptionsWithValues.map((option, index) => (
              <AccordionItem key={option.id} value={option.id}>
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <span className="font-medium">{option.option_group?.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {option.option_group?.field_type}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {option.allowedValueIds.size} / {option.availableValues.length} selected
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {/* Bulk Actions */}
                  <div className="flex gap-2 mb-3">
                    <Button variant="outline" size="sm" onClick={() => handleSelectAll(index)}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleClearAll(index)}>
                      Clear All
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      onClick={() => handleSave(index)}
                      disabled={savingOptionId === option.id}
                    >
                      {savingOptionId === option.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>

                  {/* Values grouped by category */}
                  {(() => {
                    // Group values by category
                    const grouped = option.availableValues.reduce((acc, value) => {
                      const cat = value.category || 'Uncategorized';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(value);
                      return acc;
                    }, {} as Record<string, typeof option.availableValues>);

                    const categories = Object.keys(grouped).sort();
                    const hasCategories = categories.length > 1 || categories[0] !== 'Uncategorized';

                    if (!hasCategories) {
                      // No categories, show flat list
                      return (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Allow</TableHead>
                                <TableHead>Value</TableHead>
                                <TableHead className="w-24">Default</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {option.availableValues.map((value) => (
                                <TableRow key={value.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={option.allowedValueIds.has(value.id)}
                                      onCheckedChange={() => handleToggleValue(index, value.id)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <span className={!value.is_active ? 'text-gray-400 line-through' : ''}>
                                      {value.value}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Checkbox
                                      checked={option.defaultValueId === value.id}
                                      onCheckedChange={() => handleSetDefault(index, value.id)}
                                      disabled={!option.allowedValueIds.has(value.id)}
                                    />
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    }

                    // Show grouped by category
                    return (
                      <div className="space-y-4">
                        {categories.map((category) => (
                          <CategoryValueGroup
                            key={category}
                            category={category}
                            values={grouped[category]}
                            allowedValueIds={option.allowedValueIds}
                            defaultValueId={option.defaultValueId}
                            onToggleValue={(valueId) => handleToggleValue(index, valueId)}
                            onSetDefault={(valueId) => handleSetDefault(index, valueId)}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
}
