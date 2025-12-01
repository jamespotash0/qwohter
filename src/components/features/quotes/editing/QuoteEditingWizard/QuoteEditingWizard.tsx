import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { useUpdateQuote } from "@/hooks/queries/useQuotes";
import { QuoteEditingWizardProps } from './types/editingTypes';
import { useEditingState } from './hooks/useEditingState';
import { useEditingValidation } from './hooks/useEditingValidation';
import { createEditingSteps } from './utils/editingSteps';
import { EditingHeader } from './components/EditingHeader';
import { EditingStepNavigation } from './components/EditingStepNavigation';
import { StepContent } from '@/components/features/quotes/creation/QuoteCreatorWizard/components/StepContent';

const QuoteEditingWizard = ({
  existingQuote,
  onBackToDashboard,
  onQuoteNameChange
}: QuoteEditingWizardProps) => {
  const { mutateAsync: updateQuoteMutation } = useUpdateQuote();

  // Wrapper for backward compatibility
  const updateQuote = async (id: string, updates: any) => {
    return await updateQuoteMutation({ id, updates });
  };
  const [activeStep, setActiveStep] = useState(0);
  const [editingQuoteName, setEditingQuoteName] = useState(false);

  // Use the editing-specific state management
  const {
    contactInfo,
    jobDetails,
    walls,
    deliveryLabor,
    pricing,
    quoteStatus,
    quoteName,
    changeTracker,
    hasUnsavedChanges,
    resetChangeTracking,
    setContactInfo,
    setJobDetails,
    setWalls,
    setDeliveryLabor,
    setPricing,
    setQuoteStatus,
    setQuoteName,
    handleWallPocketDoorsUpdate,
    handleWallStructureSupportUpdate
  } = useEditingState(existingQuote);

  // Use the editing-specific validation
  const {
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid,
    isCompletelyValid
  } = useEditingValidation(contactInfo, jobDetails, walls, deliveryLabor, pricing, quoteStatus);

  // Create editing steps with change tracking
  const steps = createEditingSteps(
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid,
    changeTracker
  );

  const currentStep = steps[activeStep] ?? steps[0]!;
  const completedSteps = steps.filter(step => step.isValid).length;

  const handleSave = async () => {
    if (!isCompletelyValid) {
      const firstInvalidStep = steps.findIndex(step => !step.isValid);
      if (firstInvalidStep !== -1) {
        setActiveStep(firstInvalidStep);
        toast.error(`Please complete the ${steps[firstInvalidStep]!.label} section`);
      }
      return;
    }

    try {
      await updateQuote(existingQuote.id, {
        project_name: quoteName,
        quote_details: contactInfo,
        job_details: {
          job_location: jobDetails.jobLocation,
          client_name: jobDetails.billedTo.name,
          client_company: jobDetails.billedTo.company,
          client_address: jobDetails.billedTo.address,
          date: jobDetails.date
        },
        wall_details: walls,
        price_details: {
          kwik_wall_materials_cost: pricing.kwik_wall_materials_cost || 0,
          misc_materials_cost: pricing.misc_materials_cost || 0,
          delivery_cost_track: pricing.delivery_cost_track || 0,
          delivery_cost_panel: pricing.delivery_cost_panel || 0,
          track_equipment_costs: pricing.track_equipment_costs || 0,
          track_labor_cost: pricing.track_labor_cost || 0,
          panel_equipment_costs: pricing.panel_equipment_costs || 0,
          panel_labor_cost: pricing.panel_labor_cost || 0,
          track_freight_factory: pricing.track_freight_factory || 0,
          panel_freight_factory: pricing.panel_freight_factory || 0,
          local_handling_costs: pricing.local_handling_costs || 0,
          materials_markup_percentage: pricing.materials_markup_percentage || 0,
          shipping_markup_percentage: pricing.shipping_markup_percentage || 0,
          unseen_costs: pricing.unseen_costs || 0,
          unseen_costs_percentage: pricing.unseen_costs_percentage || 10,
          unseen_costs_locked: pricing.unseen_costs_locked !== false,
          cost_subtotal: pricing.cost_subtotal || 0,
          base_selling_price: pricing.base_selling_price || 0,
          shipping_cost_subtotal: pricing.shipping_cost_subtotal || 0,
          shipping_selling_price: pricing.shipping_selling_price || 0,
          final_selling_price: pricing.final_selling_price || 0,
          base_selling_gross_profit_percentage: pricing.base_selling_gross_profit_percentage || 0,
          shipping_selling_gross_profit_percentage: pricing.shipping_selling_gross_profit_percentage || 0,
          final_selling_gross_profit_percentage: pricing.final_selling_gross_profit_percentage || 0,
          final_selling_price_profit_amount: pricing.final_selling_price_profit_amount || 0,
          payment_upon_drawings: pricing.payment_upon_drawings,
          payment_upon_track_installation: pricing.payment_upon_track_installation,
        },
        delivery_details: deliveryLabor.delivery,
        labor_details: deliveryLabor.labor,
        proposal_number: jobDetails.proposalNumber,
        quote_source: contactInfo.quoteSource,
        status: quoteStatus
      });

      resetChangeTracking();
      onBackToDashboard();
    } catch (error) {
      toast.error("Failed to update quote");
    }
  };

  const handleSaveAsIncomplete = async () => {
    try {
      await updateQuote(existingQuote.id, {
        project_name: quoteName,
        quote_details: contactInfo,
        job_details: {
          job_location: jobDetails.jobLocation || "",
          client_name: jobDetails.billedTo?.name || "",
          client_company: jobDetails.billedTo?.company || "",
          client_address: jobDetails.billedTo?.address || "",
          date: jobDetails.date || ""
        },
        wall_details: walls,
        price_details: {
          kwik_wall_materials_cost: pricing.kwik_wall_materials_cost || 0,
          misc_materials_cost: pricing.misc_materials_cost || 0,
          delivery_cost_track: pricing.delivery_cost_track || 0,
          delivery_cost_panel: pricing.delivery_cost_panel || 0,
          track_equipment_costs: pricing.track_equipment_costs || 0,
          track_labor_cost: pricing.track_labor_cost || 0,
          panel_equipment_costs: pricing.panel_equipment_costs || 0,
          panel_labor_cost: pricing.panel_labor_cost || 0,
          track_freight_factory: pricing.track_freight_factory || 0,
          panel_freight_factory: pricing.panel_freight_factory || 0,
          local_handling_costs: pricing.local_handling_costs || 0,
          materials_markup_percentage: pricing.materials_markup_percentage || 0,
          shipping_markup_percentage: pricing.shipping_markup_percentage || 0,
          unseen_costs: pricing.unseen_costs || 0,
          unseen_costs_percentage: pricing.unseen_costs_percentage || 10,
          unseen_costs_locked: pricing.unseen_costs_locked !== false,
          cost_subtotal: pricing.cost_subtotal || 0,
          base_selling_price: pricing.base_selling_price || 0,
          shipping_cost_subtotal: pricing.shipping_cost_subtotal || 0,
          shipping_selling_price: pricing.shipping_selling_price || 0,
          final_selling_price: pricing.final_selling_price || 0,
          base_selling_gross_profit_percentage: pricing.base_selling_gross_profit_percentage || 0,
          shipping_selling_gross_profit_percentage: pricing.shipping_selling_gross_profit_percentage || 0,
          final_selling_gross_profit_percentage: pricing.final_selling_gross_profit_percentage || 0,
          final_selling_price_profit_amount: pricing.final_selling_price_profit_amount || 0,
          payment_upon_drawings: pricing.payment_upon_drawings || "",
          payment_upon_track_installation: pricing.payment_upon_track_installation || "",
        },
        delivery_details: deliveryLabor.delivery,
        labor_details: deliveryLabor.labor,
        proposal_number: jobDetails.proposalNumber || "",
        quote_source: contactInfo.quoteSource,
        status: "Incomplete"
      });
      
      resetChangeTracking();
      toast.success("Quote saved as incomplete!");
      onBackToDashboard();
    } catch (error) {
      toast.error("Failed to save quote");
    }
  };

  const allQuoteData = {
    contactInfo,
    jobDetails,
    walls,
    pocketDoors: { foldType: "", foldStyle: "" }, // Legacy compatibility
    supportStructure: { mountingTrack: "" }, // Legacy compatibility
    deliveryLabor,
    pricing,
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex flex-col overflow-hidden">
      <EditingHeader
        localQuoteName={quoteName}
        editingQuoteName={editingQuoteName}
        quoteStatus={quoteStatus}
        completedSteps={completedSteps}
        totalSteps={steps.length}
        hasUnsavedChanges={hasUnsavedChanges}
        isCompletelyValid={isCompletelyValid}
        onBackToDashboard={onBackToDashboard}
        onQuoteNameChange={setQuoteName}
        onEditingQuoteNameChange={setEditingQuoteName}
        onQuoteStatusChange={setQuoteStatus}
        onSave={handleSave}
        onSaveAsDraft={handleSaveAsIncomplete}
        onQuoteNameSave={onQuoteNameChange}
      />

      <div className="flex-1 flex overflow-hidden h-full">
        <div className="flex w-full max-w-full mx-auto px-4 h-full">
          <EditingStepNavigation
            steps={steps}
            activeStep={activeStep}
            onStepChange={setActiveStep}
          />

          {/* Main Content */}
          <div className="flex-1 p-4 pl-2 flex flex-col overflow-hidden h-full">
            <Card className="bg-white/90 backdrop-blur-sm border border-white/50 shadow-2xl flex-1 flex flex-col overflow-hidden focus-within:ring-0 h-full">
              <CardHeader className="pb-4 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <currentStep.icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900">
                        {currentStep.label}
                      </CardTitle>
                      <p className="text-slate-600 text-sm">{currentStep.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentStep.hasChanges && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
                        <Star className="w-4 h-4" />
                        <span className="text-sm font-medium">Modified</span>
                      </div>
                    )}
                    {currentStep.isValid && !currentStep.hasChanges && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        <Star className="w-4 h-4" />
                        <span className="text-sm font-medium">Complete</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 px-10 pt-4 pb-10 overflow-hidden min-h-0">
                <div className="h-full overflow-y-auto">
                  <div className="pr-8 pb-6 min-h-full">
                    <StepContent
                      stepId={currentStep.id}
                      contactInfo={contactInfo}
                      jobDetails={jobDetails}
                      walls={walls}
                      deliveryLabor={deliveryLabor}
                      pricing={pricing}
                      allQuoteData={allQuoteData}
                      onContactInfoUpdate={setContactInfo}
                      onJobDetailsUpdate={setJobDetails}
                      onWallsUpdate={setWalls}
                      onDeliveryLaborUpdate={setDeliveryLabor}
                      onPricingUpdate={setPricing}
                      onWallPocketDoorsUpdate={handleWallPocketDoorsUpdate}
                      onWallStructureSupportUpdate={handleWallStructureSupportUpdate}
                      onSave={handleSave}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteEditingWizard;