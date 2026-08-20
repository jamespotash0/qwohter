import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContent } from '@/components/common/layout';
import { Project, ProjectPriority } from '@/services/boardService';
import { useAttachments } from '@/hooks/queries/useAttachments';
import {
  useProjects,
  useWorkflowColumns,
  useUpdateProject,
  useDeleteProject,
  useCreateWorkflowColumn,
  useUpdateWorkflowColumn,
  useDeleteWorkflowColumn,
  useMoveBoardItem,
} from '@/hooks/queries/useBoard';
import { useUser } from '@/auth';
import { useCurrentOrganization } from '@/hooks/queries/useOrganization';
import { animate } from 'animejs';
import {
  Plus as PlusIcon,
  DotsThreeVertical as DotsThreeVerticalIcon,
  Trash as TrashIcon,
  CaretDown as CaretDownIcon,
  CaretRight as CaretRightIcon,
  PencilSimple as PencilSimpleIcon,
  MapPin as MapPinIcon,
  Hash as HashIcon,
  X as XIcon,
  Check as CheckIcon,
  Flag as FlagIcon,
  Calendar as CalendarIcon,
  DotsSixVertical as DragIcon
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatLocalDate } from '@/lib/utils';
import { ProjectDeleteDialog } from '@/components/features/board/ProjectDeleteDialog';
import { ProjectBoardOverlay } from '@/components/features/board/ProjectBoardOverlay';

const COLUMN_COLORS = [
  { name: 'Slate', value: '#94A3B8', icon: '⚪' },
  { name: 'Blue', value: '#3B82F6', icon: '🔵' },
  { name: 'Indigo', value: '#6366F1', icon: '🟣' },
  { name: 'Purple', value: '#8B5CF6', icon: '🟣' },
  { name: 'Pink', value: '#EC4899', icon: '🩷' },
  { name: 'Orange', value: '#F59E0B', icon: '🟠' },
  { name: 'Green', value: '#10B981', icon: '🟢' },
  { name: 'Yellow', value: '#EAB308', icon: '🟡' },
  { name: 'Red', value: '#EF4444', icon: '🔴' },
  { name: 'Teal', value: '#14B8A6', icon: '🟦' },
];



export default function Board() {
  // Get user and organization
  const user = useUser();
  const { organization, role } = useCurrentOrganization(user?.id || '');
  const organizationId = organization?.id || '';
  const canManagePayments = role === 'Owner' || role === 'Admin';

  // URL Search Params
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFromUrl = searchParams.get('project');

  // Fetch data using React Query (includes automatic realtime subscriptions)
  const { data: projects = [], isLoading: projectsLoading } = useProjects(organizationId, !!organizationId);
  const { data: workflowColumns = [], isLoading: columnsLoading } = useWorkflowColumns(organizationId, !!organizationId);

  // Mutations
  const { mutate: updateProject } = useUpdateProject(organizationId);
  const { mutate: deleteProject } = useDeleteProject(organizationId);
  const { mutate: createWorkflowColumn } = useCreateWorkflowColumn(organizationId);
  const { mutate: updateWorkflowColumn } = useUpdateWorkflowColumn(organizationId);
  const { mutate: deleteWorkflowColumn } = useDeleteWorkflowColumn(organizationId);
  const { mutate: moveBoardItem } = useMoveBoardItem(organizationId);

  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [columnDropSide, setColumnDropSide] = useState<'left' | 'right' | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isAnimatingRef = useRef(false);
  const lastColumnDropTarget = useRef<{ columnId: string; side: 'left' | 'right' } | null>(null);


  const userClosedRef = useRef(false);

  const openProjectOverlay = (project: Project) => {
    setSelectedProjectId(project.id);
    setSearchParams({ project: project.id });
  };

  const closeProjectOverlay = () => {
    userClosedRef.current = true;
    setSelectedProjectId(null);
    // Clear the project param from URL
    searchParams.delete('project');
    setSearchParams(searchParams);
  };

  // Sync URL parameter to overlay state (like TaskBoard pattern)
  useEffect(() => {
    // Don't re-open if user just closed the overlay
    if (userClosedRef.current) {
      userClosedRef.current = false;
      return;
    }
    if (projectFromUrl && projects.length > 0 && !selectedProjectId) {
      // Try to find by ID (projects don't have reference field like tasks)
      const foundProject = projects.find((p) => p.id === projectFromUrl);
      if (foundProject) {
        setSelectedProjectId(foundProject.id);
      }
    }
  }, [projectFromUrl, projects, selectedProjectId]);

  // Delete confirmation state
  const [deleteProjectDialog, setDeleteProjectDialog] = useState<{ open: boolean; project: Project | null }>({
    open: false,
    project: null,
  });

  // Derive selected project from projects array to ensure we always have fresh data
  const selectedProject = selectedProjectId
    ? projects.find(p => p.id === selectedProjectId) || null
    : null;

  // Fetch project attachments for selected project
  const { data: attachments = [], refetch: refetchAttachments } = useAttachments(
    'project',
    selectedProject?.id
  );

  // React Query automatically handles:
  // - Data fetching via useProjects/useWorkflowColumns
  // - Realtime subscriptions (built into hooks)
  // - Cleanup on unmount
  // No manual initialization needed!

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId);
    e.dataTransfer.effectAllowed = 'move';
    // Don't update board_order here - just track visually until drop
  };

  const handleDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Only show column drop zone if we're dragging a card, not a column
    if (!draggedColumnId) {
      setDragOverColumn(columnName);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
    setDragOverCard(null);
  };

  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // Don't show card drop indicators if we're dragging a column
    if (draggedColumnId) return;

    // Determine if hovering over top or bottom half of the card
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const isTopHalf = e.clientY < midpoint;

    setDragOverCard(cardId);
    setDropPosition(isTopHalf ? 'before' : 'after');
  };

  const handleCardDragLeave = () => {
    setDragOverCard(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();

    // Clear drag states immediately to remove blue border
    setDragOverColumn(null);
    setDragOverCard(null);

    if (!draggedProject) return;

    const sourceProject = projects.find(p => p.id === draggedProject);
    if (!sourceProject) return;

    const isSameColumn = sourceProject.workflow_status === targetStatus;

    // STEP 1: Get all projects in target column excluding the dragged card
    let cardsInTargetColumn = getProjectsByStatus(targetStatus)
      .filter(p => p.id !== draggedProject) // Exclude the card being dragged
      .sort((a, b) => (a.board_order || 0) - (b.board_order || 0));


    // STEP 2: Determine where to insert the dragged card (1-based position)
    let insertPosition: number;

    if (dragOverCard && dragOverCard !== draggedProject) {
      // Find the card we're hovering over in the filtered list
      const targetCardIndex = cardsInTargetColumn.findIndex(p => p.id === dragOverCard);
      if (targetCardIndex >= 0) {
        if (dropPosition === 'before') {
          insertPosition = targetCardIndex + 1; // Insert before this card (1-based)
        } else {
          insertPosition = targetCardIndex + 2; // Insert after this card (1-based)
        }
      } else {
        // Card not found, add to end
        insertPosition = cardsInTargetColumn.length + 1;
      }
    } else {
      // Dropped in empty space - add to end
      insertPosition = cardsInTargetColumn.length + 1;
    }

    // Check if position actually changed - skip reorder if same position in same column
    if (isSameColumn) {
      const oldPosition = sourceProject.board_order ?? 0;
      const effectivelySamePosition =
        insertPosition === oldPosition ||
        insertPosition === oldPosition + 1; // Dropping right after self

      if (effectivelySamePosition) {
        setDraggedProject(null);
        setDropPosition('before');
        return;
      }
    }

    // STEP 3: Build the final order array by inserting dragged card at the calculated position
    const finalOrder: string[] = [];



    for (let i = 0; i < cardsInTargetColumn.length; i++) {
      const currentPosition = i + 1; // 1-based

      // Insert dragged card when we reach the insert position
      if (currentPosition === insertPosition) {
        finalOrder.push(draggedProject);
      }

      finalOrder.push(cardsInTargetColumn[i]!.id);
    }

    // If insert position is at the end, append dragged card
    if (insertPosition > cardsInTargetColumn.length) {
      finalOrder.push(draggedProject);
    }


    // STEP 4: Build updates for target column - UPDATE ALL CARDS
    const updates: Array<{ id: string; updates: Partial<Project> }> = [];

    finalOrder.forEach((projectId, index) => {
      const newBoardOrder = index + 1; // 1-based indexing (1, 2, 3...)

      if (projectId === draggedProject) {
        // Dragged card needs workflow_status AND board_order updated
        updates.push({
          id: projectId,
          updates: { workflow_status: targetStatus, board_order: newBoardOrder }
        });
      } else {
        // Update ALL cards in target column to ensure consistency
        updates.push({
          id: projectId,
          updates: { board_order: newBoardOrder }
        });
      }
    });

    // STEP 5: If moving between columns, reorder the source column
    if (!isSameColumn) {
      const sourceColumnCards = getProjectsByStatus(sourceProject.workflow_status)
        .filter(p => p.id !== draggedProject) // Exclude the card being moved
        .sort((a, b) => (a.board_order || 0) - (b.board_order || 0));


      // Update ALL cards in source column to ensure consistency
      sourceColumnCards.forEach((card, index) => {
        const correctOrder = index + 1; // Sequential 1, 2, 3...
        updates.push({
          id: card.id,
          updates: { board_order: correctOrder }
        });
      });
    }

    // Debug: Log all updates

    // STEP 6: Execute all updates
    for (const { id, updates: projectUpdates } of updates) {
      updateProject({ id, updates: projectUpdates });
    }

    setDraggedProject(null);
    setDragOverColumn(null);
    setDragOverCard(null);
    setDropPosition('before');
  };

  // Column reordering handlers
  const handleColumnDragStart = (e: React.DragEvent, columnId: string) => {
    console.log('🔄 Column drag started:', columnId);
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumnId && draggedColumnId !== columnId) {
      // Check if we already have an indicator set for this column (using ref for immediate check)
      if (lastColumnDropTarget.current?.columnId === columnId) {
        // Already showing indicator for this column, don't recalculate
        return;
      }

      // Calculate which side to show indicator on
      const sortedColumns = [...workflowColumns].sort((a, b) => a.column_order - b.column_order);
      const draggedIndex = sortedColumns.findIndex(c => c.id === draggedColumnId);
      const targetIndex = sortedColumns.findIndex(c => c.id === columnId);

      // If dragging from left to right, always show indicator on right side of target
      // If dragging from right to left, always show indicator on left side of target
      const side = draggedIndex < targetIndex ? 'right' : 'left';

      // Update both ref (immediate) and state (for rendering)
      lastColumnDropTarget.current = { columnId, side };
      setDragOverColumnId(columnId);
      setColumnDropSide(side);
    }
  };

  const handleColumnDragLeave = () => {
    lastColumnDropTarget.current = null;
    setDragOverColumnId(null);
    setColumnDropSide(null);
  };

  const handleColumnDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent card drop handler from firing

    const draggedId = draggedColumnId;

    if (!draggedId || draggedId === targetColumnId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      setColumnDropSide(null);
      lastColumnDropTarget.current = null;
      return;
    }

    console.log('🔄 Reordering column:', { from: draggedId, to: targetColumnId });

    // Clear drag states immediately
    setDraggedColumnId(null);
    setDragOverColumnId(null);
    setColumnDropSide(null);
    lastColumnDropTarget.current = null;

    // Get sorted columns
    const sortedColumns = [...workflowColumns].sort((a, b) => a.column_order - b.column_order);

    // Find indices
    const draggedIndex = sortedColumns.findIndex(c => c.id === draggedId);
    const targetIndex = sortedColumns.findIndex(c => c.id === targetColumnId);

    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Calculate what the positions will be after reorder
    const draggedElement = columnRefs.current.get(draggedId);
    const targetElement = columnRefs.current.get(targetColumnId);

    if (!draggedElement || !targetElement) return;

    // Calculate the distance to move
    const draggedRect = draggedElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Determine animation direction and distance
    const isMovingRight = draggedIndex < targetIndex;

    // Get all columns that need to slide
    const columnsToAnimate: { element: HTMLDivElement; distance: number }[] = [];

    if (isMovingRight) {
      // Dragged column moves right, columns in between slide left
      const columnWidth = draggedRect.width + 16; // 16px is gap-4

      // Animate dragged column to the right
      columnsToAnimate.push({
        element: draggedElement,
        distance: (targetIndex - draggedIndex) * columnWidth
      });

      // Animate columns in between to the left
      for (let i = draggedIndex + 1; i <= targetIndex; i++) {
        const col = sortedColumns[i];
        if (col) {
          const el = columnRefs.current.get(col.id);
          if (el) {
            columnsToAnimate.push({
              element: el,
              distance: -columnWidth
            });
          }
        }
      }
    } else {
      // Dragged column moves left, columns in between slide right
      const columnWidth = draggedRect.width + 16; // 16px is gap-4

      // Animate dragged column to the left
      columnsToAnimate.push({
        element: draggedElement,
        distance: (targetIndex - draggedIndex) * columnWidth
      });

      // Animate columns in between to the right
      for (let i = targetIndex; i < draggedIndex; i++) {
        const col = sortedColumns[i];
        if (col) {
          const el = columnRefs.current.get(col.id);
          if (el) {
            columnsToAnimate.push({
              element: el,
              distance: columnWidth
            });
          }
        }
      }
    }

    // Reorder array
    const reordered = [...sortedColumns];
    const [removed] = reordered.splice(draggedIndex, 1);
    if (removed) {
      reordered.splice(targetIndex, 0, removed);
    }

    // Prepare database updates
    const updates = reordered.map((column, index) => ({
      id: column.id,
      order: index + 1
    }));

    // Set animating flag
    isAnimatingRef.current = true;

    // Start all animations simultaneously
    columnsToAnimate.forEach(({ element, distance }) => {
      animate(element, {
        translateX: distance,
        duration: 200,
        easing: 'easeOutQuad'
      });
    });

    // Wait for animation to complete first
    await new Promise(resolve => setTimeout(resolve, 200));

    // Clear all transforms before database update
    columnsToAnimate.forEach(({ element }) => {
      element.style.transform = '';
    });

    // Clear animating flag
    isAnimatingRef.current = false;

    // Now update database - this will trigger store update
    updates.forEach(({ id, order }) => {
      updateWorkflowColumn({ id, updates: { column_order: order } });
    });
  };

  const getProjectsByStatus = (status: string) => {
    return projects
      .filter(p => p.workflow_status === status)
      .sort((a, b) => {
        // Sort by board_order, putting null values at the end
        if (a.board_order === null) return 1;
        if (b.board_order === null) return -1;
        return (a.board_order || 0) - (b.board_order || 0);
      });
  };

  const getPriorityColor = (priority?: ProjectPriority | null) => {
    switch (priority) {
      case 'Highest':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'Lowest':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };


  const handleStartEditColumn = (columnId: string, currentName: string) => {
    setEditingColumn(columnId);
    setEditingColumnName(currentName);
  };

  const handleSaveColumnName = (columnId: string) => {
    if (!editingColumnName.trim()) return;

    const oldName = workflowColumns.find(c => c.id === columnId)?.name;
    updateWorkflowColumn({ id: columnId, updates: { name: editingColumnName } });

    if (oldName) {
      const projectsToUpdate = projects.filter(p => p.workflow_status === oldName);
      for (const project of projectsToUpdate) {
        updateProject({ id: project.id, updates: { workflow_status: editingColumnName } });
      }
    }

    setEditingColumn(null);
    setEditingColumnName('');
  };

  const handleDeleteColumn = (columnId: string) => {
    console.log('🗑️ handleDeleteColumn called for columnId:', columnId);
    const column = workflowColumns.find(c => c.id === columnId);
    console.log('📋 Column found:', column);
    const projectsInColumn = column ? getProjectsByStatus(column.name).length : 0;

    if (projectsInColumn > 0) {
      console.log('⚠️ Cannot delete - column has projects:', projectsInColumn);
      alert(`Cannot delete column with ${projectsInColumn} project${projectsInColumn > 1 ? 's' : ''}. Move or delete projects first.`);
      return;
    }

    console.log('✅ Calling deleteWorkflowColumn...');
    deleteWorkflowColumn(columnId);
    console.log('✅ deleteWorkflowColumn called');
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;

    const maxOrder = Math.max(...workflowColumns.map(c => c.column_order), -1);
    const randomColor = COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)]?.value;

    createWorkflowColumn({
      name: newColumnName,
      color: randomColor as any,
      column_order: maxOrder + 1,
      is_default: false
    });

    setIsAddingColumn(false);
    setNewColumnName('');
  };

  const handleChangeColumnColor = (columnId: string, color: string) => {
    updateWorkflowColumn({ id: columnId, updates: { color } });
  };

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  // const getAvatarColor = (projectId: string) => {
  //   const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  //   return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  // };

  return (
    <PageContent
      title="Project Board"
      subtitle="Visualize and manage your project workflow stages"
      showPageHeader={true}
    >
      {workflowColumns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No workflow columns found. Run the migration to create default columns.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 pl-2 flex-1 min-h-0">
          {workflowColumns
            .sort((a, b) => a.column_order - b.column_order)
            .map(column => {
              const columnProjects = getProjectsByStatus(column.name);
              const isEditing = editingColumn === column.id;
              const isCollapsed = collapsedColumns.has(column.id);

              return (
                <div
                  key={column.id}
                  ref={(el) => {
                    if (el) {
                      columnRefs.current.set(column.id, el);
                    } else {
                      columnRefs.current.delete(column.id);
                    }
                  }}
                  className="flex flex-col gap-1 relative"
                  style={isAnimatingRef.current ? { willChange: 'transform' } : undefined}
                  onDragOver={(e) => handleColumnDragOver(e, column.id)}
                  onDragLeave={handleColumnDragLeave}
                  onDrop={(e) => handleColumnDrop(e, column.id)}
                >
                  {/* Drop indicator - left side */}
                  {dragOverColumnId === column.id && columnDropSide === 'left' && (
                    <div className="absolute -left-2 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
                  )}

                  {/* Drop indicator - right side */}
                  {dragOverColumnId === column.id && columnDropSide === 'right' && (
                    <div className="absolute -right-2 top-0 bottom-0 w-0.5 bg-blue-500 z-10" />
                  )}

                  <div
                    className={`flex-shrink-0 transition-all duration-300 ease-in-out rounded-lg overflow-hidden flex flex-col max-h-[calc(100vh-10rem)] ${
                      isCollapsed ? 'w-12' : 'w-72'
                    } ${draggedColumnId === column.id ? 'opacity-40 bg-gray-200 border-2 border-dashed border-gray-400' : 'bg-gray-50'} ${
                      dragOverColumn === column.name && !draggedColumnId ? 'ring-2 ring-blue-400 bg-blue-50/50' : ''
                    }`}
                    onDragOver={(e) => handleDragOver(e, column.name)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, column.name)}
                  >
                  {/* Colored Banner */}
                  <div
                    className="h-1.5 rounded-t-lg flex-shrink-0"
                    style={{ backgroundColor: column.color }}
                  />
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between px-2 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {!isCollapsed && (
                        <button
                          onClick={() => toggleColumnCollapse(column.id)}
                          className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                        >
                          <CaretDownIcon className="w-4 h-4 text-gray-500" />
                        </button>
                      )}

                      {!isCollapsed && (
                        <>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="w-4 h-4 rounded-full flex-shrink-0 hover:ring-2 ring-offset-1 ring-gray-300 transition-all"
                                style={{ backgroundColor: column.color }}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                              <div className="grid grid-cols-5 gap-2">
                                {COLUMN_COLORS.map((color) => (
                                  <button
                                    key={color.value}
                                    onClick={() => handleChangeColumnColor(column.id, color.value)}
                                    className="w-8 h-8 rounded-full hover:scale-110 transition-transform flex items-center justify-center"
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                  >
                                    {column.color === color.value && <CheckIcon className="w-4 h-4 text-white" />}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          {/* Drag handle */}
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleColumnDragStart(e, column.id);
                            }}
                            className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing"
                            title="Drag to reorder column"
                          >
                            <DragIcon className="w-4 h-4 text-gray-400" />
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-1 flex-1">
                              <Input
                                value={editingColumnName}
                                onChange={(e) => setEditingColumnName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveColumnName(column.id);
                                  if (e.key === 'Escape') setEditingColumn(null);
                                }}
                                className="h-7 text-sm font-medium"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveColumnName(column.id)}
                                className="p-1 hover:bg-green-100 rounded text-green-600"
                              >
                                <CheckIcon className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingColumn(null)}
                                className="p-1 hover:bg-red-100 rounded text-red-600"
                              >
                                <XIcon className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h3 className="font-medium text-gray-900 text-sm truncate">
                                  {column.name}
                                </h3>
                              </div>
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 font-normal shrink-0">
                                {columnProjects.length}
                              </Badge>
                            </>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-gray-100 rounded ml-auto">
                                <DotsThreeVerticalIcon className="w-4 h-4 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleStartEditColumn(column.id, column.name)}
                                className="flex items-center gap-2"
                              >
                                <PencilSimpleIcon className="w-4 h-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteColumn(column.id)}
                                className="flex items-center gap-2 text-red-600 focus:text-red-600"
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}

                      {isCollapsed && (
                        <div className="flex flex-col items-center gap-2 py-4 w-full">
                          <button
                            onClick={() => toggleColumnCollapse(column.id)}
                            className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                          >
                            <CaretRightIcon className="w-4 h-4 text-gray-500" />
                          </button>
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                            style={{ backgroundColor: column.color }}
                          />
                          <div
                            className="text-xs font-medium text-gray-900 whitespace-nowrap cursor-pointer flex-shrink-0 mt-2"
                            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                            onClick={() => toggleColumnCollapse(column.id)}
                          >
                            {column.name}
                          </div>
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 flex-shrink-0">
                            {columnProjects.length}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column Cards */}
                  {!isCollapsed && (
                    <div
                      className="space-y-1.5 px-2 pb-2 flex-1 overflow-y-auto min-h-[120px]"
                      onDragOver={(e) => {
                        // Only handle at container level if empty, otherwise cards handle it
                        if (columnProjects.length === 0) {
                          handleDragOver(e, column.name);
                        } else {
                          // For non-empty columns, just prevent default and track column
                          e.preventDefault();
                          setDragOverColumn(column.name);
                        }
                      }}
                      onDragLeave={() => {
                        if (columnProjects.length === 0) {
                          handleDragLeave();
                        }
                      }}
                      onDrop={(e) => {
                        handleDrop(e, column.name);
                      }}
                    >
                      {columnProjects.map((project) => {
                        const proposal = project.proposal;

                        // Get data from proposal
                        const projectName = proposal?.project_name || 'Untitled Project';
                        const proposalNumber = proposal?.proposal_number || '';
                        const clientName = proposal?.client_name || '';
                        const clientCompany = proposal?.client_company || '';
                        const clientAddress = proposal?.job_location || '';

                        return (
                          <div key={project.id} className="relative">
                            {/* Drop indicator above card */}
                            {dragOverCard === project.id && draggedProject !== project.id && (
                              <div className="h-0.5 bg-blue-500 rounded-full mb-2" />
                            )}
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, project.id)}
                              onDragOver={(e) => handleCardDragOver(e, project.id)}
                              onDragLeave={handleCardDragLeave}
                              onMouseDown={(e) => {
                                // Prevent column drag when clicking on card
                                e.stopPropagation();
                              }}
                              onClick={() => openProjectOverlay(project)}
                              className={`bg-white rounded-lg border border-gray-200 p-2.5 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col min-h-[120px] relative ${
                                draggedProject === project.id ? 'opacity-50' : ''
                              }`}
                            >
                            {/* 3 Dots Menu - Top Right */}
                            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-0.5 hover:bg-gray-100 rounded">
                                    <DotsThreeVerticalIcon className="w-3.5 h-3.5 text-gray-400" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-red-600 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteProjectDialog({ open: true, project });
                                    }}
                                  >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Card Header */}
                            <div className="flex-1 min-w-0 pr-6 mb-2">
                              <h4 className="font-medium text-gray-900 text-sm line-clamp-1 mb-1">
                                {projectName}
                              </h4>
                              <p className="text-xs text-gray-600 truncate">
                                {clientName}
                              </p>
                              {clientCompany && (
                                <p className="text-xs text-gray-500 truncate">
                                  {clientCompany}
                                </p>
                              )}
                              {clientAddress && clientAddress !== '-' && clientAddress !== 'N/A' && clientAddress !== 'Unknown' && (
                                <div className="flex items-center gap-1 text-[0.65rem] mt-0.5">
                                  <MapPinIcon className="w-3 h-3 flex-shrink-0 text-gray-400" />
                                  <p className="truncate text-gray-400">{clientAddress}</p>
                                </div>
                              )}
                            </div>

                            {/* Card Metadata - Footer */}
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
                              {/* Left Side - Proposal # and Values */}
                              <div className="flex items-center gap-2">
                                {proposalNumber && (
                                  <div className="flex items-center gap-1">
                                    <HashIcon className="w-3 h-3" />
                                    <span>{proposalNumber}</span>
                                  </div>
                                )}

                                {/* Priority Badge (only when set) */}
                                {project.priority && (
                                  <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className={`text-[10px] px-2 py-0.5 rounded-full border ${getPriorityColor(project.priority)} capitalize font-medium cursor-pointer hover:opacity-80`}>
                                        {project.priority}
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-2" align="start" onClick={(e) => e.stopPropagation()}>
                                      <div className="space-y-1">
                                        {(['Highest', 'High', 'Medium', 'Low', 'Lowest'] as ProjectPriority[]).map((priority) => (
                                          <button
                                            key={priority}
                                            onClick={() => updateProject({ id: project.id, updates: { priority } })}
                                            className={`w-full text-left px-2 py-1 text-xs rounded capitalize border ${getPriorityColor(priority)} hover:opacity-80`}
                                          >
                                            {priority}
                                          </button>
                                        ))}
                                        <button
                                          onClick={() => updateProject({ id: project.id, updates: { priority: null } })}
                                          className="w-full text-left px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                        >
                                          Clear Priority
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}

                                {/* Completion Date (only when set) */}
                                {project.completion_date && (
                                  <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className="flex items-center gap-1 text-purple-600 cursor-pointer hover:opacity-80">
                                        <CalendarIcon className="w-3 h-3" />
                                        <span>{formatLocalDate(project.completion_date)}</span>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="start" onClick={(e) => e.stopPropagation()}>
                                      <div className="space-y-2">
                                        <Input
                                          type="date"
                                          value={project.completion_date || ''}
                                          onChange={(e) => updateProject({ id: project.id, updates: { completion_date: e.target.value } })}
                                          className="text-sm"
                                        />
                                        <button
                                          onClick={() => updateProject({ id: project.id, updates: { completion_date: null } })}
                                          className="w-full px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                        >
                                          Clear Date
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>

                              {/* Right Side - Icon Buttons (only when NOT set) */}
                              <div className="flex items-center gap-1.5">
                                {!project.priority && (
                                  <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className="flex items-center text-gray-400 hover:text-gray-600 transition-colors p-0.5" title="Set Priority">
                                        <FlagIcon className="w-3.5 h-3.5" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-2" align="end" onClick={(e) => e.stopPropagation()}>
                                      <div className="space-y-1">
                                        {(['Highest', 'High', 'Medium', 'Low', 'Lowest'] as ProjectPriority[]).map((priority) => (
                                          <button
                                            key={priority}
                                            onClick={() => updateProject({ id: project.id, updates: { priority } })}
                                            className={`w-full text-left px-2 py-1 text-xs rounded capitalize border ${getPriorityColor(priority)} hover:opacity-80`}
                                          >
                                            {priority}
                                          </button>
                                        ))}
                                        <button
                                          onClick={() => updateProject({ id: project.id, updates: { priority: null } })}
                                          className="w-full text-left px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                        >
                                          Clear Priority
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}

                                {!project.completion_date && (
                                  <Popover>
                                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                      <button className="flex items-center text-gray-400 hover:text-gray-600 transition-colors p-0.5" title="Set Due Date">
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="end" onClick={(e) => e.stopPropagation()}>
                                      <Input
                                        type="date"
                                        value={project.completion_date || ''}
                                        onChange={(e) => updateProject({ id: project.id, updates: { completion_date: e.target.value } })}
                                        className="text-sm"
                                        autoFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                )}
                              </div>
                            </div>
                          </div>
                          </div>
                        );
                      })}

                      {/* Drop zone at the end of column - only show when column has cards */}
                      {columnProjects.length > 0 && draggedProject && dragOverColumn === column.name && !dragOverCard && (
                        <div className="h-0.5 bg-blue-500 rounded-full mt-2" />
                      )}

                      {/* Empty state message - only show when not dragging */}
                      {columnProjects.length === 0 && !draggedProject && (
                        <div className="text-center py-8 text-gray-400 text-sm">
                          Drop cards here
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}

          {/* Add New Column */}
          {isAddingColumn ? (
            <div className="flex-shrink-0 w-72 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') setIsAddingColumn(false);
                  }}
                  placeholder="Column name..."
                  className="h-8 text-sm flex-1"
                  autoFocus
                />
                <button
                  onClick={handleAddColumn}
                  className="p-1.5 hover:bg-green-100 rounded text-green-600 flex-shrink-0"
                >
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsAddingColumn(false)}
                  className="p-1.5 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-72">
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-gray-400"
              >
                <PlusIcon className="w-4 h-4" />
                Add Column
              </button>
            </div>
          )}
        </div>
      )}

      {/* Project Sidebar Overlay */}
      {selectedProject && (
        <ProjectBoardOverlay
          project={selectedProject}
          organizationId={organizationId}
          attachments={attachments}
          onClose={closeProjectOverlay}
          onUpdate={(projectId, updates) => updateProject({ id: projectId, updates })}
          onAttachmentsChange={refetchAttachments}
          canManagePayments={canManagePayments}
        />
      )}

      {/* Delete Project Confirmation Dialog */}
      <ProjectDeleteDialog
        open={deleteProjectDialog.open}
        onOpenChange={(open) => setDeleteProjectDialog({ open, project: open ? deleteProjectDialog.project : null })}
        onConfirm={() => {
          if (deleteProjectDialog.project) {
            deleteProject(deleteProjectDialog.project.id);
            setDeleteProjectDialog({ open: false, project: null });
          }
        }}
        projectName={deleteProjectDialog.project?.proposal?.project_name || 'Untitled Project'}
        proposalNumber={deleteProjectDialog.project?.proposal?.proposal_number ?? undefined}
      />
    </PageContent>
  );
}
