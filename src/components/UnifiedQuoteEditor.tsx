import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { generateQuoteText } from './QuoteTextGenerator';
import { SmartQuoteHelper, QuoteSection, SmartQuoteData } from '@/templates/SmartQuoteTemplate';
import { QuoteData } from '@/templates/BaseQuoteTemplate';
import QuoteDataPanel from './UnifiedQuoteEditor/QuoteDataPanel';
import LivePreviewPanel from './UnifiedQuoteEditor/LivePreviewPanel';
import QuickEditModal from './UnifiedQuoteEditor/QuickEditModal';

// Unified state interface
interface UnifiedQuoteState {
  rawData: QuoteData;
  generatedHTML: string;
  sectionOverrides: Map<string, string>;
  previewHTML: string;
  isDirty: boolean;
  lastSaved?: Date;
  conflicts: string[];
}

interface UnifiedQuoteEditorProps {
  quote: QuoteData;
  onSave?: (data: SmartQuoteData) => void;
  onDownload?: (html: string) => void;
  onBack?: () => void;
  className?: string;
}

export const UnifiedQuoteEditor: React.FC<UnifiedQuoteEditorProps> = ({
  quote,
  onSave,
  onDownload,
  onBack,
  className = ''
}) => {
  const { toast } = useToast();
  
  // Core unified state
  const [state, setState] = useState<UnifiedQuoteState>({
    rawData: quote,
    generatedHTML: '',
    sectionOverrides: new Map(),
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
        // Handle special sections that don't follow the standard pattern
        let className: string;
        if (sectionId === 'proposal-intro') {
          className = 'proposal-intro';
        } else if (sectionId === 'pocket-doors') {
          className = 'pocket-doors-section';
        } else if (sectionId === 'panel-doors') {
          className = 'panel-doors-section';
        } else {
          // Standard pattern: sectionId + '-section'
          className = `${sectionId}-section`;
        }
        
        const sectionPattern = new RegExp(
          `(<div class="${className}"[^>]*>)[\\s\\S]*?(<\\/div>)`,
          'g'
        );
        
        if (result.match(sectionPattern)) {
          result = result.replace(sectionPattern, `$1${content}$2`);
        }
      });
      
      return result;
    },

    // Generate unified preview combining raw data + overrides
    generateUnifiedPreview: (data: QuoteData, overrides: Map<string, string>): string => {
      const baseHTML = syncEngine.generateBaseHTML(data);
      return syncEngine.applySectionOverrides(baseHTML, overrides);
    }
  }), []);

  // Initialize editor
  useEffect(() => {
    const initializeEditor = async () => {
      try {
        setIsLoading(true);
        
        const baseHTML = syncEngine.generateBaseHTML(quote);
        let previewHTML = baseHTML;
        let sectionOverrides = new Map<string, string>();
        
        // Load existing customizations if they exist
        if (quote.customization?.customSections) {
          const customSections = quote.customization.customSections;
          
          // Convert custom sections to section overrides
          customSections.forEach(section => {
            if (section.content && section.isVisible) {
              // Extract the inner content from the section (remove the wrapper div)
              const innerContent = section.content
                .replace(/<div class="[^"]*-section"[^>]*>/, '')
                .replace(/<\/div>$/, '')
                .trim();
              
              sectionOverrides.set(section.id, innerContent);
            }
          });
          
          // Apply the overrides to generate the preview
          if (sectionOverrides.size > 0) {
            previewHTML = syncEngine.applySectionOverrides(baseHTML, sectionOverrides);
          }
        }
        
        setState(prev => ({
          ...prev,
          rawData: quote,
          generatedHTML: baseHTML,
          previewHTML,
          sectionOverrides,
          isDirty: false
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
      const newPreview = syncEngine.generateUnifiedPreview(state.rawData, state.sectionOverrides);
      
      setState(prev => ({
        ...prev,
        previewHTML: newPreview,
        generatedHTML: syncEngine.generateBaseHTML(state.rawData)
      }));
    }
  }, [state.rawData, state.sectionOverrides, syncEngine, isLoading]);

  // Update document title when project name or proposal number changes
  useEffect(() => {
    const newTitle = state.rawData?.project_name || state.rawData?.proposal_number || 'Quote Document';
    setDocumentTitle(newTitle);
  }, [state.rawData?.project_name, state.rawData?.proposal_number]);

  // Handle form data changes
  const handleFormDataChange = useCallback((section: string, value: any) => {
    console.log(`🔄 UnifiedQuoteEditor handleFormDataChange - section: "${section}"`);
    console.log(`🔄 Value received:`, value);
    
    setState(prev => {
      const newState = {
        ...prev,
        rawData: {
          ...prev.rawData,
          [section]: value
        },
        isDirty: true
      };
      
      console.log(`🔄 Updated rawData for section "${section}":`, newState.rawData[section]);
      return newState;
    });
  }, []);

  // Handle section content overrides
  const handleSectionOverride = useCallback((sectionId: string, content: string) => {
    setState(prev => {
      const newOverrides = new Map(prev.sectionOverrides);
      newOverrides.set(sectionId, content);
      
      return {
        ...prev,
        sectionOverrides: newOverrides,
        isDirty: true
      };
    });
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(200, prev + 10));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(50, prev - 10));

  // Unified save action
  const handleSave = useCallback(async () => {
    try {
      // Convert section overrides to the expected format
      const sections = SmartQuoteHelper.extractSections(state.previewHTML);
      
      const unifiedData: SmartQuoteData = {
        ...state.rawData,
        customSections: sections,
        customHTML: state.previewHTML,
        isCustomized: state.sectionOverrides.size > 0
      };

      await onSave?.(unifiedData);
      
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
      await onDownload?.(state.previewHTML);
      
      toast({
        title: "Download Started",
        description: "Your quote PDF is being generated.",
      });
      
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download quote. Please try again.",
        variant: "destructive",
      });
    }
  }, [state.previewHTML, onDownload, toast]);

  // Reset to original
  const handleReset = useCallback(() => {
    setState(prev => ({
      ...prev,
      sectionOverrides: new Map(),
      isDirty: false
    }));
    setSelectedSection(null);
  }, []);

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
              {state.isDirty && (
                <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded whitespace-nowrap">
                  Unsaved Changes
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
        {/* Data Panel */}
        {showDataPanel && (
          <div className="w-96 bg-white border-r border-gray-200 h-screen sticky top-[73px] overflow-y-auto">
            <div className="p-4 min-h-full">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Quote Data
              </h3>
              <div className="pb-20">
                <QuoteDataPanel 
                  data={state.rawData}
                  onChange={handleFormDataChange}
                />
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
          onSectionClick={(sectionId, sectionData) => {
            setSelectedSection(sectionData);
          }}
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