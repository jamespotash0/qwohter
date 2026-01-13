import { useState } from 'react';
import { FormField } from '../types';
import { useFormBuilderStore } from '../store/formBuilderStore';
import {
  GripVertical,
  Edit2,
  Copy,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';

interface FieldItemProps {
  field: FormField;
  tabId: string;
  onClick: () => void;
  isSelected: boolean;
}

export function FieldItem({ field, tabId, onClick, isSelected }: FieldItemProps) {
  const { deleteField, duplicateField, reorderFields, currentForm } = useFormBuilderStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteField(tabId, field.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateField(tabId, field.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('fieldId', field.id);
    e.dataTransfer.setData('tabId', tabId);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedFieldId = e.dataTransfer.getData('fieldId');
    const draggedTabId = e.dataTransfer.getData('tabId');

    if (draggedTabId !== tabId) return; // Can't move between tabs (for now)
    if (draggedFieldId === field.id) return; // Dropped on itself

    const tab = currentForm?.tabs.find(t => t.id === tabId);
    if (!tab) return;

    const fields = [...tab.fields];
    const draggedIndex = fields.findIndex(f => f.id === draggedFieldId);
    const targetIndex = fields.findIndex(f => f.id === field.id);

    const [removed] = fields.splice(draggedIndex, 1);
    fields.splice(targetIndex, 0, removed);

    const reorderedFields = fields.map((f, index) => ({
      ...f,
      order: index
    }));

    reorderFields(tabId, reorderedFields);
  };

  const getFieldTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      text: 'bg-blue-100 text-blue-700',
      textarea: 'bg-blue-100 text-blue-700',
      email: 'bg-blue-100 text-blue-700',
      number: 'bg-green-100 text-green-700',
      currency: 'bg-green-100 text-green-700',
      phone: 'bg-blue-100 text-blue-700',
      date: 'bg-purple-100 text-purple-700',
      time: 'bg-purple-100 text-purple-700',
      datetime: 'bg-purple-100 text-purple-700',
      dropdown: 'bg-indigo-100 text-indigo-700',
      'multi-select': 'bg-indigo-100 text-indigo-700',
      radio: 'bg-indigo-100 text-indigo-700',
      checkbox: 'bg-indigo-100 text-indigo-700',
      switch: 'bg-indigo-100 text-indigo-700',
      file: 'bg-orange-100 text-orange-700',
      url: 'bg-cyan-100 text-cyan-700',
      color: 'bg-pink-100 text-pink-700',
      rating: 'bg-yellow-100 text-yellow-700',
      slider: 'bg-teal-100 text-teal-700',
      cascading_product: 'bg-red-100 text-red-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={onClick}
      className={`
        group flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        ${isSelected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Drag Handle */}
      <GripVertical className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />

      {/* Field Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 truncate">
            {field.label}
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getFieldTypeColor(field.type)}`}>
            {field.type}
          </span>
          {field.validation?.required && (
            <span className="text-xs text-red-600 font-medium">*</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono">{field.name}</span>
          {field.helpText && (
            <span className="truncate">• {field.helpText}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onClick}
          className="p-1.5 hover:bg-blue-100 rounded text-blue-600"
          title="Edit field"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDuplicate}
          className="p-1.5 hover:bg-gray-100 rounded text-gray-600"
          title="Duplicate field"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          className="p-1.5 hover:bg-red-100 rounded text-red-600"
          title="Delete field"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Conditional Logic Indicator */}
      {field.showIf && field.showIf.length > 0 && (
        <div className="flex-shrink-0">
          <EyeOff className="w-4 h-4 text-amber-500" title="Has conditional logic" />
        </div>
      )}
    </div>
  );
}
