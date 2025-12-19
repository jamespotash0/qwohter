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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductSelection } from '@/stores/products/productStore';

interface CascadingProductSelectorProps {
  onProductSelect: (product: ProductSelection) => void;
  onCancel?: () => void;
  className?: string;
  initialValues?: Record<string, unknown>; // For editing existing products
}

export function CascadingProductSelector({
  onProductSelect,
  onCancel,
  className,
  initialValues,
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

  // Track if we've initialized from initial values
  const [initialized, setInitialized] = useState(false);

  // Determine if we're in edit mode (initialValues provided means editing existing product)
  const isEditMode = !!initialValues;

  // Check if category has series or should go directly to models
  // Defined early so it can be used in cascade effects
  const categoryHasSeries = selectedCategory?.has_series !== false;

  // Load types on mount
  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Auto-select hierarchy dropdowns when editing (initialValues provided)
  useEffect(() => {
    if (!initialValues || initialized || types.length === 0) return;

    const initializeHierarchy = async () => {
      // Find and select type by name
      const typeName = initialValues.productType as string;
      if (typeName) {
        const type = types.find(t => t.name === typeName);
        if (type) {
          selectType(type);
        }
      }
      setInitialized(true);
    };

    initializeHierarchy();
  }, [initialValues, initialized, types, selectType]);

  // Continue cascading selection when manufacturer list loads
  useEffect(() => {
    if (!initialValues || !selectedType) return;

    const manufacturerName = initialValues.manufacturer as string;
    if (manufacturerName) {
      const mfrList = manufacturers.get(selectedType.id) || [];
      const mfr = mfrList.find(m => m.name === manufacturerName);
      if (mfr && (!selectedManufacturer || selectedManufacturer.id !== mfr.id)) {
        selectManufacturer(mfr);
      }
    }
  }, [initialValues, selectedType, manufacturers, selectedManufacturer, selectManufacturer]);

  // Continue cascading selection when category list loads
  useEffect(() => {
    if (!initialValues || !selectedManufacturer) return;

    const categoryName = initialValues.productCategory as string;
    if (categoryName) {
      const catList = categories.get(selectedManufacturer.id) || [];
      const cat = catList.find(c => c.name === categoryName);
      if (cat && (!selectedCategory || selectedCategory.id !== cat.id)) {
        selectCategory(cat);
      }
    }
  }, [initialValues, selectedManufacturer, categories, selectedCategory, selectCategory]);

  // Continue cascading selection when series list loads
  useEffect(() => {
    if (!initialValues || !selectedCategory) return;

    const seriesName = initialValues.series as string;
    if (seriesName && categoryHasSeries) {
      const serList = series.get(selectedCategory.id) || [];
      const ser = serList.find(s => s.name === seriesName);
      if (ser && (!selectedSeries || selectedSeries.id !== ser.id)) {
        selectSeries(ser);
      }
    }
  }, [initialValues, selectedCategory, series, selectedSeries, selectSeries, categoryHasSeries]);

  // Continue cascading selection when model list loads
  useEffect(() => {
    if (!initialValues) return;

    const modelName = initialValues.model as string;
    if (modelName) {
      const modelList = categoryHasSeries
        ? (selectedSeries ? models.get(selectedSeries.id) || [] : [])
        : (selectedCategory ? models.get(`cat_${selectedCategory.id}`) || [] : []);

      const model = modelList.find(m => m.name === modelName);
      if (model && (!selectedModel || selectedModel.id !== model.id)) {
        selectModel(model);
      }
    }
  }, [initialValues, selectedSeries, selectedCategory, models, selectedModel, selectModel, categoryHasSeries]);

  // Initialize config values when model is selected or when editing with initialValues
  useEffect(() => {
    if (selectedModel?.default_configurations) {
      const defaults: Record<string, any> = {};
      Object.entries(selectedModel.default_configurations).forEach(([key, field]) => {
        // Use initialValues if provided (editing mode), otherwise use field defaults
        if (initialValues && key in initialValues) {
          defaults[key] = initialValues[key];
        } else if (field.default_value !== undefined) {
          defaults[key] = field.default_value;
        }
      });
      setConfigValues(defaults);
    } else if (initialValues) {
      // If no model selected yet but we have initial values, use them
      setConfigValues({ ...initialValues });
    } else {
      setConfigValues({});
    }
  }, [selectedModel, initialValues]);

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
            disabled={isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
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

      case 'multi-select': {
        const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
        const options = field.options || [];

        const toggleOption = (opt: any) => {
          if (isEditMode) return; // Prevent changes in edit mode
          const optStr = String(opt);
          const newValues = selectedValues.includes(optStr)
            ? selectedValues.filter((v: any) => v !== optStr)
            : [...selectedValues, optStr];
          handleConfigChange(key, newValues);
        };

        // In edit mode, show as a read-only display
        if (isEditMode) {
          return (
            <div
              className={cn(
                'flex h-10 w-full items-center rounded-md border border-input px-3 py-2 text-sm',
                'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
              )}
            >
              <span className="truncate text-left">
                {selectedValues.length > 0
                  ? selectedValues.join(', ')
                  : field.placeholder || `Select ${key}...`}
              </span>
            </div>
          );
        }

        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <span className="truncate text-left">
                  {selectedValues.length > 0
                    ? selectedValues.join(', ')
                    : field.placeholder || `Select ${key}...`}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <div className="max-h-60 overflow-y-auto p-1">
                {options.map((opt, idx) => {
                  const optStr = String(opt);
                  const isSelected = selectedValues.includes(optStr);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleOption(opt)}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        isSelected && 'bg-emerald-50 dark:bg-emerald-900/20'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOption(opt)}
                        className="pointer-events-none"
                      />
                      <span>{optStr}</span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      case 'checkbox':
        return (
          <div className={cn(
            'flex items-center gap-2',
            isEditMode && 'opacity-70 cursor-default'
          )}>
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => !isEditMode && handleConfigChange(key, checked)}
              disabled={isEditMode}
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
            className={cn(
              'min-h-[80px]',
              isEditMode && 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
            )}
            readOnly={isEditMode}
          />
        );

      case 'radio':
        return (
          <div className={cn(
            'space-y-2',
            isEditMode && 'opacity-70'
          )}>
            {(field.options || []).map((opt, idx) => (
              <label key={idx} className={cn(
                'flex items-center gap-2',
                isEditMode ? 'cursor-default' : 'cursor-pointer'
              )}>
                <input
                  type="radio"
                  name={key}
                  checked={value === opt}
                  onChange={() => !isEditMode && handleConfigChange(key, opt)}
                  disabled={isEditMode}
                  className="text-emerald-600"
                />
                <span className="text-sm">{String(opt)}</span>
              </label>
            ))}
          </div>
        );

      case 'input':
      default: {
        const inputType = field.input_type || 'text';
        const isNumeric = inputType === 'number';

        // Quantity field should always be editable
        const isQuantityField = key.toLowerCase() === 'quantity' || key.toLowerCase() === 'qty';

        // In edit mode, make read-only if field is auto-calculated or has a default value
        // Exception: Quantity is always editable
        const isAutoOrDefault = field.manual_select === false || field.default_value !== undefined;
        const shouldBeReadOnly = isEditMode && isAutoOrDefault && !isQuantityField;

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          if (shouldBeReadOnly) return;
          const rawValue = e.target.value;
          // Convert to number if it's a numeric field and has a value
          if (isNumeric && rawValue !== '') {
            handleConfigChange(key, parseFloat(rawValue) || 0);
          } else {
            handleConfigChange(key, rawValue);
          }
        };

        return (
          <Input
            type={inputType}
            value={value ?? ''}
            onChange={handleInputChange}
            placeholder={field.placeholder}
            readOnly={shouldBeReadOnly}
            className={shouldBeReadOnly ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}
          />
        );
      }

      case 'auto':
        // Auto-calculated fields are always read-only
        return (
          <Input
            type="text"
            value={value ?? ''}
            readOnly
            className="bg-gray-100 dark:bg-gray-800 cursor-default opacity-70"
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
            disabled={loading.types || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
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
            disabled={!selectedType || loading.manufacturers || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
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
            disabled={!selectedManufacturer || loading.categories || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
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
              disabled={!selectedCategory || loading.series || isEditMode}
            >
              <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
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
            disabled={(categoryHasSeries ? !selectedSeries : !selectedCategory) || loading.models || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
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
          {initialValues ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </div>
  );
}
