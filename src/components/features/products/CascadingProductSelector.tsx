/**
 * Cascading Product Selector
 * Simple dropdown-based product selection with dynamic configuration fields
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useProductStore, type FieldDefinition } from '@/stores/products/productStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, Loader2 } from 'lucide-react';
import type { ProductSelection } from '@/stores/products/productStore';

interface CascadingProductSelectorProps {
  onProductSelect: (product: ProductSelection) => void;
  onCancel?: () => void;
  className?: string;
}

export function CascadingProductSelector({
  onProductSelect,
  onCancel,
  className,
}: CascadingProductSelectorProps) {
  const {
    types,
    manufacturers,
    categories,
    series,
    models,
    selectedType,
    selectedManufacturer,
    selectedCategory,
    selectedSeries,
    selectedModel,
    loading,
    error,
    fetchTypes,
    selectType,
    selectManufacturer,
    selectCategory,
    selectSeries,
    selectModel,
    fetchModelsByCategory,
  } = useProductStore();

  // Configuration values for the selected model
  const [configValues, setConfigValues] = useState<Record<string, any>>({});

  // Load types on mount
  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Initialize config values when model is selected
  useEffect(() => {
    if (selectedModel?.default_configurations) {
      const defaults: Record<string, any> = {};
      Object.entries(selectedModel.default_configurations).forEach(([key, field]) => {
        if (field.default_value !== undefined) {
          defaults[key] = field.default_value;
        }
      });
      setConfigValues(defaults);
    } else {
      setConfigValues({});
    }
  }, [selectedModel]);

  // Check if category has series or should go directly to models
  const categoryHasSeries = selectedCategory?.has_series !== false;

  // Fetch models by category when category doesn't have series
  useEffect(() => {
    if (selectedCategory && !categoryHasSeries) {
      fetchModelsByCategory(selectedCategory.id);
    }
  }, [selectedCategory, categoryHasSeries, fetchModelsByCategory]);

  const getManufacturersForType = () => {
    if (!selectedType) return [];
    return manufacturers.get(selectedType.id) || [];
  };

  const getCategoriesForManufacturer = () => {
    if (!selectedManufacturer) return [];
    return categories.get(selectedManufacturer.id) || [];
  };

  const getSeriesForCategory = () => {
    if (!selectedCategory) return [];
    return series.get(selectedCategory.id) || [];
  };

  const getModelsForSeries = () => {
    if (!selectedSeries) return [];
    return models.get(selectedSeries.id) || [];
  };

  const getModelsForCategory = () => {
    if (!selectedCategory) return [];
    return models.get(`cat_${selectedCategory.id}`) || [];
  };

  // Get models based on whether category has series or not
  const modelsList = categoryHasSeries ? getModelsForSeries() : getModelsForCategory();

  const handleConfigChange = (key: string, value: any) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAddProduct = () => {
    if (!selectedModel) return;

    const selection: ProductSelection = {
      product_model_id: selectedModel.id,
      product_hierarchy: {
        type: selectedType?.name || '',
        type_id: selectedType?.id || '',
        manufacturer: selectedManufacturer?.name || '',
        manufacturer_id: selectedManufacturer?.id || '',
        category: selectedCategory?.name || '',
        category_id: selectedCategory?.id || '',
        series: selectedSeries?.name || '',
        series_id: selectedSeries?.id || '',
        model: selectedModel.name || '',
        model_number: selectedModel.name || '',
      },
      specifications: configValues,
      pricing: {
        unit_price: 0,
        quantity: 1,
        subtotal: 0,
      },
    };
    onProductSelect(selection);
  };

  const manufacturersList = getManufacturersForType();
  const categoriesList = getCategoriesForManufacturer();
  const seriesList = getSeriesForCategory();

  // Render a configuration field based on its definition
  const renderConfigField = (key: string, field: FieldDefinition) => {
    const value = configValues[key];

    switch (field.field_type) {
      case 'dropdown':
        return (
          <Select
            value={value?.toString() || ''}
            onValueChange={(v) => handleConfigChange(key, v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || `Select ${key}...`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt, idx) => (
                <SelectItem key={idx} value={String(opt)}>
                  {String(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi-select':
        return (
          <Select
            value={Array.isArray(value) ? value[0]?.toString() : value?.toString() || ''}
            onValueChange={(v) => handleConfigChange(key, [v])}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || `Select ${key}...`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt, idx) => (
                <SelectItem key={idx} value={String(opt)}>
                  {String(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => handleConfigChange(key, checked)}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {field.placeholder || key}
            </span>
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            placeholder={field.placeholder}
            className="min-h-[80px]"
          />
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {(field.options || []).map((opt, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={key}
                  checked={value === opt}
                  onChange={() => handleConfigChange(key, opt)}
                  className="text-emerald-600"
                />
                <span className="text-sm">{String(opt)}</span>
              </label>
            ))}
          </div>
        );

      case 'input':
      default:
        return (
          <Input
            type={field.input_type || 'text'}
            value={value || ''}
            onChange={(e) => handleConfigChange(key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // Check if a field's dependencies are satisfied
  const isDependencySatisfied = useCallback((field: FieldDefinition): boolean => {
    if (!field.depends_on || field.depends_on.length === 0) {
      return true; // No dependencies, always show
    }

    // All dependencies must be satisfied
    return field.depends_on.every((dep) => {
      const currentValue = configValues[dep.field_id];
      // Check if the current value matches the required dependency value
      if (Array.isArray(dep.value)) {
        return dep.value.includes(currentValue);
      }
      return currentValue === dep.value;
    });
  }, [configValues]);

  // Sort and group configuration fields based on DB display metadata
  const { primaryFields, secondaryFields, advancedFields } = useMemo(() => {
    if (!selectedModel?.default_configurations) {
      return { primaryFields: [], secondaryFields: [], advancedFields: [] };
    }

    const entries = Object.entries(selectedModel.default_configurations);

    // Sort by display_order (lower first), then alphabetically for unordered fields
    const sorted = [...entries].sort(([keyA, fieldA], [keyB, fieldB]) => {
      const orderA = fieldA.display_order ?? 999;
      const orderB = fieldB.display_order ?? 999;

      if (orderA !== orderB) return orderA - orderB;
      return keyA.localeCompare(keyB);
    });

    // Filter out fields whose dependencies aren't satisfied
    const filtered = sorted.filter(([_, field]) => isDependencySatisfied(field));

    // Group by display_group from DB metadata
    const primary = filtered.filter(([_, field]) => field.display_group === 'primary');
    const secondary = filtered.filter(([_, field]) =>
      field.display_group === 'secondary' || !field.display_group
    );
    const advanced = filtered.filter(([_, field]) => field.display_group === 'advanced');

    return { primaryFields: primary, secondaryFields: secondary, advancedFields: advanced };
  }, [selectedModel?.default_configurations, isDependencySatisfied]);

  // Helper to get grid column class from grid_span
  const getGridColClass = (gridSpan?: number): string => {
    switch (gridSpan) {
      case 1: return 'col-span-1';
      case 2: return 'col-span-2';
      case 3: return 'col-span-3';
      case 4: return 'col-span-4';
      default: return 'col-span-1';
    }
  };

  return (
    <div className={className}>
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Dropdown Selects */}
      <div className="grid grid-cols-2 gap-4">
        {/* Product Type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Product Type
          </label>
          <Select
            value={selectedType?.id || ''}
            onValueChange={(id) => {
              const type = types.find((t) => t.id === id);
              selectType(type || null);
            }}
            disabled={loading.types}
          >
            <SelectTrigger className="w-full">
              {loading.types ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select type..." />
              )}
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Manufacturer */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Manufacturer
          </label>
          <Select
            value={selectedManufacturer?.id || ''}
            onValueChange={(id) => {
              const mfr = manufacturersList.find((m) => m.id === id);
              selectManufacturer(mfr || null);
            }}
            disabled={!selectedType || loading.manufacturers}
          >
            <SelectTrigger className="w-full">
              {loading.manufacturers ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={selectedType ? "Select manufacturer..." : "Select type first"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {manufacturersList.map((mfr) => (
                <SelectItem key={mfr.id} value={mfr.id}>
                  {mfr.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Category
          </label>
          <Select
            value={selectedCategory?.id || ''}
            onValueChange={(id) => {
              const cat = categoriesList.find((c) => c.id === id);
              selectCategory(cat || null);
            }}
            disabled={!selectedManufacturer || loading.categories}
          >
            <SelectTrigger className="w-full">
              {loading.categories ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={selectedManufacturer ? "Select category..." : "Select manufacturer first"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {categoriesList.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Series - Only show if category has series */}
        {categoryHasSeries && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Series
            </label>
            <Select
              value={selectedSeries?.id || ''}
              onValueChange={(id) => {
                const ser = seriesList.find((s) => s.id === id);
                selectSeries(ser || null);
              }}
              disabled={!selectedCategory || loading.series}
            >
              <SelectTrigger className="w-full">
                {loading.series ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <SelectValue placeholder={selectedCategory ? "Select series..." : "Select category first"} />
                )}
              </SelectTrigger>
              <SelectContent>
                {seriesList.map((ser) => (
                  <SelectItem key={ser.id} value={ser.id}>
                    {ser.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Model */}
        <div className={`space-y-1.5 ${!categoryHasSeries ? '' : ''}`}>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Model
          </label>
          <Select
            value={selectedModel?.id || ''}
            onValueChange={(id) => {
              const model = modelsList.find((m) => m.id === id);
              selectModel(model || null);
            }}
            disabled={categoryHasSeries ? !selectedSeries : !selectedCategory || loading.models}
          >
            <SelectTrigger className="w-full">
              {loading.models ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue
                  placeholder={
                    categoryHasSeries
                      ? (selectedSeries ? "Select model..." : "Select series first")
                      : (selectedCategory ? "Select model..." : "Select category first")
                  }
                />
              )}
            </SelectTrigger>
            <SelectContent>
              {modelsList.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Configuration Fields - Show when model is selected */}
      {selectedModel && (primaryFields.length > 0 || secondaryFields.length > 0 || advancedFields.length > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Configuration Options
          </h4>

          {/* Primary Fields - 4-column grid with dynamic span */}
          {primaryFields.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {primaryFields.map(([key, field]) => (
                <div key={key} className={`space-y-1.5 ${getGridColClass(field.grid_span)}`}>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {key}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderConfigField(key, field)}
                </div>
              ))}
            </div>
          )}

          {/* Secondary Fields - 4-column grid with dynamic span (default 2) */}
          {secondaryFields.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {secondaryFields.map(([key, field]) => (
                <div key={key} className={`space-y-1.5 ${getGridColClass(field.grid_span ?? 2)}`}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {key}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderConfigField(key, field)}
                </div>
              ))}
            </div>
          )}

          {/* Advanced Fields - Collapsible section (optional) */}
          {advancedFields.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                Advanced Options
              </h5>
              <div className="grid grid-cols-4 gap-4">
                {advancedFields.map(([key, field]) => (
                  <div key={key} className={`space-y-1.5 ${getGridColClass(field.grid_span ?? 2)}`}>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {key}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderConfigField(key, field)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleAddProduct}
          disabled={!selectedModel}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Check className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>
    </div>
  );
}
