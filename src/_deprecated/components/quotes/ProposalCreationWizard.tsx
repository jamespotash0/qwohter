/**
 * Proposal Creation Wizard
 * Full-screen multi-step wizard for creating proposals from custom forms
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Form } from '@/lib/types/forms';
import { useCurrentOrganization, useForms } from '@/hooks/queries';
import {
  useFormDocumentTemplates,
  useDocumentTemplates,
  type DocumentTemplate,
} from '@/hooks/queries/useDocumentTemplates';
import { useUser } from '@/auth';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  ArrowRight,
  Check,
  FileText,
  Loader2,
  X,
  ClipboardList,
  Eye,
  Hash,
  Calendar,
  Building2,
  Layout,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { generateNextProposalNumber, createProposal } from '@/services/proposalsService';

interface ProposalCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = 'select-form' | 'fill-form' | 'review';

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'select-form', label: 'Select Template', icon: <FileText className="w-5 h-5" /> },
  { id: 'fill-form', label: 'Fill Details', icon: <ClipboardList className="w-5 h-5" /> },
  { id: 'review', label: 'Review & Create', icon: <Eye className="w-5 h-5" /> },
];

export function ProposalCreationWizard({ open, onOpenChange }: ProposalCreationWizardProps) {
  const navigate = useNavigate();
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '');
  const { data: forms = [] } = useForms(currentOrganization?.id, open);

  const [step, setStep] = useState<WizardStep>('select-form');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [projectName, setProjectName] = useState('');
  const [proposalNumber, setProposalNumber] = useState('');
  const [isLoadingNumber, setIsLoadingNumber] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<'Draft' | 'Incomplete'>('Draft');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [activeTabId, setActiveTabId] = useState('');
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<'close' | 'back' | null>(null);

  // Fetch document templates linked to the selected form
  const { data: formDocumentTemplates = [], isLoading: isLoadingTemplates } = useFormDocumentTemplates(selectedForm?.id);
  // Fetch all available document templates (for fallback when no form-specific templates exist)
  const { data: allDocumentTemplates = [] } = useDocumentTemplates(currentOrganization?.id);

  // Use form-specific templates if available, otherwise show all templates
  const availableTemplates = formDocumentTemplates.length > 0
    ? formDocumentTemplates.map(fdt => fdt.document_template).filter(Boolean) as DocumentTemplate[]
    : allDocumentTemplates;

  // Generate proposal number when dialog opens
  useEffect(() => {
    if (open && currentOrganization?.id) {
      setIsLoadingNumber(true);
      generateNextProposalNumber(currentOrganization.id)
        .then((number) => setProposalNumber(number))
        .catch((error) => {
          console.error('Failed to generate proposal number:', error);
          setProposalNumber(`P${Date.now()}`);
        })
        .finally(() => setIsLoadingNumber(false));
    }
  }, [open, currentOrganization?.id]);

  useEffect(() => {
    if (selectedForm && selectedForm.tabs.length > 0) {
      const firstTab = selectedForm.tabs[0];
      if (firstTab) {
        setActiveTabId(firstTab.id);
      }
    }
  }, [selectedForm]);

  const handleSelectForm = (form: Form) => {
    setSelectedForm(form);
    setSelectedTemplate(null); // Reset template when form changes
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleContinueToFillForm = () => {
    if (!selectedForm) {
      toast.error('Please select a form template');
      return;
    }
    setStep('fill-form');
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const [isCreating, setIsCreating] = useState(false);

  const handleSaveQuote = async () => {
    if (!selectedForm || !currentOrganization?.id || !user?.id) {
      toast.error('Missing required information');
      return;
    }

    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreating(true);
    try {
      const proposal = await createProposal({
        form_id: selectedForm.id,
        form_data: formData,
        project_name: projectName.trim(),
        status: quoteStatus,
        document_template_id: selectedTemplate?.id,
      });

      toast.success('Proposal created successfully');
      onOpenChange(false);
      navigate(`/proposals/${proposal.id}/edit`);
    } catch (error) {
      toast.error('Failed to create proposal');
      console.error('Error creating proposal:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Check if user has unsaved progress in the form
  const hasUnsavedProgress = () => {
    // User has progress if they've entered any data (regardless of current step)
    return projectName.trim() !== '' || Object.keys(formData).length > 0;
  };

  // Handle attempting to go back - may show confirmation
  const handleBackAttempt = () => {
    if (step === 'fill-form' && hasUnsavedProgress()) {
      setPendingExitAction('back');
      setShowExitConfirmation(true);
    } else if (step === 'fill-form') {
      setStep('select-form');
    } else if (step === 'review') {
      setStep('fill-form');
    } else {
      // On select-form step, clicking Cancel - check for unsaved progress
      handleCloseAttempt();
    }
  };

  // Handle attempting to close - may show confirmation
  const handleCloseAttempt = () => {
    if (hasUnsavedProgress()) {
      setPendingExitAction('close');
      setShowExitConfirmation(true);
    } else {
      handleClose();
    }
  };

  // Confirm exit and perform the pending action
  const handleConfirmExit = () => {
    setShowExitConfirmation(false);
    if (pendingExitAction === 'back') {
      setStep('select-form');
    } else {
      handleClose();
    }
    setPendingExitAction(null);
  };

  // Cancel exit and stay on current step
  const handleCancelExit = () => {
    setShowExitConfirmation(false);
    setPendingExitAction(null);
  };

  const handleClose = () => {
    setStep('select-form');
    setSelectedForm(null);
    setSelectedTemplate(null);
    setProjectName('');
    setFormData({});
    setActiveTabId('');
    setQuoteStatus('Draft');
    setShowExitConfirmation(false);
    setPendingExitAction(null);
    onOpenChange(false);
  };

  const goToStep = (targetStep: WizardStep) => {
    const currentIndex = STEPS.findIndex(s => s.id === step);
    const targetIndex = STEPS.findIndex(s => s.id === targetStep);

    // Can only go back or to completed steps
    if (targetIndex <= currentIndex) {
      setStep(targetStep);
    }
  };

  const getStepStatus = (stepId: WizardStep) => {
    const currentIndex = STEPS.findIndex(s => s.id === step);
    const stepIndex = STEPS.findIndex(s => s.id === stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
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
            className="h-11"
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
            className="w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        );

      case 'dropdown':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
            <SelectTrigger className="h-11">
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
          <div className="flex items-center gap-3 h-11">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">{field.placeholder}</span>
          </div>
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="h-11"
          />
        );

      default:
        return (
          <Input
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className="h-11"
          />
        );
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCloseAttempt()}>
      <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] p-0 gap-0 rounded-none border-0 [&>button]:hidden">
        <div className="flex h-full">
          {/* Left Sidebar - Steps */}
          <div className="w-72 bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-700">
              <h1 className="text-xl font-bold">New Proposal</h1>
              <p className="text-sm text-slate-400 mt-1">Create a new proposal from a template</p>
            </div>

            {/* Steps */}
            <div className="flex-1 p-4">
              <nav className="space-y-2">
                {STEPS.map((s, index) => {
                  const status = getStepStatus(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => goToStep(s.id)}
                      disabled={status === 'upcoming'}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                        status === 'current'
                          ? 'bg-blue-600 text-white'
                          : status === 'completed'
                          ? 'bg-slate-800 text-white hover:bg-slate-700 cursor-pointer'
                          : 'text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        status === 'completed'
                          ? 'bg-green-500'
                          : status === 'current'
                          ? 'bg-white/20'
                          : 'bg-slate-700'
                      }`}>
                        {status === 'completed' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{s.label}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Proposal Info */}
            {proposalNumber && (
              <div className="p-4 border-t border-slate-700">
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                    <Hash className="w-4 h-4" />
                    Proposal Number
                  </div>
                  <p className="text-xl font-mono font-bold text-white">
                    {isLoadingNumber ? '...' : proposalNumber}
                  </p>
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="p-4 border-t border-slate-700">
              <Button
                variant="ghost"
                onClick={handleCloseAttempt}
                className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Content Header */}
            <div className="bg-white border-b px-8 py-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {step === 'select-form' && 'Choose a Template'}
                {step === 'fill-form' && selectedForm?.name}
                {step === 'review' && 'Review Your Proposal'}
              </h2>
              <p className="text-gray-500 mt-1">
                {step === 'select-form' && 'Select a form template to create your proposal'}
                {step === 'fill-form' && 'Fill in the required information for your proposal'}
                {step === 'review' && 'Review all details before creating the proposal'}
              </p>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-8">
                <AnimatePresence mode="wait">
                  {/* Step 1: Select Form & Template */}
                  {step === 'select-form' && (
                    <motion.div
                      key="select-form"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-8"
                    >
                      {/* Form Templates Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Select Form Template
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {forms.map((form) => {
                            const fieldCount = form.tabs.reduce((acc, tab) => acc + tab.fields.length, 0);
                            const isSelected = selectedForm?.id === form.id;
                            return (
                              <button
                                key={form.id}
                                onClick={() => handleSelectForm(form)}
                                className={`aspect-square bg-white p-4 rounded-xl border-2 transition-all text-left group flex flex-col relative ${
                                  isSelected
                                    ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                                    : 'border-gray-200 hover:border-blue-400 hover:shadow-md'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                                  isSelected ? 'bg-blue-500' : 'bg-blue-100 group-hover:bg-blue-500'
                                }`}>
                                  <FileText className={`w-5 h-5 transition-colors ${
                                    isSelected ? 'text-white' : 'text-blue-600 group-hover:text-white'
                                  }`} />
                                </div>
                                <h3 className={`font-semibold text-sm mb-1 line-clamp-2 transition-colors ${
                                  isSelected ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'
                                }`}>
                                  {form.name}
                                </h3>
                                {form.description && (
                                  <p className="text-xs text-gray-500 line-clamp-2 mb-2 flex-1">
                                    {form.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5 mt-auto">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                    {form.tabs.length} {form.tabs.length === 1 ? 'tab' : 'tabs'}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                                    {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
                                  </Badge>
                                </div>
                                {isSelected && (
                                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {forms.length === 0 && (
                          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-base font-medium text-gray-900 mb-2">No templates available</h3>
                            <p className="text-gray-500 text-sm mb-4">
                              Create a form template first to start making proposals.
                            </p>
                            <Button onClick={() => navigate('/forms')} size="sm">
                              Go to Forms
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* PDF Templates Section */}
                      <div className={`transition-opacity ${!selectedForm ? 'opacity-50' : 'opacity-100'}`}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Layout className="w-5 h-5 text-purple-600" />
                          Select PDF Template
                          {!selectedForm && (
                            <span className="text-sm font-normal text-gray-400 flex items-center gap-1 ml-2">
                              <Lock className="w-3 h-3" />
                              Select a form first
                            </span>
                          )}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                          {(selectedForm ? availableTemplates : allDocumentTemplates).map((template) => {
                            const isSelected = selectedTemplate?.id === template.id;
                            return (
                              <button
                                key={template.id}
                                onClick={() => selectedForm && handleSelectTemplate(template)}
                                disabled={!selectedForm}
                                className={`aspect-square bg-white p-4 rounded-xl border-2 transition-all text-left group flex flex-col relative ${
                                  !selectedForm
                                    ? 'border-gray-100 cursor-not-allowed'
                                    : isSelected
                                    ? 'border-purple-500 ring-2 ring-purple-200 shadow-lg'
                                    : 'border-gray-200 hover:border-purple-400 hover:shadow-md'
                                }`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                                  !selectedForm
                                    ? 'bg-gray-100'
                                    : isSelected
                                    ? 'bg-purple-500'
                                    : 'bg-purple-100 group-hover:bg-purple-500'
                                }`}>
                                  <Layout className={`w-5 h-5 transition-colors ${
                                    !selectedForm
                                      ? 'text-gray-400'
                                      : isSelected
                                      ? 'text-white'
                                      : 'text-purple-600 group-hover:text-white'
                                  }`} />
                                </div>
                                <h3 className={`font-semibold text-sm mb-1 line-clamp-2 transition-colors ${
                                  !selectedForm
                                    ? 'text-gray-400'
                                    : isSelected
                                    ? 'text-purple-600'
                                    : 'text-gray-900 group-hover:text-purple-600'
                                }`}>
                                  {template.name}
                                </h3>
                                {template.description && (
                                  <p className={`text-xs line-clamp-3 flex-1 ${
                                    !selectedForm ? 'text-gray-300' : 'text-gray-500'
                                  }`}>
                                    {template.description}
                                  </p>
                                )}
                                {template.organization_id === null && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 mt-2 w-fit">
                                    System
                                  </Badge>
                                )}
                                {isSelected && selectedForm && (
                                  <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {selectedForm && availableTemplates.length === 0 && !isLoadingTemplates && (
                          <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-gray-300">
                            <Layout className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-sm font-medium text-gray-900 mb-1">No PDF templates available</h3>
                            <p className="text-gray-500 text-xs">
                              You can continue without selecting a PDF template.
                            </p>
                          </div>
                        )}

                        {isLoadingTemplates && selectedForm && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Fill Form */}
                  {step === 'fill-form' && selectedForm && (
                    <motion.div
                      key="fill-form"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Project Info Card */}
                      <div className="bg-white rounded-xl border p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <Building2 className="w-5 h-5 text-blue-600" />
                          Proposal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">
                              Project Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={projectName}
                              onChange={(e) => setProjectName(e.target.value)}
                              placeholder="Enter project name"
                              className="h-11"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Hash className="w-4 h-4" />
                              Proposal Number
                            </Label>
                            <Input
                              value={isLoadingNumber ? 'Generating...' : proposalNumber}
                              disabled
                              className="h-11 bg-gray-50 font-mono"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              Status
                            </Label>
                            <Select value={quoteStatus} onValueChange={(v: any) => setQuoteStatus(v)}>
                              <SelectTrigger className="h-11">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Incomplete">Incomplete</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Form Fields Card */}
                      <div className="bg-white rounded-xl border">
                        <Tabs value={activeTabId} onValueChange={setActiveTabId}>
                          <div className="border-b px-6 pt-4">
                            <TabsList className="bg-gray-100 p-1">
                              {selectedForm.tabs.map((tab) => (
                                <TabsTrigger
                                  key={tab.id}
                                  value={tab.id}
                                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2"
                                >
                                  {tab.name}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                          </div>

                          {selectedForm.tabs.map((tab) => (
                            <TabsContent key={tab.id} value={tab.id} className="p-6 mt-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {tab.fields.map((field) => (
                                  <div
                                    key={field.id}
                                    className={`space-y-2 ${
                                      field.field_type === 'textarea' ? 'md:col-span-2' : ''
                                    }`}
                                  >
                                    <Label className="text-sm font-medium text-gray-700">
                                      {field.label}
                                      {field.required && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    {renderFieldInput(field)}
                                    {field.helpText && (
                                      <p className="text-xs text-gray-500">{field.helpText}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {tab.fields.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                  No fields in this section
                                </div>
                              )}
                            </TabsContent>
                          ))}
                        </Tabs>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Review */}
                  {step === 'review' && selectedForm && (
                    <motion.div
                      key="review"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Summary Card */}
                      <div className="bg-white rounded-xl border p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Proposal Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                          <div>
                            <p className="text-sm text-gray-500">Form Template</p>
                            <p className="font-medium text-gray-900">{selectedForm.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">PDF Template</p>
                            <p className="font-medium text-gray-900">{selectedTemplate?.name || '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Project Name</p>
                            <p className="font-medium text-gray-900">{projectName || '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Proposal Number</p>
                            <p className="font-medium text-gray-900 font-mono">{proposalNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <Badge variant={quoteStatus === 'Draft' ? 'secondary' : 'outline'}>
                              {quoteStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Form Data Summary */}
                      {selectedForm.tabs.map((tab) => (
                        <div key={tab.id} className="bg-white rounded-xl border p-6">
                          <h4 className="font-semibold text-gray-900 mb-4">{tab.name}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tab.fields.map((field) => {
                              const value = formData[field.id] || field.default_value;
                              return (
                                <div key={field.id} className="flex justify-between py-2 border-b border-gray-100">
                                  <span className="text-gray-600">{field.label}</span>
                                  <span className="font-medium text-gray-900">
                                    {value !== undefined && value !== '' ? String(value) : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="bg-white border-t px-8 py-4 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBackAttempt}
                className="h-11"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {step === 'select-form' ? 'Cancel' : 'Back'}
              </Button>

              <div className="flex gap-3">
                {step === 'select-form' && (
                  <Button
                    onClick={handleContinueToFillForm}
                    disabled={!selectedForm}
                    className="h-11 bg-blue-600 hover:bg-blue-700"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {step === 'fill-form' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleSaveQuote}
                      disabled={isCreating || !projectName.trim()}
                      className="h-11"
                    >
                      Save as Draft
                    </Button>
                    <Button
                      onClick={() => setStep('review')}
                      disabled={!projectName.trim()}
                      className="h-11 bg-blue-600 hover:bg-blue-700"
                    >
                      Continue to Review
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}
                {step === 'review' && (
                  <Button
                    onClick={handleSaveQuote}
                    disabled={isCreating || !projectName.trim()}
                    className="h-11 bg-blue-600 hover:bg-blue-700 px-8"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Create Proposal
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved progress on this proposal. If you leave now, all your changes will be lost and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelExit}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExit}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
