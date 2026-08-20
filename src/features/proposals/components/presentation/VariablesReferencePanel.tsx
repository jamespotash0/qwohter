/**
 * Variables Reference Panel
 *
 * Side panel for the Presentation tab showing all available template
 * placeholders with {{key}} syntax and descriptions. Always includes
 * a static "Product Fields" section so users can see available fields
 * even before products are added.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  MagnifyingGlass,
  Copy,
  Check,
  CaretRight,
  CaretDown,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { getAllFormVariables, type VariableDefinition } from './VariableExtension';
import { getFieldsByCategory } from '../../utils/productVariables';
import type { FormBuilderData } from '../../context/FormBuilderContext';

interface VariablesReferencePanelProps {
  formData: FormBuilderData;
  onClose: () => void;
}

/**
 * Build static product fields reference that always shows,
 * regardless of whether products exist in the proposal.
 */
function getStaticProductFieldsReference(): VariableDefinition[] {
  const fieldsByCategory = getFieldsByCategory();
  const vars: VariableDefinition[] = [];

  // Add a note variable at the top
  Object.entries(fieldsByCategory).forEach(([category, fields]) => {
    fields.forEach(field => {
      vars.push({
        key: `{alias}.${field.key}`,
        label: `${field.label}`,
        category: 'Product Fields Reference',
        description: `${category} — Replace {alias} with product alias (e.g., Wall A.${field.key})`,
      });
    });
  });

  return vars;
}

export function VariablesReferencePanel({ formData, onClose }: VariablesReferencePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Get dynamic variables from form data
  const dynamicVariables = useMemo(() => getAllFormVariables(formData), [formData]);

  // Build static product fields reference
  const staticProductFields = useMemo(() => getStaticProductFieldsReference(), []);

  // Merge dynamic variables with static product fields reference
  const allVariables = useMemo(() => {
    const merged = { ...dynamicVariables };

    // Always add the static product fields reference category
    // (separate from any specific "Product: Wall A" categories)
    const hasAnyProducts = Object.keys(merged).some(k => k.startsWith('Product:'));
    if (staticProductFields.length > 0) {
      // Label changes based on whether products exist
      const label = hasAnyProducts
        ? 'All Product Fields'
        : 'Product Fields Reference';
      merged[label] = staticProductFields.map(v => ({
        ...v,
        category: label,
      }));
    }

    return merged;
  }, [dynamicVariables, staticProductFields]);

  // Filter variables by search
  const filteredVariables = useMemo(() => {
    if (!searchQuery.trim()) return allVariables;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, VariableDefinition[]> = {};

    Object.entries(allVariables).forEach(([category, vars]) => {
      const matchingVars = vars.filter(
        v =>
          v.key.toLowerCase().includes(query) ||
          v.label.toLowerCase().includes(query) ||
          v.description?.toLowerCase().includes(query)
      );
      if (matchingVars.length > 0) {
        filtered[category] = matchingVars;
      }
    });

    return filtered;
  }, [allVariables, searchQuery]);

  // Auto-expand categories when searching
  const effectiveExpanded = useMemo(() => {
    if (searchQuery.trim()) {
      const allExpanded: Record<string, boolean> = {};
      Object.keys(filteredVariables).forEach(cat => {
        allExpanded[cat] = true;
      });
      return allExpanded;
    }
    return expandedCategories;
  }, [searchQuery, filteredVariables, expandedCategories]);

  const toggleCategory = useCallback((name: string) => {
    setExpandedCategories(prev => ({ ...prev, [name]: !prev[name] }));
  }, []);

  const expandAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    Object.keys(allVariables).forEach(cat => {
      all[cat] = true;
    });
    setExpandedCategories(all);
  }, [allVariables]);

  const collapseAll = useCallback(() => {
    setExpandedCategories({});
  }, []);

  const copyVariable = useCallback((key: string) => {
    // Don't wrap template reference keys (with {alias}) in braces
    const isTemplateRef = key.startsWith('{alias}');
    const formatted = isTemplateRef ? `{{${key}}}` : `{{${key}}}`;
    navigator.clipboard.writeText(formatted);
    setCopiedKey(key);
    toast.success('Copied!', {
      description: `${formatted}`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const categoryEntries = Object.entries(filteredVariables);
  const totalCount = categoryEntries.reduce((sum, [, vars]) => sum + vars.length, 0);

  return (
    <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Template Variables
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Use <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-[11px]">{'{{variable}}'}</code> in your Google Docs template. Click to copy.
        </p>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Expand/Collapse */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{totalCount} variables</span>
          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto p-2">
        {categoryEntries.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No variables match your search
          </div>
        ) : (
          categoryEntries.map(([category, vars]) => (
            <div key={category} className="mb-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2',
                  'text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide',
                  'hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                )}
              >
                {effectiveExpanded[category] ? (
                  <CaretDown weight="bold" className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                ) : (
                  <CaretRight weight="bold" className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                )}
                <span className="truncate text-left">{category}</span>
                <span className="ml-auto text-gray-400 font-normal normal-case text-[10px]">
                  {vars.length}
                </span>
              </button>

              {/* Variables */}
              {effectiveExpanded[category] && (
                <div className="space-y-0.5 ml-1">
                  {vars.map(variable => (
                    <button
                      key={`${category}-${variable.key}`}
                      onClick={() => copyVariable(variable.key)}
                      className={cn(
                        'w-full text-left px-2 py-1.5 rounded transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-gray-700 group',
                        copiedKey === variable.key && 'bg-green-50 dark:bg-green-900/20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <code className="text-[11px] font-mono text-blue-600 dark:text-blue-400 break-all">
                            {`{{${variable.key}}}`}
                          </code>
                          <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                            {variable.label}
                          </div>
                          {variable.description && (
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {variable.description}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 mt-0.5">
                          {copiedKey === variable.key ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
