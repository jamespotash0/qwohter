/**
 * Form Builder V3
 * Award-winning form builder with drag-drop, grid layout, and dependencies
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, closestCenter, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, FloppyDisk, Plus, Info, X, PencilSimple, MagnifyingGlassMinus, MagnifyingGlassPlus, Hand, Cursor, ArrowRight, DotsSixVertical, ArrowsOutCardinal } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser } from '@/auth';
import { useForm, useCreateForm, useUpdateForm } from '@/hooks/queries';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { FieldPalette } from '@/features/form-builder/components/FieldPalette';
import { DotGridCanvas } from '@/features/form-builder/components/DotGridCanvas';
import { PropertiesPanel } from '@/features/form-builder/components/PropertiesPanel';
import type { EnhancedFormField, EnhancedFormTab, FieldPaletteItem } from '@/features/form-builder/types/enhanced';
import { DEFAULT_COMPANY_INFO_TAB, DEFAULT_PROJECT_DETAILS_TAB } from '@/stores/forms/formsStore';

// Droppable Page Content Component
interface DroppablePageContentProps {
  tabIndex: number;
  currentTab: number;
  pageFields: EnhancedFormField[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
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

  // Calculate where the preview should appear (at the bottom)
  let previewY = 0;
  if (dragPreview && isOver) {
    pageFields.forEach(field => {
      const fieldBottom = (field.layout?.y || 0) + (field.layout?.h || 2);
      if (fieldBottom > previewY) previewY = fieldBottom;
    });
  }

  return (
    <div
      ref={setNodeRef}
      className={`p-6 transition-colors ${
        isOver ? 'bg-blue-50 dark:bg-blue-900/10' : ''
      }`}
    >
      {pageFields.length === 0 && !dragPreview ? (
        <div className="flex items-center justify-center h-96 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
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
        <SortableContext items={pageFields.map(f => `field-${f.id}`)}>
          <div className="grid grid-cols-12 gap-4 min-h-[500px] relative" style={{ gridAutoRows: '50px' }}>
            {pageFields.map((field) => (
              <SortableFieldItem
                key={field.id}
                field={field}
                isSelected={selectedFieldId === field.id && currentTab === tabIndex}
                onSelect={() => onSelectField(field.id)}
                onDelete={() => onDeleteField(field.id)}
                onUpdateLayout={(updates) => onUpdateField(updates)}
              />
            ))}

            {/* Drag Preview - Shows where the field will be placed */}
            {dragPreview && isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="border-2 border-dashed border-blue-500 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg"
                style={{
                  gridColumn: `span ${Math.min(dragPreview.w, 12)}`,
                  gridRow: `span ${dragPreview.h}`,
                  gridRowStart: previewY + 1,
                }}
              >
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Drop here
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

export default function FormBuilderV3() {
  const { id: formId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUser();

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
  const [formDescription, setFormDescription] = useState(existingForm?.description || '');
  const [formType, setFormType] = useState(existingForm?.form_type || 'Custom');
  const [currentTab, setCurrentTab] = useState(0);
  const [tabs, setTabs] = useState<EnhancedFormTab[]>(() => {
    if (existingForm?.tabs) {
      return existingForm.tabs as EnhancedFormTab[];
    }
    return [
      { ...DEFAULT_COMPANY_INFO_TAB, layoutMode: 'grid' as const } as EnhancedFormTab,
      { ...DEFAULT_PROJECT_DETAILS_TAB, layoutMode: 'grid' as const } as EnhancedFormTab,
    ];
  });

  // Sync state when existing form loads from database
  useEffect(() => {
    if (existingForm) {
      setFormName(existingForm.name);
      setFormDescription(existingForm.description || '');
      setFormType(existingForm.form_type || 'Custom');
      if (existingForm.tabs) {
        setTabs(existingForm.tabs as EnhancedFormTab[]);
      }
    }
  }, [existingForm]);

  // UI state
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ w: number; h: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editingTabIndex, setEditingTabIndex] = useState<number | null>(null);
  const [editingTabName, setEditingTabName] = useState('');

  // Canvas pan/zoom state
  const [canvasZoom, setCanvasZoom] = useState(0.75); // Default to 75% zoom
  const [canvasPosition, setCanvasPosition] = useState({ x: 100, y: 100 }); // Start with some offset
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasMode, setCanvasMode] = useState<'select' | 'pan'>('select');
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

  // Canvas reset view handler - focuses on first page
  const handleResetView = useCallback(() => {
    setCanvasZoom(0.75); // Reset to default 75% zoom
    setCanvasPosition({ x: 100, y: 100 });
  }, []);

  // Keyboard shortcuts for canvas modes (Figma-style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setCanvasMode('select');
      } else if (e.key === 'h' || e.key === 'H') {
        setCanvasMode('pan');
      } else if (e.key === ' ') {
        e.preventDefault();
        handleResetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetView]);

  // Attach wheel event listener as non-passive to allow preventDefault for zoom
  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        // Smoother zoom factor (10% instead of 20%)
        const zoomFactor = e.deltaY > 0 ? 0.91 : 1.1;
        const newZoom = Math.max(0.1, Math.min(3, canvasZoom * zoomFactor));

        // Get viewport center point
        const rect = canvasElement.getBoundingClientRect();
        const viewportCenterX = rect.width / 2;
        const viewportCenterY = rect.height / 2;

        // Calculate new position to zoom towards center
        const scale = newZoom / canvasZoom;
        const newX = viewportCenterX - (viewportCenterX - canvasPosition.x) * scale;
        const newY = viewportCenterY - (viewportCenterY - canvasPosition.y) * scale;

        setCanvasZoom(newZoom);
        setCanvasPosition({ x: newX, y: newY });
      }
    };

    // Attach with passive: false to allow preventDefault
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasElement.removeEventListener('wheel', handleWheel);
  }, [canvasZoom, canvasPosition]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);

    // Set drag preview dimensions for palette items
    if (event.active.id.toString().startsWith('palette-')) {
      const paletteItem = event.active.data.current as FieldPaletteItem;
      const layout = paletteItem.defaultProps?.layout || { w: 6, h: 2 };
      setDragPreview({ w: layout.w, h: layout.h });
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
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
        const paletteItem = active.data.current as FieldPaletteItem;

        // Calculate the next available Y position (bottom of current fields)
        let maxY = 0;
        currentFields.forEach(field => {
          const fieldBottom = (field.layout?.y || 0) + (field.layout?.h || 2);
          if (fieldBottom > maxY) maxY = fieldBottom;
        });

        // Create new field from palette item, positioned at the bottom
        const newField: EnhancedFormField = {
          ...paletteItem.defaultProps,
          id: `field_${Date.now()}`,
          order: currentFields.length,
          layout: {
            ...paletteItem.defaultProps.layout,
            y: maxY, // Position at the bottom
          },
        } as EnhancedFormField;

        // Add to current tab
        const updatedTabs = [...tabs];
        updatedTabs[currentTab] = {
          ...updatedTabs[currentTab],
          fields: [...currentFields, newField],
        };
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
        description: formDescription,
        form_type: formType, // Type of document this form generates
        tabs: tabs as any[],
        created_by: user.id,
        is_active: true,
        is_default: false,
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
    formDescription,
    tabs,
    formId,
    createFormMutation,
    updateFormMutation,
    navigate,
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

  // Focus on a specific page/tab in the canvas
  const handleFocusOnPage = useCallback((pageIndex: number) => {
    const pageWidth = 1200; // Width of each page on canvas
    const pageSpacing = 400; // Spacing between pages
    const targetX = -(pageIndex * (pageWidth + pageSpacing)) + (canvasRef.current?.offsetWidth || 0) / 2 - pageWidth / 2;

    setCanvasPosition({ x: targetX, y: 100 });
    setCanvasZoom(1);
  }, []);

  // Canvas pan handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse or Shift+Left always pans
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasPosition.x, y: e.clientY - canvasPosition.y });
    }
    // Left click pans only if in pan mode
    else if (e.button === 0 && canvasMode === 'pan') {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - canvasPosition.x, y: e.clientY - canvasPosition.y });
    }
  }, [canvasPosition, canvasMode]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setCanvasPosition({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleZoomIn = useCallback(() => {
    // Smoother zoom factor (10% instead of 20%)
    const zoomFactor = 1.1;
    const newZoom = Math.min(3, canvasZoom * zoomFactor);

    // Get viewport center point
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setCanvasZoom(newZoom);
      return;
    }

    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;

    // Calculate new position to zoom towards center
    const scale = newZoom / canvasZoom;
    const newX = viewportCenterX - (viewportCenterX - canvasPosition.x) * scale;
    const newY = viewportCenterY - (viewportCenterY - canvasPosition.y) * scale;

    setCanvasZoom(newZoom);
    setCanvasPosition({ x: newX, y: newY });
  }, [canvasZoom, canvasPosition]);

  const handleZoomOut = useCallback(() => {
    // Smoother zoom factor (10% instead of 20%)
    const zoomFactor = 0.91;
    const newZoom = Math.max(0.1, canvasZoom * zoomFactor);

    // Get viewport center point
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setCanvasZoom(newZoom);
      return;
    }

    const viewportCenterX = rect.width / 2;
    const viewportCenterY = rect.height / 2;

    // Calculate new position to zoom towards center
    const scale = newZoom / canvasZoom;
    const newX = viewportCenterX - (viewportCenterX - canvasPosition.x) * scale;
    const newY = viewportCenterY - (viewportCenterY - canvasPosition.y) * scale;

    setCanvasZoom(newZoom);
    setCanvasPosition({ x: newX, y: newY });
  }, [canvasZoom, canvasPosition]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-950">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
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

            {/* Editable Form Name and Description */}
            <div className="flex flex-col gap-0.5">
              {isEditingName ? (
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingName(false);
                      setIsEditingDescription(true);
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

              {isEditingDescription ? (
                <Input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  onBlur={() => setIsEditingDescription(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingDescription(false);
                    if (e.key === 'Escape') {
                      setFormDescription(existingForm?.description || '');
                      setIsEditingDescription(false);
                    }
                  }}
                  className="h-7 w-80 text-sm border border-blue-500 focus-visible:ring-1"
                  placeholder="Add a description..."
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="flex items-center gap-2 px-2 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group text-left"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formDescription || 'Add a description...'}
                  </span>
                  <PencilSimple className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className="h-7 w-7"
                title="Zoom Out (Ctrl+Scroll)"
              >
                <MagnifyingGlassMinus className="w-4 h-4" />
              </Button>
              <button
                onClick={handleResetView}
                className="px-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 min-w-[3rem]"
              >
                {Math.round(canvasZoom * 100)}%
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className="h-7 w-7"
                title="Zoom In (Ctrl+Scroll)"
              >
                <MagnifyingGlassPlus className="w-4 h-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

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

        {/* Tab Bar with Drag-to-Reorder */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <SortableContext items={tabs.map(tab => `tab-${tab.id}`)} strategy={horizontalListSortingStrategy}>
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
                  handleFocusOnPage(index);
                }}
                onStartEdit={(name) => handleStartEditingTab(index, name)}
                onFinishEdit={handleFinishEditingTab}
                onCancelEdit={handleCancelEditingTab}
                onChangeName={setEditingTabName}
                onDelete={() => handleDeleteTab(index)}
              />
            ))}
          </SortableContext>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddTab}
            className="h-9 ml-2"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Tab
          </Button>
        </div>

        {/* Main Content - Three Panels */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Field Palette */}
          <div className="w-[280px] flex-shrink-0">
            <FieldPalette />
          </div>

          {/* Center Canvas with Pan/Zoom */}
          <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative bg-gray-50 dark:bg-gray-900"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            style={{
              cursor: isPanning ? 'grabbing' : (canvasMode === 'pan' ? 'grab' : 'default')
            }}
          >
            <DotGridCanvas>
              <div
                style={{
                  transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${canvasZoom})`,
                  transformOrigin: '0 0',
                  transition: isPanning ? 'none' : 'transform 0.3s ease-out',
                  width: 'max-content',
                  height: 'max-content',
                }}
                className="p-8"
              >
                {/* Multi-Page Flow Layout */}
                <div className="flex items-start gap-96">
                  {tabs.map((tab, tabIndex) => {
                    const pageFields = tab.fields || [];
                    return (
                      <div key={tab.id} className="relative">
                        {/* Page Container */}
                        <div
                          className={`
                            w-[1200px] min-h-[800px] bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 transition-all
                            ${currentTab === tabIndex ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'}
                          `}
                        >
                          {/* Page Header */}
                          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {tab.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Page {tabIndex + 1} of {tabs.length}
                            </p>
                          </div>

                          {/* Page Content */}
                          <DroppablePageContent
                            tabIndex={tabIndex}
                            currentTab={currentTab}
                            pageFields={pageFields}
                            selectedFieldId={selectedFieldId}
                            onSelectField={(fieldId) => {
                              setCurrentTab(tabIndex);
                              setSelectedFieldId(fieldId);
                            }}
                            onDeleteField={handleDeleteField}
                            onUpdateField={handleUpdateField}
                            tabName={tab.name}
                            dragPreview={currentTab === tabIndex ? dragPreview : null}
                          />
                        </div>

                        {/* Arrow to Next Page */}
                        {tabIndex < tabs.length - 1 && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center w-96">
                            <div className="flex-1 h-0.5 bg-gray-400 dark:bg-gray-600" />
                            <div className="flex items-center justify-center w-8 h-8 -ml-1 rounded-full bg-gray-400 dark:bg-gray-600 border-2 border-white dark:border-gray-950">
                              <ArrowRight className="w-5 h-5 text-white" weight="bold" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </DotGridCanvas>

            {/* Canvas Mode Selectors (Figma-style) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => setCanvasMode('select')}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all
                    ${canvasMode === 'select'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  title="Select Mode (V)"
                >
                  <Cursor className="w-4 h-4" weight={canvasMode === 'select' ? 'fill' : 'regular'} />
                  <span>Select</span>
                </button>
                <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
                <button
                  onClick={() => setCanvasMode('pan')}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all
                    ${canvasMode === 'pan'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  title="Pan Mode (H) - Click and drag to move canvas"
                >
                  <Hand className="w-4 h-4" weight={canvasMode === 'pan' ? 'fill' : 'regular'} />
                  <span>Pan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties Panel (only show when field selected) */}
          {selectedFieldId && (
            <div className="w-[350px] flex-shrink-0">
              <PropertiesPanel
                selectedField={selectedField}
                onUpdate={handleUpdateField}
                onClose={() => setSelectedFieldId(null)}
                onDelete={() => handleDeleteField(selectedFieldId)}
                allFields={currentFields}
              />
            </div>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeId.toString().startsWith('palette-') ? (
          <div className="bg-white dark:bg-gray-800 border-2 border-primary rounded-lg p-3 shadow-xl">
            <span className="text-sm font-medium">Dragging field...</span>
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
  index,
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
            flex items-center rounded-lg transition-all duration-200 border-2
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
              px-1.5 py-2 cursor-grab active:cursor-grabbing transition-all border-r
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
            className="px-3 py-2 text-sm font-medium whitespace-nowrap flex items-center gap-2 flex-1 cursor-pointer"
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
                  <X className="w-3.5 h-3.5" weight="bold" />
                </button>
              )}
            </div>
          </div>
        </div>
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
    if (isResizingWidth) {
      window.addEventListener('mousemove', handleWidthResizeMove);
      window.addEventListener('mouseup', handleWidthResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleWidthResizeMove);
        window.removeEventListener('mouseup', handleWidthResizeEnd);
      };
    }
  }, [isResizingWidth, handleWidthResizeMove, handleWidthResizeEnd]);

  useEffect(() => {
    if (isResizingHeight) {
      window.addEventListener('mousemove', handleHeightResizeMove);
      window.addEventListener('mouseup', handleHeightResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleHeightResizeMove);
        window.removeEventListener('mouseup', handleHeightResizeEnd);
      };
    }
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
            <X className="w-3.5 h-3.5" weight="bold" />
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
          <div className={`h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm ${
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
          <div className="h-9 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-sm text-gray-400">
            MM/DD/YYYY
          </div>
        )}
        {field.field_type === 'math' && (
          <div className="h-9 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm font-mono text-gray-500">
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
