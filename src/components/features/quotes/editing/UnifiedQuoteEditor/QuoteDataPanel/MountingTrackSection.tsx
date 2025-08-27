import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Building } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

interface MountingTrackSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
  onChange: (section: string, value: any) => void;
}

export const MountingTrackSection: React.FC<MountingTrackSectionProps> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange,
  onChange
}) => {
  // Handle per-wall structure support changes
  const handleWallStructureSupportChange = (wallName: string, value: string) => {
    const updatedWalls = {
      id: data.wall_details?.id || crypto.randomUUID(),
      walls: {
        ...(data.wall_details?.walls || {}),
        [wallName]: {
          ...(data.wall_details?.walls?.[wallName] || {}),
          structureSupport: value === "None" ? "" : value
        }
      }
    };
    onChange('wall_details', updatedWalls);
  };

  const walls = data.wall_details?.walls || {};
  const wallEntries = Object.entries(walls);

  return (
    <CollapsibleSection
      title="Support Structure"
      icon={<Building className="w-4 h-4 text-indigo-500" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        {/* Per-Wall Structure Support */}
        <div>
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
                    <Label htmlFor={`${wallName}-structureSupport`} className="text-xs font-medium text-gray-600">
                      Structure Support Type
                    </Label>
                    <Select
                      value={wall.structureSupport || ''}
                      onValueChange={(value) => handleWallStructureSupportChange(wallName, value)}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select structure support" />
                      </SelectTrigger>
                      <SelectContent className="text-left">
                        {/* <SelectItem value="None">None</SelectItem> */}
                        <SelectItem value="Pre-Drilled Steel Beam">Pre-Drilled Steel Beam</SelectItem>
                        <SelectItem value="Existing Steel Beam">Existing Steel Beam</SelectItem>
                        <SelectItem value="Secured to Concrete">Secured to Concrete</SelectItem>
                        <SelectItem value="Secured to Wood Header">Secured to Wood Header</SelectItem>
                        <SelectItem value="Unispan Truss System">Unispan Truss System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
};