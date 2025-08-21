import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallCardProps } from './types';
import { OperableWallForm } from './OperableWallForm';
import { GlassWallForm } from './GlassWallForm';

export const WallCard: React.FC<WallCardProps> = ({
  wallName,
  wall,
  onRemove,
  onFieldChange
}) => (
  <Card key={wallName} 
        data-testid={`wall-card-${wallName.replace(/\s+/g, '-').toLowerCase()}`} 
        className="p-3 bg-gray-50">
    <div className="flex justify-between items-center mb-3">
      <h4 className="font-medium text-sm">{wallName}</h4>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onRemove(wallName)}
        className="text-red-600 hover:text-red-700"
      >
        Remove
      </Button>
    </div>
    
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-lengthFeet`} className="text-xs">Length (ft) *</Label>
        <Input
          id={`${wallName}-lengthFeet`}
          value={wall.lengthFeet || ''}
          onChange={(e) => onFieldChange(wallName, 'lengthFeet', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-lengthInches`} className="text-xs">Length (in)</Label>
        <Input
          id={`${wallName}-lengthInches`}
          value={wall.lengthInches || ''}
          onChange={(e) => onFieldChange(wallName, 'lengthInches', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-heightFeet`} className="text-xs">Height (ft) *</Label>
        <Input
          id={`${wallName}-heightFeet`}
          value={wall.heightFeet || ''}
          onChange={(e) => onFieldChange(wallName, 'heightFeet', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-heightInches`} className="text-xs">Height (in)</Label>
        <Input
          id={`${wallName}-heightInches`}
          value={wall.heightInches || ''}
          onChange={(e) => onFieldChange(wallName, 'heightInches', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-panelCount`} className="text-xs">Panel Count *</Label>
        <Input
          id={`${wallName}-panelCount`}
          value={wall.panelCount || ''}
          onChange={(e) => onFieldChange(wallName, 'panelCount', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-quantity`} className="text-xs">Quantity</Label>
        <Input
          id={`${wallName}-quantity`}
          value={wall.quantity || ''}
          onChange={(e) => onFieldChange(wallName, 'quantity', e.target.value)}
          placeholder="1"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2 grid col-span-2">
        <Label htmlFor={`${wallName}-wallSystemType`} className="text-xs">Wall System Type *</Label>
        <Select
          value={wall.wallSystemType || ''}
          onValueChange={(value) => {
            try {
              console.log('Wall system type changing:', { wallName, value, currentWall: wall });
              onFieldChange(wallName, 'wallSystemType', value);
              
              // Only reset common fields - let individual forms handle their own cascading logic
              setTimeout(() => {
                onFieldChange(wallName, 'panelConfiguration', '');
                onFieldChange(wallName, 'series', '');
                onFieldChange(wallName, 'model', '');
                onFieldChange(wallName, 'panelThickness', '');
              }, 50);
            } catch (error) {
              console.error('Error in wall system type change:', error);
            }
          }}
        >
          <SelectTrigger className="text-xs h-8 text-left">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Operable Wall">Operable Wall</SelectItem>
            <SelectItem className="text-left" value="Glass Wall">Glass Wall</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Wall Type Specific Forms */}
    {wall.wallSystemType === "Operable Wall" && (
      <div className="mt-2">
        <OperableWallForm
          wallName={wallName}
          wall={wall}
          onFieldChange={onFieldChange}
        />
      </div>
    )}

    {wall.wallSystemType === "Glass Wall" && (
      <div className="mt-2">
        <GlassWallForm
          wallName={wallName}
          wall={wall}
          onFieldChange={onFieldChange}
        />
      </div>
    )}

  </Card>
);