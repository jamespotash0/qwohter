/**
 * Variable Panel
 *
 * Expandable side panel for browsing and inserting variables.
 * Slides in from the right side of the editor.
 * Supports both static variables and dynamic product-based variables.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, MagnifyingGlass, CaretRight, CaretDown, Package, ListBullets, CurrencyDollar, Clock, TextAa, FileText, Buildings, User, AddressBook, Briefcase } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { getAllFormVariables, type VariableDefinition } from './VariableExtension';
import { useFormBuilder } from '../../context/FormBuilderContext';

interface VariablePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (variableKey: string, variableLabel: string) => void;
}

// Category icon mapping
function getCategoryIcon(category: string) {
  if (category.startsWith('Product:')) return <Package className="w-3 h-3" />;
  switch (category) {
    case 'Proposal':
      return <FileText className="w-3 h-3" />;
    case 'Project':
      return <Briefcase className="w-3 h-3" />;
    case 'Contact':
      return <User className="w-3 h-3" />;
    case 'Client':
      return <AddressBook className="w-3 h-3" />;
    case 'Organization':
      return <Buildings className="w-3 h-3" />;
    case 'Products':
      return <Package className="w-3 h-3" />;
    case 'Pricing':
      return <CurrencyDollar className="w-3 h-3" />;
    case 'Lead Times':
      return <Clock className="w-3 h-3" />;
    case 'Custom Fields':
      return <TextAa className="w-3 h-3" />;
    default:
      return null;
  }
}

// Category color mapping
function getCategoryColors(category: string) {
  if (category.startsWith('Product:')) {
    return {
      header: 'text-purple-600 dark:text-purple-400',
      count: 'text-purple-400',
      item: 'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20',
      code: 'text-purple-400',
    };
  }
  switch (category) {
    case 'Proposal':
      return {
        header: 'text-indigo-600 dark:text-indigo-400',
        count: 'text-indigo-400',
        item: 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
        code: 'text-indigo-400',
      };
    case 'Project':
      return {
        header: 'text-cyan-600 dark:text-cyan-400',
        count: 'text-cyan-400',
        item: 'text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20',
        code: 'text-cyan-400',
      };
    case 'Contact':
      return {
        header: 'text-teal-600 dark:text-teal-400',
        count: 'text-teal-400',
        item: 'text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20',
        code: 'text-teal-400',
      };
    case 'Client':
      return {
        header: 'text-amber-600 dark:text-amber-400',
        count: 'text-amber-400',
        item: 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20',
        code: 'text-amber-400',
      };
    case 'Organization':
      return {
        header: 'text-slate-600 dark:text-slate-400',
        count: 'text-slate-400',
        item: 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/20',
        code: 'text-slate-400',
      };
    case 'Products':
      return {
        header: 'text-violet-600 dark:text-violet-400',
        count: 'text-violet-400',
        item: 'text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20',
        code: 'text-violet-400',
      };
    case 'Pricing':
      return {
        header: 'text-blue-600 dark:text-blue-400',
        count: 'text-blue-400',
        item: 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20',
        code: 'text-blue-400',
      };
    case 'Lead Times':
      return {
        header: 'text-orange-600 dark:text-orange-400',
        count: 'text-orange-400',
        item: 'text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20',
        code: 'text-orange-400',
      };
    case 'Custom Fields':
      return {
        header: 'text-pink-600 dark:text-pink-400',
        count: 'text-pink-400',
        item: 'text-pink-700 dark:text-pink-300 hover:bg-pink-50 dark:hover:bg-pink-900/20',
        code: 'text-pink-400',
      };
    default:
      return {
        header: 'text-gray-500 dark:text-gray-400',
        count: 'text-gray-400',
        item: 'text-gray-700 dark:text-gray-300 hover:bg-coral/5 hover:text-coral',
        code: 'text-gray-400',
      };
  }
}

export function VariablePanel({ isOpen, onClose, onSelect }: VariablePanelProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Get full form data from context for dynamic variables
  const { data } = useFormBuilder();

  // Get variables grouped by category (includes all form field variables)
  const variablesByCategory = useMemo(
    () => getAllFormVariables(data),
    [data]
  );
  const categories = useMemo(() => Object.keys(variablesByCategory), [variablesByCategory]);

  // Initialize categories as collapsed by default (only expand when searching)
  useEffect(() => {
    // Don't reset if we already have state (prevents losing user's expand/collapse choices)
    if (Object.keys(expandedCategories).length === 0) {
      const initial: Record<string, boolean> = {};
      categories.forEach(cat => { initial[cat] = false; });
      setExpandedCategories(initial);
    }
  }, [categories]);

  // Expand/collapse all
  const expandAll = useCallback(() => {
    const expanded: Record<string, boolean> = {};
    categories.forEach(cat => { expanded[cat] = true; });
    setExpandedCategories(expanded);
  }, [categories]);

  const collapseAll = useCallback(() => {
    const collapsed: Record<string, boolean> = {};
    categories.forEach(cat => { collapsed[cat] = false; });
    setExpandedCategories(collapsed);
  }, [categories]);

  const allExpanded = useMemo(
    () => categories.length > 0 && categories.every(cat => expandedCategories[cat]),
    [categories, expandedCategories]
  );
  const allCollapsed = useMemo(
    () => categories.length > 0 && categories.every(cat => !expandedCategories[cat]),
    [categories, expandedCategories]
  );

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!search.trim()) return variablesByCategory;

    const searchLower = search.toLowerCase();
    const filtered: Record<string, VariableDefinition[]> = {};

    Object.entries(variablesByCategory).forEach(([category, variables]) => {
      const matching = variables.filter(
        (v) =>
          v.label.toLowerCase().includes(searchLower) ||
          v.key.toLowerCase().includes(searchLower)
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });

    return filtered;
  }, [search, variablesByCategory]);

  // Auto-expand categories that have search matches
  useEffect(() => {
    if (search.trim()) {
      // When searching, expand all categories with matches
      const matchingCategories = Object.keys(filteredVariables);
      if (matchingCategories.length > 0) {
        setExpandedCategories(prev => {
          const updated = { ...prev };
          matchingCategories.forEach(cat => { updated[cat] = true; });
          return updated;
        });
      }
    }
  }, [search, filteredVariables]);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const handleVariableClick = useCallback((variable: VariableDefinition) => {
    onSelect(variable.key, variable.label);
  }, [onSelect]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'w-72 flex-shrink-0 border-l border-gray-200 dark:border-gray-700',
        'bg-gray-50 dark:bg-gray-900 flex flex-col h-full',
        'transition-all duration-200'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Variables
        </h3>
        <div className="flex items-center gap-1">
          {/* Expand/Collapse All Toggle */}
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={allExpanded ? 'Collapse all' : 'Expand all'}
          >
            {allExpanded ? (
              <CaretDown className="w-4 h-4 text-gray-500" />
            ) : (
              <CaretRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search variables..."
            className={cn(
              'w-full pl-8 pr-3 py-1.5 text-sm rounded-md',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-600',
              'focus:outline-none focus:ring-1 focus:ring-coral/50 focus:border-coral',
              'placeholder:text-gray-400'
            )}
          />
        </div>
      </div>

      {/* Variable List */}
      <div className="flex-1 overflow-y-auto py-2">
        {Object.keys(filteredVariables).length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            No variables found
          </div>
        ) : (
          Object.entries(filteredVariables).map(([category, variables]) => {
            const colors = getCategoryColors(category);
            const icon = getCategoryIcon(category);
            return (
            <div key={category} className="mb-1">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2',
                  'text-xs font-semibold uppercase tracking-wider',
                  'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  'rounded-md mx-1',
                  colors.header
                )}
              >
                {expandedCategories[category] ? (
                  <CaretDown weight="bold" className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                ) : (
                  <CaretRight weight="bold" className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                )}
                {icon}
                <span className="truncate">{category}</span>
                <span className={cn(
                  'ml-auto font-normal normal-case flex-shrink-0',
                  colors.count
                )}>
                  {variables.length}
                </span>
              </button>

              {/* Variables */}
              {expandedCategories[category] && (
                <div className="pb-1">
                  {variables.map((variable) => (
                    <button
                      key={variable.key}
                      onClick={() => handleVariableClick(variable)}
                      title={variable.description}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-1.5',
                        'text-sm',
                        'transition-colors',
                        'group',
                        colors.item
                      )}
                    >
                      <span className="truncate flex-1 text-left">{variable.label}</span>
                      <span className={cn(
                        'text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0',
                        colors.code
                      )}>
                        {'{' + variable.key + '}'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 text-center">
          Click to insert at cursor
        </p>
      </div>
    </div>
  );
}

export default VariablePanel;
