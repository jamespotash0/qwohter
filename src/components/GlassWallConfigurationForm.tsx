import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';

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
  // const [selectedPanelCount, setSelectedPanelCount] = useState<string>(initialConfig.panelCount || '');

  // Track previous model to avoid clearing during initial load
  const prevModelRef = useRef<string>('');

  // Sync local state when initialConfig changes (e.g., editing existing quote)
  useEffect(() => {
    if (!initialConfig) return;
    if (initialConfig.model !== undefined) setSelectedModel(initialConfig.model || '');
    if (initialConfig.configurationType !== undefined) setSelectedConfiguration(initialConfig.configurationType || '');
    if (initialConfig.operationType !== undefined) setSelectedOperation(initialConfig.operationType || '');
    if (initialConfig.glassType !== undefined) setSelectedGlassType(initialConfig.glassType || '');
    if (initialConfig.stc_rating !== undefined) setSelectedSTCRating(initialConfig.stc_rating || '');
    if (initialConfig.partitionSupport !== undefined) setSelectedPartitionSupport(initialConfig.partitionSupport || '');
    if (initialConfig.passDoorType !== undefined) setSelectedPassDoorType(initialConfig.passDoorType || '');
    if (initialConfig.passDoorOption !== undefined) setSelectedPassDoorOption(initialConfig.passDoorOption || '');
    if (initialConfig.panelFace !== undefined) setSelectedPanelFace(initialConfig.panelFace || '');
    if (initialConfig.hingeType !== undefined) setSelectedHingeType(initialConfig.hingeType || '');
    if (initialConfig.frameFinish !== undefined) setSelectedFrameFinish(initialConfig.frameFinish || '');
    if (initialConfig.trackType !== undefined) setSelectedTrackType(initialConfig.trackType || '');
    if (initialConfig.trackFinish !== undefined) setSelectedTrackFinish(initialConfig.trackFinish || '');
    if (initialConfig.finalClosure !== undefined) setSelectedFinalClosure(initialConfig.finalClosure || '');
    if (initialConfig.bottomSeals !== undefined) setSelectedBottomSeals(initialConfig.bottomSeals || '');
    if (initialConfig.topSeals !== undefined) setSelectedTopSeals(initialConfig.topSeals || '');
    // if (initialConfig.panelCount !== undefined) setSelectedPanelCount(initialConfig.panelCount || '');
  }, [initialConfig]);
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
  // Reset all fields when model changes (but skip initial load)
  useEffect(() => {
    // Skip reset during first-time initialization when previous model was empty
    if (!prevModelRef.current && selectedModel) {
      prevModelRef.current = selectedModel;
      return;
    }

    if (prevModelRef.current !== selectedModel) {
      setSelectedConfiguration('');
      setSelectedOperation('');
      setSelectedGlassType('');
      setSelectedSTCRating('');
      setSelectedPartitionSupport('');
      setSelectedPassDoorType('');
      setSelectedPassDoorOption('');
      setSelectedPanelFace('');
      setSelectedHingeType('');
      setSelectedFrameFinish('');
      setSelectedTrackType('');
      setSelectedTrackFinish('');
      setSelectedFinalClosure('');
      setSelectedBottomSeals('');
      setSelectedTopSeals('');
      // setSelectedPanelCount('');
    }

    prevModelRef.current = selectedModel;
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
        topSeals: selectedTopSeals,
        // panelCount: selectedPanelCount
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
      <CardContent className="space-y-8">
        {/* Row 1: Glass Wall Model, Panel Configuration, Panel Count */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Glass Wall Model *</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {Object.keys(modelConfigurations).map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="configuration">Panel Configuration *</Label>
            <Select 
              value={selectedConfiguration} 
              onValueChange={setSelectedConfiguration}
              disabled={!selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModel ? "Select configuration" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('configurations').map((config) => (
                  <SelectItem key={config} value={config}>
                    {config}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* <div className="space-y-2">
            <Label htmlFor="panelCount">Panel Count</Label>
            <Input 
              value={selectedPanelCount}
              onChange={(e) => setSelectedPanelCount(e.target.value)}
              placeholder="Enter panel count"
              type="number"
              min="1"
            />
          </div> */}
        </div>

        {/* Row 2: Operation Type, Glass Type, STC Rating */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('operations').map((operation) => (
                  <SelectItem key={operation} value={operation}>
                    {operation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="glassType">Glass Type *</Label>
            <Select 
              value={selectedGlassType} 
              onValueChange={setSelectedGlassType}
              disabled={!selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModel ? "Select glass type" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('glassType').map((glass) => (
                  <SelectItem key={glass} value={glass}>
                    {glass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stcRating">STC Rating *</Label>
            <Select 
              value={selectedSTCRating} 
              onValueChange={setSelectedSTCRating}
              disabled={!selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModel ? "Select STC rating" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('stcRating').map((rating) => (
                  <SelectItem key={rating} value={rating}>
                    {rating}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Partition Support, Frame Thickness, Panel Width */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="partitionSupport">Partition Support *</Label>
            <Select 
              value={selectedPartitionSupport} 
              onValueChange={setSelectedPartitionSupport}
              disabled={!selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModel ? "Select partition support" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('partitionSupport').map((support) => (
                  <SelectItem key={support} value={support}>
                    {support}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frameThickness">Frame Thickness (Auto-calculated)</Label>
            <Input 
              value={getFrameThickness(selectedModel)}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="panelWidth">Panel Width (Auto-calculated)</Label>
            <Input 
              value={getPanelWidth(selectedModel)}
              readOnly
              className="bg-muted text-muted-foreground"
            />
          </div>
        </div>

        {/* Row 4: Panel Face Options, Frame Finish Options, Hinge Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="panelFace">Panel Face Options</Label>
            <Select 
              value={selectedPanelFace} 
              onValueChange={setSelectedPanelFace}
              disabled={!selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModel ? "Select panel face" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('panelFaces').map((face) => (
                  <SelectItem key={face} value={face}>
                    {face}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frameFinish">Frame Finish Options</Label>
            <Select 
              value={selectedFrameFinish} 
              onValueChange={setSelectedFrameFinish}
              disabled={!selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModel ? "Select frame finish" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('frameFinishes').map((finish) => (
                  <SelectItem key={finish} value={finish}>
                    {finish}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('hinging').map((hinge) => (
                  <SelectItem key={hinge} value={hinge}>
                    {hinge}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 5: Pass Door Type, Pass Door Option, Final Closure */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('passDoorType').map((doorType) => (
                  <SelectItem key={doorType} value={doorType}>
                    {doorType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('passDoorOption').map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('finalClosure').map((closure) => (
                  <SelectItem key={closure} value={closure}>
                    {closure}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 6: Bottom Seals, Top Seals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('bottomSeals').map((seal) => (
                  <SelectItem key={seal} value={seal}>
                    {seal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('topSeals').map((seal) => (
                  <SelectItem key={seal} value={seal}>
                    {seal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 7: Track Type, Track Finish */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="trackType">Track Type *</Label>
            <Select 
              value={selectedTrackType} 
              onValueChange={setSelectedTrackType}
              disabled={!selectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedModel ? "Select track type" : "Select model first"} />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('trackType').map((track) => (
                  <SelectItem key={track} value={track}>
                    {track}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <SelectContent className="bg-background border z-50">
                {getAvailableOptions('trackFinish').map((finish) => (
                  <SelectItem key={finish} value={finish}>
                    {finish}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};