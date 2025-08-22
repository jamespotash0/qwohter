import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { ComputedFieldProps } from '../types';
import { getFrameThickness, getPanelWidth } from '../data/modelConfigurations';

interface FrameThicknessFieldProps extends ComputedFieldProps {
  selectedSTCRating?: string;
}

export const FrameThicknessField: React.FC<FrameThicknessFieldProps> = ({
  selectedModel,
  selectedSTCRating,
  label
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="frameThickness">{label}</Label>
      <Input 
        value={getFrameThickness(selectedModel, selectedSTCRating)}
        readOnly
        className="bg-muted text-muted-foreground"
      />
    </div>
  );
};

export const PanelWidthField: React.FC<ComputedFieldProps> = ({
  selectedModel,
  label
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="panelWidth">{label}</Label>
      <Input 
        value={getPanelWidth(selectedModel)}
        readOnly
        className="bg-muted text-muted-foreground"
      />
    </div>
  );
};