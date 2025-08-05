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
  const [selectedGlassType, setSelectedGlassType] = useState<string>(initialConfig.glassType || '');
  const [selectedSTCRating, setSelectedSTCRating] = useState<string>(initialConfig.stc_rating || '');
  const [selectedPartitionSupport, setSelectedPartitionSupport] = useState<string>(initialConfig.partitionSupport || '');
  const [selectedPassDoorType, setSelectedPassDoorType] = useState<string>(initialConfig.passDoorType || '');
  const [selectedPassDoorOption, setSelectedPassDoorOption] = useState<string>(initialConfig.passDoorOption || '');
  const [selectedPanelFace, setSelectedPanelFace] = useState<string>(initialConfig.panelFace || '');
  const [selectedHingeType, setSelectedHingeType] = useState<string>(initialConfig.hingeType || '');
  const [selectedFrameFinish, setSelectedFrameFinish] = useState<string>(initialConfig.frameFinish || '');
  const [selectedTrackType, setSelectedTrackType] = useState<string>(initialConfig.trackType || '');
  const [selectedTrackFinish, setSelectedTrackFinish] = useState<string>(initialConfig.trackFinish || '');
  const [selectedFinalClosure, setSelectedFinalClosure] = useState<string>(initialConfig.finalClosure || '');
  const [selectedBottomSeals, setSelectedBottomSeals] = useState<string>(initialConfig.bottomSeals || '');
  const [selectedTopSeals, setSelectedTopSeals] = useState<string>(initialConfig.topSeals || '');

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
      const availableGlassTypes = getAvailableOptions('glassType');
      const availableSTCRatings = getAvailableOptions('stcRating');
      const availablePartitionSupports = getAvailableOptions('partitionSupport');
      const availablePassDoorTypes = getAvailableOptions('passDoorType');
      const availableFaces = getAvailableOptions('panelFaces');
      const availableHinging = getAvailableOptions('hinging');
      const availableFinishes = getAvailableOptions('frameFinishes');
      const availableTrackTypes = getAvailableOptions('trackType');
      const availableTrackFinishes = getAvailableOptions('trackFinish');
      const availableFinalClosures = getAvailableOptions('finalClosure');
      const availableBottomSeals = getAvailableOptions('bottomSeals');
      const availableTopSeals = getAvailableOptions('topSeals');

      // Reset if current selection is not available in new model
      if (!availableConfigs.includes(selectedConfiguration)) {
        setSelectedConfiguration('');
      }
      if (!availableOps.includes(selectedOperation)) {
        setSelectedOperation('');
      }
      if (!availableGlassTypes.includes(selectedGlassType)) {
        setSelectedGlassType('');
      }
      if (!availableSTCRatings.includes(selectedSTCRating)) {
        setSelectedSTCRating('');
      }
      if (!availablePartitionSupports.includes(selectedPartitionSupport)) {
        setSelectedPartitionSupport('');
      }
      if (!availablePassDoorTypes.includes(selectedPassDoorType)) {
        setSelectedPassDoorType('');
        setSelectedPassDoorOption(''); // Reset dependent field
      }
      if (!availableFaces.includes(selectedPanelFace)) {
        setSelectedPanelFace('');
      }
      if (!availableHinging.includes(selectedHingeType)) {
        setSelectedHingeType('');
      }
      if (!availableFinishes.includes(selectedFrameFinish)) {
        setSelectedFrameFinish('');
      }
      if (!availableTrackTypes.includes(selectedTrackType)) {
        setSelectedTrackType('');
      }
      if (!availableTrackFinishes.includes(selectedTrackFinish)) {
        setSelectedTrackFinish('');
      }
      if (!availableFinalClosures.includes(selectedFinalClosure)) {
        setSelectedFinalClosure('');
      }
      if (!availableBottomSeals.includes(selectedBottomSeals)) {
        setSelectedBottomSeals('');
      }
      if (!availableTopSeals.includes(selectedTopSeals)) {
        setSelectedTopSeals('');
      }
    }
  }, [selectedModel]);

  // Reset passDoorOption when passDoorType changes
  useEffect(() => {
    setSelectedPassDoorOption('');
  }, [selectedPassDoorType]);

  // Notify parent of configuration changes
  useEffect(() => {
    if (onConfigurationChange && selectedModel) {
      onConfigurationChange({
        model: selectedModel,
        configurationType: selectedConfiguration,
        operationType: selectedOperation,
        glassType: selectedGlassType,
        stc_rating: selectedSTCRating,
        partitionSupport: selectedPartitionSupport,
        passDoorType: selectedPassDoorType,
        passDoorOption: selectedPassDoorOption,
        panelFace: selectedPanelFace,
        hingeType: selectedHingeType,
        frameFinish: selectedFrameFinish,
        frameThickness: getFrameThickness(selectedModel),
        trackType: selectedTrackType,
        trackFinish: selectedTrackFinish,
        finalClosure: selectedFinalClosure,
        bottomSeals: selectedBottomSeals,
        topSeals: selectedTopSeals
      });
    }
  }, [
    selectedModel, selectedConfiguration, selectedOperation, selectedGlassType, selectedSTCRating,
    selectedPartitionSupport, selectedPassDoorType, selectedPassDoorOption, selectedPanelFace,
    selectedHingeType, selectedFrameFinish, selectedTrackType, selectedTrackFinish,
    selectedFinalClosure, selectedBottomSeals, selectedTopSeals, onConfigurationChange
  ]);

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

        {/* Step 6: Glass Type */}
        <div className="space-y-2">
          <Label htmlFor="glassType">Glass Type</Label>
          <Select 
            value={selectedGlassType} 
            onValueChange={setSelectedGlassType}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select glass type" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('glassType').map((glass) => (
                <SelectItem key={glass} value={glass}>
                  {glass}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 7: STC Rating */}
        <div className="space-y-2">
          <Label htmlFor="stcRating">STC Rating</Label>
          <Select 
            value={selectedSTCRating} 
            onValueChange={setSelectedSTCRating}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select STC rating" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('stcRating').map((rating) => (
                <SelectItem key={rating} value={rating}>
                  {rating}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 8: Partition Support */}
        <div className="space-y-2">
          <Label htmlFor="partitionSupport">Partition Support</Label>
          <Select 
            value={selectedPartitionSupport} 
            onValueChange={setSelectedPartitionSupport}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select partition support" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('partitionSupport').map((support) => (
                <SelectItem key={support} value={support}>
                  {support}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 9: Pass Door Type */}
        <div className="space-y-2">
          <Label htmlFor="passDoorType">Pass Door Type</Label>
          <Select 
            value={selectedPassDoorType} 
            onValueChange={setSelectedPassDoorType}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select pass door type" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('passDoorType').map((doorType) => (
                <SelectItem key={doorType} value={doorType}>
                  {doorType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 10: Pass Door Option (dependent on Pass Door Type) */}
        <div className="space-y-2">
          <Label htmlFor="passDoorOption">Pass Door Option</Label>
          <Select 
            value={selectedPassDoorOption} 
            onValueChange={setSelectedPassDoorOption}
            disabled={!selectedModel || !selectedPassDoorType}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedPassDoorType ? "Select pass door option" : "Select pass door type first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('passDoorOption').map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 11: Hinge Type */}
        <div className="space-y-2">
          <Label htmlFor="hingeType">Hinge Type</Label>
          <Select 
            value={selectedHingeType} 
            onValueChange={setSelectedHingeType}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select hinge type" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('hinging').map((hinge) => (
                <SelectItem key={hinge} value={hinge}>
                  {hinge}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 12: Track Type */}
        <div className="space-y-2">
          <Label htmlFor="trackType">Track Type</Label>
          <Select 
            value={selectedTrackType} 
            onValueChange={setSelectedTrackType}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select track type" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('trackType').map((track) => (
                <SelectItem key={track} value={track}>
                  {track}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 13: Track Finish */}
        <div className="space-y-2">
          <Label htmlFor="trackFinish">Track Finish</Label>
          <Select 
            value={selectedTrackFinish} 
            onValueChange={setSelectedTrackFinish}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select track finish" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('trackFinish').map((finish) => (
                <SelectItem key={finish} value={finish}>
                  {finish}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 14: Final Closure */}
        <div className="space-y-2">
          <Label htmlFor="finalClosure">Final Closure</Label>
          <Select 
            value={selectedFinalClosure} 
            onValueChange={setSelectedFinalClosure}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select final closure" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('finalClosure').map((closure) => (
                <SelectItem key={closure} value={closure}>
                  {closure}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 15: Bottom Seals */}
        <div className="space-y-2">
          <Label htmlFor="bottomSeals">Bottom Seals</Label>
          <Select 
            value={selectedBottomSeals} 
            onValueChange={setSelectedBottomSeals}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select bottom seals" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('bottomSeals').map((seal) => (
                <SelectItem key={seal} value={seal}>
                  {seal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 16: Top Seals */}
        <div className="space-y-2">
          <Label htmlFor="topSeals">Top Seals</Label>
          <Select 
            value={selectedTopSeals} 
            onValueChange={setSelectedTopSeals}
            disabled={!selectedModel}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedModel ? "Select top seals" : "Select model first"} />
            </SelectTrigger>
            <SelectContent>
              {getAvailableOptions('topSeals').map((seal) => (
                <SelectItem key={seal} value={seal}>
                  {seal}
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
              {selectedGlassType && <div><strong>Glass Type:</strong> {selectedGlassType}</div>}
              {selectedSTCRating && <div><strong>STC Rating:</strong> {selectedSTCRating}</div>}
              {selectedPartitionSupport && <div><strong>Partition Support:</strong> {selectedPartitionSupport}</div>}
              {selectedPassDoorType && <div><strong>Pass Door Type:</strong> {selectedPassDoorType}</div>}
              {selectedPassDoorOption && <div><strong>Pass Door Option:</strong> {selectedPassDoorOption}</div>}
              {selectedPanelFace && <div><strong>Panel Face:</strong> {selectedPanelFace}</div>}
              {selectedHingeType && <div><strong>Hinge Type:</strong> {selectedHingeType}</div>}
              {selectedFrameFinish && <div><strong>Frame Finish:</strong> {selectedFrameFinish}</div>}
              {selectedModel && <div><strong>Frame Thickness:</strong> {getFrameThickness(selectedModel)}</div>}
              {selectedTrackType && <div><strong>Track Type:</strong> {selectedTrackType}</div>}
              {selectedTrackFinish && <div><strong>Track Finish:</strong> {selectedTrackFinish}</div>}
              {selectedFinalClosure && <div><strong>Final Closure:</strong> {selectedFinalClosure}</div>}
              {selectedBottomSeals && <div><strong>Bottom Seals:</strong> {selectedBottomSeals}</div>}
              {selectedTopSeals && <div><strong>Top Seals:</strong> {selectedTopSeals}</div>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};