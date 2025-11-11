/**
 * Proposal Form Filler
 * Dynamic form renderer for filling out form-based proposals
 * Hybrid design: left sidebar for navigation, top header for controls
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2, Circle, FileText, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "@/hooks/queries";
import { createProposal } from "@/services/proposalsService";
import { toast } from "sonner";

interface ProposalFormFillerProps {
  formId: string;
  proposalName: string;
  template: string;
  onBack: () => void;
}

export function ProposalFormFiller({
  formId,
  proposalName: initialProposalName,
  template,
  onBack,
}: ProposalFormFillerProps) {
  const navigate = useNavigate();
  const { data: form, isLoading, error } = useForm(formId);

  // Store form data as key-value pairs (fieldId -> value)
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentTab, setCurrentTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("draft");
  const [proposalName, setProposalName] = useState(initialProposalName);
  const [isEditingName, setIsEditingName] = useState(false);

  // Update a single field value
  const updateField = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Calculate tab completion status
  const tabValidation = useMemo(() => {
    if (!form) return [];

    return form.tabs.map((tab) => {
      const allFieldsValid = tab.fields.every((field) => {
        if (!field.required) return true;
        const value = formData[field.id];
        return value !== undefined && value !== null && value !== "";
      });
      return allFieldsValid;
    });
  }, [form, formData]);

  const completedTabs = tabValidation.filter(Boolean).length;
  const allTabsComplete = form ? completedTabs === form.tabs.length : false;

  // Handle form submission
  const handleSubmit = async () => {
    if (!form || isSubmitting) return;

    // Validate required fields
    const missingFields: string[] = [];
    form.tabs.forEach((tab) => {
      tab.fields.forEach((field) => {
        if (field.required && !formData[field.id]) {
          missingFields.push(field.label);
        }
      });
    });

    if (missingFields.length > 0) {
      toast.error(`Please fill out required fields: ${missingFields.join(", ")}`);
      // Jump to first incomplete tab
      const firstIncompleteTab = tabValidation.findIndex((valid) => !valid);
      if (firstIncompleteTab !== -1) {
        setCurrentTab(firstIncompleteTab);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare proposal data with metadata
      const proposalDataWithMetadata = {
        ...formData,
        _metadata: {
          proposalName,
          template,
          formName: form.name,
        },
      };

      // Create proposal using proposalsService
      const proposal = await createProposal({
        form_id: formId,
        proposal_data: proposalDataWithMetadata,
        status: status,
      });

      toast.success(`Proposal ${proposal.proposal_number} created successfully!`);
      navigate("/quotes");
    } catch (error) {
      console.error("Error creating proposal:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create proposal";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle save as incomplete
  const handleSaveAsDraft = async () => {
    if (!form || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const proposalDataWithMetadata = {
        ...formData,
        _metadata: {
          proposalName,
          template,
          formName: form.name,
        },
      };

      const proposal = await createProposal({
        form_id: formId,
        proposal_data: proposalDataWithMetadata,
        status: "draft",
      });

      toast.success(`Proposal ${proposal.proposal_number} saved as draft!`);
      navigate("/quotes");
    } catch (error) {
      console.error("Error saving draft:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save draft";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameSave = () => {
    if (proposalName.trim()) {
      setIsEditingName(false);
    } else {
      setProposalName(initialProposalName);
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setProposalName(initialProposalName);
      setIsEditingName(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading form...</p>
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">Failed to load form</p>
        <Button onClick={onBack}>Back to Quotes</Button>
      </div>
    );
  }

  const currentTabData = form.tabs[currentTab];

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Top Header */}
      <div className="w-full bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left - Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </Button>

          {/* Center - Editable Proposal name */}
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <Input
                value={proposalName}
                onChange={(e) => setProposalName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className="text-lg font-bold h-10 px-3 max-w-md"
                autoFocus
              />
            ) : (
              <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setIsEditingName(true)}
              >
                <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {proposalName}
                </h1>
                <Edit2 className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* Right - Progress and save buttons */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <div className="w-12 bg-slate-200 rounded-full h-1">
                <div
                  className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(completedTabs / form.tabs.length) * 100}%` }}
                />
              </div>
              <span>{completedTabs}/{form.tabs.length}</span>
            </div>

            {/* Save as Draft button - only show if form allows incomplete saves */}
            {form.allow_save_incomplete !== false && (
              <Button
                variant="outline"
                onClick={handleSaveAsDraft}
                size="sm"
                disabled={isSubmitting}
                className="px-3 py-2 rounded-lg border hover:bg-slate-50 transition-all duration-200 text-slate-600"
              >
                Save as Draft
              </Button>
            )}

            {/* Save Proposal button */}
            <Button
              onClick={handleSubmit}
              disabled={!allTabsComplete || isSubmitting}
              size="sm"
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1" />
              {isSubmitting ? "Creating..." : "Create Proposal"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Layout - Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tab Navigation */}
        <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto">
          <div className="p-4">
            {/* Form Name */}
            <div className="mb-4 px-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <FileText className="w-3.5 h-3.5" />
                <span className="font-medium uppercase tracking-wide">Form Template</span>
              </div>
              <div className="text-sm font-semibold text-slate-700">
                {form.name}
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="mb-4 px-2">
              <Label className="text-xs text-slate-500 uppercase tracking-wide mb-2 block">
                Status
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className={`w-full h-9 text-sm ${
                  !status || status === ''
                    ? 'border-red-300 border-2'
                    : 'border-green-300 border-2'
                }`}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Form Sections Header */}
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 px-2">
              Form Sections
            </div>

            {/* Tabs Navigation */}
            <nav className="space-y-1">
              {form.tabs.map((tab, index) => {
                const isActive = index === currentTab;
                const isCompleted = tabValidation[index];

                return (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(index)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 shadow-sm'
                        : isCompleted
                          ? 'bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/50'
                          : 'hover:bg-slate-50 border border-transparent'
                      }
                    `}
                  >
                    <div className={`
                      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                      ${isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`
                        font-medium text-sm truncate
                        ${isActive ? 'text-indigo-900' : isCompleted ? 'text-emerald-900' : 'text-slate-700'}
                      `}>
                        {tab.name}
                      </div>
                    </div>
                    {!isCompleted && !isActive && (
                      <Circle className="w-1.5 h-1.5 text-slate-300 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-8 py-8">
              {/* Tab Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">{currentTabData?.name}</h2>
                {currentTabData?.description && (
                  <p className="text-sm text-slate-600 mt-2">{currentTabData.description}</p>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-6">
                {currentTabData?.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>

                    {field.description && (
                      <p className="text-sm text-slate-500">{field.description}</p>
                    )}

                    {/* Render field based on type */}
                    {field.field_type === "input" && (
                      <Input
                        id={field.id}
                        type={field.input_type || "text"}
                        placeholder={field.placeholder}
                        value={formData[field.id] || ""}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        required={field.required}
                        className="h-11 rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                      />
                    )}

                    {field.field_type === "textarea" && (
                      <Textarea
                        id={field.id}
                        placeholder={field.placeholder}
                        value={formData[field.id] || ""}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        required={field.required}
                        rows={4}
                        className="rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                      />
                    )}

                    {field.field_type === "date" && (
                      <Input
                        id={field.id}
                        type="date"
                        value={formData[field.id] || ""}
                        onChange={(e) => updateField(field.id, e.target.value)}
                        required={field.required}
                        className="h-11 rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
