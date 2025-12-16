/**
 * Form Components
 * Left sidebar with draggable field types
 */

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import {
  TextT,
  Envelope,
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
  MapPin,
  File,
  Lock,
  Article,
  Rows,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { FormComponentsItem, EnhancedFormTab } from '../types/enhanced';

// Text-based icon components
const HashIcon = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center text-xl", className)}>#</div>
);

const DollarIcon = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center text-xl", className)}>$</div>
);

const PercentIcon = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center text-xl", className)}>%</div>
);

const DotIcon = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center text-xl", className)}>.</div>
);

// Organized field palette by sections
const FIELD_SECTIONS = [
   {
    title: 'Section Elements',
    fields: [
      {
        type: 'section',
        label: 'Section',
        icon: Rows,
        category: 'custom',
        defaultProps: {
          label: 'Section Title',
          field_type: 'section' as any,
          required: false,
          layout: { x: 0, y: 0, w: 6, h: 1, minH: 1 },
        },
      },
      {
        type: 'text_content',
        label: 'Text',
        icon: Article,
        category: 'custom',
        defaultProps: {
          label: '',
          field_type: 'text_content' as any,
          required: false,
          placeholder: 'Add descriptive text...',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
    ],
  },
  {
    title: 'Text Input Fields',
    fields: [
      {
        type: 'short_text',
        label: 'Text',
        icon: TextT,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'text',
          required: false,
          placeholder: 'Enter text',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'email',
        label: 'Email',
        icon: Envelope,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'email',
          required: false,
          placeholder: 'email@example.com',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'phone',
        label: 'Phone',
        icon: Phone,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'tel',
          required: false,
          placeholder: '(555) 123-4567',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'url',
        label: 'URL',
        icon: LinkIcon,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'url',
          required: false,
          placeholder: 'https://example.com',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'password',
        label: 'Password',
        icon: Lock,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'password',
          required: false,
          placeholder: 'Enter password',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'paragraph',
        label: 'Paragraph',
        icon: TextAlignLeft,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'textarea',
          required: false,
          placeholder: 'Enter detailed text...',
          layout: { x: 0, y: 0, w: 6, h: 4, minH: 4 },
        },
      },
    ],
  },
  {
    title: 'Number Fields',
    fields: [
      {
        type: 'number',
        label: 'Number',
        icon: HashIcon,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'number',
          number_format: 'integer',
          required: false,
          placeholder: '0',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'decimal',
        label: 'Decimal',
        icon: DotIcon,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'number',
          number_format: 'decimal',
          required: false,
          placeholder: '0.00',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'currency',
        label: 'Currency',
        icon: DollarIcon,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'number',
          number_format: 'currency',
          required: false,
          placeholder: '$0.00',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'percent',
        label: 'Percent',
        icon: PercentIcon,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'number',
          number_format: 'percent',
          required: false,
          placeholder: '0%',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
    ],
  },
  {
    title: 'Date and Location Fields',
    fields: [
      {
        type: 'date',
        label: 'Date Picker',
        icon: Calendar,
        category: 'date',
        defaultProps: {
          label: '',
          field_type: 'date',
          required: false,
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'address',
        label: 'Address',
        icon: MapPin,
        category: 'text',
        defaultProps: {
          label: '',
          field_type: 'input',
          input_type: 'address',
          required: false,
          placeholder: 'Search address...',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
    ],
  },
  {
    title: 'Choice Fields',
    fields: [
      {
        type: 'dropdown',
        label: 'Dropdown',
        icon: CaretCircleDown,
        category: 'selection',
        defaultProps: {
          label: '',
          field_type: 'dropdown',
          required: false,
          options: ['Option 1', 'Option 2', 'Option 3'],
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'radio',
        label: 'Radio (Single)',
        icon: RadioButton,
        category: 'selection',
        defaultProps: {
          label: '',
          field_type: 'radio',
          required: false,
          options: ['Yes', 'No'],
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'checkbox',
        label: 'Checkbox (Multi)',
        icon: CheckSquare,
        category: 'selection',
        defaultProps: {
          label: '',
          field_type: 'checkbox',
          required: false,
          layout: { x: 0, y: 0, w: 6, h: 1, minH: 1 },
        },
      },
      {
        type: 'toggle',
        label: 'Toggle',
        icon: ToggleLeft,
        category: 'selection',
        defaultProps: {
          label: '',
          field_type: 'checkbox',
          required: false,
          uiVariant: 'toggle',
          layout: { x: 0, y: 0, w: 6, h: 1, minH: 1 },
        },
      },
    ],
  },
  {
    title: 'Advanced',
    fields: [
      {
        type: 'math',
        label: 'Math Formula',
        icon: Calculator,
        category: 'advanced',
        defaultProps: {
          label: '',
          field_type: 'math',
          required: false,
          formula: '=0',
          layout: { x: 0, y: 0, w: 6, h: 2, minH: 2 },
        },
      },
      {
        type: 'custom_component',
        label: 'Custom Component',
        icon: Package,
        category: 'advanced',
        defaultProps: {
          label: '',
          field_type: 'input' as any,
          required: false,
          customComponent: { name: '' },
          layout: { x: 0, y: 0, w: 6, h: 4, minH: 4 },
        },
      },
    ],
  },
] as const;

interface DraggableFieldItemProps {
  item: FormComponentsItem;
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
        'group relative flex flex-col items-center gap-1.5 p-2 rounded-lg',
        'border border-gray-200 dark:border-gray-700',
        'bg-white dark:bg-gray-800',
        'cursor-grab active:cursor-grabbing',
        'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:shadow-sm',
        'transition-all duration-150 select-none',
        isDragging && 'opacity-50 scale-95'
      )}
      onClick={(e) => {
        // Prevent click behavior - drag only
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Icon className="w-5 h-5 text-gray-900 dark:text-gray-100" />
      <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">
        {item.label}
      </span>
    </motion.div>
  );
}

interface FormComponentsProps {
  className?: string;
  tabs?: EnhancedFormTab[];
  currentTab?: number;
  onSelectTab?: (index: number) => void;
}

export function FormComponents({ className, tabs = [], currentTab = 0, onSelectTab }: FormComponentsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<'components' | 'pages'>('components');

  // Filter sections and fields by search query
  const filteredSections = FIELD_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((field) =>
      field.label.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((section) => section.fields.length > 0);

  return (
    <div className={cn('flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800', className)}>
      {/* Tabs Header */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'components' | 'pages')} className="w-full">
          <TabsList className="w-full h-12 rounded-none bg-transparent border-0 p-0 relative">
            <TabsTrigger
              value="components"
              className="flex-1 rounded-none relative pb-3 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400 font-medium transition-colors duration-200 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-blue-600 after:transition-all after:duration-300 after:ease-out data-[state=active]:after:w-16 after:w-0"
            >
              Components
            </TabsTrigger>
            <TabsTrigger
              value="pages"
              className="flex-1 rounded-none relative pb-3 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400 font-medium transition-colors duration-200 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-blue-600 after:transition-all after:duration-300 after:ease-out data-[state=active]:after:w-12 after:w-0"
            >
              Pages
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Components View */}
      {activeView === 'components' && (
        <>
          {/* Search */}
          <div className="p-3">
            <Input
              placeholder="Search Elements"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Field List with Sections */}
          <ScrollArea className="flex-1 px-3 py-2">
            {filteredSections.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                No fields found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSections.map((section) => (
                  <div key={section.title}>
                    {/* Section Header */}
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                      {section.title}
                    </h3>
                    {/* Section Fields - 2 Column Grid */}
                    <div className="grid grid-cols-2 gap-2">
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
          <div className="p-3 border-t border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Drag fields to the canvas to add them
            </p>
          </div>
        </>
      )}

      {/* Pages View */}
      {activeView === 'pages' && (
        <>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-1.5">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  onClick={() => onSelectTab?.(index)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                    currentTab === index
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  whileHover={{ scale: currentTab === index ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <File className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tab.name}</p>
                    <p className={cn(
                      "text-xs truncate",
                      currentTab === index ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
                    )}>
                      {tab.fields.length} field{tab.fields.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
