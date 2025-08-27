import /*React,*/ { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { WallSpecification } from '@/types/quote';

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
    floorGuide: ['None'],
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

interface GlassWallCreationFormProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, field: keyof WallSpecification, value: string) => void;
}

const GlassWallCreationForm = ({ wall, wallName, onWallChange }: GlassWallCreationFormProps) => {
  const [selectedModel, setSelectedModel] = useState<string>(wall.glasswallModel || '');
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>(wall.glasswallPanelConfiguration || '');
  const [selectedOperation, setSelectedOperation] = useState<string>(wall.glasswallOperation || '');
  const [selectedGlassType, setSelectedGlassType] = useState<string>(wall.glasswallGlassType || '');
  const [selectedSTCRating, setSelectedSTCRating] = useState<string>(wall.glasswallSTCRating || '');
  const [selectedPartitionSupport, setSelectedPartitionSupport] = useState<string>(wall.glasswallPartitionSupport || '');
  const [selectedPassDoorType, setSelectedPassDoorType] = useState<string>(wall.glasswallPassDoorType || '');
  const [selectedPassDoorOption, setSelectedPassDoorOption] = useState<string>(wall.glasswallPassDoorOption || '');
  const [selectedPanelFace, setSelectedPanelFace] = useState<string>(wall.glasswallPanelFace || '');
  const [selectedHingeType, setSelectedHingeType] = useState<string>(wall.glasswallHingeType || '');
  const [selectedFrameFinish, setSelectedFrameFinish] = useState<string>(wall.glasswallFrameFinish || '');
  const [selectedTrackType, setSelectedTrackType] = useState<string>(wall.glasswallTrackType || '');
  const [selectedTrackFinish, setSelectedTrackFinish] = useState<string>(wall.glasswallTrackFinish || '');
  const [selectedFinalClosure, setSelectedFinalClosure] = useState<string>(wall.glasswallFinalClosure || '');
  const [selectedBottomSeals, setSelectedBottomSeals] = useState<string>(wall.glasswallBottomSeals || '');
  const [selectedTopSeals, setSelectedTopSeals] = useState<string>(wall.glasswallTopSeals || '');

  const prevModelRef = useRef<string>('');
  const prevConfigRef = useRef<string>('');

  const getAvailableOptions = (field: string) => {
    if (!selectedModel || !(selectedModel in modelConfigurations)) return [];
    const modelConfig = modelConfigurations[selectedModel as keyof typeof modelConfigurations];
    return (modelConfig as any)[field] || [];
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


  const handleFieldChange = (field: keyof WallSpecification, value: string) => {
    // Convert "none" to empty string to reset field to placeholder
    const actualValue = value === "none" ? "" : value;
    onWallChange(wallName, field, actualValue);
    
    // Convert "none" to empty string for display state as well
    const displayValue = value === "none" ? "" : value;
    
    if (field === 'glasswallModel') {
      setSelectedModel(displayValue);
    } else if (field === 'glasswallPanelConfiguration') {
      setSelectedConfiguration(displayValue);
    } else if (field === 'glasswallOperation') {
      setSelectedOperation(displayValue);
    } else if (field === 'glasswallGlassType') {
      setSelectedGlassType(displayValue);
    } else if (field === 'glasswallSTCRating') {
      setSelectedSTCRating(displayValue);
    } else if (field === 'glasswallPartitionSupport') {
      setSelectedPartitionSupport(displayValue);
    } else if (field === 'glasswallPassDoorType') {
      setSelectedPassDoorType(displayValue);
    } else if (field === 'glasswallPassDoorOption') {
      setSelectedPassDoorOption(displayValue);
    } else if (field === 'glasswallPanelFace') {
      setSelectedPanelFace(displayValue);
    } else if (field === 'glasswallHingeType') {
      setSelectedHingeType(displayValue);
    } else if (field === 'glasswallFrameFinish') {
      setSelectedFrameFinish(displayValue);
    } else if (field === 'glasswallTrackType') {
      setSelectedTrackType(displayValue);
    } else if (field === 'glasswallTrackFinish') {
      setSelectedTrackFinish(displayValue);
    } else if (field === 'glasswallFinalClosure') {
      setSelectedFinalClosure(displayValue);
    } else if (field === 'glasswallBottomSeals') {
      setSelectedBottomSeals(displayValue);
    } else if (field === 'glasswallTopSeals') {
      setSelectedTopSeals(displayValue);
    }
  };

  useEffect(() => {
    if (prevModelRef.current !== selectedModel && prevModelRef.current !== '') {
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
    }
    prevModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    if (prevConfigRef.current !== selectedConfiguration && prevConfigRef.current !== '') {
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
    }
    prevConfigRef.current = selectedConfiguration;
  }, [selectedConfiguration]);

  useEffect(() => {
    if (selectedPassDoorType !== wall.glasswallPassDoorType) {
      setSelectedPassDoorOption('');
      onWallChange(wallName, 'glasswallPassDoorOption', '');
    }
  }, [selectedPassDoorType, wall.glasswallPassDoorType, wallName]);

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Glass Wall Details</h4>
      {/* <Card className="w-full">
        <CardContent className="space-y-8"> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Glass Wall Model *</Label>
              <Select value={selectedModel} onValueChange={(value) => handleFieldChange('glasswallModel', value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select glass wall model" />
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
              <Label className="text-sm font-medium">Panel Configuration *</Label>
              <Select 
                value={selectedConfiguration} 
                onValueChange={(value) => handleFieldChange('glasswallPanelConfiguration', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={"Select panel configuration"} />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Operation Type *</Label>
              <Select 
                value={selectedOperation} 
                onValueChange={(value) => handleFieldChange('glasswallOperation', value)}
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
              <Label className="text-sm font-medium">Glass Type *</Label>
              <Select 
                value={selectedGlassType} 
                onValueChange={(value) => handleFieldChange('glasswallGlassType', value)}
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
              <Label className="text-sm font-medium">STC Rating *</Label>
              <Select 
                value={selectedSTCRating} 
                onValueChange={(value) => handleFieldChange('glasswallSTCRating', value)}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Partition Support *</Label>
              <Select 
                value={selectedPartitionSupport} 
                onValueChange={(value) => handleFieldChange('glasswallPartitionSupport', value)}
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
              <Label className="text-sm font-medium">Frame Thickness</Label>
              <Input 
                value={getFrameThickness(selectedModel)}
                readOnly
                className="bg-muted text-muted-foreground"
              />
            </div>

            {/* Panel Width removed */}
            <div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Panel Face Options</Label>
              <Select 
                value={selectedPanelFace} 
                onValueChange={(value) => handleFieldChange('glasswallPanelFace', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={"Select panel face options"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('panelFaces').map((face) => (
                    <SelectItem key={face} value={face}>
                      {face}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Frame Finish Options</Label>
              <Select 
                value={selectedFrameFinish} 
                onValueChange={(value) => handleFieldChange('glasswallFrameFinish', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select frame finish" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('frameFinishes').map((finish) => (
                    <SelectItem key={finish} value={finish}>
                      {finish}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Hinge Type</Label>
              <Select 
                value={selectedHingeType} 
                onValueChange={(value) => handleFieldChange('glasswallHingeType', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select hinge type" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('hinging').map((hinge) => (
                    <SelectItem key={hinge} value={hinge}>
                      {hinge}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pass Door Type</Label>
              <Select 
                value={selectedPassDoorType} 
                onValueChange={(value) => handleFieldChange('glasswallPassDoorType', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select pass door type" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('passDoorType').map((doorType) => (
                    <SelectItem key={doorType} value={doorType}>
                      {doorType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Pass Door Option</Label>
              <Select 
                value={selectedPassDoorOption} 
                onValueChange={(value) => handleFieldChange('glasswallPassDoorOption', value)}
                disabled={!selectedModel || !selectedPassDoorType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedPassDoorType ? "Select pass door option" : "Select pass door type first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('passDoorOption').map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Final Closure</Label>
              <Select 
                value={selectedFinalClosure} 
                onValueChange={(value) => handleFieldChange('glasswallFinalClosure', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select final closure" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('finalClosure').map((closure) => (
                    <SelectItem key={closure} value={closure}>
                      {closure}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bottom Seals</Label>
              <Select 
                value={selectedBottomSeals} 
                onValueChange={(value) => handleFieldChange('glasswallBottomSeals', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select bottom seals" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('bottomSeals').map((seal) => (
                    <SelectItem key={seal} value={seal}>
                      {seal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Top Seals</Label>
              <Select 
                value={selectedTopSeals} 
                onValueChange={(value) => handleFieldChange('glasswallTopSeals', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select top seals" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('topSeals').map((seal) => (
                    <SelectItem key={seal} value={seal}>
                      {seal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Track Type *</Label>
              <Select 
                value={selectedTrackType} 
                onValueChange={(value) => handleFieldChange('glasswallTrackType', value)}
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
              <Label className="text-sm font-medium">Track Finish</Label>
              <Select 
                value={selectedTrackFinish} 
                onValueChange={(value) => handleFieldChange('glasswallTrackFinish', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select track finish" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions('trackFinish').map((finish) => (
                    <SelectItem key={finish} value={finish}>
                      {finish}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        {/* </CardContent>
      </Card> */}
    </div>
  );
};

export default GlassWallCreationForm;