/**
 * Editor Help Button
 *
 * Floating help button that opens a popover with editor tips.
 * Shows information about slash commands, variables, and shortcuts.
 */

import { useState } from 'react';
import { Question, X, Command, BracketsCurly, Keyboard, Lightning } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface HelpSection {
  icon: React.ReactNode;
  title: string;
  items: { label: string; description: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    icon: <Command className="w-4 h-4" />,
    title: 'Slash Commands',
    items: [
      { label: '/', description: 'Open command menu' },
      { label: '/h1, /h2, /h3', description: 'Insert headings' },
      { label: '/bullet, /number', description: 'Create lists' },
      { label: '/table', description: 'Insert table' },
      { label: '/quote', description: 'Add blockquote' },
      { label: '/divider', description: 'Insert horizontal line' },
    ],
  },
  {
    icon: <BracketsCurly className="w-4 h-4" />,
    title: 'Variables',
    items: [
      { label: '{ } button', description: 'Open variables panel' },
      { label: '{client.name}', description: 'Insert client name' },
      { label: '{project.name}', description: 'Insert project name' },
      { label: '{wallA.stc}', description: 'Product field (AI products)' },
    ],
  },
  {
    icon: <Keyboard className="w-4 h-4" />,
    title: 'Keyboard Shortcuts',
    items: [
      { label: '⌘ + B', description: 'Bold' },
      { label: '⌘ + I', description: 'Italic' },
      { label: '⌘ + U', description: 'Underline' },
      { label: '⌘ + Z', description: 'Undo' },
      { label: '⌘ + Shift + Z', description: 'Redo' },
    ],
  },
  {
    icon: <Lightning className="w-4 h-4" />,
    title: 'Quick Tips',
    items: [
      { label: 'Select text', description: 'Show formatting bubble' },
      { label: 'Drag edges', description: 'Resize table columns' },
      { label: 'Click variable', description: 'Select/delete it' },
    ],
  },
];

export function EditorHelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Help Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute bottom-14 left-0',
            'w-80 max-h-[70vh] overflow-y-auto',
            'bg-white dark:bg-gray-900 rounded-xl shadow-2xl',
            'border border-gray-200 dark:border-gray-700',
            'animate-in fade-in slide-in-from-bottom-2 duration-200'
          )}
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Editor Help
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Sections */}
          <div className="p-3 space-y-4">
            {HELP_SECTIONS.map((section, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-coral">{section.icon}</span>
                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    {section.title}
                  </h4>
                </div>
                <div className="space-y-1.5">
                  {section.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      className="flex items-start gap-2 text-xs"
                    >
                      <code className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded font-mono text-coral">
                        {item.label}
                      </code>
                      <span className="text-gray-600 dark:text-gray-400 pt-0.5">
                        {item.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-xs text-gray-500">
              Click outside or press Esc to close
            </p>
          </div>
        </div>
      )}

      {/* Help Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-10 h-10 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-200',
          isOpen
            ? 'bg-coral text-white scale-110'
            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-coral',
          'border border-gray-200 dark:border-gray-700'
        )}
        title="Editor Help"
      >
        <Question className="w-5 h-5" weight={isOpen ? 'fill' : 'regular'} />
      </button>
    </div>
  );
}

export default EditorHelpButton;
