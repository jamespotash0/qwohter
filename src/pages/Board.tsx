import { useEffect, useState } from 'react';
import { PageContent } from '@/components/common/layout';
import { useBoardStore } from '@/stores/board/boardStore';
import {
  Plus,
  MoreVertical,
  Trash2,
  ChevronDown,
  ChevronRight,
  Pencil,
  MapPin,
  DollarSign,
  Hash,
  X,
  Check
} from 'lucide-react';
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

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DFE6E9', '#74B9FF', '#A29BFE', '#FD79A8', '#FDCB6E'
];

export default function Board() {
  const {
    projects,
    workflowColumns,
    fetchProjects,
    fetchWorkflowColumns,
    updateProject,
    updateWorkflowColumn,
    deleteWorkflowColumn,
    createWorkflowColumn,
    deleteProject,
    isLoading
  } = useBoardStore();

  const [draggedProject, setDraggedProject] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverCard, setDragOverCard] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProjects();
    fetchWorkflowColumns();
  }, [fetchProjects, fetchWorkflowColumns]);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    setDraggedProject(projectId);
    e.dataTransfer.effectAllowed = 'move';
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
    setDragOverCard(cardId);
  };

  const handleCardDragLeave = () => {
    setDragOverCard(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (draggedProject && draggedProject !== targetStatus) {
      await updateProject(draggedProject, { workflow_status: targetStatus });
    }
    setDraggedProject(null);
    setDragOverColumn(null);
    setDragOverCard(null);
  };

  const getProjectsByStatus = (status: string) => {
    return projects.filter(p => p.workflow_status === status);
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

  const getAvatarColor = (projectId: string) => {
    const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  };

  return (
    <PageContent
      title="Board"
      subtitle="Track and manage your project workflow"
      showPageHeader={true}
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading projects...</div>
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
                    isCollapsed ? 'w-12' : 'w-80'
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
                          <ChevronDown className="w-4 h-4 text-gray-500" />
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
                                    {column.color === color.value && <Check className="w-4 h-4 text-white" />}
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
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingColumn(null)}
                                className="p-1 hover:bg-red-100 rounded text-red-600"
                              >
                                <X className="w-3 h-3" />
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
                                <MoreVertical className="w-4 h-4 text-gray-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleStartEditColumn(column.id, column.name)}
                                className="flex items-center gap-2"
                              >
                                <Pencil className="w-4 h-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteColumn(column.id)}
                                className="flex items-center gap-2 text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
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
                            <ChevronRight className="w-4 h-4 text-gray-500" />
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
                    <div className="space-y-2 px-2 pb-2 flex-1 overflow-y-auto">
                      {columnProjects.map(project => {
                        const quote = project.quotes;
                        console.log('Project card data:', {
                          projectId: project.id,
                          quoteId: project.quote_id,
                          quote: quote,
                          quote_details: quote?.quote_details,
                          job_details: quote?.job_details,
                          price_details: quote?.price_details
                        });
                        const clientName = quote?.quote_details?.client_name || 'No Client';
                        const jobLocation = quote?.job_details?.job_location || '';
                        const total = quote?.price_details?.grand_total;
                        const avatarColor = getAvatarColor(project.id);

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
                              className={`bg-white rounded-lg border border-gray-200 p-3 cursor-move hover:shadow-md transition-all duration-200 flex flex-col h-28 ${
                                draggedProject === project.id ? 'opacity-50' : ''
                              }`}
                            >
                            {/* Card Header */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                                {quote?.project_name || 'Untitled Project'}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {clientName}
                              </p>
                            </div>

                            {/* Card Metadata */}
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
                              {quote?.proposal_number && (
                                <div className="flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  <span>{quote.proposal_number}</span>
                                </div>
                              )}

                              {total && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span>{formatCurrency(total)}</span>
                                </div>
                              )}

                              {jobLocation && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                </div>
                              )}

                              <div className="ml-auto">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-0.5 hover:bg-gray-100 rounded">
                                      <MoreVertical className="w-3 h-3 text-gray-400" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => deleteProject(project.id)}
                                      className="flex items-center gap-2 text-red-600 focus:text-red-600 text-sm"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      Remove from Board
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                          </div>
                        );
                      })}
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
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsAddingColumn(false)}
                  className="p-1.5 hover:bg-red-100 rounded text-red-600 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-80">
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-gray-400"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            </div>
          )}
        </div>
      )}
    </PageContent>
  );
}
