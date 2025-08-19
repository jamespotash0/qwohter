import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldChangeHandler } from './types';
import { QuoteData } from '@/templates/BaseQuoteTemplate';

interface MountingTrackSectionProps {
  data: QuoteData;
  isOpen: boolean;
  onToggle: () => void;
  onFieldChange: FieldChangeHandler;
}

export const MountingTrackSection: React.FC<MountingTrackSectionProps> = ({
  data,
  isOpen,
  onToggle,
  onFieldChange
}) => (
  <CollapsibleSection
    title="Mounting Track"
    icon={<Building className="w-4 h-4 text-indigo-500" />}
    isOpen={isOpen}
    onToggle={onToggle}
  >
    <div className="space-y-3">
      <div>
        <Label htmlFor="mountingTrack" className="text-xs font-medium text-gray-600">
          Mounting Track Type
        </Label>
        <Select
          value={data.support_structure?.mountingTrack || ''}
          onValueChange={(value) => onFieldChange('support_structure', 'mountingTrack', value)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select mounting track type" />
          </SelectTrigger>
          <SelectContent className="text-left">
            <SelectItem value="Pre-Drilled Steel Beam">Pre-Drilled Steel Beam</SelectItem>
            <SelectItem value="Existing Steel Beam">Existing Steel Beam</SelectItem>
            <SelectItem value="Secured to Concrete">Secured to Concrete</SelectItem>
            <SelectItem value="Secured to Wood Header">Secured to Wood Header</SelectItem>
            <SelectItem value="Unispan Truss System">Unispan Truss System</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  </CollapsibleSection>
);