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
import { Switch } from "@/components/ui/switch";
import { useForms } from "@/hooks/queries";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";
import {
  getNextProposalNumberPreview,
  type DocumentType,
  type NextProposalNumberResult,
} from "@/services/proposalsService";

// Helper to format document type for display
const formatDocumentType = (type: string | null | undefined): string => {
  if (!type) return '';
  return type.replace(/_/g, ' ');
};

export interface ProposalInitialData {
  projectName: string;
  formId: string;
  proposalNumber?: string; // Optional custom number (if not using auto-generated)
  proposalDate?: string; // Optional custom date (ISO string)
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

  // Smart numbering state
  const [useAutoNumber, setUseAutoNumber] = useState(true);
  const [customProposalNumber, setCustomProposalNumber] = useState("");
  const [proposalDate, setProposalDate] = useState("");
  const [numberPreview, setNumberPreview] = useState<NextProposalNumberResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  // Get the document type from the selected form
  const selectedDocumentType = useMemo(() => {
    return (selectedForm as { document_type?: DocumentType })?.document_type || null;
  }, [selectedForm]);

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

  // Fetch the next proposal number preview when form changes
  useEffect(() => {
    const fetchNextNumber = async () => {
      if (!organizationId || !selectedFormId) {
        setNumberPreview(null);
        return;
      }

      setLoadingPreview(true);
      try {
        const result = await getNextProposalNumberPreview(organizationId, selectedDocumentType);
        setNumberPreview(result);
      } catch (error) {
        console.error('Failed to fetch next number preview:', error);
        setNumberPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    if (open) {
      fetchNextNumber();
    }
  }, [organizationId, selectedFormId, selectedDocumentType, open]);

  // Check if form is valid
  const isFormValid = projectName.trim() && selectedFormId && (useAutoNumber || customProposalNumber.trim());

  const handleCreate = () => {
    if (isFormValid) {
      const data: ProposalInitialData = {
        projectName: projectName.trim(),
        formId: selectedFormId,
      };

      // Add custom proposal number if not using auto
      if (!useAutoNumber && customProposalNumber.trim()) {
        data.proposalNumber = customProposalNumber.trim();
      }

      // Add custom date if provided
      if (proposalDate) {
        data.proposalDate = new Date(proposalDate + 'T00:00:00').toISOString();
      }

      onCreateProposal(data);
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setProjectName("");
    setSelectedFormId("");
    setUseAutoNumber(true);
    setCustomProposalNumber("");
    setProposalDate("");
    setNumberPreview(null);
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

          {/* Proposal Number - Smart numbering */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-slate-700">
                {formatDocumentType(selectedDocumentType) || 'Proposal'} Number
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Auto</span>
                <Switch
                  checked={useAutoNumber}
                  onCheckedChange={setUseAutoNumber}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>

            {useAutoNumber ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-sm text-slate-600">Next:</span>
                {loadingPreview ? (
                  <span className="text-sm text-slate-400">Loading...</span>
                ) : numberPreview ? (
                  <span className="font-mono text-sm font-semibold text-blue-600">{numberPreview.number}</span>
                ) : (
                  <span className="text-sm text-slate-400">Select a form first</span>
                )}
              </div>
            ) : (
              <Input
                value={customProposalNumber}
                onChange={e => setCustomProposalNumber(e.target.value)}
                placeholder={`e.g., ${numberPreview?.number || 'P1001'}`}
                className="h-11 rounded-lg border-slate-200 font-mono"
              />
            )}
            <p className="text-xs text-slate-500">
              {useAutoNumber
                ? 'Number will be auto-assigned based on your existing proposals'
                : 'Enter a custom number (useful for continuing an existing sequence)'}
            </p>
          </div>

          {/* Proposal Date (optional) */}
          <div className="space-y-2">
            <Label htmlFor="proposalDate" className="text-sm font-medium text-slate-700">
              Date <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="proposalDate"
              type="date"
              value={proposalDate}
              onChange={e => setProposalDate(e.target.value)}
              className="h-11 rounded-lg border-slate-200"
            />
            <p className="text-xs text-slate-500">
              Leave empty to use today's date
            </p>
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
