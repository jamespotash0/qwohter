/**
 * Create Custom Form Dialog
 * Modal for creating a new form with name, form type, and starting proposal number configuration
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateCustomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    formType: string;
    startingProposalNumber: string;
  }) => void;
  isLoading?: boolean;
}

// Preset form type options
const PRESET_FORM_TYPES = [
  { value: 'quote', label: 'Quote' },
  { value: 'service_request', label: 'Service Request' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'change_order', label: 'Change Order' },
];

// Helper function to generate starting number suggestion from form name
function generateStartingNumberSuggestion(name: string): string {
  if (!name) return '';

  // Extract initials from form name
  const words = name.trim().split(/\s+/);
  let prefix = '';

  if (words.length === 1) {
    // Single word: take first 2-3 letters
    prefix = words[0].substring(0, 2).toUpperCase();
  } else {
    // Multiple words: take first letter of each word (up to 3)
    prefix = words
      .slice(0, 3)
      .map((word) => word.charAt(0).toUpperCase())
      .join('');
  }

  // Return prefix with starting number 1
  return `${prefix}001`;
}

export function CreateCustomFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateCustomFormDialogProps) {
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [formType, setFormType] = useState('quote');
  const [startingProposalNumber, setStartingProposalNumber] = useState('');
  const [isAutoNumber, setIsAutoNumber] = useState(true);

  // Auto-generate starting number suggestion when form name changes
  useEffect(() => {
    if (isAutoNumber && formName) {
      const suggestion = generateStartingNumberSuggestion(formName);
      setStartingProposalNumber(suggestion);
    }
  }, [formName, isAutoNumber]);

  // Handle starting number manual editing
  const handleNumberChange = (value: string) => {
    setIsAutoNumber(false);
    setStartingProposalNumber(value);
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !startingProposalNumber.trim()) return;

    onSubmit({
      name: formName.trim(),
      description: description.trim(),
      formType: formType.trim(),
      startingProposalNumber: startingProposalNumber.trim(),
    });
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormName('');
      setDescription('');
      setFormType('quote');
      setStartingProposalNumber('');
      setIsAutoNumber(true);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Custom Form</DialogTitle>
            <DialogDescription>
              Configure your custom form template. Set the starting proposal number which will auto-increment with each new quote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Form Name */}
            <div className="space-y-2">
              <Label htmlFor="form-name">
                Form Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="form-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Emergency Repair Requests"
                required
                autoFocus
              />
            </div>

            {/* Form Description */}
            <div className="space-y-2">
              <Label htmlFor="form-description">
                Description
              </Label>
              <Textarea
                id="form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this form..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Optional: Provide context for this form template
              </p>
            </div>

            {/* Form Type - Combobox */}
            <div className="space-y-2">
              <Label htmlFor="form-type">
                Form Type <span className="text-red-500">*</span>
              </Label>
              <Input
                id="form-type"
                list="form-type-options"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                placeholder="Select or type a form type"
                required
              />
              <datalist id="form-type-options">
                {PRESET_FORM_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </datalist>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose from preset types or enter your own custom type
              </p>
            </div>

            {/* Starting Proposal Number */}
            <div className="space-y-2">
              <Label htmlFor="starting-number">
                Starting Proposal Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="starting-number"
                value={startingProposalNumber}
                onChange={(e) => handleNumberChange(e.target.value)}
                placeholder="Q1200"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auto-suggested based on form name. This number will auto-increment.
                <br />
                Example: "Q1200" → "Q1201" → "Q1202", or "ER-2025-001" → "ER-2025-002"
              </p>
            </div>

            {/* Workflow Status Information */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Default Proposal Workflow
                </h4>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Customizable later
                </span>
              </div>

              <div className="space-y-2">
                {/* Required Statuses */}
                <div>
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Required Statuses:
                  </p>
                  <div className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 flex-wrap">
                    <span className="px-2 py-1 rounded bg-blue-200 dark:bg-blue-900/70 whitespace-nowrap font-medium">Draft</span>
                    <span className="text-blue-400">→</span>
                    <span className="px-2 py-1 rounded bg-blue-200 dark:bg-blue-900/70 whitespace-nowrap font-medium">Submitted</span>
                    <span className="text-blue-400">→</span>
                    <span className="px-2 py-1 rounded bg-blue-200 dark:bg-blue-900/70 whitespace-nowrap font-medium">Accepted</span>
                    <span className="text-blue-400">/</span>
                    <span className="px-2 py-1 rounded bg-blue-200 dark:bg-blue-900/70 whitespace-nowrap font-medium">Rejected</span>
                    <span className="text-blue-400">→</span>
                    <span className="px-2 py-1 rounded bg-blue-200 dark:bg-blue-900/70 whitespace-nowrap font-medium">Paid</span>
                  </div>
                </div>

                {/* Optional Statuses */}
                <div>
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Optional Statuses:
                  </p>
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 flex-wrap">
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 whitespace-nowrap">Completed</span>
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 whitespace-nowrap">Invoiced</span>
                    <span className="text-xs text-blue-500 dark:text-blue-400">+ Add more in Form Builder</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                Required statuses are locked. Optional statuses can be added, removed, or renamed in the Form Builder settings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!formName.trim() || !startingProposalNumber.trim() || isLoading}>
              {isLoading ? 'Creating...' : 'Create Form'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
