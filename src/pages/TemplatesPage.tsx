/**
 * Templates Page
 *
 * Manages document templates for proposals.
 * Allows users to browse existing templates and create new ones.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MagnifyingGlass,
  Plus,
  Stack,
  Article,
  DotsThree,
  PencilSimple,
  CopySimple,
  Trash,
  User,
  CalendarBlank,
  FileText,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import {
  useDocumentTemplates,
  useCreateDocumentTemplate,
  useDeleteDocumentTemplate,
  useUpdateDocumentTemplate,
  type DocumentTemplate,
} from '@/hooks/queries/useDocumentTemplates';
import { useUser } from '@/auth';
import { useCurrentOrganization, useOrganizationMembers } from '@/hooks/queries/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContent } from '@/components/common/layout/PageContent';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Determine active view from URL
  const isLibraryView = location.pathname === '/templates/library';

  const [searchQuery, setSearchQuery] = useState('');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // Fetch user's custom document templates (organization-specific)
  const { data: templates = [], isLoading: isLoadingTemplates } = useDocumentTemplates(
    currentOrganization?.id
  );

  // Fetch library templates (system templates - null organization_id)
  const { data: libraryTemplates = [], isLoading: isLoadingLibrary } = useDocumentTemplates();

  // Fetch organization members for creator display
  const { data: members = [] } = useOrganizationMembers(
    currentOrganization?.id || '',
    !!currentOrganization?.id
  );

  const createTemplateMutation = useCreateDocumentTemplate();
  const deleteTemplateMutation = useDeleteDocumentTemplate();
  const updateTemplateMutation = useUpdateDocumentTemplate();

  // Filter templates by search query
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter library templates by search query
  const filteredLibraryTemplates = libraryTemplates.filter((template) =>
    template.name.toLowerCase().includes(librarySearchQuery.toLowerCase())
  );

  const handleEdit = (template: DocumentTemplate) => {
    navigate(`/document-templates/${template.id}`);
  };

  const handleDelete = (template: DocumentTemplate) => {
    deleteTemplateMutation.mutate(template.id, {
      onSuccess: () => {
        toast.success(`"${template.name}" has been deleted`);
      },
      onError: (error) => {
        toast.error(`Failed to delete template: ${error.message}`);
      },
    });
  };

  const handleDuplicate = (template: DocumentTemplate) => {
    if (!currentOrganization?.id || !user?.id) {
      toast.error('Please select an organization first');
      return;
    }

    createTemplateMutation.mutate(
      {
        organization_id: currentOrganization.id,
        name: `${template.name} (Copy)`,
        description: template.description || undefined,
        content: template.content,
        variables: template.variables,
        page_settings: template.page_settings,
        created_by: user.id,
      },
      {
        onSuccess: (newTemplate) => {
          toast.success(`"${newTemplate.name}" has been created`);
          navigate(`/document-templates/${newTemplate.id}`);
        },
        onError: (error) => {
          toast.error(`Failed to duplicate template: ${error.message}`);
        },
      }
    );
  };

  const handleUpdateTemplate = (templateId: string, updates: { name?: string; description?: string }) => {
    updateTemplateMutation.mutate(
      { templateId, updates },
      {
        onError: (error) => {
          toast.error(`Failed to update template: ${error.message}`);
        },
      }
    );
  };

  const handleAddTemplate = () => {
    if (!currentOrganization?.id || !user?.id) {
      toast.error('Please select an organization first');
      return;
    }

    createTemplateMutation.mutate(
      {
        organization_id: currentOrganization.id,
        name: 'Untitled Template',
        created_by: user.id,
      },
      {
        onSuccess: (newTemplate) => {
          navigate(`/document-templates/${newTemplate.id}`);
        },
        onError: (error) => {
          toast.error(`Failed to create template: ${error.message}`);
        },
      }
    );
  };

  return (
    <PageContent
      title={!isLibraryView ? "Document Templates" : "Template Library"}
      subtitle={
        !isLibraryView
          ? "Create and manage custom document templates for your proposals. Build reusable templates or browse the library for pre-built options."
          : "Browse Qwohter's prefabbed document templates. Copy and customize professional documents for your business needs."
      }
      showPageHeader={true}
      headerActions={
        <div className="flex items-center gap-3">
          {!isLibraryView ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate('/templates/library')}
                className="flex items-center gap-2"
              >
                <Stack className="w-4 h-4" />
                Library
              </Button>
              <Button
                onClick={handleAddTemplate}
                className="flex items-center gap-2 bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" weight="bold" />
                New Template
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate('/templates')}
              className="flex items-center gap-2"
            >
              <Article className="w-4 h-4" />
              My Templates
            </Button>
          )}
        </div>
      }
    >
      {!isLibraryView ? (
        <>
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search templates by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Templates Grid */}
          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px]">
              {filteredTemplates.map((template) => (
                <DocumentTemplateCard
                  key={template.id}
                  template={template}
                  members={members}
                  onEdit={() => handleEdit(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  onDelete={() => handleDelete(template)}
                  onUpdateName={(name) => handleUpdateTemplate(template.id, { name })}
                  onUpdateDescription={(description) => handleUpdateTemplate(template.id, { description })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="regular" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? `No templates match "${searchQuery}"` : 'No Templates Yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create your first document template or browse the library for pre-built options'}
              </p>
              {!searchQuery && (
                <div className="flex items-center gap-3 justify-center">
                  <Button
                    onClick={handleAddTemplate}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4" weight="bold" />
                    Create New Template
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/templates/library')}
                    className="flex items-center gap-2"
                  >
                    <Stack className="w-4 h-4" />
                    Browse Library
                  </Button>
                </div>
              )}
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
                placeholder="Search document templates by name..."
                value={librarySearchQuery}
                onChange={(e) => setLibrarySearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Library Templates Grid */}
          {isLoadingLibrary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredLibraryTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px]">
              {filteredLibraryTemplates.map((template) => (
                <DocumentTemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleDuplicate(template)}
                  onDuplicate={() => handleDuplicate(template)}
                  isLibrary
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="regular" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {librarySearchQuery
                  ? `No templates match "${librarySearchQuery}"`
                  : 'No Library Templates Available'}
              </h3>
              <p className="text-gray-600">
                {librarySearchQuery
                  ? 'Try a different search term'
                  : 'Check back later for pre-built document templates'}
              </p>
            </div>
          )}
        </>
      )}
    </PageContent>
  );
}

// ============================================================================
// Document Template Card Component
// ============================================================================

interface DocumentTemplateCardProps {
  template: DocumentTemplate;
  members?: Array<{ user_id: string; full_name: string }>;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
  onUpdateName?: (name: string) => void;
  onUpdateDescription?: (description: string) => void;
  isLibrary?: boolean;
}

function DocumentTemplateCard({
  template,
  members = [],
  onEdit,
  onDuplicate,
  onDelete,
  onUpdateName,
  onUpdateDescription,
  isLibrary = false,
}: DocumentTemplateCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(template.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(template.description || '');

  // Get creator name from members
  const creator = members.find(m => m.user_id === template.created_by);
  const creatorName = creator?.full_name || 'Unknown';

  // Format last updated date
  const updatedDate = new Date(template.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== template.name && onUpdateName) {
      onUpdateName(editedName.trim());
    } else {
      setEditedName(template.name);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(template.name);
      setIsEditingName(false);
    }
  };

  const handleDescriptionSave = () => {
    if (editedDescription !== template.description && onUpdateDescription) {
      onUpdateDescription(editedDescription.trim());
    } else {
      setEditedDescription(template.description || '');
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleDescriptionSave();
    } else if (e.key === 'Escape') {
      setEditedDescription(template.description || '');
      setIsEditingDescription(false);
    }
  };

  return (
    <div className="relative w-full max-w-[260px]">
      <div
        className="bg-white rounded-md shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden border border-gray-200 cursor-pointer"
        onClick={onEdit}
      >
        {/* Folded Corner (Dog-ear) */}
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px] border-t-gray-300 opacity-80 group-hover:border-t-[var(--sidebar-icon-active)] transition-colors duration-300">
          <div className="absolute -top-[30px] -right-[1px] w-0 h-0 border-l-[29px] border-l-transparent border-t-[29px] border-t-white"></div>
        </div>

        {/* Dropdown Menu */}
        {!isLibrary && (
          <div className="absolute top-2 right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 hover:bg-gray-200/80 rounded-md transition-all opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DotsThree className="w-5 h-5 text-gray-700" weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex items-center gap-2">
                  <PencilSimple className="w-4 h-4" weight="regular" />
                  Edit Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="flex items-center gap-2">
                  <CopySimple className="w-4 h-4" weight="regular" />
                  Duplicate
                </DropdownMenuItem>
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); onDelete(); }}
                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                    >
                      <Trash className="w-4 h-4" weight="regular" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Library Copy Button */}
        {isLibrary && (
          <div className="absolute top-2 right-2 z-10">
            <Button
              size="sm"
              variant="secondary"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            >
              <CopySimple className="w-3.5 h-3.5 mr-1" />
              Copy
            </Button>
          </div>
        )}

        {/* Document Header */}
        <div className="px-5 pt-4 pb-3 border-b-2 border-gray-200/60">
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
                      if (!isLibrary) {
                        e.stopPropagation();
                        setIsEditingName(true);
                      }
                    }}
                  >
                    {template.name}
                  </h3>
                  {!isLibrary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingName(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
                    >
                      <PencilSimple className="w-3.5 h-3.5 text-gray-600" weight="regular" />
                    </button>
                  )}
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
                      if (!isLibrary) {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                      }
                    }}
                  >
                    {template.description || 'No description'}
                  </p>
                  {!isLibrary && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingDescription(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded transition-opacity flex-shrink-0"
                    >
                      <PencilSimple className="w-3 h-3 text-gray-600" weight="regular" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <div className="px-5 py-2.5 bg-gradient-to-t from-gray-100/80 to-transparent border-t border-gray-200/60">
          {/* Row 1: Variables count */}
          {template.variables && template.variables.length > 0 && (
            <div
              className="text-xs text-gray-500 mb-1.5 cursor-help"
              onClick={(e) => e.stopPropagation()}
              title={template.variables.map(v => `{{${v}}}`).join('\n')}
            >
              {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
            </div>
          )}
          {/* Row 2: Creator and Date */}
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-500" weight="duotone" />
              <span className="truncate max-w-[100px]" title={creatorName}>{creatorName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockCounterClockwise className="w-3.5 h-3.5 text-gray-500" weight="duotone" />
              <span>{updatedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
