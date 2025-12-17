/**
 * Variable Panel
 *
 * Expandable side panel for browsing and inserting variables.
 * Slides in from the right side of the editor.
 * Supports both static variables and dynamic product-based variables.
 */

import { useState, useMemo, useCallback } from 'react';
import { X, MagnifyingGlass, CaretRight, Package, ListBullets, CurrencyDollar, Clock, TextAa } from '@phosphor-icons/react';
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
    case 'Terms':
      return <ListBullets className="w-3 h-3" />;
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
    case 'Terms':
      return {
        header: 'text-green-600 dark:text-green-400',
        count: 'text-green-400',
        item: 'text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20',
        code: 'text-green-400',
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

  // Initialize all categories as expanded
  useMemo(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach(cat => { initial[cat] = true; });
    setExpandedCategories(initial);
  }, [categories]);

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
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
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
                  'w-full flex items-center gap-2 px-3 py-1.5',
                  'text-xs font-semibold uppercase tracking-wider',
                  'hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
                  colors.header
                )}
              >
                <CaretRight
                  className={cn(
                    'w-3 h-3 transition-transform',
                    expandedCategories[category] && 'rotate-90'
                  )}
                />
                {icon}
                {category}
                <span className={cn(
                  'ml-auto font-normal normal-case',
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
