// import React, { useState, useEffect } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { EditWallSystemDialogProps } from './types';
// import { WallSpecification } from '@/types/quote';
// import { OperableWallForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/OperableWallForm';
// import { GlassWallForm } from '../UnifiedQuoteEditor/QuoteDataPanel/WallSystems/GlassWallForm';

// export const EditWallSystemDialog: React.FC<EditWallSystemDialogProps> = ({
//   isOpen,
//   onClose,
//   wallName,
//   wall,
//   onSave,
//   onDatabaseSave
// }) => {
//   // Local state to manage edits before saving
//   const [editedWall, setEditedWall] = useState<WallSpecification>(wall);
//   const [hasChanges, setHasChanges] = useState(false);

//   // Reset local state when dialog opens with new data
//   useEffect(() => {
//     setEditedWall({ ...wall });
//     setHasChanges(false);
//   }, [wall, isOpen]);

//   // Handle field changes
//   const handleWallChange = (_fieldWallName: string, field: string, value: any) => {
//     console.log('🔄 EditWallSystemDialog handleWallChange:', { field, value, currentWall: editedWall });
//     const updatedWall = {
//       ...editedWall,
//       [field]: value
//     };
//     console.log('🔄 Updated wall:', updatedWall);
//     setEditedWall(updatedWall);
//     setHasChanges(true);
//   };

//   // Handle save confirmation and actual save
//   const handleConfirmSave = async () => {
//     console.log('🔄 EditWallSystemDialog: Starting save process');
//     console.log('🔄 Wall to save:', { wallName, editedWall });
    
//     // Update the wall data in the editor state
//     onSave(wallName, editedWall);
//     console.log('✅ Called onSave with updated wall data');
    
//     // Save directly to database if onDatabaseSave is provided
//     if (onDatabaseSave) {
//       try {
//         console.log('🔄 Calling database save...');
//         await onDatabaseSave();
//         console.log('✅ Database save completed successfully');
//       } catch (error) {
//         console.error('❌ EditWallSystemDialog: Database save failed:', error);
//         // Could show a toast error here, but continuing for now
//       }
//     } else {
//       console.log('⚠️ No onDatabaseSave function provided');
//     }
    
//     setHasChanges(false);
//     onClose();
//   };

//   // Handle cancel
//   const handleCancel = () => {
//     setEditedWall({ ...wall }); // Reset to original
//     setHasChanges(false);
//     onClose();
//   };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
//         <DialogHeader>
//           <DialogTitle>Edit Wall System - {wallName}</DialogTitle>
//         </DialogHeader>

//         <div className="space-y-6">
//           {/* Basic Wall Information */}
//           <div className="space-y-4">
//             <h3 className="text-lg font-semibold">Basic Wall Information</h3>
            
//             <div className="grid grid-cols-2 gap-4">
//               <div className="space-y-2">
//                 <Label htmlFor="lengthFeet">Length (ft) *</Label>
//                 <Input
//                   id="lengthFeet"
//                   value={editedWall.lengthFeet || ''}
//                   onChange={(e) => handleWallChange(wallName, 'lengthFeet', e.target.value)}
//                   placeholder="0"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="lengthInches">Length (in)</Label>
//                 <Input
//                   id="lengthInches"
//                   value={editedWall.lengthInches || ''}
//                   onChange={(e) => handleWallChange(wallName, 'lengthInches', e.target.value)}
//                   placeholder="0"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="heightFeet">Height (ft) *</Label>
//                 <Input
//                   id="heightFeet"
//                   value={editedWall.heightFeet || ''}
//                   onChange={(e) => handleWallChange(wallName, 'heightFeet', e.target.value)}
//                   placeholder="0"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="heightInches">Height (in)</Label>
//                 <Input
//                   id="heightInches"
//                   value={editedWall.heightInches || ''}
//                   onChange={(e) => handleWallChange(wallName, 'heightInches', e.target.value)}
//                   placeholder="0"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="panelCount">Panel Count *</Label>
//                 <Input
//                   id="panelCount"
//                   value={editedWall.panelCount || ''}
//                   onChange={(e) => handleWallChange(wallName, 'panelCount', e.target.value)}
//                   placeholder="0"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="quantity">Quantity</Label>
//                 <Input
//                   id="quantity"
//                   value={editedWall.quantity || '1'}
//                   onChange={(e) => handleWallChange(wallName, 'quantity', e.target.value)}
//                   placeholder="1"
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Wall System Type Selection */}
//           <div className="space-y-4">
//             <h3 className="text-lg font-semibold">Wall System Type</h3>
            
//             <div className="space-y-2">
//               <Label>Wall System Type *</Label>
//               <Select
//                 value={editedWall.wallSystemType || ''}
//                 onValueChange={(value) => {
//                   // When changing wall system type, reset wall-specific fields
//                   const resetWall = {
//                     ...editedWall,
//                     wallSystemType: value,
//                     // Reset common fields
//                     panelConfiguration: '',
//                     series: '',
//                     model: '',
//                     panelThickness: '',
//                     panelSkin: '',
//                     stcRating: '',
//                     panelDesign: '',
//                     trackType: '',
//                     trackSystem: ''
//                   };
//                   setEditedWall(resetWall);
//                   setHasChanges(true);
//                 }}
//               >
//                 <SelectTrigger>
//                   <SelectValue placeholder="Select wall system type" />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="Operable Wall">Operable Wall</SelectItem>
//                   <SelectItem value="Glass Wall">Glass Wall</SelectItem>
//                 </SelectContent>
//               </Select>
//             </div>
//           </div>

//           {/* Wall System Specifications */}
//           {editedWall.wallSystemType === "Operable Wall" && (
//             <div className="space-y-4">
//               <h3 className="text-lg font-semibold">Operable Wall Specifications</h3>
//               <OperableWallForm
//                 wall={editedWall}
//                 wallName={wallName}
//                 onFieldChange={handleWallChange}
//               />
//             </div>
//           )}

//           {editedWall.wallSystemType === "Glass Wall" && (
//             <div className="space-y-4">
//               <h3 className="text-lg font-semibold">Glass Wall Specifications</h3>
//               <GlassWallForm
//                 wall={editedWall}
//                 wallName={wallName}
//                 onFieldChange={handleWallChange}
//               />
//             </div>
//           )}
//         </div>

//         <DialogFooter className="flex justify-between">
//           <div className="text-sm text-gray-500">
//             {hasChanges && "You have unsaved changes"}
//           </div>
//           <div className="space-x-2">
//             <Button variant="outline" onClick={handleCancel}>
//               Cancel
//             </Button>
//             <AlertDialog>
//               <AlertDialogTrigger asChild>
//                 <Button disabled={!hasChanges}>
//                   Save Changes
//                 </Button>
//               </AlertDialogTrigger>
//               <AlertDialogContent>
//                 <AlertDialogHeader>
//                   <AlertDialogTitle>Confirm Save</AlertDialogTitle>
//                   <AlertDialogDescription>
//                     Saving will change your quote. This action will update the database and refresh the live preview.
//                   </AlertDialogDescription>
//                 </AlertDialogHeader>
//                 <AlertDialogFooter>
//                   <AlertDialogCancel>Cancel</AlertDialogCancel>
//                   <AlertDialogAction onClick={handleConfirmSave}>
//                     Confirm
//                   </AlertDialogAction>
//                 </AlertDialogFooter>
//               </AlertDialogContent>
//             </AlertDialog>
//           </div>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };