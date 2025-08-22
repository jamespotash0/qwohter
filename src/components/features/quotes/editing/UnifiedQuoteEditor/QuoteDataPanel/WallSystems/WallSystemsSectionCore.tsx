import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { CollapsibleSection } from '../CollapsibleSection';
import { WallCard } from './WallCard';
import { WallSystemsSectionProps } from './types';
import { AddWallDialog } from '../../../WallSystemEditor/AddWallDialog';

export const WallSystemsSectionCore: React.FC<WallSystemsSectionProps> = ({
  data,
  onChange,
  isOpen,
  onToggle,
  onDatabaseSave,
  onUpdateWallSystem,
  onRemoveWallSystem
}) => {
  const [isAddWallDialogOpen, setIsAddWallDialogOpen] = useState(false);

  // Helper function to add a new wall (now opens dialog)
  const addWall = () => {
    setIsAddWallDialogOpen(true);
  };

  // Helper function to handle wall addition from dialog
  const handleAddWall = (wallName: string, wallData: any) => {
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [wallName]: wallData
      }
    };
    onChange('wall_details', updatedWalls);
  };

  // Helper function to remove a wall
  const removeWall = (wallName: string) => {
    const updatedWalls = { ...data.wall_details?.walls };
    delete updatedWalls[wallName];
    
    const newWallDetails = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: updatedWalls
    };
    onChange('wall_details', newWallDetails);
  };

  // Helper function to handle wall field changes
  const handleWallFieldChange = (wallName: string, field: string, value: any) => {
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [wallName]: {
          ...(data.wall_details?.walls?.[wallName] || {}),
          [field]: value
        }
      }
    };
    
    onChange('wall_details', updatedWalls);
  };

  // Debug current wall data
  // console.log('WallSystems: Current wall data:', data.wall_details?.walls);

  return (
    <CollapsibleSection
      title="Wall Systems"
      icon={<Square className="w-4 h-4 text-green-500" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-4">
        {Object.entries(data.wall_details?.walls || {}).map(([wallName, wall]) => (
          <WallCard
            key={wallName}
            wallName={wallName}
            wall={wall}
            onRemove={removeWall}
            onFieldChange={handleWallFieldChange}
            onDatabaseSave={onDatabaseSave}
            onUpdateWallSystem={onUpdateWallSystem}
            onRemoveWallSystem={onRemoveWallSystem}
          />
        ))}
        
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={addWall}
            data-testid="add-wall-button"
            className="w-full"
          >
            + Add Wall
          </Button>
        </div>
      </div>

      {/* Add Wall Dialog */}
      <AddWallDialog
        isOpen={isAddWallDialogOpen}
        onClose={() => setIsAddWallDialogOpen(false)}
        onSave={handleAddWall}
        onDatabaseSave={onDatabaseSave}
      />
    </CollapsibleSection>
  );
};