import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContent } from '@/components/common/layout';
import { useFormsStore, type FormDefinition } from '@/stores/forms/formsStore';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import {
  Plus,
  PencilSimple,
  CopySimple,
  Trash,
  DotsThree,
  FileText,
  SquaresFour,
  ListBullets,
  Star,
  Stack
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

type ViewMode = 'grid' | 'list';

export default function Forms() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { forms, fetchForms, deleteForm, copyForm, updateForm, isLoading } = useFormsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchForms(currentOrganization.id);
    }
  }, [currentOrganization?.id, fetchForms]);

  const handleDelete = async (id: string, name: string) => {
    await deleteForm(id);
    toast.success('Form deleted');
  };

  const handleDuplicate = async (id: string, name: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    try {
      const copied = await copyForm(id, `${name} (Copy)`);
      if (copied) {
        toast.success('Form duplicated successfully');
        // Refresh the forms list to show the new copy
        if (currentOrganization?.id) {
          await fetchForms(currentOrganization.id);
        }
      } else {
        toast.error('Failed to duplicate form');
      }
    } catch (error) {
      console.error('Error duplicating form:', error);
      toast.error('Failed to duplicate form');
    }
  };

  const handleSetDefault = async (formId: string, isCurrentlyDefault: boolean) => {
    try {
      if (isCurrentlyDefault) {
        // Unset this form as default
        await updateForm(formId, { is_default: false } as any);
        toast.success('Default form removed');
      } else {
        // First, unset all other forms as default
        const updatePromises = forms
          .filter(f => f.id !== formId && (f as any).is_default)
          .map(f => updateForm(f.id, { is_default: false } as any));

        await Promise.all(updatePromises);

        // Then set this form as default
        await updateForm(formId, { is_default: true } as any);
        toast.success('Default form updated');
      }

      // Refresh forms list
      if (currentOrganization?.id) {
        await fetchForms(currentOrganization.id);
      }
    } catch (error) {
      console.error('Error setting default form:', error);
      toast.error('Failed to update default form');
    }
  };

  const handleUpdateName = async (formId: string, newName: string) => {
    try {
      await updateForm(formId, { name: newName });
      toast.success('Form name updated');
    } catch (error) {
      console.error('Error updating form name:', error);
      toast.error('Failed to update form name');
    }
  };

  const filteredForms = forms;

  return (
    <PageContent
      title="Forms"
      showPageHeader={true}
      headerActions={
        <div className="flex items-center gap-3">
          {forms.length > 0 && (
            <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-[var(--sidebar-icon-active)] shadow-sm'
                    : 'text-[var(--sidebar-icon-default)] hover:text-[var(--sidebar-icon-hover)]'
                }`}
              >
                <SquaresFour className="h-4 w-4" weight={viewMode === 'grid' ? 'fill' : 'regular'} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all flex items-center justify-center ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 text-[var(--sidebar-icon-active)] shadow-sm'
                    : 'text-[var(--sidebar-icon-default)] hover:text-[var(--sidebar-icon-hover)]'
                }`}
              >
                <ListBullets className="h-4 w-4" weight={viewMode === 'list' ? 'fill' : 'regular'} />
              </button>
            </div>
          )}
          <Button
            onClick={() => navigate('/forms/builder/new')}
            className="flex items-center gap-2 bg-[var(--sidebar-icon-active)] hover:bg-[var(--brand-orange-700)] text-white shadow-sm"
          >
            <Plus className="w-4 h-4" weight="bold" />
            New Form
          </Button>
        </div>
      }
    >

      {/* Forms Display */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading forms...</div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" weight="regular" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No forms yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first custom form</p>
          <Button
            onClick={() => navigate('/forms/builder/new')}
            className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" weight="bold" />
            Create Your First Form
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px]">
          {filteredForms.map(form => (
            <FormCard
              key={form.id}
              form={form}
              onEdit={() => navigate(`/forms/builder/${form.id}`)}
              onDuplicate={(e) => handleDuplicate(form.id, form.name, e)}
              onDelete={() => handleDelete(form.id, form.name)}
              onSetDefault={() => handleSetDefault(form.id, !!(form as any).is_default)}
              onUpdateName={(name) => handleUpdateName(form.id, name)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredForms.map(form => (
            <FormRow
              key={form.id}
              form={form}
              onEdit={() => navigate(`/forms/builder/${form.id}`)}
              onDuplicate={(e) => handleDuplicate(form.id, form.name, e)}
              onDelete={() => handleDelete(form.id, form.name)}
              onSetDefault={() => handleSetDefault(form.id, !!(form as any).is_default)}
              onUpdateName={(name) => handleUpdateName(form.id, name)}
            />
          ))}
        </div>
      )}
    </PageContent>
  );
}

interface FormCardProps {
  form: FormDefinition;
  onEdit: () => void;
  onDuplicate: (e?: React.MouseEvent) => void;
  onDelete: () => void;
  onSetDefault: () => void;
  onUpdateName: (name: string) => void;
}

function FormCard({ form, onEdit, onDuplicate, onDelete, onSetDefault, onUpdateName }: FormCardProps) {
  const totalFields = form.tabs.reduce((acc, tab) => acc + tab.fields.length, 0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(form.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(form.description || '');
  const isDefault = (form as any).is_default;
  const { updateForm } = useFormsStore();

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
      updateForm(form.id, { description: editedDescription.trim() });
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
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all duration-200 group relative w-full max-w-sm" style={{ '--hover-border': 'var(--sidebar-nav-bg-active)' } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--sidebar-nav-bg-active)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = ''}>
      {/* Default Star - Top Right Corner Overlay */}
      {isDefault && (
        <div className="absolute -top-1.5 -right-1.5 z-10">
          <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg">
            <Star className="w-3 h-3" weight="fill" />
          </div>
        </div>
      )}

      {/* Dropdown Menu - Between default badge and border */}
      <div className="absolute bottom-16 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors opacity-0 group-hover:opacity-100">
              <DotsThree className="w-5 h-5 text-gray-600" weight="bold" />
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
        {/* Name and Description Section */}
        <div className="p-5 pb-4 pr-12">
          {/* Editable Name */}
          <div className="mb-1">
            {isEditingName ? (
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                className="text-base font-semibold h-8 px-2"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="flex items-center gap-0.5">
                <h3
                  className="text-base font-semibold text-gray-900 line-clamp-1"
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
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded transition-opacity flex-shrink-0"
                >
                  <PencilSimple className="w-3.5 h-3.5 text-gray-500" weight="regular" />
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
                className="w-full text-xs text-gray-600 px-2 py-1 border border-gray-300 rounded resize-none"
                rows={2}
                placeholder="Add description..."
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <p
                  className="text-xs text-gray-600 line-clamp-2"
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
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded transition-opacity flex-shrink-0"
                >
                  <PencilSimple className="w-3 h-3 text-gray-500" weight="regular" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats Section - Below Border */}
        <div className="mx-3 px-2 py-2.5 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-gray-600">
              <Stack className="w-3.5 h-3.5" weight="regular" />
              <span className="font-medium text-gray-900">{form.tabs.length}</span>
              <span className="text-gray-500">tabs</span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <FileText className="w-3.5 h-3.5" weight="regular" />
              <span className="font-medium text-gray-900">{totalFields}</span>
              <span className="text-gray-500">fields</span>
            </div>

            {/* Tags - Show first 3, then +X more */}
            {form.tags && form.tags.length > 0 && (
              <div className="flex items-center gap-1.5">
                {form.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700"
                  >
                    {tag}
                  </span>
                ))}
                {form.tags.length > 3 && (
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-700 cursor-help"
                    title={form.tags.slice(3).join(', ')}
                  >
                    +{form.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormRow({ form, onEdit, onDuplicate, onDelete, onSetDefault, onUpdateName }: FormCardProps) {
  const totalFields = form.tabs.reduce((acc, tab) => acc + tab.fields.length, 0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(form.name);
  const isDefault = (form as any).is_default;

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

  return (
    <div
      onClick={onEdit}
      className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 transition-all duration-200 p-4 group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* Default Indicator */}
        {isDefault && (
          <Star className="w-4 h-4 text-amber-500 flex-shrink-0" weight="fill" />
        )}

        {/* Name - Editable */}
        <div className="flex-1 min-w-0">
          {isEditingName ? (
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              className="text-base font-semibold h-8 px-2 max-w-md"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center gap-0.5">
              <h3
                className="font-semibold text-gray-900 truncate"
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
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded transition-opacity flex-shrink-0"
              >
                <PencilSimple className="w-3.5 h-3.5 text-gray-500" weight="regular" />
              </button>
            </div>
          )}
          {form.description && (
            <p className="text-sm text-gray-600 truncate mt-1">{form.description}</p>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span><span className="font-medium text-gray-900">{form.tabs.length}</span> tabs</span>
            <span><span className="font-medium text-gray-900">{totalFields}</span> fields</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 hover:bg-gray-100 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <DotsThree className="w-5 h-5 text-gray-600" weight="bold" />
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
      </div>
    </div>
  );
}
