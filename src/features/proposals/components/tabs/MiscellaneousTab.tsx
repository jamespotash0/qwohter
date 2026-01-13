/**
 * Miscellaneous Tab
 *
 * Reference numbers and internal notes:
 * - Reference Numbers table (PO, Job, Contract numbers)
 * - Internal Notes (not shown in client output)
 */

import { useState, useEffect, useRef } from 'react';
import { Plus, Trash, Hash, Warning } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';
import { useFormBuilder } from '../../context/FormBuilderContext';

// Reference number interface
interface ReferenceNumber {
  id: string;
  label: string;
  value: string;
}

interface MiscellaneousTabProps {
  mode: EditorMode;
}

export function MiscellaneousTab({ mode }: MiscellaneousTabProps) {
  const isBuilderMode = mode === 'builder';

  // Get context data and setter
  const { data: formData, setMiscellaneousData } = useFormBuilder();

  // Initialize local state from context
  const [references, setReferences] = useState<ReferenceNumber[]>(() => {
    // Map from context fields format to local references format
    const contextFields = formData.miscellaneous?.fields || [];
    return contextFields.map(f => ({
      id: f.id,
      label: f.label,
      value: f.value,
    }));
  });
  const [internalNotes, setInternalNotes] = useState(() => formData.miscellaneous?.notes || '');

  // Track if we've loaded initial data
  const hasLoadedInitialData = useRef(false);
  // Track if we're updating from context to avoid sync loops
  const isUpdatingFromContext = useRef(false);
  // Track if we should allow syncing (prevents premature sync before data loads)
  const canSync = useRef(false);

  // Load data from context when it changes
  useEffect(() => {
    if (hasLoadedInitialData.current) return;

    const contextFields = formData.miscellaneous?.fields;
    const contextNotes = formData.miscellaneous?.notes;

    // Check if we have any actual data from context
    const hasContextData = (contextFields && contextFields.length > 0) || (contextNotes && contextNotes.length > 0);

    if (hasContextData) {
      isUpdatingFromContext.current = true;

      if (contextFields && contextFields.length > 0) {
        setReferences(contextFields.map(f => ({
          id: f.id,
          label: f.label,
          value: f.value,
        })));
      }

      if (contextNotes) {
        setInternalNotes(contextNotes);
      }

      hasLoadedInitialData.current = true;
      canSync.current = true; // Now we can sync - data has loaded
    }
  }, [formData.miscellaneous]);

  // Enable syncing after a brief delay to allow initial data to load
  // This ensures new proposals (with no saved data) can still sync after the delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!canSync.current) {
        canSync.current = true;
        hasLoadedInitialData.current = true;
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Sync local state back to context
  useEffect(() => {
    // Don't sync until we've either loaded data or waited for the timeout
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
      notes: internalNotes,
    });
  }, [references, internalNotes, setMiscellaneousData]);

  // Input styling matching other tabs
  const inputClassName = cn(
    'h-7 text-xs rounded border-gray-200 dark:border-gray-600 px-2',
    'focus:ring-1 focus:ring-coral/20 focus:border-coral',
    isBuilderMode && 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
  );

  // Reference number handlers
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
    <div className="space-y-6">
      {/* Reference Numbers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <Hash className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference Numbers</h3>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <div className="col-span-4">Label</div>
          <div className="col-span-7">Value</div>
          <div className="col-span-1"></div>
        </div>

        {/* Reference Rows */}
        <div>
          {references.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
              No reference numbers added
            </div>
          ) : (
            references.map((ref) => (
              <div
                key={ref.id}
                className="grid grid-cols-12 gap-2 px-3 py-1 items-center border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20"
              >
                {/* Label */}
                <div className="col-span-4">
                  <Input
                    value={ref.label}
                    onChange={(e) => updateReference(ref.id, { label: e.target.value })}
                    placeholder="e.g., PO Number"
                    className={inputClassName}
                    disabled={isBuilderMode}
                  />
                </div>

                {/* Value */}
                <div className="col-span-7">
                  <Input
                    value={ref.value}
                    onChange={(e) => updateReference(ref.id, { value: e.target.value })}
                    placeholder="Enter value"
                    className={cn(inputClassName, 'font-mono')}
                    disabled={isBuilderMode}
                  />
                </div>

                {/* Delete */}
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

          {/* Add Row */}
          <div className="px-3 py-1 border-t border-gray-100 dark:border-gray-700/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={addReference}
              disabled={isBuilderMode}
              className="text-gray-400 hover:text-coral hover:bg-coral/5 h-6 text-[10px]"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Reference
            </Button>
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            <Warning className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Notes</h3>
          </div>
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
            Not visible to clients
          </span>
        </div>

        {/* Notes Textarea */}
        <div className="p-4">
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Add internal notes for your team..."
            disabled={isBuilderMode}
            className={cn(
              'min-h-[100px] text-xs rounded border-gray-200 dark:border-gray-600 px-3 py-2',
              'focus:ring-1 focus:ring-coral/20 focus:border-coral',
              'resize-none',
              isBuilderMode && 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed opacity-60'
            )}
          />
        </div>
      </div>
    </div>
  );
}

export default MiscellaneousTab;
