/**
 * Create Form Dialog
 * Modal for creating a new form with name and document type configuration
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
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
import type { DocumentType } from '@/stores/forms/formsStore';

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    documentType: DocumentType;
  }) => void;
  isLoading?: boolean;
}

// Document type options (must match CHECK constraint in database)
// Currently only Proposal is supported - Invoice and Service_Request will be added later
const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'Proposal', label: 'Proposal' },
];

export function CreateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateFormDialogProps) {
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('Proposal');

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !documentType) return;

    onSubmit({
      name: formName.trim(),
      description: description.trim(),
      documentType,
    });
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormName('');
      setDescription('');
      setDocumentType('Proposal');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto !bg-white [&>button]:hidden">
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

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="document-type">
                Document Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as DocumentType)}
              >
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Categorizes this form template
              </p>
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
              disabled={!formName.trim() || !documentType || isLoading}
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
