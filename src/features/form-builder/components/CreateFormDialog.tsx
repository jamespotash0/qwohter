/**
 * Create Form Dialog
 * Modal for creating a new form with name and document type configuration
 * Only shows document types that have been configured in Settings -> Document Sequences
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Warning } from '@phosphor-icons/react';
import { getConfiguredDocumentTypes } from '@/services/numberingConfigService';
import type { DocumentType } from '@/lib/types/forms';

interface CreateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    documentType: DocumentType;
  }) => void;
  isLoading?: boolean;
  organizationId?: string;
}

export function CreateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  organizationId,
}: CreateFormDialogProps) {
  const navigate = useNavigate();
  const [formName, setFormName] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('');
  const [configuredTypes, setConfiguredTypes] = useState<string[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);

  // Fetch configured document types when dialog opens
  useEffect(() => {
    if (open && organizationId) {
      setIsLoadingTypes(true);
      getConfiguredDocumentTypes(organizationId)
        .then((types) => {
          setConfiguredTypes(types);
          // Auto-select first type if available and none selected
          if (types.length > 0 && !documentType) {
            setDocumentType(types[0]);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch document types:', error);
          setConfiguredTypes([]);
        })
        .finally(() => {
          setIsLoadingTypes(false);
        });
    }
  }, [open, organizationId]);

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
      setDocumentType('');
    }
  }, [open]);

  // Navigate to settings to configure document sequences
  const handleGoToSettings = () => {
    onOpenChange(false);
    navigate('/settings?tab=organization');
  };

  const hasNoConfiguredTypes = !isLoadingTypes && configuredTypes.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto !bg-white [&>button]:hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900">New Form Template</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Warning: No document types configured */}
            {hasNoConfiguredTypes && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-amber-200 bg-amber-50">
                <Warning className="w-4 h-4 text-amber-600 flex-shrink-0" weight="fill" />
                <span className="text-xs text-amber-700">
                  No document sequences configured.
                </span>
                <button
                  type="button"
                  onClick={handleGoToSettings}
                  className="text-xs font-medium text-amber-800 hover:underline ml-auto"
                >
                  Go to Settings
                </button>
              </div>
            )}

            {/* Form Name */}
            <div className="space-y-1.5">
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
                disabled={hasNoConfiguredTypes}
              />
            </div>

            {/* Form Description - compact single line */}
            <div className="space-y-1.5">
              <Label htmlFor="form-description">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="form-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
                disabled={hasNoConfiguredTypes}
              />
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="document-type">
                Document Type <span className="text-red-500">*</span>
              </Label>
              {isLoadingTypes ? (
                <div className="h-10 rounded-md border border-gray-200 bg-gray-50 flex items-center px-3">
                  <span className="text-sm text-gray-500">Loading document types...</span>
                </div>
              ) : hasNoConfiguredTypes ? (
                <div className="h-10 rounded-md border border-gray-200 bg-gray-100 flex items-center px-3">
                  <span className="text-sm text-gray-400">No document types available</span>
                </div>
              ) : (
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value as DocumentType)}
                >
                  <SelectTrigger id="document-type">
                    <SelectValue placeholder="Select document type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-gray-500">
                Linked to <span className="font-medium">Settings → Document Sequences</span>
              </p>
              {!hasNoConfiguredTypes && (
                <p className="text-xs text-amber-600 mt-1">
                  Cannot change after first proposal
                </p>
              )}
            </div>

            {/* Workflow Status Information */}
            {!hasNoConfiguredTypes && (
              <div className="pt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Default Workflow</p>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Draft</span>
                  <span className="text-gray-400">→</span>
                  <span>Submitted</span>
                  <span className="text-gray-400">→</span>
                  <span>Won / Rejected</span>
                  <span className="text-gray-400">→</span>
                  <span>Paid</span>
                </div>
              </div>
            )}
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
              disabled={!formName.trim() || !documentType || isLoading || hasNoConfiguredTypes}
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
