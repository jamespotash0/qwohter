/**
 * ModelOptionFormDialog
 * Dialog for creating/editing model option settings
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  optionAdminService,
  type ModelOption,
  type OptionGroup,
} from '../services/optionAdminService';

type DisplayGroup = 'primary' | 'secondary' | 'advanced' | 'hidden';

const DISPLAY_GROUPS: { value: DisplayGroup; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'hidden', label: 'Hidden' },
];

interface FormData {
  option_group_id: string;
  display_order: number;
  display_group: DisplayGroup;
  grid_span: number;
  placeholder: string;
  help_text: string;
  is_required: boolean;
  is_multi_select: boolean;
  is_manual_select: boolean;
  is_visible: boolean;
  default_input_value: string;
  min_value: string;
  max_value: string;
  step_value: string;
}

const DEFAULT_FORM_DATA: FormData = {
  option_group_id: '',
  display_order: 0,
  display_group: 'primary',
  grid_span: 1,
  placeholder: '',
  help_text: '',
  is_required: false,
  is_multi_select: false,
  is_manual_select: true,
  is_visible: true,
  default_input_value: '',
  min_value: '',
  max_value: '',
  step_value: '',
};

interface ModelOptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOption: ModelOption | null;
  modelId: string;
  modelName: string;
  availableGroups: OptionGroup[];
  existingOptionsCount: number;
  onSaved: () => void;
}

export function ModelOptionFormDialog({
  open,
  onOpenChange,
  editingOption,
  modelId,
  modelName,
  availableGroups,
  existingOptionsCount,
  onSaved,
}: ModelOptionFormDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);

  // Update form data when editing option changes
  useEffect(() => {
    if (editingOption) {
      setFormData({
        option_group_id: editingOption.option_group_id,
        display_order: editingOption.display_order,
        display_group: editingOption.display_group,
        grid_span: editingOption.grid_span,
        placeholder: editingOption.placeholder || '',
        help_text: editingOption.help_text || '',
        is_required: editingOption.is_required,
        is_multi_select: editingOption.is_multi_select,
        is_manual_select: editingOption.is_manual_select,
        is_visible: editingOption.is_visible,
        default_input_value: editingOption.default_input_value || '',
        min_value: editingOption.min_value?.toString() || '',
        max_value: editingOption.max_value?.toString() || '',
        step_value: editingOption.step_value?.toString() || '',
      });
    } else {
      setFormData({
        ...DEFAULT_FORM_DATA,
        display_order: existingOptionsCount,
      });
    }
  }, [editingOption, existingOptionsCount, open]);

  const handleSave = async () => {
    if (!formData.option_group_id) {
      toast({ title: 'Validation Error', description: 'Please select an option group', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        display_order: formData.display_order,
        display_group: formData.display_group,
        grid_span: formData.grid_span,
        placeholder: formData.placeholder || null,
        help_text: formData.help_text || null,
        is_required: formData.is_required,
        is_multi_select: formData.is_multi_select,
        is_manual_select: formData.is_manual_select,
        is_visible: formData.is_visible,
        default_input_value: formData.default_input_value || null,
        min_value: formData.min_value ? parseFloat(formData.min_value) : null,
        max_value: formData.max_value ? parseFloat(formData.max_value) : null,
        step_value: formData.step_value ? parseFloat(formData.step_value) : null,
      };

      if (editingOption) {
        await optionAdminService.updateModelOption(editingOption.id, payload);
        toast({ title: 'Option updated' });
      } else {
        await optionAdminService.createModelOption({
          model_id: modelId,
          option_group_id: formData.option_group_id,
          ...payload,
        });
        toast({ title: 'Option added to model' });
      }
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingOption ? 'Edit Option Settings' : 'Add Option to Model'}</DialogTitle>
          <DialogDescription>
            Configure how this option appears and behaves for {modelName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Option Group Select */}
          <div className="col-span-2">
            <label className="text-sm font-medium">Option Group *</label>
            <Select
              value={formData.option_group_id}
              onValueChange={(v) => setFormData({ ...formData, option_group_id: v })}
              disabled={!!editingOption}
            >
              <SelectTrigger><SelectValue placeholder="Select option group" /></SelectTrigger>
              <SelectContent>
                {availableGroups.map((og) => (
                  <SelectItem key={og.id} value={og.id}>
                    {og.name} ({og.field_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display Settings */}
          <div>
            <label className="text-sm font-medium">Display Order</label>
            <Input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Display Group</label>
            <Select
              value={formData.display_group}
              onValueChange={(v: DisplayGroup) => setFormData({ ...formData, display_group: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISPLAY_GROUPS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Grid Span (1-4)</label>
            <Input
              type="number"
              min={1}
              max={4}
              value={formData.grid_span}
              onChange={(e) => setFormData({ ...formData, grid_span: parseInt(e.target.value) || 1 })}
            />
          </div>

          {/* Text Fields */}
          <div>
            <label className="text-sm font-medium">Placeholder</label>
            <Input
              value={formData.placeholder}
              onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
              placeholder="e.g., Select an option..."
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">Help Text</label>
            <Input
              value={formData.help_text}
              onChange={(e) => setFormData({ ...formData, help_text: e.target.value })}
              placeholder="Additional context for this field"
            />
          </div>

          {/* Numeric Constraints (for input fields) */}
          <div>
            <label className="text-sm font-medium">Min Value</label>
            <Input
              type="number"
              value={formData.min_value}
              onChange={(e) => setFormData({ ...formData, min_value: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Max Value</label>
            <Input
              type="number"
              value={formData.max_value}
              onChange={(e) => setFormData({ ...formData, max_value: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Step Value</label>
            <Input
              type="number"
              step="any"
              value={formData.step_value}
              onChange={(e) => setFormData({ ...formData, step_value: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Default Value</label>
            <Input
              value={formData.default_input_value}
              onChange={(e) => setFormData({ ...formData, default_input_value: e.target.value })}
            />
          </div>

          {/* Boolean Flags */}
          <div className="col-span-2 flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_required}
                onCheckedChange={(c) => setFormData({ ...formData, is_required: !!c })}
              />
              <span className="text-sm">Required</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_multi_select}
                onCheckedChange={(c) => setFormData({ ...formData, is_multi_select: !!c })}
              />
              <span className="text-sm">Multi-select</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_manual_select}
                onCheckedChange={(c) => setFormData({ ...formData, is_manual_select: !!c })}
              />
              <span className="text-sm">Manual select</span>
            </label>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={formData.is_visible}
                onCheckedChange={(c) => setFormData({ ...formData, is_visible: !!c })}
              />
              <span className="text-sm">Visible</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editingOption ? 'Save Changes' : 'Add Option'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
