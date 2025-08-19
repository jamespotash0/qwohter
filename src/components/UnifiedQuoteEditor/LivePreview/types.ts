import { QuoteSection } from '@/templates/SmartQuoteTemplate';

export interface LivePreviewPanelProps {
  previewHTML: string;
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onSectionClick?: (sectionId: string, sectionData: QuoteSection) => void;
  className?: string;
  showSmartPDFPreview?: boolean; // New prop for Smart PDF preview mode
}

export interface DocumentPage {
  id: string;
  content: string;
  pageNumber: number;
}