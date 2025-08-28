/**
 * Quote Creation Wizard System
 * 
 * A complete wizard implementation with:
 * - Provider-based state management
 * - Step navigation and validation
 * - Progress tracking
 * - Reusable step components
 * - Responsive layout
 * - Form integration
 * 
 * Usage:
 * ```tsx
 * import { WizardProvider, WizardLayout, ContactInfoStep } from './wizard'
 * 
 * <WizardProvider steps={steps} onSave={handleSave}>
 *   <WizardLayout quoteName={name} formData={data}>
 *     <ContactInfoStep data={contactData} onChange={setContactData} />
 *   </WizardLayout>
 * </WizardProvider>
 * ```
 */

// Core Provider and Context
export { WizardProvider, useWizard } from './WizardProvider';

// Layout and Components
export { WizardLayout } from './WizardLayout';
export { WizardStep } from './WizardStep';
export { WizardNavigation } from './WizardNavigation';
export { WizardStepsSidebar } from './WizardStepsSidebar';

// Step Components
export { ContactInfoStep } from './steps/ContactInfoStep';
export { JobDetailsStep } from './steps/JobDetailsStep';

// Hooks
export { useWizardState } from './hooks/useWizardState';

// Types
export type * from './types';