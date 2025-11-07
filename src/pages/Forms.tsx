import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContent } from '@/components/common/layout';
import { type FormDefinition } from '@/stores/forms/formsStore';
import { useCurrentOrganization, useForms, useDeleteForm, useCopyForm, useUpdateForm } from '@/hooks/queries';
import { useUser } from '@/auth';
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
  const user = useUser();
  const { organization: currentOrganization } = useCurrentOrganization(user?.id || '', !!user?.id);
  const { data: forms = [], isLoading } = useForms(currentOrganization?.id);
  const deleteFormMutation = useDeleteForm();
  const copyFormMutation = useCopyForm();
  const updateFormMutation = useUpdateForm();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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
            onClick={() => navigate('/forms/builder-v3/new')}
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
            onClick={() => navigate('/forms/builder-v3/new')}
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
              onEdit={() => navigate(`/forms/builder-v3/${form.id}`)}
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
              onEdit={() => navigate(`/forms/builder-v3/${form.id}`)}
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
  const updateFormMutation = useUpdateForm();

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
      {/* Document Card with Folded Corner */}
      <div className="bg-white rounded-sm shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden border border-gray-300"
        style={{
          background: 'linear-gradient(to bottom, #ffffff 0%, #fafafa 100%)',
        }}
      >
        {/* Folded Corner (Dog-ear) */}
        <div className="absolute top-0 right-0 w-0 h-0 border-l-[30px] border-l-transparent border-t-[30px] border-t-gray-300 opacity-80 group-hover:border-t-[var(--sidebar-icon-active)] transition-colors duration-300">
          <div className="absolute -top-[30px] -right-[1px] w-0 h-0 border-l-[29px] border-l-transparent border-t-[29px] border-t-white"></div>
        </div>

        {/* Default Star Badge */}
        {isDefault && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <Star className="w-3 h-3" weight="fill" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Default</span>
            </div>
          </div>
        )}

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
          <div className="px-5 pt-6 pb-3 border-b-2 border-gray-200/60">
            <div className="flex items-start gap-3">
              {/* Large Document Icon */}
              <div className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm flex-shrink-0">
                <FileText className="w-6 h-6 text-blue-600" weight="duotone" />
              </div>

              {/* Name and Description */}
              <div className="flex-1 min-w-0 pt-0.5">
                {/* Editable Name */}
                <div className="mb-1.5">
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
          <div className="px-5 py-3 bg-gradient-to-t from-gray-100/80 to-transparent border-t border-gray-200/60">
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

              {/* Tags */}
              {form.tags && form.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {form.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                  {form.tags.length > 2 && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200 text-gray-700 cursor-help"
                      title={form.tags.slice(2).join(', ')}
                    >
                      +{form.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
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
