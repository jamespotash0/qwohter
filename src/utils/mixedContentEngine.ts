/**
 * Mixed Content Engine
 * Handles editing of sections that contain both static text and dynamic form variables
 */

export interface MixedContentSection {
  id: string;
  template: string; // HTML with ${variable} placeholders
  variables: string[]; // List of variables found in template
  isCustomized: boolean; // Whether user has customized this section
}

export class MixedContentEngine {
  /**
   * Extract template variables from HTML content
   */
  static extractVariables(html: string): string[] {
    const variableRegex = /\$\{([^}]+)\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = variableRegex.exec(html)) !== null) {
      if (!variables.includes(match[1] as any)) {
        variables.push(match[1] as any);
      }
    }
    
    return variables;
  }

  /**
   * Create a mixed content section from HTML
   */
  static createMixedSection(id: string, html: string, isCustomized: boolean = false): MixedContentSection {
    const variables = this.extractVariables(html);
    
    return {
      id,
      template: html,
      variables,
      isCustomized
    };
  }

  /**
   * Populate template variables with current form data
   */
  static populateTemplate(template: string, formData: any): string {
    let populated = template;
    
    // Replace ${variable} with actual values from form data
    populated = populated.replace(/\$\{([^}]+)\}/g, (match, variablePath) => {
      const value = this.getNestedValue(formData, variablePath);
      return value !== undefined ? value : match; // Keep placeholder if no value
    });
    
    return populated;
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Convert static HTML back to template format by intelligently preserving variables
   * This function implements true mixed content editing where only static text changes are saved
   */
  static reverseEngineerTemplate(staticHtml: string, originalTemplate: string, formData?: any): string {
    const originalVariables = this.extractVariables(originalTemplate);
    
    
    // If the static HTML already contains variables, return it as-is
    if (this.extractVariables(staticHtml).length > 0) {
      return staticHtml;
    }
    
    // If no original variables, just return the static HTML
    if (originalVariables.length === 0) {
      return staticHtml;
    }
    
    
    // Get current values for all variables from form data
    const currentValues = new Map<string, string>();
    if (formData) {
      originalVariables.forEach(variable => {
        const value = this.getNestedValue(formData, variable);
        if (value !== undefined && value !== '') {
          currentValues.set(variable, String(value));
        }
      });
    }
    
    // Start with the static HTML and systematically replace all dynamic content with variables
    let restoredTemplate = staticHtml;
    
    // Replace current form values back with variable placeholders
    currentValues.forEach((currentValue, variable) => {
      const placeholder = `\${${variable}}`;
      
      // Create different patterns to match the current value in various contexts
      const patterns = [
        // Exact match (case sensitive)
        new RegExp(this.escapeRegex(currentValue), 'g'),
        // Match within bold tags
        new RegExp(`<strong>${this.escapeRegex(currentValue)}</strong>`, 'g'),
        // Match with surrounding whitespace
        new RegExp(`\\b${this.escapeRegex(currentValue)}\\b`, 'g'),
      ];
      
      // Try each pattern to replace the current value with the variable
      let replacements = 0;
      patterns.forEach(pattern => {
        const matches = restoredTemplate.match(pattern);
        if (matches) {
          // Be careful with bold tags - preserve the formatting
          if (pattern.source.includes('<strong>')) {
            restoredTemplate = restoredTemplate.replace(pattern, `<strong>${placeholder}</strong>`);
          } else {
            restoredTemplate = restoredTemplate.replace(pattern, placeholder);
          }
          replacements += matches.length;
        }
      });
      
      if (replacements > 0) {
      } else {
        console.warn(`⚠️ Could not find current value "${currentValue}" for variable \${${variable}} in edited content`);
      }
    });
    
    // Verify how many variables we successfully restored
    const restoredVariables = this.extractVariables(restoredTemplate);
    const restorationRate = restoredVariables.length / originalVariables.length;
    
    
    if (restorationRate >= 0.8) {
      return restoredTemplate;
    } else if (restorationRate >= 0.5) {
      return restoredTemplate;
    } else {
      console.warn(`⚠️ Low variable restoration rate. This may be because:`);
      console.warn(`   • Form fields were empty when editing`);
      console.warn(`   • Content was significantly restructured`);
      console.warn(`   • Variable values weren't found in the edited content`);
      console.warn(`💡 Using original template to ensure form fields remain functional`);
      return originalTemplate;
    }
  }
  
  /**
   * Helper function to escape special regex characters
   */
  private static escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Determine if a section should use mixed content editing
   */
  static shouldUseMixedContent(sectionId: string): boolean {
    const mixedContentSections = [
      // Sections with form variables + customizable text
      'panels', 'panels-section',
      'pass-doors', 'panel-doors', 'pass-doors-section', 'panel-doors-section',
      'pocket-doors', 'pocket-doors-section',
      'track', 'track-section',
      'support', 'structure-support', 'support-section',
      'general', 'general-section',
      'terms', 'terms-section',
      // Pure customizable sections (no form variables but still beneficial)
      'statement', 'statement-section',
      'proposal-intro', 'proposal-intro-section'
    ];
    
    return mixedContentSections.includes(sectionId);
  }

  /**
   * Process section for mixed content editing
   */
  static processSectionForMixedContent(
    sectionId: string, 
    content: string, 
    originalTemplate: string,
    formData: any
  ): {
    shouldSaveAsMixed: boolean;
    mixedSection?: MixedContentSection;
    populatedContent?: string;
  } {
    if (!this.shouldUseMixedContent(sectionId)) {
      return { shouldSaveAsMixed: false };
    }

    // Check if content contains template variables
    const variables = this.extractVariables(content);
    
    if (variables.length > 0) {
      // Content has variables - save as mixed content template
      const mixedSection = this.createMixedSection(sectionId, content, true);
      const populatedContent = this.populateTemplate(content, formData);
      
      return {
        shouldSaveAsMixed: true,
        mixedSection,
        populatedContent
      };
    } else {
      // Content has no variables - use TRUE mixed content editing
      // Pass form data to intelligently restore variables from the edited content
      const template = this.reverseEngineerTemplate(content, originalTemplate, formData);
      const mixedSection = this.createMixedSection(sectionId, template, true);
      
      // Generate populated content from the restored template
      const populatedContent = this.populateTemplate(template, formData);
      
      return {
        shouldSaveAsMixed: true,
        mixedSection,
        populatedContent
      };
    }
  }
}