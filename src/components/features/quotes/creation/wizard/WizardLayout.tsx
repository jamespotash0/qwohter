import React from 'react';
import { QuoteNameInput } from '@/components/common/inputs';
import { WizardStepsSidebar } from './WizardStepsSidebar';
import { WizardNavigation } from './WizardNavigation';
import { useWizard } from './WizardProvider';
import { cn } from '@/lib/utils';
import type { QuoteFormData } from './types';

/**
 * WizardLayout Props
 */
interface WizardLayoutProps {
  children: React.ReactNode;
  quoteName: string;
  onQuoteNameChange?: (name: string) => void;
  formData: Partial<QuoteFormData>;
  onSave?: (data: Partial<QuoteFormData>) => Promise<void>;
  showBackToDashboard?: boolean;
  onBackToDashboard?: () => void;
  className?: string;
}

/**
 * WizardLayout Component
 * Main layout container for the wizard with sidebar and navigation
 * 
 * Features:
 * - Two-column layout (sidebar + content)
 * - Quote name input
 * - Navigation controls
 * - Progress tracking
 * - Responsive design
 */
export const WizardLayout: React.FC<WizardLayoutProps> = ({
  children,
  quoteName,
  onQuoteNameChange,
  formData,
  onSave,
  showBackToDashboard,
  onBackToDashboard,
  className,
}) => {
  const { currentStep } = useWizard();

  return (
    <div className={cn("min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6", className)}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Quote Creator
              </h1>
              <p className="text-gray-600">
                Step-by-step quote creation wizard
              </p>
            </div>
            
            {/* Quote Name Input */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Quote Name
                </label>
                <QuoteNameInput
                  quoteName={quoteName}
                  onQuoteNameChange={onQuoteNameChange}
                  className="min-w-[300px]"
                />
              </div>
            </div>
          </div>

          {/* Current Step Info */}
          {currentStep && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-3">
                <currentStep.icon className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {currentStep.label}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {currentStep.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <WizardStepsSidebar />
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Step Content */}
              <div className="min-h-[500px]">
                {children}
              </div>

              {/* Navigation */}
              <WizardNavigation
                formData={formData}
                onSave={onSave}
                showBackToDashboard={showBackToDashboard}
                onBackToDashboard={onBackToDashboard}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};