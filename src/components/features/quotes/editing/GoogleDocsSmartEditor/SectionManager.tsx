import React, { useState, useRef, useEffect } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Edit3, Type } from 'lucide-react';
import { QuoteSection } from '@/templates/SmartQuoteTemplate';

interface SectionManagerProps {
  sections: QuoteSection[];
  selectedSectionId: string | null;
  editingContent: string;
  richEditingContent: string;
  isRichTextMode: boolean;
  onSectionSelect: (sectionId: string) => void;
  onSectionToggle: (sectionId: string, isVisible: boolean) => void;
  onEditingContentChange: (content: string) => void;
  onRichEditingContentChange: (content: string) => void;
  onApplyChanges: () => void;
  onDiscardChanges: () => void;
}

export const SectionManager: React.FC<SectionManagerProps> = ({
  sections,
  selectedSectionId,
  editingContent,
  richEditingContent,
  isRichTextMode,
  onSectionSelect,
  onSectionToggle,
  onEditingContentChange,
  onRichEditingContentChange,
  onApplyChanges,
  onDiscardChanges
}) => {
  const richEditorRef = useRef<HTMLDivElement>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  // Handle rich text editor changes
  useEffect(() => {
    if (richEditorRef.current && isRichTextMode && selectedSection) {
      richEditorRef.current.innerHTML = richEditingContent;
    }
  }, [richEditingContent, isRichTextMode, selectedSection]);

  const handleRichTextInput = () => {
    if (richEditorRef.current) {
      const content = richEditorRef.current.innerHTML;
      onRichEditingContentChange(content);
      setHasUnsavedChanges(true);
    }
  };

  const handlePlainTextChange = (value: string) => {
    onEditingContentChange(value);
    setHasUnsavedChanges(true);
  };

  const handleApplyChanges = () => {
    onApplyChanges();
    setHasUnsavedChanges(false);
  };

  const handleDiscardChanges = () => {
    onDiscardChanges();
    setHasUnsavedChanges(false);
  };


  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Section List */}
      <div className="border-b border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900">
            Document Sections
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`
                  flex items-center justify-between p-2 rounded-md border cursor-pointer transition-colors
                  ${selectedSectionId === section.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }
                `}
                onClick={() => onSectionSelect(section.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Checkbox
                    checked={section.isVisible}
                    onCheckedChange={(checked) => 
                      onSectionToggle(section.id, checked as boolean)
                    }
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {section.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      Section {sections.indexOf(section) + 1}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  {section.isVisible ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                  {selectedSectionId === section.id && (
                    <Edit3 className="w-3 h-3 text-blue-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </div>

      {/* Section Editor */}
      {selectedSection && (
        <div className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-900">
                Edit: {selectedSection.title}
              </CardTitle>
              {hasUnsavedChanges && (
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                  Unsaved
                </span>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col pt-0">
            {/* Editor Mode Toggle */}
            <div className="flex items-center gap-1 mb-3 p-1 bg-gray-100 rounded-md self-start">
              <Button
                variant={isRichTextMode ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {}} // Handled by parent
              >
                <Eye className="w-3 h-3 mr-1" />
                Rich
              </Button>
              <Button
                variant={!isRichTextMode ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {}} // Handled by parent
              >
                <Type className="w-3 h-3 mr-1" />
                HTML
              </Button>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col">
              <Label className="text-xs text-gray-600 mb-2">
                {isRichTextMode ? 'Rich Text Editor' : 'HTML Source'}
              </Label>
              
              {isRichTextMode ? (
                <div
                  ref={richEditorRef}
                  className="flex-1 p-3 border border-gray-200 rounded-md bg-white text-sm overflow-auto focus:outline-none focus:ring-2 focus:ring-blue-500"
                  contentEditable
                  onInput={handleRichTextInput}
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '12pt',
                    lineHeight: '1.15',
                    minHeight: '200px'
                  }}
                />
              ) : (
                <textarea
                  value={editingContent}
                  onChange={(e) => handlePlainTextChange(e.target.value)}
                  className="flex-1 p-3 border border-gray-200 rounded-md text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ minHeight: '200px' }}
                  placeholder="Edit HTML content..."
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
              <Button
                onClick={handleApplyChanges}
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!hasUnsavedChanges}
              >
                Apply Changes
              </Button>
              <Button
                onClick={handleDiscardChanges}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!hasUnsavedChanges}
              >
                Discard
              </Button>
            </div>
          </CardContent>
        </div>
      )}

      {/* No Section Selected */}
      {!selectedSection && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <Edit3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">Select a section to edit</p>
          </div>
        </div>
      )}
    </div>
  );
};