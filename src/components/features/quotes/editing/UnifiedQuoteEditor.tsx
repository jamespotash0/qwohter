import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Save, 
  Download, 
  RefreshCw, 
  FileText,
  Edit3,
  ZoomIn,
  ZoomOut,
  Settings
} from 'lucide-react';
import { generateQuoteText } from '@/components/features/quotes/generation/QuoteTextGenerator';
import { SmartQuoteHelper, QuoteSection, SmartQuoteData } from '@/templates/SmartQuoteTemplate';
import { MixedContentEngine, MixedContentSection } from '@/utils/mixedContentEngine';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import { Quote } from '@/stores/quotes/quotesStore';
import { useCurrentQuote } from '@/stores/quotes/quotesStore';
import { useOrganizationSettings } from '@/hooks/useCompanySettings';
import { QuoteDataPanelCore as QuoteDataPanel } from './UnifiedQuoteEditor/QuoteDataPanel/QuoteDataPanelCore';
import LivePreviewPanel from './UnifiedQuoteEditor/LivePreviewPanel';
import QuickEditModal from './UnifiedQuoteEditor/QuickEditModal';

// Unified state interface
interface UnifiedQuoteState {
  rawData: QuoteData;
  generatedHTML: string;
  mixedContentSections: Map<string, MixedContentSection>;
  previewHTML: string;
  isDirty: boolean;
  lastSaved?: Date;
  conflicts: string[];
}

interface UnifiedQuoteEditorProps {
  quote: Quote;
  onSave?: (data: SmartQuoteData) => void;
  onDownload?: (html: string, isSmartPDF?: boolean) => void;
  onBack?: () => void;
  onUpdateWallSystem?: (quoteId: string, wallName: string, wallData: any) => Promise<any>;
  onRemoveWallSystem?: (quoteId: string, wallName: string) => Promise<any>;
  className?: string;
}

export const UnifiedQuoteEditor: React.FC<UnifiedQuoteEditorProps> = ({
  quote,
  onSave,
  onDownload,
  onBack,
  onUpdateWallSystem,
  onRemoveWallSystem,
  className = ''
}) => {
  const { toast } = useToast();
  
  // Get current quote from realtime store
  const realtimeQuote = useCurrentQuote();
  
  // Use realtime quote if available and matches the current quote ID, otherwise use prop
  const activeQuote = (realtimeQuote?.id === quote.id) ? realtimeQuote : quote;
  
  // Core unified state
  const [state, setState] = useState<UnifiedQuoteState>({
    rawData: activeQuote,
    generatedHTML: '',
    mixedContentSections: new Map(),
    previewHTML: '',
    isDirty: false,
    conflicts: []
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [documentTitle, setDocumentTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedSection, setSelectedSection] = useState<QuoteSection | null>(null);
  const [showDataPanel, setShowDataPanel] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  // Smart PDF is now the only mode - no toggle needed
  const showSmartPDFPreview = true;

  // Get organization settings to add to quote data
  const { organization } = useOrganizationSettings();

  // Data sync engine
  const syncEngine = useMemo(() => ({
    // Generate base HTML from raw quote data
    generateBaseHTML: (data: QuoteData): string => {
      try {
        // Add organization data to quote data before generating template
        const dataWithOrgInfo: QuoteData = {
          ...data,
          organization_info: organization ? {
            name: organization.name,
            phone: organization.phone_number,
            fax: organization.fax_number,
            address: organization.company_address,
            website: organization.website,
            logo_url: organization.logo_data?.logo_public_url || organization.logo_data?.logo_url
          } : undefined
        };

        console.log('🏗️ Generating template with organization info:', {
          hasOrgInfo: !!organization,
          orgInfo: dataWithOrgInfo.organization_info
        });

        return generateQuoteText(dataWithOrgInfo);
      } catch (error) {
        console.error('Error generating base HTML:', error);
        return '';
      }
    },

    // Apply section overrides to base HTML
    applySectionOverrides: (baseHTML: string, overrides: Map<string, string>): string => {
      let result = baseHTML;
      
      overrides.forEach((content, sectionId) => {
        console.log(`🔄 Processing section override: ${sectionId} = "${content.substring(0, 50)}..." (${content.length} chars)`);
        
        // Handle special sections that don't follow the standard pattern
        let className: string;
        if (sectionId === 'pocket-doors') {
          className = 'pocket-doors-section';
        } else if (sectionId === 'panel-doors') {
          className = 'panel-doors-section';
        } else {
          // Standard pattern: sectionId + '-section'
          className = `${sectionId}-section`;
        }
        
        
        // Create more sophisticated regex patterns for section matching
        // Need to handle nested divs properly by counting opening/closing tags
        // let sectionStartPattern, sectionContent = '';
        let patternMatched = false;
        
        // Find the section start
        const startPatterns = [
          new RegExp(`<div[^>]*class="${className}"[^>]*>`, 'g'),
          new RegExp(`<div[^>]*class="[^"]*${className}[^"]*"[^>]*>`, 'g'),
          new RegExp(`<div[^>]*class='[^']*${className}[^']*'[^>]*>`, 'g')
        ];
        
        for (const startPattern of startPatterns) {
          const startMatch = startPattern.exec(result);
          if (startMatch) {
            const startIndex = startMatch.index;
            const startTag = startMatch[0];
            
            // Find the matching closing div by counting nested divs
            let divCount = 1;
            let currentIndex = startIndex + startTag.length;
            let endIndex = -1;
            
            while (divCount > 0 && currentIndex < result.length) {
              const nextOpenDiv = result.indexOf('<div', currentIndex);
              const nextCloseDiv = result.indexOf('</div>', currentIndex);
              
              if (nextCloseDiv === -1) break;
              
              if (nextOpenDiv !== -1 && nextOpenDiv < nextCloseDiv) {
                divCount++;
                currentIndex = nextOpenDiv + 4;
              } else {
                divCount--;
                if (divCount === 0) {
                  endIndex = nextCloseDiv + 6;
                  break;
                } else {
                  currentIndex = nextCloseDiv + 6;
                }
              }
            }
            
            if (endIndex !== -1) {
              const originalSection = result.substring(startIndex, endIndex);
              const contentHasWrapper = content.trim().startsWith(`<div`) && content.includes(className);
              
              console.log(`🔄 Replacing section ${sectionId} (${className}):`, {
                originalLength: originalSection.length,
                contentHasWrapper,
                contentLength: content.length,
                contentPreview: content.substring(0, 100) + '...'
              });
              
              if (contentHasWrapper) {
                // Content already includes the section wrapper, replace entire section
                result = result.substring(0, startIndex) + content + result.substring(endIndex);
              } else {
                // Content is just inner content, keep the wrapper
                // Content is just inner content, keep the wrapper
                result = result.substring(0, startIndex) + startTag + content + '</div>' + result.substring(endIndex);
              }
              
              patternMatched = true;
              break;
            }
          }
          
          // Reset regex for next attempt
          startPattern.lastIndex = 0;
        }
        
        if (!patternMatched) {
          console.warn(`⚠️ Failed to find section ${sectionId} with className ${className} in HTML`);
          const allSections = result.match(/<div[^>]*class="[^"]*"/g);
          if (allSections) {
            console.log('Available sections:', allSections.slice(0, 10)); // Show first 10 to avoid spam
          }
          
        }
      });
      
      return result;
    },

    // Generate unified preview combining raw data + overrides + mixed content
    generateUnifiedPreview: (
      data: QuoteData, 
      overrides: Map<string, string>, 
      mixedSections: Map<string, MixedContentSection>
    ): string => {
      let baseHTML = syncEngine.generateBaseHTML(data);
      
      // First, apply mixed content sections (populate templates with current form data)
      mixedSections.forEach((mixedSection, sectionId) => {
        const populatedContent = MixedContentEngine.populateTemplate(mixedSection.template, data);
        console.log(`🔄 Populating mixed content for ${sectionId}:`, { 
          template: mixedSection.template.substring(0, 100) + '...', 
          populatedContent: populatedContent.substring(0, 100) + '...' 
        });
        
        // Apply the populated content as an override
        const tempOverrides = new Map(overrides);
        tempOverrides.set(sectionId, populatedContent);
        baseHTML = syncEngine.applySectionOverrides(baseHTML, tempOverrides);
      });
      
      // Then apply regular overrides (for non-mixed sections)
      const regularOverrides = new Map();
      overrides.forEach((content, sectionId) => {
        if (!mixedSections.has(sectionId)) {
          regularOverrides.set(sectionId, content);
        }
      });
      
      return syncEngine.applySectionOverrides(baseHTML, regularOverrides);
    }
  }), [organization]);

  // Initialize editor
  useEffect(() => {
    const initializeEditor = async () => {
      try {
        setIsLoading(true);
        
        const baseHTML = syncEngine.generateBaseHTML(quote);
        let previewHTML = baseHTML;
        let mixedContentSections = new Map<string, MixedContentSection>();
        
        // Load existing customizations if they exist
        if (quote.customization?.customSections) {
          const customSections = quote.customization.customSections;
          
          console.log('🔄 Loading saved customizations:', customSections.map(s => ({ id: s.id, isVisible: s.isVisible, contentLength: s.content?.length })));
          
          // Define sections that should NOT be loaded as mixed content (pure form-driven content)
          const formDrivenSections = [
            'billing-job', 'billing-and-job-info', // Job info depends on form fields
            'pricing', // Pricing depends on form fields
            'wall-specifications' // Wall specs table depends on form fields
            // All other sections now use mixed content editing
          ];
          
          // Convert custom sections to mixed content sections
          customSections.forEach(section => {
            if (section.content && section.isVisible) {
              // Skip pure form-driven sections - they should regenerate from form data
              if (formDrivenSections.includes(section.id)) {
                console.log(`🚫 Skipping form-driven section override: ${section.id} - will regenerate from form data`);
                return;
              }
              
              console.log(`🔄 Loading mixed content section: ${section.id}`);
              
              const mixedSection = MixedContentEngine.createMixedSection(
                section.id,
                section.content,
                true // Mark as customized since it was saved
              );
              
              mixedContentSections.set(section.id, mixedSection);
              console.log(`📝 Mixed content section loaded for ${section.id}:`, {
                variables: mixedSection.variables,
                templateLength: mixedSection.template.length
              });
            }
          });
          
          // Apply mixed content to generate the preview
          if (mixedContentSections.size > 0) {
            previewHTML = syncEngine.generateUnifiedPreview(quote, new Map(), mixedContentSections);
          }
        }
        
        setState(prev => ({
          ...prev,
          rawData: quote,
          generatedHTML: baseHTML,
          previewHTML,
          mixedContentSections,
          isDirty: false,
          lastSaved: quote?.updated_at ? new Date(quote.updated_at) : undefined
        }));
        
        setDocumentTitle(quote?.project_name || quote?.proposal_number || 'Quote Document');
        
      } catch (error) {
        console.error('Error initializing editor:', error);
        toast({
          title: "Initialization Error",
          description: "Failed to load quote editor. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [quote, syncEngine, toast]);

  // Real-time preview updates when data changes
  useEffect(() => {
    if (!isLoading) {
      console.log('🔄 Preview update triggered. Current rawData:', state.rawData);
      
      const newPreview = syncEngine.generateUnifiedPreview(
        state.rawData, 
        new Map(), 
        state.mixedContentSections
      );
      
      console.log('✅ Generated new preview HTML length:', newPreview.length);
      
      setState(prev => ({
        ...prev,
        previewHTML: newPreview,
        generatedHTML: syncEngine.generateBaseHTML(state.rawData)
        // Preserve isDirty state during preview updates
      }));
    }
  }, [
    JSON.stringify(state.rawData), 
    state.mixedContentSections,
    syncEngine, 
    isLoading
  ]);

  // Sync with realtime quote updates
  useEffect(() => {
    if (realtimeQuote?.id === quote.id && realtimeQuote !== quote) {
      console.log('📡 Syncing UnifiedQuoteEditor with realtime quote update');
      
      setState(prev => ({
        ...prev,
        rawData: realtimeQuote,
        // Don't mark as dirty since this is an external update
      }));
    }
  }, [realtimeQuote, quote.id]);


  // Update document title when project name or proposal number changes
  useEffect(() => {
    const newTitle = state.rawData?.project_name || state.rawData?.proposal_number || 'Quote Document';
    setDocumentTitle(newTitle);
  }, [state.rawData?.project_name, state.rawData?.proposal_number]);

  // Update current time every minute for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Handle form data changes
  const handleFormDataChange = useCallback((section: string, value: any) => {
    console.log('🔄 handleFormDataChange called:', { section, value });
    
    setState(prev => {
      const currentValue = (prev.rawData as any)[section]; //added, prev.rawData... "as any)[section];" to fix implicit any error
      const hasChanged = JSON.stringify(currentValue) !== JSON.stringify(value);
      
      console.log('📊 Data change analysis:', {
        section,
        currentValue,
        newValue: value,
        hasChanged,
        currentDataStructure: Object.keys(prev.rawData)
      });
      
      if (hasChanged) {
        const updatedRawData = {
          ...prev.rawData,
          [section]: value
        };
        
        console.log('✅ Updating rawData with:', updatedRawData);
        
        return {
          ...prev,
          rawData: updatedRawData,
          isDirty: prev.isDirty || hasChanged
        };
      }
      return prev; //updated this
      });
    }, []);

  // Handle section content overrides (mixed content only)
  const handleSectionOverride = useCallback((sectionId: string, content: string) => {
    setState(prev => {
      console.log(`🔄 Processing ${sectionId} as mixed content`);
      
      // Get original template from generated HTML
      const baseHTML = syncEngine.generateBaseHTML(prev.rawData);
      const sections = SmartQuoteHelper.extractSections(baseHTML);
      const originalSection = sections.find(s => s.id === sectionId);
      const originalTemplate = originalSection?.content || '';
      
      const mixedResult = MixedContentEngine.processSectionForMixedContent(
        sectionId,
        content,
        originalTemplate,
        prev.rawData
      );
      
      if (mixedResult.shouldSaveAsMixed && mixedResult.mixedSection) {
        const newMixedSections = new Map(prev.mixedContentSections);
        newMixedSections.set(sectionId, mixedResult.mixedSection);
        
        // Generate preview with mixed content
        const newPreview = syncEngine.generateUnifiedPreview(prev.rawData, new Map(), newMixedSections);
        
        console.log(`📝 Mixed content section updated for ${sectionId}:`, {
          template: mixedResult.mixedSection.template.substring(0, 100) + '...',
          variables: mixedResult.mixedSection.variables,
          totalMixedSections: newMixedSections.size
        });
        
        return {
          ...prev,
          mixedContentSections: newMixedSections,
          previewHTML: newPreview,
          isDirty: true
        };
      }
      
      return prev;
    });
  }, [syncEngine]);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(50, prev - 10));

  // Unified save action
  const handleSave = useCallback(async () => {
    try {
      // Convert section overrides to the expected format
      let sections: QuoteSection[] = [];
      
      // Define sections that should NOT be saved as overrides (form-driven content)
      // Mixed content sections are the only customizations we save now
      
      // Add mixed content sections to the sections array
      if (state.mixedContentSections.size > 0) {
        const mixedSections = Array.from(state.mixedContentSections.entries()).map(([sectionId, mixedSection]) => ({
          id: sectionId,
          title: mixedSection.id.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          content: mixedSection.template, // Save the template, not populated content
          header: mixedSection.template.includes('${') ? `Mixed Content Template (${mixedSection.variables.length} variables)` : undefined,
          isEditable: true,
          isRequired: false,
          isVisible: true,
          isMixedContent: true, // Flag to identify mixed content sections
          variables: mixedSection.variables,
          dependencies: [] as string[]
        }));
        
        sections = [...sections, ...mixedSections];
        console.log(`💾 Added ${mixedSections.length} mixed content sections to save data`);
      }
      
      // If no sections at all, extract sections from current preview HTML
      if (sections.length === 0) {
        sections = SmartQuoteHelper.extractSections(state.previewHTML);
      }
      
      
      // For true mixed content editing, we store templates in customSections
      // The customHTML field stores the current populated preview for reference
      const unifiedData: SmartQuoteData = {
        ...state.rawData,
        customSections: sections, // ✅ Contains templates with ${variables}
        customHTML: state.previewHTML, // Current populated HTML for display reference
        isCustomized: state.mixedContentSections.size > 0
      };

      onSave?.(unifiedData);
      
      setState(prev => ({
        ...prev,
        isDirty: false,
        lastSaved: new Date()
      }));

      toast({
        title: "Quote Saved",
        description: "All changes have been saved successfully.",
      });

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save quote. Please try again.",
        variant: "destructive",
      });
    }
  }, [state, onSave, toast]);

  // Unified download action
  const handleDownload = useCallback(async () => {
    try {
      // Pass both HTML and Smart PDF state to the download handler
      onDownload?.(state.previewHTML, showSmartPDFPreview);
      
      toast({
        title: "Download Started",
        description: "Your quote PDF (2 pages) is being generated.",
      });
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download quote. Please try again.",
        variant: "destructive",
      });
    }
  }, [state.previewHTML, showSmartPDFPreview, onDownload, toast]);


  // Reset to last saved state from database
  const handleReset = useCallback(() => {
    // Restore the original quote data from database and clear any customizations
    const baseHTML = syncEngine.generateBaseHTML(quote);
    let restoredHTML = baseHTML;
    let restoredMixedSections = new Map<string, MixedContentSection>();
    
    // If the quote has saved customizations, restore them
    if (quote.customization?.customSections) {
      const customSections = quote.customization.customSections;
      
      customSections.forEach(section => {
        if (section.content && section.isVisible) {
          console.log(`🔄 Reset: Restoring mixed content section: ${section.id}`);
          
          const mixedSection = MixedContentEngine.createMixedSection(
            section.id,
            section.content,
            true // Mark as customized since it was saved
          );
          
          restoredMixedSections.set(section.id, mixedSection);
        }
      });
      
      // Apply the restored mixed content to generate the preview
      if (restoredMixedSections.size > 0) {
        restoredHTML = syncEngine.generateUnifiedPreview(quote, new Map(), restoredMixedSections);
      }
    }

    setState(prev => ({
      ...prev,
      rawData: quote, // Restore original quote data from database
      generatedHTML: baseHTML,
      previewHTML: restoredHTML,
      mixedContentSections: restoredMixedSections,
      isDirty: false, // Not dirty since we're reverting to saved state
      lastSaved: quote?.updated_at ? new Date(quote.updated_at) : prev.lastSaved
    }));
    
    setSelectedSection(null);
    
    toast({
      title: "Quote Reset",
      description: "All changes have been reverted to the last saved state from the database.",
    });
  }, [quote, syncEngine, toast]);

  // Close modal
  const handleCloseModal = useCallback(() => {
    setSelectedSection(null);
  }, []);

  // Handle title editing
  const handleTitleClick = useCallback(() => {
    setEditedTitle(documentTitle);
    setIsEditingTitle(true);
  }, [documentTitle]);

  const handleTitleSave = useCallback(() => {
    if (editedTitle.trim() && editedTitle !== documentTitle) {
      setDocumentTitle(editedTitle);
      // Update the quote data with new project name
      const updatedData = {
        ...state.rawData,
        project_name: editedTitle
      };
      setState(prev => ({
        ...prev,
        rawData: updatedData,
        isDirty: true
      }));
    }
    setIsEditingTitle(false);
  }, [editedTitle, documentTitle, state.rawData]);

  const handleTitleCancel = useCallback(() => {
    setIsEditingTitle(false);
    setEditedTitle(documentTitle);
  }, [documentTitle]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f8f9fa]">
        <div className="flex items-center space-x-3 bg-white p-6 rounded-lg shadow-lg">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-700">Loading unified editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="unified-quote-editor" className={`fixed inset-0 bg-white ${className}`}>
      {/* Full-page layout with sidebar and content */}
      <div className="flex h-full">
        {/* Elevated Sidebar - Extends to top */}
        {showDataPanel && (
          <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 shadow-xl z-50 flex flex-col">
            {/* Sidebar Header - Match nav bar height of 64px (h-16) */}
            <div className="h-16 px-6 flex items-center border-b border-gray-200 bg-gradient-to-br from-slate-50 to-blue-50 flex-shrink-0">
              <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                Quote Data
              </h3>
            </div>

            {/* Sidebar Content - Scrollable */}
            <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50/30 to-blue-50/30">
              <div className="p-6">
                <QuoteDataPanel
                  data={state.rawData}
                  onChange={handleFormDataChange}
                  onDatabaseSave={handleSave}
                  onUpdateWallSystem={onUpdateWallSystem ? (wallName: string, wallData: any) => onUpdateWallSystem(quote.id, wallName, wallData) : undefined}
                  onRemoveWallSystem={onRemoveWallSystem ? (wallName: string) => onRemoveWallSystem(quote.id, wallName) : undefined}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navigation Bar - Runs up to sidebar */}
          <div className="h-16 bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-40">
            <div className="h-full px-6 flex items-center justify-between">
              {/* Left: Title and Status */}
              <div className="flex items-center gap-4">
                <FileText className="w-5 h-5 text-blue-500" />
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                    className="text-base font-semibold text-gray-800 bg-white border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minWidth: '200px', maxWidth: '400px' }}
                  />
                ) : (
                  <div
                    className="text-base font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={handleTitleClick}
                    title="Click to edit quote name"
                  >
                    {documentTitle || 'Untitled Quote'}
                  </div>
                )}
                {state.isDirty ? (
                  <span className="text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                    Unsaved Changes
                  </span>
                ) : state.lastSaved ? (
                  <span className="text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                    Saved {(() => {
                      const savedTime = new Date(state.lastSaved);
                      const diffInMinutes = Math.floor((currentTime.getTime() - savedTime.getTime()) / (1000 * 60));

                      if (diffInMinutes < 1) return 'just now';
                      if (diffInMinutes === 1) return '1 min ago';
                      if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;

                      const diffInHours = Math.floor(diffInMinutes / 60);
                      if (diffInHours === 1) return '1 hr ago';
                      if (diffInHours < 24) return `${diffInHours} hrs ago`;

                      return `${savedTime.toLocaleDateString()}`;
                    })()}
                  </span>
                ) : null}
              </div>

              {/* Right: Zoom Controls and Actions */}
              <div className="flex items-center gap-3">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomOut}
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[3rem] text-center text-gray-700">
                    {zoomLevel}%
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleZoomIn}
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                <div className="w-px h-6 bg-gray-300" />

                {/* Action Buttons */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDataPanel(!showDataPanel)}
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <Settings className="w-4 h-4 mr-1.5" />
                  {showDataPanel ? 'Hide' : 'Show'} Panel
                </Button>

                {onBack && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onBack}
                    className="border-gray-300"
                  >
                    Back
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={!state.isDirty}
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  Reset
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!state.isDirty}
                  className="border-gray-300"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save
                </Button>

                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Live Preview Panel - Takes remaining space */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <LivePreviewPanel
              className="flex-1"
              previewHTML={state.previewHTML}
              zoomLevel={zoomLevel}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onSectionClick={(/*sectionId,*/_, sectionData) => {
                setSelectedSection(sectionData);
              }}
              onSectionHover={setHoveredSectionId}
              showSmartPDFPreview={showSmartPDFPreview}
            />
          </div>
        </div>
      </div>

      {/* Quick Edit Modal */}
      {selectedSection && (
        <QuickEditModal
          section={selectedSection}
          isOpen={!!selectedSection}
          onClose={handleCloseModal}
          onSave={handleSectionOverride}
        />
      )}
    </div>
  );
};

export default UnifiedQuoteEditor;