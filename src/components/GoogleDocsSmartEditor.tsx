import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Save, 
  Download,
  Undo2,
  Eye,
  EyeOff,
  Edit3,
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
import { generateQuoteText } from './QuoteTextGenerator';
import { SmartQuoteHelper, QuoteSection, SmartQuoteData } from '@/templates/SmartQuoteTemplate';

interface GoogleDocsSmartEditorProps {
  quote: any;
  onSave?: (customizedQuote: SmartQuoteData) => void;
  onDownload?: (html: string) => void;
  className?: string;
}

interface DocumentPage {
  id: string;
  content: string;
  pageNumber: number;
}

export const GoogleDocsSmartEditor: React.FC<GoogleDocsSmartEditorProps> = ({
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
  const [richEditingContent, setRichEditingContent] = useState<string>('');
  const [isCustomized, setIsCustomized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [documentTitle, setDocumentTitle] = useState<string>('Quote Document');
  const [zoomLevel, setZoomLevel] = useState<number>(85); // Default zoom for good visibility
  const [pages, setPages] = useState<DocumentPage[]>([]);
  const [isRichTextMode, setIsRichTextMode] = useState<boolean>(true);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const richEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generateInitialContent();
  }, [quote]);

  useEffect(() => {
    updatePreview();
  }, [sections]);

  useEffect(() => {
    if (previewHTML) {
      calculatePages();
    }
  }, [previewHTML, zoomLevel]);

  const generateInitialContent = async () => {
    try {
      setIsLoading(true);
      
      // Check if quote has existing customization AND if it's still current
      const hasCustomization = quote?.customization && quote.customization.customSections && quote.customization.customHTML;
      const quoteLastUpdatedAt = quote?.updated_at;
      const customizationLastModified = quote?.customization?.lastModified;
      
      // Only use cached customization if quote data hasn't been updated since the customization
      const isCustomizationCurrent = hasCustomization && customizationLastModified && quoteLastUpdatedAt && 
        new Date(customizationLastModified) >= new Date(quoteLastUpdatedAt);
      
      if (isCustomizationCurrent) {
        // Load existing customization (quote hasn't changed since customization)
        console.log('Loading existing customization for quote:', quote.proposal_number);
        setOriginalHTML(quote.customization.customHTML);
        setSections(quote.customization.customSections);
        setPreviewHTML(quote.customization.customHTML);
        setDocumentTitle(quote?.project_name || quote?.proposal_number || 'Quote Document');
        setIsCustomized(quote.customization.isCustomized || false);
      } else {
        if (hasCustomization && !isCustomizationCurrent) {
          console.log('Quote data updated since last customization, generating fresh content for:', quote.proposal_number);
        }
        // Generate fresh content
        const rawQuoteText = generateQuoteText(quote);
        
        // Generate clean HTML without restrictive containers
        const styledHTML = `
          ${rawQuoteText}
          <style>
            /* Google Docs-like styling */
            .quote-document {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.15;
              color: #000;
              background: transparent;
            }
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
            .wall-specifications { line-height: 1.15; }
            .acceptance-section p { font-style: italic; font-size: 9pt; line-height: 1.2; }
            .pricing-section { margin-top: 20px; }
            .pricing-section table { width: 100%; border-collapse: collapse; }
            .pricing-section td { border: 1px solid #000; padding: 8px; }
            .terms-section { margin-top: 20px; }
            .terms-section ol { padding-left: 20px; }
            .terms-section li { margin-bottom: 8px; line-height: 1.3; }
            .signature-section { margin-top: 30px; }
          </style>
        `;
        
        setOriginalHTML(styledHTML);
        const extractedSections = SmartQuoteHelper.extractSections(styledHTML);
        setSections(extractedSections);
        setPreviewHTML(styledHTML);
        setDocumentTitle(quote?.project_name || quote?.proposal_number || 'Quote Document');
        setIsCustomized(false);
      }
      
    } catch (error) {
      console.error('Error generating quote content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePages = () => {
    if (!measureRef.current || !previewHTML) return;

    // Create a temporary element to measure content height
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = previewHTML;
    tempDiv.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: 640px;
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.15;
      padding: 0;
      margin: 0;
    `;
    document.body.appendChild(tempDiv);

    const contentHeight = tempDiv.scrollHeight;
    const pageHeight = 800; // Larger content area to accommodate wider pages
    const totalPages = Math.ceil(contentHeight / pageHeight);

    document.body.removeChild(tempDiv);

    // For now, put all content on pages (we'll enhance this later)
    const newPages: DocumentPage[] = [];
    for (let i = 0; i < Math.max(1, totalPages); i++) {
      newPages.push({
        id: `page-${i}`,
        content: i === 0 ? previewHTML : '', // Put all content on first page for now
        pageNumber: i + 1
      });
    }

    setPages(newPages);
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
      // For rich text mode, preserve the HTML content
      const cleanHTML = section.content
        .replace(/<div class="[^"]*-section"[^>]*>/, '')
        .replace(/<\/div>$/, '');
      setRichEditingContent(cleanHTML);
      
      // For plain text mode, extract text content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = cleanHTML;
      const cleanText = tempDiv.textContent || tempDiv.innerText || '';
      setEditingContent(cleanText);
    }
  };

  const updateSectionContent = () => {
    if (!selectedSectionId) return;
    
    setSections(prev => prev.map(section => {
      if (section.id === selectedSectionId) {
        setIsCustomized(true);
        
        let contentToUse;
        if (isRichTextMode) {
          // Use rich text content from the contentEditable div
          contentToUse = richEditorRef.current?.innerHTML || richEditingContent;
        } else {
          // Convert plain text to HTML
          contentToUse = editingContent.split('\n').map(line => 
            line.trim() ? `<p>${line}</p>` : '<br>'
          ).join('');
        }
        
        const wrappedContent = `<div class="${section.id}-section" style="line-height: 1.15; margin-top: 15px;">
          ${contentToUse}
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
    setRichEditingContent('');
  };

  const formatText = (command: string, value?: string) => {
    if (!richEditorRef.current) return;
    
    document.execCommand(command, false, value);
    richEditorRef.current.focus();
    
    // Update the rich editing content
    setRichEditingContent(richEditorRef.current.innerHTML);
  };

  const handleRichTextInput = () => {
    if (richEditorRef.current) {
      setRichEditingContent(richEditorRef.current.innerHTML);
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(50, prev - 10));

  const resetToOriginal = () => {
    if (originalHTML) {
      const extractedSections = SmartQuoteHelper.extractSections(originalHTML);
      setSections(extractedSections);
      setIsCustomized(false);
      setSelectedSectionId(null);
      setEditingContent('');
      setRichEditingContent('');
    }
  };

  const generateFreshContent = async () => {
    try {
      setIsLoading(true);
      
      // Always generate fresh content from current quote data, ignoring any saved customizations
      const rawQuoteText = generateQuoteText(quote);
      
      // Generate clean HTML without restrictive containers
      const styledHTML = `
        ${rawQuoteText}
        <style>
          /* Google Docs-like styling */
          .quote-document {
            font-family: 'Times New Roman', Times, serif;
            font-size: 12pt;
            line-height: 1.15;
            color: #000;
            background: transparent;
          }
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
          .wall-specifications { line-height: 1.15; }
          .acceptance-section p { font-style: italic; font-size: 9pt; line-height: 1.2; }
          .pricing-section { margin-top: 20px; }
          .pricing-section table { width: 100%; border-collapse: collapse; }
          .pricing-section td { border: 1px solid #000; padding: 8px; }
          .terms-section { margin-top: 20px; }
          .terms-section ol { padding-left: 20px; }
          .terms-section li { margin-bottom: 8px; line-height: 1.3; }
          .signature-section { margin-top: 30px; }
        </style>
      `;
      
      // Update state with fresh content
      setOriginalHTML(styledHTML);
      const extractedSections = SmartQuoteHelper.extractSections(styledHTML);
      setSections(extractedSections);
      setPreviewHTML(styledHTML);
      setDocumentTitle(quote?.project_name || quote?.proposal_number || 'Quote Document');
      setIsCustomized(false); // Reset customization flag since this is fresh content
      
      // Clear any editing state
      setSelectedSectionId(null);
      setEditingContent('');
      setRichEditingContent('');
      
      console.log('Generated fresh content from current quote data');
      
    } catch (error) {
      console.error('Error generating fresh quote content:', error);
    } finally {
      setIsLoading(false);
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
      <div className="flex items-center justify-center h-screen bg-[#f8f9fa]">
        <div className="flex items-center space-x-3 bg-white p-6 rounded-lg shadow-lg">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-700">Preparing your document...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#f8f9fa] ${className}`}>
      {/* Google Docs-style Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Document Title */}
            <div className="flex items-center gap-4">
              <FileText className="w-6 h-6 text-blue-500" />
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="text-lg font-medium border-none shadow-none focus:ring-0 px-2 bg-transparent"
                placeholder="Untitled document"
              />
              {isCustomized && (
                <span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  {quote?.customization ? 'Previously Saved' : 'Edited'}
                </span>
              )}
              {quote?.customization && !isCustomized && (
                <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  Fresh Data Loaded
                </span>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="h-7 w-7 p-0"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[3rem] text-center">
                  {zoomLevel}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="h-7 w-7 p-0"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={resetToOriginal}
                disabled={!isCustomized}
              >
                <Undo2 className="w-4 h-4 mr-2" />
                Reset
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateFreshContent()}
                title="Regenerate content from current quote data (will lose customizations)"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!isCustomized}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              
              <Button
                size="sm"
                onClick={handleDownload}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex">
        {/* Compact Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 h-screen sticky top-[73px] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Document Sections
            </h3>
            
            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`
                    group p-3 rounded-lg border cursor-pointer transition-all duration-200
                    ${selectedSectionId === section.id 
                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }
                  `}
                  onClick={() => selectSection(section.id)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={section.isVisible}
                      onCheckedChange={(checked) => toggleSection(section.id, checked as boolean)}
                      disabled={section.isRequired}
                      className="mt-0.5 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {section.title}
                        {section.isRequired && (
                          <span className="ml-1 text-xs text-red-500">*</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {section.isVisible ? (
                          <Eye className="w-3 h-3 text-green-500" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500">
                          {section.isVisible ? 'Visible' : 'Hidden'}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to edit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Document Canvas */}
        <div className="flex-1 overflow-auto">
          <div className="py-8 px-4">
            {/* Document Pages */}
            <div className="max-w-none mx-auto">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className="mx-auto mb-8 bg-white shadow-lg"
                  style={{
                    width: `${720 * zoomLevel / 100}px`,
                    minHeight: `${932 * zoomLevel / 100}px`,
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    marginBottom: `${32 * zoomLevel / 100}px`
                  }}
                >
                  {/* Page Content */}
                  <div
                    className="quote-document p-8 h-full"
                    dangerouslySetInnerHTML={{ __html: page.content }}
                    style={{
                      fontSize: `${12 * zoomLevel / 100}pt`,
                      lineHeight: 1.15,
                      overflow: 'visible',
                      wordWrap: 'break-word',
                      width: '100%'
                    }}
                  />
                  
                  {/* Page Number */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
                    Page {page.pageNumber}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden measuring element */}
      <div ref={measureRef} className="absolute -left-[9999px] top-0 opacity-0 pointer-events-none" />

      {/* Rich Text Editor Modal */}
      {selectedSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white">
            <CardHeader className="border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Edit3 className="w-5 h-5 text-blue-500" />
                  Edit Section: {selectedSection.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSectionId(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Content Editor</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Rich Text Mode</span>
                    <Checkbox
                      checked={isRichTextMode}
                      onCheckedChange={setIsRichTextMode}
                      className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                    />
                  </div>
                </div>

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
                      <div className="w-px h-6 bg-gray-300 mx-1" />
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
                      ✨ Use the toolbar above to format your text. Bold, italic, and underline formatting will be preserved.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      className="w-full h-64 p-4 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      placeholder="Edit the text content for this section..."
                      style={{
                        fontFamily: '"Times New Roman", Times, serif',
                        lineHeight: '1.5'
                      }}
                    />
                    <p className="text-xs text-gray-500">
                      ✏️ Plain text editing mode. Switch to Rich Text Mode above for formatting options.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedSectionId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={updateSectionContent}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
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

export default GoogleDocsSmartEditor;