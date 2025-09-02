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
  const handleAddWall = async (wallName: string, wallData: any) => {
    console.log('🔄 Adding wall to wall_details JSON:', wallName, wallData);
    
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [wallName]: wallData
      }
    };
    
    console.log('🔄 Updated wall_details structure:', updatedWalls);
    onChange('wall_details', updatedWalls);
    
    // Wait for React state to propagate before saving to database
    if (onDatabaseSave) {
      try {
        console.log('🔄 Waiting for state to propagate, then saving to database...');
        // Use setTimeout to allow React state update to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        await onDatabaseSave();
        console.log('✅ Wall successfully saved to database');
      } catch (error) {
        console.error('❌ Error saving wall to database:', error);
        throw error; // Re-throw to be handled by AddWallDialog
      }
    } else {
      console.warn('⚠️ onDatabaseSave not available - wall saved to local state only');
    }
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
        existingWalls={data.wall_details?.walls || {}}
      />
    </CollapsibleSection>
  );
};