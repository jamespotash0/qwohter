import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallCardProps } from './types';
import { OperableWallForm } from './OperableWallForm';
import { GlassWallForm } from './GlassWallForm';
import { AccordionPartitionForm } from './AccordionPartitionForm';

export const WallCard: React.FC<WallCardProps> = ({
  wallName,
  wall,
  onRemove,
  onFieldChange
}) => (
  <Card key={`${wallName}-${wall.wallSystemType}-${wall.glasswallModel}`} 
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
      <div>
        <Label htmlFor={`${wallName}-lengthFeet`}>Length (ft)</Label>
        <Input
          id={`${wallName}-lengthFeet`}
          value={wall.lengthFeet || ''}
          onChange={(e) => onFieldChange(wallName, 'lengthFeet', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div>
        <Label htmlFor={`${wallName}-lengthInches`}>Length (in)</Label>
        <Input
          id={`${wallName}-lengthInches`}
          value={wall.lengthInches || ''}
          onChange={(e) => onFieldChange(wallName, 'lengthInches', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div>
        <Label htmlFor={`${wallName}-heightFeet`}>Height (ft)</Label>
        <Input
          id={`${wallName}-heightFeet`}
          value={wall.heightFeet || ''}
          onChange={(e) => onFieldChange(wallName, 'heightFeet', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div>
        <Label htmlFor={`${wallName}-heightInches`}>Height (in)</Label>
        <Input
          id={`${wallName}-heightInches`}
          value={wall.heightInches || ''}
          onChange={(e) => onFieldChange(wallName, 'heightInches', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div>
        <Label htmlFor={`${wallName}-panelCount`}>Panel Count</Label>
        <Input
          id={`${wallName}-panelCount`}
          value={wall.panelCount || ''}
          onChange={(e) => onFieldChange(wallName, 'panelCount', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div>
        <Label htmlFor={`${wallName}-quantity`}>Quantity</Label>
        <Input
          id={`${wallName}-quantity`}
          value={wall.quantity || ''}
          onChange={(e) => onFieldChange(wallName, 'quantity', e.target.value)}
          placeholder="1"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-wallSystemType`}>System Type</Label>
        <Select
          value={wall.wallSystemType || ''}
          onValueChange={(value) => onFieldChange(wallName, 'wallSystemType', value)}
        >
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem className="text-left" value="Operable Wall">Operable Wall</SelectItem>
            <SelectItem className="text-left" value="Glass Wall">Glass Wall</SelectItem>
            <SelectItem className="text-left" value="Accordion Partitions">Accordion Partitions</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Wall Type Specific Forms */}
    {wall.wallSystemType === "Operable Wall" && (
      <OperableWallForm
        wallName={wallName}
        wall={wall}
        onFieldChange={onFieldChange}
      />
    )}

    {wall.wallSystemType === "Glass Wall" && (
      <GlassWallForm
        wallName={wallName}
        wall={wall}
        onFieldChange={onFieldChange}
      />
    )}

    {wall.wallSystemType === "Accordion Partitions" && (
      <AccordionPartitionForm
        wallName={wallName}
        wall={wall}
        onFieldChange={onFieldChange}
      />
    )}
  </Card>
);