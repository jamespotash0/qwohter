import { QuoteSection } from '@/templates/SmartQuoteTemplate';

export class SectionInteractions {
  /**
   * Format section title for display
   */
  private static formatSectionTitle(sectionId: string): string {
    return sectionId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

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
      
      // Check if the click is on a section header - if so, prevent opening the modal
      if (target.closest('h2.section-header, h2.editable-header, .section-header-item')) {
        return;
      }
      
      // Find the closest section element or special clickable sections
      let sectionElement = target.closest('[class*="-section"]');
      let sectionId: string;

      if (!sectionElement) {
        // Check for special clickable sections
        sectionElement = target.closest('.proposal-intro') || target.closest('.pocket-doors-section') || target.closest('.pass-doors-section') || target.closest('.panel-doors-section');
        if (!sectionElement) return;
        
        // Extract section ID from class name
        if (sectionElement.classList.contains('proposal-intro')) {
          sectionId = 'proposal-intro';
        } else if (sectionElement.classList.contains('pocket-doors-section')) {
          sectionId = 'pocket-doors';
        } else if (sectionElement.classList.contains('pass-doors-section')) {
          sectionId = 'pass-doors';
        } else if (sectionElement.classList.contains('panel-doors-section')) {
          sectionId = 'panel-doors';
        } else {
          return;
        }
      } else {
        const className = sectionElement.className;
        
        // Find the class that ends with -section
        const classes = className.split(' ');
        const sectionClass = classes.find(cls => cls.endsWith('-section'));
        
        if (!sectionClass) return;
        
        // Handle special multi-word sections that should keep their full names
        if (sectionClass === 'pocket-doors-section') {
          sectionId = 'pocket-doors';
        } else if (sectionClass === 'pass-doors-section') {
          sectionId = 'pass-doors';
        } else if (sectionClass === 'panel-doors-section') {
          sectionId = 'panel-doors';
        } else if (sectionClass === 'signature-acceptance-section') {
          sectionId = 'signature-acceptance';
        } else if (sectionClass === 'job-info-section') {
          sectionId = 'job-info';
        } else {
          // For normal sections, extract the base name (remove -section suffix)
          sectionId = sectionClass.replace('-section', '');
        }
      }
      
      // Skip read-only sections and billing/job info sections
      const readOnlySections = ['wall-specifications-list', 'pricing', 'billing-job-container', 'job-info-section', 'job-info', 'billing-table', 'header', 'header-section'];
      if (readOnlySections.includes(sectionId)) {
        return;
      }

      // Find section data or create mock data for special sections
      let sectionData = sections.find(s => s.id === sectionId);
      
      // console.log(`Section click: sectionId="${sectionId}", found in sections:`, !!sectionData);
      // console.log('Available sections:', sections.map(s => s.id));
      
      if (!sectionData) {
        // For sections not found in extracted sections (possibly due to splitting),
        // use the visible content but warn that it might be partial
        const content = sectionElement?.outerHTML || '';
        console.warn(`⚠️ Section "${sectionId}" not found in extracted sections, using visible content (may be partial)`);
        
        sectionData = {
          id: sectionId,
          title: this.formatSectionTitle(sectionId),
          content: content,
          isVisible: true,
          isRequired: false
        };
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
      
      // Check if hovering over a section header - if so, don't show hover effects
      if (target.closest('h2.section-header, h2.editable-header, .section-header-item')) {
        setHoveredSectionId(null);
        return;
      }
      
      let sectionElement = target.closest('[class*="-section"]');
      let sectionId: string | null = null;
      
      if (sectionElement) {
        const className = sectionElement.className;
        const classes = className.split(' ');
        const sectionClass = classes.find(cls => cls.endsWith('-section'));
        
        if (sectionClass) {
          // Handle special multi-word sections that should keep their full names
          if (sectionClass === 'pocket-doors-section') {
            sectionId = 'pocket-doors';
          } else if (sectionClass === 'pass-doors-section') {
            sectionId = 'pass-doors';
          } else if (sectionClass === 'panel-doors-section') {
            sectionId = 'panel-doors';
          } else if (sectionClass === 'signature-acceptance-section') {
            sectionId = 'signature-acceptance';
          } else if (sectionClass === 'job-info-section') {
            sectionId = 'job-info';
          } else {
            // For regular sections, remove -section suffix
            sectionId = sectionClass.replace('-section', '');
          }
        }
      } else {
        // Check for special clickable sections without -section suffix
        sectionElement = target.closest('.proposal-intro') || target.closest('.pocket-doors-section') || target.closest('.pass-doors-section') || target.closest('.panel-doors-section');
        if (sectionElement) {
          if (sectionElement.classList.contains('proposal-intro')) {
            sectionId = 'proposal-intro';
          } else if (sectionElement.classList.contains('pocket-doors-section')) {
            sectionId = 'pocket-doors';
          } else if (sectionElement.classList.contains('pass-doors-section')) {
            sectionId = 'pass-doors';
          } else if (sectionElement.classList.contains('panel-doors-section')) {
            sectionId = 'panel-doors';
          }
        }
      }
      
      if (sectionId) {
        const readOnlySections = ['wall-specifications-list', 'pricing', 'billing-job-container', 'job-info-section', 'job-info', 'billing-table', 'header', 'header-section'];
        
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