/**
 * Proposal Editor (FormBuilder V4)
 *
 * Premium SaaS design with 7-tab structure:
 * Info | Products | Pricing | Lead Times | Misc | Documents | Presentation
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, CloudCheck, CloudArrowUp, Warning } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { cn } from '@/lib/utils';
import { useForm, useUpdateForm, useCreateForm } from '@/hooks/queries/useForms';
import { useProposal, useUpdateProposal } from '@/hooks/queries/useProposals';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';

// Context for shared form builder state
import {
  FormBuilderProvider,
  useFormBuilder,
  serializeFormMetadata,
  serializeFormBuilderData,
  parseFormBuilderData,
  type FormBuilderData,
} from '../context/FormBuilderContext';

// Tab Components
import { InfoTab, type InfoTabRef, type InfoTabData } from './tabs/InfoTab';
import { LeadTimesTab } from './tabs/LeadTimesTab';
import { MiscellaneousTab } from './tabs/MiscellaneousTab';
import { PricingTab } from './tabs/PricingTab';
import { DocumentsTab } from './tabs/DocumentsTab';
import { ProductsTab } from './tabs/ProductsTab';
import { PresentationTab } from './tabs/PresentationTab';

// Editor mode determines the behavior of tabs
export type EditorMode = 'builder' | 'filler';

// Common props interface for all tab components
export interface TabComponentProps {
  mode: EditorMode;
  onDirtyChange?: (isDirty: boolean) => void;
  proposalData?: any;
}

// Tab component type
type TabComponent = React.ComponentType<TabComponentProps> | null;

// Tab definitions
const TABS: { id: string; label: string; component: TabComponent }[] = [
  { id: 'info', label: 'Info', component: InfoTab },
  { id: 'products', label: 'Products', component: ProductsTab },
  { id: 'pricing', label: 'Pricing', component: PricingTab },
  { id: 'lead_times', label: 'Lead Times', component: LeadTimesTab },
  { id: 'miscellaneous', label: 'Misc', component: MiscellaneousTab },
  { id: 'documents', label: 'Documents', component: DocumentsTab },
  { id: 'presentation', label: 'Presentation', component: PresentationTab },
];

type TabId = typeof TABS[number]['id'];

interface ProposalEditorProps {
  // For builder mode: the form template being edited
  formId?: string;
  // For filler mode: the proposal being filled
  proposalId?: string;
  // Mode: 'builder' = define structure, 'filler' = enter values
  mode?: EditorMode;
  onClose?: () => void;
}

// Inner component that uses the FormBuilder context
function ProposalEditorInner({ formId, proposalId, mode = 'filler', onClose }: ProposalEditorProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('info');

  const isBuilderMode = mode === 'builder';
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string | null>(null);

  // Get current user and organization
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Fetch form data if formId is provided (builder mode)
  const { data: formData } = useForm(formId || '', !!formId);

  // Fetch proposal data if proposalId is provided (filler mode)
  const { data: proposalData } = useProposal(proposalId || '', !!proposalId);

  // In filler mode, also fetch the form template the proposal was created from
  // This is needed to get templates and other form configuration
  const proposalFormId = proposalData?.form_id;
  const { data: proposalFormData } = useForm(proposalFormId || '', !!proposalFormId && !isBuilderMode);

  // Form mutation hooks
  const updateFormMutation = useUpdateForm();
  const createFormMutation = useCreateForm();

  // Proposal mutation hooks
  const updateProposalMutation = useUpdateProposal();

  // Get form builder context
  const { config, data: builderData, isDirty, loadData, loadMetadata, markClean } = useFormBuilder();

  // Ref for InfoTab to get data on save
  const infoTabRef = useRef<InfoTabRef>(null);

  // Form/Proposal name (editable)
  const [formName, setFormName] = useState('New Form Template');
  const [proposalName, setProposalName] = useState(proposalId ? 'Untitled Proposal' : 'New Proposal');
  const [nameIsDirty, setNameIsDirty] = useState(false);
  const [initialFormName, setInitialFormName] = useState('New Form Template');
  const [initialProposalName, setInitialProposalName] = useState('Untitled Proposal');

  // Track dirty state for each tab
  const [tabDirtyStates, setTabDirtyStates] = useState<Record<string, boolean>>({});

  // Track selected Google Doc template ID (for presentation tab)
  const [selectedGoogleDocId, setSelectedGoogleDocId] = useState<string | null>(
    proposalData?.google_doc_id || null
  );

  // Extract Google Docs templates from the form's metadata (for filler mode)
  const formTemplates = useMemo(() => {
    const metadata = proposalFormData?.metadata as Record<string, unknown> | null;
    if (!metadata) return undefined;

    // Check new format: metadata.defaults.presentation.templates
    if ('defaults' in metadata && metadata.defaults) {
      const defaults = metadata.defaults as Record<string, unknown>;
      const presentation = defaults.presentation as Record<string, unknown> | undefined;
      return presentation?.templates as typeof builderData.presentation.templates | undefined;
    }

    // Check legacy format: metadata.presentation.templates
    const presentation = metadata.presentation as Record<string, unknown> | undefined;
    return presentation?.templates as typeof builderData.presentation.templates | undefined;
  }, [proposalFormData?.metadata, builderData.presentation.templates]);

  // Confirmation dialog for unsaved changes
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  // Update form name and load builder data when form data is loaded
  useEffect(() => {
    if (formData) {
      if (formData.name) {
        setFormName(formData.name);
        setInitialFormName(formData.name); // Track initial value
      }
      // Load the form metadata (config + defaults) from the form's metadata field
      if (isBuilderMode) {
        loadMetadata(formData.metadata ?? null);
      }
    }
  }, [formData, loadMetadata, isBuilderMode]);

  // Update proposal name and load proposal data when proposal data is loaded
  useEffect(() => {
    if (proposalData && !isBuilderMode) {
      if (proposalData.project_name) {
        setProposalName(proposalData.project_name);
        setInitialProposalName(proposalData.project_name);
      }
      // Load form_data from proposal into the context
      if (proposalData.form_data) {
        const parsedData = parseFormBuilderData(proposalData.form_data);
        loadData(parsedData);
      }
      // Load google_doc_id from proposal
      if (proposalData.google_doc_id) {
        setSelectedGoogleDocId(proposalData.google_doc_id);
      }
    }
  }, [proposalData, isBuilderMode, loadData]);

  // Track dirty state when name actually changes from initial value
  useEffect(() => {
    if (isBuilderMode) {
      if (formName !== initialFormName) {
        setNameIsDirty(true);
      } else {
        setNameIsDirty(false);
      }
    } else {
      if (proposalName !== initialProposalName) {
        setNameIsDirty(true);
      } else {
        setNameIsDirty(false);
      }
    }
  }, [formName, initialFormName, proposalName, initialProposalName, isBuilderMode]);

  // Callback for tabs to report dirty state changes
  const handleTabDirtyChange = useCallback((tabId: string, isDirty: boolean) => {
    setTabDirtyStates(prev => ({
      ...prev,
      [tabId]: isDirty,
    }));
  }, []);

  // Callback for InfoTab to update project name
  const handleProjectNameChange = useCallback((name: string) => {
    if (!isBuilderMode) {
      setProposalName(name);
    }
  }, [isBuilderMode]);

  // Callback for PresentationTab when a Google Doc is generated/selected
  const handleGoogleDocGenerated = useCallback((docId: string) => {
    setSelectedGoogleDocId(docId);
    // Mark as dirty to trigger auto-save
    setTabDirtyStates(prev => ({ ...prev, presentation: true }));
  }, []);

  // Callback for PresentationTab when a Google Doc is unlinked
  const handleGoogleDocUnlinked = useCallback(() => {
    setSelectedGoogleDocId(null);
    // Mark as dirty to trigger auto-save
    setTabDirtyStates(prev => ({ ...prev, presentation: true }));
  }, []);

  // Create stable callbacks for each tab (memoized to prevent infinite loops)
  const tabCallbacks = useMemo(() => {
    const callbacks: Record<string, (isDirty: boolean) => void> = {};
    TABS.forEach(tab => {
      callbacks[tab.id] = (isDirty: boolean) => handleTabDirtyChange(tab.id, isDirty);
    });
    return callbacks;
  }, [handleTabDirtyChange]);

  // Combined dirty state (includes name changes, FormBuilder context, and any tab changes)
  const hasAnyTabDirty = Object.values(tabDirtyStates).some(dirty => dirty);
  const combinedIsDirty = nameIsDirty || isDirty || hasAnyTabDirty;

  // Handle back/close navigation with unsaved changes check
  const handleClose = useCallback(() => {
    // If there are unsaved changes, show confirmation dialog
    if (combinedIsDirty) {
      setShowExitConfirmation(true);
      return;
    }

    // No unsaved changes, close immediately
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  }, [combinedIsDirty, navigate, onClose]);

  // Force close without confirmation (used when user confirms)
  const forceClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  }, [navigate, onClose]);

  // Handle save (can be called manually or by auto-save)
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!currentOrganization?.id) {
      if (!isAutoSave) toast.error('No organization selected');
      return;
    }

    if (!user?.id) {
      if (!isAutoSave) toast.error('Not authenticated');
      return;
    }

    const trimmedName = (isBuilderMode ? formName : proposalName).trim();
    if (!trimmedName) {
      if (!isAutoSave) toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      if (isBuilderMode) {
        // Serialize the form metadata (config + defaults) for saving
        const serializedMetadata = serializeFormMetadata(config, builderData);

        if (formId && formData) {
          // Update existing form
          await updateFormMutation.mutateAsync({
            id: formId,
            updates: {
              name: trimmedName,
              metadata: serializedMetadata,
            },
          });
          if (!isAutoSave) toast.success('Form template saved');
        } else {
          // Create new form
          await createFormMutation.mutateAsync({
            organization_id: currentOrganization.id,
            created_by: user.id,
            name: trimmedName,
            description: '',
            metadata: serializedMetadata,
            is_archived: false,
            is_default: false,
          });
          if (!isAutoSave) toast.success('Form template created');
        }
        markClean();
        setNameIsDirty(false);
        setTabDirtyStates({});
        // Reset InfoTab's initial values if applicable
        infoTabRef.current?.markClean();
      } else {
        // Filler mode: save proposal values
        if (!proposalId || !proposalData) {
          if (!isAutoSave) toast.error('No proposal to update');
          setSaveStatus('idle');
          return;
        }

        // Get InfoTab data from ref
        const infoData = infoTabRef.current?.getData();

        // Serialize the form builder data (terms, pricing, etc.)
        const serializedBuilderData = serializeFormBuilderData(builderData);

        // Combine info data with other tab data for form_data field
        const formDataPayload = {
          ...serializedBuilderData,
          info: infoData, // Add info tab data
        };

        // Track what we saved for comparison
        lastSavedDataRef.current = JSON.stringify(formDataPayload);

        // Extract total_value from pricing summary (subtotal before tax)
        const totalValue = builderData.pricing?.summary?.subtotal;

        await updateProposalMutation.mutateAsync({
          proposalId: proposalId,
          updates: {
            project_name: trimmedName,
            // Store all form data in the proposal's form_data field
            form_data: formDataPayload,
            // Extract key fields for easier querying/display
            client_name: infoData?.clientName || undefined,
            client_company: infoData?.clientCompany || undefined,
            job_location: infoData?.jobLocation || undefined,
            proposal_source: infoData?.proposalSource || undefined,
            // Total value from pricing (subtotal before tax)
            total_value: totalValue !== undefined ? totalValue : undefined,
            // Selected Google Docs template ID (null clears the field)
            google_doc_id: selectedGoogleDocId,
          },
        });
        if (!isAutoSave) toast.success('Proposal saved');
        markClean();
        setNameIsDirty(false);
        setTabDirtyStates({});
        // Reset InfoTab's initial values to current values
        infoTabRef.current?.markClean();
      }
      setSaveStatus('saved');
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      if (!isAutoSave) {
        toast.error('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
      // Reset error status after 5 seconds
      setTimeout(() => setSaveStatus('idle'), 5000);
    } finally {
      setIsSaving(false);
    }
  }, [
    currentOrganization?.id,
    user?.id,
    isBuilderMode,
    formName,
    proposalName,
    formId,
    formData,
    proposalId,
    proposalData,
    config,
    builderData,
    updateFormMutation,
    createFormMutation,
    updateProposalMutation,
    markClean,
    selectedGoogleDocId,
  ]);

  // Auto-save effect - debounced save when data changes (works for both builder and filler modes)
  useEffect(() => {
    // For filler mode: need existing proposal
    // For builder mode: need existing form OR valid org to create new
    const canAutoSave = isBuilderMode
      ? (formId && formData) || currentOrganization?.id // Builder: existing form or can create
      : (proposalId && proposalData); // Filler: existing proposal

    if (!canAutoSave) return;

    // Don't auto-save if nothing is dirty
    if (!combinedIsDirty) return;

    // Don't auto-save if already saving
    if (isSaving) return;

    // Clear any existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set a new timeout for auto-save (1.5 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(true); // Pass true for isAutoSave
    }, 1500);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [combinedIsDirty, isBuilderMode, proposalId, proposalData, formId, formData, currentOrganization?.id, isSaving, handleSave]);

  // Render a single tab's content
  const renderTabContent = (tab: typeof TABS[number]) => {
    if (!tab.component) {
      const isUserInputTab = tab.id === 'documents' || tab.id === 'products';
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">{tab.label} Tab</p>
            <p className="text-sm mt-1">
              {isUserInputTab
                ? 'User input area - implementation in progress'
                : 'Coming soon...'}
            </p>
          </div>
        </div>
      );
    }

    const TabComponent = tab.component;
    const onDirtyChange = tabCallbacks[tab.id];

    if (tab.id === 'info') {
      return (
        <InfoTab
          ref={infoTabRef}
          mode={mode}
          proposalData={proposalData}
          onDirtyChange={onDirtyChange}
          onProjectNameChange={handleProjectNameChange}
        />
      );
    }

    if (tab.id === 'documents') {
      return (
        <DocumentsTab
          mode={mode}
          proposalId={proposalId}
          organizationId={currentOrganization?.id}
        />
      );
    }

    // Merge organization into proposalData for tabs that need it (e.g., PresentationTab)
    const proposalWithOrg = {
      ...proposalData,
      organization: currentOrganization,
      google_doc_id: selectedGoogleDocId,
    };

    // PresentationTab needs extra props
    if (tab.id === 'presentation') {
      return (
        <TabComponent
          mode={mode}
          proposalData={proposalWithOrg}
          proposalId={proposalId}
          organizationId={currentOrganization?.id}
          onDirtyChange={onDirtyChange}
          onGoogleDocGenerated={handleGoogleDocGenerated}
          onGoogleDocUnlinked={handleGoogleDocUnlinked}
          formTemplates={formTemplates}
        />
      );
    }

    return <TabComponent mode={mode} proposalData={proposalWithOrg} onDirtyChange={onDirtyChange} />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      {/* Compact Header */}
      <header className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-2.5">
          {/* Left: Breadcrumb navigation and tabs */}
          <div className="flex items-center gap-4">
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-1.5 text-sm">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                Dashboard
              </button>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {isBuilderMode ? 'Forms' : 'Proposals'}
              </button>
              <span className="text-gray-300 dark:text-gray-600">/</span>
              {isBuilderMode ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="text-sm font-medium bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-coral rounded-none px-0 h-auto py-0 focus:ring-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 w-48"
                    placeholder="Form name..."
                  />
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <Info className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-xl">
                        <p className="font-medium">Form Structure Preview</p>
                        <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                          Define field names and layout here. Values will be entered when creating proposals.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    #{proposalData?.proposal_number || '...'}
                  </span>
                  {proposalData?.created_at && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(proposalData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {proposalData?.created_by_name && ` • ${proposalData.created_by_name}`}
                    </span>
                  )}
                </div>
              )}
            </nav>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Tab Navigation - Inline with header */}
            <nav className="flex items-center gap-1 p-0.5 bg-gray-100/80 dark:bg-gray-800/50 rounded-lg">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium whitespace-nowrap transition-all duration-200 rounded-md',
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right: Auto-save status indicator (both modes) */}
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === 'saving' && (
              <motion.div
                className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <CloudArrowUp className="w-4 h-4" />
                </motion.div>
                <span>Saving...</span>
              </motion.div>
            )}
            {saveStatus === 'saved' && (
              <motion.div
                className="flex items-center gap-1.5 text-green-600 dark:text-green-400"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <CloudCheck className="w-4 h-4" />
                <span>Saved</span>
              </motion.div>
            )}
            {saveStatus === 'error' && (
              <motion.div
                className="flex items-center gap-1.5 text-red-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Warning className="w-4 h-4" />
                <span>Save failed</span>
              </motion.div>
            )}
            {saveStatus === 'idle' && combinedIsDirty && (
              <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Unsaved</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content Area - All tabs stay mounted, only active one is visible */}
      <main className="flex-1 overflow-auto">
        <div className="px-6 py-4">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={activeTab === tab.id ? 'block' : 'hidden'}
            >
              {renderTabContent(tab)}
            </div>
          ))}
        </div>
      </main>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={forceClose}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Main component that wraps with FormBuilderProvider
export function ProposalEditor(props: ProposalEditorProps) {
  return (
    <FormBuilderProvider>
      <ProposalEditorInner {...props} />
    </FormBuilderProvider>
  );
}

export default ProposalEditor;
