import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useCreateQuote, useUpdateQuote } from "@/_deprecated/hooks/queries/useQuotes";
import { useCurrentOrganization } from "@/hooks/queries";
import { useUser } from "@/auth";
import { QuoteCreatorWizardProps } from './types/wizardTypes';
import { useWizardState } from './hooks/useWizardState';
import { useWizardValidation } from './hooks/useWizardValidation';
import { createWizardSteps } from './utils/wizardSteps';
import { WizardHeader } from './components/WizardHeader';
import { StepNavigation } from './components/StepNavigation';
import { StepContent } from './components/StepContent';
import { NavigationFooter } from './components/NavigationFooter';

const QuoteCreatorWizard = ({
  quoteName,
  onBackToDashboard,
  onQuoteNameChange,
  existingQuote
}: QuoteCreatorWizardProps) => {
  const { mutateAsync: createQuoteMutation } = useCreateQuote();
  const { mutateAsync: updateQuoteMutation } = useUpdateQuote();

  // Wrappers for backward compatibility
  const createQuote = async (quoteData: any) => {
    return await createQuoteMutation(quoteData);
  };

  const updateQuote = async (id: string, updates: any) => {
    return await updateQuoteMutation({ id, updates });
  };
  const [activeStep, setActiveStep] = useState(0);
  const [editingQuoteName, setEditingQuoteName] = useState(false);
  const [localQuoteName, setLocalQuoteName] = useState(quoteName);
  const [pricingTouchedFields, setPricingTouchedFields] = useState<Set<string>>(new Set());
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Use the state management hook
  const {
    quoteStatus,
    contactInfo,
    jobDetails,
    walls,
    pocketDoors,
    supportStructure,
    deliveryLabor,
    pricing,
    existingQuoteData,
    setQuoteStatus,
    setContactInfo,
    setJobDetails,
    setWalls,
    setDeliveryLabor,
    setPricing,
    handleWallPocketDoorsUpdate,
    handleWallStructureSupportUpdate
  } = useWizardState(existingQuote);

  // Sync localQuoteName with quoteName prop when it changes
  useEffect(() => {
    if (quoteName !== localQuoteName) {
      setLocalQuoteName(quoteName);
    }
  }, [quoteName]);

  // Get organization settings for conditional fax validation
  const user = useUser();
  const { organization } = useCurrentOrganization(user?.id || '');

  // Note: organization_name is now set at the top-level column by quotesService
  // For existing quotes, it's read from the database via useWizardState
  // For new quotes, quotesService fetches it from the organizations table

  // Use the validation hook
  const {
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid,
    // isQuoteStatusValid
  } = useWizardValidation(contactInfo, jobDetails, walls, deliveryLabor, pricing, quoteStatus, organization || undefined, pricingTouchedFields);

  // Handle back button - always show confirmation
  const handleBackAttempt = () => {
    setShowExitConfirmation(true);
  };

  // Create wizard steps with validation states
  const steps = createWizardSteps(
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid
  );

  const currentStep = steps[activeStep] ?? steps[0]!;
  const completedSteps = steps.filter(step => step.isValid).length;

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSave = async () => {
    const allValid = steps.every(step => step.isValid);
    
    if (!allValid) {
      const firstInvalidStep = steps.findIndex(step => !step.isValid);
      if (firstInvalidStep !== -1) {
        setActiveStep(firstInvalidStep);
        toast.error(`Please complete the ${steps[firstInvalidStep]!.label} section`);
      }
      return;
    }

    try {
      if (existingQuote) {
        await updateQuote((existingQuoteData?.id as string), {
          project_name: localQuoteName,
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
          status: quoteStatus as any
        });
        toast.success("Quote updated successfully!");
      } else {
        await createQuote({
          project_name: localQuoteName,
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
          status: quoteStatus,
          proposal_number: jobDetails.proposalNumber,
          quote_source: contactInfo.quoteSource || ""
        });
        toast.success("Quote created successfully!");
      }
      onBackToDashboard();
    } catch (error) {
      toast.error("Failed to save quote");
    }
  };

  const handleSaveAsDraft = async () => {
    // Skip validation and save with Draft status
    try {
      if (existingQuote) {
        await updateQuote((existingQuoteData?.id as string), {
          project_name: localQuoteName,
          quote_details: contactInfo,
          // created_by:
          //quote_source
          //status_last_updated
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
          quote_source: contactInfo.quoteSource || "",
          status: "Incomplete"
        });
        toast.success("Quote saved as incomplete!");
      } else {
        await createQuote({
          project_name: localQuoteName,
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
          status: "Incomplete",
          quote_source: contactInfo.quoteSource || "",
          proposal_number: jobDetails.proposalNumber || ""
        });
        toast.success("Quote saved as incomplete!");
      }
      onBackToDashboard();
    } catch (error) {
      toast.error("Failed to save draft");
    }
  };

  const allQuoteData = {
    contactInfo,
    jobDetails,
    walls,
    pocketDoors,
    supportStructure,
    deliveryLabor,
    pricing,
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      {/* Combined Header with Navigation */}
      <div className="w-full bg-white border-b border-slate-200 flex-shrink-0">
        <div className="w-full px-8">
          {/* Top row - Back button, quote name, save buttons */}
          <div className="flex items-center justify-between py-4 border-b border-slate-100">
            <WizardHeader
              localQuoteName={localQuoteName}
              editingQuoteName={editingQuoteName}
              quoteStatus={quoteStatus}
              completedSteps={completedSteps}
              totalSteps={steps.length}
              onBackToDashboard={handleBackAttempt}
              onQuoteNameChange={setLocalQuoteName}
              onEditingQuoteNameChange={setEditingQuoteName}
              onQuoteStatusChange={setQuoteStatus}
              onSave={handleSave}
              onSaveAsDraft={handleSaveAsDraft}
              onQuoteNameSave={onQuoteNameChange}
            />
          </div>

          {/* Bottom row - Step navigation */}
          <div className="py-3 -mx-8">
            <div className="px-8 overflow-x-auto">
              <StepNavigation
                steps={steps}
                activeStep={activeStep}
                onStepChange={setActiveStep}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-16 py-8">
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
              onPricingTouchedFieldsUpdate={setPricingTouchedFields}
            />
          </div>
        </div>

        <NavigationFooter
          activeStep={activeStep}
          totalSteps={steps.length}
          allStepsValid={steps.every(step => step.isValid)}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onSave={handleSave}
        />
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to exit?</AlertDialogTitle>
            <AlertDialogDescription>
              You will lose all current data and the quote will not be stored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirmation(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExitConfirmation(false);
                onBackToDashboard();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default QuoteCreatorWizard;