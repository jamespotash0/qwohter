/**
 * Quote Creation Wizard
 * Multi-step wizard for creating quotes from custom forms
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Form } from '@/stores/forms/formsStore';
import { useCurrentOrganization, useForms, useCreateQuote } from '@/hooks/queries';
import { useUser } from '@/auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  // ArrowRight,
  Check,
  FileText,
  Loader2,
  X,
  // Calendar,
  // Hash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
// import { format } from 'date-fns';

interface QuoteCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteCreationWizard({ open, onOpenChange }: QuoteCreationWizardProps) {
  const navigate = useNavigate();
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '');
  const { data: forms = [] } = useForms(currentOrganization?.id, open);
  const createQuoteMutation = useCreateQuote();

  const [step, setStep] = useState<'select-form' | 'fill-form' | 'review'>('select-form');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [projectName, setProjectName] = useState('');
  const [proposalNumber, setProposalNumber] = useState('');
  const [quoteStatus, setQuoteStatus] = useState<'Draft' | 'Incomplete'>('Draft');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTabId, setActiveTabId] = useState('');

  // TODO: Replace with proposal number generation from proposalsService
  useEffect(() => {
    if (open && currentOrganization?.id) {
      // Generate proposal number - this should call proposalsService.generateNextProposalNumber
      // For now, using a placeholder
      setProposalNumber(`Q${Date.now()}`);
    }
  }, [open, currentOrganization?.id]);

  useEffect(() => {
    if (selectedForm && selectedForm.tabs.length > 0) {
      setActiveTabId(selectedForm.tabs[0].id);
    }
  }, [selectedForm]);

  const handleSelectForm = (form: Form) => {
    setSelectedForm(form);
    setStep('fill-form');
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveQuote = async () => {
    if (!selectedForm || !currentOrganization?.id || !user?.id) {
      toast.error('Missing required information');
      return;
    }

    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    createQuoteMutation.mutate({
      project_name: projectName,
      status: quoteStatus,
      wall_details: formData,
    }, {
      onSuccess: (quote) => {
        toast.success('Quote created successfully');
        onOpenChange(false);
        navigate(`/quotes/${quote.id}`);
      },
      onError: (error) => {
        toast.error('Failed to create quote');
        console.error('Error creating quote:', error);
      }
    });
  };

  const handleClose = () => {
    setStep('select-form');
    setSelectedForm(null);
    setProjectName('');
    setFormData({});
    setActiveTabId('');
    onOpenChange(false);
  };

  const renderFieldInput = (field: any) => {
    const value = formData[field.id] || field.default_value || '';

    switch (field.field_type) {
      case 'input':
        return (
          <Input
            type={field.input_type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="w-full px-3 py-2 border rounded-md"
          />
        );

      case 'dropdown':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any) => (
                <SelectItem key={option.toString()} value={option.toString()}>
                  {option.toString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-muted-foreground">{field.placeholder}</span>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Create New Quote</DialogTitle>
              <DialogDescription className="mt-1">
                {step === 'select-form' && 'Select a form template to get started'}
                {step === 'fill-form' && `Fill out the ${selectedForm?.name} form`}
                {step === 'review' && 'Review and submit your quote'}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex items-center gap-2 ${step === 'select-form' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step !== 'select-form' ? 'bg-primary text-primary-foreground' : 'border-2 border-primary'}`}>
                {step !== 'select-form' ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-sm font-medium">Select Form</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === 'fill-form' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-primary text-primary-foreground' : step === 'fill-form' ? 'border-2 border-primary' : 'border-2'}`}>
                {step === 'review' ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-sm font-medium">Fill Form</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'border-2 border-primary' : 'border-2'}`}>
                3
              </div>
              <span className="text-sm font-medium">Review</span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Select Form */}
            {step === 'select-form' && (
              <motion.div
                key="select-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 pb-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {forms.map((form) => {
                    const fieldCount = form.tabs.reduce((acc, tab) => acc + tab.fields.length, 0);
                    return (
                      <button
                        key={form.id}
                        onClick={() => handleSelectForm(form)}
                        className="p-4 rounded-lg border-2 border-border hover:border-primary hover:shadow-md transition-all text-left group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold group-hover:text-primary transition-colors truncate">
                              {form.name}
                            </h4>
                            {form.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {form.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {form.tabs.length} tabs
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {fieldCount} fields
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {forms.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No forms available. Create a form first.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Fill Form */}
            {step === 'fill-form' && selectedForm && (
              <motion.div
                key="fill-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 pb-6"
              >
                {/* Project Info */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Project Name *</Label>
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Enter project name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Proposal Number</Label>
                      <Input value={proposalNumber} disabled className="bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={quoteStatus} onValueChange={(v: any) => setQuoteStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Incomplete">Incomplete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Form Tabs */}
                <Tabs value={activeTabId} onValueChange={setActiveTabId}>
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {selectedForm.tabs.map((tab) => (
                      <TabsTrigger key={tab.id} value={tab.id}>
                        {tab.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {selectedForm.tabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-4">
                      {tab.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <Label>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {renderFieldInput(field)}
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </motion.div>
            )}

            {/* Step 3: Review (placeholder) */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 pb-6"
              >
                <p>Review step - TODO</p>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'fill-form') setStep('select-form');
              else if (step === 'review') setStep('fill-form');
              else handleClose();
            }}
            disabled={step === 'select-form'}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {step === 'fill-form' && (
              <Button
                onClick={handleSaveQuote}
                disabled={createQuoteMutation.isPending || !projectName.trim()}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                {createQuoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Quote
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
