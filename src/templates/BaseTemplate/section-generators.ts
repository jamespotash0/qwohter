import { QuoteData, TemplateHelpers } from './types';
import { isGlassWall, isOperableWall } from '../../lib/types';

export class SectionGenerators {
  private helpers: TemplateHelpers;

  constructor(helpers: TemplateHelpers) {
    this.helpers = helpers;
  }

  generateHeader(data: QuoteData): string {
    // Get organization info first, then fallback to quote details
    const organizationInfo = data.organization_info;

    const contactName = data.quote_details?.contactName || '';
    const contactEmail = data.quote_details?.contactEmail || '';
    const address = organizationInfo?.address || data.quote_details?.address || '';
    const phone = organizationInfo?.phone || data.quote_details?.phone || '';
    const fax = organizationInfo?.fax || data.quote_details?.fax || '';
    const website = organizationInfo?.website || data.quote_details?.website || '';
    

    // For now, try to use logo_public_url (should work with public bucket)
    // If that doesn't work, we can construct the public URL from logo_url
    let logoUrl = organizationInfo?.logo_public_url;

    // If logo_public_url doesn't work but we have logo_url (storage path), construct public URL
    if (!logoUrl && organizationInfo?.logo_url) {
      logoUrl = `https://piuwrlaoxuefmiisuamc.supabase.co/storage/v1/object/public/organization-logos/${organizationInfo.logo_url}`;
    }

    // console.log('🖼️ Logo Debug Info:', {
    //   logo_public_url: organizationInfo?.logo_public_url,
    //   logo_url: organizationInfo?.logo_url,
    //   finalLogoUrl: logoUrl,
    //   hasLogo: logoUrl && logoUrl.trim() !== '',
    //   organizationInfo: organizationInfo
    // });

    const hasLogo = logoUrl && logoUrl.trim() !== '';
    const hasFax = fax && fax.trim() !== '';


    // Fixed container with object-fit: contain to handle all aspect ratios
    const logoHtml = hasLogo
      ? `<img
          src="${logoUrl}"
          alt="Company Logo"
          style="width: 100%; height: 100%; object-fit: contain; object-position: left center;"
          onError="this.style.display='none'"
        />`
      : '';
    

    return `<div class="header-section" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 0px 0px 30px 0px;">
      <div class="company-info" style="flex: 0 0 auto; width: 250px;">
        <div class="company-logo" style="width: 250px; height: 120px; display: flex; align-items: center; justify-content: flex-start;">
          ${logoHtml}
        </div>
      </div>

      <div class="contact-details" style="flex: 1; min-width: 0; padding-left: 70px;">
        <div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Contact:</span>
          <span class="value">${contactName}</span>
        </div>
        <div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Email:</span>
          <span class="value">${contactEmail}</span>
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
        ${hasFax ? `<div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Fax:</span>
          <span class="value">${fax}</span>
        </div>` : ''}
        <div class="contact-row">
          <span class="label" style="display: inline-block; width: 80px; font-weight: bold;">Website:</span>
          <span class="value website-link" style="text-decoration: underline; text-underline-offset: 3px;">${website}</span>
        </div>
      </div>
    </div>`;
  }

  generateBillingAndJobInfo(data: QuoteData): string {
    const date = this.helpers.formatDate(data.job_details?.date || '');
    const proposalNumber = data.proposal_number || 'N/A';
    const jobLocation = data.job_details?.job_location || '';
    const billedToName = data.job_details?.client_name || '';
    const billedToCompany = data.job_details?.client_company || '';
    const billedToAddress = data.job_details?.client_address || '';
    const projectName = data.project_name;

    return `<div class="billing-job-container" style="display: flex; gap: 40px; align-items: flex-start; margin-top: -40px;">
      <div class="billing-table" style="width: 30%;">
        <div style="font-weight: bold; margin-bottom: 4px;">BILLED TO:</div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <tr>
            <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 8px 4px;">
              ${billedToName}
            </td>
          </tr>
          <tr>
            <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 8px 4px;">
              ${billedToCompany}
            </td>
          </tr>
          <tr>
            <td style="border: none; border-bottom: 0.5px solid black; padding: 4px 4px 8px 4px;">
              ${billedToAddress}
            </td>
          </tr>
        </table>
      </div>
      <div class="job-info-section" style="flex-grow: 1;">
        <!-- <div style="font-weight: bold; margin-left: 40px; margin-bottom: 4px; height: 16px"></div> -->
        <table style="width: 80%; border-collapse: collapse; margin-left: 175px">
          <colgroup>
            <col style="width: 30%;">
            <col style="width: 50%;">
          </colgroup>
          <tr>
            <td style="font-weight: bold; padding: 4px; width: 80px; border: none; text-align: right;">
              Date:
            </td>
            <td style="padding: 4px 4px 8px 4px; border-bottom: 0.5px solid black;">
              ${date}
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px; border: none; text-align: right;">
              Proposal #:
            </td>
            <td style="padding: 4px 4px 8px 4px; border-bottom: 0.5px solid black;">
              ${proposalNumber}
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px; border: none; text-align: right;">
              Project Name:
            </td>
            <td style="padding: 4px 4px 8px 4px; border-bottom: 0.5px solid black;">
              ${projectName}
            </td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 4px; width: 25px; border: none; text-align: right; white-space: nowrap;">
              Job Location:
            </td>
            <td style="padding: 4px 4px 8px 4px; border-bottom: 0.5px solid black; white-space: normal; word-break: break-word; max-width: 300px;">
              ${jobLocation}
            </td>
          </tr>
        </table>
      </div>
    </div>`;
  }

  generatePricingSection(data: QuoteData): string {
    // Use new enhanced pricing fields with fallbacks to old fields for backward compatibility
    const basePriceValue = data.price_details?.base_selling_price;
    const freightValue = data.price_details?.shipping_selling_price;
    const totalValue = data.price_details?.final_selling_price;

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

  generateTermsAndSignature(data: QuoteData): string {
    const laborType = data.labor_details?.laborType || '';
    const wageRate = data.labor_details?.wageRate || '';
    const paymentUponDrawings = data.price_details?.payment_upon_drawings || '33';
    const paymentUponTrackInstallation = data.price_details?.payment_upon_track_installation || '33';

    return `<div class="statement-section" style="line-height: 1.15;">
      <br><strong>Above Proposal is a Good Faith Estimate, Based on the Information Provided & Subject to Revision Upon Site Visit & Inspection. Pricing is Firm for 60 Days From Date Above</strong>
    </div>

    <div class="terms-section">
      <div class="terms-list">
        <div class="term-item section-header-item" style="break-inside: avoid; margin-bottom: 8px; font-weight: bold; font-size: 12pt; margin-top: 1.5em;">GENERAL NOTES AND TERMS:</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">1. <strong>Electrical, HVAC, and sprinkler system modifications</strong>, if required, are the responsibility of others.</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">2. All labor is <strong>${laborType}</strong>, performed at <strong>${wageRate ? wageRate + ' ' : ''}Wage Rates</strong> during regular hours (Monday–Friday, 7:00 AM–3:30 PM).</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">3. <span style="color: red;">Quoted delivery pricing assumes <strong>elevator or ground-level access</strong>. Deliveries involving stairs, restricted access, or requiring additional equipment (e.g., outside lift) are subject to additional charges.</span></div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">4. Pricing is <strong>exclusive of any applicable taxes</strong>, which will be added as required.</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">5. The <strong>customer is responsible for obtaining any necessary permits or associated fees</strong>.</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">6. Final pricing is <strong>subject to site inspection and verification</strong> of all dimensions and conditions by our installation team.</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">7. Any additional requirements or unforeseen conditions may be subject to <strong>revised pricing or additional charges</strong>.</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">8. Panel colors and finishes are available<strong> as per the manufacturer's current standard offerings</strong>.</div>
        <div class="term-item" style="break-inside: avoid; margin-bottom: 4px;">9. A <strong>10-year factory warranty</strong> is provided on all operable wall systems.</div>
        <div class="term-item payment-terms-item" style="break-inside: avoid; margin-bottom: 4px;">
          10. <strong> Payment Terms:</strong>
          <div style="padding-left: 2rem; margin-top: 4px;">
            <div>– <strong>${paymentUponDrawings}%</strong> due upon approval of shop drawings</div>
            <div>– <strong>${paymentUponTrackInstallation}%</strong> due upon track installation</div>
            <div>– Remaining balance due upon final completion</div>
          </div>
        </div>
      </div>
    </div>

    <div class="signature-acceptance-section" style="line-height: 1.15;">
      <br><strong>Signed By:</strong> ___________________________________________&nbsp;&nbsp;&nbsp;<strong>Date:</strong> _____________________
      <br>

      <h2 class="section-header editable-header" contenteditable="false" style="margin-top: 25px; margin-bottom: 15px;">ACCEPTANCE OF PROPOSAL:</h2>
      <p style="font-style: italic; font-size: 9pt; line-height: 1.2;">
        The above prices, specifications, and conditions are satisfactory and are hereby accepted. Any alteration or deviation from above specifications will be executed upon written approval and may/will be subject to additional costs over and above the estimate. All removal of packing material is the customer's responsibility. Electrical and H.V.A.C. installation(s) are not included. Visa, Mastercard and American Express (AMEX) are accepted. Payments by credit card will be charged a processing fee. Pricing subject to applicable sales tax unless otherwise noted. Late payments will be subject to a 1.5% finance charge per month. Cancellations will be subject to a restocking fee.
      </p>
    </div>`;
  }

  generatePocketDoorsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    
    const wallsWithPockets = Object.entries(walls)
      .filter(([_, wall]) => {
        // Check per-wall configuration - require both fold type AND fold style
        
        if (wall.pocketDoors?.foldType && 
            wall.pocketDoors.foldType.toLowerCase().trim() !== 'none' &&
            wall.pocketDoors.foldType.trim() !== '' &&
            wall.pocketDoors?.foldStyle &&
            wall.pocketDoors.foldStyle.toLowerCase().trim() !== 'none' &&
            wall.pocketDoors.foldStyle.trim() !== '') {
          return true;
        }
        return false;
      })
      .map(([name, wall]) => ({ 
        name, 
        type: wall.pocketDoors!.foldType,
        style: wall.pocketDoors!.foldStyle || ''
      }));



    if (wallsWithPockets.length === 0) return '';

    // Create inline sentence describing each wall's pocket doors
    const wallDescriptions = wallsWithPockets
      .map(wall => `<strong>${wall.name.replace(/\s+/g, '&nbsp;')}</strong> will use <strong>${wall.type} ${wall.style}</strong> pocket doors`)
      .join(', and ');

    const summary = wallsWithPockets.length > 1
      ? "These pocket doors are designed to house the panels within the stack, offering space-efficient storage and acoustically enhanced performance."
      : "This pocket door is designed to house the panels within the stack, offering space-efficient storage and acoustically enhanced performance.";

    return `<div class="pocket-doors-section" style="line-height: 1.15;">
      <p class="section-header-item" style="margin: 1.5em 0 0.5em 0; font-weight: bold; font-size: 12pt;">POCKET DOORS:</p>
      <p>
        ${wallDescriptions}. ${summary}
      </p>
    </div>`;
  }

  generatePassDoorsSection(data: QuoteData): string {
    const walls = data.wall_details?.walls || {};
    const wallsWithPassDoors = Object.entries(walls)
      .filter(([_, wall]) => {
        // Check for operable wall pass doors
        if (isOperableWall(wall)) {
          const hasOperablePassDoors = wall.passDoorPanels && 
                                      wall.passDoorPanels.toLowerCase().trim() !== 'none' &&
                                      wall.passDoorPanels.trim() !== '' &&
                                      wall.passDoorQuantity && 
                                      wall.passDoorQuantity !== '0';
          return hasOperablePassDoors;
        }
        
        // Check for glass wall pass doors - require both type and option to be set
        if (isGlassWall(wall)) {
          const hasGlassPassDoors = wall.passDoorType && 
                                   wall.passDoorType.toLowerCase().trim() !== 'none' &&
                                   wall.passDoorType.trim() !== '' &&
                                   wall.passDoorOption &&
                                   wall.passDoorOption.toLowerCase().trim() !== 'none' &&
                                   wall.passDoorOption.trim() !== '';
          return hasGlassPassDoors;
        }
        
        return false;
      })
      .map(([name, wall]) => {
        // Determine pass door details based on wall type
        if (isGlassWall(wall)) {
          return {
            name, 
            type: wall.passDoorType,
            option: wall.passDoorOption, 
            quantity: '1', // Glass walls typically have 1 pass door per configuration
            isGlassWall: true
          };
        } else if (isOperableWall(wall)) {
          return {
            name, 
            type: wall.passDoorPanels!, 
            quantity: wall.passDoorQuantity || '0',
            isGlassWall: false
          };
        } else {
          // Fallback for other wall types
          return {
            name, 
            type: '', 
            quantity: '0',
            isGlassWall: false
          };
        }
      });

    if (wallsWithPassDoors.length === 0) return '';

    // Create inline sentence describing each wall's pass doors with quantity
    const wallDescriptions = wallsWithPassDoors
      .map(wall => {
        const qty = parseInt(wall.quantity) || 0;
        const quantityText = qty === 1 ? 'One' : qty === 2 ? 'Two' : `${qty}`;
        
        if (wall.isGlassWall) {
          // For glass walls, show both option and type if both exist
          const passDescription = wall.option && wall.option !== wall.type 
            ? `<strong>${wall.type} ${wall.option}</strong>` 
            : `<strong>${wall.type}</strong>`;
          return `<strong>${wall.name.replace(/\s+/g, '&nbsp;')}</strong> has <strong>${quantityText}</strong> ${passDescription} <strong>Pass Door</strong>`;
        } else {
          // For operable walls, use the standard format
          return `<strong>${wall.name.replace(/\s+/g, '&nbsp;')}</strong> has <strong>${quantityText} ${wall.type} Pass Door</strong> panel${qty > 1 ? 's' : ''}`;
        }
      })
      .join(', and ');

    const summary = wallsWithPassDoors.length > 1
      ? "These pass door panels are incorporated to allow for convenient access without disrupting the overall wall systems."
      : "This pass door panel is incorporated to allow for convenient access without disrupting the overall wall system.";

    return `<div class="pass-doors-section" style="line-height: 1.15;">
      <p class="section-header-item" style="margin: 1.5em 0 0.5em 0; font-weight: bold; font-size: 12pt;">PASS DOORS:</p>
      <p>
        ${wallDescriptions}. ${summary}
      </p>
    </div>`;
  }
}
