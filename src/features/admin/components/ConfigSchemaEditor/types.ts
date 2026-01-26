/**
 * ConfigSchemaEditor Types
 * Types for the schema editor component
 */

import type { ConfigSchema, OptionField, OptionGroup } from '@/lib/types/configSchema';

/**
 * Editor state for a single field
 */
export interface FieldEditorState extends OptionField {
  /** Temporary key for tracking in the UI */
  _key: string;
  /** Original field key (if editing existing field) */
  _originalKey?: string;
  /** Whether this field is new (not yet saved) */
  _isNew?: boolean;
}

/**
 * Editor state for the entire schema
 */
export interface SchemaEditorState {
  version: string;
  fields: FieldEditorState[];
  groups: OptionGroup[];
}

/**
 * Props for the ConfigSchemaEditor component
 */
export interface ConfigSchemaEditorProps {
  /** Current config schema (can be null for new models) */
  schema: ConfigSchema | null;
  /** Model ID for saving */
  modelId: string;
  /** Model name for display */
  modelName: string;
  /** Callback when schema is saved */
  onSave?: (schema: ConfigSchema) => void;
  /** Callback when editor is closed */
  onClose?: () => void;
}

/**
 * Available value sets for the values_ref dropdown
 */
export interface ValueSetOption {
  slug: string;
  name: string;
  category: string | null;
}

/**
 * Convert ConfigSchema to editor state
 */
export function schemaToEditorState(schema: ConfigSchema | null): SchemaEditorState {
  if (!schema) {
    return {
      version: '2.0',
      fields: [],
      groups: [],
    };
  }

  const fields: FieldEditorState[] = Object.entries(schema.options).map(
    ([key, field]) => ({
      ...field,
      _key: key,
      _originalKey: key,
    })
  );

  // Sort by order
  fields.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return {
    version: schema.version,
    fields,
    groups: schema.groups || [],
  };
}

/**
 * Convert editor state back to ConfigSchema
 */
export function editorStateToSchema(state: SchemaEditorState): ConfigSchema {
  const options: Record<string, OptionField> = {};

  for (const field of state.fields) {
    const { _key, _originalKey, _isNew, ...fieldData } = field;
    options[_key] = fieldData;
  }

  return {
    version: state.version,
    options,
    groups: state.groups.length > 0 ? state.groups : undefined,
  };
}

/**
 * Generate a unique key for a new field
 */
export function generateFieldKey(baseName: string, existingKeys: string[]): string {
  let key = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  if (!existingKeys.includes(key)) {
    return key;
  }

  let counter = 1;
  while (existingKeys.includes(`${key}_${counter}`)) {
    counter++;
  }
  return `${key}_${counter}`;
}

/**
 * Default values for a new field
 */
export function createDefaultField(): Omit<FieldEditorState, '_key'> {
  return {
    label: '',
    type: 'select',
    required: false,
    _isNew: true,
  };
}
