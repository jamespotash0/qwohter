import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, 
  ZoomOut, 
  FileText
} from 'lucide-react';

interface PreviewControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  hoveredSectionId: string | null;
  sectionsCount: number;
}

export const PreviewControls: React.FC<PreviewControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  hoveredSectionId,
  sectionsCount
}) => {
  return (
    <div className="sticky top-0 bg-white border-b border-gray-200 p-3 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">Live Preview</span>
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded font-medium">
            📄 2-Page PDF Preview
          </span>
          {hoveredSectionId && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              Hover: {hoveredSectionId.replace(/-/g, ' ')}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            Click sections to edit • {sectionsCount} editable sections
          </span>
          
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomOut}
              className="h-7 w-7 p-0"
            >
              <ZoomOut className="w-3 h-3" />
            </Button>
            <span className="text-xs font-medium min-w-[3rem] text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onZoomIn}
              className="h-7 w-7 p-0"
            >
              <ZoomIn className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};