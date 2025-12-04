/**
 * Form Builder V3
 * Award-winning form builder with drag-drop, grid layout, and dependencies
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, closestCenter, pointerWithin, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { ArrowLeft, Eye, FloppyDisk, Plus, Info, X, PencilSimple, DotsSixVertical, ArrowsOutCardinal, Trash, Gear } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Tabs, TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useUser } from '@/auth';
import { useForm, useCreateForm, useUpdateForm } from '@/hooks/queries';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { FormComponents } from '@/features/form-builder/components/FormComponents';
// import { DotGridCanvas } from '@/features/form-builder/components/DotGridCanvas';
import { PropertiesPanel } from '@/features/form-builder/components/PropertiesPanel';
import { FormPdfTemplatesSection } from '@/features/form-builder/components/FormPdfTemplatesSection';
import { FormDocumentTemplatesSection } from '@/features/form-builder/components/FormDocumentTemplatesSection';
import type { EnhancedFormField, EnhancedFormTab, FormComponentsItem } from '@/features/form-builder/types/enhanced';

// Droppable Page Content Component
interface DroppablePageContentProps {
  tabIndex: number;
  currentTab: number;
  pageFields: EnhancedFormField[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string | null) => void;
  onDeleteField: (fieldId: string) => void;
  onUpdateField: (updates: Partial<EnhancedFormField>) => void;
  tabName: string;
  dragPreview: { w: number; h: number } | null;
}

function DroppablePageContent({
  tabIndex,
  currentTab,
  pageFields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onUpdateField,
  tabName,
  dragPreview,
}: DroppablePageContentProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `canvas-${tabIndex}`,
  });

  // Calculate where the preview should appear (first available position)
  const calculatePreviewPosition = () => {
    if (!dragPreview || !isOver) return null;

    const GRID_COLS = 12;
    const MAX_Y = 100;
    const width = dragPreview.w;
    const height = dragPreview.h;

    // Helper function to check if a position collides with existing fields
    const hasCollision = (x: number, y: number): boolean => {
      return pageFields.some(field => {
        const fx = field.layout?.x || 0;
        const fy = field.layout?.y || 0;
        const fw = field.layout?.w || 6;
        const fh = field.layout?.h || 2;

        // Check for overlap
        return !(
          x + width <= fx ||  // New field ends before existing field starts
          x >= fx + fw ||     // New field starts after existing field ends
          y + height <= fy || // New field ends before existing field starts
          y >= fy + fh        // New field starts after existing field ends
        );
      });
    };

    // Try to find an available spot row by row
    for (let y = 0; y < MAX_Y; y++) {
      for (let x = 0; x <= GRID_COLS - width; x++) {
        if (!hasCollision(x, y)) {
          return { x, y };
        }
      }
    }

    // Fallback: place at the bottom if no space found
    let maxY = 0;
    pageFields.forEach(field => {
      const fieldBottom = (field.layout?.y || 0) + (field.layout?.h || 2);
      if (fieldBottom > maxY) maxY = fieldBottom;
    });
    return { x: 0, y: maxY };
  };

  const previewPosition = calculatePreviewPosition();

  // Convert field layouts to react-grid-layout format
  const gridLayouts: Layout[] = pageFields.map(field => {
    const h = field.layout?.h || 2;
    const isSectionType = field.type === 'section' || field.type === 'text_content';

    return {
      i: field.id,
      x: field.layout?.x || 0,
      y: field.layout?.y || 0,
      w: field.layout?.w || 6,
      h: h,
      minW: 1,
      minH: field.layout?.minH || 1,
      maxW: 12,
      maxH: isSectionType ? undefined : h, // Lock height for non-section fields
      static: field.isSystemField || false,
    };
  });

  // Handle layout changes from react-grid-layout
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    newLayout.forEach(layoutItem => {
      const field = pageFields.find(f => f.id === layoutItem.i);
      if (field && (
        field.layout?.x !== layoutItem.x ||
        field.layout?.y !== layoutItem.y ||
        field.layout?.w !== layoutItem.w ||
        field.layout?.h !== layoutItem.h
      )) {
        onUpdateField({
          id: field.id,
          layout: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        });
      }
    });
  }, [pageFields, onUpdateField]);

  return (
    <div
      ref={setNodeRef}
      className={`relative p-6 transition-colors min-h-[calc(100vh-12rem)] ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/10' : ''
      }`}
      onClick={(e) => {
        // If clicking on the empty canvas area, deselect
        if (e.target === e.currentTarget) {
          onSelectField(null);
        }
      }}
    >
      {pageFields.length === 0 && !dragPreview ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-15rem)] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium">No fields yet</p>
            <p className="text-xs mt-1">
              {currentTab === tabIndex
                ? "Drag fields from the left palette to get started"
                : `Switch to "${tabName}" tab to add fields`}
            </p>
          </div>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={gridLayouts}
          cols={12}
          rowHeight={50}
          width={848}
          onLayoutChange={handleLayoutChange}
          isDraggable={currentTab === tabIndex}
          isResizable={currentTab === tabIndex}
          compactType={null}
          preventCollision={true}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          resizeHandles={['se', 'sw', 'ne', 'nw']}
          draggableHandle=".drag-handle"
        >
          {pageFields.map((field) => (
            <div
              key={field.id}
              className={selectedFieldId === field.id && currentTab === tabIndex ? 'react-grid-item-selected' : ''}
              data-grid={{
                i: field.id,
                x: field.layout?.x || 0,
                y: field.layout?.y || 0,
                w: field.layout?.w || 6,
                h: field.layout?.h || 2,
                minW: 1,
                minH: 1,
                maxW: 12,
                static: field.isSystemField || false,
              }}
            >
              <GridFieldItem
                field={field}
                isSelected={selectedFieldId === field.id && currentTab === tabIndex}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                onUpdate={onUpdateField}
              />
            </div>
          ))}
        </GridLayout>
      )}

      {/* Drag Preview - Shows where the field will be placed */}
      {dragPreview && isOver && previewPosition && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg pointer-events-none"
          style={{
            left: `${previewPosition.x * 72 + 24}px`,
            top: `${previewPosition.y * 66 + 24}px`,
            width: `${dragPreview.w * 56 + (dragPreview.w - 1) * 16}px`,
            height: `${dragPreview.h * 50 + (dragPreview.h - 1) * 16}px`,
            zIndex: 50,
          }}
        >
          <div className="flex items-center justify-center h-full">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Drop here
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormBuilderV3() {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUser();

  // Add custom styles for react-grid-layout - style resize handles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Style resize handles like Google Docs - small square boxes in corners */
      .react-grid-item > .react-resizable-handle {
        background: none;
        border: none;
        width: 10px;
        height: 10px;
        z-index: 100;
      }

      .react-grid-item > .react-resizable-handle::after {
        content: '';
        position: absolute;
        width: 10px;
        height: 10px;
        background: white;
        border: 2px solid #3b82f6;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        border-radius: 2px;
      }

      /* Top-left corner */
      .react-grid-item > .react-resizable-handle-nw {
        top: -6px;
        left: -6px;
        cursor: nw-resize;
      }

      .react-grid-item > .react-resizable-handle-nw::after {
        top: 0;
        left: 0;
      }

      /* Top-right corner */
      .react-grid-item > .react-resizable-handle-ne {
        top: -6px;
        right: -6px;
        cursor: ne-resize;
      }

      .react-grid-item > .react-resizable-handle-ne::after {
        top: 0;
        right: 0;
      }

      /* Bottom-left corner */
      .react-grid-item > .react-resizable-handle-sw {
        bottom: -6px;
        left: -6px;
        cursor: sw-resize;
      }

      .react-grid-item > .react-resizable-handle-sw::after {
        bottom: 0;
        left: 0;
      }

      /* Bottom-right corner */
      .react-grid-item > .react-resizable-handle-se {
        bottom: -6px;
        right: -6px;
        cursor: se-resize;
      }

      .react-grid-item > .react-resizable-handle-se::after {
        bottom: 0;
        right: 0;
      }

      /* Only show handles on selected items */
      .react-grid-item:not(.react-grid-item-selected) > .react-resizable-handle {
        display: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Get organization ID for form creation/updates
  const { organizationId } = useCurrentOrganization(user?.id || '', !!user?.id);

  // Fetch existing form if editing
  const { data: existingForm } = useForm(
    formId && formId !== 'new' ? formId : '',
    formId !== 'new'
  );

  const createFormMutation = useCreateForm();
  const updateFormMutation = useUpdateForm();

  // Form state
  const [formName, setFormName] = useState(existingForm?.name || 'Untitled Form');
  const [documentType, setDocumentType] = useState(existingForm?.document_type || 'Proposal');
  const [allowSaveIncomplete, setAllowSaveIncomplete] = useState(existingForm?.allow_save_incomplete ?? true);
  const [currentTab, setCurrentTab] = useState(0);
  const [tabs, setTabs] = useState<EnhancedFormTab[]>(() => {
    if (existingForm?.tabs) {
      return existingForm.tabs as EnhancedFormTab[];
    }
    // Start with empty tabs - user will add their own
    return [];
  });

  // Migrate field layouts from 12-column to 48-column system if needed
  const migrateFieldLayout = (field: EnhancedFormField): EnhancedFormField => {
    const layout = field.layout;
    if (!layout) return field;

    // Check if this field appears to be from the old 12-column system
    // If width is <= 12 and x position is < 12, it's likely from the old system
    const isOldSystem = layout.w <= 12 && (layout.x || 0) < 12;

    if (isOldSystem) {
      return {
        ...field,
        layout: {
          ...layout,
          x: layout.x * 4, // Scale x position by 4
          w: layout.w * 4, // Scale width by 4
          // Keep y and h the same as they don't depend on column count
        }
      };
    }

    return field;
  };

  // Sync state when existing form loads from database
  useEffect(() => {
    if (existingForm) {
      setFormName(existingForm.name);
      // setFormDescription(existingForm.description || '');
      setDocumentType(existingForm.document_type || 'Proposal');
      setAllowSaveIncomplete(existingForm.allow_save_incomplete ?? true);
      if (existingForm.tabs) {
        // Migrate tabs to new 48-column system if needed
        const migratedTabs = (existingForm.tabs as EnhancedFormTab[]).map(tab => ({
          ...tab,
          fields: tab.fields.map(migrateFieldLayout)
        }));
        setTabs(migratedTabs);
      }
    }
  }, [existingForm]);

  // UI state
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ w: number; h: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);

  const currentFields = tabs[currentTab]?.fields || [];
  const selectedField = currentFields.find((f) => f.id === selectedFieldId) || null;

  // Configure drag sensors to require minimum drag distance (prevents accidental clicks from adding fields)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag activates
      },
    })
  );


  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // Set drag preview dimensions for palette items
    if (event.active.id.toString().startsWith('palette-')) {
      const paletteItem = event.active.data.current as FormComponentsItem;
      const layout = paletteItem.defaultProps?.layout || { w: 6, h: 2 };
      setDragPreview({ w: layout.w, h: layout.h });
    }
  }, []);

  const handleDragOver = useCallback((_: DragOverEvent) => {
    // This ensures the drag preview updates as you move over droppable areas
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setDragPreview(null);
      return;
    }

    // Check if reordering tabs
    if (active.id.toString().startsWith('tab-')) {
      const oldIndex = tabs.findIndex(tab => `tab-${tab.id}` === active.id);
      const newIndex = tabs.findIndex(tab => `tab-${tab.id}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedTabs = arrayMove(tabs, oldIndex, newIndex).map((tab, index) => ({
          ...tab,
          order: index,
        }));
        setTabs(reorderedTabs);

        // Update current tab index if it was moved
        if (currentTab === oldIndex) {
          setCurrentTab(newIndex);
        } else if (oldIndex < currentTab && newIndex >= currentTab) {
          setCurrentTab(currentTab - 1);
        } else if (oldIndex > currentTab && newIndex <= currentTab) {
          setCurrentTab(currentTab + 1);
        }
      }
      setActiveId(null);
      return;
    }

    // Check if reordering fields within a tab
    if (active.id.toString().startsWith('field-') && over.id.toString().startsWith('field-')) {
      const activeFieldId = active.id.toString().replace('field-', '');
      const overFieldId = over.id.toString().replace('field-', '');

      const oldIndex = currentFields.findIndex(field => field.id === activeFieldId);
      const newIndex = currentFields.findIndex(field => field.id === overFieldId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reorderedFields = arrayMove(currentFields, oldIndex, newIndex).map((field, index) => ({
          ...field,
          order: index,
        }));

        const updatedTabs = [...tabs];
        updatedTabs[currentTab] = {
          ...updatedTabs[currentTab],
          fields: reorderedFields,
        } as EnhancedFormTab;
        setTabs(updatedTabs);
      }
      setActiveId(null);
      return;
    }

    // Check if dragging from palette - only add if dropped on the canvas (has 'over')
    if (active.id.toString().startsWith('palette-') && over) {
      // Only add if dropped on a field grid or the canvas area (not other UI elements)
      const isValidDropTarget =
        over.id.toString().startsWith('field-') ||
        over.id.toString() === `canvas-${currentTab}`;

      if (isValidDropTarget) {
        const paletteItem = active.data.current as FormComponentsItem;
        const newFieldLayout = paletteItem.defaultProps.layout || { x: 0, y: 0, w: 6, h: 2 };

        // Find the next available position that doesn't collide with existing fields
        const findAvailablePosition = (
          width: number,
          height: number,
          existingFields: EnhancedFormField[]
        ): { x: number; y: number } => {
          const GRID_COLS = 12;
          const MAX_Y = 100; // Maximum Y position to check

          // Helper function to check if a position collides with existing fields
          const hasCollision = (x: number, y: number): boolean => {
            return existingFields.some(field => {
              const fx = field.layout?.x || 0;
              const fy = field.layout?.y || 0;
              const fw = field.layout?.w || 6;
              const fh = field.layout?.h || 2;

              // Check for overlap
              return !(
                x + width <= fx ||  // New field ends before existing field starts
                x >= fx + fw ||     // New field starts after existing field ends
                y + height <= fy || // New field ends before existing field starts
                y >= fy + fh        // New field starts after existing field ends
              );
            });
          };

          // Try to find an available spot row by row
          for (let y = 0; y < MAX_Y; y++) {
            for (let x = 0; x <= GRID_COLS - width; x++) {
              if (!hasCollision(x, y)) {
                return { x, y };
              }
            }
          }

          // Fallback: place at the bottom if no space found
          let maxY = 0;
          existingFields.forEach(field => {
            const fieldBottom = (field.layout?.y || 0) + (field.layout?.h || 2);
            if (fieldBottom > maxY) maxY = fieldBottom;
          });
          return { x: 0, y: maxY };
        };

        const availablePos = findAvailablePosition(
          newFieldLayout.w,
          newFieldLayout.h,
          currentFields
        );

        // Create new field from palette item
        const newField: EnhancedFormField = {
          ...paletteItem.defaultProps,
          id: `field_${Date.now()}`,
          type: paletteItem.type,
          order: currentFields.length,
          layout: {
            ...newFieldLayout,
            x: availablePos.x,
            y: availablePos.y,
          },
        } as EnhancedFormField;

        // Add to current tab
        const updatedTabs = [...tabs];
        updatedTabs[currentTab] = {
          ...updatedTabs[currentTab],
          fields: [...currentFields, newField],
        } as EnhancedFormTab;
        setTabs(updatedTabs);

        // Select the newly added field
        setSelectedFieldId(newField.id);
      }
    }

    setActiveId(null);
    setDragPreview(null);
  }, [currentFields, currentTab, tabs]);

  // Field update handler
  const handleUpdateField = useCallback(
    (updates: Partial<EnhancedFormField>) => {
      if (!selectedFieldId) return;

      const updatedTabs = [...tabs];
      const fieldIndex = currentFields.findIndex((f) => f.id === selectedFieldId);

      if (fieldIndex !== -1) {
        updatedTabs[currentTab].fields[fieldIndex] = {
          ...currentFields[fieldIndex],
          ...updates,
        };
        setTabs(updatedTabs);

        // If the field ID changed, update the selectedFieldId to the new ID
        if (updates.id && updates.id !== selectedFieldId) {
          setSelectedFieldId(updates.id);
        }
      }
    },
    [selectedFieldId, tabs, currentTab, currentFields]
  );

  // Delete field
  const handleDeleteField = useCallback(
    (fieldId: string) => {
      // Check if the field is a system field
      const fieldToDelete = currentFields.find((f) => f.id === fieldId);
      if (fieldToDelete?.isSystemField) {
        toast.error('System fields cannot be deleted', {
          description: 'This field is required and protected from deletion.',
        });
        return;
      }

      const updatedTabs = [...tabs];
      updatedTabs[currentTab] = {
        ...updatedTabs[currentTab],
        fields: currentFields.filter((f) => f.id !== fieldId),
      } as EnhancedFormTab;
      setTabs(updatedTabs);
      setSelectedFieldId(null);
    },
    [tabs, currentTab, currentFields]
  );

  // Save form
  const handleSave = useCallback(async () => {
    if (!organizationId || !user?.id) {
      toast.error('Missing organization or user');
      return;
    }

    setIsSaving(true);

    try {
      const formData = {
        organization_id: organizationId,
        name: formName,
        document_type: documentType, // Type of document this form generates
        tabs: tabs as any[],
        created_by: user.id,
        is_archived: false,
        is_default: false,
        allow_save_incomplete: allowSaveIncomplete,
      };

      if (formId && formId !== 'new') {
        // Update existing form
        await updateFormMutation.mutateAsync({
          id: formId,
          updates: formData,
        });
        // toast.success('Form saved successfully');
        // Navigate back to forms list after save
        navigate('/forms');
      } else {
        // Create new form
        const newForm = await createFormMutation.mutateAsync(formData);
        // toast.success('Form created successfully');
        // Navigate to the new form's edit page
        navigate(`/forms/builder-v3/${newForm.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      toast.error('Failed to save form: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [
    organizationId,
    user,
    formName,
    documentType,
    tabs,
    formId,
    createFormMutation,
    updateFormMutation,
    navigate,
    allowSaveIncomplete,
  ]);

  // Add new tab
  const handleAddTab = useCallback(() => {
    const newTab: EnhancedFormTab = {
      id: `tab_${Date.now()}`,
      name: `Tab ${tabs.length + 1}`,
      order: tabs.length,
      fields: [],
      layoutMode: 'grid',
    };
    setTabs([...tabs, newTab]);
    setCurrentTab(tabs.length);
  }, [tabs]);

  // Delete tab
  const handleDeleteTab = useCallback((index: number) => {
    if (tabs[index].is_default) {
      return;
    }
    const updatedTabs = tabs.filter((_, i) => i !== index);
    setTabs(updatedTabs);
    if (currentTab >= updatedTabs.length) {
      setCurrentTab(Math.max(0, updatedTabs.length - 1));
    }
  }, [tabs, currentTab]);

  // Rename tab
  const handleRenameTab = useCallback((index: number, newName: string) => {
    const updatedTabs = [...tabs];
    updatedTabs[index] = {
      ...updatedTabs[index],
      name: newName,
    } as EnhancedFormTab;
    setTabs(updatedTabs);
  }, [tabs]);

  const handleStartEditingTab = useCallback((index: number, currentName: string) => {
    setEditingTabIndex(index);
    setEditingTabName(currentName);
  }, []);

  const handleFinishEditingTab = useCallback(() => {
    if (editingTabIndex !== null && editingTabName.trim()) {
      handleRenameTab(editingTabIndex, editingTabName.trim());
    }
    setEditingTabIndex(null);
    setEditingTabName('');
  }, [editingTabIndex, editingTabName, handleRenameTab]);

  const handleCancelEditingTab = useCallback(() => {
    setEditingTabIndex(null);
    setEditingTabName('');
  }, []);


  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={pointerWithin}
    >
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/forms')}
              className="h-9 w-9"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Separator orientation="vertical" className="h-6" />

            {/* Editable Form Name */}
            {isEditingName ? (
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingName(false);
                  }
                  if (e.key === 'Escape') {
                    setFormName(existingForm?.name || 'Untitled Form');
                    setIsEditingName(false);
                  }
                }}
                className="h-8 w-80 font-semibold border border-blue-500 focus-visible:ring-1"
                placeholder="Form Name"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group text-left"
              >
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formName}
                </span>
                <PencilSimple className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            {/* Form Settings */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Gear className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="start">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Form Settings</h4>
                    <p className="text-xs text-gray-500">Configure form behavior and options</p>
                  </div>
                  <Separator />

                  {/* Document Type Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="form-type" className="text-sm font-medium">
                      Document Type
                    </Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger id="form-type" className="h-9">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Proposal">Proposal</SelectItem>
                        <SelectItem value="Invoice">Invoice</SelectItem>
                        <SelectItem value="Service_Request">Service Request</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Type of document this form generates
                    </p>
                  </div>

                  <Separator />

                  {/* Allow Save as Incomplete */}
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex-1">
                      <Label htmlFor="allow-save-incomplete" className="text-sm font-medium">
                        Allow Save as Incomplete
                      </Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Users can save the form without completing required fields
                      </p>
                    </div>
                    <Switch
                      id="allow-save-incomplete"
                      checked={allowSaveIncomplete}
                      onCheckedChange={setAllowSaveIncomplete}
                    />
                  </div>

                  <Separator />

                  {/* PDF Templates */}
                  <FormPdfTemplatesSection
                    formId={formId !== 'new' ? formId : undefined}
                    organizationId={organizationId}
                  />

                  <Separator />

                  {/* Document Templates (Plate.js) */}
                  <FormDocumentTemplatesSection
                    formId={formId !== 'new' ? formId : undefined}
                    organizationId={organizationId}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FloppyDisk className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Tab Bar with Drag-to-Reorder - shadcn/ui Tabs */}
        <Tabs value={`tab-${currentTab}`} className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto">
            <SortableContext items={tabs.map(tab => `tab-${tab.id}`)} strategy={horizontalListSortingStrategy}>
              <TabsList className="h-auto p-0 bg-transparent gap-2">
                {tabs.map((tab, index) => (
                  <SortableTab
                    key={tab.id}
                    tab={tab}
                    index={index}
                    isActive={currentTab === index}
                    isEditing={editingTabIndex === index}
                    editingName={editingTabName}
                    onSelect={() => {
                      setCurrentTab(index);
                    }}
                    onStartEdit={(name) => handleStartEditingTab(index, name)}
                    onFinishEdit={handleFinishEditingTab}
                    onCancelEdit={handleCancelEditingTab}
                    onChangeName={setEditingTabName}
                    onDelete={() => handleDeleteTab(index)}
                  />
                ))}
              </TabsList>
            </SortableContext>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTab}
              className="h-9 ml-2"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Page
            </Button>
          </div>
        </Tabs>

        {/* Main Content - Three Resizable Panels */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
          {/* Left Sidebar - Form Components */}
          <ResizablePanel defaultSize={16} minSize={16} maxSize={30}>
            <FormComponents
              tabs={tabs}
              currentTab={currentTab}
              onSelectTab={(index) => setCurrentTab(index)}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center Canvas */}
          <ResizablePanel defaultSize={selectedFieldId ? 65 : 80} minSize={40}>
            <ScrollArea className="w-full h-full">
              <div
                ref={canvasRef}
                className="w-full flex items-start justify-center bg-gray-50 dark:bg-gray-900 p-8"
              >
                {/* Single Page View */}
                <div
                  className="w-full max-w-4xl min-h-[800px] bg-white dark:bg-gray-800 shadow-lg"
                onClick={(e) => {
                  // If clicking directly on the page (not a field), deselect
                  if (e.target === e.currentTarget) {
                    setSelectedFieldId(null);
                  }
                }}
              >
                {/* Page Content */}
                <DroppablePageContent
                  tabIndex={currentTab}
                  currentTab={currentTab}
                  pageFields={tabs[currentTab]?.fields || []}
                  selectedFieldId={selectedFieldId}
                  onSelectField={(fieldId) => {
                    setSelectedFieldId(fieldId);
                  }}
                  onDeleteField={handleDeleteField}
                  onUpdateField={handleUpdateField}
                  tabName={tabs[currentTab]?.name || ''}
                  dragPreview={dragPreview}
                />
              </div>
            </div>
            </ScrollArea>
          </ResizablePanel>

          {/* Right Sidebar - Properties Panel (only show when field selected) */}
          {selectedFieldId && selectedField && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={16} minSize={12} maxSize={20}>
                <PropertiesPanel
                  selectedField={selectedField}
                  onUpdate={handleUpdateField}
                  onClose={() => setSelectedFieldId(null)}
                  onDelete={() => handleDeleteField(selectedFieldId)}
                  allFields={currentFields}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeId.toString().startsWith('palette-') ? (
          <div className="bg-white/60 dark:bg-gray-800/60 border-2 border-dashed border-gray-400 rounded-lg p-3 shadow-lg opacity-50">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Look for blue drop zone</span>
          </div>
        ) : activeId && activeId.toString().startsWith('tab-') ? (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-blue-400">
            <span className="text-sm font-medium">
              {tabs.find(tab => `tab-${tab.id}` === activeId)?.name || 'Tab'}
            </span>
          </div>
        ) : activeId && activeId.toString().startsWith('field-') ? (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-xl border-2 border-blue-400 flex items-center gap-2">
            <DotsSixVertical className="w-4 h-4" weight="bold" />
            <span className="text-sm font-medium">
              {currentFields.find(f => `field-${f.id}` === activeId)?.label || 'Field'}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Sortable Tab Component
interface SortableTabProps {
  tab: EnhancedFormTab;
  index: number;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onSelect: () => void;
  onStartEdit: (name: string) => void;
  onFinishEdit: () => void;
  onCancelEdit: () => void;
  onChangeName: (name: string) => void;
  onDelete: () => void;
}

function SortableTab({
  tab,
  // index,
  isActive,
  isEditing,
  editingName,
  onSelect,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onChangeName,
  onDelete,
}: SortableTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    over,
    active,
  } = useSortable({ id: `tab-${tab.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine drop indicator position - only show for tab reordering, not for field dragging
  const isDraggingTab = active?.id.toString().startsWith('tab-');
  const showDropIndicator = isOver && active && active.id !== `tab-${tab.id}` && isDraggingTab;
  const dropOnLeft = showDropIndicator && over && active &&
    active.id.toString().localeCompare(over.id.toString()) > 0;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`relative group ${showDropIndicator ? 'ring-2 ring-blue-400/30' : ''}`}
      whileHover={{ scale: isEditing ? 1 : 1.02 }}
      whileTap={{ scale: isEditing ? 1 : 0.98 }}
    >
      {/* Drop Indicator - Left */}
      {showDropIndicator && dropOnLeft && (
        <motion.div
          className="absolute -left-2 top-0 bottom-0 w-1 bg-blue-500 rounded-full z-20 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          initial={{ opacity: 0, scaleY: 0.8 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {/* Drop Indicator - Right */}
      {showDropIndicator && !dropOnLeft && (
        <motion.div
          className="absolute -right-2 top-0 bottom-0 w-1 bg-blue-500 rounded-full z-20 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          initial={{ opacity: 0, scaleY: 0.8 }}
          animate={{ opacity: 1, scaleY: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
      {isEditing ? (
        <Input
          value={editingName}
          onChange={(e) => onChangeName(e.target.value)}
          onBlur={onFinishEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onFinishEdit();
            }
            if (e.key === 'Escape') {
              onCancelEdit();
            }
          }}
          className="h-9 px-4 text-sm font-medium border border-blue-500 focus-visible:ring-1"
          placeholder="Tab Name"
          autoFocus
        />
      ) : (
        <div
          className={`
            flex items-center h-9 rounded-lg transition-all duration-200 border-2
            ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600'
                : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
            }
            ${isDragging ? 'ring-2 ring-blue-400 shadow-lg' : 'shadow-sm'}
          `}
        >
          {/* Drag Handle */}
          <div
            {...listeners}
            {...attributes}
            className={`
              px-1.5 h-full flex items-center cursor-grab active:cursor-grabbing transition-all border-r
              ${isActive
                ? 'text-white/60 hover:text-white/90 border-white/20'
                : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 border-gray-200 dark:border-gray-700'
              }
            `}
            title="Drag to reorder"
          >
            <DotsSixVertical className="w-4 h-4" weight="bold" />
          </div>

          {/* Tab Button */}
          <div
            className="px-3 h-full text-sm font-medium whitespace-nowrap flex items-center gap-2 flex-1 cursor-pointer"
            onClick={onSelect}
          >
            <span>{tab.name}</span>
            <div className="flex items-center gap-0.5 ml-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit(tab.name);
                }}
                className={`
                  p-1 rounded transition-all
                  ${
                    isActive
                      ? 'text-white/60 hover:text-white hover:bg-white/20'
                      : 'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
                title="Rename tab"
              >
                <PencilSimple className="w-3.5 h-3.5" />
              </button>
              {!tab.is_default && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className={`
                    p-1 rounded transition-all
                    ${
                      isActive
                        ? 'text-white/60 hover:text-white hover:bg-red-500/30'
                        : 'text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                    }
                  `}
                  title="Delete tab"
                >
                  <Trash className="w-3.5 h-3.5" weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Grid Field Item Component (used with react-grid-layout)
interface GridFieldItemProps {
  field: EnhancedFormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<EnhancedFormField>) => void;
}

function GridFieldItem({ field, isSelected, onSelect, onDelete, onUpdate }: GridFieldItemProps) {
  // Special rendering for section and text_content - no input box styling
  const isPlainText = field.type === 'section' || field.type === 'text_content';
  const isTextContent = field.type === 'text_content';

  return (
    <motion.div
      className={`
        h-full w-full relative transition-all flex flex-col
        ${isTextContent ? 'p-0' : isPlainText ? 'p-2' : 'p-4'}
        ${
          isSelected && !isPlainText
            ? 'bg-blue-50 dark:bg-blue-900/20 shadow-md ring-2 ring-primary ring-inset'
            : isPlainText
            ? 'bg-transparent'
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }
        ${isSelected && isPlainText ? 'ring-2 ring-primary/30 ring-inset' : ''}
        cursor-default
      `}
      style={{
        backgroundColor: isPlainText ? 'transparent' : field.styling?.backgroundColor,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Drag Handle - Show when selected (only for non-system fields) */}
      {isSelected && !field.isSystemField && (
        <div
          className="drag-handle absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded-md shadow-lg z-50 cursor-grab active:cursor-grabbing hover:bg-blue-700 transition-colors"
          title="Drag to move field"
        >
          <DotsSixVertical className="w-4 h-4" weight="bold" />
        </div>
      )}

      {/* Lock Icon - Show for system fields */}
      {field.isSystemField && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white px-2 py-1 rounded-md shadow-lg z-10"
          title="System field - cannot be deleted or moved"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Delete Button for section and text_content - Show in top right */}
      {(field.type === 'section' || field.type === 'text_content') && isSelected && !field.isSystemField && (
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
            title="Delete field"
          >
            <Trash className="w-3.5 h-3.5" weight="bold" />
          </Button>
        </div>
      )}

      {/* Field Label - Hide for section and text_content as they render their own */}
      {field.type !== 'section' && field.type !== 'text_content' && (
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.description && (
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" weight="fill" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-xs">
                      <p className="text-xs">{field.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          {/* Delete Button - Show when selected (only for non-system fields) */}
          {isSelected && !field.isSystemField && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="h-6 w-6 -mt-1 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
              title="Delete field"
            >
              <Trash className="w-3.5 h-3.5" weight="bold" />
            </Button>
          )}
        </div>
      )}

      {/* Field Preview */}
      <div className={isTextContent ? 'h-full w-full' : isPlainText ? '' : 'mt-2 flex-1 flex flex-col'}>
        {/* Section - Visual header/divider for organizing fields */}
        {field.type === 'section' && (
          <div className="border-b-2 border-gray-300 dark:border-gray-600 pb-2 mb-1">
            <h3
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const newLabel = e.currentTarget.textContent || '';
                if (newLabel !== field.label) {
                  onUpdate({ label: newLabel });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
              onInput={(e) => {
                // Prevent line breaks in section titles
                const content = e.currentTarget.textContent || '';
                if (content.includes('\n')) {
                  e.currentTarget.textContent = content.replace(/\n/g, '');
                }
              }}
              className={cn(
                "font-bold text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded px-1",
                field.styling?.titleSize === 'sm' && 'text-sm',
                field.styling?.titleSize === 'md' && 'text-base',
                (!field.styling?.titleSize || field.styling?.titleSize === 'lg') && 'text-lg',
                field.styling?.titleSize === 'xl' && 'text-xl',
                field.styling?.titleSize === '2xl' && 'text-2xl'
              )}
            >
              {field.label || 'Section Title'}
            </h3>
            <p
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const newDescription = e.currentTarget.textContent || '';
                if (newDescription !== field.description) {
                  onUpdate({ description: newDescription });
                }
              }}
              className={cn(
                "text-gray-500 dark:text-gray-400 mt-1 px-1 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded empty:before:content-['Click_to_add_description...'] empty:before:text-gray-400",
                field.styling?.descriptionSize === 'xs' && 'text-xs',
                (!field.styling?.descriptionSize || field.styling?.descriptionSize === 'sm') && 'text-sm',
                field.styling?.descriptionSize === 'md' && 'text-base',
                field.styling?.descriptionSize === 'lg' && 'text-lg'
              )}
            >
              {field.description}
            </p>
          </div>
        )}

        {/* Text Content - Simple text container */}
        {field.type === 'text_content' && (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newValue = e.currentTarget.textContent || '';
              if (newValue !== field.default_value) {
                onUpdate({ default_value: newValue });
              }
            }}
            className={cn(
              "h-full w-full p-3 outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded empty:before:content-['Click_to_add_text...'] empty:before:text-gray-400",
              // Font weight
              field.styling?.fontWeight === 'bold' && 'font-bold',
              field.styling?.fontWeight === 'semibold' && 'font-semibold',
              field.styling?.fontWeight === 'medium' && 'font-medium',
              (!field.styling?.fontWeight || field.styling?.fontWeight === 'normal') && 'font-normal',
              // Font style
              field.styling?.fontStyle === 'italic' && 'italic',
              // Text alignment
              field.styling?.textAlign === 'left' && 'text-left',
              field.styling?.textAlign === 'center' && 'text-center',
              field.styling?.textAlign === 'right' && 'text-right',
              field.styling?.textAlign === 'justify' && 'text-justify',
              // Font size
              field.styling?.fontSize === '12px' && 'text-xs',
              field.styling?.fontSize === '14px' && 'text-sm',
              field.styling?.fontSize === '16px' && 'text-base',
              field.styling?.fontSize === '18px' && 'text-lg',
              field.styling?.fontSize === '20px' && 'text-xl',
              field.styling?.fontSize === '24px' && 'text-2xl',
            )}
            style={{
              fontFamily: field.styling?.fontFamily || 'system-ui',
              color: field.styling?.textColor || '#374151',
              backgroundColor: field.styling?.highlightColor || 'transparent',
              lineHeight: field.styling?.lineHeight || '1.5',
              letterSpacing: field.styling?.letterSpacing || 'normal',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {field.default_value || ''}
          </div>
        )}

        {field.field_type === 'input' && field.input_type === 'address' && (
          <div
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm flex items-center gap-2"
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 256 256">
              <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"></path>
            </svg>
            <span className={field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'}>
              {field.default_value || field.placeholder || 'Search address with Mapbox...'}
            </span>
          </div>
        )}
        {field.field_type === 'input' && field.input_type === 'number' && field.number_format === 'currency' && (
          <div
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm flex items-center gap-2"
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            <svg className="w-4 h-4 text-green-600 dark:text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 256 256">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a48,48,0,0,1-48,48h-8v16a8,8,0,0,1-16,0V176H88a8,8,0,0,1,0-16h40a32,32,0,0,0,0-64H112a16,16,0,0,1,0-32h16V48a8,8,0,0,1,16,0V64h8a8,8,0,0,1,0,16h-8a32,32,0,0,0,0,64h16A48.05,48.05,0,0,1,176,128Z"></path>
            </svg>
            <span className={field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'}>
              {field.default_value || field.placeholder || '$0.00'}
            </span>
          </div>
        )}
        {field.field_type === 'input' && field.input_type !== 'address' && !(field.input_type === 'number' && field.number_format === 'currency') && (
          <div
            className={`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm flex items-center ${
              field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'
            }`}
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            {field.default_value || field.placeholder || 'Enter value...'}
          </div>
        )}
        {field.field_type === 'textarea' && (
          <div
            className={`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm flex-1 overflow-auto ${
              field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'
            }`}
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
            }}
          >
            {field.default_value || field.placeholder || 'Enter text...'}
          </div>
        )}
        {field.field_type === 'dropdown' && (
          <div
            className={`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm flex items-center justify-between ${
              field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'
            }`}
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            <span className="truncate">
              {field.default_value || field.placeholder || 'Select option'}
            </span>
            <span className="ml-2 flex-shrink-0">▼</span>
          </div>
        )}
        {field.field_type === 'checkbox' && field.uiVariant === 'toggle' && (
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform translate-x-1" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Off / On</span>
          </div>
        )}
        {field.field_type === 'checkbox' && field.uiVariant !== 'toggle' && (
          <div className="space-y-2">
            {field.options && field.options.length > 0 ? (
              field.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{option || `Option ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded flex-shrink-0" />
                <span className="text-sm text-gray-400 italic">No options configured</span>
              </div>
            )}
          </div>
        )}
        {field.field_type === 'radio' && (
          <div className="space-y-2">
            {field.options && field.options.length > 0 ? (
              field.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{option || `Option ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full flex-shrink-0" />
                <span className="text-sm text-gray-400 italic">No options configured</span>
              </div>
            )}
          </div>
        )}
        {field.field_type === 'date' && (
          <div
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-400 flex items-center"
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            MM/DD/YYYY
          </div>
        )}
        {field.field_type === 'math' && (
          <div
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-mono text-gray-500 flex items-center"
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            {field.formula || '=0'}
          </div>
        )}
      </div>

      {/* Help Text */}
      {field.helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{field.helpText}</p>
      )}
    </motion.div>
  );
}

// Sortable Field Item Component with Drag and Resize
interface SortableFieldItemProps {
  field: EnhancedFormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateLayout: (updates: Partial<EnhancedFormField>) => void;
}

function SortableFieldItem({ field, isSelected, onSelect, onDelete, onUpdateLayout }: SortableFieldItemProps) {
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [isResizingHeight, setIsResizingHeight] = useState(false);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartHeight, setResizeStartHeight] = useState(0);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartY, setResizeStartY] = useState(0);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `field-${field.id}`,
    disabled: field.isSystemField, // Disable dragging for system fields
  });

  const layout = field.layout || { x: 0, y: 0, w: 6, h: 2 };
  const styling = field.styling || {};

  // Map grid width to columns (12-column grid)
  const colSpan = Math.min(layout.w, 12);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    gridColumn: `span ${colSpan}`,
    gridRow: `span ${layout.h}`,
    backgroundColor: styling.backgroundColor,
    borderColor: isSelected ? 'transparent' : styling.borderColor,
    borderWidth: styling.borderWidth,
    borderRadius: styling.borderRadius,
  };

  // Handle width resize
  const handleWidthResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingWidth(true);
    setResizeStartWidth(layout.w);
    setResizeStartX(e.clientX);
  }, [layout.w]);

  const handleWidthResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingWidth) return;

    const deltaX = e.clientX - resizeStartX;
    // Each grid column is roughly 1/12 of the container width
    // Approximate: 100px per column for a 1200px wide container
    const columnChange = Math.round(deltaX / 100);
    const newWidth = Math.max(1, Math.min(12, resizeStartWidth + columnChange));

    if (newWidth !== layout.w) {
      onUpdateLayout({
        layout: {
          ...layout,
          w: newWidth,
        },
      });
    }
  }, [isResizingWidth, resizeStartX, resizeStartWidth, layout, onUpdateLayout]);

  const handleWidthResizeEnd = useCallback(() => {
    setIsResizingWidth(false);
  }, []);

  // Handle height resize
  const handleHeightResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizingHeight(true);
    setResizeStartHeight(layout.h);
    setResizeStartY(e.clientY);
  }, [layout.h]);

  const handleHeightResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingHeight) return;

    const deltaY = e.clientY - resizeStartY;
    // Approximate: 40px per row height unit
    const rowChange = Math.round(deltaY / 40);
    const newHeight = Math.max(1, Math.min(10, resizeStartHeight + rowChange));

    if (newHeight !== layout.h) {
      onUpdateLayout({
        layout: {
          ...layout,
          h: newHeight,
        },
      });
    }
  }, [isResizingHeight, resizeStartY, resizeStartHeight, layout, onUpdateLayout]);

  const handleHeightResizeEnd = useCallback(() => {
    setIsResizingHeight(false);
  }, []);

  useEffect(() => {
    if (!isResizingWidth) return;

    window.addEventListener('mousemove', handleWidthResizeMove);
    window.addEventListener('mouseup', handleWidthResizeEnd);
    return () => {
      window.removeEventListener('mousemove', handleWidthResizeMove);
      window.removeEventListener('mouseup', handleWidthResizeEnd);
    };
  }, [isResizingWidth, handleWidthResizeMove, handleWidthResizeEnd]);

  useEffect(() => {
    if (!isResizingHeight) return;

    window.addEventListener('mousemove', handleHeightResizeMove);
    window.addEventListener('mouseup', handleHeightResizeEnd);
    return () => {
      window.removeEventListener('mousemove', handleHeightResizeMove);
      window.removeEventListener('mouseup', handleHeightResizeEnd);
    };
  }, [isResizingHeight, handleHeightResizeMove, handleHeightResizeEnd]);

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`
        relative border-2 rounded-lg p-4 transition-all
        ${
          isSelected
            ? 'border-transparent bg-primary/5 shadow-md'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${isDragging ? 'z-50' : 'z-0'}
      `}
      onClick={onSelect}
      whileHover={{ scale: isDragging ? 1 : 1.01 }}
    >
      {/* Drag Handle - Show when selected (only for non-system fields) */}
      {isSelected && !field.isSystemField && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded-md cursor-grab active:cursor-grabbing shadow-lg z-10 hover:bg-blue-700 transition-colors"
          title="Drag to reorder"
        >
          <DotsSixVertical className="w-4 h-4" weight="bold" />
        </div>
      )}

      {/* Lock Icon - Show for system fields */}
      {isSelected && field.isSystemField && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-500 text-white px-2 py-1 rounded-md shadow-lg z-10"
          title="System field - cannot be deleted or reordered"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Field Label */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" weight="fill" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="start" className="max-w-xs">
                    <p className="text-xs">{field.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        {/* Delete Button - Show when selected (only for non-system fields) */}
        {isSelected && !field.isSystemField && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-6 w-6 -mt-1 text-red-600 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
            title="Delete field"
          >
            <Trash className="w-3.5 h-3.5" weight="bold" />
          </Button>
        )}
      </div>

      {/* Field Preview */}
      <div className="mt-2">
        {field.field_type === 'input' && field.input_type === 'address' && (
          <div className="h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 256 256">
              <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"></path>
            </svg>
            <span className={field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'}>
              {field.default_value || field.placeholder || 'Search address with Mapbox...'}
            </span>
          </div>
        )}
        {field.field_type === 'input' && field.input_type === 'number' && field.number_format === 'currency' && (
          <div className="h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 256 256">
              <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a48,48,0,0,1-48,48h-8v16a8,8,0,0,1-16,0V176H88a8,8,0,0,1,0-16h40a32,32,0,0,0,0-64H112a16,16,0,0,1,0-32h16V48a8,8,0,0,1,16,0V64h8a8,8,0,0,1,0,16h-8a32,32,0,0,0,0,64h16A48.05,48.05,0,0,1,176,128Z"></path>
            </svg>
            <span className={field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'}>
              {field.default_value || field.placeholder || '$0.00'}
            </span>
          </div>
        )}
        {field.field_type === 'input' && field.input_type !== 'address' && !(field.input_type === 'number' && field.number_format === 'currency') && (
          <div className={`h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm ${
            field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'
          }`}>
            {field.default_value || field.placeholder || 'Enter value...'}
          </div>
        )}
        {field.field_type === 'textarea' && (
          <div className={`flex-1 min-h-[80px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm ${
            field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'
          }`}>
            {field.default_value || field.placeholder || 'Enter text...'}
          </div>
        )}
        {field.field_type === 'dropdown' && (
          <div className={`h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm flex items-center justify-between ${
            field.default_value ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-400'
          }`}>
            <span className="truncate">
              {field.default_value || field.placeholder || 'Select option'}
            </span>
            <span className="ml-2">▼</span>
          </div>
        )}
        {field.field_type === 'checkbox' && field.uiVariant === 'toggle' && (
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-gray-600 transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-200 transition-transform translate-x-1" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Off / On</span>
          </div>
        )}
        {field.field_type === 'checkbox' && field.uiVariant !== 'toggle' && (
          <div className="space-y-2">
            {field.options && field.options.length > 0 ? (
              field.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{option || `Option ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded flex-shrink-0" />
                <span className="text-sm text-gray-400 italic">No options configured</span>
              </div>
            )}
          </div>
        )}
        {field.field_type === 'radio' && (
          <div className="space-y-2">
            {field.options && field.options.length > 0 ? (
              field.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{option || `Option ${index + 1}`}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full flex-shrink-0" />
                <span className="text-sm text-gray-400 italic">No options configured</span>
              </div>
            )}
          </div>
        )}
        {field.field_type === 'date' && (
          <div
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-400 flex items-center"
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            MM/DD/YYYY
          </div>
        )}
        {field.field_type === 'math' && (
          <div
            className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-mono text-gray-500 flex items-center"
            style={{
              borderRadius: `${field.styling?.borderRadius || 4}px`,
              height: `${field.styling?.inputHeight || 36}px`
            }}
          >
            {field.formula || '=0'}
          </div>
        )}
      </div>

      {/* Help Text */}
      {field.helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{field.helpText}</p>
      )}

      {/* Width Resize Handle - Show when selected (only for non-system fields) */}
      {isSelected && !field.isSystemField && (
        <div
          onMouseDown={handleWidthResizeStart}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-1.5 rounded-md cursor-ew-resize shadow-lg z-10 hover:bg-blue-700 transition-colors"
          title="Drag to resize width"
        >
          <ArrowsOutCardinal className="w-4 h-4" weight="bold" style={{ transform: 'rotate(90deg)' }} />
        </div>
      )}

      {/* Height Resize Handle - Show when selected (only for non-system fields) */}
      {isSelected && !field.isSystemField && (
        <div
          onMouseDown={handleHeightResizeStart}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white p-1.5 rounded-md cursor-ns-resize shadow-lg z-10 hover:bg-blue-700 transition-colors"
          title="Drag to resize height"
        >
          <ArrowsOutCardinal className="w-4 h-4" weight="bold" />
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <motion.div
          className="absolute -top-1 -left-1 -right-1 -bottom-1 border-2 border-primary rounded-lg pointer-events-none"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
}
