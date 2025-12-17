/**
 * Proposal Editor (FormBuilder V4)
 *
 * Premium SaaS design with 8-tab structure:
 * Info | Products | Pricing | Terms | Lead Times | Misc | Documents | Presentation
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FloppyDisk, Check, Info } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { TermsTab } from './tabs/TermsTab';
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
  { id: 'terms', label: 'Terms', component: TermsTab },
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

  // Get current user and organization
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Fetch form data if formId is provided
  const { data: formData } = useForm(formId || '', !!formId);

  // Fetch proposal data if proposalId is provided
  const { data: proposalData } = useProposal(proposalId || '', !!proposalId);

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
        loadMetadata(formData.metadata);
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

  // Handle save
  const handleSave = useCallback(async () => {
    if (!currentOrganization?.id) {
      toast.error('No organization selected');
      return;
    }

    if (!user?.id) {
      toast.error('Not authenticated');
      return;
    }

    const trimmedName = (isBuilderMode ? formName : proposalName).trim();
    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);

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
          toast.success('Form template saved');
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
          toast.success('Form template created');
        }
        markClean();
        setNameIsDirty(false);
        setTabDirtyStates({});
      } else {
        // Filler mode: save proposal values
        if (!proposalId || !proposalData) {
          toast.error('No proposal to update');
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
          },
        });
        toast.success('Proposal saved');
        markClean();
        setNameIsDirty(false);
        setTabDirtyStates({});
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to save: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
  ]);

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

    return <TabComponent mode={mode} proposalData={proposalData} onDirtyChange={onDirtyChange} />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col">
      {/* Premium Header */}
      <header className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800">
        <div className="flex items-center justify-between px-8 py-5">
          {/* Left: Back button and editable title */}
          <div className="flex items-center gap-5">
            <button
              onClick={handleClose}
              className="p-2.5 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-all duration-200 group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors" />
            </button>

            <div className="flex items-center gap-2">
              {/* Builder Mode Info Tooltip */}
              {isBuilderMode && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
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
              )}

              {/* Builder Mode: Editable Form Name | Filler Mode: Proposal Number */}
              {isBuilderMode ? (
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="text-xl font-semibold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-coral rounded-none px-0 h-auto py-1 focus:ring-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  placeholder="Form name..."
                />
              ) : (
                <div className="flex flex-col gap-0.5">
                  <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                    #{proposalData?.proposal_number || 'Loading...'}
                  </span>
                  {proposalData?.created_at && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2">
                      <span>Created: {new Date(proposalData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {proposalData?.created_by_name && (
                        <span>• By: {proposalData.created_by_name}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-4">
            {combinedIsDirty && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Unsaved
                </span>
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || !combinedIsDirty}
              className="rounded-xl px-4 h-11 bg-[#ee6c4d] hover:bg-[#e05a3a] text-white shadow-sm transition-all duration-200"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <FloppyDisk className="w-4 h-4" />
                  </motion.div>
                  <span>Saving...</span>
                </div>
              ) : (
                <span>Save</span>
              )}
            </Button>
          </div>
        </div>

        {/* Tab Navigation - Pill Style */}
        <nav className="px-8 pb-4">
          <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 dark:bg-gray-800/50 rounded-2xl w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-6 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 rounded-xl',
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Content Area - All tabs stay mounted, only active one is visible */}
      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">
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
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={forceClose}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Discard Changes
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
