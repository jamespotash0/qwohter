import { useEffect, useState } from 'react';
import { PageContent } from '@/components/common/layout';
import { useBoardStore, Project, ProjectPriority } from '@/stores/board/boardStore';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus as PlusIcon,
  DotsThreeVertical as DotsThreeVerticalIcon,
  Trash as TrashIcon,
  CaretDown as CaretDownIcon,
  CaretRight as CaretRightIcon,
  PencilSimple as PencilSimpleIcon,
  MapPin as MapPinIcon,
  CurrencyDollar as CurrencyDollarIcon,
  Hash as HashIcon,
  X as XIcon,
  Check as CheckIcon,
  Flag as FlagIcon,
  Calendar as CalendarIcon
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateEST } from '@/utils/dateUtils';

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

// const AVATAR_COLORS = [
//   '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
//   '#DFE6E9', '#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E'
// ];

export default function Board() {
  const {
    projects,
    workflowColumns,
    updateProject,
    updateWorkflowColumn,
    deleteWorkflowColumn,
    createWorkflowColumn,
    deleteProject,
    isLoading,
    initializeBoard,
    subscribeToChanges
  } = useBoardStore();

  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('before');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    // Initialize board data (only fetches once)
    initializeBoard();

    // Get organization ID for subscriptions
    const getOrgIdAndSubscribe = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return undefined;

      const { data: membership } = await supabase
        .from('memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        // Subscribe to real-time changes
        const unsubscribe = subscribeToChanges(membership.organization_id);
        return unsubscribe;
      }
      return undefined;
    };

    const subscriptionPromise = getOrgIdAndSubscribe();

    // Cleanup subscriptions on unmount
    return () => {
      subscriptionPromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [initializeBoard, subscribeToChanges]);

  const handleDragStart = async (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId);
    e.dataTransfer.effectAllowed = 'move';

    // Set board_order to null when picking up the card
    await updateProject(projectId, { board_order: null as any });
  };

  const handleDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnName);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
    setDragOverCard(null);
  };

  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();

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

    if (!draggedProject) return;

    const sourceProject = projects.find(p => p.id === draggedProject);
    if (!sourceProject) return;

    const isSameColumn = sourceProject.workflow_status === targetStatus;

    // STEP 1: Get all projects in target column with non-null board_order
    // (dragged card already has null board_order from handleDragStart)
    let cardsInTargetColumn = getProjectsByStatus(targetStatus)
      .filter(p => p.board_order !== null) // Only cards with valid positions
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
        .filter(p => p.board_order !== null) // Only cards with valid positions (dragged card is null)
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
      await updateProject(id, projectUpdates);
    }

    setDraggedProject(null);
    setDragOverColumn(null);
    setDragOverCard(null);
    setDropPosition('before');
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

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority?: ProjectPriority) => {
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

  const handleSaveColumnName = async (columnId: string) => {
    if (!editingColumnName.trim()) return;

    const oldName = workflowColumns.find(c => c.id === columnId)?.name;
    await updateWorkflowColumn(columnId, { name: editingColumnName });

    if (oldName) {
      const projectsToUpdate = projects.filter(p => p.workflow_status === oldName);
      for (const project of projectsToUpdate) {
        await updateProject(project.id, { workflow_status: editingColumnName });
      }
    }

    setEditingColumn(null);
    setEditingColumnName('');
  };

  const handleDeleteColumn = async (columnId: string) => {
    const column = workflowColumns.find(c => c.id === columnId);
    const projectsInColumn = column ? getProjectsByStatus(column.name).length : 0;

    if (projectsInColumn > 0) {
      alert(`Cannot delete column with ${projectsInColumn} project${projectsInColumn > 1 ? 's' : ''}. Move or delete projects first.`);
      return;
    }

    await deleteWorkflowColumn(columnId);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;

    const maxOrder = Math.max(...workflowColumns.map(c => c.column_order), -1);
    const randomColor = COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)]?.value;

    await createWorkflowColumn({
      name: newColumnName,
      color: randomColor as any,
      column_order: maxOrder + 1,
      is_default: false
    });

    setIsAddingColumn(false);
    setNewColumnName('');
  };

  const handleChangeColumnColor = async (columnId: string, color: string) => {
    await updateWorkflowColumn(columnId, { color });
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
      showPageHeader={true}
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <div className="text-gray-500 font-medium">Loading projects...</div>
        </div>
      ) : workflowColumns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No workflow columns found. Run the migration to create default columns.</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2 pl-2 h-[calc(100vh-10rem)]">
          {workflowColumns
            .sort((a, b) => a.column_order - b.column_order)
            .map(column => {
              const columnProjects = getProjectsByStatus(column.name);
              const isEditing = editingColumn === column.id;
              const isCollapsed = collapsedColumns.has(column.id);

              return (
                <div
                  key={column.id}
                  className={`flex-shrink-0 transition-all duration-200 bg-gray-50 rounded-lg flex flex-col h-full ${
                    isCollapsed ? 'w-12' : 'w-72'
                  } ${dragOverColumn === column.name ? 'ring-2 ring-blue-400 bg-blue-50 p-2' : 'p-0'}`}
                  onDragOver={(e) => handleDragOver(e, column.name)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.name)}
                >
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
                              <h3 className="font-medium text-gray-900 text-sm truncate">
                                {column.name}
                              </h3>
                              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 font-normal">
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
                      className="space-y-2 px-2 pb-2 flex-1 overflow-y-auto min-h-[100px]"
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
                        const quote = project.quotes;
                        const clientName = quote?.job_details?.client_name || 'No Client';
                        const clientCompany = quote?.job_details?.client_company || '';
                        const clientAddress = quote?.job_details?.client_address || '';
                        // const jobLocation = quote?.job_details?.job_location || '';
                        const total = quote?.price_details?.grand_total;
                        // const avatarColor = getAvatarColor(project.id);

                        return (
                          <div key={project.id} className="relative">
                            {/* Drop indicator above card */}
                            {dragOverCard === project.id && draggedProject !== project.id && (
                              <div className="h-0.5 bg-blue-500 rounded-full mb-2 shadow-sm relative">
                                <div className="absolute -top-1 left-0 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                <div className="absolute -top-1 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              </div>
                            )}
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, project.id)}
                              onDragOver={(e) => handleCardDragOver(e, project.id)}
                              onDragLeave={handleCardDragLeave}
                              onClick={() => setSelectedProject(project)}
                              className={`bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col h-36 relative ${
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
                                      deleteProject(project.id);
                                    }}
                                  >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Card Header */}
                            <div className="flex-1 min-w-0 pr-6">
                              <h4 className="font-medium text-gray-900 text-sm line-clamp-1 mb-1">
                                {quote?.project_name || 'Untitled Project'}
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
                                <div className="flex items-center gap-1 text-[0.65rem]">
                                  <MapPinIcon className="w-3 h-3 flex-shrink-0 text-gray-400" />
                                  <p className="truncate text-gray-400">{clientAddress}</p>
                                </div>
                              )}
                            </div>

                            {/* Card Metadata - Footer */}
                            <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-3 border-t border-gray-100">
                              {/* Left Side - Quote # and Values */}
                              <div className="flex items-center gap-2">
                                {quote?.proposal_number && (
                                  <div className="flex items-center gap-1">
                                    <HashIcon className="w-3 h-3" />
                                    <span>{quote.proposal_number}</span>
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
                                            onClick={() => updateProject(project.id, { priority })}
                                            className={`w-full text-left px-2 py-1 text-xs rounded capitalize border ${getPriorityColor(priority)} hover:opacity-80`}
                                          >
                                            {priority}
                                          </button>
                                        ))}
                                        <button
                                          onClick={() => updateProject(project.id, { priority: undefined })}
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
                                        <span>{formatDateEST(project.completion_date)}</span>
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="start" onClick={(e) => e.stopPropagation()}>
                                      <div className="space-y-2">
                                        <Input
                                          type="date"
                                          value={project.completion_date || ''}
                                          onChange={(e) => updateProject(project.id, { completion_date: e.target.value })}
                                          className="text-sm"
                                        />
                                        <button
                                          onClick={() => updateProject(project.id, { completion_date: undefined })}
                                          className="w-full px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                        >
                                          Clear Date
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )}

                                {total && (
                                  <div className="flex items-center gap-1">
                                    <CurrencyDollarIcon className="w-3 h-3" />
                                    <span>{formatCurrency(total)}</span>
                                  </div>
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
                                            onClick={() => updateProject(project.id, { priority })}
                                            className={`w-full text-left px-2 py-1 text-xs rounded capitalize border ${getPriorityColor(priority)} hover:opacity-80`}
                                          >
                                            {priority}
                                          </button>
                                        ))}
                                        <button
                                          onClick={() => updateProject(project.id, { priority: undefined })}
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
                                        onChange={(e) => updateProject(project.id, { completion_date: e.target.value })}
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
                        <div className="h-0.5 bg-blue-500 rounded-full mt-2 shadow-sm relative">
                          <div className="absolute -top-1 left-0 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <div className="absolute -top-1 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        </div>
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
              );
            })}

          {/* Add New Column */}
          {isAddingColumn ? (
            <div className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-3">
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
            <div className="flex-shrink-0 w-80">
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-50 px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-gray-400"
              >
                <PlusIcon className="w-4 h-4" />
                Add Column
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quote Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {selectedProject?.quotes?.project_name || 'Project Details'}
            </DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Proposal Number</p>
                  <p className="font-medium">{selectedProject.quotes?.proposal_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant="secondary">{selectedProject.workflow_status}</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Priority</p>
                  <select
                    value={selectedProject.priority || ''}
                    onChange={(e) => updateProject(selectedProject.id, { priority: e.target.value as ProjectPriority || undefined })}
                    className={`w-full text-sm px-2 py-1 rounded border ${getPriorityColor(selectedProject.priority)} font-medium capitalize`}
                  >
                    <option value="">None</option>
                    <option value="Lowest">Lowest</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Highest">Highest</option>
                  </select>
                </div>
              </div>

              {/* Completion Date */}
              <div>
                <label className="text-sm text-gray-600 block mb-2">Completion Date</label>
                <Input
                  type="date"
                  value={selectedProject.completion_date || ''}
                  onChange={(e) => updateProject(selectedProject.id, { completion_date: e.target.value })}
                  className="max-w-xs"
                />
              </div>

              {/* Client & Job Details */}
              {selectedProject.quotes?.job_details && (
                <div>
                  <h3 className="font-semibold mb-3">Client & Job Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Client Name</p>
                      <p className="font-medium">{selectedProject.quotes.job_details.client_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="font-medium">{selectedProject.quotes.job_details.client_company || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="font-medium">{selectedProject.quotes.job_details.job_location || 'N/A'}</p>
                    </div>
                    {selectedProject.quotes.job_details.client_address && (
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">{selectedProject.quotes.job_details.client_address}</p>
                      </div>
                    )}
                    {selectedProject.quotes.job_details.date && (
                      <div>
                        <p className="text-sm text-gray-600">Date</p>
                        <p className="font-medium">{selectedProject.quotes.job_details.date}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price Details */}
              {selectedProject.quotes?.price_details && (
                <div>
                  <h3 className="font-semibold mb-3">Pricing</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">{formatCurrency(selectedProject.quotes.price_details.subtotal)}</span>
                    </div>
                    {selectedProject.quotes.price_details.tax && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-medium">{formatCurrency(selectedProject.quotes.price_details.tax)}</span>
                      </div>
                    )}
                    {selectedProject.quotes.price_details.discount && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span className="font-medium">-{formatCurrency(selectedProject.quotes.price_details.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(selectedProject.quotes.price_details.grand_total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContent>
  );
}
