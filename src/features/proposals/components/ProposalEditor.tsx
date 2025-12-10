/**
 * Proposal Editor (FormBuilder V4)
 *
 * Premium SaaS design with 8-tab structure:
 * Info | Products | Pricing | Terms | Lead Times | Misc | Documents | Presentation
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FloppyDisk, Check, Info } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useForm, useUpdateForm, useCreateForm } from '@/hooks/queries/useForms';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { useUser } from '@/auth';

// Context for shared form builder state
import {
  FormBuilderProvider,
  useFormBuilder,
  serializeFormBuilderData,
  parseFormBuilderData,
  type FormBuilderData,
} from '../context/FormBuilderContext';

// Tab Components
import { InfoTab } from './tabs/InfoTab';
import { LeadTimesTab } from './tabs/LeadTimesTab';
import { MiscellaneousTab } from './tabs/MiscellaneousTab';
import { PricingTab } from './tabs/PricingTab';
import { TermsTab } from './tabs/TermsTab';
// import { ProductsTab } from './tabs/ProductsTab';
// import { DocumentsTab } from './tabs/DocumentsTab';
// import { PresentationTab } from './tabs/PresentationTab';

// Editor mode determines the behavior of tabs
export type EditorMode = 'builder' | 'filler';

// Common props interface for all tab components
export interface TabComponentProps {
  mode: EditorMode;
}

// Tab component type
type TabComponent = React.ComponentType<TabComponentProps> | null;

// Tab definitions
const TABS: { id: string; label: string; component: TabComponent }[] = [
  { id: 'info', label: 'Info', component: InfoTab },
  { id: 'products', label: 'Products', component: null },
  { id: 'pricing', label: 'Pricing', component: PricingTab },
  { id: 'terms', label: 'Terms', component: TermsTab },
  { id: 'lead_times', label: 'Lead Times', component: LeadTimesTab },
  { id: 'miscellaneous', label: 'Misc', component: MiscellaneousTab },
  { id: 'documents', label: 'Documents', component: null },
  { id: 'presentation', label: 'Presentation', component: null },
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

  // Form mutation hooks
  const updateFormMutation = useUpdateForm();
  const createFormMutation = useCreateForm();

  // Get form builder context
  const { data: builderData, isDirty, loadData, markClean } = useFormBuilder();

  // Form/Proposal name (editable)
  const [formName, setFormName] = useState('New Form Template');
  const [proposalName, setProposalName] = useState(proposalId ? 'Untitled Proposal' : 'New Proposal');
  const [nameIsDirty, setNameIsDirty] = useState(false);

  // Update form name and load builder data when form data is loaded
  useEffect(() => {
    if (formData) {
      if (formData.name) {
        setFormName(formData.name);
      }
      // Load the builder data from the form's metadata field
      if (formData.metadata && isBuilderMode) {
        const parsedData = parseFormBuilderData(formData.metadata);
        loadData(parsedData);
      }
    }
  }, [formData, loadData, isBuilderMode]);

  // Track dirty state when name changes
  useEffect(() => {
    if (formData?.name && formName !== formData.name) {
      setNameIsDirty(true);
    }
  }, [formName, formData?.name]);

  // Combined dirty state
  const combinedIsDirty = nameIsDirty || isDirty;

  // Handle back/close navigation
  const handleClose = useCallback(() => {
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
        // Serialize the form builder data for saving
        const serializedData = serializeFormBuilderData(builderData);

        if (formId && formData) {
          // Update existing form
          await updateFormMutation.mutateAsync({
            id: formId,
            updates: {
              name: trimmedName,
              metadata: serializedData,
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
            tabs: [],
            metadata: serializedData,
            is_archived: false,
            is_default: false,
          });
          toast.success('Form template created');
        }
        markClean();
        setNameIsDirty(false);
      } else {
        // Filler mode: save proposal values
        // This would save to the proposals table
        toast.success('Proposal saved');
      }

      handleClose();
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
    builderData,
    updateFormMutation,
    createFormMutation,
    markClean,
    handleClose,
  ]);

  // Render active tab content
  const renderTabContent = () => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab?.component) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">{tab?.label} Tab</p>
            <p className="text-sm mt-1">Coming soon...</p>
          </div>
        </div>
      );
    }
    const TabComponent = tab.component;
    return <TabComponent mode={mode} />;
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

            <div className="flex items-center gap-1.5">
              {/* Editable Form/Proposal Name */}
              <Input
                value={isBuilderMode ? formName : proposalName}
                onChange={(e) => isBuilderMode ? setFormName(e.target.value) : setProposalName(e.target.value)}
                className="text-xl font-semibold bg-transparent border-0 border-b-2 border-transparent hover:border-gray-200 focus:border-coral rounded-none px-0 h-auto py-1 focus:ring-0 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                placeholder={isBuilderMode ? 'Form name...' : 'Proposal name...'}
              />

              {/* Builder Mode Info Tooltip */}
              {isBuilderMode && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="p-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <Info className="w-4 h-4 text-blue-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-gray-900 text-white border-0 shadow-xl">
                      <p className="font-medium">Form Structure Preview</p>
                      <p className="text-gray-300 text-xs mt-1">
                        Define field names and layout here. Values will be entered when creating proposals.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
              variant="ghost"
              onClick={handleClose}
              className="rounded-xl px-5 h-11 text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl px-6 h-11 bg-[#ee6c4d] hover:bg-[#e05a3a] text-white shadow-sm transition-all duration-200"
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
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" weight="bold" />
                  <span>Save</span>
                </div>
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

      {/* Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
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
