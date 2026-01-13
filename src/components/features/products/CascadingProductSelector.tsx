/**
 * Cascading Product Selector
 * Simple dropdown-based product selection with dynamic configuration fields
 *
 * Hierarchy: Domain → Manufacturer → Product Line → Series → Model → Variant (optional)
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  useProductStore,
  type FieldDefinition,
  type ModelOption,
  type AllowedValue,
  type ProductSelection,
} from '@/stores/products/productStore';
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
    domains,
    manufacturers,
    productLines,
    series,
    models,
    variants,
    modelOptions,
    selectedDomain,
    selectedManufacturer,
    selectedProductLine,
    selectedSeries,
    selectedModel,
    selectedVariant,
    loading,
    error,
    fetchDomains,
    selectDomain,
    selectManufacturer,
    selectProductLine,
    selectSeries,
    selectModel,
    selectVariant,
  } = useProductStore();

  // Configuration values for the selected model
  const [configValues, setConfigValues] = useState<Record<string, any>>({});

  // Track if we've initialized from initial values
  const [initialized, setInitialized] = useState(false);

  // Determine if we're in edit mode (initialValues provided means editing existing product)
  const isEditMode = !!initialValues;

  // Load domains on mount
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Auto-select domain if there's only one (or first available)
  useEffect(() => {
    if (!initialValues && !selectedDomain && domains.length > 0 && !loading.domains) {
      // Auto-select the first domain
      selectDomain(domains[0]);
    }
  }, [initialValues, selectedDomain, domains, loading.domains, selectDomain]);

  // Auto-select hierarchy dropdowns when editing (initialValues provided)
  // Step 1: Select domain
  useEffect(() => {
    if (!initialValues || initialized || domains.length === 0) return;

    const domainName = initialValues.productDomain as string || initialValues.productType as string;
    if (domainName) {
      const domain = domains.find(d => d.name === domainName);
      if (domain) {
        selectDomain(domain);
      }
    }
    setInitialized(true);
  }, [initialValues, initialized, domains, selectDomain]);

  // Step 2: Select manufacturer when manufacturer list loads
  useEffect(() => {
    if (!initialValues || !selectedDomain) return;

    const manufacturerName = initialValues.manufacturer as string;
    if (manufacturerName) {
      const mfrList = manufacturers.get(selectedDomain.id) || [];
      const mfr = mfrList.find(m => m.name === manufacturerName);
      if (mfr && (!selectedManufacturer || selectedManufacturer.id !== mfr.id)) {
        selectManufacturer(mfr);
      }
    }
  }, [initialValues, selectedDomain, manufacturers, selectedManufacturer, selectManufacturer]);

  // Step 3: Select product line when product line list loads
  useEffect(() => {
    if (!initialValues || !selectedManufacturer) return;

    const productLineName = initialValues.productLine as string || initialValues.productCategory as string;
    if (productLineName) {
      const plList = productLines.get(selectedManufacturer.id) || [];
      const pl = plList.find(p => p.name === productLineName);
      if (pl && (!selectedProductLine || selectedProductLine.id !== pl.id)) {
        selectProductLine(pl);
      }
    }
  }, [initialValues, selectedManufacturer, productLines, selectedProductLine, selectProductLine]);

  // Step 4: Select series when series list loads
  useEffect(() => {
    if (!initialValues || !selectedProductLine) return;

    const seriesName = initialValues.series as string;
    if (seriesName) {
      const serList = series.get(selectedProductLine.id) || [];
      const ser = serList.find(s => s.name === seriesName);
      if (ser && (!selectedSeries || selectedSeries.id !== ser.id)) {
        selectSeries(ser);
      }
    }
  }, [initialValues, selectedProductLine, series, selectedSeries, selectSeries]);

  // Step 5: Select model when model list loads
  useEffect(() => {
    if (!initialValues || !selectedSeries) return;

    const modelName = initialValues.model as string;
    if (modelName) {
      const modelList = models.get(selectedSeries.id) || [];
      const model = modelList.find(m => m.name === modelName);
      if (model && (!selectedModel || selectedModel.id !== model.id)) {
        selectModel(model);
      }
    }
  }, [initialValues, selectedSeries, models, selectedModel, selectModel]);

  // Step 6: Select variant when variant list loads (optional)
  useEffect(() => {
    if (!initialValues || !selectedModel) return;

    const variantName = initialValues.variant as string;
    if (variantName) {
      const variantList = variants.get(selectedModel.id) || [];
      const variant = variantList.find(v => v.name === variantName);
      if (variant && (!selectedVariant || selectedVariant.id !== variant.id)) {
        selectVariant(variant);
      }
    }
  }, [initialValues, selectedModel, variants, selectedVariant, selectVariant]);

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

  // Helper functions to get filtered lists
  const getManufacturersForDomain = () => {
    if (!selectedDomain) return [];
    return manufacturers.get(selectedDomain.id) || [];
  };

  const getProductLinesForManufacturer = () => {
    if (!selectedManufacturer) return [];
    return productLines.get(selectedManufacturer.id) || [];
  };

  const getSeriesForProductLine = () => {
    if (!selectedProductLine) return [];
    return series.get(selectedProductLine.id) || [];
  };

  const getModelsForSeries = () => {
    if (!selectedSeries) return [];
    return models.get(selectedSeries.id) || [];
  };

  const getVariantsForModel = () => {
    if (!selectedModel) return [];
    return variants.get(selectedModel.id) || [];
  };

  // Get model options from pc_* tables
  const getModelOptionsForModel = (): ModelOption[] => {
    if (!selectedModel) return [];
    return modelOptions.get(selectedModel.id) || [];
  };

  // Filter allowed values by category based on parent selection
  // e.g., when finish_style="Vinyl", filter finish_color to show only values where category="Vinyl"
  const filterValuesByCategory = useCallback((
    allowedValues: AllowedValue[],
    optionSlug: string
  ): AllowedValue[] => {
    // Define parent-child relationships for category filtering
    const categoryFilters: Record<string, string> = {
      'finish_color': 'finish_style', // finish_color is filtered by finish_style
    };

    const parentSlug = categoryFilters[optionSlug];
    if (!parentSlug) {
      return allowedValues; // No category filtering for this option
    }

    const parentValue = configValues[parentSlug];
    if (!parentValue) {
      return allowedValues; // No parent selected, show all
    }

    // Normalize the parent value for comparison
    const normalizedParent = parentValue.toLowerCase().trim();

    // Debug: log the values to see what we're working with
    console.log('[FilterValuesByCategory] Parent slug:', parentSlug, 'Parent value:', parentValue);
    console.log('[FilterValuesByCategory] Allowed values:', allowedValues.map(av => ({
      value: av.option_value?.value,
      label: av.option_value?.label,
      category: av.option_value?.category,
      raw: av
    })));

    // Filter values where category matches the parent value
    // The category could be on option_value.category, option_value.label, or on the av object itself
    const filtered = allowedValues.filter((av) => {
      // Check pc_option_values.category (primary source)
      const category = av.option_value?.category;
      if (category) {
        const normalizedCategory = category.toLowerCase().trim();
        // Exact match
        if (normalizedCategory === normalizedParent) return true;
        // Contains match (for compound categories like "Standard Vinyl")
        if (normalizedCategory.includes(normalizedParent)) return true;
      }

      // Check if category is stored directly on pc_model_allowed_values (av object)
      const avCategory = (av as any).category;
      if (avCategory) {
        const normalizedAvCategory = avCategory.toLowerCase().trim();
        if (normalizedAvCategory === normalizedParent) return true;
        if (normalizedAvCategory.includes(normalizedParent)) return true;
      }

      // Check if the label contains category info
      const label = av.option_value?.label;
      if (label) {
        const normalizedLabel = label.toLowerCase().trim();
        // Check if label starts with or contains the parent value
        if (normalizedLabel.startsWith(normalizedParent + ' ') ||
            normalizedLabel.startsWith(normalizedParent + '-')) return true;
      }

      return false;
    });

    console.log('[FilterValuesByCategory] Filtered count:', filtered.length, 'of', allowedValues.length);

    // If filtering resulted in no matches, return all values (fallback for data without categories)
    return filtered.length > 0 ? filtered : allowedValues;
  }, [configValues]);

  // Get lists for dropdowns
  const manufacturersList = getManufacturersForDomain();
  const productLinesList = getProductLinesForManufacturer();
  const seriesList = getSeriesForProductLine();
  const modelsList = getModelsForSeries();
  const variantsList = getVariantsForModel();
  const currentModelOptions = getModelOptionsForModel();

  // Render a model option field (from pc_* tables)
  const renderModelOptionField = (option: ModelOption) => {
    const slug = option.option_group?.slug || '';
    const fieldType = option.option_group?.field_type || 'dropdown';
    const value = configValues[slug];
    const allowedValues = option.allowed_values || [];
    const filteredValues = filterValuesByCategory(allowedValues, slug);

    // Clear child values when parent changes (e.g., clear finish_color when finish_style changes)
    const handleOptionChange = (newValue: any) => {
      handleConfigChange(slug, newValue);

      // Clear dependent fields
      if (slug === 'finish_style') {
        handleConfigChange('finish_color', undefined);
      }
    };

    switch (fieldType) {
      case 'dropdown':
        return (
          <Select
            value={value?.toString() || ''}
            onValueChange={handleOptionChange}
            disabled={isEditMode}
          >
            <SelectTrigger className={cn(
              'w-full',
              isEditMode && 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
            )}>
              <SelectValue placeholder={option.placeholder || `Select ${option.option_group?.label || slug}...`} />
            </SelectTrigger>
            <SelectContent>
              {filteredValues.map((av) => (
                <SelectItem key={av.id} value={av.option_value?.value || ''}>
                  {av.option_value?.label || av.option_value?.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi-select': {
        const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

        const toggleOption = (optValue: string) => {
          if (isEditMode) return;
          const newValues = selectedValues.includes(optValue)
            ? selectedValues.filter((v: string) => v !== optValue)
            : [...selectedValues, optValue];
          handleOptionChange(newValues);
        };

        if (isEditMode) {
          return (
            <div className={cn(
              'flex h-10 w-full items-center rounded-md border border-input px-3 py-2 text-sm',
              'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
            )}>
              <span className="truncate text-left">
                {selectedValues.length > 0 ? selectedValues.join(', ') : option.placeholder || 'Select...'}
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
                  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
                )}
              >
                <span className="truncate text-left">
                  {selectedValues.length > 0 ? selectedValues.join(', ') : option.placeholder || 'Select...'}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <div className="max-h-60 overflow-y-auto p-1">
                {filteredValues.map((av) => {
                  const optValue = av.option_value?.value || '';
                  const isSelected = selectedValues.includes(optValue);
                  return (
                    <div
                      key={av.id}
                      onClick={() => toggleOption(optValue)}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm',
                        'hover:bg-gray-100 dark:hover:bg-gray-800',
                        isSelected && 'bg-emerald-50 dark:bg-emerald-900/20'
                      )}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <span>{av.option_value?.label || optValue}</span>
                    </div>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      }

      case 'input':
        return (
          <Input
            type={option.option_group?.input_type || 'text'}
            value={value ?? ''}
            onChange={(e) => handleOptionChange(e.target.value)}
            placeholder={option.placeholder}
            readOnly={isEditMode}
            className={isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}
          />
        );

      default:
        return (
          <Input
            value={value ?? ''}
            onChange={(e) => handleOptionChange(e.target.value)}
            placeholder={option.placeholder}
            readOnly={isEditMode}
            className={isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}
          />
        );
    }
  };

  // Group model options by display_group
  // Separate out finish_style and finish_color for special rendering
  const groupedModelOptions = useMemo(() => {
    const finishSlugs = ['finish_style', 'finish_color'];
    const finishOptions = currentModelOptions.filter(o =>
      finishSlugs.includes(o.option_group?.slug || '')
    );
    const otherOptions = currentModelOptions.filter(o =>
      !finishSlugs.includes(o.option_group?.slug || '')
    );

    const primary = otherOptions.filter(o => o.display_group === 'primary');
    const secondary = otherOptions.filter(o => o.display_group === 'secondary' || !o.display_group);
    const advanced = otherOptions.filter(o => o.display_group === 'advanced');

    // Get finish options in correct order (style first, then color)
    const finishStyle = finishOptions.find(o => o.option_group?.slug === 'finish_style');
    const finishColor = finishOptions.find(o => o.option_group?.slug === 'finish_color');

    return { primary, secondary, advanced, finishStyle, finishColor };
  }, [currentModelOptions]);

  const handleConfigChange = (key: string, value: any) => {
    setConfigValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAddProduct = () => {
    if (!selectedModel) return;

    // Apply fallback logic: finish_color defaults to finish_style if not set
    const finalConfigValues = { ...configValues };
    if (!finalConfigValues.finish_color && finalConfigValues.finish_style) {
      finalConfigValues.finish_color = finalConfigValues.finish_style;
    }

    const selection: ProductSelection = {
      product_model_id: selectedModel.id,
      product_variant_id: selectedVariant?.id || null,
      product_hierarchy: {
        domain: selectedDomain?.name || '',
        domain_id: selectedDomain?.id || '',
        manufacturer: selectedManufacturer?.name || '',
        manufacturer_id: selectedManufacturer?.id || '',
        product_line: selectedProductLine?.name || '',
        product_line_id: selectedProductLine?.id || '',
        series: selectedSeries?.name || '',
        series_id: selectedSeries?.id || '',
        model: selectedModel.name || '',
        variant: selectedVariant?.name || null,
        variant_id: selectedVariant?.id || null,
      },
      specifications: finalConfigValues,
      pricing: {
        unit_price: 0,
        quantity: 1,
        subtotal: 0,
      },
    };
    onProductSelect(selection);
  };

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

      {/* Dropdown Selects - Hierarchy: Manufacturer → Product Line → Series → Model */}
      <div className="grid grid-cols-2 gap-4">
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
            disabled={!selectedDomain || loading.manufacturers || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
              {loading.manufacturers ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={selectedDomain ? "Select manufacturer..." : "Select domain first"} />
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

        {/* Product Line */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Product Line
          </label>
          <Select
            value={selectedProductLine?.id || ''}
            onValueChange={(id) => {
              const pl = productLinesList.find((p) => p.id === id);
              selectProductLine(pl || null);
            }}
            disabled={!selectedManufacturer || loading.productLines || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
              {loading.productLines ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={selectedManufacturer ? "Select product line..." : "Select manufacturer first"} />
              )}
            </SelectTrigger>
            <SelectContent>
              {productLinesList.map((pl) => (
                <SelectItem key={pl.id} value={pl.id}>
                  {pl.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Series */}
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
            disabled={!selectedProductLine || loading.series || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
              {loading.series ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={selectedProductLine ? "Select series..." : "Select product line first"} />
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

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Model
          </label>
          <Select
            value={selectedModel?.id || ''}
            onValueChange={(id) => {
              const model = modelsList.find((m) => m.id === id);
              selectModel(model || null);
            }}
            disabled={!selectedSeries || loading.models || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
              {loading.models ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={selectedSeries ? "Select model..." : "Select series first"} />
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

        {/* Variant (optional) */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Variant <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <Select
            value={selectedVariant?.id || ''}
            onValueChange={(id) => {
              if (id === '__none__') {
                selectVariant(null);
              } else {
                const variant = variantsList.find((v) => v.id === id);
                selectVariant(variant || null);
              }
            }}
            disabled={!selectedModel || loading.variants || isEditMode}
          >
            <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
              {loading.variants ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue placeholder={selectedModel ? "None (base model)" : "Select model first"} />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="text-gray-500">None (base model)</span>
              </SelectItem>
              {variantsList.map((variant) => (
                <SelectItem key={variant.id} value={variant.id}>
                  {variant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Finish Style - shown when model has this option */}
        {selectedModel && groupedModelOptions.finishStyle && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Finish Style
            </label>
            <Select
              value={configValues.finish_style?.toString() || ''}
              onValueChange={(value) => {
                handleConfigChange('finish_style', value);
                // Clear finish_color when style changes
                handleConfigChange('finish_color', undefined);
              }}
              disabled={isEditMode}
            >
              <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
                <SelectValue placeholder="Select finish style..." />
              </SelectTrigger>
              <SelectContent>
                {(groupedModelOptions.finishStyle.allowed_values || []).map((av) => (
                  <SelectItem key={av.id} value={av.option_value?.value || ''}>
                    {av.option_value?.label || av.option_value?.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Finish Color - shown when model has this option, filtered by Finish Style */}
        {selectedModel && groupedModelOptions.finishColor && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Finish Color
              {configValues.finish_style && (
                <span className="text-gray-400 font-normal ml-1">
                  ({configValues.finish_style})
                </span>
              )}
            </label>
            <Select
              value={configValues.finish_color?.toString() || ''}
              onValueChange={(value) => handleConfigChange('finish_color', value)}
              disabled={isEditMode}
            >
              <SelectTrigger className={`w-full ${isEditMode ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70' : ''}`}>
                <SelectValue placeholder="Select finish color..." />
              </SelectTrigger>
              <SelectContent>
                {filterValuesByCategory(groupedModelOptions.finishColor.allowed_values || [], 'finish_color').map((av) => (
                  <SelectItem key={av.id} value={av.option_value?.value || ''}>
                    {av.option_value?.label || av.option_value?.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Dynamic Model Options (from pc_* tables) - Show when model has other options besides finish */}
      {selectedModel && (groupedModelOptions.primary.length > 0 || groupedModelOptions.secondary.length > 0 || groupedModelOptions.advanced.length > 0) && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Configuration Options
          </h4>

          {loading.modelOptions ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading options...</span>
            </div>
          ) : (
            <>
              {/* Primary Model Options */}
              {groupedModelOptions.primary.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {groupedModelOptions.primary.map((option) => (
                    <div key={option.id} className={`space-y-1.5 ${getGridColClass(option.grid_span)}`}>
                      <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {option.option_group?.label || option.option_group?.slug}
                        {option.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderModelOptionField(option)}
                      {option.help_text && (
                        <p className="text-xs text-gray-400">{option.help_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Secondary Model Options */}
              {groupedModelOptions.secondary.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {groupedModelOptions.secondary.map((option) => (
                    <div key={option.id} className={`space-y-1.5 ${getGridColClass(option.grid_span)}`}>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {option.option_group?.label || option.option_group?.slug}
                        {option.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderModelOptionField(option)}
                      {option.help_text && (
                        <p className="text-xs text-gray-400">{option.help_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Advanced Model Options */}
              {groupedModelOptions.advanced.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                    Advanced Options
                  </h5>
                  <div className="grid grid-cols-4 gap-4">
                    {groupedModelOptions.advanced.map((option) => (
                      <div key={option.id} className={`space-y-1.5 ${getGridColClass(option.grid_span)}`}>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {option.option_group?.label || option.option_group?.slug}
                          {option.is_required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderModelOptionField(option)}
                        {option.help_text && (
                          <p className="text-xs text-gray-400">{option.help_text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Legacy Configuration Fields (fallback for models using default_configurations) */}
      {selectedModel && currentModelOptions.length === 0 && (primaryFields.length > 0 || secondaryFields.length > 0 || advancedFields.length > 0) && (
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
