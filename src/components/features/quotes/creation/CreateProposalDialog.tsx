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
import { useFormDocumentTemplates } from "@/hooks/queries/useDocumentTemplates";
import { useCurrentOrganization } from "@/hooks/queries/useOrganization";
import { useUser } from "@/auth";
import MapboxInput from "@/components/common/inputs/MapboxInput";

export interface ProposalInitialData {
  proposalName: string;
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  jobLocation: string;
  formId: string;
  template: string;
  status: string;
  quoteSource: string;
}

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateQuote: (data: ProposalInitialData) => void;
}

const CreateProposalDialog = ({
  open,
  onOpenChange,
  onCreateQuote
}: CreateProposalDialogProps) => {
  // Basic info
  const [proposalName, setProposalName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  // Client info
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [jobLocation, setJobLocation] = useState("");

  // Status
  const [status, setStatus] = useState("Draft");

  // Quote Source
  const [quoteSource, setQuoteSource] = useState("");

  // Fetch user, organization and forms
  const user = useUser();
  const { organizationId } = useCurrentOrganization(user?.id || "");
  const { data: forms = [], isLoading: formsLoading } = useForms(organizationId || "");

  // Fetch linked templates for selected form
  const { data: linkedTemplates = [], isLoading: templatesLoading } = useFormDocumentTemplates(
    selectedFormId || undefined
  );

  // Find the default form (only if explicitly marked as default)
  const defaultForm = useMemo(() => {
    return forms.find((f: { is_default?: boolean }) => f.is_default);
  }, [forms]);

  // Pre-select default form when dialog opens (only if there's an actual default)
  useEffect(() => {
    if (open && defaultForm && !selectedFormId) {
      setSelectedFormId(defaultForm.id);
    }
  }, [open, defaultForm, selectedFormId]);

  // Reset template when form changes, then auto-select default if available
  useEffect(() => {
    setSelectedTemplate("");
  }, [selectedFormId]);

  // Auto-select default template when templates are loaded
  useEffect(() => {
    if (linkedTemplates.length > 0 && !selectedTemplate) {
      // Find template marked as default (on document_templates table)
      const defaultTemplate = linkedTemplates.find(
        (link) => link.document_template?.is_default
      );
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate.document_template_id);
      }
    }
  }, [linkedTemplates, selectedTemplate]);

  // Check if form is valid (required fields filled)
  const isFormValid = proposalName.trim() && clientCompany.trim() && jobLocation.trim() && selectedFormId && selectedTemplate;

  const handleCreate = () => {
    if (isFormValid) {
      onCreateQuote({
        proposalName: proposalName.trim(),
        clientName: clientName.trim(),
        clientCompany: clientCompany.trim(),
        clientAddress: clientAddress.trim(),
        jobLocation: jobLocation.trim(),
        formId: selectedFormId,
        template: selectedTemplate,
        status,
        quoteSource: quoteSource.trim(),
      });
      // Reset form
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setProposalName("");
    setClientName("");
    setClientCompany("");
    setClientAddress("");
    setJobLocation("");
    setSelectedFormId("");
    setSelectedTemplate("");
    setStatus("Draft");
    setQuoteSource("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFormValid) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>

      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Create New Proposal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2 pb-4 px-1 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Proposal Name */}
          <div className="space-y-2">
            <Label htmlFor="proposalName" className="text-sm font-medium text-slate-700">
              Proposal Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="proposalName"
              value={proposalName}
              onChange={e => setProposalName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., Office Building Wall Project"
              autoFocus
              className="h-11 rounded-lg border-slate-200 placeholder:text-slate-400"
            />
          </div>

          {/* Client Info Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName" className="text-sm font-medium text-slate-700">
                Client Name
              </Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Contact person name"
                className="h-11 rounded-lg border-slate-200 placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientCompany" className="text-sm font-medium text-slate-700">
                Client Company <span className="text-red-500">*</span>
              </Label>
              <Input
                id="clientCompany"
                value={clientCompany}
                onChange={e => setClientCompany(e.target.value)}
                placeholder="Company or organization name"
                className="h-11 rounded-lg border-slate-200 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Address Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Client Address
              </Label>
              <MapboxInput
                id="clientAddress"
                label=""
                value={clientAddress}
                onChange={setClientAddress}
                placeholder="Client's business address"
                className="h-11 rounded-lg border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Job Location <span className="text-red-500">*</span>
              </Label>
              <MapboxInput
                id="jobLocation"
                label=""
                value={jobLocation}
                onChange={setJobLocation}
                placeholder="Where the work will be performed"
                required
                className="h-11 rounded-lg border-slate-200"
              />
            </div>
          </div>

          {/* Templates Row */}
          <div className="grid grid-cols-2 gap-4">
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
                    // Sort forms so default appears first
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="template" className="text-sm font-medium text-slate-700">
                Document Template <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                disabled={!selectedFormId || linkedTemplates.length === 0}
              >
                <SelectTrigger
                  id="template"
                  className={`h-11 rounded-lg bg-white border-slate-200 data-[placeholder]:text-slate-400 ${
                    !selectedFormId || linkedTemplates.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <SelectValue
                    placeholder={
                      !selectedFormId
                        ? "Select form first"
                        : templatesLoading
                          ? "Loading..."
                          : linkedTemplates.length === 0
                            ? "No templates linked"
                            : "Select a template"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {/* Sort templates so default appears first */}
                  {[...linkedTemplates]
                    .sort((a, b) => {
                      const aDefault = a.document_template?.is_default ? 1 : 0;
                      const bDefault = b.document_template?.is_default ? 1 : 0;
                      return bDefault - aDefault;
                    })
                    .map((link) => (
                      <SelectItem
                        key={link.document_template_id}
                        value={link.document_template_id}
                      >
                        {link.document_template?.name || 'Unnamed Template'}
                        {link.document_template?.is_default && (
                          <span className="ml-2 text-xs text-amber-600">(Default)</span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!selectedFormId && (
                <p className="text-xs text-slate-400">Select a form template first</p>
              )}
              {selectedFormId && linkedTemplates.length === 0 && !templatesLoading && (
                <p className="text-xs text-amber-500">No document templates linked to this form</p>
              )}
            </div>
          </div>

          {/* Status & Source Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium text-slate-700">
                Proposal Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="h-11 rounded-lg bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteSource" className="text-sm font-medium text-slate-700">
                Lead Source
              </Label>
              <Input
                id="quoteSource"
                value={quoteSource}
                onChange={e => setQuoteSource(e.target.value)}
                placeholder="e.g., Website, Referral, Cold Call"
                className="h-11 rounded-lg border-slate-200 placeholder:text-slate-400"
              />
            </div>
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
            Continue to Form
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProposalDialog;
