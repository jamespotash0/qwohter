/**
 * Variable Inserter
 *
 * Dropdown menu for selecting variables to insert into the editor.
 * Grouped by category for easy navigation.
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { getVariablesByCategory, type VariableDefinition } from './VariableExtension';

interface VariableInserterProps {
  onClose: () => void;
  onSelect: (variableKey: string, variableLabel: string) => void;
}

export function VariableInserter({ onClose, onSelect }: VariableInserterProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get variables grouped by category
  const variablesByCategory = useMemo(() => getVariablesByCategory(), []);
  const categories = useMemo(() => Object.keys(variablesByCategory), [variablesByCategory]);

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!search.trim()) {
      return selectedCategory
        ? { [selectedCategory]: variablesByCategory[selectedCategory] }
        : variablesByCategory;
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
  }, [search, selectedCategory, variablesByCategory]);

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
      {/* Header with search */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
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
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors',
            selectedCategory === null
              ? 'bg-coral text-white'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors',
              selectedCategory === category
                ? 'bg-coral text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Variables list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {Object.keys(filteredVariables).length === 0 ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
            No variables found
          </div>
        ) : (
          Object.entries(filteredVariables).map(([category, variables]) => (
            <div key={category}>
              <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {category}
              </div>
              <div className="space-y-1">
                {variables.map((variable) => (
                  <button
                    key={variable.key}
                    onClick={() => handleVariableClick(variable)}
                    className={cn(
                      'w-full px-3 py-2 text-left rounded-lg',
                      'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                      'transition-colors group'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {variable.label}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        {'{' + variable.key + '}'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
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
