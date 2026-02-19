/**
 * Reference Numbers Card
 *
 * Dynamic label/value rows for PO numbers, job numbers, contract numbers, etc.
 * Syncs with FormBuilderContext via setMiscellaneousData().
 */

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash, Hash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TAB_INPUT_CLASS, TAB_DISABLED_MODIFIER } from '../shared/tabStyles';
import type { EditorMode } from '../../ProposalEditor';
import { useFormBuilder } from '../../../context/FormBuilderContext';

interface ReferenceNumber {
  id: string;
  label: string;
  value: string;
}

interface ReferenceNumbersCardProps {
  mode: EditorMode;
}

export function ReferenceNumbersCard({ mode }: ReferenceNumbersCardProps) {
  const isBuilderMode = mode === 'builder';

  const { data: formData, setMiscellaneousData } = useFormBuilder();

  const [references, setReferences] = useState<ReferenceNumber[]>(() => {
    const contextFields = formData.miscellaneous?.fields || [];
    return contextFields.map(f => ({
      id: f.id,
      label: f.label,
      value: f.value,
    }));
  });

  const hasLoadedInitialData = useRef(false);
  const isUpdatingFromContext = useRef(false);
  const canSync = useRef(false);

  // Load data from context when it changes
  useEffect(() => {
    if (hasLoadedInitialData.current) return;

    const contextFields = formData.miscellaneous?.fields;
    const hasContextData = contextFields && contextFields.length > 0;

    if (hasContextData) {
      isUpdatingFromContext.current = true;
      setReferences(contextFields.map(f => ({
        id: f.id,
        label: f.label,
        value: f.value,
      })));
      hasLoadedInitialData.current = true;
      canSync.current = true;
    }
  }, [formData.miscellaneous]);

  // Enable syncing after delay for new proposals with no saved data
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!canSync.current) {
        canSync.current = true;
        hasLoadedInitialData.current = true;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Sync local state back to context (preserve existing notes)
  useEffect(() => {
    if (!canSync.current) return;

    if (isUpdatingFromContext.current) {
      isUpdatingFromContext.current = false;
      return;
    }

    setMiscellaneousData({
      fields: references.map(r => ({
        id: r.id,
        label: r.label,
        value: r.value,
      })),
      notes: formData.miscellaneous?.notes || '',
    });
  }, [references, setMiscellaneousData, formData.miscellaneous?.notes]);

  const inputClassName = cn(
    TAB_INPUT_CLASS,
    isBuilderMode && TAB_DISABLED_MODIFIER
  );

  const addReference = () => {
    setReferences([
      ...references,
      { id: `${Date.now()}`, label: '', value: '' },
    ]);
  };

  const updateReference = (id: string, updates: Partial<ReferenceNumber>) => {
    setReferences(references.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeReference = (id: string) => {
    setReferences(references.filter((r) => r.id !== id));
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm',
        'border border-gray-100 dark:border-gray-700/50',
        'overflow-hidden'
      )}
    >
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700/50">
        <Hash className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference Numbers</h3>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        <div className="col-span-4">Label</div>
        <div className="col-span-7">Value</div>
        <div className="col-span-1"></div>
      </div>

      {/* Reference Rows */}
      <div>
        {references.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">
              No reference numbers added
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-sm mx-auto">
              Add shipping numbers, tracking numbers, PO numbers, or other reference numbers related to this proposal. These are not tied to the client.
            </p>
          </div>
        ) : (
          references.map((ref) => (
            <div
              key={ref.id}
              className="grid grid-cols-12 gap-2 px-3 py-1 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
            >
              <div className="col-span-4">
                <Input
                  value={ref.label}
                  onChange={(e) => updateReference(ref.id, { label: e.target.value })}
                  placeholder="e.g., PO Number"
                  className={inputClassName}
                  disabled={isBuilderMode}
                />
              </div>
              <div className="col-span-7">
                <Input
                  value={ref.value}
                  onChange={(e) => updateReference(ref.id, { value: e.target.value })}
                  placeholder="Enter value"
                  className={inputClassName}
                  disabled={isBuilderMode}
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => removeReference(ref.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={isBuilderMode}
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}

        <div className="px-3 py-1 border-t border-gray-100 dark:border-gray-700/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={addReference}
            disabled={isBuilderMode}
            className="text-gray-400 hover:text-coral hover:bg-coral/5 h-6 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Reference
          </Button>
        </div>
      </div>
    </div>
  );
}
