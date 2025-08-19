import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Save, 
  Edit3, 
  FileText,
  Download,
  Undo2,
  Bold,
  Italic,
  Underline,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { generateQuoteText } from '../generation/QuoteTextGenerator';
import { SmartQuoteHelper, QuoteSection, SmartQuoteData } from '@/templates/SmartQuoteTemplate';

interface EnhancedSmartQuoteEditorProps {
  quote: any;
  onSave?: (customizedQuote: SmartQuoteData) => void;
  onDownload?: (html: string) => void;
  className?: string;
}

export const EnhancedSmartQuoteEditor: React.FC<EnhancedSmartQuoteEditorProps> = ({
  quote,
  onSave,
  onDownload,
  className = ''
}) => {
  const [sections, setSections] = useState<QuoteSection[]>([]);
  const [originalHTML, setOriginalHTML] = useState<string>('');
  const [previewHTML, setPreviewHTML] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [isCustomized, setIsCustomized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [textEditingEnabled, setTextEditingEnabled] = useState<boolean>(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateInitialContent();
  }, [quote]);

  useEffect(() => {
    updatePreview();
  }, [sections]);

  const generateInitialContent = async () => {
    try {
      setIsLoading(true);
      
      const rawQuoteText = generateQuoteText(quote);
      
      const styledHTML = `
        <div class="quote-container" style="
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.15;
          width: 6.5in;
          min-height: 9in;
          margin: 1in auto;
          color: black;
          background: white;
          padding: 0;
          box-sizing: border-box;
        ">
          ${rawQuoteText}
        </div>
        <style>
          .header-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
          }
          .company-info { flex: 1; max-width: 40%; }
          .company-logo { display: flex; align-items: center; gap: 15px; }
          .logo-placeholder {
            width: 60px; height: 60px;
            background: linear-gradient(135deg, #3B82F6, #F59E0B);
            color: white; display: flex;
            align-items: center; justify-content: center;
            font-weight: bold; font-size: 16pt; border-radius: 8px;
          }
          .company-name { font-size: 14pt; font-weight: bold; color: #333; line-height: 1.2; }
          .contact-details { flex: 1; max-width: 55%; text-align: right; }
          .contact-row { margin-bottom: 2px; display: flex; justify-content: flex-end; align-items: center; line-height: 1.1; }
          .contact-row .label { font-weight: bold; margin-right: 8px; min-width: 80px; text-align: right; }
          .contact-row .value { text-align: left; flex: 1; }
          .website-link { color: #3B82F6; text-decoration: underline; }
          .billing-and-job-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; gap: 40px; }
          .billing-section { flex: 1; max-width: 45%; }
          .billed-to-details { margin-top: 10px; }
          .billed-line { margin-bottom: 2px; min-height: 20px; padding-bottom: 4px; }
          .underline { height: 1px; background-color: black; margin-bottom: 8px; width: 100%; }
          .job-info-section { flex: 1; max-width: 50%; }
          .job-row { display: flex; align-items: center; margin-bottom: 15px; position: relative; }
          .job-label { font-weight: bold; margin-right: 20px; min-width: 120px; }
          .job-value { flex: 1; padding-bottom: 2px; }
          .job-underline { position: absolute; bottom: 0; right: 0; left: 140px; height: 1px; background-color: black; }
          h2.section-header { font-weight: bold; font-size: 12pt; margin-top: 1.5em; margin-bottom: 0.5em; }
          .wall-specifications { line-height: 1.15; max-width: 7.25in; }
          .acceptance-section p { font-style: italic; font-size: 9pt; line-height: 1.2; }
        </style>
      `;
      
      setOriginalHTML(styledHTML);
      const extractedSections = SmartQuoteHelper.extractSections(styledHTML);
      setSections(extractedSections);
      setPreviewHTML(styledHTML);
      setIsCustomized(false);
      
    } catch (error) {
      console.error('Error generating quote content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreview = () => {
    if (sections.length > 0 && originalHTML) {
      const updatedHTML = SmartQuoteHelper.reconstructHTML(sections, originalHTML);
      setPreviewHTML(updatedHTML);
    }
  };

  const toggleSection = (sectionId: string, checked: boolean) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        setIsCustomized(true);
        return { ...section, isVisible: checked };
      }
      return section;
    }));
  };

  const selectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      // Extract clean text content for rich text editing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = section.content;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      setEditingContent(cleanText);
    }
  };

  const updateSectionContent = () => {
    if (!selectedSectionId) return;
    
    setSections(prev => prev.map(section => {
      if (section.id === selectedSectionId) {
        setIsCustomized(true);
        // Wrap the text content with appropriate HTML structure
        const wrappedContent = `<div class="${section.id}-section" style="line-height: 1.15; margin-top: 15px;">
          ${editingContent.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('')}
        </div>`;
        return {
          ...section,
          content: wrappedContent
        };
      }
      return section;
    }));
    
    setSelectedSectionId(null);
    setEditingContent('');
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const selection = window.getSelection();
    if (selection && editorRef.current) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const content = editorRef.current.innerHTML;
      setEditingContent(editorRef.current.innerText || '');
    }
  };

  const resetToOriginal = () => {
    if (originalHTML) {
      const extractedSections = SmartQuoteHelper.extractSections(originalHTML);
      setSections(extractedSections);
      setIsCustomized(false);
      setSelectedSectionId(null);
      setEditingContent('');
      setTextEditingEnabled(false);
    }
  };

  const handleSave = () => {
    const customizedQuote: SmartQuoteData = {
      ...quote,
      customSections: sections,
      customHTML: previewHTML,
      isCustomized: isCustomized
    };
    
    onSave?.(customizedQuote);
  };

  const handleDownload = () => {
    onDownload?.(previewHTML);
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Generating quote content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 ${className}`}>
      {/* Compact Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-white/20 shadow-lg flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Edit3 className="w-5 h-5 text-indigo-500" />
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Smart Quote Editor
              </h1>
              {isCustomized && <Badge variant="secondary" className="bg-amber-100 text-amber-700">Customized</Badge>}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToOriginal}
                disabled={!isCustomized}
                className="rounded-lg"
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!isCustomized}
                className="rounded-lg"
              >
                <Save className="h-4 w-4 mr-1" />
                Save Changes
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex w-full max-w-7xl mx-auto">
          {/* Compact Sidebar */}
          <div className="w-64 flex-shrink-0 p-4">
            <Card className="bg-white/80 backdrop-blur-sm border border-white/50 shadow-xl h-full flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-slate-900 text-lg">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Sections
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-1 overflow-y-auto">
                {sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                        selectedSectionId === section.id
                          ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 shadow-sm' 
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                      onClick={() => selectSection(section.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={section.isVisible}
                            onCheckedChange={(checked) => toggleSection(section.id, checked === true)}
                            disabled={section.isRequired}
                            className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div>
                            <span className="font-medium text-sm text-slate-700">{section.title}</span>
                            {section.isRequired && (
                              <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center mt-1 text-xs text-slate-500">
                        {section.isVisible ? (
                          <><Eye className="h-3 w-3 mr-1" /> Visible</>
                        ) : (
                          <><EyeOff className="h-3 w-3 mr-1" /> Hidden</>
                        )}
                        <span className="ml-2">• Click to edit</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Large Live Preview */}
          <div className="flex-1 p-4 pl-2 flex flex-col overflow-hidden">
            <Card className="bg-white/90 backdrop-blur-sm border border-white/50 shadow-2xl flex-1 flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
                  <Eye className="w-5 h-5 text-indigo-500" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              
              <CardContent className="flex-1 p-4 overflow-hidden">
                <div className="h-full overflow-y-auto bg-slate-100 p-4">
                  {/* Paper Container - Actual 8.5" x 11" with proper aspect ratio */}
                  <div 
                    className="bg-white shadow-2xl rounded-sm border border-slate-300 mx-auto relative"
                    style={{ 
                      width: 'min(612px, 90vw)', // 8.5" at 72 DPI = 612px
                      minHeight: '792px', // 11" at 72 DPI = 792px
                      aspectRatio: '8.5/11',
                      padding: '72px' // 1" margin = 72px at 72 DPI
                    }}
                  >
                    {/* Content Area - 6.5" x 9" */}
                    <div
                      ref={previewRef}
                      className="w-full h-full overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: previewHTML }}
                      style={{
                        fontSize: '11px',
                        lineHeight: '1.4',
                        color: '#000',
                        backgroundColor: 'transparent',
                        fontFamily: '"Times New Roman", Times, serif'
                      }}
                    />
                    
                    {/* Paper indicators for debugging */}
                    <div className="absolute top-2 right-2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded opacity-50">
                      8.5" × 11"
                    </div>
                    <div className="absolute bottom-2 left-2 text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded opacity-50">
                      1" margins
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Rich Text Editor Modal */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-white shadow-2xl">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-500" />
                  Edit Section: {selectedSection.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor="textEditToggle" className="text-sm font-medium">Rich Text Editor</Label>
                  <Checkbox
                    id="textEditToggle"
                    checked={textEditingEnabled}
                    onCheckedChange={(checked) => setTextEditingEnabled(checked === true)}
                    className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                  />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              {textEditingEnabled ? (
                <div className="space-y-3">
                  {/* Rich Text Toolbar */}
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('bold')}
                      className="w-8 h-8 p-0"
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('italic')}
                      className="w-8 h-8 p-0"
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('underline')}
                      className="w-8 h-8 p-0"
                    >
                      <Underline className="w-4 h-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('fontSize', '14px')}
                      className="w-8 h-8 p-0"
                    >
                      <Type className="w-4 h-4" />
                    </Button>
                    <Separator orientation="vertical" className="h-6" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('justifyLeft')}
                      className="w-8 h-8 p-0"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('justifyCenter')}
                      className="w-8 h-8 p-0"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => formatText('justifyRight')}
                      className="w-8 h-8 p-0"
                    >
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Rich Text Editor */}
                  <div
                    ref={editorRef}
                    contentEditable
                    className="w-full min-h-48 p-4 border-2 rounded-lg bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200 outline-none"
                    style={{
                      fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
                      fontSize: '14px',
                      lineHeight: '1.6'
                    }}
                    onInput={(e) => setEditingContent(e.currentTarget.innerText)}
                    dangerouslySetInnerHTML={{ __html: editingContent.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('') }}
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="section-content" className="text-sm font-medium text-slate-700">Content</Label>
                  <textarea
                    id="section-content"
                    className="w-full h-48 mt-2 p-4 border-2 rounded-lg text-sm resize-y bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-all duration-200 outline-none"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    placeholder="Edit the text content for this section..."
                    style={{
                      fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
                      lineHeight: '1.6'
                    }}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    💡 Simple text editing mode - use the Rich Text Editor toggle above for formatting options
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedSectionId(null);
                    setEditingContent('');
                    setTextEditingEnabled(false);
                  }}
                  className="px-6"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={updateSectionContent}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 px-6 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update Section
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EnhancedSmartQuoteEditor;