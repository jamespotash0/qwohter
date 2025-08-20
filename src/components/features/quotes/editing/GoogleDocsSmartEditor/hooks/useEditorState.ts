import { useState, useCallback } from 'react';
import { QuoteSection, SmartQuoteHelper } from '@/templates/SmartQuoteTemplate';

interface EditorState {
  sections: QuoteSection[];
  originalHTML: string;
  previewHTML: string;
  selectedSectionId: string | null;
  editingContent: string;
  richEditingContent: string;
  isCustomized: boolean;
  isLoading: boolean;
  documentTitle: string;
  isRichTextMode: boolean;
}

const initialState: EditorState = {
  sections: [],
  originalHTML: '',
  previewHTML: '',
  selectedSectionId: null,
  editingContent: '',
  richEditingContent: '',
  isCustomized: false,
  isLoading: true,
  documentTitle: 'Quote Document',
  isRichTextMode: true
};

export const useEditorState = () => {
  const [state, setState] = useState<EditorState>(initialState);

  // Getters
  const selectedSection = state.sections.find(s => s.id === state.selectedSectionId);

  // State updaters
  const setSections = useCallback((sections: QuoteSection[]) => {
    setState(prev => ({ ...prev, sections }));
  }, []);

  const setOriginalHTML = useCallback((html: string) => {
    setState(prev => ({ ...prev, originalHTML: html }));
  }, []);

  const setPreviewHTML = useCallback((html: string) => {
    setState(prev => ({ ...prev, previewHTML: html }));
  }, []);

  const setSelectedSectionId = useCallback((id: string | null) => {
    setState(prev => {
      if (prev.selectedSectionId === id) return prev;
      
      // When selecting a section, load its content for editing
      const section = prev.sections.find(s => s.id === id);
      return {
        ...prev,
        selectedSectionId: id,
        editingContent: section?.content || '',
        richEditingContent: section?.content || ''
      };
    });
  }, []);

  const setEditingContent = useCallback((content: string) => {
    setState(prev => ({ ...prev, editingContent: content }));
  }, []);

  const setRichEditingContent = useCallback((content: string) => {
    setState(prev => ({ ...prev, richEditingContent: content }));
  }, []);

  const setIsCustomized = useCallback((isCustomized: boolean) => {
    setState(prev => ({ ...prev, isCustomized }));
  }, []);

  const setIsLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setDocumentTitle = useCallback((title: string) => {
    setState(prev => ({ ...prev, documentTitle: title }));
  }, []);

  const setIsRichTextMode = useCallback((isRichTextMode: boolean) => {
    setState(prev => ({ ...prev, isRichTextMode }));
  }, []);

  // Complex operations
  const toggleSectionVisibility = useCallback((sectionId: string, isVisible: boolean) => {
    setState(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, isVisible } : section
      ),
      isCustomized: true
    }));
  }, []);

  const updateSectionContent = useCallback((sectionId: string, content: string) => {
    setState(prev => {
      const updatedSections = prev.sections.map(section =>
        section.id === sectionId ? { ...section, content } : section
      );
      
      // Update preview HTML
      const newPreviewHTML = SmartQuoteHelper.reconstructHTML(updatedSections, prev.originalHTML);
      
      return {
        ...prev,
        sections: updatedSections,
        previewHTML: newPreviewHTML,
        isCustomized: true,
        editingContent: content,
        richEditingContent: content
      };
    });
  }, []);

  const updatePreview = useCallback(() => {
    setState(prev => {
      const newPreviewHTML = SmartQuoteHelper.reconstructHTML(prev.sections, prev.originalHTML);
      return {
        ...prev,
        previewHTML: newPreviewHTML
      };
    });
  }, []);

  const resetToOriginal = useCallback(() => {
    setState(prev => ({
      ...prev,
      previewHTML: prev.originalHTML,
      sections: SmartQuoteHelper.extractSections(prev.originalHTML),
      isCustomized: false,
      selectedSectionId: null,
      editingContent: '',
      richEditingContent: ''
    }));
  }, []);

  const loadExistingCustomization = useCallback((customHTML: string, customSections: QuoteSection[]) => {
    setState(prev => ({
      ...prev,
      originalHTML: customHTML,
      sections: customSections,
      previewHTML: customHTML,
      isCustomized: true,
      isLoading: false
    }));
  }, []);

  const loadFreshContent = useCallback((html: string, title: string) => {
    const extractedSections = SmartQuoteHelper.extractSections(html);
    setState(prev => ({
      ...prev,
      originalHTML: html,
      sections: extractedSections,
      previewHTML: html,
      documentTitle: title,
      isCustomized: false,
      isLoading: false
    }));
  }, []);

  // Add method to update section visibility based on quote data dependencies
  const updateSectionVisibilityFromData = useCallback((quoteData: any) => {
    setState(prev => {
      const updatedSections = prev.sections.map(section => {
        const walls = quoteData?.wall_details?.walls || {};
        
        // Handle panel-doors section visibility based on pass door configuration
        if (section.id === 'panel-doors' || section.id === 'panel-doors-section') {
          const shouldBeVisible = Object.values(walls).some((wall: any) => 
            wall?.passDoorPanels && 
            wall.passDoorPanels.toLowerCase().trim() !== 'none' &&
            wall.passDoorPanels.trim() !== ''
          );
          
          if (section.isVisible !== shouldBeVisible) {
            return { ...section, isVisible: shouldBeVisible };
          }
        }
        
        // Handle pocket-doors section visibility based on per-wall or global configuration
        if (section.id === 'pocket-doors' || section.id === 'pocket-doors-section') {
          // Check per-wall configurations first
          const hasPerWallPockets = Object.values(walls).some((wall: any) => 
            wall?.pocketDoors?.foldType && 
            wall.pocketDoors.foldType.toLowerCase().trim() !== 'none' &&
            wall.pocketDoors.foldType.trim() !== ''
          );
          
          // Fallback to global configuration for backward compatibility
          const hasGlobalPockets = !hasPerWallPockets && quoteData?.pocket_doors?.foldType;
          
          const shouldBeVisible = hasPerWallPockets || hasGlobalPockets;
          
          if (section.isVisible !== shouldBeVisible) {
            return { ...section, isVisible: shouldBeVisible };
          }
        }
        
        // Handle structure-support section visibility
        if (section.id === 'structure-support' || section.id === 'structure-support-section') {
          const shouldBeVisible = Object.values(walls).some((wall: any) => 
            wall?.structureSupport && 
            wall.structureSupport.toLowerCase().trim() !== 'none' &&
            wall.structureSupport.trim() !== ''
          );
          
          if (section.isVisible !== shouldBeVisible) {
            return { ...section, isVisible: shouldBeVisible };
          }
        }
        
        return section;
      });
      
      // Check if any section visibility changed
      const hasChanges = updatedSections.some((section, index) => 
        section.isVisible !== prev.sections[index].isVisible
      );
      
      if (hasChanges) {
        return {
          ...prev,
          sections: updatedSections,
          isCustomized: true
        };
      }
      
      return prev;
    });
  }, []);

  return {
    // State
    ...state,
    selectedSection,
    
    // Simple setters
    setSections,
    setOriginalHTML,
    setPreviewHTML,
    setSelectedSectionId,
    setEditingContent,
    setRichEditingContent,
    setIsCustomized,
    setIsLoading,
    setDocumentTitle,
    setIsRichTextMode,
    
    // Complex operations
    toggleSectionVisibility,
    updateSectionContent,
    updatePreview,
    resetToOriginal,
    loadExistingCustomization,
    loadFreshContent,
    updateSectionVisibilityFromData
  };
};