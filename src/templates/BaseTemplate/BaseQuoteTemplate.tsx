import { QuoteData, TemplateHelpers, PageBreakStrategy, SectionVisibilityConfig, defaultSectionVisibility } from './types';
import { createTemplateHelpers } from './template-helpers';
import { SectionGenerators } from './section-generators';
import { PageBreakLogic } from './page-break-logic';

export abstract class BaseQuoteTemplate {
  protected helpers: TemplateHelpers;
  private sectionGenerators: SectionGenerators;
  private pageBreakLogic: PageBreakLogic;

  constructor() {
    this.helpers = createTemplateHelpers();
    this.sectionGenerators = new SectionGenerators(this.helpers);
    this.pageBreakLogic = new PageBreakLogic(this.helpers);
  }

  // Delegate to section generators
  protected generateHeader(data: QuoteData): string {
    return this.sectionGenerators.generateHeader(data);
  }

  protected generateBillingAndJobInfo(data: QuoteData): string {
    return this.sectionGenerators.generateBillingAndJobInfo(data);
  }

  protected generatePricingSection(data: QuoteData): string {
    return this.sectionGenerators.generatePricingSection(data);
  }

  protected generateTermsAndSignature(data: QuoteData): string {
    return this.sectionGenerators.generateTermsAndSignature(data);
  }

  protected generatePocketDoorsSection(data: QuoteData): string {
    return this.sectionGenerators.generatePocketDoorsSection(data);
  }

  protected generatePassDoorsSection(data: QuoteData): string {
    return this.sectionGenerators.generatePassDoorsSection(data);
  }

  protected shouldAddPageBreak(data: QuoteData): { height: number; forceBreak: boolean } | null {
    return this.pageBreakLogic.shouldAddPageBreak(data);
  }

  // Abstract methods that subclasses must implement
  abstract generateWallTable(data: QuoteData): string;
  abstract generateProposalIntro(data: QuoteData): string;
  abstract generatePanelsSection(data: QuoteData): string;
  abstract generateTrackSection(data: QuoteData): string;
  abstract generateSupportSection(data: QuoteData): string;
  abstract generateGeneralSection(data: QuoteData): string;
  abstract getPageBreakStrategy(data: QuoteData): PageBreakStrategy[];

  // Main generation method - now uses simple CSS-based pagination
  public generate(data: QuoteData): string {
    return this.generateWithCSSPagination(data);
  }

  // CSS-based pagination generation (simple and reliable)
  public generateWithCSSPagination(data: QuoteData, visibilityConfig?: SectionVisibilityConfig): string {
    // Use default config if not provided
    const config = visibilityConfig || defaultSectionVisibility;

    const proposalIntro = config.proposalIntro ? this.generateProposalIntro(data) : '';

    let html = `<div class="quote-container" data-page-content="true">
      ${config.header ? this.generateHeader(data) : ''}
      ${this.sectionGenerators.generateBillingAndJobInfo(data, config.billedToTable, config.jobInfoTable)}
      ${proposalIntro}
      ${config.wallTable ? this.generateWallTable(data) : ''}
      ${config.panelsSection ? this.generatePanelsSection(data) : ''}`;

    // Add panel doors section if it has content and is visible
    if (config.passDoors) {
      const passDoorsSection = this.generatePassDoorsSection(data);
      if (passDoorsSection) {
        html += passDoorsSection;
      }
    }

    // Add conditional sections if visible
    if (config.pocketDoors) {
      const pocketDoorsSection = this.generatePocketDoorsSection(data);
      if (pocketDoorsSection) {
        html += pocketDoorsSection;
      }
    }

    html += `
      ${config.trackSection ? this.generateTrackSection(data) : ''}
      ${config.supportSection ? this.generateSupportSection(data) : ''}
      ${config.generalSection ? this.generateGeneralSection(data) : ''}
      ${config.pricingSection ? this.generatePricingSection(data) : ''}
      ${config.termsSignature ? this.generateTermsAndSignature(data) : ''}
    </div>`;

    // Check if proposal-intro is in the final HTML
    const hasProposalIntro = html.includes('class="proposal-intro-section"');
    if (!hasProposalIntro) {
      // console.log('❌ proposal-intro-section missing from final HTML');
    }

    // Return simple HTML - CSS page breaks will handle pagination automatically
    return html;
  }

  // Legacy generation method (for compatibility)
  public generateLegacy(data: QuoteData): string {
    let html = `<div class="quote-container" data-page-content="true">
      ${this.generateHeader(data)}
      ${this.generateBillingAndJobInfo(data)}
      ${this.generateProposalIntro(data)}
      ${this.generateWallTable(data)}
      ${this.generatePanelsSection(data)}`;

    const passDoorsSection = this.generatePassDoorsSection(data);
    if (passDoorsSection) {
      html += passDoorsSection;
    }

    const pocketDoorsSection = this.generatePocketDoorsSection(data);
    if (pocketDoorsSection) {
      html += pocketDoorsSection;
    }

    // Add strategic page break based on content (old system)
    const needsPageBreak = this.shouldAddPageBreak(data);
    if (needsPageBreak) {
      html += `<div class="dynamic-page-break" style="height: ${needsPageBreak.height}px; page-break-before: ${needsPageBreak.forceBreak ? 'always' : 'auto'};"></div>`;
    }

    html += `
      ${this.generateTrackSection(data)}
      ${this.generateSupportSection(data)}
      ${this.generateGeneralSection(data)}
      ${this.generatePricingSection(data)}
      ${this.generateTermsAndSignature(data)}
    </div>`;

    return html;
  }
}

// Re-export types for convenience
export type { QuoteData, SectionVisibilityConfig } from './types';