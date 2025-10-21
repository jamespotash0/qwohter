import { FormField } from '../types';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DynamicFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  readonly?: boolean;
}

export function DynamicField({ field, value, onChange, readonly = false }: DynamicFieldProps) {
  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'url':
      case 'phone':
        return (
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readonly}
            required={field.validation?.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readonly}
            required={field.validation?.required}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            rows={4}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            placeholder={field.placeholder}
            disabled={readonly}
            required={field.validation?.required}
            min={field.validation?.min}
            max={field.validation?.max}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              type="number"
              step="0.01"
              value={value || ''}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              placeholder={field.placeholder}
              disabled={readonly}
              required={field.validation?.required}
              min={field.validation?.min}
              max={field.validation?.max}
              className="pl-8"
            />
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readonly}
            required={field.validation?.required}
          />
        );

      case 'time':
        return (
          <Input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readonly}
            required={field.validation?.required}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readonly}
            required={field.validation?.required}
          />
        );

      case 'dropdown':
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={readonly}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi-select':
        const selectedValues = value || [];
        return (
          <div className="space-y-2 border rounded-lg p-3">
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option.value}`}
                  checked={selectedValues.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selectedValues, option.value]);
                    } else {
                      onChange(selectedValues.filter((v: string) => v !== option.value));
                    }
                  }}
                  disabled={readonly}
                />
                <label
                  htmlFor={`${field.id}-${option.value}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      case 'radio':
        return (
          <RadioGroup value={value || ''} onValueChange={onChange} disabled={readonly}>
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <Label htmlFor={`${field.id}-${option.value}`}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={onChange}
              disabled={readonly}
            />
            <label
              htmlFor={field.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {field.label}
            </label>
          </div>
        );

      case 'switch':
        return (
          <div className="flex items-center justify-between">
            <Label htmlFor={field.id}>{field.label}</Label>
            <Switch
              id={field.id}
              checked={value || false}
              onCheckedChange={onChange}
              disabled={readonly}
            />
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{field.label}</Label>
              <span className="text-sm font-medium">{value || field.validation?.min || 0}</span>
            </div>
            <Slider
              value={[value || field.validation?.min || 0]}
              onValueChange={(vals) => onChange(vals[0])}
              min={field.validation?.min}
              max={field.validation?.max}
              step={1}
              disabled={readonly}
            />
          </div>
        );

      case 'rating':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => onChange(star)}
                disabled={readonly}
                className={`text-2xl transition-colors ${
                  star <= (value || 0) ? 'text-yellow-400' : 'text-gray-300'
                } hover:text-yellow-400 disabled:cursor-not-allowed`}
              >
                ★
              </button>
            ))}
          </div>
        );

      case 'color':
        return (
          <div className="flex gap-2">
            <Input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              disabled={readonly}
              className="w-20 h-10 p-1"
            />
            <Input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              disabled={readonly}
              className="flex-1 font-mono"
            />
          </div>
        );

      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0])}
            disabled={readonly}
            required={field.validation?.required}
          />
        );

      case 'cascading_product':
        // This will be implemented with product data integration
        return (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-500">
            Cascading Product Field (Coming Soon)
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readonly}
          />
        );
    }
  };

  // Special handling for checkbox and switch (label is rendered differently)
  if (['checkbox', 'switch', 'slider'].includes(field.type)) {
    return (
      <div className="space-y-2">
        {renderField()}
        {field.helpText && (
          <p className="text-xs text-gray-500">{field.helpText}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={field.id}>
        {field.label}
        {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderField()}
      {field.helpText && (
        <p className="text-xs text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}
