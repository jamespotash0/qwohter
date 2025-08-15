import { WallSpecification } from '@/types/quote';

export interface QuoteData {
  quote_details?: any;
  job_details?: any;
  wall_details?: {
    id?: string;
    walls?: {
      [wallName: string]: WallSpecification;
    };
  };
  pocket_doors?: {
    foldType?: string;
    foldStyle?: string;
  };
  support_structure?: any;
  delivery_details?: any;
  labor_details?: any;
  price_details?: any;
  proposal_number?: string;
  project_name?: string;
  created_at?: string;
}

export interface TemplateHelpers {
  formatDate: (dateString?: string) => string;
  toWords: (num: number | string) => string;
  formatCurrency: (amount?: number | string) => string;
  formatDimensions: (
    lengthFeet?: string,
    lengthInches?: string,
    heightFeet?: string,
    heightInches?: string,
    includeLabels?: boolean
  ) => string;
  getWallCount: (data: QuoteData) => number;
  getWallSystemType: (data: QuoteData) => string;
  isGLModel: (model?: string) => boolean;
  getPanelConfigurationText: (panelCount?: string) => string;
  getMovementOnTrackText: (panelConfiguration?: string) => string;
}

export abstract class BaseQuoteTemplate {
  protected helpers: TemplateHelpers;

  constructor() {
    this.helpers = {
      formatDate: (dateString?: string) => {
        if (!dateString) return new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const parts = dateString.split('-');
        if (parts.length === 3) {
          const localDate = new Date(+parts[0], +parts[1] - 1, +parts[2]);
          return localDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      },

      toWords: (num: number | string): string => {
        const n = parseInt(num.toString());
        const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE'];
        return words[n] || n.toString();
      },

      formatCurrency: (amount?: number | string) => {
        if (amount === null || amount === undefined || amount === '') return '$0.00';
        
        let num: number;
        if (typeof amount === 'string') {
          // Handle string currency values that might have formatting
          // Remove everything except digits, decimal points, and minus signs
          const cleanString = amount.replace(/[^0-9.-]/g, '');
          if (cleanString === '' || cleanString === '-') return '$0.00';
          num = parseFloat(cleanString);
        } else {
          num = amount;
        }
        
        // Ensure we have a valid number
        if (isNaN(num) || !isFinite(num)) return '$0.00';
        
        // Handle edge cases for very large numbers (up to 7 digits)
        const absNum = Math.abs(num);
        if (absNum >= 10000000) { // 7+ digits
          console.warn('Currency value may be too large:', num);
        }
        
        // Use Intl.NumberFormat for proper locale-specific formatting
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: true // Ensures comma separators for thousands
        });
        
        const formatted = formatter.format(num);
        
        // Debug logging for development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Currency formatting: ${amount} -> ${num} -> ${formatted}`);
        }
        
        return formatted;
      },

      formatDimensions: (
        lengthFeet?: string,
        lengthInches?: string,
        heightFeet?: string,
        heightInches?: string,
        includeLabels = true
      ) => {
        const wf = parseInt(lengthFeet || '0');
        const hf = parseInt(heightFeet || '0');
        
        // Handle fractional inches - preserve the original string if it contains fractions
        const wi = lengthInches || '0';
        const hi = heightInches || '0';
        
        // Format inches to handle both whole numbers and fractions
        const formatInches = (inches: string) => {
          const trimmed = inches.trim();
          
          // If it's just a whole number, return it as is
          if (/^\d+$/.test(trimmed)) {
            return trimmed;
          }
          
          // If it contains fractions like "7 1/2" or "7-1/2", preserve it
          if (trimmed.includes('/')) {
            return trimmed;
          }
          
          // Default to the original value, or '0' if empty
          return trimmed || '0';
        };

        const formattedWi = formatInches(wi);
        const formattedHi = formatInches(hi);

        const length = `${wf}'-${formattedWi}"${includeLabels ? ' L' : ''}`;
        const height = `${hf}'-${formattedHi}"${includeLabels ? ' H' : ''}`;
        return `${length} x ${height}`;
      },

      getWallCount: (data: QuoteData) => {
        const walls = data.wall_details?.walls || {};
        return Object.keys(walls).length;
      },

      getWallSystemType: (data: QuoteData) => {
        const walls = data.wall_details?.walls || {};
        const firstWall = Object.values(walls)[0] as WallSpecification;
        return firstWall?.wallSystemType || 'Operable Wall';
      },

      isGLModel: (model?: string) => {
        return model?.includes('GL') || false;
      },

      getPanelConfigurationText: (panelCount?: string) => {
        const count = parseInt(panelCount || '1');
        return count > 1 ? 'Multiple' : 'Single';
      },

      getMovementOnTrackText: (panelConfiguration?: string) => {
        if (panelConfiguration == 'Individual') {
          return "Independent Sliding";
        }
        return "Folding";
      }
    };
  }

  protected generateHeader(data: QuoteData): string {
    const contactName = data.quote_details?.contactName || 'Ed Michinski';
    const address = data.quote_details?.address || '567 Commerce St,<br> Franklin&nbsp;Lakes, NJ, 07417';
    const phone = data.quote_details?.phone || '(973) 884-0474';
    const fax = data.quote_details?.fax || '(973) 884-1606';
    const website = data.quote_details?.website || 'contemporarywalls.com';

    return `<div class="header-section">
      <div class="company-info">
        <div class="company-logo">
          <img src="/lovable-uploads/f007c713-9d1a-427a-9453-d0b8ffb42da6.png" alt="Contemporary Wall Systems Logo" style="height: 80px; width: auto; max-width: 200px; object-fit: contain;"/>
        </div>
      </div>
      
      <div class="contact-details" style="width: 50%; margin-left: 150px;">
        <div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Contact:</span>
          <span class="value">${contactName}</span>
        </div>
        <div class="contact-row" style="display: flex; align-items: flex-start;">
          <span class="label" style="font-weight: bold; width: 80px; flex-shrink: 0; text-align: right; padding-right: 0px;">
            Address:
          </span>
          <span class="value" style="flex: 1; white-space: normal;">
            ${address}
          </span>
        </div>
        <div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Phone:</span>
          <span class="value">${phone}</span>
        </div>
        <div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Fax:</span>
          <span class="value">${fax}</span>
        </div>
        <div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Website:</span>
          <span class="value website-link" style="text-decoration: underline; text-underline-offset: 3px;">${website}</span>
        </div>
      </div>
    </div>`;
  }

  protected generateBillingAndJobInfo(data: QuoteData): string {
    const date = this.helpers.formatDate(data.job_details?.date || '');
    const proposalNumber = data.proposal_number || 'N/A';
    const jobLocation = data.job_details?.job_location || '';
    const billedToName = data.job_details?.client_name || '';
    const billedToCompany = data.job_details?.client_company || '';
    const billedToAddress = data.job_details?.client_address || '';

    return `<div class="billing-job-container" style="display: flex; gap: 40px; align-items: flex-start; margin-top: -40px;">
      <div class="billing-table" style="width: 30%;">
        <div style="font-weight: bold; margin-bottom: 4px;">BILLED TO:</div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 16px 4px;">
              ${billedToName}
            </td>
          </tr>
          <tr>
            <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 16px 4px;">
              ${billedToCompany}
            </td>
          </tr>
          <tr>
            <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 16px 4px;">
              ${billedToAddress}
            </td>
          </tr>
        </table>
      </div>
      <div class="job-info-section" style="flex-grow: 1;">
        <table style="width: 80%; border-collapse: collapse; margin-left: 175px">
          <colgroup>
            <col style="width: 30%;">
            <col style="width: 50%;">
          </colgroup>
          <tr>
            <td style="font-weight: bold; padding: 4px; width: 80px; border: none; text-align: right;">
              Date:
            </td>
            <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">
              ${date}
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px; border: none; text-align: right;">
              Proposal #:
            </td>
            <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black;">
              ${proposalNumber}
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px; width: 25px; border: none; text-align: right; white-space: nowrap;">
              Job Location:
            </td>
            <td style="padding: 8px 8px 12px 8px; border-bottom: 0.5px solid black; white-space: normal; word-break: break-word; max-width: 300px;">
              ${jobLocation}
            </td>
          </tr>
        </table>
      </div>
    </div>`;
  }

  protected generatePricingSection(data: QuoteData): string {
    const basePriceValue = data.price_details?.basePrice || data.price_details?.base_price;
    const freightValue = data.price_details?.freight;
    const totalValue = data.price_details?.total;

    // Additional processing to ensure numeric values with better null handling
    const parsedBasePrice = basePriceValue ? 
      (typeof basePriceValue === 'string' ? parseFloat(basePriceValue.replace(/[^0-9.-]/g, '')) : basePriceValue) : 0;
    const parsedFreight = freightValue ? 
      (typeof freightValue === 'string' ? parseFloat(freightValue.replace(/[^0-9.-]/g, '')) : freightValue) : 0;
    const parsedTotal = totalValue ? 
      (typeof totalValue === 'string' ? parseFloat(totalValue.replace(/[^0-9.-]/g, '')) : totalValue) : 0;

    const basePrice = this.helpers.formatCurrency(parsedBasePrice);
    const freight = this.helpers.formatCurrency(parsedFreight);
    const total = this.helpers.formatCurrency(parsedTotal);

    // Enhanced debug pricing values to console for troubleshooting
    if (process.env.NODE_ENV === 'development') {
      console.log('Pricing Debug:', { 
        original: { basePriceValue, freightValue, totalValue },
        parsed: { parsedBasePrice, parsedFreight, parsedTotal },
        formatted: { basePrice, freight, total }
      });
      
      // Test currency formatting for all digit lengths
      const testValues = [12.34, 123.45, 1234.56, 12345.67, 123456.78, 1234567.89, 12345678.90];
      console.log('Currency formatting tests:');
      testValues.forEach(val => {
        console.log(`${val} digits -> ${this.helpers.formatCurrency(val)}`);
      });
    }

    return `<div class="pricing-section" style="margin-top: 10px;">
      <table style="width: 90%; border-collapse: collapse; table-layout: fixed;">
        <colgroup>
          <col style="width: 80%;">
          <col style="width: 20%;">
        </colgroup>
        <tr>
          <td style="border: 0.5px solid black; padding: 8px 8px 12px 8px;"><strong> As described, furnished and installed</strong></td>
          <td style="border: 0.5px solid black; text-align: right; padding: 8px 8px 12px 8px;"><strong>${basePrice}</strong></td>
        </tr>
        <tr>
          <td style="border: 0.5px solid black; padding: 8px;"><strong>Estimated Inbound Freight + Local Delivery</strong></td>
          <td style="border: 0.5px solid black; text-align: right; padding: 8px 8px 12px 8px;"><strong>${freight}</strong></td>
        </tr>
        <tr>
          <td style="border: 0.5px solid black; padding: 8px 8px 12px 8px;"><strong>Total</strong></td>
          <td style="border: 0.5px solid black; text-align: right; padding: 8px 8px 12px 8px;"><strong>${total}</strong></td>
        </tr>
      </table>
    </div>`;
  }

  protected generateTermsAndSignature(data: QuoteData): string {
    const laborType = data.labor_details?.laborType || '';
    const wageRate = data.labor_details?.wageRate || '';
    const paymentUponDrawings = data.price_details?.payment_upon_drawings || '33';
    const paymentUponTrackInstallation = data.price_details?.payment_upon_track_installation || '33';

    return `<div class="statement-section" style="line-height: 1.15;">
      <br><strong>Above Proposal is a Good Faith Estimate, Based on the Information Provided & Subject to Revision Upon Site Visit & Inspection. Pricing is Firm for 60 Days From Date Above</strong>
    </div>

    <div class="terms-section">
      <h2 class="section-header">General Notes and Terms:</h2>
      <ol>
        <li>1.  All materials are <strong>FOB factory</strong>, prepaid, and added to the final invoice.</li>
        <li>2.  <strong>Electrical, HVAC, and sprinkler system modifications</strong>, if required, are the responsibility of others.</li>
        <li>3.  All labor is <strong>${laborType}</strong>, performed at <strong>${wageRate ? wageRate + ' ' : ''}Wage Rates</strong> during regular hours (Monday–Friday, 7:00 AM–3:30 PM).</li>
        <li>4.  <strong>Delivery includes drop-off to the Roof</strong> of the site, if applicable.</li>
        <li>5.  Pricing is <strong>exclusive of any applicable taxes</strong>, which will be added as required.</li>
        <li>6.  The <strong>customer is responsible for obtaining any necessary permits or associated fees</strong>.</li>
        <li>7.  Final pricing is <strong>subject to site inspection and verification</strong> of all dimensions and conditions by our installation team.</li>
        <li>8.  Any additional requirements or unforeseen conditions may be subject to <strong>revised pricing or additional charges</strong>.</li>
        <li>9.  Panel colors and finishes are available<strong> as per the manufacturer's current standard offerings</strong>.</li>
        <li>10. A <strong>10-year factory warranty</strong> is provided on all operable wall systems.</li>
        <li>11.<strong> Payment Terms:</strong>
          <div style="padding-left: 2rem;">
            <div>– <strong>${paymentUponDrawings}%</strong> due upon approval of shop drawings</div>
            <div>– <strong>${paymentUponTrackInstallation}%</strong> due upon track installation</div>
            <div>– Remaining balance due upon final completion</div>
          </div>
        </li>
      </ol>
    </div>

    <div class="signature-section">
      <br><strong>Signed By:</strong> ___________________________________________&nbsp;&nbsp;&nbsp;<strong>Date:</strong> _____________________
    </div>

    <div class="acceptance-section">
      <h2 class="section-header">ACCEPTANCE OF PROPOSAL:</h2>
      <p style="font-style: italic; font-size: 9pt; line-height: 1.2;">
        The above prices, specifications, and conditions are satisfactory and are hereby accepted. Any alteration or deviation from above specifications will be executed upon written approval and may/will be subject to additional costs over and above the estimate. All removal of packing material is the customer's responsibility. Electrical and H.V.A.C. installation(s) are not included. Visa, Mastercard and American Express (AMEX) are accepted. Payments by credit card will be charged a processing fee. Pricing subject to applicable sales tax unless otherwise noted. Late payments will be subject to a 1.5% finance charge per month. Cancellations will be subject to a restocking fee.
      </p>
    </div>`;
  }

  // Abstract methods that subclasses must implement
  abstract generateWallTable(data: QuoteData): string;
  abstract generateProposalIntro(data: QuoteData): string;
  abstract generatePanelsSection(data: QuoteData): string;
  abstract generateTrackSection(data: QuoteData): string;
  abstract generateSupportSection(data: QuoteData): string;
  abstract generateGeneralSection(data: QuoteData): string;
  abstract getPageBreakStrategy(data: QuoteData): { breakAfterSection: string; minimumHeight: number }[];

  // Main generation method
  public generate(data: QuoteData): string {
    const pageBreaks = this.getPageBreakStrategy(data);
    
    let html = `<div class="quote-container" data-page-content="true">
      ${this.generateHeader(data)}
      ${this.generateBillingAndJobInfo(data)}
      ${this.generateProposalIntro(data)}
      ${this.generateWallTable(data)}
      ${this.generatePanelsSection(data)}`;

    // Add panel doors section if it has content
    const panelDoorsSection = this.generatePanelDoorsSection(data);
    if (panelDoorsSection) {
      html += panelDoorsSection;
    }

    // Add conditional sections with page breaks
    if (data.pocket_doors?.foldType && data.pocket_doors?.foldStyle) {
      html += this.generatePocketDoorsSection(data);
    }

    // Add strategic page break based on content
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

  protected generatePocketDoorsSection(data: QuoteData): string {
    const pocketFoldType = data.pocket_doors?.foldType || '';
    const pocketFoldStyle = data.pocket_doors?.foldStyle || '';

    return `<div class="pocket-doors-section" style="line-height: 1.15;">
      <h2 class="section-header">POCKET DOORS:</h2>
      <p>
        <strong>${pocketFoldType}</strong> doors with an <strong>${pocketFoldStyle}</strong> style will be used to house the panels in the stack, offering a space-efficient and acoustically enhanced storage solution.
      </p>  
    </div>`;
  }

  protected generatePanelDoorsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallEntries = Object.entries(walls);
    const firstWall = wallEntries[0]?.[1];
    
    if (!firstWall?.passDoorPanels) return '';

    return `<div class="panel-doors-section" style="line-height: 1.15;">
      <h2 class="section-header">PANEL DOORS:</h2>
      <p>
        A <strong>${firstWall.passDoorPanels}</strong> pass door panel is incorporated to allow for convenient access without disrupting the overall wall system.
      </p>
    </div>`;
  }

  protected shouldAddPageBreak(data: QuoteData): { height: number; forceBreak: boolean } | null {
    const wallCount = this.helpers.getWallCount(data);
    const hasPocketDoors = !!(data.pocket_doors?.foldType && data.pocket_doors?.foldStyle);
    
    // Calculate estimated content height
    let estimatedHeight = 400; // Base content height
    estimatedHeight += wallCount * 40; // Each wall adds ~40px
    estimatedHeight += hasPocketDoors ? 80 : 0; // Pocket doors section
    
    // If content is likely to overflow to next page awkwardly, add strategic break
    if (estimatedHeight > 600 && estimatedHeight < 800) {
      return { height: 120, forceBreak: false };
    } else if (estimatedHeight > 800) {
      return { height: 150, forceBreak: true };
    }
    
    return null;
  }
}