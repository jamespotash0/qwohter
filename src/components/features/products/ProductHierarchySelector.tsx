/**
 * Product Hierarchy Selector
 * Handles cascading selection: Manufacturer → Product Line → Series → Model
 *
 * Extracted from CascadingProductSelector for better separation of concerns.
 */

import { useEffect } from 'react';
import { useProductStore } from '@/stores/products/productStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ProductHierarchySelectorProps {
  /** Whether the form is in edit mode (fields become readonly) */
  isEditMode?: boolean;
  /** Optional class name */
  className?: string;
}

export function ProductHierarchySelector({
  isEditMode = false,
  className,
}: ProductHierarchySelectorProps) {
  const {
    domains,
    manufacturers,
    productLines,
    series,
    models,
    selectedDomain,
    selectedManufacturer,
    selectedProductLine,
    selectedSeries,
    selectedModel,
    loading,
    fetchDomains,
    selectDomain,
    selectManufacturer,
    selectProductLine,
    selectSeries,
    selectModel,
  } = useProductStore();

  // Load domains on mount
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Auto-select domain if there's only one
  useEffect(() => {
    if (!selectedDomain && domains.length > 0 && !loading.domains) {
      selectDomain(domains[0]);
    }
  }, [selectedDomain, domains, loading.domains, selectDomain]);

  // Get filtered lists
  const manufacturersList = selectedDomain
    ? manufacturers.get(selectedDomain.id) || []
    : [];
  const productLinesList = selectedManufacturer
    ? productLines.get(selectedManufacturer.id) || []
    : [];
  const seriesList = selectedProductLine
    ? series.get(selectedProductLine.id) || []
    : [];
  const modelsList = selectedSeries ? models.get(selectedSeries.id) || [] : [];

  const readonlyStyles = isEditMode
    ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
    : '';

  return (
    <div className={className}>
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
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              {loading.manufacturers ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue
                  placeholder={
                    selectedDomain
                      ? 'Select manufacturer...'
                      : 'Select domain first'
                  }
                />
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
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              {loading.productLines ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue
                  placeholder={
                    selectedManufacturer
                      ? 'Select product line...'
                      : 'Select manufacturer first'
                  }
                />
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
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              {loading.series ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue
                  placeholder={
                    selectedProductLine
                      ? 'Select series...'
                      : 'Select product line first'
                  }
                />
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
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              {loading.models ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                <SelectValue
                  placeholder={
                    selectedSeries ? 'Select model...' : 'Select series first'
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
    </div>
  );
}
