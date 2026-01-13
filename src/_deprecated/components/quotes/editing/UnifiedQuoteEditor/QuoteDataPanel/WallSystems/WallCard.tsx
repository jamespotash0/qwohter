import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ValidatedInput } from '@/components/ui/validated-input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFormValidation } from '@/hooks/useFormValidation';
import { WallCardProps } from './types';
import { OperableWallEditForm } from './OperableWallEditForm';
import { GlassWallEditForm } from './GlassWallEditForm';
import { AccordionWallEditForm } from './AccordionWallEditForm';
import { EditWallSystemDialog } from '../../../WallSystemEditor/EditWallSystemDialog';

export const WallCard: React.FC<WallCardProps> = ({
  wallName,
  wall,
  onRemove,
  onFieldChange,
  onDatabaseSave,
  onUpdateWallSystem,
  onRemoveWallSystem
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const { validateAndUpdate, getFieldError, isFieldValid, markFieldTouched } = useFormValidation();

  const handleSaveWallSystem = async (_editedWallName: string, updatedWall: any) => {
    if (onUpdateWallSystem) {
      try {
        await onUpdateWallSystem(wallName, updatedWall);
        
        window.location.reload();
      } catch (error) {
        console.error('❌ WallCard: Wall system update failed:', error);
      }
    } else {
      const currentWall = wall || {};
      const mergedWall = { ...currentWall, ...updatedWall };
      
      Object.keys(mergedWall).forEach(field => {
        onFieldChange(wallName, field, mergedWall[field]);
      });
      
    }
  };

  const handleConfirmRemove = async () => {
    if (onRemoveWallSystem) {
      try {
        await onRemoveWallSystem(wallName);
        window.location.reload();
      } catch (error) {
        console.error('❌ WallCard: Wall removal failed:', error);
      }
    } else {
      onRemove(wallName);
    }
    setShowRemoveConfirmation(false);
  };

  return (
  <Card key={wallName} 
        data-testid={`wall-card-${wallName.replace(/\s+/g, '-').toLowerCase()}`} 
        className="p-3 bg-gray-50">
    <div className="flex justify-between items-center mb-3">
      <h4 className="font-medium text-sm">{wallName}</h4>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditDialogOpen(true)}
          className="text-blue-600 hover:text-blue-700"
        >
          {/* <Settings className="w-3 h-3 mr-1" /> */}
          Edit Wall
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRemoveConfirmation(true)}
          className="text-red-600 hover:text-red-700"
        >
          Remove
        </Button>
      </div>
    </div>
    <div className="col-span-1 pt-2 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2 ml-10">
        <span className="text-xs text-gray-500 font-medium">Quick Edit Area - Basic Fields Only</span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-lengthFeet`} className="text-xs">Length (ft) <span className="text-red-500">*</span></Label>
        <ValidatedInput
          id={`${wallName}-lengthFeet`}
          validationType="numbersOnly"
          value={wall.lengthFeet || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-lengthFeet`, value, 'numbersOnly');
            onFieldChange(wallName, 'lengthFeet', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-lengthFeet`)}
          placeholder="0"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-lengthFeet`)}
          isValid={isFieldValid(`${wallName}-lengthFeet`)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-lengthInches`} className="text-xs">Length (in)</Label>
        <ValidatedInput
          id={`${wallName}-lengthInches`}
          validationType="numbersWithFractionsHyphen"
          value={wall.lengthInches || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-lengthInches`, value, 'numbersWithFractionsHyphen');
            onFieldChange(wallName, 'lengthInches', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-lengthInches`)}
          placeholder="0, 6 3/4, or 3/4"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-lengthInches`)}
          isValid={isFieldValid(`${wallName}-lengthInches`)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-heightFeet`} className="text-xs">Height (ft) <span className="text-red-500">*</span></Label>
        <ValidatedInput
          id={`${wallName}-heightFeet`}
          validationType="numbersOnly"
          value={wall.heightFeet || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-heightFeet`, value, 'numbersOnly');
            onFieldChange(wallName, 'heightFeet', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-heightFeet`)}
          placeholder="0"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-heightFeet`)}
          isValid={isFieldValid(`${wallName}-heightFeet`)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-heightInches`} className="text-xs">Height (in)</Label>
        <ValidatedInput
          id={`${wallName}-heightInches`}
          validationType="numbersWithFractionsHyphen"
          value={wall.heightInches || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-heightInches`, value, 'numbersWithFractionsHyphen');
            onFieldChange(wallName, 'heightInches', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-heightInches`)}
          placeholder="0, 6 1/2, or 3/4"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-heightInches`)}
          isValid={isFieldValid(`${wallName}-heightInches`)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-panelCount`} className="text-xs">Panel Count <span className="text-red-500">*</span></Label>
        <ValidatedInput
          id={`${wallName}-panelCount`}
          validationType="numbersOnly"
          value={wall.panelCount || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-panelCount`, value, 'numbersOnly');
            onFieldChange(wallName, 'panelCount', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-panelCount`)}
          placeholder="0"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-panelCount`)}
          isValid={isFieldValid(`${wallName}-panelCount`)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-quantity`} className="text-xs">Quantity</Label>
        <ValidatedInput
          id={`${wallName}-quantity`}
          validationType="numbersOnly"
          value={wall.quantity || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-quantity`, value, 'numbersOnly');
            onFieldChange(wallName, 'quantity', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-quantity`)}
          placeholder="1"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-quantity`)}
          isValid={isFieldValid(`${wallName}-quantity`)}
        />
      </div>
    </div>

    {/* Model-Specific Configuration Message */}
    {(wall.wallSystemType === "Operable Wall" || wall.wallSystemType === "Glass Wall" || wall.wallSystemType === "Accordion Partition") && (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-800 font-medium">
              {wall.wallSystemType} Configuration
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Use "Edit Wall" button to configure model-specific fields
            </p>
          </div>
          <div className="text-blue-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>
      </div>
    )}

    {/* Edit Wall System Dialog */}
    <EditWallSystemDialog
      isOpen={isEditDialogOpen}
      onClose={() => setIsEditDialogOpen(false)}
      wallName={wallName}
      wall={wall}
      onSave={handleSaveWallSystem}
      onDatabaseSave={onDatabaseSave}
    />

    {/* Remove Wall Confirmation Dialog */}
    <AlertDialog open={showRemoveConfirmation} onOpenChange={setShowRemoveConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Wall</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove "{wallName}"? This action will permanently delete the wall from your quote and renumber any remaining walls (e.g., Wall B becomes Wall A). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmRemove} className="bg-red-600 hover:bg-red-700">
            Remove Wall
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

  </Card>
  );
};