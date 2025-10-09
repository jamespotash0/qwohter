import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContent } from '@/components/common/layout';
import { useFormBuilderStore } from '@/features/form-builder/store/formBuilderStore';
import { FormDefinition } from '@/features/form-builder/types';
import {
  Plus,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  FileText,
  Calendar,
  Tag,
  LayoutGrid,
  List
} from 'lucide-react';
import { formatDateEST } from '@/utils/dateUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type ViewMode = 'grid' | 'list';

export default function Forms() {
  const navigate = useNavigate();
  const { forms, fetchForms, deleteForm, duplicateForm, isLoading } = useFormBuilderStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleDelete = async (id: string, name: string) => {
    await deleteForm(id);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const newId = await duplicateForm(id);
      navigate(`/forms/builder/${newId}`);
    } catch (error) {
      console.error('Error duplicating form:', error);
    }
  };

  const filteredForms = forms;

  return (
    <PageContent
      title="Forms"
      subtitle="Create and manage custom quote forms"
      showPageHeader={true}
      headerActions={
        <div className="flex items-center gap-2">
          {forms.length > 0 && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                  viewMode === 'grid'
                    ? 'bg-[var(--sidebar-nav-bg-active)] text-[var(--sidebar-icon-active)]'
                    : 'hover:bg-[var(--sidebar-nav-bg-hover)] text-[var(--sidebar-icon-default)]'
                }`}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                  viewMode === 'list'
                    ? 'bg-[var(--sidebar-nav-bg-active)] text-[var(--sidebar-icon-active)]'
                    : 'hover:bg-[var(--sidebar-nav-bg-hover)] text-[var(--sidebar-icon-default)]'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          )}
          <Button
            onClick={() => navigate('/forms/builder/new')}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Create New Form
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
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No forms yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first custom form</p>
          <Button
            onClick={() => navigate('/forms/builder/new')}
            className="flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            Create Your First Form
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map(form => (
            <FormCard
              key={form.id}
              form={form}
              onEdit={() => navigate(`/forms/builder/${form.id}`)}
              onDuplicate={() => handleDuplicate(form.id)}
              onDelete={() => handleDelete(form.id, form.name)}
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
              onDuplicate={() => handleDuplicate(form.id)}
              onDelete={() => handleDelete(form.id, form.name)}
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
  onDuplicate: () => void;
  onDelete: () => void;
}

function FormCard({ form, onEdit, onDuplicate, onDelete }: FormCardProps) {
  const totalFields = form.tabs.reduce((acc, tab) => acc + tab.fields.length, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-1 flex-1">
            {form.name}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="flex items-center gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {form.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {form.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Tabs</span>
          <span className="font-medium text-gray-900">{form.tabs.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Fields</span>
          <span className="font-medium text-gray-900">{totalFields}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 pt-0 space-y-3">
        {form.category && (
          <div className="flex items-center gap-2">
            <Tag className="w-3 h-3 text-gray-400" />
            <Badge variant="secondary" className="text-xs">
              {form.category}
            </Badge>
          </div>
        )}

        {form.tags && form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {form.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {form.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{form.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {form.updatedAt && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <Calendar className="w-3 h-3" />
            <span>Updated {formatDateEST(form.updatedAt)}</span>
          </div>
        )}
      </div>

      {/* Hover Action */}
      <div className="p-3 bg-gray-50 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          onClick={onEdit}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Edit className="w-3 h-3 mr-2" />
          Edit Form
        </Button>
      </div>
    </div>
  );
}

function FormRow({ form, onEdit, onDuplicate, onDelete }: FormCardProps) {
  const totalFields = form.tabs.reduce((acc, tab) => acc + tab.fields.length, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 p-4 group">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{form.name}</h3>
          {form.description && (
            <p className="text-sm text-gray-600 truncate mt-1">{form.description}</p>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{form.tabs.length} tabs</span>
            <span>{totalFields} fields</span>
          </div>

          {form.category && (
            <Badge variant="secondary" className="text-xs">
              {form.category}
            </Badge>
          )}

          {form.updatedAt && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDateEST(form.updatedAt)}</span>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="flex items-center gap-2 text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
