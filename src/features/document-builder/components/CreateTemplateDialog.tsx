/**
 * Create Template Dialog
 * Modal for creating a new document template with name, description, and linked form
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
import { useForms } from '@/hooks/queries/useForms';
import { FileText, Link } from 'lucide-react';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    linkedFormId: string | null;
  }) => void;
  isLoading?: boolean;
  organizationId?: string;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  organizationId,
}: CreateTemplateDialogProps) {
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [linkedFormId, setLinkedFormId] = useState<string | null>(null);

  // Fetch available forms for linking
  const { data: forms = [], isLoading: formsLoading } = useForms(organizationId);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!templateName.trim()) return;

    onSubmit({
      name: templateName.trim(),
      description: description.trim(),
      linkedFormId,
    });
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTemplateName('');
      setDescription('');
      setLinkedFormId(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto !bg-white [&>button]:hidden">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              New Document Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Template Name */}
            <div className="space-y-2">
              <Label htmlFor="template-name">
                Template Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Standard Proposal Template"
                required
                autoFocus
              />
            </div>

            {/* Template Description */}
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this template..."
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Optional: Provide context for when to use this template
              </p>
            </div>

            {/* Linked Form Selector */}
            <div className="space-y-2">
              <Label htmlFor="linked-form" className="flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-purple-600" />
                Link to Form
              </Label>
              <Select
                value={linkedFormId || 'none'}
                onValueChange={(value) => setLinkedFormId(value === 'none' ? null : value)}
              >
                <SelectTrigger id="linked-form">
                  <SelectValue placeholder="Select a form to link..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-gray-500">No form linked</span>
                  </SelectItem>
                  {formsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading forms...
                    </SelectItem>
                  ) : (
                    forms.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Linking a form allows you to use form field variables in your template.
                This can also be changed later in the template editor.
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">
                About Document Templates
              </h4>
              <ul className="text-xs text-blue-800 space-y-1.5">
                <li>• Templates define the layout and content of your generated documents</li>
                <li>• Use variables like <code className="bg-blue-100 px-1 rounded">{'{{client_name}}'}</code> to insert form data</li>
                <li>• Templates can be linked to multiple forms or used standalone</li>
              </ul>
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
              disabled={!templateName.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Creating...' : 'Continue to Editor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
