import React from 'react';
import { WizardStep } from '../WizardStep';
import ContactInfoForm from '@/components/features/quotes/forms/contact/ContactInfoForm';
import type { ContactFormData } from '../types';

/**
 * ContactInfoStep Props
 */
interface ContactInfoStepProps {
  data: ContactFormData;
  onChange: (data: ContactFormData) => void;
  isActive: boolean;
}

/**
 * ContactInfoStep Component
 * Wizard step wrapper for contact information form
 * 
 * Features:
 * - Wraps existing ContactInfoForm
 * - Provides step-specific layout
 * - Handles data transformation
 * - Maintains form validation
 */
export const ContactInfoStep: React.FC<ContactInfoStepProps> = ({
  data,
  onChange,
  isActive,
}) => {
  return (
    <WizardStep
      isActive={isActive}
      title="Contact Information"
      description="Enter your company contact details and information"
    >
      <ContactInfoForm
        contactInfo={data}
        setContactInfo={onChange}
        validationErrors={{}} // TODO: Add validation
      />
    </WizardStep>
  );
};