/**
 * Proposal Creation Page
 * Multi-step process for creating proposals using form templates
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentOrganization, useForms, type Form } from '@/hooks/queries';
import { useUser } from '@/auth';
import { createProposal } from '@/services/proposalsService';
import { DynamicFormRenderer } from '@/features/form-builder/renderer/DynamicFormRenderer';
import { PageContent } from '@/components/common/layout';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Step = 'setup' | 'fill-form';

export default function ProposalCreation() {
  const navigate = useNavigate();
  const user = useUser();
  const { organization: currentOrganization, isLoading: orgLoading } = useCurrentOrganization(user?.id || '');
  const { data: forms = [], isLoading: formsLoading } = useForms(
    currentOrganization?.id,
    !!currentOrganization?.id // Only enable when we have an org ID
  );

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>('setup');

  // Setup step state
  const [projectName, setProjectName] = useState('');
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Form step state
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When form is selected, load it
  useEffect(() => {
    if (selectedFormId && forms.length > 0) {
      const form = forms.find(f => f.id === selectedFormId);
      if (form) {
        setSelectedForm(form);
      }
    }
  }, [selectedFormId, forms]);

  // Validation for setup step
  const canProceed = projectName.trim() && selectedFormId && selectedTemplateId;

  const handleContinue = () => {
    if (!canProceed) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCurrentStep('fill-form');
  };

  const handleBack = () => {
    setCurrentStep('setup');
  };

  const handleFormSubmit = async (data: Record<string, any>) => {
    if (!selectedForm || !currentOrganization?.id || !user?.id) {
      toast.error('Missing required information');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the proposal using proposalsService
      // Store all form data in form_response_data
      const proposal = await createProposal({
        proposal_name: projectName,
        form_response_data: {
          form_id: selectedForm.id,
          form_name: selectedForm.name,
          template_id: selectedTemplateId,
          ...data,
        },
        proposal_status: 'draft',
        proposal_source: 'form-builder',
      });

      toast.success(`Proposal ${proposal.proposal_number} created successfully`);
      navigate(`/proposals`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      toast.error('Failed to create proposal: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render setup step
  const renderSetupStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Create New Proposal
        </CardTitle>
        <CardDescription>
          Select a form template and provide basic information to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project/Proposal Name */}
        <div className="space-y-2">
          <Label htmlFor="project-name">
            Project/Proposal Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g., Office Renovation - Building A"
            required
            autoFocus
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This will be the main identifier for your proposal
          </p>
        </div>

        {/* Form Template Selector */}
        <div className="space-y-2">
          <Label htmlFor="form-template">
            Form Template <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedFormId}
            onValueChange={setSelectedFormId}
            disabled={formsLoading || forms.length === 0}
          >
            <SelectTrigger id="form-template">
              <SelectValue placeholder={formsLoading ? "Loading forms..." : "Select a form template"} />
            </SelectTrigger>
            <SelectContent>
              {forms.map((form) => (
                <SelectItem key={form.id} value={form.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{form.name}</span>
                    {form.description && (
                      <span className="text-xs text-gray-500">{form.description}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Choose which form template to use for this proposal
          </p>
        </div>

        {/* Document Template Selector (Disabled for now) */}
        <div className="space-y-2">
          <Label htmlFor="document-template">
            Document Template <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
            disabled={true}
          >
            <SelectTrigger id="document-template" className="opacity-60">
              <SelectValue placeholder="Default Template (Coming Soon)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Template</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Document template feature coming soon. Using default template for now.
          </p>
        </div>

        {/* Auto-select default template */}
        {!selectedTemplateId && (
          <Button
            variant="link"
            size="sm"
            onClick={() => setSelectedTemplateId('default')}
            className="text-xs"
          >
            Use Default Template
          </Button>
        )}

        {/* Action buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => navigate('/proposals')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleContinue}
            disabled={!canProceed}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render form filling step
  const renderFormStep = () => {
    if (!selectedForm) {
      return (
        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">No form selected</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{selectedForm.name}</CardTitle>
              <CardDescription>
                Project: {projectName}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DynamicFormRenderer
            form={selectedForm}
            initialData={formData}
            onSubmit={handleFormSubmit}
          />

          {/* Submit button */}
          <div className="flex justify-end pt-6 mt-6 border-t">
            <Button
              onClick={() => {
                // Trigger form submission by creating a submit event
                const form = document.querySelector('form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
              }}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Proposal...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Proposal
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <PageContent
      title={currentStep === 'setup' ? 'New Proposal' : selectedForm?.name || 'Fill Form'}
      subtitle={
        currentStep === 'setup'
          ? 'Create a new proposal using a form template'
          : `Complete the form to create your proposal`
      }
      showPageHeader={true}
    >
      <div className="py-8">
        {/* Progress indicator */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${currentStep === 'setup' ? 'text-primary font-medium' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'setup' ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                1
              </div>
              <span className="text-sm">Setup</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300" />
            <div className={`flex items-center gap-2 ${currentStep === 'fill-form' ? 'text-primary font-medium' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep === 'fill-form' ? 'border-primary bg-primary text-white' : 'border-gray-300'}`}>
                2
              </div>
              <span className="text-sm">Fill Form</span>
            </div>
          </div>
        </div>

        {/* Render current step */}
        {currentStep === 'setup' && renderSetupStep()}
        {currentStep === 'fill-form' && renderFormStep()}
      </div>
    </PageContent>
  );
}
