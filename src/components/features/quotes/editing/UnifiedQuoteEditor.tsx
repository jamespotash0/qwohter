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
import { Quote } from '@/hooks/useQuotes';
import { useCurrentQuote } from '@/stores/quotes/quotesStore';
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
  const [zoomLevel, setZoomLevel] = useState(100);
  const [selectedSection, setSelectedSection] = useState<QuoteSection | null>(null);
  const [showDataPanel, setShowDataPanel] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  // Smart PDF is now the only mode - no toggle needed
  const showSmartPDFPreview = true;

  // Data sync engine
  const syncEngine = useMemo(() => ({
    // Generate base HTML from raw quote data
    generateBaseHTML: (data: QuoteData): string => {
      try {
        return generateQuoteText(data);
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
          // Debug: Show what sections actually exist
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
  }), []);

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
    <div data-testid="unified-quote-editor" className={`min-h-screen bg-[#f8f9fa] ${className}`}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title and Status */}
            <div className="flex items-center gap-4">
              <FileText className="w-6 h-6 text-blue-500" />
              <div className="text-lg font-medium px-2 py-1">
                {documentTitle || 'Untitled document'}
              </div>
              {state.isDirty ? (
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded whitespace-nowrap">
                  Unsaved Changes
                </span>
              ) : state.lastSaved ? (
                <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded whitespace-nowrap">
                  Saved {(() => {
                    const savedTime = new Date(state.lastSaved);
                    const diffInMinutes = Math.floor((currentTime.getTime() - savedTime.getTime()) / (1000 * 60));
                    
                    if (diffInMinutes < 1) return 'just now';
                    if (diffInMinutes === 1) return '1 minute ago';
                    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
                    
                    const diffInHours = Math.floor(diffInMinutes / 60);
                    if (diffInHours === 1) return '1 hour ago';
                    if (diffInHours < 24) return `${diffInHours} hours ago`;
                    
                    // For older saves, show the actual time
                    return `on ${savedTime.toLocaleDateString()} at ${savedTime.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}`;
                  })()}
                </span>
              ) : null}
              {hoveredSectionId && (
                <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded whitespace-nowrap">
                  Hover: {hoveredSectionId.replace(/-/g, ' ')}
                </span>
              )}
            </div>

            {/* Center: Zoom Controls */}
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

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDataPanel(!showDataPanel)}
                title="Toggle data panel"
              >
                <Settings className="w-4 h-4 mr-2" />
                {showDataPanel ? 'Hide' : 'Show'} Panel
              </Button>

              {onBack && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onBack}
                >
                  Back
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={!state.isDirty}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!state.isDirty}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex">
        {/* Data Panel - Floating Design */}
        {showDataPanel && (
          <div className="w-[400px] relative">
            <div className="fixed top-[90px] left-4 bottom-4 w-[360px] bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl shadow-lg shadow-slate-200/50 overflow-hidden z-40">
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 bg-white/60 backdrop-blur-sm border-b border-slate-200/50">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    Quote Data
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 pb-20">
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
            </div>
          </div>
        )}

        {/* Live Preview Panel */}
        <LivePreviewPanel
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