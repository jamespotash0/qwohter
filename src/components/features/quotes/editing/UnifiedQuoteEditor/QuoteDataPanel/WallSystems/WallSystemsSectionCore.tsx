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
          wallSystemType: '',
          lengthFeet: '',
          lengthInches: '',
          heightFeet: '',
          heightInches: '',
          quantity: '1',
          panelConfiguration: '',
          panelCount: '',
          series: '',
          model: '',
          panelThickness: '',
          panelDesign: '',
          panelSkin: '',
          stcRating: '',
          passDoorPanels: '',
          passDoorQuantity: '',
          panelFinishCategory: '',
          panelFinishSpecificItem: '',
          verticalSeals: '',
          bottomSeals: '',
          topSeals: '',
          initialClosureSystem: '',
          endPanelType: '',
          trackType: '',
          trackSystem: '',
          // Per-wall configurations
          structureSupport: '',
          pocketDoors: {
            foldType: '',
            foldStyle: ''
          },
          // Glass Wall specific fields
          glasswallModel: '',
          glasswallOperation: '',
          glasswallPanelConfiguration: '',
          glasswallPanelFace: '',
          glasswallFrameFinish: '',
          glasswallGlassType: '',
          glasswallSTCRating: '',
          glasswallPartitionSupport: '',
          glasswallPassDoorType: '',
          glasswallPassDoorOption: '',
          glasswallHingeType: '',
          glasswallFrameThickness: '',
          glasswallTrackType: '',
          glasswallTrackFinish: '',
          glasswallFinalClosure: '',
          glasswallBottomSeals: '',
          glasswallTopSeals: ''
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