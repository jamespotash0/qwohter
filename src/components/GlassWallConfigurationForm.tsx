import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// Configuration data based on model specifications
const modelConfigurations = {
  Stella: {
    configurations: ['Individual Panels'],
    operations: ['Manual', 'Automated', 'Programmable Self-Driving', 'Semi-Automated Seals'],
    glassType: ['Tempered Glass', 'Laminated Glass', 'Switchable Glass', 'Child-Safe Glass', 'Fully Back-Painted Glass'],
    stcRating: ['44', '50'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height', 'Inset'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Solid Face', 'MDF-Backed Melamine', 'High Pressure Laminate', 'Electrical Internal Mini-Blinds', 'Internal Mullions & Muntins'],
    hinging: ['Invisible Hinges'],
    frameFinishes: ['Clear Anodized', 'Black', 'White', 'Custom RAL Powder Coat', 'Sublimation Wood Look'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Clear Anodized', 'Black Powder Coat', 'White Powder Coat', 'Custom RAL Option'],
    finalClosure: ['Panel-Mounted Telescoping Jamb', 'Wall-Mounted Telescoping Jamb', 'Full-Height Door'],
    bottomSeals: ['Electric', 'Automatic', 'Semi-Automatic', 'Manual', 'Operable'],
    topSeals: ['Electric', 'Automatic', 'Semi-Automatic', 'Manual', 'Operable']
  },
  Luna: {
    configurations: ['Individual Panels', 'Continuously-Hinged Panels'],
    operations: ['Manual'],
    glassType: ['Tempered Glass', 'Laminated Glass', 'Switchable Glass', 'Child-Safe Glass', 'Fully Back-Painted Glass'],
    stcRating: ['43'],
    partitionSupport: ['Top-Supported', 'Floor-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Solid Face', 'MDF-Backed Melamine', 'High Pressure Laminate', 'Electrical Internal Mini-Blinds', 'Internal Muntins'],
    hinging: ['Invisible Hinges'],
    frameFinishes: ['Black Powder Coat', 'Custom RAL Powder Coat', 'Sublimation Wood Look'],
    trackType: ['Top-Supported Multi-directional & Single-Point', 'Floor-Supported Top Guide'],
    trackFinish: ['Black Powder Coat','Clear Anodized', 'White', 'Custom RAL Option'],
    floorGuide: ['Optional'],
    finalClosure: ['Hinged Closure Panel', 'Full-Height Door'],
    bottomSeals: ['Floor Supported Fixed Bulb', 'Top Supported Fixed Brush'],
    topSeals: ['Floor Supported Fixed Bulb', 'Top Supported Fixed Brush'],
  },
  Illona: {
    configurations: ['Individual Panels', 'Continuously-Hinged Panels', 'Pivoting Individual Panels', 'Single & Telescoping Slider Panels'],
    operations: ['Manual'],
    glassType: ['Tempered Glass', 'Laminated Glass', 'Back-Painted Glass'],
    stcRating: ['33'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Surface-Mounted Muntins'],
    hinging: ['Invisible Hinges'],
    frameFinishes: ['Black Powder Coat', 'White Powder Coat', 'Custom RAL Powder Coat', 'Sublimation Wood Look'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Black Powder Coat','Clear Anodized', 'White Powder Coat', 'Custom RAL Option'],
    floorGuide: ['Optional'],
    finalClosure: ['Hinged Closure Panel', 'Full-Height Door'],
    bottomSeals: ['Fixed Brush'],
    topSeals: ['Fixed Brush'],
  },
  Ava: {
    configurations: ['Individual Panels', 'Hinged-Paired Panels'],
    operations: ['Manual'],
    glassType: ['1/2" Tempered Glass'],
    stcRating: ['None-Acoustic'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['None'],
    hinging: ['Full-Leaf Butt Hinges'],
    frameFinishes: ['Clear Anodized', 'Black Powder Coat', 'Custom RAL Color Options'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Black Powder Coat', 'Clear Anodized', 'Custom RAL Color Option'],
    floorGuide: ['None'],
    finalClosure: ['Fixed Pivot Panel', 'Fixed Swing Panel'],
    bottomSeals: ['Fixed Brush'],
    topSeals: ['Fixed Brush'],
  },
  Mata: {
    configurations: ['Individual Panels', 'Continuously-Hinged Panels', 'Single & Telescoping Slider Panels'],
    operations: ['Manual'],
    glassType: ['1/4" Tempered Glass', '5/16" Frosted Laminated Glass', 'Custom Glass Options'],
    stcRating: ['None-Acoustic'],
    partitionSupport: ['Top-Supported'],
    passDoorType: ['Full-Height'],
    passDoorOption: ['Single', 'Double'],
    panelFaces: ['Wood Insert', 'Mullions & Surface-Mounted Muntins'],
    hinging: ['Full-Leaf Butt Hinges'],
    frameFinishes: ['Stained Fruitwood Dark Oak', 'Stained Wheat', 'Stained Cordovan', 'Painted Black', 'Painted White', 'Unfinished'],
    trackType: ['Top-Supported Multi-directional & Single-Point'],
    trackFinish: ['Black Powder Coat', 'Clear Anodized', 'Custom RAL Option'],
    floorGuide: ['None'],
    finalClosure: ['Hinged Closure Panel', 'None Required'],
    bottomSeals: ['Fixed Flexible Vinyl'],
    topSeals: ['Fixed Flexible Vinyl'],
  }
};

export interface GlassWallConfiguration {
  model: string;
  configurationType: string;
  operationType: string;
  glassType: string;
  stc_rating: string;
  partitionSupport: string;
  passDoorType: string;
  passDoorOption: string;
  panelFace: string;
  hingeType: string;
  frameFinish: string;
  frameThickness: string;
  trackType: string;
  trackFinish: string;
  finalClosure: string;
  bottomSeals: string;
  topSeals: string;
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
  const [selectedSTCRating, setSelectedSTCRating] = useState<string>(initialConfig.stc_rating);
  const [selectedPanelFace, setSelectedPanelFace] = useState<string>(initialConfig.panelFace || '');
  const [selectedFrameFinish, setSelectedFrameFinish] = useState<string>(initialConfig.frameFinish || '');

  // Get available options based on selected model
  const getAvailableOptions = (field: keyof typeof modelConfigurations.Stella) => {
    if (!selectedModel || !(selectedModel in modelConfigurations)) return [];
    return modelConfigurations[selectedModel as keyof typeof modelConfigurations][field] || [];
  };

  const getFrameThickness = (model: string) => {
    const stc = selectedSTCRating;
    switch (model) {
      case 'Stella':
        if (stc === '44') return '4-1/2"';
        return '4-11/16"';
      case 'Luna':
        return '2-3/4"';
      case 'Illona':
        return '1-3/8"';
      case 'Ava':
        return '1-7/16"';
      case 'Mata':
        return '1-3/4"';
      default:
        return 'N/A';
    }
  };
  const getPanelWidth = (model: string) => {
    switch (model) {
      case 'Stella':
        return '51"';
      case 'Luna':
        return '41-3/8"';
      case 'Illona':
        return '39-3/8"';
      case 'Ava':
        return '48"';
      case 'Mata':
        return '48"';
      default:
        return 'N/A';
    }
  };
  // Reset dependent fields when model changes
  useEffect(() => {
    if (selectedModel) {
      const availableConfigs = getAvailableOptions('configurations');
      const availableOps = getAvailableOptions('operations');
      const availableSTCRatings = getAvailableOptions('stcRating');
      const frameThickness = getFrameThickness(selectedModel);
      const panelWidth = getPanelWidth(selectedModel);
      const availableFaces = getAvailableOptions('panelFaces');
      const availableFinishes = getAvailableOptions('frameFinishes');

      // Reset if current selection is not available in new model
      if (!availableConfigs.includes(selectedConfiguration)) {
        setSelectedConfiguration('');
      }
      if (!availableOps.includes(selectedOperation)) {
        setSelectedOperation('');
      }
      if (!availableSTCRatings.includes(selectedSTCRating)) {
        setSelectedSTCRating('');
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
        frameFinish: selectedFrameFinish,
        glassType: '',
        stc_rating: '',
        partitionSupport: '',
        passDoorType: '',
        passDoorOption: '',
        hingeType: '',
        frameThickness: '',
        trackType: '',
        trackFinish: '',
        finalClosure: '',
        bottomSeals: '',
        topSeals: ''
      });
    }
  }, [selectedModel, selectedConfiguration, selectedOperation, selectedPanelFace, selectedFrameFinish, onConfigurationChange]);

  return (
    <Card className="w-full">
      <CardContent className="space-y-6">
        {/* Step 1: Wall System Model */}
        <div className="space-y-2">
          <Label htmlFor="model">Glass Wall Model *</Label>
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
          <Label htmlFor="configuration">Configuration</Label>
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