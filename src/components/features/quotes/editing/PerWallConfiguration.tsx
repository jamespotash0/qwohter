import React from 'react';
import { WallSpecification, PocketDoorConfig, TrackConfig } from '@/types/quote';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PerWallConfigurationProps {
  walls: { [wallName: string]: WallSpecification };
  onWallUpdate: (wallName: string, field: string, value: string | PocketDoorConfig | TrackConfig) => void;
  onShowCompletionCheck?: () => void;
}

interface ConfigurationStatus {
  passDoors: boolean;
  pocketDoors: boolean;
  structureSupport: boolean;
  isComplete: boolean;
}

export const PerWallConfiguration: React.FC<PerWallConfigurationProps> = ({
  walls,
  onWallUpdate,
  onShowCompletionCheck
}) => {
  
  const getWallStatus = (wall: WallSpecification): ConfigurationStatus => {
    const passDoors = wall.passDoorPanels && wall.passDoorPanels !== '';
    const pocketDoors = wall.pocketDoors?.foldType && wall.pocketDoors.foldType !== '';
    const structureSupport = wall.structureSupport && wall.structureSupport !== '';
    
    return {
      passDoors,
      pocketDoors,
      structureSupport,
      isComplete: passDoors && pocketDoors && structureSupport
    };
  };

  const handleFieldUpdate = (wallName: string, field: string, value: string) => {
    onWallUpdate(wallName, field, value);
    onShowCompletionCheck?.();
  };

  const handleNestedFieldUpdate = (wallName: string, parentField: string, childField: string, value: string) => {
    const wall = walls[wallName];
    const parentObject = (wall[parentField as keyof WallSpecification] as PocketDoorConfig | TrackConfig) || 
                        (parentField === 'pocketDoors' ? { foldType: '', foldStyle: '' } : { trackType: '', trackSystem: '' });
    const updatedParent = { ...parentObject, [childField]: value };
    onWallUpdate(wallName, parentField, updatedParent);
    onShowCompletionCheck?.();
  };

  const StatusBadge: React.FC<{ status: ConfigurationStatus }> = ({ status }) => (
    <Badge variant={status.isComplete ? "default" : "secondary"} className="ml-2">
      {status.isComplete ? '✅ Complete' : '⚠️ Incomplete'}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Wall-Specific Configurations</h2>
        <div className="text-sm text-gray-600">
          {Object.values(walls).filter(wall => getWallStatus(wall).isComplete).length} of {Object.keys(walls).length} walls configured
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(walls).map(([wallName, wall]) => {
          const status = getWallStatus(wall);
          
          return (
            <Card key={wallName} className={`${!status.isComplete ? 'border-amber-200' : 'border-green-200'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span>{wallName} Configuration</span>
                  <StatusBadge status={status} />
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Pass Doors */}
                  <div className="space-y-2">
                    <Label>Pass Doors</Label>
                    <Select
                      value={wall.passDoorPanels || 'None'}
                      onValueChange={(value) => handleFieldUpdate(wallName, 'passDoorPanels', value)}
                    >
                      <SelectTrigger className={!status.passDoors ? 'border-amber-300' : ''}>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Double">Double</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pocket Doors Type */}
                  <div className="space-y-2">
                    <Label>Pocket Doors</Label>
                    <Select
                      value={wall.pocketDoors?.foldType || 'None'}
                      onValueChange={(value) => handleNestedFieldUpdate(wallName, 'pocketDoors', 'foldType', value)}
                    >
                      <SelectTrigger className={!status.pocketDoors ? 'border-amber-300' : ''}>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Bi-fold">Bi-fold</SelectItem>
                        <SelectItem value="Tri-fold">Tri-fold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Pocket Door Style */}
                  <div className="space-y-2">
                    <Label>Pocket Style</Label>
                    <Select
                      value={wall.pocketDoors?.foldStyle || ''}
                      disabled={!wall.pocketDoors?.foldType || wall.pocketDoors.foldType === 'None'}
                      onValueChange={(value) => handleNestedFieldUpdate(wallName, 'pocketDoors', 'foldStyle', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Flush">Flush</SelectItem>
                        <SelectItem value="Recessed">Recessed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Structure Support */}
                  <div className="space-y-2">
                    <Label>Structure Support</Label>
                    <Select
                      value={wall.structureSupport || 'None'}
                      onValueChange={(value) => handleFieldUpdate(wallName, 'structureSupport', value)}
                    >
                      <SelectTrigger className={!status.structureSupport ? 'border-amber-300' : ''}>
                        <SelectValue placeholder="Select support" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None Required</SelectItem>
                        <SelectItem value="Pre-drilled">Pre-drilled</SelectItem>
                        <SelectItem value="Existing Steel Beam">Existing Steel Beam</SelectItem>
                        <SelectItem value="Custom Support">Custom Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Configuration Summary */}
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className={`flex items-center gap-1 ${status.passDoors ? 'text-green-600' : 'text-gray-400'}`}>
                      {status.passDoors ? '✅' : '⭕'} Pass Doors
                    </div>
                    <div className={`flex items-center gap-1 ${status.pocketDoors ? 'text-green-600' : 'text-gray-400'}`}>
                      {status.pocketDoors ? '✅' : '⭕'} Pocket Doors
                    </div>
                    <div className={`flex items-center gap-1 ${status.structureSupport ? 'text-green-600' : 'text-gray-400'}`}>
                      {status.structureSupport ? '✅' : '⭕'} Structure Support
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PerWallConfiguration;