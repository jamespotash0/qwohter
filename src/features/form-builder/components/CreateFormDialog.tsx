/**
 * Create Form Dialog
 * Modal for creating a new form with name, form type, and starting proposal number configuration
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  // DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

interface CreateFormDialogProps {
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

// Preset form type options (must match CHECK constraint in database)
const PRESET_FORM_TYPES = [
  { value: 'Quote', label: 'Quote' },
  { value: 'Proposal', label: 'Proposal' },
  { value: 'Service Request', label: 'Service Request' },
  { value: 'Invoice', label: 'Invoice' },
  { value: 'Estimate', label: 'Estimate' },
  { value: 'Work Order', label: 'Work Order' },
  { value: 'Bid', label: 'Bid' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Custom', label: 'Custom' },
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

export function CreateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateFormDialogProps) {
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [formType, setFormType] = useState('');
  const [startingProposalNumber, setStartingProposalNumber] = useState('');
  const [isAutoNumber, setIsAutoNumber] = useState(true);
  const [customFormTypes, setCustomFormTypes] = useState<string[]>([]);
  const [showAddCustomType, setShowAddCustomType] = useState(false);
  const [newCustomType, setNewCustomType] = useState('');

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

    if (!formName.trim() || !startingProposalNumber.trim() || !formType.trim()) return;

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
      setFormType('');
      setStartingProposalNumber('');
      setIsAutoNumber(true);
      setShowAddCustomType(false);
      setNewCustomType('');
    }
  }, [open]);

  // Handle adding custom form type
  const handleAddCustomType = () => {
    if (newCustomType.trim() && !customFormTypes.includes(newCustomType.trim())) {
      setCustomFormTypes([...customFormTypes, newCustomType.trim()]);
      setFormType(newCustomType.trim());
      setNewCustomType('');
      setShowAddCustomType(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto !bg-white [&>button]:hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">New Form Template</DialogTitle>
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

            {/* Form Type and Starting Proposal Number - Inline */}
            <div className="grid grid-cols-2 gap-4">
              {/* Form Type - Select with Add New */}
              <div className="space-y-2">
                <Label htmlFor="form-type">
                  Form Type <span className="text-red-500">*</span>
                </Label>

                {showAddCustomType ? (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={newCustomType}
                        onChange={(e) => setNewCustomType(e.target.value)}
                        placeholder="Enter custom type..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomType();
                          } else if (e.key === 'Escape') {
                            setShowAddCustomType(false);
                            setNewCustomType('');
                          }
                        }}
                        autoFocus
                        className="pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCustomType(false);
                          setNewCustomType('');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddCustomType}
                      disabled={!newCustomType.trim()}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select
                      value={formType}
                      onValueChange={(value) => {
                        if (value === '__add_new__') {
                          setShowAddCustomType(true);
                        } else {
                          setFormType(value);
                        }
                      }}
                    >
                      <SelectTrigger id="form-type">
                        <SelectValue placeholder="Select form type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_FORM_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                        {customFormTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                        <SelectItem value="__add_new__" className="text-blue-600 font-medium">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            <span>Add new type...</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}

                <p className="text-xs text-gray-500">
                  {showAddCustomType ? 'Press Enter to add or Esc to cancel' : 'Select a preset type or add your own'}
                </p>
              </div>

              {/* Starting Proposal Number - Always Visible */}
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
                  Auto-suggested, will auto-increment
                </p>
              </div>
            </div>

            {/* Workflow Status Information */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Default Proposal Workflow
              </h4>

              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="px-3 py-1.5 rounded bg-gray-200 text-gray-900 whitespace-nowrap">Draft</span>
                <span className="text-gray-900">→</span>
                <span className="px-3 py-1.5 rounded bg-gray-200 text-gray-900 whitespace-nowrap">Submitted</span>
                <span className="text-gray-900">→</span>
                <span className="px-3 py-1.5 rounded bg-gray-200 text-gray-900 whitespace-nowrap">Accepted</span>
                <span className="text-gray-900">/</span>
                <span className="px-3 py-1.5 rounded bg-gray-200 text-gray-900 whitespace-nowrap">Rejected</span>
                <span className="text-gray-900">→</span>
                <span className="px-3 py-1.5 rounded bg-gray-200 text-gray-900 whitespace-nowrap">Paid</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formName.trim() || !startingProposalNumber.trim() || !formType.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Creating...' : 'Continue to Form Builder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
