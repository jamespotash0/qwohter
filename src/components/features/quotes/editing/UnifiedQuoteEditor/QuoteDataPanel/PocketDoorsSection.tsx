import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { DoorOpen } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

interface PocketDoorsSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
  onChange: (section: string, value: any) => void;
}

export const PocketDoorsSection: React.FC<PocketDoorsSectionProps> = ({
  data,
  isOpen,
  onToggle,
  // onFieldChange,
  onChange
}) => {
  // Helper function to get available fold styles based on fold type
  const getAvailableFoldStyles = (foldType: string) => {
    switch (foldType) {
      case "Bi-Fold":
        return ["Bulb Seal"];
      case "Single":
        return ["Bulb Seal", "Expander"];
      case "Double":
        return ["Lap Trim", "Expander", "Expander & Interlock Switches"];
      default:
        return [];
    }
  };

  // Handle per-wall pocket door field changes
  const handleWallPocketDoorChange = (wallName: string, field: 'foldType' | 'foldStyle', value: string) => {
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [wallName]: {
          ...(data.wall_details?.walls?.[wallName] || {}),
          pocketDoors: {
            ...(data.wall_details?.walls?.[wallName]?.pocketDoors || {}),
            [field]: value === "None" ? "" : value
          }
        }
      }
    };
    
    // Reset fold style if fold type changes to incompatible option
    if (field === 'foldType') {
      const availableStyles = getAvailableFoldStyles(value);
      const currentStyle = data.wall_details?.walls?.[wallName]?.pocketDoors?.foldStyle;
      if (currentStyle && !availableStyles.includes(currentStyle)) {
        const wall = updatedWalls.walls[wallName] as any;
        if (wall?.pocketDoors) {
          wall.pocketDoors.foldStyle = "";
        }
      }
    }
    
    onChange('wall_details', updatedWalls);
  };

  const walls = data.wall_details?.walls || {};
  const wallEntries = Object.entries(walls);

  return (
    <CollapsibleSection
      title="Pocket Doors"
      icon={<DoorOpen className="w-4 h-4" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {wallEntries.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            No walls configured. Add walls in the Wall Systems section first.
          </div>
        ) : (
          wallEntries.map(([wallName, wall]) => (
            <Card key={wallName} className="p-3 bg-gray-50">
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">{wallName}</h4>
                
                <div>
                  <Label htmlFor={`${wallName}-foldType`} className="text-xs font-medium text-gray-600">
                    Fold Type
                  </Label>
                  <Select
                    value={wall.pocketDoors?.foldType || ''}
                    onValueChange={(value) => handleWallPocketDoorChange(wallName, 'foldType', value)}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select fold type" />
                    </SelectTrigger>
                    <SelectContent className="text-left">
                      <SelectItem value="None">None</SelectItem>
                      <SelectItem value="Bi-Fold">Bi-Fold</SelectItem>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Double">Double</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {wall.pocketDoors?.foldType && wall.pocketDoors.foldType !== 'None' && (
                  <div>
                    <Label htmlFor={`${wallName}-foldStyle`} className="text-xs font-medium text-gray-600">
                      Fold Style 
                      {wall.pocketDoors.foldType != '' && (<span className="text-red-500">*</span>)}
                    </Label>
                    <Select
                      value={wall.pocketDoors?.foldStyle || ''}
                      onValueChange={(value) => handleWallPocketDoorChange(wallName, 'foldStyle', value)}
                      disabled={!getAvailableFoldStyles(wall.pocketDoors?.foldType || '').length}
                    >
                      <SelectTrigger className="text-xs h-8">
                        
                        <SelectValue placeholder="Select fold style" />
                      </SelectTrigger>
                      <SelectContent className="text-left">
                        <SelectItem value="None">None</SelectItem>
                        {getAvailableFoldStyles(wall.pocketDoors?.foldType || '').map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </CollapsibleSection>
  );
};