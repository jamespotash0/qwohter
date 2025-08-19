import { QuoteData } from '@/templates/BaseQuoteTemplate';

export interface WallSystemsSectionProps {
  data: QuoteData;
  onChange: (section: string, value: any) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export interface WallCardProps {
  wallName: string;
  wall: any;
  onRemove: (wallName: string) => void;
  onFieldChange: (wallName: string, field: string, value: any) => void;
}

export interface WallTypeFormProps {
  wallName: string;
  wall: any;
  onFieldChange: (wallName: string, field: string, value: any) => void;
}

export type WallSystemType = 'Operable Wall' | 'Glass Wall' | 'Accordion Partitions';