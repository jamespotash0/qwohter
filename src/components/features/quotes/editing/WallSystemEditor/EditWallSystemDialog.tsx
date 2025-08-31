import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EditWallSystemDialogProps } from './types';
import { OperableWallEditForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/OperableWallEditForm';
import { GlassWallEditForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/GlassWallEditForm';
import { 
  getSeriesByPanelConfiguration,
  getModelsByPanelConfigurationAndSeries,
  getPanelSkinOptions,
  getSTCRatingOptions,
  getTrackSystemsByTrackType,
  getTrackTypeByModel,
  WallSystemType,
  WallSpecification,
 } from '@/lib/types';
import { validateWallSpecification } from '@/utils/wallValidation';

export const EditWallSystemDialog: React.FC<EditWallSystemDialogProps> = ({
  isOpen,
  onClose,
  wallName,
  wall,
  onSave,
  onDatabaseSave
}) => {
  const [editedWall, setEditedWall] = useState(wall);
  const [hasChanges, setHasChanges] = useState(false);

  // Validation state
  const isWallValid = () => {
    const validation = validateWallSpecification(editedWall);
    return validation.isValid;
  };


  // Reset wall data when dialog opens
  useEffect(() => {
    if (isOpen) {
      setEditedWall({ ...wall });
      setHasChanges(false);
    }
  }, [wall, isOpen]);

  // Handle field changes - simplified to work with the advanced forms
  const handleFieldChange = (fieldWallName: string, field: string, value: any) => {
    setEditedWall(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  // Handle save confirmation and actual save
  const handleConfirmSave = async () => {
    // Update the wall data in the editor state
    onSave(wallName, editedWall);
    
    // Save directly to database if onDatabaseSave is provided
    if (onDatabaseSave) {
      try {
        await onDatabaseSave();
      } catch (error) {
        console.error('❌ Database save failed:', error);
      }
    }
    
    setHasChanges(false);
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    setEditedWall({ ...wall }); // Reset to original
    setHasChanges(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Wall System - {wallName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Wall Information */}
          <div className="space-y-2">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Length (ft) *</Label>
                <Input className="text-xs h-8"
                  value={editedWall.lengthFeet || ''}
                  onChange={(e) => handleFieldChange(wallName, 'lengthFeet', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Length (in) *</Label>
                <Input className="text-xs h-8"
                  value={editedWall.lengthInches || ''}
                  onChange={(e) => handleFieldChange(wallName, 'lengthInches', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Height (ft) *</Label>
                <Input
                  value={editedWall.heightFeet || ''}
                  onChange={(e) => handleFieldChange(wallName, 'heightFeet', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Height (in) *</Label>
                <Input className="text-xs h-8"
                  value={editedWall.heightInches || ''}
                  onChange={(e) => handleFieldChange(wallName, 'heightInches', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Panel Count *</Label>
                <Input className="text-xs h-8"
                  value={editedWall.panelCount || ''}
                  onChange={(e) => handleFieldChange(wallName, 'panelCount', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Quantity</Label>
                <Input className="text-xs h-8"
                  value={editedWall.quantity || '1'}
                  onChange={(e) => handleFieldChange(wallName, 'quantity', e.target.value)}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Wall System Type */}
            <div className="space-y-2">
              <Label className="text-xs">Wall System Type *</Label>
              <Select
                value={editedWall.wallSystemType || ''}
                onValueChange={(value) => {
                  // When changing wall system type, reset wall-specific fields but keep basic fields
                  const resetWall = {
                    ...editedWall,
                    wallSystemType: value as WallSystemType,
                    // Reset specification fields but keep basic dimensions
                    panelConfiguration: '',
                    series: '',
                    model: '',
                    panelThickness: '',
                    panelSkin: '',
                    stcRating: '',
                    panelDesign: '',
                    trackType: '',
                    trackSystem: ''
                  };
                  setEditedWall(resetWall as WallSpecification);
                  setHasChanges(true);
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select wall system type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operable Wall">Operable Wall</SelectItem>
                  <SelectItem value="Glass Wall">Glass Wall</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Wall System Specifications */}
          {editedWall.wallSystemType === "Operable Wall" && (
            <div className="space-y-2">
              {/* <h3 className="text-lg font-semibold">Operable Wall Specifications</h3> */}

              {/* Panel Configuration, Series, Model - Cascading */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="text-xs">Panel Configuration *</Label>
                  <Select
                    value={editedWall.panelConfiguration || ''}
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
                    value={editedWall.series || ''}
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
                    disabled={!editedWall.panelConfiguration}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select series" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSeriesByPanelConfiguration(editedWall.panelConfiguration).map((series) => (
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
                    value={editedWall.model || ''}
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
                    disabled={!editedWall.series}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsByPanelConfigurationAndSeries(editedWall.panelConfiguration, editedWall.series).map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Panel Thickness, Panel Skin, STC Rating */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                  <Label className="text-xs">Panel Thickness (inches)</Label>
                  <Input
                    value={editedWall.panelThickness || ''}
                    placeholder="Auto-calculated"
                    readOnly
                    className="text-xs h-8 bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Panel Skin *</Label>
                  <Select
                    value={editedWall.panelSkin || ''}
                    onValueChange={(value) => {
                      handleFieldChange(wallName, 'panelSkin', value);
                      // Reset STC rating when panel skin changes
                      handleFieldChange(wallName, 'stcRating', '');
                    }}
                    disabled={!editedWall.model}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select panel skin" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPanelSkinOptions(editedWall.model).map((skin) => (
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
                    value={editedWall.stcRating || ''}
                    onValueChange={(value) => handleFieldChange(wallName, 'stcRating', value)}
                    disabled={!editedWall.model || !editedWall.panelSkin}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select STC rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSTCRatingOptions(editedWall.model, editedWall.panelSkin).map((rating) => (
                        <SelectItem key={rating} value={rating}>
                          {rating}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Track Type and Track System */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <Label className="text-xs">Track Type *</Label>
                  <Input
                    value={editedWall.trackType || ''}
                    placeholder="Auto-calculated from model"
                    readOnly
                    className="text-xs h-8 bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Track System *</Label>
                  <Select
                    value={editedWall.trackSystem || ''}
                    onValueChange={(value) => handleFieldChange(wallName, 'trackSystem', value)}
                    disabled={!editedWall.trackType}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select track system" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTrackSystemsByTrackType(editedWall.trackType, editedWall.model).map((system) => (
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
                wall={editedWall}
                wallName={wallName}
                onFieldChange={handleFieldChange}
                hideHierarchicalFields={true}
              />
            </div>
          )}

          {editedWall.wallSystemType === "Glass Wall" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Glass Wall Specifications</h3>
              <GlassWallEditForm
                wall={editedWall}
                wallName={wallName}
                onFieldChange={handleFieldChange}
                showFullFields={true}
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {hasChanges && "You have unsaved changes"}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!hasChanges || !isWallValid()}>
                  Save Changes
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Save</AlertDialogTitle>
                  <AlertDialogDescription>
                    Saving will change your quote. This action will update the database and refresh the live preview.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleConfirmSave}>
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};