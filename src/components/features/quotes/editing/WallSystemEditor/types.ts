import { WallSpecification } from '@/types/quote';

export interface EditWallSystemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  wallName: string;
  wall: WallSpecification;
  onSave: (wallName: string, updatedWall: WallSpecification) => void;
  onDatabaseSave?: () => Promise<void>; // Function to save to database
}

export interface WallSystemEditFormProps {
  wallName: string;
  wall: WallSpecification;
  onWallChange: (wallName: string, field: string, value: any) => void;
}