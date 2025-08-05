import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// Configuration data based on model specifications
const modelConfigurations = {
  STELLA: {
    configurations: ['Single Track', 'Multi-Track', 'Curved Track'],
    operations: ['Manual', 'Automated', 'Semi-Automated Seals'],
    panelFaces: ['Solid Face', 'MDF-Backed', 'Melamine', 'Wood Insert'],
    frameFinishes: ['Clear Anodized', 'Black', 'White', 'Powder Coat', 'Custom RAL Powder Coat']
  },
  LUNA: {
    configurations: ['Single Track', 'Multi-Track'],
    operations: ['Manual', 'Automated'],
    panelFaces: ['Solid Face', 'MDF-Backed', 'HPL', 'Electric Internal Mini-Blinds'],
    frameFinishes: ['Clear Anodized', 'Black', 'White', 'Stained Fruitwood', 'Stained Dark Oak']
  },
  ILLONA: {
    configurations: ['Single Track', 'Curved Track'],
    operations: ['Manual', 'Semi-Automated Seals'],
    panelFaces: ['Solid Face', 'Melamine', 'Wood Insert', 'Mullions - Muntins'],
    frameFinishes: ['Clear Anodized', 'White', 'Custom Sublimation Wood Look', 'Painted Black']
  },
  AVA: {
    configurations: ['Multi-Track', 'Curved Track'],
    operations: ['Automated', 'Semi-Automated Seals'],
    panelFaces: ['MDF-Backed', 'HPL', 'Electric Internal Mini-Blinds'],
    frameFinishes: ['Black', 'Powder Coat', 'Stained Wheat', 'Stained Cordovan', 'Painted White']
  },
  MATA: {
    configurations: ['Single Track', 'Multi-Track', 'Curved Track'],
    operations: ['Manual', 'Automated', 'Semi-Automated Seals'],
    panelFaces: ['Solid Face', 'MDF-Backed', 'Melamine', 'HPL', 'Wood Insert'],
    frameFinishes: ['Clear Anodized', 'Black', 'White', 'Powder Coat', 'Unfinished']
  }
};

export interface GlassWallConfiguration {
  model: string;
  configurationType: string;
  operationType: string;
  panelFace: string;
  frameFinish: string;
}

interface GlassWallConfigurationFormProps {
  onConfigurationChange?: (config: GlassWallConfiguration) => void;
  initialConfig?: Partial<GlassWallConfiguration>;
}

export const GlassWallConfigurationForm: React.FC<GlassWallConfigurationFormProps> = ({
  onConfigurationChange,
  initialConfig = {}
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(initialConfig.model || '');
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>(initialConfig.configurationType || '');
  const [selectedOperation, setSelectedOperation] = useState<string>(initialConfig.operationType || '');
  const [selectedPanelFace, setSelectedPanelFace] = useState<string>(initialConfig.panelFace || '');
  const [selectedFrameFinish, setSelectedFrameFinish] = useState<string>(initialConfig.frameFinish || '');

  // Get available options based on selected model
  const getAvailableOptions = (field: keyof typeof modelConfigurations.STELLA) => {
    if (!selectedModel || !(selectedModel in modelConfigurations)) return [];
    return modelConfigurations[selectedModel as keyof typeof modelConfigurations][field] || [];
  };

  // Reset dependent fields when model changes
  useEffect(() => {
    if (selectedModel) {
      const availableConfigs = getAvailableOptions('configurations');
      const availableOps = getAvailableOptions('operations');
      const availableFaces = getAvailableOptions('panelFaces');
      const availableFinishes = getAvailableOptions('frameFinishes');

      // Reset if current selection is not available in new model
      if (!availableConfigs.includes(selectedConfiguration)) {
        setSelectedConfiguration('');
      }
      if (!availableOps.includes(selectedOperation)) {
        setSelectedOperation('');
      }
      if (!availableFaces.includes(selectedPanelFace)) {
        setSelectedPanelFace('');
      }
      if (!availableFinishes.includes(selectedFrameFinish)) {
        setSelectedFrameFinish('');
      }
    }
  }, [selectedModel]);

  // Notify parent of configuration changes
  useEffect(() => {
    if (onConfigurationChange && selectedModel) {
      onConfigurationChange({
        model: selectedModel,
        configurationType: selectedConfiguration,
        operationType: selectedOperation,
        panelFace: selectedPanelFace,
        frameFinish: selectedFrameFinish
      });
    }
  }, [selectedModel, selectedConfiguration, selectedOperation, selectedPanelFace, selectedFrameFinish, onConfigurationChange]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Glass Wall Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Wall System Model */}
        <div className="space-y-2">
          <Label htmlFor="model">Wall System Model *</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(modelConfigurations).map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 2: Configuration Type */}
        <div className="space-y-2">
          <Label htmlFor="configuration">Configuration Type *</Label>
          <Select 
            value={selectedConfiguration} 
            onValueChange={setSelectedConfiguration}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select configuration" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('configurations').map((config) => (
                <SelectItem key={config} value={config}>
                  {config}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 3: Operation Type */}
        <div className="space-y-2">
          <Label htmlFor="operation">Operation Type *</Label>
          <Select 
            value={selectedOperation} 
            onValueChange={setSelectedOperation}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select operation type" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('operations').map((operation) => (
                <SelectItem key={operation} value={operation}>
                  {operation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 4: Panel Face Options */}
        <div className="space-y-2">
          <Label htmlFor="panelFace">Panel Face Options *</Label>
          <Select 
            value={selectedPanelFace} 
            onValueChange={setSelectedPanelFace}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select panel face" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('panelFaces').map((face) => (
                <SelectItem key={face} value={face}>
                  {face}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 5: Frame Finish Options */}
        <div className="space-y-2">
          <Label htmlFor="frameFinish">Frame Finish Options *</Label>
          <Select 
            value={selectedFrameFinish} 
            onValueChange={setSelectedFrameFinish}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select frame finish" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('frameFinishes').map((finish) => (
                <SelectItem key={finish} value={finish}>
                  {finish}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Configuration Summary */}
        {selectedModel && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Current Configuration:</h4>
            <div className="text-sm space-y-1">
              <div><strong>Model:</strong> {selectedModel}</div>
              {selectedConfiguration && <div><strong>Configuration:</strong> {selectedConfiguration}</div>}
              {selectedOperation && <div><strong>Operation:</strong> {selectedOperation}</div>}
              {selectedPanelFace && <div><strong>Panel Face:</strong> {selectedPanelFace}</div>}
              {selectedFrameFinish && <div><strong>Frame Finish:</strong> {selectedFrameFinish}</div>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};