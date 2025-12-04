import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageContent } from '@/components/common/layout';
import { useCurrentOrganization, useForms, useDeleteForm, useCopyForm, useUpdateForm, useCreateForm, useOrganizationMembers, type Form } from '@/hooks/queries';
import { useUser } from '@/auth';
import { useTemplates, useSearchTemplates, useCopyTemplate, usePrefetchTemplate } from '@/hooks/queries/useTemplates';
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
  User,
  CalendarBlank,
  MagnifyingGlass
} from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
                className="flex items-center gap-2"
              >
                <Stack className="w-4 h-4" />
                Library
              </Button>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white shadow-sm"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px]">
              {filteredForms.map(form => (
                <FormCard
                  key={form.id}
                  form={form}
                  members={members}
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
  onEdit: () => void;
  onDuplicate: (e?: React.MouseEvent) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onUpdateName: (name: string) => void;
}

function FormCard({ form, members, onEdit, onDuplicate, onDelete, onSetDefault, onUpdateName }: FormCardProps) {
  const totalFields = form.tabs.reduce((acc, tab) => acc + tab.fields.length, 0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(form.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(form.description || '');
  const isDefault = (form as any).is_default;
  const updateFormMutation = useUpdateForm();

  // Get creator name from members
  const creator = members.find(m => m.user_id === form.created_by);
  const creatorName = creator?.full_name || 'Unknown';

  // Format creation date
  const createdDate = new Date(form.created_at).toLocaleDateString('en-US', {
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
    <div className="relative w-full max-w-sm">
      {/* Default Star Badge - positioned outside card to avoid overflow clipping */}
      {isDefault && (
        <div className="absolute -top-2 -left-2 z-20">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
            <Star className="w-5 h-5 text-white" weight="fill" />
          </div>
        </div>
      )}
      <div className="bg-white rounded-sm shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden border border-gray-300"
        style={{
          background: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
        }}
      >
        {/* Folded Corner (Dog-ear) */}
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px] border-t-gray-300 opacity-80 group-hover:border-t-[var(--sidebar-icon-active)] transition-colors duration-300">
          <div className="absolute -top-[30px] -right-[1px] w-0 h-0 border-l-[29px] border-l-transparent border-t-[29px] border-t-white"></div>
        </div>

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
          {/* Document Header with Icon */}
          <div className="px-5 pt-4 pb-3 border-b-2 border-gray-200/60">
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
                    <div className="flex items-start gap-1">
                      <h3
                        className="text-base font-bold text-gray-900 line-clamp-2 leading-tight"
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
                <div className="flex items-start gap-0.5">
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
                        className="text-xs text-gray-600 line-clamp-2 leading-relaxed"
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

          {/* Document Body - Simulated Lines */}
          <div className="px-5 py-4 space-y-2">
            {/* Decorative document lines */}
            <div className="space-y-1.5">
              <div className="h-1.5 bg-gray-200/50 rounded-full w-full"></div>
              <div className="h-1.5 bg-gray-200/50 rounded-full w-5/6"></div>
              <div className="h-1.5 bg-gray-200/50 rounded-full w-4/6"></div>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="px-5 py-3 bg-gradient-to-t from-gray-100/80 to-transparent border-t border-gray-200/60 space-y-2">
            {/* Row 1: Tabs and Fields */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Stack className="w-4 h-4 text-blue-600" weight="duotone" />
                  <span className="font-semibold text-gray-900">{form.tabs.length}</span>
                  <span className="text-gray-500">tabs</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-700">
                  <SquaresFour className="w-4 h-4 text-green-600" weight="duotone" />
                  <span className="font-semibold text-gray-900">{totalFields}</span>
                  <span className="text-gray-500">fields</span>
                </div>
              </div>

              {/* Document Type Badge */}
              <div className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {documentTypeDisplay}
              </div>
            </div>

            {/* Row 2: Creator and Date */}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-500" weight="duotone" />
                <span className="truncate max-w-[120px]" title={creatorName}>{creatorName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarBlank className="w-3.5 h-3.5 text-gray-500" weight="duotone" />
                <span>{createdDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
