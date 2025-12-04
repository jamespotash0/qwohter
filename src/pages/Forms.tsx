import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageContent } from '@/components/common/layout';
import { useCurrentOrganization, useForms, useDeleteForm, useCopyForm, useUpdateForm, useCreateForm, useOrganizationMembers, type Form } from '@/hooks/queries';
import { useUser } from '@/auth';
import { useTemplates, useSearchTemplates, useCopyTemplate, usePrefetchTemplate } from '@/hooks/queries/useTemplates';
import { useFormTemplateCounts, useFormDocumentTemplates } from '@/hooks/queries/useDocumentTemplates';
import { Template } from '@/services/templateService';
import { TemplateCard } from '@/features/form-builder/components/TemplateCard';
import { TemplatePreview } from '@/features/form-builder/components/TemplatePreview';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  PencilSimple,
  CopySimple,
  Trash,
  DotsThree,
  FileText,
  SquaresFour,
  Star,
  Stack,
  MagnifyingGlass,
  Link as LinkIcon
} from '@phosphor-icons/react';
import { Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CreateFormDialog } from '@/features/form-builder/components/CreateFormDialog';

export default function Forms() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Determine active tab from URL
  const isLibraryView = location.pathname === '/forms/library';

  // Forms data
  const { data: forms = [], isLoading } = useForms(
    currentOrganization?.id,
    !!currentOrganization?.id // Only enable when we have an org ID
  );
  const { data: members = [] } = useOrganizationMembers(
    currentOrganization?.id || '',
    !!currentOrganization?.id
  );

  // Library templates data
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');
  const shouldSearchLibrary = librarySearchQuery.length >= 2;
  const { data: templates, isLoading: isLoadingTemplates } = useTemplates(
    undefined,
    { enabled: isLibraryView && !shouldSearchLibrary }
  );
  const { data: searchResults, isLoading: isSearchingTemplates } = useSearchTemplates(
    librarySearchQuery,
    undefined,
    { enabled: isLibraryView && shouldSearchLibrary }
  );

  const deleteFormMutation = useDeleteForm();
  const copyFormMutation = useCopyForm();
  const updateFormMutation = useUpdateForm();
  const createFormMutation = useCreateForm();
  const copyTemplateMutation = useCopyTemplate();
  const prefetchTemplate = usePrefetchTemplate();

  // Fetch linked document template counts for all forms
  const formIds = useMemo(() => forms.map(f => f.id), [forms]);
  const { data: templateCountsMap } = useFormTemplateCounts(formIds);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const displayedTemplates = shouldSearchLibrary ? searchResults : templates;
  const isLoadingLibrary = isLoadingTemplates || isSearchingTemplates;

  const handleDelete = async (id: string, name: string) => {
    deleteFormMutation.mutate(id);
  };

  const handleDuplicate = async (id: string, name: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    copyFormMutation.mutate({ formId: id, newName: `${name} (Copy)` });
  };

  const handleSetDefault = async (formId: string, isCurrentlyDefault: boolean) => {
    // The mutations will handle all the logic including unsetting other defaults
    updateFormMutation.mutate({
      id: formId,
      updates: { is_default: !isCurrentlyDefault }
    });
  };

  const handleUpdateName = async (formId: string, newName: string) => {
    updateFormMutation.mutate({
      id: formId,
      updates: { name: newName }
    });
  };

  const handleCreateForm = async (data: {
    name: string;
    description: string;
    documentType: string;
  }) => {
    if (!currentOrganization?.id || !user?.id) {
      toast.error('Missing organization or user information');
      return;
    }

    try {
      // Create form with blank canvas (no default tabs)
      createFormMutation.mutate({
        name: data.name,
        description: data.description || undefined,
        organization_id: currentOrganization.id,
        created_by: user.id,
        is_archived: false,
        document_type: data.documentType as any,
        tabs: [],
      }, {
        onSuccess: (newForm) => {
          setShowCreateDialog(false);
          // Navigate to form builder with the new form
          navigate(`/forms/builder-v3/${newForm.id}`);
        }
      });
    } catch (error) {
      console.error('Failed to create form:', error);
    }
  };

  // Filter forms by search query
  const filteredForms = forms.filter(form =>
    form.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Template handlers for library view
  const handlePreviewTemplate = (template: Template) => {
    setPreviewTemplate(template);
  };

  const handleCopyTemplate = (
    template: Template,
    customName?: string,
    customDescription?: string
  ) => {
    if (!currentOrganization?.id) {
      toast.error('Please select an organization first');
      return;
    }

    copyTemplateMutation.mutate(
      {
        templateId: template.id,
        organizationId: currentOrganization.id,
        customName,
        customDescription,
      },
      {
        onSuccess: (newForm) => {
          toast.success(`"${newForm.name}" has been added to your forms`);
          setPreviewTemplate(null);
          // Navigate to form builder to edit the new form
          setTimeout(() => {
            navigate(`/forms/builder-v3/${newForm.id}`);
          }, 500);
        },
        onError: (error) => {
          toast.error(`Failed to copy template: ${error.message}`);
        },
      }
    );
  };

  const handleQuickCopyTemplate = (template: Template) => {
    handleCopyTemplate(template, template.name);
  };

  return (
    <PageContent
      title={!isLibraryView ? "Forms" : "Form Library"}
      subtitle={
        !isLibraryView
          ? "Create and manage custom forms for your proposals. Build reusable form templates or browse the library for pre-built options."
          : "Browse Qwohter's prefabbed form templates. Copy and customize professional forms for your proposals."
      }
      showPageHeader={true}
      headerActions={
        <div className="flex items-center gap-3">
          {!isLibraryView ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate('/forms/library')}
                className="flex items-center gap-1.5 h-9 text-sm"
              >
                <Stack className="w-4 h-4" />
                Library
              </Button>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-1.5 h-9 text-sm bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" weight="bold" />
                New Form
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate('/forms')}
              className="flex items-center gap-2"
            >
              <SquaresFour className="w-4 h-4" />
              My Forms
            </Button>
          )}
        </div>
      }
    >
      {/* Create Form Dialog */}
      <CreateFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateForm}
        isLoading={createFormMutation.isPending}
      />

      {!isLibraryView ? (
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search forms by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading forms...</div>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="regular" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No forms match your search' : 'No forms yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? `No forms found matching "${searchQuery}"`
                  : 'Get started by creating a custom form or browse the library for pre-built templates'}
              </p>
              {!searchQuery && (
                <div className="flex items-center gap-3 justify-center">
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4" weight="bold" />
                    Create New Form
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/forms/library')}
                    className="flex items-center gap-2"
                  >
                    <Stack className="w-4 h-4" />
                    Browse Library
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredForms.map(form => (
                <FormCard
                  key={form.id}
                  form={form}
                  members={members}
                  linkedTemplateCount={templateCountsMap?.[form.id] || 0}
                  onEdit={() => navigate(`/forms/builder-v3/${form.id}`)}
                  onDuplicate={(e) => handleDuplicate(form.id, form.name, e)}
                  onDelete={() => handleDelete(form.id, form.name)}
                  onSetDefault={() => handleSetDefault(form.id, !!(form as any).is_default)}
                  onUpdateName={(name) => handleUpdateName(form.id, name)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Library Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search form templates by name..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Library Templates Grid */}
          {isLoadingLibrary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : displayedTemplates && displayedTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onPreview={handlePreviewTemplate}
                  onCopy={handleQuickCopyTemplate}
                  onMouseEnter={() => prefetchTemplate(template.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="text-slate-400 mb-2">
                <MagnifyingGlass className="w-16 h-16 mx-auto mb-4" weight="light" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {shouldSearchLibrary
                  ? `No form templates match "${librarySearchQuery}"`
                  : 'No Form Templates Available'}
              </h3>
            </div>
          )}

          {/* Template Preview Modal */}
          <TemplatePreview
            template={previewTemplate}
            open={!!previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onCopy={handleCopyTemplate}
            isLoading={copyTemplateMutation.isPending}
          />
        </>
      )}
    </PageContent>
  );
}

interface FormCardProps {
  form: Form;
  members: any[];
  linkedTemplateCount: number;
  onEdit: () => void;
  onDuplicate: (e?: React.MouseEvent) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onUpdateName: (name: string) => void;
}

// Helper to check if a field is a styling element (not a data field)
const isStylingField = (field: { type?: string }) =>
  field.type === 'section' || field.type === 'text_content';

function FormCard({ form, members, linkedTemplateCount, onEdit, onDuplicate, onDelete, onSetDefault, onUpdateName }: FormCardProps) {
  // Filter out styling fields (section headers, text content) from count
  const dataFields = form.tabs.flatMap(tab => tab.fields.filter(f => !isStylingField(f)));
  const totalFields = dataFields.length;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(form.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(form.description || '');
  const [showTabsDialog, setShowTabsDialog] = useState(false);
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const isDefault = (form as any).is_default;
  const updateFormMutation = useUpdateForm();

  // Fetch linked templates for this form (for tooltip display)
  const { data: linkedTemplates = [] } = useFormDocumentTemplates(form.id);

  // Get creator name from members
  const creator = members.find(m => m.user_id === form.created_by);
  const creatorName = creator?.full_name || 'Unknown';

  // Get initials from creator name (e.g., "John Doe" -> "JD")
  const creatorInitials = creatorName
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  // Format last updated date
  const updatedDate = new Date(form.updated_at || form.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Format document type for display
  const documentTypeDisplay = form.document_type
    ? form.document_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Proposal';

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== form.name) {
      onUpdateName(editedName.trim());
    } else {
      setEditedName(form.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(form.name);
      setIsEditingName(false);
    }
  };

  const handleDescriptionSave = () => {
    if (editedDescription !== form.description) {
      updateFormMutation.mutate({
        id: form.id,
        updates: { description: editedDescription.trim() }
      });
    } else {
      setEditedDescription(form.description || '');
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setEditedDescription(form.description || '');
      setIsEditingDescription(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Default Star Badge - positioned outside card to avoid overflow clipping */}
      {isDefault && (
        <div className="absolute -top-1.5 -left-1.5 z-20">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
            <Star className="w-3 h-3 text-white" weight="fill" />
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden border border-gray-200">
        {/* Dropdown Menu */}
        <div className="absolute top-2 right-2 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 hover:bg-gray-200/80 rounded-md transition-all opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm shadow-sm">
                <DotsThree className="w-5 h-5 text-gray-700" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2">
                <PencilSimple className="w-4 h-4" weight="regular" />
                Edit Form
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onDuplicate(e);
              }} className="flex items-center gap-2">
                <CopySimple className="w-4 h-4" weight="regular" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSetDefault}
                className="flex items-center gap-2"
              >
                <Star className={`w-4 h-4`} weight={isDefault ? 'fill' : 'regular'} />
                {isDefault ? 'Remove as Default' : 'Make Default'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="flex items-center gap-2 text-red-600 focus:text-red-600"
              >
                <Trash className="w-4 h-4" weight="regular" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content - Clickable to Edit */}
        <div onClick={onEdit} className="cursor-pointer">
          {/* Document Header - pr-10 leaves space for dropdown menu */}
          <div className="px-4 pr-10 pt-4 pb-2">
            <div className="flex items-start gap-3">
              {/* Name and Description */}
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Editable Name */}
                <div className="mb-0.5">
                  {isEditingName ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={handleNameKeyDown}
                      className="text-base font-bold h-8 px-2 bg-yellow-50 border-yellow-300"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex items-start gap-1 min-w-0">
                      <h3
                        className="text-base font-bold text-gray-900 leading-tight truncate"
                        title={form.name}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setIsEditingName(true);
                        }}
                      >
                        {form.name}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingName(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
                      >
                        <PencilSimple className="w-3.5 h-3.5 text-gray-600" weight="regular" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Editable Description */}
                <div className="flex items-start gap-0.5 min-w-0">
                  {isEditingDescription ? (
                    <textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      onBlur={handleDescriptionSave}
                      onKeyDown={handleDescriptionKeyDown}
                      className="w-full text-xs text-gray-600 px-2 py-1 border border-gray-300 rounded resize-none bg-yellow-50"
                      rows={2}
                      placeholder="Add description..."
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <p
                        className="text-xs text-gray-600 leading-relaxed truncate"
                        title={form.description || 'No description'}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setIsEditingDescription(true);
                        }}
                      >
                        {form.description || 'No description'}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingDescription(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
                      >
                        <PencilSimple className="w-3 h-3 text-gray-600" weight="regular" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="px-4 py-3 bg-gray-50/50 space-y-2">
            {/* Row 1: Tabs, Fields, and Linked Templates */}
            <div className="flex items-center gap-3 text-[11px]">
              {/* Tabs with Tooltip */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
                      <Stack className="w-3.5 h-3.5 text-blue-600" weight="duotone" />
                      <span className="font-semibold text-gray-900">{form.tabs.length}</span>
                      <span className="text-gray-500">tabs</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[180px]">
                    <ul className="text-xs space-y-0.5">
                      {form.tabs.slice(0, 5).map((tab, idx) => (
                        <li key={idx} className="truncate text-gray-700">
                          {tab.name || `Tab ${idx + 1}`}
                        </li>
                      ))}
                      {form.tabs.length > 5 && (
                        <li
                          className="text-blue-500 cursor-pointer hover:underline"
                          onClick={(e) => { e.stopPropagation(); setShowTabsDialog(true); }}
                        >
                          +{form.tabs.length - 5} more
                        </li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Fields with Tooltip */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-gray-700 cursor-pointer hover:text-green-600 transition-colors">
                      <SquaresFour className="w-3.5 h-3.5 text-green-600" weight="duotone" />
                      <span className="font-semibold text-gray-900">{totalFields}</span>
                      <span className="text-gray-500">fields</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <ul className="text-xs space-y-0.5">
                      {dataFields.slice(0, 6).map((field, idx) => (
                        <li key={idx} className="truncate text-gray-700">
                          {field.label || field.name || 'Untitled'}
                        </li>
                      ))}
                      {totalFields > 6 && (
                        <li
                          className="text-green-500 cursor-pointer hover:underline"
                          onClick={(e) => { e.stopPropagation(); setShowFieldsDialog(true); }}
                        >
                          +{totalFields - 6} more
                        </li>
                      )}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {linkedTemplateCount > 0 && (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-gray-700 cursor-pointer hover:text-purple-600 transition-colors">
                        <LinkIcon className="w-3.5 h-3.5 text-purple-600" weight="duotone" />
                        <span className="font-semibold text-gray-900">{linkedTemplateCount}</span>
                        <span className="text-gray-500">template{linkedTemplateCount !== 1 ? 's' : ''}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <ul className="text-xs space-y-0.5">
                        {linkedTemplates.slice(0, 4).map((lt) => (
                          <li key={lt.document_template_id} className="truncate text-gray-700">
                            {lt.document_template?.name || 'Unknown'}
                          </li>
                        ))}
                        {linkedTemplates.length > 4 && (
                          <li
                            className="text-purple-500 cursor-pointer hover:underline"
                            onClick={(e) => { e.stopPropagation(); setShowTemplatesDialog(true); }}
                          >
                            +{linkedTemplates.length - 4} more
                          </li>
                        )}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Row 2: Creator Avatar, Document Type, and Date */}
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <div className="flex items-center gap-2">
                {/* Creator Avatar with Tooltip */}
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[8px] font-semibold text-white cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all">
                        {creatorInitials}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs text-gray-700">{creatorName}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {/* Document Type Badge */}
                <div className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {documentTypeDisplay}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span>{updatedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Dialog */}
      <Dialog open={showTabsDialog} onOpenChange={setShowTabsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>All Tabs ({form.tabs.length})</DialogTitle>
          </DialogHeader>
          <ul className="space-y-1 max-h-[300px] overflow-y-auto">
            {form.tabs.map((tab, idx) => (
              <li key={idx} className="text-sm text-gray-700 py-1 px-2 rounded hover:bg-gray-50">
                {tab.name || `Tab ${idx + 1}`}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Fields Dialog */}
      <Dialog open={showFieldsDialog} onOpenChange={setShowFieldsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>All Fields ({totalFields})</DialogTitle>
          </DialogHeader>
          <ul className="space-y-1 max-h-[300px] overflow-y-auto">
            {form.tabs.map((tab, tabIdx) => {
              const tabDataFields = tab.fields.filter(f => !isStylingField(f));
              if (tabDataFields.length === 0) return null;
              return (
                <li key={tabIdx}>
                  <div className="text-xs font-medium text-gray-500 py-1 px-2 bg-gray-50 rounded">
                    {tab.name || `Tab ${tabIdx + 1}`}
                  </div>
                  <ul className="ml-2">
                    {tabDataFields.map((field, fieldIdx) => (
                      <li key={fieldIdx} className="text-sm text-gray-700 py-1 px-2 rounded hover:bg-gray-50">
                        {field.label || field.name || 'Untitled'}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Linked Templates ({linkedTemplates.length})</DialogTitle>
          </DialogHeader>
          <ul className="space-y-1 max-h-[300px] overflow-y-auto">
            {linkedTemplates.map((lt) => (
              <li key={lt.document_template_id} className="text-sm text-gray-700 py-1 px-2 rounded hover:bg-gray-50">
                {lt.document_template?.name || 'Unknown'}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
