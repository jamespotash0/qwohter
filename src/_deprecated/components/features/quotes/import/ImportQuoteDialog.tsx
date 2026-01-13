/**
 * Import Quote Dialog
 * Multi-step wizard for importing quotes from files
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ArrowRight, FileUp, Loader2 } from 'lucide-react';
import { FileUploadStep } from './FileUploadStep';
import { ProcessingStep } from './ProcessingStep';
import { ReviewStep } from './ReviewStep';
import { extractTextFromFile, parseQuoteWithAI } from '@/services/proposalImport';
import { createQuote } from '@/services/quotesService';
import { invalidateQueries } from '@/lib/queryClient';
import type {
  ImportQuoteState,
  ImportFileType,
  ExtractedQuoteData,
  ImportQuoteStatus,
} from '@/lib/types/proposalImport';
import { EMPTY_EXTRACTED_DATA } from '@/lib/types/proposalImport';

interface ImportQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportQuoteDialog({ open, onOpenChange }: ImportQuoteDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [state, setState] = useState<ImportQuoteState>({
    step: 'upload',
    file: null,
    fileType: null,
    extractionResult: null,
    extractedData: EMPTY_EXTRACTED_DATA,
    manual: {
      projectName: '',
      status: 'Draft',
      proposalNumber: '',
      quoteDate: new Date().toISOString().split('T')[0] || '',
    },
    isExtracting: false,
    isParsing: false,
    error: null,
  });

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
        quoteDate: new Date().toISOString().split('T')[0] || '',
      },
      isExtracting: false,
      isParsing: false,
      error: null,
    });
  }, []);

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

    // Move to processing step
    setState((prev) => ({
      ...prev,
      step: 'processing',
      isExtracting: true,
      error: null,
    }));

    try {
      // Step 1: Extract text from file (PDFs return base64Data instead of text)
      const extractionResult = await extractTextFromFile(state.file);

      setState((prev) => ({
        ...prev,
        extractionResult,
        isExtracting: false,
        isParsing: true,
      }));

      // Check if we got meaningful text from extraction
      if (extractionResult.text.length < 20) {
        throw new Error(
          'Could not extract meaningful text from the file. The document may be a scanned image or corrupted. Please try a different file.'
        );
      }

      // Step 2: Parse extracted text with AI
      const extractedData = await parseQuoteWithAI({
        documentText: extractionResult.text,
        fileName: state.file.name,
        fileType: state.fileType || undefined,
      });

      // Generate a suggested project name from extracted data
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
          quoteDate: extractedData.job.date || prev.manual.quoteDate,
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

  const handleUpdateExtracted = useCallback((updates: Partial<ExtractedQuoteData>) => {
    setState((prev) => ({
      ...prev,
      extractedData: {
        ...prev.extractedData,
        ...updates,
        // Handle nested updates
        client: updates.client
          ? { ...prev.extractedData.client, ...updates.client }
          : prev.extractedData.client,
        job: updates.job
          ? { ...prev.extractedData.job, ...updates.job }
          : prev.extractedData.job,
        pricing: updates.pricing
          ? { ...prev.extractedData.pricing, ...updates.pricing }
          : prev.extractedData.pricing,
        specifications: updates.specifications
          ? { ...prev.extractedData.specifications, ...updates.specifications }
          : prev.extractedData.specifications,
      },
    }));
  }, []);

  const handleProjectNameChange = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      manual: { ...prev.manual, projectName: name },
    }));
  }, []);

  const handleStatusChange = useCallback((status: ImportQuoteStatus) => {
    setState((prev) => ({
      ...prev,
      manual: { ...prev.manual, status },
    }));
  }, []);

  const handleProposalNumberChange = useCallback((proposalNumber: string) => {
    setState((prev) => ({
      ...prev,
      manual: { ...prev.manual, proposalNumber },
    }));
  }, []);

  const handleQuoteDateChange = useCallback((quoteDate: string) => {
    setState((prev) => ({
      ...prev,
      manual: { ...prev.manual, quoteDate },
    }));
  }, []);

  const handleCreateQuote = useCallback(async () => {
    if (!state.manual.projectName.trim()) {
      toast({
        title: 'Project Name Required',
        description: 'Please enter a project name to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const { extractedData, manual } = state;

      // Calculate status date based on quote date (use quote date for the status timestamp)
      const statusDate = manual.quoteDate
        ? new Date(manual.quoteDate).toISOString()
        : new Date().toISOString();

      // Build status timestamps based on selected status
      const statusTimestamps: {
        submitted_at?: string;
        won_at?: string;
        rejected_at?: string;
      } = {};

      switch (manual.status) {
        case 'Submitted':
          statusTimestamps.submitted_at = statusDate;
          break;
        case 'Won':
          statusTimestamps.submitted_at = statusDate; // Also mark as submitted
          statusTimestamps.won_at = statusDate;
          break;
        case 'Rejected':
          statusTimestamps.submitted_at = statusDate; // Also mark as submitted
          statusTimestamps.rejected_at = statusDate;
          break;
        // Draft and Incomplete don't need status timestamps
      }

      // Build quote data from extracted + manual fields
      const quoteData = {
        project_name: manual.projectName.trim(),
        status: manual.status,
        proposal_number: manual.proposalNumber || undefined,
        quote_details: {
          contactName: extractedData.client.name || '',
          contactCompany: extractedData.client.company || '',
          contactEmail: extractedData.client.email || '',
          contactPhone: extractedData.client.phone || '',
          quoteSource: 'Imported',
        },
        job_details: {
          job_location: extractedData.job.location || '',
          client_name: extractedData.client.name || '',
          client_company: extractedData.client.company || '',
          client_address: extractedData.client.address || '',
          date: manual.quoteDate || new Date().toISOString().split('T')[0],
        },
        wall_details: {
          // Map extracted products to wall details
          walls: extractedData.products.items.length > 0
            ? extractedData.products.items.reduce((acc, product, index) => {
                // Use product name or generate a wall identifier
                const wallName = product.name || `Wall ${String.fromCharCode(65 + index)}`;
                acc[wallName] = {
                  // Core identifiers
                  model: product.model || '',
                  series: product.series || '',
                  quantity: product.quantity || '1',
                  wallSystemType: product.productType || '',
                  manufacturer: product.manufacturer || '',
                  sku: product.sku || '',
                  // Dimensions - parse from extracted dimensions
                  heightFeet: product.dimensions?.height?.match(/\d+/)?.[0] || '',
                  heightInches: '',
                  lengthFeet: product.dimensions?.length?.match(/\d+/)?.[0] || '',
                  lengthInches: '',
                  // All extracted specifications
                  ...product.specifications,
                  // Components if present
                  ...(product.components ? { components: product.components } : {}),
                };
                return acc;
              }, {} as Record<string, any>)
            : extractedData.specifications.dimensions
              ? {
                  'Wall A': {
                    dimensions: extractedData.specifications.dimensions || '',
                    quantity: extractedData.specifications.quantity || '',
                    material: extractedData.specifications.materials || '',
                    productType: extractedData.specifications.productType || '',
                  },
                }
              : {},
          // Store additional specs for reference
          additionalSpecs: extractedData.specifications.additionalSpecs,
          // Store raw products data for reference
          extractedProducts: extractedData.products.items,
        },
        price_details: {
          final_selling_price: extractedData.pricing.total || 0,
        },
        // Use the quote date as the created_at timestamp for imported quotes
        created_at: manual.quoteDate
          ? new Date(manual.quoteDate).toISOString()
          : undefined,
        // Set status timestamps based on the selected status and quote date
        ...statusTimestamps,
      };

      const newQuote = await createQuote(quoteData);

      // Invalidate the quotes cache so the table updates immediately
      await invalidateQueries.allQuotes();

      toast({
        title: 'Quote Imported',
        description: `"${manual.projectName}" has been created successfully.`,
      });

      onOpenChange(false);
      resetState();

      // Navigate to the new quote
      if (newQuote.proposal_number) {
        navigate(`/editor/${newQuote.proposal_number}`);
      }
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast({
        title: 'Import Failed',
        description:
          error instanceof Error ? error.message : 'Failed to create quote from imported data.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  }, [state, toast, onOpenChange, resetState, navigate]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset after animation
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="w-5 h-5" />
            Import Quote from File
          </DialogTitle>
          <DialogDescription>
            {state.step === 'upload' &&
              'Upload a quote document to extract data automatically using AI.'}
            {state.step === 'processing' && 'Processing your document...'}
            {state.step === 'review' &&
              'Review the extracted data and make any necessary corrections.'}
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
            <ReviewStep
              extractedData={state.extractedData}
              onUpdateExtracted={handleUpdateExtracted}
              projectName={state.manual.projectName}
              onProjectNameChange={handleProjectNameChange}
              status={state.manual.status}
              onStatusChange={handleStatusChange}
              proposalNumber={state.manual.proposalNumber}
              onProposalNumberChange={handleProposalNumberChange}
              quoteDate={state.manual.quoteDate}
              onQuoteDateChange={handleQuoteDateChange}
            />
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
                onClick={handleCreateQuote}
                disabled={isCreating || !state.manual.projectName.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Quote'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
