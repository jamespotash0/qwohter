import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DoorOpen } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

interface PocketDoorsSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
}

export const PocketDoorsSection: React.FC<PocketDoorsSectionProps> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange
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

  // Handle fold type change with style reset
  const handleFoldTypeChange = (foldType: string) => {
    const newFoldType = foldType === "None" ? "" : foldType;
    onFieldChange('pocket_doors', 'foldType', newFoldType);
    
    // Reset fold style if current selection is not valid for new fold type
    const availableStyles = getAvailableFoldStyles(newFoldType);
    const currentStyle = data.pocket_doors?.foldStyle;
    if (currentStyle && !availableStyles.includes(currentStyle)) {
      onFieldChange('pocket_doors', 'foldStyle', "");
    }
  };

  return (
    <CollapsibleSection
      title="Pocket Doors"
      icon={<DoorOpen className="w-4 h-4 text-yellow-500" />}
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="foldType" className="text-xs font-medium text-gray-600">
            Fold Type
          </Label>
          <Select
            value={data.pocket_doors?.foldType || ''}
            onValueChange={handleFoldTypeChange}
          >
            <SelectTrigger className="text-sm">
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
        
        {data.pocket_doors?.foldType && data.pocket_doors.foldType !== 'None' && (
          <div>
            <Label htmlFor="foldStyle" className="text-xs font-medium text-gray-600">
              Fold Style
            </Label>
            <Select
              value={data.pocket_doors?.foldStyle || ''}
              onValueChange={(value) => onFieldChange('pocket_doors', 'foldStyle', value)}
              disabled={!getAvailableFoldStyles(data.pocket_doors?.foldType || '').length}
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select fold style" />
              </SelectTrigger>
              <SelectContent className="text-left">
                <SelectItem value="None">None</SelectItem>
                {getAvailableFoldStyles(data.pocket_doors?.foldType || '').map((style) => (
                  <SelectItem key={style} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};