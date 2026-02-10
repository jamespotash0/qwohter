/**
 * Cascading Product Selector V2
 * Compact product selection with dynamic configuration fields from config_schema
 *
 * Flow: Product Hierarchy → Configuration (dimensions included in config_schema)
 * Uses the new config_schema system instead of pc_* tables.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useProductStore, type ProductSelection } from '@/stores/products/productStore';
import { ProductHierarchySelector } from './ProductHierarchySelector';
import { ConfigSchemaFields } from './ConfigSchemaFields';
import { Button } from '@/components/ui/button';
import { Check, Package } from 'lucide-react';
import type { ConfigSchema, ConfigFormValues } from '@/lib/types/configSchema';
import { useConfigSchema } from '@/hooks/useConfigSchema';
import { cn } from '@/lib/utils';

interface CascadingProductSelectorV2Props {
  onProductSelect: (product: ProductSelection) => void;
  /** Called when user wants to add and continue adding more products */
  onProductSelectAndContinue?: (product: ProductSelection) => void;
  onCancel?: () => void;
  className?: string;
  initialValues?: Record<string, unknown>;
}

export function CascadingProductSelectorV2({
  onProductSelect,
  onProductSelectAndContinue,
  onCancel,
  className,
  initialValues,
}: CascadingProductSelectorV2Props) {
  const {
    selectedDomain,
    selectedManufacturer,
    selectedProductLine,
    selectedSeries,
    selectedModel,
    loading,
    error,
  } = useProductStore();

  // Track previous model ID to detect changes
  const previousModelIdRef = useRef<string | null>(null);
  // Track which initialValues we've initialized from (stringified for comparison)
  const initializedFromValuesRef = useRef<string | null>(null);

  // Configuration values for the selected model (includes dimensions)
  const [configValues, setConfigValues] = useState<ConfigFormValues>({});

  // Determine if we're in edit mode
  const isEditMode = !!initialValues;

  // Get config_schema from the selected model
  const configSchema = selectedModel?.config_schema as ConfigSchema | null | undefined;

  // Use the config schema hook to get access to resolved options for label lookup
  const { getFieldOptions } = useConfigSchema({
    schema: configSchema,
    initialValues: configValues,
  });

  // Create a stable key from initialValues for tracking initialization
  const initialValuesKey = useMemo(() => {
    if (!initialValues) return null;
    // Create a key from the model_id and a few key values to detect when initialValues actually changed
    const keyParts = [
      initialValues.model_id,
      initialValues.wall_height,
      initialValues.quantity,
    ].filter(Boolean);
    return keyParts.length > 0 ? keyParts.join('|') : JSON.stringify(initialValues);
  }, [initialValues]);

  // Reset config values when model changes (always reset when switching models)
  useEffect(() => {
    if (!selectedModel) {
      previousModelIdRef.current = null;
      return;
    }

    const previousModelId = previousModelIdRef.current;
    const currentModelId = selectedModel.id;

    // If model changed and we had a previous model, reset config values
    // This applies even in edit mode - if user changes to a different model, reset the config
    if (previousModelId && previousModelId !== currentModelId) {
      setConfigValues({});
      // Reset the initialization tracking so new model gets its defaults
      initializedFromValuesRef.current = null;
    }

    // Update the ref for next comparison
    previousModelIdRef.current = currentModelId;
  }, [selectedModel?.id]);

  // Initialize config values when model is selected
  useEffect(() => {
    if (!selectedModel) return;

    // In edit mode, skip if we've already initialized from these specific initialValues
    if (isEditMode && initialValuesKey && initializedFromValuesRef.current === initialValuesKey) {
      return;
    }

    const defaults: ConfigFormValues = {};

    // If we have a config_schema, use its options
    if (configSchema?.options) {
      for (const [key, field] of Object.entries(configSchema.options)) {
        // Check multiple possible key variations in initialValues
        const valueFromInitial = initialValues?.[key] ?? initialValues?.[key.toLowerCase()] ?? initialValues?.[key.replace(/_/g, '')];

        if (valueFromInitial !== undefined && valueFromInitial !== null) {
          defaults[key] = valueFromInitial as ConfigFormValues[string];
        } else if (field.default_value !== undefined) {
          defaults[key] = field.default_value;
        } else {
          // No default - leave as null for truly optional fields
          defaults[key] = null;
        }
      }
    }
    // Fallback: if model has default_configurations (legacy)
    else if (selectedModel.default_configurations) {
      for (const [key, field] of Object.entries(selectedModel.default_configurations)) {
        const valueFromInitial = initialValues?.[key] ?? initialValues?.[key.toLowerCase()];

        if (valueFromInitial !== undefined && valueFromInitial !== null) {
          defaults[key] = valueFromInitial as ConfigFormValues[string];
        } else if (field.default_value !== undefined) {
          defaults[key] = field.default_value;
        }
      }
    }

    setConfigValues(defaults);

    // Track that we've initialized from these initialValues
    if (isEditMode && initialValuesKey) {
      initializedFromValuesRef.current = initialValuesKey;
    }
  }, [selectedModel?.id, configSchema?.options, initialValues, isEditMode, initialValuesKey]);

  const handleConfigChange = useCallback((values: ConfigFormValues) => {
    setConfigValues(values);
  }, []);

  // Build a map of field codes to their display labels
  const resolveSpecificationLabels = useCallback(
    (values: ConfigFormValues): Record<string, string> => {
      const labels: Record<string, string> = {};

      for (const [fieldKey, value] of Object.entries(values)) {
        if (value === null || value === undefined) continue;

        const options = getFieldOptions(fieldKey);

        if (Array.isArray(value)) {
          // Multi-select: resolve each code to its label
          const resolvedLabels = value.map((code) => {
            const option = options.find((opt) => opt.code === String(code));
            return option?.label || String(code);
          });
          labels[fieldKey] = resolvedLabels.join(', ');
        } else {
          // Single value: find matching option
          const option = options.find((opt) => opt.code === String(value));
          labels[fieldKey] = option?.label || String(value);
        }
      }

      return labels;
    },
    [getFieldOptions]
  );

  // Build the product selection object
  const buildSelection = useCallback((): ProductSelection | null => {
    if (!selectedModel) return null;

    // Resolve codes to labels for display purposes
    const specificationLabels = resolveSpecificationLabels(configValues);

    // Get quantity from config values (no default - user must enter)
    const quantity = typeof configValues.quantity === 'number' ? configValues.quantity : null;

    return {
      product_model_id: selectedModel.id,
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
      },
      specifications: configValues,
      specification_labels: specificationLabels,
      pricing: {
        unit_price: 0,
        quantity,
        subtotal: 0,
      },
    };
  }, [
    selectedModel,
    selectedDomain,
    selectedManufacturer,
    selectedProductLine,
    selectedSeries,
    configValues,
    resolveSpecificationLabels,
  ]);

  const handleAddProduct = () => {
    const selection = buildSelection();
    if (selection) {
      onProductSelect(selection);
    }
  };

  const handleAddAndContinue = () => {
    const selection = buildSelection();
    if (selection && onProductSelectAndContinue) {
      onProductSelectAndContinue(selection);
      // Reset for next product
      setConfigValues({});
    }
  };

  // Check if model has config options (either config_schema or legacy default_configurations)
  const hasConfigOptions =
    (configSchema && Object.keys(configSchema.options || {}).length > 0) ||
    (selectedModel?.default_configurations &&
      Object.keys(selectedModel.default_configurations).length > 0);

  // Computed validation state - quantity must be explicitly entered (>= 1)
  const isValid = useMemo(() => {
    const quantity = typeof configValues.quantity === 'number' ? configValues.quantity : null;
    return !!selectedModel && quantity !== null && quantity >= 1;
  }, [selectedModel, configValues.quantity]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Error Display */}
      {error && (
        <div className="px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Product Selection Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          <Package className="w-4 h-4" />
          <span>Product Selection</span>
        </div>
        <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg border border-gray-200/60 dark:border-gray-700/50 p-4">
          <ProductHierarchySelector />
        </div>
      </section>

      {/* Configuration Fields (includes dimensions from config_schema) */}
      {selectedModel && hasConfigOptions && configSchema && !loading.modelDetails && (
        <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg border border-gray-200/60 dark:border-gray-700/50 p-4">
          <ConfigSchemaFields
            key={selectedModel.id}
            schema={configSchema}
            values={configValues}
            onChange={handleConfigChange}
          />
        </div>
      )}

      {/* Loading indicator while fetching model details */}
      {selectedModel && loading.modelDetails && (
        <div className="bg-gray-50/50 dark:bg-gray-900/30 rounded-lg border border-gray-200/60 dark:border-gray-700/50 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
            <span>Loading configuration...</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} size="sm">
            Cancel
          </Button>
        )}
        {onProductSelectAndContinue && !initialValues && (
          <Button
            onClick={handleAddAndContinue}
            disabled={!isValid}
            variant="outline"
            size="sm"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Add & Continue
          </Button>
        )}
        <Button
          onClick={handleAddProduct}
          disabled={!isValid}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Check className="w-4 h-4 mr-1.5" />
          {initialValues ? 'Update Product' : 'Add Product'}
        </Button>
      </div>
    </div>
  );
}
