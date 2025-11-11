/**
 * Proposal Form Filler
 * Dynamic form renderer for filling out form-based proposals
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  proposalName,
  template,
  onBack,
}: ProposalFormFillerProps) {
  const navigate = useNavigate();
  const { data: form, isLoading, error } = useForm(formId);

  // Store form data as key-value pairs (fieldId -> value)
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [currentTab, setCurrentTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update a single field value
  const updateField = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

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
        status: "draft",
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

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {proposalName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Form: {form.name}
              </p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Proposal
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Form Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <Tabs value={currentTab.toString()} onValueChange={(v) => setCurrentTab(parseInt(v))}>
              <TabsList className="mb-6">
                {form.tabs.map((tab, index) => (
                  <TabsTrigger key={tab.id} value={index.toString()}>
                    {tab.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {form.tabs.map((tab, tabIndex) => (
                <TabsContent key={tab.id} value={tabIndex.toString()} className="space-y-6">
                  {tab.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id} className="flex items-center gap-2">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>

                      {field.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {field.description}
                        </p>
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
                        />
                      )}

                      {field.field_type === "date" && (
                        <Input
                          id={field.id}
                          type="date"
                          value={formData[field.id] || ""}
                          onChange={(e) => updateField(field.id, e.target.value)}
                          required={field.required}
                        />
                      )}

                      {/* Add more field types as needed */}
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
