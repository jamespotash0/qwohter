import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MODEL_CONFIGURATIONS } from '../data/modelConfigurations';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="model">Glass Wall Model *</Label>
      <Select value={selectedModel} onValueChange={onModelChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select glass wall model" />
        </SelectTrigger>
        <SelectContent className="bg-background border z-50">
          {Object.keys(MODEL_CONFIGURATIONS).map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};