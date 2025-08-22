import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WallCardProps } from './types';
import { OperableWallForm } from './OperableWallForm';
import { GlassWallForm } from './GlassWallForm';
import { EditWallSystemDialog } from '../../../WallSystemEditor/EditWallSystemDialog';
import { Settings } from 'lucide-react';

export const WallCard: React.FC<WallCardProps> = ({
  wallName,
  wall,
  onRemove,
  onFieldChange,
  onDatabaseSave,
  onUpdateWallSystem
}) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
          <Settings className="w-3 h-3 mr-1" />
          Edit Wall System
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(wallName)}
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
        <span className="text-xs text-blue-600">Use "Edit Wall System" for advanced configuration</span>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-lengthFeet`} className="text-xs">Length (ft) *</Label>
        <Input
          id={`${wallName}-lengthFeet`}
          value={wall.lengthFeet || ''}
          onChange={(e) => onFieldChange(wallName, 'lengthFeet', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-lengthInches`} className="text-xs">Length (in)</Label>
        <Input
          id={`${wallName}-lengthInches`}
          value={wall.lengthInches || ''}
          onChange={(e) => onFieldChange(wallName, 'lengthInches', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-heightFeet`} className="text-xs">Height (ft) *</Label>
        <Input
          id={`${wallName}-heightFeet`}
          value={wall.heightFeet || ''}
          onChange={(e) => onFieldChange(wallName, 'heightFeet', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-heightInches`} className="text-xs">Height (in)</Label>
        <Input
          id={`${wallName}-heightInches`}
          value={wall.heightInches || ''}
          onChange={(e) => onFieldChange(wallName, 'heightInches', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-panelCount`} className="text-xs">Panel Count *</Label>
        <Input
          id={`${wallName}-panelCount`}
          value={wall.panelCount || ''}
          onChange={(e) => onFieldChange(wallName, 'panelCount', e.target.value)}
          placeholder="0"
          className="text-xs h-8"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${wallName}-quantity`} className="text-xs">Quantity</Label>
        <Input
          id={`${wallName}-quantity`}
          value={wall.quantity || ''}
          onChange={(e) => onFieldChange(wallName, 'quantity', e.target.value)}
          placeholder="1"
          className="text-xs h-8"
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

  </Card>
  );
};