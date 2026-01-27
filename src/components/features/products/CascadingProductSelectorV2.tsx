/**
 * Cascading Product Selector V2
 * Simplified product selection with dynamic configuration fields from config_schema
 *
 * Uses the new config_schema system instead of pc_* tables.
 * Hierarchy: Domain → Manufacturer → Product Line → Series → Model
 */

import { useState, useEffect, useCallback } from 'react';
import { useProductStore, type ProductSelection } from '@/stores/products/productStore';
import { ProductHierarchySelector } from './ProductHierarchySelector';
import { ConfigSchemaFields } from './ConfigSchemaFields';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import type { ConfigSchema, ConfigFormValues } from '@/lib/types/configSchema';

interface CascadingProductSelectorV2Props {
  onProductSelect: (product: ProductSelection) => void;
  onCancel?: () => void;
  className?: string;
  initialValues?: Record<string, unknown>;
}

export function CascadingProductSelectorV2({
  onProductSelect,
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
    error,
  } = useProductStore();

  // Configuration values for the selected model
  const [configValues, setConfigValues] = useState<ConfigFormValues>({});
  const [initialized, setInitialized] = useState(false);

  // Determine if we're in edit mode
  const isEditMode = !!initialValues;

  // Get config_schema from the selected model
  const configSchema = selectedModel?.config_schema as ConfigSchema | null | undefined;

  // Initialize config values when model is selected or when editing
  useEffect(() => {
    if (selectedModel) {
      const defaults: ConfigFormValues = {};

      // If we have a config_schema, use its defaults
      if (configSchema?.options) {
        for (const [key, field] of Object.entries(configSchema.options)) {
          if (initialValues && key in initialValues) {
            defaults[key] = initialValues[key] as ConfigFormValues[string];
          } else if (field.default_value !== undefined) {
            defaults[key] = field.default_value;
          } else {
            defaults[key] = null;
          }
        }
      }
      // Fallback: if model has default_configurations (legacy)
      else if (selectedModel.default_configurations) {
        for (const [key, field] of Object.entries(selectedModel.default_configurations)) {
          if (initialValues && key in initialValues) {
            defaults[key] = initialValues[key] as ConfigFormValues[string];
          } else if (field.default_value !== undefined) {
            defaults[key] = field.default_value;
          }
        }
      }

      setConfigValues(defaults);
    } else if (initialValues && !initialized) {
      setConfigValues({ ...initialValues } as ConfigFormValues);
      setInitialized(true);
    }
    // Don't reset to empty object when selectedModel becomes null - keep existing values
  }, [selectedModel?.id, initialValues, initialized]);

  const handleConfigChange = useCallback((values: ConfigFormValues) => {
    setConfigValues(values);
  }, []);

  const handleAddProduct = () => {
    if (!selectedModel) return;

    const selection: ProductSelection = {
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
      pricing: {
        unit_price: 0,
        quantity: 1,
        subtotal: 0,
      },
    };

    onProductSelect(selection);
  };

  // Check if model has config options (either config_schema or legacy default_configurations)
  const hasConfigOptions =
    (configSchema && Object.keys(configSchema.options || {}).length > 0) ||
    (selectedModel?.default_configurations &&
      Object.keys(selectedModel.default_configurations).length > 0);

  return (
    <div className={className}>
      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Product Hierarchy Selection */}
      <ProductHierarchySelector isEditMode={isEditMode} />

      {/* Configuration Options */}
      {selectedModel && hasConfigOptions && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Configuration Options
          </h4>

          {configSchema ? (
            // New config_schema system
            <ConfigSchemaFields
              schema={configSchema}
              values={configValues}
              onChange={handleConfigChange}
              isEditMode={isEditMode}
            />
          ) : (
            // Legacy: No config_schema, show loading or empty state
            <div className="text-gray-500 text-sm">
              No configuration schema found for this model.
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
