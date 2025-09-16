import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// Import the creation forms that include all necessary fields
import OperableWallCreationForm from '@/components/features/quotes/creationForms/OperableWallCreationForm';
import GlassWallCreationForm from '@/components/features/quotes/creationForms/GlassWallCreationForm';
import { AccordionWallCreationForm } from '@/components/features/quotes/creationForms/AccordionWallCreationForm';

// Import validation
import { validateWallSpecification } from '@/utils/wallValidation';
import { WallSpecification } from '@/lib/types';

interface AddWallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wallName: string, wallData: WallSpecification) => Promise<void> | void;
  existingWalls?: Record<string, WallSpecification>;
}

export const AddWallDialog: React.FC<AddWallDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  existingWalls = {}
}) => {
  // Generate the next wall name
  const generateNextWallName = () => {
    const existingNames = Object.keys(existingWalls || {});
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    if (existingNames.length === 0) {
      return 'Wall A';
    }
    
    for (let i = 0; i < letters.length; i++) {
      const letter = `Wall ${letters[i]}`;
      if (!existingNames.includes(letter)) {
        return letter;
      }
    }
    
    // Fallback to numbers if all letters are used
    let counter = 1;
    while (existingNames.includes(`Wall ${counter}`)) {
      counter++;
    }
    return `Wall ${counter}`;
  };

  // State management
  const [wallName, setWallName] = useState('');
  const [wallSystemType, setWallSystemType] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Auto-generate wall name when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      // Always regenerate the wall name when dialog opens to account for any new walls
      setWallName(generateNextWallName());
    }
  }, [isOpen, existingWalls]);
  
  // Create empty wall template based on wall type
  const createEmptyWall = (wallSystemType: string): WallSpecification => {
    const baseWall: Partial<WallSpecification> = {
      wallSystemType: wallSystemType as any,
      lengthFeet: '',
      lengthInches: '',
      heightFeet: '',
      heightInches: '',
      quantity: '1',
      panelConfiguration: '',
      panelCount: '',
      model: '',
      stcRating: '',
      trackType: '',
      trackSystem: '',
      bottomSeals: '',
      topSeals: '',
      structureSupport: '',
      pocketDoors: {
        foldType: '',
        foldStyle: ''
      }
    };

    if (wallSystemType === 'Operable Wall') {
      return {
        ...baseWall,
        wallSystemType: 'Operable Wall',
        series: '',
        panelThickness: '',
        panelSkin: '',
        passDoorPanels: '',
        passDoorQuantity: '',
        panelFinishCategory: '',
        panelFinishSpecificItem: '',
        verticalSeals: '',
        initialClosureSystem: '',
        finalClosureSystem: ''
      } as WallSpecification;
    } else if (wallSystemType === 'Glass Wall') {
      return {
        ...baseWall,
        wallSystemType: 'Glass Wall',
        panelOperation: '',
        glassType: '',
        partitionSupport: '',
        passDoorType: '',
        passDoorOption: '',
        panelFace: '',
        hingeType: '',
        frameFinish: '',
        frameThickness: '',
        trackFinish: '',
        floorGuide: '',
        finalClosure: ''
      } as WallSpecification;
    } else if (wallSystemType === 'Accordion Partition') {
      return {
        ...baseWall,
        wallSystemType: 'Accordion Partition',
        series: '',
        model: '',
        stcRating: '',
        operation: '',
        panelFace: '',
        options: '',
        trackSystem: '',
        trackSystemOption: '',
        trackMounting: ''
      } as WallSpecification;
    }

    return baseWall as WallSpecification;
  };

  const [newWall, setNewWall] = useState<WallSpecification>(createEmptyWall(''));

  // Handle wall system type change
  const handleWallSystemTypeChange = (selectedType: string) => {
    setWallSystemType(selectedType);
    setNewWall(createEmptyWall(selectedType));
  };

  // Handle field changes from creation forms
  const handleWallChange = (_wallName: string, fieldOrUpdates: string | Record<string, string>, value?: string) => {
    if (typeof fieldOrUpdates === 'string' && value !== undefined) {
      // Single field update
      setNewWall(prev => ({
        ...prev,
        [fieldOrUpdates]: value
      }));
    } else if (typeof fieldOrUpdates === 'object') {
      // Batch update
      setNewWall(prev => ({
        ...prev,
        ...fieldOrUpdates
      }));
    }
  };

  // Full validation for wall creation - require all fields that are required for the specific wall type
  const isWallValid = useMemo(() => {
    if (!wallSystemType) return false;
    if (!wallName.trim()) return false;
    
    // Use the comprehensive wall validation that checks all required fields
    const validation = validateWallSpecification(newWall);
    
    if (!validation.isValid) {
      // console.log('AddWallDialog validation failed:', validation.errors);
      // console.log('Current wall data:', newWall);
    }
    
    return validation.isValid;
  }, [newWall, wallSystemType, wallName]);

  // Save handlers
  const handleSave = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    try {
      console.log('🔄 Adding wall to database:', wallName, newWall);
      await onSave(wallName, newWall);
      setShowConfirmDialog(false);
      onClose();
      
      // Don't reload page - let the database save and state updates handle the refresh
      // console.log('✅ Wall addition completed - live preview should update automatically');
    } catch (error) {
      // console.error('❌ Error saving wall:', error);
    }
  };

  // Close handlers
  const handleClose = () => {
    setWallSystemType('');
    setNewWall(createEmptyWall(''));
    setWallName(''); // Clear wall name so it regenerates on next open
    onClose();
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    handleClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Wall System</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Wall Name Input */}
            <div className="space-y-2">
              <Label htmlFor="wallName">Wall Name <span className="text-red-500">*</span></Label>
              <Input
                id="wallName"
                value={wallName}
                onChange={(e) => setWallName(e.target.value)}
                placeholder="Enter wall name"
                className="w-full"
              />
            </div>

            {/* Wall System Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="wallSystemType">Wall System Type <span className="text-red-500">*</span></Label>
              <Select
                value={wallSystemType}
                onValueChange={handleWallSystemTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select wall system type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operable Wall">Operable Wall</SelectItem>
                  <SelectItem value="Glass Wall">Glass Wall</SelectItem>
                  <SelectItem value="Accordion Partition">Accordion Partition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Basic Wall Dimensions - Always Show These */}
            {wallSystemType && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-t pt-4">Basic Wall Specifications</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lengthFeet">Length (ft) <span className="text-red-500">*</span></Label>
                    <Input
                      id="lengthFeet"
                      // type="number"
                      min="1"
                      max="40"
                      value={newWall.lengthFeet || ''}
                      onChange={(e) => handleWallChange('', 'lengthFeet', e.target.value)}
                      placeholder="Enter a number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lengthInches">Length (in) <span className="text-red-500">*</span></Label>
                    <Input
                      id="lengthInches"
                      type="text"
                      value={newWall.lengthInches || ''}
                      onChange={(e) => handleWallChange('', 'lengthInches', e.target.value)}
                      placeholder="1, 6 3/4, or 3/4"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heightFeet">Height (ft) <span className="text-red-500">*</span></Label>
                    <Input
                      id="heightFeet"
                      // type="number"
                      min="1"
                      max="40"
                      value={newWall.heightFeet || ''}
                      onChange={(e) => handleWallChange('', 'heightFeet', e.target.value)}
                      placeholder="Enter a number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="heightInches">Height (in) <span className="text-red-500">*</span></Label>
                    <Input
                      id="heightInches"
                      type="text"
                      value={newWall.heightInches || ''}
                      onChange={(e) => handleWallChange('', 'heightInches', e.target.value)}
                      placeholder="1, 6 1/2, or 3/4"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="panelCount">Panel Count <span className="text-red-500">*</span></Label>
                    <Input
                      id="panelCount"
                      // type="number"
                      min="1"
                      max="50"
                      value={newWall.panelCount || ''}
                      onChange={(e) => handleWallChange('', 'panelCount', e.target.value)}
                      placeholder="Enter a number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      // type="number"
                      min="1"
                      value={newWall.quantity || '1'}
                      onChange={(e) => handleWallChange('', 'quantity', e.target.value)}
                      placeholder="Enter a number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Wall Configuration Forms - These include ALL necessary fields */}
            {wallSystemType === "Operable Wall" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-t pt-4">Operable Wall Configuration</h3>
                <OperableWallCreationForm
                  wall={newWall}
                  wallName={wallName}
                  onWallChange={handleWallChange}
                />
              </div>
            )}

            {wallSystemType === "Glass Wall" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-t pt-4">Glass Wall Configuration</h3>
                <GlassWallCreationForm
                  wall={newWall}
                  wallName={wallName}
                  onWallChange={handleWallChange}
                />
              </div>
            )}

            {wallSystemType === "Accordion Partition" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-t pt-4">Accordion Partition Configuration</h3>
                <AccordionWallCreationForm
                  wall={newWall}
                  wallName={wallName}
                  onWallChange={handleWallChange}
                />
              </div>
            )}

            {!wallSystemType && (
              <div className="text-center text-gray-500 py-8">
                Please select a wall system type to configure the wall specifications.
              </div>
            )}
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {!wallSystemType && "Select wall system type to continue"}
              {wallSystemType && !isWallValid && "Complete all required fields to add wall"}
              {wallSystemType && isWallValid && "Ready to add wall system"}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!isWallValid || !wallName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Add Wall System
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Add Wall System</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add "{wallName}" with the specified configuration?
              This will save the wall system to your quote and update the live preview.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleConfirmClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} className="bg-blue-600 hover:bg-blue-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};