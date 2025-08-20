import React, { useEffect } from 'react';
import { generateQuoteText } from '../generation/QuoteTextGenerator';
import { SmartQuoteData } from '@/templates/SmartQuoteTemplate';
import { EditorToolbar } from './GoogleDocsSmartEditor/EditorToolbar';
import { DocumentCanvas } from './GoogleDocsSmartEditor/DocumentCanvas';
import { SectionManager } from './GoogleDocsSmartEditor/SectionManager';
import { useEditorState } from './GoogleDocsSmartEditor/hooks/useEditorState';
import { useDocumentPages } from './GoogleDocsSmartEditor/hooks/useDocumentPages';

interface GoogleDocsSmartEditorProps {
  quote: any;
  onSave?: (customizedQuote: SmartQuoteData) => void;
  onDownload?: (html: string) => void;
  className?: string;
}

export const GoogleDocsSmartEditor: React.FC<GoogleDocsSmartEditorProps> = ({
  quote,
  onSave,
  onDownload,
  className = ''
}) => {
  const {
    sections,
    originalHTML,
    previewHTML,
    selectedSectionId,
    editingContent,
    richEditingContent,
    isCustomized,
    isLoading,
    documentTitle,
    isRichTextMode,
    selectedSection,
    setSelectedSectionId,
    setEditingContent,
    setRichEditingContent,
    setIsRichTextMode,
    toggleSectionVisibility,
    updateSectionContent,
    updatePreview,
    resetToOriginal,
    loadExistingCustomization,
    loadFreshContent,
    updateSectionVisibilityFromData
  } = useEditorState();

  const [zoomLevel, setZoomLevel] = React.useState(85);
  const { pages } = useDocumentPages({ previewHTML, zoomLevel });

  // Initialize content
  useEffect(() => {
    generateInitialContent();
  }, [quote]);

  // Update preview when sections change
  useEffect(() => {
    updatePreview();
  }, [sections, updatePreview]);

  // Monitor quote data changes and update section visibility reactively
  useEffect(() => {
    if (quote && sections.length > 0) {
      updateSectionVisibilityFromData(quote);
    }
  }, [quote, updateSectionVisibilityFromData, sections.length]);

  const generateInitialContent = async () => {
    try {
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
        loadExistingCustomization(quote.customization.customHTML, quote.customization.customSections);
      } else {
        if (hasCustomization && !isCustomizationCurrent) {
          console.log('Quote data updated since last customization, generating fresh content for:', quote.proposal_number);
        }
        // Generate fresh content
        const rawQuoteText = generateQuoteText(quote);
        
        // Generate clean HTML with styling
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
        
        const title = quote?.project_name || quote?.proposal_number || 'Quote Document';
        loadFreshContent(styledHTML, title);
      }
      
    } catch (error) {
      console.error('Error generating quote content:', error);
    }
  };

  // Toolbar event handlers
  const handleSave = () => {
    if (onSave && isCustomized) {
      const customizedQuote: SmartQuoteData = {
        ...quote,
        customSections: sections,
        customHTML: previewHTML,
        isCustomized: true
      };
      onSave(customizedQuote);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(previewHTML);
    }
  };

  const handleUndo = () => {
    resetToOriginal();
  };

  const handleToggleRichText = () => {
    setIsRichTextMode(!isRichTextMode);
  };

  const handleZoomIn = () => {
    setZoomLevel(Math.min(150, zoomLevel + 10));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(50, zoomLevel - 10));
  };

  const handleRefresh = () => {
    generateInitialContent();
  };

  // Formatting handlers - placeholder implementations
  const handleFormatBold = () => {
    if (selectedSectionId && document.getSelection()) {
      document.execCommand('bold');
    }
  };

  const handleFormatItalic = () => {
    if (selectedSectionId && document.getSelection()) {
      document.execCommand('italic');
    }
  };

  const handleFormatUnderline = () => {
    if (selectedSectionId && document.getSelection()) {
      document.execCommand('underline');
    }
  };

  const handleAlignLeft = () => {
    if (selectedSectionId && document.getSelection()) {
      document.execCommand('justifyLeft');
    }
  };

  const handleAlignCenter = () => {
    if (selectedSectionId && document.getSelection()) {
      document.execCommand('justifyCenter');
    }
  };

  const handleAlignRight = () => {
    if (selectedSectionId && document.getSelection()) {
      document.execCommand('justifyRight');
    }
  };

  // Section manager handlers
  const handleSectionSelect = (sectionId: string) => {
    setSelectedSectionId(sectionId === selectedSectionId ? null : sectionId);
  };

  const handleSectionToggle = (sectionId: string, isVisible: boolean) => {
    toggleSectionVisibility(sectionId, isVisible);
  };

  const handleApplyChanges = () => {
    if (selectedSectionId) {
      const content = isRichTextMode ? richEditingContent : editingContent;
      updateSectionContent(selectedSectionId, content);
    }
  };

  const handleDiscardChanges = () => {
    if (selectedSection) {
      setEditingContent(selectedSection.content);
      setRichEditingContent(selectedSection.content);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Toolbar */}
      <EditorToolbar
        documentTitle={documentTitle}
        zoomLevel={zoomLevel}
        isRichTextMode={isRichTextMode}
        isCustomized={isCustomized}
        selectedSectionId={selectedSectionId}
        onSave={handleSave}
        onDownload={handleDownload}
        onUndo={handleUndo}
        onToggleRichText={handleToggleRichText}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRefresh={handleRefresh}
        onFormatBold={handleFormatBold}
        onFormatItalic={handleFormatItalic}
        onFormatUnderline={handleFormatUnderline}
        onAlignLeft={handleAlignLeft}
        onAlignCenter={handleAlignCenter}
        onAlignRight={handleAlignRight}
      />

      {/* Main Editor Area */}
      <div className="flex-1 flex min-h-0">
        {/* Document Canvas */}
        <DocumentCanvas
          pages={pages}
          zoomLevel={zoomLevel}
          previewHTML={previewHTML}
          onSectionClick={handleSectionSelect}
          selectedSectionId={selectedSectionId}
          className="flex-1"
        />

        {/* Section Manager */}
        <SectionManager
          sections={sections}
          selectedSectionId={selectedSectionId}
          editingContent={editingContent}
          richEditingContent={richEditingContent}
          isRichTextMode={isRichTextMode}
          onSectionSelect={handleSectionSelect}
          onSectionToggle={handleSectionToggle}
          onEditingContentChange={setEditingContent}
          onRichEditingContentChange={setRichEditingContent}
          onApplyChanges={handleApplyChanges}
          onDiscardChanges={handleDiscardChanges}
        />
      </div>
    </div>
  );
};
export default GoogleDocsSmartEditor;