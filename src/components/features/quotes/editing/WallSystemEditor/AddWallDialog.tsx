import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { OperableWallEditForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/OperableWallEditForm';
import { GlassWallEditForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/GlassWallEditForm';

interface AddWallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wallName: string, wallData: any) => Promise<void> | void;
  onDatabaseSave?: () => Promise<void>;
  existingWalls?: Record<string, any>;
}

export const AddWallDialog: React.FC<AddWallDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  onDatabaseSave,
  existingWalls = {}
}) => {
  // Function to generate the next wall name using A, B, C... convention
  const generateNextWallName = () => {
    const existingNames = Object.keys(existingWalls || {});
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    console.log('Generating wall name. Existing walls:', existingNames);
    
    // If no existing walls, start with 'Wall A'
    if (existingNames.length === 0) {
      console.log('No existing walls, returning Wall A');
      return 'Wall A';
    }
    
    // Find the next available letter
    for (let i = 0; i < letters.length; i++) {
      const letter = `Wall ${letters[i]}`;
      if (!existingNames.includes(letter)) {
        console.log('Next available letter:', letter);
        return letter;
      }
    }
    
    // Fallback to numbers if all letters are used
    let counter = 1;
    while (existingNames.includes(`Wall ${counter}`)) {
      counter++;
    }
    console.log('Using numbered fallback:', `Wall ${counter}`);
    return `Wall ${counter}`;
  };

  // Empty wall template
  const emptyWall = {
    wallSystemType: '',
    lengthFeet: '',
    lengthInches: '',
    heightFeet: '',
    heightInches: '',
    quantity: '1',
    panelConfiguration: '',
    panelCount: '',
    series: '',
    model: '',
    panelThickness: '',
    panelDesign: '',
    panelSkin: '',
    stcRating: '',
    passDoorPanels: '',
    passDoorQuantity: '',
    panelFinishCategory: '',
    panelFinishSpecificItem: '',
    verticalSeals: '',
    bottomSeals: '',
    topSeals: '',
    initialClosureSystem: '',
    endPanelType: '',
    trackType: '',
    trackSystem: '',
    structureSupport: '',
    pocketDoors: {
      foldType: '',
      foldStyle: ''
    },
    // Glass Wall specific fields
    glasswallModel: '',
    glasswallOperation: '',
    glasswallPanelConfiguration: '',
    glasswallPanelFace: '',
    glasswallFrameFinish: '',
    glasswallGlassType: '',
    glasswallSTCRating: '',
    glasswallPartitionSupport: '',
    glasswallPassDoorType: '',
    glasswallPassDoorOption: '',
    glasswallHingeType: '',
    glasswallFrameThickness: '',
    glasswallTrackSystem: '',
    glasswallTrackType: '',
    glasswallTrackFinish: '',
    glasswallFinalClosure: '',
    glasswallBottomSeals: '',
    glasswallTopSeals: ''
  };

  const [newWall, setNewWall] = useState(emptyWall);
  const [wallName, setWallName] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Set initial wall name when component mounts
  useEffect(() => {
    const newName = generateNextWallName();
    console.log('Setting initial wall name to:', newName);
    setWallName(newName);
  }, [existingWalls]);

  // Regenerate wall name when dialog opens
  useEffect(() => {
    if (isOpen) {
      const newName = generateNextWallName();
      console.log('Setting wall name on dialog open to:', newName);
      setWallName(newName);
    }
  }, [isOpen]);

  // Helper functions for cascading logic (copied from EditWallSystemDialog)
  const getSeriesByPanelConfiguration = (panelConfiguration: string): string[] => {
    switch (panelConfiguration) {
      case "Individual Panels":
        return ["2000", "3000", "Hufcor: 600"];
      case "Hinged-Paired Panels":
        return ["2000", "3000"];
      case "Continuously-Hinged Panels":
        return ["2000", "3000"];
      default:
        return [];
    }
  };

  const getModelsByPanelConfigurationAndSeries = (panelConfiguration: string, series: string): string[] => {
    if (panelConfiguration === "Individual Panels") {
      if (series === "2000") return ["2010", "2020", "2010GL", "2020GL"];
      if (series === "3000") return ["3010", "3020", "3010GL", "3020GL"];
      if (series === "Hufcor: 600") return ["Hufcor 641"];
    } else if (panelConfiguration === "Continuously-Hinged Panels") {
      if (series === "2000") return ["2050e"];
      if (series === "3000") return ["3050e"];
    } else if (panelConfiguration === "Hinged-Paired Panels") {
      if (series === "2000") return ["2030", "2030GL"];
      if (series === "3000") return ["3030", "3030GL"];
    }
    return [];
  };

  const getPanelSkinOptions = (model: string): string[] => {
    if (["Hufcor 641"].includes(model)) {
      return ["Steel"];
    }
    if (["3010", "3020", "3030"].includes(model)) {
      return ["Standard Steel Skin", "Optional Acoustical Substrate", "Optional Wood Veneer", "Optional High-Pressure Laminate"];
    }
    if (["3050e", "3010GL", "3020GL", "3030GL"].includes(model)) {
      return ["Standard Steel Skin", "Optional Acoustical Substrate"];
    }
    if (["2010", "2020", "2030"].includes(model)) {
      return ["Standard Acoustical Substrate", "Optional Steel Skin", "Optional Wood Veneer", "Optional High-Pressure Laminate"];
    }
    if (["2050e", "2010GL", "2020GL", "2030GL"].includes(model)) {
      return ["Standard Acoustical Substrate", "Optional Steel Skin"];
    }
    return [];
  };

  const getSTCRatingOptions = (model: string, panelSkin: string): string[] => {
    if (!model || !panelSkin) return [];
    if (["Hufcor 641"].includes(model)) {
      return ["43", "47", "49", "52", "54", "56"];
    }
    if (["2010GL", "2020GL", "2030GL"].includes(model)) {
      return ["38"];
    }

    if (["3010GL", "3020GL", "3030GL"].includes(model)) {
      return ["43", "48"];
    }

    if (["2010", "2020", "2030", "2050e"].includes(model)) {
      if (panelSkin.includes("Acoustical Substrate")) {
        return ["42", "45", "49", "50"];
      }
      if (panelSkin.includes("Steel")) {
        return ["49", "51"];
      }
    }

    if (["3010", "3020", "3030", "3050e"].includes(model)) {
      if (panelSkin.includes("Steel")) {
        return ["46", "50", "52", "56"];
      }
      if (panelSkin.includes("Acoustical Substrate")) {
        return ["43", "46", "48", "50"];
      }
    }

    return [];
  };

  const getTrackTypeByModel = (model: string): string => {
    if (["Hufcor 641", "2010", "2010GL", "3010", "3010GL"].includes(model)) {
      return "Curve & Diverter (Individual) Track";
    } else if (["2020", "2020GL", "3020", "3020GL"].includes(model)) {
      return "Multi-Directional Track";
    } else if (["2050e", "3050e", "3030", "3030GL", "2030", "2030GL"].includes(model)) {
      return "Hinged-Pair (Straight Line) Track";
    }
    return "";
  };

  const getTrackSystemsByTrackType = (trackType: string, model?: string): string[] => {
    if (model === "Hufcor 641") {
      return ["Type 26 Clear Satin-Anodized Aluminum", "Type 36 Clear Satin-Anodized Aluminum", "Type 57 Clear Anodized Aluminum", "Type 11L Powder Coated Off-White Steel", "Type 11 Powder Coated Off-White Steel"];
    }
    switch (trackType) {
      case "Multi-Directional Track":
        return ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum"];
      case "Hinged-Pair (Straight Line) Track":
        return ["Type 425 Clear Satin-Anodized Aluminum", "Type 850 Clear Satin-Anodized Aluminum"];
      case "Curve & Diverter (Individual) Track":
        return ["Type 850 Powder Coated Off-White Steel"];
      default:
        return [];
    }
  };

  // Reset wall data when dialog opens
  useEffect(() => {
    if (isOpen) {
      setNewWall(emptyWall);
      setHasChanges(false);
      // Don't reset wallName here - let the other useEffect handle it
    }
  }, [isOpen]);

  const handleFieldChange = (_fieldWallName: string, field: string, value: any) => {
    setNewWall(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    try {
      console.log('Saving wall with name:', wallName, 'and data:', newWall);
      // Save wall data - database save is now handled by the parent component
      await onSave(wallName, newWall);
      
      setShowConfirmDialog(false);
      onClose();
    } catch (error) {
      console.error('Error saving wall:', error);
      // Keep dialog open if save fails
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Wall</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Wall Name */}
            <div className="space-y-2">
              <Label className="text-xs">Wall Name</Label>
              <Input 
                className="text-xs h-8 bg-muted text-muted-foreground"
                value={wallName}
                readOnly
                placeholder="Auto-generated wall name"
              />
            </div>

            {/* Basic Wall Information */}
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Length (ft) *</Label>
                  <Input className="text-xs h-8"
                    value={newWall.lengthFeet || ''}
                    onChange={(e) => handleFieldChange(wallName, 'lengthFeet', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Length (in)</Label>
                  <Input className="text-xs h-8"
                    value={newWall.lengthInches || ''}
                    onChange={(e) => handleFieldChange(wallName, 'lengthInches', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Height (ft) *</Label>
                  <Input className="text-xs h-8"
                    value={newWall.heightFeet || ''}
                    onChange={(e) => handleFieldChange(wallName, 'heightFeet', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Height (in)</Label>
                  <Input className="text-xs h-8"
                    value={newWall.heightInches || ''}
                    onChange={(e) => handleFieldChange(wallName, 'heightInches', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Panel Count *</Label>
                  <Input className="text-xs h-8"
                    value={newWall.panelCount || ''}
                    onChange={(e) => handleFieldChange(wallName, 'panelCount', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Quantity</Label>
                  <Input className="text-xs h-8"
                    value={newWall.quantity || '1'}
                    onChange={(e) => handleFieldChange(wallName, 'quantity', e.target.value)}
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Wall System Type */}
              <div className="space-y-2">
                <Label className="text-xs">Wall System Type *</Label>
                <Select
                  value={newWall.wallSystemType || ''}
                  onValueChange={(value) => {
                    // When changing wall system type, reset wall-specific fields but keep basic dimensions
                    const resetWall = {
                      ...newWall,
                      wallSystemType: value,
                      // Reset specification fields but keep basic dimensions
                      panelConfiguration: '',
                      series: '',
                      model: '',
                      panelSkin: '',
                      stcRating: '',
                      panelThickness: '',
                      panelDesign: '',
                      trackType: '',
                      trackSystem: value === 'Glass Wall' ? 'Architectural Grade Extruded Aluminum Alloy 6063-T6' : ''
                    };
                    setNewWall(resetWall);
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select wall system type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operable Wall">Operable Wall</SelectItem>
                    <SelectItem value="Glass Wall">Glass Wall</SelectItem>
                    <SelectItem value="Accordion Wall">Accordion Wall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Wall System Specifications */}
            {newWall.wallSystemType === "Operable Wall" && (
              <div className="space-y-2">
                {/* Panel Configuration, Series, Model - Cascading */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Panel Configuration *</Label>
                    <Select
                      value={newWall.panelConfiguration || ''}
                      onValueChange={(value) => {
                        handleFieldChange(wallName, 'panelConfiguration', value);
                        // Reset dependent fields
                        handleFieldChange(wallName, 'series', '');
                        handleFieldChange(wallName, 'model', '');
                        handleFieldChange(wallName, 'panelSkin', '');
                        handleFieldChange(wallName, 'stcRating', '');
                        handleFieldChange(wallName, 'panelThickness', '');
                        handleFieldChange(wallName, 'trackType', '');
                        handleFieldChange(wallName, 'trackSystem', '');
                      }}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select panel configuration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Individual Panels">Individual Panels</SelectItem>
                        <SelectItem value="Hinged-Paired Panels">Hinged-Paired Panels</SelectItem>
                        <SelectItem value="Continuously-Hinged Panels">Continuously-Hinged Panels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Series *</Label>
                    <Select
                      value={newWall.series || ''}
                      onValueChange={(value) => {
                        handleFieldChange(wallName, 'series', value);
                        // Reset dependent fields
                        handleFieldChange(wallName, 'model', '');
                        handleFieldChange(wallName, 'panelSkin', '');
                        handleFieldChange(wallName, 'stcRating', '');
                        handleFieldChange(wallName, 'trackType', '');
                        handleFieldChange(wallName, 'trackSystem', '');
                        // Auto-calculate panel thickness
                        const thickness = value === "2000" ? "3\"" : value === "3000" ? "4\"" : value === "Hufcor: 600" ? "4\"" : "";
                        if (thickness) {
                          handleFieldChange(wallName, 'panelThickness', thickness);
                        }
                      }}
                      disabled={!newWall.panelConfiguration}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select series" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSeriesByPanelConfiguration(newWall.panelConfiguration).map((series) => (
                          <SelectItem key={series} value={series}>
                            {series} Series
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Model *</Label>
                    <Select
                      value={newWall.model || ''}
                      onValueChange={(value) => {
                        handleFieldChange(wallName, 'model', value);
                        // Reset dependent fields
                        handleFieldChange(wallName, 'panelSkin', '');
                        handleFieldChange(wallName, 'stcRating', '');
                        handleFieldChange(wallName, 'trackSystem', '');
                        // Auto-calculate track type based on model
                        const trackType = getTrackTypeByModel(value);
                        if (trackType) {
                          handleFieldChange(wallName, 'trackType', trackType);
                        }
                      }}
                      disabled={!newWall.series}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {getModelsByPanelConfigurationAndSeries(newWall.panelConfiguration, newWall.series).map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Panel Thickness, Panel Skin, STC Rating */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Panel Thickness (inches)</Label>
                    <Input
                      value={newWall.panelThickness || ''}
                      placeholder="Auto-calculated"
                      readOnly
                      className="text-xs h-8 bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Panel Skin *</Label>
                    <Select
                      value={newWall.panelSkin || ''}
                      onValueChange={(value) => {
                        handleFieldChange(wallName, 'panelSkin', value);
                        // Reset STC rating when panel skin changes
                        handleFieldChange(wallName, 'stcRating', '');
                      }}
                      disabled={!newWall.model}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select panel skin" />
                      </SelectTrigger>
                      <SelectContent>
                        {getPanelSkinOptions(newWall.model).map((skin) => (
                          <SelectItem key={skin} value={skin}>
                            {skin}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">STC Rating *</Label>
                    <Select
                      value={newWall.stcRating || ''}
                      onValueChange={(value) => handleFieldChange(wallName, 'stcRating', value)}
                      disabled={!newWall.model || !newWall.panelSkin}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select STC rating" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSTCRatingOptions(newWall.model, newWall.panelSkin).map((rating) => (
                          <SelectItem key={rating} value={rating}>
                            {rating}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Track Type and Track System */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Track Type *</Label>
                    <Input
                      value={newWall.trackType || ''}
                      placeholder="Auto-calculated from model"
                      readOnly
                      className="text-xs h-8 bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Track System *</Label>
                    <Select
                      value={newWall.trackSystem || ''}
                      onValueChange={(value) => handleFieldChange(wallName, 'trackSystem', value)}
                      disabled={!newWall.trackType}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Select track system" />
                      </SelectTrigger>
                      <SelectContent>
                        {getTrackSystemsByTrackType(newWall.trackType, newWall.model).map((system) => (
                          <SelectItem key={system} value={system}>
                            {system}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Use the existing OperableWallForm for the remaining fields */}
                <OperableWallEditForm
                  wall={newWall}
                  wallName={wallName}
                  onFieldChange={handleFieldChange}
                  hideHierarchicalFields={true}
                />
              </div>
            )}

            {newWall.wallSystemType === "Glass Wall" && (
              <div className="space-y-4">
                <GlassWallEditForm
                  wall={newWall}
                  wallName={wallName}
                  onFieldChange={handleFieldChange}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Add Wall
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Wall</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add this wall? This action will save the changes to the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Add Wall</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};