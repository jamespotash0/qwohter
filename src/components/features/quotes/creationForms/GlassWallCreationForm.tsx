import /*React,*/ { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { WallSpecification, isGlassWall } from '@/lib/types';
import { modelConfigurations, getAvailableOptions, getFrameThickness, GlassWallModel } from '@/lib/types/walls/glass';

interface GlassWallCreationFormProps {
  wall: WallSpecification;
  wallName: string;
  onWallChange: (wallName: string, field: string, value: string) => void;
}

const GlassWallCreationForm = ({ wall, wallName, onWallChange }: GlassWallCreationFormProps) => {
  // Early return if not a glass wall
  if (!isGlassWall(wall)) {
    return <div>This form is only for Glass Walls</div>;
  }

  const [selectedModel, setSelectedModel] = useState<string>(wall.model || '');
  const [selectedConfiguration, setSelectedConfiguration] = useState<string>(wall.panelConfiguration || '');
  const [selectedOperation, setSelectedOperation] = useState<string>(wall.operation || '');
  const [selectedGlassType, setSelectedGlassType] = useState<string>(wall.glassType || '');
  const [selectedSTCRating, setSelectedSTCRating] = useState<string>(wall.stcRating || '');
  const [selectedPartitionSupport, setSelectedPartitionSupport] = useState<string>(wall.partitionSupport || '');
  const [selectedPassDoorType, setSelectedPassDoorType] = useState<string>(wall.passDoorType || '');
  const [selectedPassDoorOption, setSelectedPassDoorOption] = useState<string>(wall.passDoorOption || '');
  const [selectedPanelFace, setSelectedPanelFace] = useState<string>(wall.panelFace || '');
  const [selectedHingeType, setSelectedHingeType] = useState<string>(wall.hingeType || '');
  const [selectedFrameFinish, setSelectedFrameFinish] = useState<string>(wall.frameFinish || '');
  const [selectedTrackType, setSelectedTrackType] = useState<string>(wall.trackType || '');
  const [selectedTrackSystem, setSelectedTrackSystem] = useState<string>(wall.trackSystem || '');
  const [selectedTrackFinish, setSelectedTrackFinish] = useState<string>(wall.trackFinish || '');
  const [selectedFinalClosure, setSelectedFinalClosure] = useState<string>(wall.finalClosure || '');
  const [selectedBottomSeals, setSelectedBottomSeals] = useState<string>(wall.bottomSeals || '');
  const [selectedTopSeals, setSelectedTopSeals] = useState<string>(wall.topSeals || '');

  const prevModelRef = useRef<string>('');
  const prevConfigRef = useRef<string>('');

  const handleFieldChange = (field: string, value: string) => {
    
    const actualValue = value === "none" ? "" : value;
    onWallChange(wallName, field, actualValue);
    const displayValue = value === "none" ? "" : value;
    
    if (field === 'model') {
      setSelectedModel(displayValue);
    } else if (field === 'panelConfiguration') {
      setSelectedConfiguration(displayValue);
    } else if (field === 'operation') {
      setSelectedOperation(displayValue);
    } else if (field === 'glassType') {
      setSelectedGlassType(displayValue);
    } else if (field === 'stcRating') {
      setSelectedSTCRating(displayValue);
    } else if (field === 'partitionSupport') {
      setSelectedPartitionSupport(displayValue);
    } else if (field === 'passDoorType') {
      setSelectedPassDoorType(displayValue);
    } else if (field === 'passDoorOption') {
      setSelectedPassDoorOption(displayValue);
    } else if (field === 'panelFace') {
      setSelectedPanelFace(displayValue);
    } else if (field === 'hingeType') {
      setSelectedHingeType(displayValue);
    } else if (field === 'frameFinish') {
      setSelectedFrameFinish(displayValue);
    } else if (field === 'trackType') {
      setSelectedTrackType(displayValue);
    } else if (field === 'trackSystem') {
      setSelectedTrackSystem(displayValue);
    } else if (field === 'trackFinish') {
      setSelectedTrackFinish(displayValue);
    } else if (field === 'finalClosure') {
      setSelectedFinalClosure(displayValue);
    } else if (field === 'bottomSeals') {
      setSelectedBottomSeals(displayValue);
    } else if (field === 'topSeals') {
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
      setSelectedTrackSystem('Architectural Grade Extruded Aluminum Alloy 6063-T6');
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
      setSelectedTrackSystem('Architectural Grade Extruded Aluminum Alloy 6063-T6'); // Keep default for glass walls
      setSelectedTrackFinish('');
      setSelectedFinalClosure('');
      setSelectedBottomSeals('');
      setSelectedTopSeals('');
    }
    prevConfigRef.current = selectedConfiguration;
  }, [selectedConfiguration]);

  useEffect(() => {
    if (isGlassWall(wall) && selectedPassDoorType !== wall.passDoorType) {
      setSelectedPassDoorOption('');
      onWallChange(wallName, 'passDoorOption', '');
    }
  }, [selectedPassDoorType, wall.passDoorType, wallName]);

  // Set default track system for glass walls if not already set
  useEffect(() => {
    if (isGlassWall(wall) && (!wall.trackSystem || wall.trackSystem === '')) {
      onWallChange(wallName, 'trackSystem', 'Architectural Grade Extruded Aluminum Alloy 6063-T6');
    }
  }, [wall, wallName, onWallChange]);

  return (
    <div>
      <h4 className="text-lg font-semibold mb-4 text-foreground border-b pb-2">Glass Wall Details</h4>
      {/* <Card className="w-full">
        <CardContent className="space-y-8"> */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Glass Wall Model *</Label>
              <Select value={selectedModel} onValueChange={(value) => handleFieldChange('model', value)}>
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
                onValueChange={(value) => handleFieldChange('panelConfiguration', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={"Select panel configuration"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {getAvailableOptions(selectedModel as GlassWallModel, 'configurations').map((config) => (
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
                onValueChange={(value) => handleFieldChange('operation', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select operation type" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {getAvailableOptions(selectedModel as GlassWallModel, 'operations').map((operation) => (
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
                onValueChange={(value) => handleFieldChange('glassType', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select glass type" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {getAvailableOptions(selectedModel as GlassWallModel,'glassType').map((glass) => (
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
                onValueChange={(value) => handleFieldChange('stcRating', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select STC rating" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {getAvailableOptions(selectedModel as GlassWallModel,'stcRating').map((rating) => (
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
                onValueChange={(value) => handleFieldChange('partitionSupport', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select partition support" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {getAvailableOptions(selectedModel as GlassWallModel, 'partitionSupport').map((support) => (
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
                value={getFrameThickness(selectedModel as GlassWallModel)}
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
                onValueChange={(value) => handleFieldChange('panelFace', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={"Select panel face options"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'panelFaces').map((face) => (
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
                onValueChange={(value) => handleFieldChange('frameFinish', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select frame finish" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'frameFinishes').map((finish) => (
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
                onValueChange={(value) => handleFieldChange('hingeType', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select hinge type" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'hinging').map((hinge) => (
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
                onValueChange={(value) => handleFieldChange('passDoorType', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select pass door type" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'passDoorType').map((doorType) => (
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
                onValueChange={(value) => handleFieldChange('passDoorOption', value)}
                disabled={!selectedModel || !selectedPassDoorType}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedPassDoorType ? "Select pass door option" : "Select pass door type first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'passDoorOption').map((option) => (
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
                onValueChange={(value) => handleFieldChange('finalClosure', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select final closure" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'finalClosure').map((closure) => (
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
                onValueChange={(value) => handleFieldChange('bottomSeals', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select bottom seals" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'bottomSeals').map((seal) => (
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
                onValueChange={(value) => handleFieldChange('topSeals', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select top seals" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel,'topSeals').map((seal) => (
                    <SelectItem key={seal} value={seal}>
                      {seal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Track Type *</Label>
              <Select 
                value={selectedTrackType} 
                onValueChange={(value) => handleFieldChange('trackType', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select track type" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  {getAvailableOptions(selectedModel as GlassWallModel, 'trackType').map((track) => (
                    <SelectItem key={track} value={track}>
                      {track}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Track System</Label>
              <Select 
                value={selectedTrackSystem} 
                onValueChange={(value) => handleFieldChange('trackSystem', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select track system" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="Architectural Grade Extruded Aluminum Alloy 6063-T6">Architectural Grade Extruded Aluminum Alloy 6063-T6</SelectItem>
                  <SelectItem value="Standard Steel Track">Standard Steel Track</SelectItem>
                  <SelectItem value="Custom Track System">Custom Track System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Track Finish</Label>
              <Select 
                value={selectedTrackFinish} 
                onValueChange={(value) => handleFieldChange('trackFinish', value)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Select track finish" : "Select model first"} />
                </SelectTrigger>
                <SelectContent className="bg-background border z-50">
                  <SelectItem value="none">None</SelectItem>
                  {getAvailableOptions(selectedModel as GlassWallModel, 'trackFinish').map((finish) => (
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