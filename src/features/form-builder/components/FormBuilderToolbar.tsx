import { FieldType } from '../types';
import {
  Type,
  AlignLeft,
  Mail,
  Hash,
  DollarSign,
  Phone,
  Calendar,
  Clock,
  ChevronDown,
  CheckSquare,
  Circle,
  ToggleLeft,
  FileUp,
  Link as LinkIcon,
  Palette,
  Star,
  Sliders,
  Layers
} from 'lucide-react';

interface FieldTypeConfig {
  type: FieldType;
  label: string;
  icon: React.ElementType;
  color: string;
  category: 'basic' | 'advanced' | 'special';
}

const FIELD_TYPES: FieldTypeConfig[] = [
  // Basic
  { type: 'text', label: 'Text', icon: Type, color: 'blue', category: 'basic' },
  { type: 'textarea', label: 'Text Area', icon: AlignLeft, color: 'blue', category: 'basic' },
  { type: 'email', label: 'Email', icon: Mail, color: 'blue', category: 'basic' },
  { type: 'number', label: 'Number', icon: Hash, color: 'green', category: 'basic' },
  { type: 'currency', label: 'Currency', icon: DollarSign, color: 'green', category: 'basic' },
  { type: 'phone', label: 'Phone', icon: Phone, color: 'blue', category: 'basic' },
  { type: 'date', label: 'Date', icon: Calendar, color: 'purple', category: 'basic' },
  { type: 'time', label: 'Time', icon: Clock, color: 'purple', category: 'basic' },
  { type: 'datetime', label: 'Date & Time', icon: Calendar, color: 'purple', category: 'basic' },

  // Advanced
  { type: 'dropdown', label: 'Dropdown', icon: ChevronDown, color: 'indigo', category: 'advanced' },
  { type: 'multi-select', label: 'Multi Select', icon: CheckSquare, color: 'indigo', category: 'advanced' },
  { type: 'radio', label: 'Radio', icon: Circle, color: 'indigo', category: 'advanced' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, color: 'indigo', category: 'advanced' },
  { type: 'switch', label: 'Switch', icon: ToggleLeft, color: 'indigo', category: 'advanced' },

  // Special
  { type: 'file', label: 'File Upload', icon: FileUp, color: 'orange', category: 'special' },
  { type: 'url', label: 'URL', icon: LinkIcon, color: 'cyan', category: 'special' },
  { type: 'color', label: 'Color Picker', icon: Palette, color: 'pink', category: 'special' },
  { type: 'rating', label: 'Rating', icon: Star, color: 'yellow', category: 'special' },
  { type: 'slider', label: 'Slider', icon: Sliders, color: 'teal', category: 'special' },
  { type: 'cascading_product', label: 'Cascading Product', icon: Layers, color: 'red', category: 'special' },
];

export function FormBuilderToolbar() {
  const handleDragStart = (e: React.DragEvent, fieldType: FieldType) => {
    e.dataTransfer.setData('fieldType', fieldType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const basicFields = FIELD_TYPES.filter(f => f.category === 'basic');
  const advancedFields = FIELD_TYPES.filter(f => f.category === 'advanced');
  const specialFields = FIELD_TYPES.filter(f => f.category === 'special');

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Field Types</h3>
        <p className="text-xs text-gray-500 mb-4">
          Drag and drop fields to add them to your form
        </p>

        {/* Basic Fields */}
        <div className="mb-6">
          <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
            Basic Fields
          </h4>
          <div className="space-y-1">
            {basicFields.map((field) => (
              <FieldTypeButton
                key={field.type}
                field={field}
                onDragStart={(e) => handleDragStart(e, field.type)}
              />
            ))}
          </div>
        </div>

        {/* Advanced Fields */}
        <div className="mb-6">
          <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
            Selection Fields
          </h4>
          <div className="space-y-1">
            {advancedFields.map((field) => (
              <FieldTypeButton
                key={field.type}
                field={field}
                onDragStart={(e) => handleDragStart(e, field.type)}
              />
            ))}
          </div>
        </div>

        {/* Special Fields */}
        <div className="mb-6">
          <h4 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wider">
            Special Fields
          </h4>
          <div className="space-y-1">
            {specialFields.map((field) => (
              <FieldTypeButton
                key={field.type}
                field={field}
                onDragStart={(e) => handleDragStart(e, field.type)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldTypeButtonProps {
  field: FieldTypeConfig;
  onDragStart: (e: React.DragEvent) => void;
}

function FieldTypeButton({ field, onDragStart }: FieldTypeButtonProps) {
  const Icon = field.icon;

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200 hover:bg-cyan-100',
    pink: 'bg-pink-50 text-pink-600 border-pink-200 hover:bg-pink-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100',
    teal: 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100',
  };

  return (
    <button
      draggable
      onDragStart={onDragStart}
      className={`
        w-full flex items-center gap-2 px-3 py-2 rounded-lg border
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${colorClasses[field.color as keyof typeof colorClasses]}
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium">{field.label}</span>
    </button>
  );
}
