import { useState } from 'react';
import { FormDefinition, FormData } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicField } from './DynamicField';
import { evaluateConditionalLogic } from '../utils/conditionalLogic';

interface DynamicFormRendererProps {
  form: FormDefinition;
  initialData?: FormData;
  onSubmit?: (data: FormData) => void;
  readonly?: boolean;
}

export function DynamicFormRenderer({
  form,
  initialData = {},
  onSubmit,
  readonly = false
}: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [activeTab, setActiveTab] = useState(form.tabs[0]?.id || '');

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {form.tabs.length > 1 ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${form.tabs.length}, 1fr)` }}>
            {form.tabs
              .sort((a, b) => a.order - b.order)
              .map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.name}
                </TabsTrigger>
              ))}
          </TabsList>

          {form.tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-6">
              {tab.description && (
                <p className="text-sm text-gray-600 mb-4">{tab.description}</p>
              )}

              <div className="grid grid-cols-12 gap-4">
                {tab.fields
                  .sort((a, b) => a.order - b.order)
                  .filter(field => {
                    // Check conditional logic
                    if (field.showIf && field.showIf.length > 0) {
                      return evaluateConditionalLogic(field.showIf, formData, form);
                    }
                    return true;
                  })
                  .map(field => {
                    const colSpan = field.width === 'full' ? 12 : field.width === 'half' ? 6 : 4;
                    return (
                      <div key={field.id} className={`col-span-${colSpan}`}>
                        <DynamicField
                          field={field}
                          value={formData[field.name]}
                          onChange={(value) => handleFieldChange(field.name, value)}
                          readonly={readonly}
                        />
                      </div>
                    );
                  })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div className="space-y-4">
          {form.tabs[0]?.description && (
            <p className="text-sm text-gray-600">{form.tabs[0].description}</p>
          )}

          <div className="grid grid-cols-12 gap-4">
            {form.tabs[0]?.fields
              .sort((a, b) => a.order - b.order)
              .filter(field => {
                if (field.showIf && field.showIf.length > 0) {
                  return evaluateConditionalLogic(field.showIf, formData, form);
                }
                return true;
              })
              .map(field => {
                const colSpan = field.width === 'full' ? 12 : field.width === 'half' ? 6 : 4;
                return (
                  <div key={field.id} className={`col-span-${colSpan}`}>
                    <DynamicField
                      field={field}
                      value={formData[field.name]}
                      onChange={(value) => handleFieldChange(field.name, value)}
                      readonly={readonly}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </form>
  );
}
