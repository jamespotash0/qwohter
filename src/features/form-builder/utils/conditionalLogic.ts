import { ConditionalLogic, FormDefinition, FormData } from '../types';

export function evaluateConditionalLogic(
  conditions: ConditionalLogic[],
  formData: FormData,
  form: FormDefinition
): boolean {
  // All conditions must be true (AND logic)
  return conditions.every(condition => {
    const field = form.tabs
      .flatMap(tab => tab.fields)
      .find(f => f.id === condition.fieldId);

    if (!field) return false;

    const fieldValue = formData[field.name];

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'notEquals':
        return fieldValue !== condition.value;

      case 'contains':
        return String(fieldValue || '').includes(String(condition.value));

      case 'greaterThan':
        return Number(fieldValue) > Number(condition.value);

      case 'lessThan':
        return Number(fieldValue) < Number(condition.value);

      case 'isEmpty':
        return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);

      case 'isNotEmpty':
        return !!fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);

      default:
        return false;
    }
  });
}
