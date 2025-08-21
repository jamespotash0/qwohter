import React, { useState } from 'react';
import { WallSpecification } from '@/types/quote';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WallCompletionModal from '@/components/features/quotes/editing/WallCompletionModal';

interface PerWallStructureFormProps {
  walls: { [wallName: string]: WallSpecification };
  onWallUpdate: (wallName: string, structureSupport: string) => void;
}

const STRUCTURE_SUPPORT_OPTIONS = [
  { value: 'Pre-Drilled Steel Beam', label: 'Pre-Drilled Steel Beam' },
  { value: 'Existing Steel Beam', label: 'Existing Steel Beam' },
  { value: 'Secured to Concrete', label: 'Secured to Concrete' },
  { value: 'Secured to Wood Header', label: 'Secured to Wood Header' },
  { value: 'Unispan Truss System', label: 'Unispan Truss System' }
];

export const PerWallStructureForm: React.FC<PerWallStructureFormProps> = ({
  walls,
  onWallUpdate
}) => {
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const handleStructureSupportChange = (wallName: string, structureSupport: string) => {
    onWallUpdate(wallName, structureSupport);
    setShowCompletionModal(true);
  };

  const getWallCompletionStatus = (wall: WallSpecification) => {
    const hasStructureSupport = wall.structureSupport && wall.structureSupport.trim() !== '';
    return {
      isComplete: hasStructureSupport,
      hasStructureSupport
    };
  };

  const overallStats = Object.entries(walls).reduce((acc, [_, wall]) => {
    const status = getWallCompletionStatus(wall);
    if (status.isComplete) acc.complete++;
    else acc.notStarted++;
    return acc;
  }, { complete: 0, notStarted: 0 });

  return (
    <div className="p-1">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Structure Support Configuration</h3>
          <div className="text-sm text-gray-600">
            {overallStats.complete} of {Object.keys(walls).length} walls configured
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(walls).map(([wallName, wall]) => {
          const status = getWallCompletionStatus(wall);
          const currentValue = wall.structureSupport || '';
          
          return (
            <Card 
              key={wallName} 
              className={`${status.isComplete ? 'border-green-200' : 'border-amber-200'}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{wallName}</span>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Structure Support Selection */}
                  <div className="space-y-2">
                    <Label>Structure Support Type *</Label>
                    <Select
                      value={currentValue}
                      onValueChange={(value) => handleStructureSupportChange(wallName, value)}
                    >
                      <SelectTrigger className={!status.isComplete ? 'border-amber-300' : ''}>
                        <SelectValue placeholder="Select structure support" />
                      </SelectTrigger>
                      <SelectContent>
                        {STRUCTURE_SUPPORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Wall Dimensions Context */}
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="font-medium text-gray-700 mb-1">Wall Specifications:</div>
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <span>{wall.wallSystemType || ''}, Model: {wall.model ||''}</span>
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

export default PerWallStructureForm;