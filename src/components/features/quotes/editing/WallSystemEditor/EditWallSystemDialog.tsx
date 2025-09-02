import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { EditWallSystemDialogProps } from './types';
import { OperableWallEditForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/OperableWallEditForm';
import { GlassWallEditForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/GlassWallEditForm';
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

  // Validation state
  const isWallValid = () => {
    const validation = validateWallSpecification(editedWall);
    return validation.isValid;
  };

  // Check if ANY field has changed from original (not just required ones)
  const hasActualChanges = () => {
    if (!wall || !editedWall) return false;
    
    // Compare ALL possible wall fields - any change should enable save button
    const allPossibleFields = [
      // Basic fields
      'wallSystemType', 'lengthFeet', 'lengthInches', 'heightFeet', 'heightInches', 
      'panelCount', 'quantity',
      
      // Operable wall fields
      'panelConfiguration', 'series', 'model', 'panelSkin', 'stcRating', 
      'panelThickness', 'panelDesign', 'passDoorPanels', 'passDoorQuantity',
      'panelFinishCategory', 'panelFinishSpecificItem', 'initialClosureSystem', 
      'endPanelType', 'verticalSeals', 'bottomSeals', 'topSeals', 'trackType', 
      'trackSystem',
      
      // Glass wall fields  
      'model', 'panelConfiguration', 'operation', 'glassType', 'partitionSupport',
      'panelFace', 'frameFinish', 'frameThickness', 'hingeType', 'finalClosure', 
      'floorGuide', 'passDoorType', 'passDoorOption', 'trackFinish',
      
      // Any other fields that might exist
      'notes', 'specialInstructions', 'accessories'
    ];
    
    return allPossibleFields.some(field => {
      const originalValue = (wall as any)[field] || '';
      const editedValue = (editedWall as any)[field] || '';
      return originalValue !== editedValue;
    });
  };

  // Reset wall data when dialog opens
  useEffect(() => {
    if (isOpen) {
      setEditedWall({ ...wall });
    }
  }, [wall, isOpen]);

  // Handle field changes from edit forms
  const handleFieldChange = (field: string, value: any) => {
    setEditedWall(prev => ({
      ...prev,
      [field]: value
    }));
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
    
    onClose();
  };

  // Handle cancel
  const handleCancel = () => {
    setEditedWall({ ...wall }); // Reset to original
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Wall System - {wallName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wall System Specifications - Use Edit Forms Directly */}
          {editedWall.wallSystemType === "Operable Wall" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">Operable Wall Configuration</h3>
              <OperableWallEditForm
                wall={editedWall}
                wallName={wallName}
                onFieldChange={handleFieldChange}
                // showFullFields={true}
              />
            </div>
          )}

          {editedWall.wallSystemType === "Glass Wall" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-t pt-4">Glass Wall Configuration</h3>
              <GlassWallEditForm
                wall={editedWall}
                wallName={wallName}
                onFieldChange={handleFieldChange}
                showFullFields={true}
              />
            </div>
          )}

          {!editedWall.wallSystemType && (
            <div className="text-center text-gray-500 py-8">
              No wall system type specified for this wall.
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {!hasActualChanges() && "No changes detected"}
            {hasActualChanges() && !isWallValid() && "Changes detected • Required fields must be completed"}
            {hasActualChanges() && isWallValid() && "Ready to save changes"}
          </div>
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!hasActualChanges() || !isWallValid()}>
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