/**
 * Product Specifications Form
 * Dynamic form based on product model's field definitions
 * Stunning design with real-time validation
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle2, DollarSign, Package, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ProductModel, FieldDefinition, ProductSelection } from '@/stores/products/productStore';

interface ProductSpecificationsFormProps {
  model: ProductModel;
  productHierarchy: {
    type: string;
    type_id: string;
    manufacturer: string;
    manufacturer_id: string;
    category: string;
    category_id: string;
    series: string;
    series_id: string;
  };
  onSubmit: (selection: ProductSelection) => void;
  onCancel: () => void;
  className?: string;
}

export function ProductSpecificationsForm({
  model,
  productHierarchy,
  onSubmit,
  onCancel,
  className,
}: ProductSpecificationsFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form with defaults
  useEffect(() => {
    const initialData: Record<string, any> = {};
    model.field_definitions.forEach((field) => {
      if (field.default !== undefined) {
        initialData[field.id] = field.default;
      }
    });
    setFormData(initialData);
  }, [model]);

  // Calculate total price
  const calculatePrice = () => {
    const quantity = parseInt(formData.quantity || '1');
    const unitPrice = model.base_price || 0;
    return quantity * unitPrice;
  };

  const totalPrice = calculatePrice();

  // Validate a single field
  const validateField = (field: FieldDefinition, value: any): string | null => {
    if (field.required && (value === undefined || value === '' || value === null)) {
      return `${field.label} is required`;
    }

    if (field.type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return `${field.label} must be a number`;
      }
      if (field.min !== undefined && numValue < field.min) {
        return `${field.label} must be at least ${field.min}`;
      }
      if (field.max !== undefined && numValue > field.max) {
        return `${field.label} must be at most ${field.max}`;
      }
    }

    if (field.type === 'text' && field.pattern) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(value)) {
        return `${field.label} format is invalid`;
      }
    }

    return null;
  };

  // Validate all fields
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    model.field_definitions.forEach((field) => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    setTouched((prev) => ({ ...prev, [fieldId]: true }));

    // Clear error for this field
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    model.field_definitions.forEach((field) => {
      allTouched[field.id] = true;
    });
    setTouched(allTouched);

    if (!validateAll()) {
      return;
    }

    const selection: ProductSelection = {
      product_model_id: model.id,
      product_hierarchy: {
        ...productHierarchy,
        model: model.model_name,
        model_number: model.model_number,
      },
      specifications: formData,
      pricing: {
        unit_price: model.base_price || 0,
        quantity: parseInt(formData.quantity || '1'),
        subtotal: totalPrice,
      },
    };

    onSubmit(selection);
  };

  const renderField = (field: FieldDefinition) => {
    const value = formData[field.id];
    const error = touched[field.id] ? errors[field.id] : null;
    const hasError = !!error;
    const isValid = touched[field.id] && !error && value;

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.label}
              {field.required && <span className="text-destructive text-xs">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={field.id}
                type={field.type}
                value={value || ''}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                className={cn(
                  'pr-10 transition-all',
                  hasError && 'border-destructive focus-visible:ring-destructive',
                  isValid && 'border-green-500 focus-visible:ring-green-500'
                )}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <AnimatePresence mode="wait">
                  {hasError && (
                    <motion.div
                      key="error"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                    >
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    </motion.div>
                  )}
                  {isValid && (
                    <motion.div
                      key="success"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-destructive flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" />
                {error}
              </motion.p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.label}
              {field.required && <span className="text-destructive text-xs">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, [field.id]: true }))}
              placeholder={field.placeholder}
              rows={4}
              className={cn(
                hasError && 'border-destructive focus-visible:ring-destructive',
                isValid && 'border-green-500 focus-visible:ring-green-500'
              )}
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="flex items-center gap-2">
              {field.label}
              {field.required && <span className="text-destructive text-xs">*</span>}
            </Label>
            <Select
              value={value || ''}
              onValueChange={(val) => handleFieldChange(field.id, val)}
            >
              <SelectTrigger
                className={cn(
                  hasError && 'border-destructive',
                  isValid && 'border-green-500'
                )}
              >
                <SelectValue placeholder={field.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-3 space-y-0 pt-2">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(field.id, checked)}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor={field.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {field.label}
              </Label>
              {field.placeholder && (
                <p className="text-xs text-muted-foreground">{field.placeholder}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('w-full', className)}
    >
      <Card className="shadow-lg border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">
                  {model.model_number}
                </Badge>
                <Badge className="bg-gradient-to-r from-primary to-primary/70">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Selected
                </Badge>
              </div>
              <CardTitle className="text-xl">{model.model_name}</CardTitle>
              {model.description && (
                <CardDescription className="mt-2">{model.description}</CardDescription>
              )}
            </div>
            {model.base_price && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">Base Price</p>
                <p className="text-2xl font-bold text-primary">
                  ${model.base_price.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">per {model.price_unit || 'unit'}</p>
              </div>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Specifications Section */}
            {model.specifications && Object.keys(model.specifications).length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Product Specifications
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                  {Object.entries(model.specifications).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Dynamic Form Fields */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {model.field_definitions.map(renderField)}
              </div>
            </div>

            {/* Price Summary */}
            {model.base_price && formData.quantity && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-lg bg-primary/5 border border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Total Price</span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ${totalPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formData.quantity} × ${model.base_price.toLocaleString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                Add to Quote
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
