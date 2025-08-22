import { QuoteData } from '@/templates/BaseQuoteTemplate';

export interface WallSystemsSectionProps {
  data: QuoteData;
  onChange: (section: string, value: any) => void;
  isOpen: boolean;
  onToggle: () => void;
  onDatabaseSave?: () => Promise<void>; // Function to save to database
  onUpdateWallSystem?: (wallName: string, wallData: any) => Promise<any>; // Function to update specific wall system
}

export interface WallCardProps {
  wallName: string;
  wall: any;
  onRemove: (wallName: string) => void;
  onFieldChange: (wallName: string, field: string, value: any) => void;
  onDatabaseSave?: () => Promise<void>; // Function to save to database
  onUpdateWallSystem?: (wallName: string, wallData: any) => Promise<any>; // Function to update specific wall system
}

export interface WallTypeFormProps {
  wallName: string;
  wall: any;
  onFieldChange: (wallName: string, field: string, value: any) => void;
  hideHierarchicalFields?: boolean; // New prop to hide cascading fields when used in advanced dialog
}

export type WallSystemType = 'Operable Wall' | 'Glass Wall' | 'Accordion Partitions';