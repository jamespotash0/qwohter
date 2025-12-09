/**
 * Import Proposal Dialog
 * Multi-step wizard for importing proposals from files
 * Reuses quote import logic but creates proposals instead
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, FileUp, Loader2 } from 'lucide-react';
import { FileUploadStep } from '@/components/features/quotes/import/FileUploadStep';
import { ProcessingStep } from '@/components/features/quotes/import/ProcessingStep';
import { extractTextFromFile, parseQuoteWithAI } from '@/services/quoteImport';
import { createProposal } from '@/services/proposalsService';
import { useForms } from '@/hooks/queries';
import { useFormDocumentTemplates } from '@/hooks/queries/useDocumentTemplates';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';
import { invalidateQueries } from '@/lib/queryClient';
import type {
  ImportFileType,
  ExtractedQuoteData,
} from '@/lib/types/quoteImport';
import { EMPTY_EXTRACTED_DATA } from '@/lib/types/quoteImport';

type ImportStep = 'upload' | 'processing' | 'review';
type ImportProposalStatus = 'Incomplete' | 'Draft' | 'Submitted' | 'Won' | 'Rejected';

interface ImportProposalState {
  step: ImportStep;
  file: File | null;
  fileType: ImportFileType | null;
  extractionResult: { text: string; base64Data?: string } | null;
  extractedData: ExtractedQuoteData;
  manual: {
    projectName: string;
    status: ImportProposalStatus;
    proposalNumber: string;
    proposalDate: string;
    formId: string;
    templateId: string;
  };
  isExtracting: boolean;
  isParsing: boolean;
  error: string | null;
}

interface ImportProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProposalDialog({ open, onOpenChange }: ImportProposalDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = useUser();
  const { organizationId } = useCurrentOrganization(user?.id || '');

  // Fetch forms
  const { data: forms = [], isLoading: formsLoading } = useForms(organizationId || '');

  const [state, setState] = useState<ImportProposalState>({
    step: 'upload',
    file: null,
    fileType: null,
    extractionResult: null,
    extractedData: EMPTY_EXTRACTED_DATA,
    manual: {
      projectName: '',
      status: 'Draft',
      proposalNumber: '',
      proposalDate: new Date().toISOString().split('T')[0] || '',
      formId: '',
      templateId: '',
    },
    isExtracting: false,
    isParsing: false,
    error: null,
  });

  // Fetch linked templates for selected form
  const { data: linkedTemplates = [], isLoading: templatesLoading } = useFormDocumentTemplates(
    state.manual.formId || undefined
  );

  // Find and set default form
  const defaultForm = useMemo(() => {
    return forms.find((f: { is_default?: boolean }) => f.is_default);
  }, [forms]);

  // Auto-select default form when available
  useEffect(() => {
    if (defaultForm && !state.manual.formId) {
      setState(prev => ({
        ...prev,
        manual: { ...prev.manual, formId: defaultForm.id },
      }));
    }
  }, [defaultForm, state.manual.formId]);

  // Reset template when form changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      manual: { ...prev.manual, templateId: '' },
    }));
  }, [state.manual.formId]);

  // Auto-select default template when templates load
  useEffect(() => {
    if (linkedTemplates.length > 0 && !state.manual.templateId) {
      const defaultTemplate = linkedTemplates.find(
        (link) => link.document_template?.is_default
      );
      if (defaultTemplate) {
        setState(prev => ({
          ...prev,
          manual: { ...prev.manual, templateId: defaultTemplate.document_template_id },
        }));
      }
    }
  }, [linkedTemplates, state.manual.templateId]);

  const [isCreating, setIsCreating] = useState(false);

  const resetState = useCallback(() => {
    setState({
      step: 'upload',
      file: null,
      fileType: null,
      extractionResult: null,
      extractedData: EMPTY_EXTRACTED_DATA,
      manual: {
        projectName: '',
        status: 'Draft',
        proposalNumber: '',
        proposalDate: new Date().toISOString().split('T')[0] || '',
        formId: defaultForm?.id || '',
        templateId: '',
      },
      isExtracting: false,
      isParsing: false,
      error: null,
    });
  }, [defaultForm?.id]);

  const handleFileSelect = useCallback((file: File, fileType: ImportFileType) => {
    setState((prev) => ({
      ...prev,
      file,
      fileType,
      error: null,
    }));
  }, []);

  const handleClearFile = useCallback(() => {
    setState((prev) => ({
      ...prev,
      file: null,
      fileType: null,
      error: null,
    }));
  }, []);

  const handleError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const handleExtractAndParse = useCallback(async () => {
    if (!state.file) return;

    setState((prev) => ({
      ...prev,
      step: 'processing',
      isExtracting: true,
      error: null,
    }));

    try {
      const extractionResult = await extractTextFromFile(state.file);

      setState((prev) => ({
        ...prev,
        extractionResult,
        isExtracting: false,
        isParsing: true,
      }));

      if (extractionResult.text.length < 20) {
        throw new Error(
          'Could not extract meaningful text from the file. Please try a different file.'
        );
      }

      const extractedData = await parseQuoteWithAI({
        documentText: extractionResult.text,
        fileName: state.file.name,
        fileType: state.fileType || undefined,
      });

      let suggestedName = '';
      if (extractedData.client.company) {
        suggestedName = extractedData.client.company;
      } else if (extractedData.client.name) {
        suggestedName = extractedData.client.name;
      }
      if (extractedData.job.location && suggestedName) {
        suggestedName += ` - ${extractedData.job.location}`;
      }

      setState((prev) => ({
        ...prev,
        step: 'review',
        extractedData,
        manual: {
          ...prev.manual,
          projectName: suggestedName || prev.manual.projectName,
          proposalNumber: extractedData.job.proposalNumber || prev.manual.proposalNumber,
          proposalDate: extractedData.job.date || prev.manual.proposalDate,
        },
        isParsing: false,
      }));
    } catch (error) {
      console.error('Import error:', error);
      setState((prev) => ({
        ...prev,
        step: 'upload',
        isExtracting: false,
        isParsing: false,
        error: error instanceof Error ? error.message : 'Failed to process file',
      }));
    }
  }, [state.file, state.fileType]);

  const handleCreateProposal = useCallback(async () => {
    if (!state.manual.projectName.trim()) {
      toast({
        title: 'Project Name Required',
        description: 'Please enter a project name to continue.',
        variant: 'destructive',
      });
      return;
    }

    if (!state.manual.formId) {
      toast({
        title: 'Form Required',
        description: 'Please select a form template.',
        variant: 'destructive',
      });
      return;
    }

    if (!state.manual.templateId) {
      toast({
        title: 'Template Required',
        description: 'Please select a document template.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const { extractedData, manual } = state;

      // Build proposal data
      // Note: document_type is inherited from the form automatically
      const proposalData: Record<string, any> = {
        form_id: manual.formId,
        project_name: manual.projectName.trim(),
        status: manual.status,
        client_name: extractedData.client.name || '',
        client_company: extractedData.client.company || '',
        job_location: extractedData.job.location || '',
        total_value: extractedData.pricing.total || 0,
        quote_source: 'Imported',
        form_data: {
          // Store all extracted data in form_data for flexibility
          client: extractedData.client,
          job: extractedData.job,
          pricing: extractedData.pricing,
          products: extractedData.products,
          specifications: extractedData.specifications,
          imported_from: state.file?.name,
          import_date: new Date().toISOString(),
        },
      };

      // Add optional proposal number if provided
      if (manual.proposalNumber.trim()) {
        proposalData.proposal_number = manual.proposalNumber.trim();
      }

      // Add custom created_at if a date is specified
      if (manual.proposalDate) {
        // Convert date string to ISO timestamp at start of day
        proposalData.created_at = new Date(manual.proposalDate + 'T00:00:00').toISOString();
      }

      const newProposal = await createProposal(proposalData);

      // Invalidate the proposals cache
      await invalidateQueries.allQuotes();

      toast({
        title: 'Proposal Imported',
        description: `"${manual.projectName}" has been created successfully.`,
      });

      onOpenChange(false);
      resetState();

      // Navigate to the new proposal
      if (newProposal.id) {
        navigate(`/proposals/${newProposal.id}/edit`);
      }
    } catch (error) {
      console.error('Failed to create proposal:', error);
      toast({
        title: 'Import Failed',
        description:
          error instanceof Error ? error.message : 'Failed to create proposal from imported data.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }, [state, toast, onOpenChange, resetState, navigate]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetState, 200);
  }, [onOpenChange, resetState]);

  const handleBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      step: 'upload',
      error: null,
    }));
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Import Proposal from File
          </DialogTitle>
          <DialogDescription>
            {state.step === 'upload' &&
              'Upload a proposal document to extract data automatically using AI.'}
            {state.step === 'processing' && 'Processing your document...'}
            {state.step === 'review' &&
              'Review the extracted data and select your form template.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {state.step === 'upload' && (
            <FileUploadStep
              file={state.file}
              onFileSelect={handleFileSelect}
              onClear={handleClearFile}
              error={state.error}
              onError={handleError}
            />
          )}

          {state.step === 'processing' && (
            <ProcessingStep
              isExtracting={state.isExtracting}
              isParsing={state.isParsing}
              fileName={state.file?.name}
            />
          )}

          {state.step === 'review' && (
            <div className="space-y-4">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="projectName">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="projectName"
                  value={state.manual.projectName}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      manual: { ...prev.manual, projectName: e.target.value },
                    }))
                  }
                  placeholder="Enter project name"
                />
              </div>

              {/* Form & Template Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Form Template <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={state.manual.formId}
                    onValueChange={(value) =>
                      setState((prev) => ({
                        ...prev,
                        manual: { ...prev.manual, formId: value },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a form" />
                    </SelectTrigger>
                    <SelectContent>
                      {formsLoading ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : forms.length === 0 ? (
                        <SelectItem value="none" disabled>No forms available</SelectItem>
                      ) : (
                        forms.map((form) => (
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
                  <Label>
                    Document Template <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={state.manual.templateId}
                    onValueChange={(value) =>
                      setState((prev) => ({
                        ...prev,
                        manual: { ...prev.manual, templateId: value },
                      }))
                    }
                    disabled={!state.manual.formId || linkedTemplates.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !state.manual.formId
                            ? 'Select form first'
                            : templatesLoading
                              ? 'Loading...'
                              : linkedTemplates.length === 0
                                ? 'No templates linked'
                                : 'Select a template'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedTemplates.map((link) => (
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
                </div>
              </div>

              {/* Proposal Number & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="proposalNumber">Proposal Number</Label>
                  <Input
                    id="proposalNumber"
                    value={state.manual.proposalNumber}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        manual: { ...prev.manual, proposalNumber: e.target.value },
                      }))
                    }
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for auto-generated based on document type
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proposalDate">Proposal Date</Label>
                  <Input
                    id="proposalDate"
                    type="date"
                    value={state.manual.proposalDate}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        manual: { ...prev.manual, proposalDate: e.target.value },
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Used as the created date in the table
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={state.manual.status}
                  onValueChange={(value) =>
                    setState((prev) => ({
                      ...prev,
                      manual: { ...prev.manual, status: value as ImportProposalStatus },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incomplete">Incomplete</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Won">Won</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Extracted Data Summary */}
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Extracted Data</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {state.extractedData.client.company && (
                    <div>
                      <span className="text-muted-foreground">Company:</span>{' '}
                      {state.extractedData.client.company}
                    </div>
                  )}
                  {state.extractedData.client.name && (
                    <div>
                      <span className="text-muted-foreground">Contact:</span>{' '}
                      {state.extractedData.client.name}
                    </div>
                  )}
                  {state.extractedData.job.location && (
                    <div>
                      <span className="text-muted-foreground">Location:</span>{' '}
                      {state.extractedData.job.location}
                    </div>
                  )}
                  {state.extractedData.pricing.total > 0 && (
                    <div>
                      <span className="text-muted-foreground">Total:</span>{' '}
                      ${state.extractedData.pricing.total.toLocaleString()}
                    </div>
                  )}
                  {state.extractedData.products.items.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Products:</span>{' '}
                      {state.extractedData.products.items.length} items
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {state.step === 'review' && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>

            {state.step === 'upload' && (
              <Button
                onClick={handleExtractAndParse}
                disabled={!state.file}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Extract Data
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {state.step === 'review' && (
              <Button
                onClick={handleCreateProposal}
                disabled={
                  isCreating ||
                  !state.manual.projectName.trim() ||
                  !state.manual.formId ||
                  !state.manual.templateId
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Proposal'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
