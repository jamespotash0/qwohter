/**
 * Variable Suggestion Menu
 *
 * Autocomplete menu for inserting variables when typing "{".
 * Shows available variables filtered by search query.
 */

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { BracketsCurly } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { AVAILABLE_VARIABLES, type VariableDefinition } from './VariableExtension';

// Variable suggestion item
interface VariableSuggestionItem {
  key: string;
  label: string;
  category: string;
}

// Default: use static variables
let currentVariablesGetter: (() => VariableDefinition[]) | null = null;

/**
 * Set the getter function for dynamic variables.
 * Call this with getAllFormVariables when the form data changes.
 */
export function setVariablesGetter(getter: () => VariableDefinition[]) {
  currentVariablesGetter = getter;
}

// Get flattened list of variables for suggestion
const getSuggestionItems = (query: string): VariableSuggestionItem[] => {
  // Use dynamic getter if available, otherwise fall back to static
  const allVariables = currentVariablesGetter
    ? currentVariablesGetter()
    : AVAILABLE_VARIABLES;

  const queryLower = query.toLowerCase();
  return allVariables
    .filter((v) =>
      v.label.toLowerCase().includes(queryLower) ||
      v.key.toLowerCase().includes(queryLower)
    )
    .slice(0, 15); // Limit to 15 results for better UX
};

// Variable list component
interface VariableListProps {
  items: VariableSuggestionItem[];
  command: (item: VariableSuggestionItem) => void;
}

interface VariableListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const VariableList = forwardRef<VariableListRef, VariableListProps>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback((index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  }, [items, command]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % items.length);
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }), [items.length, selectItem, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="p-3 text-sm text-gray-500 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
        No variables found
      </div>
    );
  }

  return (
    <div className="variable-suggestion-menu bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-64 overflow-y-auto w-64">
      <div className="p-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2 py-1">
          Variables
        </p>
        {items.map((item, index) => (
          <button
            key={item.key}
            onClick={() => selectItem(index)}
            className={cn(
              'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left transition-colors',
              selectedIndex === index
                ? 'bg-coral/10 text-coral'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
            )}
          >
            <BracketsCurly className={cn(
              'w-4 h-4 flex-shrink-0',
              selectedIndex === index ? 'text-coral' : 'text-gray-400'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.label}</p>
              <p className="text-xs text-gray-400 truncate font-mono">
                {'{' + item.key + '}'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

VariableList.displayName = 'VariableList';

// Create the variable suggestion extension
export const VariableSuggestion = Extension.create({
  name: 'variableSuggestion',

  addOptions() {
    return {
      suggestion: {
        char: '{',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }: { editor: any; range: any; props: VariableSuggestionItem }) => {
          // Delete the trigger character and query
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent({
              type: 'variable',
              attrs: {
                variableKey: props.key,
                variableLabel: props.label,
              },
            })
            .run();
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('variableSuggestion'),
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return getSuggestionItems(query);
        },
        render: () => {
          let component: ReactRenderer<VariableListRef> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: SuggestionProps<VariableSuggestionItem>) => {
              component = new ReactRenderer(VariableList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as () => DOMRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate: (props: SuggestionProps<VariableSuggestionItem>) => {
              component?.updateProps(props);

              if (!props.clientRect) return;

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect as () => DOMRect,
              });
            },

            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide();
                return true;
              }

              // Handle Enter - close popup after selection
              if (props.event.key === 'Enter') {
                const handled = component?.ref?.onKeyDown(props) ?? false;
                if (handled) {
                  popup?.[0]?.hide();
                }
                return handled;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});

export default VariableSuggestion;
