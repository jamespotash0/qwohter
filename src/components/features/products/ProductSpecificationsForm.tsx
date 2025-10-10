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

  // Initialize form with defaults from default_configurations JSONB
  useEffect(() => {
    const initialData: Record<string, any> = {};
    Object.entries(model.default_configurations || {}).forEach(([fieldKey, fieldDef]) => {
      if (fieldDef.default_value !== undefined && fieldDef.default_value !== null) {
        initialData[fieldKey] = fieldDef.default_value;
      }
    });
    setFormData(initialData);
  }, [model]);

  // Calculate total price (if quantity field exists)
  const calculatePrice = () => {
    const quantity = parseInt(formData.Quantity || formData.quantity || '1');
    // Note: base_price may not exist in all models, default to 0
    const unitPrice = 0; // Will be calculated elsewhere or user-provided
    return quantity * unitPrice;
  };

  const totalPrice = calculatePrice();

  // Validate a single field based on JSONB field definition
  const validateField = (fieldKey: string, fieldDef: FieldDefinition, value: any): string | null => {
    const label = fieldKey.replace(/([A-Z])/g, ' $1').trim(); // Convert camelCase to readable

    if (fieldDef.required && (value === undefined || value === '' || value === null)) {
      return `${label} is required`;
    }

    if (fieldDef.input_type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return `${label} must be a number`;
      }
    }

    return null;
  };

  // Validate all fields from default_configurations
  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    Object.entries(model.default_configurations || {}).forEach(([fieldKey, fieldDef]) => {
      const error = validateField(fieldKey, fieldDef, formData[fieldKey]);
      if (error) {
        newErrors[fieldKey] = error;
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
    Object.keys(model.default_configurations || {}).forEach((fieldKey) => {
      allTouched[fieldKey] = true;
    });
    setTouched(allTouched);

    if (!validateAll()) {
      return;
    }

    const selection: ProductSelection = {
      product_model_id: model.id,
      product_hierarchy: {
        ...productHierarchy,
        model: model.name, // Using 'name' field from ProductModel
        model_number: model.id, // Using ID as model number for now
      },
      specifications: formData,
      pricing: {
        unit_price: 0, // Will be calculated elsewhere
        quantity: parseInt(formData.Quantity || formData.quantity || '1'),
        subtotal: totalPrice,
      },
    };

    onSubmit(selection);
  };

  const renderField = (fieldKey: string, fieldDef: FieldDefinition) => {
    const value = formData[fieldKey];
    const error = touched[fieldKey] ? errors[fieldKey] : null;
    const hasError = !!error;
    const isValid = touched[fieldKey] && !error && value;

    // Generate label from field key (e.g., "Quantity" -> "Quantity", "wallHeight" -> "Wall Height")
    const label = fieldKey.replace(/([A-Z])/g, ' $1').trim();

    // Handle different field types based on field_type in JSONB
    switch (fieldDef.field_type) {
      case 'input':
        const inputType = fieldDef.input_type || 'string';
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center gap-2">
              {label}
              {fieldDef.required && <span className="text-destructive text-xs">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={fieldKey}
                type={inputType === 'number' ? 'number' : 'text'}
                value={value || ''}
                onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, [fieldKey]: true }))}
                placeholder={fieldDef.placeholder}
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
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center gap-2">
              {label}
              {fieldDef.required && <span className="text-destructive text-xs">*</span>}
            </Label>
            <Textarea
              id={fieldKey}
              value={value || ''}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, [fieldKey]: true }))}
              placeholder={fieldDef.placeholder}
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

      case 'dropdown':
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center gap-2">
              {label}
              {fieldDef.required && <span className="text-destructive text-xs">*</span>}
            </Label>
            <Select
              value={value?.toString() || ''}
              onValueChange={(val) => handleFieldChange(fieldKey, val)}
            >
              <SelectTrigger
                className={cn(
                  hasError && 'border-destructive',
                  isValid && 'border-green-500'
                )}
              >
                <SelectValue placeholder={fieldDef.placeholder || 'Select an option'} />
              </SelectTrigger>
              <SelectContent>
                {fieldDef.options?.map((option: any) => (
                  <SelectItem key={option.toString()} value={option.toString()}>
                    {option.toString()}
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
          <div key={fieldKey} className="flex items-start space-x-3 space-y-0 pt-2">
            <Checkbox
              id={fieldKey}
              checked={value || false}
              onCheckedChange={(checked) => handleFieldChange(fieldKey, checked)}
            />
            <div className="space-y-1 leading-none">
              <Label
                htmlFor={fieldKey}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </Label>
              {fieldDef.placeholder && (
                <p className="text-xs text-muted-foreground">{fieldDef.placeholder}</p>
              )}
            </div>
          </div>
        );

      case 'date':
        return (
          <div key={fieldKey} className="space-y-2">
            <Label htmlFor={fieldKey} className="flex items-center gap-2">
              {label}
              {fieldDef.required && <span className="text-destructive text-xs">*</span>}
            </Label>
            <Input
              id={fieldKey}
              type="date"
              value={value || ''}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, [fieldKey]: true }))}
              className={cn(
                hasError && 'border-destructive',
                isValid && 'border-green-500'
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

      case 'multi-select':
      case 'radio':
      case 'auto':
        // TODO: Implement these field types
        return (
          <div key={fieldKey} className="space-y-2">
            <Label className="flex items-center gap-2">
              {label}
              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
            </Label>
            <p className="text-xs text-muted-foreground">
              {fieldDef.field_type} field type not yet implemented
            </p>
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
                  {model.id.substring(0, 8)}
                </Badge>
                <Badge className="bg-gradient-to-r from-primary to-primary/70">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Selected
                </Badge>
              </div>
              <CardTitle className="text-xl">{model.name}</CardTitle>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dynamic Form Fields from default_configurations */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Package className="w-4 h-4" />
                Configuration
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(model.default_configurations || {}).map(([fieldKey, fieldDef]) =>
                  renderField(fieldKey, fieldDef)
                )}
              </div>
            </div>

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
