/**
 * Extracted Product Editor
 * Human-in-the-loop editing for AI-extracted product data
 * Displays all extracted fields with ability to edit/correct values
 */

import { useState, useCallback } from 'react';
import { PencilSimple, Check, X, Trash, Plus, CaretDown, CaretRight, Package } from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { ExtractedProduct } from '@/services/productExtraction';

interface EditableFieldProps {
  label: string;
  value: unknown;
  path: string[];
  onChange: (path: string[], newValue: unknown) => void;
  onDelete?: (path: string[]) => void;
  depth?: number;
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function EditableField({ label, value, path, onChange, onDelete, depth = 0 }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(depth < 2);

  const startEdit = useCallback(() => {
    if (typeof value === 'string' || typeof value === 'number') {
      setEditValue(String(value));
      setIsEditing(true);
    }
  }, [value]);

  const saveEdit = useCallback(() => {
    // Try to preserve type
    let newValue: unknown = editValue;
    if (typeof value === 'number') {
      const parsed = parseFloat(editValue);
      if (!isNaN(parsed)) newValue = parsed;
    }
    onChange(path, newValue);
    setIsEditing(false);
  }, [editValue, onChange, path, value]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue('');
  }, []);

  // Handle null/undefined - allow clicking to add value
  if (value === null || value === undefined) {
    if (isEditing) {
      return (
        <div className="flex items-center gap-2 py-1 text-xs">
          <span className="text-gray-500 min-w-[100px]">{formatLabel(label)}:</span>
          <div className="flex items-center gap-1 flex-1">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-6 text-xs flex-1"
              autoFocus
              placeholder="Enter value..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editValue.trim()) {
                  onChange(path, editValue.trim());
                  setIsEditing(false);
                  setEditValue('');
                }
                if (e.key === 'Escape') cancelEdit();
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                if (editValue.trim()) {
                  onChange(path, editValue.trim());
                  setIsEditing(false);
                  setEditValue('');
                }
              }}
            >
              <Check className="w-3 h-3 text-green-600" />
            </Button>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEdit}>
              <X className="w-3 h-3 text-red-600" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="group flex items-center gap-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1 cursor-pointer"
        onClick={() => setIsEditing(true)}
      >
        <span className="text-gray-500 min-w-[100px]">{formatLabel(label)}:</span>
        <span className="text-gray-400 italic flex-1">Not extracted</span>
        <Plus className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="flex items-center gap-2 py-1 text-xs">
          <span className="text-gray-500 min-w-[100px]">{formatLabel(label)}:</span>
          <span className="text-gray-400 italic">Empty list</span>
        </div>
      );
    }

    // Array of strings/numbers
    if (typeof value[0] !== 'object') {
      return (
        <div className="py-1 text-xs">
          <span className="text-gray-500">{formatLabel(label)}:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {value.map((item, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {String(item)}
              </Badge>
            ))}
          </div>
        </div>
      );
    }

    // Array of objects
    return (
      <div className="py-1 text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? <CaretDown className="w-3 h-3" /> : <CaretRight className="w-3 h-3" />}
          {formatLabel(label)} ({value.length} items)
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-2 border-l-2 border-gray-200 pl-3">
            {value.map((item, idx) => (
              <div key={idx} className="bg-gray-50 dark:bg-gray-800 rounded p-2">
                <span className="text-xs text-gray-400 mb-1 block">Item {idx + 1}</span>
                {typeof item === 'object' && item !== null ? (
                  Object.entries(item).map(([k, v]) => (
                    <EditableField
                      key={k}
                      label={k}
                      value={v}
                      path={[...path, String(idx), k]}
                      onChange={onChange}
                      depth={depth + 1}
                    />
                  ))
                ) : (
                  <span>{String(item)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle nested objects
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <div className="flex items-center gap-2 py-1 text-xs">
          <span className="text-gray-500 min-w-[100px]">{formatLabel(label)}:</span>
          <span className="text-gray-400 italic">Empty</span>
        </div>
      );
    }

    return (
      <div className="py-1 text-xs">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium"
        >
          {isExpanded ? <CaretDown className="w-3 h-3" /> : <CaretRight className="w-3 h-3" />}
          {formatLabel(label)}
        </button>
        {isExpanded && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
            {entries.map(([k, v]) => (
              <EditableField
                key={k}
                label={k}
                value={v}
                path={[...path, k]}
                onChange={onChange}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle primitives (string, number, boolean)
  return (
    <div className="group flex items-center gap-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1">
      <span className="text-gray-500 min-w-[100px] flex-shrink-0">{formatLabel(label)}:</span>

      {isEditing ? (
        <div className="flex items-center gap-1 flex-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-6 text-xs flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={saveEdit}>
            <Check className="w-3 h-3 text-green-600" />
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEdit}>
            <X className="w-3 h-3 text-red-600" />
          </Button>
        </div>
      ) : (
        <>
          {/* Clickable value to edit */}
          <span
            className={cn(
              'flex-1 cursor-pointer hover:underline',
              typeof value === 'boolean'
                ? value ? 'text-green-600' : 'text-red-600'
                : 'text-gray-900 dark:text-gray-100'
            )}
            onClick={startEdit}
            title="Click to edit"
          >
            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
          </span>
          <PencilSimple className="w-3 h-3 text-gray-400 flex-shrink-0" />
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(path)}
            >
              <Trash className="w-3 h-3 text-red-400" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

interface ExtractedProductEditorProps {
  product: ExtractedProduct;
  onChange: (updatedProduct: ExtractedProduct) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

/** Format a number as currency */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Check if a pricing value should be displayed (> 0) */
function shouldShowPrice(value: number | null | undefined): boolean {
  return value !== null && value !== undefined && value > 0;
}

export function ExtractedProductEditor({
  product,
  onChange,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: ExtractedProductEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleFieldChange = useCallback((path: string[], newValue: unknown) => {
    // Deep clone the product
    const updated = JSON.parse(JSON.stringify(product));

    // Navigate to the nested path and update
    let current = updated;
    for (let i = 0; i < path.length - 1; i++) {
      if (current[path[i]] === undefined) {
        current[path[i]] = {};
      }
      current = current[path[i]];
    }
    current[path[path.length - 1]] = newValue;

    onChange(updated);
  }, [product, onChange]);

  const handleFieldDelete = useCallback((path: string[]) => {
    const updated = JSON.parse(JSON.stringify(product));

    let current = updated;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    delete current[path[path.length - 1]];

    onChange(updated);
  }, [product, onChange]);

  // Check if a section has any non-null values
  const hasValues = (obj: Record<string, unknown> | undefined): boolean => {
    if (!obj) return false;
    return Object.values(obj).some(v => v !== null && v !== undefined);
  };

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isSelected
          ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
      )}
    >
      {/* Header - Simple: just name */}
      <div className="flex items-start gap-3 p-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleSelect}>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {product.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Delete product"
            >
              <Trash className="w-3.5 h-3.5 text-gray-500 hover:text-red-600" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? (
              <CaretDown className="w-4 h-4" />
            ) : (
              <CaretRight className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
          {/* Product Hierarchy - Most Important */}
          <FieldSection title="Product Hierarchy">
            <EditableField label="manufacturer" value={product.manufacturer} path={['manufacturer']} onChange={handleFieldChange} />
            <EditableField label="series" value={product.series} path={['series']} onChange={handleFieldChange} />
            <EditableField label="model" value={product.model} path={['model']} onChange={handleFieldChange} />
            <EditableField label="productDomain" value={product.productDomain} path={['productDomain']} onChange={handleFieldChange} />
            <EditableField label="productLine" value={product.productLine} path={['productLine']} onChange={handleFieldChange} />
          </FieldSection>

          {/* Selected Configuration - Frame, Closures, Seals, Track, Stacking */}
          {/* Show if configurable OR if any of these fields have values */}
          {(product.isConfigurable || product.frame || product.closures || product.seals || product.track || product.stacking) && (
            <FieldSection title="Selected Configuration">
              {/* Frame */}
              <EditableField label="frameType" value={product.frame?.type} path={['frame', 'type']} onChange={handleFieldChange} />
              <EditableField label="frameMaterial" value={product.frame?.material} path={['frame', 'material']} onChange={handleFieldChange} />

              {/* Closures */}
              <EditableField label="leftClosure" value={product.closures?.left} path={['closures', 'left']} onChange={handleFieldChange} />
              <EditableField label="rightClosure" value={product.closures?.right} path={['closures', 'right']} onChange={handleFieldChange} />

              {/* Seals */}
              <EditableField label="topSeal" value={product.seals?.top} path={['seals', 'top']} onChange={handleFieldChange} />
              <EditableField label="bottomSeal" value={product.seals?.bottom} path={['seals', 'bottom']} onChange={handleFieldChange} />
              <EditableField label="perimeterSeal" value={product.seals?.perimeter} path={['seals', 'perimeter']} onChange={handleFieldChange} />

              {/* Track */}
              <EditableField label="trackType" value={product.track?.type} path={['track', 'type']} onChange={handleFieldChange} />
              <EditableField label="hangingWeight" value={product.track?.hangingWeight} path={['track', 'hangingWeight']} onChange={handleFieldChange} />

              {/* Stacking */}
              <EditableField label="stackingDirection" value={product.stacking?.direction} path={['stacking', 'direction']} onChange={handleFieldChange} />
              <EditableField label="stackingConfiguration" value={product.stacking?.configuration} path={['stacking', 'configuration']} onChange={handleFieldChange} />
            </FieldSection>
          )}

          {/* Dimensions */}
          <FieldSection title="Dimensions">
            <EditableField label="height" value={product.dimensions?.height} path={['dimensions', 'height']} onChange={handleFieldChange} />
            <EditableField label="width" value={product.dimensions?.width} path={['dimensions', 'width']} onChange={handleFieldChange} />
            <EditableField label="length" value={product.dimensions?.length} path={['dimensions', 'length']} onChange={handleFieldChange} />
            <EditableField label="thickness" value={product.dimensions?.thickness} path={['dimensions', 'thickness']} onChange={handleFieldChange} />
            <EditableField label="area" value={product.dimensions?.area} path={['dimensions', 'area']} onChange={handleFieldChange} />
            <EditableField label="panelCount" value={product.dimensions?.panelCount} path={['dimensions', 'panelCount']} onChange={handleFieldChange} />
            <EditableField label="weight" value={product.dimensions?.weight} path={['dimensions', 'weight']} onChange={handleFieldChange} />
            <EditableField label="weightPerSqFt" value={product.dimensions?.weightPerSqFt} path={['dimensions', 'weightPerSqFt']} onChange={handleFieldChange} />
          </FieldSection>

          {/* Performance & Appearance */}
          <FieldSection title="Specifications">
            <EditableField label="stc" value={product.performanceRatings?.stc} path={['performanceRatings', 'stc']} onChange={handleFieldChange} />
            <EditableField label="fireRating" value={product.performanceRatings?.fireRating} path={['performanceRatings', 'fireRating']} onChange={handleFieldChange} />
            <EditableField label="acousticRating" value={product.performanceRatings?.acousticRating} path={['performanceRatings', 'acousticRating']} onChange={handleFieldChange} />
            <EditableField label="color" value={product.appearance?.color} path={['appearance', 'color']} onChange={handleFieldChange} />
            <EditableField label="finish" value={product.appearance?.finish} path={['appearance', 'finish']} onChange={handleFieldChange} />
            <EditableField label="trim" value={product.appearance?.trim} path={['appearance', 'trim']} onChange={handleFieldChange} />
            <EditableField label="surface" value={product.appearance?.surface} path={['appearance', 'surface']} onChange={handleFieldChange} />
          </FieldSection>

          {/* Pricing - Complete breakdown with all dollar values > $0 */}
          <FieldSection title="Pricing Breakdown">
            {/* Main Prices */}
            <div className="space-y-1">
              <EditableField label="unitPrice" value={product.pricing?.unitPrice} path={['pricing', 'unitPrice']} onChange={handleFieldChange} />
              <EditableField label="totalPrice" value={product.pricing?.totalPrice} path={['pricing', 'totalPrice']} onChange={handleFieldChange} />
            </div>

            {/* Material Pricing */}
            {product.pricing?.material && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Material Costs</span>
                <div className="mt-1 space-y-1">
                  <EditableField label="subtotal" value={product.pricing.material.subtotal} path={['pricing', 'material', 'subtotal']} onChange={handleFieldChange} />
                  <EditableField label="pricePerSqFt" value={product.pricing.material.pricePerSqFt} path={['pricing', 'material', 'pricePerSqFt']} onChange={handleFieldChange} />
                  {/* Material Components breakdown */}
                  {product.pricing.material.components && Object.entries(product.pricing.material.components).length > 0 && (
                    <div className="ml-2 mt-1 space-y-0.5">
                      {Object.entries(product.pricing.material.components).map(([name, value]) => (
                        shouldShowPrice(value) && (
                          <div key={name} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-gray-500">{formatLabel(name)}:</span>
                            <span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(value)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Freight Pricing */}
            {product.pricing?.freight && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Freight & Shipping</span>
                <div className="mt-1 space-y-1">
                  <EditableField label="freightTotal" value={product.pricing.freight.total} path={['pricing', 'freight', 'total']} onChange={handleFieldChange} />
                  {/* Freight Items breakdown */}
                  {product.pricing.freight.items && Object.entries(product.pricing.freight.items).length > 0 && (
                    <div className="ml-2 mt-1 space-y-0.5">
                      {Object.entries(product.pricing.freight.items).map(([name, value]) => (
                        shouldShowPrice(value) && (
                          <div key={name} className="flex items-center justify-between text-xs py-0.5">
                            <span className="text-gray-500">{formatLabel(name)}:</span>
                            <span className="font-medium text-green-700 dark:text-green-400">{formatCurrency(value)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </FieldSection>

          {/* Core Fields */}
          <FieldSection title="Basic Info">
            <EditableField label="name" value={product.name} path={['name']} onChange={handleFieldChange} />
            <EditableField label="quantity" value={product.quantity} path={['quantity']} onChange={handleFieldChange} />
            <EditableField label="unit" value={product.unit} path={['unit']} onChange={handleFieldChange} />
            <EditableField label="description" value={product.description} path={['description']} onChange={handleFieldChange} />
          </FieldSection>

          {/* Certifications */}
          {product.certifications && product.certifications.length > 0 && (
            <FieldSection title="Certifications">
              <div className="flex flex-wrap gap-1 mt-1">
                {product.certifications.map((cert, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{cert}</Badge>
                ))}
              </div>
            </FieldSection>
          )}

          {/* Raw Data (catch-all for other extracted fields not shown above) */}
          {product.rawData && (() => {
            // Filter out keys already displayed in other sections
            const displayedKeys = new Set([
              'id', 'name', 'quantity', 'unit', 'description', 'isConfigurable',
              'manufacturer', 'productDomain', 'productLine', 'series', 'model',
              'dimensions', 'performanceRatings', 'appearance', 'certifications',
              'pricing', 'options', 'selectedConfiguration', 'rawData',
              'frame', 'closures', 'seals', 'track', 'stacking', 'materials'
            ]);
            const additionalEntries = Object.entries(product.rawData)
              .filter(([key]) => !displayedKeys.has(key));

            return additionalEntries.length > 0 && (
              <FieldSection title="Additional Extracted Data">
                {additionalEntries.map(([key, value]) => (
                  <EditableField
                    key={key}
                    label={key}
                    value={value}
                    path={['rawData', key]}
                    onChange={handleFieldChange}
                    onDelete={handleFieldDelete}
                  />
                ))}
              </FieldSection>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// Helper component for consistent section styling
function FieldSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pb-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {title}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}
