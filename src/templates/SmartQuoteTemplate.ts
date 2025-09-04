import { QuoteData } from './BaseQuoteTemplate';

export interface QuoteSection {
  id: string;
  title: string;
  content: string;
  isVisible: boolean;
  isRequired: boolean;
  dependencies?: string[]; // Field names this section depends on
}

export interface SmartQuoteData extends QuoteData {
  customSections?: QuoteSection[];
  customHTML?: string;
  isCustomized?: boolean;
}

export class SmartQuoteHelper {
  /**
   * Check if a field or fields have values
   */
  static hasValue(...fields: (string | undefined)[]): boolean {
    return fields.some(field => field && field.trim() !== '');
  }

  /**
   * Check if all required fields have values
   */
  static hasAllValues(...fields: (string | undefined)[]): boolean {
    return fields.every(field => field && field.trim() !== '');
  }

  /**
   * Build conditional text that only renders if dependencies are met
   */
  static conditionalText(condition: boolean, text: string, fallback: string = ''): string {
    return condition ? text : fallback;
  }

  /**
   * Build smart sentences that skip empty parts
   */
  static buildSentence(parts: Array<{ text: string; condition?: boolean }>): string {
    const validParts = parts.filter(part => {
      const hasCondition = part.condition !== undefined;
      return hasCondition ? part.condition && part.text.trim() : part.text.trim();
    });
    
    if (validParts.length === 0) return '';
    
    return validParts.map(part => part.text.trim()).join(' ') + '.';
  }

  /**
   * Generate section with conditional visibility
   */
  static generateConditionalSection(
    id: string,
    title: string,
    content: string,
    isVisible: boolean,
    isRequired: boolean = false,
    dependencies: string[] = []
  ): QuoteSection {
    return {
      id,
      title,
      content: isVisible ? content : '',
      isVisible,
      isRequired,
      dependencies
    };
  }

  /**
   * Extract sections from generated HTML for editing
   */
  static extractSections(html: string): QuoteSection[] {
    const sections: QuoteSection[] = [];
    
    // Define which sections should NOT be editable (read-only)
    const readOnlySections = ['wall-specifications-list', 'pricing-section'];
    
    // Pattern 1: Sections with *-section class
    const sectionPattern = /<div class="([^"]*-section)"[^>]*>([\s\S]*?)<\/div>/g;
    let match;
    
    while ((match = sectionPattern.exec(html)) !== null) {
      const className = match[1];
      if (!className) continue;
      const id = className.replace('-section', '');
      
      // Skip read-only sections like wall-specifications-list (Wall A table) 
      if (readOnlySections.includes(className)) {
        console.log(`Skipping read-only section: ${className}`);
        continue;
      }
      
      // console.log(`Extracting section: ${className} -> id: ${id}`);
      sections.push({
        id,
        title: this.formatSectionTitle(id),
        content: match[0], // Include the full div
        isVisible: true,
        isRequired: this.isRequiredSection(id),
        dependencies: this.getSectionDependencies(id)
      });
    }
    
    // Pattern 2: H2 section headers with following content (but exclude pricing details)
    const headerPattern = /<h2[^>]*class="section-header"[^>]*>(.*?)<\/h2>([\s\S]*?)(?=<h2[^>]*class="section-header"|$)/g;
    let headerMatch;
    
    while ((headerMatch = headerPattern.exec(html)) !== null) {
      const title = headerMatch[1]?.replace(/<[^>]*>/g, '').trim() || ''; // Remove HTML tags
      const content = headerMatch[2]?.trim() || '';
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Skip sections that are already handled or should be read-only
      if (sections.find(s => s.id === id) || readOnlySections.includes(id)) {
        continue;
      }
      
      sections.push({
        id,
        title,
        content: `<h2 class="section-header">${headerMatch[1]}</h2>${content}`,
        isVisible: true,
        isRequired: this.isRequiredSection(id),
        dependencies: this.getSectionDependencies(id)
      });
    }
    
    // Pattern 3: Major structural sections (but exclude problematic ones)
    const structuralSections = [
      { pattern: /<div class="billing-and-job-info"[^>]*>([\s\S]*?)<\/div>/g, name: 'billing-job', title: 'Billing & Job Info' },
      { pattern: /<div class="wall-specifications"[^>]*>([\s\S]*?)<\/div>/g, name: 'specifications', title: 'Wall Specifications' },
      { pattern: /<div class="signature-acceptance-section"[^>]*>([\s\S]*?)<\/div>/g, name: 'signature-acceptance', title: 'Signature & Acceptance' }
    ];
    
    structuralSections.forEach(({ pattern, name, title }) => {
      let structMatch;
      pattern.lastIndex = 0; // Reset regex
      while ((structMatch = pattern.exec(html)) !== null) {
        // Skip if already exists or is read-only
        if (sections.find(s => s.id === name) || readOnlySections.includes(name)) {
          continue;
        }
        
        sections.push({
          id: name,
          title,
          content: structMatch[0],
          isVisible: true,
          isRequired: this.isRequiredSection(name),
          dependencies: this.getSectionDependencies(name)
        });
      }
    });
    
    return sections.sort((a, b) => {
      // Define the proper order based on PDF template generation sequence
      const sectionOrder = [
        'billing-job', 'billing-and-job-info', 'billing',
        'proposal-intro',
        'wall-specifications', 'specifications',
        'panels',
        'panel-doors',
        'pocket-doors',
        'track',
        'support',
        'general',
        'pricing',
        'statement',
        'terms',
        'signature-acceptance'
      ];
      
      const getOrderIndex = (id: string) => {
        const index = sectionOrder.indexOf(id);
        return index === -1 ? sectionOrder.length : index;
      };
      
      const aOrder = getOrderIndex(a.id);
      const bOrder = getOrderIndex(b.id);
      
      // If same order, fall back to HTML appearance order
      if (aOrder === bOrder) {
        const aIndex = html.indexOf(a.content);
        const bIndex = html.indexOf(b.content);
        return aIndex - bIndex;
      }
      
      return aOrder - bOrder;
    });
  }

  /**
   * Reconstruct HTML from sections
   */
  static reconstructHTML(sections: QuoteSection[], originalHTML: string): string {
    let reconstructed = originalHTML;
    
    sections.forEach(section => {
      if (!section.isVisible) {
        // Remove the section from HTML - try multiple patterns
        const patterns = [
          new RegExp(`<div class="${section.id}-section"[^>]*>[\\s\\S]*?<\\/div>`, 'g'),
          new RegExp(`<div class="${section.id}"[^>]*>[\\s\\S]*?<\\/div>`, 'g'),
          new RegExp(`<h2[^>]*class="section-header"[^>]*>${section.title}[\\s\\S]*?(?=<h2[^>]*class="section-header"|<div class="[^"]*section"|$)`, 'gi')
        ];
        
        patterns.forEach(pattern => {
          reconstructed = reconstructed.replace(pattern, '');
        });
      } else if (section.content) {
        // Replace with updated content - try multiple patterns
        const patterns = [
          {
            match: new RegExp(`(<div class="${section.id}-section"[^>]*>)[\\s\\S]*?(<\\/div>)`, 'g'),
            replace: (_match: string, start: string, end: string) => {
              const innerContent = section.content.replace(/<div class="[^"]*-section"[^>]*>/, '').replace(/<\/div>$/, '');
              return `${start}${innerContent}${end}`;
            }
          },
          {
            match: new RegExp(`(<div class="${section.id}"[^>]*>)[\\s\\S]*?(<\\/div>)`, 'g'),
            replace: (_match: string, start: string, end: string) => {
              const innerContent = section.content.replace(/<div class="[^"]*"[^>]*>/, '').replace(/<\/div>$/, '');
              return `${start}${innerContent}${end}`;
            }
          }
        ];
        
        patterns.forEach(pattern => {
          reconstructed = reconstructed.replace(pattern.match, pattern.replace);
        });
      }
    });
    
    return reconstructed;
  }

  private static formatSectionTitle(id: string): string {
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private static isRequiredSection(id: string): boolean {
    const requiredSections = ['header', 'billing', 'billing-job', 'wall-specifications', 'specifications', 'pricing'];
    return requiredSections.includes(id);
  }

  private static getSectionDependencies(id: string): string[] {
    // Define dependencies for sections that depend on form field values
    const dependencies: { [key: string]: string[] } = {
      'panel-doors': ['passDoorPanels', 'glasswallPassDoorType'],
      'panel-doors-section': ['passDoorPanels', 'glasswallPassDoorType'],
      'pass-doors': ['passDoorPanels', 'glasswallPassDoorType'],
      'pass-doors-section': ['passDoorPanels', 'glasswallPassDoorType'],
      'pocket-doors': ['pocketDoors.foldType', 'pocketDoors.foldStyle', 'pocket_doors.foldType'], // Support both per-wall and global
      'pocket-doors-section': ['pocketDoors.foldType', 'pocketDoors.foldStyle', 'pocket_doors.foldType'],
      'structure-support': ['structureSupport'],
      'structure-support-section': ['structureSupport'],
      'track-section': ['trackConfiguration.trackType', 'trackConfiguration.trackSystem', 'trackType', 'trackSystem'] // Support both new and legacy
    };
    
    return dependencies[id] || [];
  }
}

export default SmartQuoteHelper;