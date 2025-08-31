import { QuoteData, TemplateHelpers, PageBreakStrategy } from './types';
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
  public generateWithCSSPagination(data: QuoteData): string {
    let html = `<div class="quote-container" data-page-content="true">
      ${this.generateHeader(data)}
      ${this.generateBillingAndJobInfo(data)}
      ${this.generateProposalIntro(data)}
      ${this.generateWallTable(data)}
      ${this.generatePanelsSection(data)}`;

    // Add panel doors section if it has content
    const passDoorsSection = this.generatePassDoorsSection(data);
    if (passDoorsSection) {
      html += passDoorsSection;
    }

    // Add conditional sections
    const pocketDoorsSection = this.generatePocketDoorsSection(data);
    if (pocketDoorsSection) {
      html += pocketDoorsSection;
    }

    html += `
      ${this.generateTrackSection(data)}
      ${this.generateSupportSection(data)}
      ${this.generateGeneralSection(data)}
      ${this.generatePricingSection(data)}
      ${this.generateTermsAndSignature(data)}
    </div>`;

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