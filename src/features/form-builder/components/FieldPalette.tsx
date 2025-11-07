/**
 * Field Palette
 * Left sidebar with draggable field types
 */

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import {
  TextT,
  Envelope,
  NumberSquareZero,
  Calendar,
  CaretCircleDown,
  CheckSquare,
  RadioButton,
  ToggleLeft,
  Phone,
  Link as LinkIcon,
  TextAlignLeft,
  Calculator,
  Package,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { FieldPaletteItem } from '../types/enhanced';

// Organized field palette by sections
const FIELD_SECTIONS = [
  {
    title: 'Text Elements',
    fields: [
      {
        type: 'short_text',
        label: 'Text Input',
        icon: TextT,
        category: 'text',
        defaultProps: {
          label: 'Text Field',
          field_type: 'input',
          input_type: 'text',
          required: false,
          placeholder: 'Enter text...',
          layout: { x: 0, y: 0, w: 6, h: 2 },
        },
      },
      {
        type: 'paragraph',
        label: 'Long Text',
        icon: TextAlignLeft,
        category: 'text',
        defaultProps: {
          label: 'Description',
          field_type: 'textarea',
          required: false,
          placeholder: 'Enter detailed text...',
          layout: { x: 0, y: 0, w: 12, h: 4 },
        },
      },
      {
        type: 'email',
        label: 'Email',
        icon: Envelope,
        category: 'text',
        defaultProps: {
          label: 'Email',
          field_type: 'input',
          input_type: 'email',
          required: false,
          placeholder: 'email@example.com',
          layout: { x: 0, y: 0, w: 6, h: 2 },
        },
      },
      {
        type: 'phone',
        label: 'Phone',
        icon: Phone,
        category: 'text',
        defaultProps: {
          label: 'Phone Number',
          field_type: 'input',
          input_type: 'tel',
          required: false,
          placeholder: '(555) 555-5555',
          layout: { x: 0, y: 0, w: 6, h: 2 },
        },
      },
      {
        type: 'url',
        label: 'URL',
        icon: LinkIcon,
        category: 'text',
        defaultProps: {
          label: 'Website',
          field_type: 'input',
          input_type: 'url',
          required: false,
          placeholder: 'https://example.com',
          layout: { x: 0, y: 0, w: 8, h: 2 },
        },
      },
      {
        type: 'number',
        label: 'Number',
        icon: NumberSquareZero,
        category: 'text',
        defaultProps: {
          label: 'Number',
          field_type: 'input',
          input_type: 'number',
          required: false,
          placeholder: '0',
          layout: { x: 0, y: 0, w: 4, h: 2 },
        },
      },
    ],
  },
  {
    title: 'Date Elements',
    fields: [
      {
        type: 'date',
        label: 'Date',
        icon: Calendar,
        category: 'date',
        defaultProps: {
          label: 'Date',
          field_type: 'date',
          required: false,
          layout: { x: 0, y: 0, w: 4, h: 2 },
        },
      },
    ],
  },
  {
    title: 'Selection Elements',
    fields: [
      {
        type: 'dropdown',
        label: 'Dropdown',
        icon: CaretCircleDown,
        category: 'selection',
        defaultProps: {
          label: 'Select Option',
          field_type: 'dropdown',
          required: false,
          options: ['Option 1', 'Option 2', 'Option 3'],
          layout: { x: 0, y: 0, w: 6, h: 2 },
        },
      },
      {
        type: 'checkbox',
        label: 'Multi-Select Checkbox',
        icon: CheckSquare,
        category: 'selection',
        defaultProps: {
          label: 'Select all that apply',
          field_type: 'checkbox',
          required: false,
          layout: { x: 0, y: 0, w: 6, h: 1 },
        },
      },
      {
        type: 'radio',
        label: 'Single Choice (Yes/No)',
        icon: RadioButton,
        category: 'selection',
        defaultProps: {
          label: 'Choose one option',
          field_type: 'radio',
          required: false,
          options: ['Yes', 'No'],
          layout: { x: 0, y: 0, w: 6, h: 2 },
        },
      },
      {
        type: 'toggle',
        label: 'Toggle',
        icon: ToggleLeft,
        category: 'selection',
        defaultProps: {
          label: 'Toggle',
          field_type: 'checkbox',
          required: false,
          layout: { x: 0, y: 0, w: 6, h: 1 },
        },
      },
    ],
  },
  {
    title: 'Advanced Elements',
    fields: [
      {
        type: 'calculated',
        label: 'Calculated Field',
        icon: Calculator,
        category: 'advanced',
        defaultProps: {
          label: 'Total',
          field_type: 'calculated',
          required: false,
          formula: '=0',
          layout: { x: 0, y: 0, w: 4, h: 2 },
        },
      },
      {
        type: 'custom_component',
        label: 'Custom Component',
        icon: Package,
        category: 'advanced',
        defaultProps: {
          label: 'Custom Field',
          field_type: 'input' as any,
          required: false,
          customComponent: { name: '' },
          layout: { x: 0, y: 0, w: 12, h: 4 },
        },
      },
    ],
  },
] as const;

interface DraggableFieldItemProps {
  item: FieldPaletteItem;
}

function DraggableFieldItem({ item }: DraggableFieldItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.type}`,
    data: item,
  });

  const Icon = item.icon;

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'border border-gray-300 dark:border-gray-600',
        'bg-white dark:bg-gray-800',
        'cursor-grab active:cursor-grabbing',
        'hover:border-blue-500 hover:shadow-md',
        'transition-all duration-200',
        isDragging && 'opacity-50 scale-95'
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {item.label}
      </span>
    </motion.div>
  );
}

interface FieldPaletteProps {
  className?: string;
}

export function FieldPalette({ className }: FieldPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sections and fields by search query
  const filteredSections = FIELD_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((field) =>
      field.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((section) => section.fields.length > 0);

  return (
    <div className={cn('flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Field Palette
        </h2>

        {/* Search */}
        <Input
          placeholder="Search fields..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Field List with Sections */}
      <ScrollArea className="flex-1 px-3 py-4">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No fields found
          </div>
        ) : (
          <div className="space-y-6 px-3">
            {filteredSections.map((section) => (
              <div key={section.title}>
                {/* Section Header */}
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
                  {section.title}
                </h3>
                {/* Section Fields */}
                <div className="space-y-2">
                  {section.fields.map((field) => (
                    <DraggableFieldItem key={field.type} item={field} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Hint */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Drag fields to the canvas to add them
        </p>
      </div>
    </div>
  );
}
