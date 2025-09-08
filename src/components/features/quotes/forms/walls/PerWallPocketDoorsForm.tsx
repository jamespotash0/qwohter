import React, { useState } from 'react';
import { WallSpecification, PocketDoorConfig, isOperableWall, isGlassWall } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PerWallPocketDoorsFormProps {
  walls: { [wallName: string]: WallSpecification };
  onWallUpdate: (wallName: string, pocketDoors: PocketDoorConfig) => void;
}

export const PerWallPocketDoorsForm: React.FC<PerWallPocketDoorsFormProps> = ({
  walls,
  onWallUpdate
}) => {
  const [showCompletionModal, setShowCompletionModal] = useState(false);

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
  

  const handleFoldTypeChange = (wallName: string, foldType: string) => {
    const normalizedFoldType = foldType === 'None' ? 'None' : foldType;
    const newPocketDoors: PocketDoorConfig = {
      foldType: normalizedFoldType,
      foldStyle: ''
    };
    
    onWallUpdate(wallName, newPocketDoors);
    setShowCompletionModal(true);
  };

  const handleFoldStyleChange = (wallName: string, foldStyle: string) => {
    const wall = walls[wallName];
    const newPocketDoors: PocketDoorConfig = {
      foldType: wall?.pocketDoors?.foldType || '',
      foldStyle
    };
    
    onWallUpdate(wallName, newPocketDoors);
  };

  const getWallCompletionStatus = (wall: WallSpecification) => {
    const hasFoldType = wall.pocketDoors?.foldType && wall.pocketDoors.foldType !== 'None';
    const hasFoldStyle = wall.pocketDoors?.foldStyle && wall.pocketDoors.foldStyle !== '';
    const requiresStyle = hasFoldType && getAvailableFoldStyles(wall.pocketDoors?.foldType || '').length > 0;
    
    return {
      isComplete: hasFoldType && (!requiresStyle || hasFoldStyle),
      hasFoldType,
      requiresStyle,
      hasFoldStyle
    };
  };

  const overallStats = Object.entries(walls).reduce((acc, [_, wall]) => {
    const status = getWallCompletionStatus(wall);
    if (status.isComplete) acc.complete++;
    else if (status.hasFoldType) acc.partial++;
    else acc.notStarted++;
    return acc;
  }, { complete: 0, partial: 0, notStarted: 0 });

  return (
    <div className="p-1">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Pocket Doors Configuration</h3>
          <div className="text-sm text-gray-600">
            {overallStats.complete} of {Object.keys(walls).length} walls configured
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(walls).map(([wallName, wall]) => {
          const status = getWallCompletionStatus(wall);
          const availableStyles = getAvailableFoldStyles(wall.pocketDoors?.foldType || '');
          
          return (
            <Card 
              key={wallName} 
              // className={`${
              //   status.isComplete ? 'border-green-200' : 
              //   status.hasFoldType ? 'border-amber-200' : 'border-gray-200'
              // }`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{wallName}</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fold Type */}
                  <div className="space-y-2">
                    <Label>Fold Type</Label>
                    <Select
                      value={wall.pocketDoors?.foldType || ''}
                      onValueChange={(value) => handleFoldTypeChange(wallName, value === 'None' ? '' : value)}
                    >
                      <SelectTrigger 
                       className={wall.pocketDoors?.foldType == '' ? 'border-red-500' : 'border-green-500'}
                      >
                        <SelectValue placeholder="Select fold type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Bi-Fold">Bi-Fold</SelectItem>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Double">Double</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Fold Style */}
                  <div className="space-y-2">
                    <Label>
                      Fold Style
                      {status.requiresStyle && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Select
                      value={wall.pocketDoors?.foldStyle || ''}
                      onValueChange={(value) => handleFoldStyleChange(wallName, value)}
                      disabled={!status.hasFoldType || availableStyles.length === 0}
                    >
                      <SelectTrigger 
                        className={status.requiresStyle && !status.hasFoldStyle ? 'border-red-500' : 'border-green-500'}
                      >
                        <SelectValue placeholder="Select fold style" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStyles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-700 mb-1">Wall Specifications:</div>
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <span>{wall.wallSystemType || ''}, Model: {(isOperableWall(wall) || isGlassWall(wall)) ? wall.model : 'N/A'}</span>
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

export default PerWallPocketDoorsForm;