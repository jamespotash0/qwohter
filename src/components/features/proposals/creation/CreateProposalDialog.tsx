import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { Warning } from "@phosphor-icons/react";
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
  proposalNumber?: string; // Optional custom number (for import only)
  proposalDate?: string; // Optional custom date (for import only)
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
  const navigate = useNavigate();

  // Form fields
  const [projectName, setProjectName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string>("");

  // Fetch user, organization and forms
  const user = useUser();
  const { organizationId } = useCurrentOrganization(user?.id || "");
  const { data: forms = [], isLoading: formsLoading } = useForms(organizationId || "");

  const hasNoForms = !formsLoading && forms.length === 0;

  const handleGoToForms = () => {
    onOpenChange(false);
    navigate('/forms');
  };

  // Get selected form details (to show document type)
  const selectedForm = useMemo(() => {
    return forms.find((f: { id: string }) => f.id === selectedFormId);
  }, [forms, selectedFormId]);

  // Reset form when dialog opens or closes
  useEffect(() => {
    if (!open) {
      // Reset all fields when dialog closes
      setProjectName("");
      setSelectedFormId("");
    }
  }, [open]);

  // Check if form is valid
  const isFormValid = projectName.trim() && selectedFormId;

  const handleCreate = () => {
    if (isFormValid) {
      const data: ProposalInitialData = {
        projectName: projectName.trim(),
        formId: selectedFormId,
      };

      onCreateProposal(data);
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
          {/* Warning: No forms available */}
          {hasNoForms && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-amber-200 bg-amber-50">
              <Warning className="w-4 h-4 text-amber-600 flex-shrink-0" weight="fill" />
              <span className="text-xs text-amber-700">
                No form templates available.
              </span>
              <button
                type="button"
                onClick={handleGoToForms}
                className="text-xs font-medium text-amber-800 hover:underline ml-auto"
              >
                Create Form
              </button>
            </div>
          )}

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
              disabled={hasNoForms}
              className="h-11 rounded-lg border-slate-200 placeholder:text-slate-400"
            />
          </div>

          {/* Form Template */}
          <div className="space-y-2">
            <Label htmlFor="form" className="text-sm font-medium text-slate-700">
              Form Template <span className="text-red-500">*</span>
            </Label>
            {hasNoForms ? (
              <div className="h-11 rounded-lg border border-slate-200 bg-slate-100 flex items-center px-3">
                <span className="text-sm text-slate-400">No forms available</span>
              </div>
            ) : (
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
            disabled={!isFormValid || hasNoForms}
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
