import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { toast } from "sonner";

import { useQuotes } from "@/hooks/useQuotes";
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
  const { createQuote, updateQuote } = useQuotes();
  const [activeStep, setActiveStep] = useState(0);
  const [editingQuoteName, setEditingQuoteName] = useState(false);
  const [localQuoteName, setLocalQuoteName] = useState(quoteName);

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

  // Use the validation hook
  const {
    isContactInfoValid,
    isJobDetailsValid,
    isWallSpecValid,
    isPocketDoorsValid,
    isSupportStructureValid,
    isDeliveryLaborValid,
    isPricingValid
  } = useWizardValidation(contactInfo, jobDetails, walls, deliveryLabor, pricing);

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
            base_price: pricing.basePrice,
            freight: pricing.freight,
            total: pricing.total,
            payment_upon_drawings: pricing.paymentUponDrawings,
            payment_upon_track_installation: pricing.paymentUponTrackInstallation
          },
          delivery_details: deliveryLabor.delivery,
          labor_details: deliveryLabor.labor,
          proposal_number: jobDetails.proposalNumber,
          status: quoteStatus
        });
        toast.success("Quote updated successfully!");
      } else {
        await createQuote({
          quoteName: localQuoteName,
          contactInfo,
          jobDetails,
          walls,
          pocketDoors,
          supportStructure,
          deliveryLabor,
          pricing,
          status: quoteStatus
        });
        toast.success("Quote created successfully!");
      }
      onBackToDashboard();
    } catch (error) {
      toast.error("Failed to save quote");
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
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 flex flex-col overflow-hidden">
      <WizardHeader
        localQuoteName={localQuoteName}
        editingQuoteName={editingQuoteName}
        quoteStatus={quoteStatus}
        completedSteps={completedSteps}
        totalSteps={steps.length}
        onBackToDashboard={onBackToDashboard}
        onQuoteNameChange={setLocalQuoteName}
        onEditingQuoteNameChange={setEditingQuoteName}
        onQuoteStatusChange={setQuoteStatus}
        onSave={handleSave}
        onQuoteNameSave={onQuoteNameChange}
      />

      <div className="flex-1 flex overflow-hidden h-full">
        <div className="flex w-full max-w-full mx-auto px-4 h-full">
          <StepNavigation
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
                  {currentStep.isValid && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      <Star className="w-4 h-4" />
                      <span className="text-sm font-medium">Done</span>
                    </div>
                  )}
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

              <NavigationFooter
                activeStep={activeStep}
                totalSteps={steps.length}
                allStepsValid={steps.every(step => step.isValid)}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSave={handleSave}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteCreatorWizard;