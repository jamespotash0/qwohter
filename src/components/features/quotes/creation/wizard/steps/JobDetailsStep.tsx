import React from 'react';
import { WizardStep } from '../WizardStep';
import JobDetailsForm from '@/components/features/quotes/forms/contact/JobDetailsForm';
import type { JobDetailsFormData } from '../types';

/**
 * JobDetailsStep Props
 */
interface JobDetailsStepProps {
  data: JobDetailsFormData;
  onChange: (data: JobDetailsFormData) => void;
  isActive: boolean;
}

/**
 * JobDetailsStep Component
 * Wizard step wrapper for project details form
 * 
 * Features:
 * - Wraps existing JobDetailsForm
 * - Provides step-specific layout
 * - Handles data transformation
 * - Maintains form validation
 */
export const JobDetailsStep: React.FC<JobDetailsStepProps> = ({
  data,
  onChange,
  isActive,
}) => {
  return (
    <WizardStep
      isActive={isActive}
      title="Project Details"
      description="Provide job location, client information, and project specifics"
    >
      <JobDetailsForm
        data={data}
        onUpdate={onChange}
      />
    </WizardStep>
  );
};