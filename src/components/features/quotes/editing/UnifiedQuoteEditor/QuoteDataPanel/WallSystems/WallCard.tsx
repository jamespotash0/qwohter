import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidatedInput } from '@/components/ui/validated-input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFormValidation } from '@/hooks/useFormValidation';
import { WallCardProps } from './types';
import { OperableWallForm } from './OperableWallEditForm';
import { GlassWallForm } from './GlassWallEditForm';
import { EditWallSystemDialog } from '../../../WallSystemEditor/EditWallSystemDialog';
import { Settings } from 'lucide-react';

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
    // If we have the dedicated wall system update function, use it
    if (onUpdateWallSystem) {
      try {
        await onUpdateWallSystem(wallName, updatedWall);
        console.log('✅ WallCard: Wall system updated via dedicated endpoint');
        
        // Reload the page to refresh all dropdown data and return to clean state
        console.log('🔄 Reloading page to refresh all data...');
        window.location.reload();
      } catch (error) {
        console.error('❌ WallCard: Wall system update failed:', error);
      }
    } else {
      // Fallback to the old method
      const currentWall = wall || {};
      const mergedWall = { ...currentWall, ...updatedWall };
      
      Object.keys(mergedWall).forEach(field => {
        onFieldChange(wallName, field, mergedWall[field]);
      });
      
      console.log('✅ WallCard: Wall system data saved via fallback method');
    }
  };

  const handleConfirmRemove = async () => {
    // Use database removal function if available for direct database updates
    if (onRemoveWallSystem) {
      try {
        await onRemoveWallSystem(wallName);
        console.log('✅ WallCard: Wall removed via database removal function');
        // Reload the page to refresh all data
        window.location.reload();
      } catch (error) {
        console.error('❌ WallCard: Wall removal failed:', error);
      }
    } else {
      // Fallback to local state removal
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
    {/* Quick Edit Area Label */}
    <div className="col-span-2 pt-2 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-medium">Quick Edit Area - Basic Fields Only</span>
        <span className="text-xs text-blue-600">Use "Edit Wall" for advanced configuration</span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-lengthFeet`} className="text-xs">Length (ft) *</Label>
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
          validationType="numbersWithFractions"
          value={wall.lengthInches || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-lengthInches`, value, 'numbersWithFractions');
            onFieldChange(wallName, 'lengthInches', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-lengthInches`)}
          placeholder="0 or 6.5 or 3/4"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-lengthInches`)}
          isValid={isFieldValid(`${wallName}-lengthInches`)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-heightFeet`} className="text-xs">Height (ft) *</Label>
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
          validationType="numbersWithFractions"
          value={wall.heightInches || ''}
          onValueChange={(value: string) => {
            const sanitized = validateAndUpdate(`${wallName}-heightInches`, value, 'numbersWithFractions');
            onFieldChange(wallName, 'heightInches', sanitized);
          }}
          onBlur={() => markFieldTouched(`${wallName}-heightInches`)}
          placeholder="0 or 6.5 or 3/4"
          className="text-xs h-8"
          errorMessage={getFieldError(`${wallName}-heightInches`)}
          isValid={isFieldValid(`${wallName}-heightInches`)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-panelCount`} className="text-xs">Panel Count *</Label>
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

    {/* Wall Type Specific Forms */}
    {wall.wallSystemType === "Operable Wall" && (
      <div className="mt-2">
        <OperableWallForm
          wallName={wallName}
          wall={wall}
          onFieldChange={onFieldChange}
        />
      </div>
    )}

    {wall.wallSystemType === "Glass Wall" && (
      <div className="mt-2">
        <GlassWallForm
          wallName={wallName}
          wall={wall}
          onFieldChange={onFieldChange}
        />
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