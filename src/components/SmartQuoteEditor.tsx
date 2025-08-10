import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Save, 
  Edit3, 
  FileText,
  Download,
  Undo2
} from 'lucide-react';
import { generateQuoteText } from './QuoteTextGenerator';
import { SmartQuoteHelper, QuoteSection, SmartQuoteData } from '@/templates/SmartQuoteTemplate';
import { PageContainer } from './PageContainer';
import { DynamicPageBreakManager } from '@/utils/dynamicPageBreakManager';

interface SmartQuoteEditorProps {
  quote: any;
  onSave?: (customizedQuote: SmartQuoteData) => void;
  onDownload?: (html: string) => void;
  className?: string;
}

export const SmartQuoteEditor: React.FC<SmartQuoteEditorProps> = ({
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
      
      // Generate original HTML using same method as standard PDF download
      const rawQuoteText = generateQuoteText(quote);
      
      // Apply the same styling as standard PDF download
      const styledHTML = `
        <div class="quote-container" style="
          font-family: 'Times New Roman', serif;
          font-size: 12pt;
          line-height: 1.15;
          width: 7in;
          margin: 0 auto;
          color: black;
          background: white;
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
      
      // Extract sections for editing
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

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => {
      if (section.id === sectionId) {
        setIsCustomized(true);
        return { ...section, isVisible: !section.isVisible };
      }
      return section;
    }));
  };

  const selectSection = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      // Extract inner content for editing (remove wrapper div)
      const innerContent = section.content
        .replace(/<div class="[^"]*-section"[^>]*>/, '')
        .replace(/<\/div>$/, '');
      setEditingContent(innerContent);
    }
  };

  const updateSectionContent = () => {
    if (!selectedSectionId) return;
    
    setSections(prev => prev.map(section => {
      if (section.id === selectedSectionId) {
        setIsCustomized(true);
        return {
          ...section,
          content: `<div class="${section.id}-section" style="line-height: 1.15; margin-top: 15px;">${editingContent}</div>`
        };
      }
      return section;
    }));
    
    setSelectedSectionId(null);
    setEditingContent('');
  };

  const resetToOriginal = () => {
    if (originalHTML) {
      const extractedSections = SmartQuoteHelper.extractSections(originalHTML);
      setSections(extractedSections);
      setIsCustomized(false);
      setSelectedSectionId(null);
      setEditingContent('');
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
    <div className={`smart-quote-editor ${className}`}>
      {/* Header Controls */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            {/* <CardTitle className="flex items-center space-x-2">
              <Edit3 className="h-5 w-5" />
              <span>Smart Quote Editor</span>
              {isCustomized && <Badge variant="secondary">Customized</Badge>}
            </CardTitle> */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToOriginal}
                disabled={!isCustomized}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!isCustomized}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Controls Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Sections</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSectionId === section.id
                        ? 'bg-primary/10 border-primary'
                        : section.isVisible
                        ? 'bg-background border-border hover:bg-muted/50'
                        : 'bg-muted/30 border-muted'
                    }`}
                    onClick={() => selectSection(section.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{section.title}</span>
                        {section.isRequired && <Badge variant="outline" className="text-xs">Required</Badge>}
                      </div>
                      <Switch
                        checked={section.isVisible}
                        onCheckedChange={() => toggleSection(section.id)}
                        disabled={section.isRequired}
                        // size="sm"
                      />
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      {section.isVisible ? (
                        <><Eye className="h-3 w-3 mr-1" /> Visible</>
                      ) : (
                        <><EyeOff className="h-3 w-3 mr-1" /> Hidden</>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg bg-white">
              <ScrollArea className="h-96">
                <div
                  ref={previewRef}
                  className="p-6"
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
                  style={{
                    fontSize: '12px',
                    lineHeight: '1.4',
                    color: '#000',
                    backgroundColor: '#fff'
                  }}
                />
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Editor Modal */}
      {selectedSection && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Edit Section: {selectedSection.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="section-content">Content</Label>
              <textarea
                id="section-content"
                className="w-full h-48 mt-1 p-3 border rounded-md text-sm resize-y"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                placeholder="Edit the content for this section. You can use HTML tags for formatting..."
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  lineHeight: '1.5'
                }}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                💡 Tip: Use <strong>&lt;strong&gt;</strong> for bold, <strong>&lt;br&gt;</strong> for line breaks, <strong>&lt;p&gt;</strong> for paragraphs
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={updateSectionContent}>
                <Save className="h-4 w-4 mr-1" />
                Update Section
              </Button>
              <Button variant="outline" onClick={() => {
                setSelectedSectionId(null);
                setEditingContent('');
              }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SmartQuoteEditor;