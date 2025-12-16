/**
 * Slash Command Menu
 *
 * Notion-style "/" command menu for inserting blocks.
 * Appears when user types "/" and shows available commands.
 */

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import {
  TextHOne,
  TextHTwo,
  TextHThree,
  ListBullets,
  ListNumbers,
  ListChecks,
  Quotes,
  Minus,
  Table,
  BracketsCurly,
  TextT,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// Command item definition
interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any; range: any }) => void;
}

// Available commands
const getSuggestionItems = (): CommandItem[] => [
  {
    title: 'Text',
    description: 'Just start writing with plain text',
    icon: <TextT className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <TextHOne className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <TextHTwo className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <TextHThree className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <ListBullets className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListNumbers className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Track tasks with checkboxes',
    icon: <ListChecks className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: <Quotes className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Divider',
    description: 'Visually divide content',
    icon: <Minus className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: <Table className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'Variable',
    description: 'Insert a dynamic variable',
    icon: <BracketsCurly className="w-5 h-5" />,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Trigger variable inserter - this will be handled by toolbar
      const event = new CustomEvent('open-variable-inserter');
      window.dispatchEvent(event);
    },
  },
];

// Command list component
interface CommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(({ items, command }, ref) => {
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
      <div className="p-4 text-sm text-gray-500">
        No results found
      </div>
    );
  }

  return (
    <div className="slash-command-menu bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-80 overflow-y-auto w-72">
      <div className="p-2">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-2 py-1">
          Basic blocks
        </p>
        {items.map((item, index) => (
          <button
            key={item.title}
            onClick={() => selectItem(index)}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left transition-colors',
              selectedIndex === index
                ? 'bg-coral/10 text-coral'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
            )}
          >
            <div className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg',
              selectedIndex === index
                ? 'bg-coral/20'
                : 'bg-gray-100 dark:bg-gray-700'
            )}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

CommandList.displayName = 'CommandList';

// Create the slash command extension
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return getSuggestionItems().filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer<CommandListRef> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: SuggestionProps<CommandItem>) => {
              component = new ReactRenderer(CommandList, {
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

            onUpdate: (props: SuggestionProps<CommandItem>) => {
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

export default SlashCommand;
