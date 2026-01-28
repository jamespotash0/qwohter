/**
 * Config Schema Editor
 * Admin component for editing a model's config_schema
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Plus, Save, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { configValueSetsService } from '@/features/admin/services/configValueSetsService';
import { FieldEditor } from './FieldEditor';
import type { ConfigSchema } from '@/lib/types/configSchema';
import {
  type ConfigSchemaEditorProps,
  type SchemaEditorState,
  type FieldEditorState,
  type ValueSetOption,
  schemaToEditorState,
  editorStateToSchema,
  generateFieldKey,
  createDefaultField,
} from './types';

export function ConfigSchemaEditor({
  schema,
  modelId,
  modelName,
  onSave,
  onClose,
}: ConfigSchemaEditorProps) {
  const { toast } = useToast();
  const [editorState, setEditorState] = useState<SchemaEditorState>(() =>
    schemaToEditorState(schema)
  );
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch available value sets (with values for allowed_codes filtering UI)
  const { data: valueSets = [] } = useQuery({
    queryKey: ['configValueSets', 'listWithValues'],
    queryFn: async () => {
      const sets = await configValueSetsService.getValueSets();
      return sets.map((s): ValueSetOption => ({
        slug: s.slug,
        name: s.name,
        category: s.category,
        values: (s.values || []).map((v) => ({
          code: v.code,
          label: v.label,
          hex: v.hex,
          category: v.category,
        })),
      }));
    },
  });

  // Reset state when schema changes
  useEffect(() => {
    setEditorState(schemaToEditorState(schema));
    setHasChanges(false);
  }, [schema]);

  const handleFieldChange = useCallback(
    (index: number, updatedField: FieldEditorState) => {
      setEditorState((prev) => {
        const newFields = [...prev.fields];
        newFields[index] = updatedField;
        return { ...prev, fields: newFields };
      });
      setHasChanges(true);
    },
    []
  );

  const handleFieldKeyChange = useCallback(
    (index: number, oldKey: string, newKey: string) => {
      setEditorState((prev) => {
        const newFields = [...prev.fields];
        newFields[index] = { ...newFields[index], _key: newKey };
        return { ...prev, fields: newFields };
      });
      setHasChanges(true);
    },
    []
  );

  const handleAddField = useCallback(() => {
    const existingKeys = editorState.fields.map((f) => f._key);
    const newKey = generateFieldKey('new_field', existingKeys);

    const newField: FieldEditorState = {
      ...createDefaultField(),
      _key: newKey,
      order: editorState.fields.length,
    };

    setEditorState((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setHasChanges(true);
  }, [editorState.fields]);

  const handleDeleteField = useCallback((index: number) => {
    setEditorState((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);

    try {
      const newSchema = editorStateToSchema(editorState);

      // Update the model's config_schema in the database
      const { error } = await supabase
        .from('product_models')
        .update({ config_schema: newSchema })
        .eq('id', modelId);

      if (error) throw error;

      toast({
        title: 'Schema saved',
        description: 'Configuration schema has been updated.',
      });

      setHasChanges(false);
      onSave?.(newSchema);
    } catch (error) {
      toast({
        title: 'Error saving schema',
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const allFieldKeys = editorState.fields.map((f) => f._key);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Config Schema Editor
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Editing: {modelName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Unsaved changes
            </span>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Fields */}
        {editorState.fields.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="mb-4">No configuration fields defined</p>
            <Button onClick={handleAddField} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Add First Field
            </Button>
          </div>
        ) : (
          <>
            {editorState.fields.map((field, index) => (
              <FieldEditor
                key={field._key}
                field={field}
                valueSets={valueSets}
                allFieldKeys={allFieldKeys}
                onChange={(updated) => handleFieldChange(index, updated)}
                onDelete={() => handleDeleteField(index)}
                onKeyChange={(old, newKey) => handleFieldKeyChange(index, old, newKey)}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Button onClick={handleAddField} variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Field
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {editorState.fields.length} field{editorState.fields.length !== 1 ? 's' : ''}
          </span>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Schema
          </Button>
        </div>
      </div>
    </div>
  );
}
