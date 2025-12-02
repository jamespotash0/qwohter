/**
 * ProductsTable Component
 *
 * Card-row list with always-editable inputs for products.
 * Supports drag-and-drop reordering.
 */

import { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { Product, CreateProductInput, AmountUnit } from '@/lib/types/products';
import { PRODUCT_CATEGORIES, AMOUNT_UNITS } from '@/lib/types/products';
import { Trash2, Plus, GripVertical } from 'lucide-react';

interface ProductsTableProps {
  products: Product[];
  onEdit: (productId: string, input: CreateProductInput) => Promise<void>;
  onCreate: (input: CreateProductInput) => Promise<void>;
  onDelete: (productId: string) => void;
  onReorder: (productIds: string[]) => void;
  isLoading?: boolean;
  isSaving?: boolean;
}

interface SortableRowProps {
  product: Product;
  onEdit: (productId: string, input: CreateProductInput) => Promise<void>;
  onDelete: (productId: string) => void;
  isSaving: boolean;
}

const SortableProductRow = ({
  product,
  onEdit,
  onDelete,
  isSaving,
}: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties;

  // Handle field blur for existing product - saves on blur
  const handleFieldBlur = useCallback(
    async (field: string, value: string) => {
      const currentValue =
        field === 'display_id'
          ? product.display_id || ''
          : field === 'amount'
            ? product.amount !== null
              ? product.amount.toString()
              : ''
            : field === 'category'
              ? product.category || ''
              : field === 'amount_unit'
                ? product.amount_unit || 'Flat'
                : product.name;

      if (value === currentValue) return;

      const input: CreateProductInput = {
        name: product.name,
        display_id: product.display_id || undefined,
        category: product.category || undefined,
        amount: product.amount ?? undefined,
        amount_unit: product.amount_unit || 'Flat',
      };

      if (field === 'amount') {
        const parsed = parseFloat(value);
        input.amount = value === '' ? undefined : isNaN(parsed) ? undefined : parsed;
      } else if (field === 'category') {
        input.category = value || undefined;
      } else if (field === 'amount_unit') {
        input.amount_unit = value as AmountUnit;
      } else if (field === 'display_id') {
        if (!value.trim()) return;
        input.display_id = value.trim();
      } else if (field === 'name') {
        if (!value.trim()) return;
        input.name = value.trim();
      }

      await onEdit(product.id, input);
    },
    [product, onEdit]
  );

  // Format number with commas and 2 decimals
  const formatAmountDisplay = (value: string): string => {
    // Remove non-numeric except decimal
    const cleaned = value.replace(/[^\d.]/g, '');
    if (!cleaned) return '';

    const parts = cleaned.split('.');
    const intPart = parts[0];
    const decPart = parts[1]?.slice(0, 2) || '';

    // Add commas to integer part
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return decPart || cleaned.includes('.')
      ? `${withCommas}.${decPart}`
      : withCommas;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow empty, digits, commas, and one decimal with up to 2 places
    const cleaned = rawValue.replace(/[^\d.,]/g, '');
    const formatted = formatAmountDisplay(cleaned);
    e.target.value = formatted;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border rounded-lg"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Product ID */}
      <div className="w-28 flex-shrink-0">
        <Input
          defaultValue={product.display_id || ''}
          onBlur={(e) => handleFieldBlur('display_id', e.target.value)}
          placeholder="ID"
          className="h-11 text-sm font-mono rounded-sm"
          disabled={isSaving}
        />
      </div>

      {/* Name */}
      <div className="w-[400px] flex-shrink-0">
        <Input
          defaultValue={product.name}
          onBlur={(e) => handleFieldBlur('name', e.target.value)}
          placeholder="Product name"
          className="h-11 rounded-sm"
          disabled={isSaving}
        />
      </div>

      {/* Category */}
      <div className="w-52 flex-shrink-0">
        <Select
          defaultValue={product.category || undefined}
          onValueChange={(value) => handleFieldBlur('category', value)}
          disabled={isSaving}
        >
          <SelectTrigger className="h-11 rounded-sm">
            <SelectValue placeholder="Select category..." />
          </SelectTrigger>
          <SelectContent>
            {PRODUCT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="w-36 flex-shrink-0">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            $
          </span>
          <Input
            defaultValue={
              product.amount !== null
                ? product.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : ''
            }
            onBlur={(e) =>
              handleFieldBlur('amount', e.target.value.replace(/,/g, ''))
            }
            onChange={handleAmountChange}
            placeholder="Variable"
            className={`h-11 pl-6 rounded-sm ${product.amount === null ? 'placeholder:text-amber-500 placeholder:italic' : ''}`}
            disabled={isSaving}
          />
        </div>
      </div>

      {/* Unit */}
      <div className="w-32 flex-shrink-0">
        <Select
          defaultValue={product.amount_unit || undefined}
          onValueChange={(value) => handleFieldBlur('amount_unit', value)}
          disabled={isSaving}
        >
          <SelectTrigger className="h-11 rounded-sm">
            <SelectValue placeholder="Select unit..." />
          </SelectTrigger>
          <SelectContent>
            {AMOUNT_UNITS.map((unit) => (
              <SelectItem key={unit.value} value={unit.value}>
                {unit.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Delete */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(product.id)}
        disabled={isSaving}
        className="h-11 w-11 p-0 text-red-500 hover:text-red-700 bg-transparent hover:bg-transparent"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};

export const ProductsTable = ({
  products,
  onEdit,
  onCreate,
  onDelete,
  onReorder,
  isLoading = false,
  isSaving = false,
}: ProductsTableProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        const oldIndex = products.findIndex((p) => p.id === active.id);
        const newIndex = products.findIndex((p) => p.id === over.id);
        const reorderedProducts = arrayMove(products, oldIndex, newIndex);
        onReorder(reorderedProducts.map((p) => p.id));
      }
    },
    [products, onReorder]
  );

  const activeProduct = activeId ? products.find((p) => p.id === activeId) : null;

  const handleAddProduct = useCallback(async () => {
    await onCreate({ name: 'New Product' });
  }, [onCreate]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-card border rounded-lg"
          >
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-[400px]" />
            <Skeleton className="h-11 w-52" />
            <Skeleton className="h-11 w-36" />
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-11" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={products.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {products.map((product) => (
            <SortableProductRow
              key={product.id}
              product={product}
              onEdit={onEdit}
              onDelete={onDelete}
              isSaving={isSaving}
            />
          ))}
        </SortableContext>

        {/* Drag overlay for smooth dragging preview */}
        <DragOverlay>
          {activeProduct ? (
            <div className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-lg opacity-95">
              <div className="cursor-grabbing text-muted-foreground">
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="w-28 flex-shrink-0">
                <div className="h-11 px-3 flex items-center text-sm font-mono bg-muted/50 rounded-sm border">
                  {activeProduct.display_id || ''}
                </div>
              </div>
              <div className="w-[400px] flex-shrink-0">
                <div className="h-11 px-3 flex items-center bg-muted/50 rounded-sm border">
                  {activeProduct.name}
                </div>
              </div>
              <div className="w-52 flex-shrink-0">
                <div className="h-11 px-3 flex items-center bg-muted/50 rounded-sm border">
                  {activeProduct.category || 'No category'}
                </div>
              </div>
              <div className="w-36 flex-shrink-0">
                <div className="h-11 px-3 flex items-center bg-muted/50 rounded-sm border">
                  {activeProduct.amount !== null
                    ? `$${activeProduct.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : 'Variable'}
                </div>
              </div>
              <div className="w-32 flex-shrink-0">
                <div className="h-11 px-3 flex items-center bg-muted/50 rounded-sm border">
                  {activeProduct.amount_unit || 'Flat'}
                </div>
              </div>
              <div className="h-11 w-11" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add Product Button */}
      <button
        onClick={handleAddProduct}
        disabled={isSaving}
        className="flex items-center justify-center gap-2 p-3 w-full border-2 border-dashed rounded-lg hover:bg-muted/30 hover:border-muted-foreground/50 transition-colors text-muted-foreground disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add new product</span>
      </button>
    </div>
  );
};
