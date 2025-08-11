import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Edit3
} from 'lucide-react';
import { QuoteSection } from '@/templates/SmartQuoteTemplate';

interface QuickEditModalProps {
  section: QuoteSection;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sectionId: string, content: string) => void;
}

export const QuickEditModal: React.FC<QuickEditModalProps> = ({
  section,
  isOpen,
  onClose,
  onSave
}) => {
  const [isRichTextMode, setIsRichTextMode] = useState(true);
  const [editingContent, setEditingContent] = useState('');
  const [richEditingContent, setRichEditingContent] = useState('');
  const richEditorRef = useRef<HTMLDivElement>(null);

  // Initialize content when section changes
  useEffect(() => {
    if (section && isOpen) {
      // Extract clean content from section
      const cleanHTML = section.content
        .replace(/<div class=\"[^\"]*-section\"[^>]*>/, '')
        .replace(/<\/div>$/, '')
        .trim();
      
      setRichEditingContent(cleanHTML);
      
      // For plain text mode, extract text content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHTML;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      setEditingContent(cleanText);
    }
  }, [section, isOpen]);

  // Handle rich text formatting commands
  const formatText = useCallback((command: string, value?: string) => {
    if (!richEditorRef.current) return;
    
    document.execCommand(command, false, value);
    richEditorRef.current.focus();
    
    // Update the rich editing content
    setRichEditingContent(richEditorRef.current.innerHTML);
  }, []);

  // Handle rich text input changes
  const handleRichTextInput = useCallback(() => {
    if (richEditorRef.current) {
      setRichEditingContent(richEditorRef.current.innerHTML);
    }
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    let contentToSave;
    
    if (isRichTextMode) {
      // Use rich text content from the contentEditable div
      contentToSave = richEditorRef.current?.innerHTML || richEditingContent;
    } else {
      // Convert plain text to HTML
      contentToSave = editingContent.split('\n').map(line => 
        line.trim() ? `<p>${line}</p>` : '<br>'
      ).join('');
    }
    
    onSave(section.id, contentToSave);
    onClose();
  }, [section.id, isRichTextMode, richEditingContent, editingContent, onSave, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen || !section) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white shadow-2xl">
        <CardHeader className="border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Edit3 className="w-5 h-5 text-blue-500" />
              Edit Section: {section.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Editor Mode Toggle */}
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-600">
              {section.isRequired && (
                <span className="text-red-500 font-medium">Required Section</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label htmlFor="richTextToggle" className="text-sm font-medium">
                Rich Text Editor
              </Label>
              <Checkbox
                id="richTextToggle"
                checked={isRichTextMode}
                onCheckedChange={(checked) => setIsRichTextMode(checked === true)}
                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-4">
            {isRichTextMode ? (
              <div className="space-y-3">
                {/* Rich Text Formatting Toolbar */}
                <div className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('bold')}
                    className="w-8 h-8 p-0 hover:bg-blue-100"
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('italic')}
                    className="w-8 h-8 p-0 hover:bg-blue-100"
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('underline')}
                    className="w-8 h-8 p-0 hover:bg-blue-100"
                    title="Underline"
                  >
                    <Underline className="w-4 h-4" />
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('fontSize', '14px')}
                    className="w-8 h-8 p-0 hover:bg-blue-100"
                    title="Font Size"
                  >
                    <Type className="w-4 h-4" />
                  </Button>
                  
                  <Separator orientation="vertical" className="h-6 mx-1" />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('justifyLeft')}
                    className="w-8 h-8 p-0 hover:bg-blue-100"
                    title="Align Left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('justifyCenter')}
                    className="w-8 h-8 p-0 hover:bg-blue-100"
                    title="Align Center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => formatText('justifyRight')}
                    className="w-8 h-8 p-0 hover:bg-blue-100"
                    title="Align Right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Rich Text Editor */}
                <div
                  ref={richEditorRef}
                  contentEditable
                  className="w-full min-h-64 p-4 border-2 rounded-lg bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 outline-none"
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}
                  onInput={handleRichTextInput}
                  dangerouslySetInnerHTML={{ __html: richEditingContent }}
                  suppressContentEditableWarning={true}
                />
                
                <p className="text-xs text-gray-500">
                  ✨ Use the toolbar above to format your text. Bold, italic, and underline formatting will be preserved in the final document.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="section-content" className="text-sm font-medium text-gray-700">
                  Content (Plain Text)
                </Label>
                <textarea
                  id="section-content"
                  className="w-full h-64 p-4 border-2 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  placeholder="Edit the text content for this section..."
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    lineHeight: '1.5'
                  }}
                />
                <p className="text-xs text-gray-500">
                  ✏️ Plain text editing mode. Switch to Rich Text Editor above for formatting options.
                </p>
              </div>
            )}
          </div>
        </CardContent>
        
        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isRichTextMode ? 'Rich text mode active' : 'Plain text mode active'}
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="px-6"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 px-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Save className="h-4 w-4 mr-2" />
                Update Section
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuickEditModal;