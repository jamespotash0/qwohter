/**
 * Properties Panel
 * Right sidebar for configuring selected field properties
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  CaretDown,
  Check,
  Plus,
  Trash,
  Code,
  Palette,
  Function,
  ArrowsDownUp,
  BracketsCurly,
} from '@phosphor-icons/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { EnhancedFormField } from '../types/enhanced';
import { TemplateVariablePicker } from './TemplateVariablePicker';
import { InfoTooltip } from '@/components/ui/info-tooltip';

interface PropertiesPanelProps {
  selectedField: EnhancedFormField | null;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
  onClose: () => void;
  onDelete?: () => void; // Delete field
  allFields?: EnhancedFormField[]; // For dependency builder
  className?: string;
}

// Convert label to snake_case for field ID
const labelToFieldId = (label: string): string => {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

type SectionType = 'basic' | 'validation' | 'layout' | 'styling' | 'calculation' | 'dependency';

const SHADOW_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
] as const;

export function PropertiesPanel({
  selectedField,
  onUpdate,
  onClose,
  onDelete,
  allFields = [],
  className,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<'properties' | 'settings'>('properties');
  const [expandedSections, setExpandedSections] = useState<SectionType[]>([
    'basic',
    'validation',
  ]);

  const toggleSection = (section: SectionType) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const isSectionExpanded = (section: SectionType) => expandedSections.includes(section);

  // Auto-expand calculation section when math field is selected
  useEffect(() => {
    if (selectedField?.field_type === 'math' && !expandedSections.includes('calculation')) {
      setExpandedSections((prev) => [...prev, 'calculation']);
    }
  }, [selectedField?.field_type, expandedSections]);

  if (!selectedField) {
    return (
      <div className={cn('flex flex-col h-full w-full max-w-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800', className)}>
        <div className="flex items-center justify-center h-full p-8 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium">No field selected</p>
            <p className="text-xs mt-2">Select a field to configure its properties</p>
          </div>
        </div>
      </div>
    );
  }

  // Custom properties panel for text_content fields
  if (selectedField.type === 'text_content') {
    return (
      <motion.div
        className={cn('flex flex-col h-full w-full max-w-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800', className)}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-3 py-3 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Text Properties</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close properties panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Font Size */}
            <div className="space-y-2">
              <Label htmlFor="font-size">Font Size</Label>
              <Select
                value={selectedField.styling?.fontSize || '16px'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, fontSize: value }
                })}
              >
                <SelectTrigger id="font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12px">12px (Extra Small)</SelectItem>
                  <SelectItem value="14px">14px (Small)</SelectItem>
                  <SelectItem value="16px">16px (Medium)</SelectItem>
                  <SelectItem value="18px">18px (Large)</SelectItem>
                  <SelectItem value="20px">20px (Extra Large)</SelectItem>
                  <SelectItem value="24px">24px (2X Large)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <Label htmlFor="font-family">Font Family</Label>
              <Select
                value={selectedField.styling?.fontFamily || 'system-ui'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, fontFamily: value }
                })}
              >
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system-ui">System Default</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
                  <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                  <SelectItem value="'Trebuchet MS', sans-serif">Trebuchet MS</SelectItem>
                  <SelectItem value="'Comic Sans MS', cursive">Comic Sans MS</SelectItem>
                  <SelectItem value="Impact, sans-serif">Impact</SelectItem>
                  <SelectItem value="'Lucida Console', monospace">Lucida Console</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Weight */}
            <div className="space-y-2">
              <Label htmlFor="font-weight">Font Weight</Label>
              <Select
                value={selectedField.styling?.fontWeight || 'normal'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, fontWeight: value }
                })}
              >
                <SelectTrigger id="font-weight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="semibold">Semi Bold</SelectItem>
                  <SelectItem value="bold">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Font Style */}
            <div className="flex items-center justify-between">
              <Label htmlFor="italic">Italic</Label>
              <Switch
                id="italic"
                checked={selectedField.styling?.fontStyle === 'italic'}
                onCheckedChange={(checked) => onUpdate({
                  styling: { ...selectedField.styling, fontStyle: checked ? 'italic' : 'normal' }
                })}
              />
            </div>

            <Separator />

            {/* Text Alignment */}
            <div className="space-y-2">
              <Label htmlFor="text-align">Text Alignment</Label>
              <Select
                value={selectedField.styling?.textAlign || 'left'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, textAlign: value }
                })}
              >
                <SelectTrigger id="text-align">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="justify">Justify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Line Height */}
            <div className="space-y-2">
              <Label htmlFor="line-height">Line Height</Label>
              <Select
                value={selectedField.styling?.lineHeight || '1.5'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, lineHeight: value }
                })}
              >
                <SelectTrigger id="line-height">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tight (1.0)</SelectItem>
                  <SelectItem value="1.25">Snug (1.25)</SelectItem>
                  <SelectItem value="1.5">Normal (1.5)</SelectItem>
                  <SelectItem value="1.75">Relaxed (1.75)</SelectItem>
                  <SelectItem value="2">Loose (2.0)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Letter Spacing */}
            <div className="space-y-2">
              <Label htmlFor="letter-spacing">Letter Spacing</Label>
              <Select
                value={selectedField.styling?.letterSpacing || 'normal'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, letterSpacing: value }
                })}
              >
                <SelectTrigger id="letter-spacing">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-0.05em">Tighter</SelectItem>
                  <SelectItem value="-0.025em">Tight</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="0.025em">Wide</SelectItem>
                  <SelectItem value="0.05em">Wider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Text Color */}
            <div className="space-y-2">
              <Label htmlFor="text-color">Text Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="text-color"
                  value={selectedField.styling?.textColor || '#374151'}
                  onChange={(e) => onUpdate({
                    styling: { ...selectedField.styling, textColor: e.target.value }
                  })}
                  className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={selectedField.styling?.textColor || '#374151'}
                  onChange={(e) => onUpdate({
                    styling: { ...selectedField.styling, textColor: e.target.value }
                  })}
                  placeholder="#374151"
                  className="flex-1"
                />
              </div>
            </div>

            {/* Highlight Color */}
            <div className="space-y-2">
              <Label htmlFor="highlight-color">Highlight Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="highlight-color"
                  value={selectedField.styling?.highlightColor || '#ffffff'}
                  onChange={(e) => onUpdate({
                    styling: { ...selectedField.styling, highlightColor: e.target.value }
                  })}
                  className="w-12 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={selectedField.styling?.highlightColor || '#ffffff'}
                  onChange={(e) => onUpdate({
                    styling: { ...selectedField.styling, highlightColor: e.target.value }
                  })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
           
          </div>
        </ScrollArea>
      </motion.div>
    );
  }

  // Custom properties panel for section fields
  if (selectedField.type === 'section') {
    return (
      <motion.div
        className={cn('flex flex-col h-full w-full max-w-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800', className)}
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 px-3 py-3 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Section Properties</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Close properties panel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Section Title */}
            <div className="space-y-2">
              <Label htmlFor="section-title">Section Title</Label>
              <Input
                id="section-title"
                value={selectedField.label || ''}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Enter section title"
              />
            </div>

            {/* Section Description */}
            <div className="space-y-2">
              <Label htmlFor="section-description">Description</Label>
              <Textarea
                id="section-description"
                value={selectedField.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Add a description for this section..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Title Size */}
            <div className="space-y-2">
              <Label htmlFor="title-size">Title Size</Label>
              <Select
                value={selectedField.styling?.titleSize || 'lg'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, titleSize: value }
                })}
              >
                <SelectTrigger id="title-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                  <SelectItem value="xl">Extra Large</SelectItem>
                  <SelectItem value="2xl">2X Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description Size */}
            <div className="space-y-2">
              <Label htmlFor="description-size">Description Size</Label>
              <Select
                value={selectedField.styling?.descriptionSize || 'sm'}
                onValueChange={(value) => onUpdate({
                  styling: { ...selectedField.styling, descriptionSize: value }
                })}
              >
                <SelectTrigger id="description-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">Extra Small</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delete Button */}
          </div>
        </ScrollArea>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn('flex flex-col h-full w-full max-w-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800', className)}
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.div
        className="border-b border-gray-200 dark:border-gray-800"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {/* Top Bar with Close Button and System Field Badge */}
        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800">
          {selectedField.isSystemField ? (
            <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Protected</span>
            </div>
          ) : (
            <div></div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Close properties panel"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'properties' | 'settings')} className="w-full">
          <TabsList className="w-full h-10 rounded-none bg-transparent border-0 p-0 relative">
            <TabsTrigger
              value="properties"
              className="flex-1 rounded-none relative pb-3 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400 font-medium transition-colors duration-200 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-blue-600 after:transition-all after:duration-300 after:ease-out data-[state=active]:after:w-[70px] after:w-0"
            >
              Properties
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex-1 rounded-none relative pb-3 data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400 font-medium transition-colors duration-200 after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-0.5 after:bg-blue-600 after:transition-all after:duration-300 after:ease-out data-[state=active]:after:w-[55px] after:w-0"
            >
              Settings
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

      <ScrollArea className="flex-1 overflow-x-hidden">
        <div className="p-3 space-y-3 w-full max-w-full">
          {/* Properties Tab Content */}
          {activeTab === 'properties' && (
            <>
              {/* Basic Properties Section */}
              <Section
                title="Basic Properties"
                icon={Code}
                expanded={isSectionExpanded('basic')}
                onToggle={() => toggleSection('basic')}
              >
                <BasicPropertiesSection field={selectedField} onUpdate={onUpdate} />
              </Section>

              {/* Validation Section */}
              <Section
                title="Validation"
                icon={Check}
                expanded={isSectionExpanded('validation')}
                onToggle={() => toggleSection('validation')}
              >
                <ValidationSection field={selectedField} onUpdate={onUpdate} />
              </Section>

              {/* Calculation Section */}
              {selectedField.field_type === 'math' && (
                <Section
                  title="Math Formula"
                  icon={Function}
                  expanded={isSectionExpanded('calculation')}
                  onToggle={() => toggleSection('calculation')}
                >
                  <CalculationSection field={selectedField} onUpdate={onUpdate} allFields={allFields} />
                </Section>
              )}

              {/* Dependency Section */}
              <Section
                title="Dependencies"
                icon={ArrowsDownUp}
                expanded={isSectionExpanded('dependency')}
                onToggle={() => toggleSection('dependency')}
              >
                <DependencySection field={selectedField} onUpdate={onUpdate} allFields={allFields} />
              </Section>
            </>
          )}
        

          {/* Settings Tab Content */}
          {activeTab === 'settings' && (
            <>
              {/* Layout Section */}
              <Section
                title="Layout & Position"
                icon={ArrowsDownUp}
                expanded={isSectionExpanded('layout')}
                onToggle={() => toggleSection('layout')}
              >
                <LayoutSection field={selectedField} onUpdate={onUpdate} />
              </Section>

              {/* Styling Section */}
              <Section
                title="Styling"
                icon={Palette}
                expanded={isSectionExpanded('styling')}
                onToggle={() => toggleSection('styling')}
              >
                <StylingSection field={selectedField} onUpdate={onUpdate} />
              </Section>
            </>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// Section Component
interface SectionProps {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, expanded, onToggle, children }: SectionProps) {
  return (
    <motion.div
      className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden w-full max-w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        whileHover={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-2">
          <motion.div
            animate={{
              scale: expanded ? 1.1 : 1,
              color: expanded ? "rgb(59, 130, 246)" : "rgb(107, 114, 128)"
            }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="w-4 h-4" />
          </motion.div>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <CaretDown className="w-4 h-4 text-gray-500" />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: "easeInOut" },
                opacity: { duration: 0.2, delay: 0.1 }
              }
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.3, ease: "easeInOut" },
                opacity: { duration: 0.15 }
              }
            }}
            className="w-full max-w-full overflow-hidden"
          >
            <motion.div
              className="p-3 pt-0 space-y-3 w-full max-w-full"
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Basic Properties Section
function BasicPropertiesSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="field-id" className="text-xs">Field ID</Label>
        <Input
          id="field-id"
          value={field.id}
          onChange={(e) => onUpdate({ id: e.target.value })}
          className="h-8 text-sm bg-gray-50 dark:bg-gray-900"
          disabled
          title="Auto-generated from label"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-label" className="text-xs">Label</Label>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => {
            const newLabel = e.target.value;
            const newFieldId = labelToFieldId(newLabel);
            onUpdate({
              label: newLabel,
              id: newFieldId || field.id // Keep original ID if conversion results in empty string
            });
          }}
          className="h-8 text-sm"
          placeholder="Enter field label..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="field-type" className="text-xs">Field Type</Label>
        <Select
          value={field.field_type}
          onValueChange={(value) => onUpdate({ field_type: value as any })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="input">Input</SelectItem>
            <SelectItem value="textarea">Textarea</SelectItem>
            <SelectItem value="dropdown">Dropdown</SelectItem>
            <SelectItem value="checkbox">Checkbox</SelectItem>
            <SelectItem value="radio">Radio</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="math">Math</SelectItem>
            <SelectItem value="product_selector">Product Selector</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {field.field_type === 'input' && (
        <div className="space-y-2">
          <Label htmlFor="input-type" className="text-xs">Input Type</Label>
          <Select
            value={field.input_type || 'text'}
            onValueChange={(value) => onUpdate({ input_type: value as any })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="tel">Phone</SelectItem>
              <SelectItem value="url">URL</SelectItem>
              <SelectItem value="address">Address</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Number Format selector - appears when input type is number */}
      {field.field_type === 'input' && field.input_type === 'number' && (
        <div className="space-y-2">
          <Label htmlFor="number-format" className="text-xs">Number Format</Label>
          <Select
            value={field.number_format || 'decimal'}
            onValueChange={(value) => onUpdate({ number_format: value as any })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="integer">Integer (#)</SelectItem>
              <SelectItem value="decimal">Decimal (.)</SelectItem>
              <SelectItem value="currency">Currency ($)</SelectItem>
              <SelectItem value="percent">Percent (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Number Format selector for math fields */}
      {field.field_type === 'math' && (
        <div className="space-y-2">
          <Label htmlFor="number-format" className="text-xs">Display Format</Label>
          <Select
            value={field.number_format || 'decimal'}
            onValueChange={(value) => onUpdate({ number_format: value as any })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="integer">Integer (#)</SelectItem>
              <SelectItem value="decimal">Decimal (.)</SelectItem>
              <SelectItem value="currency">Currency ($)</SelectItem>
              <SelectItem value="percent">Percent (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* UI Variant selector for checkbox fields */}
      {field.field_type === 'checkbox' && (
        <div className="space-y-2">
          <Label htmlFor="ui-variant" className="text-xs">Display Style</Label>
          <Select
            value={field.uiVariant || 'default'}
            onValueChange={(value) => onUpdate({ uiVariant: value as 'default' | 'toggle' })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Standard Checkbox (Multi-select)</SelectItem>
              <SelectItem value="toggle">Toggle Switch (On/Off)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dropdown Options Editor - moved right after field type */}
      {field.field_type === 'dropdown' && (
        <div className="space-y-2">
          <Label className="text-xs">Dropdown Options</Label>
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[index] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 text-sm flex-1"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOptions = (field.options || []).filter((_, i) => i !== index);
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const newOptions = [...(field.options || []), ''];
                onUpdate({ options: newOptions });
              }}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {/* Checkbox Options Editor - only for standard checkboxes, not toggles */}
      {field.field_type === 'checkbox' && field.uiVariant !== 'toggle' && (
        <div className="space-y-2">
          <Label className="text-xs">Checkbox Options</Label>
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[index] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 text-sm flex-1"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOptions = (field.options || []).filter((_, i) => i !== index);
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const newOptions = [...(field.options || []), ''];
                onUpdate({ options: newOptions });
              }}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {/* Radio Button Options Editor */}
      {field.field_type === 'radio' && (
        <div className="space-y-2">
          <Label className="text-xs">Radio Button Options</Label>
          <div className="space-y-2">
            {(field.options || []).map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(field.options || [])];
                    newOptions[index] = e.target.value;
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 text-sm flex-1"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const newOptions = (field.options || []).filter((_, i) => i !== index);
                    onUpdate({ options: newOptions });
                  }}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                const newOptions = [...(field.options || []), ''];
                onUpdate({ options: newOptions });
              }}
              className="w-full h-8 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      {/* Placeholder - hide for checkbox and radio */}
      {field.field_type !== 'checkbox' && field.field_type !== 'radio' && (
        <div className="space-y-2">
          <Label htmlFor="placeholder" className="text-xs">Placeholder</Label>
          {field.field_type === 'textarea' || field.type === 'text_content' ? (
            <Textarea
              id="placeholder"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="e.g., Add descriptive text..."
              className="min-h-[80px] text-sm"
            />
          ) : (
            <Input
              id="placeholder"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="e.g., Enter text here..."
              className="h-8 text-sm"
            />
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="description" className="text-xs">Description</Label>
        <Textarea
          id="description"
          value={field.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          className="min-h-[60px] text-sm"
          placeholder="Optional field description"
        />
      </div>

      {/* Default Value Toggle */}
      {field.field_type !== 'checkbox' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="use-default-value" className="text-xs">Use Default Value</Label>
            <Switch
              id="use-default-value"
              checked={field.default_value !== undefined}
              onCheckedChange={(checked) => {
                if (!checked) {
                  onUpdate({
                    default_value: undefined,
                    supportsTemplateVariables: false,
                    skipValidationForDefault: false
                  });
                } else {
                  // Auto-enable template variables and skip validation
                  onUpdate({
                    default_value: '',
                    supportsTemplateVariables: true,
                    skipValidationForDefault: true
                  });
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Default Value - show for non-dropdown/non-radio/non-date fields */}
      {field.field_type !== 'dropdown' && field.field_type !== 'checkbox' && field.field_type !== 'radio' && field.field_type !== 'date' && field.default_value !== undefined && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="default-value" className="text-xs">Default Value</Label>
            <InfoTooltip content={
              <div>
                <strong>Template Variables Supported</strong><br />
                • Use {`{{organizationName}}`} for database values<br />
                • Validation is automatically skipped<br />
                • Insert variables using the picker below
              </div>
            } />
          </div>
          {field.field_type === 'input' && field.input_type === 'tel' ? (
            <Input
              id="default-value"
              value={field.default_value || ''}
              onChange={(e) => {
                const value = e.target.value;
                // Allow up to 18 characters for international formats (+XXX-XXX-XXX-XXXX)
                if (value.length <= 18) {
                  onUpdate({ default_value: value });
                }
              }}
              className="h-8 text-sm font-mono"
              placeholder="e.g., (555) 123-4567 or +1-555-123-4567"
              maxLength={18}
            />
          ) : field.field_type === 'textarea' || field.type === 'text_content' ? (
            <Textarea
              id="default-value"
              value={field.default_value || ''}
              onChange={(e) => onUpdate({ default_value: e.target.value })}
              className="min-h-[80px] text-sm font-mono"
              placeholder="Enter text or use template variables like {{organizationName}}"
            />
          ) : (
            <Input
              id="default-value"
              value={field.default_value || ''}
              onChange={(e) => onUpdate({ default_value: e.target.value })}
              className="h-8 text-sm font-mono"
              placeholder="e.g., {{organizationName}}"
              type={field.field_type === 'input' ? field.input_type : 'text'}
            />
          )}

          {/* Template Variables Detected Indicator */}
          {field.default_value && /\{\{[^}]+\}\}/.test(field.default_value) && (
            <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-md">
              <BracketsCurly className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Template variables detected: {field.default_value.match(/\{\{[^}]+\}\}/g)?.join(', ')}
              </p>
            </div>
          )}

          {/* Template Variable Picker */}
          <TemplateVariablePicker
            onInsert={(variable) => {
              const currentValue = field.default_value || '';
              // For textarea and text_content, append; for input, replace
              const newValue = field.field_type === 'textarea' || field.type === 'text_content'
                ? currentValue + (currentValue ? ' ' : '') + variable
                : variable;
              onUpdate({ default_value: newValue });
            }}
          />
        </div>
      )}

      {/* Default Value for Date - with current date option */}
      {field.field_type === 'date' && field.default_value !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="default-value" className="text-xs">Default Value</Label>
          <div className="flex items-center gap-2">
            <Switch
              id="use-current-date"
              checked={field.default_value === '{{CURRENT_DATE}}'}
              onCheckedChange={(checked) => {
                if (checked) {
                  onUpdate({ default_value: '{{CURRENT_DATE}}' });
                } else {
                  onUpdate({ default_value: '' });
                }
              }}
            />
            <Label htmlFor="use-current-date" className="text-xs cursor-pointer">
              Use Current Date
            </Label>
          </div>
          {field.default_value !== '{{CURRENT_DATE}}' && (
            <Input
              id="default-value"
              value={field.default_value || ''}
              onChange={(e) => onUpdate({ default_value: e.target.value })}
              className="h-8 text-sm"
              placeholder="YYYY-MM-DD"
              type="date"
            />
          )}
          {field.default_value === '{{CURRENT_DATE}}' && (
            <p className="text-xs text-gray-500">
              Forms will automatically populate with today's date
            </p>
          )}
        </div>
      )}

      {/* Default Value for Dropdown - as dropdown selector */}
      {field.field_type === 'dropdown' && field.default_value !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="default-value" className="text-xs">Default Selection</Label>
          <Select
            value={field.default_value || '__none__'}
            onValueChange={(value) => onUpdate({ default_value: value === '__none__' ? undefined : value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select default option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {(field.options || [])
                .filter(option => option && option.trim() !== '') // Filter out empty options
                .map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Default Value for Radio Button - as dropdown selector */}
      {field.field_type === 'radio' && field.default_value !== undefined && (
        <div className="space-y-2">
          <Label htmlFor="default-value" className="text-xs">Default Selection</Label>
          <Select
            value={field.default_value || '__none__'}
            onValueChange={(value) => onUpdate({ default_value: value === '__none__' ? undefined : value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select default option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {(field.options || [])
                .filter(option => option && option.trim() !== '') // Filter out empty options
                .map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Default Value for Checkbox/Toggle */}
      {field.field_type === 'checkbox' && (
        <div className="flex items-center justify-between">
          <Label htmlFor="default-checked" className="text-xs">
            {field.uiVariant === 'toggle' ? 'Default State (On)' : 'Default Checked'}
          </Label>
          <Switch
            id="default-checked"
            checked={field.default_value === true}
            onCheckedChange={(checked) => onUpdate({ default_value: checked })}
          />
        </div>
      )}
    </>
  );
}

// Validation Section
function ValidationSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  // Determine which validation rules apply based on field type
  const inputType = field.input_type;
  const fieldType = field.field_type;
  const numberFormat = field.number_format;

  // Categorize field types for validation
  const isTextInput = fieldType === 'input' &&
    (inputType === 'text' || inputType === 'email' || inputType === 'tel' || !inputType);
  const isTextarea = fieldType === 'textarea';
  const isNumberInput = fieldType === 'input' && inputType === 'number';
  const isUrlInput = fieldType === 'input' && inputType === 'url';
  const isAddressInput = fieldType === 'input' && inputType === 'address';

  // Show appropriate validation sections
  const showLengthValidation = isTextInput || isTextarea || isUrlInput || isAddressInput;
  const showNumberValidation = isNumberInput;
  const showContainsValidation = isTextInput || isTextarea || isUrlInput || isAddressInput;

  // Robust number parsing that handles empty strings
  const parseNumberInput = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? undefined : parsed;
  };

  return (
    <>
      {/* Required Field - available for all field types */}
      <div className="flex items-center justify-between">
        <Label htmlFor="required" className="text-xs">Required Field</Label>
        <Switch
          id="required"
          checked={field.required}
          onCheckedChange={(checked) => onUpdate({ required: checked })}
        />
      </div>

      {/* Length validation - for text, textarea, URL, and address inputs */}
      {showLengthValidation && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="min-length" className="text-xs">Min Length</Label>
            <Input
              id="min-length"
              type="text"
              inputMode="numeric"
              value={field.minLength !== undefined ? String(field.minLength) : ''}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow digits
                if (value === '' || /^\d+$/.test(value)) {
                  onUpdate({ minLength: parseNumberInput(value) });
                }
              }}
              className="h-8 text-sm"
              placeholder="Min chars"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-length" className="text-xs">Max Length</Label>
            <Input
              id="max-length"
              type="text"
              inputMode="numeric"
              value={field.maxLength !== undefined ? String(field.maxLength) : ''}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow digits
                if (value === '' || /^\d+$/.test(value)) {
                  onUpdate({ maxLength: parseNumberInput(value) });
                }
              }}
              className="h-8 text-sm"
              placeholder="Max chars"
            />
          </div>
        </div>
      )}

      {/* Number validation - only for number inputs */}
      {showNumberValidation && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="min-value" className="text-xs">Min Value</Label>
            <Input
              id="min-value"
              type="text"
              inputMode="numeric"
              value={field.minLength !== undefined ? String(field.minLength) : ''}
              onChange={(e) => {
                const value = e.target.value;
                // Allow digits and optional minus sign at the start
                if (value === '' || /^-?\d*$/.test(value)) {
                  onUpdate({ minLength: parseNumberInput(value) });
                }
              }}
              className="h-8 text-sm"
              placeholder="Minimum"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max-value" className="text-xs">Max Value</Label>
            <Input
              id="max-value"
              type="text"
              inputMode="numeric"
              value={field.maxLength !== undefined ? String(field.maxLength) : ''}
              onChange={(e) => {
                const value = e.target.value;
                // Allow digits and optional minus sign at the start
                if (value === '' || /^-?\d*$/.test(value)) {
                  onUpdate({ maxLength: parseNumberInput(value) });
                }
              }}
              className="h-8 text-sm"
              placeholder="Maximum"
            />
          </div>
        </div>
      )}

      {/* Contains validation - for text-based inputs */}
      {showContainsValidation && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="contains" className="text-xs">Contains</Label>
            <InfoTooltip content={
              <div>
                {isUrlInput ? (
                  <>
                    <strong>URL Validation:</strong><br />
                    • Single value: "https://"<br />
                    • Multiple checks: "https://, .com, .org"<br />
                    • Input must contain at least one<br />
                    • Browser validates URL format
                  </>
                ) : isAddressInput ? (
                  <>
                    <strong>Address Validation:</strong><br />
                    • Single value: "USA"<br />
                    • Multiple checks: "USA, Canada, Mexico"<br />
                    • Input must contain at least one<br />
                    • Mapbox autocompletes addresses
                  </>
                ) : (
                  <>
                    • Single value: "required text"<br />
                    • Multiple checks: "text1, text2, text3"<br />
                    • Input must contain at least one
                  </>
                )}
              </div>
            } />
          </div>
          <Input
            id="contains"
            type="text"
            value={field.contains || ''}
            onChange={(e) => onUpdate({ contains: e.target.value || undefined })}
            className="h-8 text-sm"
            placeholder={
              isUrlInput ? 'e.g., https://, .com, .org' :
              isAddressInput ? 'e.g., USA, United States, CA' :
              'e.g., value1, value2, value3'
            }
          />
        </div>
      )}

      {/* Help text - available for all field types */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="help-text" className="text-xs">Help Text</Label>
          <InfoTooltip content="Instructional text displayed below the field (always visible)" />
        </div>
        <Input
          id="help-text"
          value={field.helpText || ''}
          onChange={(e) => onUpdate({ helpText: e.target.value })}
          className="h-8 text-sm"
          placeholder="Helper text shown below field"
        />
      </div>

      {/* Error message - available for all field types */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="error-message" className="text-xs">Error Message</Label>
          <InfoTooltip content="Error message shown in red when validation fails" />
        </div>
        <Input
          id="error-message"
          value={field.errorMessage || ''}
          onChange={(e) => onUpdate({ errorMessage: e.target.value })}
          className="h-8 text-sm"
          placeholder="Custom error message for validation"
        />
      </div>
    </>
  );
}

// Layout Section
function LayoutSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  const layout = field.layout || { x: 0, y: 0, w: 6, h: 2 };

  // Calculate approximate dimensions
  // Grid: 12 columns, rowHeight 50px, column width ~115px (1376px / 12)
  const approximateHeight = layout.h * 50;
  const gridUnitsWidth = layout.w;

  return (
    <>
      {/* Dimension Display */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">Actual Size</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Width:</span>
            <div className="text-blue-900 dark:text-blue-100 font-mono mt-0.5">
              {gridUnitsWidth} units
              <span className="text-blue-500 dark:text-blue-400 text-[10px] ml-1">({gridUnitsWidth}/12 cols)</span>
            </div>
          </div>
          <div>
            <span className="text-blue-600 dark:text-blue-400 font-medium">Height:</span>
            <div className="text-blue-900 dark:text-blue-100 font-mono mt-0.5">
              ~{approximateHeight}px
              <span className="text-blue-500 dark:text-blue-400 text-[10px] ml-1">({layout.h} rows)</span>
            </div>
          </div>
        </div>
        <div className="mt-2 text-[10px] text-blue-600 dark:text-blue-400">
          Drag resize handles to adjust size
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="static-position" className="text-xs">Lock Position</Label>
        <Switch
          id="static-position"
          checked={layout.static || false}
          onCheckedChange={(checked) =>
            onUpdate({ layout: { ...layout, static: checked } })
          }
        />
      </div>
    </>
  );
}

// Styling Section
function StylingSection({
  field,
  onUpdate,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}) {
  const styling = field.styling || {};

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="bg-color" className="text-xs">Background Color</Label>
        <div className="flex gap-2">
          <Input
            id="bg-color"
            type="color"
            value={styling.backgroundColor || '#ffffff'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, backgroundColor: e.target.value } })
            }
            className="h-8 w-12 p-1"
          />
          <Input
            value={styling.backgroundColor || '#ffffff'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, backgroundColor: e.target.value } })
            }
            className="h-8 flex-1 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="border-color" className="text-xs">Border Color</Label>
        <div className="flex gap-2">
          <Input
            id="border-color"
            type="color"
            value={styling.borderColor || '#e5e7eb'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, borderColor: e.target.value } })
            }
            className="h-8 w-12 p-1"
          />
          <Input
            value={styling.borderColor || '#e5e7eb'}
            onChange={(e) =>
              onUpdate({ styling: { ...styling, borderColor: e.target.value } })
            }
            className="h-8 flex-1 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="border-radius" className="text-xs">Border Radius</Label>
        <Input
          id="border-radius"
          type="text"
          inputMode="numeric"
          value={styling.borderRadius !== undefined ? String(styling.borderRadius) : ''}
          onChange={(e) => {
            const value = e.target.value;
            // Allow empty or digits only
            if (value === '' || /^\d+$/.test(value)) {
              if (value === '') {
                // Allow empty during editing
                onUpdate({ styling: { ...styling, borderRadius: undefined } });
              } else {
                const numValue = parseInt(value);
                if (numValue >= 0) {
                  onUpdate({ styling: { ...styling, borderRadius: numValue } });
                }
              }
            }
          }}
          onBlur={(e) => {
            // On blur, ensure we have a valid value (default to 4 if empty)
            if (e.target.value === '' || styling.borderRadius === undefined) {
              onUpdate({ styling: { ...styling, borderRadius: 4 } });
            }
          }}
          className="h-8 text-sm"
          placeholder="4"
        />
      </div>

      {/* Input Height - Only show for non-textarea fields */}
      {field.field_type !== 'textarea' && field.type !== 'section' && field.type !== 'text_content' && (
        <div className="space-y-2">
          <Label htmlFor="input-height" className="text-xs">Input Height (px)</Label>
          <Select
            value={String(styling.inputHeight || 36)}
            onValueChange={(value) => {
              onUpdate({ styling: { ...styling, inputHeight: parseInt(value) } });
            }}
          >
            <SelectTrigger id="input-height" className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="28">28px (Extra Small)</SelectItem>
              <SelectItem value="32">32px (Small)</SelectItem>
              <SelectItem value="36">36px (Default)</SelectItem>
              <SelectItem value="40">40px (Medium)</SelectItem>
              <SelectItem value="44">44px (Large)</SelectItem>
              <SelectItem value="48">48px (Extra Large)</SelectItem>
              <SelectItem value="54">54px (XXL)</SelectItem>
              <SelectItem value="60">60px (Huge)</SelectItem>
              <SelectItem value="72">72px (Massive)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="shadow" className="text-xs">Shadow</Label>
        <Select
          value={styling.shadow || 'none'}
          onValueChange={(value) =>
            onUpdate({ styling: { ...styling, shadow: value as any } })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHADOW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

// Calculation Section
function CalculationSection({
  field,
  onUpdate,
  allFields,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
  allFields: EnhancedFormField[];
}) {
  // Mathematical operation buttons
  const operations = [
    { label: '+', value: ' + ', title: 'Add' },
    { label: '−', value: ' - ', title: 'Subtract' },
    { label: '×', value: ' * ', title: 'Multiply' },
    { label: '÷', value: ' / ', title: 'Divide' },
    { label: '(', value: '(', title: 'Open Parenthesis' },
    { label: ')', value: ')', title: 'Close Parenthesis' },
  ];

  const insertIntoFormula = (text: string) => {
    const currentFormula = field.formula || '';
    onUpdate({ formula: currentFormula + text });
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="formula" className="text-xs">Formula</Label>
          <InfoTooltip content="Use field IDs to reference other fields. Example: =price * quantity" />
        </div>
        <Textarea
          id="formula"
          value={field.formula || ''}
          onChange={(e) => onUpdate({ formula: e.target.value })}
          className="min-h-[100px] font-mono text-sm"
          placeholder="=field1 + field2 * 1.5"
        />
      </div>

      {/* Mathematical Operations */}
      <div className="space-y-2">
        <Label className="text-xs">Mathematical Operations</Label>
        <div className="grid grid-cols-6 gap-1.5">
          {operations.map((op) => (
            <Button
              key={op.value}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-sm font-semibold min-w-0 px-2"
              onClick={() => insertIntoFormula(op.value)}
              title={op.title}
            >
              {op.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Available Fields */}
      <div className="space-y-2">
        <Label className="text-xs">Available Fields</Label>
        <div className="max-h-48 overflow-y-auto overflow-x-hidden border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1">
          {allFields
            .filter((f) => f.id !== field.id)
            .map((f) => {
              // Determine field type badge
              let fieldTypeBadge = 'text';
              let badgeColor = 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';

              if (f.field_type === 'math') {
                fieldTypeBadge = 'math';
                badgeColor = 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300';
              } else if (f.field_type === 'input' && f.input_type === 'number') {
                fieldTypeBadge = f.number_format || 'number';
                badgeColor = 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
              } else if (f.field_type === 'input') {
                fieldTypeBadge = f.input_type || 'text';
                badgeColor = 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
              } else if (f.field_type === 'textarea') {
                fieldTypeBadge = 'textarea';
                badgeColor = 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
              } else if (f.field_type === 'dropdown' || f.field_type === 'radio' || f.field_type === 'checkbox') {
                fieldTypeBadge = f.field_type;
                badgeColor = 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300';
              } else if (f.field_type === 'date') {
                fieldTypeBadge = 'date';
                badgeColor = 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300';
              }

              return (
                <div
                  key={f.id}
                  className="text-xs font-mono text-gray-700 dark:text-gray-300 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer flex items-center gap-2 min-w-0"
                  onClick={() => insertIntoFormula(f.id)}
                >
                  <span className="truncate flex-1 min-w-0">{f.id} ({f.label})</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${badgeColor}`}>
                    {fieldTypeBadge}
                  </span>
                </div>
              );
            })}
          {allFields.filter((f) => f.id !== field.id).length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              No other fields available
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// Dependency Section
function DependencySection({
  field,
  onUpdate,
  allFields,
}: {
  field: EnhancedFormField;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
  allFields: EnhancedFormField[];
}) {
  const dependencies = field.dependencies || [];

  const addDependency = () => {
    onUpdate({
      dependencies: [
        ...dependencies,
        {
          fieldId: '',
          condition: 'equals',
          value: '',
          action: 'show',
        },
      ],
    });
  };

  const removeDependency = (index: number) => {
    onUpdate({
      dependencies: dependencies.filter((_, i) => i !== index),
    });
  };

  const updateDependency = (index: number, updates: any) => {
    const newDeps = [...dependencies];
    newDeps[index] = { ...newDeps[index], ...updates };
    onUpdate({ dependencies: newDeps });
  };

  // Get available conditions based on field type
  const getAvailableConditions = (fieldId: string) => {
    const targetField = allFields.find(f => f.id === fieldId);
    if (!targetField) {
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
      ];
    }

    const isNumeric = (targetField.field_type === 'input' && targetField.input_type === 'number') ||
      targetField.field_type === 'math';
    const isText = targetField.field_type === 'input' &&
      (targetField.input_type === 'text' || targetField.input_type === 'email' || targetField.input_type === 'tel');
    const isBoolean = targetField.field_type === 'checkbox' || targetField.field_type === 'radio';

    const conditions = [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
    ];

    if (isNumeric) {
      conditions.push(
        { value: 'greater_than', label: 'Greater Than' },
        { value: 'less_than', label: 'Less Than' },
        { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
        { value: 'less_than_or_equal', label: 'Less Than or Equal' },
      );
    }

    if (isText || targetField.field_type === 'textarea') {
      conditions.push(
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does Not Contain' },
        { value: 'starts_with', label: 'Starts With' },
        { value: 'ends_with', label: 'Ends With' },
        { value: 'is_empty', label: 'Is Empty' },
        { value: 'is_not_empty', label: 'Is Not Empty' },
      );
    }

    if (isBoolean) {
      conditions.push(
        { value: 'is_checked', label: 'Is Checked' },
        { value: 'is_unchecked', label: 'Is Unchecked' },
      );
    }

    return conditions;
  };

  // Check for circular dependencies
  const hasCircularDependency = (targetFieldId: string): boolean => {
    const visited = new Set<string>();
    const checkCircular = (currentId: string): boolean => {
      if (visited.has(currentId)) return true;
      if (currentId === field.id) return true;

      visited.add(currentId);
      const currentField = allFields.find(f => f.id === currentId);
      if (!currentField?.dependencies) return false;

      for (const dep of currentField.dependencies) {
        if (checkCircular(dep.fieldId)) return true;
      }

      return false;
    };

    return checkCircular(targetFieldId);
  };

  // Get fields that depend on this field (reverse dependencies)
  const reverseDependencies = allFields.filter(f =>
    f.dependencies?.some(dep => dep.fieldId === field.id)
  );

  return (
    <>
      {/* Reverse Dependencies Info */}
      {reverseDependencies.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-2">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
            Fields depending on this field:
          </p>
          <div className="space-y-0.5">
            {reverseDependencies.map(f => (
              <div key={f.id} className="text-xs text-blue-700 dark:text-blue-300">
                • {f.label} ({f.id})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dependencies List */}
      <div className="space-y-2">
        {dependencies.map((dep, index) => {
          const targetField = allFields.find(f => f.id === dep.fieldId);
          const hasCircular = dep.fieldId ? hasCircularDependency(dep.fieldId) : false;
          const availableConditions = getAvailableConditions(dep.fieldId);

          return (
            <div
              key={index}
              className={cn(
                "border rounded-md p-2 space-y-2",
                hasCircular
                  ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950"
                  : "border-gray-200 dark:border-gray-700"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Rule {index + 1}
                  {targetField && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                      {targetField.field_type}{targetField.input_type ? `:${targetField.input_type}` : ''}
                    </span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDependency(index)}
                  className="h-6 w-6"
                >
                  <Trash className="w-3 h-3" />
                </Button>
              </div>

              {hasCircular && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded">
                  ⚠ Warning: Circular dependency detected
                </div>
              )}

              {/* When - Field Selector */}
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">WHEN</Label>
                <Select
                  value={dep.fieldId}
                  onValueChange={(value) => updateDependency(index, { fieldId: value })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFields
                      .filter((f) => f.id !== field.id)
                      .map((f) => {
                        const wouldBeCircular = hasCircularDependency(f.id);
                        return (
                          <SelectItem
                            key={f.id}
                            value={f.id}
                            disabled={wouldBeCircular}
                          >
                            {f.label} {wouldBeCircular && '⚠ (circular)'}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>

              {/* Condition Selector */}
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">IS</Label>
                <Select
                  value={dep.condition}
                  onValueChange={(value) => updateDependency(index, { condition: value })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConditions.map(cond => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Value Input (hide for is_empty, is_not_empty, is_checked, is_unchecked) */}
              {!['is_empty', 'is_not_empty', 'is_checked', 'is_unchecked'].includes(dep.condition) && (
                <div className="space-y-1">
                  <Label className="text-[10px] text-gray-500">VALUE</Label>
                  {targetField?.field_type === 'dropdown' || targetField?.field_type === 'radio' ? (
                    <Select
                      value={dep.value}
                      onValueChange={(value) => updateDependency(index, { value })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Select value" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetField.options?.map((opt: any) => (
                          <SelectItem key={opt} value={opt.toString()}>
                            {opt.toString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={dep.value}
                      onChange={(e) => updateDependency(index, { value: e.target.value })}
                      className="h-7 text-xs"
                      placeholder={
                        targetField?.input_type === 'number' || targetField?.field_type === 'math'
                          ? (targetField?.number_format === 'currency' ? '$0.00' :
                             targetField?.number_format === 'percent' ? '0%' : '0')
                          : 'Enter value'
                      }
                      type={
                        targetField?.input_type === 'number' || targetField?.field_type === 'math'
                          ? 'number'
                          : 'text'
                      }
                    />
                  )}
                </div>
              )}

              {/* Action Selector */}
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-500">THEN</Label>
                <Select
                  value={dep.action}
                  onValueChange={(value) => updateDependency(index, { action: value })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show">Show This Field</SelectItem>
                    <SelectItem value="hide">Hide This Field</SelectItem>
                    <SelectItem value="enable">Enable This Field</SelectItem>
                    <SelectItem value="disable">Disable This Field</SelectItem>
                    <SelectItem value="require">Make Required</SelectItem>
                    <SelectItem value="optional">Make Optional</SelectItem>
                    <SelectItem value="calculate">Trigger Calculation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        })}

        {dependencies.length === 0 && (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs">
            No dependencies configured
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addDependency}
        className="w-full h-8 text-xs"
      >
        <Plus className="w-3 h-3 mr-1" />
        Add Dependency Rule
      </Button>

      {/* Dependency Summary */}
      {dependencies.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-2">
          <p className="text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
            DEPENDENCY LOGIC
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            This field will be affected when {dependencies.length === 1 ? 'this condition is' : 'ANY of these conditions are'} met:
          </p>
          {dependencies.map((dep, i) => {
            const targetField = allFields.find(f => f.id === dep.fieldId);
            return (
              <div key={i} className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                • {targetField?.label || 'Field'} {dep.condition.replace(/_/g, ' ')} {dep.value || '...'} → {dep.action}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
