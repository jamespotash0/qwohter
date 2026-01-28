/**
 * Product Hierarchy Selector
 * Handles cascading selection: Manufacturer → Product Line → Series → Model
 *
 * Supports flexible hierarchy where some levels can be skipped:
 * - Products can be directly under a manufacturer (no product line/series)
 * - Series can be directly under a manufacturer (no product line)
 *
 * Extracted from CascadingProductSelector for better separation of concerns.
 */

import { useEffect, useMemo } from 'react';
import { useProductStore } from '@/stores/products/productStore';
import { useShallow } from 'zustand/react/shallow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  // Use shallow comparison for stable subscriptions
  const {
    domains,
    selectedDomain,
    selectedManufacturer,
    selectedProductLine,
    selectedSeries,
    selectedModel,
    loading,
  } = useProductStore(
    useShallow((state) => ({
      domains: state.domains,
      selectedDomain: state.selectedDomain,
      selectedManufacturer: state.selectedManufacturer,
      selectedProductLine: state.selectedProductLine,
      selectedSeries: state.selectedSeries,
      selectedModel: state.selectedModel,
      loading: state.loading,
    }))
  );

  // Get actions separately (these don't change)
  const fetchDomains = useProductStore((state) => state.fetchDomains);
  const selectDomain = useProductStore((state) => state.selectDomain);
  const selectManufacturer = useProductStore((state) => state.selectManufacturer);
  const selectProductLine = useProductStore((state) => state.selectProductLine);
  const selectSeries = useProductStore((state) => state.selectSeries);
  const selectModel = useProductStore((state) => state.selectModel);
  const fetchSeriesByManufacturer = useProductStore((state) => state.fetchSeriesByManufacturer);
  const fetchModelsByManufacturer = useProductStore((state) => state.fetchModelsByManufacturer);

  // Get Maps separately and extract the specific arrays we need
  const manufacturers = useProductStore((state) => state.manufacturers);
  const productLines = useProductStore((state) => state.productLines);
  const series = useProductStore((state) => state.series);
  const models = useProductStore((state) => state.models);

  // Load domains on mount
  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  // Memoize derived lists to prevent new array references on every render
  const manufacturersList = useMemo(
    () => (selectedDomain ? manufacturers.get(selectedDomain.id) ?? [] : []),
    [selectedDomain?.id, manufacturers]
  );

  const productLinesList = useMemo(
    () => (selectedManufacturer ? productLines.get(selectedManufacturer.id) ?? [] : []),
    [selectedManufacturer?.id, productLines]
  );

  // Check for series directly under manufacturer (when no product lines)
  const seriesFromManufacturer = useMemo(
    () => (selectedManufacturer ? series.get(`mfr_${selectedManufacturer.id}`) ?? [] : []),
    [selectedManufacturer?.id, series]
  );

  // Use product line series if product line is selected, otherwise manufacturer series
  const seriesList = useMemo(
    () => (selectedProductLine ? series.get(selectedProductLine.id) ?? [] : seriesFromManufacturer),
    [selectedProductLine?.id, series, seriesFromManufacturer]
  );

  // Check for models directly under manufacturer (when no product lines/series)
  const modelsFromManufacturer = useMemo(
    () => (selectedManufacturer ? models.get(`mfr_${selectedManufacturer.id}`) ?? [] : []),
    [selectedManufacturer?.id, models]
  );

  // Use series models if series is selected, otherwise manufacturer models
  const modelsList = useMemo(
    () => (selectedSeries ? models.get(selectedSeries.id) ?? [] : modelsFromManufacturer),
    [selectedSeries?.id, models, modelsFromManufacturer]
  );

  // Check if data is loaded (using stable boolean checks instead of Map references)
  const productLinesLoaded = selectedManufacturer ? productLines.has(selectedManufacturer.id) : false;
  const seriesLoaded = selectedManufacturer ? series.has(`mfr_${selectedManufacturer.id}`) : false;
  const modelsLoaded = selectedManufacturer ? models.has(`mfr_${selectedManufacturer.id}`) : false;

  // Determine what to show based on available data
  // Always show all dropdowns, but some may be skipped if no data exists at that level
  const hierarchyState = useMemo(() => {
    // No manufacturer selected - show all dropdowns (disabled)
    if (!selectedManufacturer) {
      return { skipProductLines: false, skipSeries: false };
    }

    const hasProductLines = productLinesList.length > 0;
    const hasDirectSeries = seriesFromManufacturer.length > 0;
    const hasDirectModels = modelsFromManufacturer.length > 0;

    // Still loading product lines - no skipping yet
    if (!productLinesLoaded || loading.productLines) {
      return { skipProductLines: false, skipSeries: false };
    }

    // Has product lines - use standard flow
    if (hasProductLines) {
      return { skipProductLines: false, skipSeries: false };
    }

    // No product lines - check for direct series
    if (!seriesLoaded && !loading.series) {
      // Haven't tried fetching series by manufacturer yet
      return { skipProductLines: false, skipSeries: false };
    }

    if (hasDirectSeries) {
      // Skip product lines, enable series directly
      return { skipProductLines: true, skipSeries: false };
    }

    // No series - check for direct models
    if (!modelsLoaded && !loading.models) {
      return { skipProductLines: true, skipSeries: false };
    }

    if (hasDirectModels) {
      // Skip product lines and series, enable models directly
      return { skipProductLines: true, skipSeries: true };
    }

    // Nothing found - show all with "no data" state
    return { skipProductLines: false, skipSeries: false };
  }, [
    selectedManufacturer,
    productLinesList.length,
    seriesFromManufacturer.length,
    modelsFromManufacturer.length,
    productLinesLoaded,
    seriesLoaded,
    modelsLoaded,
    loading.productLines,
    loading.series,
    loading.models,
  ]);

  // Fetch series/models by manufacturer when product lines are empty
  useEffect(() => {
    if (!selectedManufacturer) return;
    if (!productLinesLoaded || loading.productLines) return;
    if (productLinesList.length > 0) return; // Has product lines, use normal flow
    if (seriesLoaded || loading.series) return; // Already loaded or loading

    fetchSeriesByManufacturer(selectedManufacturer.id);
  }, [
    selectedManufacturer?.id,
    productLinesLoaded,
    productLinesList.length,
    seriesLoaded,
    loading.productLines,
    loading.series,
    fetchSeriesByManufacturer,
  ]);

  // Fetch models by manufacturer when no product lines AND no series
  useEffect(() => {
    if (!selectedManufacturer) return;
    if (!productLinesLoaded || loading.productLines) return;
    if (productLinesList.length > 0) return; // Has product lines, use normal flow
    if (!seriesLoaded || loading.series) return; // Series not loaded yet
    if (seriesFromManufacturer.length > 0) return; // Has direct series, use normal flow
    if (modelsLoaded || loading.models) return; // Already loaded or loading

    fetchModelsByManufacturer(selectedManufacturer.id);
  }, [
    selectedManufacturer?.id,
    productLinesLoaded,
    productLinesList.length,
    seriesLoaded,
    seriesFromManufacturer.length,
    modelsLoaded,
    loading.productLines,
    loading.series,
    loading.models,
    fetchModelsByManufacturer,
  ]);

  const readonlyStyles = isEditMode
    ? 'bg-gray-100 dark:bg-gray-800 cursor-default opacity-70'
    : '';

  // Determine if series can be selected (either has product line or skipping product lines)
  const canSelectSeries = selectedProductLine || (hierarchyState.skipProductLines && selectedManufacturer);

  // Determine if model can be selected (either has series or skipping series)
  const canSelectModel = selectedSeries || (hierarchyState.skipSeries && selectedManufacturer);

  return (
    <div className={className}>
      {/* 5-column responsive grid for hierarchy selection */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Domain */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Domain
          </label>
          <Select
            value={selectedDomain?.id || ''}
            onValueChange={(id) => {
              const domain = domains.find((d) => d.id === id);
              selectDomain(domain || null);
            }}
            disabled={loading.domains || isEditMode}
          >
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              <SelectValue placeholder={loading.domains ? 'Loading...' : 'Select domain...'} />
            </SelectTrigger>
            <SelectContent>
              {domains.map((domain) => (
                <SelectItem key={domain.id} value={domain.id}>
                  {domain.name}
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
            disabled={!selectedDomain || loading.manufacturers || isEditMode}
          >
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              <SelectValue
                placeholder={
                  loading.manufacturers
                    ? 'Loading...'
                    : selectedDomain
                      ? 'Select manufacturer...'
                      : 'Select domain first'
                }
              />
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
            {hierarchyState.skipProductLines && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Optional)</span>
            )}
          </label>
          <Select
            value={selectedProductLine?.id || ''}
            onValueChange={(id) => {
              const pl = productLinesList.find((p) => p.id === id);
              selectProductLine(pl || null);
            }}
            disabled={!selectedManufacturer || loading.productLines || isEditMode || (productLinesList.length === 0 && !hierarchyState.skipProductLines)}
          >
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              <SelectValue
                placeholder={
                  loading.productLines
                    ? 'Loading...'
                    : !selectedManufacturer
                      ? 'Select manufacturer first'
                      : productLinesList.length === 0
                        ? hierarchyState.skipProductLines
                          ? 'Skip - select series directly'
                          : 'No product lines available'
                        : 'Select product line...'
                }
              />
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

        {/* Series - enabled when product line selected OR when skipping product lines */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Series
            {hierarchyState.skipSeries && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Optional)</span>
            )}
          </label>
          <Select
            value={selectedSeries?.id || ''}
            onValueChange={(id) => {
              const ser = seriesList.find((s) => s.id === id);
              selectSeries(ser || null);
            }}
            disabled={!canSelectSeries || loading.series || isEditMode || (seriesList.length === 0 && !hierarchyState.skipSeries)}
          >
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              <SelectValue
                placeholder={
                  loading.series
                    ? 'Loading...'
                    : !canSelectSeries
                      ? hierarchyState.skipProductLines
                        ? 'Select manufacturer first'
                        : 'Select product line first'
                      : seriesList.length === 0
                        ? hierarchyState.skipSeries
                          ? 'Skip - select model directly'
                          : 'No series available'
                        : 'Select series...'
                }
              />
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

        {/* Model - enabled when series selected OR when skipping series */}
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
            disabled={!canSelectModel || loading.models || isEditMode || modelsList.length === 0}
          >
            <SelectTrigger className={`w-full ${readonlyStyles}`}>
              <SelectValue
                placeholder={
                  loading.models
                    ? 'Loading...'
                    : !canSelectModel
                      ? hierarchyState.skipSeries
                        ? 'Select manufacturer first'
                        : 'Select series first'
                      : modelsList.length === 0
                        ? 'No models available'
                        : 'Select model...'
                }
              />
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
