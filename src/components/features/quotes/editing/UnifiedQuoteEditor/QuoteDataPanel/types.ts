import { QuoteData } from '@/templates/BaseQuoteTemplate';

export interface QuoteDataPanelProps {
  data: QuoteData;
  onChange: (section: string, value: any) => void;
  className?: string;
}

export interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export interface SectionState {
  contactInfo: boolean;
  clientInfo: boolean;
  wallSystems: boolean;
  pocketDoors: boolean;
  mountingTrack: boolean;
  laborDelivery: boolean;
  pricing: boolean;
}

export interface FieldChangeHandler {
  (section: string, field: string, value: any): void;
}