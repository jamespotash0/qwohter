import { type FormField } from '@/lib/types/forms';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Slider } from '@/components/ui/slider';
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
    // Use field_type from formsStore
    switch (field.field_type) {
      case 'input':
        // formsStore 'input' field uses input_type to determine the actual HTML input type
        const inputType = field.input_type || 'text';
        const isNumberInput = inputType === 'number' || field.number_format;

        return (
          <Input
            type={inputType}
            value={value || ''}
            onChange={(e) => {
              if (isNumberInput) {
                onChange(e.target.value ? parseFloat(e.target.value) : '');
              } else {
                onChange(e.target.value);
              }
            }}
            placeholder={field.placeholder}
            disabled={readonly}
            required={field.required}
            minLength={field.minLength}
            maxLength={field.maxLength}
            pattern={field.pattern}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={readonly}
            required={field.required}
            minLength={field.minLength}
            maxLength={field.maxLength}
            rows={4}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={readonly}
            required={field.required}
          />
        );

      case 'dropdown':
        return (
          <Select value={value || ''} onValueChange={onChange} disabled={readonly}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any, index: number) => (
                <SelectItem key={option.value || index} value={String(option.value || option)}>
                  {option.label || option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'radio':
        return (
          <RadioGroup value={value || ''} onValueChange={onChange} disabled={readonly}>
            {field.options?.map((option: any, index: number) => (
              <div key={option.value || index} className="flex items-center space-x-2">
                <RadioGroupItem value={String(option.value || option)} id={`${field.id}-${option.value || index}`} />
                <Label htmlFor={`${field.id}-${option.value || index}`}>{option.label || option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'checkbox':
        // formsStore checkbox can be used as a toggle switch
        if (field.uiVariant === 'toggle') {
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
        }

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

      case 'product_selector':
        // Placeholder for product selector - needs custom implementation
        return (
          <div className="border rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-600">Product Selector (Not yet implemented)</p>
          </div>
        );

      case 'math':
        // Math fields are calculated and readonly
        return (
          <Input
            type="text"
            value={value || field.calculation || ''}
            disabled={true}
            className="bg-gray-50"
          />
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

  // Special handling for checkbox (label is rendered differently)
  if (field.field_type === 'checkbox' && field.uiVariant !== 'toggle') {
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
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderField()}
      {field.helpText && (
        <p className="text-xs text-gray-500">{field.helpText}</p>
      )}
      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
}
