import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const [richEditingContent, setRichEditingContent] = useState('');
  const [headerText, setHeaderText] = useState('');
  const richEditorRef = useRef<HTMLDivElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  // Initialize content when section changes
  useEffect(() => {
    if (section && isOpen) {
      // Extract header text if available
      const headerFromSection = section.header || '';
      setHeaderText(headerFromSection);
      
      // Extract clean content from section WITHOUT header
      let cleanHTML = section.content;
      
      // Create a temporary div to parse the HTML properly
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = section.content;
      
      // Remove any headers from the content (in case they're still there)
      const headers = tempDiv.querySelectorAll('h2.section-header, h2.editable-header');
      headers.forEach(header => header.remove());
      
      // Find the section wrapper div and extract content properly
      const sectionDiv = tempDiv.querySelector(`li, div[class*="${section.id}"], div[class*="section"]`);
      if (sectionDiv) {
        // For all sections, use the same logic (including panels)
        const container = document.createElement('div');
        sectionDiv.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
            container.appendChild(node.cloneNode(true));
          }
        });
        cleanHTML = container.innerHTML.trim();
      } else {
        // Fallback: remove only outermost div wrapper if exists
        cleanHTML = tempDiv.innerHTML.trim();
      }
      
      // console.log('QuickEditModal: cleanHTML generated (no header):', cleanHTML);
      // console.log('QuickEditModal: header text:', headerFromSection);
      setRichEditingContent(cleanHTML);
      
      // Set the content directly to the contentEditable element
      if (richEditorRef.current) {
        richEditorRef.current.innerHTML = cleanHTML;
      }
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
      // Save cursor position before updating state
      const selection = window.getSelection();
      const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
      
      setRichEditingContent(richEditorRef.current.innerHTML);
      
      // Restore cursor position after state update
      if (range && selection) {
        setTimeout(() => {
          try {
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (error) {
            // Range might be invalid, just focus the element
            richEditorRef.current?.focus();
          }
        }, 0);
      }
    }
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    // Get content from the editor
    const bodyContent = richEditorRef.current?.innerHTML || richEditingContent;
    
    // Reconstruct the section with header and content
    const sectionClassname = `${section.id}-section`;
    const headerElement = headerText.trim() 
      ? `<h2 class="section-header editable-header" contenteditable="false">${headerText.trim()}</h2>`
      : '';
    
    // Combine header and content within the section div
    let contentToSave = `<div class="${sectionClassname}">`;
    if (headerElement) {
      contentToSave += headerElement;
    }
    
    // Add the body content, removing the outer div wrapper if it exists
    let cleanBodyContent = bodyContent;
    if (cleanBodyContent.startsWith(`<div class="${sectionClassname}"`) && cleanBodyContent.endsWith('</div>')) {
      // Remove outer wrapper div to avoid double wrapping
      cleanBodyContent = cleanBodyContent
        .replace(new RegExp(`^<div class="${sectionClassname}"[^>]*>`), '')
        .replace(/<\/div>$/, '');
    }
    
    contentToSave += cleanBodyContent;
    contentToSave += '</div>';
    
    console.log('Saving section with reconstructed content:', { 
      sectionId: section.id, 
      headerText, 
      contentLength: contentToSave.length 
    });
    
    onSave(section.id, contentToSave);
    onClose();
  }, [section.id, richEditingContent, headerText, onSave, onClose]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle key events to fix Enter key behavior
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle Enter key to force line breaks instead of div creation
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Insert a line break at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const br = document.createElement('br');
        range.deleteContents();
        range.insertNode(br);
        
        // Move cursor after the br element
        range.setStartAfter(br);
        range.setEndAfter(br);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Update the content state
        if (richEditorRef.current) {
          setRichEditingContent(richEditorRef.current.innerHTML);
        }
      }
      return;
    }
    
    // Handle Escape key to close modal
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
      return;
    }
  }, [handleCancel]);

  // console.log(`QuickEditModal render: isOpen=${isOpen}, section:`, section);
  
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
          
          <div className="mt-3">
            <div className="text-sm text-gray-600">
              {section.isRequired && (
                <span className="text-red-500 font-medium">Required Section</span>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-4">
            <div className="space-y-3">
              {/* Section Header Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Section Header
                </label>
                <input
                  ref={headerInputRef}
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 outline-none"
                  placeholder="Enter section header text (e.g., PANELS:)"
                  style={{
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                />
                <p className="text-xs text-gray-500">
                  This text will appear as the section header in your document
                </p>
              </div>
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

              {/* Section Content Label */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Section Content
                </label>
                
                {/* Rich Text Editor */}
                <div
                  ref={richEditorRef}
                  contentEditable
                  className="w-full min-h-80 max-h-96 p-4 border-2 rounded-lg bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 outline-none overflow-y-auto"
                style={{
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
                  onInput={handleRichTextInput}
                  onKeyDown={handleKeyDown}
                  suppressContentEditableWarning={true}
                />
                
                <p className="text-xs text-gray-500">
                  ✨ Use the toolbar above to format your content. Bold, italic, and underline formatting will be preserved in the final document.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        
        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
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
      </Card>
    </div>
  );
};

export default QuickEditModal;