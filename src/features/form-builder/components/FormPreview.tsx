import { FormDefinition } from '../types';
import { DynamicFormRenderer } from '../renderer/DynamicFormRenderer';

interface FormPreviewProps {
  form: FormDefinition;
}

export function FormPreview({ form }: FormPreviewProps) {
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-8 rounded-t-lg">
          <h2 className="text-3xl font-bold mb-2">{form.name}</h2>
          {form.description && (
            <p className="text-blue-100">{form.description}</p>
          )}
        </div>

        <div className="bg-white rounded-b-lg shadow-lg p-8">
          <DynamicFormRenderer form={form} />
        </div>
      </div>
    </div>
  );
}
