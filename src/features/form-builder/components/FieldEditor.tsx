import { useState, useEffect } from 'react';
import { useFormBuilderStore } from '../store/formBuilderStore';
import { FieldOption, ConditionalLogic } from '../types';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function FieldEditor() {
  const {
    currentForm,
    uiState,
    updateField,
    setShowFieldEditor,
    setSelectedField
  } = useFormBuilderStore();

  const selectedTab = currentForm?.tabs.find(tab =>
    tab.fields.some(f => f.id === uiState.selectedField)
  );
  const selectedField = selectedTab?.fields.find(f => f.id === uiState.selectedField);

  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [helpText, setHelpText] = useState('');
  const [defaultValue, setDefaultValue] = useState('');
  const [width, setWidth] = useState<'full' | 'half' | 'third'>('full');
  const [required, setRequired] = useState(false);
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [minLength, setMinLength] = useState('');
  const [maxLength, setMaxLength] = useState('');
  const [pattern, setPattern] = useState('');
  const [options, setOptions] = useState<FieldOption[]>([]);
  const [conditionalLogic, setConditionalLogic] = useState<ConditionalLogic[]>([]);

  useEffect(() => {
    if (selectedField) {
      setFieldName(selectedField.name);
      setFieldLabel(selectedField.label);
      setPlaceholder(selectedField.placeholder || '');
      setHelpText(selectedField.helpText || '');
      setDefaultValue(selectedField.defaultValue || '');
      setWidth(selectedField.width || 'full');
      setRequired(selectedField.validation?.required || false);
      setMinValue(selectedField.validation?.min?.toString() || '');
      setMaxValue(selectedField.validation?.max?.toString() || '');
      setMinLength(selectedField.validation?.minLength?.toString() || '');
      setMaxLength(selectedField.validation?.maxLength?.toString() || '');
      setPattern(selectedField.validation?.pattern || '');
      setOptions(selectedField.options || []);
      setConditionalLogic(selectedField.showIf || []);
    }
  }, [selectedField]);

  const handleSave = () => {
    if (!selectedTab || !selectedField) return;

    updateField(selectedTab.id, selectedField.id, {
      name: fieldName,
      label: fieldLabel,
      placeholder,
      helpText,
      defaultValue,
      width,
      validation: {
        required,
        ...(minValue && { min: parseFloat(minValue) }),
        ...(maxValue && { max: parseFloat(maxValue) }),
        ...(minLength && { minLength: parseInt(minLength) }),
        ...(maxLength && { maxLength: parseInt(maxLength) }),
        ...(pattern && { pattern })
      },
      options: options.length > 0 ? options : undefined,
      showIf: conditionalLogic.length > 0 ? conditionalLogic : undefined
    });
  };

  const handleClose = () => {
    setShowFieldEditor(false);
    setSelectedField(null);
  };

  const addOption = () => {
    setOptions([...options, { label: '', value: '' }]);
  };

  const updateOption = (index: number, field: 'label' | 'value', value: string) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const deleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const addConditionalLogic = () => {
    setConditionalLogic([
      ...conditionalLogic,
      { fieldId: '', operator: 'equals', value: '' }
    ]);
  };

  const updateConditionalLogic = (
    index: number,
    field: keyof ConditionalLogic,
    value: any
  ) => {
    const newLogic = [...conditionalLogic];
    newLogic[index] = { ...newLogic[index], [field]: value };
    setConditionalLogic(newLogic);
  };

  const deleteConditionalLogic = (index: number) => {
    setConditionalLogic(conditionalLogic.filter((_, i) => i !== index));
  };

  const availableFields = currentForm?.tabs
    .flatMap(tab => tab.fields)
    .filter(f => f.id !== selectedField?.id) || [];

  const showOptions = selectedField && ['dropdown', 'multi-select', 'radio'].includes(selectedField.type);
  const showNumberValidation = selectedField && ['number', 'currency', 'slider'].includes(selectedField.type);
  const showTextValidation = selectedField && ['text', 'textarea', 'email', 'url'].includes(selectedField.type);

  if (!selectedField || !selectedTab) return null;

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
        <h3 className="font-semibold text-gray-900">Field Settings</h3>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Basic Settings
          </h4>

          <div>
            <Label htmlFor="field-label">Field Label *</Label>
            <Input
              id="field-label"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              onBlur={handleSave}
              placeholder="e.g., Client Name"
            />
          </div>

          <div>
            <Label htmlFor="field-name">Variable Name *</Label>
            <Input
              id="field-name"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              onBlur={handleSave}
              placeholder="e.g., clientName"
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used in templates as {`{${fieldName}}`}
            </p>
          </div>

          <div>
            <Label htmlFor="placeholder">Placeholder</Label>
            <Input
              id="placeholder"
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              onBlur={handleSave}
              placeholder="e.g., Enter client name..."
            />
          </div>

          <div>
            <Label htmlFor="help-text">Help Text</Label>
            <Textarea
              id="help-text"
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              onBlur={handleSave}
              placeholder="Additional help text for users"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="default-value">Default Value</Label>
            <Input
              id="default-value"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              onBlur={handleSave}
            />
          </div>

          <div>
            <Label htmlFor="width">Field Width</Label>
            <Select value={width} onValueChange={(val: any) => { setWidth(val); handleSave(); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Width</SelectItem>
                <SelectItem value="half">Half Width</SelectItem>
                <SelectItem value="third">Third Width</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Options (for dropdown, multi-select, radio) */}
        {showOptions && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                Options
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add
              </Button>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-gray-400 mt-2 flex-shrink-0" />
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => updateOption(index, 'label', e.target.value)}
                      onBlur={handleSave}
                      placeholder="Label"
                      className="text-sm"
                    />
                    <Input
                      value={option.value}
                      onChange={(e) => updateOption(index, 'value', e.target.value)}
                      onBlur={handleSave}
                      placeholder="Value"
                      className="text-sm font-mono"
                    />
                  </div>
                  <button
                    onClick={() => { deleteOption(index); handleSave(); }}
                    className="p-1 hover:bg-red-100 rounded text-red-600 mt-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
            Validation
          </h4>

          <div className="flex items-center justify-between">
            <Label htmlFor="required">Required Field</Label>
            <Switch
              id="required"
              checked={required}
              onCheckedChange={(checked) => { setRequired(checked); handleSave(); }}
            />
          </div>

          {showNumberValidation && (
            <>
              <div>
                <Label htmlFor="min-value">Minimum Value</Label>
                <Input
                  id="min-value"
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  onBlur={handleSave}
                />
              </div>
              <div>
                <Label htmlFor="max-value">Maximum Value</Label>
                <Input
                  id="max-value"
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  onBlur={handleSave}
                />
              </div>
            </>
          )}

          {showTextValidation && (
            <>
              <div>
                <Label htmlFor="min-length">Minimum Length</Label>
                <Input
                  id="min-length"
                  type="number"
                  value={minLength}
                  onChange={(e) => setMinLength(e.target.value)}
                  onBlur={handleSave}
                />
              </div>
              <div>
                <Label htmlFor="max-length">Maximum Length</Label>
                <Input
                  id="max-length"
                  type="number"
                  value={maxLength}
                  onChange={(e) => setMaxLength(e.target.value)}
                  onBlur={handleSave}
                />
              </div>
              <div>
                <Label htmlFor="pattern">Pattern (Regex)</Label>
                <Input
                  id="pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  onBlur={handleSave}
                  placeholder="e.g., ^[A-Z]{3}-\d{4}$"
                  className="font-mono text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Conditional Logic */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Conditional Logic
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={addConditionalLogic}
              className="flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>

          {conditionalLogic.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                Show this field only when:
              </p>
              {conditionalLogic.map((logic, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-start justify-between">
                    <Label className="text-xs">Condition {index + 1}</Label>
                    <button
                      onClick={() => { deleteConditionalLogic(index); handleSave(); }}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <Select
                    value={logic.fieldId}
                    onValueChange={(val) => {
                      updateConditionalLogic(index, 'fieldId', val);
                      handleSave();
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map(field => (
                        <SelectItem key={field.id} value={field.id}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={logic.operator}
                    onValueChange={(val: any) => {
                      updateConditionalLogic(index, 'operator', val);
                      handleSave();
                    }}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="notEquals">Not Equals</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="greaterThan">Greater Than</SelectItem>
                      <SelectItem value="lessThan">Less Than</SelectItem>
                      <SelectItem value="isEmpty">Is Empty</SelectItem>
                      <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                    </SelectContent>
                  </Select>

                  {!['isEmpty', 'isNotEmpty'].includes(logic.operator) && (
                    <Input
                      value={logic.value}
                      onChange={(e) => updateConditionalLogic(index, 'value', e.target.value)}
                      onBlur={handleSave}
                      placeholder="Value"
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
