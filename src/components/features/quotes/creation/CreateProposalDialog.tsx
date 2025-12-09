import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForms } from "@/hooks/queries";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";

// Helper to format document type for display
const formatDocumentType = (type: string | null | undefined): string => {
  if (!type) return '';
  return type.replace(/_/g, ' ');
};

export interface ProposalInitialData {
  projectName: string;
  formId: string;
}

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateProposal: (data: ProposalInitialData) => void;
}

const CreateProposalDialog = ({
  open,
  onOpenChange,
  onCreateProposal
}: CreateProposalDialogProps) => {
  // Form fields
  const [projectName, setProjectName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string>("");

  // Fetch user, organization and forms
  const user = useUser();
  const { organizationId } = useCurrentOrganization(user?.id || "");
  const { data: forms = [], isLoading: formsLoading } = useForms(organizationId || "");

  // Find the default form
  const defaultForm = useMemo(() => {
    return forms.find((f: { is_default?: boolean }) => f.is_default);
  }, [forms]);

  // Get selected form details (to show document type)
  const selectedForm = useMemo(() => {
    return forms.find((f: { id: string }) => f.id === selectedFormId);
  }, [forms, selectedFormId]);

  // Pre-select default form when dialog opens
  useEffect(() => {
    if (open && defaultForm && !selectedFormId) {
      setSelectedFormId(defaultForm.id);
    } else if (open && forms.length > 0 && !selectedFormId) {
      // Select first form if no default
      const firstForm = forms[0];
      if (firstForm) {
        setSelectedFormId(firstForm.id);
      }
    }
  }, [open, defaultForm, forms, selectedFormId]);

  // Check if form is valid
  const isFormValid = projectName.trim() && selectedFormId;

  const handleCreate = () => {
    if (isFormValid) {
      onCreateProposal({
        projectName: projectName.trim(),
        formId: selectedFormId,
      });
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setProjectName("");
    setSelectedFormId("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <span />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Create New Project
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2 pb-4 px-1">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="projectName" className="text-sm font-medium text-slate-700">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Office Building Renovation"
              autoFocus
              className="h-11 rounded-lg border-slate-200 placeholder:text-slate-400"
            />
          </div>

          {/* Form Template */}
          <div className="space-y-2">
            <Label htmlFor="form" className="text-sm font-medium text-slate-700">
              Form Template <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedFormId} onValueChange={setSelectedFormId}>
              <SelectTrigger
                id="form"
                className="h-11 rounded-lg bg-white border-slate-200 data-[placeholder]:text-slate-400"
              >
                <SelectValue placeholder="Select a form template" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {formsLoading ? (
                  <SelectItem value="loading" disabled>Loading forms...</SelectItem>
                ) : forms.length === 0 ? (
                  <SelectItem value="none" disabled>No forms available</SelectItem>
                ) : (
                  [...forms]
                    .sort((a, b) => {
                      const aDefault = (a as { is_default?: boolean }).is_default ? 1 : 0;
                      const bDefault = (b as { is_default?: boolean }).is_default ? 1 : 0;
                      return bDefault - aDefault;
                    })
                    .map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.name}
                        {(form as { is_default?: boolean }).is_default && (
                          <span className="ml-2 text-xs text-blue-500">(Default)</span>
                        )}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            {forms.length === 0 && !formsLoading && (
              <p className="text-xs text-amber-500">
                No forms available. Create a form template first.
              </p>
            )}
            {/* Show document type from selected form */}
            {selectedForm && (selectedForm as { document_type?: string }).document_type && (
              <p className="text-xs text-slate-500">
                Document type: {formatDocumentType((selectedForm as { document_type?: string }).document_type)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="px-6 py-2 rounded-lg border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isFormValid}
            className="bg-slate-900 hover:bg-slate-800 px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProposalDialog;
