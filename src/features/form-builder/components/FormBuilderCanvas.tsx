import { useState } from 'react';
import { useFormBuilderStore } from '../store/formBuilderStore';
import { FormField, FieldType } from '../types';
import { TabManager } from './TabManager';
import { FieldEditor } from './FieldEditor';
import { FieldItem } from './FieldItem';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FormBuilderCanvas() {
  const {
    currentForm,
    uiState,
    addField,
    setSelectedTab,
    setSelectedField,
    setShowFieldEditor
  } = useFormBuilderStore();

  const [dragOverTab, setDragOverTab] = useState<string | null>(null);

  const selectedTab = currentForm?.tabs.find(tab => tab.id === uiState.selectedTab) ||
    currentForm?.tabs[0];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fieldType = e.dataTransfer.getData('fieldType') as FieldType;

    if (fieldType && selectedTab) {
      const newField: Omit<FormField, 'id'> = {
        name: `field_${Date.now()}`,
        label: fieldType.charAt(0).toUpperCase() + fieldType.slice(1).replace(/-/g, ' '),
        type: fieldType,
        order: selectedTab.fields.length,
        validation: {}
      };

      // Add default options for selection fields
      if (['dropdown', 'multi-select', 'radio'].includes(fieldType)) {
        newField.options = [
          { label: 'Option 1', value: 'option1' },
          { label: 'Option 2', value: 'option2' },
          { label: 'Option 3', value: 'option3' }
        ];
      }

      addField(selectedTab.id, newField);
    }

    setDragOverTab(null);
  };

  const handleFieldClick = (fieldId: string) => {
    setSelectedField(fieldId);
    setShowFieldEditor(true);
  };

  if (!currentForm) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No form selected</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Canvas */}
      <div className="flex-1 p-6">
        {/* Tab Manager */}
        <TabManager />

        {/* Canvas Area */}
        <div
          className={`
            mt-6 bg-white rounded-lg border-2 border-dashed
            min-h-[500px] p-8 transition-all duration-200
            ${dragOverTab === selectedTab?.id
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300'
            }
          `}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnter={() => setDragOverTab(selectedTab?.id || null)}
          onDragLeave={() => setDragOverTab(null)}
        >
          {selectedTab ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedTab.name}
                </h2>
                {selectedTab.description && (
                  <p className="text-gray-600">{selectedTab.description}</p>
                )}
              </div>

              {selectedTab.fields.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No fields yet
                  </h3>
                  <p className="text-gray-600 max-w-md">
                    Drag and drop field types from the left sidebar to start building your form
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedTab.fields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => (
                      <FieldItem
                        key={field.id}
                        field={field}
                        tabId={selectedTab.id}
                        onClick={() => handleFieldClick(field.id)}
                        isSelected={uiState.selectedField === field.id}
                      />
                    ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a tab to start building</p>
            </div>
          )}
        </div>
      </div>

      {/* Field Editor Sidebar */}
      {uiState.showFieldEditor && uiState.selectedField && (
        <FieldEditor />
      )}
    </div>
  );
}
