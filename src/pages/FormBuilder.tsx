/**
 * Form Builder Page
 * Create and edit custom form definitions with tabs and fields
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormsStore, DEFAULT_COMPANY_INFO_TAB, DEFAULT_PROJECT_DETAILS_TAB, type FormTab, type FormField } from '@/stores/forms/formsStore';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { useAuthStore } from '@/stores/auth/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  GripVertical,
  Settings,
  FileText,
  Hash,
  Type,
  Calendar,
  CheckSquare,
  List,
  Calculator,
  Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function FormBuilder() {
  const { id: formId } = useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganizationStore();
  const { user } = useAuthStore();
  const { currentForm, fetchFormById, createForm, updateForm } = useFormsStore();

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tabs, setTabs] = useState<FormTab[]>([
    DEFAULT_COMPANY_INFO_TAB,
    DEFAULT_PROJECT_DETAILS_TAB,
  ]);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_COMPANY_INFO_TAB.id);
  const [isAddTabDialogOpen, setIsAddTabDialogOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (formId && formId !== 'new') {
      fetchFormById(formId);
    }
  }, [formId, fetchFormById]);

  useEffect(() => {
    if (currentForm && formId !== 'new') {
      setFormName(currentForm.name);
      setFormDescription(currentForm.description || '');
      setFormCategory(currentForm.category || '');
      setFormTags(currentForm.tags || []);
      setTabs(currentForm.tabs);
      if (currentForm.tabs.length > 0) {
        setActiveTabId(currentForm.tabs[0].id);
      }
    }
  }, [currentForm, formId]);

  const handleAddTab = () => {
    if (!newTabName.trim()) return;

    const newTab: FormTab = {
      id: `custom-${Date.now()}`,
      name: newTabName,
      order: tabs.length,
      fields: [],
    };

    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
    setNewTabName('');
    setIsAddTabDialogOpen(false);
    toast.success('Tab added successfully');
  };

  const handleRemoveTab = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab?.is_default) {
      toast.error('Cannot delete default tabs');
      return;
    }

    setTabs(tabs.filter((t) => t.id !== tabId));
    if (activeTabId === tabId && tabs.length > 0) {
      setActiveTabId(tabs[0].id);
    }
    toast.success('Tab removed successfully');
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Please enter a form name');
      return;
    }

    if (!currentOrganization?.id || !user?.id) {
      toast.error('Organization or user not found');
      return;
    }

    setIsSaving(true);

    try {
      const formData = {
        organization_id: currentOrganization.id,
        name: formName,
        description: formDescription,
        category: formCategory,
        tags: formTags,
        tabs,
        created_by: user.id,
        is_active: true,
      };

      if (formId === 'new') {
        const created = await createForm(formData);
        if (created) {
          toast.success('Form created successfully');
          navigate(`/forms/builder/${created.id}`);
        }
      } else if (formId) {
        const success = await updateForm(formId, formData);
        if (success) {
          toast.success('Form updated successfully');
        }
      }
    } catch (error) {
      toast.error('Failed to save form');
      console.error('Error saving form:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-full w-full overflow-auto bg-background">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/forms')}
              className="rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {formId === 'new' ? 'Create New Form' : 'Edit Form'}
              </h1>
              <p className="text-muted-foreground mt-1">
                Design your custom quote form with tabs and fields
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/forms')}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Form'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Settings Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Form Settings
                </CardTitle>
                <CardDescription>
                  Configure your form's basic information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Form Name *</Label>
                  <Input
                    id="form-name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter form name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-description">Description</Label>
                  <Textarea
                    id="form-description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="What is this form for?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="form-category">Category</Label>
                  <Input
                    id="form-category"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g., Standard, Premium"
                  />
                </div>

                {/* Stats */}
                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Tabs</span>
                    <Badge variant="secondary">{tabs.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Fields</span>
                    <Badge variant="secondary">
                      {tabs.reduce((acc, tab) => acc + tab.fields.length, 0)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Tab Builder Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Form Tabs
                    </CardTitle>
                    <CardDescription>
                      Organize your form into sections with tabs
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setIsAddTabDialogOpen(true)}
                    className="bg-gradient-to-r from-primary to-primary/80"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tab
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTabId} onValueChange={setActiveTabId}>
                  <TabsList className="w-full justify-start overflow-x-auto">
                    {tabs.map((tab) => (
                      <div key={tab.id} className="relative group">
                        <TabsTrigger value={tab.id} className="relative">
                          {tab.name}
                          {tab.fields.length > 0 && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {tab.fields.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        {!tab.is_default && (
                          <button
                            onClick={() => handleRemoveTab(tab.id)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </TabsList>

                  {tabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-6">
                      <TabEditor
                        tab={tab}
                        onUpdate={(updatedTab) => {
                          setTabs(tabs.map((t) => (t.id === tab.id ? updatedTab : t)));
                        }}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Add Tab Dialog */}
      <Dialog open={isAddTabDialogOpen} onOpenChange={setIsAddTabDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Tab</DialogTitle>
            <DialogDescription>
              Create a new section for your form
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tab-name">Tab Name</Label>
              <Input
                id="tab-name"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                placeholder="e.g., Product Selection, Pricing"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTabDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTab} disabled={!newTabName.trim()}>
              Add Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TabEditorProps {
  tab: FormTab;
  onUpdate: (tab: FormTab) => void;
}

function TabEditor({ tab, onUpdate }: TabEditorProps) {
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormField['field_type']>('input');

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast.error('Please enter a field label');
      return;
    }

    const newField: FormField = {
      id: `field-${Date.now()}`,
      label: newFieldLabel,
      field_type: newFieldType,
      input_type: newFieldType === 'input' ? 'text' : undefined,
      required: false,
      order: tab.fields.length,
    };

    onUpdate({
      ...tab,
      fields: [...tab.fields, newField],
    });

    setNewFieldLabel('');
    setNewFieldType('input');
    setIsAddFieldDialogOpen(false);
    toast.success('Field added successfully');
  };

  const handleRemoveField = (fieldId: string) => {
    onUpdate({
      ...tab,
      fields: tab.fields.filter((f) => f.id !== fieldId),
    });
    toast.success('Field removed');
  };

  const getFieldIcon = (type: FormField['field_type']) => {
    switch (type) {
      case 'input':
        return Type;
      case 'textarea':
        return FileText;
      case 'dropdown':
        return List;
      case 'checkbox':
        return CheckSquare;
      case 'date':
        return Calendar;
      case 'product_selector':
        return Package;
      case 'calculated':
        return Calculator;
      default:
        return Hash;
    }
  };

  return (
    <div className="space-y-4">
      {/* Fields List */}
      {tab.is_default ? (
        <div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed">
          <p className="text-sm text-muted-foreground">
            This is a default tab with predefined fields.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {tab.fields.length} fields configured
          </p>
        </div>
      ) : tab.fields.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
          <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No fields yet. Add your first field to get started.
          </p>
          <Button
            size="sm"
            onClick={() => setIsAddFieldDialogOpen(true)}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Field
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {tab.fields.map((field, index) => {
              const Icon = getFieldIcon(field.field_type);
              return (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-md transition-all group"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{field.label}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {field.field_type.replace('_', ' ')}
                      {field.required && ' • Required'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveField(field.id)}
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => setIsAddFieldDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Field
          </Button>
        </div>
      )}

      {/* Add Field Dialog */}
      <Dialog open={isAddFieldDialogOpen} onOpenChange={setIsAddFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Field</DialogTitle>
            <DialogDescription>
              Add a field to the "{tab.name}" tab
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="field-label">Field Label</Label>
              <Input
                id="field-label"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="e.g., Wall Height, Color Selection"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Field Type</Label>
              <Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Text Input</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="dropdown">Dropdown</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="date">Date Picker</SelectItem>
                  <SelectItem value="product_selector">Product Selector</SelectItem>
                  <SelectItem value="calculated">Calculated Field</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddField} disabled={!newFieldLabel.trim()}>
              Add Field
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
