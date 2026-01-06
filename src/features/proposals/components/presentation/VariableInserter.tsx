/**
 * Variable Inserter
 *
 * Dropdown menu for selecting variables to insert into the editor.
 * Grouped by category for easy navigation.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MagnifyingGlass, X, CaretRight, CaretDown } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { getVariablesByCategory, type VariableDefinition } from './VariableExtension';

interface VariableInserterProps {
  onClose: () => void;
  onSelect: (variableKey: string, variableLabel: string) => void;
}

export function VariableInserter({ onClose, onSelect }: VariableInserterProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get variables grouped by category
  const variablesByCategory = useMemo(() => getVariablesByCategory(), []);
  const categories = useMemo(() => Object.keys(variablesByCategory), [variablesByCategory]);

  // Initialize all categories as collapsed
  useEffect(() => {
    if (Object.keys(expandedCategories).length === 0 && categories.length > 0) {
      const initial: Record<string, boolean> = {};
      categories.forEach(cat => { initial[cat] = false; });
      setExpandedCategories(initial);
    }
  }, [categories]);

  // Toggle category expanded/collapsed
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  // Expand all / collapse all
  const allExpanded = useMemo(
    () => categories.length > 0 && categories.every(cat => expandedCategories[cat]),
    [categories, expandedCategories]
  );

  const toggleAll = useCallback(() => {
    const newState = !allExpanded;
    const updated: Record<string, boolean> = {};
    categories.forEach(cat => { updated[cat] = newState; });
    setExpandedCategories(updated);
  }, [categories, allExpanded]);

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!search.trim()) {
      return variablesByCategory;
    }

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

  // Auto-expand categories with search matches
  useEffect(() => {
    if (search.trim()) {
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

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleVariableClick = (variable: VariableDefinition) => {
    onSelect(variable.key, variable.label);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute top-full left-0 mt-2 z-50',
        'w-80 max-h-96 overflow-hidden',
        'bg-white dark:bg-gray-800 rounded-xl shadow-xl',
        'border border-gray-200 dark:border-gray-700',
        'flex flex-col'
      )}
    >
      {/* Header with search and expand/collapse toggle */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variables..."
              className={cn(
                'w-full pl-9 pr-8 py-2 text-sm',
                'bg-gray-50 dark:bg-gray-700/50 rounded-lg',
                'border border-gray-200 dark:border-gray-600',
                'focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral',
                'text-gray-900 dark:text-gray-100 placeholder:text-gray-400'
              )}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
          {/* Expand/Collapse All button */}
          <button
            onClick={toggleAll}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={allExpanded ? 'Collapse all' : 'Expand all'}
          >
            {allExpanded ? (
              <CaretDown className="w-4 h-4 text-gray-500" />
            ) : (
              <CaretRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Variables list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Object.keys(filteredVariables).length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
            No variables found
          </div>
        ) : (
          Object.entries(filteredVariables).map(([category, variables]) => (
            <div key={category}>
              {/* Collapsible Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2',
                  'text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider',
                  'hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg',
                  'transition-colors'
                )}
              >
                {expandedCategories[category] ? (
                  <CaretDown weight="bold" className="w-4 h-4 flex-shrink-0 text-gray-500" />
                ) : (
                  <CaretRight weight="bold" className="w-4 h-4 flex-shrink-0 text-gray-500" />
                )}
                <span className="truncate">{category}</span>
                <span className="ml-auto text-gray-400 font-normal normal-case">
                  {variables.length}
                </span>
              </button>

              {/* Variables (only shown when expanded) */}
              {expandedCategories[category] && (
                <div className="space-y-0.5 ml-2">
                  {variables.map((variable) => (
                    <button
                      key={variable.key}
                      onClick={() => handleVariableClick(variable)}
                      className={cn(
                        'w-full px-3 py-1.5 text-left rounded-lg',
                        'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                        'transition-colors group'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {variable.label}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                          {'{' + variable.key + '}'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Click a variable to insert it at cursor position
        </p>
      </div>
    </div>
  );
}

export default VariableInserter;
