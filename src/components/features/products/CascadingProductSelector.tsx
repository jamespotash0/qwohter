/**
 * Cascading Product Selector
 * Beautiful multi-level product selection with stunning design
 */

import { useEffect, useState } from 'react';
import { useProductStore } from '@/stores/products/productStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Building2,
  Grid3x3,
  Layers3,
  Box,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
  } = useProductStore();

  const [currentStep, setCurrentStep] = useState<number>(1);

  // Load types on mount
  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Update current step based on selections
  useEffect(() => {
    if (selectedModel) setCurrentStep(5);
    else if (selectedSeries) setCurrentStep(4);
    else if (selectedCategory) setCurrentStep(3);
    else if (selectedManufacturer) setCurrentStep(2);
    else if (selectedType) setCurrentStep(1);
  }, [selectedType, selectedManufacturer, selectedCategory, selectedSeries, selectedModel]);

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

  const steps = [
    { number: 1, title: 'Product Type', icon: Package, completed: !!selectedType },
    { number: 2, title: 'Manufacturer', icon: Building2, completed: !!selectedManufacturer },
    { number: 3, title: 'Category', icon: Grid3x3, completed: !!selectedCategory },
    { number: 4, title: 'Series', icon: Layers3, completed: !!selectedSeries },
    { number: 5, title: 'Model', icon: Box, completed: !!selectedModel },
  ];

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Progress Steps */}
      <Card className="border-border/50 shadow-sm bg-gradient-to-br from-card via-card to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold">Select Product</CardTitle>
            <Badge variant="outline" className="font-mono">
              Step {currentStep} of 5
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.number === currentStep;
              const isCompleted = step.completed;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <motion.div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300',
                        isCompleted
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          : isActive
                          ? 'bg-primary/20 text-primary border-2 border-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </motion.div>
                    <span
                      className={cn(
                        'mt-2 text-xs font-medium text-center',
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 mb-8">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          isCompleted ? 'bg-primary' : 'bg-muted'
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Step 1: Product Types */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="types"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="col-span-full"
            >
              <SelectionGrid
                title="Select Product Type"
                icon={Package}
                items={types}
                loading={loading.types}
                onSelect={(type) => {
                  selectType(type);
                  setCurrentStep(2);
                }}
                selectedId={selectedType?.id}
                getLabel={(item) => item.name}
                getDescription={(item) => item.description}
                getIcon={(item) => item.icon}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Manufacturers */}
        <AnimatePresence mode="wait">
          {currentStep >= 2 && selectedType && (
            <motion.div
              key="manufacturers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="col-span-full"
            >
              <SelectionGrid
                title={`${selectedType.name} - Select Manufacturer`}
                icon={Building2}
                items={getManufacturersForType()}
                loading={loading.manufacturers}
                onSelect={(mfr) => {
                  selectManufacturer(mfr);
                  setCurrentStep(3);
                }}
                onBack={() => {
                  selectType(null);
                  setCurrentStep(1);
                }}
                selectedId={selectedManufacturer?.id}
                getLabel={(item) => item.name}
                getDescription={(item) => item.description}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 3: Categories */}
        <AnimatePresence mode="wait">
          {currentStep >= 3 && selectedManufacturer && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="col-span-full"
            >
              <SelectionGrid
                title={`${selectedManufacturer.name} - Select Category`}
                icon={Grid3x3}
                items={getCategoriesForManufacturer()}
                loading={loading.categories}
                onSelect={(cat) => {
                  selectCategory(cat);
                  setCurrentStep(4);
                }}
                onBack={() => {
                  selectManufacturer(null);
                  setCurrentStep(2);
                }}
                selectedId={selectedCategory?.id}
                getLabel={(item) => item.name}
                getDescription={(item) => item.description}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 4: Series */}
        <AnimatePresence mode="wait">
          {currentStep >= 4 && selectedCategory && (
            <motion.div
              key="series"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="col-span-full"
            >
              <SelectionGrid
                title={`${selectedCategory.name} - Select Series`}
                icon={Layers3}
                items={getSeriesForCategory()}
                loading={loading.series}
                onSelect={(ser) => {
                  selectSeries(ser);
                  setCurrentStep(5);
                }}
                onBack={() => {
                  selectCategory(null);
                  setCurrentStep(3);
                }}
                selectedId={selectedSeries?.id}
                getLabel={(item) => item.name}
                getDescription={(item) => item.description}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 5: Models */}
        <AnimatePresence mode="wait">
          {currentStep >= 5 && selectedSeries && (
            <motion.div
              key="models"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="col-span-full"
            >
              <ModelSelection
                title={`${selectedSeries.name} - Select Model`}
                models={getModelsForSeries()}
                loading={loading.models}
                onBack={() => {
                  selectSeries(null);
                  setCurrentStep(4);
                }}
                onSelect={(model) => {
                  selectModel(model);
                  // Will trigger specifications form in parent
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      {onCancel && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SELECTION GRID COMPONENT
// ============================================================================

interface SelectionGridProps<T> {
  title: string;
  icon: React.ElementType;
  items: T[];
  loading: boolean;
  onSelect: (item: T) => void;
  onBack?: () => void;
  selectedId?: string;
  getLabel: (item: T) => string;
  getDescription?: (item: T) => string | undefined;
  getIcon?: (item: T) => string | undefined;
}

function SelectionGrid<T extends { id: string }>({
  title,
  icon: Icon,
  items,
  loading,
  onSelect,
  onBack,
  selectedId,
  getLabel,
  getDescription,
  getIcon,
}: SelectionGridProps<T>) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No items available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const label = getLabel(item);
              const description = getDescription?.(item);

              return (
                <motion.button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className={cn(
                    'group relative p-4 rounded-lg border-2 text-left transition-all duration-200',
                    'hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card hover:border-primary/50'
                  )}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <p className="font-semibold text-sm">{label}</p>
                    {description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                    )}
                  </div>

                  <ChevronRight
                    className={cn(
                      'absolute bottom-4 right-4 w-4 h-4 transition-all',
                      isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  />
                </motion.button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MODEL SELECTION COMPONENT
// ============================================================================

interface ModelSelectionProps {
  title: string;
  models: any[];
  loading: boolean;
  onBack: () => void;
  onSelect: (model: any) => void;
}

function ModelSelection({ title, models, loading, onBack, onSelect }: ModelSelectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Box className="w-5 h-5 text-primary" />
            {title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {models.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No models available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {models.map((model) => (
              <motion.button
                key={model.id}
                onClick={() => onSelect(model)}
                className="w-full p-4 rounded-lg border-2 border-border bg-card hover:border-primary/50 hover:shadow-md text-left transition-all group"
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {model.model_number}
                      </Badge>
                      {model.base_price && (
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          ${model.base_price.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                      {model.model_name}
                    </h4>
                    {model.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {model.description}
                      </p>
                    )}
                    {model.specifications && Object.keys(model.specifications).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {Object.entries(model.specifications)
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
