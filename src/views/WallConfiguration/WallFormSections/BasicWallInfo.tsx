// Basic Wall Info Section - Pure UI Component
// Contains wall name, dimensions, and basic properties

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallSpecification } from '@/types/quote';

interface BasicWallInfoProps {
  wall: WallSpecification;
  onFieldChange: (field: keyof WallSpecification, value: string) => void;
  disabled?: boolean;
}

export const BasicWallInfo: React.FC<BasicWallInfoProps> = ({
  wall,
  onFieldChange,
  disabled = false
}) => {
  return (
    <div className="space-y-6">
      
      {/* Wall Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Length (Feet) *</Label>
          <Input
            value={wall.lengthFeet}
            onChange={(e) => onFieldChange("lengthFeet", e.target.value)}
            placeholder="Enter feet"
            type="text"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Length (Inches)</Label>
          <Input
            value={wall.lengthInches}
            onChange={(e) => onFieldChange("lengthInches", e.target.value)}
            placeholder="Enter inches"
            type="text"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Height (Feet) *</Label>
          <Input
            value={wall.heightFeet}
            onChange={(e) => onFieldChange("heightFeet", e.target.value)}
            placeholder="Enter feet"
            type="text"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Height (Inches)</Label>
          <Input
            value={wall.heightInches}
            onChange={(e) => onFieldChange("heightInches", e.target.value)}
            placeholder="Enter inches"
            type="text"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Wall System Type and Quantity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Wall System Type *</Label>
          <Select
            value={wall.wallSystemType}
            onValueChange={(value) => onFieldChange("wallSystemType", value)}
            disabled={disabled}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select wall system type" />
            </SelectTrigger>
            <SelectContent className="bg-background border z-50">
              <SelectItem value="Operable Wall">Operable Wall</SelectItem>
              <SelectItem value="Glass Wall">Glass Wall</SelectItem>
              <SelectItem value="Accordion Wall">Accordion Wall</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Panel Count *</Label>
          <Input
            value={wall.panelCount}
            onChange={(e) => onFieldChange("panelCount", e.target.value)}
            placeholder="Enter panel count"
            type="text"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Quantity</Label>
          <Input
            value={wall.quantity}
            onChange={(e) => onFieldChange("quantity", e.target.value)}
            placeholder="Enter quantity"
            type="text"
            disabled={disabled}
          />
        </div>
      </div>

    </div>
  );
};