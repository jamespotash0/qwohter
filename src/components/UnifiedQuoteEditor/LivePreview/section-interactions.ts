import { QuoteSection } from '@/templates/SmartQuoteTemplate';

export class SectionInteractions {
  /**
   * Handle section click events
   */
  static createSectionClickHandler(
    onSectionClick?: (sectionId: string, sectionData: QuoteSection) => void,
    sections: QuoteSection[] = []
  ) {
    return (event: React.MouseEvent) => {
      if (!onSectionClick) return;

      const target = event.target as HTMLElement;
      
      // Find the closest section element or special clickable sections
      let sectionElement = target.closest('[class*="-section"]');
      let sectionId: string;

      if (!sectionElement) {
        // Check for special clickable sections
        sectionElement = target.closest('.proposal-intro') || target.closest('.pocket-doors-section') || target.closest('.panel-doors-section');
        if (!sectionElement) return;
        
        // Extract section ID from class name
        if (sectionElement.classList.contains('proposal-intro')) {
          sectionId = 'proposal-intro';
        } else if (sectionElement.classList.contains('pocket-doors-section')) {
          sectionId = 'pocket-doors-section';
        } else if (sectionElement.classList.contains('panel-doors-section')) {
          sectionId = 'panel-doors-section';
        } else {
          return;
        }
      } else {
        const className = sectionElement.className;
        
        // Find the class that ends with -section
        const classes = className.split(' ');
        const sectionClass = classes.find(cls => cls.endsWith('-section'));
        
        if (!sectionClass) return;
        
        // For special multi-word sections, use the full class name
        if (sectionClass === 'pocket-doors-section' || sectionClass === 'panel-doors-section') {
          sectionId = sectionClass;
        } else {
          // For normal sections, extract the base name (remove -section suffix)
          sectionId = sectionClass.replace('-section', '');
        }
      }
      
      // Skip read-only sections and billing/job info sections
      const readOnlySections = ['wall-specifications-list', 'pricing', 'billing-job-container', 'job-info-section', 'billing-table'];
      if (readOnlySections.includes(sectionId)) {
        return;
      }

      // Find section data or create mock data for special sections
      let sectionData = sections.find(s => s.id === sectionId);
      
      if (!sectionData) {
        // Create mock section data for special clickable sections
        if (sectionId === 'proposal-intro') {
          const content = sectionElement?.outerHTML || '';
          sectionData = {
            id: 'proposal-intro',
            title: 'Project Introduction & Specifications',
            content: content,
            isVisible: true,
            isRequired: true
          };
        } else if (sectionId === 'pocket-doors-section') {
          const content = sectionElement?.outerHTML || '';
          sectionData = {
            id: 'pocket-doors',
            title: 'Pocket Doors',
            content: content,
            isVisible: true,
            isRequired: false
          };
        } else if (sectionId === 'panel-doors-section') {
          const content = sectionElement?.outerHTML || '';
          sectionData = {
            id: 'panel-doors',
            title: 'Panel Doors',
            content: content,
            isVisible: true,
            isRequired: false
          };
        } else {
          return;
        }
      }

      event.preventDefault();
      event.stopPropagation();
      
      onSectionClick(sectionId, sectionData);
    };
  }

  /**
   * Handle section hover for visual feedback
   */
  static createSectionHoverHandler(setHoveredSectionId: (id: string | null) => void) {
    return (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      let sectionElement = target.closest('[class*="-section"]');
      let sectionId: string | null = null;
      
      if (sectionElement) {
        const className = sectionElement.className;
        const sectionMatch = className.match(/(\w+)-section/);
        if (sectionMatch) {
          sectionId = sectionMatch[1];
        }
      } else {
        // Check for special clickable sections
        sectionElement = target.closest('.proposal-intro') || target.closest('.pocket-doors-section') || target.closest('.panel-doors-section');
        if (sectionElement) {
          if (sectionElement.classList.contains('proposal-intro')) {
            sectionId = 'proposal-intro';
          } else if (sectionElement.classList.contains('pocket-doors-section')) {
            sectionId = 'pocket-doors-section';
          } else if (sectionElement.classList.contains('panel-doors-section')) {
            sectionId = 'panel-doors-section';
          }
        }
      }
      
      if (sectionId) {
        const readOnlySections = ['wall-specifications-list', 'pricing', 'billing-job-container', 'job-info-section', 'billing-table'];
        
        if (!readOnlySections.includes(sectionId)) {
          setHoveredSectionId(sectionId);
          return;
        }
      }
      
      setHoveredSectionId(null);
    };
  }

  /**
   * Handle section mouse leave
   */
  static createSectionLeaveHandler(setHoveredSectionId: (id: string | null) => void) {
    return () => {
      setHoveredSectionId(null);
    };
  }
}