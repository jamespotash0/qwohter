import React from 'react';
import { Button } from '@/components/ui/button';
import { Square } from 'lucide-react';
import { CollapsibleSection } from '../CollapsibleSection';
import { WallCard } from './WallCard';
import { WallSystemsSectionProps } from './types';

export const WallSystemsSectionCore: React.FC<WallSystemsSectionProps> = ({
  data,
  onChange,
  isOpen,
  onToggle
}) => {
  // Helper function to add a new wall
  const addWall = () => {
    const wallsCount = Object.keys(data.wall_details?.walls || {}).length;
    const newWallName = `Wall ${wallsCount + 1}`;
    
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [newWallName]: {
          lengthFeet: '',
          lengthInches: '',
          heightFeet: '',
          heightInches: '',
          panelCount: '',
          quantity: '1',
          wallSystemType: '',
          // Operable Wall specific fields
          panelConfiguration: '',
          series: '',
          model: '',
          panelThickness: '',
          panelSkin: '',
          stcRating: '',
          panelFinishCategory: '',
          panelFinishItem: '',
          verticalSeals: '',
          bottomSeals: '',
          topSeals: '',
          closureSystem: '',
          endPanelType: '',
          passDoorPanels: '',
          trackType: '',
          trackSystem: '',
          // Glass Wall specific fields  
          glasswallModel: '',
          panelConfiguration_glasswall: '',
          operation: '',
          stcRating_glasswall: '',
          glassType: '',
          partitionSupport: '',
          frameThickness: '',
          panelWidth: '',
          panelFace: '',
          frameFinish: '',
          hingeType: '',
          trackType_glasswall: '',
          trackFinish: '',
          floorGuide: '',
          passDoorType: '',
          passDoorOption: '',
          finalClosure: '',
          bottomSeals_glasswall: '',
          topSeals_glasswall: ''
        }
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
            key={`${wallName}-${wall.wallSystemType}-${wall.glasswallModel}`}
            wallName={wallName}
            wall={wall}
            onRemove={removeWall}
            onFieldChange={handleWallFieldChange}
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
    </CollapsibleSection>
  );
};