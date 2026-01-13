import { useState } from 'react';
import { useFormBuilderStore } from '../store/formBuilderStore';
import { Plus, X, Check, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TabManager() {
  const {
    currentForm,
    uiState,
    addTab,
    updateTab,
    deleteTab,
    reorderTabs,
    setSelectedTab
  } = useFormBuilderStore();

  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [isAddingTab, setIsAddingTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  const handleAddTab = () => {
    setIsAddingTab(true);
    setNewTabName('');
  };

  const handleSaveNewTab = () => {
    if (!newTabName.trim()) return;

    addTab({
      name: newTabName,
      description: '',
      order: currentForm?.tabs.length || 0
    });

    setIsAddingTab(false);
    setNewTabName('');
  };

  const handleStartEdit = (tabId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTab(tabId);
    setEditingName(name);
  };

  const handleSaveEdit = () => {
    if (!editingName.trim() || !editingTab) return;

    updateTab(editingTab, { name: editingName });
    setEditingTab(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingTab(null);
    setEditingName('');
  };

  const handleDeleteTab = (tabId: string) => {
    deleteTab(tabId);
  };

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTab(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();

    if (draggedTab && draggedTab !== targetTabId && currentForm) {
      const tabs = [...currentForm.tabs];
      const draggedIndex = tabs.findIndex(t => t.id === draggedTab);
      const targetIndex = tabs.findIndex(t => t.id === targetTabId);

      const [removed] = tabs.splice(draggedIndex, 1);
      tabs.splice(targetIndex, 0, removed);

      const reorderedTabs = tabs.map((tab, index) => ({
        ...tab,
        order: index
      }));

      reorderTabs(reorderedTabs);
    }

    setDraggedTab(null);
  };

  const selectedTab = uiState.selectedTab || currentForm?.tabs[0]?.id;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
      {currentForm?.tabs
        .sort((a, b) => a.order - b.order)
        .map((tab) => (
          <div
            key={tab.id}
            draggable={editingTab !== tab.id}
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, tab.id)}
            className={`
              group flex items-center gap-2 px-3 py-2 rounded-t-lg
              transition-all duration-200 border-b-2 whitespace-nowrap
              ${selectedTab === tab.id
                ? 'bg-white text-blue-600 border-blue-600'
                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
              }
              ${draggedTab === tab.id ? 'opacity-50' : ''}
            `}
            onClick={() => editingTab !== tab.id && setSelectedTab(tab.id)}
          >
            {editingTab !== tab.id && (
              <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab" />
            )}

            {editingTab === tab.id ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="h-7 w-32 text-sm"
                  autoFocus
                />
                <button
                  onClick={handleSaveEdit}
                  className="p-1 hover:bg-green-100 rounded text-green-600"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <span
                  className="font-medium cursor-pointer"
                  onDoubleClick={(e) => handleStartEdit(tab.id, tab.name, e)}
                >
                  {tab.name}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {currentForm.tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTab(tab.id);
                      }}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

      {isAddingTab ? (
        <div className="flex items-center gap-1 px-3 py-2 bg-white rounded-t-lg border-b-2 border-blue-600">
          <Input
            value={newTabName}
            onChange={(e) => setNewTabName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveNewTab();
              if (e.key === 'Escape') setIsAddingTab(false);
            }}
            placeholder="Tab name..."
            className="h-7 w-32 text-sm"
            autoFocus
          />
          <button
            onClick={handleSaveNewTab}
            className="p-1 hover:bg-green-100 rounded text-green-600"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsAddingTab(false)}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddTab}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Tab
        </Button>
      )}
    </div>
  );
}
