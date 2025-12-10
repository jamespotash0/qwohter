/**
 * Miscellaneous Tab
 *
 * Custom references, notes, and additional information:
 * - Reference Numbers (PO, Job, Contract numbers)
 * - Custom Fields
 * - Internal Notes (not shown in client output)
 */

import { useState } from 'react';
import { Plus, Trash, CaretDown, CaretRight, Warning, Hash, TextT, NotePencil } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EditorMode } from '../ProposalEditor';

// Reference number interface
interface ReferenceNumber {
  id: string;
  label: string;
  value: string;
}

// Custom field interface
interface CustomField {
  id: string;
  label: string;
  value: string;
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, badge, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isOpen ? (
            <CaretDown className="w-4 h-4 text-gray-400" />
          ) : (
            <CaretRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-gray-600 dark:text-gray-400">{icon}</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
          {badge}
        </div>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-100 dark:border-gray-700/50">
          {children}
        </div>
      )}
    </div>
  );
}

// Default reference numbers
const DEFAULT_REFERENCES: ReferenceNumber[] = [
  { id: '1', label: 'PO Number', value: '' },
  { id: '2', label: 'Job Number', value: '' },
  { id: '3', label: 'Contract Number', value: '' },
];

interface MiscellaneousTabProps {
  mode: EditorMode;
}

export function MiscellaneousTab({ mode }: MiscellaneousTabProps) {
  // For now, both modes show the same UI - builder mode will be enhanced later
  const _isBuilderMode = mode === 'builder';
  const [references, setReferences] = useState<ReferenceNumber[]>(DEFAULT_REFERENCES);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [internalNotes, setInternalNotes] = useState('');

  const inputClassName = cn(
    'h-10 rounded-lg border-gray-200 dark:border-gray-600',
    'focus:ring-2 focus:ring-coral/20 focus:border-coral'
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

  // Custom field handlers
  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      { id: `${Date.now()}`, label: '', value: '' },
    ]);
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(customFields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Miscellaneous
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Custom references, additional fields, and internal notes
        </p>
      </div>

      {/* Reference Numbers Section */}
      <CollapsibleSection
        title="Reference Numbers"
        icon={<Hash className="w-5 h-5" />}
      >
        <div className="space-y-3 mt-3">
          {references.map((ref) => (
            <div key={ref.id} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-4">
                <Input
                  value={ref.label}
                  onChange={(e) => updateReference(ref.id, { label: e.target.value })}
                  placeholder="Label (e.g., PO Number)"
                  className={inputClassName}
                />
              </div>
              <div className="col-span-7">
                <Input
                  value={ref.value}
                  onChange={(e) => updateReference(ref.id, { value: e.target.value })}
                  placeholder="Value"
                  className={cn(inputClassName, 'font-mono')}
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => removeReference(ref.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={addReference}
            className="text-coral hover:text-coral-hover hover:bg-coral/5"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Reference
          </Button>
        </div>
      </CollapsibleSection>

      {/* Custom Fields Section */}
      <CollapsibleSection
        title="Custom Fields"
        icon={<TextT className="w-5 h-5" />}
      >
        <div className="space-y-3 mt-3">
          {customFields.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <TextT className="w-6 h-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No custom fields yet</p>
            </div>
          ) : (
            customFields.map((field) => (
              <div key={field.id} className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-4">
                  <Input
                    value={field.label}
                    onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                    placeholder="Field Label"
                    className={inputClassName}
                  />
                </div>
                <div className="col-span-7">
                  <Input
                    value={field.value}
                    onChange={(e) => updateCustomField(field.id, { value: e.target.value })}
                    placeholder="Field Value"
                    className={inputClassName}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeCustomField(field.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={addCustomField}
            className="text-coral hover:text-coral-hover hover:bg-coral/5"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Custom Field
          </Button>
        </div>
      </CollapsibleSection>

      {/* Internal Notes Section */}
      <CollapsibleSection
        title="Internal Notes"
        icon={<NotePencil className="w-5 h-5" />}
        badge={
          <Badge
            variant="outline"
            className="ml-2 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700"
          >
            <Warning className="w-3 h-3 mr-1" />
            Internal Only
          </Badge>
        }
      >
        <div className="mt-3">
          <div className="text-xs text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
            <Warning className="w-3 h-3" />
            These notes will NOT be included in client-facing documents
          </div>
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Add internal notes for your team..."
            className={cn(
              'min-h-[120px] rounded-lg border-gray-200 dark:border-gray-600',
              'focus:ring-2 focus:ring-coral/20 focus:border-coral',
              'resize-none'
            )}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default MiscellaneousTab;
