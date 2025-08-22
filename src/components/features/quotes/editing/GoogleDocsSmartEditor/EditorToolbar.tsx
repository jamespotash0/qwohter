import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Save, 
  Download,
  Undo2,
  Eye,
  FileText,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  ZoomIn,
  ZoomOut,
  RefreshCw
} from 'lucide-react';

interface EditorToolbarProps {
  documentTitle: string;
  zoomLevel: number;
  isRichTextMode: boolean;
  isCustomized: boolean;
  selectedSectionId: string | null;
  onSave: () => void;
  onDownload: () => void;
  onUndo: () => void;
  onToggleRichText: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRefresh: () => void;
  onFormatBold: () => void;
  onFormatItalic: () => void;
  onFormatUnderline: () => void;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  documentTitle,
  zoomLevel,
  isRichTextMode,
  isCustomized,
  selectedSectionId,
  onSave,
  onDownload,
  onUndo,
  onToggleRichText,
  onZoomIn,
  onZoomOut,
  onRefresh,
  onFormatBold,
  onFormatItalic,
  onFormatUnderline,
  onAlignLeft,
  onAlignCenter,
  onAlignRight
}) => {
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      {/* Document Title */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-medium text-gray-900 truncate">{documentTitle}</h2>
          {isCustomized && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
              Modified
            </span>
          )}
        </div>
        
        {/* Main Actions */}
        <div className="flex items-center gap-2">
          <Button 
            onClick={onRefresh} 
            variant="outline" 
            size="sm"
            title="Refresh content"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button 
            onClick={onSave} 
            variant="outline" 
            size="sm"
            className="text-green-600 hover:text-green-700"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button 
            onClick={onDownload} 
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-1" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="flex items-center justify-between">
        {/* Left: Edit Mode & Formatting */}
        <div className="flex items-center gap-1">
          {/* Edit Mode Toggle */}
          <div className="flex items-center gap-1 mr-3 p-1 bg-gray-100 rounded-md">
            <Button
              onClick={onToggleRichText}
              variant={isRichTextMode ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
            >
              <Eye className="w-3 h-3 mr-1" />
              Rich
            </Button>
            <Button
              onClick={onToggleRichText}
              variant={!isRichTextMode ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
            >
              <Type className="w-3 h-3 mr-1" />
              Code
            </Button>
          </div>

          {/* Formatting Tools */}
          {isRichTextMode && selectedSectionId && (
            <div className="flex items-center gap-1">
              <div className="h-4 border-l border-gray-300 mx-2" />
              <Button
                onClick={onFormatBold}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Bold"
              >
                <Bold className="w-3 h-3" />
              </Button>
              <Button
                onClick={onFormatItalic}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Italic"
              >
                <Italic className="w-3 h-3" />
              </Button>
              <Button
                onClick={onFormatUnderline}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Underline"
              >
                <Underline className="w-3 h-3" />
              </Button>
              
              <div className="h-4 border-l border-gray-300 mx-2" />
              
              <Button
                onClick={onAlignLeft}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Align Left"
              >
                <AlignLeft className="w-3 h-3" />
              </Button>
              <Button
                onClick={onAlignCenter}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Align Center"
              >
                <AlignCenter className="w-3 h-3" />
              </Button>
              <Button
                onClick={onAlignRight}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Align Right"
              >
                <AlignRight className="w-3 h-3" />
              </Button>
            </div>
          )}
          
          {/* Undo */}
          <div className="h-4 border-l border-gray-300 mx-2" />
          <Button
            onClick={onUndo}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Undo"
          >
            <Undo2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Right: Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            onClick={onZoomOut}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Zoom Out"
            disabled={zoomLevel <= 50}
          >
            <ZoomOut className="w-3 h-3" />
          </Button>
          <span className="text-xs text-gray-600 min-w-[3rem] text-center">
            {zoomLevel}%
          </span>
          <Button
            onClick={onZoomIn}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Zoom In"
            disabled={zoomLevel >= 150}
          >
            <ZoomIn className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};