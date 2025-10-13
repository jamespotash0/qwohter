/**
 * Form Builder V2 - Enhanced Form Builder
 * Modern three-panel design with pages/tabs support
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormsStore, DEFAULT_COMPANY_INFO_TAB, DEFAULT_PROJECT_DETAILS_TAB, type FormTab, type FormField } from '@/stores/forms/formsStore';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  X,
  Plus,
  Eye,
  Save,
  GripVertical,
  Search,
  Trash2,
} from 'lucide-react';
import {
  FileText,
  TextAlignLeft,
  Hash,
  CalendarDots,
  Image as ImageIcon,
  Paperclip,
  ToggleLeft,
  CaretDown,
  CheckSquare,
  ListChecks,
  User,
  SlidersHorizontal,
  FrameCorners,
  Table,
} from '@phosphor-icons/react';
import { toast } from 'sonner';

// Field element types with categories
const FIELD_ELEMENTS = {
  'Text & Input': [
    { type: 'short_text', label: 'Short Text', icon: FileText },
    { type: 'paragraph', label: 'Paragraph', icon: TextAlignLeft },
    { type: 'number', label: 'Numeric Input', icon: Hash },
    { type: 'date', label: 'Date Picker', icon: CalendarDots },
    { type: 'image_upload', label: 'Image Upload', icon: ImageIcon },
    { type: 'attachment', label: 'Attachment', icon: Paperclip },
  ],
  'Selection & Choices': [
    { type: 'toggle', label: 'Toggle Switch', icon: ToggleLeft },
    { type: 'dropdown', label: 'Dropdown Menu', icon: CaretDown },
    { type: 'checkbox', label: 'Single Checkbox', icon: CheckSquare },
    { type: 'checklist', label: 'Checklist Group', icon: ListChecks },
    { type: 'range_slider', label: 'Range Slider', icon: SlidersHorizontal },
    { type: 'profiles', label: 'Profiles', icon: User },
  ],
  'Layout & Structure': [
    { type: 'section_break', label: 'Section Break', icon: FrameCorners },
    { type: 'data_table', label: 'Data Table', icon: Table },
  ],
};

export default function FormBuilderV2() {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { user } = useAuthStore();
  const { currentForm, fetchFormById, createForm, updateForm } = useFormsStore();

  const [formName, setFormName] = useState('Untitled Form');
  const [formDescription, setFormDescription] = useState('');
  const [tabs, setTabs] = useState<FormTab[]>([
    { ...DEFAULT_COMPANY_INFO_TAB, name: 'Personal Information' },
    { ...DEFAULT_PROJECT_DETAILS_TAB, name: 'Project Details' },
  ]);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_COMPANY_INFO_TAB.id);
  const [selectedField, setSelectedField] = useState<FormField | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDescription, setShowDescription] = useState(false);

  // Load form if editing
  useEffect(() => {
    if (formId && formId !== 'new') {
      fetchFormById(formId);
    }
  }, [formId, fetchFormById]);

  useEffect(() => {
    if (currentForm && formId !== 'new') {
      setFormName(currentForm.name);
      setFormDescription(currentForm.description || '');
      // Map field_type to type for V2 compatibility
      const mappedTabs = currentForm.tabs.map(tab => ({
        ...tab,
        fields: tab.fields.map(field => ({
          ...field,
          type: field.type || field.field_type,
        })),
      }));
      setTabs(mappedTabs);
      if (currentForm.tabs.length > 0) {
        setActiveTabId(currentForm.tabs[0]!.id);
      }
    }
  }, [currentForm, formId]);

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    if (!currentOrganization?.id || !user?.id) {
      toast.error('Missing organization or user information');
      return;
    }

    setIsSaving(true);
    try {
      // Map field types from FormBuilderV2 format to database format
      const typeMapping: Record<string, 'input' | 'textarea' | 'dropdown' | 'checkbox' | 'date'> = {
        short_text: 'input',
        paragraph: 'textarea',
        number: 'input',
        date: 'date',
        dropdown: 'dropdown',
        checkbox: 'checkbox',
        checklist: 'checkbox',
        toggle: 'checkbox',
      };

      const mappedTabs = tabs.map(tab => ({
        ...tab,
        fields: tab.fields.map(field => {
          const fieldType = field.type || field.field_type;
          const { type, ...fieldWithoutType } = field;
          return {
            ...fieldWithoutType,
            field_type: typeMapping[fieldType as string] || 'input',
          };
        }),
      }));

      const formData = {
        name: formName,
        description: formDescription,
        tabs: mappedTabs,
        is_active: true,
      };

      if (formId === 'new') {
        const result = await createForm({
          ...formData,
          organization_id: currentOrganization.id,
          created_by: user.id,
        });
        if (result) {
          toast.success('Form created successfully');
          navigate('/forms');
        } else {
          toast.error('Failed to create form');
        }
      } else {
        const success = await updateForm(formId!, formData);
        if (success) {
          toast.success('Form updated successfully');
          navigate('/forms');
        } else {
          toast.error('Failed to update form');
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || 'Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddField = (fieldType: string) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      field_type: 'Input' as any, // Default for database compatibility
      label: `New ${fieldType.replace('_', ' ')}`,
      required: false,
      order: activeTab?.fields.length || 0,
      placeholder: '',
      options: fieldType === 'dropdown' || fieldType === 'checklist' ? ['Option 1', 'Option 2'] : undefined,
    };

    setTabs(tabs.map(tab =>
      tab.id === activeTabId
        ? { ...tab, fields: [...tab.fields, newField] }
        : tab
    ));
    setSelectedField(newField);
  };

  const handleAddPage = () => {
    const newTab: FormTab = {
      id: `page-${Date.now()}`,
      name: `Page ${tabs.length + 1}`,
      order: tabs.length,
      fields: [],
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setTabs(tabs.map(tab =>
      tab.id === activeTabId
        ? {
            ...tab,
            fields: tab.fields.map(f =>
              f.id === fieldId ? { ...f, ...updates } : f
            ),
          }
        : tab
    ));
    if (selectedField?.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  const filteredElements = Object.entries(FIELD_ELEMENTS).reduce((acc, [category, elements]) => {
    const filtered = elements.filter(el =>
      el.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as typeof FIELD_ELEMENTS);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Header */}
      <div className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/forms')}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Form Builder</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Add and customize forms for your needs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">Changes saved 2 mins ago</span>
          <Button variant="outline" size="sm" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save & Publish'}
          </Button>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Field Elements */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="relative">
              <Input
                placeholder="Search field..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              {Object.entries(filteredElements).map(([category, elements]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {elements.map((element) => {
                      const Icon = element.icon;
                      return (
                        <button
                          key={element.type}
                          onClick={() => handleAddField(element.type)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors text-left group"
                        >
                          <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-950/40 transition-colors">
                            <Icon weight="duotone" className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-orange-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{element.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center - Form Preview */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 min-w-0">
          {/* Pages/Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
            <div className="flex items-center gap-4 px-6">
              <div className="flex-1 flex items-center gap-2 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTabId === tab.id
                        ? 'border-orange-600 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddPage}
                className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/20 flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Page
              </Button>
            </div>
          </div>

          {/* Form Content */}
          <ScrollArea className="flex-1">
            <div className="p-8">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
                  <div className="mb-8">
                    <Input
                      placeholder="Form Title"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="text-3xl font-bold border-0 border-b-2 border-gray-200 dark:border-gray-700 rounded-none px-0 focus-visible:ring-0 focus-visible:border-orange-500"
                    />
                    {!showDescription ? (
                      <button
                        onClick={() => setShowDescription(true)}
                        className="text-sm text-orange-600 hover:text-orange-700 mt-3 font-medium"
                      >
                        + Add description
                      </button>
                    ) : (
                      <Input
                        placeholder="Add form description"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="mt-3 border-0 px-0 text-gray-600 dark:text-gray-400 focus-visible:ring-0"
                      />
                    )}
                  </div>

                  {activeTab && (
                    <div className="space-y-6">
                      {activeTab.fields.length > 0 ? (
                        activeTab.fields.map((field) => (
                          <div
                            key={field.id}
                            onClick={() => setSelectedField(field)}
                            className={`group relative p-5 rounded-lg border-2 transition-all cursor-pointer ${
                              selectedField?.id === field.id
                                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 shadow-sm'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <GripVertical className="w-5 h-5 text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-move" />
                              <div className="flex-1 space-y-2">
                                <label className="block text-sm font-medium text-gray-900 dark:text-white">
                                  {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                {field.type === 'paragraph' ? (
                                  <textarea
                                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 min-h-[100px] text-sm"
                                  />
                                ) : field.type === 'dropdown' ? (
                                  <select disabled className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm">
                                    <option>{field.placeholder || 'Select an option'}</option>
                                  </select>
                                ) : field.type === 'date' ? (
                                  <input
                                    type="date"
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                                  />
                                ) : (
                                  <Input
                                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                                    disabled
                                    className="text-sm"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-gray-500 dark:text-gray-400 mb-4">No fields added yet</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500">Select a field type from the left sidebar to get started</p>
                        </div>
                      )}

                      <button
                        onClick={() => {/* Optional: open field picker */}}
                        className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg hover:border-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors text-sm text-gray-500 dark:text-gray-400 font-medium"
                      >
                        + Add Field
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Right Sidebar - Field Settings */}
        {selectedField && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col flex-shrink-0">
            <div className="border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center justify-between px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Field Settings</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedField(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Field Label */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Field Label
                  </label>
                  <Input
                    value={selectedField.label}
                    onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                  />
                </div>

                {/* Field Type & Size */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Field Type
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option value={selectedField.type}>{selectedField.field_type.replace('_', ' ')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Field Size
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <option>Normal</option>
                      <option>Half Width</option>
                      <option>Full Width</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Description
                  </label>
                  <Input
                    placeholder="Add a brief field description"
                    className="text-sm"
                  />
                </div>

                {/* Placeholder Text */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Placeholder Text
                  </label>
                  <Input
                    placeholder={`linkedin.com/in/yourname`}
                    value={selectedField.placeholder || ''}
                    onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                    className="text-sm"
                  />
                </div>

                {/* Default Value */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Default Value
                  </label>
                  <Input
                    placeholder="Enter a default value"
                    className="text-sm"
                  />
                </div>

                {/* Min & Max Range */}
                {(selectedField.type === 'short_text' || selectedField.type === 'number') && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Min & Max Range Characters
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <Input type="number" placeholder="10" className="text-sm" />
                      <span className="flex items-center justify-center text-gray-400">-</span>
                      <Input type="number" placeholder="100" className="text-sm" />
                    </div>
                  </div>
                )}

                {/* Help Text */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Help Text
                  </label>
                  <textarea
                    placeholder="Give users a helpful tip"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Custom CSS Class */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Custom CSS Class
                  </label>
                  <Input
                    placeholder="linkedin-field"
                    className="text-sm font-mono"
                  />
                </div>

                {/* Required Field Toggle */}
                <div className="flex items-center justify-between py-4 px-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                      Required Field
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Users must fill this field
                    </p>
                  </div>
                  <Switch
                    checked={selectedField.required}
                    onCheckedChange={(checked) => handleUpdateField(selectedField.id, { required: checked })}
                  />
                </div>

                {/* Delete Field Button */}
                <Button
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/20"
                  onClick={() => {
                    setTabs(tabs.map(tab =>
                      tab.id === activeTabId
                        ? {
                            ...tab,
                            fields: tab.fields.filter(f => f.id !== selectedField.id),
                          }
                        : tab
                    ));
                    setSelectedField(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Field
                </Button>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
