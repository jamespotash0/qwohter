// Wall Actions Section - Wall management operations
// Contains add, remove, rename, and duplicate actions

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, Copy, Check, X } from 'lucide-react';

interface WallActionsProps {
  wallName: string;
  isEditing: boolean;
  newWallName: string;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveNewName: () => void;
  onNewNameChange: (name: string) => void;
  onRemoveWall: () => void;
  onDuplicateWall: () => void;
  disabled?: boolean;
}

export const WallActions: React.FC<WallActionsProps> = ({
  wallName,
  isEditing,
  newWallName,
  onStartEditing,
  onCancelEditing,
  onSaveNewName,
  onNewNameChange,
  onRemoveWall,
  onDuplicateWall,
  disabled = false
}) => {
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveNewName();
    } else if (e.key === 'Escape') {
      onCancelEditing();
    }
  };

  return (
    <div className="flex items-center gap-2">
      
      {/* Wall Name Display/Edit */}
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={newWallName}
            onChange={(e) => onNewNameChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter wall name"
            className="flex-1 h-8"
            autoFocus
            disabled={disabled}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={onSaveNewName}
            disabled={!newWallName || newWallName === wallName || disabled}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onCancelEditing}
            disabled={disabled}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1">
          <span className="font-medium text-foreground">{wallName}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onStartEditing}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Rename wall"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Action Buttons */}
      {!isEditing && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onDuplicateWall}
            disabled={disabled}
            className="h-8 w-8 p-0"
            title="Duplicate wall"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemoveWall}
            disabled={disabled}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
            title="Remove wall"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      
    </div>
  );
};