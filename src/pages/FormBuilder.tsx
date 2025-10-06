import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFormBuilderStore } from '@/features/form-builder/store/formBuilderStore';
import { FormBuilderCanvas } from '@/features/form-builder/components/FormBuilderCanvas';
import { FormBuilderToolbar } from '@/features/form-builder/components/FormBuilderToolbar';
import { FormPreview } from '@/features/form-builder/components/FormPreview';
import { ArrowLeft, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentForm,
    setCurrentForm,
    fetchFormById,
    createForm,
    updateForm,
    isLoading,
    uiState,
    setPreviewMode
  } = useFormBuilderStore();

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchFormById(id);
    } else if (id === 'new') {
      // Initialize new form - edit inline in header
      setCurrentForm({
        id: crypto.randomUUID(),
        name: 'Untitled Form',
        description: '',
        tabs: [{
          id: crypto.randomUUID(),
          name: 'General',
          description: 'General information',
          order: 0,
          fields: []
        }],
        isActive: true
      });
    }
  }, [id, fetchFormById, setCurrentForm]);

  useEffect(() => {
    if (currentForm) {
      setFormName(currentForm.name);
      setFormDescription(currentForm.description || '');
      setFormCategory(currentForm.category || '');
    }
  }, [currentForm]);

  const handleSave = async () => {
    if (!currentForm) return;

    setIsSaving(true);
    try {
      const formData = {
        ...currentForm,
        name: formName,
        description: formDescription,
        category: formCategory
      };

      if (id === 'new') {
        const newId = await createForm(formData);
        navigate(`/forms/builder/${newId}`, { replace: true });
      } else if (id) {
        await updateForm(id, formData);
      }
    } catch (error: any) {
      console.error('Error saving form:', error);
      alert(`Failed to save form: ${error.message || 'Please try again.'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    navigate('/forms');
  };

  if (isLoading && !currentForm) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!currentForm) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Form not found</h2>
          <Button onClick={() => navigate('/forms')}>Back to Forms</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="h-6 w-px bg-gray-300" />

          <div className="flex-1 max-w-xl">
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onBlur={handleSave}
              className="text-lg font-semibold border-transparent hover:border-gray-300 focus:border-blue-500 px-2 -ml-2"
              placeholder="Form Name"
            />
            <Input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              onBlur={handleSave}
              className="text-sm text-gray-600 border-transparent hover:border-gray-300 focus:border-blue-500 px-2 -ml-2 mt-1"
              placeholder="Description (optional)"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!uiState.previewMode)}
            className="flex items-center gap-2"
          >
            {uiState.previewMode ? (
              <>
                <EyeOff className="w-4 h-4" />
                Edit Mode
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Preview
              </>
            )}
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {uiState.previewMode ? (
          <FormPreview form={currentForm} />
        ) : (
          <>
            {/* Toolbar */}
            <FormBuilderToolbar />

            {/* Canvas */}
            <div className="flex-1 overflow-auto">
              <FormBuilderCanvas />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
